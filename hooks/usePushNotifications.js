'use client'
/**
 * hooks/usePushNotifications.js
 *
 * Shared hook — requests notification permission and registers the FCM token
 * for the current user on app mount.
 *
 * Usage:
 *   usePushNotifications({ userType: 'admin', userId: 'admin' })
 *   usePushNotifications({ userType: 'customer', userId: customer.id })
 *   usePushNotifications({ userType: 'technician', userId: tech.id })
 *
 * Guards:
 * - Only runs in browser
 * - Skips if Notification API not supported (older Android WebView)
 * - Skips if permission already granted (no repeated prompts)
 * - Re-registers on every mount to refresh stale tokens
 */

import { useEffect } from 'react';
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client';

export function usePushNotifications({ userType, userId }) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;       // browser doesn't support it
        if (!userType || !userId) return;              // not logged in yet

        async function register() {
            try {
                const token = await requestNotificationPermission(); // prompts if 'default', skips if already 'granted'/'denied'
                if (token) {
                    await saveFCMTokenToServer(token, userType, userId);
                    console.log(`[Push] Token registered for ${userType}:${userId}`);
                }
            } catch (err) {
                console.warn('[Push] Token registration failed:', err.message);
            }
        }

        register();
    }, [userType, userId]);
}
