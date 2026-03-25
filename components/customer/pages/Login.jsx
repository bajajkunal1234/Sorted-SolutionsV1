'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Phone, Lock, User, ArrowRight, ChevronLeft, Zap, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client'

// ── Demo accounts for quick dev access ─────────────────────────────────────
const DEMO_ACCOUNTS = [
    { role: 'customer', label: 'Customer', emoji: '👤', color: '#3b82f6', route: '/customer/dashboard', id: 'demo-customer-001', name: 'Demo Customer', phone: '9999999999', username: 'demo_customer' },
    { role: 'technician', label: 'Technician', emoji: '🔧', color: '#10b981', route: '/technician', id: 'demo-tech-001', name: 'Demo Technician', phone: '8888888888' },
    { role: 'admin', label: 'Admin', emoji: '⚙️', color: '#f59e0b', route: '/admin', id: 'demo-admin-001', name: 'Demo Admin', phone: '7777777777' },
]

async function registerPushToken(userId, userType) {
    try {
        const token = await requestNotificationPermission()
        if (token) await saveFCMTokenToServer(token, userType, userId)
    } catch (e) {
        console.warn('[FCM] push token:', e.message)
    }
}

function saveSession(customer) {
    const session = {
        id: customer.id,
        name: customer.name,
        username: customer.username,
        phone: customer.phone,
        role: 'customer',
        token: 'session-' + Date.now(),
        ledger_id: customer.ledger_id || null,
        profile_complete: customer.profile_complete ?? null,
    }
    localStorage.setItem('user_session', JSON.stringify(session))
    localStorage.setItem('customerData', JSON.stringify(session))
    localStorage.setItem('customerId', customer.id)
    localStorage.removeItem('isAdmin')
}

function demoLogin(account) {
    const session = { id: account.id, name: account.name, phone: account.phone, username: account.username || '', role: account.role, token: 'demo-token' }
    localStorage.setItem('user_session', JSON.stringify(session))

    // Set appropriate domain sessions
    if (account.role === 'customer') {
        localStorage.setItem('customerData', JSON.stringify(session))
        localStorage.setItem('customerId', account.id)
    } else if (account.role === 'technician') {
        localStorage.setItem('technicianSession', JSON.stringify(session))
    }

    if (account.role === 'admin') localStorage.setItem('isAdmin', 'true')
    else localStorage.removeItem('isAdmin')

    if (account.role === 'customer') registerPushToken(account.id, 'customer')
    if (account.role === 'technician') registerPushToken(account.id, 'technician')
    if (account.role === 'admin') registerPushToken(account.name || 'Admin', 'admin')

    window.location.href = account.route
}

