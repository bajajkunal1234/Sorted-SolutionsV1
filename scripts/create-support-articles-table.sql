-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Creates the support_articles table for the SOP knowledge base system

CREATE TABLE IF NOT EXISTS public.support_articles (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          text UNIQUE NOT NULL,
    title         text NOT NULL,
    icon          text DEFAULT '📄',
    category      text NOT NULL,
    tags          text[] DEFAULT '{}',
    content       text NOT NULL DEFAULT '',
    admin_content text DEFAULT '',
    is_published  boolean DEFAULT true,
    order_index   int DEFAULT 0,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

-- Index for fast category + published lookups
CREATE INDEX IF NOT EXISTS idx_support_articles_category ON public.support_articles(category);
CREATE INDEX IF NOT EXISTS idx_support_articles_published ON public.support_articles(is_published);

-- Enable Row Level Security (allow public read, admin writes handled at API layer)
ALTER TABLE public.support_articles ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read published articles
CREATE POLICY "public_read_published"
ON public.support_articles
FOR SELECT
USING (is_published = true);

-- Policy: service role can do everything (your API uses service role key)
CREATE POLICY "service_role_all"
ON public.support_articles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
