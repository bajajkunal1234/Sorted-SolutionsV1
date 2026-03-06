/**
 * One-time script to create an admin account.
 * Run: node scripts/create-admin.mjs
 * 
 * Fill in ADMIN_PHONE and ADMIN_PASSWORD below, then run.
 * Delete this file after use for security.
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// ── CONFIGURE THESE ───────────────────────────────────────────────────────────
const ADMIN_PHONE = '8928895590'   // your mobile number (10 digits)
const ADMIN_PASSWORD = 'SortedAdmin@2025'  // change to your preferred password
const ADMIN_NAME = 'Kunal Bajaj'      // your name
// ─────────────────────────────────────────────────────────────────────────────

// Manually load .env.local (no dotenv needed)
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'

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

async function createAdmin() {
    console.log(`Creating admin account for ${ADMIN_PHONE}...`)

    // Check if already exists
    const { data: existing } = await supabase
        .from('customers')
        .select('id, role')
        .or(`phone.eq.${ADMIN_PHONE},phone.eq.+91${ADMIN_PHONE}`)
        .limit(1)
        .single()

    if (existing) {
        // Update role and password
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
        const { data, error } = await supabase
            .from('customers')
            .update({ name: ADMIN_NAME, password_hash: passwordHash, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select('id, name, phone')
            .single()

        if (error) { console.error('Update failed:', error.message); process.exit(1) }
        console.log('✅ Existing account updated to admin:', data)
    } else {
        // Create new admin (just a regular customer — role is determined by ADMIN_PHONES env)
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
        const { data, error } = await supabase
            .from('customers')
            .insert({ phone: ADMIN_PHONE, name: ADMIN_NAME, password_hash: passwordHash, created_at: new Date().toISOString() })
            .select('id, name, phone')
            .single()

        if (error) { console.error('Create failed:', error.message); process.exit(1) }
        console.log('✅ Admin account created:', data)
    }

    console.log('\n🔐 Login details:')
    console.log(`   Mobile : ${ADMIN_PHONE}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('\n⚠️  Please delete scripts/create-admin.mjs after use.')
}

createAdmin()
