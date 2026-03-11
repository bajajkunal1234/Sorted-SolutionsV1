'use client'

import { useState, useEffect } from 'react';
import { X, Plus, RefreshCcw } from 'lucide-react';
import { accountsAPI, accountGroupsAPI } from '@/lib/adminAPI';
import NewAccountForm from '@/app/admin/components/accounts/NewAccountForm';

function NewRentalForm({ plans = [], onClose, onSave }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        property: null,
        planId: '',
        selectedTenure: null,
        serialNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        depositAmount: 0,
        rentAdvance: 0,
        notes: ''
    });

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await accountsAPI.getAll();
            setCustomers(data || []);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
        // Load account groups for the new customer form
        accountGroupsAPI.getAll().then(data => setGroups(data || [])).catch(() => {});
    }, []);

    // Find "Customers" group under Sundry Debtors
    const customersGroupId = groups.find(g =>
        g.name?.toLowerCase().includes('customer') &&
        (g.parent_name?.toLowerCase().includes('sundry') || g.nature === 'asset')
    )?.id || groups.find(g => g.name?.toLowerCase() === 'customers')?.id || '';

    const selectedPlan = plans.find(p => p.id === formData.planId);

    const handleNewAccountSave = async (accountData) => {
        try {
            const newAccount = await accountsAPI.create(accountData);
            if (newAccount?.id) {
                await fetchCustomers();
                setFormData(prev => ({ ...prev, customerId: String(newAccount.id) }));
            }
        } catch (err) {
            console.error('Failed to create account:', err);
            alert('Failed to create account: ' + err.message);
        }
        setShowNewAccountForm(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.selectedTenure) {
            alert('Please select a tenure option');
            return;
        }

        const rentalData = {
            ...formData,
            customerName: customers.find(c => String(c.id) === String(formData.customerId))?.name,
            property: formData.property,
            productName: selectedPlan?.product_name,
            monthlyRent: formData.selectedTenure.monthlyRent,
            securityDeposit: formData.selectedTenure.securityDeposit,
            setupFee: formData.selectedTenure.setupFee,
            depositPaid: formData.depositAmount >= formData.selectedTenure.securityDeposit,
            rentAdvance: formData.rentAdvance,
            tenure: {
                duration: formData.selectedTenure.duration,
                unit: formData.selectedTenure.unit,
                startDate: formData.startDate,
                endDate: calculateEndDate(formData.startDate, formData.selectedTenure.duration, formData.selectedTenure.unit)
            }
        };

        onSave(rentalData);
    };

    const calculateEndDate = (startDate, duration, unit) => {
        const date = new Date(startDate);
        if (unit.includes('month')) {
            date.setMonth(date.getMonth() + duration);
        } else if (unit.includes('year')) {
            date.setFullYear(date.getFullYear() + duration);
        }
        return date.toISOString().split('T')[0];
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                    <div className="modal-header">
                        <h2 className="modal-title">New Rental Agreement</h2>
                        <button className="btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                            {/* Customer Selection */}
                            <div className="form-group">
                                <label className="form-label">Customer *</label>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <select
                                        className="form-select"
                                        value={formData.customerId}
                                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                        required
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">{loading ? 'Loading...' : 'Select Customer'}</option>
                                        {customers.map(customer => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name} ({customer.phone || customer.mobile || 'No phone'})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowNewAccountForm(true)}
                                        disabled={loading}
                                        title="Create new customer account"
                                    >
                                        {loading ? <RefreshCcw size={16} className="spin" /> : <Plus size={16} />}
                                        New Customer
                                    </button>
                                </div>
                            </div>

                            {/* Property Selection */}
                            {formData.customerId && (() => {
                                const selectedCustomer = customers.find(c => String(c.id) === String(formData.customerId));
                                const properties = selectedCustomer?.properties || [];

                                if (properties.length > 0) {
                                    return (
                                        <div className="form-group">
                                            <label className="form-label">Delivery Property/Location</label>
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

                            {/* Rental Plan Selection */}
                            <div className="form-group">
                                <label className="form-label">Rental Plan *</label>
                                <select
                                    className="form-select"
                                    value={formData.planId}
                                    onChange={(e) => setFormData({ ...formData, planId: e.target.value, selectedTenure: null })}
                                    required
                                >
                                    <option value="">Select Rental Plan</option>
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.product_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tenure Selection */}
                            {selectedPlan && (
                                <div className="form-group">
                                    <label className="form-label">Select Tenure *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                        {Array.isArray(selectedPlan.tenure_options) && selectedPlan.tenure_options.map((tenure, index) => (
                                            <div
                                                key={index}
                                                onClick={() => setFormData({ ...formData, selectedTenure: tenure })}
                                                style={{
                                                    padding: 'var(--spacing-md)',
                                                    border: `2px solid ${formData.selectedTenure === tenure ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    backgroundColor: formData.selectedTenure === tenure ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                                    transition: 'all var(--transition-fast)'
                                                }}
                                            >
                                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                                                    {tenure.duration} {tenure.unit}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                                    Rent: <strong>₹{tenure.monthlyRent}/mo</strong>
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    Deposit: ₹{tenure.securityDeposit}
                                                </div>
                                                {tenure.setupFee > 0 && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        Setup: ₹{tenure.setupFee}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Serial Number */}
                            <div className="form-group">
                                <label className="form-label">Serial Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    placeholder="Enter product serial number"
                                />
                            </div>

                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                {/* Start Date */}
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

                                {/* Security Deposit Collected */}
                                <div className="form-group">
                                    <label className="form-label">Security Deposit Collected (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.depositAmount}
                                        onChange={(e) => setFormData({ ...formData, depositAmount: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        required
                                        placeholder="Enter amount collected"
                                    />
                                    {formData.selectedTenure && formData.depositAmount < formData.selectedTenure.securityDeposit && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: '#f59e0b' }}>
                                            Pending: ₹{(formData.selectedTenure.securityDeposit - formData.depositAmount).toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {/* Rent Advance Taken */}
                                <div className="form-group">
                                    <label className="form-label">Rent Advance Taken (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.rentAdvance}
                                        onChange={(e) => setFormData({ ...formData, rentAdvance: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        placeholder="0"
                                    />
                                    {formData.selectedTenure && formData.rentAdvance > 0 && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: '#10b981' }}>
                                            Covers {Math.floor(formData.rentAdvance / formData.selectedTenure.monthlyRent)} month(s) advance
                                        </span>
                                    )}
                                </div>
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
                            {formData.selectedTenure && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                        Rental Summary
                                    </h4>
                                    <div style={{ fontSize: 'var(--font-size-sm)', display: 'grid', gap: '4px' }}>
                                        <div>Monthly Rent: <strong>₹{formData.selectedTenure.monthlyRent}</strong></div>
                                        <div>Security Deposit: <strong>₹{formData.selectedTenure.securityDeposit}</strong></div>
                                        {formData.selectedTenure.setupFee > 0 && (
                                            <div>Setup Fee: <strong>₹{formData.selectedTenure.setupFee}</strong></div>
                                        )}
                                        <div style={{ marginTop: 'var(--spacing-xs)', paddingTop: 'var(--spacing-xs)', borderTop: '1px solid var(--border-primary)' }}>
                                            Security Deposit Collected: <strong>₹{formData.depositAmount.toLocaleString()}</strong>
                                        </div>
                                        {formData.rentAdvance > 0 && (
                                            <div>Rent Advance: <strong>₹{formData.rentAdvance.toLocaleString()}</strong></div>
                                        )}
                                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                            Total Collected: <strong>₹{(formData.depositAmount + formData.rentAdvance).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Create Rental
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* New Customer Account Form — pre-filled as Customer under Sundry Debtors */}
            {showNewAccountForm && (
                <NewAccountForm
                    onClose={() => setShowNewAccountForm(false)}
                    onSave={handleNewAccountSave}
                    preselectedType={customersGroupId}
                    initialData={customersGroupId ? { under: customersGroupId } : {}}
                    groups={groups}
                    onGroupCreated={(newGroup) => setGroups(prev => [...prev, newGroup])}
                />
            )}
        </>
    );
}

export default NewRentalForm;
