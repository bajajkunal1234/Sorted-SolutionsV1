-- =====================================================
-- ENRICH ACCOUNTS SCHEMA
-- Purpose: Add missing columns to 'accounts' table to match frontend form
-- =====================================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS alias TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mailing_name TEXT,
ADD COLUMN IF NOT EXISTS mailing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS pan TEXT,
ADD COLUMN IF NOT EXISTS state_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]';

-- Add index for SKU
CREATE INDEX IF NOT EXISTS idx_accounts_sku ON accounts(sku);
