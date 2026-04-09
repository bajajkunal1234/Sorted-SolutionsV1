'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Search, Grid, Table as TableIcon, ChevronDown, RefreshCw,
    Filter, Save, BookmarkCheck, X, Columns, List, SortAsc, SortDesc,
    Layers, Trash2, Star, StarOff, MoreHorizontal
} from 'lucide-react';
import { accountGroups as staticAccountGroups } from '@/data/accountingData';
import { formatCurrency, getGroupPath } from '@/utils/accountingHelpers';
import AccountDetailModal from './AccountDetailModal';
import AccountsCardView from '@/components/accounts/AccountsCardView';
import AccountsKanbanView from '@/components/accounts/AccountsKanbanView';
import AccountsDetailsView from '@/components/accounts/AccountsDetailsView';
import TransactionKanbanView from '@/components/accounts/TransactionKanbanView';
import TransactionListView from '@/components/accounts/TransactionListView';
import TransactionCardView from '@/components/accounts/TransactionCardView';
import SalesInvoiceForm from '@/components/accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from '@/components/accounts/PurchaseInvoiceForm';
import QuotationForm from '@/components/accounts/QuotationForm';
import ReceiptVoucherForm from '@/components/accounts/ReceiptVoucherForm';
import PaymentVoucherForm from '@/components/accounts/PaymentVoucherForm';
import NewAccountForm from '@/components/accounts/NewAccountForm';

// ─── Sort/Group/Filter config per tab ─────────────────────────────────────────
const TAB_CONFIG = {
    accounts: {
        label: 'Accounts',
        searchPlaceholder: 'Search Ledgers...',
        createButtonText: '+ Create Account',
        formType: 'new-account',
        sortOptions: [
            { value: 'name_asc',      label: 'Name (A → Z)' },
            { value: 'name_desc',     label: 'Name (Z → A)' },
            { value: 'balance_desc',  label: 'Balance ↓' },
            { value: 'balance_asc',   label: 'Balance ↑' },
            { value: 'opening_desc',  label: 'Opening Bal ↓' },
            { value: 'jobs_desc',     label: 'Jobs Done ↓' },
            { value: 'updated_desc',  label: 'Last Updated' },
        ],
        groupOptions: [
            { value: 'none',    label: 'No Grouping' },
            { value: 'type',    label: 'Group: Type' },
            { value: 'group',   label: 'Group: Account Group' },
            { value: 'balance', label: 'Group: Balance Range' },
        ],
        filterFields: ['type', 'group', 'balance_range', 'has_balance'],
    },
    sales: {
        label: 'Sales',
        searchPlaceholder: 'Search Sales Invoices...',
        createButtonText: '+ Create Sales Invoice',
        formType: 'sales-invoice',
        sortOptions: [
            { value: 'date_desc',   label: 'Date (Newest)' },
            { value: 'date_asc',    label: 'Date (Oldest)' },
            { value: 'amount_desc', label: 'Amount ↓' },
            { value: 'amount_asc',  label: 'Amount ↑' },
            { value: 'ref_asc',     label: 'Invoice No' },
            { value: 'party_asc',   label: 'Account Name' },
        ],
        groupOptions: [
            { value: 'none',   label: 'No Grouping' },
            { value: 'status', label: 'Group: Status' },
            { value: 'month',  label: 'Group: Month' },
            { value: 'ledger', label: 'Group: Account' },
        ],
        filterFields: ['status', 'date_range', 'amount_range'],
    },
    purchases: {
        label: 'Purchases',
        searchPlaceholder: 'Search Purchase Invoices...',
        createButtonText: '+ Create Purchase Invoice',
        formType: 'purchase-invoice',
        sortOptions: [
            { value: 'date_desc',   label: 'Date (Newest)' },
            { value: 'date_asc',    label: 'Date (Oldest)' },
            { value: 'amount_desc', label: 'Amount ↓' },
            { value: 'amount_asc',  label: 'Amount ↑' },
            { value: 'ref_asc',     label: 'Invoice No' },
            { value: 'party_asc',   label: 'Supplier Name' },
        ],
        groupOptions: [
            { value: 'none',     label: 'No Grouping' },
            { value: 'status',   label: 'Group: Status' },
            { value: 'month',    label: 'Group: Month' },
            { value: 'supplier', label: 'Group: Supplier' },
        ],
        filterFields: ['status', 'date_range', 'amount_range'],
    },
    quotations: {
        label: 'Quotations',
        searchPlaceholder: 'Search Quotations...',
        createButtonText: '+ Create Quotation',
        formType: 'quotation',
        sortOptions: [
            { value: 'date_desc',   label: 'Date (Newest)' },
            { value: 'date_asc',    label: 'Date (Oldest)' },
            { value: 'amount_desc', label: 'Amount ↓' },
            { value: 'amount_asc',  label: 'Amount ↑' },
            { value: 'ref_asc',     label: 'Quote No' },
            { value: 'party_asc',   label: 'Customer Name' },
        ],
        groupOptions: [
            { value: 'none',     label: 'No Grouping' },
            { value: 'status',   label: 'Group: Status' },
            { value: 'month',    label: 'Group: Month' },
            { value: 'customer', label: 'Group: Customer' },
        ],
        filterFields: ['status', 'date_range', 'amount_range'],
    },
    receipts: {
        label: 'Receipts',
        searchPlaceholder: 'Search Receipts...',
        createButtonText: '+ Create Receipt Voucher',
        formType: 'receipt-voucher',
        sortOptions: [
            { value: 'date_desc',   label: 'Date (Newest)' },
            { value: 'date_asc',    label: 'Date (Oldest)' },
            { value: 'amount_desc', label: 'Amount ↓' },
            { value: 'amount_asc',  label: 'Amount ↑' },
            { value: 'ref_asc',     label: 'Receipt No' },
            { value: 'party_asc',   label: 'Account Name' },
        ],
        groupOptions: [
            { value: 'none',           label: 'No Grouping' },
            { value: 'month',          label: 'Group: Month' },
            { value: 'payment_method', label: 'Group: Payment Method' },
        ],
        filterFields: ['payment_method', 'date_range', 'amount_range'],
    },
    payments: {
        label: 'Payments',
        searchPlaceholder: 'Search Payments...',
        createButtonText: '+ Create Payment Voucher',
        formType: 'payment-voucher',
        sortOptions: [
            { value: 'date_desc',   label: 'Date (Newest)' },
            { value: 'date_asc',    label: 'Date (Oldest)' },
            { value: 'amount_desc', label: 'Amount ↓' },
            { value: 'amount_asc',  label: 'Amount ↑' },
            { value: 'ref_asc',     label: 'Payment No' },
            { value: 'party_asc',   label: 'Account Name' },
        ],
        groupOptions: [
            { value: 'none',           label: 'No Grouping' },
            { value: 'month',          label: 'Group: Month' },
            { value: 'payment_method', label: 'Group: Payment Method' },
        ],
        filterFields: ['payment_method', 'date_range', 'amount_range'],
    },
};

