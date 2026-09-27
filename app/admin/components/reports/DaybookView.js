'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
    Calendar, Download, Printer, Filter, RefreshCcw, FileText, 
    ChevronDown, Check, ArrowUp, ArrowDown, ChevronUp, 
    SlidersHorizontal, RotateCcw, X 
} from 'lucide-react';
import { transactionsAPI, printSettingsAPI } from '@/lib/adminAPI';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

// ── Column Configuration Defaults ───────────────────────────────────────────
const DEFAULT_COLUMN_ORDER = [
    'date',
    'type',
    'voucherNo',
    'account',
    'narration',
    'debit',
    'credit',
    'balance'
];

const DEFAULT_COLUMN_WIDTHS = {
    date: 110,
    type: 95,
    voucherNo: 140,
    account: 190,
    narration: 240,
    debit: 110,
    credit: 110,
    balance: 130
};

const DEFAULT_VISIBLE_COLUMNS = {
    date: true,
    type: true,
    voucherNo: true,
    account: true,
    narration: true,
    debit: true,
    credit: true,
    balance: true
};

const COLUMN_LABELS = {
    date: 'Date',
    type: 'Type',
    voucherNo: 'Voucher No',
    account: 'Account',
    narration: 'Narration',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance'
};

const DATE_PRESETS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'currentMonth', label: 'Current Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'thisFY', label: 'This FY' },
    { id: 'custom', label: 'Custom Range' },
];

