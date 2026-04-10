'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client';

async function registerPushToken(userId, userType) {
    try {
        const token = await requestNotificationPermission();
        if (token) await saveFCMTokenToServer(token, userType, userId);
    } catch (e) {
        console.warn('[FCM] push token registration:', e.message);
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function saveSession(user, persist) {
    const session = JSON.stringify({ ...user, token: 'sorted-auth-v2' });
    const storage = persist ? localStorage : sessionStorage;

    storage.setItem('user_session', session);

    if (user.role === 'admin') {
        storage.setItem('isAdmin', 'true');
    }

    if (user.role === 'technician') {
        const techSession = JSON.stringify({ technicianId: user.id });
        storage.setItem('technicianSession', techSession);
        storage.setItem('technicianData', JSON.stringify(user));
    } else {
        storage.setItem('customerData', session);
        storage.setItem('customerId', user.id);
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PhoneInput({ value, onChange, disabled }) {
    return (
        <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'rgba(255,255,255,0.4)' }} />
            <span style={{ position: 'absolute', left: 40, top: 14, color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>+91</span>
            <input
                type="tel"
                placeholder="Mobile number"
                value={value}
                onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={disabled}
                style={{ width: '100%', padding: '13px 13px 13px 74px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box' }}
                required
            />
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder = 'Password', autoFocus }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'rgba(255,255,255,0.4)' }} />
            <input
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                autoFocus={autoFocus}
                style={{ width: '100%', padding: '13px 44px 13px 44px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box' }}
                required
            />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 14, top: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}

function OtpBoxes({ otp, onChange, onKeyDown }) {
    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {otp.map((digit, idx) => (
                <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={e => onChange(idx, e.target.value)}
                    onKeyDown={e => onKeyDown(idx, e)}
                    style={{ width: 45, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'white' }}
                    autoFocus={idx === 0}
                />
            ))}
        </div>
    );
}

function KeepSignedIn({ checked, onChange }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <div
                onClick={() => onChange(!checked)}
                style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`, backgroundColor: checked ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
            >
                {checked && <CheckCircle2 size={12} color="white" />}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Keep me signed in</span>
        </label>
    );
}

function SubmitBtn({ loading, children }) {
    return (
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : children}
        </button>
    );
}

// ─── Main Login Component ─────────────────────────────────────────────────────
function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [flow, setFlow] = useState('login'); // 'login' | 'signup' | 'forgot'
    // step within signup/forgot: 'phone' | 'otp' | 'password'
    const [step, setStep] = useState('phone');

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [keepSignedIn, setKeepSignedIn] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaContainerRef = useRef(null);
    const recaptchaInitRef = useRef(false);
    const recaptchaVerifierRef = useRef(null);

    const initializedRef = useRef(false);
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        
        const p = searchParams.get('phone');
        if (p) setPhone(p.replace(/\D/g, '').slice(-10));
        const f = searchParams.get('flow');
        if (f === 'signup') setFlow('signup');
    }, [searchParams]);

    // Reset state when switching flows
    const switchFlow = (newFlow) => {
        setFlow(newFlow);
        setStep('phone');
        
        // Remove trailing url parameters so NextJS doesn't force re-evaluations
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/login');
        }
        
        setError('');
        setSuccessMsg('');
        setOtp(['', '', '', '', '', '']);
        setPassword('');
        setConfirmPassword('');
        setConfirmationResult(null);
        recaptchaInitRef.current = false;
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; } catch { }
        }
    };

    const initRecaptcha = async () => {
        if (recaptchaInitRef.current && window.recaptchaVerifier) return window.recaptchaVerifier;
        try {
            recaptchaInitRef.current = true;
            const container = document.getElementById('recaptcha-container');
            if (!container) { recaptchaInitRef.current = false; return null; }
            container.innerHTML = '';
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'normal',
                callback: () => setError(''),
                'expired-callback': () => { setError('reCAPTCHA expired. Please solve again.'); recaptchaInitRef.current = false; }
            });
            await verifier.render();
            window.recaptchaVerifier = verifier;
            recaptchaVerifierRef.current = verifier;
            return verifier;
        } catch (e) {
            recaptchaInitRef.current = false;
            setError('ReCAPTCHA failed. Please refresh the page.');
            return null;
        }
    };

    // Send OTP via Firebase
    const sendOtp = async () => {
        if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return false; }
        setLoading(true); setError('');
        try {
            let verifier = recaptchaVerifierRef.current || window.recaptchaVerifier;
            if (!verifier) verifier = await initRecaptcha();
            if (!verifier) throw new Error('ReCAPTCHA could not load. Please refresh.');
            const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
            setConfirmationResult(result);
            setOtp(['', '', '', '', '', '']);
            setStep('otp');
            return true;
        } catch (err) {
            if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please wait 30 minutes and try again.');
            else setError(err.message || 'Failed to send OTP. Please try again.');
            recaptchaInitRef.current = false;
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (idx, val) => {
        if (!/^\d*$/.test(val)) return;
        const updated = [...otp]; updated[idx] = val.slice(-1); setOtp(updated);
        if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
    };

    const verifyOtp = async () => {
        if (!confirmationResult) { setError('Session expired. Please resend OTP.'); return false; }
        const code = otp.join('');
        if (code.length !== 6) { setError('Enter the 6-digit code'); return false; }
        setLoading(true); setError('');
        try {
            await confirmationResult.confirm(code);
            return true;
        } catch {
            setError('Incorrect OTP. Please try again.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const finishLogin = (user) => {
        saveSession(user, keepSignedIn);
        // Register FCM push token (fire-and-forget — don't block redirect)
        if (user.role === 'customer') registerPushToken(user.id, 'customer');
        else if (user.role === 'technician') registerPushToken(user.id, 'technician');
        else if (user.role === 'admin') registerPushToken('admin', 'admin');
        const route = user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/technician' : '/customer/dashboard';
        router.replace(route);
        setTimeout(() => { if (window.location.pathname.includes('/login')) window.location.href = route; }, 600);
    };

    // ── FLOW: LOGIN ──────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/customer/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', phone, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            finishLogin(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── FLOW: SIGNUP — step 1: send OTP ─────────────────────────────────────
    const handleSignupPhone = async (e) => {
        e.preventDefault(); setError(''); setSuccessMsg('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
        // Check if already registered
        const check = await fetch(`/api/customer/auth?phone=${phone}`).then(r => r.json());
        if (check.exists) {
            if (check.isTechnician) {
                setError('This number is registered as a technician account. Please log in using your technician credentials.');
                return;
            } else if (check.hasPassword) {
                setError('An account already exists with this number. Please log in.');
                return;
            } else {
                // Claim flow: Organic adoption of Admin-created record
                setName(check.existingName || '');
                setSuccessMsg('An account with this number was created by our team. Please verify your number to complete registration.');
            }
        }
        await sendOtp();
    };

    // ── FLOW: SIGNUP — step 2: verify OTP ───────────────────────────────────
    const handleSignupOtp = async (e) => {
        e.preventDefault();
        const ok = await verifyOtp();
        if (ok) setStep('password');
    };

    // ── FLOW: SIGNUP — step 3: set password & create account ────────────────
    const handleSignupPassword = async (e) => {
        e.preventDefault(); setError('');
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/customer/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', phone, password, name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');
            finishLogin(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── FLOW: FORGOT — step 1: send OTP ─────────────────────────────────────
    const handleForgotPhone = async (e) => {
        e.preventDefault(); setError('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
        const check = await fetch(`/api/customer/auth?phone=${phone}`).then(r => r.json());
        if (!check.exists) { setError('No account found with this number.'); return; }
        await sendOtp();
    };

    // ── FLOW: FORGOT — step 2: verify OTP ───────────────────────────────────
    const handleForgotOtp = async (e) => {
        e.preventDefault();
        const ok = await verifyOtp();
        if (ok) setStep('password');
    };

    // ── FLOW: FORGOT — step 3: set new password ──────────────────────────────
    const handleForgotPassword = async (e) => {
        e.preventDefault(); setError('');
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/customer/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset-password', phone, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed');
            setSuccessMsg('Password reset! You can now log in.');
            setTimeout(() => switchFlow('login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const cardStyle = {
        width: '100%', maxWidth: 440,
        backgroundColor: 'rgba(30,41,59,0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: 36,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        boxSizing: 'border-box',
    };

    const inputGap = { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
            <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={cardStyle}>

                    {/* Glow accent */}
                    <div style={{ position: 'absolute', top: -80, left: -80, width: 200, height: 200, background: 'rgba(99,102,241,0.18)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />

                    {/* Logo + Brand */}
                    <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 32, boxShadow: '0 8px 20px rgba(99,102,241,0.35)' }}>🏠</div>
                        </Link>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 2 }}>Sorted Solutions</h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>The Home's Personal Doctor</p>
                    </div>

                    {/* Error / Success */}
                    {error && <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 18, textAlign: 'center' }}>{error}</div>}
                    {successMsg && <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, color: '#34d399', fontSize: 13, marginBottom: 18, textAlign: 'center' }}>{successMsg}</div>}

                    {/* ─── LOGIN FLOW ──────────────────────────────────────── */}
                    {flow === 'login' && (
                        <form onSubmit={handleLogin}>
                            <div style={{ marginBottom: 6 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Mobile Number</label>
                                <PhoneInput value={phone} onChange={setPhone} />
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Password</label>
                                    <button type="button" onClick={() => switchFlow('forgot')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, cursor: 'pointer', padding: 0 }}>Forgot password?</button>
                                </div>
                                <PasswordInput value={password} onChange={setPassword} autoFocus={false} />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <KeepSignedIn checked={keepSignedIn} onChange={setKeepSignedIn} />
                            </div>
                            <SubmitBtn loading={loading}><span>Log In</span><ArrowRight size={18} /></SubmitBtn>
                            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                                Don't have an account?{' '}
                                <button type="button" onClick={() => switchFlow('signup')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>Sign Up</button>
                            </p>
                        </form>
                    )}

                    {/* ─── SIGNUP FLOW ─────────────────────────────────────── */}
                    {flow === 'signup' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <button type="button" onClick={() => switchFlow('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0 }}><ChevronLeft size={16} /> Back to Login</button>
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>Create Account</h2>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                                {step === 'phone' && 'Enter your mobile number to get started'}
                                {step === 'otp' && `Enter the 6-digit OTP sent to +91 ${phone}`}
                                {step === 'password' && 'Set a password for your account'}
                            </p>

                            {/* Step indicators */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                                {['phone', 'otp', 'password'].map((s, i) => (
                                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: ['phone', 'otp', 'password'].indexOf(step) >= i ? '#3b82f6' : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
                                ))}
                            </div>

                            {step === 'phone' && (
                                <form onSubmit={handleSignupPhone}>
                                    <div id="recaptcha-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}></div>
                                    <div style={inputGap}>
                                        <PhoneInput value={phone} onChange={setPhone} />
                                    </div>
                                    <SubmitBtn loading={loading}><ShieldCheck size={16} /><span>Send OTP</span></SubmitBtn>
                                </form>
                            )}
                            {step === 'otp' && (
                                <form onSubmit={handleSignupOtp}>
                                    <OtpBoxes otp={otp} onChange={handleOtpChange} onKeyDown={handleOtpKeyDown} />
                                    <button type="button" onClick={sendOtp} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#60a5fa', fontSize: 13, cursor: 'pointer' }}>Resend OTP</button>
                                    <SubmitBtn loading={loading}><span>Verify OTP</span><ArrowRight size={16} /></SubmitBtn>
                                </form>
                            )}
                            {step === 'password' && (
                                <form onSubmit={handleSignupPassword}>
                                    <div style={inputGap}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                autoFocus
                                                style={{ width: '100%', padding: '13px 14px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box' }}
                                                required
                                            />
                                        </div>
                                        <PasswordInput value={password} onChange={setPassword} placeholder="Create password (min. 6 chars)" />
                                        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
                                    </div>
                                    <div style={{ marginBottom: 20 }}>
                                        <KeepSignedIn checked={keepSignedIn} onChange={setKeepSignedIn} />
                                    </div>
                                    <SubmitBtn loading={loading}><CheckCircle2 size={16} /><span>Create Account</span></SubmitBtn>
                                </form>
                            )}
                        </>
                    )}

                    {/* ─── FORGOT PASSWORD FLOW ────────────────────────────── */}
                    {flow === 'forgot' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <button type="button" onClick={() => switchFlow('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0 }}><ChevronLeft size={16} /> Back to Login</button>
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>Reset Password</h2>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                                {step === 'phone' && 'Enter your registered mobile number'}
                                {step === 'otp' && `Enter the 6-digit OTP sent to +91 ${phone}`}
                                {step === 'password' && 'Set your new password'}
                            </p>

                            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                                {['phone', 'otp', 'password'].map((s, i) => (
                                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: ['phone', 'otp', 'password'].indexOf(step) >= i ? '#6366f1' : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
                                ))}
                            </div>

                            {step === 'phone' && (
                                <form onSubmit={handleForgotPhone}>
                                    <div id="recaptcha-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}></div>
                                    <div style={inputGap}>
                                        <PhoneInput value={phone} onChange={setPhone} />
                                    </div>
                                    <SubmitBtn loading={loading}><ShieldCheck size={16} /><span>Send OTP</span></SubmitBtn>
                                </form>
                            )}
                            {step === 'otp' && (
                                <form onSubmit={handleForgotOtp}>
                                    <OtpBoxes otp={otp} onChange={handleOtpChange} onKeyDown={handleOtpKeyDown} />
                                    <button type="button" onClick={sendOtp} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#60a5fa', fontSize: 13, cursor: 'pointer' }}>Resend OTP</button>
                                    <SubmitBtn loading={loading}><span>Verify OTP</span><ArrowRight size={16} /></SubmitBtn>
                                </form>
                            )}
                            {step === 'password' && (
                                <form onSubmit={handleForgotPassword}>
                                    <div style={inputGap}>
                                        <PasswordInput value={password} onChange={setPassword} placeholder="New password (min. 6 chars)" autoFocus />
                                        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" />
                                    </div>
                                    <SubmitBtn loading={loading}><CheckCircle2 size={16} /><span>Reset Password</span></SubmitBtn>
                                </form>
                            )}
                        </>
                    )}

                </div>
            </main>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
