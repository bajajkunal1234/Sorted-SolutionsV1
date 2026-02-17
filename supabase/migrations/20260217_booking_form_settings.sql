-- Migration: Booking Form Settings Tables
-- Description: Create tables for hierarchical booking form data (Categories, Subcategories, Issues)

-- Table: booking_categories (Appliances)
CREATE TABLE IF NOT EXISTS booking_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    show_on_booking_form BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: booking_subcategories (Appliance Types)
CREATE TABLE IF NOT EXISTS booking_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES booking_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    show_on_booking_form BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: booking_issues
CREATE TABLE IF NOT EXISTS booking_issues (
    id SERIAL PRIMARY KEY,
    subcategory_id INTEGER NOT NULL REFERENCES booking_subcategories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    show_on_booking_form BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_booking_subcategories_category_id ON booking_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_booking_issues_subcategory_id ON booking_issues(subcategory_id);

-- Insert sample data for AC Repair
INSERT INTO booking_categories (name, display_order) VALUES 
    ('Air Conditioner', 1),
    ('Washing Machine', 2),
    ('Refrigerator', 3),
    ('Microwave Oven', 4),
    ('Water Purifier', 5),
    ('Gas Stove / HOB', 6);

-- Insert sample subcategories for Air Conditioner
INSERT INTO booking_subcategories (category_id, name, display_order) VALUES 
    (1, 'Window AC', 1),
    (1, 'Split AC', 2),
    (1, 'Cassette AC', 3);

-- Insert sample subcategories for Washing Machine
INSERT INTO booking_subcategories (category_id, name, display_order) VALUES 
    (2, 'Front Load', 1),
    (2, 'Top Load', 2),
    (2, 'Semi-Automatic', 3);

-- Insert sample subcategories for Microwave Oven
INSERT INTO booking_subcategories (category_id, name, display_order) VALUES 
    (4, 'Microwave Oven', 1),
    (4, 'OTG Oven', 2),
    (4, 'Deck Oven', 3);

-- Insert sample issues for Window AC (subcategory_id = 1)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
    (1, 'Not Cooling', 1),
    (1, 'Not Starting', 2),
    (1, 'Making Loud Noise', 3),
    (1, 'Water Leaking', 4),
    (1, 'Bad Smell', 5),
    (1, 'Remote Not Working', 6);

-- Insert sample issues for Split AC (subcategory_id = 2)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
    (2, 'Not Cooling', 1),
    (2, 'Not Starting', 2),
    (2, 'Making Loud Noise', 3),
    (2, 'Water Leaking', 4),
    (2, 'Bad Smell', 5),
    (2, 'Remote Not Working', 6);

-- Insert sample issues for Front Load Washing Machine (subcategory_id = 4)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
    (4, 'Not Starting', 1),
    (4, 'Not Spinning', 2),
    (4, 'Water Not Draining', 3),
    (4, 'Making Loud Noise', 4),
    (4, 'Door Not Opening', 5),
    (4, 'Leaking Water', 6);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_booking_categories_updated_at BEFORE UPDATE ON booking_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_subcategories_updated_at BEFORE UPDATE ON booking_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_issues_updated_at BEFORE UPDATE ON booking_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
