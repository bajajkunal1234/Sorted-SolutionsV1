-- ============================================================
-- Sorted Solutions — Job Status Lifecycle Migration
-- Run this ONCE in Supabase SQL Runner (Admin > Reports > SQL)
-- ============================================================

-- STEP 1: Add new columns (safe — IF NOT EXISTS prevents errors on re-run)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source              text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS on_way_at           timestamptz;   -- when tech clicks "Start Job & Share Location"
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS arrived_at          timestamptz;   -- when tech clicks "Mark as Arrived"
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quotation_approved_at  timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS repair_note_added_at   timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at          timestamptz;   -- when job work actually starts
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at        timestamptz;   -- when job is closed/completed


-- STEP 2: Drop any existing CHECK constraint on status (so migration doesn't violate it)
-- ─────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;


-- STEP 3: Migrate existing status values to new canonical values
-- ─────────────────────────────────────────────────────────────

UPDATE jobs SET status = 'new_job_request'   WHERE status IN ('booking_request');
UPDATE jobs SET status = 'scheduled'          WHERE status IN ('assigned');
UPDATE jobs SET status = 'work_in_progress'   WHERE status IN ('in-progress', 'in_progress');
UPDATE jobs SET status = 'quotation_sent'     WHERE status IN ('quotation-sent', 'quotation_sent');
UPDATE jobs SET status = 'parts_ordered'      WHERE status IN ('spare-part-needed', 'spare_part_needed', 'spare-part-ordered', 'spare_part_ordered');
UPDATE jobs SET status = 'closed'             WHERE status IN ('completed');
-- 'cancelled' and 'rejected' stay as is (rejected → cancelled)
UPDATE jobs SET status = 'cancelled'          WHERE status IN ('rejected');
-- Clear any garbage free-text statuses to new_job_request (safe default)
UPDATE jobs SET status = 'new_job_request'
  WHERE status NOT IN (
    'new_job_request', 'scheduled', 'diagnosing_quoting', 'quotation_sent',
    'parts_ordered', 'work_in_progress', 'cx_reschedule', 'cancelled', 'closed'
  );


-- STEP 4: Backfill source column for existing jobs (best-effort)
-- ───────────────────────────────────────────────────────────────

-- Jobs that were customer app bookings (notes contains bookingData JSON with applianceType)
UPDATE jobs
SET source = 'customer_app'
WHERE source IS NULL
  AND notes IS NOT NULL
  AND notes::text LIKE '%"applianceType"%';


-- STEP 5: Add CHECK constraint — enforces 9-status machine going forward
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'new_job_request',
    'scheduled',
    'diagnosing_quoting',
    'quotation_sent',
    'parts_ordered',
    'work_in_progress',
    'cx_reschedule',
    'cancelled',
    'closed'
  ));


-- STEP 6: Verification queries — run these after to confirm success
-- ─────────────────────────────────────────────────────────────────

-- Should show only the 9 canonical values (no old strings):
SELECT status, COUNT(*) as job_count
FROM jobs
GROUP BY status
ORDER BY job_count DESC;

-- Should show the new columns exist:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('source', 'on_way_at', 'arrived_at', 'quotation_approved_at', 'repair_note_added_at', 'started_at', 'completed_at')
ORDER BY column_name;

-- Test the constraint is active (this should FAIL with a constraint violation):
-- INSERT INTO jobs (status) VALUES ('garbage_status');
