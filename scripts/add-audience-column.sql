-- Run this in Supabase SQL Editor
-- Adds the 'audience' column to support_articles for controlling technician visibility

ALTER TABLE public.support_articles 
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all' 
CHECK (audience IN ('all', 'admin'));

-- Update the RLS policy to hide admin-only articles from non-admin reads
-- (The API also filters this, but belt-and-suspenders)
DROP POLICY IF EXISTS "public_read_published" ON public.support_articles;

CREATE POLICY "public_read_published"
ON public.support_articles
FOR SELECT
USING (is_published = true AND audience = 'all');

CREATE POLICY "service_role_read_all"
ON public.support_articles
FOR SELECT
TO service_role
USING (true);
