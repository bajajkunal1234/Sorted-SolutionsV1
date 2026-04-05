'use client'

import { useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';

/**
 * TerminationModal – shared between Reports (RentalsTab, AMCTab) and Accounts (RentAMCTab)
 *
 * Props:
 *   type           'rental' | 'amc'
 *   record         the rental or amc record from DB
 *   customerId     account_id to attach the auto-invoice to
 *   onClose        () => void
 *   onSuccess      () => void  — called after successful termination
 */
export default function TerminationModal({ type, record, customerId, onClose, onSuccess }) {
    const [termType, setTermType] = useState('customer'); // 'customer' | 'company'
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const isRental = type === 'rental';
    const name = isRental
        ? (record.rental_plans?.product_name || record.product_name || record.productName || 'Rental')
        : (record.plan_name || record.amc_plans?.name || record.planName || 'AMC');

    const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    // Calculate remaining months + early termination dues
    const endDate = record.end_date ? new Date(record.end_date) : null;
    const startDate = record.start_date ? new Date(record.start_date) : null;
    const today = new Date();
    const remainingMs = endDate ? Math.max(0, endDate - today) : 0;
    const remainingMonths = endDate ? Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24 * 30))) : 0;

    let earlyTermDues = 0;
    if (isRental) {
        earlyTermDues = remainingMonths * (parseFloat(record.monthly_rent) || 0);
    } else if (endDate && startDate) {
        const totalMs = endDate - startDate;
        const proportion = totalMs > 0 ? remainingMs / totalMs : 0;
        earlyTermDues = Math.round(proportion * (parseFloat(record.amc_amount) || 0) * 100) / 100;
    }

    const waived = termType === 'company';
    const duesAmount = waived ? 0 : earlyTermDues;

    const handleConfirm = async () => {
        if (!reason.trim()) { alert('Please enter a reason for termination.'); return; }
        setSaving(true);
        try {
            const todayISO = new Date().toISOString();
            const terminationPayload = {
                id: record.id,
                status: 'terminated',
                terminated_at: todayISO,
                termination_type: termType,
                termination_reason: reason,
                termination_waived: waived,
                early_termination_amount: duesAmount,
            };

            // 1. Update the contract status
            const apiUrl = isRental ? '/api/admin/rentals?type=rental' : '/api/admin/amc?type=amc';
            const res = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(terminationPayload),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to terminate');

            // 2. Auto-create sales invoice if dues apply
            if (duesAmount > 0) {
                const accountId = customerId || record.customer_id;
                const accountName = record.customer_name || record.accounts?.name || '';
                await fetch('/api/admin/transactions?type=sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        account_id: accountId,
                        account_name: accountName,
                        date: todayISO.split('T')[0],
                        items: JSON.stringify([{
                            description: `Early Termination — ${name} (${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} remaining)`,
                            type: 'service',
                            qty: 1,
                            rate: duesAmount,
                            taxRate: 0,
                        }]),
                        subtotal: duesAmount,
                        total_amount: duesAmount,
                        cgst: 0, sgst: 0, igst: 0, total_tax: 0,
                        status: 'unpaid',
                        notes: `Early termination of ${isRental ? 'rental' : 'AMC'} contract. Reason: ${reason}`,
                    }),
                });
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.45)' }}>

                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', background: 'rgba(239,68,68,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <XCircle size={18} /> Terminate {isRental ? 'Rental' : 'AMC'} Contract
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{name}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '18px', lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Contract summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>CONTRACT END</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{fmtDate(record.end_date)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>REMAINING</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{remainingMonths} month{remainingMonths !== 1 ? 's' : ''}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{isRental ? 'MONTHLY RENT' : 'AMC AMOUNT'}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{fmt(isRental ? record.monthly_rent : record.amc_amount)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>EARLY TERM DUES</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{fmt(earlyTermDues)}</div>
                        </div>
                    </div>

                    {/* Termination type */}
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>WHO IS TERMINATING?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                                { key: 'customer', label: 'Customer Initiated', sub: 'Dues apply — invoice raised', color: '#ef4444' },
                                { key: 'company',  label: 'Company Initiated',  sub: 'Dues waived — no invoice',   color: '#f59e0b' },
                            ].map(opt => (
                                <button key={opt.key} onClick={() => setTermType(opt.key)} style={{
                                    padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                    border: `2px solid ${termType === opt.key ? opt.color : 'var(--border-primary)'}`,
                                    backgroundColor: termType === opt.key ? `${opt.color}18` : 'var(--bg-secondary)',
                                    color: termType === opt.key ? opt.color : 'var(--text-secondary)',
                                    textAlign: 'center',
                                }}>
                                    {opt.label}<br />
                                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}>{opt.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dues notice */}
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                        backgroundColor: waived ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${waived ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: waived ? '#f59e0b' : '#ef4444',
                    }}>
                        {waived
                            ? '✓ Remaining dues waived — no invoice will be generated'
                            : `⚠ Sales invoice of ${fmt(earlyTermDues)} will be created for customer to clear`}
                    </div>

                    {/* Reason */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>REASON FOR TERMINATION *</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            placeholder="Enter reason for termination..."
                            style={{
                                width: '100%', resize: 'vertical', fontSize: '13px', padding: '8px 10px',
                                border: '1px solid var(--border-primary)', borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={onClose} disabled={saving}
                            style={{ padding: '8px 16px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                        <button onClick={handleConfirm} disabled={saving} style={{
                            padding: '8px 20px', backgroundColor: '#ef4444', color: '#fff',
                            border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '13px', opacity: saving ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                            {saving ? 'Terminating...' : 'Confirm Termination'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
