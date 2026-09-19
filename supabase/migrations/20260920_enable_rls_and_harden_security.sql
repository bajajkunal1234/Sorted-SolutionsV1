-- ==============================================================================
-- MIGRATION: Enable Row Level Security (RLS) and Harden Database Security
-- Date: 2026-09-20
-- Purpose: Resolves all 63 Supabase Security Advisor errors:
--   1. Fixes policy_exists_rls_disabled on public.website_testimonials
--   2. Enables RLS on all 60 public tables exposed without protection
--   3. Eliminates sensitive_columns_exposed on accounts and newera_loans
--   4. Grants read-only SELECT to public for marketing and booking catalog tables
--   5. Restricts all sensitive business/operational tables to service_role
--   6. Hardens exec_sql RPC function
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL 60 TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brand_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.frequently_booked_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.google_reviews_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.google_reviews_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.how_it_works_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interaction_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_log_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newera_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_voucher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_voucher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technician_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technician_live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technician_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technician_stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.website_section_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.website_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.why_choose_us_features ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PUBLIC READ-ONLY ACCESS FOR MARKETING & BOOKING CATALOG TABLES
-- ------------------------------------------------------------------------------
-- how_it_works_stages
DROP POLICY IF EXISTS "Public read access for how_it_works_stages" ON public.how_it_works_stages;
CREATE POLICY "Public read access for how_it_works_stages" ON public.how_it_works_stages FOR SELECT USING (true);

-- why_choose_us_features
DROP POLICY IF EXISTS "Public read access for why_choose_us_features" ON public.why_choose_us_features;
CREATE POLICY "Public read access for why_choose_us_features" ON public.why_choose_us_features FOR SELECT USING (true);

-- brand_logos
DROP POLICY IF EXISTS "Public read access for brand_logos" ON public.brand_logos;
CREATE POLICY "Public read access for brand_logos" ON public.brand_logos FOR SELECT USING (true);

-- frequently_booked_services
DROP POLICY IF EXISTS "Public read access for frequently_booked_services" ON public.frequently_booked_services;
CREATE POLICY "Public read access for frequently_booked_services" ON public.frequently_booked_services FOR SELECT USING (true);

-- google_reviews_cache
DROP POLICY IF EXISTS "Public read access for google_reviews_cache" ON public.google_reviews_cache;
CREATE POLICY "Public read access for google_reviews_cache" ON public.google_reviews_cache FOR SELECT USING (true);

-- google_reviews_settings
DROP POLICY IF EXISTS "Public read access for google_reviews_settings" ON public.google_reviews_settings;
CREATE POLICY "Public read access for google_reviews_settings" ON public.google_reviews_settings FOR SELECT USING (true);

-- website_section_configs
DROP POLICY IF EXISTS "Public read access for website_section_configs" ON public.website_section_configs;
CREATE POLICY "Public read access for website_section_configs" ON public.website_section_configs FOR SELECT USING (true);

-- support_articles
DROP POLICY IF EXISTS "Public read access for support_articles" ON public.support_articles;
CREATE POLICY "Public read access for support_articles" ON public.support_articles FOR SELECT USING (true);

-- booking_brands
DROP POLICY IF EXISTS "Public read access for booking_brands" ON public.booking_brands;
CREATE POLICY "Public read access for booking_brands" ON public.booking_brands FOR SELECT USING (true);

-- booking_categories
DROP POLICY IF EXISTS "Public read access for booking_categories" ON public.booking_categories;
CREATE POLICY "Public read access for booking_categories" ON public.booking_categories FOR SELECT USING (true);

-- booking_subcategories
DROP POLICY IF EXISTS "Public read access for booking_subcategories" ON public.booking_subcategories;
CREATE POLICY "Public read access for booking_subcategories" ON public.booking_subcategories FOR SELECT USING (true);

-- booking_issues
DROP POLICY IF EXISTS "Public read access for booking_issues" ON public.booking_issues;
CREATE POLICY "Public read access for booking_issues" ON public.booking_issues FOR SELECT USING (true);

-- brands
DROP POLICY IF EXISTS "Public read access for brands" ON public.brands;
CREATE POLICY "Public read access for brands" ON public.brands FOR SELECT USING (true);

-- issues
DROP POLICY IF EXISTS "Public read access for issues" ON public.issues;
CREATE POLICY "Public read access for issues" ON public.issues FOR SELECT USING (true);

-- products
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
CREATE POLICY "Public read access for products" ON public.products FOR SELECT USING (true);

-- product_links
DROP POLICY IF EXISTS "Public read access for product_links" ON public.product_links;
CREATE POLICY "Public read access for product_links" ON public.product_links FOR SELECT USING (true);

-- inventory_brands
DROP POLICY IF EXISTS "Public read access for inventory_brands" ON public.inventory_brands;
CREATE POLICY "Public read access for inventory_brands" ON public.inventory_brands FOR SELECT USING (true);


-- ------------------------------------------------------------------------------
-- 3. SERVICE ROLE POLICIES FOR OPERATIONAL & SENSITIVE TABLES
-- (service_role has rolbypassrls, but explicit policies ensure clear documentation
-- and support environments where BYPASSRLS might not apply)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    internal_tables text[] := ARRAY[
        'accounts', 'agreement_templates', 'app_notifications', 'customer_feed_posts',
        'customer_properties', 'customers', 'inventory', 'inventory_items',
        'inventory_transactions', 'job_interactions', 'job_log_notes', 'job_reminders',
        'jobs', 'login_activity', 'newera_allocations', 'newera_interactions',
        'newera_loans', 'newera_members', 'newera_payments', 'newera_repayments',
        'newera_sessions', 'notification_logs', 'notification_templates',
        'notification_triggers', 'payment_voucher_allocations', 'payment_vouchers',
        'print_settings', 'properties', 'purchase_invoices', 'quotations',
        'receipt_voucher_allocations', 'receipt_vouchers', 'sales_invoices',
        'support_emails', 'technician_leaves', 'technician_live_locations',
        'technician_stock', 'technician_stock_transactions', 'technicians',
        'transaction_line_items', 'transactions', 'interaction_triggers'
    ];
BEGIN
    FOREACH tbl IN ARRAY internal_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Service role full access on %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. HARDEN DATABASE FUNCTIONS
-- Restrict exec_sql so only service_role can invoke it
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
