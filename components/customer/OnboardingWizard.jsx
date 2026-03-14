'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle, MapPin, User, ArrowRight, Home, AlertCircle, Loader2, Camera } from 'lucide-react'
// Inline interaction logger (client-side)

// ─── Mumbai locality → pincode mapping ─────────────────────────────────────
const MUMBAI_LOCALITIES = [
    { name: 'Aarey Colony', pincode: '400065' },
    { name: 'Airoli', pincode: '400708' },
    { name: 'Andheri East', pincode: '400069' },
    { name: 'Andheri West', pincode: '400058' },
    { name: 'Antop Hill', pincode: '400037' },
    { name: 'Bandra East', pincode: '400051' },
    { name: 'Bandra West', pincode: '400050' },
    { name: 'BKC / Bandra Kurla Complex', pincode: '400051' },
    { name: 'Borivali East', pincode: '400066' },
    { name: 'Borivali West', pincode: '400092' },
    { name: 'Breach Candy', pincode: '400026' },
    { name: 'Bhandup East', pincode: '400042' },
    { name: 'Bhandup West', pincode: '400078' },
    { name: 'Bhendi Bazar', pincode: '400003' },
    { name: 'Byculla', pincode: '400027' },
    { name: 'Chakala', pincode: '400059' },
    { name: 'Chandivali', pincode: '400072' },
    { name: 'Charni Road', pincode: '400004' },
    { name: 'Chembur', pincode: '400071' },
    { name: 'Chembur Colony', pincode: '400074' },
    { name: 'Chinchpokli', pincode: '400012' },
    { name: 'Churchgate', pincode: '400020' },
    { name: 'Chunabhatti', pincode: '400022' },
    { name: 'Colaba', pincode: '400005' },
    { name: 'Cotton Green', pincode: '400033' },
    { name: 'Crawford Market', pincode: '400001' },
    { name: 'CST / Fort', pincode: '400001' },
    { name: 'Cuffe Parade', pincode: '400005' },
    { name: 'Cumballa Hill', pincode: '400026' },
    { name: 'Currey Road', pincode: '400012' },
    { name: 'Dahisar East', pincode: '400068' },
    { name: 'Dahisar West', pincode: '400068' },
    { name: 'Dadar East', pincode: '400014' },
    { name: 'Dadar West', pincode: '400028' },
    { name: 'Dharavi', pincode: '400017' },
    { name: 'Diva', pincode: '400612' },
    { name: 'Dockyard Road', pincode: '400010' },
    { name: 'Dongri', pincode: '400009' },
    { name: 'Film City', pincode: '400065' },
    { name: 'Ghansoli', pincode: '400701' },
    { name: 'Ghatkopar East', pincode: '400077' },
    { name: 'Ghatkopar West', pincode: '400086' },
    { name: 'Goregaon East', pincode: '400063' },
    { name: 'Goregaon West', pincode: '400062' },
    { name: 'Govandi', pincode: '400043' },
    { name: 'Grant Road', pincode: '400007' },
    { name: 'GTB Nagar', pincode: '400037' },
    { name: 'Hiranandani Gardens', pincode: '400076' },
    { name: 'Infinity Mall Malad', pincode: '400064' },
    { name: 'Jogeshwari East', pincode: '400060' },
    { name: 'Jogeshwari West', pincode: '400102' },
    { name: 'Juhu', pincode: '400049' },
    { name: 'Kalina', pincode: '400098' },
    { name: 'Kalwa', pincode: '400605' },
    { name: 'Kandivali East', pincode: '400101' },
    { name: 'Kandivali West', pincode: '400067' },
    { name: 'Kanjurmarg East', pincode: '400042' },
    { name: 'Kanjurmarg West', pincode: '400078' },
    { name: 'Kemps Corner', pincode: '400036' },
    { name: 'Khar East', pincode: '400052' },
    { name: 'Khar West', pincode: '400052' },
    { name: 'King Circle / Matunga', pincode: '400019' },
    { name: 'Koparkhairane', pincode: '400709' },
    { name: 'Kopri', pincode: '400603' },
    { name: 'Kurla East', pincode: '400024' },
    { name: 'Kurla West', pincode: '400070' },
    { name: 'Lalbaug', pincode: '400012' },
    { name: 'Lokhandwala', pincode: '400053' },
    { name: 'Lower Parel', pincode: '400013' },
    { name: 'Mahim', pincode: '400016' },
    { name: 'Mahalaxmi', pincode: '400011' },
    { name: 'Malabar Hill', pincode: '400006' },
    { name: 'Malad East', pincode: '400097' },
    { name: 'Malad West', pincode: '400064' },
    { name: 'Mankhurd', pincode: '400088' },
    { name: 'Marine Lines', pincode: '400002' },
    { name: 'Marol', pincode: '400059' },
    { name: 'Masjid', pincode: '400009' },
    { name: 'Matunga', pincode: '400019' },
    { name: 'Matunga Road', pincode: '400016' },
    { name: 'Mazgaon', pincode: '400010' },
    { name: 'MIDC Andheri', pincode: '400093' },
    { name: 'Mira Road', pincode: '401107' },
    { name: 'Mulund East', pincode: '400081' },
    { name: 'Mulund West', pincode: '400080' },
    { name: 'Mumbai Central', pincode: '400008' },
    { name: 'Mumbra', pincode: '400612' },
    { name: 'Nagpada', pincode: '400008' },
    { name: 'Nana Chowk', pincode: '400007' },
    { name: 'Nariman Point', pincode: '400021' },
    { name: 'Nahur', pincode: '400078' },
    { name: 'Naupada', pincode: '400602' },
    { name: 'Oshiwara', pincode: '400102' },
    { name: 'Parel', pincode: '400012' },
    { name: 'Powai', pincode: '400076' },
    { name: 'Prabhadevi', pincode: '400025' },
    { name: 'Prabhadevi East', pincode: '400025' },
    { name: 'Rabale', pincode: '400701' },
    { name: 'Reay Road', pincode: '400010' },
    { name: 'Sakinaka', pincode: '400072' },
    { name: 'Sandhurst Road', pincode: '400009' },
    { name: 'Sanpada', pincode: '400705' },
    { name: 'Santacruz East', pincode: '400055' },
    { name: 'Santacruz West', pincode: '400054' },
    { name: 'SEEPZ', pincode: '400096' },
    { name: 'Sewri', pincode: '400015' },
    { name: 'Sion', pincode: '400022' },
    { name: 'Sion Koliwada', pincode: '400037' },
    { name: 'Tardeo', pincode: '400034' },
    { name: 'Thane East', pincode: '400603' },
    { name: 'Thane West', pincode: '400601' },
    { name: 'Tilak Nagar', pincode: '400089' },
    { name: 'Turbhe', pincode: '400705' },
    { name: 'Vakola', pincode: '400055' },
    { name: 'Vashi', pincode: '400703' },
    { name: 'Versova', pincode: '400061' },
    { name: 'Vidyavihar', pincode: '400077' },
    { name: 'Vikhroli East', pincode: '400079' },
    { name: 'Vikhroli West', pincode: '400083' },
    { name: 'Vile Parle East', pincode: '400057' },
    { name: 'Vile Parle West', pincode: '400056' },
    { name: 'Wadala', pincode: '400037' },
    { name: 'Wadi Bunder', pincode: '400009' },
    { name: 'Wagle Estate', pincode: '400604' },
    { name: 'Walkeshwar', pincode: '400006' },
    { name: 'Worli', pincode: '400018' },
    { name: 'Worli Sea Face', pincode: '400030' },
];

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

