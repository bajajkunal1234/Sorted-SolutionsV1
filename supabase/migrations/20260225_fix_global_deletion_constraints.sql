-- ============================================================
-- Fix Global Brand & FAQ Deletion Constraints
-- Date: 2026-02-25
--
-- This migration ensures that deleting a global brand or FAQ
-- automatically removes its mappings on service pages, and
-- that the admin panel has explicit RLS permission to delete.
-- ============================================================

-- 1. Fix page_brands_mapping constraints
ALTER TABLE IF EXISTS page_brands_mapping 
    DROP CONSTRAINT IF EXISTS page_brands_mapping_brand_id_fkey;

ALTER TABLE IF EXISTS page_brands_mapping 
    ADD CONSTRAINT page_brands_mapping_brand_id_fkey 
    FOREIGN KEY (brand_id) 
    REFERENCES website_brands(id) 
    ON DELETE CASCADE;

-- 2. Fix page_faqs_mapping constraints
ALTER TABLE IF EXISTS page_faqs_mapping 
    DROP CONSTRAINT IF EXISTS page_faqs_mapping_faq_id_fkey;

ALTER TABLE IF EXISTS page_faqs_mapping 
    ADD CONSTRAINT page_faqs_mapping_faq_id_fkey 
    FOREIGN KEY (faq_id) 
    REFERENCES website_faqs(id) 
    ON DELETE CASCADE;

-- 3. Ensure RLS allows DELETE for Admin (Service Role handles this usually, 
-- but these policies ensure the tables are fully "open" for all operations if RLS is enabled)

-- For website_brands
DROP POLICY IF EXISTS "Allow all for website_brands" ON website_brands;
CREATE POLICY "Allow all for website_brands" ON website_brands FOR ALL USING (true);

-- For website_faqs
DROP POLICY IF EXISTS "Allow all for website_faqs" ON website_faqs;
CREATE POLICY "Allow all for website_faqs" ON website_faqs FOR ALL USING (true);

-- For mapping tables
DROP POLICY IF EXISTS "Allow all for page_brands_mapping" ON page_brands_mapping;
CREATE POLICY "Allow all for page_brands_mapping" ON page_brands_mapping FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for page_faqs_mapping" ON page_faqs_mapping;
CREATE POLICY "Allow all for page_faqs_mapping" ON page_faqs_mapping FOR ALL USING (true);
