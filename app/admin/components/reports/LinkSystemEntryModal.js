'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Search, CheckCircle, AlertCircle, Loader2, ArrowRight, Link2, CreditCard, Receipt, FileText, ShoppingCart } from 'lucide-react';

export default function LinkSystemEntryModal({
    isOpen,
    onClose,
    bankTx,
    selectedAccountId,
    onLinkSuccess
}) {
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'payment' | 'receipt' | 'purchase' | 'sales'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        if (isOpen && bankTx) {
            // Set initial active tab based on transaction type
            if (bankTx.type === 'receipt') {
                setActiveTab('receipt');
            } else {
                setActiveTab('payment');
            }
            fetchCandidateEntries();
        }
    }, [isOpen, bankTx, selectedAccountId]);

    const fetchCandidateEntries = async () => {
        if (!selectedAccountId || !bankTx) return;
        setLoading(true);
        try {
            // Fetch unlinked or recent entries across payments, receipts, purchases, sales
            const [payRes, recRes, purRes, salRes] = await Promise.all([
                supabase
                    .from('payment_vouchers')
                    .select('id, payment_number, date, amount, payment_mode, narration, account_name, status, payment_account_id')
                    .or(`payment_account_id.eq.${selectedAccountId},account_id.eq.${selectedAccountId}`)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false })
                    .limit(60),
                supabase
                    .from('receipt_vouchers')
                    .select('id, receipt_number, date, amount, payment_mode, narration, account_name, status, payment_account_id')
                    .or(`payment_account_id.eq.${selectedAccountId},account_id.eq.${selectedAccountId}`)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false })
                    .limit(60),
                supabase
                    .from('purchase_invoices')
                    .select('id, invoice_number, date, total_amount, paid_amount, status, notes, account_name, paid_by')
                    .or(`paid_by.eq.${selectedAccountId},account_id.eq.${selectedAccountId}`)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false })
                    .limit(40),
                supabase
                    .from('sales_invoices')
                    .select('id, invoice_number, date, total_amount, paid_amount, status, notes, account_name')
                    .eq('account_id', selectedAccountId)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false })
                    .limit(40)
            ]);

            const list = [];

            (payRes.data || []).forEach(p => {
                list.push({
                    id: p.id,
                    type: 'payment',
                    number: p.payment_number,
                    date: p.date,
                    amount: parseFloat(p.amount) || 0,
                    party: p.account_name,
                    narration: p.narration,
                    status: p.status,
                    raw: p
                });
            });

            (recRes.data || []).forEach(r => {
                list.push({
                    id: r.id,
                    type: 'receipt',
                    number: r.receipt_number,
                    date: r.date,
                    amount: parseFloat(r.amount) || 0,
                    party: r.account_name,
                    narration: r.narration,
                    status: r.status,
                    raw: r
                });
            });

            (purRes.data || []).forEach(pu => {
                list.push({
                    id: pu.id,
                    type: 'purchase',
                    number: pu.invoice_number,
                    date: pu.date,
                    amount: parseFloat(pu.total_amount) || 0,
                    party: pu.account_name,
                    narration: pu.notes || `Purchase Invoice: ${pu.invoice_number}`,
                    status: pu.status,
                    raw: pu
                });
            });

            (salRes.data || []).forEach(s => {
                list.push({
                    id: s.id,
                    type: 'sales',
                    number: s.invoice_number,
                    date: s.date,
                    amount: parseFloat(s.total_amount) || 0,
                    party: s.account_name,
                    narration: s.notes || `Sales Invoice: ${s.invoice_number}`,
                    status: s.status,
                    raw: s
                });
            });

            setEntries(list);
        } catch (err) {
            console.error('Failed to fetch candidate entries for linking:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate smart match score & filter
    const filteredEntries = useMemo(() => {
        if (!bankTx) return [];
        const targetAmount = parseFloat(bankTx.amount) || 0;
        const targetDate = bankTx.date ? new Date(bankTx.date) : null;
        const search = (searchTerm || '').toLowerCase().trim();

        return entries
            .filter(item => {
                if (activeTab !== 'all' && item.type !== activeTab) return false;
                if (!search) return true;
                const matchNumber = (item.number || '').toLowerCase().includes(search);
                const matchParty = (item.party || '').toLowerCase().includes(search);
                const matchNarr = (item.narration || '').toLowerCase().includes(search);
                const matchAmt = String(item.amount).includes(search);
                return matchNumber || matchParty || matchNarr || matchAmt;
            })
            .map(item => {
                let score = 0;
                const amountDiff = Math.abs(item.amount - targetAmount);
                const isExactAmount = amountDiff < 0.01;
                const isCloseAmount = amountDiff < 1.0;

                if (isExactAmount) score += 100;
                else if (isCloseAmount) score += 50;

                let diffDays = 999;
                if (targetDate && item.date) {
                    const itemDate = new Date(item.date);
                    diffDays = Math.abs(targetDate - itemDate) / (1000 * 60 * 60 * 24);
                    if (diffDays === 0) score += 40;
                    else if (diffDays <= 3) score += 30;
                    else if (diffDays <= 7) score += 15;
                }

                // If same type as expected direction
                if (bankTx.type === 'receipt' && (item.type === 'receipt' || item.type === 'sales')) score += 20;
                if (bankTx.type === 'payment' && (item.type === 'payment' || item.type === 'purchase')) score += 20;

                return {
                    ...item,
                    score,
                    isExactAmount,
                    diffDays
                };
            })
            .sort((a, b) => b.score - a.score);
    }, [entries, activeTab, searchTerm, bankTx]);

    const handleConfirmLink = async (entry) => {
        if (!bankTx || linking) return;
        setLinking(true);
        try {
            const entryId = entry.id;
            const entryType = entry.type;

            // 1. If bankTx is an alert from bank_alerts_log
            if (bankTx.isAlert) {
                const { error: alErr } = await supabase
                    .from('bank_alerts_log')
                    .update({
                        status: 'reconciled',
                        voucher_id: entryId,
                        system_entry_type: entryType,
                        system_entry_id: entryId
                    })
                    .eq('id', bankTx.id);

                if (alErr) throw alErr;
            }

            // 2. If bankTx is from bank_statement_transactions
            if (bankTx.statementTxId || (!bankTx.isAlert && bankTx.id)) {
                const txId = bankTx.statementTxId || bankTx.id;
                const { error: stErr } = await supabase
                    .from('bank_statement_transactions')
                    .update({
                        status: 'reconciled',
                        voucher_id: entryId,
                        system_entry_type: entryType,
                        system_entry_id: entryId,
                        reconciled_at: new Date().toISOString()
                    })
                    .eq('id', txId);

                if (stErr) throw stErr;

                // Also auto-reconcile matching bank alert if one exists with same ref_no or date+amount
                if (bankTx.ref_no) {
                    await supabase
                        .from('bank_alerts_log')
                        .update({
                            status: 'reconciled',
                            voucher_id: entryId,
                            system_entry_type: entryType,
                            system_entry_id: entryId
                        })
                        .eq('bank_account_id', selectedAccountId)
                        .eq('reference_number', bankTx.ref_no)
                        .eq('status', 'unreconciled');
                }
            }

            // 3. Mark voucher as cleared if payment/receipt voucher
            if (entryType === 'payment') {
                await supabase
                    .from('payment_vouchers')
                    .update({ status: 'cleared' })
                    .eq('id', entryId);
            } else if (entryType === 'receipt') {
                await supabase
                    .from('receipt_vouchers')
                    .update({ status: 'cleared' })
                    .eq('id', entryId);
            }

            if (onLinkSuccess) {
                onLinkSuccess(entry, bankTx);
            }
            onClose();
        } catch (err) {
            console.error('Error linking entry:', err);
            alert('Failed to link entry: ' + err.message);
        } finally {
            setLinking(false);
        }
    };

    if (!isOpen || !bankTx) return null;

    const isCredit = bankTx.type === 'receipt';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '750px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-primary)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6'
                        }}>
                            <Link2 size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                                Link Bank Transaction to System Entry
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                                Pair this bank record with an existing Payment, Receipt, Sales, or Purchase invoice
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Bank Transaction Snapshot Card */}
                <div style={{
                    padding: '12px 18px',
                    backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                    borderBottom: `1px solid ${isCredit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isCredit ? '#10b981' : '#ef4444',
                                color: '#fff'
                            }}>
                                {bankTx.isAlert ? 'GMAIL ALERT' : 'STATEMENT TXN'} · {isCredit ? 'DEPOSIT (CREDIT)' : 'WITHDRAWAL (DEBIT)'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {bankTx.date ? new Date(bankTx.date).toLocaleDateString('en-GB') : '—'}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {bankTx.particulars || bankTx.narration || bankTx.party || '—'}
                        </div>
                        {bankTx.ref_no && (
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                Ref / UTR: {bankTx.ref_no}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: isCredit ? '#10b981' : '#ef4444'
                        }}>
                            {isCredit ? '+' : '-'}₹{(parseFloat(bankTx.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            Target matching amount
                        </div>
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div style={{
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: 'var(--bg-elevated)'
                }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'all', label: 'All Entries' },
                            { id: 'payment', label: 'Payments (PV)', icon: CreditCard },
                            { id: 'receipt', label: 'Receipts (RV)', icon: Receipt },
                            { id: 'purchase', label: 'Purchases (PI)', icon: ShoppingCart },
                            { id: 'sales', label: 'Sales (SI)', icon: FileText }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: activeTab === tab.id ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                    color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Filter by voucher number, party name, or notes..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 10px 7px 32px',
                                fontSize: '12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                {/* Candidate Entries List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px' }}>
                            <Loader2 size={24} className="spin" style={{ color: 'var(--primary-color)' }} />
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                            <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>No Matching System Entries Found</div>
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                Try switching tabs or searching with different terms. You can also create a new voucher directly.
                            </div>
                        </div>
                    ) : (
                        filteredEntries.map(entry => {
                            const isExact = entry.isExactAmount;
                            const isRecommended = entry.score >= 120;
                            const typeColor = entry.type === 'receipt' || entry.type === 'sales' ? '#10b981' : '#f59e0b';

                            return (
                                <div
                                    key={`${entry.type}-${entry.id}`}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${isRecommended ? 'rgba(16, 185, 129, 0.4)' : (isExact ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)')}`,
                                        backgroundColor: isRecommended ? 'rgba(16, 185, 129, 0.05)' : (isExact ? 'rgba(59, 130, 246, 0.03)' : 'var(--bg-secondary)'),
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                padding: '2px 5px',
                                                borderRadius: '3px',
                                                backgroundColor: `${typeColor}20`,
                                                color: typeColor,
                                                textTransform: 'uppercase'
                                            }}>
                                                {entry.type}
                                            </span>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {entry.number}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '—'}
                                            </span>
                                            {isRecommended && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 700,
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                                    color: '#10b981'
                                                }}>
                                                    ⭐ Best Match
                                                </span>
                                            )}
                                            {isExact && !isRecommended && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 700,
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                    color: '#3b82f6'
                                                }}>
                                                    Exact Amount
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.party || 'No party specified'}
                                        </div>

                                        {entry.narration && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                                                {entry.narration}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                                                {entry.diffDays !== 999 ? (entry.diffDays === 0 ? 'Same day' : `${Math.round(entry.diffDays)} days apart`) : ''}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleConfirmLink(entry)}
                                            disabled={linking}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                backgroundColor: isRecommended ? '#10b981' : 'var(--primary-color)',
                                                border: 'none',
                                                color: '#fff',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {linking ? <Loader2 size={12} className="spin" /> : <Link2 size={12} />}
                                            Link Entry
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '10px 18px',
                    borderTop: '1px solid var(--border-primary)',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Found {filteredEntries.length} candidate system records
                    </span>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
