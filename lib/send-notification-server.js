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

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your server environment (e.g. Vercel dashboard).');
    }

    let cleanPrivateKey = privateKey.trim();
    if (cleanPrivateKey.startsWith('"') || cleanPrivateKey.startsWith("'")) {
        cleanPrivateKey = cleanPrivateKey.slice(1);
    }
    if (cleanPrivateKey.endsWith('"') || cleanPrivateKey.endsWith("'")) {
        cleanPrivateKey = cleanPrivateKey.slice(0, -1);
    }
    cleanPrivateKey = cleanPrivateKey.trim().replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: projectId,
            client_email: clientEmail,
            private_key: cleanPrivateKey,
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
