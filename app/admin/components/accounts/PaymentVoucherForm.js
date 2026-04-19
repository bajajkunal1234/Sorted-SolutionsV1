'use client'

import { useState } from 'react';
import { X, Plus, AlertCircle, Save } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import NewAccountForm from './NewAccountForm';
import JobSelector from './JobSelector';
import InvoiceAllocations from './InvoiceAllocations';

function PaymentVoucherForm({ onClose, onSave, existingPayment }) {
    const [formData, setFormData] = useState({
        date: existingPayment?.date || new Date().toISOString().split('T')[0],
        account_id: existingPayment?.account_id || '',
        amount: existingPayment?.amount?.toString() || '',
        payment_mode: existingPayment?.payment_mode || 'bank_transfer',
        payment_account_id: existingPayment?.payment_account_id || '',
        reference_number: existingPayment?.reference_number || '',
        narration: existingPayment?.notes || existingPayment?.narration || '',
        job_id: existingPayment?.job_id || ''
    });
    const [allocations, setAllocations] = useState(existingPayment?.allocations || []);

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
        if (!formData.payment_account_id) {
            alert('Please select a Payment Account');
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
            type: 'payment',
            allocations,
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
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#ef4444' }}>
                            {existingPayment ? 'Edit Payment Voucher' : 'Create Payment Voucher'}
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
                                onChange={(acc) => setFormData({ ...formData, account_id: acc?.id || '' })}
                                onCreateNew={() => setShowNewAccountForm(true)}
                                accountType="vendor"
                                label="Paid To"
                            />
                        </div>

                        {/* Link to Job */}
                        <JobSelector
                            value={formData.job_id}
                            onChange={(jobId) => setFormData({ ...formData, job_id: jobId || '' })}
                            accountId={formData.account_id}
                            label="Link to Job (optional — for incentives/commissions)"
                        />

                        {/* Invoice Allocations */}
                        <InvoiceAllocations
                            accountId={formData.account_id}
                            invoiceType="purchase"
                            allocations={allocations}
                            onChange={setAllocations}
                            totalAmount={parseFloat(formData.amount) || 0}
                        />

                        {/* Amount & Mode Row */}
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
                                    Paid From Account *
                                </label>
                                <AccountSelector
                                    value={formData.payment_account_id}
                                    onChange={(acc) => setFormData({ ...formData, payment_account_id: acc?.id || '' })}
                                    onCreateNew={null}
                                    accountType="payment_method"
                                    label="Cash / Bank Ledger"
                                />
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
                            Narration / Description *
                            </label>
                            <textarea
                                className="form-input"
                                value={formData.narration}
                                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                                rows="3"
                                placeholder="Details of the payment made..."
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
                        style={{ padding: '8px 24px', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Save size={18} />
                        {existingPayment ? 'Update Payment' : 'Save Payment'}
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

export default PaymentVoucherForm;
