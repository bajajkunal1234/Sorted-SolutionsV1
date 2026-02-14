'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';

function PaymentVoucherForm({ onClose, onSave, existingPayment }) {
    const [formData, setFormData] = useState({
        date: existingPayment?.date || new Date().toISOString().split('T')[0],
        account_id: existingPayment?.account_id || '',
        amount: existingPayment?.amount?.toString() || '',
        payment_mode: existingPayment?.payment_mode || 'cash',
        reference_number: existingPayment?.reference_number || '',
        narration: existingPayment?.narration || ''
    });

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
            type: 'payment'
        };

        if (onSave) {
            onSave(voucher);
        } else {
            console.log('Payment Voucher:', voucher);
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
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--bg-primary)',
                    zIndex: 1
                }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0, color: '#ef4444' }}>
                            {existingPayment ? 'Edit Payment Voucher' : 'Payment Voucher'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    {/* Date */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Date *
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Account */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <AccountSelector
                            value={formData.account_id}
                            onChange={(id) => setFormData({ ...formData, account_id: id })}
                            accountType="all"
                            label="Paid To (Account)"
                        />
                    </div>

                    {/* Amount */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Amount *
                        </label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="Enter amount"
                            className="form-input"
                            style={{ width: '100%' }}
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* Payment Mode */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Payment Mode *
                        </label>
                        <select
                            value={formData.payment_mode}
                            onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                            className="form-input"
                            style={{ width: '100%' }}
                        >
                            {paymentModes.map(mode => (
                                <option key={mode.value} value={mode.value}>{mode.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reference Number */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Reference Number
                        </label>
                        <input
                            type="text"
                            value={formData.reference_number}
                            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                            placeholder="Transaction ID, Cheque No., etc."
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Narration */}
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Narration *
                        </label>
                        <textarea
                            value={formData.narration}
                            onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                            placeholder="Description of the payment..."
                            className="form-input"
                            rows="3"
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ padding: 'var(--spacing-md)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="btn btn-primary"
                            style={{ padding: 'var(--spacing-md)', backgroundColor: '#ef4444' }}
                        >
                            {existingPayment ? 'Update Payment' : 'Save Payment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaymentVoucherForm;
