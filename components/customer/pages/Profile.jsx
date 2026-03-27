'use client'

import { useState, useEffect } from 'react'
import {
    User, MapPin, Edit2, ShieldCheck, ChevronRight,
    LogOut, Settings, CreditCard, LifeBuoy, Phone, Mail,
    X, Bell, HelpCircle, Star, Plus, Trash2, Loader2, Camera
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import ClientPinDropMap from '@/components/common/ClientPinDropMap'

const S = {
    input: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none',
        boxSizing: 'border-box', marginTop: 6,
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: '8px 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh', overflowY: 'auto',
    },
    handle: { width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' },
}

function Modal({ title, children, onClose }) {
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
                <div style={S.handle} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>{title}</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

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

function PropertyManagerModal({ onClose }) {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // 'list' | 'add'
    
    // Add Property Form State
    const [form, setForm] = useState({ type: 'apartment', flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '', lat: null, lng: null })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Smart Match State
    const [propertyMatches, setPropertyMatches] = useState([])
    const [selectedExisting, setSelectedExisting] = useState(null)
    const [matchChecked, setMatchChecked] = useState(false)

    useEffect(() => {
        fetchProperties()
    }, [])

    const fetchProperties = async () => {
        setLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            if (!customerId) return
            const res = await fetch(`/api/customer/properties?customer_id=${customerId}`)
            const data = await res.json()
            if (data.success) {
                setProperties(data.properties)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }



    const handleLocalityChange = (e) => {
        const selectedLocalityName = e.target.value;
        const matched = MUMBAI_LOCALITIES.find(l => l.name === selectedLocalityName);
        
        setForm(p => ({ 
            ...p, 
            locality: selectedLocalityName,
            pincode: matched ? matched.pincode : p.pincode
        }));
    }

    const handleSave = async (forceMatch = false) => {
        setError('')
        const customerId = localStorage.getItem('customerId')
        if (!customerId) { setError('Session expired. Please log in again.'); return }

        if (selectedExisting) {
            // Link to existing property
            setSaving(true)
            try {
                const res = await fetch('/api/customer/properties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_id: customerId, property_id: selectedExisting.id }),
                })
                const data = await res.json()
                if (!data.success) throw new Error(data.error || 'Failed to link property')
                fetchProperties()
                setView('list')
            } catch (err) { setError(err.message) }
            finally { setSaving(false) }
            return
        }

        // Create new property
        if (!form.address.trim()) { setError('Please enter your street address.'); return }
        if (!form.city.trim()) { setError('Please enter your city.'); return }
        if (!form.pincode.trim() || form.pincode.length !== 6) { setError('Please enter a valid pincode.'); return }

        // Exact Match Logic
        if (!matchChecked && !forceMatch && form.flat_number?.trim() && form.building_name?.trim()) {
            setSaving(true)
            try {
                const res = await fetch(`/api/customer/properties?search=${form.pincode}`)
                const data = await res.json()
                if (data.success && data.properties?.length > 0) {
                    const exact = data.properties.filter(p => 
                        p.flat_number?.trim().toLowerCase() === form.flat_number.trim().toLowerCase() && 
                        p.building_name?.trim().toLowerCase() === form.building_name.trim().toLowerCase()
                    )
                    if (exact.length > 0) {
                        setPropertyMatches(exact)
                        setMatchChecked(true)
                        setSaving(false)
                        return
                    }
                }
            } catch(e){}
            setSaving(false)
        }

        setSaving(true)
        try {
            const res = await fetch('/api/customer/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    flat_number: form.flat_number,
                    building_name: form.building_name,
                    address: form.address,
                    locality: form.locality,
                    city: form.city,
                    pincode: form.pincode,
                    property_type: form.type,
                    latitude: form.lat || null,
                    longitude: form.lng || null,
                }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Failed to save address')
            
            // Reset and return to list
            setForm({ type: 'apartment', flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '' })
            fetchProperties()
            setView('list')
        } catch (err) { setError(err.message || 'Failed to save address. Please try again.') }
        finally { setSaving(false) }
    }

    const handleUnlink = async (propertyId) => {
        if (!window.confirm('Remove this address from your profile?')) return;
        
        const customerId = localStorage.getItem('customerId')
        setLoading(true)
        try {
            const res = await fetch(`/api/customer/properties?customer_id=${customerId}&property_id=${propertyId}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                setProperties(p => p.filter(prop => prop.id !== propertyId))
            } else {
                alert(data.error || 'Failed to remove address')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to remove address')
        } finally {
            setLoading(false)
        }
    }

    if (view === 'add') {
        return (
            <Modal title="Add New Address" onClose={() => setView('list')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={S.label}>Locality *</label>
                        <select 
                            style={{ ...S.input, appearance: 'none', background: 'rgba(30,41,59,0.9)' }} 
                            value={form.locality} 
                            onChange={handleLocalityChange}
                        >
                            <option value="">Select your area</option>
                            {MUMBAI_LOCALITIES.map((loc) => (
                                <option key={loc.name} value={loc.name}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={S.label}>Pincode *</label>
                        <input
                            style={S.input}
                            value={form.pincode}
                            onChange={e => setForm(p => ({...p, pincode: e.target.value}))}
                            placeholder="e.g. 400001"
                        />
                    </div>

                    {/* Smart Match Banner */}
                    {propertyMatches.length > 0 && !selectedExisting && (
                        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '16px', marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                                📍 Properties found at this pincode
                            </div>
                            {propertyMatches.map(p => (
                                <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>
                                        {[p.flat_number, p.building_name, p.address].filter(Boolean).join(', ')}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{[p.locality, p.city].filter(Boolean).join(', ')}</div>
                                    <button onClick={() => setSelectedExisting(p)} style={{ width: '100%', padding: '8px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        ✓ Link this address
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => { setPropertyMatches([]); setMatchChecked(true); setTimeout(() => handleSave(true), 0); }} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, color: '#64748b', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                                None of these — enter manually
                            </button>
                        </div>
                    )}

                    {selectedExisting && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '12px 14px', color: '#10b981', fontSize: 13 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Linking to existing property:</div>
                            <div style={{ color: '#a7f3d0' }}>{[selectedExisting.flat_number, selectedExisting.building_name, selectedExisting.address].filter(Boolean).join(', ')}, {selectedExisting.locality}</div>
                            <button onClick={() => setSelectedExisting(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline', marginTop: 8 }}>
                                Change
                            </button>
                        </div>
                    )}

                    {!selectedExisting && (propertyMatches.length === 0 || matchChecked) && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={S.label}>Flat / Wing</label>
                                    <input style={S.input} value={form.flat_number} onChange={e => setForm(p => ({...p, flat_number: e.target.value}))} placeholder="e.g. A-402" />
                                </div>
                                <div>
                                    <label style={S.label}>Building Name</label>
                                    <input style={S.input} value={form.building_name} onChange={e => setForm(p => ({...p, building_name: e.target.value}))} placeholder="e.g. Sea View Apts" />
                                </div>
                            </div>
                            <div>
                                <label style={S.label}>Street Address *</label>
                                <input style={S.input} value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Opposite Bank of India, Main Road" />
                            </div>

                            {/* Pin Drop Map */}
                            <ClientPinDropMap
                                geocodeQuery={[
                                    form.building_name,
                                    form.address,
                                    form.locality,
                                    form.pincode
                                ].filter(Boolean).join(', ')}
                                localityQuery={form.locality || ''}
                                initialLat={form.lat}
                                initialLng={form.lng}
                                onChange={({ lat, lng }) => setForm(p => ({ ...p, lat, lng }))}
                                height="220px"
                                label="📍 Confirm your pin on map"
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={S.label}>Property Type</label>
                                    <select style={{ ...S.input, appearance: 'none', background: 'rgba(30,41,59,0.9)' }} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                                        <option value="apartment">Apartment</option>
                                        <option value="house">House</option>
                                        <option value="office">Office</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={S.label}>City *</label>
                                    <input style={S.input} value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="Mumbai..." />
                                </div>
                            </div>
                        </>
                    )}

                    <button onClick={handleSave} disabled={saving} style={{
                        padding: '14px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)', border: 'none',
                        borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1,
                        marginTop: 8
                    }}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (selectedExisting ? 'Link Property' : 'Save Address')}
                    </button>
                </div>
            </Modal>
        )
    }

    return (
        <Modal title="My Properties" onClose={onClose}>
            {loading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    Loading addresses...
                </div>
            ) : properties.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                    <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p style={{ margin: 0, fontSize: 14 }}>You haven't added any properties yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {properties.map(p => (
                        <div key={p.id} style={{ 
                            background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '16px',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: '#f8fafc', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {[p.flat_number, p.building_name, p.address].filter(Boolean).join(', ')}
                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', textTransform: 'capitalize' }}>
                                            {p.property_type || 'Property'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                        {[p.locality, p.city, p.pincode].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                                <button onClick={() => handleUnlink(p.id)} style={{ 
                                    background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', 
                                    width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                                }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button onClick={() => setView('add')} style={{
                width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, color: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
                <Plus size={18} /> Add New Property
            </button>
        </Modal>
    )
}

export default function ProfilePage() {
    const router = useRouter()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // 'edit' | 'address' | 'payment' | 'settings' | 'help'
    const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '' })
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')
    const [photoUploading, setPhotoUploading] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const customerId = localStorage.getItem('customerId') || ''
                const response = await fetch(`/api/customer/profile?customerId=${customerId}&_t=${Date.now()}`, { cache: 'no-store' })
                const data = await response.json()
                const c = data.customer || { name: localStorage.getItem('customerName') || 'Customer', mobile: localStorage.getItem('customerMobile') || '' }
                setCustomer(c)
                setEditForm({ name: c.name || '', email: c.email || '', mobile: c.mobile || '' })
            } catch (err) {
                console.error('Profile fetch error:', err)
                setCustomer({ name: localStorage.getItem('customerName') || 'Customer', mobile: '' })
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to sign out?')) {
            localStorage.clear()
            router.push('/customer/login')
        }
    }

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoUploading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const fd = new FormData()
            fd.append('file', file)
            fd.append('bucket', 'media')
            fd.append('folder', 'customer-photos')
            
            // 1. Upload to Storage
            const up = await fetch('/api/upload', { method: 'POST', body: fd })
            const upData = await up.json()
            if (!upData.success || !upData.url) throw new Error(upData.error || 'Failed to upload image file')
            
            // 2. Link to Profile
            const patchRes = await fetch('/api/customer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, image_url: upData.url }),
            })
            const patchData = await patchRes.json()
            if (!patchData.success) throw new Error(patchData.error || 'Failed to link image to profile')

            // 3. Update UI only if successful
            setCustomer(prev => ({ ...prev, image_url: upData.url }))
        } catch (err) {
            console.error('Photo upload error:', err)
            alert(err.message || 'Something went wrong uploading your photo. Please try again.')
        } finally {
            setPhotoUploading(false)
        }
    }

    const handlePhotoRemove = async () => {
        if (!window.confirm('Remove your profile photo?')) return
        const customerId = localStorage.getItem('customerId')
        await fetch('/api/customer/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, image_url: null }),
        })
        setCustomer(prev => ({ ...prev, image_url: null }))
    }

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const r = await fetch('/api/customer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, name: editForm.name, email: editForm.email }),
            })
            const d = await r.json()
            if (d.success || r.ok) {
                setCustomer(prev => ({ ...prev, name: editForm.name, email: editForm.email }))
                localStorage.setItem('customerName', editForm.name)
                setSaveMsg('Profile updated!')
                setTimeout(() => { setSaveMsg(''); setModal(null) }, 1200)
            } else {
                setSaveMsg(d.error || 'Unable to save right now')
            }
        } catch {
            setSaveMsg('Unable to save right now. Check your internet connection.')
            setTimeout(() => { setSaveMsg(''); setModal(null) }, 1200)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div style={{
                margin: '0 -20px 0 -20px', padding: '40px 20px 30px',
                background: 'linear-gradient(180deg, rgba(56,189,248,0.1), transparent)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
            }}>
                {/* Tappable avatar */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <label htmlFor="profile-photo-input" style={{ cursor: 'pointer', display: 'block' }}>
                        {customer?.image_url ? (
                            <img
                                src={customer.image_url}
                                alt="Profile"
                                style={{ width: 96, height: 96, borderRadius: '32px', objectFit: 'cover', boxShadow: '0 10px 30px rgba(56,189,248,0.3)' }}
                            />
                        ) : (
                            <div style={{
                                width: 96, height: 96, borderRadius: '32px',
                                background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 40, fontWeight: 800, color: '#fff',
                                boxShadow: '0 10px 30px rgba(139,92,246,0.4)',
                            }}>
                                {customer?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                        {/* Camera overlay */}
                        <div style={{
                            position: 'absolute', bottom: -4, right: -4,
                            width: 30, height: 30, borderRadius: '50%',
                            background: '#38bdf8', border: '2px solid #0f172a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {photoUploading
                                ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                                : <Camera size={14} color="#fff" />}
                        </div>
                    </label>
                    <input id="profile-photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                    {customer?.image_url && (
                        <button onClick={handlePhotoRemove} style={{
                            position: 'absolute', top: -4, left: -4,
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.9)', border: '2px solid #0f172a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                            <X size={12} color="#fff" />
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px 0' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                        {customer?.name || 'Sorted Customer'}
                    </h1>
                    <button onClick={() => setModal('edit')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
                        <Edit2 size={16} />
                    </button>
                </div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>{customer?.mobile || customer?.email || ''}</p>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 12px', borderRadius: 20, color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                    <ShieldCheck size={14} /> Sorted Member
                </div>
            </div>

            {/* Account Group */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                <SettingsRow icon={MapPin} color="#f59e0b" label="My Properties" onClick={() => setModal('address')} />
                <SettingsRow divider icon={CreditCard} color="#8b5cf6" label="Payment Methods" onClick={() => setModal('payment')} />
            </div>

            {/* Support Group */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                <SettingsRow icon={Bell} color="#f59e0b" label="Notifications" onClick={() => setModal('notif')} />
                <SettingsRow divider icon={Star} color="#10b981" label="Rate Sorted Solutions" onClick={() => window.open('https://g.page/r/CZ155hCgBae2EBM/review', '_blank')} />
                <SettingsRow divider icon={LifeBuoy} color="#38bdf8" label="Help & Support" onClick={() => setModal('help')} />
            </div>

            {/* Logout */}
            <button onClick={handleLogout} style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 24, padding: '16px', color: '#ef4444', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            }}>
                <LogOut size={18} /> Sign Out
            </button>

            <div style={{ textAlign: 'center', paddingBottom: 24, color: '#334155', fontSize: 12 }}>
                Sorted Solutions v2.0
            </div>

            {/* ── MODALS ── */}

            {/* Edit Profile */}
            {modal === 'edit' && (
                <Modal title="Edit Profile" onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={S.label}>Full Name</label>
                            <input style={S.input} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                        </div>
                        <div>
                            <label style={S.label}>Email Address</label>
                            <input style={S.input} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" type="email" />
                        </div>
                        <div>
                            <label style={S.label}>Phone Number</label>
                            <input style={{ ...S.input, opacity: 0.5 }} value={editForm.mobile} disabled readOnly placeholder="Registered mobile" />
                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Contact support to change your phone number</p>
                        </div>
                        {saveMsg && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', color: '#10b981', fontSize: 13 }}>{saveMsg}</div>}
                        <button onClick={handleSaveProfile} disabled={saving} style={{
                            padding: '14px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)', border: 'none',
                            borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Address info */}
            {modal === 'address' && (
                <PropertyManagerModal onClose={() => setModal(null)} />
            )}

            {/* Payment Methods info */}
            {modal === 'payment' && (
                <Modal title="Payment Methods" onClose={() => setModal(null)}>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CreditCard size={48} color="#10b981" style={{ marginBottom: 16, opacity: 0.8 }} />
                        <h3 style={{ color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>Secure Online Payments</h3>
                        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                            You can now pay for your completed services instantly via UPI, Cards, or Netbanking securely using Razorpay. Look for the "Pay Online" button on your completed service requests.
                        </p>
                    </div>
                    <button onClick={() => setModal(null)} style={{
                        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Close</button>
                </Modal>
            )}

            {/* Notifications */}
            {modal === 'notif' && (
                <Modal title="Notifications" onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { label: 'Job updates', desc: 'Technician assignments, visit confirmations', on: true },
                            { label: 'Reminders', desc: 'Upcoming service visits and warrantiy expiry', on: true },
                            { label: 'Offers & promotions', desc: 'Discounts and new plan announcements', on: false },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{item.label}</div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                                </div>
                                <div style={{
                                    width: 44, height: 24, borderRadius: 12,
                                    background: item.on ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                                    position: 'relative', cursor: 'pointer',
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 3, left: item.on ? 23 : 3,
                                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                        transition: 'left 0.2s',
                                    }} />
                                </div>
                            </div>
                        ))}
                        <p style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>Manage notification permissions in your phone settings → Sorted app.</p>
                    </div>
                </Modal>
            )}

            {/* Help */}
            {modal === 'help' && (
                <Modal title="Help & Support" onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <a href="tel:+919999999999" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 16, padding: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Phone size={18} color="#38bdf8" />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Call Support</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>Mon–Sat, 9 AM – 7 PM</div>
                            </div>
                        </a>
                        <a href="mailto:support@sortedsolutions.in" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mail size={18} color="#8b5cf6" />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Email Us</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>support@sortedsolutions.in</div>
                            </div>
                        </a>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>FAQ</div>
                            {[
                                'How do I cancel a service request?',
                                'When will my technician arrive?',
                                'How do I add a new appliance?',
                            ].map(q => (
                                <div key={q} style={{ fontSize: 13, color: '#cbd5e1', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function SettingsRow({ icon: Icon, color, label, onClick, divider }) {
    return (
        <div style={{ padding: '0 20px' }}>
            {divider && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 48 }} />}
            <button onClick={onClick} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', padding: '16px 0', cursor: 'pointer',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
                </div>
                <ChevronRight size={18} color="#475569" />
            </button>
        </div>
    )
}
