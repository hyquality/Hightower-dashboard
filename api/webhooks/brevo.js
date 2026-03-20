import { getServiceSupabase } from "../_lib/supabaseServer.js";
import { verifyBrevoWebhook } from "../_lib/brevoWebhookAuth.js";

/**
 * Brevo transactional webhooks: https://developers.brevo.com/docs/transactional-webhooks
 *
 * Notes:
 * - Opens often arrive as proxy_open / unique_proxy_open (Gmail image prefetch).
 * - Clicks can be recorded without an "open" pixel (preview panes, some clients) — we set opened when a click is recorded.
 * - JSON keys may vary in casing; payload may be nested under `data` or `items`.
 */

function normalizeMessageId(raw) {
  if (raw == null || raw === "") return "";
  return String(raw)
    .replace(/^<|>$/g, "")
    .trim();
}

/** Collect root objects to read fields from (top-level + common nests). */
function walkPayloadRoots(payload) {
  const roots = [];
  if (!payload || typeof payload !== "object") return roots;
  roots.push(payload);
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    roots.push(payload.data);
  }
  if (Array.isArray(payload.items)) {
    for (const item of payload.items) {
      if (item && typeof item === "object") roots.push(item);
    }
  }
  return roots;
}

/** Case-insensitive match for message-id style keys. */
function extractMessageId(payload) {
  for (const root of walkPayloadRoots(payload)) {
    for (const [k, v] of Object.entries(root)) {
      if (v == null || v === "") continue;
      const normKey = k.toLowerCase().replace(/_/g, "-");
      if (normKey === "message-id" || normKey === "messageid") {
        const n = normalizeMessageId(v);
        if (n) return n;
      }
    }
  }
  return "";
}

function extractEvent(payload) {
  for (const root of walkPayloadRoots(payload)) {
    const e = root.event ?? root.Event ?? root.type ?? root.Type;
    if (e != null && String(e).trim() !== "") {
      return String(e).toLowerCase();
    }
  }
  return "";
}

function extractEmail(payload) {
  for (const root of walkPayloadRoots(payload)) {
    const e = root.email ?? root.Email;
    if (e != null && String(e).trim() !== "") {
      return String(e).trim().toLowerCase();
    }
  }
  return "";
}

function extractSubject(payload) {
  for (const root of walkPayloadRoots(payload)) {
    const s = root.subject ?? root.Subject;
    if (s != null && String(s).trim() !== "") {
      return String(s).trim();
    }
  }
  return "";
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

async function findLogByMessageId(supabase, messageId) {
  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("message_id", messageId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return logs?.[0] ?? null;
}

/** Opens: match log not yet marked opened (treat NULL like false). */
async function findLogForOpenFallback(supabase, recipientEmail, subject) {
  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("*")
    .ilike("email", recipientEmail)
    .eq("subject", subject)
    .or("opened.is.null,opened.eq.false")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return logs?.[0] ?? null;
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
  if (Buffer.isBuffer(payload)) {
    try {
      payload = JSON.parse(payload.toString("utf8"));
    } catch {
      return res.status(200).json({ ok: true });
    }
  }
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

  if (Array.isArray(payload) && payload.length > 0) {
    payload = payload[0];
  }

  const event = extractEvent(payload);
  const messageId = extractMessageId(payload);
  const recipientEmail = extractEmail(payload);
  const subject = extractSubject(payload);

  if (!event) {
    return res.status(200).json({ ok: true });
  }

  let update = null;
  if (isOpenEvent(event)) {
    update = { opened: true };
  } else if (isClickEvent(event)) {
    // Clicks often fire without a separate open webhook (clients that block images / previews).
    update = { clicked: true, opened: true };
  } else if (isDeliveredEvent(event)) {
    update = { status: "Delivered" };
  } else if (isBounceEvent(event)) {
    update = { status: "Bounced" };
  } else {
    return res.status(200).json({ ok: true, skipped: event });
  }

  if (
    !messageId &&
    !(isOpenEvent(event) && recipientEmail && subject)
  ) {
    if (isClickEvent(event) && recipientEmail && subject) {
      // Allow click+open inference when message-id is missing (rare).
    } else if (!isClickEvent(event)) {
      return res.status(200).json({ ok: true, note: "no message-id or email+subject" });
    }
  }

  try {
    const supabase = getServiceSupabase();

    let log = null;

    if (messageId) {
      log = await findLogByMessageId(supabase, messageId);
    }

    if (!log && isOpenEvent(event) && recipientEmail && subject) {
      log = await findLogForOpenFallback(supabase, recipientEmail, subject);
    }

    if (!log && isClickEvent(event) && recipientEmail && subject) {
      const { data: logs, error: fbErr } = await supabase
        .from("email_logs")
        .select("*")
        .ilike("email", recipientEmail)
        .eq("subject", subject)
        .order("created_at", { ascending: false })
        .limit(1);
      if (fbErr) throw fbErr;
      log = logs?.[0] ?? null;
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
