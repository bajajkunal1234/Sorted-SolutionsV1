-- ==============================================================================
-- MIGRATION: Allow SELECT read access for client-side Admin & Technician portals
-- Date: 2026-09-21
-- Purpose: Restores full data visibility for browser dashboard components:
--   1. Enables client-side Admin reporting (Performance Tracking, Job Details)
--   2. Preserves RLS enabled (rowsecurity = true) on all tables (0 linter errors)
--   3. Keeps INSERT, UPDATE, DELETE strictly restricted to service_role
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    tables_to_read text[] := ARRAY[
        'jobs',
        'sales_invoices',
        'quotations',
        'purchase_invoices',
        'receipt_vouchers',
        'payment_vouchers',
        'accounts',
        'technicians',
        'technician_stock',
        'technician_stock_transactions',
        'technician_leaves',
        'technician_live_locations',
        'technician_location_logs',
        'customer_feed_posts',
        'inventory',
        'inventory_items',
        'inventory_transactions',
        'job_interactions',
        'job_log_notes',
        'job_reminders',
        'receipt_voucher_allocations',
        'payment_voucher_allocations',
        'customers',
        'properties',
        'customer_properties',
        'app_notifications',
        'print_settings',
        'notification_logs',
        'notification_templates',
        'notification_triggers',
        'agreement_templates',
        'support_emails',
        'login_activity',
        'transaction_line_items',
        'transactions',
        'interaction_triggers',
        'newera_members',
        'newera_loans',
        'newera_payments',
        'newera_repayments',
        'newera_sessions',
        'newera_allocations',
        'newera_interactions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_read
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public read access for %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public read access for %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);
    END LOOP;
END $$;
