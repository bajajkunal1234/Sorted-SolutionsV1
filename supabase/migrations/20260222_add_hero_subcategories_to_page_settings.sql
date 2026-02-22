-- ============================================================
-- Migration: Add hero_settings + subcategories_settings columns
-- to page_settings table (they were missing, causing silent data loss)
-- ============================================================

ALTER TABLE page_settings
  ADD COLUMN IF NOT EXISTS hero_settings JSONB DEFAULT '{
    "title": "",
    "subtitle": "",
    "bg_type": "gradient",
    "bg_color_from": "#6366f1",
    "bg_color_to": "#4f46e5",
    "bg_image_url": "",
    "overlay_opacity": 0.85
  }',
  ADD COLUMN IF NOT EXISTS subcategories_settings JSONB DEFAULT '{
    "title": "Appliance Types",
    "subtitle": "Choose your specific appliance",
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS page_type VARCHAR(50);

COMMENT ON COLUMN page_settings.hero_settings IS 'Hero section config (bg, title, subtitle)';
COMMENT ON COLUMN page_settings.subcategories_settings IS 'Custom subcategory cards for category pages';
COMMENT ON COLUMN page_settings.page_type IS 'Type prefix: cat, sub, loc, sloc, etc.';
