-- Migration: Add pricing columns to booking_issues table
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS)

-- 1. Price in rupees — NULL means "to be determined after diagnosis"
ALTER TABLE booking_issues ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL;

-- 2. Price label — e.g. "Starting from", "Fixed", "Up to"
ALTER TABLE booking_issues ADD COLUMN IF NOT EXISTS price_label TEXT DEFAULT 'Starting from';
