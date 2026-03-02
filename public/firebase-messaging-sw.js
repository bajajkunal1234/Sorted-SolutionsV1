/**
 * public/firebase-messaging-sw.js
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web browsers.
 *
 * This file MUST stay in /public so it is served at the root URL.
 * Replace the firebaseConfig values with your actual project config.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ─── Firebase Config ────────────────────────────────────────────────────────
// These values are injected at build time via next.config.js or hardcoded here
// because service workers cannot access Next.js env vars at runtime.
// Replace the placeholders after adding keys to .env
const firebaseConfig = {
    apiKey: self.FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY',
    authDomain: self.FIREBASE_AUTH_DOMAIN || 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: self.FIREBASE_PROJECT_ID || 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: self.FIREBASE_STORAGE_BUCKET || 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: self.FIREBASE_APP_ID || 'YOUR_FIREBASE_APP_ID',
};
// ─────────────────────────────────────────────────────────────────────────────

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages (when tab is closed or in background)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const { title, body, icon } = payload.notification || {};
    const notificationOptions = {
        body: body || 'You have a new notification',
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: payload.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(title || 'Sorted Solutions', notificationOptions);
});

// Handle notification click — opens the app URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.link || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const existing = windowClients.find((c) => c.url === url && 'focus' in c);
            if (existing) return existing.focus();
            return clients.openWindow(url);
        })
    );
});
