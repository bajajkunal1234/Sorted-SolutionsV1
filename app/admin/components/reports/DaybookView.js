'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Calendar, Download, Printer, Filter, TrendingUp, TrendingDown, RefreshCcw, FileText, Info, ChevronDown, Check, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { transactionsAPI, printSettingsAPI } from '@/lib/adminAPI';
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
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Excel-style multi-checkbox filter — all types selected by default
    const ALL_TYPES = ['sales', 'purchase', 'receipt', 'payment'];
    const [selectedTypes, setSelectedTypes] = useState(new Set(ALL_TYPES));
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editMode, setEditMode] = useState(false);
    
    // Print settings and export dropdown states
    const [printSettings, setPrintSettings] = useState(null);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const exportRef = useRef(null);
    
    // Custom views
    const [activeView, setActiveView] = useState(null); // null, 'money-in', 'money-out', 'summary'
    const [moneyInFilter, setMoneyInFilter] = useState('all'); // 'all', 'cash', 'bank'
    const [moneyOutFilter, setMoneyOutFilter] = useState('all'); // 'all', 'cash', 'bank'

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleType = (type) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) { next.delete(type); } else { next.add(type); }
            return next;
        });
    };

    const isAllSelected = selectedTypes.size === ALL_TYPES.length;
    const isNoneSelected = selectedTypes.size === 0;

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [data, ob, acctsRes, settingsRes] = await Promise.all([
                transactionsAPI.getAll({ type: 'all', start_date: startDate, end_date: endDate }),
                fetchOpeningBalance(startDate),
                fetch('/api/admin/accounts?type=payment_method').then(r => r.json()),
                printSettingsAPI.get().catch(() => null),
            ]);

            setTransactions((data || []).map(normalizeTransaction));
            setOpeningBalance(ob);
            setAccounts(acctsRes?.data || []);
            setPrintSettings(settingsRes || {});
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Helper to determine if account is cash
    const isCashAccount = (account) => {
        if (!account) return false;
        const type = (account.type || '').toLowerCase();
        const under = (account.under || '').toLowerCase();
        const name = (account.name || '').toLowerCase();
        return type === 'cash' || under.includes('cash') || name.includes('cash-in-hand');
    };

    // Calculate all receipts and payments regardless of sidebar checkboxes
    const allReceipts = useMemo(() => {
        return transactions.filter(t => t.type === 'receipt');
    }, [transactions]);

    const allPayments = useMemo(() => {
        return transactions.filter(t => t.type === 'payment');
    }, [transactions]);

    const totalMoneyIn = useMemo(() => {
        return allReceipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    }, [allReceipts]);

    const totalMoneyOut = useMemo(() => {
        return allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    }, [allPayments]);

    // Receipts bifurcation
    const moneyInBifurcation = useMemo(() => {
        let cash = 0;
        let bank = 0;
        const details = {}; // account_id -> { name, amount, txns: [] }

        allReceipts.forEach(txn => {
            const amt = parseFloat(txn.amount) || 0;
            const acctId = txn.payment_account_id || 'unknown';
            const acct = accounts.find(a => a.id === acctId);
            
            const isCash = acct ? isCashAccount(acct) : (txn.payment_mode || '').toLowerCase() === 'cash';
            
            if (isCash) {
                cash += amt;
            } else {
                bank += amt;
            }

            const name = acct ? acct.name : (txn.payment_mode || 'Unknown Mode');
            if (!details[acctId]) {
                details[acctId] = { name, amount: 0, txns: [] };
            }
            details[acctId].amount += amt;
            details[acctId].txns.push(txn);
        });

        return { cash, bank, details: Object.values(details) };
    }, [allReceipts, accounts]);

    // Payments bifurcation
    const moneyOutBifurcation = useMemo(() => {
        let cash = 0;
        let bank = 0;
        const details = {}; // account_id -> { name, amount, txns: [] }

        allPayments.forEach(txn => {
            const amt = parseFloat(txn.amount) || 0;
            const acctId = txn.payment_account_id || 'unknown';
            const acct = accounts.find(a => a.id === acctId);
            
            const isCash = acct ? isCashAccount(acct) : (txn.payment_mode || '').toLowerCase() === 'cash';
            
            if (isCash) {
                cash += amt;
            } else {
                bank += amt;
            }

            const name = acct ? acct.name : (txn.payment_mode || 'Unknown Mode');
            if (!details[acctId]) {
                details[acctId] = { name, amount: 0, txns: [] };
            }
            details[acctId].amount += amt;
            details[acctId].txns.push(txn);
        });

        return { cash, bank, details: Object.values(details) };
    }, [allPayments, accounts]);

    // Filter receipts list based on tab
    const visibleReceipts = useMemo(() => {
        return allReceipts.filter(txn => {
            if (moneyInFilter === 'all') return true;
            const acct = accounts.find(a => a.id === txn.payment_account_id);
            const isCash = acct ? isCashAccount(acct) : (txn.payment_mode || '').toLowerCase() === 'cash';
            if (moneyInFilter === 'cash') return isCash;
            if (moneyInFilter === 'bank') return !isCash;
            return true;
        });
    }, [allReceipts, moneyInFilter, accounts]);

    // Filter payments list based on tab
    const visiblePayments = useMemo(() => {
        return allPayments.filter(txn => {
            if (moneyOutFilter === 'all') return true;
            const acct = accounts.find(a => a.id === txn.payment_account_id);
            const isCash = acct ? isCashAccount(acct) : (txn.payment_mode || '').toLowerCase() === 'cash';
            if (moneyOutFilter === 'cash') return isCash;
            if (moneyOutFilter === 'bank') return !isCash;
            return true;
        });
    }, [allPayments, moneyOutFilter, accounts]);

    // Filter, sort, and compute running balance starting from opening balance
    const processedTransactions = useMemo(() => {
        let filtered = transactions.filter(txn => {
            const txnDate = new Date(txn.date).toISOString().split('T')[0];
            const matchesDate = txnDate >= startDate && txnDate <= endDate;
            // Show row if its type is in the checked set (or set is empty = show all)
            const matchesType = selectedTypes.size === 0 || selectedTypes.has(txn.type);
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
    }, [transactions, startDate, endDate, selectedTypes, openingBalance]);

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

    const handleExportCSV = async () => {
        let csv = '';
        let filename = '';

        if (activeView === 'money-in') {
            const headers = ['Date', 'Receipt No', 'Received From', 'Deposit Account', 'Narration', 'Amount'];
            const rows = visibleReceipts.map(txn => {
                const acct = accounts.find(a => a.id === txn.payment_account_id);
                const acctName = acct ? acct.name : (txn.payment_mode || '—');
                return [
                    new Date(txn.date).toLocaleDateString('en-GB'),
                    txn.voucherNo,
                    txn.account,
                    acctName,
                    (txn.narration || '').replace(/,/g, ' '),
                    txn.amount.toFixed(2),
                ];
            });
            csv = [headers, ...rows].map(r => r.join(',')).join('\n');
            filename = `Receipts_${startDate}_to_${endDate}.csv`;
        } else if (activeView === 'money-out') {
            const headers = ['Date', 'Payment No', 'Paid To', 'Payment Account', 'Narration', 'Amount'];
            const rows = visiblePayments.map(txn => {
                const acct = accounts.find(a => a.id === txn.payment_account_id);
                const acctName = acct ? acct.name : (txn.payment_mode || '—');
                return [
                    new Date(txn.date).toLocaleDateString('en-GB'),
                    txn.voucherNo,
                    txn.account,
                    acctName,
                    (txn.narration || '').replace(/,/g, ' '),
                    txn.amount.toFixed(2),
                ];
            });
            csv = [headers, ...rows].map(r => r.join(',')).join('\n');
            filename = `Payments_${startDate}_to_${endDate}.csv`;
        } else {
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
            csv = [headers, obRow, ...rows, cbRow].map(r => r.join(',')).join('\n');
            filename = `Daybook_${startDate}_to_${endDate}.csv`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });

        if (typeof window !== 'undefined' && window.triggerNativeDownload) {
            const handled = await window.triggerNativeDownload(blob, filename);
            if (handled) return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters Row */}
            <div className="daybook-filters-row" style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Date Range */}
                <div className="date-range-container" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
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

                {/* Excel-style Checkbox Filter */}
                <div ref={filterRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className="form-input"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 'var(--font-size-sm)', padding: '6px 12px',
                            cursor: 'pointer', userSelect: 'none',
                            border: !isAllSelected ? '1px solid var(--color-primary)' : undefined,
                            backgroundColor: !isAllSelected ? 'rgba(99,102,241,0.08)' : undefined,
                        }}
                    >
                        <Filter size={14} style={{ color: !isAllSelected ? 'var(--color-primary)' : 'var(--text-tertiary)' }} />
                        <span style={{ color: !isAllSelected ? 'var(--color-primary)' : undefined }}>
                            {isAllSelected ? 'All Types' : isNoneSelected ? 'None' : `${selectedTypes.size} Types`}
                        </span>
                        {!isAllSelected && (
                            <span style={{
                                backgroundColor: 'var(--color-primary)', color: 'white',
                                borderRadius: 999, fontSize: 10, fontWeight: 700,
                                padding: '1px 6px', marginLeft: 2,
                            }}>{selectedTypes.size}</span>
                        )}
                        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6, transform: filterOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>

                    {/* Dropdown */}
                    {filterOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                            zIndex: 999, minWidth: 200, overflow: 'hidden',
                        }}>
                            {/* Header: Select All / Clear */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filter by Type</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setSelectedTypes(new Set(ALL_TYPES))}
                                        style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                    >All</button>
                                    <span style={{ color: 'var(--border-primary)' }}>|</span>
                                    <button
                                        onClick={() => setSelectedTypes(new Set())}
                                        style={{ fontSize: 11, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                    >None</button>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            {ALL_TYPES.map(type => {
                                const checked = selectedTypes.has(type);
                                const color = getTypeColor(type);
                                const count = transactions.filter(t => t.type === type).length;
                                return (
                                    <label
                                        key={type}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '9px 14px', cursor: 'pointer',
                                            transition: 'background 0.12s',
                                            backgroundColor: checked ? `${color}0d` : 'transparent',
                                            borderLeft: checked ? `3px solid ${color}` : '3px solid transparent',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = `${color}18`}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = checked ? `${color}0d` : 'transparent'}
                                    >
                                        {/* Custom checkbox */}
                                        <div
                                            onClick={() => toggleType(type)}
                                            style={{
                                                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                                border: `2px solid ${checked ? color : 'var(--border-primary)'}`,
                                                backgroundColor: checked ? color : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {checked && <Check size={10} color="white" strokeWidth={3} />}
                                        </div>
                                        <div onClick={() => toggleType(type)} style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    backgroundColor: color, flexShrink: 0,
                                                }} />
                                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                                    {getTypeLabel(type)}
                                                </span>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', borderRadius: 999, padding: '1px 7px', fontWeight: 600 }}>
                                            {count}
                                        </span>
                                    </label>
                                );
                            })}

                            {/* Footer close */}
                            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-primary)', textAlign: 'right' }}>
                                <button
                                    onClick={() => setFilterOpen(false)}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 14px', fontSize: 12 }}
                                >Done</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-spacer" style={{ flex: 1 }} />

                <div className="daybook-actions-container" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <button
                        className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        onClick={fetchTransactions}
                        disabled={loading}
                    >
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <div ref={exportRef} style={{ position: 'relative' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => setExportDropdownOpen(v => !v)}
                        >
                            <Download size={16} />
                            Export
                            <ChevronDown size={13} style={{ opacity: 0.6, transform: exportDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>
                        {exportDropdownOpen && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                                zIndex: 999, minWidth: 160, overflow: 'hidden',
                            }}>
                                <button
                                    onClick={() => {
                                        setExportDropdownOpen(false);
                                        handleExportCSV();
                                    }}
                                    style={{
                                        display: 'block', width: '100%', padding: '10px 16px',
                                        textAlign: 'left', background: 'none', border: 'none',
                                        fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)',
                                        cursor: 'pointer', transition: 'background 0.12s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    Export as CSV
                                </button>
                                <button
                                    onClick={() => {
                                        setExportDropdownOpen(false);
                                        window.print();
                                    }}
                                    style={{
                                        display: 'block', width: '100%', padding: '10px 16px',
                                        textAlign: 'left', background: 'none', border: 'none',
                                        fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)',
                                        cursor: 'pointer', borderTop: '1px solid var(--border-primary)',
                                        transition: 'background 0.12s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    Export as PDF (A4)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        onClick={() => window.print()}
                    >
                        <Printer size={16} />
                        Print
                    </button>
                </div>
            </div>

            {/* Main Daybook Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading && transactions.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                        <RefreshCcw size={48} className="spin" style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
                        <p>Loading transaction data...</p>
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={fetchTransactions} style={{ marginTop: 'var(--spacing-md)' }}>Retry</button>
                    </div>
                ) : activeView === null ? (
                    /* 3 Cards Mode */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div className="daybook-summary-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
                            {/* Card 1: Total Money In */}
                            <div 
                                onClick={() => setActiveView('money-in')}
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '2px solid rgba(16, 185, 129, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-sm)',
                                    boxShadow: 'var(--shadow-md)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#10b981';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Money In</span>
                                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 6, borderRadius: '50%' }}>
                                        <TrendingDown size={20} color="#10b981" />
                                    </div>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                                    {formatCurrency(totalMoneyIn)}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    All receipts collected across cash and bank. Click to see details.
                                </div>
                            </div>

                            {/* Card 2: Total Money Out */}
                            <div 
                                onClick={() => setActiveView('money-out')}
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '2px solid rgba(245, 158, 11, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-sm)',
                                    boxShadow: 'var(--shadow-md)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#f59e0b';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Money Out</span>
                                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 6, borderRadius: '50%' }}>
                                        <TrendingUp size={20} color="#f59e0b" />
                                    </div>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                                    {formatCurrency(totalMoneyOut)}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    All payments made across cash and bank. Click to see details.
                                </div>
                            </div>

                            {/* Card 3: Daybook Summary */}
                            <div 
                                onClick={() => setActiveView('summary')}
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '2px solid rgba(99, 102, 241, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-sm)',
                                    boxShadow: 'var(--shadow-md)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#6366f1';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Daybook & Net Position</span>
                                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: 6, borderRadius: '50%' }}>
                                        <FileText size={20} color="#6366f1" />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Opening Balance</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: openingBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Closing Balance</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: closingBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Total Debit (In)</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#ef4444' }}>
                                            {formatCurrency(totals.debit)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Total Credit (Out)</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#10b981' }}>
                                            {formatCurrency(totals.credit)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Transactions List</span>
                                    <span style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                        {processedTransactions.length} items
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeView === 'money-in' ? (
                    /* Receipts (Money In) Detailed View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setActiveView(null)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}
                        >
                            <ArrowLeft size={16} /> Back to Daybook
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                                    Cash Receipts
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#10b981' }}>
                                    {formatCurrency(moneyInBifurcation.cash)}
                                </div>
                            </div>
                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                                    Bank Receipts
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#3b82f6' }}>
                                    {formatCurrency(moneyInBifurcation.bank)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                Deposit Accounts Breakdown
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                {moneyInBifurcation.details.map((item, idx) => (
                                    <div key={idx} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{item.name}</span>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#10b981' }}>{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                {moneyInBifurcation.details.length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: 'var(--spacing-md)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        No receipts recorded for this period
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <button 
                                        className={`view-toggle-btn ${moneyInFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setMoneyInFilter('all')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        All Receipts ({allReceipts.length})
                                    </button>
                                    <button 
                                        className={`view-toggle-btn ${moneyInFilter === 'cash' ? 'active' : ''}`}
                                        onClick={() => setMoneyInFilter('cash')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        Cash Mode ({allReceipts.filter(r => {
                                            const acct = accounts.find(a => a.id === r.payment_account_id);
                                            return acct ? isCashAccount(acct) : (r.payment_mode || '').toLowerCase() === 'cash';
                                        }).length})
                                    </button>
                                    <button 
                                        className={`view-toggle-btn ${moneyInFilter === 'bank' ? 'active' : ''}`}
                                        onClick={() => setMoneyInFilter('bank')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        Bank Mode ({allReceipts.filter(r => {
                                            const acct = accounts.find(a => a.id === r.payment_account_id);
                                            return !(acct ? isCashAccount(acct) : (r.payment_mode || '').toLowerCase() === 'cash');
                                        }).length})
                                    </button>
                                </div>
                            </div>

                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="daybook-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Date</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Receipt No</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Received From</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Deposit Account</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Narration</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleReceipts.map(txn => {
                                            const acct = accounts.find(a => a.id === txn.payment_account_id);
                                            const acctName = acct ? acct.name : (txn.payment_mode || '—');
                                            return (
                                                <tr 
                                                    key={txn.id}
                                                    onClick={() => setSelectedTransaction(txn)}
                                                    style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                                        {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                                                        {txn.voucherNo}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                        {txn.account}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {acctName}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                                        {txn.narration}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                        {formatCurrency(txn.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {visibleReceipts.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)' }}>
                                                    No receipts found matching selected criteria
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeView === 'money-out' ? (
                    /* Payments (Money Out) Detailed View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setActiveView(null)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}
                        >
                            <ArrowLeft size={16} /> Back to Daybook
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                    Cash Payments
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#ef4444' }}>
                                    {formatCurrency(moneyOutBifurcation.cash)}
                                </div>
                            </div>
                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                                    Bank Payments
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#3b82f6' }}>
                                    {formatCurrency(moneyOutBifurcation.bank)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                Payment Accounts Breakdown
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                {moneyOutBifurcation.details.map((item, idx) => (
                                    <div key={idx} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{item.name}</span>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                {moneyOutBifurcation.details.length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: 'var(--spacing-md)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        No payments recorded for this period
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <button 
                                        className={`view-toggle-btn ${moneyOutFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setMoneyOutFilter('all')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        All Payments ({allPayments.length})
                                    </button>
                                    <button 
                                        className={`view-toggle-btn ${moneyOutFilter === 'cash' ? 'active' : ''}`}
                                        onClick={() => setMoneyOutFilter('cash')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        Cash Mode ({allPayments.filter(p => {
                                            const acct = accounts.find(a => a.id === p.payment_account_id);
                                            return acct ? isCashAccount(acct) : (p.payment_mode || '').toLowerCase() === 'cash';
                                        }).length})
                                    </button>
                                    <button 
                                        className={`view-toggle-btn ${moneyOutFilter === 'bank' ? 'active' : ''}`}
                                        onClick={() => setMoneyOutFilter('bank')}
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                                    >
                                        Bank Mode ({allPayments.filter(p => {
                                            const acct = accounts.find(a => a.id === p.payment_account_id);
                                            return !(acct ? isCashAccount(acct) : (p.payment_mode || '').toLowerCase() === 'cash');
                                        }).length})
                                    </button>
                                </div>
                            </div>

                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="daybook-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Date</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Payment No</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Paid To</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Payment Account</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Narration</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visiblePayments.map(txn => {
                                            const acct = accounts.find(a => a.id === txn.payment_account_id);
                                            const acctName = acct ? acct.name : (txn.payment_mode || '—');
                                            return (
                                                <tr 
                                                    key={txn.id}
                                                    onClick={() => setSelectedTransaction(txn)}
                                                    style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                                        {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                                                        {txn.voucherNo}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                        {txn.account}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {acctName}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                                        {txn.narration}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                                                        {formatCurrency(txn.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {visiblePayments.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)' }}>
                                                    No payments found matching selected criteria
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Daybook Summary / All Transactions View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setActiveView(null)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}
                        >
                            <ArrowLeft size={16} /> Back to Daybook
                        </button>

                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="daybook-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
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
                        </div>
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="modal-overlay"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 'var(--spacing-md)'
                    }}
                    onClick={() => { setSelectedTransaction(null); setEditMode(false); }}
                >
                    <div className="modal-container"
                        style={{
                            maxWidth: '600px',
                            backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
                            width: '100%', overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="modal-title" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>Transaction Details</h3>
                            <span style={{
                                padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                backgroundColor: `${getTypeColor(selectedTransaction.type)}20`, color: getTypeColor(selectedTransaction.type), textTransform: 'capitalize'
                            }}>
                                {getTypeLabel(selectedTransaction.type)}
                            </span>
                        </div>
                        <div className="modal-body" style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
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

            {/* Printable PDF layout */}
            <div className="daybook-print-container" style={{ display: 'none' }}>
                <div style={{ 
                    padding: '20mm', 
                    fontFamily: 'Arial, sans-serif', 
                    color: '#000000', 
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    lineHeight: '1.5'
                }}>
                    {/* Company Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #1e293b',
                        paddingBottom: '15px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            {printSettings?.logo_url && (
                                <img src={printSettings.logo_url} alt="Logo" style={{ height: '40px', marginBottom: '8px' }} />
                            )}
                            <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                                {printSettings?.company_name || 'Sorted Solutions'}
                            </h1>
                            <p style={{ margin: '3px 0', fontSize: '10px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                                {printSettings?.company_address}
                            </p>
                            <p style={{ margin: '3px 0', fontSize: '10px', color: '#475569' }}>
                                Phone: {printSettings?.company_phone} | Email: {printSettings?.company_email}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {activeView === 'money-in' ? 'Receipts (Money In)' : activeView === 'money-out' ? 'Payments (Money Out)' : 'Daybook Ledger'}
                            </h2>
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#334155' }}>
                                <b>Period:</b> {new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                                Generated: {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    {/* PDF View Dynamic Content */}
                    {activeView === 'money-in' ? (
                        <div>
                            {/* Receipts Bifurcation Card */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Cash Receipts</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(moneyInBifurcation.cash)}</div>
                                </div>
                                <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Bank Receipts</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(moneyInBifurcation.bank)}</div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Deposit Accounts Breakdown
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Account Name</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', width: '150px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moneyInBifurcation.details.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px' }}>{item.name}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                    {moneyInBifurcation.details.length === 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No receipts recorded</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Receipts List ({moneyInFilter === 'all' ? 'All' : moneyInFilter === 'cash' ? 'Cash Mode' : 'Bank Mode'})
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Date</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Receipt No</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Received From</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Deposit Account</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Narration</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '11px', width: '120px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleReceipts.map((txn, idx) => {
                                        const acct = accounts.find(a => a.id === txn.payment_account_id);
                                        const acctName = acct ? acct.name : (txn.payment_mode || '—');
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '8px' }}>
                                                    {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{txn.voucherNo}</td>
                                                <td style={{ padding: '8px', fontWeight: 500 }}>{txn.account}</td>
                                                <td style={{ padding: '8px', color: '#475569' }}>{acctName}</td>
                                                <td style={{ padding: '8px', color: '#475569' }}>{txn.narration}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCurrency(txn.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                    {visibleReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No matching receipts found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeView === 'money-out' ? (
                        <div>
                            {/* Payments Bifurcation Card */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Cash Payments</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(moneyOutBifurcation.cash)}</div>
                                </div>
                                <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Bank Payments</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(moneyOutBifurcation.bank)}</div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Payment Accounts Breakdown
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Account Name</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', width: '150px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moneyOutBifurcation.details.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px' }}>{item.name}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                    {moneyOutBifurcation.details.length === 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No payments recorded</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Payments List ({moneyOutFilter === 'all' ? 'All' : moneyOutFilter === 'cash' ? 'Cash Mode' : 'Bank Mode'})
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Date</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Payment No</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Paid To</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Payment Account</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Narration</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '11px', width: '120px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visiblePayments.map((txn, idx) => {
                                        const acct = accounts.find(a => a.id === txn.payment_account_id);
                                        const acctName = acct ? acct.name : (txn.payment_mode || '—');
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '8px' }}>
                                                    {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{txn.voucherNo}</td>
                                                <td style={{ padding: '8px', fontWeight: 500 }}>{txn.account}</td>
                                                <td style={{ padding: '8px', color: '#475569' }}>{acctName}</td>
                                                <td style={{ padding: '8px', color: '#475569' }}>{txn.narration}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(txn.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                    {visiblePayments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No matching payments found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            {/* Summary Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>Opening Balance</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: openingBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}
                                    </div>
                                </div>
                                <div style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>Total Debit (In)</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totals.debit)}</div>
                                </div>
                                <div style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>Total Credit (Out)</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(totals.credit)}</div>
                                </div>
                                <div style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>Closing Balance</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: closingBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Transaction Ledger List
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Date</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px', width: '80px' }}>Type</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px', width: '100px' }}>Voucher No</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Account</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#334155', fontSize: '11px' }}>Narration</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '11px', width: '100px' }}>Debit</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '11px', width: '100px' }}>Credit</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '11px', width: '110px' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Opening Row */}
                                    <tr style={{ backgroundColor: 'rgba(99,102,241,0.05)', borderBottom: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                                        <td style={{ padding: '8px' }}>
                                            {new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td colSpan={6} style={{ padding: '8px', fontWeight: 600 }}>Opening Balance</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                                            {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>

                                    {/* Txn Rows */}
                                    {processedTransactions.map((txn, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px' }}>
                                                {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '8px', textTransform: 'capitalize', fontWeight: 600, fontSize: '10px' }}>{txn.type}</td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{txn.voucherNo}</td>
                                            <td style={{ padding: '8px', fontWeight: 500 }}>{txn.account}</td>
                                            <td style={{ padding: '8px', color: '#475569' }}>{txn.narration}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>{txn.debit > 0 ? formatCurrency(txn.debit) : '—'}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>{txn.credit > 0 ? formatCurrency(txn.credit) : '—'}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                                                {formatCurrency(Math.abs(txn.balance))} {txn.balance >= 0 ? 'Dr' : 'Cr'}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Period Totals */}
                                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                                        <td colSpan={5} style={{ padding: '8px', textAlign: 'right' }}>Period Totals:</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(totals.debit)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(totals.credit)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>
                                            Net: {formatCurrency(Math.abs(totals.debit - totals.credit))} {totals.debit >= totals.credit ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>

                                    {/* Closing Row */}
                                    <tr style={{ backgroundColor: 'rgba(99,102,241,0.05)', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>
                                        <td style={{ padding: '8px' }}>
                                            {new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td colSpan={6} style={{ padding: '8px', fontStyle: 'italic' }}>Closing Balance</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                                            {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Print CSS Injection */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .daybook-print-container,
                    .daybook-print-container * {
                        visibility: visible !important;
                    }
                    .daybook-print-container {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    @page {
                        size: A4 portrait !important;
                        margin: 15mm !important;
                    }
                    th {
                        background-color: #f1f5f9 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default DaybookView;
