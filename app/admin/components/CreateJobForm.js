'use client'

import { useState, useEffect } from 'react';
import { X, Save, Upload, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import {
    techniciansAPI,
    propertiesAPI,
    accountGroupsAPI,
    accountsAPI,
    customersAPI,
    quickBookingAPI,
    bookingBrandsAPI,
    productsAPI,
    brandsAPI,
    issuesAPI
} from '@/lib/adminAPI';
import NewAccountForm from './accounts/NewAccountForm';
import PropertyForm from './accounts/PropertyForm';


const normalizeAddress = (addr) => {
    if (!addr) return '';
    const str = typeof addr === 'string' ? addr : `${addr.line1 || ''} ${addr.locality || ''} ${addr.city || ''} ${addr.pincode || ''}`;
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

function CreateJobForm({ onClose, onCreate, existingJob }) {
    const [submitting, setSubmitting] = useState(false);

    // Data States
    const [customers, setCustomers] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [brands, setBrands] = useState([]);
    const [issues, setIssues] = useState([]);
    const [categories, setCategories] = useState([]); // Master categories from website settings
    const [allProducts, setAllProducts] = useState([]); // Merged list (Categories + Operational Products)
    const [properties, setProperties] = useState([]); // Fetched when customer is selected
    const [groups, setGroups] = useState([]); // Account groups for NewAccountForm
    const [bookingAddressHint, setBookingAddressHint] = useState(''); // Visitor's address from booking notes
    const [loadingStates, setLoadingStates] = useState({
        customers: true,
        technicians: true,
        brands: true,
        websiteSettings: true,
        groups: false,
        properties: false
    });

    const [formData, setFormData] = useState({
        thumbnail: existingJob?.thumbnail || null,
        thumbnailPreview: existingJob?.thumbnail_preview || null,
        jobName: existingJob?.description || existingJob?.issue || '', // Mapping description to jobName for UI consistency, fallback to issue
        customer: (existingJob?.customer?.id || existingJob?.customer_id) ? { id: existingJob.customer_id || existingJob.customer.id, ...existingJob.customer } : null,
        property: existingJob?.property?.id ? { id: existingJob.property.id, ...existingJob.property } : null,
        product: existingJob?.product?.id ? { id: existingJob.product.id, ...existingJob.product } : null,
        subcategory: null, // Appliance Type — matched from notes
        brand: (existingJob?.brand && typeof existingJob.brand === 'object' && existingJob.brand.id) ? { id: existingJob.brand.id, ...existingJob.brand } : null,
        issue: (existingJob?.issue && typeof existingJob.issue === 'object' && existingJob.issue.id) ? { id: existingJob.issue.id, ...existingJob.issue } : null,
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
            try {
                // Fetch each resource individually to handle partial failures
                const fetchPromises = [
                    { key: 'customers', api: accountsAPI.getAll() },
                    { key: 'technicians', api: techniciansAPI.getAll() },
                    { key: 'brands', api: bookingBrandsAPI.getAll() },
                    { key: 'websiteSettings', api: quickBookingAPI.getSettings() },
                    { key: 'operationalProducts', api: productsAPI.getAll() }
                ];

                const results = await Promise.allSettled(fetchPromises.map(p => p.api));

                const data = {};
                results.forEach((result, idx) => {
                    const key = fetchPromises[idx].key;
                    if (result.status === 'fulfilled') {
                        data[key] = result.value || [];
                    } else {
                        console.error(`Error fetching ${key}:`, result.reason);
                        data[key] = [];
                    }
                });

                const allAccounts = data.customers || [];
                // Filter for customers: either direct type or under a customer/debtor group
                const customersOnly = allAccounts.filter(a =>
                    a.type === 'customer' ||
                    a.under?.toLowerCase().includes('customer') ||
                    a.under?.toLowerCase().includes('debtor') ||
                    (a.under_name || '').toLowerCase().includes('customer') ||
                    (a.under_name || '').toLowerCase().includes('debtor')
                );
                setCustomers(customersOnly);
                setTechnicians(data.technicians || []);
                // Filter to active booking brands only
                setBrands((data.brands || []).filter(b => b.is_active !== false));

                // Extract categories and all issues from website settings
                const categoriesData = (data.websiteSettings?.categories || []).map(cat => ({
                    ...cat,
                    id: cat.id || `appliance-${cat.name.toLowerCase().replace(/\s+/g, '-')}`
                }));
                setCategories(categoriesData);

                // Merge with operational products from inventory/products table
                const operationalProducts = (data.operationalProducts || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    isOperational: true,
                    showOnBookingForm: true // Show these by default in admin
                }));

                const allMergedProducts = [...categoriesData, ...operationalProducts];
                setAllProducts(allMergedProducts);
                // Using this as appliance source for manual entries (no filter)
                // categories is used specifically for Issue matching later

                // Flatten issues for searching
                const flattenedIssues = categoriesData.flatMap(cat =>
                    (cat.subcategories || []).flatMap(sub =>
                        (sub.issues || []).map(iss => ({
                            ...iss,
                            id: iss.id || `issue-${cat.id}-${sub.id}-${(iss.name || iss.title || '').toLowerCase().replace(/\s+/g, '-')}`,
                            categoryId: cat.id,
                            subcategoryId: sub.id
                        }))
                    )
                );
                setIssues(flattenedIssues);

                setLoadingStates(prev => ({
                    ...prev,
                    customers: false,
                    technicians: false,
                    brands: false,
                    websiteSettings: false
                }));

                // Auto-match names to IDs for booking requests
                if (existingJob?.status === 'booking_request') {
                    // Parse the booking notes JSON for richer matching data
                    let bookingNotes = {};
                    try {
                        bookingNotes = typeof existingJob.notes === 'string'
                            ? JSON.parse(existingJob.notes)
                            : (existingJob.notes || {});
                    } catch (e) { /* notes may not be JSON */ }

                    // Show visitor's booking address as a hint
                    const visitorAddr = bookingNotes.customer?.address;
                    if (visitorAddr) {
                        const addrStr = [visitorAddr.line1, visitorAddr.locality, visitorAddr.city, visitorAddr.pincode]
                            .filter(Boolean).join(', ');
                        if (addrStr) setBookingAddressHint(addrStr);
                    }

                    setFormData(prev => {
                        const updates = {};

                        // Match customer - prioritizing account/ledger ID (number or string)
                        const targetCustId = existingJob.account_id || existingJob.customer_id;
                        if (targetCustId && !prev.customer) {
                            const match = customersOnly.find(c =>
                                String(c.id) === String(targetCustId) ||
                                (c.ledger_id && String(c.ledger_id) === String(targetCustId))
                            );
                            if (match) updates.customer = match;
                        }

                        // Match appliance (category in website settings)
                        const rawAppliance = existingJob.appliance || existingJob.category || bookingNotes.categoryName || '';
                        const applianceToMatch = (typeof rawAppliance === 'string' ? rawAppliance : rawAppliance?.name || '').toLowerCase().trim();
                        let matchedCategory = null;
                        if (applianceToMatch && !prev.product?.id) {
                            matchedCategory = categoriesData.find(c => {
                                const cName = (c.name || '').toLowerCase().trim();
                                return cName === applianceToMatch || cName.includes(applianceToMatch) || applianceToMatch.includes(cName);
                            });
                            if (matchedCategory) {
                                updates.product = matchedCategory;
                                setErrors(errs => { const e = { ...errs }; delete e.product; return e; });
                            }
                        }

                        // Match Appliance Type (subcategory) using notes.subcategoryName / existingJob.subcategory
                        const rawSubcat = existingJob.subcategory || bookingNotes.subcategoryName || '';
                        const subcatToMatch = (typeof rawSubcat === 'string' ? rawSubcat : rawSubcat?.name || '').toLowerCase().trim();
                        if (subcatToMatch && !prev.subcategory?.id) {
                            // Look inside the matched category's subcategories first, then all categories
                            const searchIn = matchedCategory
                                ? (matchedCategory.subcategories || [])
                                : categoriesData.flatMap(c => c.subcategories || []);
                            const subcatMatch = searchIn.find(s => {
                                const sName = (s.name || '').toLowerCase().trim();
                                return sName === subcatToMatch || sName.includes(subcatToMatch) || subcatToMatch.includes(sName);
                            });
                            if (subcatMatch) {
                                updates.subcategory = subcatMatch;
                            }
                        }

                        // Match Brand from Booking Brands (active only)
                        // Try: existingJob.brand (name string) then notes.brandName
                        const rawBrand = existingJob.brand;
                        const brandStr = (typeof rawBrand === 'string' ? rawBrand
                            : (rawBrand?.name || rawBrand?.title || bookingNotes.brandName || '')).toLowerCase().trim();

                        if (brandStr && !prev.brand?.id) {
                            const activeBrands = (data.brands || []).filter(b => b.is_active !== false);
                            const match = activeBrands.find(b => {
                                const bName = (b.name || '').toLowerCase().trim();
                                return bName === brandStr || bName.includes(brandStr) || brandStr.includes(bName);
                            });
                            if (match) updates.brand = match;
                        }

                        // Match Issue from Website Settings
                        const rawIssue = (existingJob.issue || bookingNotes.issueName || '').toLowerCase().trim();
                        if (rawIssue && !prev.issue?.id) {
                            const match = flattenedIssues.find(i =>
                                (i.name || '').toLowerCase().trim() === rawIssue ||
                                (i.title || '').toLowerCase().trim() === rawIssue ||
                                rawIssue.includes((i.name || '').toLowerCase().trim())
                            );
                            if (match) {
                                updates.issue = match;
                                // If appliance not yet matched, pick it from the issue's categoryId
                                if (match.categoryId && !updates.product) {
                                    const catMatch = categoriesData.find(c => c.id === match.categoryId);
                                    if (catMatch) {
                                        updates.product = catMatch;
                                        setErrors(errs => { const e = { ...errs }; delete e.product; return e; });
                                    }
                                }
                                setErrors(errs => { const e = { ...errs }; delete e.issue; return e; });
                            }
                        }

                        if (Object.keys(updates).length > 0) {
                            return {
                                ...prev,
                                ...updates,
                                jobName: prev.jobName || updates.issue?.name || existingJob.issue || existingJob.description || ''
                            };
                        }
                        return prev;
                    });
                }
                setLoadingStates(prev => ({
                    ...prev,
                    customers: false,
                    technicians: false,
                    brands: false,
                    websiteSettings: false
                }));
            } catch (err) {
                console.error('Error in fetchMasterData:', err);
            } finally {
                setLoadingStates(prev => ({
                    ...prev,
                    customers: false,
                    technicians: false,
                    brands: false,
                    websiteSettings: false
                }));
            }
        };

        fetchMasterData();
    }, [existingJob]);

    // Unified Property Fetching - Watch customer changes
    useEffect(() => {
        const loadProperties = async () => {
            const customer = formData.customer;
            if (!customer) {
                setProperties([]);
                return;
            }

            setLoadingStates(prev => ({ ...prev, properties: true }));
            try {
                // RESOLVE UUID if needed: The properties table uses UUIDs as customer_id.
                // Accounts/Ledger entries use integers.
                let resolvedCustomerId = customer.id;
                try {
                    const customerRecords = await customersAPI.getAll({ ledger_id: customer.id });
                    if (customerRecords && customerRecords.length > 0) {
                        resolvedCustomerId = customerRecords[0].id;
                        console.log('Resolved Ledger ID', customer.id, 'to Customer UUID for properties:', resolvedCustomerId);
                    }
                } catch (err) {
                    console.warn('Failed to resolve customer UUID for properties:', err.message);
                }

                // Combine Legacy DB properties and Ledger-based properties
                let dbProps = [];
                try {
                    dbProps = await propertiesAPI.getAll(resolvedCustomerId) || [];
                } catch (e) {
                    console.warn('Properties fetch failed:', e.message);
                }

                const ledgerProps = (customer.properties || [])
                    .map((p, index) => ({
                        id: p.id || `ledger-${customer.id}-${index}`, // STABLE ID
                        property_name: p.name || p.label || 'Home',
                        address: p.address,
                        contactPerson: p.contactPerson || '',
                        contactPhone: p.contactPhone || '',
                        _source: 'ledger'
                    }));

                const allProps = [...dbProps, ...ledgerProps];
                setProperties(allProps);
                console.log('Available properties for customer:', allProps.length, allProps.map(p => p.property_name));

                // Auto-match property for booking requests or existing jobs
                if (allProps.length > 0 && !formData.property?.id) {
                    const bookingAddrNormalized = normalizeAddress(existingJob?.property?.address || existingJob?.address);
                    console.log('Attempting property match for normalized address:', bookingAddrNormalized);

                    let match = allProps.find(p =>
                        (existingJob?.property?.id && String(p.id) === String(existingJob.property.id)) ||
                        (bookingAddrNormalized && normalizeAddress(p.address) === bookingAddrNormalized)
                    );

                    // Fallback: If only one property exists, auto-select it
                    if (!match && allProps.length === 1) {
                        console.log('Auto-selecting single available property:', allProps[0].property_name);
                        match = allProps[0];
                    }

                    if (match) {
                        console.log('Setting matched property:', match.property_name);
                        setFormData(prev => ({ ...prev, property: match }));
                        setErrors(prev => {
                            const newErr = { ...prev };
                            delete newErr.property;
                            return newErr;
                        });
                    }
                }
            } finally {
                setLoadingStates(prev => ({ ...prev, properties: false }));
            }
        };

        loadProperties();
    }, [formData.customer?.id, existingJob]);

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

    const handleCustomerChange = (customerId) => {
        const customer = customers.find(c => String(c.id) === String(customerId));
        setFormData(prev => ({
            ...prev,
            customer,
            property: null, // Reset property when customer changes
        }));
    };

    const handlePropertyChange = (propertyId) => {
        const selected = properties.find(p => String(p.id) === String(propertyId));
        console.log('Manual property selection:', propertyId, 'Found:', selected?.property_name);
        setFormData(prev => ({ ...prev, property: selected }));
        if (errors.property) {
            const newErrors = { ...errors };
            delete newErrors.property;
            setErrors(newErrors);
        }
    };

    const handleProductChange = (productId) => {
        const selected = allProducts.find(p => String(p.id) === String(productId));
        // Reset subcategory and issue when appliance changes
        setFormData(prev => ({ ...prev, product: selected, subcategory: null, issue: null }));
        setErrors(errs => {
            const e = { ...errs };
            delete e.product;
            delete e.issue;
            return e;
        });
    };

    const handleSubcategoryChange = (subcategoryId) => {
        // Find subcategory within the selected appliance
        const subcats = formData.product?.subcategories || [];
        const selected = subcats.find(s => String(s.id) === String(subcategoryId));
        setFormData(prev => ({ ...prev, subcategory: selected || null, issue: null }));
    };

    const handleBrandChange = (brandId) => {
        const selected = brands.find(b => String(b.id) === String(brandId) || b.name === brandId);
        setFormData(prev => ({ ...prev, brand: selected }));
        if (errors.brand) {
            const newErrors = { ...errors };
            delete newErrors.brand;
            setErrors(newErrors);
        }
    };

    const handleIssueChange = (issueId) => {
        const selected = issues.find(i => String(i.id) === String(issueId));
        setFormData(prev => ({ ...prev, issue: selected }));
        if (errors.issue) {
            const newErrors = { ...errors };
            delete newErrors.issue;
            setErrors(newErrors);
        }
        // Auto-populate job name if empty
        if (!formData.jobName && selected) {
            setFormData(prev => ({ ...prev, jobName: selected.title || selected.name }));
        }
    };

    const handleTechnicianChange = (techId) => {
        const tech = technicians.find(t => String(t.id) === String(techId));
        setFormData(prev => ({
            ...prev,
            assignedTo: tech?.id || '',
            assignedToName: tech?.name || ''
        }));
    };

    const toggleTag = (tag) => {
        const newTags = formData.tags.includes(tag)
            ? formData.tags.filter(t => t !== tag)
            : [...formData.tags, tag];
        setFormData(prev => ({ ...prev, tags: newTags }));
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

            // Refresh customers list (from the accounts table, same logic as fetchMasterData)
            const allAccounts = await accountsAPI.getAll();
            const customersOnly = allAccounts.filter(a =>
                a.type === 'customer' ||
                a.under?.toLowerCase().includes('customer') ||
                a.under?.toLowerCase().includes('debtor') ||
                (a.under_name || '').toLowerCase().includes('customer') ||
                (a.under_name || '').toLowerCase().includes('debtor')
            );
            setCustomers(customersOnly);

            // Find the updated/new account record
            const updatedAccount = customersOnly.find(c => String(c.id) === String(result.id));

            if (updatedAccount) {
                console.log('Syncing new account to form state:', updatedAccount.id);
                setFormData(prev => ({ ...prev, customer: updatedAccount }));
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
            setProperties(prev => [...prev, newProperty]);
            setFormData(prev => ({ ...prev, property: newProperty }));
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
            // RESOLVE CUSTOMER UUID: The jobs table requires a UUID from the customers table.
            // Since we are using Accounts as the UI source, we find the corresponding customer record.
            let resolvedCustomerId = formData.customer.id; // Fallback to current ID

            try {
                const customerRecords = await customersAPI.getAll({ ledger_id: formData.customer.id });
                if (customerRecords && customerRecords.length > 0) {
                    resolvedCustomerId = customerRecords[0].id;
                    console.log('Resolved Ledger ID', formData.customer.id, 'to Customer UUID', resolvedCustomerId);
                } else {
                    // MISSING CUSTOMER RECORD: If we have the ledger but no customer record, create it now.
                    // This is the safety net for accounts that weren't synced (e.g., Sundry Debtors).
                    console.log('No customer record found for ledger ID', formData.customer.id, '. Creating on-the-fly...');
                    const newCustomer = await customersAPI.create({
                        name: formData.customer.name,
                        phone: formData.customer.phone || formData.customer.mobile || '',
                        email: formData.customer.email || '',
                        address: formData.customer.billing_address || formData.customer.mailing_address || {},
                        ledger_id: formData.customer.id
                    });
                    if (newCustomer && newCustomer.id) {
                        resolvedCustomerId = newCustomer.id;
                        console.log('Successfully created on-the-fly customer record:', resolvedCustomerId);
                    }
                }
            } catch (err) {
                console.error('Failed to resolve or create customer UUID:', err.message);
                // If it's already a UUID, it might just work, but if it's an integer and we failed to create a customer,
                // the subsequent job create will likely fail with the FKEY error.
            }

            // Map to Supabase Schema (snake_case)
            const jobData = {
                // Generated fields
                job_number: existingJob?.job_number || `JOB-${Date.now().toString().slice(-6)}`,

                // References
                customer_id: resolvedCustomerId,
                customer_name: formData.customer.name,
                technician_id: formData.assignedTo || null,
                technician_name: formData.assignedToName || null,

                // Details
                description: formData.jobName,
                status: existingJob?.status === 'booking_request' ? 'pending' : (existingJob?.status || 'pending'),
                priority: 'normal',

                category: formData.product?.name || 'General',
                appliance: formData.product?.name,
                subcategory: formData.subcategory?.name || null,
                brand: formData.brand?.name,
                issue: formData.issue?.name,

                // Dates
                scheduled_date: formData.dueDate || null,

                // Extra fields
                amount: 0,
                property: formData.property,
                notes: formData.warranty ? `Warranty Claim: ${formData.warrantyProof}` : (existingJob?.notes || ''),
            };

            // If technician is assigned, set status to assigned
            if (jobData.technician_id && jobData.status === 'pending') {
                jobData.status = 'assigned';
            }

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
                                        {customer.name} {customer.phone || customer.mobile ? `- ${customer.phone || customer.mobile}` : ''}
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
                        {/* Show visitor's booking address as a hint when property not yet matched */}
                        {!formData.property && bookingAddressHint && (
                            <div style={{
                                marginTop: 'var(--spacing-xs)',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-warning, #f59e0b)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                📍 Visitor’s address: {bookingAddressHint}
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
                                    <option value="">{loadingStates.websiteSettings ? 'Loading appliances...' : 'Select appliance...'}</option>
                                    {allProducts.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.isOperational ? `📦 ${cat.name}` : cat.name}
                                        </option>
                                    ))}
                                </select>
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

                    {/* 5. Appliance Type (subcategory) — shown when appliance has subcategories */}
                    {formData.product && (formData.product.subcategories || []).length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Appliance Type</label>
                            <select
                                className="form-select"
                                value={formData.subcategory?.id || ''}
                                onChange={(e) => handleSubcategoryChange(e.target.value)}
                            >
                                <option value="">Select type...</option>
                                {(formData.product.subcategories || []).map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

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
                                <option value="">{loadingStates.websiteSettings ? 'Loading issues...' : (formData.product ? 'Select issue...' : 'Select appliance first')}</option>
                                {issues.filter(i => !formData.product || i.categoryId === formData.product.id).map(issue => (
                                    <option key={issue.id} value={issue.id}>
                                        {issue.name}
                                    </option>
                                ))}
                            </select>
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
                </div >

                {/* Footer - Fixed */}
                < div className="modal-footer" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-md)' }
                }>
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
                </div >
            </div >
        </div >
    );
}

export default CreateJobForm;
