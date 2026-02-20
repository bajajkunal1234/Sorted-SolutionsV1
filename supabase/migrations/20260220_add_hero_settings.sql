-- Migration: Add hero_settings column to page_settings table
-- This allows admins to control the hero section (title, subtitle, background) per page.

ALTER TABLE page_settings
    ADD COLUMN IF NOT EXISTS hero_settings JSONB DEFAULT '{
        "title": "",
        "subtitle": "",
        "bg_type": "gradient",
        "bg_color_from": "#6366f1",
        "bg_color_to": "#4f46e5",
        "bg_image_url": "",
        "overlay_opacity": 0.85
    }'::jsonb;

-- Backfill existing rows - keep defaults as-is
UPDATE page_settings
SET hero_settings = '{
    "title": "",
    "subtitle": "",
    "bg_type": "gradient",
    "bg_color_from": "#6366f1",
    "bg_color_to": "#4f46e5",
    "bg_image_url": "",
    "overlay_opacity": 0.85
}'::jsonb
WHERE hero_settings IS NULL;
