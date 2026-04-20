import './globals.css'
import { Suspense } from 'react'
import GoogleTagsProvider from '@/components/GoogleTagsProvider'
import ClickTracker from '@/components/ClickTracker'

export const metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in'),
    title: 'Sorted Solutions - Expert Appliance Repair Services',
    description: 'Professional repair services for AC, Refrigerator, Washing Machine, RO, Oven, and more. On-time service with 90-day warranty.',
    icons: {
        icon: '/favicon.png',
        apple: '/icons/icon-192x192.png',
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Sorted Solutions',
    },
}

// ── Mobile viewport — prevents zoom/horizontal scroll on all devices ────────
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,   // still allows pinch-zoom for accessibility
    userScalable: true,
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const theme = localStorage.getItem('theme') || 'dark';
                                    document.documentElement.setAttribute('data-theme', theme);
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
                {/* Google Fonts - Outfit */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                {/* Manual ReCAPTCHA loading to ensure Firebase Auth identity verification */}
                <script src="https://www.google.com/recaptcha/api.js" async defer></script>
                {/* Google tracking tags (GTM, GA4, Ads, Schema) — populated from Admin > Google APIs */}
                <Suspense fallback={null}>
                    <GoogleTagsProvider />
                </Suspense>
            </head>
            <body style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
                {children}
                {/* Global no-code click tracker — auto-fires triggers configured in Admin > Interactions > Triggers */}
                <ClickTracker />
            </body>
        </html>
    )
}
