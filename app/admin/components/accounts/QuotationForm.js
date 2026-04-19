'use client'

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import ProductSelector from '@/app/admin/components/common/ProductSelector';
import NewAccountForm from './NewAccountForm';
import RepairCalculator from '@/components/common/RepairCalculator';
import { accountsAPI, inventoryAPI, productLinksAPI } from '@/lib/adminAPI';

function QuotationForm({ onClose, onSave, existingQuotation, defaultAccount, prefillItems }) {
    // Build initial items from prefillItems (from RepairCalculator) or existingQuotation or blank
    const buildInitialItems = () => {
        if (existingQuotation?.items) return existingQuotation.items.filter(i => !i.isCharge);
        if (prefillItems?.length) {
            return prefillItems
                .filter(it => it.type !== 'service' && it.description)
                .map((it, idx) => ({
                    id: idx + 1,
                    productId: it.productId || '',
                    description: it.description,
                    hsn: '',
                    qty: it.qty || 1,
                    rate: it.rate || 0,
                    discount: 0,
                    taxRate: it.taxRate || 18,
                    total: it.qty * it.rate
                }));
        }
        return [{ id: 1, productId: '', description: '', hsn: '', qty: 1, rate: 0, discount: 0, taxRate: 18, total: 0 }];
    };

    const buildInitialCharges = () => {
        if (existingQuotation?.items) {
            return existingQuotation.items.filter(i => i.isCharge).map(i => ({
                id: i.id, serviceId: i.productId, name: i.description, amount: i.rate, taxRate: i.taxRate
            }));
        }
        if (prefillItems?.length) {
            return prefillItems
                .filter(it => it.type === 'service' && it.description)
                .map((it, idx) => ({
                    id: Date.now() + idx,
                    serviceId: it.productId || null,
                    name: it.description,
                    amount: it.rate || 0,
                    taxRate: it.taxRate || 18
                }));
        }
        return [];
    };
    const [formData, setFormData] = useState({
        account_id: existingQuotation?.account_id || defaultAccount?.id || null,
        account_name: existingQuotation?.account_name || defaultAccount?.name || '',
        accountGSTIN: existingQuotation?.accountGSTIN || defaultAccount?.gstin || '',
        accountState: existingQuotation?.accountState || defaultAccount?.state || 'Maharashtra',
        property: existingQuotation?.property || null,
        billing_address: existingQuotation?.billing_address || '',
        shipping_address: existingQuotation?.shipping_address || '',
        quote_number: existingQuotation?.quote_number || `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: existingQuotation?.date || new Date().toISOString().split('T')[0],
        valid_until: existingQuotation?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subject: existingQuotation?.subject || '',
        items: buildInitialItems(),
        notes: existingQuotation?.notes || '',
        terms: existingQuotation?.terms || 'Quotation valid for 30 days.\nPrices subject to change without notice.\nPayment terms: 50% advance, 50% on completion.',
        showTax: existingQuotation?.showTax !== undefined ? existingQuotation.showTax : true
    });

    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [charges, setCharges] = useState(buildInitialCharges);
    const [services, setServices] = useState([]);
    const [productLinks, setProductLinks] = useState([]);

    // Fetch services and product-links
    useEffect(() => {
        Promise.all([
            inventoryAPI.getAll(),
            productLinksAPI.getAll().catch(() => [])
        ]).then(([data, links]) => {
            const svcList = (data || []).filter(p => p.type === 'service' || p.product_type === 'service');
            setServices(svcList);
            setProductLinks(links || []);
        }).catch(() => {});
    }, []);

    const companyState = 'Maharashtra';

    const calculateItemTotal = (item) => {
        const subtotal = item.qty * item.rate;
        const discountAmount = item.discount || 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = formData.showTax ? (taxableAmount * (item.taxRate || 0)) / 100 : 0;
        return taxableAmount + taxAmount;
    };

    const calculateTotals = () => {
        const itemsSubtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const itemsTaxable = itemsSubtotal - totalDiscount;
        const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const combinedTaxable = itemsTaxable + chargesTotal;

        const isInterState = formData.accountState !== companyState;
        let cgst = 0, sgst = 0, igst = 0;

        if (formData.showTax) {
            formData.items.forEach(item => {
                const itemTaxable = (item.qty * item.rate) - (item.discount || 0);
                const taxAmount = (itemTaxable * (item.taxRate || 0)) / 100;

                if (isInterState) {
                    igst += taxAmount;
                } else {
                    cgst += taxAmount / 2;
                    sgst += taxAmount / 2;
                }
            });
            charges.forEach(c => {
                const amt = Number(c.amount) || 0;
                const rate = Number(c.taxRate) || 18;
                const tax = (amt * rate) / 100;
                if (isInterState) { igst += tax; }
                else { cgst += tax / 2; sgst += tax / 2; }
            });
        }

        const totalTax = cgst + sgst + igst;
        const totalAmount = combinedTaxable + totalTax;

        return {
            items_subtotal: itemsSubtotal,
            subtotal: combinedTaxable,
            discount: totalDiscount,
            charges_total: chargesTotal,
            cgst, sgst, igst,
            total_tax: totalTax,
            total_amount: totalAmount
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
            billing_address: '',
            shipping_address: ''
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'description' || field === 'hsn' ? value : parseFloat(value) || 0;
        newItems[index].total = calculateItemTotal(newItems[index]);
        setFormData({ ...formData, items: newItems });
    };

    const handleCalculatorItems = (calcItems) => {
        const newItems = calcItems.map((it, idx) => ({
            id: Date.now() + idx,
            productId: it.productId || '',
            description: it.description,
            hsn: it.hsn || '',
            qty: it.qty || 1,
            rate: it.rate || 0,
            discount: it.discount || 0,
            taxRate: it.taxRate || 18,
            total: (it.qty || 1) * (it.rate || 0)
        }));
        setFormData(prev => ({
            ...prev,
            // If the only item is a blank row, replace it. Otherwise append.
            items: prev.items.length === 1 && !prev.items[0].description ? newItems : [...prev.items, ...newItems]
        }));
        setShowCalculator(false);
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                id: Date.now(),
                description: '',
                hsn: '',
                qty: 1,
                rate: 0,
                discount: 0,
                taxRate: 18,
                total: 0
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
        if (formData.items.some(item => !item.description || item.qty <= 0 || item.rate < 0)) {
            alert('Please fill all item details correctly');
            return;
        }

        const combinedItems = [
            ...formData.items.map(item => ({ ...item, isCharge: false })),
            ...charges.map(c => ({
                id: c.id,
                isCharge: true,
                productId: c.serviceId || '',
                description: c.name,
                qty: 1,
                rate: c.amount,
                discount: 0,
                taxRate: c.taxRate,
                total: formData.showTax ? c.amount * (1 + (c.taxRate || 0) / 100) : c.amount
            }))
        ];

        const quotationData = {
            ...formData,
            items: combinedItems,
            ...totals,
            __formType: 'quotation',
            status: 'sent'
        };

        // Remove UI-only fields
        delete quotationData.accountGSTIN;
        delete quotationData.accountState;
        delete quotationData.property;

        onSave(quotationData, action);
    };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            style={{
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
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#8b5cf6' }}>
                        {existingQuotation ? 'Edit Quotation' : 'Create Quotation'}
                    </h3>
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
                    {/* Account & Quotation Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div>
                            <AccountSelector
                                value={formData.account_id}
                                onChange={handleAccountChange}
                                onCreateNew={() => setShowNewAccountForm(true)}
                                accountType="customer"
                                label="Account"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Quotation Number
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.quote_number}
                                readOnly
                                style={{ width: '100%', backgroundColor: 'var(--bg-secondary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Quotation Date *
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
                                Valid Until *
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.valid_until}
                                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Subject
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="e.g., Quotation for AC Installation"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Show Tax Toggle */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.showTax}
                                onChange={(e) => setFormData({ ...formData, showTax: e.target.checked })}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Show tax in quotation</span>
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
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Items & Services</h4>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '5%' }}>#</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '35%' }}>Description *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Qty *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '15%' }}>Rate *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '12%' }}>Disc.</th>
                                        {formData.showTax && (
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', width: '10%' }}>Tax %</th>
                                        )}
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '13%' }}>Total</th>
                                        <th style={{ padding: 'var(--spacing-xs)', width: '5%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, index) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>{index + 1}</td>
                                            <td style={{ padding: 'var(--spacing-xs)', position: 'relative', overflow: 'visible' }} colSpan="2">
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
                                                            // Auto-add linked service charge
                                                            const link = productLinks.find(l => l.product?.id === productDetails.productId && l.auto_add);
                                                            if (link?.service) {
                                                                const alreadyAdded = charges.some(c => c.serviceId === link.service.id);
                                                                if (!alreadyAdded) {
                                                                    setCharges(prev => [...prev, {
                                                                        id: Date.now(),
                                                                        serviceId: link.service.id,
                                                                        name: link.service.name,
                                                                        amount: link.service.sale_price || 0,
                                                                        taxRate: link.service.gst_rate || 18
                                                                    }]);
                                                                }
                                                            }
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

                    {/* Charges / Services Section */}
                    <div style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>Additional Charges / Services</h4>
                            <button
                                type="button"
                                onClick={() => setCharges(prev => [...prev, { id: Date.now(), name: '', amount: 0, taxRate: 18 }])}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#6366f115', color: '#6366f1', border: '1px solid #6366f130', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                                <Plus size={13} /> Add Charge
                            </button>
                        </div>
                        {charges.length === 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center', padding: '8px 0' }}>No charges added. Click "Add Charge" for Visiting Charges, Service Charges, etc.</p>
                        )}
                        {charges.map((charge, idx) => (
                            <div key={charge.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                <select
                                    className="form-input"
                                    value={charge.serviceId || ''}
                                    onChange={e => {
                                        const svc = services.find(s => String(s.id) === e.target.value);
                                        if (svc) {
                                            setCharges(prev => prev.map((c, i) => i === idx ? {
                                                ...c,
                                                serviceId: svc.id,
                                                name: svc.name,
                                                taxRate: svc.gst_rate || svc.tax_rate || 18
                                            } : c));
                                        }
                                    }}
                                    style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
                                >
                                    <option value="">— Select Service —</option>
                                    {services.map(svc => (
                                        <option key={svc.id} value={String(svc.id)}>{svc.name}</option>
                                    ))}
                                </select>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="Amount"
                                    value={charge.amount || ''}
                                    onChange={e => setCharges(prev => prev.map((c, i) => i === idx ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))}
                                    style={{ width: '120px', fontSize: '13px', padding: '6px 10px', textAlign: 'right' }}
                                />
                                <button onClick={() => setCharges(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Totals Section */}
                    <div style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.05)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Totals</h4>
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
                            {formData.showTax && (
                                <>
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
                                </>
                            )}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 'var(--spacing-sm)',
                                borderTop: '2px solid #8b5cf6',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                color: '#8b5cf6'
                            }}>
                                <span>Grand Total:</span>
                                <span>₹{totals.total_amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Notes
                            </label>
                            <textarea
                                className="form-input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                                placeholder="Additional notes..."
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Terms & Conditions
                            </label>
                            <textarea
                                className="form-input"
                                value={formData.terms}
                                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                rows="3"
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
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
                        onClick={() => handleSave('send')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#8b5cf6' }}
                    >
                        {existingQuotation ? 'Update & Send' : 'Save & Send'}
                    </button>
                </div>
            </div>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden' }}>
                        <NewAccountForm
                            onClose={() => setShowNewAccountForm(false)}
                            onSave={async (acc) => {
                                handleAccountChange(acc);
                                setShowNewAccountForm(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {showCalculator && (
                <RepairCalculator
                    job={{}} 
                    onClose={() => setShowCalculator(false)}
                    onCreateInvoice={handleCalculatorItems}
                    onCreateQuotation={handleCalculatorItems}
                />
            )}
        </div>
    );
}

export default QuotationForm;
