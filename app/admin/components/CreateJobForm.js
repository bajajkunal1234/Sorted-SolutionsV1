'use client'

import { useState, useEffect } from 'react';
import { X, Save, Upload, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { customersAPI, techniciansAPI, brandsAPI, issuesAPI, propertiesAPI, productsAPI, accountGroupsAPI, accountsAPI } from '@/lib/adminAPI';
import NewAccountForm from './accounts/NewAccountForm';
import PropertyForm from './accounts/PropertyForm';


function CreateJobForm({ onClose, onCreate, existingJob }) {
    const [submitting, setSubmitting] = useState(false);

    // Data States
    const [customers, setCustomers] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [brands, setBrands] = useState([]);
    const [issues, setIssues] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // Master products list
    const [properties, setProperties] = useState([]); // Fetched when customer is selected
    const [groups, setGroups] = useState([]); // Account groups for NewAccountForm
    const [loadingStates, setLoadingStates] = useState({
        customers: true,
        technicians: true,
        brands: true,
        issues: true,
        products: true,
        groups: false, // Lazy loaded
        properties: false
    });

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

    // Fetch master data asynchronously
    useEffect(() => {
        const fetchMasterData = async () => {
            // Fetch everything in parallel but update state individually if needed
            // For now, we'll keep the Promise.all but remove the blocking 'loading' state
            try {
                const results = await Promise.allSettled([
                    customersAPI.getAll(),
                    techniciansAPI.getAll(),
                    brandsAPI.getAll(),
                    issuesAPI.getAll(),
                    productsAPI.getAll()
                ]);

                if (results[0].status === 'fulfilled') setCustomers(results[0].value || []);
                if (results[1].status === 'fulfilled') setTechnicians(results[1].value || []);
                if (results[2].status === 'fulfilled') setBrands(results[2].value || []);
                if (results[3].status === 'fulfilled') setIssues(results[3].value || []);
                if (results[4].status === 'fulfilled') setAllProducts(results[4].value || []);

                setLoadingStates(prev => ({
                    ...prev,
                    customers: false,
                    technicians: false,
                    brands: false,
                    issues: false,
                    products: false
                }));

                // If editing and has customer, fetch properties
                if (existingJob?.customer_id) {
                    setLoadingStates(prev => ({ ...prev, properties: true }));
                    const props = await propertiesAPI.getAll(existingJob.customer_id);
                    setProperties(props || []);
                    setLoadingStates(prev => ({ ...prev, properties: false }));
                }
            } catch (err) {
                console.error('Error fetching master data:', err);
            }
        };

        fetchMasterData();
    }, [existingJob]);

    // Lazy load account groups when customer creation modal is opened
    useEffect(() => {
        if (showCreateModal === 'customer' && groups.length === 0) {
            const fetchGroups = async () => {
                try {
                    setLoadingStates(prev => ({ ...prev, groups: true }));
                    const data = await accountGroupsAPI.getAll();
                    setGroups(data || []);
                } catch (err) {
                    console.error('Error fetching groups:', err);
                } finally {
                    setLoadingStates(prev => ({ ...prev, groups: false }));
                }
            };
            fetchGroups();
        }
    }, [showCreateModal]);

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

        // Fetch properties for selected customer from both sources and merge
        if (customerId) {
            try {
                setLoadingStates(prev => ({ ...prev, properties: true }));

                // Source 1: Old DB table (properties table with customer_id FK)
                let dbProps = [];
                try {
                    dbProps = await propertiesAPI.getAll(customerId) || [];
                } catch (e) {
                    console.warn('propertiesAPI failed (may not exist):', e.message);
                }

                // Source 2: New JSONB array on the account record
                const accountProps = (customer?.properties || [])
                    .filter(p => p.name?.trim() || p.address?.trim?.() || (typeof p.address === 'object' && p.address?.line1))
                    .map(p => ({
                        // Normalize to a consistent shape
                        id: p.id || `acct-${Date.now()}-${Math.random()}`,
                        property_name: p.name || p.label || '',
                        address: p.address,
                        contactPerson: p.contactPerson || '',
                        contactPhone: p.contactPhone || '',
                        _source: 'account'
                    }));

                // Merge: DB props first, then account props (avoiding duplicates by id)
                const dbIds = new Set(dbProps.map(p => String(p.id)));
                const merged = [
                    ...dbProps,
                    ...accountProps.filter(p => !dbIds.has(String(p.id)))
                ];

                setProperties(merged);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setProperties([]);
            } finally {
                setLoadingStates(prev => ({ ...prev, properties: false }));
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
    const handleAccountSave = async (accountData) => {
        try {
            setSubmitting(true);
            let result;
            if (accountData.id) {
                result = await accountsAPI.update(accountData);
            } else {
                result = await accountsAPI.create(accountData);
            }

            // Refresh customers list
            const updatedCustomers = await customersAPI.getAll();
            setCustomers(updatedCustomers);

            // Find the updated/new customer record
            const updatedCustomer = updatedCustomers.find(c => c.ledger_id === result.id);

            if (updatedCustomer) {
                setFormData({ ...formData, customer: updatedCustomer, property: formData.property });
                // Normalize account.properties JSONB into the properties state
                const accountProps = (updatedCustomer.properties || [])
                    .filter(p => p.name?.trim() || p.address)
                    .map(p => ({
                        id: p.id || `acct-${Date.now()}-${Math.random()}`,
                        property_name: p.name || p.label || '',
                        address: p.address,
                        contactPerson: p.contactPerson || '',
                        contactPhone: p.contactPhone || '',
                        _source: 'account'
                    }));
                setProperties(accountProps);
            }

            setShowCreateModal(null);
            setQuickFormData({});
            alert(`Customer ${accountData.id ? 'updated' : 'created'} successfully!`);
        } catch (err) {
            console.error('Error saving customer account:', err);
            alert('Failed to save customer: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };


    const handlePropertySave = async (propertyData) => {
        try {
            setSubmitting(true);
            const newProperty = await propertiesAPI.create(propertyData);
            setProperties([...properties, newProperty]);
            setFormData({ ...formData, property: newProperty });
            setShowCreateModal(null);
            alert('Property added successfully!');
        } catch (err) {
            console.error('Error creating property:', err);
            alert('Failed to create property: ' + err.message);
        } finally {
            setSubmitting(false);
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
                                <option value="">{loadingStates.customers ? 'Loading customers...' : 'Select customer...'}</option>
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
                                    setQuickFormData({});
                                }}
                                title="Create new customer"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {errors.customer && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.customer}</span>}

                        {/* Full Customer (Account) Creation Form */}
                        {showCreateModal === 'customer' && (
                            <NewAccountForm
                                onClose={() => {
                                    setShowCreateModal(null);
                                    setQuickFormData({});
                                }}
                                onSave={handleAccountSave}
                                preselectedType="customer-accounts"
                                groups={groups}
                                onGroupCreated={async () => {
                                    const updatedGroups = await accountGroupsAPI.getAll();
                                    setGroups(updatedGroups);
                                }}
                            />
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
                                <option value="">
                                    {!formData.customer ? 'Select customer first' : (loadingStates.properties ? 'Loading addresses...' : 'Select property...')}
                                </option>
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

                        {/* Full Property Creation Form */}
                        {showCreateModal === 'property' && (
                            <PropertyForm
                                customerId={formData.customer.id}
                                onSave={handlePropertySave}
                                onClose={() => setShowCreateModal(null)}
                            />
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
                                    <option value="">{loadingStates.products ? 'Loading appliances...' : 'Select appliance...'}</option>
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
                                    <option value="">{loadingStates.brands ? 'Loading brands...' : 'Select brand...'}</option>
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
                                <option value="">{loadingStates.issues ? 'Loading issues...' : 'Select issue...'}</option>
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
                                <option value="">{loadingStates.technicians ? 'Loading technicians...' : 'Unassigned'}</option>
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
