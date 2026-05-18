-- Migration: Add unique constraints to ledger_id in customers and technicians tables
-- Purpose: Required for ON CONFLICT upsert operations during account updates and creation in /api/admin/accounts

ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_customers_ledger_id;
ALTER TABLE customers ADD CONSTRAINT unique_customers_ledger_id UNIQUE (ledger_id);

ALTER TABLE technicians DROP CONSTRAINT IF EXISTS unique_technicians_ledger_id;
ALTER TABLE technicians ADD CONSTRAINT unique_technicians_ledger_id UNIQUE (ledger_id);

NOTIFY pgrst, 'reload schema';
