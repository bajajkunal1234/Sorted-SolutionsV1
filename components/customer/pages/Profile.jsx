'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Edit2, ShieldCheck, ChevronRight, LogOut, Settings, CreditCard, LifeBuoy } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const router = useRouter()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const customerId = localStorage.getItem('customerId') || 'default-customer-id'
                const response = await fetch(`/api/customer/profile?customerId=${customerId}`)
                const data = await response.json()
                setCustomer(data.customer || { name: 'Customer', mobile: 'Not set' })
            } catch (err) {
                console.error('Error fetching profile:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            localStorage.clear()
            router.push('/login')
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>

            {/* Header Area (Extended into background) */}
            <div style={{
                margin: '0 -20px 20px -20px',
                padding: '40px 20px 30px',
                background: 'linear-gradient(180deg, rgba(56,189,248,0.1), transparent)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
            }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                        width: 96, height: 96, borderRadius: '32px',
                        background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 40, fontWeight: 800, color: '#fff',
                        boxShadow: '0 10px 30px rgba(139,92,246,0.4)',
                        transform: 'rotate(5deg)'
                    }}>
                        <div style={{ transform: 'rotate(-5deg)' }}>
                            {customer?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
                    {customer?.name || 'Sorted Customer'}
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                    {customer?.mobile}
                </p>

                {/* Member Badge */}
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 12px', borderRadius: '20px', color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                    <ShieldCheck size={14} /> Sorted Member
                </div>
            </div>

            {/* List Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Account Group */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                    <SettingsRow icon={User} color="#38bdf8" label="Edit Profile" />
                    <SettingsRow divider icon={MapPin} color="#f59e0b" label="Saved Addresses" />
                    <SettingsRow divider icon={CreditCard} color="#8b5cf6" label="Payment Methods" />
                </div>

                {/* Preferences Group */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '8px 0' }}>
                    <SettingsRow icon={Settings} color="#94a3b8" label="App Settings" />
                    <SettingsRow divider icon={LifeBuoy} color="#10b981" label="Help & Support" />
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 24, padding: '16px', color: '#ef4444', fontSize: 15, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        cursor: 'pointer', transition: 'background 0.2s'
                    }}
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, color: '#475569', fontSize: 12 }}>
                Sorted Solutions v2.0 • Build 8421
            </div>

        </div>
    )
}

function SettingsRow({ icon: Icon, color, label, divider }) {
    return (
        <div style={{ padding: '0 20px' }}>
            {divider && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 36 }} />}
            <button style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', padding: '16px 0', cursor: 'pointer'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                        <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
                </div>
                <ChevronRight size={18} color="#475569" />
            </button>
        </div>
    )
}
