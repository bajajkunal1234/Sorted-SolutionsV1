'use client'

import { useState, useEffect } from 'react';
import CustomerApp from '@/components/customer/CustomerApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function CustomerDashboard() {
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        // Read session from localStorage (set by login flow)
        const id = localStorage.getItem('customerId');
        if (id) setCustomerId(id);
    }, []);

    // Request notification permission and register FCM token for this customer
    usePushNotifications({ userType: 'customer', userId: customerId });

    return <CustomerApp />;
}
