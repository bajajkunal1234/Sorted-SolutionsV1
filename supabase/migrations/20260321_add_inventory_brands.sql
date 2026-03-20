-- Add inventory_brands table
CREATE TABLE IF NOT EXISTS inventory_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed existing brand values from inventory into the new table
INSERT INTO inventory_brands (name)
SELECT DISTINCT brand FROM inventory WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (name) DO NOTHING;

-- Add delete to inventory_categories if not there
ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS description text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
