-- ============================================
-- SORTED Solutions - Granular Page Settings
-- ============================================

-- Table: page_settings
-- Purpose: Store granular configuration for all page types (Category, Sub-Category, Location, Sub-Location)
CREATE TABLE IF NOT EXISTS page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id VARCHAR(255) UNIQUE NOT NULL, -- Logical ID like 'sloc-andheri-ac' or 'loc-malad'
  problems_settings JSONB DEFAULT '{
    "title": "Problems We Solve",
    "subtitle": "Expert solutions for all your appliance troubles",
    "items": []
  }',
  brands_settings JSONB DEFAULT '{
    "items": []
  }',
  localities_settings JSONB DEFAULT '{
    "title": "We''re in your neighbourhood",
    "subtitle": "Quick doorstep service across Mumbai",
    "items": []
  }',
  services_settings JSONB DEFAULT '{
    "title": "Popular in your area",
    "subtitle": "Quality repairs at honest prices",
    "items": []
  }',
  faqs_settings JSONB DEFAULT '{
    "items": []
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by page_id
CREATE INDEX IF NOT EXISTS idx_page_settings_page_id ON page_settings(page_id);

-- Update trigger for updated_at
CREATE TRIGGER update_page_settings_updated_at BEFORE UPDATE ON page_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for clarity
COMMENT ON COLUMN page_settings.page_id IS 'Logical identifier mapped to the WebsiteSettings UI';
COMMENT ON COLUMN page_settings.problems_settings IS 'JSON structure for Problem Solve section';
COMMENT ON COLUMN page_settings.brands_settings IS 'List of brand IDs to display';
COMMENT ON COLUMN page_settings.localities_settings IS 'Neighborhoods and titles for location pages';
COMMENT ON COLUMN page_settings.services_settings IS 'Dynamic service list with pricing';
COMMENT ON COLUMN page_settings.faqs_settings IS 'List of global FAQ IDs to show on this page';
