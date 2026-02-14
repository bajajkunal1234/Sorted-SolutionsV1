-- =====================================================
-- CUSTOMER APPLIANCES & PRODUCTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_appliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Appliance Details
    type TEXT NOT NULL,         -- AC, Refrigerator, etc.
    brand TEXT NOT NULL,        -- Samsung, LG, etc.
    model TEXT,                 -- Model Number
    serial_number TEXT,         -- Serial Number
    
    -- Purchase & Warranty
    purchase_date DATE,
    warranty_status TEXT DEFAULT 'unknown', -- in-warranty, out-of-warranty, amc
    warranty_expiry DATE,
    
    -- Media (Photos of appliance/bill)
    photos TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'active', -- active, scrapped, sold
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_appliances_customer_id ON customer_appliances(customer_id);

-- Trigger for updated_at
CREATE TRIGGER update_customer_appliances_updated_at 
BEFORE UPDATE ON customer_appliances 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Optional for now, but good practice)
ALTER TABLE customer_appliances ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only see their own appliances
CREATE POLICY "Customers can view their own appliances" 
ON customer_appliances FOR SELECT 
USING (auth.uid() = customer_id);

-- Policy: Customers can insert their own appliances
CREATE POLICY "Customers can insert their own appliances" 
ON customer_appliances FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can update their own appliances
CREATE POLICY "Customers can update their own appliances" 
ON customer_appliances FOR UPDATE 
USING (auth.uid() = customer_id);

-- Policy: Customers can delete their own appliances
CREATE POLICY "Customers can delete their own appliances" 
ON customer_appliances FOR DELETE 
USING (auth.uid() = customer_id);
