/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This runs once when the server starts, before handling any requests.
 * We use it to force Node.js to prefer IPv4 over IPv6 when resolving DNS,
 * which fixes Supabase connection timeouts on networks where the ISP/router
 * does not have proper IPv6 routing to Supabase's servers.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { setDefaultResultOrder } = await import('dns')
        setDefaultResultOrder('ipv4first')
        console.log('[instrumentation] DNS result order set to ipv4first')
    }
}
