'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LogIn, Mail, Lock, Zap } from 'lucide-react'
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client'

// ── Demo accounts for quick dev access ─────────────────────────────────────
const DEMO_ACCOUNTS = [
    { role: 'customer', label: 'Customer', emoji: '👤', color: '#3b82f6', route: '/customer/dashboard', id: 'demo-customer-001', name: 'Demo Customer', phone: '9999999999' },
    { role: 'technician', label: 'Technician', emoji: '🔧', color: '#10b981', route: '/technician', id: 'demo-tech-001', name: 'Demo Technician', phone: '8888888888' },
    { role: 'admin', label: 'Admin', emoji: '⚙️', color: '#f59e0b', route: '/admin', id: 'demo-admin-001', name: 'Demo Admin', phone: '7777777777' },
]

// Helper: ask for push permission and save token for a logged-in user
async function registerPushToken(userId, userType) {
    try {
        const token = await requestNotificationPermission();
        if (token) await saveFCMTokenToServer(token, userType, userId);
    } catch (e) {
        console.warn('[FCM] Could not register push token:', e.message);
    }
}

function demoLogin(account) {
    const session = { id: account.id, name: account.name, phone: account.phone, role: account.role, token: 'demo-token' }
    localStorage.setItem('user_session', JSON.stringify(session))
    localStorage.setItem('customerData', JSON.stringify(session))
    localStorage.setItem('customerId', account.id)
    if (account.role === 'admin') localStorage.setItem('isAdmin', 'true')
    else localStorage.removeItem('isAdmin')
    // Register push token for customer or technician demo logins
    if (account.role === 'customer') registerPushToken(account.id, 'customer');
    if (account.role === 'technician') registerPushToken(account.id, 'technician');
    window.location.href = account.route
}

function Login() {
    const [isSignup, setIsSignup] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (isSignup) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name, phone } },
                })
                if (error) throw error
                if (data.user) {
                    const { error: customerError } = await supabase
                        .from('customers')
                        .insert([{ user_id: data.user.id, customer_type: 'one_time' }])
                    if (customerError) console.error('Error creating customer:', customerError)
                }
                alert('Account created! Please check your email to verify.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                // Get Supabase user to find their customer record
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('user_id', user.id)
                        .single()
                    if (customer) registerPushToken(customer.id, 'customer');
                }
            }
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            padding: 'var(--spacing-lg)',
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--spacing-md)',
                    }}>
                        <LogIn size={32} color="white" />
                    </div>
                    <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>
                        {isSignup ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        {isSignup ? 'Sign up for House Doctor' : 'Sign in to your account'}
                    </p>
                </div>

                {/* ── DEMO ACCESS BANNER ── */}
                <div style={{
                    marginBottom: 'var(--spacing-lg)',
                    padding: '14px',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))',
                    border: '1.5px solid rgba(251,191,36,0.35)',
                    borderRadius: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Zap size={13} color="#fbbf24" fill="#fbbf24" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            Demo Access — Skip Login
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {DEMO_ACCOUNTS.map(acc => (
                            <button
                                key={acc.role}
                                onClick={() => demoLogin(acc)}
                                style={{
                                    flex: 1,
                                    padding: '9px 4px',
                                    background: `${acc.color}18`,
                                    border: `1.5px solid ${acc.color}55`,
                                    borderRadius: 10,
                                    color: acc.color,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${acc.color}30`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${acc.color}18`; e.currentTarget.style.transform = '' }}
                            >
                                <span style={{ fontSize: 18 }}>{acc.emoji}</span>
                                {acc.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Regular Auth Form */}
                <form onSubmit={handleSubmit}>
                    {isSignup && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Enter your phone number" />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            <Mail size={16} style={{ display: 'inline', marginRight: '4px' }} /> Email
                        </label>
                        <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Lock size={16} style={{ display: 'inline', marginRight: '4px' }} /> Password
                        </label>
                        <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" minLength={6} />
                    </div>

                    {error && (
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            marginBottom: 'var(--spacing-md)',
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <button
                        onClick={() => { setIsSignup(!isSignup); setError('') }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
                    >
                        {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>

            </div>
        </div>
    )
}

export default Login
