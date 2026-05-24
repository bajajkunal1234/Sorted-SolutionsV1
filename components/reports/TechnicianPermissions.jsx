'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, Save, Star, User, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, CheckCircle, Wrench } from 'lucide-react'

const DEFAULT_FIELDS = {
    show_photo: true,
    show_name: true,
    show_rating: true,
    show_experience: true,
    show_bio: false,
}

function StarRating({ value = 0, onChange }) {
    const [hover, setHover] = useState(0)
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(s => (
                <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                    <Star
                        size={22}
                        fill={(hover || value) >= s ? '#f59e0b' : 'none'}
                        color={(hover || value) >= s ? '#f59e0b' : 'var(--border-primary)'}
                    />
                </button>
            ))}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4, alignSelf: 'center' }}>{value > 0 ? `${value}/5` : 'Not rated'}</span>
        </div>
    )
}

function TechCard({ tech, onEdit }) {
    const fields = tech.customer_card_fields || DEFAULT_FIELDS
    const initials = (tech.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    return (
        <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16, padding: 20,
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'all 0.15s',
        }}
            onClick={() => onEdit(tech)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'none' }}
        >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {tech.photo_url
                    ? <img src={tech.photo_url} alt={tech.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>{initials}</div>
                }
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: tech.is_active ? '#10b981' : '#6b7280', border: '2px solid var(--bg-elevated)' }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{tech.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{tech.phone} • {tech.is_active ? 'Active' : 'Inactive'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tech.rating > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>★ {tech.rating}</span>}
                    {tech.years_experience > 0 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tech.years_experience} yr exp</span>}
                    {(tech.specializations || []).slice(0, 2).map(s => (
                        <span key={s} style={{ fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>{s}</span>
                    ))}
                </div>
            </div>

            {/* Visibility badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {Object.entries(fields).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: v ? '#10b981' : '#6b7280' }}>
                        {v ? <Eye size={10} /> : <EyeOff size={10} />}
                        {k.replace('show_', '')}
                    </div>
                ))}
            </div>
        </div>
    )
}

function EditPanel({ tech, onSave, onClose }) {
    const [form, setForm] = useState({
        photo_url: tech.photo_url || '',
        rating: tech.rating || 0,
        years_experience: tech.years_experience || 0,
        bio: tech.bio || '',
        specializations: (tech.specializations || []).join(', '),
        customer_card_fields: { ...DEFAULT_FIELDS, ...(tech.customer_card_fields || {}) },
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
    const setVis = (key, val) => setForm(f => ({ ...f, customer_card_fields: { ...f.customer_card_fields, [key]: val } }))

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('bucket', 'media')
            fd.append('folder', 'technician-photos')
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const data = await res.json()
            if (data.url) set('photo_url', data.url)
        } catch { alert('Photo upload failed') }
        finally { setUploading(false) }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const body = {
                id: tech.id,
                photo_url: form.photo_url || null,
                rating: parseFloat(form.rating) || 0,
                years_experience: parseInt(form.years_experience) || 0,
                bio: form.bio || null,
                specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
                customer_card_fields: form.customer_card_fields,
            }
            const res = await fetch('/api/admin/technicians', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            setSaved(true)
            setTimeout(() => { setSaved(false); onSave(data.data) }, 1800)
        } catch (err) { alert('Failed to save: ' + err.message) }
        finally { setSaving(false) }
    }

    const vis = form.customer_card_fields
    const visFields = [
        { key: 'show_photo', label: 'Profile Photo', desc: 'Show technician photo in customer app' },
        { key: 'show_name', label: 'Full Name', desc: 'Show technician name' },
        { key: 'show_rating', label: 'Star Rating', desc: 'Show star rating on customer card' },
        { key: 'show_experience', label: 'Years of Experience', desc: 'Show experience and specializations' },
        { key: 'show_bio', label: 'Bio / About', desc: 'Show short bio text on customer card' },
    ]

    return (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 24, border: '1px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>✏️ Edit Profile — {tech.name}</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left — Photo + basic info */}
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Profile Info</div>

                    {/* Photo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div style={{ position: 'relative' }}>
                            {form.photo_url
                                ? <img src={form.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
                                : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                                    {(tech.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                            }
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                            >
                                {uploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{tech.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tech.phone}</div>
                        </div>
                    </div>

                    {/* Rating */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Rating</label>
                        <StarRating value={form.rating} onChange={v => set('rating', v)} />
                    </div>

                    {/* Years experience */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Years of Experience</label>
                        <input
                            type="number" min={0} max={50}
                            value={form.years_experience}
                            onChange={e => set('years_experience', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}
                        />
                    </div>

                    {/* Specializations */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Specializations (comma separated)</label>
                        <input
                            type="text"
                            value={form.specializations}
                            onChange={e => set('specializations', e.target.value)}
                            placeholder="AC Repair, Washing Machine, Refrigerator"
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}
                        />
                    </div>

                    {/* Bio */}
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Bio / About</label>
                        <textarea
                            value={form.bio}
                            onChange={e => set('bio', e.target.value)}
                            placeholder="Brief description shown to customers..."
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* Right — Customer card visibility */}
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Customer Card Visibility</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16, lineHeight: 1.5 }}>
                        Control what customers see in the technician mini-card when a tech is assigned to their job.
                    </div>

                    {visFields.map(vf => (
                        <div
                            key={vf.key}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 14px', background: 'var(--bg-secondary)',
                                borderRadius: 10, marginBottom: 8,
                                border: `1px solid ${vis[vf.key] ? 'rgba(59,130,246,0.3)' : 'var(--border-primary)'}`,
                                transition: 'all 0.15s',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: vis[vf.key] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{vf.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{vf.desc}</div>
                            </div>
                            <button
                                onClick={() => setVis(vf.key, !vis[vf.key])}
                                style={{
                                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: vis[vf.key] ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12,
                                }}
                            >
                                <div style={{
                                    position: 'absolute', top: 3, left: vis[vf.key] ? 23 : 3,
                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }} />
                            </button>
                        </div>
                    ))}

                    {/* Preview */}
                    <div style={{ marginTop: 16, padding: 14, background: 'rgba(59,130,246,0.05)', border: '1px dashed rgba(59,130,246,0.2)', borderRadius: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 600 }}>CUSTOMER CARD PREVIEW</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {vis.show_photo && form.photo_url && <img src={form.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
                            {vis.show_photo && !form.photo_url && <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>{(tech.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}</div>}
                            <div>
                                {vis.show_name && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{tech.name}</div>}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {vis.show_rating && form.rating > 0 && <span style={{ fontSize: 11, color: '#f59e0b' }}>★ {form.rating}</span>}
                                    {vis.show_experience && form.years_experience > 0 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{form.years_experience} yrs exp</span>}
                                </div>
                                {vis.show_bio && form.bio && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{form.bio.slice(0, 50)}...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
                <button onClick={onClose} style={{ padding: '9px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Cancel</button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '9px 24px', background: saved ? '#10b981' : 'var(--color-primary)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}
                >
                    {saved ? <><CheckCircle size={15} /> Saved!</> : saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={15} /> Save Profile</>}
                </button>
            </div>
        </div>
    )
}

export default function TechnicianProfileManager() {
    const [technicians, setTechnicians] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingTech, setEditingTech] = useState(null)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetch('/api/admin/technicians')
            .then(r => r.json())
            .then(d => setTechnicians(Array.isArray(d.data) ? d.data : []))
            .catch(() => setTechnicians([]))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = (updated) => {
        setTechnicians(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
        setEditingTech(null)
    }

    const filtered = technicians.filter(t =>
        (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.phone || '').includes(search)
    )

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Technician Profiles</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Manage what customers see about your technicians</p>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{filtered.length} technicians</div>
            </div>

            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                <input
                    type="text"
                    placeholder="Search technicians..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '9px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-secondary)' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} /> Loading technicians...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
                        <User size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <div>No technicians found</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(tech => (
                            <div key={tech.id}>
                                {editingTech?.id === tech.id ? (
                                    <EditPanel tech={editingTech} onSave={handleSave} onClose={() => setEditingTech(null)} />
                                ) : (
                                    <TechCard tech={tech} onEdit={setEditingTech} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    )
}
