'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Users, Wrench, Plus, Search, X, ChevronRight, Unlink, Calendar, Clock, Home, Trash2, Activity, RefreshCw, Link2, UserPlus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { MUMBAI_LOCALITIES, getPincodeForLocality } from '@/lib/data/mumbaiLocalities'
import LocalityCombobox from '@/components/common/LocalityCombobox'

const ClientPinDropMap = dynamic(() => import('@/components/common/PinDropMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '200px', width: '100%', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
            🗺️ Loading map...
        </div>
    )
})


const S = {
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, cursor: 'pointer', transition: 'all 0.15s' },
    badge: (col) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col + '20', color: col }),
    btn: (col = '#38bdf8') => ({ padding: '10px 16px', background: col + '15', border: `1px solid ${col}30`, borderRadius: 10, color: col, fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
    label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'

function getMapsUrl(prop) {
    if (!prop) return '#'
    if (prop.latitude && prop.longitude) return `https://www.google.com/maps?q=${prop.latitude},${prop.longitude}`
    const addr = [prop.flat_number, prop.building_name, prop.address, prop.locality, prop.city].filter(Boolean).join(', ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
}

export default function AdminPropertiesTab() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [propertyInteractions, setPropertyInteractions] = useState([])
    const [intLoading, setIntLoading] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [allProperties, setAllProperties] = useState([]) // full unfiltered list for instant search
    const searchTimerRef = useRef(null)

    // Edit state
    const [editMode, setEditMode] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [copied, setCopied] = useState(false)

    // Link customer to property
    const [showLinkCustomer, setShowLinkCustomer] = useState(false)

    useEffect(() => { fetchProperties() }, [])

    const fetchProperties = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/properties')
            const data = await res.json()
            const list = data.data || []
            setProperties(list)
            setAllProperties(list) // keep master copy for instant search
            setTotalCount(data.total ?? list.length)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    // Instant client-side search against the full loaded list
    const handleSearchChange = (val) => {
        setSearch(val)
        if (!val.trim()) {
            setProperties(allProperties)
            return
        }
        const q = val.trim().toLowerCase()
        const results = allProperties.filter(p =>
            (p.flat_number || '').toLowerCase().includes(q) ||
            (p.building_name || '').toLowerCase().includes(q) ||
            (p.address || '').toLowerCase().includes(q) ||
            (p.locality || '').toLowerCase().includes(q) ||
            (p.city || '').toLowerCase().includes(q) ||
            (p.pincode || '').includes(q)
        )
        setProperties(results)
    }

    const openDetail = async (prop) => {
        setSelected({ ...prop, tenants: [], jobs: [] })
        setEditMode(false)
        setEditForm(null)
        setSaveError('')
        setCopied(false)
        setPropertyInteractions([])
        setDetailLoading(true)
        try {
            const [detailRes, intRes] = await Promise.all([
                fetch(`/api/admin/properties?id=${prop.id}`),
                fetch(`/api/admin/interactions?property_id=${prop.id}&limit=100&_t=${Date.now()}`, { cache: 'no-store' }),
            ])
            const data = await detailRes.json()
            const intData = await intRes.json().catch(() => ({ data: [] }))
            setSelected(data.data)
            setPropertyInteractions(intData.data || [])
        } catch (e) { console.error(e) }
        finally { setDetailLoading(false) }
    }

    const startEdit = () => {
        setEditForm({
            flat_number: selected.flat_number || '',
            building_name: selected.building_name || '',
            address: selected.address || '',
            locality: selected.locality || '',
            city: selected.city || 'Mumbai',
            pincode: selected.pincode || '',
            property_type: selected.property_type || 'residential',
            lat: selected.latitude || null,
            lng: selected.longitude || null,
        })
        setSaveError('')
        setEditMode(true)
    }

    const handleEditLocalityChange = (e) => {
        const name = e.target.value
        const pin = getPincodeForLocality(name)
        setEditForm(p => ({ ...p, locality: name, pincode: pin || p.pincode, city: 'Mumbai' }))
    }

    const handleSaveEdit = async () => {
        if (!editForm.address) { setSaveError('Street address is required'); return }
        setSaving(true)
        setSaveError('')
        try {
            const res = await fetch(`/api/admin/properties?id=${selected.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flat_number: editForm.flat_number,
                    building_name: editForm.building_name,
                    address: editForm.address,
                    locality: editForm.locality,
                    city: editForm.city,
                    pincode: editForm.pincode,
                    property_type: editForm.property_type,
                    latitude: editForm.lat,
                    longitude: editForm.lng,
                })
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Save failed')
            setEditMode(false)
            await openDetail({ id: selected.id })
            fetchProperties()
        } catch (e) { setSaveError(e.message) }
        finally { setSaving(false) }
    }

    const refreshInteractions = async (propId) => {
        setIntLoading(true)
        try {
            const res = await fetch(`/api/admin/interactions?property_id=${propId}&limit=100&_t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json()
            setPropertyInteractions(data.data || [])
        } catch (e) { console.error(e) }
        finally { setIntLoading(false) }
    }

    const handleUnlink = async (linkId) => {
        if (!window.confirm('Unlink this customer from the property? Their service history will be preserved.')) return
        await fetch('/api/admin/properties/unlink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_id: linkId }) })
        openDetail(selected)
        fetchProperties()
    }

    const handleDelete = async (force = false) => {
        const propertyLabel = [selected.flat_number, selected.building_name, selected.address].filter(Boolean).join(', ')
        if (!force) {
            if (!window.confirm(`Delete property "${propertyLabel}"?\n\nThis is permanent. The property will be removed.`)) return
        } else {
            if (!window.confirm(`⚠️ FORCE DELETE "${propertyLabel}"?\n\nThis will unlink all customers and remove job references before deleting.\n\nContinue?`)) return
        }
        const url = `/api/admin/properties?id=${selected.id}${force ? '&force=true' : ''}`
        const res = await fetch(url, { method: 'DELETE' })
        const data = await res.json()
        if (!data.success) {
            if (data.canForce) {
                // Offer force delete
                const yes = window.confirm(`${data.error}\n\nDo you want to force delete? This will remove all ${data.customerCount} customer link(s) and then delete the property.`)
                if (yes) handleDelete(true)
            } else {
                alert(data.error || 'Delete failed')
            }
            return
        }
        setSelected(null)
        fetchProperties()
    }

    const handleShareLocation = async () => {
        const url = getMapsUrl(selected)
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch {
            window.prompt('Copy this link:', url)
        }
    }

    // Server-side search is active — `properties` is already filtered by the DB when `search` is non-empty.
    // When empty, all properties up to 2000 are returned. No client-side filtering needed.
    const filtered = properties

    return (
        <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: 0 }}>Properties</h1>
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                        {search.trim()
                            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`
                            : `${totalCount} properties total`
                        }
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    <Plus size={16} /> Add Property
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search by address, building, locality, pincode..."
                    style={{ ...S.input, paddingLeft: 36, paddingRight: search ? 36 : 12 }}
                />
                {search && (
                    <button
                        onClick={() => handleSearchChange('')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Property List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#475569', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
                    <Home size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p>No properties found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(prop => (
                        <div key={prop.id} onClick={() => openDetail(prop)} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: prop.latitude ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={18} color={prop.latitude ? '#10b981' : '#f59e0b'} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                                        {[prop.flat_number, prop.building_name, prop.address].filter(Boolean).join(', ')}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{[prop.locality, prop.city, prop.pincode].filter(Boolean).join(', ')}</div>
                                    <div style={{ fontSize: 11, marginTop: 4, color: prop.latitude ? '#10b981' : '#f59e0b' }}>
                                        {prop.latitude ? '📍 Pin saved' : '⚠️ No pin — click to add'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={16} color="#475569" style={{ flexShrink: 0 }} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Detail Panel ── */}
            {selected && (
                <>
                    <div onClick={() => { setSelected(null); setEditMode(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
                    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 500, background: 'linear-gradient(180deg,#1e293b,#0f172a)', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 201, overflowY: 'auto', padding: '24px 20px' }}>

                        {/* Panel header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.3 }}>
                                    {[selected.flat_number, selected.building_name, selected.address].filter(Boolean).join(', ')}
                                </h2>
                                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                                    {[selected.locality, selected.city, selected.pincode].filter(Boolean).join(', ')}
                                </p>
                            </div>
                            <button onClick={() => { setSelected(null); setEditMode(false) }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, marginLeft: 12 }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            {!editMode ? (
                                <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                    ✏️ Edit & Fix Pin
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleSaveEdit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                        {saving ? '⏳ Saving...' : '💾 Save Changes'}
                                    </button>
                                    <button onClick={() => { setEditMode(false); setSaveError('') }} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowLinkCustomer(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, color: '#38bdf8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <UserPlus size={14} /> Link Customer
                            </button>
                            <a href={getMapsUrl(selected)} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                                🗺️ Google Maps
                            </a>
                            <button onClick={handleShareLocation} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.1)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 8, color: copied ? '#10b981' : '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                {copied ? '✅ Copied!' : '🔗 Share Location'}
                            </button>
                        </div>

                        {/* Link Customer Modal */}
                        {showLinkCustomer && (
                            <LinkCustomerModal
                                propertyId={selected.id}
                                linkedAccountIds={(selected.tenants || []).filter(t => t.is_active).map(t => t.customer?.id).filter(Boolean)}
                                onClose={() => setShowLinkCustomer(false)}
                                onLinked={() => {
                                    setShowLinkCustomer(false)
                                    openDetail({ id: selected.id })
                                    fetchProperties()
                                }}
                            />
                        )}

                        {saveError && (
                            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                                {saveError}
                            </div>
                        )}

                        {detailLoading ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading...</div> : (
                            <>
                                {/* ── EDIT MODE ── */}
                                {editMode && editForm && (
                                    <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>✏️ Edit Property</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div>
                                                    <div style={S.label}>Flat / Wing</div>
                                                    <input style={S.input} value={editForm.flat_number} onChange={e => setEditForm(p => ({ ...p, flat_number: e.target.value }))} placeholder="e.g. A-402" />
                                                </div>
                                                <div>
                                                    <div style={S.label}>Building Name</div>
                                                    <input style={S.input} value={editForm.building_name} onChange={e => setEditForm(p => ({ ...p, building_name: e.target.value }))} placeholder="e.g. Sunrise" />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={S.label}>Street Address / Area *</div>
                                                <input style={S.input} value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                                            </div>
                                            <div>
                                                <div style={S.label}>Locality</div>
                                                <LocalityCombobox
                                                    value={editForm.locality}
                                                    pincode={editForm.pincode}
                                                    onChange={(loc, pin) => setEditForm(p => ({ ...p, locality: loc, pincode: pin || p.pincode, city: loc && loc !== '__other__' ? 'Mumbai' : p.city }))}
                                                    inputStyle={{ ...S.input, paddingLeft: 14 }}
                                                    dropdownZIndex={300}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div>
                                                    <div style={S.label}>City</div>
                                                    <input style={{ ...S.input, opacity: 0.6 }} value={editForm.city} readOnly />
                                                </div>
                                                <div>
                                                    <div style={S.label}>Pincode</div>
                                                    <input style={S.input} value={editForm.pincode} onChange={e => setEditForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g,'').slice(0,6) }))} placeholder="Auto-filled · edit if wrong" maxLength={6} />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={S.label}>Property Type</div>
                                                <select style={S.input} value={editForm.property_type} onChange={e => setEditForm(p => ({ ...p, property_type: e.target.value }))}>
                                                    <option value="residential">Residential</option>
                                                    <option value="commercial">Commercial</option>
                                                </select>
                                            </div>
                                            <ClientPinDropMap
                                                label="📍 Drag red pin to exact location"
                                                building={editForm.building_name}
                                                street={editForm.address}
                                                localityQuery={editForm.locality}
                                                pincodeQuery={editForm.pincode}
                                                initialLat={editForm.lat}
                                                initialLng={editForm.lng}
                                                onChange={({ lat, lng }) => setEditForm(p => ({ ...p, lat, lng }))}
                                                height="220px"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ── READ MODE: Map ── */}
                                {!editMode && (
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} color="#38bdf8" /> Location Pin</span>
                                            {selected.latitude && selected.longitude && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)' }}>📍 Precise</span>
                                            )}
                                        </div>
                                        {selected.latitude && selected.longitude ? (
                                            <ClientPinDropMap
                                                readOnly={true}
                                                initialLat={selected.latitude}
                                                initialLng={selected.longitude}
                                                height="200px"
                                            />
                                        ) : (
                                            <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.25)', borderRadius: 12, fontSize: 13, color: '#f59e0b', gap: 8 }}>
                                                ⚠️ No pin — click <strong style={{ marginLeft: 4 }}>"✏️ Edit & Fix Pin"</strong> above
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Linked Customers */}
                                <Section title="Linked Customers" icon={<Users size={14} color="#38bdf8" />}>
                                    {(selected.tenants || []).filter(t => t.is_active).length === 0 ? (
                                        <p style={{ color: '#475569', fontSize: 13 }}>No linked customers.</p>
                                    ) : (
                                        (selected.tenants || []).filter(t => t.is_active).map(t => (
                                            <TenantRow key={t.id} tenant={t} onUnlink={() => handleUnlink(t.id)} />
                                        ))
                                    )}
                                </Section>

                                {(selected.tenants || []).filter(t => !t.is_active).length > 0 && (
                                    <Section title="Past Links" icon={<Clock size={14} color="#64748b" />}>
                                        {(selected.tenants || []).filter(t => !t.is_active).map(t => (
                                            <TenantRow key={t.id} tenant={t} past />
                                        ))}
                                    </Section>
                                )}

                                {/* Service History */}
                                <Section title="Service History" icon={<Wrench size={14} color="#8b5cf6" />}>
                                    {(selected.jobs || []).length === 0 ? (
                                        <p style={{ color: '#475569', fontSize: 13 }}>No services yet.</p>
                                    ) : (
                                        (selected.jobs || []).map(job => (
                                            <div key={job.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                                        {[job.category, job.subcategory].filter(Boolean).join(' › ') || 'Service'}
                                                        {job.job_number && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>#{job.job_number}</span>}
                                                    </div>
                                                    <span style={S.badge(job.status === 'completed' ? '#10b981' : job.status === 'cancelled' ? '#ef4444' : '#f59e0b')}>{job.status}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{job.customer_name} · {formatDate(job.created_at)}</div>
                                            </div>
                                        ))
                                    )}
                                </Section>

                                {/* Interactions */}
                                <Section
                                    title="Interactions"
                                    icon={<Activity size={14} color="#f59e0b" />}
                                    action={
                                        <button onClick={() => refreshInteractions(selected.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, display: 'flex', alignItems: 'center' }} title="Refresh">
                                            <RefreshCw size={12} style={{ animation: intLoading ? 'spin 1s linear infinite' : 'none' }} />
                                        </button>
                                    }
                                >
                                    {propertyInteractions.length === 0 ? (
                                        <p style={{ color: '#475569', fontSize: 13 }}>No interactions recorded yet.</p>
                                    ) : (
                                        propertyInteractions.map(int => (
                                            <div key={int.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: int.category === 'property' ? '#f59e0b' : '#38bdf8', marginTop: 6, flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                                        {(int.type || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{int.description}</div>
                                                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                                                        {int.performed_by_name || 'System'} · {formatDate(int.timestamp || int.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </Section>

                                {/* Delete */}
                                <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ fontSize: 11, color: '#475569', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                                        ⚠️ Deletion is only allowed when no customers are linked (active or past) and no service history exists.
                                    </p>
                                    <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                        <Trash2 size={14} /> Delete Property
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Add Property Modal */}
            {showAddModal && <AddPropertyModal onClose={() => setShowAddModal(false)} onSaved={() => { fetchProperties(); setShowAddModal(false) }} />}
        </div>
    )
}

function Section({ title, icon, children, action }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {icon}
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
                </div>
                {action}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 14px' }}>
                {children}
            </div>
        </div>
    )
}

function TenantRow({ tenant, onUnlink, past }) {
    const c = tenant.customer
    const name = c?.name || c?.full_name || 'Unknown'
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: past ? '#64748b' : '#e2e8f0' }}>{name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                    {formatDate(tenant.linked_at)} {past && tenant.unlinked_at ? `→ ${formatDate(tenant.unlinked_at)}` : '→ Present'}
                </div>
            </div>
            {!past && onUnlink && (
                <button onClick={onUnlink} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 10px', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Unlink size={11} /> Unlink
                </button>
            )}
        </div>
    )
}

function AddPropertyModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '', property_type: 'residential', lat: null, lng: null })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [duplicate, setDuplicate] = useState(null)

    const handleLocalityChange = (e) => {
        const name = e.target.value
        const pin = getPincodeForLocality(name)
        setForm(p => ({ ...p, locality: name, pincode: pin || p.pincode, city: 'Mumbai' }))
    }

    const handleSave = async (forceCreate = false) => {
        if (!form.address) { setError('Street address is required'); return }
        setSaving(true)
        setDuplicate(null)
        try {
            const body = forceCreate
                ? { ...form, latitude: form.lat, longitude: form.lng, force_create: true }
                : { ...form, latitude: form.lat, longitude: form.lng }
            const res = await fetch('/api/admin/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.duplicate) { setDuplicate(data.existing); setError(data.error); setSaving(false); return }
            if (!data.success) throw new Error(data.error)
            onSaved()
        } catch (e) { setError(e.message) }
        finally { setSaving(false) }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'linear-gradient(180deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ color: '#f8fafc', fontWeight: 800, margin: 0 }}>Add Property</h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={S.label}>Flat / Wing</div>
                            <input style={S.input} value={form.flat_number} onChange={e => setForm(p => ({ ...p, flat_number: e.target.value }))} placeholder="e.g. A-402" />
                        </div>
                        <div>
                            <div style={S.label}>Building Name</div>
                            <input style={S.input} value={form.building_name} onChange={e => setForm(p => ({ ...p, building_name: e.target.value }))} placeholder="e.g. Sunrise Residency" />
                        </div>
                    </div>
                    <div>
                        <div style={S.label}>Street Address / Area *</div>
                        <input style={S.input} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    </div>

                    {/* Pin Drop Map */}
                    <ClientPinDropMap
                        label="📍 Confirm location on map"
                        building={form.building_name || ''}
                        street={form.address || ''}
                        localityQuery={form.locality || ''}
                        pincodeQuery={form.pincode || ''}
                        initialLat={form.lat}
                        initialLng={form.lng}
                        onChange={({ lat, lng }) => setForm(p => ({ ...p, lat, lng }))}
                        height="220px"
                    />
                    <div>
                        <div style={S.label}>Locality</div>
                        <LocalityCombobox
                            value={form.locality}
                            pincode={form.pincode}
                            onChange={(loc, pin) => setForm(p => ({ ...p, locality: loc, pincode: pin || p.pincode, city: loc && loc !== '__other__' ? 'Mumbai' : p.city }))}
                            inputStyle={{ ...S.input, paddingLeft: 14 }}
                            dropdownZIndex={350}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={S.label}>City</div>
                            <input style={{ ...S.input, opacity: 0.6 }} value={form.city} readOnly />
                        </div>
                        <div>
                            <div style={S.label}>Pincode</div>
                        <input style={S.input} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g,'').slice(0,6) }))} placeholder="Auto-filled · edit if wrong" maxLength={6} />
                        </div>
                    </div>
                    <div>
                        <div style={S.label}>Property Type</div>
                        <select style={S.input} value={form.property_type} onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}>
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>
                    {duplicate && (
                        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>⚠️ Property Already Exists</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                                {[duplicate.flat_number, duplicate.building_name, duplicate.address].filter(Boolean).join(', ')}<br />
                                {[duplicate.locality, duplicate.city, duplicate.pincode].filter(Boolean).join(', ')}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { onSaved(); onClose() }} style={{ flex: 1, padding: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK, use existing</button>
                                <button onClick={() => handleSave(true)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Create new anyway</button>
                            </div>
                        </div>
                    )}
                    {error && !duplicate && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
                    {!duplicate && <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: '13px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        {saving ? 'Checking...' : 'Save Property'}
                    </button>}
                </div>
            </div>
        </div>
    )
}

// ─── Link Customer to Property Modal ─────────────────────────────────────────
function LinkCustomerModal({ propertyId, linkedAccountIds, onClose, onLinked }) {
    const [query, setQuery] = useState('')
    const [allAccounts, setAllAccounts] = useState([])
    const [fetching, setFetching] = useState(true)
    const [linking, setLinking] = useState(null)
    const [justLinked, setJustLinked] = useState(new Set())
    const inputRef = useRef(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
        // Load all active customer accounts once
        fetch('/api/admin/accounts?type=customer')
            .then(r => r.json())
            .then(d => setAllAccounts(d.data || []))
            .catch(() => {})
            .finally(() => setFetching(false))
    }, [])

    const filtered = query.trim().length < 1
        ? allAccounts.filter(a => !linkedAccountIds.includes(a.id) && !justLinked.has(a.id))
        : allAccounts.filter(a => {
            if (linkedAccountIds.includes(a.id) || justLinked.has(a.id)) return false
            const q = query.trim().toLowerCase()
            return (
                (a.name || '').toLowerCase().includes(q) ||
                (a.mobile || a.phone || '').includes(q) ||
                (a.sku || '').toLowerCase().includes(q)
            )
        })

    const handleLink = async (account) => {
        setLinking(account.id)
        try {
            const res = await fetch('/api/admin/properties/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: account.id, property_id: propertyId }),
            })
            const data = await res.json()
            if (data.success) {
                setJustLinked(prev => new Set([...prev, account.id]))
                onLinked()
            } else {
                alert(data.error || 'Failed to link customer')
            }
        } catch {
            alert('Something went wrong.')
        } finally {
            setLinking(null)
        }
    }

    const inputStyle = {
        width: '100%',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '10px 12px 10px 38px',
        color: '#f8fafc',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
    }

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'linear-gradient(180deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserPlus size={18} color="#38bdf8" />
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>Link Customer</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={14} />
                    </button>
                </div>

                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Search for an existing customer account to link to this property.
                </p>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name, phone, SKU..."
                        style={inputStyle}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                    {fetching && (
                        <div style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 13 }}>Loading accounts...</div>
                    )}
                    {!fetching && filtered.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
                            {query ? `No customers found for "${query}"` : 'No available customers to link.'}
                        </div>
                    )}
                    {!fetching && filtered.slice(0, 50).map(acc => {
                        const isLinkingThis = linking === acc.id
                        const wasJustLinked = justLinked.has(acc.id)
                        return (
                            <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: wasJustLinked ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${wasJustLinked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, transition: 'all 0.2s' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800, color: '#818cf8' }}>
                                    {(acc.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        {acc.mobile || acc.phone ? `📞 ${acc.mobile || acc.phone}` : ''}
                                        {acc.sku ? ` · ${acc.sku}` : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleLink(acc)}
                                    disabled={isLinkingThis || wasJustLinked}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 12px',
                                        background: wasJustLinked ? 'rgba(16,185,129,0.15)' : isLinkingThis ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.12)',
                                        border: `1px solid ${wasJustLinked ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`,
                                        borderRadius: 8,
                                        color: wasJustLinked ? '#10b981' : '#38bdf8',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: (isLinkingThis || wasJustLinked) ? 'default' : 'pointer',
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {wasJustLinked ? (
                                        <><span style={{ fontSize: 12 }}>✓</span> Linked</>
                                    ) : isLinkingThis ? (
                                        <>⏳ Linking...</>
                                    ) : (
                                        <><Link2 size={12} /> Link</>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </div>
            </div>
        </div>
    )
}
