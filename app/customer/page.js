'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAdminSession } from '@/lib/auth-helpers';

export default function CustomerPage() {
    const router = useRouter();

    useEffect(() => {
        try {
            // If admin, send straight to admin
            const adminSession = resolveAdminSession();
            if (adminSession) {
                localStorage.removeItem('customerId');
                localStorage.removeItem('customerData');
                router.replace('/admin');
                return;
            }

            const rawSession = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (rawSession) {
                const s = JSON.parse(rawSession);
                if (s?.role === 'technician') {
                    localStorage.removeItem('customerId');
                    localStorage.removeItem('customerData');
                    const techSession = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                    if (techSession) {
                        router.replace('/technician/dashboard');
                    } else {
                        router.replace('/login');
                    }
                    return;
                }
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
