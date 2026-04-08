'use client'

import React, { useState, useEffect } from 'react'
import { X, MapPin, CheckCircle, AlertCircle } from 'lucide-react'

const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: 'max(8px, env(safe-area-inset-top)) 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85dvh', overflowY: 'auto',
    },
    handle: { width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: 800, color: '#f8fafc' },
    closeBtn: {
        background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
        borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    },
    group: { marginBottom: 16 },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box', appearance: 'none',
    },
    row: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 },
    error: {
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 12, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16,
    },
    footer: { display: 'flex', gap: 12, marginTop: 24 },
    cancelBtn: {
        flex: 1, padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    },
    submitBtn: {
        flex: 2, padding: '14px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)', border: 'none',
        borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    },
}

function AddPropertyModal({ isOpen, onClose, onAdd }) {
    const [formData, setFormData] = useState({
        name: '', type: 'apartment', address: '', locality: '', city: '', pincode: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [advancedPincodes, setAdvancedPincodes] = useState([]) // [] means not loaded
    const [pincodeStatus, setPincodeStatus] = useState(null) // null | 'valid' | 'invalid'
    const [matchedLocality, setMatchedLocality] = useState(null)

    useEffect(() => {
        if (!isOpen) return
        fetch('/api/settings/quick-booking')
            .then(r => r.json())
            .then(d => {
                const adv = d.data?.advanced_pincodes || d.data?.settings?.advanced_pincodes || []
                if (adv.length > 0) {
                    setAdvancedPincodes(adv)
                } else {
                    // Fallback to legacy
                    const raw = d.data?.serviceable_pincodes || d.data?.settings?.serviceable_pincodes || ''
                    const legacy = typeof raw === 'string'
                        ? raw.split(',').map(p => p.trim()).filter(Boolean)
                        : Array.isArray(raw) ? raw.map(String) : []
                    setAdvancedPincodes(legacy.map(p => ({ pincode: p, locality: 'Area' })))
                }
            })
            .catch(() => { })
    }, [isOpen])

    const validatePincode = (pin) => {
        if (!pin || pin.length < 6) { setPincodeStatus(null); setMatchedLocality(null); return }
        if (advancedPincodes.length === 0) { setPincodeStatus(null); setMatchedLocality(null); return } // no restriction if not set

        const match = advancedPincodes.find(p => p.pincode === pin)
        if (match) {
            setPincodeStatus('valid')
            setMatchedLocality(match.locality)
        } else {
            setPincodeStatus('invalid')
            setMatchedLocality(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (pincodeStatus === 'invalid') {
            setError('We do not currently service this pincode. Please enter a pincode in our service area.')
            return
        }
        try {
            const customerId = localStorage.getItem('customerId')
            if (!customerId) throw new Error('Please log in first')

            const response = await fetch('/api/customer/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    name: formData.name,
                    address: formData.address,
                    locality: formData.locality,
                    city: formData.city,
                    pincode: formData.pincode,
                    property_type: formData.type,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to add property')

            onAdd(data.property)
            setFormData({ name: '', type: 'apartment', address: '', locality: '', city: '', pincode: '' })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const update = (field) => (e) => setFormData(p => ({ ...p, [field]: e.target.value }))

    if (!isOpen) return null

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
                <div style={S.handle} />
                <div style={S.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={18} color="#f59e0b" />
                        </div>
                        <span style={S.title}>Add Property</span>
                    </div>
                    <button onClick={onClose} style={S.closeBtn}><X size={16} /></button>
                </div>

                {error && <div style={S.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={S.group}>
                        <label style={S.label}>Property Name *</label>
                        <input style={S.input} value={formData.name} onChange={update('name')}
                            placeholder="e.g., My Home, Office" required />
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Property Type</label>
                        <select style={S.select} value={formData.type} onChange={update('type')}>
                            <option value="apartment">Apartment</option>
                            <option value="house">Independent House</option>
                            <option value="villa">Villa</option>
                            <option value="office">Office</option>
                            <option value="shop">Shop</option>
                        </select>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Street Address *</label>
                        <input style={S.input} value={formData.address} onChange={update('address')}
                            placeholder="Flat/House No., Building, Street" required />
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Locality / Area</label>
                        <input style={S.input} value={formData.locality} onChange={update('locality')}
                            placeholder="Colony, Locality" />
                    </div>

                    <div style={{ ...S.row, ...S.group }}>
                        <div>
                            <label style={S.label}>City *</label>
                            <input style={S.input} value={formData.city} onChange={update('city')}
                                placeholder="Mumbai" required />
                        </div>
                        <div>
                            <label style={S.label}>Pincode *</label>
                            <input style={{
                                ...S.input,
                                borderColor: pincodeStatus === 'valid' ? 'rgba(16,185,129,0.5)'
                                    : pincodeStatus === 'invalid' ? 'rgba(239,68,68,0.5)'
                                        : 'rgba(255,255,255,0.1)'
                            }}
                                value={formData.pincode}
                                onChange={e => {
                                    update('pincode')(e)
                                    validatePincode(e.target.value)
                                }}
                                placeholder="400001" required maxLength={6} inputMode="numeric" />
                            {pincodeStatus === 'valid' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, color: '#10b981' }}>
                                    <CheckCircle size={11} /> Serviceable area {matchedLocality ? `(${matchedLocality})` : ''}
                                </div>
                            )}
                            {pincodeStatus === 'invalid' && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                                    <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                                    Not in our current service area
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={S.footer}>
                        <button type="button" onClick={onClose} style={S.cancelBtn} disabled={loading}>Cancel</button>
                        <button type="submit" style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Saving...' : '+ Add Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddPropertyModal
