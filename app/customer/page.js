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
                    const techSession = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                    if (techSession) {
                        router.replace('/technician/dashboard');
                    } else {
                        localStorage.removeItem('user_session');
                        sessionStorage.removeItem('user_session');
                        router.replace('/login');
                    }
                    return;
                }
            } else {
                localStorage.removeItem('isAdmin');
                sessionStorage.removeItem('isAdmin');
            }
            const customerId = localStorage.getItem('customerId');
            if (customerId) {
                router.replace('/customer/dashboard');
            } else {
                localStorage.removeItem('user_session');
                sessionStorage.removeItem('user_session');
                router.replace('/login');
            }
        } catch {
            localStorage.removeItem('user_session');
            sessionStorage.removeItem('user_session');
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
