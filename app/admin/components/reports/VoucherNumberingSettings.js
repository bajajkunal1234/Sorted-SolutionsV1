'use client'

import { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, CheckCircle2, AlertCircle, RefreshCw, Hash, FileText, Briefcase, Users, Package } from 'lucide-react';

function VoucherNumberingSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', label: 'All Sequences', icon: Hash },
        { id: 'billing', label: 'Billing & Finance', icon: FileText },
        { id: 'operations', label: 'Jobs & Operations', icon: Briefcase },
        { id: 'accounts', label: 'Accounts & Ledgers', icon: Users },
        { id: 'inventory', label: 'Inventory & Items', icon: Package }
    ];

    const typeMetadata = {
        sales: { category: 'billing', color: '#10b981', label: 'Sales Invoice', desc: 'Customer sales invoices and tax bills' },
        purchase: { category: 'billing', color: '#ef4444', label: 'Purchase Invoice', desc: 'Vendor expenses and purchase invoices' },
        quotation: { category: 'billing', color: '#8b5cf6', label: 'Quotation', desc: 'Price estimates and quotation proposals' },
        receipt: { category: 'billing', color: '#3b82f6', label: 'Receipt Voucher', desc: 'Payments received from customers' },
        payment: { category: 'billing', color: '#f59e0b', label: 'Payment Voucher', desc: 'Payments made to suppliers or technicians' },
        journal: { category: 'billing', color: '#06b6d4', label: 'Journal Entry', desc: 'Double-entry journal vouchers' },
        job: { category: 'operations', color: '#3b82f6', label: 'Job Numbering', desc: 'Service jobs booked online or manually' },
        account_customer: { category: 'accounts', color: '#10b981', label: 'Customer Account Code', desc: 'Customer ledger SKU/code (e.g. C101212)' },
        account_supplier: { category: 'accounts', color: '#f59e0b', label: 'Supplier Account Code', desc: 'Supplier / Creditor ledger SKU/code' },
        account_general: { category: 'accounts', color: '#64748b', label: 'General Account Code', desc: 'Banks, expenses, and general ledger codes' },
        inventory_product: { category: 'inventory', color: '#ec4899', label: 'Inventory Product SKU', desc: 'Physical parts and equipment stock' },
        inventory_service: { category: 'inventory', color: '#14b8a6', label: 'Inventory Service SKU', desc: 'Labor and service charge items' }
    };

    const resetFrequencies = [
        { id: 'never', label: 'Never' },
        { id: 'yearly', label: 'Yearly (Jan 1)' },
        { id: 'financial-year', label: 'Financial Year (Apr 1)' },
        { id: 'monthly', label: 'Monthly' }
    ];

    // Compute preview string dynamically
    const computePreview = (s) => {
        if (!s) return '';
        const now = new Date();
        let yearStr = '';
        if (s.include_year === 'YYYY') yearStr = String(now.getFullYear());
        else if (s.include_year === 'YY') yearStr = String(now.getFullYear()).slice(-2);

        const pad = Number(s.padding) || 0;
        const num = s.current_number ?? s.starting_number ?? 1;
        const paddedNum = pad > 0 ? String(num).padStart(pad, '0') : String(num);
        const sep = s.separator !== undefined ? s.separator : '-';

        let result = s.prefix || '';
        if (yearStr) {
            result = result && sep ? `${result}${sep}${yearStr}` : `${result}${yearStr}`;
        }
        if (result && sep) {
            result = `${result}${sep}${paddedNum}`;
        } else {
            result = `${result}${paddedNum}`;
        }
        if (s.suffix) {
            result = sep ? `${result}${sep}${s.suffix}` : `${result}${s.suffix}`;
        }
        return result;
    };

    // Fetch settings from Supabase API
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/voucher-settings');
            const json = await res.json();
            if (json.success && Array.isArray(json.settings)) {
                setSettings(json.settings.map(s => ({
                    ...s,
                    format_preview: computePreview(s)
                })));
            } else {
                throw new Error(json.error || 'Failed to load settings');
            }
        } catch (err) {
            console.error('Failed to load voucher settings:', err);
            setStatusMessage({ type: 'error', text: 'Failed to load voucher settings: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const updateSetting = (voucherType, field, value) => {
        setSettings(prev => prev.map(s => {
            if (s.voucher_type === voucherType) {
                const updated = { ...s, [field]: value };
                updated.format_preview = computePreview(updated);
                return updated;
            }
            return s;
        }));
    };

    const handleReset = async (voucherType) => {
        const item = settings.find(s => s.voucher_type === voucherType);
        const label = typeMetadata[voucherType]?.label || voucherType;
        if (!confirm(`Are you sure you want to reset "${label}"? This will reset the current number back to starting number (${item?.starting_number || 1}).`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin/voucher-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', voucher_type: voucherType })
            });
            const json = await res.json();
            if (json.success && json.data) {
                setSettings(prev => prev.map(s => s.voucher_type === voucherType ? {
                    ...s,
                    current_number: json.data.current_number,
                    last_reset_date: json.data.last_reset_date,
                    format_preview: computePreview(json.data)
                } : s));
                setStatusMessage({ type: 'success', text: `Counter for ${label} reset to ${json.data.current_number}` });
                setTimeout(() => setStatusMessage(null), 4000);
            } else {
                throw new Error(json.error || 'Failed to reset counter');
            }
        } catch (err) {
            alert('Failed to reset counter: ' + err.message);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatusMessage(null);
        try {
            const res = await fetch('/api/admin/voucher-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });
            const json = await res.json();
            if (json.success) {
                setStatusMessage({ type: 'success', text: 'All voucher numbering settings saved to database successfully!' });
                if (json.settings) {
                    setSettings(json.settings.map(s => ({
                        ...s,
                        format_preview: computePreview(s)
                    })));
                }
                setTimeout(() => setStatusMessage(null), 4000);
            } else {
                throw new Error(json.error || 'Failed to save settings');
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: 'Failed to save: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const filteredSettings = useMemo(() => {
        if (activeCategory === 'all') return settings;
        return settings.filter(s => {
            const meta = typeMetadata[s.voucher_type];
            return meta && meta.category === activeCategory;
        });
    }, [settings, activeCategory]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Voucher Numbering Settings
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure sequential prefixes, year formats, counters, and auto-reset rules across all system transactions
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={loadSettings}
                        disabled={loading || saving}
                        title="Reload from database"
                        style={{ padding: '8px 12px' }}
                    >
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </div>

            {/* Status Alert Banner */}
            {statusMessage && (
                <div style={{
                    padding: '10px 16px',
                    margin: '12px 16px 0',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span style={{ flex: 1, fontWeight: 500 }}>{statusMessage.text}</span>
                </div>
            )}

            {/* Category Filter Pills (Mobile Friendly) */}
            <div style={{
                padding: '12px 16px 0',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none'
            }}>
                {categories.map(cat => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '9999px',
                                border: '1px solid',
                                borderColor: isActive ? 'var(--color-primary)' : 'var(--border-primary)',
                                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
                                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                                fontWeight: isActive ? 600 : 400,
                                fontSize: 'var(--font-size-xs)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={14} />
                            {cat.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Settings Grid */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                        <div>Loading voucher numbering sequences...</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-lg)' }}>
                        {filteredSettings.map(setting => {
                            const meta = typeMetadata[setting.voucher_type] || {};
                            const color = meta.color || '#64748b';
                            const label = setting.label || meta.label || setting.voucher_type;
                            const desc = meta.desc || '';

                            return (
                                <div
                                    key={setting.voucher_type}
                                    style={{
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--spacing-md)',
                                        borderTop: `4px solid ${color}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                <h4 style={{
                                                    fontSize: 'var(--font-size-base)',
                                                    fontWeight: 600,
                                                    margin: 0,
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {label}
                                                </h4>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: `${color}20`,
                                                    color: color
                                                }}>
                                                    {setting.voucher_type}
                                                </span>
                                            </div>
                                            {desc && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {desc}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleReset(setting.voucher_type)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Reset current counter to starting number"
                                        >
                                            <RotateCcw size={12} />
                                            Reset
                                        </button>
                                    </div>

                                    {/* Live Format Preview */}
                                    <div style={{
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center',
                                        border: '1px dashed var(--border-primary)'
                                    }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Live Preview Format
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                            color: color,
                                            wordBreak: 'break-all'
                                        }}>
                                            {setting.format_preview || computePreview(setting)}
                                        </div>
                                    </div>

                                    {/* Editable Inputs Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        {/* Prefix */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Prefix
                                            </label>
                                            <input
                                                type="text"
                                                value={setting.prefix || ''}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'prefix', e.target.value.toUpperCase())}
                                                placeholder="e.g. INV"
                                                className="form-input"
                                                style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '6px 8px' }}
                                            />
                                        </div>

                                        {/* Separator */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Separator
                                            </label>
                                            <select
                                                value={setting.separator !== undefined ? setting.separator : '-'}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'separator', e.target.value)}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            >
                                                <option value="-">Hyphen (-)</option>
                                                <option value="/">Slash (/)</option>
                                                <option value="">None</option>
                                            </select>
                                        </div>

                                        {/* Year Format */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Year in Voucher
                                            </label>
                                            <select
                                                value={setting.include_year || 'NONE'}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'include_year', e.target.value)}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            >
                                                <option value="YYYY">Full Year (2026)</option>
                                                <option value="YY">Short Year (26)</option>
                                                <option value="NONE">No Year</option>
                                            </select>
                                        </div>

                                        {/* Padding */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Padding (Leading 0s)
                                            </label>
                                            <select
                                                value={setting.padding || 0}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'padding', parseInt(e.target.value, 10))}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            >
                                                <option value="0">No Padding (1, 2, 3...)</option>
                                                <option value="2">2 digits (01, 02...)</option>
                                                <option value="3">3 digits (001, 002...)</option>
                                                <option value="4">4 digits (0001, 0002...)</option>
                                                <option value="5">5 digits (00001, 00002...)</option>
                                                <option value="6">6 digits (000001...)</option>
                                            </select>
                                        </div>

                                        {/* Starting Number */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Starting Number
                                            </label>
                                            <input
                                                type="number"
                                                value={setting.starting_number || 1}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'starting_number', parseInt(e.target.value, 10) || 1)}
                                                min="1"
                                                className="form-input"
                                                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                                            />
                                        </div>

                                        {/* Current Number */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Next Number
                                            </label>
                                            <input
                                                type="number"
                                                value={setting.current_number ?? 1}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'current_number', parseInt(e.target.value, 10) || 1)}
                                                min="1"
                                                className="form-input"
                                                style={{ width: '100%', fontWeight: 700, color, fontSize: '13px', padding: '6px 8px' }}
                                            />
                                        </div>

                                        {/* Auto-Reset */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Auto-Reset
                                            </label>
                                            <select
                                                value={setting.reset_frequency || 'never'}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'reset_frequency', e.target.value)}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                            >
                                                {resetFrequencies.map(freq => (
                                                    <option key={freq.id} value={freq.id}>{freq.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Suffix */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Suffix (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={setting.suffix || ''}
                                                onChange={(e) => updateSetting(setting.voucher_type, 'suffix', e.target.value.toUpperCase())}
                                                placeholder=""
                                                className="form-input"
                                                style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '6px 8px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Last Reset Date Footer */}
                                    {setting.last_reset_date && (
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-tertiary)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            borderTop: '1px solid var(--border-primary)',
                                            paddingTop: '6px'
                                        }}>
                                            <span>Last reset: {new Date(setting.last_reset_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span style={{ color }}>{setting.reset_frequency}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Bottom Guidelines Card */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)'
                }}>
                    <strong style={{ color: 'var(--color-primary)' }}>💡 Centralized Voucher Synchronization:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: 1.6 }}>
                        <li><strong>Live Database Sync:</strong> Numbering sequences are locked atomically in Supabase PostgreSQL to prevent duplicates and race conditions across multiple devices.</li>
                        <li><strong>Universal Coverage:</strong> Controls Invoices, Quotations, Receipts, Payments, Journals, Service Jobs, Customer Accounts, and Inventory SKUs.</li>
                        <li><strong>Next Number Counter:</strong> You can adjust the "Next Number" counter at any time if you wish to skip numbers or align with historical paper books.</li>
                        <li><strong>Auto-Reset:</strong> Yearly resets occur automatically on January 1st; Financial Year resets occur on April 1st.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default VoucherNumberingSettings;