// Transaction type mapping for API
const TXN_TYPE_MAP = { sales: 'sales', purchases: 'purchase', quotations: 'quotation', receipts: 'receipt', payments: 'payment' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPartyName(item, tab) {
    switch (tab) {
        case 'sales':     return item.account_name || item.ledgerName    || '';
        case 'purchases': return item.account_name || item.supplierName  || '';
        case 'quotations':return item.account_name || item.customerName  || '';
        case 'receipts':  return item.account_name || item.fromAccount   || '';
        case 'payments':  return item.account_name || item.toAccount     || '';
        default:          return '';
    }
}

function getRef(item, tab) {
    switch (tab) {
        case 'sales':     return item.invoice_number || item.invoiceNo || '';
        case 'purchases': return item.invoice_number || item.invoiceNo || '';
        case 'quotations':return item.quote_number   || item.quoteNo   || '';
        case 'receipts':  return item.receipt_number || item.receiptNo || '';
        case 'payments':  return item.payment_number || item.paymentNo || '';
        default:          return '';
    }
}

function sortItems(items, sortBy, tab) {
    return [...items].sort((a, b) => {
        switch (sortBy) {
            case 'date_desc':  return new Date(b.date || 0) - new Date(a.date || 0);
            case 'date_asc':   return new Date(a.date || 0) - new Date(b.date || 0);
            case 'amount_desc':return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
            case 'amount_asc': return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
            case 'ref_asc':    return (getRef(a,tab)||'').localeCompare(getRef(b,tab)||'');
            case 'party_asc':  return (getPartyName(a,tab)||'').localeCompare(getPartyName(b,tab)||'');
            case 'name_asc':   return (a.name||'').localeCompare(b.name||'');
            case 'name_desc':  return (b.name||'').localeCompare(a.name||'');
            case 'balance_desc': return (b.closingBalance||0) - (a.closingBalance||0);
            case 'balance_asc':  return (a.closingBalance||0) - (b.closingBalance||0);
            case 'opening_desc': return (b.openingBalance||0) - (a.openingBalance||0);
            case 'jobs_desc':    return (b.jobsDone||0) - (a.jobsDone||0);
            case 'updated_desc': return new Date(b.updated_at||0) - new Date(a.updated_at||0);
            default:           return 0;
        }
    });
}

function filterItems(items, filters, tab) {
    return items.filter(item => {
        // Search
        if (filters.search) {
            const s = filters.search.toLowerCase();
            const haystack = [
                item.name, item.account_name, item.ledgerName, item.supplierName,
                item.customerName, item.fromAccount, item.toAccount,
                item.invoice_number, item.invoiceNo, item.quoteNo, item.quote_number,
                item.receiptNo, item.receipt_number, item.paymentNo, item.payment_number,
                item.sku, item.reference
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(s)) return false;
        }
        // Type filter (accounts tab)
        if (filters.filterType && filters.filterType !== 'all' && tab === 'accounts') {
            if (item.type !== filters.filterType) return false;
        }
        // Group filter (accounts tab)
        if (filters.filterGroup && filters.filterGroup !== 'all' && tab === 'accounts') {
            if (item.under !== filters.filterGroup) return false;
        }
        // Status filter
        if (filters.status && filters.status !== 'all' && tab !== 'accounts') {
            const itemStatus = (item.status || '').toLowerCase();
            if (itemStatus !== filters.status.toLowerCase()) return false;
        }
        // Payment method filter (receipts/payments)
        if (filters.payment_method && filters.payment_method !== 'all') {
            const pm = item.payment_mode || item.paymentMethod || '';
            if (pm.toLowerCase() !== filters.payment_method.toLowerCase()) return false;
        }
        // Date range
        if (filters.date_from && item.date) {
            if (new Date(item.date) < new Date(filters.date_from)) return false;
        }
        if (filters.date_to && item.date) {
            if (new Date(item.date) > new Date(filters.date_to)) return false;
        }
        // Amount range
        const amt = item.total_amount || item.amount || item.closingBalance || 0;
        if (filters.amount_min !== '' && filters.amount_min !== undefined) {
            if (amt < parseFloat(filters.amount_min)) return false;
        }
        if (filters.amount_max !== '' && filters.amount_max !== undefined) {
            if (amt > parseFloat(filters.amount_max)) return false;
        }
        // Has balance
        if (filters.has_balance && tab === 'accounts') {
            if (!item.closingBalance || item.closingBalance === 0) return false;
        }
        return true;
    });
}

function countActiveFilters(filters, tab) {
    let count = 0;
    if (filters.filterType && filters.filterType !== 'all') count++;
    if (filters.filterGroup && filters.filterGroup !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.payment_method && filters.payment_method !== 'all') count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    if (filters.amount_min !== '' && filters.amount_min !== undefined) count++;
    if (filters.amount_max !== '' && filters.amount_max !== undefined) count++;
    if (filters.has_balance) count++;
    return count;
}

// ─── Resizable Table Wrapper ──────────────────────────────────────────────────
function ResizableHeader({ children, width, onResize, style = {} }) {
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startW = useRef(0);

    const handleMouseDown = (e) => {
        e.stopPropagation();
        isResizing.current = true;
        startX.current = e.clientX;
        startW.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (moveE) => {
            if (!isResizing.current) return;
            const delta = moveE.clientX - startX.current;
            const newW = Math.max(60, startW.current + delta);
            onResize(newW);
        };
        const onUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <th style={{ position: 'relative', width, minWidth: width, maxWidth: width, ...style }}>
            {children}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '5px',
                    cursor: 'col-resize',
                    background: 'transparent',
                    zIndex: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            />
        </th>
    );
}

// ─── Save View Modal ──────────────────────────────────────────────────────────
function SaveViewModal({ onSave, onClose }) {
    const [name, setName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)', padding: '24px', width: '360px',
                boxShadow: 'var(--shadow-xl)',
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0 0 16px' }}>Save View</h3>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    View Name
                </label>
                <input
                    className="form-input"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sales This Month"
                    style={{ width: '100%', marginBottom: 12 }}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim(), isDefault)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 20, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                    Set as default for this tab
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => name.trim() && onSave(name.trim(), isDefault)}
                        style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
                        disabled={!name.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function AccountsTab() {
    const [activeTab, setActiveTab] = useState('accounts');

    // Data
    const [ledgers, setLedgers] = useState([]);
    const [groups, setGroups] = useState(staticAccountGroups);
    const [txnData, setTxnData] = useState({}); // { sales: [], purchases: [], ... }

    // UI
    const [isLoading, setIsLoading] = useState(true);
    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [groupBy, setGroupBy] = useState('none');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Per-tab filters
    const [filters, setFilters] = useState({
        filterType: 'all', filterGroup: 'all',
        status: 'all', payment_method: 'all',
        date_from: '', date_to: '', amount_min: '', amount_max: '',
        has_balance: false,
    });

    // Column widths (per tab)
    const [columnWidths, setColumnWidths] = useState({});

    // Modal / form
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeForm, setActiveForm] = useState(null);

    // Saved views
    const [savedViews, setSavedViews] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showViewsMenu, setShowViewsMenu] = useState(false);
    const viewMenuRef = useRef(null);

    // Close views menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
                setShowViewsMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Fetch accounts + groups ──────────────────────────────────────────────
    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const [accRes, grpRes] = await Promise.all([
                fetch('/api/admin/accounts'),
                fetch('/api/admin/account-groups')
            ]);
            const accData = await accRes.json();
            const grpData = await grpRes.json();

            if (accData.success) setLedgers(accData.data || []);
            if (grpData.success) {
                const dbGroups = grpData.data || [];
                const combined = [...staticAccountGroups];
                dbGroups.forEach(g => { if (!combined.find(c => c.id === g.id)) combined.push(g); });
                setGroups(combined);
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Fetch transactions for a given tab ───────────────────────────────────
    const fetchTransactions = useCallback(async (tab) => {
        const type = TXN_TYPE_MAP[tab];
        if (!type) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/transactions?type=${type}`);
            const data = await res.json();
            if (data.success) {
                setTxnData(prev => ({ ...prev, [tab]: data.data || [] }));
            }
        } catch (err) {
            console.error(`Failed to fetch ${tab}:`, err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Fetch saved views ───────────────────────────────────────────────────
    const fetchSavedViews = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/account-views');
            const data = await res.json();
            if (data.success) setSavedViews(data.data || []);
        } catch (err) {
            console.error('Failed to fetch saved views:', err);
        }
    }, []);

    // ── Initial load ────────────────────────────────────────────────────────
    useEffect(() => {
        fetchAccounts();
        fetchSavedViews();
    }, []);

    // ── Load transactions when tab changes (lazy) ────────────────────────────
    useEffect(() => {
        if (activeTab !== 'accounts' && !txnData[activeTab]) {
            fetchTransactions(activeTab);
        }
        // Load default view for this tab
        const defaultView = savedViews.find(v => v.tab === activeTab && v.isDefault);
        if (defaultView) applyView(defaultView, false);
    }, [activeTab]);

    // ── Refresh ─────────────────────────────────────────────────────────────
    const refreshCurrent = () => {
        if (activeTab === 'accounts') fetchAccounts();
        else fetchTransactions(activeTab);
    };

    // ── Tab change ───────────────────────────────────────────────────────────
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchTerm('');
        setFilters({ filterType: 'all', filterGroup: 'all', status: 'all', payment_method: 'all', date_from: '', date_to: '', amount_min: '', amount_max: '', has_balance: false });
        setSortBy(newTab === 'accounts' ? 'name_asc' : 'date_desc');
        setGroupBy('none');
        setViewType('table');
        setShowFilterPanel(false);
        setColumnWidths({});
    };

    // ── Current raw data ────────────────────────────────────────────────────
    const getRawData = () => {
        if (activeTab === 'accounts') return ledgers;
        return txnData[activeTab] || [];
    };

    // ── Processed data ──────────────────────────────────────────────────────
    const getProcessedData = () => {
        const raw = getRawData();
        const withSearch = filterItems(raw, { ...filters, search: searchTerm }, activeTab);
        return sortItems(withSearch, sortBy, activeTab);
    };

    // ── Column widths helper ────────────────────────────────────────────────
    const getCW = (col, defaultW) => columnWidths[col] ?? defaultW;
    const setCW = (col, w) => setColumnWidths(prev => ({ ...prev, [col]: w }));

    // ── Saved views ─────────────────────────────────────────────────────────
    const applyView = (view, showSuccess = true) => {
        const c = view.config || {};
        if (c.sortBy)    setSortBy(c.sortBy);
        if (c.groupBy)   setGroupBy(c.groupBy);
        if (c.viewType)  setViewType(c.viewType);
        if (c.filters)   setFilters(prev => ({ ...prev, ...c.filters }));
        if (c.columnWidths) setColumnWidths(c.columnWidths);
        setShowViewsMenu(false);
    };

    const handleSaveView = async (name, isDefault) => {
        const newView = {
            id: `v_${Date.now()}`,
            name,
            tab: activeTab,
            isDefault,
            config: {
                sortBy, groupBy, viewType,
                filters: { ...filters },
                columnWidths: { ...columnWidths },
            },
        };

        // If this is default, remove default from others in same tab
        let updated = savedViews.map(v => v.tab === activeTab && isDefault ? { ...v, isDefault: false } : v);
        updated = [...updated, newView];

        setSavedViews(updated);
        setShowSaveModal(false);

        try {
            await fetch('/api/admin/account-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views: updated }),
            });
        } catch (e) {
            console.error('Failed to save view:', e);
        }
    };

    const handleDeleteView = async (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        setSavedViews(updated);
        try {
            await fetch('/api/admin/account-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views: updated }),
            });
        } catch (e) {
            console.error('Failed to delete view:', e);
        }
    };

    const handleToggleDefault = async (id) => {
        const updated = savedViews.map(v => {
            if (v.tab !== activeTab) return v;
            return { ...v, isDefault: v.id === id ? !v.isDefault : false };
        });
        setSavedViews(updated);
        try {
            await fetch('/api/admin/account-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views: updated }),
            });
        } catch (e) {
            console.error('Failed to update view:', e);
        }
    };

    // ── Form handlers ───────────────────────────────────────────────────────
    const handleFormSave = () => { refreshCurrent(); setActiveForm(null); };
    const handleFormClose = () => setActiveForm(null);
    const handleUpdateAccount = (updated) => setLedgers(prev => prev.map(l => l.id === updated.id ? updated : l));

    // ─── Render ─────────────────────────────────────────────────────────────
    const processedData = getProcessedData();
    const activeFiltersCount = countActiveFilters(filters, activeTab);
    const cfg = TAB_CONFIG[activeTab];
    const tabViews = savedViews.filter(v => v.tab === activeTab);

    // Th style helper
    const thStyle = (textAlign = 'left') => ({
        padding: '7px 8px',
        textAlign,
        fontSize: 'var(--font-size-xs)',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        background: 'var(--bg-secondary)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
    });
    const tdStyle = (textAlign = 'left') => ({
        padding: '7px 8px',
        fontSize: 'var(--font-size-xs)',
        textAlign,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    });

    // ── Accounts Table ───────────────────────────────────────────────────────
    const renderAccountsTable = () => (
        <div style={{ flex: 1, overflow: 'auto' }}>
            {viewType === 'card'    && <AccountsCardView    accounts={processedData} onAccountClick={setSelectedAccount} />}
            {viewType === 'kanban'  && <AccountsKanbanView  accounts={processedData} onAccountClick={setSelectedAccount} onAccountUpdate={handleUpdateAccount} />}
            {viewType === 'details' && <AccountsDetailsView accounts={processedData} onAccountClick={setSelectedAccount} />}
            {viewType === 'list'    && (
                <TransactionListView
                    items={processedData}
                    tab="accounts"
                    onItemClick={setSelectedAccount}
                    groupBy={groupBy}
                />
            )}
            {viewType === 'table' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                            <ResizableHeader width={getCW('sku', 90)}  onResize={w => setCW('sku', w)}  style={thStyle()}>SKU</ResizableHeader>
                            <ResizableHeader width={getCW('name', 200)} onResize={w => setCW('name', w)} style={thStyle()}>Ledger Name</ResizableHeader>
                            <ResizableHeader width={getCW('type', 110)} onResize={w => setCW('type', w)} style={thStyle()}>Type</ResizableHeader>
                            <ResizableHeader width={getCW('grp', 150)}  onResize={w => setCW('grp', w)}  style={thStyle()}>Group</ResizableHeader>
                            <ResizableHeader width={getCW('ob', 120)}   onResize={w => setCW('ob', w)}   style={thStyle('right')}>Opening Balance</ResizableHeader>
                            <ResizableHeader width={getCW('cb', 120)}   onResize={w => setCW('cb', w)}   style={thStyle('right')}>Closing Balance</ResizableHeader>
                            <ResizableHeader width={getCW('jobs', 80)}  onResize={w => setCW('jobs', w)} style={thStyle('center')}>Jobs</ResizableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map(ledger => (
                            <tr
                                key={ledger.id}
                                onClick={() => setSelectedAccount(ledger)}
                                style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', transition: 'background-color 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={tdStyle()}><span style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{ledger.sku || '-'}</span></td>
                                <td style={{ ...tdStyle(), fontWeight: 500 }}>{ledger.name}</td>
                                <td style={tdStyle()}>
                                    <span style={{ padding: '2px 7px', borderRadius: 4, backgroundColor: 'var(--bg-secondary)', fontSize: '10px', textTransform: 'capitalize' }}>{ledger.type}</span>
                                </td>
                                <td style={{ ...tdStyle(), color: 'var(--text-secondary)' }}>{groups.find(g => g.id === ledger.under)?.name || ledger.under}</td>
                                <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{formatCurrency(ledger.openingBalance || 0)}</td>
                                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700, color: (ledger.closingBalance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                    {formatCurrency(ledger.closingBalance || 0)}
                                </td>
                                <td style={tdStyle('center')}>{ledger.jobsDone || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    // ── Transactions Table ────────────────────────────────────────────────────
    const renderTransactionsTable = () => {
        const statusBadge = (status) => {
            const colors = { paid: '#10b981', partial: '#f59e0b', pending: '#f59e0b', overdue: '#ef4444', accepted: '#10b981', sent: '#3b82f6', draft: '#6b7280', rejected: '#ef4444' };
            const c = colors[(status||'').toLowerCase()] || '#6b7280';
            return (
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '10px', fontWeight: 600, backgroundColor: `${c}20`, color: c, textTransform: 'capitalize' }}>
                    {status}
                </span>
            );
        };

        // Select columns config based on tab
        const cols = {
            sales:      [['ref',90,'Invoice No'], ['date',95,'Date'],    ['party',0,'Account'],  ['amount',110,'Amount','right'], ['status',90,'Status','center']],
            purchases:  [['ref',95,'Invoice No'], ['date',95,'Date'],    ['party',0,'Supplier'], ['amount',110,'Amount','right'], ['status',90,'Status','center']],
            quotations: [['ref',90,'Quote No'],   ['date',95,'Date'],    ['party',0,'Customer'], ['amount',110,'Amount','right'], ['status',90,'Status','center']],
            receipts:   [['ref',95,'Receipt No'], ['date',95,'Date'],    ['party',0,'Account'],  ['amount',110,'Amount','right'], ['method',110,'Payment Method','center']],
            payments:   [['ref',95,'Payment No'], ['date',95,'Date'],    ['party',0,'Account'],  ['amount',110,'Amount','right'], ['method',110,'Payment Method','center']],
        };

        const tabCols = cols[activeTab] || [];

        const getCellContent = (item, colKey) => {
            switch (colKey) {
                case 'ref':    return <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{getRef(item, activeTab) || '-'}</span>;
                case 'date':   return item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                case 'party':  return <span style={{ fontWeight: 500 }}>{getPartyName(item, activeTab) || '-'}</span>;
                case 'amount': return <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(item.total_amount || item.amount || 0)}</span>;
                case 'status': return statusBadge(item.status);
                case 'method': return <span style={{ padding: '2px 7px', borderRadius: 4, backgroundColor: 'var(--bg-secondary)', fontSize: '10px' }}>{item.payment_mode || item.paymentMethod || '-'}</span>;
                default:       return '-';
            }
        };

        return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                {viewType === 'card'   && <TransactionCardView  items={processedData} tab={activeTab} onItemClick={null} />}
                {viewType === 'kanban' && <TransactionKanbanView items={processedData} tab={activeTab} onItemClick={null} groupBy={groupBy} />}
                {viewType === 'list'   && <TransactionListView   items={processedData} tab={activeTab} onItemClick={null} groupBy={groupBy} />}
                {viewType === 'table'  && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                {tabCols.map(([key, defW, label, align]) => {
                                    const isStretch = defW === 0;
                                    return (
                                        <ResizableHeader
                                            key={key}
                                            width={isStretch ? getCW(key, 180) : getCW(key, defW)}
                                            onResize={w => setCW(key, w)}
                                            style={{ ...thStyle(align || 'left'), ...(isStretch ? { width: 'auto' } : {}) }}
                                        >
                                            {label}
                                        </ResizableHeader>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map(item => (
                                <tr
                                    key={item.id}
                                    style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', transition: 'background-color 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {tabCols.map(([key, , , align]) => (
                                        <td key={key} style={tdStyle(align || 'left')}>
                                            {getCellContent(item, key)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {processedData.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                        No records found.
                    </div>
                )}
            </div>
        );
    };

    // ── Filter Panel ─────────────────────────────────────────────────────────
    const renderFilterPanel = () => {
        if (!showFilterPanel) return null;
        const inputStyle = { padding: '5px 10px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', width: '100%' };
        const selStyle   = { ...inputStyle, appearance: 'none', cursor: 'pointer' };
        const labelStyle = { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 };

        const clearAll = () => setFilters({ filterType: 'all', filterGroup: 'all', status: 'all', payment_method: 'all', date_from: '', date_to: '', amount_min: '', amount_max: '', has_balance: false });

        return (
            <div style={{
                padding: '10px 16px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'flex-end',
            }}>
                {/* Accounts tab specific filters */}
                {activeTab === 'accounts' && (
                    <>
                        <div style={{ minWidth: 120 }}>
                            <label style={labelStyle}>Type</label>
                            <select style={selStyle} value={filters.filterType} onChange={e => setFilters(f => ({ ...f, filterType: e.target.value }))}>
                                <option value="all">All Types</option>
                                <option value="customer">Customers</option>
                                <option value="supplier">Suppliers</option>
                                <option value="technician">Technicians</option>
                                <option value="cash">Cash/Bank</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div style={{ minWidth: 150 }}>
                            <label style={labelStyle}>Account Group</label>
                            <select style={selStyle} value={filters.filterGroup} onChange={e => setFilters(f => ({ ...f, filterGroup: e.target.value }))}>
                                <option value="all">All Groups</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div style={{ minWidth: 140, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
                            <input type="checkbox" id="has_balance" checked={filters.has_balance} onChange={e => setFilters(f => ({ ...f, has_balance: e.target.checked }))} />
                            <label htmlFor="has_balance" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Has Outstanding Balance</label>
                        </div>
                    </>
                )}

                {/* Status filter (sales/purchases/quotations) */}
                {['sales','purchases','quotations'].includes(activeTab) && (
                    <div style={{ minWidth: 130 }}>
                        <label style={labelStyle}>Status</label>
                        <select style={selStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            {activeTab === 'quotations' && <>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                            </>}
                        </select>
                    </div>
                )}

                {/* Payment method (receipts/payments) */}
                {['receipts','payments'].includes(activeTab) && (
                    <div style={{ minWidth: 140 }}>
                        <label style={labelStyle}>Payment Method</label>
                        <select style={selStyle} value={filters.payment_method} onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))}>
                            <option value="all">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Online">Online</option>
                        </select>
                    </div>
                )}

                {/* Date range (transaction tabs) */}
                {activeTab !== 'accounts' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <div>
                            <label style={labelStyle}>From Date</label>
                            <input type="date" style={inputStyle} value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>To Date</label>
                            <input type="date" style={inputStyle} value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
                        </div>
                    </div>
                )}

                {/* Amount range */}
                <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 100 }}>
                        <label style={labelStyle}>Min ₹</label>
                        <input type="number" style={inputStyle} placeholder="0" value={filters.amount_min} onChange={e => setFilters(f => ({ ...f, amount_min: e.target.value }))} />
                    </div>
                    <div style={{ width: 100 }}>
                        <label style={labelStyle}>Max ₹</label>
                        <input type="number" style={inputStyle} placeholder="∞" value={filters.amount_max} onChange={e => setFilters(f => ({ ...f, amount_max: e.target.value }))} />
                    </div>
                </div>

                {/* Clear */}
                {activeFiltersCount > 0 && (
                    <button onClick={clearAll} style={{ padding: '5px 12px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={12} /> Clear All
                    </button>
                )}
            </div>
        );
    };

    // ── Views Dropdown ────────────────────────────────────────────────────────
    const renderViewsMenu = () => {
        if (!showViewsMenu) return null;
        return (
            <div ref={viewMenuRef} style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 500,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xl)',
                minWidth: 220,
                marginTop: 4,
                overflow: 'hidden',
            }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                    Saved Views — {cfg.label}
                </div>
                {tabViews.length === 0 && (
                    <div style={{ padding: '12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>No saved views yet</div>
                )}
                {tabViews.map(view => (
                    <div
                        key={view.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', cursor: 'pointer', transition: 'background-color 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{ flex: 1, fontSize: 'var(--font-size-xs)', fontWeight: 500 }} onClick={() => applyView(view)}>
                            {view.isDefault && <Star size={10} style={{ color: '#f59e0b', marginRight: 4, display: 'inline' }} />}
                            {view.name}
                        </div>
                        <button onClick={() => handleToggleDefault(view.id)} title={view.isDefault ? 'Remove default' : 'Set as default'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: view.isDefault ? '#f59e0b' : 'var(--text-tertiary)', padding: 2 }}>
                            {view.isDefault ? <Star size={12} /> : <StarOff size={12} />}
                        </button>
                        <button onClick={() => handleDeleteView(view.id)} title="Delete view" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
                <div
                    style={{ padding: '8px 12px', borderTop: '1px solid var(--border-primary)', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    onClick={() => { setShowViewsMenu(false); setShowSaveModal(true); }}
                >
                    <Save size={12} /> Save current view…
                </div>
            </div>
        );
    };

    // View icons
    const viewButtons = [
        { type: 'table',   Icon: TableIcon,      label: 'Table' },
        { type: 'list',    Icon: List,           label: 'List' },
        { type: 'card',    Icon: Grid,           label: 'Cards' },
        { type: 'kanban',  Icon: Columns,        label: 'Kanban' },
        ...(activeTab === 'accounts' ? [{ type: 'details', Icon: Layers, label: 'Details' }] : []),
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Row 1: Title + Search + Create ────────────────────────── */}
            <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0, minWidth: '90px' }}>Accounts</h2>

                <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder={cfg.searchPlaceholder}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2rem', paddingTop: '6px', paddingBottom: '6px', fontSize: 'var(--font-size-sm)' }}
                    />
                </div>

                <button className="btn btn-primary" onClick={() => setActiveForm(cfg.formType)} style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={15} /> {cfg.createButtonText}
                </button>
                <button className="btn btn-secondary" onClick={refreshCurrent} title="Refresh" style={{ padding: '6px 8px' }}>
                    <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
                </button>
            </div>

            {/* Progress bar */}
            {isLoading && (
                <div style={{ height: '3px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div className="progress-bar-indeterminate" style={{ height: '100%', background: 'var(--color-primary)' }} />
                </div>
            )}

            {/* ── Row 2: Subtab buttons ───────────────────────────────────── */}
            <div style={{ padding: '0 16px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 0, overflowX: 'auto' }}>
                {Object.keys(TAB_CONFIG).map(tabKey => (
                    <button
                        key={tabKey}
                        onClick={() => handleTabChange(tabKey)}
                        style={{
                            padding: '9px 18px',
                            border: 'none',
                            borderBottom: activeTab === tabKey ? '2px solid var(--color-primary)' : '2px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === tabKey ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tabKey ? 700 : 400,
                            fontSize: 'var(--font-size-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {TAB_CONFIG[tabKey].label}
                        {activeTab !== tabKey && txnData[tabKey]?.length > 0 && (
                            <span style={{ marginLeft: 6, padding: '0 5px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                {txnData[tabKey].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Row 3: Toolbar ─────────────────────────────────────────── */}
            <div style={{ padding: '6px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

                {/* View type buttons */}
                <div style={{ display: 'flex', gap: 3 }}>
                    {viewButtons.map(({ type, Icon, label }) => (
                        <button
                            key={type}
                            onClick={() => setViewType(type)}
                            title={label}
                            style={{
                                padding: '4px 8px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: viewType === type ? 'var(--color-primary)' : 'var(--bg-elevated)',
                                color: viewType === type ? 'white' : 'var(--text-primary)',
                                display: 'flex', alignItems: 'center', gap: 4,
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: viewType === type ? 600 : 400,
                                transition: 'all 0.12s',
                            }}
                        >
                            <Icon size={13} />
                            <span style={{ display: 'none' }}>{label}</span>
                        </button>
                    ))}
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 2px' }} />

                {/* Sort By */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{ appearance: 'none', padding: '4px 22px 4px 8px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                    >
                        {cfg.sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Group By */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={groupBy}
                        onChange={e => setGroupBy(e.target.value)}
                        style={{ appearance: 'none', padding: '4px 22px 4px 8px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                    >
                        {cfg.groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 2px' }} />

                {/* Filter toggle */}
                <button
                    onClick={() => setShowFilterPanel(p => !p)}
                    style={{
                        padding: '4px 10px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: showFilterPanel ? 'var(--color-primary)' : activeFiltersCount > 0 ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
                        color: showFilterPanel ? 'white' : activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                        transition: 'all 0.12s',
                        borderColor: activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--border-primary)',
                    }}
                >
                    <Filter size={12} />
                    {activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filter'}
                </button>

                {/* Views dropdown */}
                <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <button
                        onClick={() => setShowViewsMenu(p => !p)}
                        style={{
                            padding: '4px 10px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                        }}
                    >
                        <BookmarkCheck size={12} />
                        Views {tabViews.length > 0 && `(${tabViews.length})`}
                        <ChevronDown size={11} />
                    </button>
                    {showViewsMenu && renderViewsMenu()}
                </div>

                {/* Quick save */}
                <button
                    onClick={() => setShowSaveModal(true)}
                    title="Save current view"
                    style={{ padding: '4px 8px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <Save size={13} />
                </button>
            </div>

            {/* ── Filter Panel ─────────────────────────────────────────────── */}
            {renderFilterPanel()}

            {/* ── Content ──────────────────────────────────────────────────── */}
            {activeTab === 'accounts' ? renderAccountsTable() : renderTransactionsTable()}

            {/* ── Modals / Forms ───────────────────────────────────────────── */}
            {selectedAccount && (
                <AccountDetailModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onUpdate={handleUpdateAccount}
                />
            )}
            {showSaveModal && (
                <SaveViewModal
                    onSave={handleSaveView}
                    onClose={() => setShowSaveModal(false)}
                />
            )}

            {activeForm === 'sales-invoice'    && <SalesInvoiceForm    onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'purchase-invoice' && <PurchaseInvoiceForm onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'quotation'        && <QuotationForm       onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'receipt-voucher'  && <ReceiptVoucherForm  onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'payment-voucher'  && <PaymentVoucherForm  onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'new-account'      && (
                <NewAccountForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                    existingAccounts={ledgers}
                    existingGroups={groups}
                    onGroupCreated={fetchAccounts}
                />
            )}
        </div>
    );
}

export default AccountsTab;
