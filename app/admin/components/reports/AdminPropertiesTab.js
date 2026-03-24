'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Users, Wrench, Plus, Search, X, ChevronRight, Link, Unlink, Calendar, Clock, Home, Trash2, Activity, MessageSquare, RefreshCw } from 'lucide-react'

const MUMBAI_LOCALITIES = [
    { name: 'Aarey Colony', pincode: '400065' }, { name: 'Airoli', pincode: '400708' },
    { name: 'Andheri East', pincode: '400069' }, { name: 'Andheri West', pincode: '400058' },
    { name: 'Antop Hill', pincode: '400037' }, { name: 'Bandra East', pincode: '400051' },
    { name: 'Bandra West', pincode: '400050' }, { name: 'BKC / Bandra Kurla Complex', pincode: '400051' },
    { name: 'Borivali East', pincode: '400066' }, { name: 'Borivali West', pincode: '400092' },
    { name: 'Breach Candy', pincode: '400026' }, { name: 'Bhandup East', pincode: '400042' },
    { name: 'Bhandup West', pincode: '400078' }, { name: 'Byculla', pincode: '400027' },
    { name: 'Chakala', pincode: '400059' }, { name: 'Chandivali', pincode: '400072' },
    { name: 'Chembur', pincode: '400071' }, { name: 'Colaba', pincode: '400005' },
    { name: 'CST / Fort', pincode: '400001' }, { name: 'Cuffe Parade', pincode: '400005' },
    { name: 'Dahisar East', pincode: '400068' }, { name: 'Dahisar West', pincode: '400068' },
    { name: 'Dadar East', pincode: '400014' }, { name: 'Dadar West', pincode: '400028' },
    { name: 'Dharavi', pincode: '400017' }, { name: 'Ghatkopar East', pincode: '400077' },
    { name: 'Ghatkopar West', pincode: '400086' }, { name: 'Goregaon East', pincode: '400063' },
    { name: 'Goregaon West', pincode: '400062' }, { name: 'Grant Road', pincode: '400007' },
    { name: 'Jogeshwari East', pincode: '400060' }, { name: 'Jogeshwari West', pincode: '400102' },
    { name: 'Juhu', pincode: '400049' }, { name: 'Kandivali East', pincode: '400101' },
    { name: 'Kandivali West', pincode: '400067' }, { name: 'Kanjurmarg East', pincode: '400042' },
    { name: 'Khar East', pincode: '400052' }, { name: 'Khar West', pincode: '400052' },
    { name: 'Kurla East', pincode: '400024' }, { name: 'Kurla West', pincode: '400070' },
    { name: 'Lokhandwala', pincode: '400053' }, { name: 'Lower Parel', pincode: '400013' },
    { name: 'Malad East', pincode: '400097' }, { name: 'Malad West', pincode: '400064' },
    { name: 'Marine Lines', pincode: '400002' }, { name: 'Marol', pincode: '400059' },
    { name: 'Matunga', pincode: '400019' }, { name: 'Mulund East', pincode: '400081' },
    { name: 'Mulund West', pincode: '400080' }, { name: 'Mumbai Central', pincode: '400008' },
    { name: 'Nariman Point', pincode: '400021' }, { name: 'Oshiwara', pincode: '400102' },
    { name: 'Powai', pincode: '400076' }, { name: 'Sakinaka', pincode: '400072' },
    { name: 'Santacruz East', pincode: '400055' }, { name: 'Santacruz West', pincode: '400054' },
    { name: 'Sion', pincode: '400022' }, { name: 'Thane East', pincode: '400603' },
    { name: 'Thane West', pincode: '400601' }, { name: 'Turbhe', pincode: '400705' },
    { name: 'Vashi', pincode: '400703' }, { name: 'Versova', pincode: '400061' },
    { name: 'Vikhroli East', pincode: '400079' }, { name: 'Vikhroli West', pincode: '400083' },
    { name: 'Vile Parle East', pincode: '400057' }, { name: 'Vile Parle West', pincode: '400056' },
    { name: 'Wadala', pincode: '400037' }, { name: 'Worli', pincode: '400018' },
    { name: 'Mira Road', pincode: '401107' },
]

