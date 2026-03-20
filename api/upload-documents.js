import { Readable } from "node:stream";
import busboy from "busboy";
import { getServiceSupabase } from "./_lib/supabaseServer.js";
import {
  corsHeadersFor,
  verifyFormSecret,
  jsonResponse,
  emptyResponse,
} from "./_lib/publicLeadApi.js";

const BUCKET = "lead-documents";

function safeFilename(name) {
  const base = String(name || "upload")
    .split(/[/\\]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 120) || "upload.bin";
}

function normEmail(e) {
  return e ? String(e).trim().toLowerCase() : "";
}

function parseMultipartBuffer(buffer, contentType) {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: 6 * 1024 * 1024, files: 6 },
    });
    const fields = {};
    const files = [];
    bb.on("file", (name, file, info) => {
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => reject(new Error("file too large")));
      file.on("end", () => {
        files.push({
          fieldname: name,
          buffer: Buffer.concat(chunks),
          filename: safeFilename(info.filename),
          mimeType: info.mimeType || "application/octet-stream",
        });
      });
    });
    bb.on("field", (name, val) => {
      fields[name] = val;
    });
    bb.on("error", reject);
    bb.on("close", () => resolve({ fields, files }));
    Readable.from(buffer).pipe(bb);
  });
}

function mergeDocUris(existing, newPaths) {
  const prev = (existing || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set(prev);
  for (const p of newPaths) set.add(p);
  return [...set].join(",");
}

async function handlePost(request, cors) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse(cors, 415, { error: "multipart/form-data required" });
  }

  let buffer;
  try {
    buffer = Buffer.from(await request.arrayBuffer());
  } catch {
    return jsonResponse(cors, 400, { error: "could not read body" });
  }

  let fields;
  let files;
  try {
    ({ fields, files } = await parseMultipartBuffer(buffer, contentType));
  } catch (e) {
    return jsonResponse(cors, 400, { error: e.message || "invalid multipart" });
  }

  if (!verifyFormSecret(request, fields.form_secret)) {
    return jsonResponse(cors, 401, { error: "Unauthorized" });
  }

  const leadId = fields.lead_id;
  if (!leadId || String(leadId).trim() === "") {
    return jsonResponse(cors, 400, { error: "lead_id required" });
  }

  const email = normEmail(fields.email);
  const phone = fields.phone ? String(fields.phone).trim() : "";

  try {
    const supabase = getServiceSupabase();
    const { data: lead, error: lErr } = await supabase
      .from("leads")
      .select("id,email,phone,doc_file_uris")
      .eq("id", leadId)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!lead) {
      return jsonResponse(cors, 404, { error: "lead not found" });
    }
    if (email && normEmail(lead.email) !== email) {
      return jsonResponse(cors, 403, { error: "email mismatch" });
    }

    if (files.length === 0) {
      return jsonResponse(cors, 400, { error: "no files" });
    }

    const uploadedPaths = [];
    const ts = Date.now();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const slot = String(f.fieldname).replace(/^file_/, "") || String(i);
      const path = `applications/${leadId}/bank-${ts}-${slot}-${f.filename}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f.buffer, {
        contentType: f.mimeType,
        upsert: false,
      });
      if (upErr) {
        console.error("storage upload", path, upErr);
        return jsonResponse(cors, 500, { error: upErr.message });
      }
      uploadedPaths.push(path);
    }

    const merged = mergeDocUris(lead.doc_file_uris, uploadedPaths);
    const count = merged.split(",").filter(Boolean).length;
    const today = new Date().toISOString().slice(0, 10);

    const update = {
      doc_file_uris: merged,
      docs_submitted_date: today,
      docs_count: count,
    };
    if (phone) update.phone = phone;

    const { error: uErr } = await supabase.from("leads").update(update).eq("id", leadId);
    if (uErr) {
      console.error("lead update after upload", uErr);
      return jsonResponse(cors, 500, { error: uErr.message });
    }

    return jsonResponse(cors, 200, { ok: true, paths: uploadedPaths, doc_count: count });
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
