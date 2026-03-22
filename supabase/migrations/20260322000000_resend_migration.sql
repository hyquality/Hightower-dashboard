-- Migration: Add Resend email tracking
-- Run this in your Supabase SQL Editor

-- Create email_events table for granular tracking
CREATE TABLE IF NOT EXISTS email_events (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(255),
  event VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_events_message_id ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event ON email_events(event);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp DESC);

-- Add new columns to email_logs for better tracking
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_clicked_url TEXT,
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS device_info JSONB,
ADD COLUMN IF NOT EXISTS location JSONB;

-- Create function to update email_logs from email_events
CREATE OR REPLACE FUNCTION update_email_log_from_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event = 'opened' THEN
    UPDATE email_logs 
    SET opened = true, 
        opened_at = NEW.timestamp 
    WHERE message_id = NEW.message_id 
    AND (opened IS NOT TRUE OR opened IS NULL);
  ELSIF NEW.event = 'clicked' THEN
    UPDATE email_logs 
    SET clicked = true,
        clicked_at = NEW.timestamp,
        first_clicked_url = COALESCE(first_clicked_url, NEW.metadata->>'url'),
        total_clicks = total_clicks + 1
    WHERE message_id = NEW.message_id;
  ELSIF NEW.event = 'delivered' THEN
    UPDATE email_logs 
    SET delivered = true,
        delivered_at = NEW.timestamp
    WHERE message_id = NEW.message_id
    AND (delivered IS NOT TRUE OR delivered IS NULL);
  ELSIF NEW.event = 'bounced' THEN
    UPDATE email_logs 
    SET bounced = true,
        bounce_reason = NEW.metadata->>'bounce_reason',
        bounced_at = NEW.timestamp
    WHERE message_id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update email_logs
DROP TRIGGER IF EXISTS trigger_update_email_log_from_event ON email_events;
CREATE TRIGGER trigger_update_email_log_from_event
AFTER INSERT ON email_events
FOR EACH ROW
EXECUTE FUNCTION update_email_log_from_event();

-- Add source column to leads for better tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tech_stack TEXT,
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Create index for source lookups
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);

-- Enable RLS on email_events
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bypass)
CREATE POLICY "Service role can all" ON email_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users can read
CREATE POLICY "Authenticated users can read" ON email_events
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE email_events IS 'Stores granular email events from Resend webhooks';
COMMENT ON COLUMN email_events.message_id IS 'Resend message ID to link with email_logs';
COMMENT ON COLUMN email_events.event IS 'Event type: sent, delivered, opened, clicked, bounced, complained';
COMMENT ON COLUMN email_events.metadata IS 'Additional event data like URL, bounce reason, etc.';
