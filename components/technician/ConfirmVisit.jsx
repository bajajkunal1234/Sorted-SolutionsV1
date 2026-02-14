'use client'

import { useState } from 'react';
import { Calendar, Clock, Phone, MessageSquare, CheckCircle } from 'lucide-react';

function ConfirmVisit({ job, onComplete, onCancel }) {
    const [visitDate, setVisitDate] = useState(new Date(job.dueDate).toISOString().split('T')[0]);
    const [visitTime, setVisitTime] = useState(new Date(job.dueDate).toTimeString().slice(0, 5));
    const [notes, setNotes] = useState('');
    const [customerDeclined, setCustomerDeclined] = useState(false);
    const [declineReason, setDeclineReason] = useState('');

    const handleConfirm = () => {
        const confirmedDateTime = new Date(`${visitDate}T${visitTime}`);
        onComplete({
            visitDateTime: confirmedDateTime.toISOString(),
            notes,
            status: 'confirmed'
        });
    };

    const handleDecline = () => {
        if (!declineReason) {
            alert('Please select a reason for customer decline.');
            return;
        }
        onComplete({
            status: 'declined',
            declineReason,
            notes
        });
    };

    const handleCall = () => {
        window.location.href = `tel:${job.mobile}`;
    };

    const handleWhatsApp = () => {
        const message = `Hello ${job.customerName}, this is regarding your ${job.product.brand} ${job.product.model} service. I will visit on ${visitDate} at ${visitTime}. Please confirm.`;
        window.open(`https://wa.me/${job.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <CheckCircle size={20} color="#10b981" />
                Confirm Visit Time
            </h3>

            {/* Customer Info */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    {job.customerName}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                    {job.address}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={handleCall}
                        className="btn"
                        style={{ flex: 1, padding: '8px 12px', backgroundColor: '#10b981', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                        <Phone size={14} />
                        Call
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        className="btn"
                        style={{ flex: 1, padding: '8px 12px', backgroundColor: '#25D366', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                        <MessageSquare size={14} />
                        WhatsApp
                    </button>
                </div>
            </div>

            {/* Scheduled Time */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--spacing-md)',
                fontSize: 'var(--font-size-sm)'
            }}>
                <span style={{ color: 'var(--text-secondary)' }}>Currently Scheduled:</span>
                <span style={{ fontWeight: 600, marginLeft: 'var(--spacing-xs)' }}>
                    {new Date(job.dueDate).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            </div>

            {/* Date & Time Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Visit Date
                    </label>
                    <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Visit Time
                    </label>
                    <input
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Notes (Optional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or notes about the visit..."
                    className="form-input"
                    rows="3"
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>

            {/* Customer Decline Option */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: customerDeclined ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: customerDeclined ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', marginBottom: customerDeclined ? 'var(--spacing-sm)' : 0 }}>
                    <input
                        type="checkbox"
                        checked={customerDeclined}
                        onChange={(e) => setCustomerDeclined(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: customerDeclined ? '#ef4444' : 'var(--text-primary)' }}>
                        Customer Declined Service
                    </span>
                </label>

                {customerDeclined && (
                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Reason for Decline *
                        </label>
                        <select
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        >
                            <option value="">Select reason...</option>
                            <option value="product-working">Product Started Working</option>
                            <option value="service-charge-high">Service Charge Too High</option>
                            <option value="time-too-long">Visit Time Too Long</option>
                            <option value="found-alternative">Found Alternative Service</option>
                            <option value="not-interested">No Longer Interested</option>
                            <option value="other">Other Reason</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px' }}
                >
                    Go Back
                </button>
                {customerDeclined ? (
                    <button
                        onClick={handleDecline}
                        className="btn"
                        style={{ flex: 1, padding: '10px', backgroundColor: '#ef4444' }}
                    >
                        Close Job - Customer Declined
                    </button>
                ) : (
                    <button
                        onClick={handleConfirm}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '10px', backgroundColor: '#10b981' }}
                    >
                        ✓ Confirm Visit
                    </button>
                )}
            </div>
        </div>
    );
}

export default ConfirmVisit;

