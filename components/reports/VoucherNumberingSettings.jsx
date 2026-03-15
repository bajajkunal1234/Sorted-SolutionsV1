'use client'

import { useState, useEffect } from 'react';
import { Save, RotateCcw, Eye } from 'lucide-react';
import { voucherNumberingDefaults } from '../../data/reportsData';

function VoucherNumberingSettings() {
    const [settings, setSettings] = useState(voucherNumberingDefaults);
    const [previewType, setPreviewType] = useState('sales');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/admin/website-settings?key=voucher_numbering');
                const result = await response.json();
                if (result.success && result.data && result.data.value) {
                    setSettings(result.data.value);
                }
            } catch (error) {
                console.error('Error fetching voucher numbering settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const voucherTypes = [
        { id: 'sales', label: 'Sales Invoice', color: '#10b981' },
        { id: 'purchase', label: 'Purchase Invoice', color: '#ef4444' },
        { id: 'receipt', label: 'Receipt Voucher', color: '#3b82f6' },
        { id: 'payment', label: 'Payment Voucher', color: '#f59e0b' }
    ];

    const resetFrequencies = [
        { id: 'never', label: 'Never' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'yearly', label: 'Yearly' },
        { id: 'financial-year', label: 'Financial Year (Apr-Mar)' }
    ];

    const updateSetting = (voucherType, field, value) => {
        setSettings(prev => prev.map(s => {
            if (s.voucherType === voucherType) {
                const updated = { ...s, [field]: value };
                // Update format preview
                const year = new Date().getFullYear();
                const paddedNumber = String(updated.currentNumber).padStart(updated.padding, '0');
                updated.format = `${updated.prefix}${updated.prefix ? '-' : ''}${year}${year ? '-' : ''}${paddedNumber}${updated.suffix ? '-' + updated.suffix : ''}`;
                return updated;
            }
            return s;
        }));
    };

    const handleReset = (voucherType) => {
        if (confirm('Are you sure you want to reset the numbering? This will set the current number back to the starting number.')) {
            updateSetting(voucherType, 'currentNumber', settings.find(s => s.voucherType === voucherType).startingNumber);
            updateSetting(voucherType, 'lastResetDate', new Date().toISOString());
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/website-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'voucher_numbering',
                    value: settings,
                    description: 'Configuration for automatic voucher numbering'
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('Voucher numbering settings saved successfully!');
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const getVoucherColor = (typeId) => {
        return voucherTypes.find(t => t.id === typeId)?.color || '#6b7280';
    };

    const getVoucherLabel = (typeId) => {
        return voucherTypes.find(t => t.id === typeId)?.label || typeId;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Voucher Numbering Settings
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure automatic numbering for invoices, receipts, and payments
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            {/* Settings Grid */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {settings.map(setting => (
                        <div
                            key={setting.voucherType}
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-lg)',
                                borderLeft: `4px solid ${getVoucherColor(setting.voucherType)}`
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 'var(--spacing-md)',
                                paddingBottom: 'var(--spacing-sm)',
                                borderBottom: '1px solid var(--border-primary)'
                            }}>
                                <h4 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    margin: 0,
                                    color: getVoucherColor(setting.voucherType)
                                }}>
                                    {getVoucherLabel(setting.voucherType)}
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleReset(setting.voucherType)}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <RotateCcw size={14} />
                                    Reset Counter
                                </button>
                            </div>

                            {/* Format Preview */}
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-md)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                    Preview Format
                                </div>
                                <div style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    color: getVoucherColor(setting.voucherType)
                                }}>
                                    {setting.format}
                                </div>
                            </div>

                            {/* Settings Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {/* Prefix */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Prefix
                                    </label>
                                    <input
                                        type="text"
                                        value={setting.prefix}
                                        onChange={(e) => updateSetting(setting.voucherType, 'prefix', e.target.value.toUpperCase())}
                                        placeholder="INV"
                                        className="form-input"
                                        style={{ width: '100%', fontFamily: 'monospace' }}
                                    />
                                </div>

                                {/* Suffix */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Suffix (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={setting.suffix}
                                        onChange={(e) => updateSetting(setting.voucherType, 'suffix', e.target.value.toUpperCase())}
                                        placeholder=""
                                        className="form-input"
                                        style={{ width: '100%', fontFamily: 'monospace' }}
                                    />
                                </div>

                                {/* Starting Number */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Starting Number
                                    </label>
                                    <input
                                        type="number"
                                        value={setting.startingNumber}
                                        onChange={(e) => updateSetting(setting.voucherType, 'startingNumber', parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Current Number */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Current Number
                                    </label>
                                    <input
                                        type="number"
                                        value={setting.currentNumber}
                                        onChange={(e) => updateSetting(setting.voucherType, 'currentNumber', parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="form-input"
                                        style={{ width: '100%', fontWeight: 600 }}
                                    />
                                </div>

                                {/* Padding */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Number Padding
                                    </label>
                                    <select
                                        value={setting.padding}
                                        onChange={(e) => updateSetting(setting.voucherType, 'padding', parseInt(e.target.value))}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        <option value="1">1 (1, 2, 3...)</option>
                                        <option value="2">2 (01, 02, 03...)</option>
                                        <option value="3">3 (001, 002, 003...)</option>
                                        <option value="4">4 (0001, 0002, 0003...)</option>
                                        <option value="5">5 (00001, 00002...)</option>
                                    </select>
                                </div>

                                {/* Reset Frequency */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Auto-Reset
                                    </label>
                                    <select
                                        value={setting.resetFrequency}
                                        onChange={(e) => updateSetting(setting.voucherType, 'resetFrequency', e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        {resetFrequencies.map(freq => (
                                            <option key={freq.id} value={freq.id}>{freq.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Last Reset Info */}
                            {setting.lastResetDate && (
                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    Last reset: {new Date(setting.lastResetDate).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Info Box */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)'
                }}>
                    <strong style={{ color: 'var(--color-primary)' }}>💡 Tips:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>Prefix and suffix are optional but help identify voucher types</li>
                        <li>Current number will auto-increment with each new voucher</li>
                        <li>Padding adds leading zeros (e.g., 0001, 0002)</li>
                        <li>Auto-reset will restart numbering based on selected frequency</li>
                        <li>Manual reset is useful when starting a new financial year</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default VoucherNumberingSettings;





