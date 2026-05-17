'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Wrench, Camera, Upload, Image as ImageIcon, ChevronDown, Search, Check, ShieldCheck, FileText, Package, Calendar, Lock } from 'lucide-react'

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

// ── Searchable Combobox Helper Component ─────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled, icon }) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef(null)

    const selectedOption = options.find(o => String(o.value) === String(value))

    // Keep internal query string in sync with external value label
    useEffect(() => {
        if (selectedOption) {
            setQuery(selectedOption.label)
        } else {
            setQuery('')
        }
    }, [value, options])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
                if (selectedOption) {
                    setQuery(selectedOption.label)
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [selectedOption])

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                {icon && <span style={{ position: 'absolute', left: 14, color: '#64748b', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>{icon}</span>}
                <input 
                    type="text"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={query}
                    onClick={() => !disabled && setIsOpen(true)}
                    onChange={e => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        if (!e.target.value) {
                            onChange('')
                        }
                    }}
                    style={{
                        width: '100%', background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)', 
                        border: isOpen ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, padding: '13px 36px 13px ' + (icon ? '40px' : '14px'),
                        color: disabled ? '#64748b' : '#f8fafc', fontSize: 14, outline: 'none',
                        cursor: disabled ? 'not-allowed' : 'text', boxSizing: 'border-box',
                        transition: 'border-color 0.2s', fontFamily: 'inherit'
                    }}
                />
                <button 
                    type="button" 
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!disabled) setIsOpen(!isOpen)
                    }}
                    style={{ 
                        position: 'absolute', right: 10, background: 'transparent', border: 'none', 
                        color: '#64748b', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 
                    }}
                >
                    <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
            </div>

            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)', zIndex: 300, maxHeight: '240px',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '6px'
                }}>
                    {filteredOptions.map(opt => (
                        <div 
                            key={opt.value}
                            onClick={() => { 
                                onChange(opt.value); 
                                setQuery(opt.label);
                                setIsOpen(false); 
                            }}
                            style={{
                                padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: String(value) === String(opt.value) ? 'rgba(56,189,248,0.15)' : 'transparent',
                                color: String(value) === String(opt.value) ? '#38bdf8' : '#e2e8f0',
                                fontWeight: String(value) === String(opt.value) ? 700 : 500,
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = String(value) === String(opt.value) ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = String(value) === String(opt.value) ? 'rgba(56,189,248,0.15)' : 'transparent'}
                        >
                            <span>{opt.label}</span>
                            {String(value) === String(opt.value) && <Check size={14} color="#38bdf8" />}
                        </div>
                    ))}
                    {filteredOptions.length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>No options match "{query}"</div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function BookServiceModal({ isOpen, onClose, onBook, properties = [], preSelectedAppliance = null, preSelectedCoverage = null }) {
    const fileInputRef = useRef(null)

    // ── Form state ─────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        appliance: preSelectedAppliance?.type || '',
        subcategory: '',
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

    // ── Coverage state ────────────────────────────────────────────────────────
    const [coverageType, setCoverageType] = useState(preSelectedCoverage?.type === 'amc' || preSelectedCoverage?.type === 'rental' || preSelectedCoverage?.type === 'warranty' ? 'warranty' : 'standard') // 'standard', 'warranty'
    const [warrantyRefType, setWarrantyRefType] = useState(preSelectedCoverage?.type === 'amc' ? 'amc' : (preSelectedCoverage?.type === 'rental' ? 'rental' : 'invoice')) // 'invoice', 'amc', 'rental', 'manual'
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
    const [linkedAmcId, setLinkedAmcId] = useState(preSelectedCoverage?.type === 'amc' ? preSelectedCoverage.contract?.id || '' : '')
    const [linkedRentalId, setLinkedRentalId] = useState(preSelectedCoverage?.type === 'rental' ? preSelectedCoverage.contract?.id || '' : '')
    const [warrantyNotes, setWarrantyNotes] = useState('')
    const [customerAmcs, setCustomerAmcs] = useState([])
    const [customerRentals, setCustomerRentals] = useState([])
    const [customerInvoices, setCustomerInvoices] = useState([])

    // ── Settings data ───────────────────────────────────────────────────────────
    const [appliances, setAppliances] = useState([])   // booking_categories
    const [brands, setBrands] = useState([])            // booking_brands
    const [allIssues, setAllIssues] = useState([])     // flat list of all issues
    const [availableSlots, setAvailableSlots] = useState([])
    const [fetchingSlots, setFetchingSlots] = useState(false)
    const [customerProperties, setCustomerProperties] = useState([]) // customer's linked properties
    const [settingsLoading, setSettingsLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return
        loadSettings()
    }, [isOpen])

    useEffect(() => {
        if (preSelectedCoverage?.type) {
            if (preSelectedCoverage.type === 'amc' || preSelectedCoverage.type === 'rental' || preSelectedCoverage.type === 'warranty') {
                setCoverageType('warranty')
                if (preSelectedCoverage.type === 'amc') setWarrantyRefType('amc')
                if (preSelectedCoverage.type === 'rental') setWarrantyRefType('rental')
            } else {
                setCoverageType('standard')
            }
            if (preSelectedCoverage.type === 'amc' && preSelectedCoverage.contract) {
                setLinkedAmcId(preSelectedCoverage.contract.id)
                if (preSelectedCoverage.contract.productBrand) setForm(f => ({ ...f, brand: preSelectedCoverage.contract.productBrand }))
                if (preSelectedCoverage.contract.category || preSelectedCoverage.contract.productType) setForm(f => ({ ...f, appliance: preSelectedCoverage.contract.category || preSelectedCoverage.contract.productType }))
                if (preSelectedCoverage.contract.propertyId || preSelectedCoverage.contract.installation_address_id) setForm(f => ({ ...f, propertyId: preSelectedCoverage.contract.propertyId || preSelectedCoverage.contract.installation_address_id }))
            }
            if (preSelectedCoverage.type === 'rental' && preSelectedCoverage.contract) {
                setLinkedRentalId(preSelectedCoverage.contract.id)
                if (preSelectedCoverage.contract.productName || preSelectedCoverage.contract.productType) setForm(f => ({ ...f, appliance: preSelectedCoverage.contract.productName || preSelectedCoverage.contract.productType }))
                if (preSelectedCoverage.contract.propertyId || preSelectedCoverage.contract.delivery_address_id) setForm(f => ({ ...f, propertyId: preSelectedCoverage.contract.propertyId || preSelectedCoverage.contract.delivery_address_id }))
            }
        }
    }, [preSelectedCoverage])

    const loadSettings = async () => {
        setSettingsLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const [bookingRes, brandsRes, propsRes, amcRes, rentalsRes, invRes] = await Promise.all([
                fetch('/api/settings/quick-booking'),
                fetch('/api/settings/booking-brands'),
                customerId ? fetch(`/api/customer/properties?customer_id=${customerId}`) : Promise.resolve(null),
                customerId ? fetch(`/api/customer/amc?customerId=${customerId}`).catch(() => null) : Promise.resolve(null),
                customerId ? fetch(`/api/customer/rentals?customerId=${customerId}`).catch(() => null) : Promise.resolve(null),
                customerId ? fetch(`/api/admin/transactions?type=sales&customer_id=${customerId}&start_date=${ninetyDaysAgo}`).catch(() => null) : Promise.resolve(null),
            ])
            const [bookingData, brandsData] = await Promise.all([
                bookingRes.json(), brandsRes.json(),
            ])
            const propsData = propsRes ? await propsRes.json() : null
            const amcsData = amcRes ? await amcRes.json() : null
            const rentalsData = rentalsRes ? await rentalsRes.json() : null
            const invData = invRes ? await invRes.json() : null

            if (amcsData?.success) setCustomerAmcs(amcsData.contracts || [])
            if (rentalsData?.success) setCustomerRentals(rentalsData.rentals || [])
            if (invData?.success) setCustomerInvoices(invData.data || [])

            const cats = bookingData.success ? (bookingData.data?.categories || []) : []
            setAppliances(cats.filter(c => c.showOnBookingForm !== false))

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

            if (propsData?.success) {
                setCustomerProperties(propsData.properties || [])
            }
        } catch (err) {
            console.error('Failed to load booking settings:', err)
        } finally {
            setSettingsLoading(false)
        }
    }

    // Selected appliance object to get its subcategories
    const selectedApplianceObj = appliances.find(a => a.name === form.appliance)
    const availableSubcategories = selectedApplianceObj?.subcategories || []

    // Filter issues by selected appliance and subcategory
    const filteredIssues = allIssues.filter(i => {
        if (form.appliance && i.appliance !== form.appliance) return false;
        if (form.subcategory && i.subcategory !== form.subcategory) return false;
        return true;
    })

    useEffect(() => {
        if (!form.preferredDate) return
        const fetchSlots = async () => {
            setFetchingSlots(true)
            try {
                const res = await fetch(`/api/booking/available-slots?days=1&startDate=${form.preferredDate}`)
                const data = await res.json()
                if (data.success && data.data[form.preferredDate]) {
                    setAvailableSlots(data.data[form.preferredDate])
                } else {
                    setAvailableSlots([])
                }
            } catch (err) {
                console.error(err)
            } finally {
                setFetchingSlots(false)
            }
        }
        fetchSlots()
    }, [form.preferredDate])

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
        if (availableSubcategories.length > 0 && !form.subcategory) return setError('Please select a subcategory or type')
        if (!form.brand) return setError('Please select a brand')
        if (!form.issueId) return setError('Please select an issue type')
        if (!form.propertyId) return setError('Please select a service location')
        if (!form.preferredDate) return setError('Please select a preferred date')
        if (!form.preferredTime) return setError('Please select a preferred time slot')

        if (coverageType === 'warranty') {
            if (warrantyRefType === 'amc' && !linkedAmcId) return setError('Please select an active AMC contract')
            if (warrantyRefType === 'rental' && !linkedRentalId) return setError('Please select a rented appliance')
            if (warrantyRefType === 'invoice' && !selectedInvoiceId) return setError('Please select a recent invoice')
        }

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
                subcategory: form.subcategory || null,
                brand: form.brand,
                issue_type: selectedIssue?.name || form.issueId,
                issue_id: form.issueId,
                description: form.description || null,
                preferred_date: form.preferredDate,
                preferred_time_slot: form.preferredTime,
                image_url: imageUrl,
                service_coverage: coverageType === 'warranty' ? (warrantyRefType === 'amc' ? 'amc' : (warrantyRefType === 'rental' ? 'rental' : 'warranty')) : 'standard',
                amc_id: coverageType === 'warranty' && warrantyRefType === 'amc' ? linkedAmcId : null,
                rental_id: coverageType === 'warranty' && warrantyRefType === 'rental' ? linkedRentalId : null,
                warranty_info: coverageType === 'warranty' ? (warrantyRefType === 'invoice' ? `Invoice ID: ${selectedInvoiceId}` : (warrantyRefType === 'amc' ? `AMC ID: ${linkedAmcId}` : `Rental ID: ${linkedRentalId}`)) : null,
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

    const isLockedByWarranty = coverageType === 'warranty' && (warrantyRefType === 'amc' || warrantyRefType === 'rental') && (linkedAmcId || linkedRentalId)

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

                        {/* Service Coverage Selector */}
                        <div>
                            <label style={S.label}>Service Coverage *</label>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, gap: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                                {[
                                    { id: 'standard', label: 'New Booking (Standard)', color: '#38bdf8' },
                                    { id: 'warranty', label: '📜 Warranty', color: '#fbbf24' },
                                ].map(cov => (
                                    <button
                                        key={cov.id}
                                        type="button"
                                        onClick={() => {
                                            setCoverageType(cov.id)
                                        }}
                                        style={{
                                            flex: 1, padding: '12px 6px', borderRadius: 10, border: 'none',
                                            background: coverageType === cov.id ? `${cov.color}25` : 'transparent',
                                            color: coverageType === cov.id ? cov.color : '#64748b',
                                            border: coverageType === cov.id ? `1px solid ${cov.color}50` : '1px solid transparent',
                                            fontSize: 14, fontWeight: coverageType === cov.id ? 700 : 600, cursor: 'pointer',
                                            transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {cov.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Warranty Sub-options Selection */}
                        {coverageType === 'warranty' && (
                            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <label style={{ ...S.label, color: '#fbbf24' }}>Select Warranty Reference *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    {[
                                        { id: 'invoice', label: '🧾 Recent Invoice' },
                                        { id: 'amc', label: '🛡️ AMC Contract' },
                                        { id: 'rental', label: '📦 Rental Appliance' },
                                    ].map(sub => (
                                        <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => {
                                                setWarrantyRefType(sub.id)
                                                if (sub.id !== 'amc') setLinkedAmcId('')
                                                if (sub.id !== 'rental') setLinkedRentalId('')
                                                if (sub.id !== 'invoice') setSelectedInvoiceId('')
                                            }}
                                            style={{
                                                padding: '12px 8px', borderRadius: 12, border: 'none',
                                                background: warrantyRefType === sub.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                                                color: warrantyRefType === sub.id ? '#fbbf24' : '#94a3b8',
                                                border: warrantyRefType === sub.id ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                fontSize: 13, fontWeight: warrantyRefType === sub.id ? 700 : 500, cursor: 'pointer',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                            }}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                </div>

                                {warrantyRefType === 'invoice' && (
                                    <div>
                                        <label style={{ ...S.label, color: '#fbbf24', marginTop: 4 }}>Select Invoice (Past 90 Days) *</label>
                                        <select
                                            style={{ ...S.select, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(15,23,42,0.6)' }}
                                            value={selectedInvoiceId}
                                            onChange={e => {
                                                const invId = e.target.value
                                                setSelectedInvoiceId(invId)
                                                const match = customerInvoices.find(i => String(i.id) === String(invId))
                                                if (match) {
                                                    setWarrantyNotes(`Invoice #${match.invoice_number || match.id.slice(0,8)} (${new Date(match.date).toLocaleDateString()})`)
                                                    if (match.items?.[0]?.name) setForm(f => ({ ...f, appliance: match.items[0].name }))
                                                }
                                            }}
                                        >
                                            <option value="">Select an invoice</option>
                                            {customerInvoices.map(inv => (
                                                <option key={inv.id} value={inv.id}>
                                                    Invoice #{inv.invoice_number || inv.id.slice(0,8)} — ₹{inv.total_amount} ({new Date(inv.date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        {customerInvoices.length === 0 && (
                                            <p style={{ fontSize: 12, color: '#f43f5e', marginTop: 8 }}>
                                                ⚠ No invoices found in the past 90 days. Warranty is only applicable on company repairs, active rentals, or AMCs.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {warrantyRefType === 'amc' && (
                                    <div>
                                        <label style={{ ...S.label, color: '#a78bfa' }}>Select Active AMC Contract *</label>
                                        <select
                                            style={{ ...S.select, borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(15,23,42,0.6)' }}
                                            value={linkedAmcId}
                                            onChange={e => {
                                                const cId = e.target.value
                                                setLinkedAmcId(cId)
                                                const match = customerAmcs.find(c => String(c.id) === String(cId))
                                                if (match) {
                                                    if (match.productBrand) setForm(f => ({ ...f, brand: match.productBrand }))
                                                    if (match.category || match.productType) setForm(f => ({ ...f, appliance: match.category || match.productType }))
                                                    if (match.propertyId || match.installation_address_id) setForm(f => ({ ...f, propertyId: match.propertyId || match.installation_address_id }))
                                                    setWarrantyNotes(`AMC Contract: ${match.planName}`)
                                                }
                                            }}
                                        >
                                            <option value="">Select your AMC contract</option>
                                            {customerAmcs.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.planName} ({c.productBrand} {c.productType}) — Ends {new Date(c.endDate).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </select>
                                        {customerAmcs.length === 0 && (
                                            <p style={{ fontSize: 12, color: '#f43f5e', marginTop: 8 }}>
                                                ⚠ No active AMC contracts found on your account.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {warrantyRefType === 'rental' && (
                                    <div>
                                        <label style={{ ...S.label, color: '#34d399' }}>Select Rented Appliance *</label>
                                        <select
                                            style={{ ...S.select, borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(15,23,42,0.6)' }}
                                            value={linkedRentalId}
                                            onChange={e => {
                                                const rId = e.target.value
                                                setLinkedRentalId(rId)
                                                const match = customerRentals.find(r => String(r.id) === String(rId))
                                                if (match) {
                                                    if (match.productType || match.productName) setForm(f => ({ ...f, appliance: match.productType || match.productName }))
                                                    if (match.propertyId || match.delivery_address_id) setForm(f => ({ ...f, propertyId: match.propertyId || match.delivery_address_id }))
                                                    setForm(f => ({ ...f, brand: 'Sorted Appliance' }))
                                                    setWarrantyNotes(`Rental Appliance: ${match.productName || match.productType}`)
                                                }
                                            }}
                                        >
                                            <option value="">Select rented appliance</option>
                                            {customerRentals.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.productName || r.productType} (₹{r.monthlyRent}/mo)
                                                </option>
                                            ))}
                                        </select>
                                        {customerRentals.length === 0 && (
                                            <p style={{ fontSize: 12, color: '#f43f5e', marginTop: 8 }}>
                                                ⚠ No active rental appliances found on your account.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {isLockedByWarranty && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 14, padding: '12px 16px', color: '#38bdf8', fontSize: 13 }}>
                                <Lock size={18} style={{ flexShrink: 0 }} />
                                <span>Appliance, Brand, and Service Location are locked to your selected contract.</span>
                            </div>
                        )}

                        {/* Appliance / Product */}
                        <div>
                            <label style={S.label}>Appliance / Product *</label>
                            <SearchableSelect 
                                options={appliances.map(a => ({ value: a.name, label: a.name }))}
                                value={form.appliance}
                                placeholder="Select appliance type"
                                disabled={isLockedByWarranty}
                                icon={isLockedByWarranty ? <Lock size={14} /> : null}
                                onChange={val => setForm(f => ({ ...f, appliance: val, subcategory: '', issueId: '' }))}
                            />
                        </div>

                        {/* Subcategory */}
                        {availableSubcategories.length > 0 && (
                            <div>
                                <label style={S.label}>Subcategory / Type *</label>
                                <SearchableSelect 
                                    options={availableSubcategories.map(s => ({ value: s.name, label: s.name }))}
                                    value={form.subcategory}
                                    placeholder="Select type"
                                    disabled={isLockedByWarranty}
                                    icon={isLockedByWarranty ? <Lock size={14} /> : null}
                                    onChange={val => setForm(f => ({ ...f, subcategory: val, issueId: '' }))}
                                />
                            </div>
                        )}

                        {/* Brand */}
                        <div>
                            <label style={S.label}>Brand *</label>
                            <SearchableSelect 
                                options={brands.map(b => ({ value: b.name, label: b.name })).concat(isLockedByWarranty ? [{ value: 'Sorted Appliance', label: 'Sorted Appliance' }] : [])}
                                value={form.brand}
                                placeholder="Select brand"
                                disabled={isLockedByWarranty}
                                icon={isLockedByWarranty ? <Lock size={14} /> : null}
                                onChange={val => setForm(f => ({ ...f, brand: val }))}
                            />
                        </div>

                        {/* Issue Type */}
                        <div>
                            <label style={S.label}>Issue Type *</label>
                            <SearchableSelect 
                                options={filteredIssues.map(i => ({ value: i.id, label: `${i.name}${i.subcategory ? ` (${i.subcategory})` : ''}` }))}
                                value={form.issueId}
                                placeholder={form.appliance ? `Select issue for ${form.appliance}` : 'Select issue'}
                                onChange={val => setForm(f => ({ ...f, issueId: val }))}
                            />
                        </div>

                        {/* Service Location */}
                        <div>
                            <label style={S.label}>Service Location *</label>
                            <SearchableSelect 
                                options={customerProperties.map(p => ({ value: p.id, label: [p.flat_number, p.building_name, p.address].filter(Boolean).join(', ') + (p.locality ? ` — ${p.locality}` : '') }))}
                                value={form.propertyId}
                                placeholder="Select your property"
                                disabled={isLockedByWarranty}
                                icon={isLockedByWarranty ? <Lock size={14} /> : null}
                                onChange={val => setForm(f => ({ ...f, propertyId: val }))}
                            />
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
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input style={{ ...S.input, colorScheme: 'dark', cursor: 'pointer' }} type="date" value={form.preferredDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
                                <Calendar size={18} color="#94a3b8" style={{ position: 'absolute', right: 14, pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* Preferred Time Slot (mandatory) */}
                        <div>
                            <label style={S.label}>Preferred Time *</label>
                            {!form.preferredDate ? (
                                <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>Select a date first</div>
                            ) : fetchingSlots ? (
                                <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>Loading slots...</div>
                            ) : availableSlots.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {availableSlots.map(slot => {
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
                                <div style={{ fontSize: 13, color: '#f87171', padding: '10px 0' }}>No slots available for this date</div>
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
