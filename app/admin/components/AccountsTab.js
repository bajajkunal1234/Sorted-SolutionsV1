'use client'

import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, Grid, Table as TableIcon } from 'lucide-react';
import { accountsAPI, transactionsAPI } from '@/lib/adminAPI';
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

function AccountsTab({ customerToOpen, onCustomerOpened }) {
    // Tab state
    const [activeTab, setActiveTab] = useState('accounts');

    // Data states
    const [ledgers, setLedgers] = useState([]);
    const [salesInvoices, setSalesInvoices] = useState([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mappings for API
    const tabToTypeMap = {
        sales: 'sales',
        purchases: 'purchase',
        quotations: 'quotation',
        receipts: 'receipt',
        payments: 'payment'
    };

    // UI states
    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Account groups for filtering
    const accountGroups = [
        { id: 'customers', name: 'Customers' },
        { id: 'suppliers', name: 'Suppliers' },
        { id: 'expenses', name: 'Expenses' },
        { id: 'income', name: 'Income' },
        { id: 'assets', name: 'Assets' },
        { id: 'liabilities', name: 'Liabilities' }
    ];


    // Fetch data for the current tab
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (activeTab === 'accounts') {
                    const data = await accountsAPI.getAll();
                    setLedgers(data || []);
                } else {
                    const type = tabToTypeMap[activeTab];
                    const data = await transactionsAPI.getAll({ type });

                    // Update the appropriate state
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
                console.error(`Error fetching ${activeTab} data:`, err);
                setError(`Failed to load ${activeTab}. Please try again.`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    // Handle opening customer account from Jobs tab
    useEffect(() => {
        if (customerToOpen && ledgers.length > 0) {
            // Find the customer's ledger account
            const customerAccount = ledgers.find(ledger =>
                ledger.name === customerToOpen.name ||
                ledger.id === customerToOpen.id
            );
            if (customerAccount) {
                setSelectedAccount(customerAccount);
            }
            // Reset the customerToOpen state
            if (onCustomerOpened) {
                onCustomerOpened();
            }
        }
    }, [customerToOpen, ledgers, onCustomerOpened]);

    const viewIcons = {
        card: Grid,
        table: TableIcon
    };

    // Tab configuration
    const tabConfig = {
        accounts: {
            label: 'Accounts',
            searchPlaceholder: 'Search Ledgers...',
            createButtonText: '+ Create Account',
            formType: 'new-account'
        },
        sales: {
            label: 'Sales',
            searchPlaceholder: 'Search Sales Invoices...',
            createButtonText: '+ Create Sales Invoice',
            formType: 'sales-invoice'
        },
        purchases: {
            label: 'Purchases',
            searchPlaceholder: 'Search Purchase Invoices...',
            createButtonText: '+ Create Purchase Invoice',
            formType: 'purchase-invoice'
        },
        quotations: {
            label: 'Quotations',
            searchPlaceholder: 'Search Quotations...',
            createButtonText: '+ Create Quotation',
            formType: 'quotation'
        },
        receipts: {
            label: 'Receipts',
            searchPlaceholder: 'Search Receipts...',
            createButtonText: '+ Create Receipt Voucher',
            formType: 'receipt-voucher'
        },
        payments: {
            label: 'Payments',
            searchPlaceholder: 'Search Payments...',
            createButtonText: '+ Create Payment Voucher',
            formType: 'payment-voucher'
        }
    };

    // Handle tab change - reset filters
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchTerm('');
        setFilterType('all');
        setFilterGroup('all');
        setSortBy('name');
        setViewType('table');
    };

    // Handle create button click
    const handleCreateClick = () => {
        setSelectedTransaction(null); // Clear any selected transaction
        setActiveForm(tabConfig[activeTab].formType);
    };

    // Handle transaction row click
    const handleTransactionClick = (transaction) => {
        setSelectedTransaction(transaction);
        setActiveForm(tabConfig[activeTab].formType);
    };

    // Get current data based on active tab
    const getCurrentData = () => {
        switch (activeTab) {
            case 'accounts':
                return ledgers;
            case 'sales':
                return salesInvoices;
            case 'purchases':
                return purchaseInvoices;
            case 'quotations':
                return quotations;
            case 'receipts':
                return receipts;
            case 'payments':
                return payments;
            default:
                return [];
        }
    };

    // Filter data based on search term
    const getFilteredData = () => {
        const data = getCurrentData();

        if (!searchTerm) return data;

        return data.filter(item => {
            const searchLower = searchTerm.toLowerCase();

            switch (activeTab) {
                case 'accounts':
                    return item.name?.toLowerCase().includes(searchLower) ||
                        item.sku?.toLowerCase().includes(searchLower);
                case 'sales':
                case 'purchases':
                case 'quotations':
                    return item.invoice_number?.toLowerCase().includes(searchLower) ||
                        item.quote_number?.toLowerCase().includes(searchLower) ||
                        item.account_name?.toLowerCase().includes(searchLower);
                case 'receipts':
                case 'payments':
                    return item.receipt_number?.toLowerCase().includes(searchLower) ||
                        item.payment_number?.toLowerCase().includes(searchLower) ||
                        item.account_name?.toLowerCase().includes(searchLower);
                default:
                    return true;
            }
        });
    };

    // Filter ledgers (only for accounts tab)
    const filteredLedgers = activeTab === 'accounts' ? ledgers
        .filter(ledger => {
            const matchesSearch = !searchTerm ||
                ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ledger.sku?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || ledger.type === filterType;
            const matchesGroup = filterGroup === 'all' || ledger.under === filterGroup;
            return matchesSearch && matchesType && matchesGroup;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'balance':
                    return (b.closing_balance || 0) - (a.closing_balance || 0);
                case 'jobs':
                    return (b.jobs_done || 0) - (a.jobs_done || 0);
                default:
                    return 0;
            }
        }) : [];

    const handleFormSave = async (data, action) => {
        try {
            if (activeTab === 'accounts') {
                if (selectedTransaction?.id) {
                    await accountsAPI.update(selectedTransaction.id, data);
                } else {
                    await accountsAPI.create(data);
                }
            } else {
                const type = tabToTypeMap[activeTab];
                if (selectedTransaction?.id) {
                    await transactionsAPI.update(selectedTransaction.id, data, type);
                } else {
                    await transactionsAPI.create(data, type);
                }
            }

            // Refresh data
            const fetchData = async () => {
                if (activeTab === 'accounts') {
                    const res = await accountsAPI.getAll();
                    setLedgers(res || []);
                } else {
                    const type = tabToTypeMap[activeTab];
                    const res = await transactionsAPI.getAll({ type });
                    switch (activeTab) {
                        case 'sales': setSalesInvoices(res || []); break;
                        case 'purchases': setPurchaseInvoices(res || []); break;
                        case 'quotations': setQuotations(res || []); break;
                        case 'receipts': setReceipts(res || []); break;
                        case 'payments': setPayments(res || []); break;
                    }
                }
            };
            await fetchData();

            alert(`${tabConfig[activeTab].label} saved successfully!`);
            setActiveForm(null);
            setSelectedTransaction(null);
        } catch (err) {
            console.error('Error saving form:', err);
            alert(`Failed to save ${tabConfig[activeTab].label}. Please try again.`);
        }
    };

    const handleFormClose = () => {
        setActiveForm(null);
        setSelectedTransaction(null);
    };

    const handleUpdateAccount = async (updatedAccount) => {
        try {
            const result = await accountsAPI.update(updatedAccount.id, updatedAccount);
            setLedgers(prevLedgers =>
                prevLedgers.map(l => l.id === result.id ? result : l)
            );
        } catch (err) {
            console.error('Error updating account:', err);
        }
    };

    // Render table based on active tab
    const renderTable = () => {
        const filteredData = getFilteredData();

        if (activeTab === 'accounts') {
            // Existing accounts table
            return (
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {viewType === 'card' && <AccountsCardView accounts={filteredLedgers} onAccountClick={setSelectedAccount} />}
                    {viewType === 'kanban' && (
                        <AccountsKanbanView
                            accounts={filteredLedgers}
                            onAccountClick={setSelectedAccount}
                            onAccountUpdate={handleUpdateAccount}
                        />
                    )}
                    {viewType === 'details' && <AccountsDetailsView accounts={filteredLedgers} onAccountClick={setSelectedAccount} />}
                    {viewType === 'table' && (
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>SKU</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Ledger Name</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Type</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Group</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Opening Balance</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Closing Balance</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Jobs Done</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLedgers.map(ledger => (
                                    <tr
                                        key={ledger.id}
                                        onClick={() => setSelectedAccount(ledger)}
                                        style={{
                                            borderBottom: '1px solid var(--border-primary)',
                                            cursor: 'pointer',
                                            transition: 'background-color var(--transition-fast)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{ledger.sku || '-'}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{ledger.name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {ledger.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {getGroupPath(ledger.under, accountGroups)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace' }}>
                                            {formatCurrency(ledger.openingBalance || 0)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(ledger.closingBalance || 0)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            {ledger.jobsDone || 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            );
        }

        // Transaction tables (Sales, Purchases, Quotations, Receipts, Payments)
        return (
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                            {activeTab === 'sales' && (
                                <>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Invoice No</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Ledger Name</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Status</th>
                                </>
                            )}
                            {activeTab === 'purchases' && (
                                <>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Invoice No</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Supplier Name</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Status</th>
                                </>
                            )}
                            {activeTab === 'quotations' && (
                                <>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Quote No</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Customer Name</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Status</th>
                                </>
                            )}
                            {activeTab === 'receipts' && (
                                <>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Receipt No</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>From Account</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Payment Method</th>
                                </>
                            )}
                            {activeTab === 'payments' && (
                                <>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Payment No</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>To Account</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Payment Method</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr
                                key={item.id}
                                onClick={() => handleTransactionClick(item)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    cursor: 'pointer',
                                    transition: 'background-color var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {activeTab === 'sales' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.invoice_number}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.total_amount || 0)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Paid' ? 'var(--color-success-bg)' : item.status === 'Pending' ? 'var(--color-warning-bg)' : 'var(--bg-secondary)',
                                                color: item.status === 'Paid' ? 'var(--color-success)' : item.status === 'Pending' ? 'var(--color-warning)' : 'var(--text-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'purchases' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.invoice_number}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.total_amount || 0)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Paid' ? 'var(--color-success-bg)' : item.status === 'Pending' ? 'var(--color-warning-bg)' : 'var(--bg-secondary)',
                                                color: item.status === 'Paid' ? 'var(--color-success)' : item.status === 'Pending' ? 'var(--color-warning)' : 'var(--text-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'quotations' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.quote_number}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.total_amount || 0)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Accepted' ? 'var(--color-success-bg)' : item.status === 'Sent' ? 'var(--color-info-bg)' : 'var(--bg-secondary)',
                                                color: item.status === 'Accepted' ? 'var(--color-success)' : item.status === 'Sent' ? 'var(--color-info)' : 'var(--text-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'receipts' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.receipt_number}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.payment_mode || 'Cash'}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'payments' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.payment_number}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.account_name}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.payment_mode || 'Cash'}
                                            </span>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Row 1: Tab Name + Search + Create Button */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '100px' }}>
                    Accounts
                </h2>

                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 'var(--spacing-sm)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder={tabConfig[activeTab].searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '2rem',
                            paddingTop: '6px',
                            paddingBottom: '6px',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleCreateClick}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    {tabConfig[activeTab].createButtonText}
                </button>
            </div>

            {/* Row 2: Tab Buttons (NEW!) */}
            <div style={{
                padding: '0 var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '0',
                overflowX: 'auto'
            }}>
                {Object.keys(tabConfig).map(tabKey => (
                    <button
                        key={tabKey}
                        onClick={() => handleTabChange(tabKey)}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderBottom: activeTab === tabKey ? '2px solid var(--color-primary)' : '2px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === tabKey ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tabKey ? 600 : 400,
                            fontSize: 'var(--font-size-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tabConfig[tabKey].label}
                    </button>
                ))}
            </div>

            {/* Row 3: Filters (only show for accounts tab) */}
            {activeTab === 'accounts' && (
                <div style={{
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {/* View Type Buttons */}
                    {Object.entries(viewIcons).map(([type, Icon]) => (
                        <button
                            key={type}
                            onClick={() => setViewType(type)}
                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                            style={{
                                padding: '6px 10px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '6px',
                                backgroundColor: viewType === type ? '#6366f1' : '#334155',
                                color: viewType === type ? 'white' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (viewType !== type) {
                                    e.currentTarget.style.backgroundColor = '#475569';
                                    e.currentTarget.style.color = '#f1f5f9';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (viewType !== type) {
                                    e.currentTarget.style.backgroundColor = '#334155';
                                    e.currentTarget.style.color = '#cbd5e1';
                                }
                            }}
                        >
                            <Icon size={16} />
                        </button>
                    ))}

                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                    {/* Type Filter */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '4px 24px 4px 8px',
                                fontSize: 'var(--font-size-xs)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#334155',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="customer">Customers</option>
                            <option value="supplier">Suppliers</option>
                            <option value="technician">Technicians</option>
                            <option value="cash">Cash/Bank</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>

                    {/* Group Filter */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={filterGroup}
                            onChange={(e) => setFilterGroup(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '4px 24px 4px 8px',
                                fontSize: 'var(--font-size-xs)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#334155',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="all">All Groups</option>
                            {accountGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>

                    <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                    {/* Sort */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '4px 24px 4px 8px',
                                fontSize: 'var(--font-size-xs)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#334155',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="name">Sort: Name</option>
                            <option value="balance">Sort: Balance</option>
                            <option value="jobs">Sort: Jobs</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                </div>
            )}

            {/* Content Area */}
            {renderTable()}

            {/* Account Detail Modal */}
            {selectedAccount && (
                <AccountDetailModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onUpdate={handleUpdateAccount}
                />
            )}

            {/* Forms */}
            {activeForm === 'sales-invoice' && (
                <SalesInvoiceForm
                    existingInvoice={selectedTransaction}
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'purchase-invoice' && (
                <PurchaseInvoiceForm
                    existingInvoice={selectedTransaction}
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'quotation' && (
                <QuotationForm
                    existingQuotation={selectedTransaction}
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'receipt-voucher' && (
                <ReceiptVoucherForm
                    existingReceipt={selectedTransaction}
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'payment-voucher' && (
                <PaymentVoucherForm
                    existingPayment={selectedTransaction}
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'new-account' && (
                <NewAccountForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

export default AccountsTab;
