'use client'

import { useState } from 'react';
import { FileText, Plus, Trash2, Send, Eye, Edit2, X } from 'lucide-react';
import ProductSelector from '@/components/common/ProductSelector';
import PaymentQRDisplay from '@/components/technician/PaymentQRDisplay';
import FeedbackQRDisplay from '@/components/technician/FeedbackQRDisplay';

// Pre-defined spare parts and service charges by product type
const spareParts = {
    'AC': [
        { name: 'Compressor', price: 6000 },
        { name: 'Gas Refill (R32)', price: 1500 },
        { name: 'Gas Refill (R410A)', price: 1800 },
        { name: 'Capacitor', price: 300 },
        { name: 'PCB Board', price: 2500 },
        { name: 'Fan Motor', price: 1200 },
        { name: 'Cooling Coil', price: 3500 }
    ],
    'Washing Machine': [
        { name: 'Motor', price: 2500 },
        { name: 'Belt', price: 200 },
        { name: 'Door Seal', price: 800 },
        { name: 'Drain Pump', price: 1500 },
        { name: 'PCB Board', price: 3000 },
        { name: 'Shock Absorber', price: 600 }
    ],
    'Refrigerator': [
        { name: 'Compressor', price: 5500 },
        { name: 'Gas Refill', price: 1200 },
        { name: 'Thermostat', price: 800 },
        { name: 'Door Gasket', price: 600 },
        { name: 'PCB Board', price: 2800 },
        { name: 'Evaporator Fan', price: 1000 }
    ]
};

const serviceCharges = {
    'AC': 1000,
    'Washing Machine': 500,
    'Refrigerator': 700,
    'default': 500
};

