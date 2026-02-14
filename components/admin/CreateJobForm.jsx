'use client'

import { useState } from 'react';
import { X, Save, Upload, Plus } from 'lucide-react';
import { sampleBrands, sampleIssues, sampleTechnicians, tagOptions } from '@/data/sampleData';
import { sampleLedgers } from '@/data/accountingData';

function CreateJobForm({ onClose, onCreate, existingJob }) {
    const [formData, setFormData] = useState({
        thumbnail: existingJob?.thumbnail || null,
        thumbnailPreview: existingJob?.thumbnailPreview || null,
        jobName: existingJob?.jobName || '',
        customer: existingJob?.customer ? { id: existingJob.customerId, name: existingJob.customer } : null,
        property: existingJob?.property ? { id: existingJob.propertyId, address: existingJob.address } : null,
        product: existingJob?.product || null,
        brand: existingJob?.brand || null,
        issue: existingJob?.issue || null,
        warranty: existingJob?.warranty || false,
        warrantyProof: existingJob?.warrantyProof || '',
        openingDate: existingJob?.scheduledDate ? new Date(existingJob.scheduledDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        dueDate: existingJob?.dueDate || '',
        assignedTo: existingJob?.assignedTo || 'admin',
        assignedToName: existingJob?.assignedToName || 'Admin',
        tags: existingJob?.tags || []
    });

    const [errors, setErrors] = useState({});

    // Real customer accounts from sampleLedgers (filter for customers only)
    const customers = sampleLedgers.filter(ledger =>
        ledger.type === 'customer' ||
        ledger.under === 'customer-accounts' ||
        ledger.under === 'sundry-debtors'
    );

    const [brands] = useState(sampleBrands);
    const [issues] = useState(sampleIssues);
    const [technicians] = useState(sampleTechnicians);

    // Real properties from selected customer
    const properties = formData.customer?.properties || [];

    // Sample products (filtered by property) - TODO: Replace with real product data
    const products = formData.property ? [
        { id: 'pr1', propertyId: formData.property.id, name: 'Washing Machine', type: 'Front Load' },
        { id: 'pr2', propertyId: formData.property.id, name: 'Microwave Oven', type: 'Convection' },
        { id: 'pr3', propertyId: formData.property.id, name: 'Air Conditioner', type: 'Split AC 1.5 Ton' }
    ] : [];

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({
                    ...formData,
                    thumbnail: file,
                    thumbnailPreview: reader.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCustomerChange = (customerId) => {
        const customer = customers.find(c => c.id === customerId);
        setFormData({
            ...formData,
            customer,
            property: null, // Reset property when customer changes
            product: null   // Reset product when customer changes
        });
    };

    const handlePropertyChange = (propertyId) => {
        const property = properties.find(p => p.id === propertyId);
        setFormData({
            ...formData,
            property,
            product: null // Reset product when property changes
        });
    };

    const handleProductChange = (productId) => {
        const product = products.find(p => p.id === productId);
        setFormData({ ...formData, product });
    };

    const handleBrandChange = (brandId) => {
        const brand = brands.find(b => b.id === brandId);
        setFormData({ ...formData, brand });
    };

    const handleIssueChange = (issueId) => {
        const issue = issues.find(i => i.id === issueId);
        setFormData({ ...formData, issue });
    };

    const handleTechnicianChange = (techId) => {
        const tech = technicians.find(t => t.id === techId);
        setFormData({
            ...formData,
            assignedTo: tech.id,
            assignedToName: tech.name
        });
    };

    const toggleTag = (tag) => {
        const newTags = formData.tags.includes(tag)
            ? formData.tags.filter(t => t !== tag)
            : [...formData.tags, tag];
        setFormData({ ...formData, tags: newTags });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.jobName.trim()) newErrors.jobName = 'Job name is required';
        if (!formData.customer) newErrors.customer = 'Customer is required';
        if (!formData.property) newErrors.property = 'Property is required';
        if (!formData.product) newErrors.product = 'Product is required';
        if (!formData.brand) newErrors.brand = 'Brand is required';
        if (!formData.issue) newErrors.issue = 'Issue is required';
        if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
        if (formData.warranty && !formData.warrantyProof.trim()) {
            newErrors.warrantyProof = 'Warranty proof is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const newJob = {
            jobName: formData.jobName,
            thumbnail: formData.thumbnailPreview || 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
            customer: formData.customer,
            property: formData.property,
            product: formData.product,
            brand: formData.brand,
            issue: formData.issue,
            status: 'pending',
            assignedTo: formData.assignedTo,
            assignedToName: formData.assignedToName,
            openingDate: formData.openingDate,
            dueDate: formData.dueDate,
            tags: formData.tags,
            warranty: formData.warranty,
            warrantyProof: formData.warrantyProof,
            createdBy: 'Admin'
        };

        onCreate(newJob);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{existingJob ? 'Edit Job' : 'Create New Job'}</h2>
                        {existingJob && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Reference: {existingJob.reference}
                            </p>
                        )}
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* 1. Thumbnail Upload */}
                    <div className="form-group">
                        <label className="form-label">Job Thumbnail</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-md)'
                        }}>
                            {formData.thumbnailPreview && (
                                <img
                                    src={formData.thumbnailPreview}
                                    alt="Thumbnail preview"
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)'
                                    }}
                                />
                            )}
                            <label
                                className="btn btn-secondary"
                                style={{ cursor: 'pointer' }}
                            >
                                <Upload size={16} />
                                Upload Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>

                    {/* 2. Job Name */}
                    <div className="form-group">
                        <label className="form-label">Job Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., WM Dead Jogeshwari or Microwave Sparking Issue Malad"
                            value={formData.jobName}
                            onChange={(e) => setFormData({ ...formData, jobName: e.target.value })}
                        />
                        {errors.jobName && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.jobName}</span>}
                    </div>

                    {/* 3. Customer */}
                    <div className="form-group">
                        <label className="form-label">Customer *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.customer?.id || ''}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select customer...</option>
                                {customers.map(customer => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} - {customer.phone}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-secondary" title="Create new customer">
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.customer && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.customer}</span>}

                        {/* Auto-populated customer info */}
                        {formData.customer && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                <div><strong>Phone:</strong> {formData.customer.phone}</div>
                                <div><strong>Email:</strong> {formData.customer.email}</div>
                            </div>
                        )}
                    </div>

                    {/* 4. Customer Property */}
                    <div className="form-group">
                        <label className="form-label">Customer Property *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.property?.id || ''}
                                onChange={(e) => handlePropertyChange(e.target.value)}
                                disabled={!formData.customer}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select property...</option>
                                {properties.map(property => (
                                    <option key={property.id} value={property.id}>
                                        {property.label || property.name || `Property ${property.id}`}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-secondary" disabled={!formData.customer} title="Create new property">
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.property && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.property}</span>}

                        {/* Show selected property address */}
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

                    {/* 5. Product */}
                    <div className="form-group">
                        <label className="form-label">Product *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.product?.id || ''}
                                onChange={(e) => handleProductChange(e.target.value)}
                                disabled={!formData.property}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select product...</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} - {product.type}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-secondary" disabled={!formData.property} title="Create new product">
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.product && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.product}</span>}
                    </div>

                    {/* 6. Brand */}
                    <div className="form-group">
                        <label className="form-label">Brand *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.brand?.id || ''}
                                onChange={(e) => handleBrandChange(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select brand...</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-secondary" title="Create new brand">
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.brand && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.brand}</span>}
                    </div>

                    {/* 7. Issue */}
                    <div className="form-group">
                        <label className="form-label">Issue *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.issue?.id || ''}
                                onChange={(e) => handleIssueChange(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select issue...</option>
                                {issues.map(issue => (
                                    <option key={issue.id} value={issue.id}>
                                        {issue.name}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-secondary" title="Create new issue">
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.issue && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.issue}</span>}
                    </div>

                    {/* 8. Warranty */}
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.warranty}
                                onChange={(e) => setFormData({ ...formData, warranty: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span className="form-label" style={{ marginBottom: 0 }}>Under Warranty</span>
                        </label>

                        {formData.warranty && (
                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Invoice ID or Old Job ID"
                                    value={formData.warrantyProof}
                                    onChange={(e) => setFormData({ ...formData, warrantyProof: e.target.value })}
                                />
                                {errors.warrantyProof && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.warrantyProof}</span>}
                            </div>
                        )}
                    </div>

                    {/* 9. Opening Date & 10. Due Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Opening Date</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.openingDate}
                                onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Due Date *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                            {errors.dueDate && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.dueDate}</span>}
                        </div>
                    </div>

                    {/* 11. Technician Assign */}
                    <div className="form-group">
                        <label className="form-label">Assign Technician</label>
                        <select
                            className="form-select"
                            value={formData.assignedTo}
                            onChange={(e) => handleTechnicianChange(e.target.value)}
                        >
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>
                                    {tech.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 12. Tags */}
                    <div className="form-group">
                        <label className="form-label">Tags</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            {tagOptions.map(tag => (
                                <button
                                    key={tag.value}
                                    type="button"
                                    className={`tag ${formData.tags.includes(tag.value) ? 'tag-vip' : ''}`}
                                    onClick={() => toggleTag(tag.value)}
                                    style={{
                                        cursor: 'pointer',
                                        border: formData.tags.includes(tag.value) ? `2px solid ${tag.color}` : '2px solid transparent',
                                        backgroundColor: formData.tags.includes(tag.value) ? `${tag.color}15` : 'var(--bg-tertiary)'
                                    }}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        <Save size={16} />
                        {existingJob ? 'Update Job' : 'Create Job'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateJobForm;





