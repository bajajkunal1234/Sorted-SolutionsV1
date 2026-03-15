'use client'

import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, Grid, Table as TableIcon, Loader2, ArrowUpDown, Filter, Layers, Trash2, CheckSquare, SlidersHorizontal } from 'lucide-react';
import { accountsAPI, transactionsAPI, accountGroupsAPI } from '@/lib/adminAPI';
import AccountDetailModal from './AccountDetailModal';
import AccountsCardView from './accounts/AccountsCardView';
import AccountsKanbanView from './accounts/AccountsKanbanView';
import AccountsDetailsView from './accounts/AccountsDetailsView';
import SalesInvoiceForm from './accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from './accounts/PurchaseInvoiceForm';
import QuotationForm from './accounts/QuotationForm';
import ReceiptVoucherForm from './accounts/ReceiptVoucherForm';
import PaymentVoucherForm from './accounts/PaymentVoucherForm';
import NewAccountForm from './accounts/NewAccountForm';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';
import TransactionsCardView from './accounts/TransactionsCardView';
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';

function AccountsTab({ customerToOpen, onCustomerOpened }) {
    const [activeTab, setActiveTab] = useState('accounts');

    const [ledgers, setLedgers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [salesInvoices, setSalesInvoices] = useState([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [tabLoading, setTabLoading] = useState({ accounts: true, sales: false, purchases: false, quotations: false, receipts: false, payments: false });
    const [error, setError] = useState(null);

    const tabToTypeMap = { sales: 'sales', purchases: 'purchase', quotations: 'quotation', receipts: 'receipt', payments: 'payment' };

    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const [txViewType, setTxViewType] = useState('table');
    const [txFilterStatus, setTxFilterStatus] = useState('all');
    const [txSortBy, setTxSortBy] = useState('date');
    const [txSortDir, setTxSortDir] = useState('desc');
    const [txGroupBy, setTxGroupBy] = useState('none');

    // Column picker
    const ACCOUNT_COLUMNS = [
        { id: 'sku',             label: 'SKU',           align: 'left',   defaultOn: true  },
        { id: 'type',            label: 'Type',          align: 'left',   defaultOn: true  },
        { id: 'group',           label: 'Group',         align: 'left',   defaultOn: true  },
        { id: 'opening_balance', label: 'Opening Bal',   align: 'right',  defaultOn: true  },
        { id: 'closing_balance', label: 'Closing Bal',   align: 'right',  defaultOn: true  },
        { id: 'jobs',            label: 'Jobs',          align: 'center', defaultOn: true  },
        { id: 'mobile',          label: 'Mobile',        align: 'left',   defaultOn: false },
        { id: 'email',           label: 'Email',         align: 'left',   defaultOn: false },
        { id: 'gstin',           label: 'GSTIN',         align: 'left',   defaultOn: false },
        { id: 'credit_limit',    label: 'Credit Limit',  align: 'right',  defaultOn: false },
        { id: 'credit_period',   label: 'Credit Period', align: 'center', defaultOn: false },
        { id: 'status',          label: 'Status',        align: 'center', defaultOn: false },
        { id: 'balance_type',    label: 'Bal Type',      align: 'center', defaultOn: false },
    ];
    const [visibleColumns, setVisibleColumns] = useState(() => new Set(ACCOUNT_COLUMNS.filter(c => c.defaultOn).map(c => c.id)));
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const toggleColumn = (id) => setVisibleColumns(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    // Multi-select state
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setTabLoading(prev => ({ ...prev, [activeTab]: true }));
                setSelectedItems(new Set()); // clear selection on tab change
                if (activeTab === 'accounts') {
                    const [ledgerData, groupData] = await Promise.all([accountsAPI.getAll(), accountGroupsAPI.getAll()]);
                    setLedgers(ledgerData || []);
                    setGroups(groupData || []);
                } else {
                    const type = tabToTypeMap[activeTab];
                    const data = await transactionsAPI.getAll({ type });
                    switch (activeTab) {
                        case 'sales': setSalesInvoices(data || []); break;
                        case 'purchases': setPurchaseInvoices(data || []); break;
                        case 'quotations': setQuotations(data || []); break;
                        case 'receipts': setReceipts(data || []); break;
                        case 'payments': setPayments(data || []); break;
                    }
                }
                setError(null);
            } catch (err) {
                setError(`Failed to load ${activeTab}.`);
            } finally {
                setTabLoading(prev => ({ ...prev, [activeTab]: false }));
            }
        };
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        if (customerToOpen && ledgers.length > 0) {
            const customerAccount = ledgers.find(l => l.name === customerToOpen.name || l.id === customerToOpen.id);
            if (customerAccount) setSelectedAccount(customerAccount);
            if (onCustomerOpened) onCustomerOpened();
        }
    }, [customerToOpen, ledgers, onCustomerOpened]);

    const tabConfig = {
        accounts: { label: 'Accounts', searchPlaceholder: 'Search Ledgers...', createButtonText: 'Create Account', formType: 'new-account' },
        sales: { label: 'Sales', searchPlaceholder: 'Search Sales Invoices...', createButtonText: 'Create Sales Invoice', formType: 'sales-invoice' },
        purchases: { label: 'Purchases', searchPlaceholder: 'Search Purchase Invoices...', createButtonText: 'Create Purchase Invoice', formType: 'purchase-invoice' },
        quotations: { label: 'Quotations', searchPlaceholder: 'Search Quotations...', createButtonText: 'Create Quotation', formType: 'quotation' },
        receipts: { label: 'Receipts', searchPlaceholder: 'Search Receipts...', createButtonText: 'Create Receipt Voucher', formType: 'receipt-voucher' },
        payments: { label: 'Payments', searchPlaceholder: 'Search Payments...', createButtonText: 'Create Payment Voucher', formType: 'payment-voucher' },
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchTerm('');
        setFilterType('all');
        setFilterGroup('all');
        setSortBy('name');
        setViewType('table');
        setTxViewType('table');
        setTxFilterStatus('all');
        setTxSortBy('date');
        setTxSortDir('desc');
        setTxGroupBy('none');
        setSelectedItems(new Set());
    };

    const handleCreateClick = () => { setSelectedTransaction(null); setActiveForm(tabConfig[activeTab].formType); };
    const handleTransactionClick = (transaction) => { setSelectedTransaction(transaction); setActiveForm(tabConfig[activeTab].formType); };

    // Multi-select helpers
    const toggleItem = (id, e) => {
        e.stopPropagation();
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (items) => {
        if (selectedItems.size === items.length && items.length > 0) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        const count = selectedItems.size;
        if (!window.confirm(`Delete ${count} selected item(s)? This cannot be undone.`)) return;
        try {
            setBulkDeleting(true);
            const ids = Array.from(selectedItems);

            // Run all deletes and collect results (don't throw on individual failures)
            const results = await Promise.allSettled(ids.map(id => {
                if (activeTab === 'accounts') return accountsAPI.delete(id);
                return transactionsAPI.delete(id, tabToTypeMap[activeTab]);
            }));

            const failed = [];
            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    const ledger = activeTab === 'accounts' ? ledgers.find(l => l.id === ids[i]) : null;
                    const name = ledger?.name || ids[i];
                    failed.push({ name, error: result.reason?.message || 'Unknown error' });
                }
            });

            // Refresh
            if (activeTab === 'accounts') {
                const data = await accountsAPI.getAll();
                setLedgers(data || []);
            } else {
                const data = await transactionsAPI.getAll({ type: tabToTypeMap[activeTab] });
                switch (activeTab) {
                    case 'sales': setSalesInvoices(data || []); break;
                    case 'purchases': setPurchaseInvoices(data || []); break;
                    case 'quotations': setQuotations(data || []); break;
                    case 'receipts': setReceipts(data || []); break;
                    case 'payments': setPayments(data || []); break;
                }
            }
            setSelectedItems(new Set());

            if (failed.length === 0) {
                alert(`✅ ${count} item(s) deleted successfully.`);
            } else {
                const successCount = count - failed.length;
            const failLines = failed.map(f => {
                    // Try to parse structured dependency data from the error message
                    // API sends e.g. "Cannot delete — this account has active dependencies:\n\n• Customer Profile (1)..."
                    const depMatch = f.error.match(/dependencies[^:]*:([\s\S]*)/i);
                    if (depMatch) {
                        // Extract "Type (N)" pairs and reformat as clean summary
                        const pairs = [...depMatch[1].matchAll(/•\s*([^(]+)\((\d+)\)/g)];
                        const summary = pairs.length > 0
                            ? pairs.map(m => `${m[2]} ${m[1].trim()}`).join(', ')
                            : 'has active dependencies';
                        return `\n• ${f.name}: ${summary}`;
                    }
                    return `\n• ${f.name}: ${f.error}`;
                }).join('');
                alert(
                    `${successCount > 0 ? `✅ ${successCount} deleted.\n` : ''}` +
                    `❌ ${failed.length} could not be deleted:\n${failLines}`
                );
            }
        } catch (err) {
            alert(`Bulk delete failed: ${err.message}`);
        } finally {
            setBulkDeleting(false);
        }
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'accounts': return ledgers;
            case 'sales': return salesInvoices;
            case 'purchases': return purchaseInvoices;
            case 'quotations': return quotations;
            case 'receipts': return receipts;
            case 'payments': return payments;
            default: return [];
        }
    };

    const getFilteredData = () => {
        const data = getCurrentData();
        if (!searchTerm) return data;
        return data.filter(item => {
            const s = searchTerm.toLowerCase();
            switch (activeTab) {
                case 'accounts': return item.name?.toLowerCase().includes(s) || item.sku?.toLowerCase().includes(s);
                default: return item.invoice_number?.toLowerCase().includes(s) || item.quote_number?.toLowerCase().includes(s) || item.account_name?.toLowerCase().includes(s) || item.receipt_number?.toLowerCase().includes(s) || item.payment_number?.toLowerCase().includes(s);
            }
        });
    };

    const getProcessedTransactionData = () => {
        let data = getFilteredData();
        if (txFilterStatus !== 'all') {
            const isVoucher = activeTab === 'receipts' || activeTab === 'payments';
            data = data.filter(item => isVoucher ? (item.payment_mode || 'Cash') === txFilterStatus : item.status === txFilterStatus);
        }
        return [...data].sort((a, b) => {
            let valA, valB;
            const isVoucher = activeTab === 'receipts' || activeTab === 'payments';
            switch (txSortBy) {
                case 'amount': valA = isVoucher ? (a.amount || 0) : (a.total_amount || 0); valB = isVoucher ? (b.amount || 0) : (b.total_amount || 0); return txSortDir === 'asc' ? valA - valB : valB - valA;
                case 'account': valA = a.account_name || ''; valB = b.account_name || ''; return txSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'number': valA = a.invoice_number || a.quote_number || a.receipt_number || a.payment_number || ''; valB = b.invoice_number || b.quote_number || b.receipt_number || b.payment_number || ''; return txSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                default: valA = a.date ? new Date(a.date).getTime() : 0; valB = b.date ? new Date(b.date).getTime() : 0; return txSortDir === 'asc' ? valA - valB : valB - valA;
            }
        });
    };

    const getGroupedTransactionData = (data) => {
        if (txGroupBy === 'none') return [{ label: null, items: data }];
        const map = new Map();
        data.forEach(item => {
            let key = '—';
            if (txGroupBy === 'account') key = item.account_name || '—';
            else if (txGroupBy === 'status') key = item.status || item.payment_mode || '—';
            else if (txGroupBy === 'month' && item.date) { const d = new Date(item.date); key = isNaN(d.getTime()) ? '—' : d.toLocaleString('default', { month: 'long', year: 'numeric' }); }
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([label, items]) => ({ label, items }));
    };

    const filteredLedgers = activeTab === 'accounts' ? ledgers.filter(l => {
        const matchSearch = !searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'all' 
            ? true 
            : filterType === 'cash' 
                ? ['cash-in-hand', 'bank-accounts'].includes(l.type)
                : l.type === filterType;
        const matchGroup = filterGroup === 'all' || l.under === filterGroup;
        return matchSearch && matchType && matchGroup;
    }).sort((a, b) => {
        if (sortBy === 'balance') return (b.closing_balance || 0) - (a.closing_balance || 0);
        if (sortBy === 'jobs') return (b.jobs_done || 0) - (a.jobs_done || 0);
        return a.name.localeCompare(b.name);
    }) : [];

    const refreshGroups = async () => { try { const data = await accountGroupsAPI.getAll(); setGroups(data || []); } catch (err) { console.error(err); } };

    const handleFormSave = async (data) => {
        try {
            if (activeTab === 'accounts') {
                if (selectedTransaction?.id) {
                    await accountsAPI.update(selectedTransaction.id, data);
                } else {
                    const result = await accountsAPI.create(data);
                    // If properties were filled in the new account form, create them now
                    if (result?.id && data.properties?.length > 0) {
                        const validProps = data.properties.filter(p => p.address?.trim());
                        await Promise.all(validProps.map(prop =>
                            fetch('/api/admin/properties', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    flat_number: prop.flat_number || '',
                                    building_name: prop.building_name || '',
                                    address: prop.address,
                                    locality: prop.locality || '',
                                    city: prop.city || 'Mumbai',
                                    pincode: prop.pincode || '',
                                    property_type: prop.property_type || 'residential',
                                    customer_id: result.id,   // links to the new account
                                    force_create: false
                                })
                            }).then(r => r.json()).catch(e => console.error('Property save failed:', e))
                        ));
                    }
                }
            } else {
                const type = tabToTypeMap[activeTab];
                if (selectedTransaction?.id) await transactionsAPI.update(selectedTransaction.id, data, type);
                else await transactionsAPI.create(data, type);
            }
            const [ledgerRes, transRes] = await Promise.all([accountsAPI.getAll(), activeTab !== 'accounts' ? transactionsAPI.getAll({ type: tabToTypeMap[activeTab] }) : Promise.resolve(null)]);
            setLedgers(ledgerRes || []);
            if (transRes) { switch (activeTab) { case 'sales': setSalesInvoices(transRes || []); break; case 'purchases': setPurchaseInvoices(transRes || []); break; case 'quotations': setQuotations(transRes || []); break; case 'receipts': setReceipts(transRes || []); break; case 'payments': setPayments(transRes || []); break; } }
            alert(`${tabConfig[activeTab].label} saved successfully!`);
            setActiveForm(null);
            setSelectedTransaction(null);
        } catch (err) { alert(`Failed to save: ${err.message}`); }
    };

    const handleFormClose = () => { setActiveForm(null); setSelectedTransaction(null); };

    const handleUpdateAccount = async (updatedAccount) => {
        if (updatedAccount === 'deleted') { setLedgers(prev => prev.filter(l => l.id !== selectedAccount.id)); return; }
        try {
            const result = await accountsAPI.update(updatedAccount.id, updatedAccount);
            setLedgers(prev => prev.map(l => l.id === result.id ? result : l));
        } catch (err) { console.error(err); }
    };

    const chkStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 };

    const renderStatusBadge = (status) => {
        const colorMap = { Paid: ['rgba(16,185,129,.15)', '#10b981'], Pending: ['rgba(245,158,11,.15)', '#f59e0b'], Overdue: ['rgba(239,68,68,.15)', '#ef4444'], Draft: ['rgba(148,163,184,.15)', '#94a3b8'], Sent: ['rgba(99,102,241,.15)', '#6366f1'], Accepted: ['rgba(16,185,129,.15)', '#10b981'], Declined: ['rgba(239,68,68,.15)', '#ef4444'] };
        const [bg, c] = colorMap[status] || ['var(--bg-secondary)', 'var(--text-secondary)'];
        return <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, backgroundColor: bg, color: c }}>{status || '—'}</span>;
    };

    const renderTable = () => {
        if (tabLoading[activeTab]) return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Loading {activeTab}...</span>
                </div>
            </div>
        );

        if (activeTab === 'accounts') {
            const allSelected = filteredLedgers.length > 0 && selectedItems.size === filteredLedgers.length;
            return (
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {viewType === 'card' && <AccountsCardView accounts={filteredLedgers} onAccountClick={setSelectedAccount} />}
                    {viewType === 'kanban' && <AccountsKanbanView accounts={filteredLedgers} onAccountClick={setSelectedAccount} onAccountUpdate={handleUpdateAccount} />}
                    {viewType === 'details' && <AccountsDetailsView accounts={filteredLedgers} onAccountClick={setSelectedAccount} />}
                    {viewType === 'table' && (() => {
                        const activeCols = ACCOUNT_COLUMNS.filter(c => visibleColumns.has(c.id));
                        const getGroupName = (underId) => groups.find(g => g.id === underId)?.name || underId || '—';
                        const tdBase = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' };
                        const renderCell = (col, ledger) => {
                            switch (col.id) {
                                case 'sku':             return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={{ ...tdBase, color: 'var(--text-tertiary)' }}>{ledger.sku || '—'}</td>;
                                case 'type':            return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={tdBase}><span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>{ledger.type}</span></td>;
                                case 'group':           return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={{ ...tdBase, color: 'var(--text-secondary)' }}>{getGroupName(ledger.under)}</td>;
                                case 'opening_balance': return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(ledger.opening_balance || ledger.openingBalance || 0)}</td>;
                                case 'closing_balance': return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(ledger.closing_balance || ledger.closingBalance || 0)}</td>;
                                case 'jobs':            return <td key={col.id} onClick={() => setSelectedAccount(ledger)} style={{ ...tdBase, textAlign: 'center' }}>{ledger.jobs_done || ledger.jobsDone || 0}</td>;
                                case 'mobile':          return <td key={col.id} style={{ ...tdBase, color: 'var(--text-secondary)' }}>{ledger.mobile || '—'}</td>;
                                case 'email':           return <td key={col.id} style={{ ...tdBase, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ledger.email || '—'}</td>;
                                case 'gstin':           return <td key={col.id} style={{ ...tdBase, fontFamily: 'monospace' }}>{ledger.gstin || '—'}</td>;
                                case 'credit_limit':    return <td key={col.id} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace' }}>{ledger.credit_limit > 0 ? formatCurrency(ledger.credit_limit) : '—'}</td>;
                                case 'credit_period':   return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{ledger.credit_period > 0 ? `${ledger.credit_period}d` : '—'}</td>;
                                case 'status':          return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, backgroundColor: ledger.status === 'active' ? '#10b98115' : '#ef444415', color: ledger.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{ledger.status || 'active'}</span></td>;
                                case 'balance_type':    return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{ledger.balance_type?.toUpperCase() || '—'}</td>;
                                default: return null;
                            }
                        };
                        return (
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', width: '40px' }}>
                                        <input type="checkbox" style={chkStyle} checked={allSelected} onChange={() => toggleSelectAll(filteredLedgers)} />
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Ledger Name</th>
                                    {activeCols.map(col => <th key={col.id} style={{ padding: 'var(--spacing-sm)', textAlign: col.align, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{col.label}</th>)}
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLedgers.map(ledger => (
                                    <tr key={ledger.id}
                                        style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'default', transition: 'background-color var(--transition-fast)', backgroundColor: selectedItems.has(ledger.id) ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                                        onMouseEnter={e => { if (!selectedItems.has(ledger.id)) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                        onMouseLeave={e => { if (!selectedItems.has(ledger.id)) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            <input type="checkbox" style={chkStyle} checked={selectedItems.has(ledger.id)} onChange={e => toggleItem(ledger.id, e)} onClick={e => e.stopPropagation()} />
                                        </td>
                                        <td onClick={() => setSelectedAccount(ledger)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, cursor: 'pointer' }}>{ledger.name}</td>
                                        {activeCols.map(col => renderCell(col, ledger))}
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button title="New Receipt" onClick={e => { e.stopPropagation(); setActiveTab('receipts'); setActiveForm('receipt-voucher'); setSelectedTransaction({ account_id: ledger.id, account_name: ledger.name }); }} style={{ background: '#10b98115', border: 'none', borderRadius: '4px', color: '#10b981', padding: '4px', cursor: 'pointer' }}>Rec</button>
                                                <button title="New Payment" onClick={e => { e.stopPropagation(); setActiveTab('payments'); setActiveForm('payment-voucher'); setSelectedTransaction({ account_id: ledger.id, account_name: ledger.name }); }} style={{ background: '#ef444415', border: 'none', borderRadius: '4px', color: '#ef4444', padding: '4px', cursor: 'pointer' }}>Pay</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLedgers.length === 0 && <tr><td colSpan={activeCols.length + 3} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No accounts found.</td></tr>}
                            </tbody>
                        </table>
                        );
                    })()}
                </div>
            );
        }

        const processedData = getProcessedTransactionData();
        const groupedData = getGroupedTransactionData(processedData);
        const allSelected = processedData.length > 0 && selectedItems.size === processedData.length;

        if (txViewType === 'card') return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <TransactionsCardView items={processedData} activeTab={activeTab} groupBy={txGroupBy} onItemClick={handleTransactionClick} />
            </div>
        );

        const thStyle = { padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 };
        const thRight = { ...thStyle, textAlign: 'right' };
        const thCenter = { ...thStyle, textAlign: 'center' };

        return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                            <th style={{ ...thCenter, width: '40px' }}>
                                <input type="checkbox" style={chkStyle} checked={allSelected} onChange={() => toggleSelectAll(processedData)} />
                            </th>
                            {activeTab === 'sales' && <><th style={thStyle}>Invoice No</th><th style={thStyle}>Date</th><th style={thStyle}>Ledger Name</th><th style={thRight}>Amount</th><th style={thCenter}>Status</th></>}
                            {activeTab === 'purchases' && <><th style={thStyle}>Invoice No</th><th style={thStyle}>Date</th><th style={thStyle}>Supplier</th><th style={thRight}>Amount</th><th style={thCenter}>Status</th></>}
                            {activeTab === 'quotations' && <><th style={thStyle}>Quote No</th><th style={thStyle}>Date</th><th style={thStyle}>Customer</th><th style={thRight}>Amount</th><th style={thCenter}>Status</th></>}
                            {activeTab === 'receipts' && <><th style={thStyle}>Receipt No</th><th style={thStyle}>Date</th><th style={thStyle}>From Account</th><th style={thRight}>Amount</th><th style={thCenter}>Method</th></>}
                            {activeTab === 'payments' && <><th style={thStyle}>Payment No</th><th style={thStyle}>Date</th><th style={thStyle}>To Account</th><th style={thRight}>Amount</th><th style={thCenter}>Method</th></>}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(({ label, items }) => (
                            <>
                                {label !== null && (
                                    <tr key={`grp-${label}`}>
                                        <td colSpan={6} style={{ padding: '10px 12px 6px', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>▸ {label}</td>
                                    </tr>
                                )}
                                {items.map(item => (
                                    <tr key={item.id}
                                        style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', transition: 'background-color var(--transition-fast)', backgroundColor: selectedItems.has(item.id) ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                                        onMouseEnter={e => { if (!selectedItems.has(item.id)) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                        onMouseLeave={e => { if (!selectedItems.has(item.id)) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" style={chkStyle} checked={selectedItems.has(item.id)} onChange={e => toggleItem(item.id, e)} />
                                        </td>
                                        {activeTab === 'sales' && <><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, fontFamily: 'monospace' }}>{item.invoice_number}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.total_amount || 0)}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{renderStatusBadge(item.status)}</td></>}
                                        {activeTab === 'purchases' && <><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, fontFamily: 'monospace' }}>{item.invoice_number}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.total_amount || 0)}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{renderStatusBadge(item.status)}</td></>}
                                        {activeTab === 'quotations' && <><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, fontFamily: 'monospace' }}>{item.quote_number}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.total_amount || 0)}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{renderStatusBadge(item.status)}</td></>}
                                        {activeTab === 'receipts' && <><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, fontFamily: 'monospace' }}>{item.receipt_number}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.amount)}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', backgroundColor: 'var(--bg-secondary)', fontWeight: 500 }}>{item.payment_mode || 'Cash'}</span></td></>}
                                        {activeTab === 'payments' && <><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, fontFamily: 'monospace' }}>{item.payment_number}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.amount)}</td><td onClick={() => handleTransactionClick(item)} style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', backgroundColor: 'var(--bg-secondary)', fontWeight: 500 }}>{item.payment_mode || 'Cash'}</span></td></>}
                                    </tr>
                                ))}
                            </>
                        ))}
                        {processedData.length === 0 && <tr><td colSpan={6} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No records found.</td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Row 1: Header */}
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '100px' }}>Accounts</h2>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <AutocompleteSearch
                        placeholder={tabConfig[activeTab].searchPlaceholder}
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={getCurrentData()}
                        onSelect={item => setSearchTerm(activeTab === 'accounts' ? item.name : item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || '')}
                        searchKey={activeTab === 'accounts' ? 'name' : activeTab === 'quotations' ? 'quote_number' : activeTab === 'receipts' ? 'receipt_number' : activeTab === 'payments' ? 'payment_number' : 'invoice_number'}
                        renderSuggestion={item => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{activeTab === 'accounts' ? item.name : item.invoice_number || item.quote_number || item.receipt_number || item.payment_number}</span>
                                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{formatCurrency(item.total_amount || item.amount || 0)}</span>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{item.account_name || item.group}{item.date && ` • ${item.date}`}</div>
                            </div>
                        )}
                    />
                </div>

                <button className="btn btn-primary" onClick={handleCreateClick} style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}>
                    <Plus size={16} /> {tabConfig[activeTab].createButtonText}
                </button>
            </div>

            {/* Row 2: Sub-tabs */}
            <div style={{ padding: '0 var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: '0', overflowX: 'auto' }}>
                {Object.keys(tabConfig).map(tabKey => (
                    <button key={tabKey} onClick={() => handleTabChange(tabKey)} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === tabKey ? '2px solid var(--color-primary)' : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === tabKey ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === tabKey ? 600 : 400, fontSize: 'var(--font-size-sm)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {tabConfig[tabKey].label}
                    </button>
                ))}
            </div>

            {/* Row 3: Accounts toolbar */}
            {activeTab === 'accounts' && (
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[['card', Grid], ['table', TableIcon]].map(([type, Icon]) => (
                        <button key={type} onClick={() => setViewType(type)} style={{ padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: viewType === type ? '#6366f1' : '#334155', color: viewType === type ? 'white' : '#cbd5e1', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Icon size={16} />
                        </button>
                    ))}
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />
                    <div style={{ position: 'relative' }}>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            <option value="all">All Types</option>
                            <option value="customer">Customers</option>
                            <option value="supplier">Suppliers</option>
                            <option value="technician">Technicians</option>
                            <option value="cash">Cash/Bank</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            <option value="all">All Groups</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />
                    <div style={{ position: 'relative' }}>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            <option value="name">Sort: Name</option>
                            <option value="balance">Sort: Balance</option>
                            <option value="jobs">Sort: Jobs</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />
                    {/* Column Picker */}
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowColumnPicker(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: showColumnPicker ? '#6366f1' : '#334155', color: showColumnPicker ? 'white' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                            <SlidersHorizontal size={13} /> Columns
                        </button>
                        {showColumnPicker && (
                            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '10px 0', minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                                <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toggle Columns</div>
                                {ACCOUNT_COLUMNS.map(col => (
                                    <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 14px', cursor: 'pointer', fontSize: 13 }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => toggleColumn(col.id)}
                                            style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                                        {col.label}
                                    </label>
                                ))}
                                <div style={{ borderTop: '1px solid var(--border-primary)', margin: '8px 0 4px' }} />
                                <button onClick={() => setVisibleColumns(new Set(ACCOUNT_COLUMNS.filter(c => c.defaultOn).map(c => c.id)))} style={{ width: '100%', textAlign: 'left', padding: '5px 14px', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer' }}>Reset to defaults</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Row 4: Transaction toolbar */}
            {activeTab !== 'accounts' && (
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[{ type: 'table', Icon: TableIcon, title: 'Table' }, { type: 'card', Icon: Grid, title: 'Cards' }].map(({ type, Icon, title }) => (
                        <button key={type} onClick={() => setTxViewType(type)} style={{ padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: txViewType === type ? '#6366f1' : '#334155', color: txViewType === type ? 'white' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                            <Icon size={14} />{title}
                        </button>
                    ))}
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '18px', margin: '0 2px' }} />
                    <div style={{ position: 'relative' }}>
                        <Filter size={12} style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <select value={txFilterStatus} onChange={e => setTxFilterStatus(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 24px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            {(activeTab === 'receipts' || activeTab === 'payments') ? (<><option value="all">All Methods</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option></>) :
                                activeTab === 'quotations' ? (<><option value="all">All Status</option><option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Accepted">Accepted</option><option value="Declined">Declined</option></>) :
                                    (<><option value="all">All Status</option><option value="Draft">Draft</option><option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></>)}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Layers size={12} style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <select value={txGroupBy} onChange={e => setTxGroupBy(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 24px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            <option value="none">No Grouping</option>
                            <option value="account">Group: Account</option>
                            <option value="status">Group: Status</option>
                            <option value="month">Group: Month</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '18px', margin: '0 2px' }} />
                    <div style={{ position: 'relative' }}>
                        <ArrowUpDown size={12} style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <select value={txSortBy} onChange={e => setTxSortBy(e.target.value)} style={{ appearance: 'none', padding: '4px 24px 4px 24px', fontSize: 'var(--font-size-xs)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer' }}>
                            <option value="date">Sort: Date</option>
                            <option value="amount">Sort: Amount</option>
                            <option value="number">Sort: Ref No.</option>
                            <option value="account">Sort: Account</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    <button onClick={() => setTxSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '4px 10px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        {txSortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </button>
                </div>
            )}

            {/* Content */}
            {renderTable()}

            {/* Bulk Action Bar — floats at bottom when items selected */}
            {selectedItems.size > 0 && (
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100 }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
                        <CheckSquare size={14} style={{ display: 'inline', marginRight: '6px', color: '#6366f1' }} />
                        {selectedItems.size} selected
                    </span>
                    <button onClick={() => setSelectedItems(new Set())} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
                    <div style={{ width: '1px', height: '20px', backgroundColor: '#334155' }} />
                    <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: bulkDeleting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: bulkDeleting ? 0.7 : 1 }}>
                        {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                    </button>
                </div>
            )}

            {/* Modals & Forms */}
            {selectedAccount && <AccountDetailModal account={selectedAccount} groups={groups} onClose={() => setSelectedAccount(null)} onUpdate={handleUpdateAccount} />}
            {activeForm === 'sales-invoice' && <SalesInvoiceForm existingInvoice={selectedTransaction} onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'purchase-invoice' && <PurchaseInvoiceForm existingInvoice={selectedTransaction} onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'quotation' && <QuotationForm existingQuotation={selectedTransaction} onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'receipt-voucher' && <ReceiptVoucherForm existingReceipt={selectedTransaction} onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'payment-voucher' && <PaymentVoucherForm existingPayment={selectedTransaction} onSave={handleFormSave} onClose={handleFormClose} />}
            {activeForm === 'new-account' && <NewAccountForm onSave={handleFormSave} onClose={handleFormClose} groups={groups} onGroupCreated={refreshGroups} />}
        </div>
    );
}

export default AccountsTab;