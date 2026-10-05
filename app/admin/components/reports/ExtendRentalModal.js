'use client'

import { useState } from 'react';
import { X, CalendarPlus, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { rentalsAPI } from '@/lib/adminAPI';

export default function ExtendRentalModal({ rental, onClose, onSuccess }) {
    const customerName = rental?.customer_name || rental?.customerName || rental?.accounts?.name || 'Customer';
    const productName = rental?.product_name || rental?.productName || rental?.rental_plans?.product_name || 'Rental Item';
    const currentDuration = Number(rental?.tenure?.duration || 1);
    const currentUnit = rental?.tenure?.unit || 'month';
    const currentTotalMonths = currentUnit.includes('year') ? currentDuration * 12 : currentDuration;
    const rentsPaid = Number(rental?.rents_paid || 0);
    const rentsRemaining = Number(rental?.rents_remaining != null ? rental?.rents_remaining : Math.max(0, currentTotalMonths - rentsPaid));
    const currentMonthlyRent = Number(rental?.monthly_rent || 0);

    const [extensionMonths, setExtensionMonths] = useState(6);
    const [monthlyRent, setMonthlyRent] = useState(currentMonthlyRent);
    const [notes, setNotes] = useState('Customer decided to extend contract.');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const presetOptions = [1, 3, 6, 11, 12];

    // Compute new duration & totals
    const newTotalMonths = currentTotalMonths + Number(extensionMonths || 0);
    const newRentsRemaining = Math.max(0, newTotalMonths - rentsPaid);

    // Compute new end date from rental.start_date
    let newEndDateStr = '';
    let nextRentDueStr = rental?.next_rent_due_date || '';

    if (rental?.start_date) {
        const [origY, origM, origD] = rental.start_date.split('-').map(Number);
        
        // End date
        const targetEndM = origM + newTotalMonths;
        const endY = origY + Math.floor((targetEndM - 1) / 12);
        const endMonth = ((targetEndM - 1) % 12) + 1;
        const maxDays = new Date(endY, endMonth, 0).getDate();
        const endD = Math.min(origD, maxDays);
        newEndDateStr = `${endY}-${String(endMonth).padStart(2, '0')}-${String(endD).padStart(2, '0')}`;

        // Next rent due date: if all previous rents were paid, next due date is Month (rentsPaid + 1)
        if (rentsRemaining <= 0 || !nextRentDueStr) {
            const nextIdx = rentsPaid + 1;
            const targetNextM = origM + (nextIdx - 1);
            const nextY = origY + Math.floor((targetNextM - 1) / 12);
            const nextM = ((targetNextM - 1) % 12) + 1;
            const nextMaxDays = new Date(nextY, nextM, 0).getDate();
            const nextD = Math.min(origD, nextMaxDays);
            nextRentDueStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
        }
    }

    const fmtDate = (dStr) => dStr ? new Date(dStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const handleConfirm = async () => {
        if (!extensionMonths || extensionMonths < 1) {
            setError('Please enter a valid extension duration (minimum 1 month).');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const dateStamp = new Date().toLocaleDateString('en-GB');
            const extensionLog = `[Contract Extended on ${dateStamp}]: +${extensionMonths} months (Total: ${newTotalMonths} mos). ${notes.trim()}`;
            const updatedNotes = rental?.notes ? `${rental.notes}\n${extensionLog}` : extensionLog;

            const payload = {
                tenure: {
                    duration: newTotalMonths,
                    unit: 'month'
                },
                end_date: newEndDateStr,
                monthly_rent: Number(monthlyRent),
                rents_remaining: newRentsRemaining,
                next_rent_due_date: nextRentDueStr,
                status: 'active',
                notes: updatedNotes
            };

            const updated = await rentalsAPI.updateActive(rental.id, payload);
            if (onSuccess) {
                onSuccess({ ...rental, ...payload });
            }
            onClose();
        } catch (err) {
            console.error('Failed to extend rental contract:', err);
            setError(err.message || 'Failed to extend contract. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981'
                        }}>
                            <CalendarPlus size={18} />
                        </div>
                        <div>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '16px' }}>Extend Rental Contract</h3>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {customerName} • {productName}
                            </div>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose} disabled={saving}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-content" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                    {error && (
                        <div style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <AlertCircle size={15} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Current Agreement Summary Card */}
                    <div style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Current Contract Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', marginTop: '2px' }}>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Start Date: </span>
                                <strong>{fmtDate(rental?.start_date)}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Current Tenure: </span>
                                <strong>{currentTotalMonths} Months</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Months Paid: </span>
                                <strong style={{ color: rentsPaid >= currentTotalMonths ? '#10b981' : 'inherit' }}>
                                    {rentsPaid} / {currentTotalMonths}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Current Rent: </span>
                                <strong>₹{currentMonthlyRent.toLocaleString('en-IN')}/mo</strong>
                            </div>
                        </div>
                    </div>

                    {/* Extension Duration Selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                            Additional Duration
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {presetOptions.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setExtensionMonths(opt)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: extensionMonths === opt ? '1px solid #10b981' : '1px solid var(--border-primary)',
                                        backgroundColor: extensionMonths === opt ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-secondary)',
                                        color: extensionMonths === opt ? '#10b981' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease'
                                    }}
                                >
                                    +{opt} {opt === 1 ? 'Month' : 'Months'}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom Months:</span>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={extensionMonths}
                                onChange={(e) => setExtensionMonths(Math.max(1, parseInt(e.target.value) || 1))}
                                style={{
                                    width: '90px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}
                            />
                        </div>
                    </div>

                    {/* Monthly Rent */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Monthly Rent for Extended Term (₹)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={monthlyRent}
                            onChange={(e) => setMonthlyRent(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                            Keep existing (₹{currentMonthlyRent}) or adjust if renewal rate is different.
                        </span>
                    </div>

                    {/* New Terms Preview Card */}
                    <div style={{
                        padding: '12px 14px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Updated Agreement Preview
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '12px' }}>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>New Total Tenure: </span>
                                <strong style={{ color: '#10b981' }}>{newTotalMonths} Months</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>New End Date: </span>
                                <strong>{fmtDate(newEndDateStr)}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Rents Remaining: </span>
                                <strong>{newRentsRemaining} Months</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Next Rent Due: </span>
                                <strong style={{ color: '#6366f1' }}>{fmtDate(nextRentDueStr)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Remarks / Notes */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Extension Remarks / Customer Notes
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reason for extension, agreement reference, etc."
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                        style={{ padding: '7px 14px', fontSize: '13px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={saving}
                        style={{
                            padding: '7px 16px',
                            fontSize: '13px',
                            backgroundColor: '#10b981',
                            borderColor: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={14} className="spin" />
                                <span>Saving Extension...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={14} />
                                <span>Confirm Extension</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
