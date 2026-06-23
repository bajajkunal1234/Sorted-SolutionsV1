/**
 * lib/offlineSync.js
 *
 * Provides offline caching for GET requests and a persistent request queue
 * for mutative requests (POST, PUT, DELETE) to support offline technician workflows.
 */

const CACHE_PREFIX = 'offline_cache_';
const QUEUE_KEY = 'offline_sync_queue';

// Safe check for browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Check if the device is currently online.
 */
export function isOnline() {
    if (!isBrowser) return true;
    return navigator.onLine;
}

/**
 * Wrap fetch requests to support offline caching and optimistic queuing.
 */
export async function apiCall(url, options = {}) {
    if (!isBrowser) {
        return fetch(url, options);
    }

    let sessionToken = null;
    try {
        const session = localStorage.getItem('technicianSession') || localStorage.getItem('user_session');
        if (session) {
            const sessionData = JSON.parse(session);
            sessionToken = sessionData.session_token || sessionData.token;
        }
    } catch (e) {}

    const headers = {
        ...options.headers,
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
    };
    const reqOptions = { ...options, headers };

    const method = (options.method || 'GET').toUpperCase();

    // ── Handle GET Requests (Read Cache) ─────────────────────────────────────
    if (method === 'GET') {
        if (isOnline()) {
            try {
                const res = await fetch(url, reqOptions);
                if (res.status === 401) {
                    window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
                }
                if (res.ok) {
                    const clonedRes = res.clone();
                    clonedRes.json().then(data => {
                        try {
                            localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(data));
                        } catch (e) {
                            console.warn('[Offline] Failed to save GET cache:', e);
                        }
                    }).catch(() => {});
                }
                return res;
            } catch (err) {
                console.warn('[Offline] Network fetch failed, falling back to cache:', err);
                return getCachedResponse(url);
            }
        } else {
            console.log('[Offline] Device offline, loading from cache:', url);
            return getCachedResponse(url);
        }
    }

    // ── Handle Mutative Requests (Queue Fallback) ────────────────────────────
    if (isOnline()) {
        try {
            const res = await fetch(url, reqOptions);
            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
            }
            return res;
        } catch (err) {
            console.warn('[Offline] Mutative request failed, queuing locally:', url, err);
            return queueRequest(url, reqOptions);
        }
    } else {
        console.log('[Offline] Device offline, queuing mutative request:', url);
        return queueRequest(url, reqOptions);
    }
}

/**
 * Return a mock Response object wrapping cached data.
 */
function getCachedResponse(url) {
    const cached = localStorage.getItem(CACHE_PREFIX + url);
    if (cached) {
        return new Response(cached, {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'x-offline-cached': 'true' }
        });
    }
    // Return empty array or object as a safe fallback depending on common endpoint structures
    const fallback = url.includes('/jobs') ? { jobs: [], success: true } : { success: true };
    return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-offline-fallback': 'true' }
    });
}

/**
 * Add a mutative request to the local persistent queue.
 */
function queueRequest(url, options) {
    try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        
        // Prevent duplicate location pings or identical rapid clicks
        const isDuplicate = queue.some(item => item.url === url && item.body === options.body && (Date.now() - item.timestamp < 10000));
        if (isDuplicate) {
            return new Response(JSON.stringify({ ok: true, queued: true, duplicate: true }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        queue.push({
            id: Math.random().toString(36).substring(2, 11),
            url,
            method: options.method || 'POST',
            headers: options.headers || {},
            body: options.body || null,
            timestamp: Date.now()
        });

        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

        // Trigger notification event if any listeners are registered
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: queue.length } }));
        }

        return new Response(JSON.stringify({ ok: true, queued: true, offline: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('[Offline] Error queuing request:', e);
        return new Response(JSON.stringify({ ok: false, error: 'Failed to write queue' }), { status: 500 });
    }
}

/**
 * Replay all queued mutative requests to the server in order.
 */
export async function syncOfflineQueue() {
    if (!isBrowser || !isOnline()) return;

    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`[Offline] Syncing ${queue.length} pending offline operations...`);
    const remainingQueue = [];
    let hasNetworkError = false;

    for (const item of queue) {
        if (hasNetworkError) {
            remainingQueue.push(item);
            continue;
        }

        try {
            const res = await fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            });

            if (res.ok) {
                console.log(`[Offline] Synced operation successfully: ${item.method} ${item.url}`);
            } else {
                console.warn(`[Offline] Operation failed on server (${res.status}): ${item.method} ${item.url}`);
                // In case of 4xx/5xx user errors, we drop it to prevent deadlock,
                // but log the details.
            }
        } catch (err) {
            console.error(`[Offline] Network error replaying operation, halting sync:`, err);
            hasNetworkError = true;
            remainingQueue.push(item);
        }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: remainingQueue.length } }));
        // Dispatch alert or reload triggers to fetch fresh state
        if (remainingQueue.length === 0) {
            window.dispatchEvent(new CustomEvent('offline-sync-complete'));
        }
    }
}

// Automatically register online/offline listeners
if (isBrowser) {
    window.addEventListener('online', () => {
        console.log('[Offline] Device came online. Starting sync...');
        syncOfflineQueue();
    });
    // Run initial check
    setTimeout(syncOfflineQueue, 2000);
}
