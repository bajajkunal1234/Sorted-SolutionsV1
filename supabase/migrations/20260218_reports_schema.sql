-- Reports Schema Migration

-- 1. Daily Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    technician_name TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    receipt TEXT, -- URL to receipt image
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by TEXT,
    approved_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rental Plans Table
CREATE TABLE IF NOT EXISTS rental_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT, -- Logical ID or SKU
    product_name TEXT NOT NULL,
    product_image TEXT,
    category TEXT,
    tenure_options JSONB DEFAULT '[]', -- Array of {duration, unit, monthlyRent, securityDeposit, setupFee}
    included_services JSONB DEFAULT '[]',
    terms TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Active Rentals Table
CREATE TABLE IF NOT EXISTS active_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    plan_id UUID REFERENCES rental_plans(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    serial_number TEXT,
    tenure JSONB DEFAULT '{}', -- {duration, unit, startDate, endDate}
    monthly_rent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    security_deposit DECIMAL(12, 2) NOT NULL DEFAULT 0,
    setup_fee DECIMAL(12, 2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    deposit_paid_date DATE,
    deposit_refunded BOOLEAN DEFAULT false,
    rent_cycle TEXT DEFAULT 'monthly',
    next_rent_due_date DATE,
    rents_paid INTEGER DEFAULT 0,
    rents_remaining INTEGER DEFAULT 0,
    last_service_date DATE,
    next_service_date DATE,
    status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
    delivery_address_id UUID, -- References properties(id)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- 4. AMC Plans Table
CREATE TABLE IF NOT EXISTS amc_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    applicable_products JSONB DEFAULT '[]',
    duration JSONB DEFAULT '{}', -- {value, unit}
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    services JSONB DEFAULT '[]', -- Array of {type, item, quantity, frequency}
    benefits JSONB DEFAULT '[]',
    terms TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Active AMCs Table
CREATE TABLE IF NOT EXISTS active_amcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    plan_id UUID REFERENCES amc_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    product_type TEXT,
    product_brand TEXT,
    product_model TEXT,
    serial_number TEXT,
    installation_address_id UUID, -- References properties(id)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amc_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_date DATE,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    auto_renew BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- 6. Website Settings Table
CREATE TABLE IF NOT EXISTS website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB DEFAULT '{}',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_tech ON expenses(technician_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_rentals_customer ON active_rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_amc_customer ON active_amcs(customer_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON website_settings(key);

-- RLS Policies (Permissive as per pattern)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE amc_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_amcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for reports tables" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports tables" ON rental_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports tables" ON active_rentals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports tables" ON amc_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports tables" ON active_amcs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports tables" ON website_settings FOR ALL USING (true) WITH CHECK (true);
