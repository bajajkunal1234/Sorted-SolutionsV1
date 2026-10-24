import { NextResponse } from 'next/server'

/**
 * Next.js Edge Middleware
 *
 * Protects /sitemap.xml and /sitemap-page from unauthenticated access.
 *
 * Strategy:
 *  - Search engine crawlers (Googlebot, Bingbot…) are allowed through
 *    so SEO is NOT broken. The sitemap is still submitted to Google SC.
 *  - Human browsers without the `admin_auth` cookie are redirected to /login.
 *  - The `admin_auth` cookie is set by the login page (see below) when
 *    role === 'admin' is confirmed.
 *
 * NOTE: localStorage is not accessible in middleware (Edge runtime).
 * We use a lightweight httpOnly-free cookie `admin_auth=1` that the
 * login page sets on the document. This is NOT a security token —
 * the real auth is in localStorage. The cookie only controls this redirect.
 */

// Known search engine & ads bot patterns — allow through unconditionally to /sitemap.xml
const BOT_UA_PATTERN = /google|googlebot|google-extended|adsbot|mediapartners|inspectiontool|storebot|feedfetcher|bingbot|yandex|duckduckbot|slurp|baiduspider|facebookexternalhit|twitterbot|linkedinbot|applebot/i

export function middleware(request) {
    const { pathname } = request.nextUrl
    const userAgent = request.headers.get('user-agent') || ''

    // 1. Guard against automated bot vulnerability scanners targeting Next.js Server Actions.
    // The application does not use Next.js Server Actions (all endpoints use /api Route Handlers).
    // Scanners send requests (e.g. POST / with `next-action: x`) that trigger 
    // "Failed to find Server Action" errors and exhaust Vercel serverless function quotas.
    const nextAction = request.headers.get('next-action')
    if (nextAction) {
        return new NextResponse('Invalid Server Action', { status: 400 })
    }

    // 2. Block direct POST requests to non-API pages (e.g. POST / or POST /services)
    // Pages in this app only serve GET requests. Genuine POST requests are strictly handled under /api/*.
    if (request.method === 'POST' && !pathname.startsWith('/api/')) {
        return new NextResponse('Method Not Allowed', { status: 405 })
    }

    // 3. Sitemap protection: Only guard these two paths
    const isProtected =
        pathname === '/sitemap.xml' ||
        pathname.startsWith('/sitemap-page')

    if (!isProtected) return NextResponse.next()

    // Always let search engine bots access the XML sitemap
    if (pathname === '/sitemap.xml' && BOT_UA_PATTERN.test(userAgent)) {
        return NextResponse.next()
    }

    // Check for the lightweight admin presence cookie
    const adminCookie = request.cookies.get('admin_auth')
    if (adminCookie?.value === '1') {
        return NextResponse.next()
    }

    // Not authenticated — redirect to login, preserving the intended destination
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - static assets (.png, .jpg, .jpeg, .gif, .webp, .svg, .mp3, .wav, .mov, .xlsx, .pdf)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|mov|xlsx|pdf)$).*)',
    ],
}

