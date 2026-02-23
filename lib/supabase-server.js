import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using SERVICE_ROLE_KEY.
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

    return createClient(url, key, {
        global: {
            // Force Next.js to never cache any Supabase fetch internally
            fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
    })
}

// Keep for backward compat but also opt out of caching
export const getSupabaseServer = () => createServerSupabase()
