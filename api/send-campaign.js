import { getServiceSupabase, requireAuthUser } from "./_lib/supabaseServer.js";
import { buildEmailHtml, sendBrevoEmail } from "./_lib/emailHtml.js";

async function fetchAllLeads(supabase) {
  const batchSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data: batch, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + batchSize - 1);
    if (error) throw error;
    all = all.concat(batch || []);
    if (!batch || batch.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const { campaign_id } = req.body || {};
    if (!campaign_id) {
      return res.status(400).json({ error: "campaign_id required" });
    }

    const supabase = getServiceSupabase();
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const allLeads = await fetchAllLeads(supabase);
    const targets = allLeads.filter((l) => {
      if (!l.email) return false;
      const matchIndustry =
        !campaign.filter_industry ||
        campaign.filter_industry === "All" ||
        l.industry === campaign.filter_industry;
      const matchStatus =
        !campaign.filter_status ||
        campaign.filter_status === "All" ||
        l.status === campaign.filter_status;
      return matchIndustry && matchStatus;
    });

    let sentCount = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const lead of targets) {
      const recipientName = lead.owner_name || lead.business_name || "there";
      const bodyText = (campaign.body || "")
        .replace(/\{name\}/gi, recipientName)
        .replace(/\{business\}/gi, lead.business_name || "");

      const htmlContent = buildEmailHtml({
        subject: campaign.subject,
        body: bodyText,
        recipientName,
      });

      try {
        const result = await sendBrevoEmail({
          to: lead.email,
          toName: recipientName,
          subject: campaign.subject,
          htmlContent,
        });

        const messageId = String(result.messageId || "").replace(/^<|>$/g, "");

        const { error: logErr } = await supabase.from("email_logs").insert({
          lead_id: lead.id,
          business_name: lead.business_name,
          email: lead.email,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          template: campaign.template,
          subject: campaign.subject,
          sent_date: today,
          status: "Sent",
          message_id: messageId || null,
        });
        if (logErr) throw logErr;

        const leadPatch =
          lead.status === "New"
            ? { email_sent: true, email_sent_date: today, status: "Contacted" }
            : { email_sent: true, email_sent_date: today };
        await supabase.from("leads").update(leadPatch).eq("id", lead.id);

        sentCount++;
      } catch (e) {
        console.error(`Failed to send to ${lead.email}:`, e.message);
        await supabase.from("email_logs").insert({
          lead_id: lead.id,
          business_name: lead.business_name,
          email: lead.email,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          template: campaign.template,
          subject: campaign.subject,
          sent_date: today,
          status: "Failed",
        });
      }
    }

    await supabase
      .from("campaigns")
      .update({
        status: "Active",
        launched_date: today,
        sent_count: (campaign.sent_count || 0) + sentCount,
      })
      .eq("id", campaign_id);

    return res.status(200).json({
      success: true,
      sent: sentCount,
      total_targets: targets.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
