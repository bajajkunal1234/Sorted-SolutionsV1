'use client'

import { useState } from 'react';
import { QrCode, CheckCircle, Edit2 } from 'lucide-react';

function PaymentQRDisplay({ job, amount, onPaymentReceived, onGoBack }) {
    const [paymentMethod, setPaymentMethod] = useState('');

    const handlePaymentReceived = (withFeedback) => {
        if (!paymentMethod) {
            alert('Please select payment method');
            return;
        }

        onPaymentReceived({
            amount,
            method: paymentMethod,
            timestamp: new Date().toISOString(),
            requestFeedback: withFeedback
        });
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <QrCode size={20} color="#10b981" />
                Collect Payment
            </h3>

            {/* Amount Display */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)',
                border: '2px solid #10b981'
            }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    AMOUNT TO COLLECT
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>
                    ₹{amount.toFixed(2)}
                </div>
            </div>

            {/* QR Code Display */}
            <div style={{
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)',
                border: '1px solid var(--border-primary)'
            }}>
                <div style={{
                    width: '250px',
                    height: '250px',
                    margin: '0 auto',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                }}>
                    <QrCode size={64} color="#6b7280" />
                    <div style={{ fontSize: 'var(--font-size-sm)', color: '#6b7280' }}>
                        Payment QR Code
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#9ca3af' }}>
                        (Managed in Admin Panel)
                    </div>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)' }}>
                    Show this QR code to customer for payment
                </p>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Payment Method *
                </label>
                <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                >
                    <option value="">Select payment method...</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cash">Cash</option>
                </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={() => handlePaymentReceived(true)}
                    className="btn btn-primary"
                    style={{ padding: 'var(--spacing-md)', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <CheckCircle size={16} />
                    Payment Received - Take Feedback
                </button>
                <button
                    onClick={() => handlePaymentReceived(false)}
                    className="btn"
                    style={{ padding: 'var(--spacing-md)', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <CheckCircle size={16} />
                    Payment Received - Close Job
                </button>
                <button
                    onClick={onGoBack}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <Edit2 size={14} />
                    Go Back to Edit Quotation
                </button>
            </div>
        </div>
    );
}

export default PaymentQRDisplay;

