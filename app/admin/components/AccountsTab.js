'use client'

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, ChevronDown, Grid, Table as TableIcon, Loader2, ArrowUpDown, Filter, Layers, Trash2, CheckSquare, SlidersHorizontal, Printer, Share2, Edit2, Shield, Package } from 'lucide-react';
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
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';
import NewAMCForm from './reports/NewAMCForm';
import NewRentalForm from './reports/NewRentalForm';
import PrintAgreementModal from './reports/PrintAgreementModal';
import RentalDetailsModal from './reports/RentalDetailsModal';
import RentReceiptsModal from './reports/RentReceiptsModal';

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
    const [tabLoading, setTabLoading] = useState({ accounts: true, sales: false, purchases: false, quotations: false, receipts: false, payments: false, amc: false, rentals: false });
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
    const DEFAULT_CONFIG = {
        accounts: [
            { id: 'sku',             label: 'SKU',           align: 'left',   defaultOn: true  },
            { id: 'type',            label: 'Type',          align: 'left',   defaultOn: true  },
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
            { id: 'balance_type',    label: 'Bal Type',      align: 'center', defaultOn: false }
        ],
        sales: [
            { id: 'number',          label: 'Invoice No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Ledger Name',   align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true }
        ],
        purchases: [
            { id: 'number',          label: 'Invoice No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Supplier',      align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true }
        ],
        quotations: [
            { id: 'number',          label: 'Quote No',      align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true }
        ],
        receipts: [
            { id: 'number',          label: 'Receipt No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'From Account',  align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Method',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true }
        ],
        payments: [
            { id: 'number',          label: 'Payment No',    align: 'left',   defaultOn: true },
            { id: 'date',            label: 'Date',          align: 'center', defaultOn: true },
            { id: 'account_name',    label: 'To Account',    align: 'left',   defaultOn: true },
            { id: 'amount',          label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Method',        align: 'center', defaultOn: true },
            { id: 'created_by',      label: 'Created By',    align: 'left',   defaultOn: true }
        ],
        amc: [
            { id: 'plan_name',       label: 'Plan',          align: 'left',   defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'product',         label: 'Product',       align: 'left',   defaultOn: true },
            { id: 'start_date',      label: 'Start',         align: 'center', defaultOn: true },
            { id: 'end_date',        label: 'End',           align: 'center', defaultOn: true },
            { id: 'amc_amount',      label: 'Amount',        align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true }
        ],
        rentals: [
            { id: 'product_name',    label: 'Product',       align: 'left',   defaultOn: true },
            { id: 'account_name',    label: 'Customer',      align: 'left',   defaultOn: true },
            { id: 'monthly_rent',    label: 'Monthly Rent',  align: 'right',  defaultOn: true },
            { id: 'start_date',      label: 'Start',         align: 'center', defaultOn: true },
            { id: 'next_due',        label: 'Next Due',      align: 'center', defaultOn: true },
            { id: 'security_deposit',label: 'Deposit',       align: 'right',  defaultOn: true },
            { id: 'status',          label: 'Status',        align: 'center', defaultOn: true }
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
                    if (parsed.tabColumns) setTabColumns({ ...DEFAULT_CONFIG, ...parsed.tabColumns });
                    if (parsed.visibleColumns) {
                        const hydratedVis = {};
                        for (const tab in parsed.visibleColumns) {
                            hydratedVis[tab] = new Set(parsed.visibleColumns[tab]);
                        }
                        setVisibleColumns(prev => ({ ...prev, ...hydratedVis }));
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

    const [showColumnPicker, setShowColumnPicker] = useState(false);
    
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

    // Bug 4 & 5: Print a formatted invoice/quotation with company info from Print Setup
    const handlePrintItem = (item, tab) => {
        const ref = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
        const acct = item.account_name || '';
        const date = item.date || '';
        const amount = item.total_amount || item.amount || 0;
        const tabLabel = tabConfig[tab]?.label || tab;
        const items = Array.isArray(item.items) ? item.items : [];

        // Pull print settings (from DB via Print Setup)
        const ps = printSettingsRef.current;
        const companyName = ps?.company_name || 'Your Company';
        const companyAddress = ps?.company_address || '';
        const companyPhone = ps?.company_phone || '';
        const companyGstin = ps?.gstin || '';
        const companyEmail = ps?.company_email || '';
        const logoUrl = ps?.show_logo && ps?.logo_url ? ps.logo_url : null;

        // Pick the right T&C based on tab
        const termsMap = { sales: 'invoice_terms', purchases: 'invoice_terms', quotations: 'quotation_terms', rentals: 'rental_terms', amc: 'amc_terms' };
        const termsKey = termsMap[tab] || 'invoice_terms';
        const terms = Array.isArray(ps?.[termsKey]) ? ps[termsKey] : [];

        const rows = items.map((it, i) => `
            <tr>
                <td style="padding:6px;border:1px solid #e2e8f0">${i + 1}</td>
                <td style="padding:6px;border:1px solid #e2e8f0">${it.description || ''}</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:center">${it.hsn || ''}</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:right">${it.qty || 1}</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:right">₹${(it.rate || 0).toLocaleString()}</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:right">${it.taxRate || 0}%</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:right;font-weight:600">₹${(it.total || 0).toLocaleString()}</td>
            </tr>`).join('');

        const termsHtml = terms.length > 0 ? `
            <div style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
                <h3 style="font-size:13px;font-weight:700;margin-bottom:8px">Terms & Conditions</h3>
                <ol style="margin:0;padding-left:20px;font-size:12px;color:#475569;line-height:1.6">
                    ${terms.map(t => `<li>${t}</li>`).join('')}
                </ol>
            </div>` : '';

        const html = `<!DOCTYPE html><html><head><title>${tabLabel} - ${ref}</title>
        <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}h1{font-size:22px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f1f5f9;padding:8px;border:1px solid #e2e8f0;text-align:left;font-size:12px}td{font-size:12px}.total-section{margin-top:16px;text-align:right}.grand{font-size:20px;font-weight:700;color:#10b981}@media print{button{display:none}}</style>
        </head><body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:12px">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:50px;width:auto;object-fit:contain">` : ''}
                <div>
                    <h1 style="margin:0 0 4px">${companyName}</h1>
                    ${companyAddress ? `<p style="margin:2px 0;font-size:12px;color:#64748b">${companyAddress}</p>` : ''}
                    ${companyPhone ? `<p style="margin:2px 0;font-size:12px;color:#64748b">Ph: ${companyPhone}</p>` : ''}
                    ${companyEmail ? `<p style="margin:2px 0;font-size:12px;color:#64748b">${companyEmail}</p>` : ''}
                    ${companyGstin ? `<p style="margin:2px 0;font-size:12px;color:#64748b">GSTIN: ${companyGstin}</p>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <h2 style="margin:0 0 8px;font-size:18px;color:#6366f1">${tabLabel}</h2>
                <p style="margin:2px 0;font-size:13px;color:#64748b">Ref: <strong>${ref}</strong></p>
                <p style="margin:2px 0;font-size:13px;color:#64748b">Date: ${date}</p>
                <p style="margin:4px 0;font-size:13px"><strong>${acct}</strong></p>
            </div>
        </div>
        <table><thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8">No items</td></tr>'}</tbody></table>
        <div class="total-section"><p style="margin:4px 0;font-size:13px">Subtotal: ₹${(item.subtotal || 0).toLocaleString()}</p>${item.cgst > 0 ? `<p style="margin:4px 0;font-size:13px">CGST: ₹${item.cgst.toLocaleString()}</p><p style="margin:4px 0;font-size:13px">SGST: ₹${item.sgst.toLocaleString()}</p>` : ''}${item.igst > 0 ? `<p style="margin:4px 0;font-size:13px">IGST: ₹${item.igst.toLocaleString()}</p>` : ''}<p class="grand" style="margin-top:8px">Grand Total: ₹${amount.toLocaleString()}</p></div>
        ${item.notes ? `<p style="margin-top:24px;font-size:12px;color:#64748b">Notes: ${item.notes}</p>` : ''}
        ${termsHtml}
        <script>window.onload = () => window.print();<\/script></body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    };

    // Bug 4: Share via WhatsApp
    const handleShareItem = (item, tab) => {
        const ref = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
        const amount = item.total_amount || item.amount || 0;
        const acct = item.account_name || '';
        const date = item.date || '';
        const tabLabel = tabConfig[tab]?.label || tab;
        const text = encodeURIComponent(`${tabLabel} ${ref}\nAccount: ${acct}\nDate: ${date}\nAmount: ₹${amount.toLocaleString()}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
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
                                                    case 'product_name':     return <td key={col.id} style={{ ...td, fontWeight: 600 }}>{rental.product_name || rental.rental_plans?.product_name || '—'}</td>;
                                                    case 'account_name':     return <td key={col.id} style={td}>{rental.accounts?.name || rental.customer_name || '—'}</td>;
                                                    case 'monthly_rent':     return <td key={col.id} style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>₹{(Number(rental.monthly_rent) || 0).toLocaleString()}</td>;
                                                    case 'start_date':       return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{rental.start_date ? new Date(rental.start_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'next_due':         return <td key={col.id} style={{ ...td, textAlign: 'center', color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>{rental.next_rent_due_date ? new Date(rental.next_rent_due_date).toLocaleDateString('en-GB') : '—'}</td>;
                                                    case 'security_deposit': return <td key={col.id} style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>₹{(Number(rental.security_deposit) || 0).toLocaleString()}</td>;
                                                    case 'status':           return <td key={col.id} style={{ ...td, textAlign: 'center' }}>{renderStatusBadge(rental.status === 'active' ? 'Paid' : rental.status)}</td>;
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
                                                default: return null;
                                            }
                                        })}
                                        {/* Bug 4: Action buttons */}
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
                            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '10px 0', minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '350px', overflowY: 'auto' }}>
                                <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arrange & Toggle Columns</div>
                                {tabColumns[activeTab].map((col, index) => (
                                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, flex: 1, margin: 0 }}>
                                            <input type="checkbox" checked={visibleColumns[activeTab].has(col.id)} onChange={() => toggleColumn(activeTab, col.id)}
                                                style={{ accentColor: '#6366f1', width: 14, height: 14, margin: 0, cursor: 'pointer' }} />
                                            {col.label}
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => moveColumn(activeTab, index, -1)} disabled={index === 0} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'transparent' : 'var(--text-secondary)' }}>▲</button>
                                            <button onClick={() => moveColumn(activeTab, index, 1)} disabled={index === tabColumns[activeTab].length - 1} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === tabColumns[activeTab].length - 1 ? 'default' : 'pointer', color: index === tabColumns[activeTab].length - 1 ? 'transparent' : 'var(--text-secondary)' }}>▼</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--border-primary)', margin: '8px 0 4px' }} />
                                <button onClick={() => resetColumnsToDefault(activeTab)} style={{ width: '100%', textAlign: 'left', padding: '5px 14px', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer' }}>Reset to defaults</button>
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
                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '18px', margin: '0 2px' }} />
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowColumnPicker(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', backgroundColor: showColumnPicker ? '#6366f1' : '#334155', color: showColumnPicker ? 'white' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                            <SlidersHorizontal size={13} /> Columns
                        </button>
                        {showColumnPicker && (
                            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '10px 0', minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '350px', overflowY: 'auto' }}>
                                <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arrange & Toggle Columns</div>
                                {tabColumns[activeTab].map((col, index) => (
                                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, flex: 1, margin: 0 }}>
                                            <input type="checkbox" checked={visibleColumns[activeTab].has(col.id)} onChange={() => toggleColumn(activeTab, col.id)}
                                                style={{ accentColor: '#6366f1', width: 14, height: 14, margin: 0, cursor: 'pointer' }} />
                                            {col.label}
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => moveColumn(activeTab, index, -1)} disabled={index === 0} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'transparent' : 'var(--text-secondary)' }}>▲</button>
                                            <button onClick={() => moveColumn(activeTab, index, 1)} disabled={index === tabColumns[activeTab].length - 1} style={{ padding: '2px 4px', fontSize: '10px', border: 'none', background: 'transparent', cursor: index === tabColumns[activeTab].length - 1 ? 'default' : 'pointer', color: index === tabColumns[activeTab].length - 1 ? 'transparent' : 'var(--text-secondary)' }}>▼</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--border-primary)', margin: '8px 0 4px' }} />
                                <button onClick={() => resetColumnsToDefault(activeTab)} style={{ width: '100%', textAlign: 'left', padding: '5px 14px', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer' }}>Reset to defaults</button>
                            </div>
                        )}
                    </div>
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
        </div>
    );
}

export default AccountsTab;