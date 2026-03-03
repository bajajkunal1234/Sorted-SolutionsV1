-- Migration: Add new columns to jobs table for booking flow fixes
-- Run this in Supabase SQL Editor (or as a migration file)
-- All statements use IF NOT EXISTS so they are safe to run multiple times.

-- 1. source — track where the booking came from ('website', 'customer_app', 'admin')
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- 2. Update existing website booking_request rows to have source = 'website'
UPDATE jobs SET source = 'website' WHERE status = 'booking_request' AND source IS NULL;

-- 3. Full_name column on customers (for website-created records)
--    (customers table already has full_name from the signup flow, but add guard anyway)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT NULL;

-- 4. source column on customers (to track signup origin)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Done. The following columns are used by the updated APIs and were already confirmed present:
--   jobs: category, issue, description, scheduled_date, scheduled_time, notes, customer_id, property, status, stage, priority, job_number, customer_name
--   customers: phone, full_name, email, source, customer_type
