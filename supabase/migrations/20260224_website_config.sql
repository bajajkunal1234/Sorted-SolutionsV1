-- Generic key-value config table for global website settings (e.g. Google APIs)
CREATE TABLE IF NOT EXISTS website_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public (anon) reads for things like Google tag injection on live pages
ALTER TABLE website_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON website_config
    FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON website_config
    FOR ALL USING (auth.role() = 'service_role');
