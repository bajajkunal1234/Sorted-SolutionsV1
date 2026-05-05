'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function FirstPartyTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentViewId = useRef(null);
    const startTime = useRef(null);

    useEffect(() => {
        // Initialize IDs
        let visitor_id = localStorage.getItem('sorted_visitor_id');
        if (!visitor_id) {
            visitor_id = uuidv4();
            localStorage.setItem('sorted_visitor_id', visitor_id);
        }

        let session_id = sessionStorage.getItem('sorted_session_id');
        if (!session_id) {
            session_id = uuidv4();
            sessionStorage.setItem('sorted_session_id', session_id);
        }

        const url = window.location.href;
        const referrer = document.referrer;
        const utm_source = searchParams.get('utm_source');
        const utm_medium = searchParams.get('utm_medium');
        const utm_campaign = searchParams.get('utm_campaign');

        // ── GCLID capture ──────────────────────────────────────────────────
        // Google Ads appends ?gclid=... to landing page URLs when auto-tagging is ON.
        // We read it from the URL, and persist it in sessionStorage so subsequent
        // page navigations (which won't have gclid in the URL) still know this
        // was a paid visit. Only the first session row creation needs to store it.
        const gclidFromUrl = searchParams.get('gclid');
        if (gclidFromUrl) {
            sessionStorage.setItem('sorted_gclid', gclidFromUrl);
        }
        const gclid = sessionStorage.getItem('sorted_gclid') || null;

        // Track Page View
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'pageview',
                visitor_id,
                session_id,
                url,
                pathname,
                referrer,
                utm_source,
                utm_medium,
                utm_campaign,
                gclid
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentViewId.current = data.page_view_id;
                startTime.current = Date.now();
            }
        })
        .catch(err => console.error('Tracker error:', err));

        // Track Duration on unmount or path change
        return () => {
            if (currentViewId.current && startTime.current) {
                const duration_seconds = Math.round((Date.now() - startTime.current) / 1000);
                
                // Using beacon for reliable send on unload if possible
                const payload = JSON.stringify({
                    type: 'duration_update',
                    page_view_id: currentViewId.current,
                    duration_seconds
                });

                // Navigator.sendBeacon is more reliable during unload
                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
                } else {
                    fetch('/api/analytics/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: payload,
                        keepalive: true
                    }).catch(() => {});
                }
            }
        };
    }, [pathname, searchParams]);

    return null;
}
