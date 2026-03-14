'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle, AlertCircle, Wrench, Package, ArrowRight, Activity, Zap, Compass, MapPin } from 'lucide-react'
import AddPropertyModal from '../modals/AddPropertyModal'
import AddApplianceModal from '../modals/AddApplianceModal'
import BookServiceModal from '../modals/BookServiceModal'
import { useRouter } from 'next/navigation'

export default function Home() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [customerName, setCustomerName] = useState('Customer')
    const [greeting, setGreeting] = useState('Good Morning')

    // Modals
    const [showPropertyModal, setShowPropertyModal] = useState(false)
    const [showApplianceModal, setShowApplianceModal] = useState(false)
    const [showServiceModal, setShowServiceModal] = useState(false)

    // Data
    const [stats, setStats] = useState({ properties: 0, appliances: 0, activeJobs: 0, completedJobs: 0 })
    const [activities, setActivities] = useState([])
    const [activeJob, setActiveJob] = useState(null)
    const [properties, setProperties] = useState([])
    const [appliances, setAppliances] = useState([])

    // Banners
    const [banners, setBanners] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)
    const bannerTimer = useRef(null)

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good Morning')
        else if (hour < 18) setGreeting('Good Afternoon')
        else setGreeting('Good Evening')

        fetchData()

        // Fetch banners
        fetch('/api/settings/section-configs?id=customer-app-banners')
            .then(r => r.json())
            .then(data => {
                if (data.success && data.data?.extra_config?.banners) {
                    setBanners(data.data.extra_config.banners.filter(b => b.active))
                }
            })
            .catch(() => {})
    }, [])

    // Auto-advance banners
    useEffect(() => {
        if (banners.length <= 1) return
        bannerTimer.current = setInterval(() => {
            setBannerIndex(i => (i + 1) % banners.length)
        }, 5000)
        return () => clearInterval(bannerTimer.current)
    }, [banners.length])

    const fetchData = async () => {
        try {
            const customerId = localStorage.getItem('customerId')
            const customerData = localStorage.getItem('customerData')

            if (!customerId) { router.push('/customer/login'); return }
            if (customerData) { setCustomerName(JSON.parse(customerData).name?.split(' ')[0] || 'Customer') }

            // Fetch everything needed
            const [propRes, jobRes, appRes] = await Promise.all([
                fetch(`/api/customer/properties?customerId=${customerId}`),
                fetch(`/api/customer/jobs?customerId=${customerId}`),
                fetch(`/api/customer/appliances?customerId=${customerId}`)
            ])

            const [pData, jData, aData] = await Promise.all([propRes.json(), jobRes.json(), appRes.json()])

            setProperties(pData.properties || [])
            setAppliances(aData.appliances || [])

            const jobs = jData.jobs || []
            const activeJobs = jobs.filter(j => ['pending', 'confirmed', 'in_progress'].includes(j.status))

            setStats({
                properties: (pData.properties || []).length,
                appliances: (aData.appliances || []).length,
                activeJobs: activeJobs.length,
                completedJobs: jobs.filter(j => j.status === 'completed').length
            })

            // Setup Active Job Tracker if there is one
            if (activeJobs.length > 0) {
                // Pick the most recent/relevant active job
                setActiveJob(activeJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0])
            }

            // Timeline Activities
            const timeline = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
            setActivities(timeline)

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddAppliance = async (applianceData) => {
        const customerId = localStorage.getItem('customerId')
        if (!customerId) return
        const payload = {
            customer_id: customerId,
            type: applianceData.type || applianceData.category,
            brand: applianceData.brand,
            model: applianceData.model,
            serial_number: applianceData.serialNumber,
            purchase_date: applianceData.purchaseDate,
            warranty_expiry: applianceData.warrantyExpiry,
            room: applianceData.room,
        }
        const res = await fetch('/api/customer/appliances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to add appliance')
        fetchData()
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading your home...</span>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ── HEADER ── */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                        {greeting},<br />{customerName}.
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={14} color="#38bdf8" /> Keeping your home healthy
                    </p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {customerName.charAt(0).toUpperCase()}
                </div>
            </header>

            {/* ── BANNERS CAROUSEL ── */}
            {banners.length > 0 && (
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', aspectRatio: '16/7' }}>
                    <div style={{ display: 'flex', transition: 'transform 0.5s ease-in-out', transform: `translateX(-${bannerIndex * 100}%)`, height: '100%' }}>
                        {banners.map((banner, i) => (
                            <div key={banner.id}
                                onClick={() => banner.targetUrl && router.push(banner.targetUrl)}
                                style={{ minWidth: '100%', height: '100%', flexShrink: 0, cursor: banner.targetUrl ? 'pointer' : 'default' }}
                            >
                                <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 20 }} />
                            </div>
                        ))}
                    </div>
                    {banners.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                            {banners.map((_, i) => (
                                <div key={i} onClick={() => setBannerIndex(i)}
                                    style={{ width: i === bannerIndex ? 16 : 6, height: 6, borderRadius: 10, background: i === bannerIndex ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s', cursor: 'pointer' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── ACTIVE TRACKER (Priority UI) ── */}
            {activeJob ? (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(59,130,246,0.1))',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(56,189,248,0.3)',
                    borderRadius: '24px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: -30, right: -20, opacity: 0.1 }}><Wrench size={100} /></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 12px #38bdf8' }} />
                        <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Active Service</span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>{activeJob.product?.brand} {activeJob.product?.type}</h3>
                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '13px' }}>{activeJob.issue}</p>

                    <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.4)', padding: '12px 16px', borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👨‍🔧</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{activeJob.assignedTechnician || 'Assigning...'}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>Status: {activeJob.status.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View</button>
                    </div>
                </div>
            ) : (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex', alignItems: 'center', gap: 16
                }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px 0', color: '#10b981' }}>All Clear!</h3>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No active issues. Your home is healthy.</p>
                    </div>
                </div>
            )}

            {/* ── QUICK ACTIONS CAROUSEL ── */}
            <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>

                    {/* Action 1 */}
                    <button onClick={() => setShowServiceModal(true)} style={{
                        flex: '0 0 140px', padding: '20px 16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <Wrench size={20} />
                        </div>
                        <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Book Service</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Request a repair</div>
                    </button>
                </div>
            </div>

            {/* ── STATS ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                    { label: 'Properties', value: stats.properties, color: '#f59e0b', emoji: '🏠' },
                    { label: 'Devices', value: stats.appliances, color: '#8b5cf6', emoji: '📦' },
                    { label: 'Active Jobs', value: stats.activeJobs, color: '#38bdf8', emoji: '🔧' },
                    { label: 'Completed', value: stats.completedJobs, color: '#10b981', emoji: '✅' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: `${s.color}10`, border: `1px solid ${s.color}25`, borderRadius: 20,
                        padding: '16px', display: 'flex', flexDirection: 'column', gap: 4
                    }}>
                        <div style={{ fontSize: 22 }}>{s.emoji}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── RECENT ACTIVITY TIMELINE ── */}
            <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Recent Activity</h2>

                {activities.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, textAlign: 'center' }}>
                        <Activity size={32} color="#64748b" style={{ marginBottom: 12, opacity: 0.5 }} />
                        <div style={{ color: '#94a3b8', fontSize: 14 }}>No recent activity to show.</div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {activities.map((act, i) => {
                            const isCompleted = act.status === 'completed'
                            const color = isCompleted ? '#10b981' : '#38bdf8'

                            return (
                                <div key={act.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                                    {/* Timeline Connector */}
                                    {i !== activities.length - 1 && (
                                        <div style={{ position: 'absolute', left: 19, top: 40, bottom: -24, width: 2, background: 'rgba(255,255,255,0.05)' }} />
                                    )}

                                    {/* Icon */}
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: color, zIndex: 2 }}>
                                        {isCompleted ? <CheckCircle size={18} /> : <Wrench size={18} />}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, paddingBottom: i !== activities.length - 1 ? 8 : 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc', textTransform: 'capitalize' }}>
                                                {act.product?.type || 'Service'} - {act.status.replace('_', ' ')}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                                {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                                            {act.issue || act.problem_description || 'Routine checkup'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── MODALS ── */}
            <AddPropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onAdd={() => { fetchData(); setShowPropertyModal(false) }} />
            <AddApplianceModal isOpen={showApplianceModal} onClose={() => setShowApplianceModal(false)} onAdd={async (data) => { await handleAddAppliance(data); setShowApplianceModal(false) }} properties={properties} />
            <BookServiceModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onBook={() => { fetchData(); setShowServiceModal(false) }} />

        </div>
    )
}

function ShieldCheck({ size, color }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
}
