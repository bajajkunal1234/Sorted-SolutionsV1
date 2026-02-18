'use client'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Lock, ArrowRight, Chrome, Mail, ShieldCheck, MapPin, User, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { logAuthEvent } from '@/lib/utils/logger';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auth States
    const [step, setStep] = useState('identify'); // identify, verify, mobile-link
    const [authMethod, setAuthMethod] = useState('password'); // password, otp
    const [identifier, setIdentifier] = useState(''); // Mobile or email
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-filled identifier from URL if any
    useEffect(() => {
        const phone = searchParams.get('phone');
        if (phone) setIdentifier(phone.replace(/\D/g, '').slice(-10));
    }, [searchParams]);

    const handleIdentifierSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (identifier.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        // Transition to next step
        if (authMethod === 'password') {
            setStep('verify');
        } else {
            // Trigger OTP send mock
            console.log('Sending OTP to', identifier);
            setStep('verify');
        }
    };

    const handleLogin = async (e) => {
        e && e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // MOCK AUTH LOGIC
            const mockAccounts = {
                '9999999999': { role: 'admin', name: 'Admin User' },
                '9876543210': { role: 'technician', name: 'Tech User' },
                '8888888888': { role: 'customer', name: 'Customer User' }
            };

            const account = mockAccounts[identifier];
            const isPasswordValid = (password === '123456');
            const otpCode = otp.join('');
            const isOtpValid = (otpCode === '123456');

            if (!account) {
                throw new Error('User not found. Try 9999999999, 9876543210, or 8888888888');
            }

            if (authMethod === 'password' && !isPasswordValid) {
                throw new Error('Invalid password. Try 123456');
            }

            if (authMethod === 'otp' && !isOtpValid) {
                throw new Error('Invalid OTP. Try 123456');
            }

            // Mock Successful Login
            const mockUser = {
                id: `mock-${account.role}-id`,
                phone: `+91${identifier}`,
                name: account.name,
                role: account.role
            };

            // Simple role detection logic for this demo
            let targetRoute = '/customer/dashboard';
            if (mockUser.role === 'admin') targetRoute = '/admin';
            else if (mockUser.role === 'technician') targetRoute = '/technician';

            // Store session
            localStorage.setItem('user_session', JSON.stringify({
                ...mockUser,
                token: 'mock-jwt-token'
            }));

            // Log interaction
            await logAuthEvent('login', mockUser);

            // For backward compatibility
            if (mockUser.role === 'admin') localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('customerId', mockUser.id);

            router.push(targetRoute);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        setLoading(true);
        // Simulate social login redirection
        setTimeout(() => {
            setLoading(false);
            setStep('mobile-link');
        }, 1000);
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
            background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
        }}>
            <main style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-md)'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '440px',
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--spacing-2xl)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Animated Glow Effect */}
                    <div style={{
                        position: 'absolute',
                        top: '-100px',
                        left: '-100px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        filter: 'blur(80px)',
                        borderRadius: '50%'
                    }} />

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)', position: 'relative' }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                backgroundColor: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto var(--spacing-md)',
                                fontSize: '32px',
                                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                            }}>
                                🏠
                            </div>
                        </Link>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>
                            Sorted Solutions
                        </h1>
                        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            The Home's Personal Doctor
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            color: '#f87171',
                            fontSize: '14px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Step 1: Identify User */}
                    {step === 'identify' && (
                        <div className="animate-fade-in">
                            <form onSubmit={handleIdentifierSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                                        Mobile Number
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'rgba(255, 255, 255, 0.4)' }} />
                                        <input
                                            type="tel"
                                            placeholder="Enter 10-digit mobile number"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            style={{
                                                width: '100%',
                                                padding: '13px 13px 13px 44px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '16px'
                                            }}
                                            required
                                        />
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '8px' }}>
                                        Use 9999999999 for testing
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMethod('password')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid',
                                            borderColor: authMethod === 'password' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                                            backgroundColor: authMethod === 'password' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            color: authMethod === 'password' ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Lock size={14} /> Password
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMethod('otp')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid',
                                            borderColor: authMethod === 'otp' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                                            backgroundColor: authMethod === 'otp' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            color: authMethod === 'otp' ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <ShieldCheck size={14} /> Mobile OTP
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    Continue <ArrowRight size={20} />
                                </button>
                            </form>

                            <div style={{ margin: '30px 0', borderTop: '1px solid rgba(255, 255, 255, 0.1)', position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: '#1e293b',
                                    padding: '0 12px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '12px'
                                }}>OR CONTINUE WITH</span>
                            </div>

                            <button
                                onClick={() => handleSocialLogin('google')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backgroundColor: 'white',
                                    color: '#1f2937',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }}
                            >
                                <Chrome size={20} color="#EA4335" /> Sign in with Google
                            </button>
                        </div>
                    )}

                    {/* Step 2: Verify (Password or OTP) */}
                    {step === 'verify' && (
                        <div className="animate-fade-in">
                            <button
                                onClick={() => setStep('identify')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '14px',
                                    marginBottom: '24px'
                                }}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>

                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                                {authMethod === 'password' ? 'Enter Password' : 'Verify Mobile OTP'}
                            </h2>
                            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
                                {authMethod === 'password' ? `Enter the account password for ${identifier}` : `Sent a 6-digit code to +91 ${identifier}`}
                            </p>

                            <form onSubmit={handleLogin}>
                                {authMethod === 'password' ? (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'rgba(255, 255, 255, 0.4)' }} />
                                            <input
                                                type="password"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '13px 13px 13px 44px',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontSize: '16px'
                                                }}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Try 123456</span>
                                            <Link href="#" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>Forgot password?</Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {otp.map((digit, idx) => (
                                                <input
                                                    key={idx}
                                                    id={`otp-${idx}`}
                                                    type="text"
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                                    style={{
                                                        width: '45px',
                                                        height: '50px',
                                                        textAlign: 'center',
                                                        fontSize: '20px',
                                                        fontWeight: 700,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '10px',
                                                        color: 'white'
                                                    }}
                                                    required
                                                    autoFocus={idx === 0}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', display: 'block', marginBottom: '8px' }}>Try 123456</span>
                                            <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer' }}>
                                                Resend OTP
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Log In'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 3: Link Mobile (After social login) */}
                    {step === 'mobile-link' && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                                One Last Step
                            </h2>
                            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
                                Please verify your mobile number to complete your registration.
                            </p>

                            <form onSubmit={(e) => { e.preventDefault(); setStep('verify'); setAuthMethod('otp'); }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                                        Mobile Number
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'rgba(255, 255, 255, 0.4)' }} />
                                        <input
                                            type="tel"
                                            placeholder="Enter 10-digit mobile number"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            style={{
                                                width: '100%',
                                                padding: '13px 13px 13px 44px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '16px'
                                            }}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    Verify via OTP <ArrowRight size={20} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            {/* Global Styles for Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease forwards;
                }
                .btn {
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                .btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }
                .btn:active {
                    transform: translateY(0);
                }
                .btn-primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white' }}>Loading auth...</div>}>
            <LoginContent />
        </Suspense>
    );
}
