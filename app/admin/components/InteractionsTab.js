'use client'

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Download, Calendar, Edit2, Activity, Database, Eye, EyeOff, Columns, RefreshCcw, Zap } from 'lucide-react';
import { interactionTypes, interactionCategories, getInteractionType, getCategory } from '@/lib/data/interactionTypes';
import SalesInvoiceForm from './accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from './accounts/PurchaseInvoiceForm';
import QuotationForm from './accounts/QuotationForm';
import ReceiptVoucherForm from './accounts/ReceiptVoucherForm';
import PaymentVoucherForm from './accounts/PaymentVoucherForm';
import InteractionTriggersTab from './reports/InteractionTriggersTab';
import InteractionsSearchPanel from '@/components/shared/InteractionsSearchPanel';


function InteractionsTab({ searchTerm: propSearchTerm, setSearchTerm: propSetSearchTerm }) {
    const [interactions, setInteractions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [activeView, setActiveView] = useState('feed'); // 'feed' | 'triggers'

    const fetchInteractions = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(`/api/admin/interactions?limit=500&_t=${Date.now()}`, { cache: 'no-store' });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            // Normalize DB fields to what the UI expects
            const mapped = (result.data || []).map(item => {
                let name = item.performed_by_name;
                if (!name) {
                    name = 'System';
                } else if (name === 'Technician') {
                    name = item.jobs?.technician_name || 'Technician';
                }
                return {
                    ...item,
                    isLive: true,
                    customerId: item.customer_id,
                    customerName: item.customer_name || 'System',
                    jobId: item.job_id,
                    invoiceId: item.invoice_id,
                    performedBy: item.performed_by,
                    performedByName: name,
                };
            });
            setInteractions(mapped);
        } catch (err) {
            console.error('Failed to fetch interactions:', err);
            setLoadError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchInteractions(); }, []);


    // Local search & filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState('none');
    const [sortBy, setSortBy] = useState('timestamp_desc');
    const [activeTags, setActiveTags] = useState([]);
    const [savedViews, setSavedViews] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);

    // Fetch saved views
    useEffect(() => {
        fetch('/api/admin/interaction-views')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    const views = d.data || [];
                    setSavedViews(views);
                    const defaultView = views.find(v => v.isDefault);
                    if (defaultView) applyView(defaultView);
                }
            })
            .catch(() => {});
    }, []);

    const persistViews = async (views) => {
        setSavedViews(views);
        try {
            await fetch('/api/admin/interaction-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views })
            });
        } catch (e) {}
    };

    const handleSaveNamedView = async (name) => {
        setSaveStatus('saving');
        const config = { searchTerm, sortBy, groupBy, activeTags };
        const existing = savedViews.find(v => v.name.toLowerCase() === name.toLowerCase());
        let updated;
        if (existing) {
            updated = savedViews.map(v => v.name.toLowerCase() === name.toLowerCase() ? { ...v, config } : v);
        } else {
            const isFirst = savedViews.length === 0;
            updated = [...savedViews, { id: Math.random().toString(36).slice(2, 9), name, isDefault: isFirst, config }];
        }
        await persistViews(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const deleteView = async (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        await persistViews(updated);
    };

    const setDefaultView = async (id) => {
        const updated = savedViews.map(v => ({ ...v, isDefault: v.id === id }));
        await persistViews(updated);
    };

    const applyView = (view) => {
        const c = view.config || {};
        if (c.searchTerm !== undefined) setSearchTerm(c.searchTerm);
        if (c.sortBy !== undefined) setSortBy(c.sortBy);
        if (c.groupBy !== undefined) setGroupBy(c.groupBy);
        if (c.activeTags !== undefined) setActiveTags(c.activeTags);
    };

    const handleResetView = () => {
        setSearchTerm('');
        setSortBy('timestamp_desc');
        setGroupBy('none');
        setActiveTags([]);
    };

    const handleAddTag = (tag) => {
        setActiveTags(prev => {
            const filtered = prev.filter(t => t.id !== tag.id);
            return [...filtered, tag];
        });
    };

    const handleRemoveTag = (id) => {
        setActiveTags(prev => prev.filter(t => t.id !== id));
    };

    // Edit transaction state
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState(null);
    const [editData, setEditData] = useState(null);

    // Column visibility
    const ALL_COLUMNS = [
        { id: 'timestamp', label: 'Timestamp' },
        { id: 'icon', label: 'Icon' },
        { id: 'type', label: 'Type' },
        { id: 'category', label: 'Category' },
        { id: 'customer', label: 'Customer' },
        { id: 'jobInvoice', label: 'Job / Invoice' },
        { id: 'performedBy', label: 'Performed By' },
        { id: 'description', label: 'Description' },
        { id: 'source', label: 'Source' },
        { id: 'actions', label: 'Actions' },
    ];
    const [visibleCols, setVisibleCols] = useState(
        () => Object.fromEntries(ALL_COLUMNS.map(c => [c.id, true]))
    );
    const [showColPicker, setShowColPicker] = useState(false);
    const colPickerRef = useRef(null);

    const [colOrder, setColOrder] = useState(() => ALL_COLUMNS.map(c => c.id));

    const moveCol = (index, direction) => {
        const newOrder = [...colOrder];
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= newOrder.length) return;
        const temp = newOrder[index];
        newOrder[index] = newOrder[nextIndex];
        newOrder[nextIndex] = temp;
        setColOrder(newOrder);
        try {
            localStorage.setItem('interactions_col_order', JSON.stringify(newOrder));
        } catch (e) {}
    };

    useEffect(() => {
        // Load settings from localStorage client-side
        try {
            const savedOrder = localStorage.getItem('interactions_col_order');
            if (savedOrder) {
                const parsed = JSON.parse(savedOrder);
                if (Array.isArray(parsed) && parsed.length === ALL_COLUMNS.length) {
                    setColOrder(parsed);
                }
            }
        } catch (e) {}

        try {
            const savedVisible = localStorage.getItem('interactions_visible_cols');
            if (savedVisible) {
                const parsed = JSON.parse(savedVisible);
                if (typeof parsed === 'object' && parsed !== null) {
                    setVisibleCols(prev => ({ ...prev, ...parsed }));
                }
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
                setShowColPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleCol = (id) => setVisibleCols(prev => {
        const next = { ...prev, [id]: !prev[id] };
        try {
            localStorage.setItem('interactions_visible_cols', JSON.stringify(next));
        } catch (e) {}
        return next;
    });
    const col = (id) => visibleCols[id]; // shorthand

    const renderHeaderCell = (colId) => {
        switch (colId) {
            case 'timestamp':
                return <th key="timestamp" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '150px', minWidth: '150px' }}>Timestamp</th>;
            case 'icon':
                return <th key="icon" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '50px', minWidth: '50px' }}>Icon</th>;
            case 'type':
                return <th key="type" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '160px' }}>Type</th>;
            case 'category':
                return <th key="category" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '130px' }}>Category</th>;
            case 'customer':
                return <th key="customer" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '130px' }}>Customer</th>;
            case 'jobInvoice':
                return <th key="jobInvoice" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '140px' }}>Job/Invoice</th>;
            case 'performedBy':
                return <th key="performedBy" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '130px' }}>Performed By</th>;
            case 'description':
                return <th key="description" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '220px' }}>Description</th>;
            case 'source':
                return <th key="source" style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, minWidth: '110px' }}>Source</th>;
            case 'actions':
                return <th key="actions" style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: '80px', minWidth: '80px' }}>Actions</th>;
            default:
                return null;
        }
    };

    const renderBodyCell = (colId, interaction, typeInfo, categoryInfo) => {
        switch (colId) {
            case 'timestamp':
                return <td key="timestamp" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontFamily: 'monospace', width: '150px', minWidth: '150px' }}>{formatTimestamp(interaction.timestamp)}</td>;
            case 'icon':
                return <td key="icon" style={{ padding: 'var(--spacing-sm)', fontSize: '20px', textAlign: 'center', width: '50px', minWidth: '50px' }}>{typeInfo.icon}</td>;
            case 'type':
                return (
                    <td key="type" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500, minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {typeInfo.label}
                            {interaction.isLive && (
                                <span title="Live Database Entry" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 4px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <Activity size={8} /> Live
                                </span>
                            )}
                        </div>
                    </td>
                );
            case 'category':
                return (
                    <td key="category" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', minWidth: '130px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: categoryInfo.color + '20', color: categoryInfo.color, fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                            {categoryInfo.label}
                        </span>
                    </td>
                );
            case 'customer':
                return <td key="customer" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', minWidth: '130px' }}>{interaction.customerName || '-'}</td>;
            case 'jobInvoice':
                return <td key="jobInvoice" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', minWidth: '140px' }}>{interaction.jobId || interaction.invoiceId || '-'}</td>;
            case 'performedBy':
                return <td key="performedBy" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', minWidth: '130px' }}>{interaction.performedByName}</td>;
            case 'description':
                return <td key="description" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', minWidth: '220px' }}>{interaction.description}</td>;
            case 'source':
                return (
                    <td key="source" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', minWidth: '110px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: 'var(--font-size-xs)' }}>
                            {interaction.source}
                        </span>
                    </td>
                );
            case 'actions':
                return (
                    <td key="actions" style={{ padding: 'var(--spacing-sm)', textAlign: 'right', width: '80px', minWidth: '80px' }}>
                        {isEditable(interaction) && (
                            <button onClick={() => handleEditTransaction(interaction)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Edit2 size={14} /> Edit
                            </button>
                        )}
                    </td>
                );
            default:
                return null;
        }
    };

    // Get unique users
    const uniqueUsers = [...new Set(interactions.map(i => i.performedByName))].sort();

    const evaluateCondition = (interaction, condition) => {
        const { field, operator, value } = condition;
        let itemVal = '';
        if (field === 'customer') itemVal = interaction.customerName || '';
        else if (field === 'performedBy') itemVal = interaction.performedByName || '';
        else if (field === 'jobId') itemVal = interaction.jobId || '';
        else if (field === 'invoiceId') itemVal = interaction.invoiceId || '';
        else if (field === 'type') itemVal = interaction.type || '';
        else if (field === 'category') itemVal = interaction.category || '';
        else if (field === 'description') itemVal = interaction.description || '';
        else if (field === 'timestamp') itemVal = interaction.timestamp || '';

        const itemStr = String(itemVal).toLowerCase();
        const compStr = String(value).toLowerCase();

        switch (operator) {
            case 'contains':
                return itemStr.includes(compStr);
            case 'not_contains':
                return !itemStr.includes(compStr);
            case 'is':
                if (field === 'timestamp') {
                    if (!value) return true;
                    const d1 = new Date(itemVal).toDateString();
                    const d2 = new Date(value).toDateString();
                    return d1 === d2;
                }
                return itemStr === compStr;
            case 'is_not':
                return itemStr !== compStr;
            case 'before':
                if (field === 'timestamp') {
                    if (!value) return true;
                    return new Date(itemVal) < new Date(value);
                }
                return itemStr < compStr;
            case 'after':
                if (field === 'timestamp') {
                    if (!value) return true;
                    const d = new Date(value);
                    d.setHours(23, 59, 59, 999);
                    return new Date(itemVal) > d;
                }
                return itemStr > compStr;
            default:
                return true;
        }
    };

    // Filter interactions
    const getFilteredInteractions = () => {
        let result = [...interactions];

        // 1. Search term (matches customerName, performedByName, jobId, invoiceId, description)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(interaction => 
                (interaction.customerName || '').toLowerCase().includes(term) ||
                (interaction.performedByName || '').toLowerCase().includes(term) ||
                (interaction.jobId || '').toLowerCase().includes(term) ||
                (interaction.invoiceId || '').toLowerCase().includes(term) ||
                (interaction.description || '').toLowerCase().includes(term)
            );
        }

        // 2. Active tags
        if (activeTags.length > 0) {
            result = result.filter(interaction => {
                return activeTags.every(tag => {
                    if (tag.type === 'preset') {
                        return Object.entries(tag.filter).every(([key, val]) => {
                            return interaction[key] === val;
                        });
                    } else if (tag.type === 'custom') {
                        return tag.conditions.every(cond => evaluateCondition(interaction, cond));
                    }
                    return true;
                });
            });
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sortBy === 'timestamp_desc') {
                return new Date(b.timestamp) - new Date(a.timestamp);
            } else if (sortBy === 'timestamp_asc') {
                return new Date(a.timestamp) - new Date(b.timestamp);
            } else if (sortBy === 'customer_asc') {
                return (a.customerName || '').localeCompare(b.customerName || '');
            } else if (sortBy === 'customer_desc') {
                return (b.customerName || '').localeCompare(a.customerName || '');
            } else if (sortBy === 'type_asc') {
                return (a.type || '').localeCompare(b.type || '');
            }
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        return result;
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
                    key = new Date(interaction.timestamp).toLocaleDateString('en-GB');
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
            {/* Odoo-style Search & Action Row */}
            <div className="tab-header-row" style={{
                padding: '8px 16px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                {activeView === 'feed' && (
                    <>
                        {/* Odoo Search Panel */}
                        <InteractionsSearchPanel
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            groupBy={groupBy}
                            onGroupByChange={setGroupBy}
                            sortBy={sortBy}
                            onSortByChange={setSortBy}
                            activeTags={activeTags}
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

                        {/* Column Picker */}
                        <div ref={colPickerRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowColPicker(v => !v)}
                                className="btn btn-secondary"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 'var(--font-size-xs)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    borderColor: showColPicker ? 'var(--color-primary)' : 'var(--border-primary)',
                                }}
                            >
                                <Columns size={14} /> Columns
                                <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: showColPicker ? 'rotate(180deg)' : 'none' }} />
                            </button>

                            {showColPicker && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 200, minWidth: 220, padding: '8px 0',
                                }}>
                                    <div style={{ padding: '4px 12px 8px', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-primary)', marginBottom: 4 }}>
                                        Toggle & Rearrange
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {colOrder.map((colId, index) => {
                                            const c = ALL_COLUMNS.find(x => x.id === colId);
                                            if (!c) return null;
                                            return (
                                                <div key={c.id} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '5px 12px',
                                                    transition: 'background 0.15s',
                                                    gap: 8
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <label style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        cursor: 'pointer', flex: 1, margin: 0,
                                                        fontSize: 'var(--font-size-xs)', fontWeight: 500,
                                                        color: visibleCols[c.id] ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!visibleCols[c.id]}
                                                            onChange={() => toggleCol(c.id)}
                                                            style={{ accentColor: 'var(--color-primary)', width: 14, height: 14 }}
                                                        />
                                                        {c.label}
                                                    </label>
                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveCol(index, -1); }}
                                                            disabled={index === 0}
                                                            style={{
                                                                background: 'none', border: 'none', color: index === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                                cursor: index === 0 ? 'default' : 'pointer', padding: 2, display: 'flex', alignItems: 'center', opacity: index === 0 ? 0.3 : 1
                                                            }}
                                                            title="Move Up"
                                                        >
                                                            <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveCol(index, 1); }}
                                                            disabled={index === colOrder.length - 1}
                                                            style={{
                                                                background: 'none', border: 'none', color: index === colOrder.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                                cursor: index === colOrder.length - 1 ? 'default' : 'pointer', padding: 2, display: 'flex', alignItems: 'center', opacity: index === colOrder.length - 1 ? 0.3 : 1
                                                            }}
                                                            title="Move Down"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-primary)', margin: '6px 0 4px', padding: '6px 14px 0', display: 'flex', gap: 8 }}>
                                        <button onClick={() => {
                                            const allVisible = Object.fromEntries(ALL_COLUMNS.map(c => [c.id, true]));
                                            setVisibleCols(allVisible);
                                            try {
                                                localStorage.setItem('interactions_visible_cols', JSON.stringify(allVisible));
                                            } catch (e) {}
                                        }} style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '4px 0', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>Show All</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions: Refresh */}
                        <button
                            type="button"
                            onClick={fetchInteractions}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <RefreshCcw size={14} />
                            Refresh
                        </button>
                    </>
                )}
            </div>

            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-primary)', padding: '0 var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', gap: 4, flexShrink: 0 }}>
                {[{ id: 'feed', label: 'Interaction Feed', icon: Activity }, { id: 'triggers', label: '⚡ Triggers', icon: Zap }].map(tab => (
                    <button key={tab.id} type="button" onClick={() => setActiveView(tab.id)}
                        style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeView === tab.id ? 700 : 500, color: activeView === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)', borderBottom: activeView === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -2, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeView === 'triggers' && <InteractionTriggersTab />}

            {activeView === 'feed' && <>
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

                        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', display: 'block', WebkitOverflowScrolling: 'touch' }}>
                            <table className="data-table" style={{ width: '1100px', minWidth: '1100px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                        {colOrder.map(colId => visibleCols[colId] && renderHeaderCell(colId))}
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
                                                {colOrder.map(colId => visibleCols[colId] && renderBodyCell(colId, interaction, typeInfo, categoryInfo))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
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
            </>}
        </div>
    );
}

export default InteractionsTab;
