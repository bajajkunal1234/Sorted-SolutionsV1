'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, X, Search, MapPin, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import LocalityCombobox from '@/components/common/LocalityCombobox'
import { getPincodeForLocality } from '@/lib/data/mumbaiLocalities'

const ClientPinDropMap = dynamic(() => import('@/components/common/PinDropMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '220px', width: '100%', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
            🗺️ Loading map...
        </div>
    )
})

const S = {
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalContent: { background: 'linear-gradient(180deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
    label: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    searchInput: { width: '100%', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, padding: '11px 12px 11px 36px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, marginTop: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
    dropdownItem: { padding: '10px 12px', color: '#cbd5e1', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }
}

function PropertyForm({ customerId, onSave, onClose }) {
    const [formData, setFormData] = useState({
        property_name: '',
        flat_number: '',
        building_name: '',
        address: '',
        locality: '',
        city: 'Mumbai',
        pincode: '',
        property_type: 'residential',
        lat: null,
        lng: null
    })

    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    // Autocomplete search states
    const [searchTerm, setSearchTerm] = useState('')
    const [predictions, setPredictions] = useState([])
    const [searching, setSearching] = useState(false)
    const debounceTimerRef = useRef(null)

    const handleSearchChange = (val) => {
        setSearchTerm(val)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        if (val.trim().length < 2) {
            setPredictions([])
            return
        }
        debounceTimerRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetch(`/api/admin/places-autocomplete?q=${encodeURIComponent(val)}`)
                const data = await res.json()
                if (data.success) {
                    setPredictions(data.predictions || [])
                }
            } catch (err) {
                console.error('Autocomplete error:', err)
            } finally {
                setSearching(false)
            }
        }, 400)
    }

    const handleSelectPrediction = async (pred) => {
        setSearchTerm(pred.description)
        setPredictions([])
        setSearching(true)
        try {
            const res = await fetch(`/api/admin/places-details?place_id=${pred.place_id}`)
            const result = await res.json()
            if (result.success && result.data) {
                const d = result.data
                setFormData(prev => ({
                    ...prev,
                    building_name: d.building_name || prev.building_name,
                    address: d.address || prev.address,
                    locality: d.locality || prev.locality,
                    city: d.city || prev.city || 'Mumbai',
                    pincode: d.pincode || prev.pincode,
                    lat: d.latitude,
                    lng: d.longitude
                }))
            }
        } catch (err) {
            console.error('Details fetch error:', err)
        } finally {
            setSearching(false)
        }
    }

    const handleLocalityChange = (e) => {
        const name = e.target.value
        const pin = getPincodeForLocality(name)
        setFormData(prev => ({ ...prev, locality: name, pincode: pin || prev.pincode }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.address.trim()) {
            setErrors(prev => ({ ...prev, address: 'Street Address is required' }))
            return
        }
        if (!formData.locality.trim()) {
            setErrors(prev => ({ ...prev, locality: 'Locality is required' }))
            return
        }
        if (!formData.pincode.trim()) {
            setErrors(prev => ({ ...prev, pincode: 'Pincode is required' }))
            return
        }

        try {
            setLoading(true)
            const propertyData = {
                flat_number: formData.flat_number || null,
                building_name: formData.building_name || null,
                address: formData.address,
                locality: formData.locality,
                city: formData.city,
                pincode: formData.pincode,
                property_type: formData.property_type,
                latitude: formData.lat,
                longitude: formData.lng,
                customer_id: customerId,
                force_create: true // Skip duplicate blocker in job creation flow
            }
            if (onSave) await onSave(propertyData)
        } catch (err) {
            console.error('Error saving property:', err)
            alert('Failed to save property: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={S.modalOverlay}>
            <div style={S.modalContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ color: '#f8fafc', fontWeight: 800, margin: 0 }}>Add Customer Property</h3>
                    <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} />
                    </button>
                </div>

                {/* Google Location Autocomplete Search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={S.label}>🔍 Search Google Maps (Recommended)</div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} color="#38bdf8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            style={S.searchInput}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Type building name, landmark or area..."
                        />
                        {searching && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />}
                    </div>

                    {predictions.length > 0 && (
                        <div style={S.dropdown}>
                            {predictions.map(pred => (
                                <div
                                    key={pred.place_id}
                                    style={S.dropdownItem}
                                    onClick={() => handleSelectPrediction(pred)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <MapPin size={14} color="#38bdf8" />
                                    <span>{pred.description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={S.label}>Flat / Wing</div>
                            <input
                                style={S.input}
                                value={formData.flat_number}
                                onChange={e => setFormData({ ...formData, flat_number: e.target.value })}
                                placeholder="e.g. A-402"
                            />
                        </div>
                        <div>
                            <div style={S.label}>Building Name</div>
                            <input
                                style={S.input}
                                value={formData.building_name}
                                onChange={e => setFormData({ ...formData, building_name: e.target.value })}
                                placeholder="e.g. Sunrise Tower"
                            />
                        </div>
                    </div>

                    <div>
                        <div style={S.label}>Street Address / Area *</div>
                        <input
                            style={{ ...S.input, borderColor: errors.address ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)' }}
                            value={formData.address}
                            onChange={e => {
                                setFormData({ ...formData, address: e.target.value })
                                if (errors.address) setErrors(prev => { const c = { ...prev }; delete c.address; return c })
                            }}
                            placeholder="e.g. Off Film City Road, Anand Nagar"
                            required
                        />
                    </div>

                    {/* Draggable Map Integration */}
                    <ClientPinDropMap
                        label="📍 Refine location pin (drag to exact door)"
                        building={formData.building_name}
                        street={formData.address}
                        localityQuery={formData.locality}
                        pincodeQuery={formData.pincode}
                        initialLat={formData.lat}
                        initialLng={formData.lng}
                        onChange={({ lat, lng }) => setFormData(prev => ({ ...prev, lat, lng }))}
                        height="200px"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={S.label}>Locality *</div>
                            <LocalityCombobox
                                value={formData.locality}
                                onChange={handleLocalityChange}
                                pincode={formData.pincode}
                            />
                        </div>
                        <div>
                            <div style={S.label}>Pincode *</div>
                            <input
                                style={{ ...S.input, borderColor: errors.pincode ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)' }}
                                value={formData.pincode}
                                onChange={e => {
                                    setFormData({ ...formData, pincode: e.target.value })
                                    if (errors.pincode) setErrors(prev => { const c = { ...prev }; delete c.pincode; return c })
                                }}
                                placeholder="6 digits"
                                maxLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <button
                            type="submit"
                            style={{
                                flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#0284c7)',
                                color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Property'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                                color: '#94a3b8', fontWeight: 700, cursor: 'pointer'
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PropertyForm
