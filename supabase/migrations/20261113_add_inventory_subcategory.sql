-- =====================================================
-- Add subcategory to inventory table (for Web subtype)
-- Date: 2026-11-13
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Create index for performance when querying web items by subcategory
CREATE INDEX IF NOT EXISTS idx_inventory_subcategory ON inventory(subcategory);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
