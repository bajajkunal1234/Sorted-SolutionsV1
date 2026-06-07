'use client'

import { useState, useEffect, useMemo } from 'react';
import {
    Receipt, Edit2, Filter, TrendingUp, TrendingDown, Loader2,
    Download, ChevronDown, ChevronUp, RefreshCw, Calendar,
    FileText, CreditCard, ShoppingCart, ArrowUpCircle, ArrowDownCircle,
    Layers, SortAsc, SortDesc, Tag
} from 'lucide-react';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => Math.abs(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB');
};

const TYPE_META = {
    sales_invoice:    { label: 'Sales Invoice',    color: '#10b981', bg: '#10b98120', icon: ArrowUpCircle },
    purchase_invoice: { label: 'Purchase Invoice', color: '#ef4444', bg: '#ef444420', icon: ArrowDownCircle },
    receipt:          { label: 'Receipt',           color: '#3b82f6', bg: '#3b82f620', icon: CreditCard },
    payment:          { label: 'Payment',           color: '#f59e0b', bg: '#f59e0b20', icon: CreditCard },
    quotation:        { label: 'Quotation',         color: '#a855f7', bg: '#a855f720', icon: FileText },
    amc:              { label: 'AMC Contract',      color: '#06b6d4', bg: '#06b6d420', icon: Layers },
    rental:           { label: 'Rental Contract',   color: '#8b5cf6', bg: '#8b5cf620', icon: Layers },
    journal:          { label: 'Journal',           color: '#64748b', bg: '#64748b20', icon: Layers },
};

const getTypeMeta = (type) => TYPE_META[type] || { label: type, color: '#64748b', bg: '#64748b20', icon: Tag };

