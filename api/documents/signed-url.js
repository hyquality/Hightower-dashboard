import { getServiceSupabase, requireAuthUser } from "../_lib/supabaseServer.js";

const BUCKET = "lead-documents";

/** Normalize stored URI to object path inside bucket (strip bucket prefix if present). */
function toObjectPath(fileUri) {
  if (!fileUri || typeof fileUri !== "string") return "";
  let p = fileUri.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf(BUCKET);
      if (idx >= 0) return parts.slice(idx + 1).join("/");
      return parts.join("/");
    } catch {
      return p;
    }
  }
  if (p.startsWith(`${BUCKET}/`)) return p.slice(BUCKET.length + 1);
  return p;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const { file_uri, paths } = req.body || {};
    const supabase = getServiceSupabase();

    if (Array.isArray(paths) && paths.length) {
      const out = await Promise.all(
        paths.map(async (raw) => {
          const path = toObjectPath(raw);
          if (!path) return { path: raw, signed_url: null };
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 3600);
          if (error) {
            console.error("signed url", path, error.message);
            return { path: raw, signed_url: null };
          }
          return { path: raw, signed_url: data.signedUrl };
        })
      );
      return res.status(200).json({ urls: out });
    }

    if (file_uri) {
      const path = toObjectPath(file_uri);
      if (!path) {
        return res.status(400).json({ error: "invalid file_uri" });
      }
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ signed_url: data.signedUrl });
    }

    return res.status(400).json({ error: "file_uri or paths required" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
