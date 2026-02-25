import { createClient } from '@supabase/supabase-js'
import { createIPv4Fetch } from './ipv4-fetch'

/**
 * Server-side Supabase client using SERVICE_ROLE_KEY.
 * - Uses a custom IPv4 fetch to avoid IPv6 routing issues on some networks/ISPs.
 * - Passes cache: 'no-store' to every fetch so Next.js Data Cache never
 *   caches Supabase responses (fixes "changes only reflect once" on live pages).
 * - Always creates a fresh client per call — never a singleton in server components.
 */
export function createServerSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        console.warn('Supabase environment variables missing. Client not initialized.')
        return null
    }

    const ipv4Fetch = createIPv4Fetch()

    return createClient(url, key, {
        global: {
            // Force IPv4 DNS + no-cache
            fetch: (input, init) => ipv4Fetch(input, { ...init, cache: 'no-store' }),
        },
    })
}

// Keep for backward compat
export const getSupabaseServer = () => createServerSupabase()
