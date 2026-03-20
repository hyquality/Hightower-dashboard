import { supabase } from "@/lib/supabase";

const PAGE = 1000;

export async function fetchAllLeads() {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/** @param {{ industry?: string, status?: string }} filter */
export async function fetchLeadsBatched(filter = {}) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (filter.industry) q = q.eq("industry", filter.industry);
    if (filter.status) q = q.eq("status", filter.status);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function listCampaigns() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listEmailLogs(limit = 2000) {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
