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
    const isCreation = method === 'POST' && (url.includes('/jobs') || url.includes('/transactions') || url.includes('/accounts'));
    const debounceWindow = isCreation ? 30000 : 5000;
    if (lastTime && Date.now() - lastTime < debounceWindow) {
        console.warn(`[Offline] Blocking duplicate API call within ${debounceWindow / 1000}s:`, method, url);
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
            if (now - t > 60000) recentRequests.delete(k);
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
            console.warn('[Offline] Mutative request failed:', url, err);
            // Critical entity creation requests (like new jobs) must NOT be blindly queued
            // upon a network timeout, because the server may have already received and committed it.
            if (isCreation) {
                console.warn('[Offline] Network error/timeout for job/creation request. Raising error to caller instead of queuing duplicate.');
                throw new Error('Network timeout or connection error while communicating with server. Please check the jobs list before retrying.');
            }
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
    let fallback = { success: true };
    if (normalized.includes('/jobs')) {
        fallback = { data: [], jobs: [], success: true };
    } else if (
        normalized.includes('/accounts') ||
        normalized.includes('/qrcodes') ||
        normalized.includes('/transactions') ||
        normalized.includes('/interactions') ||
        normalized.includes('/products') ||
        normalized.includes('/technicians') ||
        normalized.includes('/leaves') ||
        normalized.includes('/expenses') ||
        normalized.includes('/expense-categories') ||
        normalized.includes('/stock')
    ) {
        fallback = { data: [], success: true };
    }
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
        
        // Prevent accidental double-click submissions within 10 seconds
        const normBody = getNormalizedBody(options.body);
        const isDuplicate = queue.some(item => 
            item.url === url && 
            getNormalizedBody(item.body) === normBody && 
            (Date.now() - (item.timestamp || 0)) < 10000
        );
        if (isDuplicate) {
            console.warn('[Offline] Identical operation already pending in offline sync queue within 10s, skipping duplicate push:', url);
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

let isSyncInProgress = false;

/**
 * Replay all queued mutative requests to the server in order.
 */
export async function syncOfflineQueue() {
    if (!isBrowser || !isOnline()) return;
    if (isSyncInProgress) {
        console.log('[Offline] Sync already in progress, skipping concurrent run.');
        return;
    }
    isSyncInProgress = true;
    try {
        const queue = JSON.parse(safeStorage.getItem(QUEUE_KEY) || '[]');
        if (queue.length === 0) return;

        console.log(`[Offline] Syncing ${queue.length} pending offline operations...`);
        const remainingQueue = [];
        let hasNetworkError = false;
        const uploadedUrls = {};
        const filesToDelete = new Set();

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
                const matches = [];
                let tempMatch;
                while ((tempMatch = regex.exec(syncedItem.body)) !== null) {
                    matches.push(tempMatch[1]);
                }

                let bodyString = syncedItem.body;
                for (const placeholderId of matches) {
                    if (uploadedUrls[placeholderId]) {
                        bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, uploadedUrls[placeholderId]);
                        continue;
                    }

                    const rawFile = await getOfflineFile(placeholderId);
                    const isValidFile = rawFile && (
                        (rawFile instanceof Blob && rawFile.size > 0) ||
                        (typeof File !== 'undefined' && rawFile instanceof File && rawFile.size > 0)
                    );

                    if (isValidFile) {
                        console.log(`[Offline] Uploading queued file ${placeholderId} to server...`);
                        const formData = new FormData();
                        formData.append('file', rawFile, rawFile.name || 'upload.jpg');

                        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                        const timeoutId = controller ? setTimeout(() => controller.abort(), 35000) : null;

                        let uploadRes;
                        try {
                            uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                                ...(controller ? { signal: controller.signal } : {})
                            });
                        } finally {
                            if (timeoutId) clearTimeout(timeoutId);
                        }
                        if (uploadRes.ok) {
                            const uploadData = await uploadRes.json();
                            if (uploadData.success && uploadData.url) {
                                uploadedUrls[placeholderId] = uploadData.url;
                                filesToDelete.add(placeholderId);
                                bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, uploadData.url);
                                console.log(`[Offline] Uploaded queued file successfully: ${uploadData.url}`);
                            } else {
                                throw new Error('Upload returned success=false: ' + (uploadData.error || ''));
                            }
                        } else {
                            if (uploadRes.status >= 400 && uploadRes.status < 500) {
                                console.warn(`[Offline] Upload rejected with client error ${uploadRes.status}, skipping attachment`);
                                bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, '/placeholder-error.jpg');
                                filesToDelete.add(placeholderId);
                            } else {
                                throw new Error(`Upload status ${uploadRes.status}`);
                            }
                        }
                    } else {
                        console.warn(`[Offline] Queued file ${placeholderId} not found or corrupted in IndexedDB, replacing with error placeholder`);
                        bodyString = bodyString.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, '/placeholder-error.jpg');
                        filesToDelete.add(placeholderId);
                    }
                }
                syncedItem.body = bodyString;
            } catch (err) {
                console.error(`[Offline] Failed to upload queued file for request, delaying sync:`, err);
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount >= 3) {
                    console.warn(`[Offline] Queued file upload failed ${item.retryCount} times (${err.message}). Bypassing file attachment to unblock queue.`);
                    for (const placeholderId of matches) {
                        syncedItem.body = syncedItem.body.replaceAll(`/offline-file-placeholder?id=${placeholderId}`, '/placeholder-error.jpg');
                        filesToDelete.add(placeholderId);
                    }
                } else {
                    safeStorage.setItem('offline_sync_error', `Upload failed: ${err.message}`);
                    if (!isOnline()) {
                        hasNetworkError = true;
                    }
                    remainingQueue.push(item);
                    continue;
                }
            }
        }

        // Dynamically inject latest active session token if present
        let headersToSend = { ...(syncedItem.headers || {}) };
        try {
            const sessionStr = safeStorage.getItem('technicianSession') || safeStorage.getItem('user_session');
            if (sessionStr) {
                const sessionObj = JSON.parse(sessionStr);
                const currentToken = sessionObj.session_token || sessionObj.token;
                if (currentToken) {
                    headersToSend['x-session-token'] = currentToken;
                }
            }
        } catch (e) {}

        try {
            const res = await fetch(syncedItem.url, {
                method: syncedItem.method,
                headers: headersToSend,
                body: syncedItem.body
            });

            if (res.ok) {
                console.log(`[Offline] Synced operation successfully: ${syncedItem.method} ${syncedItem.url}`);
            } else {
                console.warn(`[Offline] Operation failed on server (${res.status}): ${syncedItem.method} ${syncedItem.url}`);
                let errorMessage = '';
                try {
                    const data = await res.json();
                    errorMessage = data.error || data.message || '';
                } catch (_) {}
                const displayMsg = errorMessage 
                    ? `Server error (${res.status}): ${errorMessage}` 
                    : `Server error (${res.status}): ${syncedItem.method} ${syncedItem.url}`;
                safeStorage.setItem('offline_sync_error', displayMsg);

                if (res.status === 401) {
                    // Session expired or unauthorized: KEEP in queue until technician logs in again!
                    console.warn(`[Offline] Operation ${syncedItem.url} returned 401 Unauthorized. Keeping in queue until session is re-authenticated.`);
                    safeStorage.setItem('offline_sync_error', 'Session expired. Please log in to sync pending submissions.');
                    remainingQueue.push(item);
                    hasNetworkError = true;
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('offline-sync-error', { detail: { status: 401, error: 'Session expired' } }));
                    }
                    break; // Stop syncing remaining items until logged in
                } else if (res.status >= 500) {
                    // Server-side transient error (e.g., 502/503/504), retry up to 4 times before unblocking
                    item.retryCount = (item.retryCount || 0) + 1;
                    if (item.retryCount >= 4) {
                        console.warn(`[Offline] Operation ${syncedItem.url} failed 4 times with 5xx (${res.status}). Dropping from queue to avoid permanent deadlock.`);
                    } else {
                        if (!isOnline()) {
                            hasNetworkError = true;
                        }
                        remainingQueue.push(item);
                        continue;
                    }
                } else {
                    // Client error (4xx like 400): Broadcast error event so UI can display specific failure reason
                    console.warn(`[Offline] Operation ${syncedItem.url} failed with client error ${res.status}: ${displayMsg}`);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('offline-sync-error', { 
                            detail: { 
                                status: res.status, 
                                error: errorMessage, 
                                url: syncedItem.url 
                            } 
                        }));
                    }
                }
            }
        } catch (err) {
            console.error(`[Offline] Network error replaying operation, halting sync:`, err);
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount >= 3) {
                console.warn(`[Offline] Operation ${syncedItem.url} failed ${item.retryCount} times with network error. Dropping to prevent infinite retry loop.`);
            } else {
                safeStorage.setItem('offline_sync_error', `Network error: ${err.message}`);
                if (!isOnline()) {
                    hasNetworkError = true;
                }
                remainingQueue.push(item);
            }
        }
    }

    // Clean up successfully uploaded files from IndexedDB
    for (const placeholderId of filesToDelete) {
        const stillNeeded = remainingQueue.some(item => typeof item.body === 'string' && item.body.includes(`/offline-file-placeholder?id=${placeholderId}`));
        if (!stillNeeded) {
            await deleteOfflineFile(placeholderId).catch(err => console.error('[Offline] Error deleting file:', err));
        }
    }

    safeStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    if (remainingQueue.length === 0) {
        safeStorage.removeItem('offline_sync_error');
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: remainingQueue.length } }));
        if (remainingQueue.length === 0) {
            window.dispatchEvent(new CustomEvent('offline-sync-complete'));
        }
    }
    } finally {
        isSyncInProgress = false;
    }
}

