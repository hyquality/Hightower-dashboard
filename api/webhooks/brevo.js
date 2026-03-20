import { getServiceSupabase } from "../_lib/supabaseServer.js";
import { verifyBrevoWebhook } from "../_lib/brevoWebhookAuth.js";

/**
 * Brevo transactional webhooks: https://developers.brevo.com/docs/transactional-webhooks
 * Opens often arrive as proxy_open / unique_proxy_open (Gmail image prefetch, etc.), not "opened".
 */

function normalizeMessageId(raw) {
  if (raw == null || raw === "") return "";
  return String(raw)
    .replace(/^<|>$/g, "")
    .trim();
}

function extractMessageId(payload) {
  const raw =
    payload["message-id"] ??
    payload.messageId ??
    payload.message_id ??
    payload.MessageId;
  return normalizeMessageId(raw);
}

function isOpenEvent(event) {
  return (
    event === "opened" ||
    event === "unique_opened" ||
    event === "open" ||
    event === "proxy_open" ||
    event === "unique_proxy_open"
  );
}

function isClickEvent(event) {
  return event === "click" || event === "clicked";
}

function isDeliveredEvent(event) {
  return event === "delivered" || event === "delivery";
}

function isBounceEvent(event) {
  return (
    event === "hard_bounce" ||
    event === "soft_bounce" ||
    event === "bounce"
  );
}

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
  const messageId = extractMessageId(payload);
  const recipientEmail = payload.email
    ? String(payload.email).trim().toLowerCase()
    : "";
  const subject = payload.subject ? String(payload.subject).trim() : "";

  if (!event) {
    return res.status(200).json({ ok: true });
  }

  let update = null;
  if (isOpenEvent(event)) {
    update = { opened: true };
  } else if (isClickEvent(event)) {
    update = { clicked: true };
  } else if (isDeliveredEvent(event)) {
    update = { status: "Delivered" };
  } else if (isBounceEvent(event)) {
    update = { status: "Bounced" };
  } else {
    return res.status(200).json({ ok: true, skipped: event });
  }

  // Opens need message-id OR (email + subject) for fallback — other events already work with message-id.
  if (!messageId && !(isOpenEvent(event) && recipientEmail && subject)) {
    return res.status(200).json({ ok: true, note: "no message-id or email+subject" });
  }

  try {
    const supabase = getServiceSupabase();

    let log = null;

    if (messageId) {
      const { data: logs, error: qErr } = await supabase
        .from("email_logs")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (qErr) throw qErr;
      log = logs?.[0];
    }

    // Some clients only send proxy_open; message-id format can differ from API response — match recent log.
    if (!log && isOpenEvent(event) && recipientEmail && subject) {
      const { data: logs, error: fbErr } = await supabase
        .from("email_logs")
        .select("*")
        .ilike("email", recipientEmail)
        .eq("subject", subject)
        .eq("opened", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (fbErr) throw fbErr;
      log = logs?.[0];
    }

    if (!log) {
      return res.status(200).json({
        ok: true,
        note: "no matching email_log",
        event,
        had_message_id: Boolean(messageId),
      });
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
