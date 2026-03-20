-- =====================================================
-- Fix: Ensure all inventory columns exist & reload schema cache
-- Run this in Supabase SQL Editor
-- =====================================================

-- Re-add all inventory columns (safe, idempotent)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pcs';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opening_balance_qty DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opening_balance_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_stock DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sac_code TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS visible_on_website BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS service_terms_template TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Reload PostgREST schema cache so it picks up all columns
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
ORDER BY ordinal_position;
