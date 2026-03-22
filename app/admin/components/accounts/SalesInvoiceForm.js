'use client'

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import ProductSelector from '@/app/admin/components/common/ProductSelector';
import NewAccountForm from './NewAccountForm';
import { accountsAPI, inventoryAPI } from '@/lib/adminAPI';

function SalesInvoiceForm({ onClose, onSave, existingInvoice, defaultAccount }) {
    const [formData, setFormData] = useState({
        account_id: existingInvoice?.account_id || defaultAccount?.id || null,
        account_name: existingInvoice?.account_name || defaultAccount?.name || '',
        accountGSTIN: existingInvoice?.accountGSTIN || defaultAccount?.gstin || '',
        accountState: existingInvoice?.accountState || defaultAccount?.state || 'Maharashtra',
        property: existingInvoice?.property || null,
        billing_address: existingInvoice?.billing_address || '',
        shipping_address: existingInvoice?.shipping_address || '',
        invoice_number: existingInvoice?.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: existingInvoice?.date || new Date().toISOString().split('T')[0],
        items: existingInvoice?.items || [
            { id: 1, productId: '', description: '', hsn: '', qty: 1, rate: 0, discount: 0, taxRate: 18, total: 0 }
        ],
        notes: existingInvoice?.notes || '',
        terms: existingInvoice?.terms || 'Payment due within 30 days.\nLate payments subject to 2% monthly interest.',
        technician: existingInvoice?.technician || ''
    });

    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [charges, setCharges] = useState(existingInvoice?.charges || []);
    const [services, setServices] = useState([]);

    // Fetch services from inventory
    useEffect(() => {
        inventoryAPI.getAll().then(data => {
            const svcList = (data || []).filter(p => p.type === 'service' || p.product_type === 'service');
            setServices(svcList);
        }).catch(() => {});
    }, []);

    const companyState = 'Maharashtra';

    // Calculate item total
    const calculateItemTotal = (item) => {
        const subtotal = item.qty * item.rate;
        const discountAmount = item.discount || 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * (item.taxRate || 0)) / 100;
        return taxableAmount + taxAmount;
    };

    // Calculate invoice totals (items + charges)
    const calculateTotals = () => {
        const itemsSubtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const itemsTaxable = itemsSubtotal - totalDiscount;
        const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const combinedTaxable = itemsTaxable + chargesTotal;

        const isInterState = formData.accountState !== companyState;
        let cgst = 0, sgst = 0, igst = 0;

        formData.items.forEach(item => {
            const itemTaxable = (item.qty * item.rate) - (item.discount || 0);
            const taxAmount = (itemTaxable * (item.taxRate || 0)) / 100;
            if (isInterState) { igst += taxAmount; }
            else { cgst += taxAmount / 2; sgst += taxAmount / 2; }
        });
        // Also apply GST on charges (using 18% default if no rate specified)
        charges.forEach(c => {
            const amt = Number(c.amount) || 0;
            const rate = Number(c.taxRate) || 18;
            const tax = (amt * rate) / 100;
            if (isInterState) { igst += tax; }
            else { cgst += tax / 2; sgst += tax / 2; }
        });

        const totalTax = cgst + sgst + igst;
        const totalAmount = combinedTaxable + totalTax;

        return {
            items_subtotal: itemsSubtotal,
            subtotal: combinedTaxable,
            discount: totalDiscount,
            charges_total: chargesTotal,
            cgst, sgst, igst,
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
        // Validate
        if (!formData.account_id) {
            alert('Please select an account');
            return;
        }
        if (formData.items.some(item => !item.description || item.qty <= 0 || item.rate < 0)) {
            alert('Please fill all item details correctly');
            return;
        }

        const invoiceData = {
            ...formData,
            ...totals,
            charges,
            status: action === 'draft' ? 'draft' : 'finalized'
        };

        // Remove UI-only fields before saving
        delete invoiceData.accountGSTIN;
        delete invoiceData.accountState;
        delete invoiceData.property;

        onSave(invoiceData, action);
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
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#10b981' }}>
                            {existingInvoice ? 'Edit Sales Invoice' : 'Create Sales Invoice'}
                        </h3>
                        {existingInvoice && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                                Invoice: {existingInvoice.invoice_number}
                            </p>
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
                    {/* Account & Invoice Details */}
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
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.invoice_number}
                                readOnly
                                style={{ width: '100%', backgroundColor: 'var(--bg-secondary)' }}
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
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '30%' }}>Description *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '10%' }}>HSN</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Qty *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '12%' }}>Rate *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Disc.</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', width: '10%' }}>Tax %</th>
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
                        <div style={{ padding: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                            <button
                                onClick={addItem}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                            >
                                <Plus size={14} />
                                Add Item
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
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Totals</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Items Subtotal:</span>
                                <span style={{ fontWeight: 600 }}>₹{(totals.items_subtotal || 0).toFixed(2)}</span>
                            </div>
                            {totals.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                    <span>Discount:</span>
                                    <span style={{ fontWeight: 600 }}>-₹{totals.discount.toFixed(2)}</span>
                                </div>
                            )}
                            {charges.length > 0 && (
                                <>
                                    {charges.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                            <span>{c.name || 'Charge'}:</span>
                                            <span style={{ fontWeight: 600 }}>₹{(Number(c.amount) || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-primary)', paddingTop: '6px', marginTop: '2px' }}>
                                        <span style={{ fontWeight: 600 }}>Subtotal (incl. charges):</span>
                                        <span style={{ fontWeight: 700 }}>₹{(totals.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                </>
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
                                borderTop: '2px solid #10b981',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                color: '#10b981'
                            }}>
                                <span>Grand Total:</span>
                                <span>₹{totals.total_amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Notes
                        </label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="2"
                            placeholder="Additional notes for this invoice..."
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
                        onClick={() => handleSave('draft')}
                        className="btn"
                        style={{ padding: '8px 16px', backgroundColor: 'var(--color-secondary)' }}
                    >
                        {existingInvoice ? 'Update Draft' : 'Save Draft'}
                    </button>
                    <button
                        onClick={() => handleSave('print')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#10b981' }}
                    >
                        {existingInvoice ? 'Update & Print' : 'Save & Print'}
                    </button>
                </div>
            </div>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <NewAccountForm
                    onClose={() => setShowNewAccountForm(false)}
                    onSave={(account) => {
                        setFormData({
                            ...formData,
                            account_id: account.id,
                            account_name: account.name,
                            accountGSTIN: account.gstin || '',
                            accountState: account.state || 'Maharashtra'
                        });
                        setShowNewAccountForm(false);
                    }}
                />
            )}
        </div>
    );
}

export default SalesInvoiceForm;
