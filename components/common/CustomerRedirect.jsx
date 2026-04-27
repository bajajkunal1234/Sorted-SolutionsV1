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
            const id = localStorage.getItem('customerId')
            if (id) router.replace('/customer/dashboard')
        } catch { }
    }, [router])
    return null
}