// Automatically register online/offline listeners
if (isBrowser) {
    window.addEventListener('online', () => {
        console.log('[Offline] Device came online. Starting sync...');
        syncOfflineQueue();
    });
    setTimeout(syncOfflineQueue, 2000);
    setInterval(() => {
        if (isOnline() && !isSyncInProgress) {
            const queue = JSON.parse(safeStorage.getItem(QUEUE_KEY) || '[]');
            if (queue.length > 0) {
                syncOfflineQueue().catch(err => console.warn('[Offline] Periodic sync error:', err));
            }
        }
    }, 25000);
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

export async function storeOfflineFile(id, file, customFileName = null) {
    const db = await getDB();
    let arrayBuffer;
    let fileName = customFileName || (file && file.name) || 'upload.jpg';
    let fileType = (file && file.type) || 'image/jpeg';

    if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
        fileName = file.name || fileName;
        fileType = file.type || fileType;
        if (typeof file.arrayBuffer === 'function') {
            arrayBuffer = await file.arrayBuffer();
        } else {
            arrayBuffer = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.onerror = rej;
                reader.readAsArrayBuffer(file);
            });
        }
    } else if (file instanceof ArrayBuffer) {
        arrayBuffer = file;
    } else if (file && file.buffer instanceof ArrayBuffer) {
        arrayBuffer = file.buffer;
        fileName = file.name || fileName;
        fileType = file.type || fileType;
    } else if (typeof file === 'string' && file.startsWith('data:')) {
        try {
            const res = await fetch(file);
            const blob = await res.blob();
            arrayBuffer = await blob.arrayBuffer();
            fileType = blob.type || fileType;
        } catch (e) {
            console.error('[Offline] Failed to parse data URL:', e);
        }
    }

    if (!arrayBuffer) {
        console.warn('[Offline] Storing file without binary buffer:', id);
    }

    const record = {
        id,
        name: fileName,
        type: fileType,
        buffer: arrayBuffer,
        size: arrayBuffer ? arrayBuffer.byteLength : 0,
        storedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record, id);
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
        req.onsuccess = () => {
            const result = req.result;
            if (!result) {
                resolve(null);
                return;
            }

            // Structured format: ArrayBuffer record
            if (result.buffer && result.buffer instanceof ArrayBuffer && result.buffer.byteLength > 0) {
                try {
                    const blob = new Blob([result.buffer], { type: result.type || 'image/jpeg' });
                    const file = new File([blob], result.name || 'upload.jpg', { type: result.type || 'image/jpeg' });
                    resolve(file);
                    return;
                } catch (e) {
                    console.error('[Offline] Error reconstructing File from ArrayBuffer:', e);
                    resolve(null);
                    return;
                }
            }

            // Legacy format: raw File or Blob (Chrome/Firefox)
            if ((result instanceof Blob || (typeof File !== 'undefined' && result instanceof File)) && result.size > 0) {
                resolve(result);
                return;
            }

            // Corrupted or empty object (e.g. {} from Safari WebKit bug)
            console.warn(`[Offline] Stored file ${id} is invalid or has 0 bytes:`, result);
            resolve(null);
        };
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
 * Client-side image compressor using HTML5 canvas.
 * Shrinks heavy mobile camera photos (10-20MB) to lightweight ~80-150KB JPEGs.
 * Preserves aspect ratio, fits within maxDimension (default 1280px) at 0.8 JPEG quality.
 */
