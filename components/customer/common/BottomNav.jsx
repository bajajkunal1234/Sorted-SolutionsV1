import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Map, Wrench, User } from 'lucide-react'

function BottomNav() {
    const navigate = useNavigate()
    const location = useLocation()

    const tabs = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/house-map', icon: Map, label: 'House Map' },
        { path: '/services', icon: Wrench, label: 'Services' },
        { path: '/profile', icon: User, label: 'Profile' },
    ]

    return (
        <div className="bottom-tabs">
            {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = location.pathname === tab.path

                return (
                    <button
                        key={tab.path}
                        className={`tab-item ${isActive ? 'active' : ''}`}
                        onClick={() => navigate(tab.path)}
                    >
                        <Icon className="tab-icon" />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default BottomNav



