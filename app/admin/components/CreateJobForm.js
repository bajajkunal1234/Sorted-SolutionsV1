'use client'

import { useState, useEffect } from 'react';
import { X, Save, Upload, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { customersAPI, techniciansAPI, brandsAPI, issuesAPI, propertiesAPI, productsAPI } from '@/lib/adminAPI';


function CreateJobForm({ onClose, onCreate, existingJob }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data States
    const [customers, setCustomers] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [brands, setBrands] = useState([]);
    const [issues, setIssues] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // Master products list
    const [properties, setProperties] = useState([]); // Fetched when customer is selected

    const [formData, setFormData] = useState({
        thumbnail: existingJob?.thumbnail || null,
        thumbnailPreview: existingJob?.thumbnail_preview || null,
        jobName: existingJob?.description || '', // Mapping description to jobName for UI consistency
        customer: existingJob?.customer ? { id: existingJob.customer_id, ...existingJob.customer } : null,
        property: existingJob?.property ? { id: existingJob.property.id, ...existingJob.property } : null,
        product: existingJob?.product ? { id: existingJob.product.id, ...existingJob.product } : null,
        brand: existingJob?.brand ? { id: existingJob.brand.id, ...existingJob.brand } : null,
        issue: existingJob?.issue ? { id: existingJob.issue.id, ...existingJob.issue } : null,
        warranty: existingJob?.warranty || false,
        warrantyProof: existingJob?.warranty_proof || '',
        openingDate: existingJob?.created_at ? new Date(existingJob.created_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        dueDate: existingJob?.scheduled_date ? new Date(existingJob.scheduled_date).toISOString().slice(0, 16) : '',
        assignedTo: existingJob?.technician_id || '',
        assignedToName: existingJob?.technician_name || '',
        tags: existingJob?.tags || []
    });

    const [errors, setErrors] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(null); // 'customer', 'property', 'product', 'brand', 'issue'
    const [quickFormData, setQuickFormData] = useState({}); // Data for quick creation forms

    // Fetch initial data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [
                    customersData,
                    techniciansData,
                    brandsData,
                    issuesData,
                    productsData
                ] = await Promise.all([
                    customersAPI.getAll(),
                    techniciansAPI.getAll(),
                    brandsAPI.getAll(),
                    issuesAPI.getAll(),
                    productsAPI.getAll()
                ]);

                setCustomers(customersData || []);
                setTechnicians(techniciansData || []);
                setBrands(brandsData || []);
                setIssues(issuesData || []);
                setAllProducts(productsData || []);

                // If editing and has customer, fetch properties
                if (existingJob?.customer_id) {
                    const props = await propertiesAPI.getAll(existingJob.customer_id);
                    setProperties(props || []);
                }
            } catch (err) {
                console.error('Error fetching master data:', err);
                // Optionally handle error state here
            } finally {
                setLoading(false);
            }
        };

        fetchMasterData();
    }, [existingJob]);

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

    const handleCustomerChange = async (customerId) => {
        const customer = customers.find(c => c.id === customerId);
        setFormData({
            ...formData,
            customer,
            property: null, // Reset property when customer changes
        });

        // Fetch properties for selected customer
        if (customerId) {
            try {
                const props = await propertiesAPI.getAll(customerId);
                setProperties(props || []);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setProperties([]);
            }
        } else {
            setProperties([]);
        }
    };

    const handlePropertyChange = (propertyId) => {
        const property = properties.find(p => p.id === propertyId);
        setFormData({ ...formData, property });
    };

    const handleProductChange = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        setFormData({ ...formData, product });
    };

    const handleBrandChange = (brandId) => {
        const brand = brands.find(b => b.id === brandId);
        setFormData({ ...formData, brand });
    };

    const handleIssueChange = (issueId) => {
        const issue = issues.find(i => i.id === issueId);
        setFormData({ ...formData, issue });

        // Auto-populate job name if empty
        if (!formData.jobName && issue) {
            setFormData(prev => ({ ...prev, issue, jobName: issue.title || issue.name }));
        }
    };

    const handleTechnicianChange = (techId) => {
        const tech = technicians.find(t => t.id === techId);
        setFormData({
            ...formData,
            assignedTo: tech?.id || '',
            assignedToName: tech?.name || ''
        });
    };

    const toggleTag = (tag) => {
        const newTags = formData.tags.includes(tag)
            ? formData.tags.filter(t => t !== tag)
            : [...formData.tags, tag];
        setFormData({ ...formData, tags: newTags });
    };

    // Inline Creation Handlers
    const handleCreateCustomer = async () => {
        try {
            const newCustomer = await customersAPI.create(quickFormData);
            setCustomers([...customers, newCustomer]);
            setFormData({ ...formData, customer: newCustomer, property: null });
            setShowCreateModal(null);
            setQuickFormData({});
        } catch (err) {
            console.error('Error creating customer:', err);
            alert('Failed to create customer: ' + err.message);
        }
    };

    const handleCreateProperty = async () => {
        try {
            const newProperty = await propertiesAPI.create({
                ...quickFormData,
                customer_id: formData.customer.id
            });
            setProperties([...properties, newProperty]);
            setFormData({ ...formData, property: newProperty });
            setShowCreateModal(null);
            setQuickFormData({});
        } catch (err) {
            console.error('Error creating property:', err);
            alert('Failed to create property: ' + err.message);
        }
    };

    const handleCreateProduct = async () => {
        try {
            const newProduct = await productsAPI.create(quickFormData);
            setAllProducts([...allProducts, newProduct]);
            setFormData({ ...formData, product: newProduct });
            setShowCreateModal(null);
            setQuickFormData({});
        } catch (err) {
            console.error('Error creating product:', err);
            alert('Failed to create product: ' + err.message);
        }
    };

    const handleCreateBrand = async () => {
        try {
            const newBrand = await brandsAPI.create(quickFormData);
            setBrands([...brands, newBrand]);
            setFormData({ ...formData, brand: newBrand });
            setShowCreateModal(null);
            setQuickFormData({});
        } catch (err) {
            console.error('Error creating brand:', err);
            alert('Failed to create brand: ' + err.message);
        }
    };

    const handleCreateIssue = async () => {
        try {
            const newIssue = await issuesAPI.create(quickFormData);
            setIssues([...issues, newIssue]);
            setFormData({ ...formData, issue: newIssue });
            setShowCreateModal(null);
            setQuickFormData({});
        } catch (err) {
            console.error('Error creating issue:', err);
            alert('Failed to create issue: ' + err.message);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.jobName.trim()) newErrors.jobName = 'Job name/description is required';
        if (!formData.customer) newErrors.customer = 'Customer is required';
        if (!formData.property) newErrors.property = 'Property is required';
        if (!formData.product) newErrors.product = 'Appliance/Product is required';
        // Brand and Issue might be optional or "Other" could be used, but let's keep required for now
        if (!formData.brand) newErrors.brand = 'Brand is required';
        if (!formData.issue) newErrors.issue = 'Issue is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);

        try {
            // Map to Supabase Schema (snake_case)
            const jobData = {
                // Generated fields
                job_number: existingJob?.job_number || `JOB-${Date.now().toString().slice(-6)}`,

                // References
                customer_id: formData.customer.id,
                customer_name: formData.customer.name,
                technician_id: formData.assignedTo || null,
                technician_name: formData.assignedToName || null,

                // Details
                description: formData.jobName,
                status: existingJob?.status || 'pending',
                priority: 'medium', // Default

                // JSONB or Text fields depending on schema
                // Schema has 'property JSONB', 'brand TEXT', 'issue TEXT', 'appliance TEXT'
                // But previously viewed schema showed relations? No, Schema showed TEXT for brand/issue/appliance.
                // Wait, Schema (Step 5537) Lines 53-58:
                // category TEXT, subcategory TEXT, appliance TEXT, brand TEXT, model TEXT, issue TEXT
                // and property JSONB.

                category: formData.product?.category || 'General',
                appliance: formData.product?.name,
                brand: formData.brand?.name,
                issue: formData.issue?.title || formData.issue?.name, // Issue table has title

                // Dates
                scheduled_date: formData.dueDate || null,
                created_at: new Date().toISOString(),

                // Extra fields
                amount: 0, // Default
                property: formData.property, // Store full property object in JSONB
                notes: formData.warranty ? `Warranty Claim: ${formData.warrantyProof}` : '',
            };

            await onCreate(jobData);
            onClose();
        } catch (err) {
            console.error('Error creating job:', err);
            // setErrors({ submit: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: '700px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <Loader2 className="animate-spin" size={32} />
                    <span style={{ marginLeft: '10px' }}>Loading master data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{existingJob ? 'Edit Job' : 'Create New Job'}</h2>
                        {existingJob && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Job #: {existingJob.job_number}
                            </p>
                        )}
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                    {/* 1. Thumbnail Upload */}
                    <div className="form-group">
                        <label className="form-label">Job Thumbnail (Optional)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            {formData.thumbnailPreview ? (
                                <img
                                    src={formData.thumbnailPreview}
                                    alt="Thumbnail preview"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px dashed var(--border-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-tertiary)'
                                }}>
                                    <ImageIcon size={24} />
                                </div>
                            )}
                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
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

                    {/* 2. Customer Selection */}
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
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowCreateModal('customer');
                                    setQuickFormData({ name: '', phone: '', email: '' });
                                }}
                                title="Create new customer"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.customer && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.customer}</span>}

                        {/* Inline Customer Creation Form */}
                        {showCreateModal === 'customer' && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-md)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Create New Customer</h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Customer Name *"
                                        value={quickFormData.name || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                                    />
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="Phone Number *"
                                        value={quickFormData.phone || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, phone: e.target.value })}
                                    />
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="Email (Optional)"
                                        value={quickFormData.email || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, email: e.target.value })}
                                    />
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCreateCustomer}
                                            disabled={!quickFormData.name || !quickFormData.phone}
                                        >
                                            <Save size={16} />
                                            Create
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setShowCreateModal(null);
                                                setQuickFormData({});
                                            }}
                                        >
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Info Card */}
                        {formData.customer && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <div><strong>Phone:</strong> {formData.customer.phone}</div>
                                    <div><strong>Email:</strong> {formData.customer.email || 'N/A'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div><strong>Jobs Done:</strong> {formData.customer.jobs_done || 0}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Property Selection */}
                    <div className="form-group">
                        <label className="form-label">Property / Address *</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <select
                                className="form-select"
                                value={formData.property?.id || ''}
                                onChange={(e) => handlePropertyChange(e.target.value)}
                                disabled={!formData.customer}
                                style={{ flex: 1 }}
                            >
                                <option value="">{formData.customer ? 'Select property...' : 'Select customer first'}</option>
                                {properties.map(property => (
                                    <option key={property.id} value={property.id}>
                                        {property.property_name || property.label || property.address?.line1 || `Property #${property.id.slice(0, 6)}`}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={!formData.customer}
                                onClick={() => {
                                    setShowCreateModal('property');
                                    setQuickFormData({ property_name: '', address: { line1: '', locality: '', pincode: '' } });
                                }}
                                title="Add property"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.property && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.property}</span>}

                        {/* Inline Property Creation Form */}
                        {showCreateModal === 'property' && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-md)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Add New Property</h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Property Name (Optional)"
                                        value={quickFormData.property_name || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, property_name: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Address Line 1 *"
                                        value={quickFormData.address?.line1 || ''}
                                        onChange={(e) => setQuickFormData({
                                            ...quickFormData,
                                            address: { ...quickFormData.address, line1: e.target.value }
                                        })}
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Locality/Area *"
                                        value={quickFormData.address?.locality || ''}
                                        onChange={(e) => setQuickFormData({
                                            ...quickFormData,
                                            address: { ...quickFormData.address, locality: e.target.value }
                                        })}
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Pincode *"
                                        value={quickFormData.address?.pincode || ''}
                                        onChange={(e) => setQuickFormData({
                                            ...quickFormData,
                                            address: { ...quickFormData.address, pincode: e.target.value }
                                        })}
                                    />
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCreateProperty}
                                            disabled={!quickFormData.address?.line1 || !quickFormData.address?.locality || !quickFormData.address?.pincode}
                                        >
                                            <Save size={16} />
                                            Create
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setShowCreateModal(null);
                                                setQuickFormData({});
                                            }}
                                        >
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.property && (
                            <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                {formData.property.address?.line1 ?
                                    `${formData.property.address.line1}, ${formData.property.address.locality || ''}` :
                                    (formData.property.address || '')}
                            </div>
                        )}
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--border-primary)', margin: 'var(--spacing-md) 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        {/* 4. Product/Appliance */}
                        <div className="form-group">
                            <label className="form-label">Appliance *</label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <select
                                    className="form-select"
                                    value={formData.product?.id || ''}
                                    onChange={(e) => handleProductChange(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select appliance...</option>
                                    {allProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.category})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowCreateModal('product');
                                        setQuickFormData({ name: '', category: '' });
                                    }}
                                    title="Add new product"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            {errors.product && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.product}</span>}

                            {/* Inline Product Creation Form */}
                            {showCreateModal === 'product' && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    border: '2px solid var(--color-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-secondary)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Add New Product</h4>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Product Name *"
                                            value={quickFormData.name || ''}
                                            onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Category (e.g., Washing Machine, AC) *"
                                            value={quickFormData.category || ''}
                                            onChange={(e) => setQuickFormData({ ...quickFormData, category: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={handleCreateProduct}
                                                disabled={!quickFormData.name || !quickFormData.category}
                                            >
                                                <Save size={16} />
                                                Create
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setShowCreateModal(null);
                                                    setQuickFormData({});
                                                }}
                                            >
                                                <X size={16} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. Brand */}
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
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowCreateModal('brand');
                                        setQuickFormData({ name: '' });
                                    }}
                                    title="Add new brand"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            {errors.brand && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.brand}</span>}

                            {/* Inline Brand Creation Form */}
                            {showCreateModal === 'brand' && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    border: '2px solid var(--color-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-secondary)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Add New Brand</h4>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Brand Name *"
                                            value={quickFormData.name || ''}
                                            onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={handleCreateBrand}
                                                disabled={!quickFormData.name}
                                            >
                                                <Save size={16} />
                                                Create
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setShowCreateModal(null);
                                                    setQuickFormData({});
                                                }}
                                            >
                                                <X size={16} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 6. Issue */}
                    <div className="form-group">
                        <label className="form-label">Issue / Complaint *</label>
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
                                        {issue.title || issue.name} ({issue.category})
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowCreateModal('issue');
                                    setQuickFormData({ title: '', category: '' });
                                }}
                                title="Add new issue"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.issue && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.issue}</span>}

                        {/* Inline Issue Creation Form */}
                        {showCreateModal === 'issue' && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-md)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Add New Issue</h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Issue Title *"
                                        value={quickFormData.title || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, title: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Category (Optional)"
                                        value={quickFormData.category || ''}
                                        onChange={(e) => setQuickFormData({ ...quickFormData, category: e.target.value })}
                                    />
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCreateIssue}
                                            disabled={!quickFormData.title}
                                        >
                                            <Save size={16} />
                                            Create
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setShowCreateModal(null);
                                                setQuickFormData({});
                                            }}
                                        >
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 7. Job Description */}
                    <div className="form-group">
                        <label className="form-label">Job Description *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Washing Machine not spinning"
                            value={formData.jobName}
                            onChange={(e) => setFormData({ ...formData, jobName: e.target.value })}
                        />
                        {errors.jobName && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.jobName}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        {/* 8. Warranty */}
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', height: '100%', paddingTop: '24px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.warranty}
                                    onChange={(e) => setFormData({ ...formData, warranty: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span className="form-label" style={{ marginBottom: 0 }}>Under Warranty</span>
                            </label>
                        </div>
                        {/* 9. Warranty Proof */}
                        {formData.warranty && (
                            <div className="form-group">
                                <label className="form-label">Warranty Proof / Invoice #</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter reference number"
                                    value={formData.warrantyProof}
                                    onChange={(e) => setFormData({ ...formData, warrantyProof: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--border-primary)', margin: 'var(--spacing-md) 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        {/* 10. Due Date */}
                        <div className="form-group">
                            <label className="form-label">Scheduled Date</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>

                        {/* 11. Assign Technician */}
                        <div className="form-group">
                            <label className="form-label">Assign Technician</label>
                            <select
                                className="form-select"
                                value={formData.assignedTo}
                                onChange={(e) => handleTechnicianChange(e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.name} {tech.status === 'busy' ? '(Busy)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-md)' }}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {existingJob ? 'Update Job' : 'Create Job'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateJobForm;
