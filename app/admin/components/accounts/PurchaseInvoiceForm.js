'use client'

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import ProductSelector from '@/app/admin/components/common/ProductSelector';
import NewAccountForm from './NewAccountForm';
import RepairCalculator from '@/components/common/RepairCalculator';
import { accountsAPI, printSettingsAPI } from '@/lib/adminAPI';
import JobSelector from './JobSelector';

function PurchaseInvoiceForm({ onClose, onSave, existingInvoice }) {
    const [formData, setFormData] = useState({
        account_id: existingInvoice?.account_id || null,
        account_name: existingInvoice?.account_name || '',
        accountGSTIN: existingInvoice?.accountGSTIN || '',
        accountState: existingInvoice?.accountState || 'Maharashtra',
        property: existingInvoice?.property || null,
        billing_address: existingInvoice?.billing_address || '',
        vendor_invoice_number: existingInvoice?.vendor_invoice_number || '',
        date: existingInvoice?.date || new Date().toISOString().split('T')[0],
        po_reference: existingInvoice?.po_reference || '',
        job_id: existingInvoice?.job_id || null,
        items: existingInvoice?.items || [
            { id: 1, productId: '', description: '', hsn: '', qty: 1, rate: 0, discount: 0, taxRate: 18, total: 0 }
        ],
        notes: existingInvoice?.notes || '',
        category: existingInvoice?.category || 'spare-parts',
        paid_by: existingInvoice?.paid_by || 'company',
        showTax: existingInvoice?.showTax !== undefined
            ? existingInvoice.showTax
            : (existingInvoice?.cgst > 0 || existingInvoice?.sgst > 0 || existingInvoice?.igst > 0 || existingInvoice?.total_tax > 0)
    });

    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [suggestedInitialData, setSuggestedInitialData] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [invoiceMode, setInvoiceMode] = useState('item');
    const [expenseAccounts, setExpenseAccounts] = useState([]);

    const handleCreateSuggestedAccount = (suggested) => {
        setSuggestedInitialData({
            name: suggested.name,
            mobile: suggested.phone || '',
            under: 'spare-parts-suppliers',
            customerDescription: `${suggested.locality || ''}${suggested.pincode ? `, Mumbai - ${suggested.pincode}` : ''}`
        });
        setShowNewAccountForm(true);
    };

    useEffect(() => {
        const fetchExpenseAccounts = async () => {
            try {
                const data = await accountsAPI.getAll('expense');
                setExpenseAccounts(data || []);
            } catch (err) {
                console.error('Error fetching expense accounts for selector:', err);
            }
        };
        fetchExpenseAccounts();
    }, []);

    useEffect(() => {
        if (existingInvoice && expenseAccounts.length > 0) {
            const hasExpenseItem = existingInvoice.items?.some(item =>
                expenseAccounts.some(acc => acc.id === item.productId)
            );
            if (hasExpenseItem) {
                setInvoiceMode('ledger');
            }
        }
    }, [existingInvoice, expenseAccounts]);

    useEffect(() => {
        printSettingsAPI.get()
            .then(res => {
                if (res?.success && res.data) {
                    const printData = res.data;
                    const defaultShowTax = printData.invoice_show_gst ?? printData.show_gst ?? true;
                    if (existingInvoice?.showTax === undefined && 
                        !(existingInvoice?.cgst > 0 || existingInvoice?.sgst > 0 || existingInvoice?.igst > 0 || existingInvoice?.total_tax > 0)) {
                        setFormData(prev => {
                            const updatedItems = prev.items.map(item => ({
                                ...item,
                                total: calculateItemTotalWithTax(item, defaultShowTax)
                            }));
                            return {
                                ...prev,
                                showTax: defaultShowTax,
                                items: updatedItems
                            };
                        });
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching print settings:', err);
            });
    }, [existingInvoice]);

    const companyState = 'Maharashtra';

    const calculateItemTotalWithTax = (item, taxEnabled) => {
        const subtotal = item.qty * item.rate;
        const discountAmount = item.discount || 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxEnabled ? ((taxableAmount * (item.taxRate || 0)) / 100) : 0;
        return taxableAmount + taxAmount;
    };

    const calculateItemTotal = (item) => {
        return calculateItemTotalWithTax(item, formData.showTax);
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const taxableAmount = subtotal - totalDiscount;

        const isInterState = formData.accountState !== companyState;
        let cgst = 0, sgst = 0, igst = 0;

        formData.items.forEach(item => {
            const itemTaxable = (item.qty * item.rate) - (item.discount || 0);
            const taxAmount = formData.showTax ? ((itemTaxable * (item.taxRate || 0)) / 100) : 0;

            if (isInterState) {
                igst += taxAmount;
            } else {
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            }
        });

        const totalTax = cgst + sgst + igst;
        const totalAmount = taxableAmount + totalTax;

        return {
            subtotal,
            discount: totalDiscount,
            cgst,
            sgst,
            igst,
            total_tax: totalTax,
            total_amount: Math.round(totalAmount)
        };
    };

    const totals = calculateTotals();

    const handleAccountChange = (account) => {
        if (!account) return;
        setFormData(prev => ({
            ...prev,
            account_id: account.id,
            account_name: account.name,
            accountGSTIN: account.gstin || '',
            accountState: account.address?.state || account.state || 'Maharashtra',
            property: null,
            billing_address: ''
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'description' || field === 'hsn' ? value : parseFloat(value) || 0;
        newItems[index].total = calculateItemTotal(newItems[index]);
        setFormData({ ...formData, items: newItems });
    };

    const handleCalculatorItems = (calcItems) => {
        const productItems = calcItems.filter(it => it.type !== 'service').map((it, idx) => {
            const newItem = {
                id: Date.now() + idx,
                productId: it.productId || '',
                description: it.description,
                hsn: it.hsn || '',
                qty: it.qty || 1,
                rate: it.rate || 0,
                discount: it.discount || 0,
                taxRate: it.taxRate || 18
            };
            return {
                ...newItem,
                total: calculateItemTotalWithTax(newItem, formData.showTax)
            };
        });

        const serviceItems = calcItems.filter(it => it.type === 'service').map((it, idx) => ({
            id: Date.now() + 1000 + idx,
            serviceId: it.productId || '',
            name: it.description,
            amount: (it.qty || 1) * (it.rate || 0),
            taxRate: it.taxRate || 18
        }));
        
        setFormData(prev => ({
            ...prev,
            items: prev.items.length === 1 && !prev.items[0].description && productItems.length > 0 ? productItems : [...prev.items, ...productItems]
        }));

        if (serviceItems.length > 0) {
            setCharges(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.length === 1 && !current[0].name && serviceItems.length > 0 ? serviceItems : [...current, ...serviceItems];
            });
        }
        setShowCalculator(false);
    };

    const addItem = () => {
        const newItem = {
            id: Date.now(),
            description: '',
            hsn: '',
            qty: 1,
            rate: 0,
            discount: 0,
            taxRate: 18
        };
        setFormData({
            ...formData,
            items: [...formData.items, {
                ...newItem,
                total: calculateItemTotalWithTax(newItem, formData.showTax)
            }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleSave = (action) => {
        if (!formData.account_id) {
            alert('Please select an account');
            return;
        }
        if (!formData.vendor_invoice_number) {
            alert('Please enter vendor invoice number');
            return;
        }
        if (invoiceMode === 'ledger' && !formData.notes?.trim()) {
            alert('Please enter a narration for this accounting invoice');
            return;
        }
        const hasInvalidItems = invoiceMode === 'ledger'
            ? formData.items.some(item => !item.productId || !item.description || item.rate <= 0)
            : formData.items.some(item => !item.productId || !item.description || item.qty <= 0 || item.rate < 0);
        if (hasInvalidItems) {
            alert(invoiceMode === 'ledger' ? 'Please select an expense ledger and enter a valid amount' : 'Please fill all item details correctly');
            return;
        }

        const cleanedItems = formData.items.map(item => {
            if (invoiceMode === 'ledger') {
                return {
                    ...item,
                    qty: 1,
                    discount: 0
                };
            }
            return item;
        });

        const purchaseData = {
            ...formData,
            items: cleanedItems,
            ...totals,
            __formType: 'purchase',
            status: 'finalized'
        };

        // Remove UI-only fields
        delete purchaseData.accountGSTIN;
        delete purchaseData.accountState;
        delete purchaseData.property;

        onSave(purchaseData, action);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#3b82f6' }}>
                            {existingInvoice ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}
                        </h3>
                        {existingInvoice && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                    Invoice: {existingInvoice.vendor_invoice_number || 'DRAFT'}
                                </p>
                                {existingInvoice.paid_by && (
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: existingInvoice.paid_by === 'technician' ? '#f59e0b20' : '#10b98120',
                                        color: existingInvoice.paid_by === 'technician' ? '#f59e0b' : '#10b981',
                                        border: `1px solid ${existingInvoice.paid_by === 'technician' ? '#f59e0b40' : '#10b98140'}`
                                    }}>
                                        {existingInvoice.paid_by === 'technician' ? 'Paid by Technician' : 'Paid by Company'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 'var(--spacing-xs)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
                    {/* Suggested Supplier Card */}
                    {(() => {
                        let suggestedSupplier = null;
                        if (formData.billing_address) {
                            try {
                                const parsed = JSON.parse(formData.billing_address);
                                if (parsed && parsed.isSuggested) {
                                    suggestedSupplier = parsed;
                                }
                            } catch (e) {}
                        }
                        if (!suggestedSupplier) return null;
                        return (
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#d97706', fontSize: '13px', marginBottom: '2px' }}>
                                        Technician Suggested New Supplier
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <strong>Name:</strong> {suggestedSupplier.name} &nbsp;|&nbsp; 
                                        <strong> Phone:</strong> {suggestedSupplier.phone || 'N/A'} &nbsp;|&nbsp; 
                                        <strong> Locality:</strong> {suggestedSupplier.locality} {suggestedSupplier.pincode ? `(${suggestedSupplier.pincode})` : ''}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCreateSuggestedAccount(suggestedSupplier)}
                                    style={{
                                        backgroundColor: '#f59e0b',
                                        color: '#fff',
                                        fontSize: '12px',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Create Supplier Account
                                </button>
                            </div>
                        );
                    })()}

                    {/* Account & Invoice Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div>
                            <AccountSelector
                                value={formData.account_id}
                                onChange={handleAccountChange}
                                onCreateNew={() => setShowNewAccountForm(true)}
                                accountType="vendor"
                                label="Account"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Vendor Invoice Number *
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.vendor_invoice_number}
                                onChange={(e) => setFormData({ ...formData, vendor_invoice_number: e.target.value })}
                                placeholder="Enter vendor's invoice number"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Invoice Date *
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Purchase Order Ref
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.po_reference}
                                onChange={(e) => setFormData({ ...formData, po_reference: e.target.value })}
                                placeholder="PO number"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Category
                            </label>
                            <select
                                className="form-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="spare-parts">Spare Parts</option>
                                <option value="tools">Tools & Equipment</option>
                                <option value="services">Services</option>
                                <option value="consumables">Consumables</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <JobSelector
                                value={formData.job_id}
                                onChange={(jobId) => setFormData(prev => ({ ...prev, job_id: jobId }))}
                                accountId={formData.account_id}
                                label="Link to Job (optional)"
                            />
                        </div>
                    </div>

                    {/* Invoice Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: 'var(--spacing-md)',
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Invoice Type:
                        </span>
                        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-primary)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                            <button
                                type="button"
                                onClick={() => setInvoiceMode('item')}
                                style={{
                                    padding: '6px 16px',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-xs)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: invoiceMode === 'item' ? '#3b82f6' : 'transparent',
                                    color: invoiceMode === 'item' ? '#ffffff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease-in-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                📦 Item Invoice (Catalog Products)
                            </button>
                            <button
                                type="button"
                                onClick={() => setInvoiceMode('ledger')}
                                style={{
                                    padding: '6px 16px',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-xs)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: invoiceMode === 'ledger' ? '#3b82f6' : 'transparent',
                                    color: invoiceMode === 'ledger' ? '#ffffff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease-in-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                💼 Accounting Invoice (Expense Ledgers)
                            </button>
                        </div>
                    </div>

                    {/* Show Tax Toggle */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.showTax}
                                onChange={(e) => {
                                    const nextShowTax = e.target.checked;
                                    setFormData(prev => {
                                        const updatedItems = prev.items.map(item => ({
                                            ...item,
                                            total: calculateItemTotalWithTax(item, nextShowTax)
                                        }));
                                        return {
                                            ...prev,
                                            showTax: nextShowTax,
                                            items: updatedItems
                                        };
                                    });
                                }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>Apply GST/Tax calculations</span>
                        </label>
                    </div>

                    {/* Items Table */}
                    <div style={{
                        marginBottom: 'var(--spacing-lg)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Items</h4>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    {invoiceMode === 'ledger' ? (
                                        <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '5%' }}>#</th>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: formData.showTax ? '55%' : '67%' }}>Expense Ledger & Narration *</th>
                                            {formData.showTax && (
                                                <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', width: '12%' }}>Tax %</th>
                                            )}
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '15%' }}>Amount *</th>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '13%' }}>Total</th>
                                            <th style={{ padding: 'var(--spacing-xs)', width: '5%' }}></th>
                                        </tr>
                                    ) : (
                                        <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '5%' }}>#</th>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: formData.showTax ? '30%' : '50%' }}>Description *</th>
                                            {formData.showTax && (
                                                <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '10%' }}>HSN</th>
                                            )}
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Qty *</th>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '12%' }}>Rate *</th>
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Disc.</th>
                                            {formData.showTax && (
                                                <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', width: '10%' }}>Tax %</th>
                                            )}
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '13%' }}>Total</th>
                                            <th style={{ padding: 'var(--spacing-xs)', width: '5%' }}></th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {formData.items.map((item, index) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>{index + 1}</td>
                                            
                                            {invoiceMode === 'ledger' ? (
                                                <>
                                                    {/* Expense Ledger Selector */}
                                                    <td style={{ padding: 'var(--spacing-xs)', position: 'relative', overflow: 'visible' }}>
                                                        <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                            <AccountSelector
                                                                value={item.productId}
                                                                onChange={(acc) => {
                                                                    if (!acc) return;
                                                                    const isGstApplicable = acc.gst_applicable !== false && acc.gstApplicable !== false;
                                                                    const defaultTaxRate = isGstApplicable ? (acc.tax_rate !== undefined ? parseFloat(acc.tax_rate) : (acc.taxRate !== undefined ? parseFloat(acc.taxRate) : 18)) : 0;
                                                                    const newItems = [...formData.items];
                                                                    newItems[index] = {
                                                                        ...newItems[index],
                                                                        productId: acc.id,
                                                                        description: acc.name,
                                                                        hsn: '',
                                                                        qty: 1,
                                                                        discount: 0,
                                                                        rate: newItems[index].rate || 0,
                                                                        taxRate: defaultTaxRate
                                                                    };
                                                                    newItems[index].total = calculateItemTotal(newItems[index]);
                                                                    setFormData({ ...formData, items: newItems });
                                                                }}
                                                                accountType="expense"
                                                                label="Select Expense Ledger"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                            placeholder="Or enter custom description"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                        />
                                                    </td>
                                                    
                                                    {/* Tax % */}
                                                    {formData.showTax && (
                                                        <td style={{ padding: 'var(--spacing-xs)' }}>
                                                            <select
                                                                className="form-input"
                                                                value={item.taxRate}
                                                                onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                                                                style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                            >
                                                                <option value="0">0%</option>
                                                                <option value="5">5%</option>
                                                                <option value="12">12%</option>
                                                                <option value="18">18%</option>
                                                                <option value="28">28%</option>
                                                            </select>
                                                        </td>
                                                    )}

                                                    {/* Amount field (maps to rate under the hood, with qty=1) */}
                                                    <td style={{ padding: 'var(--spacing-xs)' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.rate || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const newItems = [...formData.items];
                                                                newItems[index].rate = val;
                                                                newItems[index].qty = 1;
                                                                newItems[index].discount = 0;
                                                                newItems[index].total = calculateItemTotal(newItems[index]);
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="Amount"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: 'var(--spacing-xs)', position: 'relative', overflow: 'visible' }}>
                                                        <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                            <ProductSelector
                                                                value={item.productId}
                                                                onChange={(productId) => handleItemChange(index, 'productId', productId)}
                                                                label="Select Product"
                                                                onProductSelect={(productDetails) => {
                                                                    const newItems = [...formData.items];
                                                                    newItems[index] = {
                                                                        ...newItems[index],
                                                                        productId: productDetails.productId,
                                                                        description: productDetails.description,
                                                                        hsn: productDetails.hsn,
                                                                        rate: productDetails.rate,
                                                                        taxRate: productDetails.taxRate
                                                                    };
                                                                    newItems[index].total = calculateItemTotal(newItems[index]);
                                                                    setFormData({ ...formData, items: newItems });
                                                                }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                            placeholder="Or enter custom description"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                        />
                                                    </td>
                                                    {formData.showTax && (
                                                        <td style={{ padding: 'var(--spacing-xs)' }}>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={item.hsn}
                                                                onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                                placeholder="HSN"
                                                                style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ padding: 'var(--spacing-xs)' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.qty}
                                                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                            min="0"
                                                            step="1"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-xs)' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.rate}
                                                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-xs)' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.discount}
                                                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    {formData.showTax && (
                                                        <td style={{ padding: 'var(--spacing-xs)' }}>
                                                            <select
                                                                className="form-input"
                                                                value={item.taxRate}
                                                                onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                                                                style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                            >
                                                                <option value="0">0%</option>
                                                                <option value="5">5%</option>
                                                                <option value="12">12%</option>
                                                                <option value="18">18%</option>
                                                                <option value="28">28%</option>
                                                            </select>
                                                        </td>
                                                    )}
                                                </>
                                            )}

                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'right', fontWeight: 600 }}>
                                                ₹{(item.total || 0).toFixed(2)}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#ef4444',
                                                            padding: '4px'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-secondary" onClick={addItem} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', minHeight: '30px' }}>
                                <Plus size={14} style={{ marginRight: '4px' }} />
                                Add Custom Row
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setShowCalculator(true)} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', minHeight: '30px' }}>
                                Add Items from Catalog
                            </button>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Totals & ITC</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Subtotal:</span>
                                <span style={{ fontWeight: 600 }}>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {totals.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                    <span>Discount:</span>
                                    <span style={{ fontWeight: 600 }}>-₹{totals.discount.toFixed(2)}</span>
                                </div>
                            )}
                            {totals.cgst > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                        <span>CGST:</span>
                                        <span style={{ fontWeight: 600 }}>₹{totals.cgst.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                        <span>SGST:</span>
                                        <span style={{ fontWeight: 600 }}>₹{totals.sgst.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {totals.igst > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                    <span>IGST:</span>
                                    <span style={{ fontWeight: 600 }}>₹{totals.igst.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 'var(--spacing-sm)',
                                borderTop: '2px solid #3b82f6',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                color: '#3b82f6'
                            }}>
                                <span>Grand Total:</span>
                                <span>₹{totals.total_amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes / Narration */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            {invoiceMode === 'ledger' ? 'Narration *' : 'Notes'}
                        </label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="3"
                            placeholder={invoiceMode === 'ledger' ? 'Enter narration for this accounting invoice...' : 'Additional notes...'}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSave('save')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}
                    >
                        {existingInvoice ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden' }}>
                        <NewAccountForm
                            onClose={() => {
                                setShowNewAccountForm(false);
                                setSuggestedInitialData(null);
                            }}
                            initialData={suggestedInitialData}
                            onSave={async (acc) => {
                                try {
                                    setLoadingAccount(true);
                                    const savedAcc = await accountsAPI.create(acc);
                                    if (savedAcc && savedAcc.id) {
                                        handleAccountChange(savedAcc);
                                        setShowNewAccountForm(false);
                                        setSuggestedInitialData(null);
                                    } else {
                                        throw new Error("Failed to create account");
                                    }
                                } catch (e) {
                                    alert("Error creating account: " + e.message);
                                } finally {
                                    setLoadingAccount(false);
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {showCalculator && (
                <RepairCalculator
                    job={{}} 
                    onClose={() => setShowCalculator(false)}
                    onApply={handleCalculatorItems}
                />
            )}
        </div>
    );
}

export default PurchaseInvoiceForm;


