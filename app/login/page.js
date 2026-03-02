'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Lock, ArrowRight, Chrome, Mail, ShieldCheck, MapPin, User, Loader2, ChevronLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { logLogin } from '@/lib/interactions';

// ── Demo accounts for quick dev bypass ──────────────────────────────────────
const DEMO_ACCOUNTS = [
    { role: 'customer', label: 'Customer', emoji: '👤', color: '#3b82f6', route: '/customer/dashboard', id: 'demo-customer-001', name: 'Demo Customer', phone: '9999999999' },
    { role: 'technician', label: 'Technician', emoji: '🔧', color: '#10b981', route: '/technician', id: 'demo-tech-001', name: 'Demo Technician', phone: '8888888888' },
    { role: 'admin', label: 'Admin', emoji: '⚙️', color: '#f59e0b', route: '/admin', id: 'demo-admin-001', name: 'Demo Admin', phone: '7777777777' },
]
function demoLogin(account) {
    const session = { id: account.id, name: account.name, phone: account.phone, role: account.role, token: 'demo-token' };
    localStorage.setItem('user_session', JSON.stringify(session));
    localStorage.setItem('customerData', JSON.stringify(session));
    localStorage.setItem('customerId', account.id);
    if (account.role === 'admin') localStorage.setItem('isAdmin', 'true');
    else localStorage.removeItem('isAdmin');
    window.location.href = account.route;
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auth States
    const [step, setStep] = useState('identify'); // identify, verify, mobile-link
    const [authMethod, setAuthMethod] = useState('otp'); // Default to OTP for Firebase integration
    const [identifier, setIdentifier] = useState(''); // Mobile or email
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [showDiag, setShowDiag] = useState(false); // Diagnostic toggle
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [recaptchaWidgetId, setRecaptchaWidgetId] = useState(null);
    const recaptchaInitRef = useRef(false);

    // Pre-filled identifier from URL if any
    useEffect(() => {
        const phone = searchParams.get('phone');
        if (phone) setIdentifier(phone.replace(/\D/g, '').slice(-10));
    }, [searchParams]);

    // Initialize ReCAPTCHA
    const initRecaptcha = async () => {
        if (typeof window === 'undefined') return null;
        if (recaptchaInitRef.current && window.recaptchaVerifier) return window.recaptchaVerifier;

        try {
            console.log('--- Firebase ReCAPTCHA Init Start ---');
            recaptchaInitRef.current = true;

            const container = document.getElementById('recaptcha-container');
            if (!container) {
                console.error('CRITICAL: recaptcha-container DIV NOT FOUND');
                recaptchaInitRef.current = false;
                return null;
            }

            // Clear previous content to prevent double widgets
            container.innerHTML = '';

            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    console.log('ReCAPTCHA Success - Token received');
                    setError(''); // Clear any "solve recaptcha" errors
                },
                'expired-callback': () => {
                    setError('ReCAPTCHA expired. Please solve it again.');
                },
                'error-callback': (err) => {
                    console.error('ReCAPTCHA Error:', err);
                    setError('ReCAPTCHA initialization failed. Please refresh.');
                    recaptchaInitRef.current = false;
                }
            });

            const widgetId = await verifier.render();
            setRecaptchaWidgetId(widgetId);
            setRecaptchaVerifier(verifier);
            window.recaptchaVerifier = verifier;

            console.log('--- Firebase ReCAPTCHA Init Complete ---');
            return verifier;
        } catch (err) {
            console.error('Failed to init ReCAPTCHA:', err);
            setError(`ReCAPTCHA Error: ${err.message}`);
            recaptchaInitRef.current = false;
            return null;
        }
    };

    useEffect(() => {
        // Use a small delay to ensure React has mounted the container div
        const timer = setTimeout(() => {
            if (!recaptchaInitRef.current) {
                initRecaptcha();
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                } catch (e) { }
            }
        };
    }, [auth]);

    const handleIdentifierSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (identifier.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (authMethod === 'password') {
            setStep('verify');
        } else {
            // FIREBASE OTP FLOW
            setLoading(true);
            try {
                let currentVerifier = recaptchaVerifier || window.recaptchaVerifier;
                if (!currentVerifier) {
                    currentVerifier = await initRecaptcha();
                }

                if (!currentVerifier) {
                    throw new Error('ReCAPTCHA could not be initialized. Please refresh the page.');
                }

                const phoneNumber = `+91${identifier}`;
                console.log(`--- [AUTH] Sending OTP to ${phoneNumber} ---`);
                console.log('Firebase Config Check:', {
                    apiKey: auth.app?.options?.apiKey ? 'OK' : 'MISSING',
                    projectId: auth.app?.options?.projectId || 'MISSING',
                    authDomain: auth.app?.options?.authDomain || 'MISSING'
                });

                if (authMethod === 'otp') {
                    // Check if ReCAPTCHA is solved
                    if (window.grecaptcha && recaptchaWidgetId !== null) {
                        const response = window.grecaptcha.getResponse(recaptchaWidgetId);
                        if (!response) {
                            setError('Please solve the ReCAPTCHA checkbox first.');
                            setLoading(false);
                            return;
                        }
                    }
                }

                const result = await signInWithPhoneNumber(auth, phoneNumber, currentVerifier);
                setConfirmationResult(result);
                setStep('verify');
                console.log('--- [AUTH] OTP Sent Successfully ---');
            } catch (err) {
                console.error('--- [AUTH] ERROR ---');
                console.error('Code:', err.code);
                console.error('Message:', err.message);
                console.dir(err); // Show full object structure in console

                console.group('CRITICAL TROUBLESHOOTING');
                console.log('1. HOST:', window.location.origin);
                console.log('2. PROJECT:', auth.app?.options?.projectId);
                console.log('3. IS PHONE AUTH ENABLED?: Check Firebase Console > Authentication > Sign-in method');
                console.log('4. DOMAIN RESTRICTIONS: Check Firebase Console > Authentication > Settings > Authorized Domains (must include localhost)');
                console.log('5. API KEY RESTRICTIONS: Check GCP Console > Credentials (should be "None" for testing)');
                console.groupEnd();

                if (err.code === 'auth/invalid-app-credential') {
                    setError('Authentication failure: App Identity could not be verified. Please check if "localhost:3000" is added to Authorized Domains in Firebase Console and if the API Key has restrictions.');
                } else if (err.code === 'auth/invalid-phone-number') {
                    setError('Invalid phone number format.');
                } else if (err.code === 'auth/too-many-requests') {
                    setError('Security block: Too many attempts. Please try again in 30 minutes or use a different number / Test Number.');
                } else if (err.message?.includes('reCAPTCHA client element has been removed')) {
                    setError('ReCAPTCHA Session Expired. Please click "Continue" again to retry.');
                    // In this specific case, we SHOULD reset so they can try again
                    recaptchaInitRef.current = false;
                } else {
                    setError(err.message || 'Failed to send OTP. Please try again.');
                }

                // Log details for the developer
                console.log('--- [AUTH] PROMPT: Please check Google/Firebase consoles if the error above is invalid-app-credential ---');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleLogin = async (e) => {
        e && e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const otpCode = otp.join('');
            let firebaseUser = null;

            if (authMethod === 'otp') {
                if (!confirmationResult) {
                    throw new Error('Session expired. Please request a new OTP.');
                }

                if (otpCode.length !== 6) {
                    throw new Error('Please enter a complete 6-digit OTP.');
                }

                // Verify Firebase OTP
                const result = await confirmationResult.confirm(otpCode);
                firebaseUser = result.user;
            } else {
                // Password Auth (still using mock for password for now, or you can implement Supabase/Firebase password auth)
                if (password !== '123456') {
                    throw new Error('Invalid password. Try 123456');
                }
                // Mock identifier check for password
                const mockAccounts = {
                    '9999999999': { role: 'admin', name: 'Admin User' },
                    '9876543210': { role: 'technician', name: 'Tech User' },
                    '8888888888': { role: 'customer', name: 'Customer User' }
                };
                if (!mockAccounts[identifier]) {
                    throw new Error('User not found. Use identifier that exists in your database.');
                }
            }

            // 2. Synchronize with Supabase via Backend Bridge
            let finalUser = null;

            if (firebaseUser) {
                const response = await fetch('/api/customer/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebaseUid: firebaseUser.uid,
                        phoneNumber: firebaseUser.phoneNumber
                    })
                });

                const syncData = await response.json();
                if (!response.ok) {
                    throw new Error(syncData.error || 'Failed to synchronize with database.');
                }

                finalUser = {
                    id: syncData.user.id,
                    name: syncData.user.name,
                    phone: syncData.user.phone,
                    role: syncData.user.role || 'customer'
                };
            } else {
                // Mock fallback for password devs/debugging
                finalUser = {
                    id: `mock-${identifier}-id`,
                    name: 'Admin User',
                    phone: identifier,
                    role: 'admin'
                };
            }

            // 3. Complete Login
            let targetRoute = '/customer/dashboard';
            if (finalUser.role === 'admin') targetRoute = '/admin';
            else if (finalUser.role === 'technician') targetRoute = '/technician';

            // Store session
            localStorage.setItem('user_session', JSON.stringify({
                ...finalUser,
                token: 'firebase-token-placeholder', // In real app, use firebaseUser.getIdToken()
                firebaseUid: firebaseUser?.uid
            }));

            // Log interaction
            await logLogin(finalUser, finalUser.role, 'Login Page');

            // Backward compatibility
            if (finalUser.role === 'admin') localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('customerId', finalUser.id);
            localStorage.setItem('customerData', JSON.stringify(finalUser));

            // Use replace to avoid stacking a login history entry
            router.replace(targetRoute);

            // Fallback: if client-side routing stalls after async/await, force hard redirect
            setTimeout(() => {
                if (window.location.pathname.includes('/login')) {
                    window.location.href = targetRoute;
                }
            }, 500);
        } catch (err) {
            console.error('Login error:', err);
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

                    {/* ── DEMO ACCESS BANNER ── */}
                    <div style={{
                        marginBottom: '20px',
                        padding: '14px',
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))',
                        border: '1.5px solid rgba(251,191,36,0.35)',
                        borderRadius: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <Zap size={12} color="#fbbf24" fill="#fbbf24" />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                Demo Access — Skip OTP
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {DEMO_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.role}
                                    onClick={() => demoLogin(acc)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 4px',
                                        background: `${acc.color}18`,
                                        border: `1.5px solid ${acc.color}55`,
                                        borderRadius: 10,
                                        color: acc.color,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 3,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${acc.color}30` }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${acc.color}18` }}
                                >
                                    <span style={{ fontSize: 16 }}>{acc.emoji}</span>
                                    {acc.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 1: Identify User */}
                    {step === 'identify' && (
                        <div className="animate-fade-in">
                            <form onSubmit={handleIdentifierSubmit}>
                                {/* Firebase ReCAPTCHA Container */}
                                <div id="recaptcha-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}></div>

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
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Continue'} <ArrowRight size={20} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => initRecaptcha()}
                                    style={{
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        fontSize: '11px',
                                        marginTop: '12px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Problems with OTP? Force Refresh Auth
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowDiag(!showDiag)}
                                    style={{
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.2)',
                                        fontSize: '10px',
                                        marginTop: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showDiag ? 'Hide Diagnostics' : 'Show Diagnostics'}
                                </button>

                                {showDiag && (
                                    <div style={{
                                        marginTop: '15px',
                                        padding: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        fontSize: '10px',
                                        color: '#94a3b8',
                                        textAlign: 'left',
                                        fontFamily: 'monospace',
                                        wordBreak: 'break-all'
                                    }}>
                                        <div style={{ marginBottom: '5px', color: '#60a5fa', fontWeight: 'bold' }}>Active Config Check (V6):</div>
                                        <div style={{ fontSize: '9px', marginBottom: '4px', opacity: 0.8 }}>Last code update: Feb 21, 21:15 (V6)</div>
                                        <div>Current Host: {typeof window !== 'undefined' ? window.location.host : '...'}</div>
                                        <div style={{ margin: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></div>
                                        <div>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.slice(0, 8)}...` : 'MISSING'}</div>
                                        <div>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING'}</div>
                                        <div>App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'MISSING'}</div>
                                        <div>Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING'}</div>
                                        <div style={{ marginTop: '5px', opacity: 0.7 }}>Tip: If any are 'MISSING', verify .env.local and RESTART server.</div>
                                    </div>
                                )}
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
