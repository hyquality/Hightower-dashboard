import { getServiceSupabase, requireAuthUser } from "./_lib/supabaseServer.js";
import {
  extractDomainFromWebsite,
  domainSearch,
  buildUpdatesFromHunterBest,
} from "./_lib/hunterClient.js";

const MAX_SCAN = 800;
const DEFAULT_LIMIT = 25;
const HUNTER_DELAY_MS = 120;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function needsEnrichment(lead) {
  const missingEmail = !lead.email?.trim();
  const missingOwner = !lead.owner_name?.trim();
  if (!missingEmail && !missingOwner) return false;
  const domain = extractDomainFromWebsite(lead.website);
  const company = lead.business_name?.trim();
  return Boolean(domain || company);
}

function hunterParamsForLead(lead) {
  const domain = extractDomainFromWebsite(lead.website);
  const company = lead.business_name?.trim() || "";
  if (domain) return { domain, company: "" };
  if (company) return { domain: "", company };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (!process.env.HUNTER_IO_API_KEY) {
    return res.status(503).json({
      error: "Hunter.io is not configured. Set HUNTER_IO_API_KEY on the server.",
    });
  }

  const body = req.body || {};
  const cap = Math.min(
    Math.max(Number(body.limit) || DEFAULT_LIMIT, 1),
    100
  );
  const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids.filter(Boolean) : [];

  try {
    const supabase = getServiceSupabase();
    let rows = [];

    if (leadIds.length > 0) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("id", leadIds.slice(0, cap));
      if (error) throw error;
      rows = data || [];
    } else {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_SCAN);
      if (error) throw error;
      rows = (data || []).filter(needsEnrichment).slice(0, cap);
    }

    const result = {
      processed: 0,
      enriched: 0,
      skipped: 0,
      errors: [],
    };

    for (const lead of rows) {
      result.processed += 1;
      const params = hunterParamsForLead(lead);
      if (!params) {
        result.skipped += 1;
        continue;
      }

      try {
        const { best } = await domainSearch({
          domain: params.domain || undefined,
          company: params.company || undefined,
          hunterLimit: 10,
        });
        const updates = buildUpdatesFromHunterBest(lead, best);
        if (!updates) {
          result.skipped += 1;
        } else {
          const { error: upErr } = await supabase
            .from("leads")
            .update(updates)
            .eq("id", lead.id);
          if (upErr) throw upErr;
          Object.assign(lead, updates);
          result.enriched += 1;
        }
      } catch (e) {
        result.errors.push({
          id: lead.id,
          reason: e?.message || "Hunter request failed",
        });
        result.skipped += 1;
      }

      await sleep(HUNTER_DELAY_MS);
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("enrich-leads-hunter:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Enrichment failed" });
  }
}
