-- Migration: Fix Booking IDs to match frontend hardcoding
-- Description: Truncate booking tables and re-insert data with explicit IDs to match QuickBookingForm.jsx expectations

-- 1. Truncate tables to remove mismatched data
TRUNCATE TABLE booking_issues, booking_subcategories, booking_categories RESTART IDENTITY CASCADE;

-- 2. Insert Categories with EXPLICIT IDs
-- 1: Refrigerator | 2: AC | 3: Oven | 4: HOB | 5: Washing Machine | 6: Water Purifier
INSERT INTO booking_categories (id, name, display_order, show_on_booking_form) VALUES 
(1, 'Refrigerator', 1, true),
(2, 'Air Conditioner', 2, true),
(3, 'Oven', 4, true), -- Order 4 as per legacy
(4, 'HOB Top Stoves', 6, true), -- Order 6
(5, 'Washing Machine', 3, true), -- Order 3
(6, 'Water Purifier', 5, true); -- Order 5

-- 3. Insert Subcategories
-- category_id references above IDs
-- We try to follow the structure from quick_booking_settings_v2.sql but ensuring IDs are unique and consistent

-- Refrigerator (1)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(1, 1, 'Single Door', 1),
(2, 1, 'Double Door', 2),
(3, 1, 'Side by Side', 3);

-- Air Conditioner (2)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(4, 2, 'Split AC', 1),
(5, 2, 'Window AC', 2),
(6, 2, 'Cassette AC', 3);

-- Oven (3)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(7, 3, 'Microwave Oven', 1),
(8, 3, 'OTG Oven', 2),
(9, 3, 'Built-in Oven', 3);

-- HOB (4)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(10, 4, 'Gas Stove', 1),
(11, 4, 'Cooking Range', 2),
(12, 4, 'Induction Cooktop', 3);

-- Washing Machine (5)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(13, 5, 'Front Load', 1),
(14, 5, 'Top Load', 2),
(15, 5, 'Semi-Automatic', 3);

-- Water Purifier (6)
INSERT INTO booking_subcategories (id, category_id, name, display_order) VALUES 
(16, 6, 'RO', 1),
(17, 6, 'UV', 2),
(18, 6, 'UF / Gravity', 3);


-- 4. Insert Issues
-- Linked to subcategory_ids (1-18)

-- Refrigerator - Single Door (1)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(1, 'Not Cooling', 1),
(1, 'Ice Formation', 2),
(1, 'Water Leakage', 3),
(1, 'Bulb Not Working', 4);

-- Refrigerator - Double Door (2)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(2, 'Not Cooling', 1),
(2, 'Strange Noise', 2),
(2, 'Compressor Issue', 3);

-- AC - Split AC (4)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(4, 'Not Cooling', 1),
(4, 'Water Leakage', 2),
(4, 'Gas Leakage', 3),
(4, 'Remote Not Working', 4);

-- AC - Window AC (5)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(5, 'Not Cooling', 1),
(5, 'Too Much Noise', 2),
(5, 'Fan Not Working', 3);

-- Oven - Microwave (7)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(7, 'Not Heating', 1),
(7, 'Sparking', 2),
(7, 'Plate Not Rotating', 3),
(7, 'Buttons Not Working', 4);

-- HOB - Gas Stove (10)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(10, 'Burner Not Igniting', 1),
(10, 'Flame Issue (Low/Yellow)', 2),
(10, 'Knob Stuck', 3),
(10, 'Gas Leakage Smell', 4);

-- Washing Machine - Front Load (13)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(13, 'Not Spinning', 1),
(13, 'Water Not Draining', 2),
(13, 'Door Not Opening', 3),
(13, 'Making Loud Noise', 4),
(13, 'Leaking Water', 5);

-- Washing Machine - Top Load (14)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(14, 'Not Washing', 1),
(14, 'Error Code Displayed', 2),
(14, 'Vibration Issue', 3);

-- Water Purifier - RO (16)
INSERT INTO booking_issues (subcategory_id, name, display_order) VALUES 
(16, 'Water Not Purifying', 1),
(16, 'Low Water Flow', 2),
(16, 'Bad Taste / Smell', 3),
(16, 'Leaking', 4),
(16, 'Filter Change Alarm', 5);

-- Reset sequences to prevent future conflicts
SELECT setval('booking_categories_id_seq', (SELECT MAX(id) FROM booking_categories));
SELECT setval('booking_subcategories_id_seq', (SELECT MAX(id) FROM booking_subcategories));
SELECT setval('booking_issues_id_seq', (SELECT MAX(id) FROM booking_issues));
