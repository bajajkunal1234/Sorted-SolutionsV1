'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Home, Calendar, Phone } from 'lucide-react';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

function SuccessContent() {
    const searchParams = useSearchParams();
    const jobId = searchParams.get('id');
    const router = useRouter();

    return (
        <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-2xl) var(--spacing-md)' }}>
            <div style={{
                maxWidth: '600px',
                width: '100%',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--spacing-3xl)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-primary)'
            }}>
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <CheckCircle size={80} color="#10b981" style={{ margin: '0 auto' }} />
                </div>

                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: '800', marginBottom: 'var(--spacing-md)' }}>
                    Booking Confirmed!
                </h1>

                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-2xl)' }}>
                    Success! Your service request has been received. Our team will contact you shortly to confirm the appointment.
                </p>

                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'left',
                    marginBottom: 'var(--spacing-2xl)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>Booking ID:</span>
                        <span style={{ fontWeight: 'bold' }}>#{jobId || 'PENDING'}</span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        <p>✅ Technician assignment in progress</p>
                        <p>✅ Confirmation call within 30 mins</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                    <button
                        onClick={() => router.push('/')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '12px 24px' }}
                    >
                        <Home size={18} /> Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function BookingSuccessPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <Header />
            <Suspense fallback={<div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>Loading success details...</div>}>
                <SuccessContent />
            </Suspense>
            <FooterSection />
        </div>
    )
}

