-- Add missing columns to print_settings table
-- These are referenced by the print-settings API but were never added to the schema

ALTER TABLE print_settings
    ADD COLUMN IF NOT EXISTS pan TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS invoice_show_gst BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS quotation_show_gst BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS rental_show_gst BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS amc_show_gst BOOLEAN DEFAULT true;

-- Refresh the schema cache so PostgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
