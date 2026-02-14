-- =====================================================
-- SORTED Admin App - Database Schema Migration
-- Phase 2: Admin App Data
-- =====================================================
-- This migration creates all tables needed for the Admin App
-- Run this in Supabase SQL Editor after Phase 1 is complete
-- =====================================================

-- =====================================================
-- 1. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address JSONB DEFAULT '{}',
    gstin TEXT,
    properties JSONB DEFAULT '[]',
    opening_balance DECIMAL(10, 2) DEFAULT 0,
    closing_balance DECIMAL(10, 2) DEFAULT 0,
    jobs_done INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TECHNICIANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'available',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    technician_name TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    appliance TEXT,
    brand TEXT,
    model TEXT,
    issue TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    scheduled_date DATE,
    scheduled_time TEXT,
    property JSONB,
    description TEXT,
    notes TEXT,
    amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    reorder_level INTEGER DEFAULT 10,
    price DECIMAL(10, 2) DEFAULT 0,
    cost DECIMAL(10, 2) DEFAULT 0,
    location TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. ACCOUNTS (LEDGERS) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- customer, supplier, expense, income, asset, liability
    under TEXT NOT NULL, -- parent group
    gstin TEXT,
    address JSONB DEFAULT '{}',
    opening_balance DECIMAL(10, 2) DEFAULT 0,
    closing_balance DECIMAL(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SALES INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    reference TEXT, -- for display
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    items JSONB DEFAULT '[]',
    billing_address TEXT,
    shipping_address TEXT,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    cgst DECIMAL(10, 2) DEFAULT 0,
    sgst DECIMAL(10, 2) DEFAULT 0,
    igst DECIMAL(10, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. PURCHASE INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    reference TEXT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    items JSONB DEFAULT '[]',
    billing_address TEXT,
    shipping_address TEXT,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    cgst DECIMAL(10, 2) DEFAULT 0,
    sgst DECIMAL(10, 2) DEFAULT 0,
    igst DECIMAL(10, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. QUOTATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT UNIQUE NOT NULL,
    reference TEXT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    valid_until DATE,
    items JSONB DEFAULT '[]',
    billing_address TEXT,
    shipping_address TEXT,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    cgst DECIMAL(10, 2) DEFAULT 0,
    sgst DECIMAL(10, 2) DEFAULT 0,
    igst DECIMAL(10, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. RECEIPT VOUCHERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS receipt_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    reference TEXT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode TEXT DEFAULT 'cash',
    reference_number TEXT,
    narration TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. PAYMENT VOUCHERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    reference TEXT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode TEXT DEFAULT 'cash',
    reference_number TEXT,
    narration TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    hsn_code TEXT,
    unit TEXT DEFAULT 'pcs',
    rate DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 18,
    category TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. BRANDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 13. ISSUES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_technician_id ON jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_account_id ON sales_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_account_id ON purchase_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_date ON receipt_vouchers(date);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON payment_vouchers(date);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_invoices_updated_at BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_vouchers_updated_at BEFORE UPDATE ON receipt_vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_vouchers_updated_at BEFORE UPDATE ON payment_vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample brands
INSERT INTO brands (name) VALUES
    ('LG'),
    ('Samsung'),
    ('Whirlpool'),
    ('Godrej'),
    ('Voltas'),
    ('Blue Star'),
    ('Haier'),
    ('IFB'),
    ('Bosch'),
    ('Panasonic')
ON CONFLICT (name) DO NOTHING;

-- Insert sample issues
INSERT INTO issues (title, category) VALUES
    ('Not cooling', 'AC'),
    ('Not heating', 'Microwave'),
    ('Not spinning', 'Washing Machine'),
    ('Leaking water', 'Refrigerator'),
    ('Making noise', 'General'),
    ('Not starting', 'General'),
    ('Tripping circuit', 'Electrical')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, hsn_code, unit, rate, tax_rate, category) VALUES
    ('AC Gas Refill R32', 'R32 refrigerant gas refill', '38111900', 'service', 2500, 18, 'AC Service'),
    ('AC Gas Refill R22', 'R22 refrigerant gas refill', '38111900', 'service', 2000, 18, 'AC Service'),
    ('Compressor Replacement', 'AC compressor replacement', '84143010', 'service', 8500, 18, 'AC Repair'),
    ('PCB Repair', 'Circuit board repair', '85340000', 'service', 1500, 18, 'Electronics'),
    ('Motor Replacement', 'Washing machine motor', '85015100', 'pcs', 3500, 18, 'Spare Parts')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Note: For now, we'll keep RLS disabled for development
-- Enable RLS in production and add proper policies

-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- etc.

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: 13
-- Indexes created: Multiple for performance
-- Triggers created: Auto-update timestamps
-- Sample data: Brands, Issues, Products
-- =====================================================
