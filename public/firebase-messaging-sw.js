/**
 * public/firebase-messaging-sw.js
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications (tab closed / not focused).
 * This file MUST stay in /public so it is served at the root URL (/firebase-messaging-sw.js).
 * Service workers cannot access Next.js env vars — values are hardcoded here.
 *
 * Also provides:
 *   - install / activate lifecycle events (PWA installability)
 *   - Lightweight app-shell caching so the app works on poor connections
 */

// ─── Cache config ─────────────────────────────────────────────────────────────
const CACHE_NAME = 'sorted-app-v1';
const APP_SHELL_URLS = [
    '/technician/dashboard',
    '/customer/dashboard',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// ─── Install — pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_URLS))
    );
    // Skip waiting so the new SW takes control immediately
    self.skipWaiting();
});

// ─── Activate — clean up old caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    // Take control of all open clients immediately
    self.clients.claim();
});

// ─── Fetch — network-first (falls back to cache) ─────────────────────────────
// Only intercept navigation requests to our app-shell URLs.
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.mode !== 'navigate') return; // Only HTML navigation
    const url = new URL(request.url);
    if (!APP_SHELL_URLS.some(p => url.pathname.startsWith(p.split('?')[0]))) return;

    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ─── Firebase Config ─────────────────────────────────────────────────────────
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

// ─── Background message handler ──────────────────────────────────────────────
// Fires when the browser tab is CLOSED or not focused.
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    // FCM sends data in two possible shapes:
    //   1. payload.notification  — standard notification shape
    //   2. payload.data          — data-only message (our server sends both)
    const n = payload.notification || {};
    const d = payload.data || {};

    const title = n.title || d.title || 'Sorted Solutions';
    const body  = n.body  || d.body  || 'You have a new notification';
    const link  = d.link  || n.click_action || '/';

    const options = {
        body,
        icon:             '/icons/icon-192x192.png',
        badge:            '/icons/badge-72x72.png',
        data:             { link },
        requireInteraction: true,           // stays until user dismisses
        vibrate:          [200, 100, 200],
        tag:              d.job_id || 'sorted-notification',  // collapses duplicates
        renotify:         false,
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    return self.registration.showNotification(title, options);
});

// ─── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            // Focus existing window if URL matches
            const match = wins.find((w) => w.url.includes(url.split('?')[0]) && 'focus' in w);
            if (match) return match.focus();
            // Otherwise open a new window
            return clients.openWindow(url);
        })
    );
});

// ─── Push event fallback ──────────────────────────────────────────────────────
// Catches raw push events that FCM SDK might not intercept (data-only messages).
self.addEventListener('push', (event) => {
    // If FCM SDK already handled it via onBackgroundMessage, this will still fire
    // but showNotification is idempotent with the same `tag` so no duplicate appears.
    if (!event.data) return;

    let payload;
    try { payload = event.data.json(); } catch { return; }

    const n = payload.notification || {};
    const d = payload.data || {};

    // Only handle if FCM SDK didn't already (data-only messages have no notification key)
    if (n.title) return; // FCM SDK will handle messages that have a notification block

    const title = d.title || 'Sorted Solutions';
    const body  = d.body  || 'You have a new update';
    const link  = d.link  || '/';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon:   '/icons/icon-192x192.png',
            badge:  '/icons/badge-72x72.png',
            data:   { link },
            tag:    d.job_id || 'sorted-push',
            requireInteraction: true,
            vibrate: [200, 100, 200],
        })
    );
});
