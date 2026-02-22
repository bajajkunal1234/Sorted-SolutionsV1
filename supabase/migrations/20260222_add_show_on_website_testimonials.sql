-- Add source column if it doesn't exist (needed for Google Reviews tracking)
ALTER TABLE website_testimonials
    ADD COLUMN IF NOT EXISTS source TEXT;

-- Add show_on_website column
-- Controls which reviews are shown publicly on the website
ALTER TABLE website_testimonials
    ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT false;

-- All existing rows were manually added before this feature existed, show them all
UPDATE website_testimonials
    SET show_on_website = true;

-- Index for fast public filtering
CREATE INDEX IF NOT EXISTS idx_website_testimonials_show_on_website
    ON website_testimonials (show_on_website);
