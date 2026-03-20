import { getServiceSupabase } from "./_lib/supabaseServer.js";
import {
  corsHeadersFor,
  verifyFormSecret,
  jsonResponse,
  emptyResponse,
} from "./_lib/publicLeadApi.js";

function normEmail(e) {
  return e ? String(e).trim().toLowerCase() : "";
}

async function handlePost(request, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(cors, 400, { error: "Invalid JSON" });
  }

  if (!verifyFormSecret(request, body.form_secret)) {
    return jsonResponse(cors, 401, { error: "Unauthorized" });
  }

  const { lead_id, email, type, data } = body;
  if (!lead_id || typeof lead_id !== "string") {
    return jsonResponse(cors, 400, { error: "lead_id required" });
  }
  if (type !== "application_form") {
    return jsonResponse(cors, 400, { error: "invalid type" });
  }
  if (!data || typeof data !== "object") {
    return jsonResponse(cors, 400, { error: "data required" });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: lead, error: lErr } = await supabase
      .from("leads")
      .select("id,email,notes")
      .eq("id", lead_id)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!lead) {
      return jsonResponse(cors, 404, { error: "lead not found" });
    }
    const em = normEmail(email);
    if (em && normEmail(lead.email) !== em) {
      return jsonResponse(cors, 403, { error: "email mismatch" });
    }

    const stamp = new Date().toISOString();
    const block = `\n\n--- Website application (${stamp}) ---\n${JSON.stringify(data)}`;
    const newNotes = (lead.notes || "") + block;

    const { error: uErr } = await supabase.from("leads").update({ notes: newNotes }).eq("id", lead_id);
    if (uErr) {
      console.error("save application", uErr);
      return jsonResponse(cors, 500, { error: uErr.message });
    }
    return jsonResponse(cors, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return jsonResponse(cors, 500, { error: e.message });
  }
}

export default {
  async fetch(request) {
    const cors = corsHeadersFor(request);

    if (request.method === "OPTIONS") {
      if (cors === null) {
        return jsonResponse(null, 403, { error: "Origin not allowed" });
      }
      return emptyResponse(cors, 204);
    }

    if (request.method === "POST") {
      if (cors === null) {
        return jsonResponse(null, 403, { error: "Origin not allowed" });
      }
      return handlePost(request, cors);
    }

    const fallback = cors || corsHeadersFor({ headers: new Headers() });
    return jsonResponse(fallback, 405, { error: "Method not allowed" });
  },
};
