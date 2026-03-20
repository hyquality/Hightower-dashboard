/**
 * CORS + optional shared secret for public lead-site endpoints.
 * Set PUBLIC_LEAD_SITE_ORIGIN to comma-separated allowed origins (e.g. https://www.hightowerfunding.com).
 * Comparison is case-insensitive and ignores trailing slashes so https://www.hightowerfunding.com/ still matches.
 * If unset, Access-Control-Allow-Origin is * (non-credentialed POSTs only; lock down in production).
 */

export function normalizeOrigin(o) {
  if (!o) return "";
  return String(o).trim().replace(/\/+$/, "").toLowerCase();
}

export function getAllowedOrigins() {
  const raw = process.env.PUBLIC_LEAD_SITE_ORIGIN || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Works with Web Request and Node IncomingMessage-style req */
export function getIncomingHeader(reqLike, name) {
  if (!reqLike?.headers) return "";
  const lower = name.toLowerCase();
  if (typeof reqLike.headers.get === "function") {
    return reqLike.headers.get(name) || reqLike.headers.get(lower) || "";
  }
  const h = reqLike.headers;
  const v = h[lower] ?? h[name];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] || "";
  return "";
}

/** @returns {Record<string, string> | null} null = browser origin not allowed */
export function corsHeadersFor(reqLike) {
  const allowedRaw = getAllowedOrigins();
  const allowedNorm = allowedRaw.map(normalizeOrigin).filter(Boolean);
  const originHeader = getIncomingHeader(reqLike, "origin");

  const base = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Form-Secret, x-form-secret, Accept, Origin",
    "Access-Control-Max-Age": "86400",
  };

  if (allowedNorm.length === 0) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  if (!originHeader) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  const reqNorm = normalizeOrigin(originHeader);
  if (!allowedNorm.includes(reqNorm)) {
    return null;
  }

  return {
    ...base,
    "Access-Control-Allow-Origin": originHeader,
    Vary: "Origin",
  };
}

/** @returns {boolean} false if browser request from disallowed origin */
export function applyCors(req, res) {
  const headers = corsHeadersFor(req);
  if (headers === null) {
    return false;
  }
  for (const [k, v] of Object.entries(headers)) {
    res.setHeader(k, v);
  }
  return true;
}

export function verifyFormSecret(reqLike, bodySecret) {
  const needed = process.env.PUBLIC_FORM_SECRET;
  if (!needed) return true;
  const header = getIncomingHeader(reqLike, "x-form-secret");
  if (header && header === needed) return true;
  if (bodySecret && bodySecret === needed) return true;
  return false;
}

/** JSON Response with CORS (Web Fetch API — Vercel function discovery) */
export function jsonResponse(corsRecord, status, bodyObj) {
  const h = new Headers({ "Content-Type": "application/json" });
  if (corsRecord) {
    for (const [k, v] of Object.entries(corsRecord)) {
      h.set(k, v);
    }
  }
  return new Response(JSON.stringify(bodyObj), { status, headers: h });
}

export function emptyResponse(corsRecord, status) {
  const h = new Headers();
  if (corsRecord) {
    for (const [k, v] of Object.entries(corsRecord)) {
      h.set(k, v);
    }
  }
  return new Response(null, { status, headers: h });
}
