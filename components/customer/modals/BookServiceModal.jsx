'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Wrench, Camera, Upload, Image as ImageIcon } from 'lucide-react'

const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: '8px 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '88vh', overflowY: 'auto',
    },
    handle: { width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
    select: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
    },
    input: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    textarea: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box', resize: 'none', minHeight: 80, fontFamily: 'inherit',
    },
    submitBtn: {
        width: '100%', padding: '16px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
        border: 'none', borderRadius: 16, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        marginTop: 8,
    },
    cancelBtn: {
        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8,
    },
}

export default function BookServiceModal({ isOpen, onClose, onBook, properties = [], preSelectedAppliance = null }) {
    const fileInputRef = useRef(null)

    // ── Form state ─────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        appliance: preSelectedAppliance?.type || '',
        brand: preSelectedAppliance?.brand || '',
        issueId: '',
        propertyId: '',
        description: '',           // optional
        preferredDate: '',
        preferredTime: '',          // required
        imageFile: null,
        imagePreview: null,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── Settings data ───────────────────────────────────────────────────────────
    const [appliances, setAppliances] = useState([])   // booking_categories
    const [brands, setBrands] = useState([])            // booking_brands
    const [allIssues, setAllIssues] = useState([])     // flat list of all issues
    const [slots, setSlots] = useState([])             // booking-slots, active only
    const [customerProperties, setCustomerProperties] = useState([]) // customer's linked properties
    const [settingsLoading, setSettingsLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return
        loadSettings()
    }, [isOpen])

    const loadSettings = async () => {
        setSettingsLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const [bookingRes, brandsRes, slotsRes, propsRes] = await Promise.all([
                fetch('/api/settings/quick-booking'),
                fetch('/api/settings/booking-brands'),
                fetch('/api/settings/booking-slots'),
                customerId ? fetch(`/api/customer/properties?customer_id=${customerId}`) : Promise.resolve(null),
            ])
            const [bookingData, brandsData, slotsData] = await Promise.all([
                bookingRes.json(), brandsRes.json(), slotsRes.json(),
            ])
            const propsData = propsRes ? await propsRes.json() : null

            const cats = bookingData.success ? (bookingData.data?.categories || []) : []
            setAppliances(cats.filter(c => c.showOnBookingForm !== false))

            // Flatten all issues from all subcategories
            const issues = []
            cats.forEach(cat => {
                (cat.subcategories || []).forEach(sub => {
                    (sub.issues || []).forEach(issue => {
                        if (issue.showOnBookingForm !== false) {
                            issues.push({ id: issue.id, name: issue.name, subcategory: sub.name, appliance: cat.name })
                        }
                    })
                })
            })
            setAllIssues(issues)

            const activeBrands = (brandsData.data || []).filter(b => b.is_active !== false)
            setBrands(activeBrands)

            const activeSlots = (slotsData.data || []).filter(s => s.active !== false)
            setSlots(activeSlots)

            if (propsData?.success) {
                setCustomerProperties(propsData.properties || [])
            }
        } catch (err) {
            console.error('Failed to load booking settings:', err)
        } finally {
            setSettingsLoading(false)
        }
    }

    // Filter issues by selected appliance
    const filteredIssues = form.appliance
        ? allIssues.filter(i => i.appliance.toLowerCase() === form.appliance.toLowerCase())
        : allIssues

    // Unique slot labels for the time picker
    const uniqueSlotLabels = [...new Map(slots.map(s => [s.label || `${s.startTime}–${s.endTime}`, s])).values()]

    const handleImagePick = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
        const reader = new FileReader()
        reader.onload = () => setForm(f => ({ ...f, imageFile: file, imagePreview: reader.result }))
        reader.readAsDataURL(file)
    }

    const handleSubmit = async () => {
        setError('')
        if (!form.appliance) return setError('Please select an appliance type')
        if (!form.brand) return setError('Please select a brand')
        if (!form.issueId) return setError('Please select an issue type')
        if (!form.propertyId) return setError('Please select a service location')
        if (!form.preferredDate) return setError('Please select a preferred date')
        if (!form.preferredTime) return setError('Please select a preferred time slot')

        setLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            if (!customerId) throw new Error('Not authenticated')

            let imageUrl = null
            if (form.imageFile) {
                // Upload to Supabase storage or API
                const formData = new FormData()
                formData.append('file', form.imageFile)
                formData.append('bucket', 'service-images')
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json()
                    imageUrl = uploadData.url || null
                }
            }

            const selectedIssue = allIssues.find(i => i.id === form.issueId)
            const payload = {
                customer_id: customerId,
                property_id: form.propertyId,
                appliance_type: form.appliance,
                brand: form.brand,
                issue_type: selectedIssue?.name || form.issueId,
                issue_id: form.issueId,
                description: form.description || null,
                preferred_date: form.preferredDate,
                preferred_time_slot: form.preferredTime,
                image_url: imageUrl,
                status: 'pending',
            }

            const res = await fetch('/api/customer/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to book service')

            onBook?.(data.job)
            onClose()
            // Reset form
            setForm({ appliance: '', brand: '', issueId: '', propertyId: '', description: '', preferredDate: '', preferredTime: '', imageFile: null, imagePreview: null })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
                <div style={S.handle} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wrench size={20} color="#38bdf8" />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Book a Service</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Fill the details below</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                {settingsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                        <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
                        Loading available options...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                        {/* Appliance / Product */}
                        <div>
                            <label style={S.label}>Appliance / Product *</label>
                            <select style={S.select} value={form.appliance}
                                onChange={e => setForm(f => ({ ...f, appliance: e.target.value, issueId: '' }))}>
                                <option value="">Select appliance type</option>
                                {appliances.map(a => (
                                    <option key={a.id} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand */}
                        <div>
                            <label style={S.label}>Brand *</label>
                            <select style={S.select} value={form.brand}
                                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                                <option value="">Select brand</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Issue Type */}
                        <div>
                            <label style={S.label}>Issue Type *</label>
                            <select style={S.select} value={form.issueId}
                                onChange={e => setForm(f => ({ ...f, issueId: e.target.value }))}>
                                <option value="">
                                    {form.appliance ? `Select issue for ${form.appliance}` : 'Select issue'}
                                </option>
                                {filteredIssues.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                                {filteredIssues.length === 0 && form.appliance && (
                                    <option value="other" disabled>No issues listed — contact support</option>
                                )}
                            </select>
                        </div>

                        {/* Service Location */}
                        <div>
                            <label style={S.label}>Service Location *</label>
                            <select style={S.select} value={form.propertyId}
                                onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}>
                                <option value="">Select your property</option>
                                {customerProperties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {[p.flat_number, p.building_name, p.address].filter(Boolean).join(', ')}{p.locality ? ` — ${p.locality}` : ''}{p.pincode ? ` ${p.pincode}` : ''}
                                    </option>
                                ))}
                            </select>
                            {customerProperties.length === 0 && (
                                <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
                                    ⚠ No properties saved. Go to Profile → My Properties to add one first.
                                </p>
                            )}
                        </div>

                        {/* Describe the Problem (optional) */}
                        <div>
                            <label style={S.label}>Describe the Problem <span style={{ color: '#475569', fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                            <textarea style={S.textarea} placeholder="E.g. AC not cooling, making a loud noise since last week..."
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                        </div>

                        {/* Preferred Date */}
                        <div>
                            <label style={S.label}>Preferred Date *</label>
                            <input style={S.input} type="date" value={form.preferredDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
                        </div>

                        {/* Preferred Time Slot (mandatory) */}
                        <div>
                            <label style={S.label}>Preferred Time *</label>
                            {uniqueSlotLabels.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {uniqueSlotLabels.map(slot => {
                                        const slotLabel = slot.label || `${slot.startTime}–${slot.endTime}`
                                        const isSelected = form.preferredTime === slotLabel
                                        return (
                                            <button key={slot.id} type="button"
                                                onClick={() => setForm(f => ({ ...f, preferredTime: slotLabel }))}
                                                style={{
                                                    padding: '13px 16px', borderRadius: 12, textAlign: 'left',
                                                    background: isSelected ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                                    border: isSelected ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                    color: isSelected ? '#38bdf8' : '#94a3b8',
                                                    fontSize: 14, fontWeight: isSelected ? 700 : 500, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                }}>
                                                <span>{slotLabel}</span>
                                                {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <input style={S.input} type="text" placeholder="E.g. Morning (9am–12pm)"
                                    value={form.preferredTime} onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))} />
                            )}
                        </div>

                        {/* Product Image Upload */}
                        <div>
                            <label style={S.label}>Product / Issue Photo <span style={{ color: '#475569', fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                                onChange={handleImagePick} style={{ display: 'none' }} />

                            {form.imagePreview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={form.imagePreview} alt="Product preview"
                                        style={{ width: '100%', borderRadius: 14, maxHeight: 200, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <button onClick={() => setForm(f => ({ ...f, imageFile: null, imagePreview: null }))}
                                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    style={{ width: '100%', padding: '20px', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 14, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Camera size={22} color="#38bdf8" />
                                    </div>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Tap to capture or upload a photo</span>
                                    <span style={{ fontSize: 11, color: '#475569' }}>Helps the technician prepare better · Max 5MB</span>
                                </button>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 14px', color: '#f87171', fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        {/* Buttons */}
                        <button onClick={handleSubmit} disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Booking...' : 'Confirm Booking'}
                        </button>
                        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    )
}
