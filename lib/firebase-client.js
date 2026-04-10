/**
 * lib/firebase-client.js
 * Client-side Firebase initialisation for Web Push Notifications.
 *
 * Required env vars (.env.local):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Request notification permission and get FCM token.
 * @returns {Promise<string|null>} FCM token or null if permission denied
 */
export async function requestNotificationPermission() {
    if (typeof window === 'undefined') return null;
    if (!('Notification' in window)) {
        console.warn('[FCM] Notifications not supported in this browser');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('[FCM] Notification permission denied');
        return null;
    }

    return getFCMToken();
}

/**
 * Get existing FCM token (does NOT prompt for permission).
 * @returns {Promise<string|null>}
 */
export async function getFCMToken() {
    if (typeof window === 'undefined') return null;

    try {
        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        // Register the service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
            return token;
        } else {
            console.warn('[FCM] No token available');
            return null;
        }
    } catch (error) {
        console.error('[FCM] Error getting token:', error);
        return null;
    }
}

/**
 * Listen for foreground messages (when app tab is open AND focused).
 * FCM does NOT auto-show a banner in this case — we do it manually via the SW.
 * @param {(payload: any) => void} handler - optional extra handler (e.g. to update bell count)
 */
export function onForegroundMessage(handler) {
    if (typeof window === 'undefined') return () => {};
    try {
        const app = getFirebaseApp();
        const messaging = getMessaging(app);
        return onMessage(messaging, (payload) => {
            // Show OS-level banner even while tab is open
            if ('serviceWorker' in navigator && Notification.permission === 'granted') {
                navigator.serviceWorker.ready.then((reg) => {
                    const n = payload.notification || {};
                    const d = payload.data || {};
                    const title = n.title || d.title || 'Sorted Solutions';
                    const body  = n.body  || d.body  || 'New notification';
                    const link  = d.link  || '/';
                    reg.showNotification(title, {
                        body,
                        icon:   '/icons/icon-192x192.png',
                        badge:  '/icons/badge-72x72.png',
                        data:   { link },
                        tag:    d.job_id || 'sorted-fg',
                        requireInteraction: false,
                        vibrate: [100, 50, 100],
                    });
                }).catch(() => {});
            }
            // Call the caller's handler (e.g. to refresh the in-app bell)
            if (typeof handler === 'function') handler(payload);
        });
    } catch {
        return () => {};
    }
}


/**
 * Save FCM token to server for the given user.
 * @param {string} token
 * @param {'customer'|'technician'} userType
 * @param {string} userId
 */
export async function saveFCMTokenToServer(token, userType, userId) {
    if (!token) return;
    try {
        if (userType === 'customer') {
            await fetch('/api/customer/fcm-token', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: userId, fcm_token: token }),
            });
        } else if (userType === 'technician') {
            await fetch('/api/customer/fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technician_id: userId, fcm_token: token }),
            });
        } else if (userType === 'admin') {
            await fetch('/api/customer/fcm-token', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fcm_token: token, name: userId || 'Admin' }),
            });
        }
    } catch (error) {
        console.error('[FCM] Failed to save token to server:', error);
    }
}
