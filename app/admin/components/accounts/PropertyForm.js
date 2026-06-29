'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
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
                force_create: true // Skip duplicate checker in job creation
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

                    {/* Draggable Map Integration (with Google Autocomplete search built-in) */}
                    <ClientPinDropMap
                        label="📍 Confirm location pin"
                        building={formData.building_name}
                        street={formData.address}
                        localityQuery={formData.locality}
                        pincodeQuery={formData.pincode}
                        initialLat={formData.lat}
                        initialLng={formData.lng}
                        onChange={({ lat, lng }) => setFormData(prev => ({ ...prev, lat: lat, lng: lng }))}
                        onAddressSelected={(details) => {
                            setFormData(prev => ({
                                ...prev,
                                building_name: details.building_name || prev.building_name,
                                address: details.address || prev.address,
                                locality: details.locality || prev.locality,
                                city: details.city || prev.city || 'Mumbai',
                                pincode: details.pincode || prev.pincode,
                                lat: details.lat,
                                lng: details.lng
                            }))
                        }}
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
