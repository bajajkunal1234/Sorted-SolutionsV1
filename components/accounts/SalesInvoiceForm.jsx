'use client'

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import AccountSelector from '../common/AccountSelector';
import ProductSelector from '../common/ProductSelector';
import NewAccountForm from './NewAccountForm';
import { sampleLedgers } from '../../data/accountingData';

function SalesInvoiceForm({ onClose, onSave, existingInvoice }) {
    const [formData, setFormData] = useState({
        accountId: existingInvoice?.accountId || null,
        accountGSTIN: existingInvoice?.accountGSTIN || '',
        accountState: existingInvoice?.accountState || 'Maharashtra',
        property: existingInvoice?.property || null,
        billingAddress: existingInvoice?.billingAddress || '',
        shippingAddress: existingInvoice?.shippingAddress || '',
        invoiceNumber: existingInvoice?.reference || 'INV-2026-0006',
        invoiceDate: existingInvoice?.date || new Date().toISOString().split('T')[0],
        items: existingInvoice?.items || [
            { id: 1, productId: '', description: '', hsn: '', qty: 1, rate: 0, discount: 0, taxRate: 18, total: 0 }
        ],
        notes: existingInvoice?.notes || '',
        terms: existingInvoice?.terms || 'Payment due within 30 days.\nLate payments subject to 2% monthly interest.',
        technician: existingInvoice?.technician || ''
    });

    const [showNewAccountForm, setShowNewAccountForm] = useState(false);

    // Real customer accounts from sampleLedgers
    const customers = sampleLedgers.filter(ledger =>
        ledger.type === 'customer' ||
        ledger.under === 'customer-accounts' ||
        ledger.under === 'sundry-debtors'
    );

    const companyState = 'Maharashtra';

    // Calculate item total
    const calculateItemTotal = (item) => {
        const subtotal = item.qty * item.rate;
        const discountAmount = item.discount;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * item.taxRate) / 100;
        return taxableAmount + taxAmount;
    };

    // Calculate invoice totals
    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const totalDiscount = formData.items.reduce((sum, item) => sum + item.discount, 0);
        const taxableAmount = subtotal - totalDiscount;

        const isInterState = formData.accountState !== companyState;
        let cgst = 0, sgst = 0, igst = 0;

        formData.items.forEach(item => {
            const itemTaxable = (item.qty * item.rate) - item.discount;
            const taxAmount = (itemTaxable * item.taxRate) / 100;

            if (isInterState) {
                igst += taxAmount;
            } else {
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            }
        });

        const totalTax = cgst + sgst + igst;
        const grandTotal = taxableAmount + totalTax;
        const roundOff = Math.round(grandTotal) - grandTotal;

        return {
            subtotal,
            totalDiscount,
            taxableAmount,
            cgst,
            sgst,
            igst,
            totalTax,
            roundOff,
            grandTotal: Math.round(grandTotal)
        };
    };

    const totals = calculateTotals();

    const handleAccountChange = (accountId) => {
        const account = sampleLedgers.find(c => c.id === accountId);
        if (account) {
            setFormData({
                ...formData,
                accountId: account.id,
                accountGSTIN: account.gstin || account.gstNumber || '',
                accountState: account.address?.state || 'Maharashtra',
                property: null,  // Reset property when customer changes
                billingAddress: '',
                shippingAddress: ''
            });
        }
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
                id: formData.items.length + 1,
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
        if (!formData.accountId) {
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
            createdAt: new Date().toISOString(),
            status: action === 'draft' ? 'draft' : 'finalized'
        };

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
                                Invoice: {existingInvoice.reference}
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
                                value={formData.accountId}
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
                                value={formData.invoiceNumber}
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
                                value={formData.invoiceDate}
                                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Property Selection (for customers with multiple locations) */}
                    {formData.accountId && (() => {
                        const selectedCustomer = sampleLedgers.find(c => c.id === formData.accountId);
                        const properties = selectedCustomer?.properties || [];

                        if (properties.length > 0) {
                            return (
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Property/Location
                                    </label>
                                    <select
                                        className="form-select"
                                        value={formData.property?.id || ''}
                                        onChange={(e) => {
                                            const property = properties.find(p => p.id === e.target.value);
                                            if (property) {
                                                const addressStr = property.address?.line1
                                                    ? `${property.address.line1}, ${property.address.locality}, ${property.address.pincode}`
                                                    : property.address || '';
                                                setFormData({
                                                    ...formData,
                                                    property,
                                                    billingAddress: addressStr,
                                                    shippingAddress: addressStr
                                                });
                                            }
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select property...</option>
                                        {properties.map(property => (
                                            <option key={property.id} value={property.id}>
                                                {property.label || property.name || `Property ${property.id}`}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.property && (
                                        <div style={{
                                            marginTop: 'var(--spacing-xs)',
                                            padding: 'var(--spacing-xs)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <strong>Address:</strong> {formData.billingAddress}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}

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
                                                {/* Product Selector with Description */}
                                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                    <ProductSelector
                                                        value={item.productId}
                                                        onChange={(productId) => handleItemChange(index, 'productId', productId)}
                                                        label="Select Product"
                                                        onProductSelect={(productDetails) => {
                                                            // Auto-fill all fields when product is selected
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
                                                {/* Manual override for description only */}
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Or enter custom description"
                                                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                />
                                                {/* Display HSN (read-only, auto-populated) */}
                                                {item.hsn && (
                                                    <div style={{
                                                        marginTop: '4px',
                                                        fontSize: 'var(--font-size-xs)',
                                                        color: 'var(--text-secondary)',
                                                        padding: '4px 8px',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius-sm)'
                                                    }}>
                                                        HSN: {item.hsn}
                                                    </div>
                                                )}
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
                                                ₹{item.total.toFixed(2)}
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
                                <span>Subtotal:</span>
                                <span style={{ fontWeight: 600 }}>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {totals.totalDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                    <span>Discount:</span>
                                    <span style={{ fontWeight: 600 }}>-₹{totals.totalDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Taxable Amount:</span>
                                <span style={{ fontWeight: 600 }}>₹{totals.taxableAmount.toFixed(2)}</span>
                            </div>
                            {totals.cgst > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                        <span>CGST ({(formData.items[0]?.taxRate || 18) / 2}%):</span>
                                        <span style={{ fontWeight: 600 }}>₹{totals.cgst.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                        <span>SGST ({(formData.items[0]?.taxRate || 18) / 2}%):</span>
                                        <span style={{ fontWeight: 600 }}>₹{totals.sgst.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {totals.igst > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                    <span>IGST ({formData.items[0]?.taxRate || 18}%):</span>
                                    <span style={{ fontWeight: 600 }}>₹{totals.igst.toFixed(2)}</span>
                                </div>
                            )}
                            {totals.roundOff !== 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Round Off:</span>
                                    <span style={{ fontWeight: 600 }}>₹{totals.roundOff.toFixed(2)}</span>
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
                                <span>₹{totals.grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Notes (Optional)
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
                        console.log('New account created from invoice:', account);
                        // Add to customers list and select it
                        setFormData({
                            ...formData,
                            accountId: account.id,
                            accountGSTIN: account.gstin,
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




