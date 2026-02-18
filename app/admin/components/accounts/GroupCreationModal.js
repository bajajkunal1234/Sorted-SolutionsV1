'use client'

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { primaryCOAGroups } from '@/lib/data/accountingData';
import { checkDuplicateName, getGroupPath } from '@/lib/utils/accountHelpers';

function GroupCreationModal({ onClose, onSave, groups = [] }) {
    const [formData, setFormData] = useState({
        name: '',
        alias: '',
        under: '',
        behavesAsSubLedger: false,
        nettDebitCreditBalance: 'not-applicable',
        usedForCalculation: 'none',
        allocationMethod: 'not-applicable'
    });

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    // Check for duplicate group names
    const handleNameChange = (name) => {
        setFormData({ ...formData, name });

        if (name.trim()) {
            const duplicate = checkDuplicateName(name, groups);
            setDuplicateWarning(duplicate);
        } else {
            setDuplicateWarning(null);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = {};

        if (!formData.name.trim()) {
            validationErrors.name = 'Group name is required';
        }

        if (duplicateWarning) {
            validationErrors.name = 'Group name already exists';
        }

        if (!formData.under) {
            validationErrors.under = 'Please select parent group';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        try {
            // Create new group
            const newGroup = {
                id: formData.name.toLowerCase().replace(/\s+/g, '-'),
                name: formData.name,
                alias: formData.alias || formData.name,
                parent: formData.under,
                nature: groups.find(g => g.id === formData.under)?.nature || 'asset',
                behavesAsSubLedger: formData.behavesAsSubLedger,
                nettDebitCreditBalance: formData.nettDebitCreditBalance,
                usedForCalculation: formData.usedForCalculation,
                allocationMethod: formData.allocationMethod,
                createdAt: new Date().toISOString()
            };

            console.log('New Group:', newGroup);

            if (onSave) {
                await onSave(newGroup);
            }

            onClose();
        } catch (err) {
            console.error('Error submitting group:', err);
            // Error is handled by parent's onSave catch block usually, 
            // but we keep isSaving false to allow retry
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '700px', maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Create New Group</h2>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '65vh', overflowY: 'auto' }}>
                    {/* ... rest of content remains same until footer ... */}
                    {/* I will use multi_replace if I need to change lines inside, but I'll start with this replacement */}

                    {/* Info Box */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #3b82f6',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                            <AlertCircle size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                <strong>Create Custom Groups</strong>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                                    Groups help organize accounts (e.g., "Mumbai Customers", "Delhi Vendors").
                                    Configure group behavior using Tally-style settings below.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 1. Group Name */}
                    <div className="form-group">
                        <label className="form-label">1. Group Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Mumbai Customers, Delhi Vendors"
                            required
                            style={{ borderColor: duplicateWarning ? '#ef4444' : undefined }}
                        />
                        {duplicateWarning && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                marginTop: 'var(--spacing-xs)',
                                color: '#ef4444',
                                fontSize: 'var(--font-size-xs)'
                            }}>
                                <AlertCircle size={14} />
                                <span>Group "{duplicateWarning.name}" already exists</span>
                            </div>
                        )}
                        {errors.name && (
                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.name}</span>
                        )}
                    </div>

                    {/* 2. Alias (SKU) */}
                    <div className="form-group">
                        <label className="form-label">2. Alias (SKU)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.alias}
                            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                            onKeyDown={handleKeyDown}
                            placeholder="Optional short name or code"
                        />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            Leave blank to use group name
                        </span>
                    </div>

                    {/* 3. Under (Parent Group) */}
                    <div className="form-group">
                        <label className="form-label">3. Under (Parent Group) *</label>
                        <select
                            className="form-select"
                            value={formData.under}
                            onChange={(e) => setFormData({ ...formData, under: e.target.value })}
                            required
                        >
                            <option value="">Select Parent Group</option>
                            <optgroup label="Primary Groups">
                                {primaryCOAGroups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Sub Groups">
                                {groups
                                    .filter(g => g.parent && !primaryCOAGroups.find(p => p.id === g.id))
                                    .map(group => (
                                        <option key={group.id} value={group.id}>
                                            {getGroupPath(group.id, groups)}
                                        </option>
                                    ))}
                            </optgroup>
                        </select>
                        {errors.under && (
                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.under}</span>
                        )}
                    </div>

                    {/* 4. Group Behaves Like a Sub-Ledger */}
                    <div className="form-group">
                        <label className="form-label">4. Group Behaves Like a Sub-Ledger</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="behavesAsSubLedger"
                                    checked={formData.behavesAsSubLedger === true}
                                    onChange={() => setFormData({ ...formData, behavesAsSubLedger: true })}
                                />
                                <span>Yes</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="behavesAsSubLedger"
                                    checked={formData.behavesAsSubLedger === false}
                                    onChange={() => setFormData({ ...formData, behavesAsSubLedger: false })}
                                />
                                <span>No</span>
                            </label>
                        </div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                            If Yes, this group can have ledgers directly under it
                        </span>
                    </div>

                    {/* 5. Nett Debit/Credit Balance for Reporting */}
                    <div className="form-group">
                        <label className="form-label">5. Nett Debit/Credit Balance for Reporting</label>
                        <select
                            className="form-select"
                            value={formData.nettDebitCreditBalance}
                            onChange={(e) => setFormData({ ...formData, nettDebitCreditBalance: e.target.value })}
                        >
                            <option value="not-applicable">Not Applicable</option>
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                        </select>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                            How should balances be reported in financial statements
                        </span>
                    </div>

                    {/* 6. Used for Calculation */}
                    <div className="form-group">
                        <label className="form-label">6. Used for Calculation</label>
                        <select
                            className="form-select"
                            value={formData.usedForCalculation}
                            onChange={(e) => setFormData({ ...formData, usedForCalculation: e.target.value })}
                        >
                            <option value="none">None</option>
                            <option value="gst">GST Calculation</option>
                            <option value="discount">Discount Calculation</option>
                            <option value="tax">Other Tax Calculation</option>
                            <option value="additional-cost">Additional Cost</option>
                        </select>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                            Whether this group is used in invoice calculations
                        </span>
                    </div>

                    {/* 7. Method to Allocate When Used in Purchase Invoice */}
                    <div className="form-group">
                        <label className="form-label">7. Method to Allocate When Used in Purchase Invoice</label>
                        <select
                            className="form-select"
                            value={formData.allocationMethod}
                            onChange={(e) => setFormData({ ...formData, allocationMethod: e.target.value })}
                        >
                            <option value="not-applicable">Not Applicable</option>
                            <option value="appropriate-by-qty">Appropriate by Quantity</option>
                            <option value="appropriate-by-value">Appropriate by Value</option>
                            <option value="not-appropriate">Not to be Appropriated</option>
                        </select>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                            How costs should be allocated in purchase invoices
                        </span>
                    </div>

                    {/* Summary */}
                    {formData.name && formData.under && (
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            marginTop: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                Group Summary
                            </h4>
                            <div style={{ fontSize: 'var(--font-size-sm)', display: 'grid', gap: '4px' }}>
                                <div>
                                    <strong>Full Path:</strong> {getGroupPath(formData.under, groups)} &gt; {formData.name}
                                </div>
                                <div>
                                    <strong>Nature:</strong> {groups.find(g => g.id === formData.under)?.nature || 'N/A'}
                                </div>
                                <div>
                                    <strong>Can Have Ledgers:</strong> {formData.behavesAsSubLedger ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={isSaving}
                        onClick={handleSubmit}
                    >
                        {isSaving ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div >
    );
}

export default GroupCreationModal;
