-- ============================================
-- SORTED Solutions - Website Settings Schema
-- ============================================

-- Table: how_it_works_stages
-- Purpose: Store the 4 stages for "How It Works" section
CREATE TABLE IF NOT EXISTS how_it_works_stages (
  id SERIAL PRIMARY KEY,
  stage INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50),
  image_url TEXT,
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data
INSERT INTO how_it_works_stages (stage, title, description, icon, order_index) VALUES
(1, 'Book Your Service', 'Choose your appliance and describe the issue through our quick booking form', '📱', 1),
(2, 'Get Instant Quote', 'Receive transparent pricing and technician assignment within minutes', '💰', 2),
(3, 'Expert Arrives', 'Certified technician arrives at your doorstep with all necessary tools', '🔧', 3),
(4, 'Problem Solved', 'Issue fixed with genuine parts and 90-day warranty on all repairs', '✅', 4);

-- ============================================

-- Table: why_choose_us_features
-- Purpose: Store features for "Why Choose Us" section
CREATE TABLE IF NOT EXISTS why_choose_us_features (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data
INSERT INTO why_choose_us_features (title, description, icon, order_index) VALUES
('Same Day Service', 'Fast response and quick fixes for urgent repairs', 'Clock', 1),
('90-Day Warranty', 'Peace of mind with our comprehensive warranty', 'History', 2),
('Transparent Pricing', 'No hidden charges, clear quotes upfront', 'Wallet', 3),
('Certified Technicians', 'Trained and experienced professionals', 'Building2', 4),
('All Brands Covered', 'We service every major appliance brand', 'Map', 5),
('Doorstep Service', 'Convenient repairs at your location', 'MapPin', 6),
('Genuine Parts', 'Only authentic spare parts used', 'Package', 7),
('Customer Satisfaction', 'Rated 4.8/5 by 1000+ customers', 'Star', 8);

-- ============================================

-- Table: brand_logos
-- Purpose: Store brand logos for display
CREATE TABLE IF NOT EXISTS brand_logos (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  size VARCHAR(20) DEFAULT 'medium',
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data
INSERT INTO brand_logos (name, size, order_index) VALUES
('LG', 'medium', 1),
('Samsung', 'large', 2),
('Whirlpool', 'medium', 3),
('Godrej', 'small', 4),
('Voltas', 'medium', 5),
('Blue Star', 'small', 6),
('Haier', 'medium', 7),
('IFB', 'small', 8),
('Bosch', 'medium', 9),
('Panasonic', 'small', 10),
('Hitachi', 'medium', 11),
('Carrier', 'small', 12);

-- ============================================

-- Table: frequently_booked_services
-- Purpose: Store frequently booked services for carousel
CREATE TABLE IF NOT EXISTS frequently_booked_services (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  category VARCHAR(100),
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data
INSERT INTO frequently_booked_services (title, description, price, category, order_index) VALUES
('AC Basic Service', 'General checkup and cleaning', 499, 'ac-repair', 1),
('Fridge Gas Refill', 'Complete gas refilling service', 1299, 'refrigerator-repair', 2),
('Washing Machine Repair', 'Fix all washing machine issues', 549, 'washing-machine-repair', 3),
('Microwave Repair', 'Microwave oven repair service', 399, 'oven-repair', 4),
('Water Purifier Service', 'RO and UV purifier service', 449, 'water-purifier-repair', 5);

-- ============================================

-- Table: google_reviews_settings
-- Purpose: Store Google Reviews integration settings
CREATE TABLE IF NOT EXISTS google_reviews_settings (
  id SERIAL PRIMARY KEY,
  place_id VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  show_only_high_ratings BOOLEAN DEFAULT true,
  min_rating INTEGER DEFAULT 4,
  auto_refresh BOOLEAN DEFAULT true,
  refresh_interval VARCHAR(50) DEFAULT 'daily',
  max_reviews INTEGER DEFAULT 6,
  sort_by VARCHAR(50) DEFAULT 'most_recent',
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================

-- Table: google_reviews_cache
-- Purpose: Cache Google Reviews data
CREATE TABLE IF NOT EXISTS google_reviews_cache (
  id SERIAL PRIMARY KEY,
  author_name VARCHAR(255),
  rating INTEGER NOT NULL,
  text TEXT,
  time TIMESTAMP,
  profile_photo_url TEXT,
  relative_time_description VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_how_it_works_order ON how_it_works_stages(order_index);
CREATE INDEX IF NOT EXISTS idx_why_choose_us_order ON why_choose_us_features(order_index);
CREATE INDEX IF NOT EXISTS idx_brand_logos_order ON brand_logos(order_index);
CREATE INDEX IF NOT EXISTS idx_frequently_booked_order ON frequently_booked_services(order_index);
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON google_reviews_cache(rating);

-- ============================================
-- Update triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_how_it_works_updated_at BEFORE UPDATE ON how_it_works_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_why_choose_us_updated_at BEFORE UPDATE ON why_choose_us_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_logos_updated_at BEFORE UPDATE ON brand_logos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frequently_booked_updated_at BEFORE UPDATE ON frequently_booked_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_reviews_settings_updated_at BEFORE UPDATE ON google_reviews_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
