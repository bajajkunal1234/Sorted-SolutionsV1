'use client'

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

function AMCPlanForm({ plan = null, onClose, onSave }) {
    const [formData, setFormData] = useState(plan || {
        name: '',
        category: 'Water Purifier',
        applicableProducts: [''],
        duration: { value: 1, unit: 'year' },
        price: 0,
        services: [
            { type: 'service', item: '', quantity: 1, frequency: 'monthly' }
        ],
        benefits: [''],
        terms: '',
        isActive: true
    });

    const handleAddService = () => {
        setFormData({
            ...formData,
            services: [...formData.services, { type: 'service', item: '', quantity: 1, frequency: 'monthly' }]
        });
    };

    const handleRemoveService = (index) => {
        setFormData({
            ...formData,
            services: formData.services.filter((_, i) => i !== index)
        });
    };

    const handleServiceChange = (index, field, value) => {
        const newServices = [...formData.services];
        newServices[index] = { ...newServices[index], [field]: value };
        setFormData({ ...formData, services: newServices });
    };

    const handleAddProduct = () => {
        setFormData({
            ...formData,
            applicableProducts: [...formData.applicableProducts, '']
        });
    };

    const handleRemoveProduct = (index) => {
        setFormData({
            ...formData,
            applicableProducts: formData.applicableProducts.filter((_, i) => i !== index)
        });
    };

    const handleProductChange = (index, value) => {
        const newProducts = [...formData.applicableProducts];
        newProducts[index] = value;
        setFormData({ ...formData, applicableProducts: newProducts });
    };

    const handleAddBenefit = () => {
        setFormData({
            ...formData,
            benefits: [...formData.benefits, '']
        });
    };

    const handleRemoveBenefit = (index) => {
        setFormData({
            ...formData,
            benefits: formData.benefits.filter((_, i) => i !== index)
        });
    };

    const handleBenefitChange = (index, value) => {
        const newBenefits = [...formData.benefits];
        newBenefits[index] = value;
        setFormData({ ...formData, benefits: newBenefits });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2 className="modal-title">{plan ? 'Edit AMC Plan' : 'Create AMC Plan'}</h2>
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
                                    <label className="form-label">Plan Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g., Domestic RO AMC - Annual"
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
                                        <option value="Water Purifier">Water Purifier</option>
                                        <option value="Air Conditioner">Air Conditioner</option>
                                        <option value="Washing Machine">Washing Machine</option>
                                        <option value="Refrigerator">Refrigerator</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                <div className="form-group">
                                    <label className="form-label">Duration Value *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.duration.value}
                                        onChange={(e) => setFormData({ ...formData, duration: { ...formData.duration, value: parseInt(e.target.value) } })}
                                        min="1"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Duration Unit *</label>
                                    <select
                                        className="form-select"
                                        value={formData.duration.unit}
                                        onChange={(e) => setFormData({ ...formData, duration: { ...formData.duration, unit: e.target.value } })}
                                        required
                                    >
                                        <option value="month">Month(s)</option>
                                        <option value="year">Year(s)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Applicable Products */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                                    Applicable Products
                                </h3>
                                <button type="button" className="btn btn-secondary" onClick={handleAddProduct} style={{ fontSize: 'var(--font-size-sm)' }}>
                                    <Plus size={14} />
                                    Add Product
                                </button>
                            </div>

                            {formData.applicableProducts.map((product, index) => (
                                <div key={index} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={product}
                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                        placeholder="e.g., RO, UV, UF"
                                        style={{ flex: 1 }}
                                    />
                                    {formData.applicableProducts.length > 1 && (
                                        <button type="button" className="btn-icon" onClick={() => handleRemoveProduct(index)}>
                                            <Trash2 size={14} color="#ef4444" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Services */}
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

                            {formData.services.map((service, index) => (
                                <div key={index} style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-sm)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Service {index + 1}</span>
                                        {formData.services.length > 1 && (
                                            <button type="button" className="btn-icon" onClick={() => handleRemoveService(index)}>
                                                <Trash2 size={14} color="#ef4444" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Type</label>
                                            <select
                                                className="form-select"
                                                value={service.type}
                                                onChange={(e) => handleServiceChange(index, 'type', e.target.value)}
                                                required
                                            >
                                                <option value="service">Service</option>
                                                <option value="filter_change">Filter Change</option>
                                                <option value="checkup">Checkup</option>
                                                <option value="cleaning">Cleaning</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Item</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={service.item}
                                                onChange={(e) => handleServiceChange(index, 'item', e.target.value)}
                                                placeholder="e.g., PP Filter"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Quantity</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={service.quantity}
                                                onChange={(e) => handleServiceChange(index, 'quantity', parseInt(e.target.value))}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Frequency</label>
                                            <select
                                                className="form-select"
                                                value={service.frequency}
                                                onChange={(e) => handleServiceChange(index, 'frequency', e.target.value)}
                                                required
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="half-yearly">Half-Yearly</option>
                                                <option value="annual">Annual</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Benefits */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                                    Additional Benefits
                                </h3>
                                <button type="button" className="btn btn-secondary" onClick={handleAddBenefit} style={{ fontSize: 'var(--font-size-sm)' }}>
                                    <Plus size={14} />
                                    Add Benefit
                                </button>
                            </div>

                            {formData.benefits.map((benefit, index) => (
                                <div key={index} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={benefit}
                                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                                        placeholder="e.g., Free emergency visits"
                                        style={{ flex: 1 }}
                                    />
                                    {formData.benefits.length > 1 && (
                                        <button type="button" className="btn-icon" onClick={() => handleRemoveBenefit(index)}>
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

export default AMCPlanForm;
