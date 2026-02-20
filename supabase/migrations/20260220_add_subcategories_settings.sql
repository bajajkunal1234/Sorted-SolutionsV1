-- Add subcategories_settings column to page_settings table
ALTER TABLE page_settings
    ADD COLUMN IF NOT EXISTS subcategories_settings JSONB DEFAULT '{"title": "", "subtitle": "", "items": []}'::jsonb;
