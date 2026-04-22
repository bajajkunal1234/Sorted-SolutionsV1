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

// Known search engine bot patterns — allow through unconditionally
const BOT_UA_PATTERN = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|facebookexternalhit|twitterbot|linkedinbot/i

export function middleware(request) {
    const { pathname } = request.nextUrl
    const userAgent = request.headers.get('user-agent') || ''

    // Only guard these two paths
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
    matcher: ['/sitemap.xml', '/sitemap-page', '/sitemap-page/:path*'],
}
