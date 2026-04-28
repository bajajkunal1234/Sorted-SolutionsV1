'use client'

import React, { useState, useEffect } from 'react'
import { Home, Wrench, User, Package, Layers } from 'lucide-react'

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

function renderTab(tab) {
    switch (tab) {
        case 'home': return <HomePage />
        case 'services': return <ServicesPage />
        case 'plans': return <PlansPage />
        case 'profile': return <ProfilePage />
        default: return <HomePage />
    }
}

const NAV_HEIGHT = 64

export default function CustomerApp() {
    const [activeTab, setActiveTab] = useState('home')
    const [mounted, setMounted] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [onboardingData, setOnboardingData] = useState({ name: '', customerId: '' })

    useEffect(() => {
        setMounted(true)
        // Check if this is a first-time user who hasn't completed their profile
        try {
            const raw = localStorage.getItem('customerData') || sessionStorage.getItem('customerData')
            if (raw) {
                const session = JSON.parse(raw)
                const customerId = session.id || localStorage.getItem('customerId') || sessionStorage.getItem('customerId') || ''
                const name = session.name || ''
                const isClaim = session.is_claim === true
                // Show onboarding wizard only if profile_complete is explicitly false
                if (session.profile_complete === false) {
                    setOnboardingData({ name, customerId, isClaim })
                    setShowOnboarding(true)
                }
            }
        } catch { }
    }, [])

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
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            color: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden', position: 'relative',
        }}>
            {/* Ambient blobs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Scrollable content area */}
            <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', position: 'relative', zIndex: 10,
                WebkitOverflowScrolling: 'touch',
            }}>
                {renderTab(activeTab)}
            </div>

            {/* ── BOTTOM NAV ── */}
            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: NAV_HEIGHT,
                paddingBottom: 'env(safe-area-inset-bottom)',
                background: '#0f172a',
                borderTop: '1px solid rgba(255,255,255,0.08)',
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
