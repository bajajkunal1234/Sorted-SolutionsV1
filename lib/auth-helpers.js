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