// ─── Step 1.5: Profile Photo (optional) ─────────────────────────────────────
function StepPhoto({ name, customerId, onNext, onSkip }) {
    const [photoUrl, setPhotoUrl] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef(null)

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setError('')
        setUploading(true)
        try {
            const cId = customerId || localStorage.getItem('customerId')
            const fd = new FormData()
            fd.append('file', file)
            fd.append('bucket', 'media')
            fd.append('folder', 'customer-photos')
            const up = await fetch('/api/upload', { method: 'POST', body: fd })
            const upData = await up.json()
            if (!upData.url) throw new Error('Upload failed')
            // Save immediately to DB
            await fetch('/api/customer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: cId, image_url: upData.url }),
            })
            setPhotoUrl(upData.url)
        } catch {
            setError('Photo upload failed. You can add it later from your profile.')
        } finally {
            setUploading(false)
        }
    }

    const initials = name?.charAt(0)?.toUpperCase() || 'U'

    return (
        <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0' }}>Add a Profile Photo</h2>
            <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                Let our team know who they're meeting. You can skip and add this later.
            </p>

            {/* Avatar */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                {photoUrl ? (
                    <img src={photoUrl} alt="Profile"
                        style={{ width: 104, height: 104, borderRadius: '36px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(56,189,248,0.3)' }} />
                ) : (
                    <div style={{
                        width: 104, height: 104, borderRadius: '36px',
                        background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 44, fontWeight: 800, color: '#fff',
                        boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
                    }}>{initials}</div>
                )}
                {/* Camera badge */}
                <button
                    onClick={() => inputRef.current?.click()}
                    style={{
                        position: 'absolute', bottom: -4, right: -4,
                        width: 34, height: 34, borderRadius: '50%',
                        background: '#38bdf8', border: '3px solid #0f172a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                >
                    {uploading
                        ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                        : <Camera size={16} color="#fff" />}
                </button>
            </div>

            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

            {error && <div style={{ ...S.error, textAlign: 'left', marginBottom: 12 }}><AlertCircle size={14} /> {error}</div>}

            {!photoUrl ? (
                <button
                    style={S.btnPrimary}
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                >
                    <Camera size={18} /> {uploading ? 'Uploading...' : 'Choose Photo'}
                </button>
            ) : (
                <button style={S.btnPrimary} onClick={onNext}>
                    Looks good! <ArrowRight size={18} />
                </button>
            )}
            <button style={S.btnSecondary} onClick={onSkip}>Skip for now →</button>
        </div>
    )
}

// ─── Step 2: Add Property / Address ─────────────────────────────────────────
function StepAddress({ onNext, onSkip, customerId }) {
    const [form, setForm] = useState({
        type: 'apartment', flat_number: '', building_name: '', address: '', locality: '', city: '', pincode: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [pincodeStatus, setPincodeStatus] = useState(null) // null | 'valid' | 'invalid'
    const [matchedLocality, setMatchedLocality] = useState(null)
    const [advancedPincodes, setAdvancedPincodes] = useState([])

    // Smart match state
    const [propertyMatches, setPropertyMatches] = useState([]) // existing properties at this pincode
    const [selectedExisting, setSelectedExisting] = useState(null) // { id, address, ... }
    const [matchChecked, setMatchChecked] = useState(false)

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

    const validateAndSearch = async (pin) => {
        setPropertyMatches([])
        setSelectedExisting(null)
        setMatchChecked(false)

        if (!pin || pin.length < 6) { setPincodeStatus(null); setMatchedLocality(null); return }

        // Check serviceability
        if (advancedPincodes.length > 0) {
            const match = advancedPincodes.find(p => p.pincode === pin)
            if (match) { setPincodeStatus('valid'); setMatchedLocality(match.locality) }
            else { setPincodeStatus('invalid'); setMatchedLocality(null); return }
        }

        // Smart search — are there existing properties at this pincode?
        try {
            const res = await fetch(`/api/customer/properties?search=${pin}`)
            const data = await res.json()
            if (data.success && data.properties?.length > 0) {
                setPropertyMatches(data.properties)
            }
        } catch { /* silent */ }
        setMatchChecked(true)
    }

    const up = field => e => {
        setForm(p => ({ ...p, [field]: e.target.value }))
        if (field === 'pincode') validateAndSearch(e.target.value)
    }

    const handleLocalityChange = (e) => {
        const selectedLocalityName = e.target.value;
        const matched = MUMBAI_LOCALITIES.find(l => l.name === selectedLocalityName);
        
        setForm(p => ({ 
            ...p, 
            locality: selectedLocalityName,
            pincode: matched ? matched.pincode : p.pincode
        }));

        if (matched) {
            validateAndSearch(matched.pincode);
        }
    }

    const handleSubmit = async () => {
        setError('')
        const cId = customerId || localStorage.getItem('customerId')
        if (!cId) { setError('Session expired. Please log in again.'); return }

        if (selectedExisting) {
            // Link to existing property
            setLoading(true)
            try {
                const res = await fetch('/api/customer/properties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_id: cId, property_id: selectedExisting.id }),
                })
                const data = await res.json()
                if (!data.success) throw new Error(data.error || 'Failed to link property')
                onNext()
            } catch (err) { setError(err.message) }
            finally { setLoading(false) }
            return
        }

        // Create new property
        if (!form.address.trim()) { setError('Please enter your street address.'); return }
        if (!form.city.trim()) { setError('Please enter your city.'); return }
        if (!form.pincode.trim()) { setError('Please enter your pincode.'); return }
        if (pincodeStatus === 'invalid') { setError('We do not service this pincode yet.'); return }

        setLoading(true)
        try {
            const res = await fetch('/api/customer/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: cId,
                    flat_number: form.flat_number,
                    building_name: form.building_name,
                    address: form.address,
                    locality: form.locality || matchedLocality || '',
                    city: form.city,
                    pincode: form.pincode,
                    property_type: form.type,
                }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Failed to save address')
            onNext()
        } catch (err) { setError(err.message || 'Failed to save address. Please try again.') }
        finally { setLoading(false) }
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

            {/* Locality first, auto-populates Pincode */}
            <div style={S.group}>
                <label style={S.label}>Locality *</label>
                <select 
                    style={S.select} 
                    value={form.locality} 
                    onChange={handleLocalityChange}
                    autoFocus
                >
                    <option value="">Select your area</option>
                    {MUMBAI_LOCALITIES.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                            {loc.name}
                        </option>
                    ))}
                </select>
            </div>

            <div style={S.group}>
                <label style={S.label}>Pincode *</label>
                <input
                    style={{ ...S.input, borderColor: pincodeColor, opacity: 0.7, background: 'rgba(0,0,0,0.2)' }}
                    value={form.pincode}
                    onChange={e => up('pincode')(e)}
                    placeholder="e.g. 400001"
                    maxLength={6}
                    inputMode="numeric"
                    disabled={true}
                />
                {pincodeStatus === 'invalid' && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>✗ We don't service this pincode yet</div>}
            </div>

            {/* Smart Match Banner — existing property found */}
            {propertyMatches.length > 0 && !selectedExisting && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        📍 Properties found at this pincode
                    </div>
                    {propertyMatches.map(p => (
                        <div key={p.id} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>
                                {[p.flat_number, p.building_name, p.address].filter(Boolean).join(', ')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{[p.locality, p.city].filter(Boolean).join(', ')}</div>
                            {p.lastJob && (
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                    Last service: <span style={{ color: '#94a3b8' }}>{p.lastJob.category}</span> · {new Date(p.lastJob.date || p.lastJob.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setSelectedExisting(p)} style={{ flex: 1, padding: '8px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    ✓ Yes, that's mine
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => { setPropertyMatches([]); setMatchChecked(false) }} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                        None of these — add a new address
                    </button>
                </div>
            )}

            {/* Linked confirmation */}
            {selectedExisting && (
                <div style={{ ...S.success, flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> Linking to existing property
                    </div>
                    <div style={{ fontSize: 12, color: '#a7f3d0' }}>
                        {[selectedExisting.flat_number, selectedExisting.building_name, selectedExisting.address].filter(Boolean).join(', ')}, {selectedExisting.locality} {selectedExisting.pincode}
                    </div>
                    <button onClick={() => { setSelectedExisting(null) }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Change
                    </button>
                </div>
            )}

            {/* Full address form — only if no existing selected */}
            {!selectedExisting && (propertyMatches.length === 0 || matchChecked) && (
                <>
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

                    <div style={{ ...S.group, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={S.label}>Flat / Wing</label>
                            <input style={S.input} value={form.flat_number} onChange={up('flat_number')} placeholder="e.g. A-402" />
                        </div>
                        <div>
                            <label style={S.label}>Building Name</label>
                            <input style={S.input} value={form.building_name} onChange={up('building_name')} placeholder="e.g. Sea View Apts" />
                        </div>
                    </div>

                    <div style={S.group}>
                        <label style={S.label}>Street Address *</label>
                        <input style={S.input} value={form.address} onChange={up('address')} placeholder="Opposite Bank of India, Main Road" />
                    </div>

                    <div style={{ ...S.group, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        <div>
                            <label style={S.label}>City *</label>
                            <input style={S.input} value={form.city} onChange={up('city')} placeholder="Mumbai..." />
                        </div>
                    </div>
                </>
            )}

            <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Saving...' : selectedExisting ? 'Link This Property' : 'Save Address'}
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
                    { emoji: '📦', label: 'Add Appliances' },
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
    const [step, setStep] = useState(1) // 1 | 2 | 3 | 4
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

    const handlePhotoNext = () => setStep(3)
    const handleAddressNext = () => setStep(4)
    const handleSkipAddress = () => setStep(4)

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
                <ProgressDots step={step} total={4} />

                {/* Card */}
                <div style={S.card}>
                    {step === 1 && <StepWelcome name={name} onNext={handleNameNext} />}
                    {step === 2 && <StepPhoto name={name} customerId={customerId} onNext={handlePhotoNext} onSkip={handlePhotoNext} />}
                    {step === 3 && <StepAddress onNext={handleAddressNext} onSkip={handleSkipAddress} />}
                    {step === 4 && <StepDone name={name} onFinish={handleFinish} />}
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#334155' }}>
                    Step {step} of 4
                </div>
            </div>
        </div>
    )
}
