import { supabase } from './supabase';

/**
 * Unified Auth Utility to bridge Custom Auth with Supabase Auth session management.
 */

// Technician Session Keys
export const TECH_SESSION_KEY = 'technicianSession';
export const TECH_DATA_KEY = 'technicianData';

// Customer Session Keys
export const CUST_SESSION_KEY = 'customerId';
export const CUST_DATA_KEY = 'customerData';

// Admin Session Keys
export const ADMIN_SESSION_KEY = 'user_session';
export const ADMIN_BACKUP_KEY = 'admin_user_session';
export const ADMIN_PHONE_KEY = 'admin_phone';
export const ADMIN_FLAG_KEY = 'isAdmin';

// Cookie Helpers
export function getCookie(name) {
    if (typeof document === 'undefined') return null;
    try {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    } catch {
        return null;
    }
}

export function setCookie(name, value, days = 365) {
    if (typeof document === 'undefined') return;
    try {
        const maxAge = days * 24 * 60 * 60;
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {}
}

export function deleteCookie(name) {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    } catch {}
}

/**
 * Robust Admin Session Resolver
 * Multi-layer fallback: primary localStorage, backup admin key, sessionStorage,
 * persistent cookie backup, and admin flag reconstruction.
 */
export function resolveAdminSession() {
    if (typeof window === 'undefined') return null;

    // 1. Primary localStorage or sessionStorage user_session
    try {
        const raw = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.role === 'admin') {
                return parsed;
            }
        }
    } catch {}

    // 2. Dedicated fallback key admin_user_session
    try {
        const adminRaw = localStorage.getItem(ADMIN_BACKUP_KEY);
        if (adminRaw) {
            const parsed = JSON.parse(adminRaw);
            if (parsed && parsed.role === 'admin') {
                try { localStorage.setItem(ADMIN_SESSION_KEY, adminRaw); } catch {}
                return parsed;
            }
        }
    } catch {}

    // 3. Persistent Cookie backup (survives when Android OS clears LevelDB / localStorage)
    try {
        const cookieSession = getCookie('admin_session');
        if (cookieSession) {
            const parsed = JSON.parse(cookieSession);
            if (parsed && parsed.role === 'admin') {
                try {
                    localStorage.setItem(ADMIN_SESSION_KEY, cookieSession);
                    localStorage.setItem(ADMIN_BACKUP_KEY, cookieSession);
                } catch {}
                return parsed;
            }
        }
    } catch {}

    // 4. Admin Auth Cookie or isAdmin flag reconstruction
    try {
        const hasAdminAuth = getCookie('admin_auth') === '1' || localStorage.getItem(ADMIN_FLAG_KEY) === 'true';
        if (hasAdminAuth) {
            const phone = localStorage.getItem(ADMIN_PHONE_KEY) || '';
            const reconstructed = {
                id: 'admin-id',
                name: 'Admin',
                phone: phone,
                role: 'admin',
                profile_complete: true,
                token: 'sorted-auth-v2'
            };
            const str = JSON.stringify(reconstructed);
            try {
                localStorage.setItem(ADMIN_SESSION_KEY, str);
                localStorage.setItem(ADMIN_BACKUP_KEY, str);
            } catch {}
            return reconstructed;
        }
    } catch {}

    return null;
}

/**
 * Save Admin Session across all redundant storage layers
 */
export function saveAdminSession(user) {
    if (typeof window === 'undefined') return;
    const session = JSON.stringify({ ...user, role: 'admin', token: 'sorted-auth-v2' });
    try {
        localStorage.setItem(ADMIN_SESSION_KEY, session);
        sessionStorage.setItem(ADMIN_SESSION_KEY, session);
        localStorage.setItem(ADMIN_BACKUP_KEY, session);
        localStorage.setItem(ADMIN_FLAG_KEY, 'true');
        sessionStorage.setItem(ADMIN_FLAG_KEY, 'true');
        if (user.phone) localStorage.setItem(ADMIN_PHONE_KEY, user.phone);

        // 365-day persistent cookies for Android WebView resilience
        setCookie('admin_auth', '1', 365);
        setCookie('admin_session', session, 365);

        // Clean customer & technician keys so admin is never misidentified
        localStorage.removeItem(CUST_SESSION_KEY);
        sessionStorage.removeItem(CUST_SESSION_KEY);
        localStorage.removeItem(CUST_DATA_KEY);
        sessionStorage.removeItem(CUST_DATA_KEY);
        localStorage.removeItem(TECH_SESSION_KEY);
        sessionStorage.removeItem(TECH_SESSION_KEY);
        localStorage.removeItem(TECH_DATA_KEY);
        sessionStorage.removeItem(TECH_DATA_KEY);
    } catch (e) {
        console.warn('[Auth] Failed to save complete admin session:', e);
    }
}

/**
 * Clear Admin Session (Explicit Logout only)
 */
export function clearAdminSession() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_BACKUP_KEY);
        localStorage.removeItem(ADMIN_PHONE_KEY);
        localStorage.removeItem(ADMIN_FLAG_KEY);
        sessionStorage.removeItem(ADMIN_FLAG_KEY);
        deleteCookie('admin_auth');
        deleteCookie('admin_session');
    } catch {}
}

/**
 * Get the current session for a specific role
 * @param {string} role - 'technician' or 'customer'
 */
export const getSession = (role) => {
    if (typeof window === 'undefined') return null;
    const key = role === 'technician' ? TECH_SESSION_KEY : CUST_SESSION_KEY;
    const session = localStorage.getItem(key);
    try {
        return session ? JSON.parse(session) : null;
    } catch {
        return session; // Return as is if not JSON
    }
};

/**
 * Save session data
 */
export const saveSession = (role, data, userData = null) => {
    if (typeof window === 'undefined') return;
    const sessionKey = role === 'technician' ? TECH_SESSION_KEY : CUST_SESSION_KEY;
    const dataKey = role === 'technician' ? TECH_DATA_KEY : CUST_DATA_KEY;

    localStorage.setItem(sessionKey, JSON.stringify(data));
    if (userData) {
        localStorage.setItem(dataKey, JSON.stringify(userData));
    }
};

/**
 * Clear session data (Logout)
 */
export const clearSession = (role) => {
    if (typeof window === 'undefined') return;
    if (role === 'technician') {
        localStorage.removeItem(TECH_SESSION_KEY);
        localStorage.removeItem(TECH_DATA_KEY);
    } else {
        localStorage.removeItem(CUST_SESSION_KEY);
        localStorage.removeItem(CUST_DATA_KEY);
    }
};

/**
 * Check if the user is authorized for a specific role
 */
export const isAuthenticated = (role) => {
    return !!getSession(role);
};
