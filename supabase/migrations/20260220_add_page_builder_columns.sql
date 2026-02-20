-- Add page builder metadata columns to booking_categories
ALTER TABLE booking_categories
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'Package',
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

-- Add slug column to booking_subcategories for URL generation
ALTER TABLE booking_subcategories
    ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slugs for existing categories from their names
UPDATE booking_categories
SET slug = LOWER(REPLACE(name, ' ', '-')) || '-repair'
WHERE slug IS NULL;

-- Backfill slugs for existing subcategories from their names
UPDATE booking_subcategories
SET slug = LOWER(REPLACE(name, ' ', '-'))
WHERE slug IS NULL;
