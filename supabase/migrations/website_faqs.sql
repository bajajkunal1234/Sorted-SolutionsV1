-- ============================================
-- SORTED Solutions - Global FAQs Table
-- ============================================

-- Table: website_faqs
-- Purpose: Store global FAQs for the website
CREATE TABLE IF NOT EXISTS website_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update trigger for updated_at
CREATE TRIGGER update_website_faqs_updated_at BEFORE UPDATE ON website_faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Initial data
INSERT INTO website_faqs (question, answer, order_index) VALUES
('What areas do you serve in Mumbai?', 'We provide service across all major areas in Mumbai including Andheri, Dadar, Ghatkopar, Goregaon, Kurla, Mumbai Central, and Parel.', 1),
('How quickly can you send a technician?', 'We offer same-day service for most repairs. Our technicians can typically reach your location within 2-4 hours of booking.', 2),
('Do you provide warranty on repairs?', 'Yes! We provide a 30-day warranty on all repairs and a 90-day warranty on spare parts.', 3);
