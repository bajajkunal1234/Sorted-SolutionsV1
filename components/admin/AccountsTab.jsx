'use client'

import { useState } from 'react';
import { Plus, Search, Grid, Table as TableIcon, ChevronDown, RefreshCw } from 'lucide-react';
import { sampleLedgers } from '@/data/accountingData'; // Keep as fallback/initial structure reference if needed, but prefer API
import { accountGroups as staticAccountGroups, primaryCOAGroups } from '@/data/accountingData';
import {
    sampleSalesInvoices,
    samplePurchaseInvoices,
    sampleQuotations,
    sampleReceipts,
    samplePayments
} from '@/data/transactionsData';
import { formatCurrency, getGroupPath } from '@/utils/accountingHelpers';
import AccountDetailModal from './AccountDetailModal';
import AccountsCardView from '@/components/accounts/AccountsCardView';
import AccountsKanbanView from '@/components/accounts/AccountsKanbanView'; // Ensure these are imported if used
import AccountsDetailsView from '@/components/accounts/AccountsDetailsView'; // Ensure these are imported if used
import SalesInvoiceForm from '@/components/accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from '@/components/accounts/PurchaseInvoiceForm';
import QuotationForm from '@/components/accounts/QuotationForm';
import ReceiptVoucherForm from '@/components/accounts/ReceiptVoucherForm';
import PaymentVoucherForm from '@/components/accounts/PaymentVoucherForm';
import NewAccountForm from '@/components/accounts/NewAccountForm';

function AccountsTab() {
    // Tab state
    const [activeTab, setActiveTab] = useState('accounts');

    // Data states
    const [ledgers, setLedgers] = useState([]);
    const [groups, setGroups] = useState(staticAccountGroups); // Initialize with static, then merge/replace

    // Transactions data - kept as sample for now until those APIs are ready
    const [salesInvoices, setSalesInvoices] = useState(sampleSalesInvoices);
    const [purchaseInvoices, setPurchaseInvoices] = useState(samplePurchaseInvoices);
    const [quotations, setQuotations] = useState(sampleQuotations);
    const [receipts, setReceipts] = useState(sampleReceipts);
    const [payments, setPayments] = useState(samplePayments);

    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [activeForm, setActiveForm] = useState(null);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [accRes, grpRes] = await Promise.all([
                fetch('/api/admin/accounts'),
                fetch('/api/admin/account-groups')
            ]);

            const accData = await accRes.json();
            const grpData = await grpRes.json();

            if (accData.success) {
                // If DB is empty, maybe fall back to sample? Or just show empty.
                // For migration testing, let's use sample if empty? No, better to see truth.
                setLedgers(accData.data || []);
            }

            if (grpData.success) {
                // Merge static primary groups with fetched custom groups
                // Map fetched groups to ensure no duplicates if any primary are in DB
                const dbGroups = grpData.data || [];
                const combinedGroups = [...staticAccountGroups];

                dbGroups.forEach(dbG => {
                    if (!combinedGroups.find(g => g.id === dbG.id)) {
                        combinedGroups.push(dbG);
                    }
                });

                setGroups(combinedGroups);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    return item.invoiceNo?.toLowerCase().includes(searchLower) ||
                        item.quoteNo?.toLowerCase().includes(searchLower) ||
                        item.ledgerName?.toLowerCase().includes(searchLower) ||
                        item.supplierName?.toLowerCase().includes(searchLower) ||
                        item.customerName?.toLowerCase().includes(searchLower);
                case 'receipts':
                case 'payments':
                    return item.receiptNo?.toLowerCase().includes(searchLower) ||
                        item.paymentNo?.toLowerCase().includes(searchLower) ||
                        item.fromAccount?.toLowerCase().includes(searchLower) ||
                        item.toAccount?.toLowerCase().includes(searchLower);
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
                    return (b.closingBalance || 0) - (a.closingBalance || 0);
                case 'jobs':
                    return (b.jobsDone || 0) - (a.jobsDone || 0);
                default:
                    return 0;
            }
        }) : [];

    const handleFormSave = (data, action) => {
        console.log('Saved:', data, 'Action:', action);
        // alert(`${tabConfig[activeTab].label} saved successfully!`);
        fetchData(); // Refresh data
        setActiveForm(null);
    };

    const handleFormClose = () => {
        setActiveForm(null);
    };

    const handleUpdateAccount = (updatedAccount) => {
        setLedgers(prevLedgers =>
            prevLedgers.map(l => l.id === updatedAccount.id ? updatedAccount : l)
        );
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
                                            {getGroupPath(ledger.under, groups)}
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
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.invoiceNo}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.ledgerName}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Paid' ? 'var(--color-success-bg)' : item.status === 'Pending' ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                                                color: item.status === 'Paid' ? 'var(--color-success)' : item.status === 'Pending' ? 'var(--color-warning)' : 'var(--color-error)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'purchases' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.invoiceNo}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.supplierName}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Paid' ? 'var(--color-success-bg)' : item.status === 'Pending' ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                                                color: item.status === 'Paid' ? 'var(--color-success)' : item.status === 'Pending' ? 'var(--color-warning)' : 'var(--color-error)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'quotations' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.quoteNo}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.customerName}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: item.status === 'Accepted' ? 'var(--color-success-bg)' : item.status === 'Sent' ? 'var(--color-info-bg)' : item.status === 'Draft' ? 'var(--bg-secondary)' : 'var(--color-error-bg)',
                                                color: item.status === 'Accepted' ? 'var(--color-success)' : item.status === 'Sent' ? 'var(--color-info)' : item.status === 'Draft' ? 'var(--text-secondary)' : 'var(--color-error)',
                                                fontSize: 'var(--font-size-xs)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'receipts' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.receiptNo}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.fromAccount}</td>
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
                                                {item.paymentMethod}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'payments' && (
                                    <>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{item.paymentNo}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.date}</td>
                                        <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{item.toAccount}</td>
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
                                                {item.paymentMethod}
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
                <button
                    className="btn btn-secondary"
                    onClick={fetchData}
                    style={{ padding: '6px', marginLeft: '8px' }}
                    title="Refresh Data"
                >
                    <RefreshCw size={16} className={isLoading ? 'spin-anim' : ''} />
                </button>
            </div>
            {isLoading && <div style={{ height: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div className="progress-bar-indeterminate" style={{ height: '100%', background: 'var(--color-primary)' }}></div>
            </div>}

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
                                padding: '4px 8px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: viewType === type ? 'var(--color-primary)' : 'var(--bg-elevated)',
                                color: viewType === type ? 'var(--text-inverse)' : 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            <Icon size={14} />
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
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
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
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="all">All Groups</option>
                            {groups.map(group => (
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
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
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
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'purchase-invoice' && (
                <PurchaseInvoiceForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'quotation' && (
                <QuotationForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'receipt-voucher' && (
                <ReceiptVoucherForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'payment-voucher' && (
                <PaymentVoucherForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                />
            )}
            {activeForm === 'new-account' && (
                <NewAccountForm
                    onSave={handleFormSave}
                    onClose={handleFormClose}
                    existingAccounts={ledgers}
                    existingGroups={groups}
                    onGroupCreated={fetchData}
                />
            )}
        </div>
    );
}

export default AccountsTab;





