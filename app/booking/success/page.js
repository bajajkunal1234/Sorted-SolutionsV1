'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Home, UserPlus, Eye } from 'lucide-react';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

function SuccessContent() {
    const searchParams = useSearchParams();
    const jobId = searchParams.get('id');
    const router = useRouter();
    const [signupDismissed, setSignupDismissed] = useState(false);

    return (
        <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-2xl) var(--spacing-md)' }}>
            <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Main confirmation card */}
                <div style={{
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
                            <span style={{ fontWeight: 'bold', fontSize: '13px', wordBreak: 'break-all' }}>#{jobId || 'PENDING'}</span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            <p>✅ Technician assignment in progress</p>
                            <p>✅ Confirmation call within 30 mins</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                        <button
                            onClick={() => router.push('/')}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '12px 24px' }}
                        >
                            <Home size={18} /> Back to Home
                        </button>
                    </div>
                </div>

                {/* Sign-up CTA card */}
                {!signupDismissed && (
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '24px 28px',
                        border: '1px solid rgba(99,102,241,0.4)',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setSignupDismissed(true)}
                            style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                        >×</button>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Eye size={22} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
                                    Track your service live
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                                    Create a free account to see your technician's location, get real-time updates, and view your service history.
                                </p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => router.push(`/signup?booking=${jobId}`)}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px' }}
                                    >
                                        <UserPlus size={15} /> Create Free Account
                                    </button>
                                    <button
                                        onClick={() => setSignupDismissed(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '13px', padding: '9px 4px' }}
                                    >
                                        No thanks
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}

export default function BookingSuccessPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <Header />
            <Suspense fallback={<div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>Loading...</div>}>
                <SuccessContent />
            </Suspense>
            <FooterSection />
        </div>
    )
}
