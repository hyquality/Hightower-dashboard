import { getServiceSupabase } from "./_lib/supabaseServer.js";
import {
  corsHeadersFor,
  verifyFormSecret,
  jsonResponse,
  emptyResponse,
} from "./_lib/publicLeadApi.js";

function parseRevenueNumeric(val) {
  if (val == null || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const s = String(val).trim();
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function OPTIONS(request) {
  const cors = corsHeadersFor(request);
  if (cors === null) {
    return jsonResponse(null, 403, { error: "Origin not allowed" });
  }
  return emptyResponse(cors, 204);
}

export async function POST(request) {
  const cors = corsHeadersFor(request);
  if (cors === null) {
    return jsonResponse(null, 403, { error: "Origin not allowed" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(cors, 400, { error: "Invalid JSON" });
  }

  if (!verifyFormSecret(request, body.form_secret)) {
    return jsonResponse(cors, 401, { error: "Unauthorized" });
  }

  const {
    owner_name,
    business_name,
    email,
    phone,
    estimated_monthly_revenue,
    source,
    status,
    notes,
    form_secret: _omit,
    ...rest
  } = body;

  if (!email || String(email).trim() === "") {
    return jsonResponse(cors, 400, { error: "email required" });
  }

  const row = {
    owner_name: owner_name != null ? String(owner_name).trim() : null,
    business_name: business_name != null ? String(business_name).trim() : null,
    email: String(email).trim().toLowerCase(),
    phone: phone != null ? String(phone).trim() : null,
    source: source != null ? String(source).trim() : "Website Form",
    status: status != null ? String(status).trim() : "New",
    notes: notes != null ? String(notes) : null,
  };

  const rev = parseRevenueNumeric(estimated_monthly_revenue);
  if (rev != null) row.estimated_monthly_revenue = rev;

  if (Object.keys(rest).length > 0) {
    const extra = JSON.stringify(rest);
    row.notes = row.notes ? `${row.notes}\n\n[extra] ${extra}` : `[extra] ${extra}`;
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from("leads").insert(row).select("id").single();
    if (error) {
      console.error("apply insert", error);
      return jsonResponse(cors, 500, { error: error.message });
    }
    return jsonResponse(cors, 200, { id: data.id });
  } catch (e) {
    console.error(e);
    return jsonResponse(cors, 500, { error: e.message });
  }
}
