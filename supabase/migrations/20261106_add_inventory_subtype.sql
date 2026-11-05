-- =====================================================
-- Add subtype to inventory table (web vs tech)
-- Date: 2026-11-06
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS subtype TEXT DEFAULT 'tech';
UPDATE inventory SET subtype = 'tech' WHERE subtype IS NULL;

-- Create index for performance when querying web items
CREATE INDEX IF NOT EXISTS idx_inventory_subtype ON inventory(subtype);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
