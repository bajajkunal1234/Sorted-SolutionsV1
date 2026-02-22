'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerPage() {
    const router = useRouter();

    useEffect(() => {
        // Check if customer is logged in
        const customerId = localStorage.getItem('customerId');

        if (customerId) {
            // Redirect to dashboard if logged in
            router.push('/customer/dashboard');
        } else {
            // Redirect to login if not logged in
            router.push('/login');
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