function CreateQuotation({ job, onComplete, onCancel, timerElapsed }) {
    const productType = job.product.type;
    const defaultServiceCharge = serviceCharges[productType] || serviceCharges['default'];

    const [items, setItems] = useState([
        { id: 1, description: 'Service Charge', qty: 1, rate: defaultServiceCharge, editable: true }
    ]);
    const [quotationSent, setQuotationSent] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [workflowStage, setWorkflowStage] = useState('create'); // 'create', 'payment', 'feedback'

    const addItem = (sparePart = null) => {
        const newItem = {
            id: Date.now(),
            description: sparePart ? sparePart.name : '',
            qty: 1,
            rate: sparePart ? sparePart.price : 0,
            editable: true
        };
        setItems([...items, newItem]);
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const gst = subtotal * 0.18; // 18% GST
        const total = subtotal + gst;
        return { subtotal, gst, total };
    };

    const { subtotal, gst, total } = calculateTotals();

    const handleSendQuotation = (recipient) => {
        const quotationText = `
*QUOTATION*
Job: ${job.id}
Customer: ${job.customerName}
Product: ${job.product.brand} ${job.product.model}

Items:
${items.map((item, i) => `${i + 1}. ${item.description} - Qty: ${item.qty} x ₹${item.rate} = ₹${item.qty * item.rate}`).join('\n')}

Subtotal: ₹${subtotal.toFixed(2)}
GST (18%): ₹${gst.toFixed(2)}
*Total: ₹${total.toFixed(2)}*
        `.trim();

        const phoneNumber = recipient === 'customer' ? job.mobile : '+919876543210'; // Admin number
        window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(quotationText)}`, '_blank');

        // Mark as sent after sending to admin (mandatory)
        if (recipient === 'admin') {
            setQuotationSent(true);
        }
    };

    const handleCustomerDecision = (decision) => {
        if (decision === 'approved') {
            // Move to payment stage
            setWorkflowStage('payment');
        } else {
            // Rejected - collect service charge
            onComplete({
                quotation: {
                    items,
                    subtotal,
                    gst,
                    total
                },
                customerDecision: 'rejected',
                timerElapsed
            });
        }
    };

    const handlePaymentReceived = (paymentData) => {
        if (paymentData.requestFeedback) {
            setWorkflowStage('feedback');
        } else {
            // Complete job without feedback
            onComplete({
                quotation: { items, subtotal, gst, total },
                customerDecision: 'approved',
                payment: paymentData,
                timerElapsed
            });
        }
    };

    const handleFeedbackComplete = (feedbackData) => {
        onComplete({
            quotation: { items, subtotal, gst, total },
            customerDecision: 'approved',
            payment: { amount: total },
            feedback: feedbackData,
            timerElapsed
        });
    };

    // Show payment QR if in payment stage
    if (workflowStage === 'payment') {
        return (
            <PaymentQRDisplay
                job={job}
                amount={total}
                onPaymentReceived={handlePaymentReceived}
                onGoBack={() => {
                    setQuotationSent(false);
                    setWorkflowStage('create');
                }}
            />
        );
    }

    // Show feedback QR if in feedback stage
    if (workflowStage === 'feedback') {
        return (
            <FeedbackQRDisplay
                job={job}
                onComplete={handleFeedbackComplete}
                onSkip={() => handleFeedbackComplete({ skipped: true })}
            />
        );
    }

    const availableParts = spareParts[productType] || [];

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <FileText size={20} color="#8b5cf6" />
                Create Quotation
            </h3>

            {/* Quick Add Spare Parts */}
            {availableParts.length > 0 && !quotationSent && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Quick Add Spare Parts
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {availableParts.map((part, index) => (
                            <button
                                key={index}
                                onClick={() => addItem(part)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                            >
                                + {part.name} (₹{part.price})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Items List */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Items
                </label>
                <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {items.map((item, index) => (
                        <div key={item.id} style={{
                            padding: 'var(--spacing-sm)',
                            backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                            borderBottom: index < items.length - 1 ? '1px solid var(--border-primary)' : 'none'
                        }}>
                            {/* Product Selector for each item */}
                            {!quotationSent && (
                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                    <ProductSelector
                                        value={item.productId}
                                        onChange={(productId) => {
                                            const newItems = [...items];
                                            newItems[index] = { ...newItems[index], productId };
                                            setItems(newItems);
                                        }}
                                        label="Select Product"
                                        onProductSelect={(productDetails) => {
                                            const newItems = [...items];
                                            newItems[index] = {
                                                ...newItems[index],
                                                productId: productDetails.productId,
                                                description: productDetails.description,
                                                rate: productDetails.rate
                                            };
                                            setItems(newItems);
                                        }}
                                    />
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 100px 40px', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    placeholder={quotationSent ? "Item description" : "Or enter custom description"}
                                    className="form-input"
                                    style={{ padding: '6px 8px', fontSize: 'var(--font-size-sm)' }}
                                    disabled={quotationSent}
                                />
                                <input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                                    placeholder="Qty"
                                    className="form-input"
                                    style={{ padding: '6px 8px', fontSize: 'var(--font-size-sm)' }}
                                    min="1"
                                    disabled={quotationSent}
                                />
                                <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                    placeholder="Rate"
                                    className="form-input"
                                    style={{ padding: '6px 8px', fontSize: 'var(--font-size-sm)' }}
                                    min="0"
                                    disabled={quotationSent}
                                />
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textAlign: 'right' }}>
                                    ₹{(item.qty * item.rate).toFixed(2)}
                                </div>
                                {!quotationSent && (
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                                            padding: '4px',
                                            opacity: items.length > 1 ? 1 : 0.3
                                        }}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {!quotationSent && (
                    <button
                        onClick={() => addItem()}
                        className="btn btn-secondary"
                        style={{ marginTop: 'var(--spacing-xs)', padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Plus size={14} />
                        Add Custom Item
                    </button>
                )}
            </div>

            {/* Totals */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                    <span>GST (18%):</span>
                    <span style={{ fontWeight: 600 }}>₹{gst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--spacing-xs)', borderTop: '1px solid var(--border-primary)', fontSize: 'var(--font-size-base)' }}>
                    <span style={{ fontWeight: 700 }}>Total:</span>
                    <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 'var(--font-size-lg)' }}>₹{total.toFixed(2)}</span>
                </div>
            </div>

            {/* Send Quotation */}
            {!quotationSent ? (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={() => handleSendQuotation('admin')}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <Send size={16} />
                            Send to Admin (Required)
                        </button>
                        <button
                            onClick={() => handleSendQuotation('customer')}
                            className="btn"
                            style={{ flex: 1, padding: '10px', backgroundColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <Send size={16} />
                            Send to Customer (Optional)
                        </button>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)', textAlign: 'center' }}>
                        Note: Must send to admin before proceeding
                    </p>
                </div>
            ) : (
                <div style={{
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    textAlign: 'center',
                    color: '#10b981',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600
                }}>
                    ✓ Quotation sent to admin
                </div>
            )}

            {/* Customer Decision */}
            {quotationSent && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                        Customer Decision
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={() => handleCustomerDecision('approved')}
                            className="btn"
                            style={{ padding: '12px', backgroundColor: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                        >
                            <span style={{ fontSize: 'var(--font-size-lg)' }}>✓</span>
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Quotation Approved</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Proceed to Payment</span>
                        </button>
                        <button
                            onClick={() => handleCustomerDecision('rejected')}
                            className="btn"
                            style={{ padding: '12px', backgroundColor: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                        >
                            <span style={{ fontSize: 'var(--font-size-lg)' }}>✗</span>
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Quotation Rejected</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Edit & Collect Service Charge</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
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
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        {/* Preview Header */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-elevated)'
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>Quotation Preview</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Preview Content */}
                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <div style={{ marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>QUOTATION</h4>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <div>Job ID: {job.id}</div>
                                    <div>Customer: {job.customerName}</div>
                                    <div>Product: {job.product.brand} {job.product.model}</div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table style={{ width: '100%', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                        <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', fontWeight: 600 }}>Item</th>
                                        <th style={{ textAlign: 'center', padding: 'var(--spacing-xs)', fontWeight: 600 }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--spacing-xs)', fontWeight: 600 }}>Rate</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--spacing-xs)', fontWeight: 600 }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-xs)' }}>{item.description}</td>
                                            <td style={{ textAlign: 'center', padding: 'var(--spacing-xs)' }}>{item.qty}</td>
                                            <td style={{ textAlign: 'right', padding: 'var(--spacing-xs)' }}>₹{item.rate.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', padding: 'var(--spacing-xs)' }}>₹{(item.qty * item.rate).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div style={{ borderTop: '2px solid var(--border-primary)', paddingTop: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                                    <span>Subtotal:</span>
                                    <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                                    <span>GST (18%):</span>
                                    <span style={{ fontWeight: 600 }}>₹{gst.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)', fontSize: 'var(--font-size-base)' }}>
                                    <span style={{ fontWeight: 700 }}>Total:</span>
                                    <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 'var(--font-size-lg)' }}>₹{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview Footer */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            borderTop: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            display: 'flex',
                            gap: 'var(--spacing-sm)'
                        }}>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="btn"
                                style={{ flex: 1, padding: '10px', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Edit2 size={16} />
                                Go Back to Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            {!quotationSent && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '10px' }}
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                        <Eye size={16} />
                        Preview
                    </button>
                </div>
            )}
        </div>
    );
}

export default CreateQuotation;