// ── OTP Input helper ─────────────────────────────────────────────────────────
function OTPInput({ value, onChange }) {
    const inputs = useRef([])
    const digits = (value + '      ').slice(0, 6).split('')

    const handleKey = (i, e) => {
        if (e.key === 'Backspace') {
            const next = [...digits]; next[i] = ''
            onChange(next.join('').trim())
            if (i > 0) inputs.current[i - 1]?.focus()
        }
    }
    const handleChange = (i, e) => {
        const ch = e.target.value.replace(/\D/g, '').slice(-1)
        const next = [...digits]; next[i] = ch
        onChange(next.join('').trim())
        if (ch && i < 5) inputs.current[i + 1]?.focus()
    }
    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        onChange(pasted)
        inputs.current[Math.min(pasted.length, 5)]?.focus()
        e.preventDefault()
    }

    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]?.trim() || ''}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={handlePaste}
                    style={{
                        width: 44, height: 52, textAlign: 'center',
                        fontSize: 22, fontWeight: 700,
                        border: digits[i]?.trim() ? '2px solid var(--color-primary)' : '2px solid var(--border-primary)',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'all 0.15s',
                    }}
                />
            ))}
        </div>
    )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Login() {
    // 'login' | 'signup-phone' | 'signup-otp' | 'signup-creds'
    const [mode, setMode] = useState('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Login fields
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)

    // Signup fields
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [confirmationResult, setConfirmationResult] = useState(null)
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [resendCountdown, setResendCountdown] = useState(0)
    const recaptchaRef = useRef(null)
    const recaptchaWidgetRef = useRef(null)

    // Resend countdown timer
    useEffect(() => {
        if (resendCountdown <= 0) return
        const t = setTimeout(() => setResendCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [resendCountdown])

    const reset = () => {
        setMode('login'); setError(''); setPhone(''); setOtp('')
        setName(''); setUsername(''); setNewPassword(''); setConfirmPassword('')
        setIdentifier(''); setPassword(''); setConfirmationResult(null)
    }

    // ── Step 1: Send OTP ────────────────────────────────────────────────────
    const handleSendOTP = async () => {
        setError('')
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length < 10) return setError('Enter a valid 10-digit mobile number.')
        setLoading(true)
        try {
            // Dynamically import Firebase to avoid SSR issues
            const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth')
            const { app } = await import('@/lib/firebase')
            const auth = getAuth(app)

            // Set up invisible reCAPTCHA (only once)
            if (!recaptchaWidgetRef.current) {
                recaptchaWidgetRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: () => { },
                })
            }

            const formattedPhone = '+91' + cleaned // default India; can be made dynamic
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaWidgetRef.current)
            setConfirmationResult(result)
            setMode('signup-otp')
            setResendCountdown(30)
        } catch (e) {
            setError(e.message?.includes('TOO_SHORT') ? 'Invalid phone number.' : e.message || 'Failed to send OTP.')
            // Reset reCAPTCHA on error
            recaptchaWidgetRef.current = null
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2: Verify OTP ──────────────────────────────────────────────────
    const handleVerifyOTP = async () => {
        setError('')
        if (otp.length < 6) return setError('Enter the complete 6-digit OTP.')
        if (!confirmationResult) return setError('Session expired. Please go back and resend OTP.')
        setLoading(true)
        try {
            await confirmationResult.confirm(otp)
            setMode('signup-creds')
        } catch (e) {
            setError('Incorrect OTP. Please check and try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Step 3: Create Account ──────────────────────────────────────────────
    const handleSignup = async () => {
        setError('')
        if (!name.trim()) return setError('Enter your full name.')
        if (username.trim().length < 3) return setError('Username must be at least 3 characters.')
        if (!/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(newPassword)) return setError('Password must be at least 6 characters, contain 1 uppercase letter and 1 number.')
        if (newPassword !== confirmPassword) return setError('Passwords do not match.')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/customer/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone.replace(/\D/g, ''), name: name.trim(), username: username.trim().toLowerCase(), password: newPassword }),
            })
            const data = await res.json()
            if (!data.success) return setError(data.error)
            saveSession(data.customer)
            registerPushToken(data.customer.id, 'customer')
            window.location.href = '/customer/dashboard'
        } catch (e) {
            setError('Signup failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Login ───────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        if (!identifier.trim() || !password) return setError('Enter your phone/username and password.')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/customer/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: identifier.trim(), password }),
            })
            const data = await res.json()
            if (!data.success) return setError(data.error)
            saveSession(data.customer)
            registerPushToken(data.customer.id, 'customer')
            window.location.href = '/customer/dashboard'
        } catch (e) {
            setError('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Shared styles ────────────────────────────────────────────────────────
    const inputStyle = {
        width: '100%', padding: '11px 14px',
        border: '1.5px solid var(--border-primary)',
        borderRadius: 10, fontSize: 15,
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)', outline: 'none',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
    }
    const btnPrimary = {
        width: '100%', padding: '12px',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        color: '#fff', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            padding: 16,
        }}>
            {/* Invisible reCAPTCHA anchor */}
            <div id="recaptcha-container" ref={recaptchaRef} />

            <div className="card" style={{ maxWidth: 400, width: '100%', padding: 28 }}>

                {/* ── Demo Banner ── */}
                <div style={{ marginBottom: 20, padding: '12px 14px', background: 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))', border: '1.5px solid rgba(251,191,36,0.35)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Zap size={12} color="#fbbf24" fill="#fbbf24" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Demo Access — Skip Login</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {DEMO_ACCOUNTS.map(acc => (
                            <button key={acc.role} onClick={() => demoLogin(acc)} style={{ flex: 1, padding: '8px 4px', background: `${acc.color}18`, border: `1.5px solid ${acc.color}55`, borderRadius: 8, color: acc.color, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <span style={{ fontSize: 16 }}>{acc.emoji}</span>{acc.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── LOGIN ── */}
                {mode === 'login' && (
                    <>
                        <h2 style={{ margin: '0 0 4px', fontWeight: 700 }}>Welcome back 👋</h2>
                        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>Sign in to your account</p>

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mobile number or username</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input style={{ ...inputStyle, paddingLeft: 36 }} type="text" placeholder="9876543210 or @username" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" required />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40 }} type={showPwd ? 'text' : 'password'} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                                    <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {error && <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 13 }}>{error}</div>}

                            <button type="submit" style={btnPrimary} disabled={loading}>
                                {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16} /></>}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>New here? </span>
                            <button onClick={() => { setMode('signup-phone'); setError('') }} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Create account →
                            </button>
                        </div>
                    </>
                )}

                {/* ── SIGNUP STEP 1: Phone ── */}
                {mode === 'signup-phone' && (
                    <>
                        <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
                            <ChevronLeft size={16} /> Back to login
                        </button>
                        <h2 style={{ margin: '0 0 4px', fontWeight: 700 }}>Create account</h2>
                        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>We'll verify your mobile number first</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mobile Number</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>+91</span>
                                    <input style={{ ...inputStyle, paddingLeft: 44 }} type="tel" inputMode="numeric" placeholder="9876543210" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                                </div>
                            </div>

                            {error && <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 13 }}>{error}</div>}

                            <button style={btnPrimary} onClick={handleSendOTP} disabled={loading}>
                                {loading ? 'Sending OTP…' : <><span>Send OTP</span><ArrowRight size={16} /></>}
                            </button>
                        </div>
                    </>
                )}

                {/* ── SIGNUP STEP 2: OTP ── */}
                {mode === 'signup-otp' && (
                    <>
                        <button onClick={() => { setMode('signup-phone'); setError(''); setOtp('') }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
                            <ChevronLeft size={16} /> Change number
                        </button>
                        <h2 style={{ margin: '0 0 4px', fontWeight: 700 }}>Enter OTP</h2>
                        <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: 13 }}>Sent to +91 {phone}</p>

                        <OTPInput value={otp} onChange={setOtp} />

                        {error && <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}

                        <button style={{ ...btnPrimary, marginBottom: 12 }} onClick={handleVerifyOTP} disabled={loading || otp.length < 6}>
                            {loading ? 'Verifying…' : <><span>Verify OTP</span><ArrowRight size={16} /></>}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                            {resendCountdown > 0
                                ? `Resend OTP in ${resendCountdown}s`
                                : <button onClick={() => { setOtp(''); setMode('signup-phone'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Resend OTP</button>
                            }
                        </div>
                    </>
                )}

                {/* ── SIGNUP STEP 3: Credentials ── */}
                {mode === 'signup-creds' && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <CheckCircle size={20} color="#10b981" />
                            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>+91 {phone} verified!</span>
                        </div>
                        <h2 style={{ margin: '0 0 4px', fontWeight: 700 }}>Set up your account</h2>
                        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>Almost done — just a few details</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input style={{ ...inputStyle, paddingLeft: 36 }} type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Username</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-tertiary)' }}>@</span>
                                    <input style={{ ...inputStyle, paddingLeft: 28 }} type="text" placeholder="yourname" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Letters, numbers, underscores only. Used to log in.</p>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40 }} type={showNewPwd ? 'text' : 'password'} placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                    <button type="button" onClick={() => setShowNewPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                        {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input style={{ ...inputStyle, paddingLeft: 36, borderColor: confirmPassword && newPassword !== confirmPassword ? 'var(--color-danger)' : undefined }} type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>

                            {error && <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 13 }}>{error}</div>}

                            <button style={btnPrimary} onClick={handleSignup} disabled={loading}>
                                {loading ? 'Creating account…' : <><span>Create Account</span><CheckCircle size={16} /></>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
