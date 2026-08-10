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
import NotificationBell from '@/components/common/NotificationBell'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import DashboardFollowups from './components/DashboardFollowups'
import DashboardLivePerformance from './components/DashboardLivePerformance'
import dynamic from 'next/dynamic'

const TechnicianLiveMap = dynamic(() => import('./components/reports/TechnicianLiveMap'), {
    ssr: false,
    loading: () => <div style={{ height: 325, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>🗺️ Loading fleet map...</div>
})

const DashboardQuickInsights = dynamic(() => import('./components/DashboardQuickInsights'), {
    ssr: false,
    loading: () => <div style={{ height: 200, borderRadius: 14, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>📊 Loading insights dashboard...</div>
})

export default function AdminApp() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [customerToOpen, setCustomerToOpen] = useState(null)
    const [jobToOpen, setJobToOpen] = useState(null)
    const [reportsSectionToOpen, setReportsSectionToOpen] = useState(null)
    const [reportsSubSectionToOpen, setReportsSubSectionToOpen] = useState(null)
    const [techSubTabToOpen, setTechSubTabToOpen] = useState(null)
    const [accountsFormToOpen, setAccountsFormToOpen] = useState(null)
    const [accountsSubTabToOpen, setAccountsSubTabToOpen] = useState(null)
    const [jobsViewTypeToOpen, setJobsViewTypeToOpen] = useState(null)
    const [jobsActiveTagsToOpen, setJobsActiveTagsToOpen] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)
    const [adminId, setAdminId] = useState(null)

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
            setAdminId('admin') // Always use 'admin' as the recipient_id so it matches app_notifications
            
            // Log active session for Installed Devices report
            const logAdminSession = async () => {
                try {
                    const isNative = typeof window !== 'undefined' && (
                        window.Capacitor !== undefined || 
                        window.location.protocol === 'capacitor:'
                    );
                    
                    // Generate/retrieve a persistent device session ID for this browser/device
                    let devId = localStorage.getItem('device_session_id');
                    if (!devId) {
                        devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        localStorage.setItem('device_session_id', devId);
                    }
                    
                    await fetch('/api/admin/reports/installed-devices', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: 'admin',
                            userName: session.name || 'Admin',
                            role: 'admin',
                            platform: isNative ? 'Admin App (Mobile)' : 'Web Browser',
                            appVersion: '1.0.0',
                            deviceSessionId: devId
                        })
                    });
                } catch (e) {
                    console.warn('Failed to log admin session:', e);
                }
            };
            logAdminSession();
        } catch {
            router.replace('/login')
            return
        }
        setAuthChecked(true)
    }, [])

    // ── Request push notification permission after login ────────────────────
    const { needsPrompt: needsNotifPrompt, promptNow: enableNotifications } =
        usePushNotifications({ userType: 'admin', userId: authChecked ? 'admin' : null })

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
        window.openTechnicianManagement = (subTab) => {
            setReportsSectionToOpen('technicians')
            setTechSubTabToOpen(subTab)
            setActiveTab('reports')
        }
        window.openPerformanceTracking = (subTab) => {
            setReportsSectionToOpen('incentives')
            setTechSubTabToOpen(subTab)
            setActiveTab('reports')
        }
        window.openWebsiteAnalyticsLeadsTracker = () => {
            setReportsSectionToOpen('slots');
            setReportsSubSectionToOpen('leads-tracker');
            setActiveTab('reports');
        }
        window.openCreatePaymentForm = () => {
            setAccountsFormToOpen('payment-voucher');
            setAccountsSubTabToOpen('payments');
            setActiveTab('accounts');
        }
        window.openCreatePurchaseForm = () => {
            setAccountsFormToOpen('purchase-invoice');
            setAccountsSubTabToOpen('purchases');
            setActiveTab('accounts');
        }
        window.openDaybookReport = () => {
            setReportsSectionToOpen('daybook');
            setActiveTab('reports');
        }
        window.openRentalsReport = () => {
            setReportsSectionToOpen('rentals');
            setActiveTab('reports');
        }
        window.openCustomerPaymentsReport = () => {
            setReportsSectionToOpen('customer-payments');
            setActiveTab('reports');
        }
        window.openJobsMapWithFilter = (activeTags) => {
            setJobsViewTypeToOpen('map');
            setJobsActiveTagsToOpen(activeTags);
            setActiveTab('jobs');
        }
        return () => {
            delete window.openCustomerAccount
            delete window.openJobInJobsTab
            delete window.openTechnicianManagement
            delete window.openPerformanceTracking
            delete window.openWebsiteAnalyticsLeadsTracker
            delete window.openCreatePaymentForm
            delete window.openCreatePurchaseForm
            delete window.openDaybookReport
            delete window.openRentalsReport
            delete window.openCustomerPaymentsReport
            delete window.openJobsMapWithFilter
        }
    }, [])

    // Listen to visibilitychange (web/PWA) and Capacitor appStateChange (native app resume) to refresh active components
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleForeground = () => {
            console.log('[App] Foreground focus/resume detected. Broadcasting refresh event...');
            window.dispatchEvent(new CustomEvent('refresh-active-tab'));
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleForeground();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        let appStateListener = null;
        const initCapacitorState = async () => {
            try {
                if (window.Capacitor) {
                    const { App } = await import('@capacitor/app');
                    appStateListener = await App.addListener('appStateChange', (state) => {
                        if (state.isActive) {
                            console.log('[Capacitor] App resumed (active)');
                            handleForeground();
                        }
                    });
                }
            } catch (err) {
                console.warn('Capacitor AppState listener failed to initialize:', err);
            }
        };
        initCapacitorState();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (appStateListener) {
                appStateListener.remove();
            }
        };
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
                return (
                    <JobsTab 
                        jobToOpen={jobToOpen} 
                        onJobOpened={() => setJobToOpen(null)} 
                        initialViewType={jobsViewTypeToOpen}
                        initialActiveTags={jobsActiveTagsToOpen}
                        onClearInitial={() => {
                            setJobsViewTypeToOpen(null);
                            setJobsActiveTagsToOpen(null);
                        }}
                    />
                )
            case 'dashboard':
                return (
                    <div className="dashboard-placeholder" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '600px', margin: '0 auto 20px auto', position: 'relative', zIndex: 9999 }}>
                            <h2 style={{ margin: 0 }}>Dashboard</h2>
                            {adminId && (
                                <div style={{ transform: 'scale(1.2)' }}>
                                    <NotificationBell recipientId={adminId} recipientType="admin" theme="dark" />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                            <DashboardLivePerformance />

                            <DashboardQuickInsights />

                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👥 Technician Live Status
                                </h3>
                                <TechnicianLiveMap height={325} showRoster={true} isDashboard={true} hideMap={true} />
                            </div>

                            <DashboardFollowups />
                        </div>
                    </div>
                )
            case 'accounts':
                return (
                    <AccountsTab 
                        customerToOpen={customerToOpen} 
                        onCustomerOpened={() => setCustomerToOpen(null)} 
                        initialForm={accountsFormToOpen}
                        initialSubTab={accountsSubTabToOpen}
                        onClearInitial={() => {
                            setAccountsFormToOpen(null);
                            setAccountsSubTabToOpen(null);
                        }}
                    />
                )
            case 'inventory':
                return <InventoryTab />
            case 'reports':
                return (
                    <ReportsTab 
                        initialSection={reportsSectionToOpen}
                        initialSubSection={reportsSubSectionToOpen}
                        initialTechSubTab={techSubTabToOpen}
                        onClearInitial={() => {
                            setReportsSectionToOpen(null);
                            setReportsSubSectionToOpen(null);
                            setTechSubTabToOpen(null);
                        }}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="admin-app">
            {/* ── iOS notification prompt banner ── */}
            {needsNotifPrompt && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    backgroundColor: '#f59e0b', color: '#0f172a',
                    padding: '10px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 600,
                }}>
                    <span>🔔 Tap to enable push notifications</span>
                    <button
                        onClick={enableNotifications}
                        style={{
                            padding: '6px 14px', backgroundColor: '#0f172a', color: '#f59e0b',
                            border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13,
                        }}
                    >
                        Enable
                    </button>
                </div>
            )}

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
