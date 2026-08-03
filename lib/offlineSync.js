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

// Memory fallback store for when localStorage is full or disabled
const memoryStore = {};
const safeStorage = {
    getItem: (key) => {
        try {
            return isBrowser ? localStorage.getItem(key) : null;
        } catch (e) {
            return memoryStore[key] || null;
        }
    },
    setItem: (key, value) => {
        try {
            if (isBrowser) {
                localStorage.setItem(key, value);
                return;
            }
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('[Offline] LocalStorage quota exceeded. Pruning GET cache...');
                clearOfflineCache();
                try {
                    if (isBrowser) {
                        localStorage.setItem(key, value);
                        return;
                    }
                } catch (retryErr) {
                    console.warn('[Offline] Pruning cache was insufficient:', retryErr.message);
                }
            }
            console.warn('[Offline] safeStorage.setItem failed, using in-memory store:', e.message);
        }
        memoryStore[key] = value;
    },
    removeItem: (key) => {
        try {
            if (isBrowser) localStorage.removeItem(key);
        } catch (e) {
            delete memoryStore[key];
        }
    },
    get length() {
        try {
            return isBrowser ? localStorage.length : 0;
        } catch (e) {
            return Object.keys(memoryStore).length;
        }
    },
    key: (index) => {
        try {
            return isBrowser ? localStorage.key(index) : null;
        } catch (e) {
            return Object.keys(memoryStore)[index] || null;
        }
    }
};

// Keep track of active/recent mutative requests to prevent duplicate submissions (e.g. double clicks)
const recentRequests = new Map();

/**
 * Strips dynamic parameters like random receipt numbers or random UUIDs from JSON bodies for robust deduplication.
 */
function getNormalizedBody(body) {
    if (!body || typeof body !== 'string') return body || '';
    try {
        const parsed = JSON.parse(body);
        delete parsed.receipt_number;
        delete parsed.id;
        return JSON.stringify(parsed);
    } catch (e) {
        return body;
    }
}

/**
 * Check if the device is currently online.
 */
export function isOnline() {
    if (!isBrowser) return true;
    return navigator.onLine;
}

/**
 * Clear all cached GET requests from local storage.
 */
export function clearOfflineCache() {
    if (!isBrowser) return;
    try {
        const keys = [];
        for (let i = 0; i < safeStorage.length; i++) {
            const key = safeStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keys.push(key);
            }
        }
        keys.forEach(key => safeStorage.removeItem(key));
        console.log(`[Offline] Cleared ${keys.length} cached GET responses to free up localStorage quota.`);
    } catch (e) {
        console.error('[Offline] Failed to clear offline cache:', e);
    }
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
        const session = safeStorage.getItem('technicianSession') || safeStorage.getItem('user_session');
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            try {
                const res = await fetch(url, { ...reqOptions, signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.status === 401) {
                    window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
                }
                if (res.ok) {
                    const clonedRes = res.clone();
                    clonedRes.json().then(data => {
                        try {
                            safeStorage.setItem(CACHE_PREFIX + normalizeUrlForCache(url), JSON.stringify(data));
                        } catch (e) {
                            console.warn('[Offline] Failed to save GET cache:', e);
                        }
                    }).catch(() => {});
                }
                return res;
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn('[Offline] Network fetch failed, falling back to cache:', err);
                return getCachedResponse(url);
            }
        } else {
            console.log('[Offline] Device offline, loading from cache:', url);
            return getCachedResponse(url);
        }
    }

    // ── Handle Mutative Requests (Queue Fallback) ────────────────────────────
    const normalizedBody = getNormalizedBody(reqOptions.body);
    const reqKey = `${method}:${url}:${normalizedBody}`;
    const lastTime = recentRequests.get(reqKey);
    if (lastTime && Date.now() - lastTime < 5000) {
        console.warn('[Offline] Blocking duplicate API call within 5s:', method, url);
        return new Response(JSON.stringify({ success: true, duplicated: true, message: 'Request already in progress' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    recentRequests.set(reqKey, Date.now());

    // Prune Map if it gets large to keep memory usage minimal
    if (recentRequests.size > 100) {
        const now = Date.now();
        for (const [k, t] of recentRequests.entries()) {
            if (now - t > 30000) recentRequests.delete(k);
        }
    }

    const hasPlaceholder = reqOptions.body && typeof reqOptions.body === 'string' && reqOptions.body.includes('/offline-file-placeholder?id=');

    if (isOnline() && !hasPlaceholder) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(url, { ...reqOptions, signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
            }
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('[Offline] Mutative request failed, queuing locally:', url, err);
            return queueRequest(url, reqOptions);
        }
    } else {
        if (hasPlaceholder) {
            console.log('[Offline] Request contains offline file placeholders, forcing queue for background resolution:', url);
        } else {
            console.log('[Offline] Device offline, queuing mutative request:', url);
        }
        return queueRequest(url, reqOptions);
    }
}

/**
 * Normalizes a URL for caching by removing cache-busting search parameters (e.g. 't' or '_').
 */
function normalizeUrlForCache(url) {
    try {
        const parsed = new URL(url, 'http://localhost');
        parsed.searchParams.delete('t');
        parsed.searchParams.delete('_');
        if (url.startsWith('/') || url.startsWith('http://localhost/')) {
            return parsed.pathname + parsed.search;
        }
        return parsed.toString();
    } catch (e) {
        return url;
    }
}

/**
 * Return a mock Response object wrapping cached data.
 */
function getCachedResponse(url) {
    const normalized = normalizeUrlForCache(url);
    const cached = safeStorage.getItem(CACHE_PREFIX + normalized);
    if (cached) {
        return new Response(cached, {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'x-offline-cached': 'true' }
        });
    }
    // Return empty array or object as a safe fallback depending on common endpoint structures
    const fallback = normalized.includes('/jobs') ? { jobs: [], success: true } : { success: true };
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
        const queue = JSON.parse(safeStorage.getItem(QUEUE_KEY) || '[]');
        
        // Prevent duplicate location pings or identical rapid clicks
        const normBody = getNormalizedBody(options.body);
        const isDuplicate = queue.some(item => item.url === url && getNormalizedBody(item.body) === normBody && (Date.now() - item.timestamp < 10000));
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

        safeStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

        // Asynchronously start background sync if online
        if (isOnline()) {
            setTimeout(() => {
                syncOfflineQueue().catch(err => console.warn('[Offline] Background sync error:', err));
            }, 100);
        }

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
        return new Response(JSON.stringify({ ok: false, error: 'Failed to write queue: ' + e.message }), { status: 500 });
    }
}

