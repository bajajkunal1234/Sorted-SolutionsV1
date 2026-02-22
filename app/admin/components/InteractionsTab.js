'use client'

import { useState, useEffect } from 'react';
import { Search, ChevronDown, Download, Calendar, Edit2, Activity, Database, Eye, EyeOff } from 'lucide-react';
import { sampleInteractions } from '@/lib/data/interactionsData';
import { sampleSalesInvoices, samplePurchaseInvoices, sampleQuotations, sampleReceipts, samplePayments } from '@/lib/data/transactionsData';
import { interactionTypes, interactionCategories, getInteractionType, getCategory } from '@/lib/data/interactionTypes';
import SalesInvoiceForm from './accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from './accounts/PurchaseInvoiceForm';
import QuotationForm from './accounts/QuotationForm';
import ReceiptVoucherForm from './accounts/ReceiptVoucherForm';
import PaymentVoucherForm from './accounts/PaymentVoucherForm';

import { supabase } from '@/lib/supabase';

function InteractionsTab({ searchTerm, setSearchTerm }) {
    const [interactions, setInteractions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSampleData, setShowSampleData] = useState(false);

    // Setup Supabase Realtime
    useEffect(() => {
        const channel = supabase
            .channel('realtime_interactions')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'interactions'
            }, (payload) => {
                console.log('New interaction received via Realtime:', payload.new);
                const newEntry = {
                    ...payload.new,
                    isLive: true,
                    customerId: payload.new.customer_id,
                    customerName: payload.new.customer_name || 'System',
                    jobId: payload.new.job_id,
                    invoiceId: payload.new.invoice_id,
                    performedBy: payload.new.performed_by,
                    performedByName: payload.new.performed_by_name
                };
                setInteractions(prev => [newEntry, ...prev]);
            })
            .subscribe();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Load interactions from Supabase and merge with sample data
    useEffect(() => {
        const fetchInteractions = async () => {
            setIsLoading(true);
            try {
                // Fetch from Supabase
                const { data, error } = await supabase
                    .from('interactions')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(100);

                if (error) throw error;

                // Map database fields to the UI format
                const dbInteractions = (data || []).map(item => ({
                    ...item,
                    isLive: true,
                    customerId: item.customer_id,
                    customerName: item.customer_name || 'System',
                    jobId: item.job_id,
                    invoiceId: item.invoice_id,
                    performedBy: item.performed_by,
                    performedByName: item.performed_by_name
                }));

                // Load fallback from localStorage if any
                const localLogs = JSON.parse(localStorage.getItem('system_interactions_fallback') || '[]');

                // Merge and sort
                const combined = [...dbInteractions, ...localLogs, ...sampleInteractions].sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );

                setInteractions(combined);
            } catch (err) {
                console.error('Failed to fetch interactions from Supabase:', err);
                const localLogs = JSON.parse(localStorage.getItem('system_interactions_fallback') || '[]');
                const combined = [...localLogs, ...sampleInteractions].sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                setInteractions(combined);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInteractions();
    }, []);

    // Local search props are now passed from parent
    const [searchField, setSearchField] = useState('all'); // all, customer, job, invoice, description
    const [groupBy, setGroupBy] = useState('none'); // none, customer, date, type, category, performedBy
    const [filterUser, setFilterUser] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Edit transaction state
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState(null);
    const [editData, setEditData] = useState(null);

    // Get unique users
    const uniqueUsers = [...new Set(interactions.map(i => i.performedByName))].sort();

    // Filter interactions
    const getFilteredInteractions = () => {
        return interactions.filter(interaction => {
            // Sample data filter
            if (!showSampleData && !interaction.isLive) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesSearch =
                    (searchField === 'all' || searchField === 'customer') && interaction.customerName?.toLowerCase().includes(term) ||
                    (searchField === 'all' || searchField === 'job') && interaction.jobId?.toLowerCase().includes(term) ||
                    (searchField === 'all' || searchField === 'invoice') && interaction.invoiceId?.toLowerCase().includes(term) ||
                    (searchField === 'all' || searchField === 'description') && interaction.description?.toLowerCase().includes(term);

                if (!matchesSearch) return false;
            }

            // User filter
            if (filterUser !== 'all' && interaction.performedByName !== filterUser) {
                return false;
            }

            // Type filter
            if (filterType !== 'all' && interaction.type !== filterType) {
                return false;
            }

            // Category filter
            if (filterCategory !== 'all' && interaction.category !== filterCategory) {
                return false;
            }

            // Date range filter
            if (dateFrom) {
                const interactionDate = new Date(interaction.timestamp);
                const fromDate = new Date(dateFrom);
                if (interactionDate < fromDate) return false;
            }

            if (dateTo) {
                const interactionDate = new Date(interaction.timestamp);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // End of day
                if (interactionDate > toDate) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    // Group interactions
    const getGroupedInteractions = () => {
        const filtered = getFilteredInteractions();

        if (groupBy === 'none') {
            return { ungrouped: filtered };
        }

        const grouped = {};

        filtered.forEach(interaction => {
            let key;
            switch (groupBy) {
                case 'customer':
                    key = interaction.customerName || 'Anonymous';
                    break;
                case 'date':
                    key = new Date(interaction.timestamp).toLocaleDateString();
                    break;
                case 'type':
                    key = getInteractionType(interaction.type).label;
                    break;
                case 'category':
                    key = getCategory(interaction.category).label;
                    break;
                case 'performedBy':
                    key = interaction.performedByName;
                    break;
                default:
                    key = 'Other';
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(interaction);
        });

        return grouped;
    };

    // Export to CSV
    const handleExport = () => {
        const filtered = getFilteredInteractions();
        const csv = [
            ['Timestamp', 'Type', 'Category', 'Customer', 'Job ID', 'Invoice ID', 'Performed By', 'Description', 'Source'].join(','),
            ...filtered.map(i => [
                new Date(i.timestamp).toLocaleString(),
                getInteractionType(i.type).label,
                getCategory(i.category).label,
                i.customerName || '',
                i.jobId || '',
                i.invoiceId || '',
                i.performedByName,
                `"${i.description}"`,
                i.source
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Check if interaction is editable
    const isEditable = (interaction) => {
        const editableTypes = [
            'sales-invoice-created',
            'purchase-invoice-created',
            'quotation-sent',
            'receipt-voucher-created',
            'payment-voucher-created'
        ];
        return editableTypes.includes(interaction.type) && interaction.invoiceId;
    };

    // Get form type from interaction type
    const getFormType = (interactionType) => {
        const mapping = {
            'sales-invoice-created': 'sales-invoice',
            'sales-invoice-edited': 'sales-invoice',
            'purchase-invoice-created': 'purchase-invoice',
            'purchase-invoice-edited': 'purchase-invoice',
            'quotation-sent': 'quotation',
            'quotation-edited': 'quotation',
            'receipt-voucher-created': 'receipt-voucher',
            'receipt-voucher-edited': 'receipt-voucher',
            'payment-voucher-created': 'payment-voucher',
            'payment-voucher-edited': 'payment-voucher'
        };
        return mapping[interactionType];
    };

    // Fetch transaction data by ID
    const fetchTransactionById = (id, type) => {
        switch (type) {
            case 'sales-invoice':
                return sampleSalesInvoices.find(inv => inv.invoiceNo === id);
            case 'purchase-invoice':
                return samplePurchaseInvoices.find(inv => inv.invoiceNo === id);
            case 'quotation':
                return sampleQuotations.find(q => q.quoteNo === id);
            case 'receipt-voucher':
                return sampleReceipts.find(r => r.receiptNo === id);
            case 'payment-voucher':
                return samplePayments.find(p => p.paymentNo === id);
            default:
                return null;
        }
    };

    // Handle edit transaction click
    const handleEditTransaction = (interaction) => {
        const type = getFormType(interaction.type);
        const transactionData = fetchTransactionById(interaction.invoiceId, type);

        if (!transactionData) {
            alert('Transaction not found. It may have been deleted.');
            return;
        }

        // Transform simple mock data to full form structure
        let transformedData = null;

        if (type === 'sales-invoice' || type === 'purchase-invoice') {
            transformedData = {
                reference: transactionData.invoiceNo,
                date: transactionData.date,
                accountId: null,
                accountGSTIN: '',
                accountState: 'Maharashtra',
                property: null,
                billingAddress: transactionData.ledgerName || transactionData.supplierName || '',
                shippingAddress: '',
                items: [
                    {
                        id: 1,
                        productId: '',
                        description: type === 'sales-invoice' ? 'Service' : 'Purchase',
                        hsn: '',
                        qty: 1,
                        rate: transactionData.amount,
                        discount: 0,
                        taxRate: 0,
                        total: transactionData.amount
                    }
                ],
                notes: '',
                terms: 'Payment due within 30 days.',
                technician: '',
                status: transactionData.status
            };
        } else if (type === 'quotation') {
            transformedData = {
                reference: transactionData.quoteNo,
                date: transactionData.date,
                accountId: null,
                accountGSTIN: '',
                accountState: 'Maharashtra',
                property: null,
                billingAddress: transactionData.customerName || '',
                shippingAddress: '',
                items: [
                    {
                        id: 1,
                        productId: '',
                        description: 'Service',
                        hsn: '',
                        qty: 1,
                        rate: transactionData.amount,
                        discount: 0,
                        taxRate: 0,
                        total: transactionData.amount
                    }
                ],
                validUntil: new Date(new Date(transactionData.date).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: '',
                terms: 'Quote valid for 15 days.',
                status: transactionData.status
            };
        } else if (type === 'receipt-voucher') {
            transformedData = {
                reference: transactionData.receiptNo,
                date: transactionData.date,
                fromAccountId: null,
                fromAccountName: transactionData.fromAccount,
                amount: transactionData.amount,
                paymentMethod: transactionData.paymentMethod,
                notes: ''
            };
        } else if (type === 'payment-voucher') {
            transformedData = {
                reference: transactionData.paymentNo,
                date: transactionData.date,
                toAccountId: null,
                toAccountName: transactionData.toAccount,
                amount: transactionData.amount,
                paymentMethod: transactionData.paymentMethod,
                notes: ''
            };
        }

        setFormType(type);
        setEditData(transformedData);
        setShowForm(true);
    };

    // Handle save edit
    const handleSaveEdit = (updatedData) => {
        // Update transaction in data store (in real app, this would be API call)
        console.log('Transaction updated:', updatedData);

        // Create new interaction entry
        const editTypeMap = {
            'sales-invoice': 'sales-invoice-edited',
            'purchase-invoice': 'purchase-invoice-edited',
            'quotation': 'quotation-edited',
            'receipt-voucher': 'receipt-voucher-edited',
            'payment-voucher': 'payment-voucher-edited'
        };

        const newInteraction = {
            id: interactions.length + 1,
            type: editTypeMap[formType],
            category: 'sales',
            timestamp: new Date().toISOString(),
            customerId: editData.customerId || null,
            customerName: editData.customerName || editData.ledgerName || editData.supplierName || 'Unknown',
            jobId: editData.jobId || null,
            invoiceId: editData.invoiceNo || editData.quoteNo || editData.receiptNo || editData.paymentNo,
            performedBy: 'admin-001',
            performedByName: 'Current Admin',
            description: `Admin edited ${getInteractionType(editTypeMap[formType]).label}`,
            metadata: { changes: updatedData },
            source: 'Admin Panel',
            status: 'completed'
        };

        setInteractions([newInteraction, ...interactions]);

        // Close form
        setShowForm(false);
        setEditData(null);
        setFormType(null);

        alert('Transaction updated successfully!');
    };

    const groupedData = getGroupedInteractions();

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Row 1: Date Range & Actions */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
            }}>
                {/* Date Range */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From"
                        style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                        style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                <div style={{ flex: 1 }} />

                <button
                    onClick={handleExport}
                    className="btn btn-secondary"
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Filter Section Row 1 */}
            <div style={{
                padding: 'var(--spacing-xs) var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Search Field selector */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '6px 24px 6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            minWidth: '100px'
                        }}
                    >
                        <option value="all">Search All</option>
                        <option value="customer">In Customers</option>
                        <option value="job">In Job IDs</option>
                        <option value="invoice">In Invoices</option>
                        <option value="description">In Descriptions</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Group By */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '6px 24px 6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="none">No Grouping</option>
                        <option value="customer">Group by Customer</option>
                        <option value="date">Group by Date</option>
                        <option value="type">Group by Type</option>
                        <option value="category">Group by Category</option>
                        <option value="performedBy">Group by User</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Filter by User */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '6px 24px 6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Users</option>
                        {uniqueUsers.map(user => (
                            <option key={user} value={user}>{user}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Filter by Type */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '6px 24px 6px 8px',
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
                        {Object.entries(interactionTypes).map(([key, type]) => (
                            <option key={key} value={key}>{type.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
            </div>

            {/* Filter Section Row 2 */}
            <div style={{
                padding: 'var(--spacing-xs) var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Filter by Category */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '6px 24px 6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            minWidth: '150px'
                        }}
                    >
                        <option value="all">All Categories</option>
                        {interactionCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Show Sample Data Toggle */}
                <button
                    onClick={() => setShowSampleData(!showSampleData)}
                    className="btn btn-secondary"
                    style={{
                        padding: '6px 12px',
                        fontSize: 'var(--font-size-xs)',
                        backgroundColor: showSampleData ? 'var(--bg-secondary)' : 'transparent',
                        borderColor: showSampleData ? 'var(--color-primary)' : 'var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    title={showSampleData ? "Hide Sample Data" : "Show Sample Data"}
                >
                    {showSampleData ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showSampleData ? "Showing Sample" : "Sample Hidden"}
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {Object.entries(groupedData).map(([groupName, groupInteractions]) => (
                    <div key={groupName} style={{ marginBottom: 'var(--spacing-lg)' }}>
                        {groupBy !== 'none' && (
                            <h3 style={{
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-sm)',
                                color: 'var(--text-primary)',
                                padding: 'var(--spacing-xs) 0',
                                borderBottom: '2px solid var(--border-primary)'
                            }}>
                                {groupName} ({groupInteractions.length})
                            </h3>
                        )}

                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '140px' }}>Timestamp</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '50px' }}>Icon</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Type</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Category</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Customer</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Job/Invoice</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Performed By</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Description</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Source</th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '80px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupInteractions.map(interaction => {
                                    const typeInfo = getInteractionType(interaction.type);
                                    const categoryInfo = getCategory(interaction.category);

                                    return (
                                        <tr
                                            key={interaction.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-primary)',
                                                transition: 'background-color var(--transition-fast)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                {formatTimestamp(interaction.timestamp)}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: '20px', textAlign: 'center' }}>
                                                {typeInfo.icon}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {typeInfo.label}
                                                    {interaction.isLive && (
                                                        <span
                                                            title="Live Database Entry"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '2px',
                                                                padding: '1px 4px',
                                                                borderRadius: '4px',
                                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10b981',
                                                                fontSize: '8px',
                                                                fontWeight: 'bold',
                                                                textTransform: 'uppercase',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                                            }}
                                                        >
                                                            <Activity size={8} />
                                                            Live
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: categoryInfo.color + '20',
                                                    color: categoryInfo.color,
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 500
                                                }}>
                                                    {categoryInfo.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
                                                {interaction.customerName || '-'}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace' }}>
                                                {interaction.jobId || interaction.invoiceId || '-'}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                {interaction.performedByName}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
                                                {interaction.description}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    fontSize: 'var(--font-size-xs)'
                                                }}>
                                                    {interaction.source}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                                {isEditable(interaction) && (
                                                    <button
                                                        onClick={() => handleEditTransaction(interaction)}
                                                        className="btn btn-secondary"
                                                        style={{
                                                            padding: '4px 12px',
                                                            fontSize: 'var(--font-size-xs)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}

                {getFilteredInteractions().length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: 'var(--text-tertiary)'
                    }}>
                        No interactions found matching your filters.
                    </div>
                )}
            </div>

            {/* Transaction Forms */}
            {showForm && formType === 'sales-invoice' && (
                <SalesInvoiceForm
                    onClose={() => {
                        setShowForm(false);
                        setEditData(null);
                        setFormType(null);
                    }}
                    onSave={handleSaveEdit}
                    existingInvoice={editData}
                />
            )}

            {showForm && formType === 'purchase-invoice' && (
                <PurchaseInvoiceForm
                    onClose={() => {
                        setShowForm(false);
                        setEditData(null);
                        setFormType(null);
                    }}
                    onSave={handleSaveEdit}
                    existingInvoice={editData}
                />
            )}

            {showForm && formType === 'quotation' && (
                <QuotationForm
                    onClose={() => {
                        setShowForm(false);
                        setEditData(null);
                        setFormType(null);
                    }}
                    onSave={handleSaveEdit}
                    existingQuotation={editData}
                />
            )}

            {showForm && formType === 'receipt-voucher' && (
                <ReceiptVoucherForm
                    onClose={() => {
                        setShowForm(false);
                        setEditData(null);
                        setFormType(null);
                    }}
                    onSave={handleSaveEdit}
                    existingReceipt={editData}
                />
            )}

            {showForm && formType === 'payment-voucher' && (
                <PaymentVoucherForm
                    onClose={() => {
                        setShowForm(false);
                        setEditData(null);
                        setFormType(null);
                    }}
                    onSave={handleSaveEdit}
                    existingPayment={editData}
                />
            )}
        </div>
    );
}

export default InteractionsTab;
