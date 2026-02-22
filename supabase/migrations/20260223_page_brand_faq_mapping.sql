-- ============================================================
-- CREATE: page_brands_mapping and page_faqs_mapping
-- Date: 2026-02-23
--
-- These tables store the many-to-many relationship between
-- a page (by page_id) and the selected brands / FAQs from
-- the global library (website_brands / website_faqs).
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Page → Brand mapping ─────────────────────────────────
CREATE TABLE IF NOT EXISTS page_brands_mapping (
    id              BIGSERIAL PRIMARY KEY,
    page_id         TEXT        NOT NULL,
    brand_id        UUID        NOT NULL REFERENCES website_brands(id) ON DELETE CASCADE,
    display_order   INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, brand_id)
);

-- ── 2. Page → FAQ mapping ────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_faqs_mapping (
    id              BIGSERIAL PRIMARY KEY,
    page_id         TEXT        NOT NULL,
    faq_id          UUID        NOT NULL REFERENCES website_faqs(id) ON DELETE CASCADE,
    display_order   INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, faq_id)
);

-- ── 3. Enable RLS ────────────────────────────────────────────
ALTER TABLE page_brands_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_faqs_mapping   ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS policies ─────────────────────────────────────────
-- Public read (live website needs these)
DROP POLICY IF EXISTS "Public read access for page_brands_mapping" ON page_brands_mapping;
CREATE POLICY "Public read access for page_brands_mapping"
    ON page_brands_mapping FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for page_faqs_mapping" ON page_faqs_mapping;
CREATE POLICY "Public read access for page_faqs_mapping"
    ON page_faqs_mapping FOR SELECT USING (true);

-- Full write access (admin panel uses service role key, which bypasses RLS,
-- but these policies cover anon + authenticated clients if ever needed)
DROP POLICY IF EXISTS "Allow write for page_brands_mapping" ON page_brands_mapping;
CREATE POLICY "Allow write for page_brands_mapping"
    ON page_brands_mapping FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow write for page_faqs_mapping" ON page_faqs_mapping;
CREATE POLICY "Allow write for page_faqs_mapping"
    ON page_faqs_mapping FOR ALL USING (true);

-- ── 5. Indexes for fast lookup by page_id ────────────────────
CREATE INDEX IF NOT EXISTS idx_page_brands_mapping_page_id ON page_brands_mapping(page_id);
CREATE INDEX IF NOT EXISTS idx_page_faqs_mapping_page_id   ON page_faqs_mapping(page_id);
