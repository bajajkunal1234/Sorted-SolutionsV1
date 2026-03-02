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
// Service workers cannot read Next.js env vars, so these are hardcoded.
const firebaseConfig = {
    apiKey: "AIzaSyCAPc5BIURGrPKig40qgRyaqi9eX8euXRA",
    authDomain: "sorted-cx-otp.firebaseapp.com",
    projectId: "sorted-cx-otp",
    storageBucket: "sorted-cx-otp.firebasestorage.app",
    messagingSenderId: "540860466737",
    appId: "1:540860466737:web:e5a2d028c9bd3f0e873710",
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
