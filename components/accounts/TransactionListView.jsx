'use client'

import { TrendingUp, TrendingDown, Calendar, User, Hash } from 'lucide-react';
import { formatCurrency } from '../../utils/accountingHelpers';

// ─── Status badge colours ───────────────────────────────────────────────────
const STATUS_COLORS = {
    paid:     { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    partial:  { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    pending:  { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    overdue:  { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
    accepted: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    sent:     { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    draft:    { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' },
    rejected: { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
    pending_verification: { bg: 'rgba(245,158,11,0.12)', fg: '#d97706' },
};
function statusStyle(s = '') { return STATUS_COLORS[s.toLowerCase()] || { bg: 'var(--bg-secondary)', fg: 'var(--text-secondary)' }; }

// ─── Field extractors by tab ────────────────────────────────────────────────
function getRef(item, tab) {
    switch (tab) {
        case 'sales':     return item.invoice_number || item.invoiceNo || `INV-${item.id}`;
        case 'purchases': return item.invoice_number || item.invoiceNo || `PINV-${item.id}`;
        case 'quotations':return item.quote_number   || item.quoteNo   || `QT-${item.id}`;
        case 'receipts':  return item.receipt_number || item.receiptNo || `RV-${item.id}`;
        case 'payments':  return item.payment_number || item.paymentNo || `PV-${item.id}`;
        case 'accounts':  return item.sku || '';
        default:          return `#${item.id}`;
    }
}

function getParty(item, tab) {
    switch (tab) {
        case 'sales':     return item.account_name || item.ledgerName || '';
        case 'purchases': return item.account_name || item.supplierName || '';
        case 'quotations':return item.account_name || item.customerName || '';
        case 'receipts':  return item.account_name || item.fromAccount || '';
        case 'payments':  return item.account_name || item.toAccount || '';
        case 'accounts':  return item.name || '';
        default:          return '';
    }
}

function getAmount(item, tab) {
    if (tab === 'accounts') return item.closingBalance || 0;
    return item.total_amount || item.amount || 0;
}

function getStatus(item, tab) {
    if (tab === 'receipts' || tab === 'payments') {
        if (item.status === 'pending_verification') return 'Pending_Verification';
        return item.payment_mode || item.paymentMethod || item.status || '';
    }
    if (tab === 'accounts') return item.type || '';
    return item.status || '';
}

function getSecondary(item, tab) {
    if (tab === 'accounts') {
        const bits = [];
        if (item.type) bits.push(item.type);
        if (item.phone) bits.push(item.phone);
        return bits.join(' · ');
    }
    return item.reference || '';
}

// ─── List View Row ──────────────────────────────────────────────────────────
function ListRow({ item, tab, onClick }) {
    const ref    = getRef(item, tab);
    const party  = getParty(item, tab);
    const amount = getAmount(item, tab);
    const status = getStatus(item, tab);
    const secondary = getSecondary(item, tab);
    const ss     = statusStyle(status);
    const isAccount = tab === 'accounts';
    const isPos  = amount >= 0;
    const dateStr = item.date
        ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
        : '';

    return (
        <div
            onClick={() => onClick?.(item)}
            style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr auto auto',
                gap: '12px',
                alignItems: 'center',
                padding: '7px 16px',
                borderBottom: '1px solid var(--border-primary)',
                cursor: 'pointer',
                transition: 'background-color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            {/* Col 1: Ref + Date */}
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ref}
                </div>
                {dateStr && (
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Calendar size={9} />
                        {dateStr}
                    </div>
                )}
            </div>

            {/* Col 2: Party + secondary */}
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {party || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                {secondary && (
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                        {secondary}
                    </div>
                )}
            </div>

            {/* Col 3: Status badge */}
            {status ? (
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: ss.bg,
                    color: ss.fg,
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                }}>
                    {status.replace('_', ' ')}
                </span>
            ) : <span />}

            {/* Col 4: Amount */}
            <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                fontFamily: 'monospace',
                textAlign: 'right',
                color: isAccount ? (isPos ? '#10b981' : '#ef4444') : 'var(--text-primary)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
            }}>
                {isAccount && (isPos
                    ? <TrendingUp size={11} style={{ color: '#10b981' }} />
                    : <TrendingDown size={11} style={{ color: '#ef4444' }} />
                )}
                {formatCurrency(Math.abs(amount))}
            </div>
        </div>
    );
}

// ─── Group Header ───────────────────────────────────────────────────────────
function GroupHeader({ label, count, total, tab }) {
    const isAccount = tab === 'accounts';
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-primary)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
        }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </span>
            <span style={{
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-elevated)',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
            }}>{count}</span>
            {!isAccount && total !== undefined && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                    {formatCurrency(total)}
                </span>
            )}
        </div>
    );
}

// ─── Main List View ─────────────────────────────────────────────────────────
function TransactionListView({ items = [], tab, onItemClick, groupBy = 'none' }) {
    if (items.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                No items found. Try adjusting your filters.
            </div>
        );
    }

    // Compute groups
    const renderGrouped = () => {
        const grouped = {};
        items.forEach(item => {
            let key = 'Other';
            if (groupBy === 'status') {
                key = (item.status || item.payment_mode || item.paymentMethod || 'other');
                key = key.charAt(0).toUpperCase() + key.slice(1);
            } else if (groupBy === 'month') {
                key = item.date ? new Date(item.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Unknown';
            } else if (groupBy === 'ledger' || groupBy === 'account' || groupBy === 'supplier' || groupBy === 'customer') {
                key = getParty(item, tab) || 'Unknown';
            } else if (groupBy === 'payment_method') {
                key = item.payment_mode || item.paymentMethod || 'Unknown';
            } else if (groupBy === 'type') {
                key = (item.type || 'other');
                key = key.charAt(0).toUpperCase() + key.slice(1);
            } else if (groupBy === 'group') {
                key = item.under || 'Unknown';
            } else {
                key = null; // no grouping
            }
            if (key === null) {
                if (!grouped['all']) grouped['all'] = [];
                grouped['all'].push(item);
            } else {
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            }
        });

        if (groupBy === 'none' || Object.keys(grouped).length === 1 && grouped['all']) {
            return items.map(item => <ListRow key={item.id} item={item} tab={tab} onClick={onItemClick} />);
        }

        return Object.entries(grouped).map(([gLabel, gItems]) => (
            <div key={gLabel}>
                <GroupHeader
                    label={gLabel}
                    count={gItems.length}
                    total={gItems.reduce((s, i) => s + (getAmount(i, tab)), 0)}
                    tab={tab}
                />
                {gItems.map(item => <ListRow key={item.id} item={item} tab={tab} onClick={onItemClick} />)}
            </div>
        ));
    };

    return (
        <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Header row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr auto auto',
                gap: '12px',
                padding: '5px 16px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '2px solid var(--border-primary)',
                position: 'sticky',
                top: 0,
                zIndex: 2,
            }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Reference</span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                    {tab === 'accounts' ? 'Name' : tab === 'purchases' ? 'Supplier' : 'Account'}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Status</span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', textAlign: 'right', whiteSpace: 'nowrap' }}>Amount</span>
            </div>
            {renderGrouped()}
        </div>
    );
}

export default TransactionListView;
