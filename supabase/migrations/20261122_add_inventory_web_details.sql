-- =====================================================
-- SORTED Solutions - Inventory Web Details Extension
-- Date: 2026-11-22
-- Purpose: Add web_details JSONB column for service-specific website sections
--          (Our process, What's Included, What's Not Included, What we will need,
--           Warranty note, All brands, Feedbacks, FAQ's)
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS web_details JSONB DEFAULT '{}'::jsonb;
NOTIFY pgrst, 'reload schema';
