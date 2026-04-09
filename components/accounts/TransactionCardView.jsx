'use client'

import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/accountingHelpers';

const STATUS_COLORS = {
    paid:     { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    partial:  { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    pending:  { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    overdue:  { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
    accepted: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    sent:     { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    draft:    { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' },
    rejected: { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
};
function statusStyle(s = '') { return STATUS_COLORS[s.toLowerCase()] || { bg: 'var(--bg-secondary)', fg: 'var(--text-secondary)' }; }

function getRef(item, tab) {
    switch (tab) {
        case 'sales':     return item.invoice_number || item.invoiceNo || `INV-${item.id}`;
        case 'purchases': return item.invoice_number || item.invoiceNo || `PINV-${item.id}`;
        case 'quotations':return item.quote_number   || item.quoteNo   || `QT-${item.id}`;
        case 'receipts':  return item.receipt_number || item.receiptNo || `RV-${item.id}`;
        case 'payments':  return item.payment_number || item.paymentNo || `PV-${item.id}`;
        default:          return `#${item.id}`;
    }
}

function getParty(item, tab) {
    switch (tab) {
        case 'sales':      return item.account_name || item.ledgerName || '';
        case 'purchases':  return item.account_name || item.supplierName || '';
        case 'quotations': return item.account_name || item.customerName || '';
        case 'receipts':   return item.account_name || item.fromAccount || '';
        case 'payments':   return item.account_name || item.toAccount || '';
        default:           return '';
    }
}

function getAmount(item) {
    return item.total_amount || item.amount || 0;
}

function getStatusOrMethod(item, tab) {
    if (tab === 'receipts' || tab === 'payments') return item.payment_mode || item.paymentMethod || '';
    return item.status || '';
}

// ─── Card ───────────────────────────────────────────────────────────────────
function TransactionCard({ item, tab, onClick }) {
    const ref    = getRef(item, tab);
    const party  = getParty(item, tab);
    const amount = getAmount(item);
    const statusOrMethod = getStatusOrMethod(item, tab);
    const ss     = statusStyle(statusOrMethod);
    const dateStr = item.date
        ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';
    const notes  = item.notes || '';

    return (
        <div
            onClick={() => onClick?.(item)}
            style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-md)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
        >
            {/* Top: Ref + Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    fontFamily: 'monospace',
                }}>
                    {ref}
                </span>
                {statusOrMethod && (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: ss.bg,
                        color: ss.fg,
                        textTransform: 'capitalize',
                        flexShrink: 0,
                    }}>
                        {statusOrMethod}
                    </span>
                )}
            </div>

            {/* Party name */}
            {party && (
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {party}
                </div>
            )}

            {/* Date */}
            {dateStr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    <Calendar size={11} />
                    {dateStr}
                </div>
            )}

            {/* Note preview */}
            {notes && (
                <div style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4,
                }}>
                    {notes}
                </div>
            )}

            {/* Amount */}
            <div style={{
                paddingTop: '8px',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Total</span>
                <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {formatCurrency(amount)}
                </span>
            </div>
        </div>
    );
}

// ─── Main Card View ─────────────────────────────────────────────────────────
function TransactionCardView({ items = [], tab, onItemClick }) {
    if (items.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                No items found. Try adjusting your filters.
            </div>
        );
    }

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--spacing-md)',
        }}>
            {items.map(item => (
                <TransactionCard key={item.id} item={item} tab={tab} onClick={onItemClick} />
            ))}
        </div>
    );
}

export default TransactionCardView;
