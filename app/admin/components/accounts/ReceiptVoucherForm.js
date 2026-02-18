'use client'

import { useState } from 'react';
import { X, Plus, AlertCircle, Save } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import NewAccountForm from './NewAccountForm';

function ReceiptVoucherForm({ onClose, onSave, existingReceipt }) {
    const [formData, setFormData] = useState({
        date: existingReceipt?.date || new Date().toISOString().split('T')[0],
        account_id: existingReceipt?.account_id || '',
        amount: existingReceipt?.amount?.toString() || '',
        payment_mode: existingReceipt?.payment_mode || 'cash',
        reference_number: existingReceipt?.reference_number || '',
        narration: existingReceipt?.narration || ''
    });

    const [showNewAccountForm, setShowNewAccountForm] = useState(false);

    const paymentModes = [
        { value: 'cash', label: 'Cash' },
        { value: 'upi', label: 'UPI' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' }
    ];

    const handleSubmit = () => {
        if (!formData.account_id) {
            alert('Please select an account');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!formData.narration.trim()) {
            alert('Please enter narration');
            return;
        }

        const voucher = {
            ...formData,
            amount: parseFloat(formData.amount),
            type: 'receipt'
        };

        if (onSave) {
            onSave(voucher);
        }
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#10b981' }}>
                            {existingReceipt ? 'Edit Receipt Voucher' : 'Create Receipt Voucher'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 'var(--spacing-xs)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Date */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Voucher Date *
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Account Selector */}
                        <div>
                            <AccountSelector
                                value={formData.account_id}
                                onChange={(id) => setFormData({ ...formData, account_id: id })}
                                onCreateNew={() => setShowNewAccountForm(true)}
                                accountType="customer"
                                label="Received From"
                            />
                        </div>

                        {/* Amount & ModeRow */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Amount *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-tertiary)' }}>₹</span>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                        style={{ width: '100%', paddingLeft: '28px' }}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Payment Mode *
                                </label>
                                <select
                                    className="form-input"
                                    value={formData.payment_mode}
                                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    {paymentModes.map(mode => (
                                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Reference Number */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Reference Number
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.reference_number}
                                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                                placeholder="Transaction ID, Cheque No. etc."
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Narration */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Narration *
                            </label>
                            <textarea
                                className="form-input"
                                value={formData.narration}
                                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                                rows="3"
                                placeholder="Details of the payment received..."
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        style={{ padding: '8px 24px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Save size={18} />
                        {existingReceipt ? 'Update Receipt' : 'Save Receipt'}
                    </button>
                </div>
            </div>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <NewAccountForm
                    onClose={() => setShowNewAccountForm(false)}
                    onSave={(account) => {
                        setFormData({
                            ...formData,
                            account_id: account.id
                        });
                        setShowNewAccountForm(false);
                    }}
                />
            )}
        </div>
    );
}

export default ReceiptVoucherForm;
