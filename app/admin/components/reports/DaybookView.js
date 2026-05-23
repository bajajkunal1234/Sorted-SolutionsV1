'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, Download, Printer, Filter, TrendingUp, TrendingDown, RefreshCcw, FileText, Info } from 'lucide-react';
import { transactionsAPI } from '@/lib/adminAPI';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

// ── Helper: Normalize raw DB row into display-ready shape ───────────────────
function normalizeTransaction(raw) {
    const type = raw.type || '';

    const voucherNo =
        raw.invoice_number ||
        raw.receipt_number ||
        raw.payment_number ||
        raw.quote_number ||
        raw.reference ||
        '';

    const account = raw.account_name || raw.accounts?.name || '';

    const narration =
        raw.narration ||
        raw.notes ||
        raw.reference_number ||
        '';

    // Daybook debit/credit convention (from the company's perspective):
    //   Sales invoice   → Debit  (customer owes us; asset ↑)
    //   Purchase invoice → Credit (we owe vendor; liability ↑)
    //   Receipt voucher  → Credit (customer paid; reduces receivable)
    //   Payment voucher  → Debit  (we paid out; reduces payable)
    let debit = 0;
    let credit = 0;
    if (type === 'sales')         debit  = parseFloat(raw.total_amount) || 0;
    else if (type === 'purchase') credit = parseFloat(raw.total_amount) || 0;
    else if (type === 'receipt')  credit = parseFloat(raw.amount) || 0;
    else if (type === 'payment')  debit  = parseFloat(raw.amount) || 0;

    return { ...raw, voucherNo, account, narration, debit, credit };
}

