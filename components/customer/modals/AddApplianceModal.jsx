'use client'

import React, { useState, useEffect } from 'react'
import { X, Package } from 'lucide-react'

const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: '8px 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto',
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
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
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
        flex: 2, padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none',
        borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    },
}

const CATEGORIES = [
    { value: 'ac', label: 'Air Conditioner' },
    { value: 'refrigerator', label: 'Refrigerator' },
    { value: 'washing_machine', label: 'Washing Machine' },
    { value: 'microwave_oven', label: 'Microwave Oven' },
    { value: 'gas_stove_hob', label: 'Gas Stove / Hob' },
    { value: 'water_purifier', label: 'Water Purifier' },
]

function AddApplianceModal({ isOpen, onClose, onAdd, properties }) {
    const blank = () => ({
        category: 'ac', brand: '', model: '', propertyId: properties?.[0]?.id || '',
        room: '', purchaseDate: '', purchasePrice: '', warrantyYears: 1, serialNumber: '', notes: '',
    })
    const [formData, setFormData] = useState(blank)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Reset form when opened
    useEffect(() => { if (isOpen) { setFormData(blank()); setError('') } }, [isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            let warrantyExpiry = null
            if (formData.purchaseDate && formData.warrantyYears) {
                const d = new Date(formData.purchaseDate)
                d.setFullYear(d.getFullYear() + parseInt(formData.warrantyYears))
                warrantyExpiry = d.toISOString()
            }
            await onAdd({
                category: formData.category,
                type: formData.category,
                brand: formData.brand,
                model: formData.model,
                propertyId: formData.propertyId,
                room: formData.room,
                purchaseDate: formData.purchaseDate,
                serialNumber: formData.serialNumber,
                warrantyExpiry,
                notes: formData.notes,
            })
            // onAdd handles close on success
        } catch (err) {
            setError(err.message || 'Failed to add appliance')
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
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={18} color="#8b5cf6" />
                        </div>
                        <span style={S.title}>Add Appliance</span>
                    </div>
                    <button onClick={onClose} style={S.closeBtn}><X size={16} /></button>
                </div>

                {error && <div style={S.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={S.group}>
                        <label style={S.label}>Appliance Type *</label>
                        <select style={S.select} value={formData.category} onChange={update('category')}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    <div style={S.grid2}>
                        <div>
                            <label style={S.label}>Brand *</label>
                            <input style={S.input} value={formData.brand} onChange={update('brand')}
                                placeholder="Daikin, LG..." required />
                        </div>
                        <div>
                            <label style={S.label}>Model</label>
                            <input style={S.input} value={formData.model} onChange={update('model')}
                                placeholder="Model no." />
                        </div>
                    </div>

                    {properties?.length > 0 && (
                        <div style={S.grid2}>
                            <div>
                                <label style={S.label}>Property *</label>
                                <select style={S.select} value={formData.propertyId} onChange={update('propertyId')} required>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name || p.address}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={S.label}>Room</label>
                                <input style={S.input} value={formData.room} onChange={update('room')}
                                    placeholder="Living Room..." />
                            </div>
                        </div>
                    )}

                    <div style={S.grid2}>
                        <div>
                            <label style={S.label}>Purchase Date</label>
                            <input type="date" style={S.input} value={formData.purchaseDate} onChange={update('purchaseDate')} />
                        </div>
                        <div>
                            <label style={S.label}>Warranty (Years)</label>
                            <input type="number" style={S.input} value={formData.warrantyYears} onChange={update('warrantyYears')}
                                min="0" max="10" />
                        </div>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Serial Number (Optional)</label>
                        <input style={S.input} value={formData.serialNumber} onChange={update('serialNumber')}
                            placeholder="SN-XXXXXXXXX" />
                    </div>

                    <div style={S.footer}>
                        <button type="button" onClick={onClose} style={S.cancelBtn} disabled={loading}>Cancel</button>
                        <button type="submit" style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Saving...' : '+ Add Appliance'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddApplianceModal
