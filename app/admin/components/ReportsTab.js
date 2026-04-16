'use client'

import { useState } from 'react';
import { FileText, Globe, DollarSign, Settings, Calendar, Printer, List, TrendingUp, Clipboard, Clock, Shield, Award, MessageSquare, QrCode, Package, History, ChevronRight, Building2, Moon, Sun, Search, Users, Database, Bell, Home, Smartphone, BookOpen } from 'lucide-react';
import DaybookView from './reports/DaybookView';
import VoucherNumberingSettings from './reports/VoucherNumberingSettings';
import PrevisitRequirements from './reports/PrevisitRequirements';
import WebsiteSettings from './reports/WebsiteSettings';
import PrintSetup from './reports/PrintSetup';
import IncentivesManagement from './reports/IncentivesManagement';
import FinancialReports from './reports/FinancialReports';
import InventoryReports from './reports/InventoryReports';
import NotificationCenter from './reports/NotificationCenter';
import QRCodeManager from './admin/QRCodeManager';
import RentalsTab from './reports/RentalsTab';
import AMCTab from './reports/AMCTab';
import BankStatementReconciler from './reports/BankStatementReconciler';
import InteractionsTab from './InteractionsTab';
import CompanyDetailsModal from './CompanyDetailsModal';
import TechnicianManagement from './reports/TechnicianManagement';
import AdminPropertiesTab from './reports/AdminPropertiesTab';
import CustomerAppSettings from './reports/CustomerAppSettings';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';
import AdminSupportPanel from '@/components/admin/support/AdminSupportPanel';

import { settingsByCategory } from '@/lib/data/websiteSettingsData';

import SQLRunnerPage from '../system/sql/page';