// ── Fetch the opening balance for the selected period ───────────────────────
// Opening Balance = sum of all Cash/Bank account opening_balances
//                  + all Receipt vouchers before startDate (money received)
//                  − all Payment vouchers before startDate (money paid out)
// This represents the real cash/bank position at the start of the selected day.
async function fetchOpeningBalance(startDate) {
    try {
        const [acctRes, rvRes, pvRes] = await Promise.all([
            // payment_method = all cash+bank accounts (supported filter in accounts API)
            fetch('/api/admin/accounts?type=payment_method').then(r => r.json()),
            fetch(`/api/admin/transactions?type=receipt&end_date=${getPrevDate(startDate)}&include_archived=1`).then(r => r.json()),
            fetch(`/api/admin/transactions?type=payment&end_date=${getPrevDate(startDate)}&include_archived=1`).then(r => r.json()),
        ]);

        // Sum configured opening balances on cash/bank accounts
        const cashBankAccounts = acctRes?.data || [];
        const configuredOB = cashBankAccounts.reduce((sum, a) => {
            const ob = parseFloat(a.opening_balance) || 0;
            return sum + (a.balance_type === 'cr' ? -ob : ob);
        }, 0);

        // Sum all receipts before startDate (money came IN to cash/bank)
        const receiptsBefore = (rvRes?.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        // Sum all payments before startDate (money went OUT from cash/bank)
        const paymentsBefore = (pvRes?.data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        return configuredOB + receiptsBefore - paymentsBefore;
    } catch (e) {
        console.error('Failed to compute opening balance:', e);
        return 0;
    }
}

// Returns the date string for day before given date (YYYY-MM-DD)
function getPrevDate(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

function DaybookView() {
    const [transactions, setTransactions] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState('all');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [showBalanceInfo, setShowBalanceInfo] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [data, ob] = await Promise.all([
                transactionsAPI.getAll({ type: 'all', start_date: startDate, end_date: endDate }),
                fetchOpeningBalance(startDate),
            ]);

            setTransactions((data || []).map(normalizeTransaction));
            setOpeningBalance(ob);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Filter, sort, and compute running balance starting from opening balance
    const processedTransactions = useMemo(() => {
        let filtered = transactions.filter(txn => {
            const txnDate = new Date(txn.date).toISOString().split('T')[0];
            const matchesDate = txnDate >= startDate && txnDate <= endDate;
            const matchesType = filterType === 'all' || txn.type === filterType;
            return matchesDate && matchesType;
        });

        filtered.sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        // Running balance starts from opening balance
        let balance = openingBalance;
        return filtered.map(txn => {
            balance += (txn.debit - txn.credit);
            return { ...txn, balance };
        });
    }, [transactions, startDate, endDate, filterType, openingBalance]);

    const totals = useMemo(() => processedTransactions.reduce(
        (acc, txn) => ({ debit: acc.debit + txn.debit, credit: acc.credit + txn.credit }),
        { debit: 0, credit: 0 }
    ), [processedTransactions]);

    // Closing balance = opening + net of period transactions
    const closingBalance = openingBalance + totals.debit - totals.credit;

    const getTypeColor = (type) => ({
        sales: '#10b981',
        purchase: '#ef4444',
        receipt: '#3b82f6',
        payment: '#f59e0b'
    }[type] || '#6b7280');

    const getTypeLabel = (type) => ({
        sales: 'Sales',
        purchase: 'Purchase',
        receipt: 'Receipt',
        payment: 'Payment'
    }[type] || type);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters Row */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    />
                </div>

                {/* Type Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="sales">Sales</option>
                        <option value="purchase">Purchase</option>
                        <option value="receipt">Receipt</option>
                        <option value="payment">Payment</option>
                    </select>
                </div>

                <div style={{ flex: 1 }} />

                <button
                    className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={fetchTransactions}
                    disabled={loading}
                >
                    <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={() => {
                        const headers = ['Date', 'Type', 'Voucher No', 'Account', 'Narration', 'Debit', 'Credit', 'Balance'];
                        const obRow = ['', 'Opening Balance', '', '', '', '', '', openingBalance.toFixed(2)];
                        const rows = processedTransactions.map(txn => [
                            new Date(txn.date).toLocaleDateString('en-GB'),
                            txn.type,
                            txn.voucherNo,
                            txn.account,
                            (txn.narration || '').replace(/,/g, ' '),
                            txn.debit.toFixed(2),
                            txn.credit.toFixed(2),
                            txn.balance.toFixed(2),
                        ]);
                        const cbRow = ['', 'Closing Balance', '', '', '', totals.debit.toFixed(2), totals.credit.toFixed(2), closingBalance.toFixed(2)];
                        const csv = [headers, obRow, ...rows, cbRow].map(r => r.join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `Daybook_${startDate}_to_${endDate}.csv`;
                        a.click();
                    }}
                >
                    <Download size={16} />
                    Export
                </button>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={() => window.print()}
                >
                    <Printer size={16} />
                    Print
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                {/* Opening Balance */}
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Opening Balance</div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(Math.abs(openingBalance))}
                        <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: 'var(--text-tertiary)' }}>
                            {openingBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Cash + Bank at start of period</div>
                </div>

                {/* Total Debit */}
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total Debit</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <TrendingUp size={20} style={{ color: 'var(--color-danger)' }} />
                        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
                            {formatCurrency(totals.debit)}
                        </span>
                    </div>
                </div>

                {/* Total Credit */}
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total Credit</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <TrendingDown size={20} style={{ color: 'var(--color-success)' }} />
                        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                            {formatCurrency(totals.credit)}
                        </span>
                    </div>
                </div>

                {/* Closing Balance */}
                <div
                    style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', cursor: 'help', position: 'relative' }}
                    onMouseEnter={() => setShowBalanceInfo(true)}
                    onMouseLeave={() => setShowBalanceInfo(false)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4px' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Closing Balance</div>
                        <Info size={11} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: closingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(Math.abs(closingBalance))}
                        <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: 'var(--text-tertiary)' }}>
                            {closingBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Cash + Bank at end of period</div>

                    {/* Tooltip */}
                    {showBalanceInfo && (
                        <div style={{
                            position: 'absolute', bottom: '110%', left: 0, right: 0,
                            backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                            borderRadius: 8, padding: '10px 12px', fontSize: 11, zIndex: 999,
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)', lineHeight: 1.6,
                            color: 'var(--text-primary)', minWidth: 260,
                        }}>
                            <strong>Closing Balance = Opening Balance + Debits − Credits</strong>
                            <br />
                            <span style={{ color: 'var(--text-secondary)' }}>= {formatCurrency(Math.abs(openingBalance))} + {formatCurrency(totals.debit)} − {formatCurrency(totals.credit)}</span>
                            <br /><br />
                            This is your <strong>total cash + bank position</strong> at the end of this period — the sum of Cash-in-hand, HDFC Current A/c, Razorpay, and Google Pay balances combined.
                            <br /><br />
                            It does <strong>not</strong> include receivables (unpaid sales invoices) or payables.
                        </div>
                    )}
                </div>

                {/* Count */}
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Transactions</div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{processedTransactions.length}</div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative', padding: 'var(--spacing-md)' }}>
                {loading && transactions.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                        <RefreshCcw size={48} className="spin" style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
                        <p>Loading transactions...</p>
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={fetchTransactions} style={{ marginTop: 'var(--spacing-md)' }}>Retry</button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)', position: 'sticky', top: 0 }}>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Type</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Voucher No</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Account</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Narration</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Debit</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Credit</th>
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* ── Opening Balance Row ── */}
                            <tr style={{ backgroundColor: 'rgba(99,102,241,0.07)', borderBottom: '1px solid var(--border-primary)' }}>
                                <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                    {new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td colSpan={6} style={{ padding: 'var(--spacing-sm)', fontWeight: 700, color: 'var(--color-primary)', fontStyle: 'italic' }}>
                                    Opening Balance
                                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                        (Cash + Bank balance before this period)
                                    </span>
                                </td>
                                <td style={{
                                    padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700,
                                    color: openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {formatCurrency(Math.abs(openingBalance))}
                                    <span style={{ fontSize: 10, marginLeft: 3 }}>{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                </td>
                            </tr>

                            {/* ── Transaction Rows ── */}
                            {processedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)' }}>
                                        <FileText size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                                        No transactions for this period
                                    </td>
                                </tr>
                            ) : processedTransactions.map(txn => (
                                <tr
                                    key={txn.id}
                                    onClick={() => setSelectedTransaction(txn)}
                                    style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background-color var(--transition-fast)', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                            backgroundColor: `${getTypeColor(txn.type)}20`,
                                            color: getTypeColor(txn.type), textTransform: 'capitalize'
                                        }}>
                                            {getTypeLabel(txn.type)}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                                        {txn.voucherNo}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                        {txn.account}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {txn.narration}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                                        {txn.debit > 0 ? formatCurrency(txn.debit) : '—'}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                        {txn.credit > 0 ? formatCurrency(txn.credit) : '—'}
                                    </td>
                                    <td style={{
                                        padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700,
                                        color: txn.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                    }}>
                                        {formatCurrency(Math.abs(txn.balance))}
                                        <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>{txn.balance >= 0 ? 'Dr' : 'Cr'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {/* ── Totals Row ── */}
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '2px solid var(--border-primary)', fontWeight: 700 }}>
                                <td colSpan={5} style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--text-tertiary)' }}>
                                    Period Totals:
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-danger)' }}>
                                    {formatCurrency(totals.debit)}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-success)' }}>
                                    {formatCurrency(totals.credit)}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                    Net: {formatCurrency(Math.abs(totals.debit - totals.credit))}
                                    <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>
                                        {totals.debit >= totals.credit ? 'Dr' : 'Cr'}
                                    </span>
                                </td>
                            </tr>
                            {/* ── Closing Balance Row ── */}
                            <tr style={{ backgroundColor: 'rgba(99,102,241,0.07)', borderTop: '1px solid var(--border-primary)', fontWeight: 700 }}>
                                <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                    {new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td colSpan={6} style={{ padding: 'var(--spacing-sm)', fontWeight: 700, color: 'var(--color-primary)', fontStyle: 'italic' }}>
                                    Closing Balance
                                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                        = Opening {formatCurrency(Math.abs(openingBalance))} + Debits {formatCurrency(totals.debit)} − Credits {formatCurrency(totals.credit)}
                                    </span>
                                </td>
                                <td style={{
                                    padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700,
                                    color: closingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {formatCurrency(Math.abs(closingBalance))}
                                    <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>{closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 'var(--spacing-md)'
                }}
                    onClick={() => { setSelectedTransaction(null); setEditMode(false); }}
                >
                    <div style={{
                        backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
                        maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto'
                    }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>Transaction Details</h3>
                            <span style={{
                                padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                backgroundColor: `${getTypeColor(selectedTransaction.type)}20`, color: getTypeColor(selectedTransaction.type), textTransform: 'capitalize'
                            }}>
                                {getTypeLabel(selectedTransaction.type)}
                            </span>
                        </div>
                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Voucher No</label>
                                    <input type="text" value={selectedTransaction.voucherNo} readOnly={!editMode} className="form-input" style={{ width: '100%', fontFamily: 'monospace' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Date</label>
                                    <input type="date" value={new Date(selectedTransaction.date).toISOString().split('T')[0]} readOnly={!editMode} className="form-input" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Account</label>
                                    <input type="text" value={selectedTransaction.account} readOnly={!editMode} className="form-input" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Narration</label>
                                    <textarea value={selectedTransaction.narration} readOnly={!editMode} className="form-input" style={{ width: '100%', minHeight: '60px', resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Debit</label>
                                        <input type="number" value={selectedTransaction.debit} readOnly={!editMode} className="form-input" style={{ width: '100%', color: 'var(--color-danger)', fontWeight: 600 }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Credit</label>
                                        <input type="number" value={selectedTransaction.credit} readOnly={!editMode} className="form-input" style={{ width: '100%', color: 'var(--color-success)', fontWeight: 600 }} />
                                    </div>
                                </div>
                                {selectedTransaction.reference && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Reference</label>
                                        <input type="text" value={selectedTransaction.reference} readOnly className="form-input" style={{ width: '100%', fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)' }} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                                {!editMode ? (
                                    <>
                                        <button className="btn btn-primary" onClick={() => setEditMode(true)} style={{ flex: 1, padding: 'var(--spacing-sm)' }}>Edit</button>
                                        <button className="btn btn-secondary" onClick={() => { setSelectedTransaction(null); setEditMode(false); }} style={{ padding: 'var(--spacing-sm)' }}>Close</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-primary" onClick={() => { setEditMode(false); setSelectedTransaction(null); }} style={{ flex: 1, padding: 'var(--spacing-sm)' }}>Save Changes</button>
                                        <button className="btn btn-secondary" onClick={() => { setEditMode(false); setSelectedTransaction(null); }} style={{ padding: 'var(--spacing-sm)' }}>Cancel</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DaybookView;
