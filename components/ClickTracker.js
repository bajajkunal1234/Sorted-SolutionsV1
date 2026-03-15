'use client';

import { useEffect } from 'react';

/**
 * ClickTracker — Loads all CSS-selector-based triggers from the admin and 
 * auto-attaches click listeners to matching elements on every page.
 * Runs silently in the background; never blocks the user.
 */
export default function ClickTracker() {
    useEffect(() => {
        let attached = []; // Track all listeners for cleanup

        const loadAndAttach = async () => {
            try {
                const res = await fetch('/api/track/triggers', { cache: 'no-store' });
                if (!res.ok) return;
                const { data: triggers } = await res.json();
                if (!Array.isArray(triggers) || triggers.length === 0) return;

                const currentPath = window.location.pathname;

                triggers.forEach(trigger => {
                    // If page_pattern is set, only attach on matching pages
                    if (trigger.page_pattern) {
                        try {
                            const pattern = new RegExp(trigger.page_pattern);
                            if (!pattern.test(currentPath)) return;
                        } catch {
                            // If regex is invalid, skip the pattern check
                        }
                    }

                    // Find all matching elements
                    let elements = [];
                    try {
                        elements = Array.from(document.querySelectorAll(trigger.css_selector));
                    } catch {
                        return; // Invalid selector, skip
                    }

                    elements.forEach(el => {
                        const handler = () => {
                            // Fire-and-forget — never blocks UI
                            fetch('/api/track/click', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: trigger.type,
                                    category: trigger.category || 'website',
                                    source: trigger.source || 'Website',
                                    description: trigger.description || `Clicked: ${trigger.css_selector}`,
                                    performedByName: 'Website Visitor',
                                    metadata: {
                                        page: currentPath,
                                        selector: trigger.css_selector,
                                        element_text: el.innerText?.slice(0, 100) || '',
                                    }
                                }),
                            }).catch(() => {}); // Silently ignore errors
                        };

                        el.addEventListener('click', handler, { passive: true });
                        attached.push({ el, handler });
                    });
                });
            } catch {
                // Never throw — tracker should never break the website
            }
        };

        // Run after page is interactive
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadAndAttach, { once: true });
        } else {
            loadAndAttach();
        }

        // Cleanup on unmount
        return () => {
            attached.forEach(({ el, handler }) => el.removeEventListener('click', handler));
        };
    }, []);

    return null; // Renders nothing
}
