-- =====================================================
-- SORTED Admin App - Database Schema Migration
-- Phase 2b: Job Sub-Entities (Notes, Interactions, Reminders)
-- =====================================================

-- 1. Job Log Notes
CREATE TABLE IF NOT EXISTS job_log_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    added_by TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    files JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Job Interactions
CREATE TABLE IF NOT EXISTS job_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- created, assigned, status_change, note_added, etc.
    message TEXT NOT NULL,
    user_name TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Job Reminders
CREATE TABLE IF NOT EXISTS job_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_log_notes_job_id ON job_log_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_interactions_job_id ON job_interactions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reminders_job_id ON job_reminders(job_id);

-- Enable RLS (disabled for development)
-- ALTER TABLE job_log_notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE job_interactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE job_reminders ENABLE ROW LEVEL SECURITY;