function ReportsTab() {
    const [activeSection, setActiveSection] = useState(null); // null = homepage
    const [subSection, setSubSection] = useState(null);
    const [showCompanyDetails, setShowCompanyDetails] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const sections = [
        { id: 'daybook', label: 'Daybook', icon: Calendar, component: DaybookView, color: '#3b82f6', description: 'View daily transaction records' },
        { id: 'properties', label: 'Properties', icon: Home, component: AdminPropertiesTab, color: '#f59e0b', description: 'Manage properties, tenants and service history' },
        { id: 'rentals', label: 'Rentals', icon: Package, component: RentalsTab, color: '#8b5cf6', description: 'Manage rental agreements' },
        { id: 'amc', label: 'AMC', icon: Shield, component: AMCTab, color: '#06b6d4', description: 'Annual Maintenance Contracts' },
        { id: 'interactions', label: 'Interactions', icon: History, component: InteractionsTab, color: '#ec4899', description: 'View all customer interactions' },
        { id: 'numbering', label: 'Voucher Numbering', icon: Settings, component: VoucherNumberingSettings, color: '#6366f1', description: 'Configure voucher sequences' },
        { id: 'previsit', label: 'Pre-visit Checklist', icon: Clipboard, component: PrevisitRequirements, color: '#14b8a6', description: 'Manage pre-visit requirements' },
        { id: 'slots', label: 'Website Settings', icon: Clock, component: WebsiteSettings, color: '#f97316', description: 'Manage website content & forms' },
        { id: 'print', label: 'Print Setup', icon: Printer, component: PrintSetup, color: '#84cc16', description: 'Configure print templates' },
        { id: 'technicians', label: 'Technician Management', icon: Users, component: TechnicianManagement, color: '#3b82f6', description: 'Manage technician accounts, credentials and permissions' },
        { id: 'incentives', label: 'Incentives', icon: Award, component: IncentivesManagement, color: '#0ea5e9', description: 'Configure incentive programs' },
        { id: 'financial', label: 'Financial Reports', icon: TrendingUp, component: FinancialReports, color: '#a855f7', description: 'View financial analytics' },
        { id: 'inventory-reports', label: 'Inventory Reports', icon: Package, component: InventoryReports, color: '#10b981', description: 'Analyse stock, valuation and product performance by category and brand' },
        { id: 'customer-app', label: 'Customer App', icon: Smartphone, component: CustomerAppSettings, color: '#ec4899', description: 'Manage customer app homepage banners' },
        { id: 'notifications', label: 'Notification Center', icon: Bell, component: NotificationCenter, color: '#f59e0b', description: 'Manage push, WhatsApp notifications, templates and triggers' },
        { id: 'qrcodes', label: 'QR Codes', icon: QrCode, component: QRCodeManager, color: '#eab308', description: 'Generate and manage QR codes' },
        { id: 'sql', label: 'SQL Runner', icon: Database, component: SQLRunnerPage, color: '#ef4444', description: 'Run raw SQL queries (Admin Only)' },
        { id: 'bank-reconciler', label: 'Bank Reconciler', icon: FileText, component: BankStatementReconciler, color: '#3b82f6', description: 'Reconcile bank statements with accounting' },
        { id: 'support-sops', label: 'Support SOPs', icon: BookOpen, component: AdminSupportPanel, color: '#8b5cf6', description: 'View and manage technician SOP knowledge base and guides' },
    ];

    // Create searchable index of all settings
    const searchSuggestions = [
        ...sections.map(s => ({ ...s, type: 'section' })),
        ...Object.entries(settingsByCategory).flatMap(([catId, settings]) =>
            settings.map(s => ({
                ...s,
                type: 'website-setting',
                parentId: 'slots',
                categoryLabel: catId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }))
        )
    ];

    // Restore Toggle dark mode
    const toggleDarkMode = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        if (nextMode) {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    };

    const handleSelect = (item) => {
        if (item.type === 'section') {
            setActiveSection(item.id);
            setSubSection(null);
        } else if (item.type === 'website-setting') {
            setActiveSection(item.parentId);
            setSubSection(item.id);
        }
        setSearchTerm('');
    };

    const ActiveComponent = sections.find(s => s.id === activeSection)?.component;
    const activeLabel = sections.find(s => s.id === activeSection)?.label;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1 }}>
                    <FileText size={24} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>
                        {subSection ? (
                            searchSuggestions.find(s => s.id === subSection)?.label || subSection
                        ) : activeLabel || 'Reports & Settings'}
                    </h2>

                    {/* Dynamic Search Bar for Interactions */}
                    {activeSection === 'interactions' && (
                        <div style={{ position: 'relative', flex: 1, maxWidth: '500px', marginLeft: '20px' }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-tertiary)'
                                }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search interactions, customers, jobs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    paddingLeft: '2.5rem',
                                    paddingTop: '8px',
                                    paddingBottom: '8px',
                                    fontSize: 'var(--font-size-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    width: '100%',
                                    backgroundColor: 'var(--bg-secondary)'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                {!activeSection && (
                    <div style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                        <AutocompleteSearch
                            placeholder="Search settings, reports, locations..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                            suggestions={searchSuggestions}
                            onSelect={handleSelect}
                            searchKey="label"
                            renderSuggestion={(item) => {
                                const Icon = item.icon || Settings;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                        <div style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            backgroundColor: `${item.color}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Icon size={16} style={{ color: item.color }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                {item.label}
                                            </span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                {item.type === 'website-setting' ? `Website Settings > ${item.categoryLabel}` : item.description}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={toggleDarkMode}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 12px'
                        }}
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCompanyDetails(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                        <Building2 size={16} />
                        Company Details
                    </button>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)'
            }}>
                <span
                    style={{
                        cursor: 'pointer',
                        color: activeSection ? 'var(--text-secondary)' : 'var(--text-primary)',
                        fontWeight: activeSection ? 400 : 700,
                        transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => activeSection && (e.currentTarget.style.color = 'var(--color-primary)')}
                    onMouseLeave={(e) => activeSection && (e.currentTarget.style.color = 'var(--text-secondary)')}
                    onClick={() => {
                        setActiveSection(null);
                        setSubSection(null);
                    }}
                >
                    Reports
                </span>
                {activeSection && (
                    <>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                        <span
                            style={{
                                cursor: subSection ? 'pointer' : 'default',
                                color: subSection ? 'var(--text-secondary)' : 'var(--text-primary)',
                                fontWeight: subSection ? 400 : 700,
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => subSection && (e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={(e) => subSection && (e.currentTarget.style.color = 'var(--text-secondary)')}
                            onClick={() => setSubSection(null)}
                        >
                            {activeLabel}
                        </span>
                    </>
                )}
                {subSection && (
                    <>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {subSection}
                        </span>
                    </>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {!activeSection ? (
                    // Reports Homepage
                    <div style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                                Reports & Settings Dashboard
                            </h2>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                Access all reports, analytics, and system configurations from one place
                            </p>
                        </div>

                        {/* Category Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
                            {sections.map(section => {
                                const Icon = section.icon;
                                const isDisabled = !section.component;

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => section.component && setActiveSection(section.id)}
                                        disabled={isDisabled}
                                        className="card"
                                        style={{
                                            padding: 'var(--spacing-lg)',
                                            border: '2px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'var(--bg-elevated)',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            opacity: isDisabled ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isDisabled) {
                                                e.currentTarget.style.borderColor = section.color;
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = `0 8px 24px ${section.color}20`;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isDisabled) {
                                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {/* Icon Background */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-20px',
                                            right: '-20px',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            backgroundColor: section.color,
                                            opacity: 0.1
                                        }} />

                                        {/* Content */}
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)',
                                                marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                <div style={{
                                                    padding: 'var(--spacing-sm)',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: `${section.color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Icon size={24} style={{ color: section.color }} />
                                                </div>
                                                <h3 style={{
                                                    fontSize: 'var(--font-size-base)',
                                                    fontWeight: 600,
                                                    margin: 0,
                                                    color: 'var(--text-primary)',
                                                    flex: 1
                                                }}>
                                                    {section.label}
                                                </h3>
                                            </div>
                                            <p style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--text-secondary)',
                                                margin: 0,
                                                lineHeight: 1.5
                                            }}>
                                                {section.description}
                                            </p>
                                        </div>

                                        {/* Arrow Indicator */}
                                        {!isDisabled && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 'var(--spacing-md)',
                                                right: 'var(--spacing-md)',
                                                color: section.color,
                                                opacity: 0.5
                                            }}>
                                                <ChevronRight size={20} />
                                            </div>
                                        )}

                                        {/* Coming Soon Badge */}
                                        {isDisabled && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'var(--spacing-sm)',
                                                right: 'var(--spacing-sm)',
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'var(--bg-tertiary)',
                                                color: 'var(--text-tertiary)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 500
                                            }}>
                                                Soon
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : ActiveComponent ? (
                    <ActiveComponent
                        subSection={subSection}
                        setSubSection={setSubSection}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)'
                    }}>
                        <FileText size={64} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
                            Coming Soon
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>
                            This feature is under development and will be available soon.
                        </p>
                    </div>
                )}
            </div>

            {/* Company Details Modal */}
            {showCompanyDetails && (
                <CompanyDetailsModal onClose={() => setShowCompanyDetails(false)} />
            )}
        </div>
    );
}

export default ReportsTab;
