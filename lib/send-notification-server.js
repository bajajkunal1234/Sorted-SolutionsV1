/**
 * lib/send-notification-server.js
 * Server-side FCM push notification sender using Firebase Admin SDK.
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

import admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin;

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Replace escaped newlines from env var string
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
    });

    return admin;
}

/**
 * Send a FCM push to a single device token.
 * @param {string} token - FCM device/browser token
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 */
export async function sendFCMPush(token, { title, body, data = {} }) {
    if (!token) throw new Error('FCM token is required');

    const fb = getFirebaseAdmin();
    const clickLink = data.link || process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';
    
    const message = {
        token,
        notification: { title, body },
        data,
        webpush: {
            notification: {
                title,
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                requireInteraction: false,
            },
            fcm_options: {
                link: clickLink,
            },
        },
    };

    const response = await fb.messaging().send(message);
    console.log(`[FCM] Push sent — messageId: ${response}`);
    return response;
}

/**
 * Send FCM push to multiple tokens at once (multicast).
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 */
export async function sendFCMMulticast(tokens, { title, body, data = {} }) {
    if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

    const fb = getFirebaseAdmin();
    const clickLink = data.link || process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';

    const message = {
        tokens,
        notification: { title, body },
        data,
        webpush: {
            notification: {
                title,
                body,
                icon: '/icons/icon-192x192.png',
            },
            fcm_options: {
                link: clickLink,
            },
        },
    };

    const response = await fb.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Multicast: ${response.successCount} sent, ${response.failureCount} failed`);
    return response;
}