const S = {
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, cursor: 'pointer', transition: 'all 0.15s' },
    badge: (col) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col + '20', color: col }),
    btn: (col = '#38bdf8') => ({ padding: '10px 16px', background: col + '15', border: `1px solid ${col}30`, borderRadius: 10, color: col, fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
    label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
}

export default function AdminPropertiesTab() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null) // property detail panel
    const [detailLoading, setDetailLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [propertyInteractions, setPropertyInteractions] = useState([])
    const [intLoading, setIntLoading] = useState(false)

    useEffect(() => { fetchProperties() }, [])

    const fetchProperties = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/properties')
            const data = await res.json()
            setProperties(data.data || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const openDetail = async (prop) => {
        setSelected({ ...prop, tenants: [], jobs: [] })
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

    const handleDelete = async () => {
        if (!window.confirm(`Delete property "${[selected.flat_number, selected.building_name, selected.address].filter(Boolean).join(', ')}"?\n\nThis is permanent and only allowed if no customers are linked and no job history exists.`)) return
        const res = await fetch(`/api/admin/properties?id=${selected.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!data.success) {
            alert(data.error || 'Delete failed')
            return
        }
        setSelected(null)
        fetchProperties()
    }

    const filtered = properties.filter(p => {
        const q = search.toLowerCase()
        return !q ||
            (p.flat_number || '').toLowerCase().includes(q) ||
            (p.building_name || '').toLowerCase().includes(q) ||
            (p.address || '').toLowerCase().includes(q) ||
            (p.locality || '').toLowerCase().includes(q) ||
            (p.city || '').toLowerCase().includes(q) ||
            (p.pincode || '').includes(q)
    })

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'

    return (
        <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: 0 }}>Properties</h1>
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{properties.length} properties managed</p>
                </div>
                <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    <Plus size={16} /> Add Property
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by address, locality, pincode..." style={{ ...S.input, paddingLeft: 36 }} />
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
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={18} color="#38bdf8" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                                    {[prop.flat_number, prop.building_name, prop.address].filter(Boolean).join(', ')}
                                </div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{[prop.locality, prop.city, prop.pincode].filter(Boolean).join(', ')}</div>
                                    {prop.lastJob && (
                                        <div style={{ marginTop: 6 }}>
                                            <span style={S.badge('#64748b')}><Wrench size={10} /> Last: {prop.lastJob.category} · {formatDate(prop.lastJob.created_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ChevronRight size={16} color="#475569" style={{ flexShrink: 0 }} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Detail Panel (slide-in) ── */}
            {selected && (
                <>
                    <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
                    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1e293b,#0f172a)', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 201, overflowY: 'auto', padding: '28px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                                    {[selected.flat_number, selected.building_name, selected.address].filter(Boolean).join(', ')}
                                </h2>
                                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{[selected.locality, selected.city, selected.pincode].filter(Boolean).join(', ')}</p>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {detailLoading ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading...</div> : (
                            <>
                                {/* Current Tenants */}
                                <Section title="Linked Customers" icon={<Users size={14} color="#38bdf8" />}>
                                    {(selected.tenants || []).filter(t => t.is_active).length === 0 ? (
                                        <p style={{ color: '#475569', fontSize: 13 }}>No linked customers.</p>
                                    ) : (
                                        (selected.tenants || []).filter(t => t.is_active).map(t => (
                                            <TenantRow key={t.id} tenant={t} onUnlink={() => handleUnlink(t.id)} />
                                        ))
                                    )}
                                </Section>

                                {/* Past Tenants */}
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

                                {/* Interactions Timeline */}
                                <Section
                                    title="Interactions"
                                    icon={<Activity size={14} color="#f59e0b" />}
                                    action={
                                        <button
                                            onClick={() => refreshInteractions(selected.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, display: 'flex', alignItems: 'center' }}
                                            title="Refresh"
                                        >
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

                                {/* Delete zone */}
                                <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ fontSize: 11, color: '#475569', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                                        ⚠️ Deletion is only allowed when no customers are linked (active or past) and no service history exists.
                                    </p>
                                    <button
                                        onClick={handleDelete}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                    >
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
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
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
    const [form, setForm] = useState({ flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '', property_type: 'residential' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [duplicate, setDuplicate] = useState(null) // existing property if duplicate found

    const handleLocalityChange = (e) => {
        const name = e.target.value
        const match = MUMBAI_LOCALITIES.find(l => l.name === name)
        setForm(p => ({ ...p, locality: name, pincode: match ? match.pincode : p.pincode, city: 'Mumbai' }))
    }

    const handleSave = async (forceCreate = false) => {
        if (!form.address) { setError('Street address is required'); return }
        setSaving(true)
        setDuplicate(null)
        try {
            const body = forceCreate ? { ...form, force_create: true } : form
            const res = await fetch('/api/admin/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.duplicate) {
                setDuplicate(data.existing)
                setError(data.error)
                setSaving(false)
                return
            }
            if (!data.success) throw new Error(data.error)
            onSaved()
        } catch (e) { setError(e.message) }
        finally { setSaving(false) }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'linear-gradient(180deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
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
                    {[
                        { key: 'address', label: 'Street Address / Area *' },
                    ].map(f => (
                        <div key={f.key}>
                            <div style={S.label}>{f.label}</div>
                            <input style={S.input} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                        </div>
                    ))}
                    <div>
                        <div style={S.label}>Locality</div>
                        <select
                            style={{ ...S.input, appearance: 'none', background: 'rgba(30,41,59,0.9)' }}
                            value={form.locality}
                            onChange={handleLocalityChange}
                        >
                            <option value="">Select locality...</option>
                            {MUMBAI_LOCALITIES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={S.label}>City</div>
                            <input style={{ ...S.input, opacity: 0.6 }} value={form.city} readOnly />
                        </div>
                        <div>
                            <div style={S.label}>Pincode</div>
                            <input style={{ ...S.input, opacity: 0.6 }} value={form.pincode} readOnly placeholder="Auto-filled" />
                        </div>
                    </div>
                    <div>
                        <div style={S.label}>Property Type</div>
                        <select style={S.input} value={form.property_type} onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}>
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>
                    {/* Duplicate warning */}
                    {duplicate && (
                        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>⚠️ Property Already Exists</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                                {[duplicate.flat_number, duplicate.building_name, duplicate.address].filter(Boolean).join(', ')}<br />
                                {[duplicate.locality, duplicate.city, duplicate.pincode].filter(Boolean).join(', ')}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { onSaved(); onClose() }} style={{ flex: 1, padding: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    OK, use existing
                                </button>
                                <button onClick={() => handleSave(true)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                                    Create new anyway
                                </button>
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
