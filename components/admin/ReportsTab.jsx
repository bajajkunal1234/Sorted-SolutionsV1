'use client'

import { useState } from 'react';
import { FileText, DollarSign, Settings, Calendar, Printer, List, TrendingUp, Clipboard, Clock, Shield, Award, MessageSquare, QrCode, Package, History, ChevronRight, User } from 'lucide-react';
import DaybookView from '@/components/reports/DaybookView';
import DailyExpenses from '@/components/reports/DailyExpenses';
import IssuesManagement from '@/components/reports/IssuesManagement';
import VoucherNumberingSettings from '@/components/reports/VoucherNumberingSettings';
import PrevisitRequirements from '@/components/reports/PrevisitRequirements';
import WebsiteSettings from '@/components/reports/WebsiteSettings';
import PrintSetup from '@/components/reports/PrintSetup';
import TechnicianPermissions from '@/components/reports/TechnicianPermissions';
import IncentivesManagement from '@/components/reports/IncentivesManagement';
import FinancialReports from '@/components/reports/FinancialReports';
import WhatsAppTemplateManager from '@/components/admin/WhatsAppTemplateManager';
import QRCodeManager from '@/components/admin/QRCodeManager';
import RentalsTab from '@/components/reports/RentalsTab';
import AMCTab from '@/components/reports/AMCTab';

import InteractionsTab from '@/components/accounts/InteractionsTab';
import TechnicianManager from './technicians/TechnicianManager';

function ReportsTab({ onOpenSettings }) {
    const [activeSection, setActiveSection] = useState(null); // null = homepage

    const sections = [
        { id: 'daybook', label: 'Daybook', icon: Calendar, component: DaybookView, color: '#3b82f6', description: 'View daily transaction records' },
        { id: 'expenses', label: 'Daily Expenses', icon: DollarSign, component: DailyExpenses, color: '#10b981', description: 'Track daily business expenses' },
        { id: 'rentals', label: 'Rentals', icon: Package, component: RentalsTab, color: '#8b5cf6', description: 'Manage rental agreements' },
        { id: 'amc', label: 'AMC', icon: Shield, component: AMCTab, color: '#06b6d4', description: 'Annual Maintenance Contracts' },
        { id: 'interactions', label: 'Interactions', icon: History, component: InteractionsTab, color: '#ec4899', description: 'View all customer interactions' },
        { id: 'issues', label: 'Issues Management', icon: List, component: IssuesManagement, color: '#f59e0b', description: 'Track and resolve issues' },
        { id: 'numbering', label: 'Voucher Numbering', icon: Settings, component: VoucherNumberingSettings, color: '#6366f1', description: 'Configure voucher sequences' },
        { id: 'previsit', label: 'Pre-visit Checklist', icon: Clipboard, component: PrevisitRequirements, color: '#14b8a6', description: 'Manage pre-visit requirements' },
        { id: 'slots', label: 'Website Settings', icon: Clock, component: WebsiteSettings, color: '#f97316', description: 'Manage website content & forms' },
        { id: 'print', label: 'Print Setup', icon: Printer, component: PrintSetup, color: '#84cc16', description: 'Configure print templates' },
        { id: 'permissions', label: 'Permissions', icon: Shield, component: TechnicianPermissions, color: '#64748b', description: 'Manage user permissions' },
        { id: 'incentives', label: 'Incentives', icon: Award, component: IncentivesManagement, color: '#0ea5e9', description: 'Configure incentive programs' },
        { id: 'financial', label: 'Financial Reports', icon: TrendingUp, component: FinancialReports, color: '#a855f7', description: 'View financial analytics' },
        { id: 'templates', label: 'WhatsApp Templates', icon: MessageSquare, component: WhatsAppTemplateManager, color: '#22c55e', description: 'Manage WhatsApp message templates' },
        { id: 'templates', label: 'WhatsApp Templates', icon: MessageSquare, component: WhatsAppTemplateManager, color: '#22c55e', description: 'Manage WhatsApp message templates' },
        { id: 'qrcodes', label: 'QR Codes', icon: QrCode, component: QRCodeManager, color: '#eab308', description: 'Generate and manage QR codes' },
        { id: 'technician-users', label: 'Technician Users', icon: User, component: TechnicianManager, color: '#f43f5e', description: 'Manage technician logins & accounts' }
    ];

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
                gap: 'var(--spacing-md)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <FileText size={24} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>
                        Reports & Settings
                    </h2>
                </div>
                {onOpenSettings && (
                    <button
                        className="btn btn-secondary"
                        onClick={onOpenSettings}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                        title="Company Settings"
                    >
                        <Settings size={18} />
                        Company
                    </button>
                )}
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
                    onClick={() => setActiveSection(null)}
                >
                    Reports
                </span>
                {activeSection && (
                    <>
                        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {activeLabel}
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
                    <ActiveComponent />
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
        </div>
    );
}

export default ReportsTab;






