-- =====================================================
-- Add dealer_price and retail_price to inventory table
-- Run this in Supabase SQL Editor
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS dealer_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10, 2) DEFAULT 0;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
  AND column_name IN ('sale_price', 'purchase_price', 'dealer_price', 'retail_price')
ORDER BY column_name;
