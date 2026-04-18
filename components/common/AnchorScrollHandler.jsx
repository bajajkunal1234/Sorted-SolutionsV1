'use client'

/**
 * AnchorScrollHandler
 *
 * Next.js App Router doesn't auto-scroll to hash anchors after hydration
 * because the page fully renders before the browser processes the URL hash.
 * This client component listens for the URL hash and scrolls smoothly to
 * the target element after the page finishes rendering.
 *
 * Usage: Add <AnchorScrollHandler /> once inside any Server Component layout.
 * When a user lands on /services/ac-repair#booking (e.g. from a Google Ads
 * sitelink), this scrolls them directly to the booking form.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AnchorScrollHandler() {
    const pathname = usePathname();

    useEffect(() => {
        // Give the page time to fully render all sections
        const scrollToHash = () => {
            const hash = window.location.hash;
            if (!hash) return;

            const id = hash.replace('#', '');
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        // Short delay to let Next.js finish hydration and render sections
        const timer = setTimeout(scrollToHash, 300);
        return () => clearTimeout(timer);
    }, [pathname]);

    return null; // Renders nothing — pure behaviour only
}
