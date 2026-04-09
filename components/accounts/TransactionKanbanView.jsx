'use client'

import { TrendingUp, TrendingDown, User, FileText, ShoppingCart, Receipt, CreditCard, FileCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/accountingHelpers';

// Status color map — shared across all transaction types
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

function statusStyle(status = '') {
    return STATUS_COLORS[status.toLowerCase()] || { bg: 'var(--bg-secondary)', fg: 'var(--text-secondary)' };
}

// Derive column groups for the kanban based on tab type
function getColumns(tab) {
    switch (tab) {
        case 'sales':
        case 'purchases':
            return ['pending', 'partial', 'paid', 'overdue'];
        case 'quotations':
            return ['draft', 'sent', 'accepted', 'rejected'];
        case 'receipts':
        case 'payments':
            return ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];
        case 'accounts':
            return ['customer', 'supplier', 'technician', 'cash', 'expense', 'other'];
        default:
            return [];
    }
}

function getItemGroup(item, tab) {
    switch (tab) {
        case 'sales':
        case 'purchases':
        case 'quotations':
            return (item.status || 'pending').toLowerCase();
        case 'receipts':
        case 'payments':
            return item.payment_mode || item.paymentMethod || 'Other';
        case 'accounts':
            return (item.type || 'other').toLowerCase();
        default:
            return 'other';
    }
}

function getItemTitle(item, tab) {
    switch (tab) {
        case 'sales':     return item.invoice_number || item.invoiceNo || `INV-${item.id}`;
        case 'purchases': return item.invoice_number || item.invoiceNo || `PINV-${item.id}`;
        case 'quotations':return item.quote_number   || item.quoteNo   || `QT-${item.id}`;
        case 'receipts':  return item.receipt_number || item.receiptNo || `RV-${item.id}`;
        case 'payments':  return item.payment_number || item.paymentNo || `PV-${item.id}`;
        case 'accounts':  return item.name || '-';
        default:          return `#${item.id}`;
    }
}

function getItemSubtitle(item, tab) {
    switch (tab) {
        case 'sales':     return item.account_name || item.ledgerName || '';
        case 'purchases': return item.account_name || item.supplierName || '';
        case 'quotations':return item.account_name || item.customerName || '';
        case 'receipts':  return item.account_name || item.fromAccount || '';
        case 'payments':  return item.account_name || item.toAccount || '';
        case 'accounts':  return item.sku || '';
        default:          return '';
    }
}

function getItemAmount(item, tab) {
    if (tab === 'accounts') return item.closingBalance || 0;
    return item.total_amount || item.amount || 0;
}

function getTabIcon(tab) {
    switch (tab) {
        case 'sales':     return FileText;
        case 'purchases': return ShoppingCart;
        case 'quotations':return FileCheck;
        case 'receipts':  return Receipt;
        case 'payments':  return CreditCard;
        case 'accounts':  return User;
        default:          return FileText;
    }
}

// ─── Single Kanban Card ────────────────────────────────────────────────────────
function KanbanCard({ item, tab, onClick }) {
    const title    = getItemTitle(item, tab);
    const subtitle = getItemSubtitle(item, tab);
    const amount   = getItemAmount(item, tab);
    const status   = item.status || '';
    const ss       = statusStyle(status);
    const date     = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
    const isAccount = tab === 'accounts';
    const isPos = amount >= 0;

    return (
        <div
            onClick={() => onClick?.(item)}
            className="job-card"
            style={{ cursor: 'pointer', marginBottom: '8px' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {title}
                </span>
                {date && (
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{date}</span>
                )}
            </div>

            {subtitle && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    {subtitle}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-primary)' }}>
                <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    color: isAccount ? (isPos ? '#10b981' : '#ef4444') : 'var(--text-primary)',
                    fontFamily: 'monospace'
                }}>
                    {isAccount ? (
                        <>
                            {isPos ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} /> : <TrendingDown size={12} style={{ display: 'inline', marginRight: 3 }} />}
                            {formatCurrency(Math.abs(amount))}
                        </>
                    ) : formatCurrency(amount)}
                </span>
                {status && (
                    <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: ss.bg,
                        color: ss.fg,
                        textTransform: 'capitalize'
                    }}>
                        {status}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Main Kanban View ──────────────────────────────────────────────────────────
function TransactionKanbanView({ items = [], tab, onItemClick, groupBy }) {
    const columns = getColumns(tab);

    // Group items
    const grouped = {};
    columns.forEach(col => { grouped[col] = []; });

    items.forEach(item => {
        const g = getItemGroup(item, tab);
        if (grouped[g] !== undefined) {
            grouped[g].push(item);
        } else {
            // Put in a dynamic catch-all group
            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(item);
        }
    });

    // Sum column totals
    const colTotal = (col) => grouped[col]?.reduce((s, i) => s + (getItemAmount(i, tab)), 0) || 0;

    const colLabel = (col) => col.charAt(0).toUpperCase() + col.slice(1);
    const allColumns = [...new Set([...columns, ...Object.keys(grouped)])];

    return (
        <div className="kanban-container">
            <div className="kanban-board">
                {allColumns.map(col => {
                    const colItems = grouped[col] || [];
                    const total = colTotal(col);
                    const ss = statusStyle(col);
                    return (
                        <div key={col} className="kanban-column">
                            <div className="kanban-column-header">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <h3 className="kanban-column-title" style={{ color: ss.fg || undefined }}>
                                        {colLabel(col)}
                                    </h3>
                                    {tab !== 'accounts' && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                            {formatCurrency(total)}
                                        </span>
                                    )}
                                </div>
                                <span className="kanban-column-count">{colItems.length}</span>
                            </div>
                            <div className="kanban-cards">
                                {colItems.map(item => (
                                    <KanbanCard
                                        key={item.id}
                                        item={item}
                                        tab={tab}
                                        onClick={onItemClick}
                                    />
                                ))}
                                {colItems.length === 0 && (
                                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                        No items
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TransactionKanbanView;
