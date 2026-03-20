import { getServiceSupabase } from "../_lib/supabaseServer.js";
import { verifyBrevoWebhook } from "../_lib/brevoWebhookAuth.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!verifyBrevoWebhook(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(200).json({ ok: true });
    }
  }
  if (!payload || typeof payload !== "object") {
    return res.status(200).json({ ok: true });
  }

  const event = String(payload.event || "").toLowerCase();
  const rawMessageId =
    payload["message-id"] || payload.messageId || payload.message_id || "";
  const messageId = String(rawMessageId)
    .replace(/^<|>$/g, "")
    .trim();

  if (!event || !messageId) {
    return res.status(200).json({ ok: true });
  }

  let update = null;
  if (event === "opened" || event === "unique_opened" || event === "open") {
    update = { opened: true };
  } else if (event === "click" || event === "clicked") {
    update = { clicked: true };
  } else if (event === "delivered" || event === "delivery") {
    update = { status: "Delivered" };
  } else if (
    event === "hard_bounce" ||
    event === "soft_bounce" ||
    event === "bounce"
  ) {
    update = { status: "Bounced" };
  } else {
    return res.status(200).json({ ok: true, skipped: event });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: logs, error: qErr } = await supabase
      .from("email_logs")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qErr) throw qErr;
    const log = logs?.[0];
    if (!log) {
      return res.status(200).json({ ok: true, note: "no log for message_id" });
    }

    const { error: uErr } = await supabase
      .from("email_logs")
      .update(update)
      .eq("id", log.id);
    if (uErr) throw uErr;

    if (log.campaign_id) {
      if (update.opened && !log.opened) {
        const { data: camp } = await supabase
          .from("campaigns")
          .select("open_count")
          .eq("id", log.campaign_id)
          .single();
        await supabase
          .from("campaigns")
          .update({ open_count: (camp?.open_count || 0) + 1 })
          .eq("id", log.campaign_id);
      }
      if (update.clicked && !log.clicked) {
        const { data: camp } = await supabase
          .from("campaigns")
          .select("click_count")
          .eq("id", log.campaign_id)
          .single();
        await supabase
          .from("campaigns")
          .update({ click_count: (camp?.click_count || 0) + 1 })
          .eq("id", log.campaign_id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("brevo webhook error", e);
    return res.status(500).json({ error: e.message });
  }
}
