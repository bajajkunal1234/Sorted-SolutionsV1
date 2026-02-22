-- ============================================================
-- FINAL DATABASE REPAIR & SYNC (2026-02-22)
-- Run this in the Supabase SQL Editor to ensure all tables 
-- and columns are correctly configured for Website Settings.
-- ============================================================

-- 1. Consolidate page_settings columns
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
  ADD COLUMN IF NOT EXISTS page_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add missing display_order to page_brands_mapping
ALTER TABLE page_brands_mapping 
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. Ensure updated_at trigger exists (Optional but recommended)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_page_settings_updated_at') THEN
        CREATE TRIGGER update_page_settings_updated_at
        BEFORE UPDATE ON page_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 4. Enable RLS and add basic policies if missing
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_brands_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_faqs_mapping ENABLE ROW LEVEL SECURITY;

-- Allow public read (for live website)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for page_settings') THEN
        CREATE POLICY "Public read access for page_settings" ON page_settings FOR SELECT USING (true);
    END IF;
    -- Repeat for related tables...
END $$;

-- Allow all for authenticated (for Admin panel)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write for authenticated on page_settings') THEN
        CREATE POLICY "Allow write for authenticated on page_settings" ON page_settings FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Summary
COMMENT ON TABLE page_settings IS 'Consolidated table for Category, Sub-category, Location, and Sub-location settings';
