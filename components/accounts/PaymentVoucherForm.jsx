'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import AccountSelector from '../common/AccountSelector';

function PaymentVoucherForm({ onClose, existingPayment, onSuccess }) {
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await fetch('/api/admin/accounts');
                const data = await res.json();
                if (data.success) setAccounts(data.data || []);
            } catch (error) {
                console.error('Error fetching accounts:', error);
            }
        };
        fetchAccounts();
    }, []);

    const [date, setDate] = useState(existingPayment?.date || new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(existingPayment?.accountId || existingPayment?.account_id || '');
    const [amount, setAmount] = useState(existingPayment?.amount?.toString() || '');
    const [paymentMode, setPaymentMode] = useState(existingPayment?.paymentMode || existingPayment?.payment_mode || 'bank_transfer');
    const [referenceNumber, setReferenceNumber] = useState(existingPayment?.referenceNumber || existingPayment?.reference_number || '');
    const [narration, setNarration] = useState(existingPayment?.narration || '');

    const paymentModes = [
        { value: 'cash', label: 'Cash' },
        { value: 'upi', label: 'UPI' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' }
    ];

    const handleSubmit = async () => {
        if (!accountId) {
            alert('Please select an account');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!narration.trim()) {
            alert('Please enter narration');
            return;
        }

        setIsLoading(true);
        try {
            const voucher = {
                date,
                account_id: accountId,
                account_name: accounts.find(a => a.id === accountId)?.name || 'Unknown',
                amount: parseFloat(amount),
                payment_mode: paymentMode,
                reference_number: referenceNumber,
                narration,
                status: 'paid'
            };

            const response = await fetch('/api/admin/transactions?type=payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voucher)
            });

            const result = await response.json();
            if (result.success) {
                alert('Payment Voucher saved successfully!');
                if (onSuccess) onSuccess(result.data);
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error saving payment:', error);
            alert('Error saving payment voucher: ' + error.message);
        } finally {
            setIsLoading(false);
        }
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
                        {existingPayment && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                                Voucher: {existingPayment.reference}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ minWidth: 'auto', padding: 'var(--spacing-xs)' }}
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
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Account */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <AccountSelector
                            value={accountId}
                            onChange={setAccountId}
                            onCreateNew={() => alert('Create New Account form will open here')}
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
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
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
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
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
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="Transaction ID, Cheque No., etc."
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Narration */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Narration *
                        </label>
                        <textarea
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                            placeholder="Description of the payment..."
                            className="form-input"
                            rows="3"
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
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




