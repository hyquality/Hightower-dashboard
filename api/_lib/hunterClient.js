const HUNTER_BASE = "https://api.hunter.io/v2";

const GENERIC_EMAIL_HOSTS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "googlemail.com",
]);

export function extractDomainFromWebsite(website) {
  if (!website || typeof website !== "string") return "";
  let s = website.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host || GENERIC_EMAIL_HOSTS.has(host)) return "";
    return host;
  } catch {
    return "";
  }
}

function pickBestEmail(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return null;
  const withAddr = emails.filter((e) => e?.value && String(e.value).includes("@"));
  if (withAddr.length === 0) return null;
  return [...withAddr].sort((a, b) => {
    const pa = a.type === "personal" ? 1 : 0;
    const pb = b.type === "personal" ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (b.confidence || 0) - (a.confidence || 0);
  })[0];
}

/**
 * @param {{ domain?: string, company?: string, hunterLimit?: number }} opts
 */
export async function domainSearch(opts) {
  const apiKey = process.env.HUNTER_IO_API_KEY;
  if (!apiKey) throw new Error("HUNTER_IO_API_KEY is not configured");

  const domain = opts.domain?.trim() || "";
  const company = opts.company?.trim() || "";
  if (!domain && !company) throw new Error("domain or company required");

  const hunterLimit = Math.min(Math.max(Number(opts.hunterLimit) || 10, 1), 10);
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(hunterLimit),
  });
  if (domain) params.set("domain", domain);
  else params.set("company", company);

  const url = `${HUNTER_BASE}/domain-search?${params}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      json?.errors?.map((e) => e?.details).filter(Boolean).join("; ") ||
      json?.message ||
      res.statusText;
    const err = new Error(detail || `Hunter API ${res.status}`);
    err.status = res.status;
    err.hunterCode = json?.errors?.[0]?.id;
    throw err;
  }

  const data = json.data || {};
  const best = pickBestEmail(data.emails);
  return { data, best };
}

export function buildUpdatesFromHunterBest(lead, best) {
  if (!best?.value) return null;

  const updates = {};
  const missingEmail = !lead.email?.trim();
  const missingOwner = !lead.owner_name?.trim();

  if (missingEmail) updates.email = String(best.value).trim();

  if (missingOwner) {
    const name = [best.first_name, best.last_name].filter(Boolean).join(" ").trim();
    if (name) updates.owner_name = name;
  }

  if (Object.keys(updates).length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  updates.enriched_date = today;
  updates.enrichment_source = "Hunter.io";
  return updates;
}
