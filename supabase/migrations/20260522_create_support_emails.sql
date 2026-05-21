-- =====================================================
-- SORTED Solutions - Support Emails Schema Setup
-- Date: 2026-05-22
-- Purpose: Creates a table to store incoming customer support and personal emails
-- =====================================================

CREATE TABLE IF NOT EXISTS support_emails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email text NOT NULL, -- e.g. support@sortedsolutions.in or kunalbajaj@sortedsolutions.in
    sender_email text NOT NULL,
    sender_name text,
    subject text NOT NULL,
    body_text text,
    body_html text,
    status text NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'resolved', 'archived'
    received_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexing for fast search & filtering
CREATE INDEX IF NOT EXISTS idx_support_emails_recipient ON support_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_support_emails_sender ON support_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_support_emails_status ON support_emails(status);
CREATE INDEX IF NOT EXISTS idx_support_emails_received_at ON support_emails(received_at DESC);
