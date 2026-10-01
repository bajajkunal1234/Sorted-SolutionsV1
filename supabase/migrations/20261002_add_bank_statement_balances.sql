-- Migration: Add opening and closing balance to bank_statements and balance to bank_statement_transactions
-- Purpose: Enable weekly reconciliation against uploaded bank statements and closing balance discrepancy checks

ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;
ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS closing_balance NUMERIC DEFAULT 0;
ALTER TABLE bank_statement_transactions ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE bank_statement_transactions ADD COLUMN IF NOT EXISTS system_entry_type TEXT;
ALTER TABLE bank_statement_transactions ADD COLUMN IF NOT EXISTS system_entry_id UUID;
ALTER TABLE bank_alerts_log ADD COLUMN IF NOT EXISTS system_entry_type TEXT;
ALTER TABLE bank_alerts_log ADD COLUMN IF NOT EXISTS system_entry_id UUID;

NOTIFY pgrst, 'reload schema';
