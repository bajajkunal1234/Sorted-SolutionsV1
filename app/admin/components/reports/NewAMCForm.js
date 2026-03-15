'use client'

import { useState, useEffect } from 'react';
import { X, RefreshCcw, CheckCircle, Printer, FileText } from 'lucide-react';
import { accountsAPI } from '@/lib/adminAPI';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import PrintAgreementModal from './PrintAgreementModal';
import SetupInvoiceModal from './SetupInvoiceModal';

function NewAMCForm({ plans = [], onClose, onSave }) {
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [formData, setFormData] = useState({
        customerId: '',
        property: null,
        planId: '',
        productBrand: '',
        productModel: '',
        serialNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'pending',
        autoRenew: false,
        notes: ''
    });

    // Post-creation success state
    const [successData, setSuccessData] = useState(null);
    const [showPrintAgreement, setShowPrintAgreement] = useState(false);
    const [showPrintInvoice, setShowPrintInvoice] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                setLoadingCustomers(true);
                const data = await accountsAPI.getAll();
                // Filter by known customer group IDs (acc.under is the group ID string)
                const CUSTOMER_GROUPS = ['customers', 'sundry-debtors', 'technicians'];
                let customerList = data.filter(acc => CUSTOMER_GROUPS.includes(acc.under));
                // Fallback: if no accounts match the exact group IDs, show all accounts
                if (customerList.length === 0) customerList = data;
                setCustomers(customerList);
            } catch (err) {
                console.error('Failed to fetch customers:', err);
            } finally {
                setLoadingCustomers(false);
            }
        };
        fetchCustomers();
    }, []);

    const selectedPlan = plans.find(p => p.id === formData.planId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlan) return;

        const endDate = calculateEndDate(formData.startDate, selectedPlan.duration.value, selectedPlan.duration.unit);
        const customerName = customers.find(c => String(c.id) === String(formData.customerId))?.name || 'Customer';

        const amcData = {
            ...formData,
            amcAmount: Number(selectedPlan.price),
            endDate,
            status: 'active',
            customerName
        };

        try {
            const result = await onSave(amcData);
            if (result) {
                setSuccessData(result);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const calculateEndDate = (startDate, duration, unit) => {
        const date = new Date(startDate);
        if (unit === 'month') {
            date.setMonth(date.getMonth() + duration);
        } else if (unit === 'year') {
            date.setFullYear(date.getFullYear() + duration);
        }
        return date.toISOString().split('T')[0];
    };

    const calculateServicesRemaining = (services) => {
        const remaining = {};
        services.forEach(service => {
            remaining[service.item] = service.quantity;
        });
        return remaining;
    };

    const calculateNextServiceDate = (startDate, services) => {
        // Find the most frequent service
        const frequencies = { 'monthly': 30, 'quarterly': 90, 'half-yearly': 180, 'annual': 365 };
        let minDays = 365;

        services.forEach(service => {
            const days = frequencies[service.frequency] || 365;
            if (days < minDays) minDays = days;
        });

        const date = new Date(startDate);
        date.setDate(date.getDate() + minDays);
        return date.toISOString().split('T')[0];
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                    
                    {successData ? (
                        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <CheckCircle color="#10b981" size={64} style={{ marginBottom: 'var(--spacing-md)' }} />
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                AMC Created Successfully!
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: '400px' }}>
                                The AMC agreement for <strong>{successData.customerName || successData.accounts?.name || 'Customer'}</strong> has been activated in the system.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', width: '100%', maxWidth: '300px' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPrintAgreement(true)} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <Printer size={18} />
                                    Print AMC Agreement
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPrintInvoice(true)} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <FileText size={18} />
                                    Generate Setup Invoice
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={onClose} 
                                    style={{ marginTop: 'var(--spacing-md)', padding: '12px' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="modal-header">
                                <h2 className="modal-title">New AMC Subscription</h2>
                                <button className="btn-icon" onClick={onClose}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '60vh', overflowY: 'auto' }}>
                        {/* Customer Selection */}
                        <div className="form-group">
                            <label className="form-label">Customer *</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-select"
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value, property: null })}
                                    required
                                    disabled={loadingCustomers}
                                >
                                    <option value="">{loadingCustomers ? 'Loading customers...' : 'Select Customer'}</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {loadingCustomers && (
                                    <div style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <RefreshCcw size={14} className="spin" color="var(--text-tertiary)" />
                                    </div>
                                )}
                            </div>
                            {!loadingCustomers && customers.length === 0 && (
                                <p style={{ fontSize: 'var(--font-size-xs)', color: '#f59e0b', marginTop: 'var(--spacing-xs)' }}>
                                    No customers found. Please create one in the Accounts tab first.
                                </p>
                            )}
                        </div>

                        {/* Property Selection */}
                        {formData.customerId && (() => {
                            const selectedCustomer = customers.find(c => c.id === formData.customerId);
                            const properties = selectedCustomer?.properties || [];

                            if (properties.length > 0) {
                                return (
                                    <div className="form-group">
                                        <label className="form-label">Service Property/Location</label>
                                        <select
                                            className="form-select"
                                            value={formData.property?.id || ''}
                                            onChange={(e) => {
                                                const property = properties.find(p => p.id === e.target.value);
                                                setFormData({ ...formData, property });
                                            }}
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
                                                <strong>Address:</strong> {
                                                    formData.property.address?.line1
                                                        ? `${formData.property.address.line1}, ${formData.property.address.locality}, ${formData.property.address.pincode}`
                                                        : formData.property.address || 'No address specified'
                                                }
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* AMC Plan Selection */}
                        <div className="form-group">
                            <label className="form-label">AMC Plan *</label>
                            <select
                                className="form-select"
                                value={formData.planId}
                                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                required
                            >
                                <option value="">Select AMC Plan</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} - ₹{plan.price}/{plan.duration?.value} {plan.duration?.unit}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Plan Details */}
                        {selectedPlan && (
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                    Plan Details
                                </h4>
                                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                    <strong>Category:</strong> {selectedPlan.category}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                    <strong>Duration:</strong> {selectedPlan.duration.value} {selectedPlan.duration.unit}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                    <strong>Included Services:</strong>
                                </div>
                                <ul style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                                    {selectedPlan.services.map((service, idx) => (
                                        <li key={idx}>{service.quantity}x {service.item} ({service.frequency})</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Product Details */}
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="form-group">
                                <label className="form-label">Product Brand *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.productBrand}
                                    onChange={(e) => setFormData({ ...formData, productBrand: e.target.value })}
                                    required
                                    placeholder="e.g., Kent, Aquaguard"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Product Model *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.productModel}
                                    onChange={(e) => setFormData({ ...formData, productModel: e.target.value })}
                                    required
                                    placeholder="e.g., Grand Plus"
                                />
                            </div>
                        </div>

                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="form-group">
                                <label className="form-label">Serial Number *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    required
                                    placeholder="e.g., RO-SN-12345"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="form-group">
                            <label className="form-label">Payment Status *</label>
                            <select
                                className="form-select"
                                value={formData.paymentStatus}
                                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                required
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>

                        {/* Auto Renew */}
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.autoRenew}
                                    onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                                />
                                <span>Enable auto-renewal</span>
                            </label>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                                placeholder="Any special instructions or notes..."
                            />
                        </div>

                        {/* Summary */}
                        {selectedPlan && (
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #8b5cf6'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#8b5cf6' }}>
                                    AMC Summary
                                </h4>
                                <div style={{ fontSize: 'var(--font-size-sm)', display: 'grid', gap: '4px' }}>
                                    <div>Plan: <strong>{selectedPlan.name}</strong></div>
                                    <div>Duration: <strong>{selectedPlan.duration?.value} {selectedPlan.duration?.unit}</strong></div>
                                    <div>Amount: <strong>{formatCurrency(selectedPlan.price)}</strong></div>
                                    {formData.startDate && (
                                        <div>Contract Period: <strong>{new Date(formData.startDate).toLocaleDateString('en-GB')} - {new Date(calculateEndDate(formData.startDate, selectedPlan.duration?.value, selectedPlan.duration?.unit)).toLocaleDateString('en-GB')}</strong></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create AMC
                        </button>
                    </div>
                </form>
                        </>
                    )}
                </div>
            </div>

            {/* Print Modals that render OVER the current modal */}
            {showPrintAgreement && (
                <PrintAgreementModal 
                    type="amc" 
                    data={successData} 
                    onClose={() => setShowPrintAgreement(false)} 
                />
            )}
            
            {showPrintInvoice && (
                <SetupInvoiceModal 
                    type="amc" 
                    data={successData} 
                    onClose={() => setShowPrintInvoice(false)} 
                />
            )}
        </>
    );
}

export default NewAMCForm;
