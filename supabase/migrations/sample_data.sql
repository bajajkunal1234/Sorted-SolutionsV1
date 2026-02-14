-- Sample Data Migration for Admin App
-- Run this in Supabase SQL Editor to populate test data

-- Insert Sample Customers
INSERT INTO customers (name, phone, email, locality, city, state, pincode) VALUES
('Rajesh Kumar', '+91 98765 43210', 'rajesh@example.com', 'Jogeshwari West', 'Mumbai', 'Maharashtra', '400102'),
('Priya Sharma', '+91 98765 43211', 'priya@example.com', 'Malad East', 'Mumbai', 'Maharashtra', '400097'),
('Suresh Mehta', '+91 98765 43212', 'suresh@example.com', 'Andheri West', 'Mumbai', 'Maharashtra', '400053'),
('Neha Gupta', '+91 98765 43213', 'neha@example.com', 'Bandra West', 'Mumbai', 'Maharashtra', '400050')
ON CONFLICT (phone) DO NOTHING;

-- Insert Sample Technicians
INSERT INTO technicians (name, phone, email, specialization, experience_years) VALUES
('Amit Patel', '+91 98765 11111', 'amit@sortedsolutions.in', ARRAY['AC', 'Refrigerator'], 5),
('Rahul Singh', '+91 98765 22222', 'rahul@sortedsolutions.in', ARRAY['Washing Machine', 'Microwave'], 3),
('Vikram Rao', '+91 98765 33333', 'vikram@sortedsolutions.in', ARRAY['AC', 'Water Purifier'], 7)
ON CONFLICT (phone) DO NOTHING;

-- Get IDs for relationships (you'll need to run this query first to get the actual UUIDs)
-- Then use those UUIDs in the jobs insert below

-- For now, let's create a simpler version that doesn't require exact UUIDs
-- We'll use subqueries to get the IDs

-- Insert Sample Jobs
DO $$
DECLARE
    customer1_id UUID;
    customer2_id UUID;
    customer3_id UUID;
    tech1_id UUID;
    tech2_id UUID;
    product_wm_id UUID;
    product_ac_id UUID;
    product_micro_id UUID;
    brand_lg_id UUID;
    brand_samsung_id UUID;
    brand_daikin_id UUID;
    issue_not_starting_id UUID;
    issue_sparking_id UUID;
    issue_not_cooling_id UUID;
BEGIN
    -- Get customer IDs
    SELECT id INTO customer1_id FROM customers WHERE phone = '+91 98765 43210' LIMIT 1;
    SELECT id INTO customer2_id FROM customers WHERE phone = '+91 98765 43211' LIMIT 1;
    SELECT id INTO customer3_id FROM customers WHERE phone = '+91 98765 43212' LIMIT 1;
    
    -- Get technician IDs
    SELECT id INTO tech1_id FROM technicians WHERE phone = '+91 98765 11111' LIMIT 1;
    SELECT id INTO tech2_id FROM technicians WHERE phone = '+91 98765 22222' LIMIT 1;
    
    -- Get product IDs
    SELECT id INTO product_wm_id FROM products WHERE name = 'Washing Machine' AND type = 'Front Load' LIMIT 1;
    SELECT id INTO product_ac_id FROM products WHERE name = 'Air Conditioner' AND type = 'Split AC 1.5 Ton' LIMIT 1;
    SELECT id INTO product_micro_id FROM products WHERE name = 'Microwave Oven' AND type = 'Convection' LIMIT 1;
    
    -- Get brand IDs
    SELECT id INTO brand_lg_id FROM brands WHERE name = 'LG' LIMIT 1;
    SELECT id INTO brand_samsung_id FROM brands WHERE name = 'Samsung' LIMIT 1;
    SELECT id INTO brand_daikin_id FROM brands WHERE name = 'Daikin' LIMIT 1;
    
    -- Get issue IDs
    SELECT id INTO issue_not_starting_id FROM issues WHERE name = 'Not Starting' LIMIT 1;
    SELECT id INTO issue_sparking_id FROM issues WHERE name = 'Sparking Inside' LIMIT 1;
    SELECT id INTO issue_not_cooling_id FROM issues WHERE name = 'Not Cooling' LIMIT 1;
    
    -- Insert jobs
    INSERT INTO jobs (job_name, customer_id, product_id, brand_id, issue_id, status, assigned_to, opening_date, due_date) VALUES
    ('WM Dead Jogeshwari', customer1_id, product_wm_id, brand_lg_id, issue_not_starting_id, 'pending', NULL, NOW(), NOW() + INTERVAL '2 days'),
    ('Microwave Sparking Malad', customer2_id, product_micro_id, brand_samsung_id, issue_sparking_id, 'assigned', tech1_id, NOW(), NOW() + INTERVAL '1 day'),
    ('AC Not Cooling Andheri', customer3_id, product_ac_id, brand_daikin_id, issue_not_cooling_id, 'in-progress', tech2_id, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day');
END $$;

-- Insert Sample Inventory Items
INSERT INTO inventory (name, category, sku, quantity, unit, min_stock_level, cost_price, selling_price) VALUES
('AC Gas R32', 'Refrigerants', 'REF-R32', 15, 'kg', 5, 450.00, 650.00),
('Compressor Motor', 'Spare Parts', 'COMP-001', 8, 'pcs', 3, 2500.00, 3500.00),
('Microwave Magnetron', 'Spare Parts', 'MAG-001', 5, 'pcs', 2, 1200.00, 1800.00),
('WM Belt', 'Spare Parts', 'BELT-WM', 20, 'pcs', 10, 150.00, 250.00),
('Cleaning Solution', 'Consumables', 'CLEAN-001', 30, 'ltr', 10, 80.00, 150.00)
ON CONFLICT (sku) DO NOTHING;

-- Success message
SELECT 'Sample data inserted successfully!' as message;
