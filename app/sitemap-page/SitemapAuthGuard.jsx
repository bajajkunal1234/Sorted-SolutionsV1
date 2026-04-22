'use client'

/**
 * SitemapAuthGuard
 *
 * Client-side admin gate for /sitemap-page and /sitemap.xml viewer.
 * Checks localStorage / sessionStorage for a valid admin session
 * (same pattern as /admin page.js) and redirects to /login if absent.
 *
 * Shows a brief loading state while the check runs to avoid flash of content.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SitemapAuthGuard({ children }) {
    const router = useRouter()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const raw =
            localStorage.getItem('user_session') ||
            sessionStorage.getItem('user_session')

        if (!raw) {
            router.replace('/login?next=/sitemap-page')
            return
        }

        try {
            const session = JSON.parse(raw)
            if (session?.role !== 'admin') {
                router.replace('/login?next=/sitemap-page')
                return
            }
        } catch {
            router.replace('/login?next=/sitemap-page')
            return
        }

        setAuthorized(true)
    }, [router])

    if (!authorized) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary, #0f172a)',
                gap: '16px',
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(99,102,241,0.2)',
                    borderTop: '3px solid #6366f1',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    Verifying admin access…
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return children
}
