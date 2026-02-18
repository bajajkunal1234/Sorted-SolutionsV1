-- Interactions table for logging system events
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    performed_by TEXT, -- User ID (could be UUID if linked to auth.users)
    performed_by_name TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    source TEXT DEFAULT 'System',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_job_id ON interactions(job_id);

-- Enable RLS (though global policy is currently permissive in other tables)
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Allow all for now as per project pattern (can be hardened later)
CREATE POLICY "Allow all for interactions" ON interactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
