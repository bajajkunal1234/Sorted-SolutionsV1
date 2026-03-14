import { useState, useEffect, useRef } from 'react';
import { X, Printer, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { printSettingsAPI } from '@/lib/adminAPI';

export default function SetupInvoiceModal({ type, data, onClose }) {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Invoice specific state editable by admin before printing
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([]);
    
    const printRef = useRef(null);

    useEffect(() => {
        fetchSettingsAndInitialize();
    }, [type, data]);

    const fetchSettingsAndInitialize = async () => {
        try {
            setIsLoading(true);
            const settingsData = await printSettingsAPI.get();
            setSettings(settingsData || {});
            
            // Initialize items based on type
            const initialItems = [];
            const planName = data.product_name || data.plan_name || 'Service Plan';
            
            if (type === 'rental') {
                if (data.setup_fee > 0) {
                    initialItems.push({ description: `Installation/Setup Fee for ${planName}`, amount: Number(data.setup_fee) });
                }
                if (data.security_deposit > 0) {
                    initialItems.push({ description: `Security Deposit (Refundable) for ${planName}`, amount: Number(data.security_deposit) });
                }
                if (data.rent_advance > 0) {
                    initialItems.push({ description: `Advance Rent for ${planName}`, amount: Number(data.rent_advance) });
                }
            } else if (type === 'amc') {
                if (data.amc_amount > 0) {
                    initialItems.push({ description: `Annual Maintenance Contract for ${planName}`, amount: Number(data.amc_amount) });
                }
            }

            // Fallback if empty
            if (initialItems.length === 0) {
                initialItems.push({ description: 'Service Charges', amount: 0 });
            }

            setItems(initialItems);
            
            // Calculate default due date (e.g., +7 days)
            const dDate = new Date();
            dDate.setDate(dDate.getDate() + 7);
            setDueDate(dDate.toISOString().split('T')[0]);

        } catch (error) {
            console.error('Failed to load print settings:', error);
            alert('Failed to load print data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { description: '', amount: 0 }]);
    };

    const handleUpdateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = field === 'amount' ? Number(value) : value;
        setItems(newItems);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    // Tax calculations (simplified based on settings)
    const showGST = settings?.show_gst;
    const gstBreakdown = settings?.gst_breakdown || { showCGST: true, showSGST: true, showIGST: false, cgstRate: 9, sgstRate: 9, igstRate: 18 };
    
    let taxAmount = 0;
    let total = subtotal;
    let taxes = [];

    if (showGST) {
        // Assume subtotal is exclusive of tax for invoice printing unless configured otherwise.
        if (gstBreakdown.showCGST && gstBreakdown.showSGST) {
            const cgst = (subtotal * gstBreakdown.cgstRate) / 100;
            const sgst = (subtotal * gstBreakdown.sgstRate) / 100;
            taxAmount = cgst + sgst;
            taxes.push({ label: `CGST (${gstBreakdown.cgstRate}%)`, amount: cgst });
            taxes.push({ label: `SGST (${gstBreakdown.sgstRate}%)`, amount: sgst });
        } else if (gstBreakdown.showIGST) {
            const igst = (subtotal * gstBreakdown.igstRate) / 100;
            taxAmount = igst;
            taxes.push({ label: `IGST (${gstBreakdown.igstRate}%)`, amount: igst });
        }
        total = subtotal + taxAmount;
    }

    if (isLoading) {
        return (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <RefreshCcw className="animate-spin" size={32} style={{ color: 'var(--text-tertiary)' }} />
                </div>
            </div>
        );
    }

    const customer = data.accounts || {};

    let customerAddressStr = customer.address || '';
    if (customer.city) customerAddressStr += `, ${customer.city}`;
    if (customer.state) customerAddressStr += `, ${customer.state}`;
    if (customer.pincode) customerAddressStr += ` - ${customer.pincode}`;

    const invoiceTerms = settings?.invoice_terms || [];

    return (
        <div className="modal-overlay print-modal-hide-ui" style={{ zIndex: 1000 }}>
            <div className="modal-content print-modal-content" style={{ maxWidth: '900px', width: '90vw', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '90vh' }}>
                
                {/* Fixed Non-Printable Header & Editor Controls */}
                <div className="no-print" style={{ 
                    padding: 'var(--spacing-md) var(--spacing-lg)', 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-md)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                                Setup Invoice
                            </h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Edit line items below. Changes will sync to the printed page.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <Printer size={16} />
                                Print Invoice
                            </button>
                            <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Edit Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Line Items</h4>
                            <button onClick={handleAddItem} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Plus size={14}/> Add Item
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                            {items.map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={item.description} 
                                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)} 
                                        className="form-input" 
                                        style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                                        placeholder="Description"
                                    />
                                    <input 
                                        type="number" 
                                        value={item.amount} 
                                        onChange={(e) => handleUpdateItem(index, 'amount', e.target.value)} 
                                        className="form-input" 
                                        style={{ width: '100px', padding: '4px 8px', fontSize: '13px' }}
                                        placeholder="Amount"
                                    />
                                    <button onClick={() => handleRemoveItem(index)} style={{ padding: '4px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scrollable Printable Area (A4 Styled container) */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: 'var(--spacing-xl)', 
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    
                    {/* The A4 Paper */}
                    <div 
                        ref={printRef}
                        className="print-page"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '20mm',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            margin: '0 auto',
                            fontFamily: 'Arial, sans-serif',
                            fontSize: settings?.font_size === 'small' ? '12px' : settings?.font_size === 'large' ? '16px' : '14px',
                            lineHeight: '1.6',
                            position: 'relative'
                        }}
                    >
                        {/* Company Header */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '30px',
                            borderBottom: '2px solid #1e293b',
                            paddingBottom: '20px'
                        }}>
                            <div>
                                {settings?.show_logo && settings?.logo_url && (
                                    <img src={settings.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '10px' }} />
                                )}
                                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
                                    {settings?.company_name || 'Company Name'}
                                </h1>
                                <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                                    {settings?.company_address}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                    {settings?.company_phone} | {settings?.company_email}
                                </p>
                                {settings?.show_gst && settings?.gst_number && (
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                        GSTIN: {settings.gst_number}
                                    </p>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, fontSize: '28px', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    INVOICE
                                </h2>
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', textAlign: 'right', fontSize: '13px' }}>
                                        <b style={{ color: '#475569' }}>Invoice No:</b>
                                        <span>{invoiceNumber}</span>
                                        <b style={{ color: '#475569' }}>Date:</b>
                                        <span>{new Date(invoiceDate).toLocaleDateString('en-IN')}</span>
                                        <b style={{ color: '#475569' }}>Due Date:</b>
                                        <span>{new Date(dueDate).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Bill To:</h3>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{customer.name || 'Customer Name'}</div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', maxWidth: '50%' }}>
                                {customerAddressStr ? customerAddressStr : 'Address not provided'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                                {customer.phone && `Phone: ${customer.phone}`}
                                {customer.email && ` | Email: ${customer.email}`}
                            </div>
                        </div>

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                            <thead>
                                <tr>
                                    <th style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Description</th>
                                    <th style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#334155', width: '150px' }}>Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}>{item.description}</td>
                                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b', textAlign: 'right' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                            <div style={{ width: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                                    <span style={{ color: '#475569' }}>Subtotal:</span>
                                    <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {settings?.show_gst && taxes.map((tax, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                                        <span style={{ color: '#475569' }}>{tax.label}:</span>
                                        <span>₹{tax.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid #1e293b', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                                    <span>Total:</span>
                                    <span>₹{Math.round(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    Amounts in Indian Rupees (INR)
                                </div>
                            </div>
                        </div>

                        {/* Terms & Condtions and Signatures block aligned to bottom */}
                        <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm' }}>
                            {/* Terms & Conditions */}
                            {settings?.show_terms && invoiceTerms.length > 0 && (
                                <div style={{ marginBottom: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Terms & Conditions
                                    </h4>
                                    <ol style={{ margin: 0, paddingLeft: '15px', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                                        {invoiceTerms.map((term, i) => (
                                            <li key={i} style={{ marginBottom: '2px' }}>{term}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Signatures */}
                            {settings?.include_signature && (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-end',
                                    pageBreakInside: 'avoid'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Customer Acknowledgment</p>
                                        <div style={{ width: '180px', borderBottom: '1px solid #cbd5e1', height: '40px', marginBottom: '8px' }}></div>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Signature</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>For {settings?.company_name}</p>
                                        <div style={{ width: '180px', borderBottom: '1px solid #cbd5e1', height: '40px', marginBottom: '8px' }}></div>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Authorized Signatory</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Print CSS Injection */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-modal-hide-ui {
                        position: absolute !important;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-modal-content {
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-page, .print-page * {
                        visibility: visible;
                    }
                    .print-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
