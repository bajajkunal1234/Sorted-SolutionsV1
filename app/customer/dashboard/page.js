'use client'

import { useState, useEffect, Suspense } from 'react';
import CustomerApp from '@/components/customer/CustomerApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PWAPrompt from '@/components/common/PWAPrompt';

export default function CustomerDashboard() {
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        // Read session from storage (set by login flow)
        const id = localStorage.getItem('customerId') || sessionStorage.getItem('customerId');
        if (id) setCustomerId(id);
    }, []);

    // Silently refresh FCM token when permission is already granted
    usePushNotifications({ userType: 'customer', userId: customerId });

    return (
        <>
            {/* PWA install + notification permission prompt — shown once on first load */}
            <PWAPrompt
                appName="Sorted App"
                appColor="#3b82f6"
                userType="customer"
                userId={customerId}
            />
            <Suspense fallback={<div style={{ height: '100vh', background: '#0f172a' }} />}>
                <CustomerApp />
            </Suspense>
        </>
    );
}
