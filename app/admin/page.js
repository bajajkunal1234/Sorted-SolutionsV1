'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Briefcase, DollarSign, Package, FileText } from 'lucide-react'
import JobsTab from './components/JobsTab'
import AccountsTab from './components/AccountsTab'
import InventoryTab from './components/InventoryTab'
import ReportsTab from './components/ReportsTab'
import './admin.css'
import './modal-improvements.css'

export default function AdminApp() {
    const [activeTab, setActiveTab] = useState('jobs')
    const [customerToOpen, setCustomerToOpen] = useState(null)

    // Set up global function to open customer account from Jobs tab
    useEffect(() => {
        window.openCustomerAccount = (customer) => {
            setActiveTab('accounts')
            setCustomerToOpen(customer)
        }
        return () => {
            delete window.openCustomerAccount
        }
    }, [])

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'jobs', label: 'Jobs', icon: Briefcase },
        { id: 'accounts', label: 'Accounts', icon: DollarSign },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'reports', label: 'Reports', icon: FileText }
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'jobs':
                return <JobsTab />
            case 'dashboard':
                return (
                    <div className="p-md">
                        <h2>Dashboard</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Dashboard with ERP features coming soon...</p>
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                            <a href="/technician" style={{ color: '#3b82f6', textDecoration: 'none', marginRight: 'var(--spacing-md)' }}>
                                → Go to Technician Portal
                            </a>
                            <a href="/customer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                → Go to Customer Portal
                            </a>
                        </div>
                    </div>
                )
            case 'accounts':
                return <AccountsTab customerToOpen={customerToOpen} onCustomerOpened={() => setCustomerToOpen(null)} />
            case 'inventory':
                return <InventoryTab />
            case 'reports':
                return <ReportsTab />
            default:
                return null
        }
    }

    return (
        <div className="app-container">
            {/* Main Content */}
            <div className="main-content">
                {renderTabContent()}
            </div>

            {/* Bottom Navigation */}
            <nav className="bottom-tabs">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}
