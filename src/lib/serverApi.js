import { supabase } from "@/lib/supabase";

/**
 * POST to same-origin /api/* (Vercel serverless). Sends Supabase access token when logged in.
 */
export async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || res.statusText || "Request failed");
  }
  return json;
}
