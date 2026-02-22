-- ============================================================
-- Migration: Add section_visibility JSONB column to page_settings
-- Date: 2026-02-22
-- Description: Allows admins to hide/show individual sections
--              (hero, problems, services, localities, brands,
--               faqs, subcategories) on each page independently.
--              Defaults to all visible (true) so existing pages
--              are unaffected.
-- ============================================================

ALTER TABLE page_settings
  ADD COLUMN IF NOT EXISTS section_visibility JSONB DEFAULT '{
    "hero": true,
    "problems": true,
    "services": true,
    "localities": true,
    "brands": true,
    "faqs": true,
    "subcategories": true
  }';

COMMENT ON COLUMN page_settings.section_visibility IS
  'Per-section visibility flags for the live website. All default to true.';
