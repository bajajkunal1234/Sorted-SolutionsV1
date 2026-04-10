'use client'
/**
 * hooks/usePushNotifications.js
 *
 * Requests notification permission and registers FCM token.
 *
 * Platform behaviour:
 * - Android Chrome / desktop browsers: auto-prompts on mount
 * - iOS Safari (PWA from home screen, iOS 16.4+): MUST be from a user gesture.
 *   The hook returns { needsPrompt, promptNow } so the calling component can
 *   show a "Enable Notifications" button and call promptNow() on tap.
 *
 * Chrome on iPhone is NOT real Chrome — it's Safari WebKit and cannot do push at all.
 * The user must open the site in Safari and "Add to Home Screen".
 *
 * Usage:
 *   const { needsPrompt, promptNow } = usePushNotifications({ userType, userId })
 */

import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client';

export function usePushNotifications({ userType, userId }) {
    const [needsPrompt, setNeedsPrompt] = useState(false);
    const [prompted, setPrompted] = useState(false);

    // Detect if we're in standalone (PWA home-screen) mode on iOS
    const isIOSStandalone =
        typeof window !== 'undefined' &&
        (window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches);

    const isIOS =
        typeof navigator !== 'undefined' &&
        /iphone|ipad|ipod/i.test(navigator.userAgent);

    const register = useCallback(async () => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) {
            console.warn('[Push] Notification API not supported (Chrome on iOS?)');
            return;
        }
        if (!userType || !userId) return;

        try {
            setPrompted(true);
            const token = await requestNotificationPermission();
            if (token) {
                await saveFCMTokenToServer(token, userType, userId);
                console.log(`[Push] Token registered for ${userType}:${userId}`);
                setNeedsPrompt(false);
            }
        } catch (err) {
            console.warn('[Push] Token registration failed:', err.message);
        }
    }, [userType, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;  // Chrome on iOS — can't do push
        if (!userType || !userId) return;

        const permission = Notification.permission;

        if (permission === 'granted') {
            // Already granted — silently refresh the token (no prompt shown)
            register();
        } else if (permission === 'denied') {
            // User previously denied — we can't ask again
            console.warn('[Push] Permission previously denied by user');
        } else {
            // 'default' — need to ask
            if (isIOS) {
                // iOS requires the request to come from a user gesture (tap).
                // Show a "Enable Notifications" button instead of auto-prompting.
                setNeedsPrompt(true);
            } else {
                // Android / Desktop — safe to auto-prompt
                register();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userType, userId]);

    return {
        needsPrompt: needsPrompt && !prompted,
        promptNow: register,
        isIOSStandalone,
        isIOS,
    };
}
