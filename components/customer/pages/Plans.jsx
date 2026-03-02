'use client'

import React, { useState } from 'react'
import AMCPage from './AMC'
import RentalsPage from './Rentals'

export default function PlansPage() {
    const [activeSection, setActiveSection] = useState('amc') // 'amc' | 'rentals'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            {/* Section switcher at the top */}
            <div style={{ padding: '24px 20px 0', position: 'sticky', top: 0, background: 'linear-gradient(180deg, #0f172a 80%, transparent)', zIndex: 10 }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setActiveSection('amc')}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 12,
                            background: activeSection === 'amc' ? 'rgba(139,92,246,0.2)' : 'transparent',
                            color: activeSection === 'amc' ? '#a78bfa' : '#64748b',
                            border: activeSection === 'amc' ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        🛡️ AMC
                    </button>
                    <button
                        onClick={() => setActiveSection('rentals')}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 12,
                            background: activeSection === 'rentals' ? 'rgba(16,185,129,0.2)' : 'transparent',
                            color: activeSection === 'rentals' ? '#34d399' : '#64748b',
                            border: activeSection === 'rentals' ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        📦 Rentals
                    </button>
                </div>
            </div>

            {/* Render active section */}
            <div>
                {activeSection === 'amc' ? <AMCPage /> : <RentalsPage />}
            </div>
        </div>
    )
}
