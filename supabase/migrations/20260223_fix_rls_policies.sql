-- ============================================================
-- FIX: Missing RLS SELECT policies on page mapping tables
-- Date: 2026-02-23
-- 
-- The previous migration enabled RLS on page_problems, page_services,
-- page_localities, page_brands_mapping, and page_faqs_mapping — but
-- only created a SELECT policy for page_settings. The mapping tables
-- had NO SELECT policy, causing reads to always return empty [].
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop old policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Public read access for page_problems" ON page_problems;
DROP POLICY IF EXISTS "Public read access for page_services" ON page_services;
DROP POLICY IF EXISTS "Public read access for page_localities" ON page_localities;
DROP POLICY IF EXISTS "Public read access for page_brands_mapping" ON page_brands_mapping;
DROP POLICY IF EXISTS "Public read access for page_faqs_mapping" ON page_faqs_mapping;
DROP POLICY IF EXISTS "Allow write for authenticated on page_problems" ON page_problems;
DROP POLICY IF EXISTS "Allow write for authenticated on page_services" ON page_services;
DROP POLICY IF EXISTS "Allow write for authenticated on page_localities" ON page_localities;
DROP POLICY IF EXISTS "Allow write for authenticated on page_brands_mapping" ON page_brands_mapping;
DROP POLICY IF EXISTS "Allow write for authenticated on page_faqs_mapping" ON page_faqs_mapping;

-- Public read access for all page mapping tables (needed for live website + admin panel)
CREATE POLICY "Public read access for page_problems"
    ON page_problems FOR SELECT USING (true);

CREATE POLICY "Public read access for page_services"
    ON page_services FOR SELECT USING (true);

CREATE POLICY "Public read access for page_localities"
    ON page_localities FOR SELECT USING (true);

CREATE POLICY "Public read access for page_brands_mapping"
    ON page_brands_mapping FOR SELECT USING (true);

CREATE POLICY "Public read access for page_faqs_mapping"
    ON page_faqs_mapping FOR SELECT USING (true);

-- Allow full write access for authenticated users (admin panel)
CREATE POLICY "Allow write for authenticated on page_problems"
    ON page_problems FOR ALL USING (true);

CREATE POLICY "Allow write for authenticated on page_services"
    ON page_services FOR ALL USING (true);

CREATE POLICY "Allow write for authenticated on page_localities"
    ON page_localities FOR ALL USING (true);

CREATE POLICY "Allow write for authenticated on page_brands_mapping"
    ON page_brands_mapping FOR ALL USING (true);

CREATE POLICY "Allow write for authenticated on page_faqs_mapping"
    ON page_faqs_mapping FOR ALL USING (true);
