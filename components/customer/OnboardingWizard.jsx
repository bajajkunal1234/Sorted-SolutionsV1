'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, MapPin, User, ArrowRight, Home, AlertCircle, Loader2 } from 'lucide-react'
// Inline interaction logger (client-side)

// ─── Shared Styles ──────────────────────────────────────────────────────────
const S = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', fontFamily: "'Inter', system-ui, sans-serif", color: '#f8fafc',
        overflowY: 'auto',
    },
    card: {
        width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28, padding: '32px 28px',
        backdropFilter: 'blur(12px)',
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 15, outline: 'none',
        boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s',
    },
    select: {
        width: '100%', background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 15, outline: 'none',
        boxSizing: 'border-box', appearance: 'none', fontFamily: 'inherit',
    },
    btnPrimary: {
        width: '100%', padding: '14px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
        border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', transition: 'opacity 0.15s', marginTop: 8,
    },
    btnSecondary: {
        width: '100%', padding: '13px', background: 'transparent',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: '#94a3b8', fontSize: 14,
        fontWeight: 600, cursor: 'pointer', marginTop: 8,
    },
    error: {
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 12, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    success: {
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 12, padding: '10px 14px', color: '#34d399', fontSize: 13, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    group: { marginBottom: 14 },
}

// ─── Progress Dots ───────────────────────────────────────────────────────────
function ProgressDots({ step, total }) {
    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                    width: i < step ? 24 : 8, height: 8, borderRadius: 4,
                    background: i < step ? 'linear-gradient(90deg, #38bdf8, #3b82f6)' : 'rgba(255,255,255,0.15)',
                    transition: 'all 0.4s ease',
                }} />
            ))}
        </div>
    )
}

// ─── Step 1: Welcome & Name ──────────────────────────────────────────────────
function StepWelcome({ name, onNext }) {
    const [editedName, setEditedName] = useState(name || '')

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '24px', margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.2))',
                    border: '1px solid rgba(56,189,248,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                }}>
                    👋
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
                    Welcome to Sorted!
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
                    Let's set up your profile. It takes just a minute.
                </p>
            </div>

            <div style={S.group}>
                <label style={S.label}>Your Full Name</label>
                <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                        style={{ ...S.input, paddingLeft: 40 }}
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        placeholder="Enter your full name"
                        autoFocus
                    />
                </div>
            </div>

            <button
                style={{ ...S.btnPrimary, opacity: editedName.trim().length < 2 ? 0.5 : 1 }}
                disabled={editedName.trim().length < 2}
                onClick={() => onNext(editedName.trim())}
            >
                Continue <ArrowRight size={18} />
            </button>
        </div>
    )
}

