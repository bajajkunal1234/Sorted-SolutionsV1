-- =====================================================
-- SORTED Solutions - Technician Accounting Link
-- Date: 2026-02-23
-- Purpose: Links technicians with accounting ledgers for payroll/expenses
-- =====================================================

-- 1. Add ledger_id to technicians table for direct link to accounts
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_technicians_ledger_id ON technicians(ledger_id);