export async function compressImageClient(file, maxDimension = 1280, quality = 0.8) {
    if (!isBrowser || !(file instanceof Blob || (typeof File !== 'undefined' && file instanceof File))) {
        return file;
    }
    // Only compress raster images; pass through non-images (PDFs) or SVGs
    if (!file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }

    try {
        let bitmap;
        if (typeof createImageBitmap === 'function') {
            bitmap = await createImageBitmap(file);
        } else {
            bitmap = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        }

        let { width, height } = bitmap;
        // If already reasonably small, avoid unnecessary recompression
        if (width <= maxDimension && height <= maxDimension && file.size < 400 * 1024) {
            if (typeof bitmap.close === 'function') bitmap.close();
            return file;
        }

        // Calculate aspect ratio
        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            if (typeof bitmap.close === 'function') bitmap.close();
            return file;
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        if (typeof bitmap.close === 'function') bitmap.close();

        const compressedBlob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
        });

        if (compressedBlob && compressedBlob.size < file.size) {
            const originalName = file.name || 'upload.jpg';
            const baseName = originalName.replace(/\.[^/.]+$/, '');
            const newFile = new File([compressedBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
            console.log(`[Offline] Compressed image from ${(file.size / 1024).toFixed(0)}KB to ${(newFile.size / 1024).toFixed(0)}KB`);
            return newFile;
        }
        return file;
    } catch (err) {
        console.warn('[Offline] Client image compression failed, using original file:', err);
        return file;
    }
}

