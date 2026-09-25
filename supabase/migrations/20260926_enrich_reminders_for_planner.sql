-- Enrich reminders table for Day Planner functionality (Payment reminders, Visit reminders, Daily tasks)
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_time TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_type ON reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date_status ON reminders(due_date, status);
