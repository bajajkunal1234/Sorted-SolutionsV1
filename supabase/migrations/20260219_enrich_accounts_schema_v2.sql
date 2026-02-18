-- =====================================================
-- ENRICH ACCOUNTS SCHEMA V2
-- Purpose: Add remaining missing columns and Fixed Asset fields
-- =====================================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS as_on_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS balance_type TEXT DEFAULT 'dr',
ADD COLUMN IF NOT EXISTS asset_category TEXT,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS purchase_value DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_method TEXT,
ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS useful_life INTEGER DEFAULT 0;

-- Ensure status exists (sometimes missed)
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
