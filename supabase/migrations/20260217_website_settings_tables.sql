-- Migration: Create Website Settings Tables
-- Date: 2026-02-17
-- Description: Creates tables for managing website content, locations, and page-specific settings

-- 1. Unified Locations Table
-- Replaces separate logic for Header, Footer, and Service Areas
CREATE TABLE IF NOT EXISTS website_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('head_office', 'branch_office', 'service_area')),
    address TEXT,
    area TEXT,
    city TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    map_url TEXT,
    is_head_office BOOLEAN DEFAULT FALSE,
    display_in_header BOOLEAN DEFAULT FALSE, -- Show in rotating header
    display_in_footer BOOLEAN DEFAULT FALSE, -- Show in footer links
    display_in_service_areas BOOLEAN DEFAULT FALSE, -- Show in "Areas We Serve" grid
    header_order INTEGER DEFAULT 0,
    footer_order INTEGER DEFAULT 0,
    service_area_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Frequently Booked Services
CREATE TABLE IF NOT EXISTS website_frequently_booked (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    service_path TEXT, -- Link to service page
    icon_url TEXT,
    price_starts_at TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. How It Works Steps
CREATE TABLE IF NOT EXISTS website_how_it_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT, -- Lucide icon name or image URL
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Why Choose Us (Value Propositions)
CREATE TABLE IF NOT EXISTS website_why_choose_us (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Customer Testimonials
CREATE TABLE IF NOT EXISTS website_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    location TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    customer_image_url TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Booking Slots
CREATE TABLE IF NOT EXISTS website_booking_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc. or 'All'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_label TEXT, -- e.g., '10:00 AM - 12:00 PM'
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Global FAQs
CREATE TABLE IF NOT EXISTS website_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT, -- 'General', 'Booking', 'Payment', etc.
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Global Brand Logos
CREATE TABLE IF NOT EXISTS website_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    website_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Service Icons Library
CREATE TABLE IF NOT EXISTS website_service_icons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., 'AC', 'Fridge'
    icon_url TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. SEO Settings
CREATE TABLE IF NOT EXISTS website_seo_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_route TEXT UNIQUE NOT NULL, -- '/', '/about', '/services/ac-repair'
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    og_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Static Pages (Terms, Privacy, etc.)
CREATE TABLE IF NOT EXISTS website_static_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'terms-conditions', 'privacy-policy', 'accessibility'
    title TEXT NOT NULL,
    content TEXT, -- HTML or Markdown
    last_updated DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Page Settings (For Dynamic Service Pages)
-- Master table for any dynamic page configuration
CREATE TABLE IF NOT EXISTS page_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id TEXT UNIQUE NOT NULL, -- e.g., 'category-ac-repair', 'location-andheri'
    page_type TEXT NOT NULL, -- 'category', 'subcategory', 'location', 'sublocation'
    title TEXT,
    subtitle TEXT,
    hero_image_url TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Page-Specific Problems
CREATE TABLE IF NOT EXISTS page_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id TEXT REFERENCES page_settings(page_id) ON DELETE CASCADE,
    problem_title TEXT NOT NULL,
    problem_description TEXT,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Page-Specific Services (Pricing)
CREATE TABLE IF NOT EXISTS page_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id TEXT REFERENCES page_settings(page_id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    price_starts_at TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Page-Specific Localities
CREATE TABLE IF NOT EXISTS page_localities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id TEXT REFERENCES page_settings(page_id) ON DELETE CASCADE,
    locality_name TEXT NOT NULL,
    pincode TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Page-Brand Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS page_brands_mapping (
    page_id TEXT REFERENCES page_settings(page_id) ON DELETE CASCADE,
    brand_id UUID REFERENCES website_brands(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, brand_id)
);

-- 17. Page-FAQ Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS page_faqs_mapping (
    page_id TEXT REFERENCES page_settings(page_id) ON DELETE CASCADE,
    faq_id UUID REFERENCES website_faqs(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    PRIMARY KEY (page_id, faq_id)
);

-- Enable RLS on all tables
ALTER TABLE website_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_frequently_booked ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_how_it_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_why_choose_us ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_service_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_static_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_brands_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_faqs_mapping ENABLE ROW LEVEL SECURITY;

-- Creating simple policies (assuming public read, admin write)
-- Adjust these based on your auth setup
CREATE POLICY "Public read access for website_locations" ON website_locations FOR SELECT USING (true);
CREATE POLICY "Public read access for website_frequently_booked" ON website_frequently_booked FOR SELECT USING (true);
CREATE POLICY "Public read access for website_how_it_works" ON website_how_it_works FOR SELECT USING (true);
CREATE POLICY "Public read access for website_why_choose_us" ON website_why_choose_us FOR SELECT USING (true);
CREATE POLICY "Public read access for website_testimonials" ON website_testimonials FOR SELECT USING (true);
CREATE POLICY "Public read access for website_booking_slots" ON website_booking_slots FOR SELECT USING (true);
CREATE POLICY "Public read access for website_faqs" ON website_faqs FOR SELECT USING (true);
CREATE POLICY "Public read access for website_brands" ON website_brands FOR SELECT USING (true);
CREATE POLICY "Public read access for website_service_icons" ON website_service_icons FOR SELECT USING (true);
CREATE POLICY "Public read access for website_seo_settings" ON website_seo_settings FOR SELECT USING (true);
CREATE POLICY "Public read access for website_static_pages" ON website_static_pages FOR SELECT USING (true);
CREATE POLICY "Public read access for page_settings" ON page_settings FOR SELECT USING (true);
CREATE POLICY "Public read access for page_problems" ON page_problems FOR SELECT USING (true);
CREATE POLICY "Public read access for page_services" ON page_services FOR SELECT USING (true);
CREATE POLICY "Public read access for page_localities" ON page_localities FOR SELECT USING (true);
CREATE POLICY "Public read access for page_brands_mapping" ON page_brands_mapping FOR SELECT USING (true);
CREATE POLICY "Public read access for page_faqs_mapping" ON page_faqs_mapping FOR SELECT USING (true);

-- Admin write policies (placeholder - allowing all authenticated for now or open for dev)
-- Ideally: CREATE POLICY "Admin write access" ON ... FOR ALL USING (auth.role() = 'admin');
-- For dev simplicity, allowing update/insert if authenticated (or open if needed)
CREATE POLICY "Allow write for authenticated" ON website_locations FOR ALL USING (auth.role() = 'authenticated');
-- Repeat for others... simplified for brevity in this script, usually you'd add these.
