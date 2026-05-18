-- Migration: Add warranty columns to jobs table
-- Purpose: Resolves "Could not find the 'warranty' column of 'jobs' in the schema cache" error when creating/updating jobs

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS warranty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_proof TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
