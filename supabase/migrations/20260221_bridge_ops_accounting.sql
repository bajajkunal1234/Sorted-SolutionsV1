-- =====================================================
-- SORTED Solutions - Accounting & Operations Bridge
-- Date: 2026-02-21
-- Purpose: Links customers/jobs with accounting ledgers/invoices
-- =====================================================

-- 1. Add ledger_id to customers table for direct link to accounts
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- 2. Add job_id to sales_invoices table for direct link to jobs
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_ledger_id ON customers(ledger_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_job_id ON sales_invoices(job_id);
