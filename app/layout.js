import './globals.css'
import { Suspense } from 'react'
import GoogleTagsProvider from '@/components/GoogleTagsProvider'

export const metadata = {
    title: 'Sorted Solutions - Expert Appliance Repair Services',
    description: 'Professional repair services for AC, Refrigerator, Washing Machine, RO, Oven, and more. On-time service with 90-day warranty.',
    icons: {
        icon: '/logo-dark.jpg',
        apple: '/logo-light.jpg',
    },
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
            <body>{children}</body>
        </html>
    )
}
