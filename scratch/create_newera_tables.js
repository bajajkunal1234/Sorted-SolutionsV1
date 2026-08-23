const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Drop tables if they exist (clean setup, since these are new features)
DROP TABLE IF EXISTS newera_payments CASCADE;
DROP TABLE IF EXISTS newera_allocations CASCADE;
DROP TABLE IF EXISTS newera_repayments CASCADE;
DROP TABLE IF EXISTS newera_loans CASCADE;
DROP TABLE IF EXISTS newera_members CASCADE;
DROP TABLE IF EXISTS newera_sessions CASCADE;

-- 1. Session tracker
CREATE TABLE newera_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 2. Members
CREATE TABLE newera_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed members
INSERT INTO newera_members (name) VALUES 
('Vasudev'),
('Kunal'),
('Divya'),
('Bhavesh'),
('Asha');

-- 3. Loans
CREATE TABLE newera_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lender TEXT NOT NULL,
    account_number TEXT,
    loan_type TEXT NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    interest_rate_annual NUMERIC(5, 2) NOT NULL,
    start_date DATE NOT NULL,
    tenure_months INTEGER,
    emi_amount NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Repayments Schedule
CREATE TABLE newera_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES newera_loans(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    installment_number INTEGER,
    expected_amount NUMERIC(15, 2) NOT NULL,
    expected_principal NUMERIC(15, 2) NOT NULL,
    expected_interest NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Allocations
CREATE TABLE newera_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES newera_loans(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES newera_members(id) ON DELETE CASCADE,
    share_percentage NUMERIC(5, 2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
    UNIQUE (loan_id, member_id)
);

-- 6. Payments Log
CREATE TABLE newera_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES newera_loans(id) ON DELETE CASCADE,
    repayment_id UUID REFERENCES newera_repayments(id) ON DELETE SET NULL,
    member_id INTEGER REFERENCES newera_members(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    principal_portion NUMERIC(15, 2) NOT NULL,
    interest_portion NUMERIC(15, 2) NOT NULL,
    source_of_income TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

SELECT 'success' AS status;
`;

async function run() {
    console.log('Running SQL Schema setup in Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('SQL schema setup failed:', error);
        process.exit(1);
    } else {
        console.log('SQL schema setup completed successfully!', data);
    }
}

run();
