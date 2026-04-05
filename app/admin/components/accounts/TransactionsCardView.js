'use client'

import { useState } from 'react';
import { FileText, Calendar, User, Receipt, CreditCard, Tag, Send, Loader2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const colorMap = {
        Paid: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
        Pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        Overdue: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        Draft: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
        Sent: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
        Accepted: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
        Declined: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    };
    const style = colorMap[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
    return (
        <span style={{
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: style.bg,
            color: style.color,
            letterSpacing: '0.02em',
            flexShrink: 0,
        }}>
            {status || '—'}
        </span>
    );
}

// ─── Icon per tab ────────────────────────────────────────────────────────────
function TabIcon({ activeTab }) {
    const iconProps = { size: 18, style: { color: 'white' } };
    if (activeTab === 'receipts') return <Receipt {...iconProps} />;
    if (activeTab === 'payments') return <CreditCard {...iconProps} />;
    return <FileText {...iconProps} />;
}

// ─── Accent color per tab ────────────────────────────────────────────────────
const TAB_ACCENT = {
    sales: { grad: 'linear-gradient(135deg,#6366f1,#818cf8)', soft: 'rgba(99,102,241,0.08)' },
    purchases: { grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', soft: 'rgba(245,158,11,0.08)' },
    quotations: { grad: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', soft: 'rgba(139,92,246,0.08)' },
    receipts: { grad: 'linear-gradient(135deg,#10b981,#34d399)', soft: 'rgba(16,185,129,0.08)' },
    payments: { grad: 'linear-gradient(135deg,#ef4444,#f87171)', soft: 'rgba(239,68,68,0.08)' },
};

// ─── Ref number per tab ──────────────────────────────────────────────────────
function getRefNumber(item, tab) {
    switch (tab) {
        case 'sales': case 'purchases': return item.invoice_number;
        case 'quotations': return item.quote_number;
        case 'receipts': return item.receipt_number;
        case 'payments': return item.payment_number;
        default: return '—';
    }
}

// ─── Amount per tab ──────────────────────────────────────────────────────────
function getAmount(item, tab) {
    return (tab === 'receipts' || tab === 'payments') ? (item.amount || 0) : (item.total_amount || 0);
}

// ─── Group separator header ──────────────────────────────────────────────────
function GroupHeader({ label }) {
    return (
        <div style={{
            gridColumn: '1 / -1',
            padding: '8px 4px 6px',
            borderBottom: '2px solid var(--border-primary)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
        }}>
            <Tag size={11} />
            {label}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function TransactionsCardView({ items, activeTab, groupBy, onItemClick, onDelete }) {
    const accent = TAB_ACCENT[activeTab] || TAB_ACCENT.sales;
    const isVoucherTab = activeTab === 'receipts' || activeTab === 'payments';

    // Build groups
    const buildGroups = () => {
        if (!groupBy || groupBy === 'none') return [{ label: null, items }];

        const map = new Map();
        items.forEach(item => {
            let key = '—';
            if (groupBy === 'account') {
                key = item.account_name || '—';
            } else if (groupBy === 'status') {
                key = item.status || item.payment_mode || '—';
            } else if (groupBy === 'month') {
                if (item.date) {
                    const d = new Date(item.date);
                    key = isNaN(d.getTime()) ? '—' : d.toLocaleString('default', { month: 'long', year: 'numeric' });
                }
            }
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });

        return Array.from(map.entries())
            .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
            .map(([label, groupItems]) => ({ label, items: groupItems }));
    };

    const groups = buildGroups();

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
            gap: 'var(--spacing-md)',
            alignContent: 'start',
        }}>
            {groups.map((group, gi) => (
                <>
                    {group.label !== null && <GroupHeader key={`gh-${gi}`} label={group.label} />}
                    {group.items.map(item => {
                        const refNo = getRefNumber(item, activeTab);
                        const amount = getAmount(item, activeTab);
                        return (
                            <div
                                key={item.id}
                                onClick={() => onItemClick?.(item)}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-sm)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                }}
                            >
                                {/* Header row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: 'var(--radius-md)',
                                        background: accent.grad,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <TabIcon activeTab={activeTab} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)', fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            fontFamily: 'monospace',
                                        }}>
                                            {refNo || '—'}
                                        </div>
                                        <div style={{
                                            fontSize: '11px', color: 'var(--text-tertiary)',
                                            display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
                                        }}>
                                            <Calendar size={10} />
                                            {item.date || '—'}
                                        </div>
                                    </div>
                                    {!isVoucherTab && item.status && <StatusBadge status={item.status} />}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}
                                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#ef4444', padding: '6px', marginLeft: 'auto', cursor: 'pointer', display: 'flex' }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Account name row */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                }}>
                                    <User size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {item.account_name || '—'}
                                    </span>
                                </div>

                                {/* Amount + mode row */}
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: accent.soft,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                                            Amount
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-lg)', fontWeight: 700,
                                            color: 'var(--text-primary)', fontFamily: 'monospace',
                                        }}>
                                            {formatCurrency(amount)}
                                        </div>
                                    </div>
                                    {isVoucherTab && item.payment_mode && (
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            padding: '3px 8px', borderRadius: '999px',
                                        }}>
                                            {item.payment_mode}
                                        </span>
                                    )}
                                </div>

                                {/* Send Payment Link — only for unpaid/partial sales invoices */}
                                {activeTab === 'sales' && ['unpaid', 'partial'].includes((item.status || '').toLowerCase()) && (() => {
                                    const [sending, setSending] = useState(false);
                                    const [sent, setSent] = useState(false);
                                    return (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (sending || sent) return;
                                                const phone = item.account_phone || item.phone || '';
                                                if (!phone) { alert('No phone number on file for this account. Open account detail and add a phone number.'); return; }
                                                setSending(true);
                                                try {
                                                    const dueAmount = (parseFloat(item.total_amount) || 0) - (parseFloat(item.paid_amount) || 0);
                                                    const amount = dueAmount > 0 ? dueAmount : parseFloat(item.total_amount) || 0;
                                                    const res = await fetch('/api/payment/create-link', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            amount,
                                                            customer_name: item.account_name || 'Customer',
                                                            customer_phone: phone,
                                                            description: `Payment for Invoice ${item.invoice_number} · ${item.account_name}`,
                                                            account_id: item.account_id,
                                                            invoice_id: item.id,
                                                            collected_by: 'admin',
                                                            amount_label: dueAmount < parseFloat(item.total_amount) ? 'partial' : 'full',
                                                        }),
                                                    });
                                                    const data = await res.json();
                                                    if (!data.success) throw new Error(data.error);
                                                    // Open WhatsApp
                                                    const cleanPhone = phone.replace(/\D/g, '');
                                                    const msg = encodeURIComponent(`Hi ${item.account_name || 'there'}, please find your payment link of ₹${amount.toLocaleString('en-IN')} for Invoice ${item.invoice_number}: ${data.short_url}`);
                                                    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
                                                    setSent(true);
                                                    // Log interaction
                                                    await fetch('/api/admin/interactions', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            account_id: item.account_id,
                                                            type: 'payment-link-sent',
                                                            description: `Payment link of ₹${amount.toLocaleString('en-IN')} sent via WhatsApp for Invoice ${item.invoice_number}. Link: ${data.short_url}`,
                                                            performed_by_name: 'Admin',
                                                        }),
                                                    }).catch(() => {});
                                                } catch (err) { alert('Error: ' + err.message); }
                                                finally { setSending(false); }
                                            }}
                                            style={{
                                                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                                                background: sent ? 'rgba(16,185,129,0.1)' : 'rgba(34,197,94,0.1)',
                                                border: `1px solid ${sent ? 'rgba(16,185,129,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                                color: sent ? '#10b981' : '#22c55e', cursor: 'pointer',
                                                fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', gap: 6,
                                            }}
                                        >
                                            {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                                            {sent ? '✓ Link Sent' : sending ? 'Creating Link...' : '📲 Send Payment Link'}
                                        </button>
                                    );
                                })()}

                            </div>
                        );
                    })}
                </>
            ))}

            {items.length === 0 && (
                <div style={{
                    gridColumn: '1 / -1',
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--font-size-sm)',
                }}>
                    No records found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default TransactionsCardView;
