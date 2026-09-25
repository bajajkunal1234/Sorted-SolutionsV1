'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerPage() {
    const router = useRouter();

    useEffect(() => {
        try {
            const rawSession = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (rawSession) {
                const s = JSON.parse(rawSession);
                if (s?.role === 'admin') {
                    localStorage.removeItem('customerId');
                    localStorage.removeItem('customerData');
                    router.replace('/admin');
                    return;
                }
                if (s?.role === 'technician') {
                    localStorage.removeItem('customerId');
                    localStorage.removeItem('customerData');
                    router.replace('/technician');
                    return;
                }
            }
            if (localStorage.getItem('isAdmin') === 'true') {
                localStorage.removeItem('customerId');
                localStorage.removeItem('customerData');
                router.replace('/admin');
                return;
            }
            const customerId = localStorage.getItem('customerId');
            if (customerId) {
                router.replace('/customer/dashboard');
            } else {
                router.replace('/login');
            }
        } catch {
            router.replace('/login');
        }
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            color: 'var(--text-secondary)'
        }}>
            Loading...
        </div>
    );
}
