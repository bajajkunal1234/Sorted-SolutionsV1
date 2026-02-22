'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TechnicianPage() {
    const router = useRouter()

    useEffect(() => {
        // Check if technician is logged in
        const session = localStorage.getItem('technicianSession')
        if (session) {
            router.push('/technician/dashboard')
        } else {
            router.push('/login')
        }
    }, [router])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)'
        }}>
            <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>
                Loading...
            </div>
        </div>
    )
}
