-- =====================================================
-- Google Ads Leads & ROI Tracker Schema
-- Date: 2026-06-06
-- =====================================================

-- Table 1: Google Ads Daily Campaign Spends
CREATE TABLE IF NOT EXISTS public.google_ads_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    amount_spent DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    clicks INTEGER DEFAULT 0 NOT NULL,
    impressions INTEGER DEFAULT 0 NOT NULL,
    conversions_recorded INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: Visitor Clicks (Call and WhatsApp clicks on the website)
CREATE TABLE IF NOT EXISTS public.visitor_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
    click_type TEXT NOT NULL CHECK (click_type IN ('call', 'whatsapp')),
    page_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 3: Lead Attributions (Tracks every contact, mapped to session details)
CREATE TABLE IF NOT EXISTS public.lead_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL, -- Normalized 10 digits
    name TEXT,
    session_id UUID REFERENCES public.visitor_sessions(id) ON DELETE SET NULL,
    lead_source TEXT NOT NULL, -- 'google_ads', 'organic', 'direct', 'manual_call', 'manual_whatsapp', etc.
    campaign TEXT,
    gclid TEXT,
    conversion_type TEXT, -- 'web_booking', 'web_enquiry', 'web_call', 'web_whatsapp', 'manual_call', 'manual_whatsapp'
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'converted', 'junk', 'lost')),
    notes TEXT,
    first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_date ON public.google_ads_daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_visitor_clicks_session_id ON public.visitor_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_clicks_created_at ON public.visitor_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_attributions_phone ON public.lead_attributions(phone);
CREATE INDEX IF NOT EXISTS idx_lead_attributions_session_id ON public.lead_attributions(session_id);
CREATE INDEX IF NOT EXISTS idx_lead_attributions_created_at ON public.lead_attributions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.google_ads_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attributions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Enable all operations for authenticated users on google_ads_daily_metrics" ON public.google_ads_daily_metrics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users on visitor_clicks" ON public.visitor_clicks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users on lead_attributions" ON public.lead_attributions
    FOR ALL USING (auth.role() = 'authenticated');

-- Public inserts for visitor clicks (so website can track them without auth)
CREATE POLICY "Enable insert access for public on visitor_clicks" ON public.visitor_clicks
    FOR INSERT WITH CHECK (true);

-- Public upserts for lead attributions (so website can submit booking/enquiry leads)
CREATE POLICY "Enable insert and update access for public on lead_attributions" ON public.lead_attributions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for public on lead_attributions" ON public.lead_attributions
    FOR UPDATE USING (true);
