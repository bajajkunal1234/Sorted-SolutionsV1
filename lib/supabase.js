import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Default to global fetch
let customFetch = fetch;

/**
 * Custom IPv4 fetch is only needed server-side to bypass DNS interception by some ISPs.
 * This is ONLY applied server-side (API routes / Server Components) to prevent
 * Node.js built-ins like 'dns' and 'https' from leaking into the client bundle.
 */
if (typeof window === 'undefined') {
    try {
        // Using require instead of static import to keep this out of the browser bundle
        const { createIPv4Fetch } = require('./ipv4-fetch');
        customFetch = createIPv4Fetch();
    } catch (e) {
        console.warn('[Supabase] Failed to init custom fetch, falling back to global:', e.message);
    }
}

// Prevent build-time crashes if keys are missing
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { fetch: customFetch }
    })
    : null
