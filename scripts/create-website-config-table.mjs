/**
 * Creates the website_config table in Supabase (one-time setup).
 * Run: node scripts/create-website-config-table.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
    readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) return
        const k = trimmed.slice(0, eqIdx).trim()
        let v = trimmed.slice(eqIdx + 1).trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        process.env[k] = v
    })
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
    console.log('Creating website_config table...')

    // Try inserting a test row — if table exists this will work
    // If not, we get a 42P01 error (table not found)
    const { error: checkErr } = await supabase
        .from('website_config')
        .select('key')
        .limit(1)

    if (!checkErr) {
        console.log('✅ Table already exists!')
        process.exit(0)
    }

    if (checkErr.code !== '42P01') {
        console.error('Unexpected error:', checkErr.message)
        process.exit(1)
    }

    // Table doesn't exist — create it via SQL RPC
    const { error: createErr } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS public.website_config (
                key text PRIMARY KEY,
                value jsonb NOT NULL DEFAULT '{}',
                updated_at timestamptz DEFAULT now()
            );
            ALTER TABLE public.website_config ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Allow all for authenticated and anon" ON public.website_config
                FOR ALL USING (true) WITH CHECK (true);
        `
    })

    if (createErr) {
        console.log('\n⚠️  RPC not available. Please run this SQL directly in Supabase SQL Editor:')
        console.log(`
CREATE TABLE IF NOT EXISTS public.website_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.website_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.website_config FOR ALL USING (true) WITH CHECK (true);
        `)
        process.exit(0)
    }

    console.log('✅ Table created successfully!')
}

main().catch(console.error)
