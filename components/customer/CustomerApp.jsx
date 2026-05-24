'use client'

import React, { useState, useEffect } from 'react'
import { Home, Wrench, User, Package, Layers, X } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

import HomePage from '@/components/customer/pages/Home'
import ServicesPage from '@/components/customer/pages/Services'
import ProfilePage from '@/components/customer/pages/Profile'
import PlansPage from '@/components/customer/pages/Plans'
import OnboardingWizard from '@/components/customer/OnboardingWizard'

const TABS = [
    { id: 'home', label: 'Home', icon: Home, color: '#38bdf8' },
    { id: 'services', label: 'Services', icon: Wrench, color: '#38bdf8' },
    { id: 'plans', label: 'Plans', icon: Layers, color: '#10b981' },
    { id: 'profile', label: 'Profile', icon: User, color: '#f59e0b' },
]

function renderTab(tab, setActiveTab) {
    switch (tab) {
        case 'home': return <HomePage setActiveTab={setActiveTab} />
        case 'services': return <ServicesPage />
        case 'plans': return <PlansPage />
        case 'profile': return <ProfilePage />
        default: return <HomePage setActiveTab={setActiveTab} />
    }
}

const NAV_HEIGHT = 64

export default function CustomerApp() {
    const [activeTab, setActiveTab] = useState('home')
    const [mounted, setMounted] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [onboardingData, setOnboardingData] = useState({ name: '', customerId: '' })

    const searchParams = useSearchParams()
    const router = useRouter()
    
    // Booking success states
    const [flasherMsg, setFlasherMsg] = useState(null)
    const [showServicesTooltip, setShowServicesTooltip] = useState(false)

    useEffect(() => {
        setMounted(true)

        // ── Auth gate: CustomerApp is the single gatekeeper ─────────────────
        const cId = localStorage.getItem('customerId') || sessionStorage.getItem('customerId')
        if (!cId) {
            // No session at all — send to login
            window.location.href = '/login'
            return
        }

        // Check if this is a first-time user who hasn't completed their profile
        try {
            const raw = localStorage.getItem('customerData') || sessionStorage.getItem('customerData')
            if (raw) {
                const session = JSON.parse(raw)
                const customerId = session.id || cId
                const name = session.name || ''
                const isClaim = session.is_claim === true
                // Show onboarding wizard only if profile_complete is explicitly false
                if (session.profile_complete === false) {
                    setOnboardingData({ name, customerId, isClaim })
                    setShowOnboarding(true)
                }
            }
        } catch { }

        // Check for new booking success
        const newBookingId = searchParams.get('newBooking')
        if (newBookingId) {
            setFlasherMsg(`🎉 Booking Confirmed! Job #${newBookingId} created successfully.`)
            setShowServicesTooltip(true)
            
            // Clean up the URL so it doesn't trigger on refresh
            const url = new URL(window.location.href)
            url.searchParams.delete('newBooking')
            window.history.replaceState({}, '', url.toString())

            // Auto-hide flasher after 3 seconds
            setTimeout(() => {
                setFlasherMsg(null)
            }, 3000)
        }
    }, [searchParams])

    if (!mounted) return null

    // Show the onboarding wizard fullscreen for new users
    if (showOnboarding) {
        return (
            <OnboardingWizard
                initialName={onboardingData.name}
                customerId={onboardingData.customerId}
                isClaim={onboardingData.isClaim || false}
                onComplete={() => setShowOnboarding(false)}
            />
        )
    }

    return (
        <div style={{
            height: '100dvh', display: 'flex', flexDirection: 'column',
            background: '#0a0f1e',
            color: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden', position: 'relative',
        }}>
            {/* Ambient blobs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />


            {/* Scrollable content area */}
            <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', position: 'relative', zIndex: 10,
                WebkitOverflowScrolling: 'touch',
            }}>
                {renderTab(activeTab, setActiveTab)}
            </div>

            {/* ── SUCCESS FLASHER ── */}
            {flasherMsg && (
                <div style={{
                    position: 'absolute', top: 20, left: '5%', right: '5%',
                    backgroundColor: '#10b981', color: 'white', padding: '14px 20px',
                    borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'slideDown 0.3s ease-out', textAlign: 'center'
                }}>
                    {flasherMsg}
                </div>
            )}

            {/* ── TOOLTIP FOR SERVICES TAB ── */}
            {showServicesTooltip && activeTab === 'home' && (
                <div style={{
                    position: 'absolute', bottom: NAV_HEIGHT + 20, left: '50%', transform: 'translateX(-50%)',
                    width: '85%', backgroundColor: '#38bdf8', color: '#0f172a',
                    padding: '16px', borderRadius: '12px', zIndex: 9999,
                    boxShadow: '0 8px 25px rgba(56, 189, 248, 0.4)', animation: 'bounceIn 0.5s ease-out'
                }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Track Your Tech</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.4, marginBottom: '12px', fontWeight: 500 }}>
                        See real-time updates and the ETA for your assigned technician here.
                    </div>
                    <button
                        onClick={() => {
                            setShowServicesTooltip(false)
                            setActiveTab('services')
                        }}
                        style={{
                            background: '#0f172a', color: 'white', border: 'none',
                            padding: '8px 16px', borderRadius: '6px', fontSize: '13px',
                            fontWeight: 600, cursor: 'pointer', width: '100%'
                        }}
                    >
                        Got it, take me to my booking
                    </button>
                    {/* Tooltip triangle pointing down */}
                    <div style={{
                        position: 'absolute', bottom: '-8px', left: '37.5%', // approximately pointing to the second tab (services)
                        width: 0, height: 0, borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent', borderTop: '10px solid #38bdf8'
                    }} />
                </div>
            )}

            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-150%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: translate(-50%, 20px); opacity: 0; }
                    60% { transform: translate(-50%, -10px); opacity: 1; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>

            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: NAV_HEIGHT,
                paddingBottom: 'env(safe-area-inset-bottom)',
                background: '#070c1a',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'stretch', zIndex: 100,
            }}>
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 4, background: 'transparent', border: 'none',
                                outline: 'none', cursor: 'pointer', padding: '0 2px',
                                position: 'relative', WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            {isActive && (
                                <div style={{
                                    position: 'absolute', top: 0, left: '22%', right: '22%',
                                    height: 2, background: tab.color,
                                    borderRadius: '0 0 2px 2px',
                                    boxShadow: `0 0 8px ${tab.color}80`,
                                }} />
                            )}
                            <Icon
                                size={20} strokeWidth={isActive ? 2.5 : 1.8}
                                color={isActive ? tab.color : '#475569'}
                                style={{ flexShrink: 0 }}
                            />
                            <span style={{
                                fontSize: 10, fontWeight: isActive ? 700 : 500,
                                color: isActive ? tab.color : '#475569',
                                letterSpacing: isActive ? '0.2px' : 0, lineHeight: 1,
                            }}>
                                {tab.label}
                            </span>
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}
