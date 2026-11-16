'use client'

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2, Home, MapPin } from 'lucide-react';
import AccountSelector from '@/app/admin/components/common/AccountSelector';
import ProductSelector from '@/app/admin/components/common/ProductSelector';
import NewAccountForm from './NewAccountForm';
import PropertyForm from './PropertyForm';
import JobSelector from './JobSelector';
import RepairCalculator from '@/components/common/RepairCalculator';
import { accountsAPI, inventoryAPI, productLinksAPI, printSettingsAPI, propertiesAPI } from '@/lib/adminAPI';
import SystemNumberField, { useVoucherPreview } from '@/app/admin/components/common/SystemNumberField';

function SalesInvoiceForm({ onClose, onSave, existingInvoice, defaultAccount, prefillItems, saving = false }) {
    const buildInitialItems = () => {
        if (existingInvoice?.items) return existingInvoice.items.filter(i => !i.isCharge).map(i => ({ ...i, unit: i.unit || 'Nos' }));
        if (prefillItems?.length) {
            return prefillItems
                .filter(it => !it.isCharge && it.description)
                .map((it, idx) => ({
                    id: idx + 1,
                    productId: it.productId || '',
                    description: it.description,
                    hsn: it.hsn || '',
                    qty: it.qty || 1,
                    rate: it.rate || 0,
                    discount: it.discount || 0,
                    taxRate: it.taxRate || 18,
                    unit: it.unit || 'Nos',
                    total: (it.qty || 1) * (it.rate || 0)
                }));
        }
        return [{ id: 1, productId: '', description: '', hsn: '', qty: 1, rate: 0, discount: 0, taxRate: 18, unit: 'Nos', total: 0 }];
    };

    const buildInitialCharges = () => {
        if (existingInvoice?.items) {
            return existingInvoice.items.filter(i => i.isCharge).map(i => ({
                id: i.id, serviceId: i.productId, name: i.description, amount: i.rate, taxRate: i.taxRate, terms_conditions: i.terms_conditions || []
            }));
        }
        if (prefillItems?.length) {
            return prefillItems
                .filter(it => it.isCharge && it.description)
                .map((it, idx) => ({
                    id: Date.now() + idx,
                    serviceId: it.productId || null,
                    name: it.description,
                    amount: it.rate || 0,
                    taxRate: it.taxRate || 18,
                    terms_conditions: it.terms_conditions || []
                }));
        }
        return [];
    };

    const [formData, setFormData] = useState({
        account_id: existingInvoice?.account_id || defaultAccount?.id || null,
        account_name: existingInvoice?.account_name || defaultAccount?.name || '',
        account_phone: existingInvoice?.account_phone || defaultAccount?.phone || defaultAccount?.mobile || '',
        account_mobile: existingInvoice?.account_mobile || defaultAccount?.mobile || defaultAccount?.phone || '',
        account_email: existingInvoice?.account_email || defaultAccount?.email || '',
        account_gstin: existingInvoice?.account_gstin || defaultAccount?.gstin || '',
        account_state: existingInvoice?.account_state || defaultAccount?.address?.state || defaultAccount?.state || 'Maharashtra',
        account_address: existingInvoice?.account_address || '',
        accountGSTIN: existingInvoice?.accountGSTIN || defaultAccount?.gstin || '',
        accountState: existingInvoice?.accountState || defaultAccount?.state || 'Maharashtra',
        property_id: existingInvoice?.property_id || existingInvoice?.property?.id || null,
        property: existingInvoice?.property || null,
        billing_address: existingInvoice?.billing_address || '',
        shipping_address: existingInvoice?.shipping_address || '',
        invoice_number: existingInvoice?.invoice_number || '',
        date: existingInvoice?.date || new Date().toISOString().split('T')[0],
        items: buildInitialItems(),
        notes: existingInvoice?.notes || '',
        terms: existingInvoice?.terms || 'Payment due within 30 days.\nLate payments subject to 2% monthly interest.',
        technician_id: existingInvoice?.technician_id || defaultAccount?.technician_id || null,
        technician_name: existingInvoice?.technician_name || defaultAccount?.technician_name || '',
        showTax: existingInvoice?.showTax !== undefined ? existingInvoice.showTax : false,
        job_id: existingInvoice?.job_id || defaultAccount?.job_id || null
    });

    const [properties, setProperties] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(false);
    const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
    const [customAddressMode, setCustomAddressMode] = useState(false);
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [charges, setCharges] = useState(buildInitialCharges);
    const [services, setServices] = useState([]);
    const [productLinks, setProductLinks] = useState([]);

    const [technicians, setTechnicians] = useState([]);
    const previewInvoiceNumber = useVoucherPreview('sales', existingInvoice?.invoice_number);

    // Fetch services, product-links, and technicians
    useEffect(() => {
        Promise.all([
            inventoryAPI.getAll(),
            productLinksAPI.getAll().catch(() => []),
            printSettingsAPI.get().catch(() => null),
            fetch('/api/admin/technicians').then(r => r.json()).catch(() => ({ data: [] }))
        ]).then(([data, links, printData, techData]) => {
            const svcList = (data || []).filter(p => p.type === 'service' || p.product_type === 'service');
            setServices(svcList);
            setProductLinks(links || []);
            setTechnicians(techData?.data || []);
            if (printData && existingInvoice?.showTax === undefined) {
                setFormData(prev => ({ ...prev, showTax: printData.invoice_show_gst ?? printData.show_gst ?? true }));
            }
        }).catch(() => {});
    }, [existingInvoice]);

    const companyState = 'Maharashtra';

    // Calculate item total
    const calculateItemTotal = (item) => {
        const subtotal = item.qty * item.rate;
        const discountAmount = item.discount || 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = formData.showTax ? (taxableAmount * (item.taxRate || 0)) / 100 : 0;
        return taxableAmount + taxAmount;
    };

    // Calculate invoice totals (items + charges)
    const calculateTotals = () => {
        const itemsSubtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const itemsTaxable = itemsSubtotal - totalDiscount;
        const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const combinedTaxable = itemsTaxable + chargesTotal;

        const isInterState = formData.accountState !== companyState;
        let cgst = 0, sgst = 0, igst = 0;

        if (formData.showTax) {
            formData.items.forEach(item => {
                const itemTaxable = (item.qty * item.rate) - (item.discount || 0);
                const taxAmount = (itemTaxable * (item.taxRate || 0)) / 100;
                if (isInterState) { igst += taxAmount; }
                else { cgst += taxAmount / 2; sgst += taxAmount / 2; }
            });
            // Also apply GST on charges (using 18% default if no rate specified)
            charges.forEach(c => {
                const amt = Number(c.amount) || 0;
                const rate = Number(c.taxRate) || 18;
                const tax = (amt * rate) / 100;
                if (isInterState) { igst += tax; }
                else { cgst += tax / 2; sgst += tax / 2; }
            });
        }

        const totalTax = cgst + sgst + igst;
        const totalAmount = combinedTaxable + totalTax;

        return {
            items_subtotal: itemsSubtotal,
            subtotal: combinedTaxable,
            discount: totalDiscount,
            charges_total: chargesTotal,
            cgst, sgst, igst,
            total_tax: totalTax,
            total_amount: Math.round(totalAmount)
        };
    };

    const totals = calculateTotals();

    // Build a formatted address string from a property object
    const buildPropertyAddress = (p) => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        const street = typeof p.address === 'string' ? p.address : (p.address?.line1 || '');
        return [
            p.flat_number,
            p.building_name,
            street,
            p.locality,
            p.city,
            p.pincode ? `- ${p.pincode}` : ''
        ].filter(Boolean).join(', ');
    };

    // Load properties for a customer account
    const loadProperties = async (accountId, preferredPropId = null, jobObj = null) => {
        if (!accountId) {
            setProperties([]);
            return;
        }
        setLoadingProperties(true);
        try {
            const res = await fetch(`/api/admin/properties?customer_id=${accountId}`);
            const json = await res.json();
            const props = (json.data || []);
            setProperties(props);

            let matched = null;
            if (preferredPropId) {
                matched = props.find(p => String(p.id) === String(preferredPropId));
            }
            if (!matched && jobObj?.property?.id) {
                matched = props.find(p => String(p.id) === String(jobObj.property.id));
            }
            if (!matched && (formData.property_id || existingInvoice?.property_id)) {
                const targetId = formData.property_id || existingInvoice?.property_id;
                matched = props.find(p => String(p.id) === String(targetId));
            }
            if (!matched && (existingInvoice?.billing_address || formData.billing_address)) {
                const targetAddr = (existingInvoice?.billing_address || formData.billing_address).toLowerCase();
                matched = props.find(p => {
                    const full = buildPropertyAddress(p).toLowerCase();
                    if (full && targetAddr.includes(full)) return true;
                    const b = (p.building_name || '').toLowerCase();
                    const f = (p.flat_number || '').toLowerCase();
                    if (b && f && targetAddr.includes(b) && targetAddr.includes(f)) return true;
                    if (b && targetAddr.includes(b)) return true;
                    return false;
                });
            }
            if (!matched && props.length > 0) {
                matched = props[0];
            }

            if (matched) {
                const addr = buildPropertyAddress(matched);
                setFormData(prev => ({
                    ...prev,
                    property_id: matched.id,
                    property: matched,
                    billing_address: prev.billing_address || addr,
                    account_address: prev.account_address || addr
                }));
            }
        } catch (e) {
            console.warn('Failed to load properties for account:', e);
        } finally {
            setLoadingProperties(false);
        }
    };

    // Load initial properties if account is already selected
    useEffect(() => {
        if (formData.account_id) {
            loadProperties(formData.account_id, formData.property_id);
        }
    }, [formData.account_id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePropertyChange = (propertyId) => {
        if (!propertyId) {
            setFormData(prev => ({
                ...prev,
                property_id: null,
                property: null,
                billing_address: '',
                account_address: ''
            }));
            return;
        }
        const selected = properties.find(p => String(p.id) === String(propertyId));
        if (selected) {
            const addr = buildPropertyAddress(selected);
            setFormData(prev => ({
                ...prev,
                property_id: selected.id,
                property: selected,
                billing_address: addr,
                account_address: addr
            }));
        }
    };

    const handlePropertySave = async (propertyData) => {
        try {
            const newProperty = await propertiesAPI.create(propertyData);
            setProperties(prev => [...prev, newProperty]);
            const addr = buildPropertyAddress(newProperty);
            setFormData(prev => ({
                ...prev,
                property_id: newProperty.id,
                property: newProperty,
                billing_address: addr,
                account_address: addr
            }));
            setShowAddPropertyModal(false);
        } catch (err) {
            console.error('Error saving property:', err);
            alert('Failed to save property: ' + err.message);
        }
    };

    const handleJobChange = (jobId, job) => {
        if (!jobId) {
            setFormData(prev => ({ ...prev, job_id: null }));
            return;
        }
        const jobPropId = job?.property_id || job?.property?.id || null;
        let jobProp = job?.property;
        if (!jobProp && jobPropId) {
            jobProp = properties.find(p => String(p.id) === String(jobPropId));
        }
        let jobPropAddr = jobProp ? buildPropertyAddress(jobProp) : '';
        if (!jobPropAddr && job?.address) {
            jobPropAddr = [job.address, job.locality, job.city, job.pincode ? `- ${job.pincode}` : ''].filter(Boolean).join(', ');
        }
        setFormData(prev => ({
            ...prev,
            job_id: jobId,
            ...(jobPropId ? { property_id: jobPropId, property: jobProp } : {}),
            ...(jobPropAddr ? { billing_address: jobPropAddr, account_address: jobPropAddr } : {})
        }));
    };

    const handleAccountChange = async (account) => {
        if (!account) return;
        // Set known fields immediately so the UI responds instantly
        setFormData(prev => ({
            ...prev,
            account_id: account.id,
            account_name: account.name,
            account_phone: account.phone || account.mobile || '',
            account_mobile: account.mobile || account.phone || '',
            account_email: account.email || '',
            account_gstin: account.gstin || '',
            account_state: 'Maharashtra',
            account_address: '',
            accountGSTIN: account.gstin || '',
            accountState: 'Maharashtra',
            property_id: null,
            property: null,
            billing_address: '',
            shipping_address: '',
            job_id: null
        }));

        await loadProperties(account.id);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'description' || field === 'hsn' ? value : parseFloat(value) || 0;
        newItems[index].total = calculateItemTotal(newItems[index]);
        setFormData({ ...formData, items: newItems });
    };

    const handleCalculatorItems = (calcItems) => {
        const productItems = calcItems.filter(it => it.type !== 'service').map((it, idx) => ({
            id: Date.now() + idx,
            productId: it.productId || '',
            description: it.description,
            hsn: it.hsn || '',
            qty: it.qty || 1,
            rate: it.rate || 0,
            discount: it.discount || 0,
            taxRate: it.taxRate || 18,
            terms_conditions: it.terms_conditions || [],
            unit: it.unit || 'Nos',
            total: (it.qty || 1) * (it.rate || 0)
        }));

        const serviceItems = calcItems.filter(it => it.type === 'service').map((it, idx) => ({
            id: Date.now() + 1000 + idx,
            serviceId: it.productId || '',
            name: it.description,
            amount: (it.qty || 1) * (it.rate || 0),
            taxRate: it.taxRate || 18,
            terms_conditions: it.terms_conditions || []
        }));
        
        setFormData(prev => ({
            ...prev,
            items: prev.items.length === 1 && !prev.items[0].description && productItems.length > 0 ? productItems : [...prev.items, ...productItems]
        }));

        if (serviceItems.length > 0) {
            setCharges(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.length === 1 && !current[0].name && serviceItems.length > 0 ? serviceItems : [...current, ...serviceItems];
            });
        }
        setShowCalculator(false);
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                id: Date.now(),
                description: '',
                hsn: '',
                qty: 1,
                rate: 0,
                discount: 0,
                taxRate: 18,
                unit: 'Nos',
                total: 0
            }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleSave = (action) => {
        // Validate
        if (!formData.account_id) {
            alert('Please select an account');
            return;
        }
        if (formData.items.some(item => !item.description || item.qty <= 0 || item.rate < 0)) {
            alert('Please fill all item details correctly');
            return;
        }

        const combinedItems = [
            ...formData.items.map(item => ({ ...item, isCharge: false })),
            ...charges.map(c => ({
                id: c.id,
                isCharge: true,
                productId: c.serviceId || '',
                description: c.name,
                qty: 1,
                rate: c.amount,
                discount: 0,
                taxRate: c.taxRate,
                terms_conditions: c.terms_conditions || [],
                total: formData.showTax ? c.amount * (1 + (c.taxRate || 0) / 100) : c.amount
            }))
        ];

        const invoiceData = {
            ...formData,
            items: combinedItems,
            ...totals,
            __formType: 'sales',
            auto_number: !existingInvoice?.id,
            status: action === 'draft' ? 'draft' : (existingInvoice?.status && existingInvoice.status !== 'finalized' ? existingInvoice.status : 'unpaid')
        };
        if (!existingInvoice?.id) {
            delete invoiceData.invoice_number;
        }

        // Remove UI-only fields before saving
        delete invoiceData.accountGSTIN;
        delete invoiceData.accountState;
        delete invoiceData.property;
        delete invoiceData.property_id;

        onSave(invoiceData, action);
    };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            style={{
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
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: '#10b981' }}>
                            {existingInvoice?.id ? 'Edit Sales Invoice' : 'Create Sales Invoice'}
                        </h3>
                        {existingInvoice?.id && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                                Invoice: {existingInvoice.invoice_number}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 'var(--spacing-xs)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
                    {/* Account & Invoice Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div>
                            <AccountSelector
                                value={formData.account_id}
                                onChange={handleAccountChange}
                                onCreateNew={() => setShowNewAccountForm(true)}
                                accountType="sales"
                                label="Account"
                                initialAccountName={formData.account_name}
                            />
                        </div>
                        <div>
                            <JobSelector
                                value={formData.job_id}
                                onChange={(jobId, job) => handleJobChange(jobId, job)}
                                accountId={formData.account_id}
                                label="Link to Job (optional)"
                            />
                        </div>

                        {/* Property Selection - Appears once an Account is selected */}
                        {formData.account_id && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                                        <Home size={14} style={{ color: '#10b981' }} />
                                        Property / Service Address *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPropertyModal(true)}
                                        className="btn btn-secondary"
                                        style={{
                                            padding: '2px 8px',
                                            fontSize: 11,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            height: 'auto',
                                            color: '#60a5fa',
                                            borderColor: 'rgba(96,165,250,0.3)'
                                        }}
                                    >
                                        <Plus size={12} /> Add Property
                                    </button>
                                </div>
                                <select
                                    className="form-input"
                                    value={formData.property_id ? String(formData.property_id) : ''}
                                    onChange={(e) => handlePropertyChange(e.target.value)}
                                    disabled={loadingProperties}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">
                                        {loadingProperties ? 'Loading properties...' : (properties.length === 0 ? '— No properties registered for this customer —' : '— Select Property —')}
                                    </option>
                                    {properties.map(p => {
                                        const prefix = [p.flat_number, p.building_name].filter(Boolean).join(', ');
                                        const street = typeof p.address === 'string' ? p.address : (p.address?.line1 || '');
                                        const mainAddr = [prefix, street, p.locality, p.city].filter(Boolean).join(', ');
                                        const nameTag = p.name || p.property_name || p.property_type || '';
                                        const label = `${nameTag ? `[${nameTag}] ` : ''}${mainAddr || 'Property #' + String(p.id).slice(0, 6)}${p.pincode ? ` - ${p.pincode}` : ''}`;
                                        return (
                                            <option key={p.id} value={String(p.id)}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>

                                {/* Address preview & edit */}
                                {formData.billing_address ? (
                                    <div style={{
                                        marginTop: 6,
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1, lineHeight: 1.4 }}>
                                                <MapPin size={13} style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                                                <div>
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>Billing Address on Bill: </span>
                                                    <span style={{ color: 'var(--text-primary)' }}>{formData.billing_address}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCustomAddressMode(prev => !prev)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#60a5fa',
                                                    fontSize: 11,
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {customAddressMode ? 'Done' : 'Edit'}
                                            </button>
                                        </div>
                                        {customAddressMode && (
                                            <div style={{ marginTop: 8 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.billing_address}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value, account_address: e.target.value }))}
                                                    placeholder="Enter custom billing address..."
                                                    style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (properties.length === 0 && !loadingProperties) ? (
                                    <div style={{
                                        marginTop: 6,
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'rgba(234, 179, 8, 0.08)',
                                        border: '1px solid rgba(234, 179, 8, 0.25)',
                                        fontSize: '12px',
                                        color: '#facc15',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 6
                                    }}>
                                        <span>⚠️ No properties registered for this customer yet.</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddPropertyModal(true)}
                                            style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            + Add Property
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                        <div>
                            <SystemNumberField
                                label="Invoice Number"
                                value={previewInvoiceNumber}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Invoice Date *
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Assigned Technician
                            </label>
                            <select
                                className="form-input"
                                value={formData.technician_id || ''}
                                onChange={(e) => {
                                    const techId = e.target.value;
                                    const tech = technicians.find(t => t.id === techId);
                                    setFormData(prev => ({
                                        ...prev,
                                        technician_id: techId || null,
                                        technician_name: tech ? tech.name : ''
                                    }));
                                }}
                                style={{ width: '100%' }}
                            >
                                <option value="">— Unassigned / Select Technician —</option>
                                {technicians.filter(tech => tech.is_active !== false || tech.id === formData.technician_id).map(tech => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div style={{
                        marginBottom: 'var(--spacing-lg)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'visible'
                    }}>
                        <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Items</h4>
                        </div>
                        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '5%' }}>#</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '30%' }}>Description *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'left', width: '10%' }}>HSN</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Qty *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '12%' }}>Rate *</th>
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '10%' }}>Disc.</th>
                                        {formData.showTax && (
                                            <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', width: '10%' }}>Tax %</th>
                                        )}
                                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'right', width: '13%' }}>Total</th>
                                        <th style={{ padding: 'var(--spacing-xs)', width: '5%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, index) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>{index + 1}</td>
                                            <td style={{ padding: 'var(--spacing-xs)', position: 'relative', overflow: 'visible' }} colSpan="2">
                                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                    <ProductSelector
                                                        value={item.productId}
                                                        onChange={(productId) => handleItemChange(index, 'productId', productId)}
                                                        label="Select Product"
                                                        onProductSelect={(productDetails) => {
                                                            const newItems = [...formData.items];
                                                            newItems[index] = {
                                                                ...newItems[index],
                                                                productId: productDetails.productId,
                                                                description: productDetails.description,
                                                                hsn: productDetails.hsn,
                                                                rate: productDetails.rate,
                                                                taxRate: productDetails.taxRate,
                                                                unit: productDetails.unit || 'Nos',
                                                                type: productDetails.type || '',
                                                                terms_conditions: productDetails.terms_conditions || []
                                                            };
                                                            newItems[index].total = calculateItemTotal(newItems[index]);
                                                            setFormData({ ...formData, items: newItems });
                                                            // Auto-add linked service charge
                                                            const link = productLinks.find(l => l.product?.id === productDetails.productId && l.auto_add);
                                                            if (link?.service) {
                                                                const alreadyAdded = charges.some(c => c.serviceId === link.service.id);
                                                                if (!alreadyAdded) {
                                                                    setCharges(prev => [...prev, {
                                                                        id: Date.now(),
                                                                        serviceId: link.service.id,
                                                                        name: link.service.name,
                                                                        amount: link.service.sale_price || 0,
                                                                        taxRate: link.service.gst_rate || 18
                                                                    }]);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Or enter custom description"
                                                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--spacing-xs)' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    min="0"
                                                    step="1"
                                                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--spacing-xs)' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: 'var(--spacing-xs)' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.discount}
                                                    onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)', textAlign: 'right' }}
                                                />
                                            </td>
                                            {formData.showTax && (
                                                <td style={{ padding: 'var(--spacing-xs)' }}>
                                                    <select
                                                        className="form-input"
                                                        value={item.taxRate}
                                                        onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                                                        style={{ width: '100%', padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </td>
                                            )}
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'right', fontWeight: 600 }}>
                                                ₹{(item.total || 0).toFixed(2)}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#ef4444',
                                                            padding: '4px'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-secondary" onClick={addItem} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', minHeight: '30px' }}>
                                <Plus size={14} style={{ marginRight: '4px' }} />
                                Add Custom Row
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setShowCalculator(true)} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', minHeight: '30px' }}>
                                Add Items from Catalog
                            </button>
                        </div>
                    </div>

                    {/* Charges / Services Section */}
                    <div style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>Additional Charges / Services</h4>
                            <button
                                type="button"
                                onClick={() => setCharges(prev => [...prev, { id: Date.now(), name: '', amount: 0, taxRate: 18 }])}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#6366f115', color: '#6366f1', border: '1px solid #6366f130', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                                <Plus size={13} /> Add Charge
                            </button>
                        </div>
                        {charges.length === 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center', padding: '8px 0' }}>No charges added. Click "Add Charge" for Visiting Charges, Service Charges, etc.</p>
                        )}
                        {charges.map((charge, idx) => (
                            <div key={charge.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                <select
                                    className="form-input"
                                    value={charge.serviceId || ''}
                                    onChange={e => {
                                        const svc = services.find(s => String(s.id) === e.target.value);
                                        if (svc) {
                                            setCharges(prev => prev.map((c, i) => i === idx ? {
                                                ...c,
                                                serviceId: svc.id,
                                                name: svc.name,
                                                taxRate: svc.gst_rate || svc.tax_rate || 18,
                                                terms_conditions: svc.terms_conditions || []
                                            } : c));
                                        }
                                    }}
                                    style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
                                >
                                    <option value="">— Select Service —</option>
                                    {services.map(svc => (
                                        <option key={svc.id} value={String(svc.id)}>{svc.name}</option>
                                    ))}
                                </select>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="Amount"
                                    value={charge.amount || ''}
                                    onChange={e => setCharges(prev => prev.map((c, i) => i === idx ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))}
                                    style={{ width: '120px', fontSize: '13px', padding: '6px 10px', textAlign: 'right' }}
                                />
                                <button onClick={() => setCharges(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Totals Section */}
                    <div style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Totals</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Items Subtotal:</span>
                                <span style={{ fontWeight: 600 }}>₹{(totals.items_subtotal || 0).toFixed(2)}</span>
                            </div>
                            {totals.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                    <span>Discount:</span>
                                    <span style={{ fontWeight: 600 }}>-₹{totals.discount.toFixed(2)}</span>
                                </div>
                            )}
                            {charges.length > 0 && (
                                <>
                                    {charges.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                            <span>{c.name || 'Charge'}:</span>
                                            <span style={{ fontWeight: 600 }}>₹{(Number(c.amount) || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-primary)', paddingTop: '6px', marginTop: '2px' }}>
                                        <span style={{ fontWeight: 600 }}>Subtotal (incl. charges):</span>
                                        <span style={{ fontWeight: 700 }}>₹{(totals.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {formData.showTax && (
                                <>
                                    {totals.cgst > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                                <span>CGST:</span>
                                                <span style={{ fontWeight: 600 }}>₹{totals.cgst.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                                <span>SGST:</span>
                                                <span style={{ fontWeight: 600 }}>₹{totals.sgst.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    {totals.igst > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                            <span>IGST:</span>
                                            <span style={{ fontWeight: 600 }}>₹{totals.igst.toFixed(2)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 'var(--spacing-sm)',
                                borderTop: '2px solid #10b981',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                color: '#10b981'
                            }}>
                                <span>Grand Total:</span>
                                <span>₹{totals.total_amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Notes
                        </label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="2"
                            placeholder="Additional notes for this invoice..."
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px' }}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSave('print')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#10b981' }}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : (existingInvoice?.id ? 'Update & Print' : 'Save & Print')}
                    </button>
                </div>
            </div>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden' }}>
                        <NewAccountForm
                            onClose={() => setShowNewAccountForm(false)}
                            onSave={async (acc) => {
                                handleAccountChange(acc);
                                setShowNewAccountForm(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {showCalculator && (
                <RepairCalculator
                    job={{}} // Dummy job, won't need job integration since it's just a selector
                    onClose={() => setShowCalculator(false)}
                    onApply={handleCalculatorItems}
                />
            )}

            {showAddPropertyModal && (
                <PropertyForm
                    customerId={formData.account_id}
                    onSave={handlePropertySave}
                    onClose={() => setShowAddPropertyModal(false)}
                />
            )}
        </div>
    );
}

export default SalesInvoiceForm;

