/**
 * Send Campaign using Resend API
 * Replaces Brevo with Resend for better tracking
 */

import { getServiceSupabase, requireAuthUser } from './_lib/supabaseServer.js';
import { sendCampaignEmails } from '../lib/email-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const { campaignId, subject, html, text } = req.body || {};

  if (!campaignId || !subject) {
    return res.status(400).json({ error: 'campaignId and subject are required' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({
      error: 'Resend is not configured. Set RESEND_API_KEY on the server.'
    });
  }

  const supabase = getServiceSupabase();

  try {
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get leads for campaign
    const { data: campaignLeads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select(`
        lead_id,
        leads (
          id,
          email,
          business_name,
          contact_name,
          owner_name
        )
      `)
      .eq('campaign_id', campaignId);

    if (leadsError) {
      return res.status(500).json({ error: 'Failed to fetch campaign leads' });
    }

    // Prepare recipients
    const recipients = campaignLeads
      .filter(cl => cl.leads?.email)
      .map(cl => ({
        email: cl.leads.email,
        leadId: cl.lead_id,
        businessName: cl.leads.business_name,
        contactName: cl.leads.contact_name || cl.leads.owner_name
      }));

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    // Generate personalized HTML
    const personalizedHtml = (recipient) => {
      let htmlContent = html
        .replace(/{{business_name}}/g, recipient.businessName || '')
        .replace(/{{contact_name}}/g, recipient.contactName || 'there')
        .replace(/{{email}}/g, recipient.email);
      
      return htmlContent;
    };

    const personalizedText = (recipient) => {
      let textContent = (text || '')
        .replace(/{{business_name}}/g, recipient.businessName || '')
        .replace(/{{contact_name}}/g, recipient.contactName || 'there')
        .replace(/{{email}}/g, recipient.email);
      
      return textContent;
    };

    // Send emails via Resend
    const result = await sendCampaignEmails({
      campaignId: String(campaignId),
      recipients,
      subject,
      html: personalizedHtml,
      text: personalizedText
    });

    // Create email logs
    const emailLogs = recipients.map(recipient => ({
      campaign_id: campaignId,
      lead_id: recipient.leadId,
      recipient_email: recipient.email,
      subject,
      sent_at: new Date().toISOString(),
      // Message IDs will be updated when webhooks come in
    }));

    // Bulk insert email logs
    const { error: logsError } = await supabase
      .from('email_logs')
      .insert(emailLogs);

    if (logsError) {
      console.error('[Send Campaign] Error creating logs:', logsError);
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: result.sent
      })
      .eq('id', campaignId);

    return res.status(200).json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      messageIds: result.messageIds?.slice(0, 10) // Return first 10
    });

  } catch (error) {
    console.error('[Send Campaign] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
