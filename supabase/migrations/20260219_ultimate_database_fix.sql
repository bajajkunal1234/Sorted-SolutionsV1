-- =====================================================
-- SORTED Solutions - Ultimate Database Fix & Sync
-- Date: 2026-02-19
-- Purpose: Resolves missing tables (account_groups, quick_booking_settings)
-- and handles existing policies idempotently.
-- =====================================================

-- 1. Create account_groups table
CREATE TABLE IF NOT EXISTS account_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    alias TEXT,
    parent TEXT,
    nature TEXT DEFAULT 'asset',
    "behavesAsSubLedger" BOOLEAN DEFAULT FALSE,
    "nettDebitCreditBalance" TEXT DEFAULT 'not-applicable',
    "usedForCalculation" TEXT DEFAULT 'none',
    "allocationMethod" TEXT DEFAULT 'not-applicable',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create quick_booking_settings table (if missing from v1)
CREATE TABLE IF NOT EXISTS quick_booking_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    title TEXT DEFAULT 'Book A Technician Now',
    subtitle TEXT DEFAULT 'Get same day service | Transparent pricing | Licensed technicians',
    serviceable_pincodes TEXT[] DEFAULT ARRAY['400001', '400002', '400003', '400004', '400005', '400008', '400012', '400014', '400050', '400051', '400052', '400053', '400063', '400070', '400077'],
    valid_pincode_message TEXT DEFAULT '✓ We serve here!',
    invalid_pincode_message TEXT DEFAULT '✗ Not serviceable',
    help_text TEXT DEFAULT 'We currently serve Mumbai areas. Call us for other locations.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- Insert initial row if missing
INSERT INTO quick_booking_settings (id, title, subtitle)
VALUES (1, 'Book A Technician Now', 'Get same day service | Transparent pricing | Licensed technicians')
ON CONFLICT (id) DO NOTHING;

-- Apply v2 updates (JSON categories)
ALTER TABLE quick_booking_settings ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

UPDATE quick_booking_settings 
SET categories = '[
    {
        "id": 1,
        "name": "Refrigerator",
        "showOnBookingForm": true,
        "order": 1,
        "subcategories": [
            {
                "id": 1, "name": "Single Door", "categoryId": 1, "showOnBookingForm": true, "order": 1,
                "issues": [
                    { "id": 1, "name": "Not Cooling", "subcategoryId": 1, "showOnBookingForm": true, "order": 1 },
                    { "id": 2, "name": "Ice Formation", "subcategoryId": 1, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    }
]'::jsonb
WHERE id = 1 AND (categories IS NULL OR categories = '[]'::jsonb);

-- 3. Idempotent Policy Management
-- Use a helper to avoid "policy already exists" errors

DO $$ 
BEGIN
    -- website_locations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'website_locations') THEN
        DROP POLICY IF EXISTS "Public read access for website_locations" ON website_locations;
        CREATE POLICY "Public read access for website_locations" ON website_locations FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow write for authenticated" ON website_locations;
        CREATE POLICY "Allow write for authenticated" ON website_locations FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- expenses (from reports schema)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'expenses') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON expenses;
        CREATE POLICY "Allow all for reports tables" ON expenses FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- amc_plans
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'amc_plans') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON amc_plans;
        CREATE POLICY "Allow all for reports tables" ON amc_plans FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- active_amcs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'active_amcs') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON active_amcs;
        CREATE POLICY "Allow all for reports tables" ON active_amcs FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- rental_plans
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rental_plans') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON rental_plans;
        CREATE POLICY "Allow all for reports tables" ON rental_plans FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- active_rentals
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'active_rentals') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON active_rentals;
        CREATE POLICY "Allow all for reports tables" ON active_rentals FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- website_settings
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'website_settings') THEN
        DROP POLICY IF EXISTS "Allow all for reports tables" ON website_settings;
        CREATE POLICY "Allow all for reports tables" ON website_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- account_groups
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'account_groups') THEN
        ALTER TABLE account_groups ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all for account_groups" ON account_groups;
        CREATE POLICY "Allow all for account_groups" ON account_groups FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Final Cleanup (Optional)
-- Ensure RLS is enabled for new tables
ALTER TABLE website_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_booking_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for quick_booking_settings" ON quick_booking_settings;
CREATE POLICY "Public read access for quick_booking_settings" ON quick_booking_settings FOR SELECT USING (true);
