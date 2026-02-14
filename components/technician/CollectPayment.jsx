'use client'

import { useState } from 'react';
import { CreditCard, Banknote, QrCode, CheckCircle } from 'lucide-react';

function CollectPayment({ job, amount, paymentType = 'final', onComplete, onCancel }) {
    const [paymentMethod, setPaymentMethod] = useState('qr');
    const [cashReceived, setCashReceived] = useState(amount);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    const handleConfirmPayment = () => {
        if (paymentMethod === 'cash' && cashReceived < amount) {
            alert('Cash received cannot be less than the total amount.');
            return;
        }

        setPaymentConfirmed(true);
        setTimeout(() => {
            onComplete({
                paymentMethod,
                amount,
                cashReceived: paymentMethod === 'cash' ? cashReceived : amount,
                change: paymentMethod === 'cash' ? cashReceived - amount : 0,
                timestamp: new Date().toISOString()
            });
        }, 1000);
    };

    const paymentTypeLabel = {
        'final': 'Final Payment',
        'advance': 'Advance Payment',
        'service': 'Service Charge'
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <CreditCard size={20} color="#10b981" />
                Collect {paymentTypeLabel[paymentType]}
            </h3>

            {/* Amount */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center',
                border: '2px solid #10b981'
            }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    AMOUNT TO COLLECT
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>
                    ₹{amount.toFixed(2)}
                </div>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                    Payment Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={() => setPaymentMethod('qr')}
                        className="btn"
                        style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: paymentMethod === 'qr' ? '#3b82f6' : 'var(--bg-secondary)',
                            border: paymentMethod === 'qr' ? '2px solid #3b82f6' : '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)',
                            color: paymentMethod === 'qr' ? 'white' : 'var(--text-primary)'
                        }}
                    >
                        <QrCode size={24} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>QR Code / UPI</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('cash')}
                        className="btn"
                        style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: paymentMethod === 'cash' ? '#10b981' : 'var(--bg-secondary)',
                            border: paymentMethod === 'cash' ? '2px solid #10b981' : '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)',
                            color: paymentMethod === 'cash' ? 'white' : 'var(--text-primary)'
                        }}
                    >
                        <Banknote size={24} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Cash</span>
                    </button>
                </div>
            </div>

            {/* QR Code Display */}
            {paymentMethod === 'qr' && (
                <div style={{
                    padding: 'var(--spacing-lg)',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    textAlign: 'center',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{
                        width: '200px',
                        height: '200px',
                        margin: '0 auto',
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        color: '#6b7280'
                    }}>
                        <div>
                            <QrCode size={48} style={{ margin: '0 auto var(--spacing-sm)' }} />
                            <div>QR Code Placeholder</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)' }}>
                                (Integration pending)
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: '#6b7280' }}>
                        Scan to pay ₹{amount.toFixed(2)}
                    </div>
                    <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: '#9ca3af' }}>
                        UPI ID: business@upi
                    </div>
                </div>
            )}

            {/* Cash Input */}
            {paymentMethod === 'cash' && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Cash Received
                    </label>
                    <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ width: '100%', fontSize: 'var(--font-size-lg)', padding: 'var(--spacing-sm)' }}
                        min={amount}
                        step="0.01"
                    />
                    {cashReceived > amount && (
                        <div style={{
                            marginTop: 'var(--spacing-xs)',
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            color: '#f59e0b',
                            fontWeight: 600
                        }}>
                            Change to return: ₹{(cashReceived - amount).toFixed(2)}
                        </div>
                    )}
                </div>
            )}

            {/* Payment Confirmed */}
            {paymentConfirmed && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    textAlign: 'center',
                    border: '2px solid #10b981'
                }}>
                    <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#10b981' }}>
                        Payment Confirmed!
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                        Proceeding...
                    </div>
                </div>
            )}

            {/* Actions */}
            {!paymentConfirmed && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '10px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmPayment}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '10px', backgroundColor: '#10b981' }}
                    >
                        ✓ Confirm Payment Received
                    </button>
                </div>
            )}
        </div>
    );
}

export default CollectPayment;

