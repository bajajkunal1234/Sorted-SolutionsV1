-- ============================================================
-- Migration: Consolidate Page Settings Columns (Schema Repair)
-- Ensures all JSONB columns exist in page_settings regardless of
-- which previous partial migration was run.
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
  ADD COLUMN IF NOT EXISTS problems_settings JSONB DEFAULT '{
    "title": "Problems We Solve",
    "subtitle": "Expert solutions for all your appliance troubles",
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS brands_settings JSONB DEFAULT '{
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS localities_settings JSONB DEFAULT '{
    "title": "We''re in your neighbourhood",
    "subtitle": "Quick doorstep service across Mumbai",
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS services_settings JSONB DEFAULT '{
    "title": "Popular in your area",
    "subtitle": "Quality repairs at honest prices",
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS faqs_settings JSONB DEFAULT '{
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS subcategories_settings JSONB DEFAULT '{
    "title": "Appliance Types",
    "subtitle": "Choose your specific appliance",
    "items": []
  }',
  ADD COLUMN IF NOT EXISTS section_visibility JSONB DEFAULT '{
    "hero": true,
    "problems": true,
    "services": true,
    "localities": true,
    "brands": true,
    "faqs": true,
    "subcategories": true
  }',
  ADD COLUMN IF NOT EXISTS page_type VARCHAR(50);

-- Refresh comments
COMMENT ON TABLE page_settings IS 'Master table for all dynamic page configurations';
COMMENT ON COLUMN page_settings.hero_settings IS 'Hero section config';
COMMENT ON COLUMN page_settings.problems_settings IS 'Problem solve section config';
COMMENT ON COLUMN page_settings.brands_settings IS 'Brand display config';
COMMENT ON COLUMN page_settings.localities_settings IS 'Localities/Areas section config';
COMMENT ON COLUMN page_settings.services_settings IS 'Pricing/Services section config';
COMMENT ON COLUMN page_settings.faqs_settings IS 'FAQ mapping config';
COMMENT ON COLUMN page_settings.subcategories_settings IS 'Sub-appliances for categories';
COMMENT ON COLUMN page_settings.section_visibility IS 'Per-section visibility toggles';
