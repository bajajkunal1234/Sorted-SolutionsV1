-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority TEXT DEFAULT 'medium', -- high, medium, low
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    related_to_type TEXT, -- rental, amc, invoice, etc.
    related_to_id UUID,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB DEFAULT '{}', -- { frequency: 'monthly', interval: 1 }
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_account_id ON reminders(account_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

-- Trigger for updated_at
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for reminders" ON reminders FOR ALL USING (true) WITH CHECK (true);
