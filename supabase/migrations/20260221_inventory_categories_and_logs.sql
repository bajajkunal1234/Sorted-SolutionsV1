-- =====================================================
-- SORTED Solutions - Inventory Categories and Logs
-- Date: 2026-02-21
-- Purpose: Standardize categories and track stock movement
-- =====================================================

-- 1. Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create inventory_logs table for stock movement
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'initial', 'purchase', 'sale', 'adjustment', 'return'
    quantity_changed DECIMAL(10, 2) NOT NULL,
    previous_quantity DECIMAL(10, 2),
    new_quantity DECIMAL(10, 2),
    reference_type TEXT, -- 'invoice', 'purchase_order', 'manual'
    reference_id UUID,
    notes TEXT,
    created_by UUID, -- Link to auth.users if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seed initial categories (from lib/data/inventoryData.js)
INSERT INTO inventory_categories (name, color) VALUES
    ('Air Conditioners', '#ef4444'),
    ('Washing Machines', '#3b82f6'),
    ('Refrigerators', '#10b981'),
    ('Microwaves', '#f59e0b'),
    ('Water Purifiers', '#06b6d4'),
    ('Spare Parts', '#8b5cf6'),
    ('Tools & Equipment', '#ec4899'),
    ('Services', '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- 5. Add "Allow all" policies (matching project convention)
DROP POLICY IF EXISTS "Allow all for inventory_categories" ON inventory_categories;
CREATE POLICY "Allow all for inventory_categories" ON inventory_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for inventory_logs" ON inventory_logs;
CREATE POLICY "Allow all for inventory_logs" ON inventory_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_inventory_id ON inventory_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