/**
 * Instantly stores a file into IndexedDB as an ArrayBuffer and returns an offline placeholder URL.
 * Automatically compresses raw camera photos before saving to avoid device quota and upload timeouts.
 * NEVER executes synchronous foreground network uploads so technicians on 2G / low speed networks
 * are never stuck waiting in front of customers.
 * Background sync (syncOfflineQueue) quietly processes and uploads files to Supabase when possible.
 */
export async function uploadOrQueueFile(file, customFileName) {
    if (!isBrowser) {
        return '/placeholder-error.jpg';
    }

    let fileToStore = file;
    try {
        fileToStore = await compressImageClient(file);
    } catch (e) {
        console.warn('[Offline] Image compression before queuing skipped:', e);
    }

    const fileName = customFileName || fileToStore?.name || file?.name || 'upload.jpg';

    // Save locally to IndexedDB as ArrayBuffer for reliable background sync.
    // Zero foreground network delay — UI returns and continues instantly (0ms delay)!
    const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    try {
        await storeOfflineFile(fileId, fileToStore, fileName);
    } catch (err) {
        console.warn('[Offline] Failed to store file in IndexedDB:', err);
    }
    return `/offline-file-placeholder?id=${fileId}`;
}

/**
 * Clear the entire offline mutative queue and any sync errors.
 */
export function clearOfflineQueue() {
    if (!isBrowser) return;
    safeStorage.removeItem(QUEUE_KEY);
    safeStorage.removeItem('offline_sync_error');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: 0 } }));
        window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    }
}

/**
 * Remove a specific item from the offline sync queue by ID.
 */
export function removeQueueItem(id) {
    if (!isBrowser) return;
    const queue = JSON.parse(safeStorage.getItem(QUEUE_KEY) || '[]');
    const updated = queue.filter(item => item.id !== id);
    safeStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    if (updated.length === 0) {
        safeStorage.removeItem('offline_sync_error');
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: updated.length } }));
        if (updated.length === 0) {
            window.dispatchEvent(new CustomEvent('offline-sync-complete'));
        }
    }
}
