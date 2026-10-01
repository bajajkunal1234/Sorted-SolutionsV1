-- =====================================================
-- Multi-Marketer Leads & ROI Tracker Schema Migration
-- Date: 2026-10-02
-- =====================================================

-- 1. Enhance lead_attributions for multi-marketer tracking and tips
ALTER TABLE public.lead_attributions
ADD COLUMN IF NOT EXISTS referrer_name TEXT,
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_category TEXT;

-- 2. Create marketing_expenses table for non-daily payments (JustDial subscription advance, tips, retainers, etc.)
CREATE TABLE IF NOT EXISTS public.marketing_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketer_key TEXT NOT NULL,                           -- 'justdial', 'renit', 'google_ads', 'meta_ads', 'referral', 'offline'
    marketer_display_name TEXT NOT NULL,                  -- 'JustDial', 'Renit', 'Google Ads', 'Personal Referral', etc.
    payment_type TEXT NOT NULL,                           -- 'subscription_advance', 'monthly_retainer', 'daily_spend', 'tip_commission', 'one_time'
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,            -- e.g. 8600.00
    period_start DATE,                                    -- e.g. 2026-10-01 (for JustDial 2 months advance)
    period_end DATE,                                      -- e.g. 2026-11-30
    categories_covered TEXT[],                            -- e.g. ['AC Repair', 'Washing Machine']
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,                                           -- e.g. "Paid 2 months advance @ 4300/mo via Bank Transfer"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_marketer ON public.marketing_expenses(marketer_key);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_period ON public.marketing_expenses(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_lead_attributions_referrer ON public.lead_attributions(referrer_name);

-- RLS policies
ALTER TABLE public.marketing_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users on marketing_expenses" ON public.marketing_expenses
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for public on marketing_expenses" ON public.marketing_expenses
    FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
