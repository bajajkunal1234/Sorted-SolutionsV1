const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS bank_alerts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit')),
    reference_number VARCHAR(100),
    party_name VARCHAR(255),
    narration TEXT,
    raw_body TEXT,
    status VARCHAR(50) DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reconciled')),
    voucher_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and permissions
ALTER TABLE bank_alerts_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON bank_alerts_log FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON bank_alerts_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON bank_alerts_log FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON bank_alerts_log FOR DELETE USING (true);
`;

async function run() {
    console.log("Running migration to create bank_alerts_log...");
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration completed successfully!", data);
    }
}

run();
