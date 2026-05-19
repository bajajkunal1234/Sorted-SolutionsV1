import './globals.css'
import { Suspense } from 'react'
import Script from 'next/script'
import GoogleTagsProvider from '@/components/GoogleTagsProvider'
import ClickTracker from '@/components/ClickTracker'
import FloatingCTA from '@/components/common/FloatingCTA'
import FirstPartyTracker from '@/components/common/FirstPartyTracker'

import { supabase } from '@/lib/supabase'

export async function generateMetadata() {
    let companyName = 'Sorted Solutions';
    let ogImageUrl = '/icon.jpg';
    
    try {
        const { data } = await supabase
            .from('print_settings')
            .select('company_name, whatsapp_preview_url')
            .limit(1);
            
        if (data && data[0]) {
            if (data[0].company_name) companyName = data[0].company_name;
            if (data[0].whatsapp_preview_url) ogImageUrl = data[0].whatsapp_preview_url;
        }
    } catch (e) {
        console.error('Error fetching dynamic metadata:', e);
    }
    
    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in'),
        title: `${companyName} - Expert Appliance Repair Services`,
        description: 'Professional repair services for AC, Refrigerator, Washing Machine, RO, Oven, and more. On-time service with 90-day warranty.',
        icons: {
            icon: '/favicon.png',
            apple: '/icons/icon-192x192.png',
        },
        manifest: '/manifest.json',
        appleWebApp: {
            statusBarStyle: 'black-translucent',
            title: companyName,
        },
        openGraph: {
            title: `${companyName} - Expert Appliance Repair Services`,
            description: 'Professional repair services for AC, Refrigerator, Washing Machine, RO, Oven, and more. On-time service with 90-day warranty.',
            images: [ogImageUrl],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${companyName} - Expert Appliance Repair Services`,
            images: [ogImageUrl],
        }
    };
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
            <body style={{ overflowX: 'hidden', maxWidth: '100vw' }} suppressHydrationWarning>
                {/* Global Print Engine injected via next/script to prevent hydration drop */}
                <Script src="/scripts/_print_func_inject.js?v=20260516_1" strategy="beforeInteractive" />
                {children}
                {/*
                    Both ClickTracker and FloatingCTA are client components that use
                    hooks (usePathname, useEffect). Wrapping each in Suspense prevents
                    React error #423 "hydration error outside Suspense boundary" which
                    was causing the ENTIRE page root to fall back to client rendering,
                    wiping out all server-rendered sections on the page.
                */}
                <Suspense fallback={null}>
                    <ClickTracker />
                </Suspense>
                <Suspense fallback={null}>
                    <FloatingCTA />
                </Suspense>
                <Suspense fallback={null}>
                    <FirstPartyTracker />
                </Suspense>
            </body>
        </html>
    )
}
