'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { calculateCartTotals } from '@/lib/v2/catalogConfig';

const CART_STORAGE_KEY = 'sorted_v2_cart';
const LOCATION_STORAGE_KEY = 'sorted_v2_location';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [items, setItems] = useState([]);
    const [hydrated, setHydrated] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [location, setLocationState] = useState({
        locality: '',
        pincode: '',
        flat: '',
        building: '',
    });
    const [customerSession, setCustomerSession] = useState(null);

    useEffect(() => {
        try {
            const rawCart = localStorage.getItem(CART_STORAGE_KEY);
            if (rawCart) {
                const parsed = JSON.parse(rawCart);
                if (Array.isArray(parsed)) setItems(parsed);
            }

            const rawLoc = localStorage.getItem(LOCATION_STORAGE_KEY);
            if (rawLoc) {
                const parsedLoc = JSON.parse(rawLoc);
                if (parsedLoc && typeof parsedLoc === 'object') setLocationState(parsedLoc);
            }

            const rawCustomer = localStorage.getItem('customerData');
            const customerId = localStorage.getItem('customerId');
            if (rawCustomer) {
                setCustomerSession({
                    ...JSON.parse(rawCustomer),
                    customerId: customerId || JSON.parse(rawCustomer)?.id,
                });
            }
        } catch (_) {
            // Safe fallback if localStorage unavailable
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (_) {}
    }, [items, hydrated]);

    const saveLocation = useCallback((nextLoc) => {
        setLocationState(prev => {
            const merged = { ...prev, ...nextLoc };
            try {
                localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(merged));
            } catch (_) {}
            return merged;
        });
    }, []);

    const refreshCustomerSession = useCallback(() => {
        try {
            const rawCustomer = localStorage.getItem('customerData');
            const customerId = localStorage.getItem('customerId');
            if (rawCustomer) {
                const parsed = JSON.parse(rawCustomer);
                setCustomerSession({ ...parsed, customerId: customerId || parsed?.id });
            } else {
                setCustomerSession(null);
            }
        } catch (_) {}
    }, []);

    const saveCustomerSession = useCallback((user) => {
        if (!user?.id) return;
        const payload = { ...user, role: 'customer', token: 'sorted-auth-v2' };
        const serialized = JSON.stringify(payload);
        try {
            localStorage.setItem('user_session', serialized);
            localStorage.setItem('customerData', serialized);
            localStorage.setItem('customerId', String(user.id));
        } catch (_) {}
        setCustomerSession({ ...payload, customerId: String(user.id) });
    }, []);

    const logoutCustomerSession = useCallback(() => {
        try {
            localStorage.removeItem('user_session');
            localStorage.removeItem('customerData');
            localStorage.removeItem('customerId');
        } catch (_) {}
        setCustomerSession(null);
    }, []);

    const addItem = useCallback((service) => {
        if (!service?.id) return;
        setItems(prev => {
            const idx = prev.findIndex(i => i.id === service.id);
            if (idx > -1) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
                return copy;
            }
            return [
                ...prev,
                {
                    id: service.id,
                    name: service.name,
                    categorySlug: service.categorySlug,
                    categoryName: service.categoryName,
                    subgroup: service.subgroup,
                    price: Number(service.price) || 0,
                    mrp: Number(service.mrp) || Number(service.price) || 0,
                    gstRate: Number(service.gstRate ?? 18),
                    gstApplicable: service.gstApplicable !== false,
                    image: service.image,
                    warrantyNote: service.warrantyNote || '',
                    qty: 1,
                },
            ];
        });
    }, []);

    const incrementItem = useCallback((id) => {
        setItems(prev =>
            prev.map(i => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
        );
    }, []);

    const decrementItem = useCallback((id) => {
        setItems(prev =>
            prev
                .map(i => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
                .filter(i => i.qty > 0)
        );
    }, []);

    const removeItem = useCallback((id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const getItemQty = useCallback(
        (id) => items.find(i => i.id === id)?.qty || 0,
        [items]
    );

    const totals = useMemo(() => calculateCartTotals(items), [items]);

    const value = useMemo(
        () => ({
            items,
            hydrated,
            totals,
            cartOpen,
            setCartOpen,
            location,
            saveLocation,
            locationModalOpen,
            setLocationModalOpen,
            customerSession,
            refreshCustomerSession,
            saveCustomerSession,
            logoutCustomerSession,
            addItem,
            incrementItem,
            decrementItem,
            removeItem,
            clearCart,
            getItemQty,
        }),
        [
            items,
            hydrated,
            totals,
            cartOpen,
            location,
            saveLocation,
            locationModalOpen,
            customerSession,
            refreshCustomerSession,
            saveCustomerSession,
            logoutCustomerSession,
            addItem,
            incrementItem,
            decrementItem,
            removeItem,
            clearCart,
            getItemQty,
        ]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useV2Cart() {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error('useV2Cart must be used within CartProvider');
    }
    return ctx;
}
