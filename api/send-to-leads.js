import { getServiceSupabase, requireAuthUser } from "./_lib/supabaseServer.js";
import { buildEmailHtml, sendBrevoEmail } from "./_lib/emailHtml.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const { campaign_id, lead_ids, leads: leadsPayload } = req.body || {};
    if (!campaign_id || !lead_ids?.length) {
      return res.status(400).json({ error: "campaign_id and lead_ids required" });
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

    const validLeads = (leadsPayload || []).filter((l) => l && l.email);
    if (validLeads.length === 0) {
      return res.status(200).json({ success: true, sent: 0, total_targets: 0 });
    }

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.all(
      validLeads.map(async (lead) => {
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
          return {
            lead,
            messageId: String(result.messageId || "").replace(/^<|>$/g, ""),
            success: true,
          };
        } catch (e) {
          console.error(`Failed to send to ${lead.email}:`, e.message);
          return { lead, success: false };
        }
      })
    );

    const successResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    const emailLogs = [
      ...successResults.map((r) => ({
        lead_id: r.lead.id,
        business_name: r.lead.business_name,
        email: r.lead.email,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        template: campaign.template,
        subject: campaign.subject,
        sent_date: today,
        status: "Sent",
        message_id: r.messageId || null,
      })),
      ...failedResults.map((r) => ({
        lead_id: r.lead.id,
        business_name: r.lead.business_name,
        email: r.lead.email,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        template: campaign.template,
        subject: campaign.subject,
        sent_date: today,
        status: "Failed",
      })),
    ];

    const { error: insErr } = await supabase.from("email_logs").insert(emailLogs);
    if (insErr) throw insErr;

    await Promise.all(
      successResults.map((r) => {
        const patch = {
          email_sent: true,
          email_sent_date: today,
          ...(r.lead.status === "New" ? { status: "Contacted" } : {}),
        };
        return supabase.from("leads").update(patch).eq("id", r.lead.id);
      })
    );

    await supabase
      .from("campaigns")
      .update({ sent_count: (campaign.sent_count || 0) + successResults.length })
      .eq("id", campaign_id);

    return res.status(200).json({
      success: true,
      sent: successResults.length,
      total_targets: validLeads.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
