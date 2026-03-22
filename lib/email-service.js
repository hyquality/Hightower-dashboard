/**
 * Hightower Email Service
 * Uses Resend API for sending emails with granular event tracking
 * 
 * Replaces Brevo with Resend for:
 * - Transactional emails
 * - Campaign emails
 * - Better open/click tracking
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a single transactional email
 */
export async function sendTransactionalEmail({ to, subject, html, text, from, replyTo }) {
  const senderEmail = from || process.env.RESEND_SENDER_EMAIL || 'Hightower Funding <noreply@hightowerfunding.com>';
  
  try {
    const data = await resend.emails.send({
      from: senderEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
      headers: {
        'X-Campaign-ID': `campaign_${Date.now()}`,
        'X-Entity-Ref-ID': `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    return {
      success: true,
      messageId: data.data?.id,
      ...data
    };
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send bulk campaign emails
 * Uses batch API for better performance
 */
export async function sendCampaignEmails({ campaignId, recipients, subject, html, text, from }) {
  const senderEmail = from || process.env.RESEND_SENDER_EMAIL || 'Hightower Funding <noreply@hightowerfunding.com>';

  // Resend batch allows up to 100 emails per request
  const batchSize = 100;
  const results = {
    sent: 0,
    failed: 0,
    errors: [],
    messageIds: []
  };

  try {
    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const emails = batch.map((recipient, index) => ({
        from: senderEmail,
        to: recipient.email,
        subject: subject,
        html: typeof html === 'function' ? html(recipient) : html,
        text: typeof text === 'function' ? text(recipient) : text,
        reply_to: recipient.replyTo,
        tags: [
          { name: 'campaign_id', value: campaignId },
          { name: 'lead_id', value: recipient.leadId || '' },
        ],
        headers: {
          'X-Campaign-ID': campaignId,
          'X-Lead-ID': recipient.leadId || '',
          'X-Entity-Ref-ID': `lead_${recipient.leadId || index}_${Date.now()}`,
        },
      }));

      const data = await resend.batch.send(emails);
      
      if (data.data?.ids) {
        results.sent += data.data.ids.length;
        results.messageIds.push(...data.data.ids);
      } else if (data.error) {
        results.failed += batch.length;
        results.errors.push(data.error);
      }

      // Rate limiting - Resend allows 10 requests/second on free tier
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    return results;
  } catch (error) {
    console.error('[Email Service] Error sending campaign:', error);
    return {
      ...results,
      errors: [...results.errors, error.message]
    };
  }
}

/**
 * Create an email template
 */
export async function createTemplate({ name, subject, html }) {
  try {
    const data = await resend.templates.create({
      name,
      subject,
      html,
    });

    return {
      success: true,
      templateId: data.data?.id,
      ...data
    };
  } catch (error) {
    console.error('[Email Service] Error creating template:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send email using a template
 */
export async function sendWithTemplate({ templateId, to, dynamicData }) {
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL || 'Hightower Funding <noreply@hightowerfunding.com>',
      to: Array.isArray(to) ? to : [to],
      template_id: templateId,
      dynamic_data: dynamicData,
    });

    return {
      success: true,
      messageId: data.data?.id,
      ...data
    };
  } catch (error) {
    console.error('[Email Service] Error sending with template:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get email delivery statistics
 */
export async function getEmailStats(messageId) {
  try {
    const data = await resend.emails.get(messageId);
    return {
      success: true,
      ...data.data
    };
  } catch (error) {
    console.error('[Email Service] Error getting stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all emails (for tracking)
 */
export async function listEmails({ limit = 100, from }) {
  try {
    const data = await resend.emails.list({
      limit,
      from,
    });

    return {
      success: true,
      emails: data.data,
      ...data
    };
  } catch (error) {
    console.error('[Email Service] Error listing emails:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle Resend webhook events
 * Call this from your webhook handler
 */
export function parseResendWebhookEvent(payload) {
  const { type, data } = payload;

  switch (type) {
    case 'email.sent':
      return {
        event: 'sent',
        messageId: data.id,
        to: data.to,
        timestamp: new Date().toISOString()
      };

    case 'email.delivered':
      return {
        event: 'delivered',
        messageId: data.id,
        to: data.to,
        timestamp: new Date().toISOString()
      };

    case 'email.bounced':
      return {
        event: 'bounced',
        messageId: data.id,
        to: data.to,
        reason: data.bounce?.reason,
        timestamp: new Date().toISOString()
      };

    case 'email.complained':
      return {
        event: 'complained',
        messageId: data.id,
        to: data.to,
        timestamp: new Date().toISOString()
      };

    case 'email.opened':
      return {
        event: 'opened',
        messageId: data.id,
        to: data.to,
        timestamp: new Date().toISOString()
      };

    case 'email.clicked':
      return {
        event: 'clicked',
        messageId: data.id,
        to: data.to,
        url: data.click?.href,
        timestamp: new Date().toISOString()
      };

    default:
      return {
        event: 'unknown',
        type,
        data,
        timestamp: new Date().toISOString()
      };
  }
}

export default {
  sendTransactionalEmail,
  sendCampaignEmails,
  createTemplate,
  sendWithTemplate,
  getEmailStats,
  listEmails,
  parseResendWebhookEvent
};
