import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using SERVICE_ROLE_KEY.
 * Use this only in API routes or server components where you need to bypass RLS.
 */
export function createServerSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        // During build phase, these might be missing. 
        // We return a proxy or handle it gracefully to prevent build time crashes.
        console.warn('Supabase environment variables missing. Client not initialized.')
        return null
    }

    return createClient(url, key)
}

// Lazy-loaded singleton for basic operations
let supabaseServerInstance = null

export const getSupabaseServer = () => {
    if (!supabaseServerInstance) {
        supabaseServerInstance = createServerSupabase()
    }
    return supabaseServerInstance
}
