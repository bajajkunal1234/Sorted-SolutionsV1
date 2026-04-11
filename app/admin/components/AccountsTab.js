'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Grid, Table as TableIcon, Loader2, Trash2, CheckSquare, SlidersHorizontal, Printer, Share2, List, Columns, Layers, RefreshCw, Edit2, Shield, Package } from 'lucide-react';
import AccountsSearchPanel from '@/components/shared/AccountsSearchPanel';
import { accountsAPI, transactionsAPI, accountGroupsAPI, amcAPI, rentalsAPI, printSettingsAPI } from '@/lib/adminAPI';
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
import TransactionsKanbanView from './accounts/TransactionsKanbanView';
import TransactionsListView from './accounts/TransactionsListView';
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';
import NewAMCForm from './reports/NewAMCForm';
import NewRentalForm from './reports/NewRentalForm';
import PrintAgreementModal from './reports/PrintAgreementModal';
import RentalDetailsModal from './reports/RentalDetailsModal';
import RentReceiptsModal from './reports/RentReceiptsModal';
import WhatsAppShareModal from './accounts/WhatsAppShareModal';

function AccountsTab({ customerToOpen, onCustomerOpened }) {
    const [activeTab, setActiveTab] = useState('accounts');

    const [ledgers, setLedgers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [salesInvoices, setSalesInvoices] = useState([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [amcSubscriptions, setAmcSubscriptions] = useState([]);
    const [amcPlans, setAmcPlans] = useState([]);
    const [rentalAgreements, setRentalAgreements] = useState([]);
    const [rentalPlans, setRentalPlans] = useState([]);
    const [showPrintAgreement, setShowPrintAgreement] = useState(false);
    const [selectedAgreementItem, setSelectedAgreementItem] = useState(null);
    const [selectedAgreementType, setSelectedAgreementType] = useState(null);
    const [showRentalDetails, setShowRentalDetails] = useState(false);
    const [selectedRentalForDetails, setSelectedRentalForDetails] = useState(null);
    const [showRentReceipts, setShowRentReceipts] = useState(false);
    const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
    const printSettingsRef = useRef(null);
    // WhatsApp share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareItem, setShareItem] = useState(null);
    const [shareTab, setShareTab] = useState(null);
    const [tabLoading, setTabLoading] = useState({ accounts: true, sales: false, purchases: false, quotations: false, receipts: false, payments: false, amc: false, rentals: false });
    const [error, setError] = useState(null);

    const tabToTypeMap = { sales: 'sales', purchases: 'purchase', quotations: 'quotation', receipts: 'receipt', payments: 'payment' };

    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [groupBy, setGroupBy] = useState('none');
    const [activeTags, setActiveTags] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const [txViewType, setTxViewType] = useState('table');
    const [txSortBy, setTxSortBy] = useState('date');
    const [txGroupBy, setTxGroupBy] = useState('none');
    const [txActiveTags, setTxActiveTags] = useState([]);

    // Saved views
    const [savedViews, setSavedViews] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);
    const [showColumnPicker, setShowColumnPicker] = useState(false);

    // Unique id generator
    const uid = () => Math.random().toString(36).slice(2, 9);

    // Fetch saved views once
    useEffect(() => {
        fetch('/api/admin/account-views').then(r => r.json()).then(d => { if (d.success) setSavedViews(d.data || []); }).catch(() => {});
    }, []);

    // -- Saved Views helpers ------------------------------------------
    const persistViews = async (views) => {
        setSavedViews(views);
        try { await fetch('/api/admin/account-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ views }) }); } catch (e) {}
    };

    const handleSaveNamedView = async (name) => {
        setSaveStatus('saving');
        const isAcc = activeTab === 'accounts';
        const config = isAcc
            ? { viewType, sortBy, groupBy, activeTags }
            : { txViewType, txSortBy, txGroupBy, txActiveTags };
        const existing = savedViews.find(v => v.tab === activeTab && v.name.toLowerCase() === name.toLowerCase());
        let updated;
        if (existing) {
            updated = savedViews.map(v => (v.tab === activeTab && v.name.toLowerCase() === name.toLowerCase()) ? { ...v, config } : v);
        } else {
            const isFirst = savedViews.filter(v => v.tab === activeTab).length === 0;
            updated = [...savedViews, { id: uid(), name, tab: activeTab, isDefault: isFirst, config }];
        }
        await persistViews(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const applyView = (view) => {
        const c = view.config || {};
        if (activeTab === 'accounts') {
            if (c.viewType)    setViewType(c.viewType);
            if (c.sortBy)      setSortBy(c.sortBy);
            if (c.groupBy)     setGroupBy(c.groupBy);
            if (c.activeTags)  setActiveTags(c.activeTags);
        } else {
            if (c.txViewType)   setTxViewType(c.txViewType);
            if (c.txSortBy)     setTxSortBy(c.txSortBy);
            if (c.txGroupBy)    setTxGroupBy(c.txGroupBy);
            if (c.txActiveTags) setTxActiveTags(c.txActiveTags);
        }
    };

    const deleteView = async (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        await persistViews(updated);
    };

    const setDefaultView = async (id) => {
        const updated = savedViews.map(v => ({ ...v, isDefault: v.id === id && v.tab === activeTab ? true : (v.tab === activeTab ? false : v.isDefault) }));
        await persistViews(updated);
    };

    const handleAddTag    = (tag) => activeTab === 'accounts' ? setActiveTags(p => [...p.filter(t => t.id !== tag.id), tag]) : setTxActiveTags(p => [...p.filter(t => t.id !== tag.id), tag]);
    const handleRemoveTag = (id)  => activeTab === 'accounts' ? setActiveTags(p => p.filter(t => t.id !== id)) : setTxActiveTags(p => p.filter(t => t.id !== id));

    const handleResetView = () => {
        if (activeTab === 'accounts') { setViewType('table'); setSortBy('name'); setGroupBy('none'); setActiveTags([]); setSearchTerm(''); }
        else { setTxViewType('table'); setTxSortBy('date'); setTxGroupBy('none'); setTxActiveTags([]); setSearchTerm(''); }
    };

    // Column picker
    const DEFAULT_CONFIG = {
        accounts: [
            { id: 'sku',             label: 'SKU',           align: 'left',   defaultOn: true  },
            { id: 'group',           label: 'Group',         align: 'left',   defaultOn: true  },
            { id: 'opening_balance', label: 'Opening Bal',   align: 'right',  defaultOn: true  },
            { id: 'closing_balance', label: 'Closing Bal',   align: 'right',  defaultOn: true  },
            { id: 'jobs',            label: 'Jobs',          align: 'center', defaultOn: true  },
            { id: 'source',          label: 'Created By',    align: 'left',   defaultOn: true  },
            { id: 'mobile',          label: 'Mobile',        align: 'left',   defaultOn: false },
            { id: 'email',           label: 'Email',         align: 'left',   defaultOn: false },
            { id: 'gstin',           label: 'GSTIN',         align: 'left',   defaultOn: false },
            { id: 'credit_limit',    label: 'Credit Limit',  align: 'right',  defaultOn: false },
            { id: 'credit_period',   label: 'Credit Period', align: 'center', defaultOn: false },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: false },
            { id: 'balance_type',    label: 'Bal Type',      align: 'center', defaultOn: false },
            { id: 'is_claimed',      label: 'Claimed',       align: 'center', defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        sales: [
            { id: 'number',          label: 'Invoice No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Ledger Name',   align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        purchases: [
            { id: 'number',          label: 'Invoice No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Supplier',      align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        quotations: [
            { id: 'number',          label: 'Quote No',      align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        receipts: [
            { id: 'number',          label: 'Receipt No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'From Account',  align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Method',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        payments: [
            { id: 'number',          label: 'Payment No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'To Account',    align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Method',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        amc: [
            { id: 'plan_name',       label: 'Plan',          align: 'left',   defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'product',         label: 'Product',       align: 'left',   defaultOn: true },
            { id: 'start_date',      label: 'Start',         align: 'center', defaultOn: true },
            { id: 'end_date',        label: 'End',           align: 'center', defaultOn: true },
            { id: 'amc_amount',      label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ],
        rentals: [
            { id: 'product_name',    label: 'Product',       align: 'left',   defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'monthly_rent',    label: 'Monthly Rent',  align: 'right',  defaultOn: true },
            { id: 'start_date',      label: 'Start',         align: 'center', defaultOn: true },
            { id: 'next_due',        label: 'Next Due',      align: 'center', defaultOn: true },
            { id: 'security_deposit',label: 'Deposit',       align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_at',      label: 'Created On',    align: 'center', defaultOn: true }
        ]
    };

    const [tabColumns, setTabColumns] = useState(DEFAULT_CONFIG);
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        for (const tab in DEFAULT_CONFIG) {
            initial[tab] = new Set(DEFAULT_CONFIG[tab].filter(c => c.defaultOn).map(c => c.id));
        }
        return initial;
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem('accounts_configurable_tables');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    
                    if (parsed.tabColumns) {
                        // Smart merge to preserve user sorting but inject new schema columns
                        const mergedColumns = {};
                        for (const tab in DEFAULT_CONFIG) {
                            if (!parsed.tabColumns[tab]) {
                                mergedColumns[tab] = DEFAULT_CONFIG[tab];
                            } else {
                                const savedTab = parsed.tabColumns[tab];
                                const savedIds = new Set(savedTab.map(c => c.id));
                                const newCols = DEFAULT_CONFIG[tab].filter(c => !savedIds.has(c.id));
                                mergedColumns[tab] = [...savedTab, ...newCols];
                            }
                        }
                        setTabColumns(mergedColumns);
                    }
                    
                    if (parsed.visibleColumns) {
                        const hydratedVis = {};
                        for (const tab in DEFAULT_CONFIG) {
                            const savedArray = parsed.visibleColumns[tab] || [];
                            const savedSet = new Set(savedArray);
                            
                            // Ensure new columns added to codebase that are defaultOn get turned on
                            if (parsed.tabColumns && parsed.tabColumns[tab]) {
                                const savedIds = new Set(parsed.tabColumns[tab].map(c => c.id));
                                DEFAULT_CONFIG[tab].forEach(c => {
                                    if (!savedIds.has(c.id) && c.defaultOn) {
                                        savedSet.add(c.id);
                                    }
                                });
                            }
                            hydratedVis[tab] = savedSet;
                        }
                        setVisibleColumns(hydratedVis);
                    }
                }
            } catch(e) {}
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const serializedVis = {};
            for (const tab in visibleColumns) {
                serializedVis[tab] = Array.from(visibleColumns[tab]);
            }
            if (typeof window !== "undefined") {
                localStorage.setItem('accounts_configurable_tables', JSON.stringify({ tabColumns, visibleColumns: serializedVis }));
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [tabColumns, visibleColumns]);



    const toggleColumn = (tab, id) => {
        setVisibleColumns(prev => {
            const n = new Set(prev[tab]);
            n.has(id) ? n.delete(id) : n.add(id);
            return { ...prev, [tab]: n };
        });
    };

    const moveColumn = (tab, index, direction) => {
        setTabColumns(prev => {
            const cols = [...prev[tab]];
            if (direction === -1 && index > 0) {
                [cols[index - 1], cols[index]] = [cols[index], cols[index - 1]];
            } else if (direction === 1 && index < cols.length - 1) {
                [cols[index], cols[index + 1]] = [cols[index + 1], cols[index]];
            }
            return { ...prev, [tab]: cols };
        });
    };

    const resetColumnsToDefault = (tab) => {
        setTabColumns(prev => ({ ...prev, [tab]: DEFAULT_CONFIG[tab] }));
        setVisibleColumns(prev => ({ ...prev, [tab]: new Set(DEFAULT_CONFIG[tab].filter(c => c.defaultOn).map(c => c.id)) }));
    };

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
                } else if (activeTab === 'amc') {
                    const [subscriptions, plans] = await Promise.all([amcAPI.getActive(), amcAPI.getPlans()]);
                    setAmcSubscriptions(subscriptions || []);
                    setAmcPlans(plans || []);
                } else if (activeTab === 'rentals') {
                    const [agreements, plans] = await Promise.all([rentalsAPI.getActive(), rentalsAPI.getPlans()]);
                    setRentalAgreements(agreements || []);
                    setRentalPlans(plans || []);
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

    // Fetch print settings once on mount for use in print output
    useEffect(() => {
        printSettingsAPI.get().then(d => { if (d) printSettingsRef.current = d; }).catch(() => {});
    }, []);

    useEffect(() => {
        if (customerToOpen && ledgers.length > 0) {
            const customerAccount = ledgers.find(l => l.name === customerToOpen.name || l.id === customerToOpen.id);
            if (customerAccount) setSelectedAccount(customerAccount);
            if (onCustomerOpened) onCustomerOpened();
        }
    }, [customerToOpen, ledgers, onCustomerOpened]);

    const tabConfig = {
        accounts:   { label: 'Accounts',   searchPlaceholder: 'Search Ledgers...',          createButtonText: 'Create Account',          formType: 'new-account' },
        sales:      { label: 'Sales',       searchPlaceholder: 'Search Sales Invoices...',   createButtonText: 'Create Sales Invoice',     formType: 'sales-invoice' },
        purchases:  { label: 'Purchases',   searchPlaceholder: 'Search Purchase Invoices...', createButtonText: 'Create Purchase Invoice',  formType: 'purchase-invoice' },
        quotations: { label: 'Quotations',  searchPlaceholder: 'Search Quotations...',       createButtonText: 'Create Quotation',         formType: 'quotation' },
        receipts:   { label: 'Receipts',    searchPlaceholder: 'Search Receipts...',         createButtonText: 'Create Receipt Voucher',   formType: 'receipt-voucher' },
        payments:   { label: 'Payments',    searchPlaceholder: 'Search Payments...',         createButtonText: 'Create Payment Voucher',   formType: 'payment-voucher' },
        amc:        { label: 'AMC',         searchPlaceholder: 'Search AMC Subscriptions...', createButtonText: 'New AMC Subscription',    formType: 'amc-subscription' },
        rentals:    { label: 'Rentals',     searchPlaceholder: 'Search Rental Agreements...', createButtonText: 'New Rental Agreement',    formType: 'rental-agreement' },
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchTerm('');
        setSortBy('name');
        setGroupBy('none');
        setActiveTags([]);
        setViewType('table');
        setTxViewType('table');
        setTxSortBy('date');
        setTxGroupBy('none');
        setTxActiveTags([]);
        setSelectedItems(new Set());
        setShowColumnPicker(false);
        // Apply default view if one exists for this tab
        const defView = savedViews.find(v => v.tab === newTab && v.isDefault);
        if (defView) setTimeout(() => applyView(defView), 0);
    };

    const handleCreateClick = () => { setSelectedTransaction(null); setActiveForm(tabConfig[activeTab].formType); };
    const handleTransactionClick = (transaction) => { setSelectedTransaction(transaction); setActiveForm(tabConfig[activeTab].formType); };

    // Opens an account detail modal and logs the view interaction
    const handleOpenAccount = (account) => {
        setSelectedAccount(account);
        // Fire-and-forget view log
        fetch('/api/admin/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'account-viewed',
                category: 'account',
                customer_id: account.id,
                customer_name: account.name,
                performed_by_name: 'Admin',
                description: `Admin opened account record — ${account.name} (SKU: ${account.sku || 'N/A'})`,
                source: 'Admin App',
            }),
        }).catch(() => {}); // silent — never block the UI for a log call
    };

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
                    failed.push({
                        name,
                        error: result.reason?.message || 'Unknown error',
                        blocking: result.reason?.blocking || null,  // rich dependency info
                    });
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
                    if (f.blocking && f.blocking.length > 0) {
                        // Rich structured dependency info from API
                        const depLines = f.blocking.map(b => {
                            const records = b.records?.join(', ') || '';
                            const action = b.action ? `\n     → ${b.action}` : '';
                            return `  • ${b.type} (${b.records?.length || 0}): ${records}${action}`;
                        }).join('\n');
                        return `\n❌ "${f.name}" cannot be deleted — clear these first:\n${depLines}`;
                    }
                    return `\n❌ "${f.name}": ${f.error}`;
                }).join('\n');
                alert(
                    `${successCount > 0 ? `✅ ${successCount} deleted.\n` : ''}` +
                    failLines
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

    // Apply activeTags filter conditions to transaction data
    const applyTxTags = (data, tags) => {
        let result = [...data];
        for (const tag of tags) {
            if (tag.type === 'preset' && tag.filter) {
                const f = tag.filter;
                if (f.status)       result = result.filter(i => i.status === f.status);
                if (f.payment_mode) result = result.filter(i => (i.payment_mode || 'Cash') === f.payment_mode);
            } else if (tag.type === 'custom' && tag.conditions) {
                for (const cond of tag.conditions) {
                    result = result.filter(item => {
                        const getAmt = i => i.total_amount || i.amount || 0;
                        let fv = '';
                        switch (cond.field) {
                            case 'account_name': fv = item.account_name || ''; break;
                            case 'status':       fv = item.status || ''; break;
                            case 'payment_mode': fv = item.payment_mode || ''; break;
                            case 'date_from':    return !cond.value || (item.date && new Date(item.date) >= new Date(cond.value));
                            case 'date_to':      return !cond.value || (item.date && new Date(item.date) <= new Date(cond.value));
                            case 'amount_min':   return !cond.value || getAmt(item) >= parseFloat(cond.value);
                            case 'amount_max':   return !cond.value || getAmt(item) <= parseFloat(cond.value);
                            case 'reference':    fv = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || ''; break;
                            default:             return true;
                        }
                        const v = (cond.value || '').toLowerCase(), val = fv.toLowerCase();
                        switch (cond.operator) {
                            case 'is':           return val === v;
                            case 'is_not':       return val !== v;
                            case 'contains':     return val.includes(v);
                            case 'not_contains': return !val.includes(v);
                            default:             return true;
                        }
                    });
                }
            }
        }
        return result;
    };

    const applyAccTags = (data, tags) => {
        let result = [...data];
        for (const tag of tags) {
            if (tag.type === 'preset' && tag.filter) {
                const f = tag.filter;
                if (f.type) result = result.filter(l => f.type === 'cash' ? ['cash-in-hand','bank-accounts'].includes(l.type) : l.type === f.type);
                if (f.has_balance === 'yes') result = result.filter(l => (l.closing_balance || l.closingBalance || 0) !== 0);
            } else if (tag.type === 'custom' && tag.conditions) {
                for (const cond of tag.conditions) {
                    result = result.filter(l => {
                        let fv = '';
                        switch (cond.field) {
                            case 'account_name': fv = l.name || ''; break;
                            case 'type':         fv = l.type || ''; break;
                            case 'group':        fv = l.under || ''; break;
                            case 'has_balance':  return cond.value === 'yes' ? (l.closing_balance || l.closingBalance || 0) !== 0 : (l.closing_balance || l.closingBalance || 0) === 0;
                            default:             return true;
                        }
                        const v = (cond.value || '').toLowerCase(), val = fv.toLowerCase();
                        switch (cond.operator) {
                            case 'is':           return val === v;
                            case 'is_not':       return val !== v;
                            case 'contains':     return val.includes(v);
                            case 'not_contains': return !val.includes(v);
                            default:             return true;
                        }
                    });
                }
            }
        }
        return result;
    };

    const getProcessedTransactionData = () => {
        let data = getFilteredData();
        // Apply tag-based filters
        data = applyTxTags(data, txActiveTags);
        return [...data].sort((a, b) => {
            const isVoucher = activeTab === 'receipts' || activeTab === 'payments';
            switch (txSortBy) {
                case 'amount':    case 'amount_asc': { const va = isVoucher ? (a.amount||0):(a.total_amount||0), vb = isVoucher ? (b.amount||0):(b.total_amount||0); return txSortBy === 'amount_asc' ? va-vb : vb-va; }
                case 'account':  { const va = a.account_name||'', vb = b.account_name||''; return va.localeCompare(vb); }
                case 'number':   { const va = a.invoice_number||a.quote_number||a.receipt_number||a.payment_number||'', vb = b.invoice_number||b.quote_number||b.receipt_number||b.payment_number||''; return va.localeCompare(vb); }
                case 'date_asc': { const va = a.date?new Date(a.date).getTime():0, vb = b.date?new Date(b.date).getTime():0; return va-vb; }
                default:         { const va = a.date?new Date(a.date).getTime():0, vb = b.date?new Date(b.date).getTime():0; return vb-va; } // newest first
            }
        });
    };

    const filteredLedgers = activeTab === 'accounts' ? (() => {
        let data = ledgers;
        if (searchTerm) data = data.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
        data = applyAccTags(data, activeTags);
        return [...data].sort((a, b) => {
            if (sortBy === 'balance_desc') return (b.closing_balance||b.closingBalance||0) - (a.closing_balance||a.closingBalance||0);
            if (sortBy === 'balance_asc')  return (a.closing_balance||a.closingBalance||0) - (b.closing_balance||b.closingBalance||0);
            if (sortBy === 'jobs')         return (b.jobs_done||b.jobsDone||0) - (a.jobs_done||a.jobsDone||0);
            if (sortBy === 'opening_desc') return (b.opening_balance||b.openingBalance||0) - (a.opening_balance||a.openingBalance||0);
            if (sortBy === 'name_desc')    return b.name.localeCompare(a.name);
            if (sortBy === 'updated_desc') return new Date(b.updated_at||0) - new Date(a.updated_at||0);
            return a.name.localeCompare(b.name);
        });
    })() : [];

    // Group processed transaction data for the table view
    const getGroupedTransactionData = (data) => {
        if (txGroupBy === 'none') return [{ label: null, items: data }];
        const map = new Map();
        data.forEach(item => {
            let key = '—';
            if (txGroupBy === 'account') key = item.account_name || '—';
            else if (txGroupBy === 'status') key = item.status || item.payment_mode || '—';
            else if (txGroupBy === 'month' && item.date) {
                const d = new Date(item.date);
                key = isNaN(d.getTime()) ? '—' : d.toLocaleString('default', { month: 'long', year: 'numeric' });
            }
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.entries())
            .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
            .map(([label, items]) => ({ label, items }));
    };

    const refreshGroups = async () => { try { const data = await accountGroupsAPI.getAll(); setGroups(data || []); } catch (err) { console.error(err); } };

    const handleFormSave = async (data, action) => {
        try {
            if (activeTab === 'accounts') {
                if (selectedTransaction?.id) {
                    await accountsAPI.update(selectedTransaction.id, data);
                } else {
                    const result = await accountsAPI.create(data);
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
                                    latitude: prop.lat || null,
                                    longitude: prop.lng || null,
                                    customer_id: result.id,
                                    force_create: false
                                })
                            }).then(r => r.json()).catch(e => console.error('Property save failed:', e))
                        ));
                    }
                }
            } else {
                const formToTypeMap = {
                    'sales-invoice': 'sales',
                    'purchase-invoice': 'purchase',
                    'quotation': 'quotation',
                    'receipt-voucher': 'receipt',
                    'payment-voucher': 'payment'
                };
                // Priority: payload flag > activeForm state > activeTab state
                const type = data.__formType || formToTypeMap[activeForm] || tabToTypeMap[activeTab];

                // Strip fields not in DB (internal flags, UI state, and invoice-specific GST columns for receipt/payment tables)
                const cleanData = { ...data };
                delete cleanData.__formType;
                delete cleanData.billing_address;
                delete cleanData.shipping_address;
                delete cleanData.charges;
                if (type === 'receipt' || type === 'payment') {
                    delete cleanData.cgst;
                    delete cleanData.sgst;
                    delete cleanData.igst;
                    delete cleanData.total_tax;
                    delete cleanData.items_subtotal;
                    delete cleanData.charges_total;
                    delete cleanData.items;
                }

                if (selectedTransaction?.id) await transactionsAPI.update(selectedTransaction.id, cleanData, type);
                else await transactionsAPI.create(cleanData, type);
            }

            // ✅ Save succeeded — close form and notify user immediately
            alert(`${tabConfig[activeTab]?.label || 'Record'} saved successfully!`);
            setActiveForm(null);
            setSelectedTransaction(null);

            // Trigger print if requested
            if (action === 'print' && data) {
                setTimeout(() => handlePrintItem(data, activeTab), 300);
            }

            // Refresh data in the background — errors here don't matter for the user
            try {
                const type2 = data?.__formType || tabToTypeMap[activeTab];
                const tabKey = { sales: 'sales', purchase: 'purchases', quotation: 'quotations', receipt: 'receipts', payment: 'payments' }[type2] || activeTab;
                const [transRes2, ledgerRes] = await Promise.all([
                    type2 && !['amc', 'rentals', 'accounts'].includes(tabKey) ? transactionsAPI.getAll({ type: type2 }) : Promise.resolve(null),
                    accountsAPI.getAll()
                ]);
                if (ledgerRes) setLedgers(ledgerRes);
                if (transRes2) {
                    switch (tabKey) {
                        case 'sales': setSalesInvoices(transRes2); break;
                        case 'purchases': setPurchaseInvoices(transRes2); break;
                        case 'quotations': setQuotations(transRes2); break;
                        case 'receipts': setReceipts(transRes2); break;
                        case 'payments': setPayments(transRes2); break;
                    }
                }
            } catch (refreshErr) {
                console.warn('Post-save data refresh failed (save was successful):', refreshErr.message);
            }
        } catch (err) { alert(`Failed to save: ${err.message}`); }
    };

    // Print a beautifully branded invoice/quotation using Print Setup settings
    const handlePrintItem = (item, tab) => {
        const ref         = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
        const acct        = item.account_name || '';
        const date        = item.date ? new Date(item.date).toLocaleDateString('en-GB') : '';
        const amount      = item.total_amount || item.amount || 0;
        const itemsList   = Array.isArray(item.items) ? item.items : [];

        const ps            = printSettingsRef.current || {};
        const companyName   = ps.company_name    || 'Your Company';
        const companyAddr   = ps.company_address || '';
        const companyPhone  = ps.company_phone   || '';
        const companyEmail  = ps.company_email   || '';
        const companyGstin  = ps.gst_number      || '';   // fixed: was ps.gstin
        const showLogo      = ps.show_logo !== false;
        const logoUrl       = showLogo && ps.logo_url ? ps.logo_url : null;
        const showGST       = ps.show_gst !== false;
        const showTerms     = ps.show_terms !== false;
        const showSig       = ps.include_signature !== false;
        const tStyle        = ps.template_style  || 'modern-boxes';
        const fontSize      = ps.font_size === 'small' ? '12px' : ps.font_size === 'large' ? '16px' : '14px';
        const paperSize     = ps.paper_size      || 'A4';
        const gstB          = ps.gst_breakdown   || { showCGST: true, showSGST: true, showIGST: false, cgstRate: 9, sgstRate: 9, igstRate: 18 };

        // Pick T&C based on tab
        const termsMap = { sales: 'invoice_terms', purchases: 'invoice_terms', quotations: 'quotation_terms', rentals: 'rental_terms', amc: 'amc_terms' };
        const terms = Array.isArray(ps[termsMap[tab] || 'invoice_terms']) ? ps[termsMap[tab] || 'invoice_terms'] : [];

        const docTitle  = tab === 'quotations' ? 'QUOTATION' : tab === 'purchases' ? 'PURCHASE INVOICE' : 'TAX INVOICE';
        const pageSize  = paperSize === 'A5' ? 'A5' : paperSize === 'Letter' ? 'letter' : 'A4';
        const themeColor  = tStyle === 'modern-boxes' ? '#1e293b' : tStyle === 'classic-lines' ? '#374151' : tStyle === 'minimal-clean' ? '#6366f1' : '#1e40af';
        const accentColor = tStyle === 'modern-boxes' ? '#6366f1' : tStyle === 'minimal-clean' ? '#6366f1' : '#10b981';
        const darkHeader  = tStyle === 'modern-boxes';
        const headerBg    = darkHeader ? themeColor : '#ffffff';
        const headerText  = darkHeader ? '#ffffff' : '#1e293b';
        const headerSub   = darkHeader ? 'rgba(255,255,255,0.72)' : '#64748b';
        const headerBorder= darkHeader ? 'none' : `3px solid ${themeColor}`;

        const subtotal = item.items_subtotal || itemsList.reduce((s, it) => s + parseFloat(it.total || it.amount || 0), 0);

        const rows = itemsList.map((it, i) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${it.description || it.name || ''}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;color:#64748b">${it.hsn || ''}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${it.qty || it.quantity || 1}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">&#8377;${Number(it.rate || it.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b">${it.taxRate || it.tax_rate || 0}%</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">&#8377;${Number(it.total || it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>`).join('');

        const cgstAmt = item.cgst > 0 ? item.cgst : (gstB.showCGST ? subtotal * gstB.cgstRate / 100 : 0);
        const sgstAmt = item.sgst > 0 ? item.sgst : (gstB.showSGST ? subtotal * gstB.sgstRate / 100 : 0);
        const igstAmt = item.igst > 0 ? item.igst : (gstB.showIGST ? subtotal * gstB.igstRate / 100 : 0);

        const taxRows = showGST ? [
            (gstB.showCGST || item.cgst > 0) ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">CGST (${gstB.cgstRate}%)</td><td style="padding:6px 0;text-align:right;font-size:13px">&#8377;${cgstAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>` : '',
            (gstB.showSGST || item.sgst > 0) ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">SGST (${gstB.sgstRate}%)</td><td style="padding:6px 0;text-align:right;font-size:13px">&#8377;${sgstAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>` : '',
            (gstB.showIGST || item.igst > 0) ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">IGST (${gstB.igstRate}%)</td><td style="padding:6px 0;text-align:right;font-size:13px">&#8377;${igstAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>` : ''
        ].join('') : '';

        const termsHtml = showTerms && terms.length > 0 ? `
            <div style="margin:20px 32px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:8px">Terms & Conditions</div>
              <ol style="margin:0;padding-left:16px;font-size:11px;color:#475569;line-height:1.7">${terms.map(t => `<li style="margin-bottom:3px">${t}</li>`).join('')}</ol>
            </div>` : '';

        const sigHtml = showSig ? `
            <div style="display:flex;justify-content:space-between;padding:0 32px;margin-top:32px">
              <div style="text-align:center"><div style="width:180px;height:54px;border-bottom:1px solid #cbd5e1;margin-bottom:8px"></div><div style="font-size:12px;font-weight:600">Customer Signature</div></div>
              <div style="text-align:center"><div style="width:180px;height:54px;border-bottom:1px solid #cbd5e1;margin-bottom:8px"></div><div style="font-size:12px;font-weight:600">For ${companyName}</div><div style="font-size:10px;color:#94a3b8">Authorized Signatory</div></div>
            </div>` : '';

        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${docTitle} – ${ref}</title>
<style>
  @page { size: ${pageSize}; margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: ${fontSize}; }
  table { border-collapse: collapse; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div style="background:${headerBg};padding:24px 32px;border-bottom:${headerBorder};display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:50px;max-width:160px;object-fit:contain;margin-bottom:10px;display:block">` : ''}
    <div style="font-size:20px;font-weight:800;color:${headerText}">${companyName}</div>
    ${companyAddr  ? `<div style="font-size:11px;color:${headerSub};margin-top:4px;white-space:pre-wrap;line-height:1.5">${companyAddr}</div>` : ''}
    <div style="font-size:11px;color:${headerSub};margin-top:4px">${[companyPhone, companyEmail].filter(Boolean).join(' · ')}</div>
    ${showGST && companyGstin ? `<div style="font-size:10px;color:${headerSub};margin-top:3px;font-family:monospace">GSTIN: ${companyGstin}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:24px;font-weight:900;color:${darkHeader ? '#fff' : accentColor};letter-spacing:1px">${docTitle}</div>
    <div style="margin-top:10px;font-size:12px;color:${darkHeader ? 'rgba(255,255,255,0.7)' : '#64748b'}">
      <div>Ref: <strong style="color:${darkHeader ? '#fff' : '#1e293b'}">${ref}</strong></div>
      <div style="margin-top:3px">Date: ${date}</div>
    </div>
  </div>
</div>
<div style="padding:14px 32px;background:${tStyle === 'minimal-clean' ? '#f9fafb' : '#fff'};border-bottom:1px solid #e2e8f0">
  <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:5px">Bill To</div>
  <div style="font-size:15px;font-weight:700">${acct}</div>
</div>
<div style="padding:0 32px;margin-top:20px">
  <table style="width:100%">
    <thead><tr style="background:${darkHeader ? themeColor : '#f1f5f9'};color:${darkHeader ? '#fff' : '#334155'}">
      <th style="padding:10px 12px;text-align:left;font-size:12px">#</th>
      <th style="padding:10px 12px;text-align:left;font-size:12px">Description</th>
      <th style="padding:10px 12px;text-align:center;font-size:12px">HSN/SAC</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px">Rate (₹)</th>
      <th style="padding:10px 12px;text-align:center;font-size:12px">Tax%</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px">Amount (₹)</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8">No items found</td></tr>`}</tbody>
  </table>
</div>
<div style="padding:0 32px;margin-top:16px;display:flex;justify-content:flex-end">
  <table style="width:280px">
    <tr style="border-top:1px solid #e2e8f0"><td style="padding:7px 0;color:#64748b;font-size:13px">Subtotal</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:600">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
    ${taxRows}
    <tr style="border-top:2px solid ${themeColor}">
      <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:${themeColor}">Grand Total</td>
      <td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:900;color:${accentColor}">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr><td colspan="2" style="font-size:10px;color:#94a3b8;text-align:right;padding-top:2px">All amounts in Indian Rupees (INR)</td></tr>
  </table>
</div>
${item.notes ? `<div style="margin:20px 32px;padding:12px;background:#f8fafc;border-left:3px solid ${accentColor};font-size:12px;color:#475569"><strong>Notes:</strong> ${item.notes}</div>` : ''}
${termsHtml}
${sigHtml}
<div style="margin-top:32px;border-top:1px solid #e2e8f0;padding:12px 32px;text-align:center;font-size:10px;color:#94a3b8">
  This is a computer-generated document &nbsp;|&nbsp; ${companyName} · ${companyPhone} · ${companyEmail}
</div>
<script>window.onload = () => { setTimeout(() => window.print(), 400); }<\/script>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    };

    // Share via WhatsApp — open the rich share modal
    const handleShareItem = (item, tab) => {
        setShareItem(item);
        setShareTab(tab);
        setShowShareModal(true);
    };

    const handleDeleteTransaction = async (item, tab) => {
        const ref = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
        if (!window.confirm(`Delete ${ref}? This cannot be undone.`)) return;
        const type = tabToTypeMap[tab];
        try {
            await transactionsAPI.delete(item.id, type);
            // Remove from local state
            const setters = { sales: setSalesInvoices, purchases: setPurchaseInvoices, quotations: setQuotations, receipts: setReceipts, payments: setPayments };
            const setter = setters[tab];
            if (setter) setter(prev => prev.filter(r => r.id !== item.id));
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    };

    const handleFormClose = () => { setActiveForm(null); setSelectedTransaction(null); };

    const handleUpdateAccount = async (updatedAccount) => {
        if (updatedAccount === 'deleted') {
            // Re-fetch from server instead of optimistic filter to avoid ghost accounts
            try {
                const data = await accountsAPI.getAll();
                setLedgers(data || []);
            } catch (e) {
                // Fallback to optimistic remove if fetch fails
                setLedgers(prev => prev.filter(l => l.id !== selectedAccount.id));
            }
            return;
        }
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
                    {viewType === 'card' && <AccountsCardView accounts={filteredLedgers} onAccountClick={handleOpenAccount} />}
                    {viewType === 'kanban' && <AccountsKanbanView accounts={filteredLedgers} onAccountClick={handleOpenAccount} onAccountUpdate={handleUpdateAccount} />}
                    {viewType === 'details' && <AccountsDetailsView accounts={filteredLedgers} onAccountClick={handleOpenAccount} />}
                    {viewType === 'table' && (() => {
                        const activeCols = tabColumns.accounts.filter(c => visibleColumns.accounts.has(c.id));
                        const getGroupName = (underId) => groups.find(g => g.id === underId)?.name || underId || '—';
                        const tdBase = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' };
                        const renderCell = (col, ledger) => {
                            switch (col.id) {
                                case 'sku':             return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={{ ...tdBase, color: 'var(--text-tertiary)' }}>{ledger.sku || '—'}</td>;
                                case 'type':            return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={tdBase}><span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>{ledger.type}</span></td>;
                                case 'group':           return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={{ ...tdBase, color: 'var(--text-secondary)' }}>{getGroupName(ledger.under)}</td>;
                                case 'opening_balance': return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(ledger.opening_balance || ledger.openingBalance || 0)}</td>;
                                case 'closing_balance': return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(ledger.closing_balance || ledger.closingBalance || 0)}</td>;
                                case 'jobs':            return <td key={col.id} onClick={() => handleOpenAccount(ledger)} style={{ ...tdBase, textAlign: 'center' }}>{ledger.jobs_done || ledger.jobsDone || 0}</td>;
                                case 'source': {
                                    const src = ledger.source || 'Admin';
                                    const isAdmin = src.toLowerCase().includes('admin');
                                    let badge;
                                    
                                    if (isAdmin) {
                                        badge = { icon: '🛡️', label: 'Admin Created', bg: '#6366f115', color: '#6366f1' };
                                    } else {
                                        badge = { icon: '👤', label: 'Customer Signup', bg: '#10b98115', color: '#10b981' };
                                    }

                                    return (
                                        <td key={col.id} style={tdBase}>
                                            <span onClick={() => handleOpenAccount(ledger)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, backgroundColor: badge.bg, color: badge.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {badge.icon} {badge.label}
                                            </span>
                                        </td>
                                    );
                                }
                                case 'mobile':          return <td key={col.id} style={{ ...tdBase, color: 'var(--text-secondary)' }}>{ledger.mobile || '—'}</td>;
                                case 'email':           return <td key={col.id} style={{ ...tdBase, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ledger.email || '—'}</td>;
                                case 'gstin':           return <td key={col.id} style={{ ...tdBase, fontFamily: 'monospace' }}>{ledger.gstin || '—'}</td>;
                                case 'credit_limit':    return <td key={col.id} style={{ ...tdBase, textAlign: 'right', fontFamily: 'monospace' }}>{ledger.credit_limit > 0 ? formatCurrency(ledger.credit_limit) : '—'}</td>;
                                case 'credit_period':   return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{ledger.credit_period > 0 ? `${ledger.credit_period}d` : '—'}</td>;
                                case 'status':          return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, backgroundColor: ledger.status === 'active' ? '#10b98115' : '#ef444415', color: ledger.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{ledger.status || 'active'}</span></td>;
                                case 'balance_type':    return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{ledger.balance_type?.toUpperCase() || '—'}</td>;
                                case 'is_claimed': {
                                    const isCust = ledger.type === 'customer' || ledger.under?.toLowerCase().includes('customer') || ledger.under?.toLowerCase().includes('debtor');
                                    if (!isCust) return <td key={col.id} style={{ ...tdBase, textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>;
                                    return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{ledger.is_claimed ? <span style={{ color: '#10b981', fontWeight: 600 }}>Yes</span> : <span style={{ color: '#ef4444', fontWeight: 600 }}>No</span>}</td>;
                                }
                                case 'created_at': {
                                    const d = ledger.created_at ? new Date(ledger.created_at) : null;
                                    return <td key={col.id} style={{ ...tdBase, textAlign: 'center' }}>{d ? `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}` : '—'}</td>;
                                }
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
                                {filteredLedgers.map(ledger => {
                                    const isNewOrganic = ledger.source === 'Customer Signup' && new Date(ledger.created_at) > new Date(Date.now() - 48 * 60 * 60 * 1000);
                                    const rowBg = selectedItems.has(ledger.id) ? 'rgba(99,102,241,0.08)' : (isNewOrganic ? 'rgba(16,185,129,0.05)' : 'transparent');
                                    return (
                                    <tr key={ledger.id}
                                        style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'default', transition: 'background-color var(--transition-fast)', backgroundColor: rowBg }}
                                        onMouseEnter={e => { if (!selectedItems.has(ledger.id)) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                        onMouseLeave={e => { if (!selectedItems.has(ledger.id)) e.currentTarget.style.backgroundColor = rowBg; }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            <input type="checkbox" style={chkStyle} checked={selectedItems.has(ledger.id)} onChange={e => toggleItem(ledger.id, e)} onClick={e => e.stopPropagation()} />
                                        </td>
                                        <td onClick={() => setSelectedAccount(ledger)} style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {ledger.name}
                                                {isNewOrganic && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, backgroundColor: '#10b981', color: '#fff', textTransform: 'uppercase' }}>New</span>}
                                            </div>
                                        </td>
                                        {activeCols.map(col => renderCell(col, ledger))}
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button title="New Receipt" onClick={e => { e.stopPropagation(); setActiveTab('receipts'); setActiveForm('receipt-voucher'); setSelectedTransaction({ account_id: ledger.id, account_name: ledger.name }); }} style={{ background: '#10b98115', border: 'none', borderRadius: '4px', color: '#10b981', padding: '4px', cursor: 'pointer' }}>Rec</button>
                                                <button title="New Payment" onClick={e => { e.stopPropagation(); setActiveTab('payments'); setActiveForm('payment-voucher'); setSelectedTransaction({ account_id: ledger.id, account_name: ledger.name }); }} style={{ background: '#ef444415', border: 'none', borderRadius: '4px', color: '#ef4444', padding: '4px', cursor: 'pointer' }}>Pay</button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {filteredLedgers.length === 0 && <tr><td colSpan={activeCols.length + 3} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No accounts found.</td></tr>}
                            </tbody>
                        </table>
                        );
                    })()}
                </div>
            );
        }

        // AMC Subscriptions tab
        if (activeTab === 'amc') {
            const amcFiltered = amcSubscriptions.filter(a =>
                !searchTerm || (a.plan_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.accounts?.name || a.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            const totalAMC = amcSubscriptions.length;
            const monthlyRev = amcSubscriptions.reduce((s, a) => s + (Number(a.amc_amount || 0) / 12), 0);
            const soonExpiring = amcSubscriptions.filter(a => {
                if (!a.end_date) return false;
                const d = new Date(a.end_date), now = new Date(), next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                return d <= next && d >= now;
            }).length;
            const activeCols = (tabColumns.amc || []).filter(c => (visibleColumns.amc || new Set()).has(c.id));
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--spacing-sm)' }}>
                        {[{ label: 'Active AMCs', val: totalAMC, color: '#8b5cf6' }, { label: 'Monthly Revenue', val: `₹${Math.round(monthlyRev).toLocaleString()}`, color: '#10b981' }, { label: 'Expiring Soon', val: soonExpiring, color: '#f59e0b' }].map(s => (
                            <div key={s.label} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{s.label}</div><div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.val}</div></div>
                                <Shield size={18} style={{ color: s.color, opacity: 0.4 }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                {activeCols.map(c => <th key={c.id} style={{ padding: 'var(--spacing-sm)', textAlign: c.align, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{c.label}</th>)}
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Actions</th>
                            </tr></thead>
                            <tbody>
                                {amcFiltered.length === 0 ? <tr><td colSpan={activeCols.length + 1} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No AMC subscriptions found.</td></tr> :
                                amcFiltered.map(amc => {
                                    const isExpiring = amc.end_date && new Date(amc.end_date) <= new Date(Date.now() + 30*24*60*60*1000);
                                    return (
                                        <tr key={amc.id} style={{ borderBottom: '1px solid var(--border-primary)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            {activeCols.map(col => {
                                                const td = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' };
                                                switch (col.id) {
                                                    case 'plan_name':    return <td key={col.id} style={{ ...td, fontWeight: 600 }}>{amc.plan_name || amc.amc_plans?.name || '—'}</td>;
                                                    case 'account_name': return <td key={col.id} style={td}>{amc.accounts?.name || amc.customer_name || '—'}</td>;
                                                    case 'product':      return <td key={col.id} style={{ ...td, color: 'var(--text-secondary)' }}>{amc.product_brand} {amc.product_model}</td>;
                                                    case 'start_date':   return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{amc.start_date ? new Date(amc.start_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'end_date':     return <td key={col.id} style={{ ...td, textAlign: 'center', color: isExpiring ? '#f59e0b' : 'inherit', fontWeight: isExpiring ? 700 : 400 }}>{amc.end_date ? new Date(amc.end_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'amc_amount':   return <td key={col.id} style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>₹{(Number(amc.amc_amount) || 0).toLocaleString()}</td>;
                                                    case 'status':       return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{renderStatusBadge(amc.status === 'active' ? 'Paid' : amc.status)}</td>;
                                                    case 'created_at': {
                                                        const d = amc.created_at ? new Date(amc.created_at) : null;
                                                        return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{d ? `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}` : '—'}</td>;
                                                    }
                                                    default: return null;
                                                }
                                            })}
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button onClick={() => { setSelectedAgreementItem(amc); setSelectedAgreementType('amc'); setShowPrintAgreement(true); }} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#6366f115', color: '#6366f1', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}><Printer size={12} /> Print</button>
                                                    <button onClick={() => alert(`Schedule next service for ${amc.accounts?.name || 'Customer'}`)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#10b98115', color: '#10b981', cursor: 'pointer', fontSize: '11px' }}>Schedule</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Rentals tab
        if (activeTab === 'rentals') {
            const rentFiltered = rentalAgreements.filter(r =>
                !searchTerm || (r.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.accounts?.name || r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            const totalRentals = rentalAgreements.length;
            const monthlyIncome = rentalAgreements.reduce((s, r) => s + (Number(r.monthly_rent || 0)), 0);
            const overdue = rentalAgreements.filter(r => r.next_rent_due_date && new Date(r.next_rent_due_date) < new Date()).length;
            const activeCols = (tabColumns.rentals || []).filter(c => (visibleColumns.rentals || new Set()).has(c.id));
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--spacing-sm)' }}>
                        {[{ label: 'Active Rentals', val: totalRentals, color: '#10b981' }, { label: 'Monthly Income', val: `₹${monthlyIncome.toLocaleString()}`, color: '#3b82f6' }, { label: 'Overdue', val: overdue, color: '#ef4444' }].map(s => (
                            <div key={s.label} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{s.label}</div><div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.val}</div></div>
                                <Package size={18} style={{ color: s.color, opacity: 0.4 }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                {activeCols.map(c => <th key={c.id} style={{ padding: 'var(--spacing-sm)', textAlign: c.align, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{c.label}</th>)}
                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Actions</th>
                            </tr></thead>
                            <tbody>
                                {rentFiltered.length === 0 ? <tr><td colSpan={activeCols.length + 1} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No rental agreements found.</td></tr> :
                                rentFiltered.map(rental => {
                                    const isOverdue = rental.next_rent_due_date && new Date(rental.next_rent_due_date) < new Date();
                                    return (
                                        <tr key={rental.id} style={{ borderBottom: '1px solid var(--border-primary)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            {activeCols.map(col => {
                                                const td = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' };
                                                switch (col.id) {
                                                    case 'product_name':     return <td key={col.id} style={{ ...td, fontWeight: 600 }}>{rental.rental_plans?.product_name || rental.product_name || '—'}</td>;
                                                    case 'account_name':     return <td key={col.id} style={td}>{rental.accounts?.name || rental.customer_name || '—'}</td>;
                                                    case 'monthly_rent':     return <td key={col.id} style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>₹{(Number(rental.monthly_rent) || 0).toLocaleString()}</td>;
                                                    case 'start_date':       return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{rental.start_date ? new Date(rental.start_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'next_due':         return <td key={col.id} style={{ ...td, textAlign: 'center', color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>{rental.next_rent_due_date ? new Date(rental.next_rent_due_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'security_deposit': return <td key={col.id} style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>₹{(Number(rental.security_deposit) || 0).toLocaleString()}</td>;
                                                    case 'status':           return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{renderStatusBadge(rental.status === 'active' ? 'Paid' : rental.status)}</td>;
                                                    case 'created_at': {
                                                        const d = rental.created_at ? new Date(rental.created_at) : null;
                                                        return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{d ? `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}` : '—'}</td>;
                                                    }
                                                    default: return null;
                                                }
                                            })}
                                            <td style={{ padding: 'var(--spacing-sm)' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button onClick={() => { setSelectedRentalForPayment({ ...rental, productName: rental.product_name, customerName: rental.accounts?.name || rental.customer_name, monthlyRent: Number(rental.monthly_rent), securityDeposit: Number(rental.security_deposit) }); setShowRentReceipts(true); }} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#10b98115', color: '#10b981', cursor: 'pointer', fontSize: '11px' }}>Receipts</button>
                                                    <button onClick={() => { setSelectedRentalForDetails({ ...rental, productName: rental.product_name, customerName: rental.accounts?.name || rental.customer_name }); setShowRentalDetails(true); }} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#3b82f615', color: '#3b82f6', cursor: 'pointer', fontSize: '11px' }}>Details</button>
                                                    <button onClick={() => { setSelectedAgreementItem({ ...rental, productName: rental.product_name, customerName: rental.accounts?.name || rental.customer_name }); setSelectedAgreementType('rental'); setShowPrintAgreement(true); }} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#6366f115', color: '#6366f1', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}><Printer size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }


        if (!tabColumns[activeTab]) return null;

        const processedData = getProcessedTransactionData();
        const groupedData = getGroupedTransactionData(processedData);
        const allSelected = processedData.length > 0 && selectedItems.size === processedData.length;

        if (txViewType === 'card') return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <TransactionsCardView 
                    items={processedData} 
                    activeTab={activeTab} 
                    groupBy={txGroupBy} 
                    onItemClick={handleTransactionClick} 
                    onDelete={(item) => handleDeleteTransaction(item, activeTab)}
                />
            </div>
        );

        if (txViewType === 'kanban') return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                {TransactionsKanbanView
                    ? <TransactionsKanbanView items={processedData} tab={activeTab} onItemClick={handleTransactionClick} groupBy={txGroupBy} />
                    : <div style={{ padding: 40, color: 'var(--text-tertiary)', textAlign: 'center' }}>Kanban view coming soon</div>}
            </div>
        );

        if (txViewType === 'list') return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                {TransactionsListView
                    ? <TransactionsListView items={processedData} tab={activeTab} onItemClick={handleTransactionClick} groupBy={txGroupBy} />
                    : <div style={{ padding: 40, color: 'var(--text-tertiary)', textAlign: 'center' }}>List view coming soon</div>}
            </div>
        );

        const activeTxCols = tabColumns[activeTab].filter(c => visibleColumns[activeTab].has(c.id));
        const thBase = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' };
        const tdBase = { padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' };

        return (
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thBase, width: '40px', textAlign: 'center' }}>
                                <input type="checkbox" style={chkStyle} checked={allSelected} onChange={() => toggleSelectAll(processedData)} />
                            </th>
                            {activeTxCols.map(col => <th key={col.id} style={{ ...thBase, textAlign: col.align }}>{col.label}</th>)}
                            <th style={{ ...thBase, textAlign: 'center', width: '110px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(({ label, items }) => (
                            <>
                                {label !== null && (
                                    <tr key={`grp-${label}`}>
                                        <td colSpan={10} style={{ padding: '10px 12px 6px', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>▸ {label}</td>
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
                                        {activeTxCols.map(col => {
                                            switch (col.id) {
                                                case 'number': 
                                                    const no = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || '—';
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align, fontWeight: 500, fontFamily: 'monospace' }}>{no}</td>;
                                                case 'date':
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}>{item.date || '—'}</td>;
                                                case 'account_name':
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}>{item.account_name || '—'}</td>;
                                                case 'amount':
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align, fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(item.amount || item.total_amount || 0)}</td>;
                                                case 'status': {
                                                    const isVoucher = activeTab === 'receipts' || activeTab === 'payments';
                                                    if (isVoucher) {
                                                        return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', backgroundColor: 'var(--bg-secondary)', fontWeight: 500 }}>{item.payment_mode || 'Cash'}</span></td>;
                                                    }
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}>{renderStatusBadge(item.status)}</td>;
                                                }
                                                case 'created_by':
                                                    const srcText = item.created_by || 'Admin';
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, backgroundColor: '#6366f115', color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>🛡️ {srcText}</span>
                                                    </td>;
                                                case 'created_at': {
                                                    const d = item.created_at ? new Date(item.created_at) : null;
                                                    return <td key={col.id} onClick={() => handleTransactionClick(item)} style={{ ...tdBase, textAlign: col.align }}>{d ? `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}` : '—'}</td>;
                                                }
                                                default: return null;
                                            }
                                        })}
                                        <td style={{ padding: '4px 8px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button
                                                    title="Edit"
                                                    onClick={e => { e.stopPropagation(); handleTransactionClick(item); }}
                                                    style={{ background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: '6px', color: '#6366f1', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    title="Print"
                                                    onClick={e => { e.stopPropagation(); handlePrintItem(item, activeTab); }}
                                                    style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', color: '#10b981', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <Printer size={13} />
                                                </button>
                                                <button
                                                    title="Share via WhatsApp"
                                                    onClick={e => { e.stopPropagation(); handleShareItem(item, activeTab); }}
                                                    style={{ background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: '6px', color: '#f59e0b', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <Share2 size={13} />
                                                 </button>
                                                <button
                                                    title="Delete"
                                                    onClick={e => { e.stopPropagation(); handleDeleteTransaction(item, activeTab); }}
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#ef4444', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        ))}
                        {processedData.length === 0 && <tr><td colSpan={10} style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No records found.</td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Row 1: Header — title + unified Odoo-style search/filter panel */}
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>Accounts</span>
                <AccountsSearchPanel
                    tab={activeTab}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    groupBy={activeTab === 'accounts' ? groupBy : txGroupBy}
                    onGroupByChange={activeTab === 'accounts' ? setGroupBy : setTxGroupBy}
                    sortBy={activeTab === 'accounts' ? sortBy : txSortBy}
                    onSortByChange={activeTab === 'accounts' ? setSortBy : setTxSortBy}
                    activeTags={activeTab === 'accounts' ? activeTags : txActiveTags}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    savedViews={savedViews}
                    onSaveNamedView={handleSaveNamedView}
                    onApplyView={applyView}
                    onDeleteView={deleteView}
                    onSetDefaultView={setDefaultView}
                    saveStatus={saveStatus}
                    onResetView={handleResetView}
                />
                <button className="btn btn-primary" onClick={handleCreateClick}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <Plus size={15} /> {tabConfig[activeTab]?.createButtonText || 'Create'}
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

            {/* Row 3: View Type Toggles + Columns + Refresh + Count */}
            <div style={{ padding: '6px 12px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* View toggles */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {activeTab === 'accounts'
                        ? [{ type: 'table', Icon: TableIcon, label: 'Table' }, { type: 'list', Icon: List, label: 'List' }, { type: 'card', Icon: Grid, label: 'Cards' }, { type: 'kanban', Icon: Columns, label: 'Kanban' }, { type: 'details', Icon: Layers, label: 'Details' }].map(({ type, Icon, label }) => (
                            <button key={type} onClick={() => setViewType(type)} title={label}
                                style={{ padding: '5px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: viewType === type ? '#6366f1' : 'transparent', color: viewType === type ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}>
                                <Icon size={13} />{label}
                            </button>
                        ))
                        : [{ type: 'table', Icon: TableIcon, label: 'Table' }, { type: 'list', Icon: List, label: 'List' }, { type: 'card', Icon: Grid, label: 'Cards' }, { type: 'kanban', Icon: Columns, label: 'Kanban' }].map(({ type, Icon, label }) => (
                            <button key={type} onClick={() => setTxViewType(type)} title={label}
                                style={{ padding: '5px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: txViewType === type ? '#6366f1' : 'transparent', color: txViewType === type ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}>
                                <Icon size={13} />{label}
                            </button>
                        ))
                    }
                </div>

                {/* Column Picker */}
                {(activeTab === 'accounts' || ['sales','purchases','quotations','receipts','payments'].includes(activeTab)) && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowColumnPicker(p => !p)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: showColumnPicker ? '#6366f1' : 'transparent', color: showColumnPicker ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}>
                            <SlidersHorizontal size={13} /> Columns
                        </button>
                        {showColumnPicker && (
                            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '10px 0', minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '350px', overflowY: 'auto' }}>
                                <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arrange & Toggle Columns</div>
                                {tabColumns[activeTab]?.map((col, index) => (
                                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, flex: 1, margin: 0 }}>
                                            <input type="checkbox" checked={visibleColumns[activeTab]?.has(col.id)} onChange={() => toggleColumn(activeTab, col.id)}
                                                style={{ accentColor: '#6366f1', width: 14, height: 14, margin: 0, cursor: 'pointer' }} />
                                            {col.label}
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => moveColumn(activeTab, index, -1)} disabled={index === 0} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'transparent' : 'var(--text-secondary)' }}>↑</button>
                                            <button onClick={() => moveColumn(activeTab, index, 1)} disabled={index === tabColumns[activeTab].length - 1} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === tabColumns[activeTab].length - 1 ? 'default' : 'pointer', color: index === tabColumns[activeTab].length - 1 ? 'transparent' : 'var(--text-secondary)' }}>↓</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--border-primary)', margin: '8px 0 4px' }} />
                                <button onClick={() => resetColumnsToDefault(activeTab)} style={{ width: '100%', textAlign: 'left', padding: '5px 14px', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer' }}>Reset to defaults</button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Refresh + Count */}
                <button
                    onClick={() => setActiveTab(t => { const tmp = t; setActiveTab('__reset__'); setTimeout(() => setActiveTab(tmp), 0); })}
                    title="Refresh"
                    style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    onMouseDown={e => { e.currentTarget.querySelector('svg').style.transform = 'rotate(180deg)'; }}
                    onMouseUp={e => { if(e.currentTarget.querySelector('svg')) e.currentTarget.querySelector('svg').style.transform = ''; }}
                >
                    <RefreshCw size={13} /> Refresh
                </button>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {activeTab === 'accounts'
                        ? `${filteredLedgers.length} / ${ledgers.length} accounts`
                        : (() => {
                            const all = getCurrentData();
                            const filtered = getProcessedTransactionData();
                            return `${filtered.length} / ${all.length} ${activeTab}`;
                          })()
                    }
                </span>
            </div>


            {/* Content */}
            {renderTable()}

            {/* Bulk Action Bar â€” floats at bottom when items selected */}
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

            {/* AMC Subscription Form */}
            {activeForm === 'amc-subscription' && (
                <NewAMCForm
                    plans={amcPlans}
                    onClose={handleFormClose}
                    onSave={async (data) => {
                        try {
                            const payload = {
                                account_id: data.customerId,
                                plan_id: data.planId,
                                plan_name: data.planName || amcPlans.find(p => p.id === data.planId)?.name || '',
                                product_brand: data.productBrand,
                                product_model: data.productModel,
                                serial_number: data.serialNumber,
                                start_date: data.startDate,
                                end_date: data.endDate,
                                amc_amount: data.amcAmount,
                                payment_status: data.paymentStatus,
                                auto_renew: data.autoRenew,
                                notes: data.notes,
                                status: 'active'
                            };
                            const res = await amcAPI.createActive(payload);
                            const [subs, plans] = await Promise.all([amcAPI.getActive(), amcAPI.getPlans()]);
                            setAmcSubscriptions(subs || []);
                            setAmcPlans(plans || []);
                            return { ...payload, id: res?.id, accounts: { name: data.customerName || 'Customer' } };
                        } catch (err) {
                            console.error('AMC creation failed:', err);
                            alert('Failed to create AMC subscription: ' + (err.message || ''));
                        }
                    }}
                />
            )}

            {/* Rental Agreement Form */}
            {activeForm === 'rental-agreement' && (
                <NewRentalForm
                    plans={rentalPlans}
                    onClose={handleFormClose}
                    onSave={async (rentalData) => {
                        try {
                            const rentsPaidInit = rentalData.monthlyRent > 0 ? Math.floor((rentalData.rentAdvance || 0) / rentalData.monthlyRent) : 0;
                            const nextDueDate = new Date(rentalData.startDate);
                            nextDueDate.setMonth(nextDueDate.getMonth() + rentsPaidInit);
                            let totalRents = 0;
                            if (rentalData.tenure?.unit?.includes('month')) totalRents = rentalData.tenure.duration;
                            else if (rentalData.tenure?.unit?.includes('year')) totalRents = rentalData.tenure.duration * 12;
                            const payload = {
                                customer_id: rentalData.customerId,
                                customer_name: rentalData.customerName || '',
                                plan_id: rentalData.planId,
                                product_name: rentalData.productName || '',
                                start_date: rentalData.startDate,
                                end_date: rentalData.tenure?.endDate,
                                monthly_rent: rentalData.monthlyRent,
                                security_deposit: rentalData.securityDeposit,
                                setup_fee: rentalData.setupFee,
                                status: 'active',
                                serial_number: rentalData.serialNumber,
                                notes: rentalData.notes,
                                deposit_paid: rentalData.depositPaid || false,
                                deposit_amount: rentalData.depositAmount || 0,
                                rent_advance: rentalData.rentAdvance || 0,
                                rents_paid: rentsPaidInit,
                                rents_remaining: Math.max(0, totalRents - rentsPaidInit),
                                next_rent_due_date: nextDueDate.toISOString().split('T')[0],
                                tenure: { duration: rentalData.tenure?.duration, unit: rentalData.tenure?.unit }
                            };
                            const res = await rentalsAPI.createActive(payload);
                            const [agreements, plans] = await Promise.all([rentalsAPI.getActive(), rentalsAPI.getPlans()]);
                            setRentalAgreements(agreements || []);
                            setRentalPlans(plans || []);
                            return { ...payload, id: res?.id, accounts: { name: payload.customer_name } };
                        } catch (err) {
                            console.error('Rental creation failed:', err);
                            alert('Failed to create rental agreement: ' + (err.message || ''));
                        }
                    }}
                    onNewCustomer={() => alert('Please create a customer in the Accounts tab first.')}
                />
            )}

            {/* Agreement Print Modal */}
            {showPrintAgreement && selectedAgreementItem && (
                <PrintAgreementModal
                    type={selectedAgreementType}
                    data={selectedAgreementItem}
                    onClose={() => { setShowPrintAgreement(false); setSelectedAgreementItem(null); }}
                />
            )}

            {/* Rental Details Modal */}
            {showRentalDetails && selectedRentalForDetails && (
                <RentalDetailsModal
                    rental={selectedRentalForDetails}
                    onClose={() => { setShowRentalDetails(false); setSelectedRentalForDetails(null); }}
                />
            )}

            {/* Rent Receipts Modal */}
            {showRentReceipts && selectedRentalForPayment && (
                <RentReceiptsModal
                    rental={selectedRentalForPayment}
                    onClose={() => { setShowRentReceipts(false); setSelectedRentalForPayment(null); }}
                    onSave={async (paymentData) => {
                        try {
                            await rentalsAPI.updateActive(paymentData.rentalId, {
                                rent_receipts: paymentData.rent_receipts,
                                rents_paid: paymentData.rents_paid,
                                rents_remaining: paymentData.rents_remaining,
                                next_rent_due_date: paymentData.next_rent_due_date || null
                            });
                            const [agreements] = await Promise.all([rentalsAPI.getActive()]);
                            setRentalAgreements(agreements || []);
                            setShowRentReceipts(false);
                            setSelectedRentalForPayment(null);
                        } catch (err) {
                            alert('Failed to save receipts: ' + err.message);
                        }
                    }}
                />
            )}

            {/* WhatsApp Share Modal */}
            {showShareModal && shareItem && (
                <WhatsAppShareModal
                    item={shareItem}
                    tab={shareTab}
                    printSettings={printSettingsRef.current}
                    onClose={() => { setShowShareModal(false); setShareItem(null); setShareTab(null); }}
                    onPrint={() => handlePrintItem(shareItem, shareTab)}
                />
            )}
        </div>
    );
}

export default AccountsTab;
