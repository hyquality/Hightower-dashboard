/**
 * Resend Webhook Handler
 * Tracks email events: opens, clicks, bounces, etc.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse Resend webhook event
 */
function parseEvent(type, data) {
  const base = {
    message_id: data.id,
    timestamp: new Date().toISOString()
  };

  switch (type) {
    case 'email.sent':
      return { ...base, event: 'sent' };

    case 'email.delivered':
      return { ...base, event: 'delivered' };

    case 'email.bounced':
      return { 
        ...base, 
        event: 'bounced',
        bounce_reason: data.bounce?.reason 
      };

    case 'email.complained':
      return { ...base, event: 'complained' };

    case 'email.opened':
      return { ...base, event: 'opened' };

    case 'email.clicked':
      return { 
        ...base, 
        event: 'clicked',
        url: data.click?.href 
      };

    case 'email.storage.limit.exceeded':
      return { ...base, event: 'storage_limit_exceeded' };

    default:
      return { ...base, event: type };
  }
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const signature = req.headers['webhook-signature'];
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const isValid = verifyWebhookSignature(
      JSON.stringify(req.body),
      signature,
      webhookSecret
    );
    
    if (!isValid) {
      console.error('[Resend Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const { type, data } = req.body;

  console.log(`[Resend Webhook] Received: ${type}`, data?.id);

  try {
    const event = parseEvent(type, data);

    // Store the event in email_events table
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        message_id: event.message_id,
        event: event.event,
        timestamp: event.timestamp,
        metadata: {
          bounce_reason: event.bounce_reason,
          url: event.url,
          raw_type: type,
          email_to: data.to
        }
      });

    if (insertError) {
      console.error('[Resend Webhook] Error inserting event:', insertError);
    }

    // Update email_logs based on event type
    if (event.event === 'delivered') {
      await supabase
        .from('email_logs')
        .update({ delivered: true })
        .eq('message_id', event.message_id);
    }

    if (event.event === 'opened') {
      await supabase
        .from('email_logs')
        .update({ opened: true })
        .eq('message_id', event.message_id);
    }

    if (event.event === 'clicked') {
      await supabase
        .from('email_logs')
        .update({ clicked: true })
        .eq('message_id', event.message_id);
    }

    if (event.event === 'bounced') {
      await supabase
        .from('email_logs')
        .update({ 
          bounced: true,
          bounce_reason: event.bounce_reason 
        })
        .eq('message_id', event.message_id);
    }

    // If clicked but not opened, mark as opened too
    if (event.event === 'clicked') {
      await supabase
        .from('email_logs')
        .update({ opened: true })
        .eq('message_id', event.message_id)
        .is('opened', false);
    }

    console.log(`[Resend Webhook] Processed: ${event.event} for ${event.message_id}`);

    return res.status(200).json({ success: true, event: event.event });
  } catch (error) {
    console.error('[Resend Webhook] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
