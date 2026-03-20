import { corsHeadersFor, jsonResponse, emptyResponse } from "./_lib/publicLeadApi.js";

/** Smoke test: open GET /api/health in the browser; from the lead site, confirms CORS + deploy. */
export default {
  async fetch(request) {
    const cors = corsHeadersFor(request);

    if (request.method === "OPTIONS") {
      if (cors === null) {
        return jsonResponse(null, 403, { error: "Origin not allowed" });
      }
      return emptyResponse(cors, 204);
    }

    if (request.method === "GET") {
      if (cors === null) {
        return jsonResponse(null, 403, { error: "Origin not allowed" });
      }
      return jsonResponse(cors, 200, { ok: true });
    }

    const fallback = cors || corsHeadersFor({ headers: new Headers() });
    return jsonResponse(fallback, 405, { error: "Method not allowed" });
  },
};
