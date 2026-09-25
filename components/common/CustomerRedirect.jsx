'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * CustomerRedirect — invisible client component.
 * Placed on the website homepage. If a customer is already
 * logged in (customerId in localStorage), auto-redirects them
 * straight to the customer dashboard instead of showing the
 * marketing site.
 */
export default function CustomerRedirect() {
    const router = useRouter()
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
            const id = localStorage.getItem('customerId');
            if (id) router.replace('/customer/dashboard');
        } catch { }
    }, [router])
    return null
}
