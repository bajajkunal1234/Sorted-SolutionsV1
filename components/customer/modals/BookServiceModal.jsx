'use client'

import React, { useState, useEffect } from 'react'
import { X, Wrench } from 'lucide-react'

const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: '8px 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92vh', overflowY: 'auto',
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
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    select: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box', appearance: 'none',
    },
    textarea: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box', resize: 'vertical', minHeight: 80,
    },
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
    segRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
}

const TIME_SLOTS = [
    { value: 'morning', label: '🌅 Morning (9–12)' },
    { value: 'afternoon', label: '☀️ Afternoon (12–4)' },
    { value: 'evening', label: '🌆 Evening (4–8)' },
]
const URGENCY = [
    { value: 'low', label: 'Low – Can wait', color: '#10b981' },
    { value: 'normal', label: 'Normal – 2–3 days', color: '#38bdf8' },
    { value: 'high', label: 'High – ASAP', color: '#f59e0b' },
    { value: 'emergency', label: 'Emergency – Today!', color: '#ef4444' },
]

function BookServiceModal({ isOpen, onClose, onBook, preSelectedAppliance }) {
    const blank = () => ({
        product_id: '', brand_id: '', issue_id: '', property_id: '',
        problem_description: '', preferred_date: '', preferred_time_slot: 'morning',
        urgency: 'normal', notes: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [products, setProducts] = useState([])
    const [brands, setBrands] = useState([])
    const [issues, setIssues] = useState([])
    const [properties, setProperties] = useState([])
    const [formData, setFormData] = useState(blank())

    useEffect(() => {
        if (isOpen) {
            setError('')
            setFormData(blank())
            fetchLookups()
        }
    }, [isOpen])

    // Pre-fill from appliance once data loaded
    useEffect(() => {
        if (preSelectedAppliance && products.length && brands.length) {
            // try to match product by category
            const matched = products.find(p =>
                p.category?.toLowerCase() === preSelectedAppliance.type?.toLowerCase() ||
                p.name?.toLowerCase().includes(preSelectedAppliance.type?.toLowerCase() || '')
            )
            const matchedBrand = brands.find(b =>
                b.name?.toLowerCase() === preSelectedAppliance.brand?.toLowerCase()
            )
            setFormData(prev => ({
                ...prev,
                product_id: matched?.id || prev.product_id,
                brand_id: matchedBrand?.id || prev.brand_id,
            }))
        }
    }, [preSelectedAppliance, products, brands])

    const fetchLookups = async () => {
        try {
            const customerId = localStorage.getItem('customerId')
            const [pRes, bRes, iRes, propRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/brands'),
                fetch('/api/issues'),
                fetch(`/api/customer/properties?customerId=${customerId}`),
            ])
            const [pD, bD, iD, propD] = await Promise.all([pRes.json(), bRes.json(), iRes.json(), propRes.json()])
            setProducts(pD.products || [])
            setBrands(bD.brands || [])
            setIssues(iD.issues || [])
            setProperties(propD.properties || [])
        } catch {
            setError('Failed to load form data')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            if (!customerId) throw new Error('Please log in first')

            const response = await fetch('/api/customer/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    product_id: formData.product_id,
                    brand_id: formData.brand_id,
                    issue_id: formData.issue_id,
                    property_id: formData.property_id,
                    problem_description: formData.problem_description,
                    preferred_date: formData.preferred_date,
                    preferred_time_slot: formData.preferred_time_slot,
                    priority: formData.urgency,
                    notes: formData.notes,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to book service')
            if (onBook) onBook(data.job)
            onClose()
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
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wrench size={18} color="#38bdf8" />
                        </div>
                        <span style={S.title}>Book Service</span>
                    </div>
                    <button onClick={onClose} style={S.closeBtn}><X size={16} /></button>
                </div>

                {preSelectedAppliance && (
                    <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#38bdf8' }}>
                        🔧 Booking for: <strong>{preSelectedAppliance.brand} {preSelectedAppliance.type}</strong>
                    </div>
                )}

                {error && <div style={S.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={S.group}>
                        <label style={S.label}>Appliance / Product *</label>
                        <select style={S.select} value={formData.product_id} onChange={update('product_id')} required>
                            <option value="">Select appliance type</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Brand *</label>
                        <select style={S.select} value={formData.brand_id} onChange={update('brand_id')} required>
                            <option value="">Select brand</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Issue Type *</label>
                        <select style={S.select} value={formData.issue_id} onChange={update('issue_id')} required>
                            <option value="">Select issue</option>
                            {issues.map(i => <option key={i.id} value={i.id}>{i.title || i.name}</option>)}
                        </select>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Service Location *</label>
                        <select style={S.select} value={formData.property_id} onChange={update('property_id')} required>
                            <option value="">Select address</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name || p.address}</option>)}
                        </select>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Describe the Problem *</label>
                        <textarea style={S.textarea} value={formData.problem_description} onChange={update('problem_description')}
                            placeholder="What's wrong? When did it start?" required />
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Preferred Date *</label>
                        <input type="date" style={S.input} value={formData.preferred_date} onChange={update('preferred_date')}
                            min={new Date().toISOString().split('T')[0]} required />
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Preferred Time</label>
                        <div style={S.segRow}>
                            {TIME_SLOTS.map(slot => (
                                <button key={slot.value} type="button"
                                    onClick={() => setFormData(p => ({ ...p, preferred_time_slot: slot.value }))}
                                    style={{
                                        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                        background: formData.preferred_time_slot === slot.value ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                        borderColor: formData.preferred_time_slot === slot.value ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                                        color: formData.preferred_time_slot === slot.value ? '#38bdf8' : '#94a3b8',
                                    }}>{slot.label}</button>
                            ))}
                        </div>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Urgency</label>
                        <div style={S.segRow}>
                            {URGENCY.map(u => (
                                <button key={u.value} type="button"
                                    onClick={() => setFormData(p => ({ ...p, urgency: u.value }))}
                                    style={{
                                        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                        background: formData.urgency === u.value ? `${u.color}20` : 'rgba(255,255,255,0.04)',
                                        borderColor: formData.urgency === u.value ? u.color : 'rgba(255,255,255,0.08)',
                                        color: formData.urgency === u.value ? u.color : '#94a3b8',
                                    }}>{u.label}</button>
                            ))}
                        </div>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Additional Notes</label>
                        <textarea style={{ ...S.textarea, minHeight: 60 }} value={formData.notes} onChange={update('notes')}
                            placeholder="Anything else we should know?" />
                    </div>

                    <div style={S.footer}>
                        <button type="button" onClick={onClose} style={S.cancelBtn} disabled={loading}>Cancel</button>
                        <button type="submit" style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Booking...' : '🔧 Book Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default BookServiceModal
