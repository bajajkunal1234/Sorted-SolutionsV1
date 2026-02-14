'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight } from 'lucide-react';

export default function CustomerLogin() {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if already logged in
        const customerId = localStorage.getItem('customerId');
        if (customerId) {
            router.push('/customer/dashboard');
        }
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validate phone number
            if (phoneNumber.length !== 10) {
                throw new Error('Please enter a valid 10-digit mobile number');
            }

            const formattedPhone = `+91${phoneNumber}`;

            // Simple login - just create/get customer by phone number
            const response = await fetch('/api/customer/auth/simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: formattedPhone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store customer session
            localStorage.setItem('customerId', data.customer.id);
            localStorage.setItem('customerData', JSON.stringify(data.customer));

            // Redirect to dashboard
            router.push('/customer/dashboard');
        } catch (err) {
            console.error('Error logging in:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--spacing-xl)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-primary)'
            }}>
                {/* Logo/Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--spacing-md)',
                        fontSize: 'var(--font-size-3xl)',
                        fontWeight: 700,
                        color: 'white'
                    }}>
                        🏠
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                        Welcome to Sorted
                    </h1>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Your home's personal doctor
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)',
                        fontSize: 'var(--font-size-sm)',
                        color: '#ef4444'
                    }}>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{
                            display: 'block',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            marginBottom: 'var(--spacing-xs)',
                            color: 'var(--text-primary)'
                        }}>
                            Mobile Number
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)'
                            }} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Enter 10-digit mobile number"
                                className="form-input"
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    fontSize: 'var(--font-size-base)'
                                }}
                                required
                                maxLength={10}
                                autoFocus
                            />
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)',
                            marginTop: 'var(--spacing-xs)'
                        }}>
                            Quick login for development (no OTP required)
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || phoneNumber.length !== 10}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-sm)',
                            fontSize: 'var(--font-size-base)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-xs)'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                        <ArrowRight size={18} />
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: 'var(--spacing-xl)',
                    paddingTop: 'var(--spacing-md)',
                    borderTop: '1px solid var(--border-primary)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)'
                }}>
                    Development Mode - No OTP Required
                </div>
            </div>
        </div>
    );
}