function getDateRangeForPreset(preset) {
    const now = new Date();
    const toDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const todayStr = toDateStr(now);

    switch (preset) {
        case 'today':
            return { startDate: todayStr, endDate: todayStr };
        case 'yesterday': {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yStr = toDateStr(y);
            return { startDate: yStr, endDate: yStr };
        }
        case 'thisWeek': {
            const d = new Date(now);
            const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday
            const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            return { startDate: toDateStr(monday), endDate: todayStr };
        }
        case 'currentMonth': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { startDate: toDateStr(start), endDate: toDateStr(end) };
        }
        case 'lastMonth': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { startDate: toDateStr(start), endDate: toDateStr(end) };
        }
        case 'thisFY': {
            const currYear = now.getFullYear();
            const currMonth = now.getMonth();
            const fyStartYear = currMonth >= 3 ? currYear : currYear - 1;
            const start = new Date(fyStartYear, 3, 1);
            const end = new Date(fyStartYear + 1, 2, 31);
            return { startDate: toDateStr(start), endDate: toDateStr(end) };
        }
        default:
            return null;
    }
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y.slice(-2)}`;
    } catch {
        return dateStr;
    }
}

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

    let debit = 0;
    let credit = 0;
    if (type === 'sales')         debit  = parseFloat(raw.total_amount) || 0;
    else if (type === 'purchase') credit = parseFloat(raw.total_amount) || 0;
    else if (type === 'receipt')  credit = parseFloat(raw.amount) || 0;
    else if (type === 'payment')  debit  = parseFloat(raw.amount) || 0;

    return { ...raw, voucherNo, account, narration, debit, credit };
}

// ── Fetch the opening balance for the selected period ───────────────────────
async function fetchOpeningBalance(startDate) {
    try {
        const [acctRes, rvRes, pvRes] = await Promise.all([
            fetch('/api/admin/accounts?type=payment_method').then(r => r.json()),
            fetch(`/api/admin/transactions?type=receipt&end_date=${getPrevDate(startDate)}&include_archived=1`).then(r => r.json()),
            fetch(`/api/admin/transactions?type=payment&end_date=${getPrevDate(startDate)}&include_archived=1`).then(r => r.json()),
        ]);

        const cashBankAccounts = acctRes?.data || [];
        const configuredOB = cashBankAccounts.reduce((sum, a) => {
            const ob = parseFloat(a.opening_balance) || 0;
            return sum + (a.balance_type === 'cr' ? -ob : ob);
        }, 0);

        const receiptsBefore = (rvRes?.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const paymentsBefore = (pvRes?.data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        return configuredOB + receiptsBefore - paymentsBefore;
    } catch (e) {
        console.error('Failed to compute opening balance:', e);
        return 0;
    }
}

function getPrevDate(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

export default function DaybookView() {
    const [transactions, setTransactions] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Date Preset and Selection States ────────────────────────────────────
    const [datePreset, setDatePreset] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('daybook_date_preset') || 'today';
        }
        return 'today';
    });

    const initialRange = useMemo(() => {
        return getDateRangeForPreset(datePreset) || {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        };
    }, []);

    const [startDate, setStartDate] = useState(initialRange.startDate);
    const [endDate, setEndDate] = useState(initialRange.endDate);
    const [customStart, setCustomStart] = useState(initialRange.startDate);
    const [customEnd, setCustomEnd] = useState(initialRange.endDate);

    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const dateDropdownRef = useRef(null);

    // ── Voucher Type Filter (Multi-checkbox) ────────────────────────────────
    const ALL_TYPES = ['sales', 'purchase', 'receipt', 'payment'];
    const [selectedTypes, setSelectedTypes] = useState(new Set(ALL_TYPES));
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // ── Column Sorting State ────────────────────────────────────────────────
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('asc');

    // ── Column Widths, Order & Visibility with Persistence ──────────────────
    const [columnWidths, setColumnWidths] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('daybook_column_widths');
                if (saved) return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load daybook column widths', e);
            }
        }
        return DEFAULT_COLUMN_WIDTHS;
    });

    const [columnOrder, setColumnOrder] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('daybook_column_order');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const valid = parsed.filter(c => DEFAULT_COLUMN_ORDER.includes(c));
                        const missing = DEFAULT_COLUMN_ORDER.filter(c => !valid.includes(c));
                        return [...valid, ...missing];
                    }
                }
            } catch (e) {
                console.error('Failed to load daybook column order', e);
            }
        }
        return DEFAULT_COLUMN_ORDER;
    });

    const [visibleColumns, setVisibleColumns] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('daybook_visible_columns');
                if (saved) return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load daybook visible columns', e);
            }
        }
        return DEFAULT_VISIBLE_COLUMNS;
    });

    const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
    const columnsDropdownRef = useRef(null);

    // ── Other States ────────────────────────────────────────────────────────
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [printSettings, setPrintSettings] = useState(null);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const exportRef = useRef(null);

    // ── Resizing Ref ────────────────────────────────────────────────────────
    const resizingRef = useRef(null);

    // ── Save column settings to localStorage ────────────────────────────────
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('daybook_column_widths', JSON.stringify(columnWidths));
            } catch (e) { console.error(e); }
        }
    }, [columnWidths]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('daybook_column_order', JSON.stringify(columnOrder));
            } catch (e) { console.error(e); }
        }
    }, [columnOrder]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('daybook_visible_columns', JSON.stringify(visibleColumns));
            } catch (e) { console.error(e); }
        }
    }, [visibleColumns]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('daybook_date_preset', datePreset);
            } catch (e) { console.error(e); }
        }
    }, [datePreset]);

    // ── Close dropdowns on outside click ────────────────────────────────────
    useEffect(() => {
        const handleClick = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportDropdownOpen(false);
            }
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
                setDateDropdownOpen(false);
            }
            if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target)) {
                setColumnsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Type Filter Helpers ─────────────────────────────────────────────────
    const toggleType = (type) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) { next.delete(type); } else { next.add(type); }
            return next;
        });
    };
    const isAllSelected = selectedTypes.size === ALL_TYPES.length;
    const isNoneSelected = selectedTypes.size === 0;

    // ── Date Preset Handler ─────────────────────────────────────────────────
    const handleSelectPreset = (presetId) => {
        setDatePreset(presetId);
        if (presetId === 'custom') {
            return;
        }
        const range = getDateRangeForPreset(presetId);
        if (range) {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
            setCustomStart(range.startDate);
            setCustomEnd(range.endDate);
            setDateDropdownOpen(false);
        }
    };

    const handleApplyCustomDate = () => {
        if (customStart && customEnd) {
            setStartDate(customStart);
            setEndDate(customEnd);
            setDatePreset('custom');
            setDateDropdownOpen(false);
        }
    };

    // ── Data Fetching ───────────────────────────────────────────────────────
    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [data, ob, settingsRes] = await Promise.all([
                transactionsAPI.getAll({ type: 'all', start_date: startDate, end_date: endDate }),
                fetchOpeningBalance(startDate),
                printSettingsAPI.get().catch(() => null),
            ]);

            setTransactions((data || []).map(normalizeTransaction));
            setOpeningBalance(ob);
            setPrintSettings(settingsRes || {});
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // ── Column Sorting Handler ──────────────────────────────────────────────
    const handleSort = (columnKey) => {
        if (sortBy === columnKey) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(columnKey);
            const defaultDesc = ['debit', 'credit', 'balance'].includes(columnKey);
            setSortOrder(defaultDesc ? 'desc' : 'asc');
        }
    };

    // ── Column Width Resizing Handlers (Mouse & Touch) ──────────────────────
    const handleResizeStart = (e, col) => {
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const startWidth = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;

        resizingRef.current = { col, startX: clientX, startWidth };

        const handlePointerMove = (moveEvent) => {
            if (!resizingRef.current) return;
            const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : 0);
            const deltaX = currentX - resizingRef.current.startX;
            const newWidth = Math.max(60, resizingRef.current.startWidth + deltaX);
            setColumnWidths(prev => ({
                ...prev,
                [resizingRef.current.col]: newWidth
            }));
        };

        const handlePointerUp = () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
            resizingRef.current = null;
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);
    };

    // ── Column Reordering & Visibility Helpers ──────────────────────────────
    const toggleColumnVisibility = (col) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [col]: !prev[col] };
            const visibleCount = Object.values(next).filter(Boolean).length;
            if (visibleCount === 0) return prev;
            return next;
        });
    };

    const moveColumn = (index, direction) => {
        setColumnOrder(prev => {
            const newOrder = [...prev];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= newOrder.length) return prev;
            const [moved] = newOrder.splice(index, 1);
            newOrder.splice(targetIndex, 0, moved);
            return newOrder;
        });
    };

    const resetColumnsToDefault = () => {
        setColumnWidths(DEFAULT_COLUMN_WIDTHS);
        setColumnOrder(DEFAULT_COLUMN_ORDER);
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('daybook_column_widths');
                localStorage.removeItem('daybook_column_order');
                localStorage.removeItem('daybook_visible_columns');
            } catch (e) {}
        }
    };

    // ── Calculate Running Balance & Sort Rows ───────────────────────────────
    const { processedTransactions, totals, closingBalance } = useMemo(() => {
        let filtered = transactions.filter(txn => {
            const txnDate = new Date(txn.date).toISOString().split('T')[0];
            const matchesDate = txnDate >= startDate && txnDate <= endDate;
            const matchesType = selectedTypes.size === 0 || selectedTypes.has(txn.type);
            return matchesDate && matchesType;
        });

        // 1. Sort chronologically first to compute accurate running balance
        filtered.sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
        });

        let balance = openingBalance;
        let totDebit = 0;
        let totCredit = 0;

        const withBalance = filtered.map(txn => {
            totDebit += txn.debit;
            totCredit += txn.credit;
            balance += (txn.debit - txn.credit);
            return { ...txn, balance };
        });

        // 2. Sort by user's chosen column
        const sorted = [...withBalance].sort((a, b) => {
            let diff = 0;
            if (sortBy === 'date') {
                diff = new Date(a.date) - new Date(b.date);
                if (diff === 0) diff = new Date(a.created_at || 0) - new Date(b.created_at || 0);
            } else if (sortBy === 'type') {
                diff = (a.type || '').localeCompare(b.type || '');
            } else if (sortBy === 'voucherNo') {
                diff = (a.voucherNo || '').localeCompare(b.voucherNo || '', undefined, { numeric: true });
            } else if (sortBy === 'account') {
                diff = (a.account || '').localeCompare(b.account || '');
            } else if (sortBy === 'narration') {
                diff = (a.narration || '').localeCompare(b.narration || '');
            } else if (sortBy === 'debit') {
                diff = (a.debit || 0) - (b.debit || 0);
            } else if (sortBy === 'credit') {
                diff = (a.credit || 0) - (b.credit || 0);
            } else if (sortBy === 'balance') {
                diff = (a.balance || 0) - (b.balance || 0);
            }
            return sortOrder === 'asc' ? diff : -diff;
        });

        const closeBal = openingBalance + totDebit - totCredit;

        return {
            processedTransactions: sorted,
            totals: { debit: totDebit, credit: totCredit },
            closingBalance: closeBal
        };
    }, [transactions, startDate, endDate, selectedTypes, openingBalance, sortBy, sortOrder]);

    // ── Visible Columns in Order ────────────────────────────────────────────
    const activeCols = useMemo(() => {
        return columnOrder.filter(col => visibleColumns[col]);
    }, [columnOrder, visibleColumns]);

    const totalTableWidth = useMemo(() => {
        return activeCols.reduce((sum, col) => sum + (columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100), 0);
    }, [activeCols, columnWidths]);

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

    // ── Export CSV Function ─────────────────────────────────────────────────
    const handleExportCSV = async () => {
        const headers = activeCols.map(c => COLUMN_LABELS[c] || c);

        const obRow = activeCols.map(c => {
            if (c === 'date') return new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB');
            if (c === activeCols[1] || (c === activeCols[0] && activeCols.length === 1)) return 'Opening Balance';
            if (c === 'balance') return `${openingBalance.toFixed(2)} ${openingBalance >= 0 ? 'Dr' : 'Cr'}`;
            return '';
        });

        const rows = processedTransactions.map(txn => {
            return activeCols.map(c => {
                switch (c) {
                    case 'date': return new Date(txn.date).toLocaleDateString('en-GB');
                    case 'type': return txn.type;
                    case 'voucherNo': return txn.voucherNo;
                    case 'account': return (txn.account || '').replace(/,/g, ' ');
                    case 'narration': return (txn.narration || '').replace(/,/g, ' ');
                    case 'debit': return txn.debit > 0 ? txn.debit.toFixed(2) : '0.00';
                    case 'credit': return txn.credit > 0 ? txn.credit.toFixed(2) : '0.00';
                    case 'balance': return `${Math.abs(txn.balance).toFixed(2)} ${txn.balance >= 0 ? 'Dr' : 'Cr'}`;
                    default: return '';
                }
            });
        });

        const cbRow = activeCols.map(c => {
            if (c === 'date') return new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB');
            if (c === activeCols[1] || (c === activeCols[0] && activeCols.length === 1)) return 'Closing Balance';
            if (c === 'debit') return totals.debit.toFixed(2);
            if (c === 'credit') return totals.credit.toFixed(2);
            if (c === 'balance') return `${Math.abs(closingBalance).toFixed(2)} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`;
            return '';
        });

        const csv = [headers, obRow, ...rows, cbRow].map(r => r.join(',')).join('\n');
        const filename = `Daybook_${startDate}_to_${endDate}.csv`;
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

    const activeDateLabel = useMemo(() => {
        const found = DATE_PRESETS.find(p => p.id === datePreset);
        if (found && datePreset !== 'custom') return found.label;
        return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
    }, [datePreset, startDate, endDate]);

    return (
        <div className="daybook-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {/* ── Top Action Controls (Mobile First) ── */}
            <div className="daybook-header-bar" style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
                zIndex: 20
            }}>
                {/* 1. Date Selector Dropdown */}
                <div ref={dateDropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setDateDropdownOpen(v => !v)}
                        className="form-input daybook-btn"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: '13px', padding: '6px 12px',
                            cursor: 'pointer', userSelect: 'none',
                            fontWeight: 500, minHeight: '36px'
                        }}
                        title="Select Date Range"
                    >
                        <Calendar size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{activeDateLabel}</span>
                        <ChevronDown size={13} style={{ opacity: 0.6, transform: dateDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>

                    {dateDropdownOpen && (
                        <div className="daybook-dropdown" style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,0.4)',
                            zIndex: 999, minWidth: 260, maxWidth: '90vw', overflow: 'hidden'
                        }}>
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Date Range Presets
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '10px' }}>
                                {DATE_PRESETS.map(preset => {
                                    const isActive = datePreset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handleSelectPreset(preset.id)}
                                            style={{
                                                padding: '7px 10px',
                                                borderRadius: 6,
                                                border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                backgroundColor: isActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                                                color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
                                                fontSize: '12px',
                                                fontWeight: isActive ? 600 : 500,
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Date Inputs Section */}
                            <div style={{ borderTop: '1px solid var(--border-primary)', padding: '10px', backgroundColor: 'var(--bg-secondary)' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Custom Period (From - To)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', width: '35px' }}>From:</span>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="form-input"
                                            style={{ fontSize: '12px', padding: '4px 8px', flex: 1 }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', width: '35px' }}>To:</span>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="form-input"
                                            style={{ fontSize: '12px', padding: '4px 8px', flex: 1 }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyCustomDate}
                                        className="btn btn-primary"
                                        style={{ marginTop: '4px', padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                                    >
                                        Apply Custom Dates
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Voucher Type Filter */}
                <div ref={filterRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className="form-input daybook-btn"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: '13px', padding: '6px 12px',
                            cursor: 'pointer', userSelect: 'none',
                            border: !isAllSelected ? '1px solid var(--color-primary)' : undefined,
                            backgroundColor: !isAllSelected ? 'rgba(99,102,241,0.08)' : undefined,
                            fontWeight: 500, minHeight: '36px'
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
                        <ChevronDown size={13} style={{ opacity: 0.6, transform: filterOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>

                    {filterOpen && (
                        <div className="daybook-dropdown" style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                            zIndex: 999, minWidth: 200, overflow: 'hidden',
                        }}>
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

                {/* 3. Columns Customizer Dropdown */}
                <div ref={columnsDropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setColumnsDropdownOpen(v => !v)}
                        className="form-input daybook-btn"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: '13px', padding: '6px 12px',
                            cursor: 'pointer', userSelect: 'none',
                            fontWeight: 500, minHeight: '36px'
                        }}
                        title="Customize & Rearrange Columns"
                    >
                        <SlidersHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <span>Columns</span>
                        <span style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 999, fontSize: 10, fontWeight: 700,
                            padding: '1px 6px', color: 'var(--text-secondary)'
                        }}>
                            {activeCols.length}/{columnOrder.length}
                        </span>
                        <ChevronDown size={13} style={{ opacity: 0.6, transform: columnsDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>

                    {columnsDropdownOpen && (
                        <div className="daybook-dropdown" style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                            zIndex: 999, minWidth: 260, maxWidth: '90vw', overflow: 'hidden'
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Column Visibility & Order
                                </span>
                                <button
                                    onClick={resetColumnsToDefault}
                                    style={{
                                        fontSize: 11, color: 'var(--color-primary)', background: 'none',
                                        border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex',
                                        alignItems: 'center', gap: 3, padding: 0
                                    }}
                                    title="Reset to default columns"
                                >
                                    <RotateCcw size={11} /> Reset
                                </button>
                            </div>

                            <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px 0' }}>
                                {columnOrder.map((col, index) => {
                                    const isVisible = !!visibleColumns[col];
                                    const isFirst = index === 0;
                                    const isLast = index === columnOrder.length - 1;

                                    return (
                                        <div
                                            key={col}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '6px 12px', transition: 'background 0.12s',
                                                borderBottom: '1px solid rgba(255,255,255,0.03)'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`col-vis-${col}`}
                                                checked={isVisible}
                                                onChange={() => toggleColumnVisibility(col)}
                                                style={{ cursor: 'pointer', width: 15, height: 15 }}
                                            />
                                            <label
                                                htmlFor={`col-vis-${col}`}
                                                style={{
                                                    flex: 1, fontSize: '13px', fontWeight: isVisible ? 600 : 400,
                                                    color: isVisible ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                                    cursor: 'pointer', userSelect: 'none'
                                                }}
                                            >
                                                {COLUMN_LABELS[col] || col}
                                            </label>

                                            {/* Reorder Arrows (Mobile & Touch Friendly) */}
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                <button
                                                    onClick={() => moveColumn(index, -1)}
                                                    disabled={isFirst}
                                                    style={{
                                                        border: 'none', background: 'var(--bg-secondary)',
                                                        borderRadius: 4, padding: '3px 5px',
                                                        cursor: isFirst ? 'not-allowed' : 'pointer',
                                                        opacity: isFirst ? 0.3 : 0.8,
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    title="Move Up"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    onClick={() => moveColumn(index, 1)}
                                                    disabled={isLast}
                                                    style={{
                                                        border: 'none', background: 'var(--bg-secondary)',
                                                        borderRadius: 4, padding: '3px 5px',
                                                        cursor: isLast ? 'not-allowed' : 'pointer',
                                                        opacity: isLast ? 0.3 : 0.8,
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    title="Move Down"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-primary)', textAlign: 'right', backgroundColor: 'var(--bg-secondary)' }}>
                                <button
                                    onClick={() => setColumnsDropdownOpen(false)}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 14px', fontSize: 12 }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-spacer" style={{ flex: 1, minWidth: '10px' }} />

                {/* 4. Action Buttons: Refresh, Export, Print */}
                <div className="daybook-actions-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        className={`btn ${loading ? 'btn-secondary' : 'btn-primary'} daybook-btn`}
                        style={{ padding: '6px 12px', fontSize: '13px', minHeight: '36px' }}
                        onClick={fetchTransactions}
                        disabled={loading}
                        title="Refresh transactions"
                    >
                        <RefreshCcw size={14} className={loading ? 'spin' : ''} />
                        <span className="btn-label">{loading ? '...' : 'Refresh'}</span>
                    </button>

                    <div ref={exportRef} style={{ position: 'relative' }}>
                        <button
                            className="btn btn-secondary daybook-btn"
                            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}
                            onClick={() => setExportDropdownOpen(v => !v)}
                            title="Export Daybook"
                        >
                            <Download size={14} />
                            <span className="btn-label">Export</span>
                            <ChevronDown size={12} style={{ opacity: 0.6, transform: exportDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>
                        {exportDropdownOpen && (
                            <div className="daybook-dropdown" style={{
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
                        className="btn btn-secondary daybook-btn"
                        style={{ padding: '6px 12px', fontSize: '13px', minHeight: '36px' }}
                        onClick={() => window.print()}
                        title="Print Daybook"
                    >
                        <Printer size={14} />
                        <span className="btn-label">Print</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Summary Strip (Mobile-first fast overview) ── */}
            <div className="daybook-kpi-bar" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Opening Balance</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(Math.abs(openingBalance))} <span style={{ fontSize: '10px', fontWeight: 500 }}>{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total In (Debits)</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-danger)' }}>
                        {formatCurrency(totals.debit)}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total Out (Credits)</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
                        {formatCurrency(totals.credit)}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Closing Balance</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: closingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(Math.abs(closingBalance))} <span style={{ fontSize: '10px', fontWeight: 500 }}>{closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total Records</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedTransactions.length} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400 }}>txns</span>
                    </span>
                </div>
            </div>

            {/* ── Main Full Daybook Ledger Body ── */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {loading && transactions.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                        <RefreshCcw size={40} className="spin" style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
                        <p style={{ fontSize: '14px' }}>Loading Daybook records...</p>
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={fetchTransactions} style={{ marginTop: 'var(--spacing-md)' }}>Retry</button>
                    </div>
                ) : (
                    <div className="daybook-table-container" style={{
                        flex: 1,
                        overflowX: 'auto',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        position: 'relative',
                        backgroundColor: 'var(--bg-elevated)'
                    }}>
                        <table className="daybook-table" style={{
                            width: totalTableWidth > 0 ? totalTableWidth : '100%',
                            minWidth: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            fontSize: '13px'
                        }}>
                            <thead>
                                <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    {activeCols.map(col => {
                                        const isSorted = sortBy === col;
                                        const width = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;
                                        const isRightAlign = ['debit', 'credit', 'balance'].includes(col);
                                        const isCenterAlign = col === 'type';

                                        return (
                                            <th
                                                key={col}
                                                onClick={() => handleSort(col)}
                                                style={{
                                                    position: 'sticky',
                                                    top: 0,
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    zIndex: 10,
                                                    padding: '9px 12px',
                                                    textAlign: isRightAlign ? 'right' : isCenterAlign ? 'center' : 'left',
                                                    fontWeight: 600,
                                                    fontSize: '12px',
                                                    borderBottom: '2px solid var(--border-primary)',
                                                    color: isSorted ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                    width: width,
                                                    minWidth: width,
                                                    maxWidth: width,
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    transition: 'color 0.15s, background-color 0.15s'
                                                }}
                                                title={`Click to sort by ${COLUMN_LABELS[col] || col}`}
                                            >
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    justifyContent: isRightAlign ? 'flex-end' : isCenterAlign ? 'center' : 'flex-start',
                                                    width: '100%'
                                                }}>
                                                    <span>{COLUMN_LABELS[col] || col}</span>
                                                    {isSorted ? (
                                                        sortOrder === 'asc' ? (
                                                            <ArrowUp size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                                        ) : (
                                                            <ArrowDown size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                                        )
                                                    ) : (
                                                        <span style={{ opacity: 0.2, fontSize: '10px' }}>↕</span>
                                                    )}
                                                </div>

                                                {/* Column Resizer Handle */}
                                                <div
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, col); }}
                                                    onTouchStart={(e) => { e.stopPropagation(); handleResizeStart(e, col); }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: '14px',
                                                        cursor: 'col-resize',
                                                        zIndex: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        userSelect: 'none'
                                                    }}
                                                    title="Drag to resize column"
                                                >
                                                    <div style={{ width: '2px', height: '65%', backgroundColor: 'var(--border-primary)', borderRadius: '1px' }} />
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {/* ── Opening Balance Row ── */}
                                <tr style={{ backgroundColor: 'rgba(99,102,241,0.07)', borderBottom: '1px solid var(--border-primary)' }}>
                                    {activeCols.map((col, idx) => {
                                        const width = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;
                                        if (col === 'date') {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', width, color: 'var(--text-tertiary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                    {new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                            );
                                        }

                                        const hasBalanceCol = activeCols.includes('balance');
                                        const isBalanceCol = col === 'balance';

                                        if (isBalanceCol) {
                                            return (
                                                <td key={col} style={{
                                                    padding: '8px 12px', width, textAlign: 'right', fontWeight: 700,
                                                    color: openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatCurrency(Math.abs(openingBalance))}
                                                    <span style={{ fontSize: 10, marginLeft: 3 }}>{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                                </td>
                                            );
                                        }

                                        const isFirstNonDate = (activeCols.includes('date') && idx === 1) || (!activeCols.includes('date') && idx === 0);
                                        if (isFirstNonDate) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-primary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                    Opening Balance
                                                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>
                                                        (Cash/Bank start)
                                                    </span>
                                                </td>
                                            );
                                        }

                                        return <td key={col} style={{ padding: '8px 12px', width }} />;
                                    })}
                                </tr>

                                {/* ── Transaction Rows ── */}
                                {processedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeCols.length} style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)' }}>
                                            <FileText size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                                            No transactions found for this period and filter selection
                                        </td>
                                    </tr>
                                ) : (
                                    processedTransactions.map(txn => (
                                        <tr
                                            key={txn.id}
                                            onClick={() => setSelectedTransaction(txn)}
                                            style={{
                                                borderBottom: '1px solid var(--border-primary)',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {activeCols.map(col => {
                                                const width = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;
                                                const cellStyle = {
                                                    padding: '8px 12px',
                                                    width: width,
                                                    minWidth: width,
                                                    maxWidth: width,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                };

                                                switch (col) {
                                                    case 'date':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, color: 'var(--text-primary)' }}>
                                                                {new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                        );
                                                    case 'type':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                                                                    fontSize: '11px', fontWeight: 600,
                                                                    backgroundColor: `${getTypeColor(txn.type)}20`,
                                                                    color: getTypeColor(txn.type), textTransform: 'capitalize'
                                                                }}>
                                                                    {getTypeLabel(txn.type)}
                                                                </span>
                                                            </td>
                                                        );
                                                    case 'voucherNo':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
                                                                {txn.voucherNo || '—'}
                                                            </td>
                                                        );
                                                    case 'account':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, fontWeight: 500, color: 'var(--text-primary)' }} title={txn.account}>
                                                                {txn.account || '—'}
                                                            </td>
                                                        );
                                                    case 'narration':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, color: 'var(--text-secondary)' }} title={txn.narration}>
                                                                {txn.narration || '—'}
                                                            </td>
                                                        );
                                                    case 'debit':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: txn.debit > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>
                                                                {txn.debit > 0 ? formatCurrency(txn.debit) : '—'}
                                                            </td>
                                                        );
                                                    case 'credit':
                                                        return (
                                                            <td key={col} style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: txn.credit > 0 ? 'var(--color-success)' : 'var(--text-tertiary)' }}>
                                                                {txn.credit > 0 ? formatCurrency(txn.credit) : '—'}
                                                            </td>
                                                        );
                                                    case 'balance':
                                                        return (
                                                            <td key={col} style={{
                                                                ...cellStyle, textAlign: 'right', fontWeight: 700,
                                                                color: txn.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                                            }}>
                                                                {formatCurrency(Math.abs(txn.balance))}
                                                                <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>{txn.balance >= 0 ? 'Dr' : 'Cr'}</span>
                                                            </td>
                                                        );
                                                    default:
                                                        return <td key={col} style={cellStyle}>—</td>;
                                                }
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                {/* ── Period Totals Row ── */}
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '2px solid var(--border-primary)', fontWeight: 700 }}>
                                    {activeCols.map((col, idx) => {
                                        const width = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;
                                        const isDebit = col === 'debit';
                                        const isCredit = col === 'credit';
                                        const isBalance = col === 'balance';

                                        if (isDebit) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-danger)', width, whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(totals.debit)}
                                                </td>
                                            );
                                        }
                                        if (isCredit) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-success)', width, whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(totals.credit)}
                                                </td>
                                            );
                                        }
                                        if (isBalance) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', width, whiteSpace: 'nowrap' }}>
                                                    Net: {formatCurrency(Math.abs(totals.debit - totals.credit))}
                                                    <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>
                                                        {totals.debit >= totals.credit ? 'Dr' : 'Cr'}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        const firstAmountIndex = activeCols.findIndex(c => ['debit', 'credit', 'balance'].includes(c));
                                        const isLabelCell = firstAmountIndex > 0 ? idx === firstAmountIndex - 1 : idx === 0;

                                        if (isLabelCell) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-tertiary)', width, whiteSpace: 'nowrap' }}>
                                                    Period Totals:
                                                </td>
                                            );
                                        }

                                        return <td key={col} style={{ padding: '8px 12px', width }} />;
                                    })}
                                </tr>

                                {/* ── Closing Balance Row ── */}
                                <tr style={{ backgroundColor: 'rgba(99,102,241,0.07)', borderTop: '1px solid var(--border-primary)', fontWeight: 700 }}>
                                    {activeCols.map((col, idx) => {
                                        const width = columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100;
                                        if (col === 'date') {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', width, color: 'var(--text-tertiary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                    {new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                            );
                                        }

                                        const isBalanceCol = col === 'balance';
                                        if (isBalanceCol) {
                                            return (
                                                <td key={col} style={{
                                                    padding: '8px 12px', width, textAlign: 'right', fontWeight: 700,
                                                    color: closingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatCurrency(Math.abs(closingBalance))}
                                                    <span style={{ fontSize: 10, marginLeft: 3, fontWeight: 400 }}>{closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                                </td>
                                            );
                                        }

                                        const isFirstNonDate = (activeCols.includes('date') && idx === 1) || (!activeCols.includes('date') && idx === 0);
                                        if (isFirstNonDate) {
                                            return (
                                                <td key={col} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-primary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                    Closing Balance
                                                </td>
                                            );
                                        }

                                        return <td key={col} style={{ padding: '8px 12px', width }} />;
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Transaction Detail Modal ── */}
            {selectedTransaction && (
                <div className="modal-overlay"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 'var(--spacing-md)', zIndex: 1000
                    }}
                    onClick={() => { setSelectedTransaction(null); setEditMode(false); }}
                >
                    <div className="modal-container"
                        style={{
                            maxWidth: '560px',
                            backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
                            width: '100%', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Transaction Details</h3>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                                    backgroundColor: `${getTypeColor(selectedTransaction.type)}20`, color: getTypeColor(selectedTransaction.type), textTransform: 'capitalize'
                                }}>
                                    {getTypeLabel(selectedTransaction.type)}
                                </span>
                            </div>
                            <button
                                onClick={() => { setSelectedTransaction(null); setEditMode(false); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '16px 18px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>Voucher No</label>
                                        <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>{selectedTransaction.voucherNo || '—'}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>Date</label>
                                        <div style={{ fontSize: '13px' }}>{new Date(selectedTransaction.date).toLocaleDateString('en-GB')}</div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>Account / Party</label>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTransaction.account || '—'}</div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>Narration</label>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6, minHeight: '40px' }}>
                                        {selectedTransaction.narration || 'No narration provided'}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '10px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>Debit</span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-danger)' }}>
                                            {selectedTransaction.debit > 0 ? formatCurrency(selectedTransaction.debit) : '—'}
                                        </span>
                                    </div>
                                    <div style={{ padding: '10px', borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>Credit</span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>
                                            {selectedTransaction.credit > 0 ? formatCurrency(selectedTransaction.credit) : '—'}
                                        </span>
                                    </div>
                                </div>

                                {selectedTransaction.reference && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>Reference</label>
                                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedTransaction.reference}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: '16px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { setSelectedTransaction(null); setEditMode(false); }}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Printable PDF Layout ── */}
            <div className="daybook-print-container" style={{ display: 'none' }}>
                <div style={{ padding: '15mm', fontFamily: 'Arial, sans-serif', color: '#000000', backgroundColor: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '12px', marginBottom: '15px' }}>
                        <div>
                            {printSettings?.logo_url && (
                                <img src={printSettings.logo_url} alt="Logo" style={{ height: '36px', marginBottom: '6px' }} />
                            )}
                            <h1 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
                                {printSettings?.company_name || 'Sorted Solutions'}
                            </h1>
                            <p style={{ margin: '2px 0', fontSize: '9px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                                {printSettings?.company_address}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Daybook Ledger
                            </h2>
                            <div style={{ marginTop: '6px', fontSize: '10px', color: '#334155' }}>
                                <b>Period:</b> {new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB')} to {new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>
                                Generated: {new Date().toLocaleString('en-GB')}
                            </div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                {activeCols.map(col => (
                                    <th key={col} style={{ padding: '6px 8px', textAlign: ['debit', 'credit', 'balance'].includes(col) ? 'right' : 'left', fontWeight: 700 }}>
                                        {COLUMN_LABELS[col] || col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ backgroundColor: '#f8fafc', fontStyle: 'italic', borderBottom: '1px solid #e2e8f0' }}>
                                {activeCols.map(col => {
                                    if (col === 'date') return <td key={col} style={{ padding: '6px 8px' }}>{new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB')}</td>;
                                    if (col === activeCols[1] || (col === activeCols[0] && activeCols.length === 1)) return <td key={col} style={{ padding: '6px 8px', fontWeight: 600 }}>Opening Balance</td>;
                                    if (col === 'balance') return <td key={col} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}</td>;
                                    return <td key={col} style={{ padding: '6px 8px' }} />;
                                })}
                            </tr>
                            {processedTransactions.map((txn, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    {activeCols.map(col => {
                                        switch (col) {
                                            case 'date': return <td key={col} style={{ padding: '6px 8px' }}>{new Date(txn.date + 'T00:00:00').toLocaleDateString('en-GB')}</td>;
                                            case 'type': return <td key={col} style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{txn.type}</td>;
                                            case 'voucherNo': return <td key={col} style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{txn.voucherNo}</td>;
                                            case 'account': return <td key={col} style={{ padding: '6px 8px' }}>{txn.account}</td>;
                                            case 'narration': return <td key={col} style={{ padding: '6px 8px' }}>{txn.narration}</td>;
                                            case 'debit': return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>{txn.debit > 0 ? formatCurrency(txn.debit) : '—'}</td>;
                                            case 'credit': return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>{txn.credit > 0 ? formatCurrency(txn.credit) : '—'}</td>;
                                            case 'balance': return <td key={col} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(Math.abs(txn.balance))} {txn.balance >= 0 ? 'Dr' : 'Cr'}</td>;
                                            default: return <td key={col} style={{ padding: '6px 8px' }}>—</td>;
                                        }
                                    })}
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                                {activeCols.map(col => {
                                    if (col === 'debit') return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(totals.debit)}</td>;
                                    if (col === 'credit') return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(totals.credit)}</td>;
                                    if (col === 'balance') return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>Net: {formatCurrency(Math.abs(totals.debit - totals.credit))} {totals.debit >= totals.credit ? 'Dr' : 'Cr'}</td>;
                                    const firstAmountIndex = activeCols.findIndex(c => ['debit', 'credit', 'balance'].includes(c));
                                    if (firstAmountIndex > 0 ? col === activeCols[firstAmountIndex - 1] : col === activeCols[0]) {
                                        return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>Period Totals:</td>;
                                    }
                                    return <td key={col} style={{ padding: '6px 8px' }} />;
                                })}
                            </tr>
                            <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontWeight: 700 }}>
                                {activeCols.map(col => {
                                    if (col === 'date') return <td key={col} style={{ padding: '6px 8px' }}>{new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB')}</td>;
                                    if (col === activeCols[1] || (col === activeCols[0] && activeCols.length === 1)) return <td key={col} style={{ padding: '6px 8px' }}>Closing Balance</td>;
                                    if (col === 'balance') return <td key={col} style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}</td>;
                                    return <td key={col} style={{ padding: '6px 8px' }} />;
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Mobile-First Responsive Styles ── */}
            <style jsx global>{`
                @media (max-width: 768px) {
                    .daybook-header-bar {
                        padding: 8px 10px !important;
                        gap: 6px !important;
                    }
                    .daybook-header-bar .flex-spacer {
                        display: none !important;
                    }
                    .daybook-actions-group {
                        width: 100% !important;
                        justifyContent: space-between !important;
                        margin-top: 4px !important;
                    }
                    .daybook-actions-group .btn {
                        flex: 1 !important;
                        justify-content: center !important;
                    }
                    .daybook-kpi-bar {
                        grid-template-columns: repeat(2, 1fr) !important;
                        padding: 8px 10px !important;
                    }
                    .daybook-btn {
                        font-size: 12px !important;
                        padding: 6px 10px !important;
                    }
                }

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
                        margin: 12mm !important;
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
