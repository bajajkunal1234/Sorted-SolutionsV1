'use client'

import { useState, useEffect } from 'react'
import {
    User, MapPin, Edit2, ShieldCheck, ChevronRight,
    LogOut, Settings, CreditCard, LifeBuoy, Phone, Mail,
    X, Bell, HelpCircle, Star
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function ProfilePage() {
    const router = useRouter()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // 'edit' | 'address' | 'payment' | 'settings' | 'help'
    const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '' })
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const customerId = localStorage.getItem('customerId') || ''
                const response = await fetch(`/api/customer/profile?customerId=${customerId}`)
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
            setSaveMsg('Saved locally ✓')
            setCustomer(prev => ({ ...prev, name: editForm.name, email: editForm.email }))
            localStorage.setItem('customerName', editForm.name)
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
                <div style={{
                    width: 96, height: 96, borderRadius: '32px',
                    background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, fontWeight: 800, color: '#fff',
                    boxShadow: '0 10px 30px rgba(139,92,246,0.4)',
                    marginBottom: 16,
                }}>
                    {customer?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
                    {customer?.name || 'Sorted Customer'}
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>{customer?.mobile || customer?.email || ''}</p>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 12px', borderRadius: 20, color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                    <ShieldCheck size={14} /> Sorted Member
                </div>
            </div>

            {/* Account Group */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                <SettingsRow icon={User} color="#38bdf8" label="Edit Profile" onClick={() => setModal('edit')} />
                <SettingsRow divider icon={MapPin} color="#f59e0b" label="Saved Addresses" onClick={() => setModal('address')} />
                <SettingsRow divider icon={CreditCard} color="#8b5cf6" label="Payment Methods" onClick={() => setModal('payment')} />
            </div>

            {/* Support Group */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                <SettingsRow icon={Bell} color="#f59e0b" label="Notifications" onClick={() => setModal('notif')} />
                <SettingsRow divider icon={Star} color="#10b981" label="Rate the App" onClick={() => window.open('https://play.google.com/store', '_blank')} />
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
                <Modal title="Saved Addresses" onClose={() => setModal(null)}>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
                        You can add and manage your service addresses from the Home tab → Add Address.
                    </p>
                    <button onClick={() => setModal(null)} style={{
                        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Got it</button>
                </Modal>
            )}

            {/* Payment Methods info */}
            {modal === 'payment' && (
                <Modal title="Payment Methods" onClose={() => setModal(null)}>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CreditCard size={48} color="#8b5cf6" style={{ marginBottom: 16, opacity: 0.4 }} />
                        <h3 style={{ color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>Payments via Technician</h3>
                        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                            Currently all payments are collected by our technician at the time of service. Online payment options coming soon.
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
