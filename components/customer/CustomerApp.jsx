'use client'

import React, { useState, useEffect } from 'react'
import { Home, Wrench, User, Package } from 'lucide-react'
import { logNavigation } from '@/lib/interactions'

import HomePage from '@/components/customer/pages/Home'
import AppliancesPage from '@/components/customer/pages/Appliances'
import ServicesPage from '@/components/customer/pages/Services'
import ProfilePage from '@/components/customer/pages/Profile'

export default function CustomerApp() {
    const [activeTab, setActiveTab] = useState('home')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'appliances', label: 'Appliances', icon: Package },
        { id: 'services', label: 'Services', icon: Wrench },
        { id: 'profile', label: 'Profile', icon: User },
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'home': return <HomePage />
            case 'appliances': return <AppliancesPage />
            case 'services': return <ServicesPage />
            case 'profile': return <ProfilePage />
            default: return <HomePage />
        }
    }

    if (!mounted) return null // Prevent hydration mismatch

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', // Deep modern gradient
            color: '#f8fafc',
            fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden',
            position: 'relative'
        }}>

            {/* Dynamic Background Effects */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingBottom: '100px', // Space for floating nav
                position: 'relative',
                zIndex: 10
            }}>
                {renderTabContent()}
            </div>

            {/* Floating Glassmorphic Bottom Navigation */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 48px)',
                maxWidth: '400px',
                height: '64px',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                borderRadius: '32px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 8px',
                zIndex: 100,
                transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                logNavigation(tab.label, 'Customer', 'Customer App');
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                flex: 1,
                                position: 'relative',
                                color: isActive ? '#38bdf8' : '#64748b',
                                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                            }}
                        >
                            {/* Active Bubble Indicator */}
                            <div style={{
                                position: 'absolute',
                                width: '40px',
                                height: '40px',
                                background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                borderRadius: '50%',
                                transform: isActive ? 'scale(1)' : 'scale(0.5)',
                                opacity: isActive ? 1 : 0,
                                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                                zIndex: 0
                            }} />

                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                style={{
                                    zIndex: 1,
                                    transform: isActive ? 'translateY(-2px)' : 'translateY(2px)',
                                    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                                    filter: isActive ? 'drop-shadow(0 2px 8px rgba(56,189,248,0.5))' : 'none'
                                }}
                            />

                            <span style={{
                                fontSize: '10px',
                                fontWeight: isActive ? 600 : 500,
                                zIndex: 1,
                                opacity: isActive ? 1 : 0,
                                transform: isActive ? 'translateY(2px)' : 'translateY(10px)',
                                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                                letterSpacing: '0.3px'
                            }}>
                                {tab.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
