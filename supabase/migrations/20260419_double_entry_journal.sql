-- 20260419_double_entry_journal.sql
-- Create Journal Entries Architecture

-- 1. Journal Entries Table
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'JE-24-001'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type VARCHAR(50) NOT NULL, -- e.g. 'sales_invoice', 'purchase_invoice', 'receipt_voucher', 'payment_voucher', 'manual'
    reference_id UUID, -- Links back to the invoice or voucher
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- 2. Journal Entry Lines Table
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (debit > 0 OR credit > 0),
    CHECK (NOT (debit > 0 AND credit > 0)) -- Single line is either purely debit or purely credit
);

-- 3. Indexes for fast aggregation (Financial Reports)
CREATE INDEX IF NOT EXISTS idx_jel_account ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_je_ref ON public.journal_entries(reference_type, reference_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- 5. Standard Admin RLS policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for users' AND tablename = 'journal_entries') THEN
        CREATE POLICY "Enable all operations for users" ON public.journal_entries FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for users' AND tablename = 'journal_entry_lines') THEN
        CREATE POLICY "Enable all operations for users" ON public.journal_entry_lines FOR ALL USING (true);
    END IF;
END $$;
