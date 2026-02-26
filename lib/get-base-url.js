/**
 * Returns the absolute base URL for internal server-to-server fetch() calls.
 * Works in both local dev (localhost:3000) and Vercel deployments.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL — explicitly set by you (trumps everything)
 *  2. VERCEL_URL           — auto-set by Vercel (needs https:// prefix)
 *  3. localhost:3000       — fallback for local dev
 */
export function getBaseUrl() {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return 'http://localhost:3000';
}