/**
 * Replay all queued mutative requests to the server in order.
 */
export async function syncOfflineQueue() {
    if (!isBrowser || !isOnline()) return;

    const queue = JSON.parse(safeStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`[Offline] Syncing ${queue.length} pending offline operations...`);
    const remainingQueue = [];
    let hasNetworkError = false;

    for (const item of queue) {
        if (hasNetworkError) {
            remainingQueue.push(item);
            continue;
        }

        let syncedItem = { ...item };
        // Scan for offline file placeholders in the request body
        if (typeof syncedItem.body === 'string' && syncedItem.body.includes('/offline-file-placeholder?id=')) {
            try {
                const regex = /\/offline-file-placeholder\?id=([a-zA-Z0-9\-.]+)/g;
                let match;
                let bodyString = syncedItem.body;
                const matches = [];
                let tempMatch;
                while ((tempMatch = regex.exec(syncedItem.body)) !== null) {
                    matches.push(tempMatch[1]);
                }

                for (const placeholderId of matches) {
                    const rawFile = await getOfflineFile(placeholderId);
                    if (rawFile) {
                        console.log(`[Offline] Uploading queued file ${placeholderId} to server...`);
                        const formData = new FormData();
                        formData.append('file', rawFile, rawFile.name || 'upload.jpg');
                        const uploadRes = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });
                        if (uploadRes.ok) {
                            const uploadData = await uploadRes.json();
                            if (uploadData.success && uploadData.url) {
                                bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, uploadData.url);
                                await deleteOfflineFile(placeholderId);
                                console.log(`[Offline] Uploaded queued file successfully: ${uploadData.url}`);
                            } else {
                                throw new Error('Upload returned success=false');
                            }
                        } else {
                            throw new Error(`Upload status ${uploadRes.status}`);
                        }
                    } else {
                        console.warn(`[Offline] Queued file ${placeholderId} not found in IndexedDB, replacing with error placeholder`);
                        bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, '/placeholder-error.jpg');
                    }
                }
                syncedItem.body = bodyString;
            } catch (err) {
                console.error(`[Offline] Failed to upload queued file for request, delaying sync:`, err);
                hasNetworkError = true;
                remainingQueue.push(item);
                continue;
            }
        }

        try {
            const res = await fetch(syncedItem.url, {
                method: syncedItem.method,
                headers: syncedItem.headers,
                body: syncedItem.body
            });

            if (res.ok) {
                console.log(`[Offline] Synced operation successfully: ${syncedItem.method} ${syncedItem.url}`);
            } else {
                console.warn(`[Offline] Operation failed on server (${res.status}): ${syncedItem.method} ${syncedItem.url}`);
            }
        } catch (err) {
            console.error(`[Offline] Network error replaying operation, halting sync:`, err);
            hasNetworkError = true;
            remainingQueue.push(item);
        }
    }

    safeStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: remainingQueue.length } }));
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
    setTimeout(syncOfflineQueue, 2000);
}

// ── IndexedDB Storage for Offline Binary Files ────────────────────────────
const DB_NAME = 'sorted_offline_files';
const STORE_NAME = 'files';

function getDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function storeOfflineFile(id, file) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(file, id);
        req.onsuccess = () => resolve(id);
        req.onerror = () => reject(req.error);
    });
}

export async function getOfflineFile(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteOfflineFile(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Helper to queue a file in IndexedDB immediately to avoid ANY network latency for the active user,
 * returning a placeholder to be resolved in the background.
 */
export async function uploadOrQueueFile(file, customFileName) {
    if (!isBrowser) {
        return '/placeholder-error.jpg';
    }

    // Save locally immediately to avoid ANY network latency for the active user!
    const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    await storeOfflineFile(fileId, file);
    return `/offline-file-placeholder?id=${fileId}`;
}