// ─── Step 2: Add Property / Address ─────────────────────────────────────────
function StepAddress({ onNext, onSkip }) {
    const [form, setForm] = useState({
        name: 'My Home', type: 'apartment', address: '', locality: '', city: '', pincode: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [pincodeStatus, setPincodeStatus] = useState(null) // null | 'valid' | 'invalid'
    const [matchedLocality, setMatchedLocality] = useState(null)
    const [advancedPincodes, setAdvancedPincodes] = useState([])

    useEffect(() => {
        fetch('/api/settings/quick-booking')
            .then(r => r.json())
            .then(d => {
                const adv = d.data?.advanced_pincodes || d.data?.settings?.advanced_pincodes || []
                if (adv.length > 0) setAdvancedPincodes(adv)
                else {
                    const raw = d.data?.serviceable_pincodes || d.data?.settings?.serviceable_pincodes || ''
                    const legacy = typeof raw === 'string'
                        ? raw.split(',').map(p => p.trim()).filter(Boolean)
                        : Array.isArray(raw) ? raw.map(String) : []
                    setAdvancedPincodes(legacy.map(p => ({ pincode: p, locality: 'Area' })))
                }
            }).catch(() => { })
    }, [])

    const validatePincode = (pin) => {
        if (!pin || pin.length < 6) { setPincodeStatus(null); setMatchedLocality(null); return }
        if (advancedPincodes.length === 0) { setPincodeStatus(null); return }
        const match = advancedPincodes.find(p => p.pincode === pin)
        if (match) { setPincodeStatus('valid'); setMatchedLocality(match.locality) }
        else { setPincodeStatus('invalid'); setMatchedLocality(null) }
    }

    const up = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async () => {
        setError('')
        if (!form.address.trim()) { setError('Please enter your street address.'); return }
        if (!form.city.trim()) { setError('Please enter your city.'); return }
        if (!form.pincode.trim()) { setError('Please enter your pincode.'); return }
        if (pincodeStatus === 'invalid') { setError('We do not service this pincode yet.'); return }

        setLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const res = await fetch('/api/customer/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    name: form.name,
                    address: form.address,
                    locality: form.locality,
                    city: form.city,
                    pincode: form.pincode,
                    property_type: form.type,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save address')
            onNext()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const pincodeColor = pincodeStatus === 'valid' ? 'rgba(16,185,129,0.5)'
        : pincodeStatus === 'invalid' ? 'rgba(239,68,68,0.5)'
            : 'rgba(255,255,255,0.12)'

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '24px', margin: '0 auto 16px',
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <MapPin size={32} color="#f59e0b" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0' }}>Your Service Address</h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
                    Where should we send our technicians?
                </p>
            </div>

            {error && (
                <div style={S.error}>
                    <AlertCircle size={15} /> {error}
                </div>
            )}

            <div style={S.group}>
                <label style={S.label}>Property Name</label>
                <input style={S.input} value={form.name} onChange={up('name')} placeholder="My Home, Office, etc." />
            </div>

            <div style={S.group}>
                <label style={S.label}>Property Type</label>
                <select style={S.select} value={form.type} onChange={up('type')}>
                    <option value="apartment">Apartment</option>
                    <option value="house">Independent House</option>
                    <option value="villa">Villa</option>
                    <option value="office">Office</option>
                    <option value="shop">Shop</option>
                </select>
            </div>

            <div style={S.group}>
                <label style={S.label}>Street Address *</label>
                <input style={S.input} value={form.address} onChange={up('address')} placeholder="Flat/House No., Building, Street" />
            </div>

            <div style={{ ...S.group, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                    <label style={S.label}>Locality / Area</label>
                    <input style={S.input} value={form.locality} onChange={up('locality')} placeholder="Colony, Sect..." />
                </div>
                <div>
                    <label style={S.label}>Pincode *</label>
                    <input
                        style={{ ...S.input, borderColor: pincodeColor }}
                        value={form.pincode}
                        onChange={e => { up('pincode')(e); validatePincode(e.target.value) }}
                        placeholder="400001"
                        maxLength={6}
                        inputMode="numeric"
                    />
                    {pincodeStatus === 'valid' && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>✓ {matchedLocality || 'Serviceable'}</div>}
                    {pincodeStatus === 'invalid' && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>✗ Out of area</div>}
                </div>
            </div>

            <div style={S.group}>
                <label style={S.label}>City *</label>
                <input style={S.input} value={form.city} onChange={up('city')} placeholder="Mumbai, Pune..." />
            </div>

            <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Saving...' : 'Save Address'}
                {!loading && <ArrowRight size={18} />}
            </button>
            <button style={S.btnSecondary} onClick={onSkip}>Skip for now →</button>
        </div>
    )
}

// ─── Step 3: Done ────────────────────────────────────────────────────────────
function StepDone({ name, onFinish }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: 88, height: 88, borderRadius: '32px', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))',
                border: '2px solid rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px 0' }}>
                You're all set, {name?.split(' ')[0] || 'there'}! 🎉
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px 0' }}>
                Your profile is ready. You can now book services, track jobs, and manage your appliances.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
                {[
                    { emoji: '🔧', label: 'Book Service' },
                    { emoji: '📦', label: 'Add Devices' },
                    { emoji: '📍', label: 'Track Jobs' },
                ].map(f => (
                    <div key={f.label} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16, padding: '16px 8px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{f.emoji}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{f.label}</div>
                    </div>
                ))}
            </div>

            <button style={S.btnPrimary} onClick={onFinish}>
                <Home size={18} /> Go to Dashboard
            </button>

            <style>{`
                @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

// ─── Main Wizard Component ───────────────────────────────────────────────────
export default function OnboardingWizard({ initialName, customerId, onComplete }) {
    const [step, setStep] = useState(1) // 1 | 2 | 3
    const [name, setName] = useState(initialName || '')

    const handleNameNext = async (confirmedName) => {
        setName(confirmedName)
        // Update name in DB if different from initial
        if (confirmedName !== initialName) {
            try {
                await fetch('/api/customer/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId, name: confirmedName }),
                })
                // Update localStorage
                const session = JSON.parse(localStorage.getItem('customerData') || '{}')
                session.name = confirmedName
                localStorage.setItem('customerData', JSON.stringify(session))
                localStorage.setItem('customerName', confirmedName)
            } catch { }
        }
        setStep(2)
    }

    const handleAddressNext = () => setStep(3)
    const handleSkipAddress = () => setStep(3)

    const handleFinish = async () => {
        // Mark profile as complete
        try {
            await fetch('/api/customer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, profile_complete: true }),
            })
        } catch { }

        // Update local storage
        try {
            const session = JSON.parse(localStorage.getItem('customerData') || '{}')
            session.profile_complete = true
            localStorage.setItem('customerData', JSON.stringify(session))
        } catch { }

        // Log interaction
        try {
            const customerId2 = localStorage.getItem('customerId')
            await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'profile-completed',
                    category: 'account',
                    customer_id: customerId2,
                    description: `Customer ${name} completed their profile setup`,
                    performed_by_name: name,
                    source: 'Customer App',
                    timestamp: new Date().toISOString(),
                }),
            })
        } catch { }

        onComplete()
    }

    return (
        <div style={S.overlay}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                {/* Sorted Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase' }}>
                        SORTED SOLUTIONS
                    </div>
                </div>

                {/* Progress */}
                <ProgressDots step={step} total={3} />

                {/* Card */}
                <div style={S.card}>
                    {step === 1 && <StepWelcome name={name} onNext={handleNameNext} />}
                    {step === 2 && <StepAddress onNext={handleAddressNext} onSkip={handleSkipAddress} />}
                    {step === 3 && <StepDone name={name} onFinish={handleFinish} />}
                </div>

                {/* Step indicator */}
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#334155' }}>
                    Step {step} of 3
                </div>
            </div>
        </div>
    )
}
