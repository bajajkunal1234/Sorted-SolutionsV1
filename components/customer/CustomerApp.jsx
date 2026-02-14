'use client'

import React, { useState } from 'react'
import { Home, Map, Wrench, User, Package } from 'lucide-react'

// Customer Pages
import HomePage from '@/components/customer/pages/Home'
import HouseMapPage from '@/components/customer/pages/HouseMap'
import AppliancesPage from '@/components/customer/pages/Appliances'
import ServicesPage from '@/components/customer/pages/Services'
import ProfilePage from '@/components/customer/pages/Profile'

function CustomerApp() {
    const [activeTab, setActiveTab] = useState('home')

    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'appliances', label: 'Appliances', icon: Package },
        { id: 'house-map', label: 'House Map', icon: Map },
        { id: 'services', label: 'Services', icon: Wrench },
        { id: 'profile', label: 'Profile', icon: User },
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'home':
                return <HomePage />
            case 'appliances':
                return <AppliancesPage />
            case 'house-map':
                return <HouseMapPage />
            case 'services':
                return <ServicesPage />
            case 'profile':
                return <ProfilePage />
            default:
                return <HomePage />
        }
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Main Content */}
            <div className="main-content">
                {renderTabContent()}
            </div>

            {/* Bottom Navigation */}
            <div className="bottom-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            className={`tab-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon className="tab-icon" />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default CustomerApp





