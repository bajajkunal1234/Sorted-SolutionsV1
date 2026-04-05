'use client'

import { useState, useEffect } from 'react';
import { Plus, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * InvoiceAllocations
 * Props:
 *   accountId     — the account whose open invoices to show
 *   invoiceType   — 'sales' (receipt voucher) | 'purchase' (payment voucher)
 *   allocations   — [{ invoice_id, invoice_ref, amount_applied }] controlled from parent
 *   onChange      — (allocations) => void
 *   totalAmount   — voucher total (used for balance warning)
 */
export default function InvoiceAllocations({ accountId, invoiceType = 'sales', allocations = [], onChange, totalAmount = 0 }) {
    const [openInvoices, setOpenInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const table = invoiceType === 'sales' ? 'sales' : 'purchase';
    const label = invoiceType === 'sales' ? 'Sales Invoice' : 'Purchase Invoice';

    // Fetch open invoices for this account whenever accountId changes
    useEffect(() => {
        if (!accountId) { setOpenInvoices([]); return; }
        setLoading(true);
        fetch(`/api/admin/transactions?type=${table}&account_id=${accountId}`)
            .then(r => r.json())
            .then(json => {
                const invoices = (json.data || []).map(inv => ({
                    id: inv.id,
                    ref: inv.invoice_number || inv.reference || `INV-${inv.id?.slice(0,8)}`,
                    total: parseFloat(inv.total_amount || inv.amount || 0),
                    paid: parseFloat(inv.paid_amount || 0),
                    date: inv.date,
                })).map(inv => ({ ...inv, balance: inv.total - inv.paid }))
                  .filter(inv => inv.balance > 0); // only show invoices with outstanding balance
                setOpenInvoices(invoices);
            })
            .catch(() => setOpenInvoices([]))
            .finally(() => setLoading(false));
    }, [accountId, table]);

    const allocatedTotal = allocations.reduce((s, a) => s + (parseFloat(a.amount_applied) || 0), 0);
    const remaining = parseFloat(totalAmount) - allocatedTotal;

    const addAllocation = (invoice) => {
        // Don't add same invoice twice
        if (allocations.find(a => a.invoice_id === invoice.id)) return;
        const suggested = Math.min(invoice.balance, Math.max(0, remaining));
        onChange([...allocations, {
            invoice_id: invoice.id,
            invoice_ref: invoice.ref,
            invoice_total: invoice.total,
            invoice_balance: invoice.balance,
            amount_applied: suggested,
        }]);
    };

    const updateAmount = (invoice_id, value) => {
        onChange(allocations.map(a =>
            a.invoice_id === invoice_id ? { ...a, amount_applied: parseFloat(value) || 0 } : a
        ));
    };

    const removeAllocation = (invoice_id) => {
        onChange(allocations.filter(a => a.invoice_id !== invoice_id));
    };

    const unlinked = openInvoices.filter(inv => !allocations.find(a => a.invoice_id === inv.id));

    if (!accountId) return null;

    return (
        <div style={{ border: '1px solid var(--border-primary)', borderRadius: '10px', overflow: 'hidden' }}>
            {/* Header toggle */}
            <button
                type="button"
                onClick={() => setExpanded(p => !p)}
                style={{
                    width: '100%', padding: '10px 14px', backgroundColor: 'var(--bg-secondary)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)'
                }}
            >
                <FileText size={14} color="#6366f1" />
                Link Against {label}s {allocations.length > 0 && `(${allocations.length} linked)`}
                <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {expanded && (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-primary)' }}>

                    {/* Current allocations */}
                    {allocations.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {allocations.map(alloc => (
                                <div key={alloc.invoice_id} style={{
                                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                                    gap: '8px', alignItems: 'center',
                                    padding: '8px 10px', backgroundColor: 'rgba(99,102,241,0.06)',
                                    borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {alloc.invoice_ref}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Balance due: ₹{(alloc.invoice_balance || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 700 }}>₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            max={alloc.invoice_balance}
                                            value={alloc.amount_applied}
                                            onChange={e => updateAmount(alloc.invoice_id, e.target.value)}
                                            style={{
                                                width: '110px', padding: '6px 8px 6px 20px',
                                                border: '1px solid var(--border-primary)', borderRadius: '6px',
                                                backgroundColor: 'var(--bg-elevated)', fontSize: '13px',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    <button type="button" onClick={() => removeAllocation(alloc.invoice_id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Balance check */}
                    {allocations.length > 0 && (
                        <div style={{
                            fontSize: '12px', padding: '6px 10px', borderRadius: '6px',
                            backgroundColor: Math.abs(remaining) < 0.01 ? 'rgba(16,185,129,0.1)' : remaining < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                            color: Math.abs(remaining) < 0.01 ? '#10b981' : remaining < 0 ? '#ef4444' : '#f59e0b',
                            fontWeight: 600
                        }}>
                            {Math.abs(remaining) < 0.01
                                ? '✓ Fully allocated'
                                : remaining > 0
                                    ? `₹${remaining.toLocaleString('en-IN')} unallocated (will be "on account")`
                                    : `⚠ Over-allocated by ₹${Math.abs(remaining).toLocaleString('en-IN')}`
                            }
                        </div>
                    )}

                    {/* Available invoices to link */}
                    {loading ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px 0' }}>Loading open invoices...</div>
                    ) : unlinked.length > 0 ? (
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                                Open {label}s for this account:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {unlinked.map(inv => (
                                    <button key={inv.id} type="button" onClick={() => addAllocation(inv)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 10px', backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)', borderRadius: '8px',
                                            cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                                    >
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600 }}>{inv.ref}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{inv.date} · Total ₹{inv.total.toLocaleString('en-IN')}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '14px' }}>
                                                ₹{inv.balance.toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>due</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '4px 0' }}>
                            {openInvoices.length === 0 ? 'No open invoices found for this account.' : 'All open invoices are already linked.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
