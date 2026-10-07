'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolveAdminSession } from '@/lib/auth-helpers'

export default function TechnicianPage() {
    const router = useRouter()

    useEffect(() => {
        try {
            // If admin, send to admin
            const adminSession = resolveAdminSession();
            if (adminSession) {
                router.replace('/admin');
                return;
            }

            const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
            if (session) {
                const parsed = JSON.parse(session);
                if (parsed && parsed.technicianId) {
                    router.replace('/technician/dashboard');
                    return;
                }
            }
        } catch (e) {
            console.warn('Error reading technicianSession:', e);
        }

        // Not validly logged in as technician: purge technician-specific keys only
        try {
            localStorage.removeItem('technicianSession');
            sessionStorage.removeItem('technicianSession');
            localStorage.removeItem('technicianData');
            sessionStorage.removeItem('technicianData');
        } catch {}
        router.replace('/login');
    }, [router])

    return (
        <div className="dvh-full" style={{
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
