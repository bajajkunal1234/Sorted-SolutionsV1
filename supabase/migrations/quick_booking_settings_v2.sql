-- Add categories column to quick_booking_settings
ALTER TABLE quick_booking_settings ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Populate with initial data if it's the default
UPDATE quick_booking_settings 
SET categories = '[
    {
        "id": 1,
        "name": "Refrigerator",
        "showOnBookingForm": true,
        "order": 1,
        "subcategories": [
            {
                "id": 1,
                "name": "Single Door",
                "categoryId": 1,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 1, "name": "Not Cooling", "subcategoryId": 1, "showOnBookingForm": true, "order": 1 },
                    { "id": 2, "name": "Ice Formation", "subcategoryId": 1, "showOnBookingForm": true, "order": 2 },
                    { "id": 3, "name": "Water Leakage", "subcategoryId": 1, "showOnBookingForm": true, "order": 3 }
                ]
            },
            {
                "id": 2,
                "name": "Double Door",
                "categoryId": 1,
                "showOnBookingForm": true,
                "order": 2,
                "issues": [
                    { "id": 4, "name": "Not Cooling", "subcategoryId": 2, "showOnBookingForm": true, "order": 1 },
                    { "id": 5, "name": "Strange Noise", "subcategoryId": 2, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    },
    {
        "id": 2,
        "name": "Air Conditioner",
        "showOnBookingForm": true,
        "order": 2,
        "subcategories": [
            {
                "id": 4,
                "name": "Split AC",
                "categoryId": 2,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 13, "name": "Not Cooling", "subcategoryId": 4, "showOnBookingForm": true, "order": 1 },
                    { "id": 14, "name": "Water Leakage", "subcategoryId": 4, "showOnBookingForm": true, "order": 2 },
                    { "id": 15, "name": "Gas Leakage", "subcategoryId": 4, "showOnBookingForm": true, "order": 3 }
                ]
            }
        ]
    },
    {
        "id": 5,
        "name": "Washing Machine",
        "showOnBookingForm": true,
        "order": 3,
        "subcategories": [
            {
                "id": 13,
                "name": "Front Load",
                "categoryId": 5,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 48, "name": "Not Spinning", "subcategoryId": 13, "showOnBookingForm": true, "order": 1 },
                    { "id": 49, "name": "Water Not Draining", "subcategoryId": 13, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    },
    {
        "id": 3,
        "name": "Oven",
        "showOnBookingForm": true,
        "order": 4,
        "subcategories": [
            {
                "id": 7,
                "name": "Microwave Oven",
                "categoryId": 3,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 26, "name": "Not Heating", "subcategoryId": 7, "showOnBookingForm": true, "order": 1 },
                    { "id": 27, "name": "Sparking", "subcategoryId": 7, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    },
    {
        "id": 6,
        "name": "Water Purifier",
        "showOnBookingForm": true,
        "order": 5,
        "subcategories": [
            {
                "id": 16,
                "name": "RO",
                "categoryId": 6,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 61, "name": "Water Not Purifying", "subcategoryId": 16, "showOnBookingForm": true, "order": 1 },
                    { "id": 62, "name": "Low Water Flow", "subcategoryId": 16, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    },
    {
        "id": 4,
        "name": "HOB Top Stoves",
        "showOnBookingForm": true,
        "order": 6,
        "subcategories": [
            {
                "id": 10,
                "name": "Gas Stove",
                "categoryId": 4,
                "showOnBookingForm": true,
                "order": 1,
                "issues": [
                    { "id": 37, "name": "Burner Not Igniting", "subcategoryId": 10, "showOnBookingForm": true, "order": 1 },
                    { "id": 38, "name": "Flame Issue", "subcategoryId": 10, "showOnBookingForm": true, "order": 2 }
                ]
            }
        ]
    }
]'::jsonb
WHERE id = 1 AND (categories IS NULL OR categories = '[]'::jsonb);
