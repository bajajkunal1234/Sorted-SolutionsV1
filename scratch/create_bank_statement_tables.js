const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
const sqlQuery = `
CREATE TABLE IF NOT EXISTS bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    transaction_count INT NOT NULL DEFAULT 0,
    total_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bank_statement_account_dates_key UNIQUE (bank_account_id, from_date, to_date)
);

CREATE TABLE IF NOT EXISTS bank_statement_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    particulars TEXT NOT NULL,
    ref_no TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'receipt')),
    suggested_account TEXT,
    status TEXT NOT NULL DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reconciled')),
    voucher_id UUID,
    reconciled_at TIMESTAMPTZ
);

-- Enable RLS and add open policies
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on bank_statements" ON bank_statements;
CREATE POLICY "Allow all on bank_statements" ON bank_statements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on bank_statement_transactions" ON bank_statement_transactions;
CREATE POLICY "Allow all on bank_statement_transactions" ON bank_statement_transactions FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_statements_acc_dates ON bank_statements(bank_account_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_bank_statement_tx_statement ON bank_statement_transactions(bank_statement_id);
`;

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
    },
    body: JSON.stringify({ sql_query: sqlQuery })
};

fetch(url, options)
    .then(res => res.json())
    .then(data => {
        console.log('Migration Result:', JSON.stringify(data, null, 2));
    })
    .catch(err => {
        console.error('Migration failed:', err);
    });