// Current Indian financial year: Apr 1 → Mar 31
function currentFYDates() {
    const today = new Date();
    const yr = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

function exportToCSV(rows, accountName) {
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
        lines.push([
            fmtDate(r.date),
            getTypeMeta(r.type).label,
            r.reference || '',
            `"${(r.description || '').replace(/"/g, '""')}"`,
            r.debit > 0 ? r.debit.toFixed(2) : '',
            r.credit > 0 ? r.credit.toFixed(2) : '',
            r.balance != null ? r.balance.toFixed(2) : ''
        ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${(accountName || 'account').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Main Component ────────────────────────────────────────────────────────────

function TransactionsTab({ accountId, accountName, account }) {
    const [rawTransactions, setRawTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [openingBalanceType, setOpeningBalanceType] = useState('dr'); // dr | cr

    // ── Filters ──
    const fy = currentFYDates();
    const [dateFrom, setDateFrom] = useState(fy.from);
    const [dateTo, setDateTo] = useState(fy.to);
    const [filterType, setFilterType] = useState('all');
    const [sortDir, setSortDir] = useState('desc'); // asc | desc
    const [groupBy, setGroupBy] = useState('none'); // none | month | type
    const [showFilters, setShowFilters] = useState(false);

    // ── Edit forms ──
    const [activeForm, setActiveForm] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // ─── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (accountId) fetchAll();
    }, [accountId]);

    // If account prop carries opening balance, seed from it
    useEffect(() => {
        if (account) {
            const ob = parseFloat(account.opening_balance || account.openingBalance) || 0;
            setOpeningBalance(ob);
            setOpeningBalanceType(account.balance_type || account.balanceType || 'dr');
        }
    }, [account]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const { supabase } = await import('@/lib/supabase');

            // ── Fetch account meta for opening balance ──────────────────────
            if (!account) {
                const { data: acctData } = await supabase
                    .from('accounts')
                    .select('opening_balance, balance_type')
                    .eq('id', accountId)
                    .single();
                if (acctData) {
                    setOpeningBalance(parseFloat(acctData.opening_balance) || 0);
                    setOpeningBalanceType(acctData.balance_type || 'dr');
                }
            }

            // ── Layer 1: Direct vouchers ─────────────────────────────────────
            // Sales Invoices where this is the primary account
            const [
                { data: salesDirect },
                { data: purchDirect },
                { data: receiptDirect },  // customer is the payer
                { data: receiptBankDirect }, // this account is the bank used
                { data: paymentDirect }, // this account is the payee
                { data: paymentBankDirect }, // this account is the bank used
                { data: quotesDirect },
                { data: amcDirect },
                { data: rentalDirect },
            ] = await Promise.all([
                supabase.from('sales_invoices').select('id,invoice_number,reference,date,total_amount,paid_amount,cgst,sgst,igst,status,notes,job_id,account_id,account_name,jobs(job_number)').eq('account_id', accountId).neq('status','archived'),
                supabase.from('purchase_invoices').select('id,invoice_number,reference,date,total_amount,cgst,sgst,igst,status,notes,job_id,account_id,account_name,paid_by,billing_address,jobs(job_number)').eq('account_id', accountId).neq('status','archived'),
                supabase.from('receipt_vouchers').select('id,receipt_number,reference,reference_number,date,amount,payment_mode,narration,status,job_id,account_id,account_name,jobs(job_number)').eq('account_id', accountId),
                supabase.from('receipt_vouchers').select('id,receipt_number,reference,reference_number,date,amount,payment_mode,narration,status,job_id,account_id,account_name,payment_account_id,jobs(job_number)').eq('payment_account_id', accountId),
                supabase.from('payment_vouchers').select('id,payment_number,reference,reference_number,date,amount,payment_mode,narration,status,job_id,account_id,account_name,jobs(job_number)').eq('account_id', accountId),
                supabase.from('payment_vouchers').select('id,payment_number,reference,reference_number,date,amount,payment_mode,narration,status,job_id,account_id,account_name,payment_account_id,jobs(job_number)').eq('payment_account_id', accountId),
                supabase.from('quotations').select('id,quote_number,reference,date,total_amount,status,notes,job_id,account_id,account_name,jobs(job_number)').eq('account_id', accountId),
                supabase.from('active_amcs').select('id,plan_name,amc_amount,start_date,end_date,status,payment_status,customer_id,amc_plans(name)').eq('customer_id', accountId).neq('status','archived'),
                supabase.from('active_rentals').select('id,product_name,monthly_rent,rent_advance,start_date,end_date,status,customer_id,rental_plans(product_name)').eq('customer_id', accountId).neq('status','archived'),
            ]);

            // ── Layer 2: Journal lines (contra ledger entries) ───────────────
            const { data: journalLines } = await supabase
                .from('journal_entry_lines')
                .select(`
                    id, debit, credit,
                    journal_entries!inner(id, entry_number, date, reference_type, reference_id, notes)
                `)
                .eq('account_id', accountId);

            // ── Build a set of reference_ids already covered by Layer 1 ─────
            const coveredRefs = new Set();

            // ── Map Layer 1 → unified shape ──────────────────────────────────
            const txns = [];

            // Helper to avoid duplicates when account appears as both primary + bank
            const seen = new Set(); // track by `type:id`

            const addIfNew = (key, txn) => {
                if (!seen.has(key)) {
                    seen.add(key);
                    txns.push(txn);
                }
            };

            (salesDirect || []).forEach(s => {
                const key = `si:${s.id}`;
                const total = parseFloat(s.total_amount) || 0;
                coveredRefs.add(s.id);
                addIfNew(key, {
                    id: s.id, originalId: s.id,
                    date: s.date, type: 'sales_invoice',
                    reference: s.invoice_number || s.reference || '—',
                    description: s.notes || `Sales to ${s.account_name || ''}`,
                    debit: total, credit: 0,
                    balance: 0, status: s.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: s,
                    amount: total,
                });
            });

            (purchDirect || []).forEach(p => {
                const key = `pi:${p.id}`;
                const total = parseFloat(p.total_amount) || 0;
                coveredRefs.add(p.id);
                addIfNew(key, {
                    id: p.id, originalId: p.id,
                    date: p.date, type: 'purchase_invoice',
                    reference: p.invoice_number || p.reference || '—',
                    description: p.notes || `Purchase from ${p.account_name || ''}`,
                    debit: 0, credit: total,
                    balance: 0, status: p.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: p,
                    amount: total,
                });
            });

            (receiptDirect || []).forEach(r => {
                const key = `rv:${r.id}`;
                const amt = parseFloat(r.amount) || 0;
                coveredRefs.add(r.id);
                // For the paying account (customer): receipt = credit (they paid us, reducing their balance)
                addIfNew(key, {
                    id: r.id, originalId: r.id,
                    date: r.date, type: 'receipt',
                    reference: r.receipt_number || r.reference || '—',
                    description: r.narration || `Receipt - ${r.payment_mode || ''}`,
                    debit: 0, credit: amt,
                    balance: 0, status: r.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: r,
                    amount: amt,
                });
            });

            (receiptBankDirect || []).forEach(r => {
                const key = `rv:${r.id}`;
                const amt = parseFloat(r.amount) || 0;
                coveredRefs.add(r.id);
                // For the bank account: receipt = debit (money came into bank)
                addIfNew(key, {
                    id: r.id, originalId: r.id,
                    date: r.date, type: 'receipt',
                    reference: r.receipt_number || r.reference || '—',
                    description: r.narration || `Receipt via ${r.payment_mode || ''}`,
                    debit: amt, credit: 0,
                    balance: 0, status: r.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: r,
                    amount: amt,
                });
            });

            (paymentDirect || []).forEach(p => {
                const key = `pv:${p.id}`;
                const amt = parseFloat(p.amount) || 0;
                coveredRefs.add(p.id);
                // For the payee (technician/supplier): payment = debit (we paid them, reducing what we owe)
                addIfNew(key, {
                    id: p.id, originalId: p.id,
                    date: p.date, type: 'payment',
                    reference: p.payment_number || p.reference || '—',
                    description: p.narration || `Payment - ${p.payment_mode || ''}`,
                    debit: amt, credit: 0,
                    balance: 0, status: p.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: p,
                    amount: amt,
                });
            });

            (paymentBankDirect || []).forEach(p => {
                const key = `pv:${p.id}`;
                const amt = parseFloat(p.amount) || 0;
                coveredRefs.add(p.id);
                // For the bank account: payment = credit (money left the bank)
                addIfNew(key, {
                    id: p.id, originalId: p.id,
                    date: p.date, type: 'payment',
                    reference: p.payment_number || p.reference || '—',
                    description: p.narration || `Payment via ${p.payment_mode || ''}`,
                    debit: 0, credit: amt,
                    balance: 0, status: p.status || 'finalized',
                    canEdit: true, isNonFinancial: false, rawData: p,
                    amount: amt,
                });
            });

            (quotesDirect || []).forEach(q => {
                const key = `qt:${q.id}`;
                addIfNew(key, {
                    id: q.id, originalId: q.id,
                    date: q.date, type: 'quotation',
                    reference: q.quote_number || q.reference || '—',
                    description: q.notes || `Quotation`,
                    debit: 0, credit: 0,
                    balance: 0, status: q.status || 'draft',
                    canEdit: true, isNonFinancial: true, rawData: q,
                    amount: parseFloat(q.total_amount) || 0,
                });
            });

            // AMC Contracts (non-financial — no debit/credit, shows contract value for context)
            (amcDirect || []).forEach(a => {
                const key = `amc:${a.id}`;
                const planName = a.plan_name || a.amc_plans?.name || 'AMC';
                const amcAmt = parseFloat(a.amc_amount) || 0;
                addIfNew(key, {
                    id: a.id, originalId: a.id,
                    date: a.start_date, type: 'amc',
                    reference: `AMC-${String(a.id).slice(0, 8).toUpperCase()}`,
                    description: `${planName} | ${fmtDate(a.start_date)} → ${fmtDate(a.end_date)}${a.payment_status ? ` | ${a.payment_status}` : ''}`,
                    debit: 0, credit: 0,
                    balance: 0, status: a.status || 'active',
                    canEdit: false, isNonFinancial: true, rawData: a,
                    amount: amcAmt,
                });
            });

            // Rental Contracts (non-financial — shows monthly rent for context)
            (rentalDirect || []).forEach(r => {
                const key = `rental:${r.id}`;
                const productName = r.product_name || r.rental_plans?.product_name || 'Rental';
                const monthlyRent = parseFloat(r.monthly_rent) || 0;
                addIfNew(key, {
                    id: r.id, originalId: r.id,
                    date: r.start_date, type: 'rental',
                    reference: `RNT-${String(r.id).slice(0, 8).toUpperCase()}`,
                    description: `${productName} | ₹${fmt(monthlyRent)}/mo | ${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}`,
                    debit: 0, credit: 0,
                    balance: 0, status: r.status || 'active',
                    canEdit: false, isNonFinancial: true, rawData: r,
                    amount: monthlyRent,
                });
            });

            // ── Layer 2: add journal lines NOT already covered by Layer 1 ────
            (journalLines || []).forEach(line => {
                const je = line.journal_entries;
                if (!je) return;
                const refId = je.reference_id;
                // If this journal line's source document is already in Layer 1, skip
                if (refId && coveredRefs.has(refId)) return;

                const key = `jl:${line.id}`;
                // Determine type from reference_type
                let type = 'journal';
                if (je.reference_type === 'sales_invoice') type = 'sales_invoice';
                else if (je.reference_type === 'purchase_invoice') type = 'purchase_invoice';
                else if (je.reference_type === 'receipt_invoice') type = 'receipt';
                else if (je.reference_type === 'payment_invoice') type = 'payment';

                addIfNew(key, {
                    id: line.id, originalId: refId || null,
                    date: je.date, type,
                    reference: je.entry_number || '—',
                    description: je.notes || '—',
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0,
                    balance: 0,
                    status: 'finalized',
                    canEdit: !!refId,
                    isNonFinancial: false, rawData: null,
                    amount: Math.max(parseFloat(line.debit) || 0, parseFloat(line.credit) || 0),
                });
            });

            setRawTransactions(txns);
        } catch (err) {
            console.error('TransactionsTab fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Compute running balance ─────────────────────────────────────────────
    const processedTransactions = useMemo(() => {
        // 1. Date filter
        let filtered = rawTransactions.filter(t => {
            if (!t.date) return true;
            const d = t.date.split('T')[0];
            if (dateFrom && d < dateFrom) return false;
            if (dateTo && d > dateTo) return false;
            return true;
        });

        // 2. Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // 3. Sort ASC for balance computation
        const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

        // 4. Seed opening balance (Dr = positive debit balance, Cr = positive credit balance)
        // In Tally convention: for a Debtor account, Dr balance means they owe us money
        // Running balance: credit reduces balance, debit increases balance (for Dr-nature accounts)
        let runningBal = openingBalanceType === 'cr'
            ? -openingBalance   // credit opening = negative in Dr-convention
            : openingBalance;    // debit opening = positive

        // 5. Assign running balance
        const withBalance = sorted.map(txn => {
            runningBal += (txn.debit || 0) - (txn.credit || 0);
            return { ...txn, balance: runningBal };
        });

        // 6. Reverse for display (newest first by default, or user-selected)
        return sortDir === 'desc' ? [...withBalance].reverse() : withBalance;
    }, [rawTransactions, dateFrom, dateTo, filterType, sortDir, openingBalance, openingBalanceType]);

    // ─── Summary stats ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const financialOnly = processedTransactions.filter(t => !t.isNonFinancial);
        const totalDebit = financialOnly.reduce((s, t) => s + (t.debit || 0), 0);
        const totalCredit = financialOnly.reduce((s, t) => s + (t.credit || 0), 0);
        const closingBal = processedTransactions.length > 0
            ? processedTransactions[sortDir === 'desc' ? 0 : processedTransactions.length - 1]?.balance ?? 0
            : (openingBalanceType === 'cr' ? -openingBalance : openingBalance);
        return { totalDebit, totalCredit, closingBal, count: processedTransactions.length };
    }, [processedTransactions, sortDir, openingBalance, openingBalanceType]);

    // ─── Grouping ────────────────────────────────────────────────────────────
    const groupedRows = useMemo(() => {
        if (groupBy === 'none') return [{ key: 'all', label: null, rows: processedTransactions }];

        const groups = {};
        processedTransactions.forEach(txn => {
            let groupKey = '';
            if (groupBy === 'month') {
                const d = new Date(txn.date);
                groupKey = isNaN(d) ? 'Unknown' : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            } else if (groupBy === 'type') {
                groupKey = getTypeMeta(txn.type).label;
            }
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(txn);
        });

        return Object.entries(groups).map(([key, rows]) => ({ key, label: key, rows }));
    }, [processedTransactions, groupBy]);

    // ─── Edit handler ────────────────────────────────────────────────────────
    const handleEdit = async (txn) => {
        if (txn.isNonFinancial && txn.rawData) {
            setEditingTransaction(txn.rawData);
            setActiveForm(txn.type);
            return;
        }
        if (txn.rawData) {
            setEditingTransaction(txn.rawData);
            setActiveForm(txn.type);
            return;
        }
        if (!txn.originalId) {
            alert('This manual journal entry cannot be edited via forms.');
            return;
        }
        try {
            const { supabase } = await import('@/lib/supabase');
            const tableMap = {
                sales_invoice: 'sales_invoices',
                purchase_invoice: 'purchase_invoices',
                receipt: 'receipt_vouchers',
                payment: 'payment_vouchers',
            };
            const tableName = tableMap[txn.type];
            if (!tableName) return;
            const { data, error } = await supabase.from(tableName).select('*').eq('id', txn.originalId).single();
            if (error) throw error;
            if (data) { setEditingTransaction(data); setActiveForm(txn.type); }
        } catch (e) {
            alert('Failed to load transaction: ' + e.message);
        }
    };

    const closeForm = () => {
        setActiveForm(null);
        setEditingTransaction(null);
        fetchAll();
    };

    // ─── Styles ──────────────────────────────────────────────────────────────
    const S = {
        container: { display: 'flex', flexDirection: 'column', gap: '12px' },
        toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
        filterRow: {
            display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end',
            padding: '12px', backgroundColor: 'var(--bg-elevated)',
            borderRadius: '8px', border: '1px solid var(--border-primary)',
        },
        filterGroup: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 140px' },
        filterLabel: { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 },
        filterInput: {
            padding: '6px 8px', fontSize: '12px',
            border: '1px solid var(--border-primary)', borderRadius: '6px',
            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
            minWidth: 0,
        },
        summaryGrid: {
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px',
        },
        summaryCard: {
            padding: '12px 14px', borderRadius: '8px',
            border: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-elevated)',
        },
        summaryLabel: { fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' },
        summaryValue: { fontSize: '18px', fontWeight: 700 },
        tableWrap: { overflowX: 'auto' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
        th: {
            padding: '8px 10px', textAlign: 'left', fontWeight: 600,
            backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)',
            whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)',
        },
        thRight: {
            padding: '8px 10px', textAlign: 'right', fontWeight: 600,
            backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)',
            whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)',
        },
        td: { padding: '7px 10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'middle' },
        tdRight: { padding: '7px 10px', borderBottom: '1px solid var(--border-primary)', textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace' },
        groupHeader: {
            padding: '6px 10px', backgroundColor: 'var(--bg-secondary)',
            fontWeight: 600, fontSize: '12px', color: 'var(--text-tertiary)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            borderBottom: '1px solid var(--border-primary)',
        },
        btn: {
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
            border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
        },
        btnPrimary: {
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
            border: 'none', backgroundColor: 'var(--color-primary)',
            color: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
        },
        openingRow: {
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderBottom: '2px solid rgba(99,102,241,0.2)',
        },
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div style={S.container}>

            {/* ── Toolbar ── */}
            <div style={S.toolbar}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Receipt size={16} /> Transaction Ledger
                </h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button style={S.btn} onClick={() => setShowFilters(f => !f)}>
                        <Filter size={13} /> Filters {showFilters ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
                    <button style={S.btn} onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                        {sortDir === 'desc' ? <SortDesc size={13}/> : <SortAsc size={13}/>}
                        {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
                    </button>
                    <button style={S.btn} onClick={fetchAll} disabled={loading}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
                    </button>
                    <button style={S.btnPrimary} onClick={() => exportToCSV(
                        sortDir === 'asc' ? processedTransactions : [...processedTransactions].reverse(),
                        accountName
                    )}>
                        <Download size={13}/> Export CSV
                    </button>
                </div>
            </div>

            {/* ── Expandable Filter Panel ── */}
            {showFilters && (
                <div style={S.filterRow}>
                    <div style={S.filterGroup}>
                        <span style={S.filterLabel}>From Date</span>
                        <input type="date" style={S.filterInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div style={S.filterGroup}>
                        <span style={S.filterLabel}>To Date</span>
                        <input type="date" style={S.filterInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div style={S.filterGroup}>
                        <span style={S.filterLabel}>Type</span>
                        <select style={S.filterInput} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="sales_invoice">Sales Invoice</option>
                            <option value="purchase_invoice">Purchase Invoice</option>
                            <option value="receipt">Receipt</option>
                            <option value="payment">Payment</option>
                            <option value="quotation">Quotation</option>
                            <option value="amc">AMC Contract</option>
                            <option value="rental">Rental Contract</option>
                            <option value="journal">Journal Entry</option>
                        </select>
                    </div>
                    <div style={S.filterGroup}>
                        <span style={S.filterLabel}>Group By</span>
                        <select style={S.filterInput} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                            <option value="none">No Grouping</option>
                            <option value="month">Month</option>
                            <option value="type">Type</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={S.filterLabel}>&nbsp;</span>
                        <button style={S.btn} onClick={() => {
                            const fy = currentFYDates();
                            setDateFrom(fy.from); setDateTo(fy.to);
                            setFilterType('all'); setGroupBy('none');
                        }}>
                            <Calendar size={12}/> This FY
                        </button>
                    </div>
                </div>
            )}

            {/* ── Summary Cards ── */}
            <div style={S.summaryGrid}>
                <div style={S.summaryCard}>
                    <div style={S.summaryLabel}>Opening Balance</div>
                    <div style={{ ...S.summaryValue, fontSize: '16px', color: 'var(--text-secondary)' }}>
                        ₹{fmt(openingBalance)}
                        <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '4px', color: 'var(--text-tertiary)' }}>
                            {openingBalanceType?.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div style={S.summaryCard}>
                    <div style={S.summaryLabel}>Total Debit</div>
                    <div style={{ ...S.summaryValue, color: '#ef4444' }}>₹{fmt(stats.totalDebit)}</div>
                </div>
                <div style={S.summaryCard}>
                    <div style={S.summaryLabel}>Total Credit</div>
                    <div style={{ ...S.summaryValue, color: '#10b981' }}>₹{fmt(stats.totalCredit)}</div>
                </div>
                <div style={S.summaryCard}>
                    <div style={S.summaryLabel}>Closing Balance</div>
                    <div style={{ ...S.summaryValue, color: stats.closingBal >= 0 ? '#10b981' : '#ef4444' }}>
                        ₹{fmt(Math.abs(stats.closingBal))}
                        <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '4px' }}>
                            {stats.closingBal >= 0 ? 'Dr' : 'Cr'}
                        </span>
                    </div>
                </div>
                <div style={S.summaryCard}>
                    <div style={S.summaryLabel}>Transactions</div>
                    <div style={S.summaryValue}>{stats.count}</div>
                </div>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: '10px', color: 'var(--text-tertiary)' }}>
                    <Loader2 size={20} className="animate-spin" /> Loading transactions…
                </div>
            ) : error ? (
                <div style={{ padding: '16px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '13px' }}>
                    ⚠ {error}
                </div>
            ) : processedTransactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)', borderRadius: '8px' }}>
                    <Receipt size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontWeight: 500, marginBottom: '4px' }}>No Transactions Found</p>
                    <p style={{ fontSize: '12px' }}>
                        {filterType !== 'all' || dateFrom || dateTo
                            ? 'Try adjusting your date range or type filter'
                            : 'All transactions for this account will appear here'}
                    </p>
                </div>
            ) : (
                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>Date</th>
                                <th style={S.th}>Type</th>
                                <th style={S.th}>Reference</th>
                                <th style={S.th}>Description</th>
                                <th style={S.thRight}>Debit</th>
                                <th style={S.thRight}>Credit</th>
                                <th style={S.thRight}>Balance</th>
                                <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                                <th style={{ ...S.th, textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening Balance Row */}
                            {sortDir === 'asc' && openingBalance > 0 && (
                                <tr style={S.openingRow}>
                                    <td style={S.td} colSpan={4}>
                                        <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-primary)' }}>
                                            Opening Balance
                                        </span>
                                    </td>
                                    <td style={S.tdRight}>{openingBalanceType === 'dr' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>₹{fmt(openingBalance)}</span> : '—'}</td>
                                    <td style={S.tdRight}>{openingBalanceType === 'cr' ? <span style={{ color: '#10b981', fontWeight: 600 }}>₹{fmt(openingBalance)}</span> : '—'}</td>
                                    <td style={S.tdRight}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            ₹{fmt(openingBalance)} {openingBalanceType?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={S.td} colSpan={2}></td>
                                </tr>
                            )}

                            {groupedRows.map(group => (
                                <>
                                    {group.label && (
                                        <tr key={`g-${group.key}`}>
                                            <td colSpan={9} style={S.groupHeader}>
                                                {group.label}
                                                <span style={{ fontWeight: 400, marginLeft: '6px', color: 'var(--text-tertiary)' }}>
                                                    ({group.rows.length} entries)
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                    {group.rows.map((txn, idx) => {
                                        const meta = getTypeMeta(txn.type);
                                        const isQuote = txn.isNonFinancial;
                                        const rowStyle = {
                                            opacity: isQuote ? 0.6 : 1,
                                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                        };
                                        return (
                                            <tr key={`${txn.id}-${idx}`} style={rowStyle}>
                                                <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: '12px' }}>
                                                    {fmtDate(txn.date)}
                                                </td>
                                                <td style={S.td}>
                                                    <span style={{
                                                        padding: '2px 7px', borderRadius: '4px',
                                                        fontSize: '11px', fontWeight: 600,
                                                        backgroundColor: meta.bg, color: meta.color,
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {txn.reference}
                                                </td>
                                                <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {txn.description}
                                                    {isQuote && (
                                                        <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                                            (non-financial)
                                                        </span>
                                                    )}
                                                    {txn.type === 'purchase_invoice' && txn.rawData?.paid_by === 'technician' && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            marginLeft: '6px',
                                                            padding: '2px 4px',
                                                            backgroundColor: '#f59e0b20',
                                                            color: '#f59e0b',
                                                            borderRadius: '4px',
                                                            fontWeight: 600
                                                        }}>
                                                            Paid by Tech
                                                        </span>
                                                    )}
                                                    {txn.rawData?.jobs?.job_number && (
                                                        <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '2px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            💼 Job: #{txn.rawData.jobs.job_number}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={S.tdRight}>
                                                    {txn.debit > 0 ? (
                                                        <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                                            ₹{fmt(txn.debit)}
                                                        </span>
                                                    ) : isQuote ? (
                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>₹{fmt(txn.amount)}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={S.tdRight}>
                                                    {txn.credit > 0 ? (
                                                        <span style={{ color: '#10b981', fontWeight: 500 }}>
                                                            ₹{fmt(txn.credit)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={S.tdRight}>
                                                    {!isQuote && txn.balance != null ? (
                                                        <span style={{
                                                            fontWeight: 600,
                                                            color: txn.balance >= 0 ? '#10b981' : '#ef4444',
                                                        }}>
                                                            ₹{fmt(Math.abs(txn.balance))} {txn.balance >= 0 ? 'Dr' : 'Cr'}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'center' }}>
                                                    <StatusBadge status={txn.status} />
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'center' }}>
                                                    {txn.canEdit && (
                                                        <button
                                                            onClick={() => handleEdit(txn)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>
                            ))}

                            {/* Closing Balance Row */}
                            {sortDir === 'desc' && openingBalance > 0 && (
                                <tr style={S.openingRow}>
                                    <td style={S.td} colSpan={4}>
                                        <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-primary)' }}>
                                            Opening Balance
                                        </span>
                                    </td>
                                    <td style={S.tdRight}>{openingBalanceType === 'dr' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>₹{fmt(openingBalance)}</span> : '—'}</td>
                                    <td style={S.tdRight}>{openingBalanceType === 'cr' ? <span style={{ color: '#10b981', fontWeight: 600 }}>₹{fmt(openingBalance)}</span> : '—'}</td>
                                    <td style={S.tdRight}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            ₹{fmt(openingBalance)} {openingBalanceType?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={S.td} colSpan={2}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Edit Forms (inline modals) ── */}
            {activeForm === 'sales_invoice' && editingTransaction && (
                <SalesInvoiceForm onClose={closeForm} existingInvoice={editingTransaction} onSave={closeForm} />
            )}
            {activeForm === 'purchase_invoice' && editingTransaction && (
                <PurchaseInvoiceForm onClose={closeForm} existingInvoice={editingTransaction} onSave={closeForm} />
            )}
            {activeForm === 'receipt' && editingTransaction && (
                <ReceiptVoucherForm onClose={closeForm} existingReceipt={editingTransaction} onSave={closeForm} />
            )}
            {activeForm === 'payment' && editingTransaction && (
                <PaymentVoucherForm onClose={closeForm} existingPayment={editingTransaction} onSave={closeForm} />
            )}
            {activeForm === 'quotation' && editingTransaction && (
                <QuotationForm onClose={closeForm} existingQuotation={editingTransaction} onSave={closeForm} />
            )}
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        draft:     { label: 'Draft',      color: '#94a3b8', bg: '#94a3b815' },
        finalized: { label: 'Finalized',  color: '#10b981', bg: '#10b98115' },
        paid:      { label: 'Paid',       color: '#10b981', bg: '#10b98115' },
        partial:   { label: 'Partial',    color: '#f59e0b', bg: '#f59e0b15' },
        cancelled: { label: 'Cancelled',  color: '#ef4444', bg: '#ef444415' },
        overdue:   { label: 'Overdue',    color: '#ef4444', bg: '#ef444415' },
        sent:      { label: 'Sent',       color: '#3b82f6', bg: '#3b82f615' },
        accepted:  { label: 'Accepted',   color: '#10b981', bg: '#10b98115' },
    };
    const m = map[status] || { label: status || '—', color: '#64748b', bg: '#64748b15' };
    return (
        <span style={{
            padding: '2px 6px', borderRadius: '4px',
            fontSize: '10px', fontWeight: 600,
            backgroundColor: m.bg, color: m.color,
        }}>
            {m.label}
        </span>
    );
}

export default TransactionsTab;
