'use client'

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

function RentalPlanForm({ plan = null, onClose, onSave }) {
    const [formData, setFormData] = useState(plan || {
        productName: '',
        category: 'AC',
        tenureOptions: [
            { duration: 1, unit: 'month', monthlyRent: 0, securityDeposit: 0, setupFee: 0 }
        ],
        includedServices: [''],
        freeVisits: 0,
        terms: '',
        isActive: true
    });

    const handleAddTenure = () => {
        setFormData({
            ...formData,
            tenureOptions: [...formData.tenureOptions, { duration: 1, unit: 'month', monthlyRent: 0, securityDeposit: 0, setupFee: 0 }]
        });
    };

    const handleRemoveTenure = (index) => {
        setFormData({
            ...formData,
            tenureOptions: formData.tenureOptions.filter((_, i) => i !== index)
        });
    };

    const handleTenureChange = (index, field, value) => {
        const newTenures = [...formData.tenureOptions];
        newTenures[index] = { ...newTenures[index], [field]: value };
        setFormData({ ...formData, tenureOptions: newTenures });
    };

    const handleAddService = () => {
        setFormData({
            ...formData,
            includedServices: [...formData.includedServices, '']
        });
    };

    const handleRemoveService = (index) => {
        setFormData({
            ...formData,
            includedServices: formData.includedServices.filter((_, i) => i !== index)
        });
    };

    const handleServiceChange = (index, value) => {
        const newServices = [...formData.includedServices];
        newServices[index] = value;
        setFormData({ ...formData, includedServices: newServices });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2 className="modal-title">{plan ? 'Edit Rental Plan' : 'Create Rental Plan'}</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '60vh', overflowY: 'auto' }}>
                        {/* Basic Info */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Basic Information
                            </h3>
                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="form-group">
                                    <label className="form-label">Product Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.productName}
                                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                        required
                                        placeholder="e.g., Washing Machine - 7kg Front Load"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <select
                                        className="form-select"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="AC">AC</option>
                                        <option value="Refrigerator">Refrigerator</option>
                                        <option value="Microwave Oven">Microwave Oven</option>
                                        <option value="Washing Machine">Washing Machine</option>
                                        <option value="Water Purifier">Water Purifier</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Free Service Visits</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.freeVisits}
                                        onChange={(e) => setFormData({ ...formData, freeVisits: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        placeholder="e.g., 2 for filter changes"
                                    />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        Number of free service visits included in this rental plan
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tenure Options */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                                    Pricing Tiers
                                </h3>
                                <button type="button" className="btn btn-secondary" onClick={handleAddTenure} style={{ fontSize: 'var(--font-size-sm)' }}>
                                    <Plus size={14} />
                                    Add Tier
                                </button>
                            </div>

                            {formData.tenureOptions.map((tenure, index) => (
                                <div key={index} style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-sm)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Tier {index + 1}</span>
                                        {formData.tenureOptions.length > 1 && (
                                            <button type="button" className="btn-icon" onClick={() => handleRemoveTenure(index)}>
                                                <Trash2 size={14} color="#ef4444" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Duration</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={tenure.duration}
                                                onChange={(e) => handleTenureChange(index, 'duration', parseInt(e.target.value))}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Unit</label>
                                            <select
                                                className="form-select"
                                                value={tenure.unit}
                                                onChange={(e) => handleTenureChange(index, 'unit', e.target.value)}
                                                required
                                            >
                                                <option value="month">Month(s)</option>
                                                <option value="months">Months</option>
                                                <option value="year">Year(s)</option>
                                                <option value="years">Years</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Monthly Rent (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={tenure.monthlyRent}
                                                onChange={(e) => handleTenureChange(index, 'monthlyRent', parseInt(e.target.value))}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Security Deposit (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={tenure.securityDeposit}
                                                onChange={(e) => handleTenureChange(index, 'securityDeposit', parseInt(e.target.value))}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Setup Fee (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={tenure.setupFee}
                                                onChange={(e) => handleTenureChange(index, 'setupFee', parseInt(e.target.value))}
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Included Services */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                                    Included Services
                                </h3>
                                <button type="button" className="btn btn-secondary" onClick={handleAddService} style={{ fontSize: 'var(--font-size-sm)' }}>
                                    <Plus size={14} />
                                    Add Service
                                </button>
                            </div>

                            {formData.includedServices.map((service, index) => (
                                <div key={index} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={service}
                                        onChange={(e) => handleServiceChange(index, e.target.value)}
                                        placeholder="e.g., Free installation"
                                        style={{ flex: 1 }}
                                    />
                                    {formData.includedServices.length > 1 && (
                                        <button type="button" className="btn-icon" onClick={() => handleRemoveService(index)}>
                                            <Trash2 size={14} color="#ef4444" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Terms */}
                        <div className="form-group">
                            <label className="form-label">Terms & Conditions</label>
                            <textarea
                                className="form-input"
                                value={formData.terms}
                                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                rows="4"
                                placeholder="Enter terms and conditions..."
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {plan ? 'Update Plan' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RentalPlanForm;





