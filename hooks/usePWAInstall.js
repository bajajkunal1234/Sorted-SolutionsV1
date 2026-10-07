'use client';
/**
 * hooks/usePWAInstall.js
 *
 * Captures the browser's beforeinstallprompt event so we can show a custom
 * "Add to Home Screen" button instead of relying on the browser's default banner.
 *
 * Returns:
 *   canInstall        – true if the browser has a pending install prompt
 *   triggerInstall()  – call from a user gesture to show the native install dialog
 *   isInstalled       – true if already running as a standalone PWA
 */

import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall]         = useState(false);
    const [isInstalled, setIsInstalled]       = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if already installed / running as a PWA
        let standalone = false;
        try {
            standalone =
                window.navigator?.standalone === true ||
                (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
        } catch (e) {}
        setIsInstalled(standalone);

        if (standalone) return; // already installed — no point showing the prompt

        const handler = (e) => {
            e.preventDefault(); // prevent automatic mini-infobar
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // iOS Safari fires no beforeinstallprompt — but we still know it's installable
        const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isIOS && isSafari && !standalone) {
            setCanInstall(true); // show iOS manual instructions
        }

        // Clean up installed state change
        let mql = null;
        let mqlHandler = null;
        try {
            if (typeof window.matchMedia === 'function') {
                mql = window.matchMedia('(display-mode: standalone)');
                mqlHandler = (e) => { if (e.matches) { setIsInstalled(true); setCanInstall(false); } };
                if (mql) {
                    if (typeof mql.addEventListener === 'function') {
                        mql.addEventListener('change', mqlHandler);
                    } else if (typeof mql.addListener === 'function') {
                        mql.addListener(mqlHandler);
                    }
                }
            }
        } catch (e) {}

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            if (mql && mqlHandler) {
                try {
                    if (typeof mql.removeEventListener === 'function') {
                        mql.removeEventListener('change', mqlHandler);
                    } else if (typeof mql.removeListener === 'function') {
                        mql.removeListener(mqlHandler);
                    }
                } catch (e) {}
            }
        };
    }, []);

    const triggerInstall = useCallback(async () => {
        if (!deferredPrompt) return false; // iOS — caller should show manual instructions
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setCanInstall(false);
        return outcome === 'accepted';
    }, [deferredPrompt]);

    // Is it iOS (which needs manual instructions)?
    const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hasNativePrompt = !!deferredPrompt;

    return { canInstall, triggerInstall, isInstalled, isIOS, hasNativePrompt };
}
