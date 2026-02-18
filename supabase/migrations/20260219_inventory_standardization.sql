-- =====================================================
-- SORTED Solutions - Inventory Standardization
-- Date: 2026-02-19
-- Purpose: Standardize table name and columns for Inventory
-- =====================================================

-- 1. Create or Rename table to 'inventory'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_items') AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory') THEN
        ALTER TABLE inventory_items RENAME TO inventory;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'product', -- product, service, combo
    category TEXT,
    brand TEXT,
    description TEXT,
    unit_of_measure TEXT DEFAULT 'pcs',
    min_stock_level INTEGER DEFAULT 10,
    opening_balance_qty DECIMAL(10, 2) DEFAULT 0,
    opening_balance_date DATE DEFAULT CURRENT_DATE,
    current_stock DECIMAL(10, 2) DEFAULT 0,
    sale_price DECIMAL(10, 2) DEFAULT 0,
    purchase_price DECIMAL(10, 2) DEFAULT 0,
    gst_applicable BOOLEAN DEFAULT FALSE,
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    hsn_code TEXT,
    sac_code TEXT,
    visible_on_website BOOLEAN DEFAULT TRUE,
    service_terms_template TEXT,
    status TEXT DEFAULT 'active',
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure all columns exist (in case table already existed with old schema)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pcs';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opening_balance_qty DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opening_balance_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_stock DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sac_code TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS visible_on_website BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS service_terms_template TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 3. Sync legacy column names if they exist and are populated
DO $$ 
BEGIN
    -- Sync quantity -> current_stock if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'quantity') THEN
        UPDATE inventory SET current_stock = quantity WHERE current_stock = 0 AND quantity > 0;
    END IF;
    
    -- Sync reorder_level -> min_stock_level if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'reorder_level') THEN
        UPDATE inventory SET min_stock_level = reorder_level WHERE min_stock_level = 10 AND reorder_level != 10;
    END IF;

    -- Sync price -> sale_price if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'price') THEN
        UPDATE inventory SET sale_price = price WHERE sale_price = 0 AND price > 0;
    END IF;

    -- Sync cost -> purchase_price if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'cost') THEN
        UPDATE inventory SET purchase_price = cost WHERE purchase_price = 0 AND cost > 0;
    END IF;
END $$;

-- 4. Enable RLS and add policy
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for inventory" ON inventory;
CREATE POLICY "Allow all for inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_sku_standard ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category_standard ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_type_standard ON inventory(type);
