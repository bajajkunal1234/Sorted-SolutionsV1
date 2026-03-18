'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Briefcase, DollarSign, Package, FileText } from 'lucide-react'
import JobsTab from './components/JobsTab'
import AccountsTab from './components/AccountsTab'
import InventoryTab from './components/InventoryTab'
import ReportsTab from './components/ReportsTab'
import './admin.css'
import './modal-improvements.css'


export default function AdminApp() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [customerToOpen, setCustomerToOpen] = useState(null)
    const [jobToOpen, setJobToOpen] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)

    // ── Auth Guard ─────────────────────────────────────────────────────────
    useEffect(() => {
        const raw =
            localStorage.getItem('user_session') ||
            sessionStorage.getItem('user_session')
        if (!raw) {
            router.replace('/login')
            return
        }
        try {
            const session = JSON.parse(raw)
            if (session?.role !== 'admin') {
                router.replace('/login')
                return
            }
        } catch {
            router.replace('/login')
            return
        }
        setAuthChecked(true)
    }, [])

    // Set up global function to open customer account from Jobs tab
    useEffect(() => {
        window.openCustomerAccount = (customer) => {
            setActiveTab('accounts')
            setCustomerToOpen(customer)
        }
        window.openJobInJobsTab = (job) => {
            setActiveTab('jobs')
            setJobToOpen(job)
        }
        return () => {
            delete window.openCustomerAccount
            delete window.openJobInJobsTab
        }
    }, [])

    // ── Auth guard loading screen (AFTER all hooks) ─────────────────────────
    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #0f172a)', color: 'white', fontSize: 14 }}>
                Checking access...
            </div>
        )
    }
    // ───────────────────────────────────────────────────────────────────────

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
                return <JobsTab jobToOpen={jobToOpen} onJobOpened={() => setJobToOpen(null)} />
            case 'dashboard':
                return (
                    <div className="dashboard-placeholder">
                        <h2>Dashboard</h2>
                        <p>Dashboard with ERP features coming soon...</p>
                        <div className="portal-links">
                            <a href="/technician" className="portal-link">
                                → Go to Technician Portal
                            </a>
                            <a href="/customer" className="portal-link">
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
        <div className="admin-app">
            {/* Main Content */}
            <div className="admin-content-area">
                {renderTabContent()}
            </div>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    );
}
