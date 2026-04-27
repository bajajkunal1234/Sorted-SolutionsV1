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
        const maxAge = persist ? 60 * 60 * 24 * 30 : ''; 
        document.cookie = `admin_auth=1; path=/; SameSite=Lax${maxAge ? `; max-age=${maxAge}` : ''}`;
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
                style={{ width: '100%', padding: '13px 13px 13px 74px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
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
                style={{ width: '100%', padding: '13px 44px 13px 44px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
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
                    style={{ width: 45, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
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
                style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'white' : 'rgba(255,255,255,0.3)'}`, backgroundColor: checked ? 'white' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
            >
                {checked && <CheckCircle2 size={14} color="#000" style={{ marginLeft: -1, marginTop: -1 }} />}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Keep me signed in</span>
        </label>
    );
}

function SubmitBtn({ loading, children, onClick, type = 'submit', variant = 'primary' }) {
    const isPrimary = variant === 'primary';
    return (
        <button type={type} onClick={onClick} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, background: isPrimary ? '#fff' : 'rgba(255,255,255,0.08)', color: isPrimary ? '#000' : '#fff', border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.15)', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1, marginTop: 8, transition: 'all 0.2s' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : children}
        </button>
    );
}

// ─── Main Login Component ─────────────────────────────────────────────────────
function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // The single flow state. 'phone' -> 'password' | 'signup-init' | 'claim-init' | 'otp' | 'create-password'
    const [step, setStep] = useState('phone'); 
    
    // Context about the account
    const [accountStatus, setAccountStatus] = useState(null); // { exists, hasPassword, isTechnician, isAdmin, claimInfo }
    
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
    const recaptchaInitRef = useRef(false);
    const recaptchaVerifierRef = useRef(null);

    // Auto-redirect if already logged in
    const initializedRef = useRef(false);
    useEffect(() => {
        try {
            const id = localStorage.getItem('customerId') || sessionStorage.getItem('customerId');
            if (id) { router.replace('/customer/dashboard'); return; }
        } catch { }
        if (initializedRef.current) return;
        initializedRef.current = true;
        const p = searchParams.get('phone');
        if (p) setPhone(p.replace(/\D/g, '').slice(-10));
    }, [searchParams, router]);

    const resetState = (toStep = 'phone') => {
        setStep(toStep);
        setError('');
        setSuccessMsg('');
        setOtp(['', '', '', '', '', '']);
        setPassword('');
        setConfirmPassword('');
        if (toStep === 'phone') {
            setAccountStatus(null);
            setConfirmationResult(null);
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
                size: 'invisible', 
                callback: () => setError(''),
                'expired-callback': () => { setError('reCAPTCHA expired. Please try again.'); recaptchaInitRef.current = false; }
            });
            await verifier.render();
            window.recaptchaVerifier = verifier;
            recaptchaVerifierRef.current = verifier;
            return verifier;
        } catch (e) {
            recaptchaInitRef.current = false;
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
            if (!verifier) throw new Error('Security check failed. Please refresh.');
            
            const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
            setConfirmationResult(result);
            setOtp(['', '', '', '', '', '']);
            return true;
        } catch (err) {
            if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please wait 30 minutes.');
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
        if (!confirmationResult) { setError('Session expired. Please try again.'); return false; }
        const code = otp.join('');
        if (code.length !== 6) { setError('Enter the full 6-digit code'); return false; }
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
        if (user.role === 'customer') registerPushToken(user.id, 'customer');
        else if (user.role === 'technician') registerPushToken(user.id, 'technician');
        else if (user.role === 'admin') registerPushToken('admin', 'admin');
        const route = user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/technician' : '/customer/dashboard';
        router.replace(route);
        setTimeout(() => { if (window.location.pathname.includes('/login')) window.location.href = route; }, 600);
    };

    // ── STEP 1: CHECK PHONE ──────────────────────────────────────────────────
    const handleCheckPhone = async (e) => {
        e.preventDefault(); setError(''); setSuccessMsg('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
        setLoading(true);
        try {
            const check = await fetch(`/api/customer/auth?phone=${phone}`).then(r => r.json());
            setAccountStatus(check);
            
            if (check.exists) {
                if (check.hasPassword) {
                    setStep('password');
                } else {
                    setStep('claim-init'); // Admin created, no password
                }
            } else {
                setStep('signup-init');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── STEP 2: PASSWORD LOGIN ───────────────────────────────────────────────
    const handlePasswordLogin = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/customer/auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    // ── SWITCH TO OTP LOGIN ──────────────────────────────────────────────────
    const startOtpLogin = async () => {
        const sent = await sendOtp();
        if (sent) setStep('otp');
    };

    // ── STEP 3: VERIFY OTP (for Login) ───────────────────────────────────────
    const handleOtpLoginVerify = async (e) => {
        e.preventDefault();
        const ok = await verifyOtp();
        if (!ok) return;
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/customer/auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'otp-login', phone })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            finishLogin(data.user);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── SIGNUP / CLAIM INIT ──────────────────────────────────────────────────
    const startSignupOrClaim = async () => {
        const sent = await sendOtp();
        if (sent) setStep('verify-signup');
    };

    // ── FORGOT PASSWORD INIT ─────────────────────────────────────────────────
    const startForgotPassword = async () => {
        const sent = await sendOtp();
        if (sent) setStep('verify-forgot');
    };

    // ── VERIFY SIGNUP / FORGOT ───────────────────────────────────────────────
    const handleVerifyAndProceed = async (e, nextStep) => {
        e.preventDefault();
        const ok = await verifyOtp();
        if (ok) setStep(nextStep);
    };

    // ── CREATE PASSWORD (Signup / Claim / Forgot) ────────────────────────────
    const handleCreatePassword = async (e, action) => {
        e.preventDefault(); setError('');
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const payload = { action, phone, password };
            if (action === 'signup') payload.name = name; 
            
            const res = await fetch('/api/customer/auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to complete.');
            
            if (action === 'reset-password') {
                setSuccessMsg('Password reset! Please log in with your new password.');
                resetState('password');
            } else {
                finishLogin(data.user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Aesthetic UI Components ---
    const cardStyle = {
        width: '100%', maxWidth: 400,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 24,
        padding: 36,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        boxSizing: 'border-box',
        zIndex: 10,
    };

    const inputGap = { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 };
    
    // Determine whether to show the "Login using OTP" button
    const showOtpOption = accountStatus?.exists;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
            {/* Background Watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120vw', height: '120vh', pointerEvents: 'none', backgroundImage: 'url("/New%20Logo.jpg")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            
            {/* Subtle glow behind card */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

            <div id="recaptcha-container"></div>

            <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={cardStyle}>
                    
                    {/* Brand Header */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-geist-sans), sans-serif' }}>Sorted Solutions</h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Let's get that Sorted.</p>
                    </div>

                    {error && <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{error}</div>}
                    {successMsg && <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, color: '#6ee7b7', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{successMsg}</div>}

                    {/* ── 1. INITIAL PHONE ── */}
                    {step === 'phone' && (
                        <form onSubmit={handleCheckPhone}>
                            <div style={inputGap}>
                                <PhoneInput value={phone} onChange={setPhone} />
                            </div>
                            <SubmitBtn loading={loading}>Continue</SubmitBtn>
                        </form>
                    )}

                    {/* ── 2A. LOGIN WITH PASSWORD ── */}
                    {step === 'password' && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                                <button type="button" onClick={() => resetState('phone')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0, transition: 'color 0.2s' }}><ChevronLeft size={16} /> Back</button>
                                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>+91 {phone}</div>
                            </div>
                            
                            <form onSubmit={handlePasswordLogin}>
                                <div style={inputGap}>
                                    <PasswordInput value={password} onChange={setPassword} autoFocus={true} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <KeepSignedIn checked={keepSignedIn} onChange={setKeepSignedIn} />
                                    <button type="button" onClick={startForgotPassword} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Forgot password?</button>
                                </div>
                                <SubmitBtn loading={loading}>Log In</SubmitBtn>
                            </form>

                            {showOtpOption && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>OR</span>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <SubmitBtn variant="secondary" onClick={startOtpLogin} type="button" loading={loading}>Login using OTP</SubmitBtn>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── 2B. LOGIN WITH OTP ── */}
                    {step === 'otp' && (
                        <form onSubmit={handleOtpLoginVerify}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                                <button type="button" onClick={() => setStep('password')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0 }}><ChevronLeft size={16} /> Login with password</button>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Verify it's you</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Enter the 6-digit code sent to +91 {phone}</div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <OtpBoxes otp={otp} onChange={handleOtpChange} onKeyDown={handleOtpKeyDown} />
                            </div>
                            <SubmitBtn loading={loading}>Verify & Login</SubmitBtn>
                            <button type="button" onClick={sendOtp} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Resend OTP</button>
                        </form>
                    )}

                    {/* ── 3A. CLAIM INIT (No password) ── */}
                    {step === 'claim-init' && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>✨</div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>We found your account!</h2>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>Our team has already set this up for you. Verify your number to secure it and view your details.</p>
                            </div>
                            <SubmitBtn type="button" onClick={startSignupOrClaim} loading={loading}>Send OTP to Secure Account</SubmitBtn>
                            <button type="button" onClick={() => resetState('phone')} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Use a different number</button>
                        </div>
                    )}

                    {/* ── 3B. SIGNUP INIT ── */}
                    {step === 'signup-init' && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>No account found</h2>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>Looks like you're new here! Sign up in minutes to get started.</p>
                            </div>
                            <SubmitBtn type="button" onClick={startSignupOrClaim} loading={loading}>Sign Up</SubmitBtn>
                            <button type="button" onClick={() => resetState('phone')} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Back to login</button>
                        </div>
                    )}

                    {/* ── 4. VERIFY OTP (For Signup/Claim/Forgot) ── */}
                    {(step === 'verify-signup' || step === 'verify-forgot') && (
                        <form onSubmit={(e) => handleVerifyAndProceed(e, 'create-password')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                                <button type="button" onClick={() => resetState('phone')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0 }}><ChevronLeft size={16} /> Back</button>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Verify it's you</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Enter the 6-digit code sent to +91 {phone}</div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <OtpBoxes otp={otp} onChange={handleOtpChange} onKeyDown={handleOtpKeyDown} />
                            </div>
                            <SubmitBtn loading={loading}>Continue</SubmitBtn>
                            <button type="button" onClick={sendOtp} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Resend OTP</button>
                        </form>
                    )}

                    {/* ── 5. CREATE PASSWORD (Signup/Claim/Forgot) ── */}
                    {step === 'create-password' && (
                        <form onSubmit={(e) => handleCreatePassword(e, accountStatus?.hasPassword ? 'reset-password' : 'signup')}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                                    {accountStatus?.hasPassword ? 'Reset Password' : 'Set a Password'}
                                </h2>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                                    {accountStatus?.hasPassword ? 'Create a new password for your account.' : 'Secure your account with a password.'}
                                </p>
                            </div>
                            <div style={inputGap}>
                                {/* Only show Name field if true brand-new signup */}
                                {!accountStatus?.exists && (
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            style={{ width: '100%', padding: '13px 14px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                )}
                                <PasswordInput value={password} onChange={setPassword} placeholder="New password (min. 6 chars)" autoFocus />
                                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" />
                            </div>
                            <SubmitBtn loading={loading}>
                                {accountStatus?.hasPassword ? 'Reset Password' : 'Create Account'}
                            </SubmitBtn>
                        </form>
                    )}

                </div>
            </main>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
