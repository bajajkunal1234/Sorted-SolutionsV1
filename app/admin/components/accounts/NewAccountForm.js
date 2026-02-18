'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Upload, Trash2, AlertCircle } from 'lucide-react';
import { coaFieldMappings, sampleLedgers } from '@/lib/data/accountingData';
import { acquisitionSources } from '@/lib/data/interactionTypes';
import GroupCreationModal from './GroupCreationModal';
import { accountGroupsAPI } from '@/lib/adminAPI';
import ConfirmDialog from '@/app/admin/components/common/ConfirmDialog';
import {
    generateSKU,
    checkDuplicateName,
    getRequiredFields,
    validateAccountData,
    generateInitialsAvatar,
    getGroupPath
} from '@/lib/utils/accountHelpers';
import { validateMobileNumber, validateEmail, validateGSTIN, validatePAN, validateIFSC } from '@/lib/utils/validation';

function NewAccountForm({ onClose, onSave, preselectedType = null, groups = [], onGroupCreated }) {
    // Common fields
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        alias: '',
        under: preselectedType || '',
        openingBalance: 0,
        balanceType: 'dr',
        asOnDate: new Date().toISOString().split('T')[0],

        // Dynamic fields will be added based on 'under' selection
        accountImage: null,
        contactPerson: '',
        mobile: '',
        email: '',
        mailingName: '',

        // GST Registration (Optional for all account types)
        gstRegistration: false,
        gstin: '',
        pan: '',
        stateName: '',
        country: 'India',

        // Multiple Address Types (Tally-style)
        mailingAddress: '',
        billingAddress: '',
        shippingAddress: '',

        // Credit fields
        creditLimit: 0,
        creditPeriod: 0,
        priceLevel: 'default',

        // Bank fields
        accountNumber: '',
        bankName: '',
        branch: '',
        ifscCode: '',
        micrCode: '',
        accountType: 'savings',
        enableChequePrinting: false,

        // Tax fields
        taxType: '',
        taxRate: 0,
        roundingMethod: 'normal',

        // Expense/Income fields with GST
        gstApplicable: false,
        costCenterAllocation: false,
        inventoryAffected: false,

        // Fixed Asset fields
        assetCategory: '',
        purchaseDate: '',
        purchaseValue: 0,
        depreciationMethod: 'slm',
        depreciationRate: 0,
        usefulLife: 0,

        // Currency
        currency: 'INR',

        // Acquisition Source (How did you hear about us?)
        acquisitionSource: '',
        referredBy: ''
    });

    const [errors, setErrors] = useState({});
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [showGroupForm, setShowGroupForm] = useState(false);


    // Customer Properties (for Sundry Debtors/Creditors)
    const [properties, setProperties] = useState([{ name: '', address: '' }]);

    // Form dirty state tracking
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Auto-generate SKU on mount
    useEffect(() => {
        if (!formData.sku) {
            const newSKU = generateSKU(formData.under, sampleLedgers, {
                autoGenerate: true,
                prefix: 'ACC',
                padding: 4
            });
            setFormData(prev => ({ ...prev, sku: newSKU }));
        }
    }, []);

    // Check for duplicate names
    useEffect(() => {
        if (formData.name.trim()) {
            const duplicate = checkDuplicateName(formData.name, sampleLedgers);
            setDuplicateWarning(duplicate);
        } else {
            setDuplicateWarning(null);
        }
    }, [formData.name]);

    // Track form dirty state
    useEffect(() => {
        const hasData = formData.name.trim() !== '' ||
            formData.mobile.trim() !== '' ||
            formData.email.trim() !== '' ||
            formData.contactPerson.trim() !== '' ||
            properties.some(p => p.name.trim() !== '' || p.address.trim() !== '');
        setIsFormDirty(hasData);
    }, [formData, properties]);

    // Get required fields for current account type (with inheritance)
    const requiredFields = getRequiredFields(formData.under, groups);
    const showField = (fieldName) => requiredFields.includes(fieldName);

    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, accountImage: 'Image size should be less than 2MB' }));
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData(prev => ({ ...prev, accountImage: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        setImagePreview(null);
        setFormData(prev => ({ ...prev, accountImage: null }));
    };

    // Handle close with confirmation
    const handleClose = () => {
        if (isFormDirty) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    // Property management functions
    const addProperty = () => {
        setProperties([...properties, { name: '', address: '' }]);
    };

    const deleteProperty = (index) => {
        if (properties.length > 1) {
            setProperties(properties.filter((_, i) => i !== index));
        }
    };

    const updateProperty = (index, field, value) => {
        const updated = [...properties];
        updated[index][field] = value;
        setProperties(updated);
    };

    // Mobile number validation
    const handleMobileChange = (value) => {
        setFormData({ ...formData, mobile: value });

        if (value.trim()) {
            const validation = validateMobileNumber(value);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, mobile: validation.error }));
            } else {
                setErrors(prev => {
                    const { mobile, ...rest } = prev;
                    return rest;
                });
            }
        } else {
            setErrors(prev => {
                const { mobile, ...rest } = prev;
                return rest;
            });
        }
    };

    // GSTIN validation
    const handleGSTINChange = (value) => {
        const val = value.toUpperCase();
        setFormData({ ...formData, gstin: val });
        if (val.trim()) {
            const validation = validateGSTIN(val);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, gstin: validation.error }));
            } else {
                setErrors(prev => {
                    const { gstin, ...rest } = prev;
                    return rest;
                });
            }
        } else {
            setErrors(prev => {
                const { gstin, ...rest } = prev;
                return rest;
            });
        }
    };

    // PAN validation
    const handlePANChange = (value) => {
        const val = value.toUpperCase();
        setFormData({ ...formData, pan: val });
        if (val.trim()) {
            const validation = validatePAN(val);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, pan: validation.error }));
            } else {
                setErrors(prev => {
                    const { pan, ...rest } = prev;
                    return rest;
                });
            }
        } else {
            setErrors(prev => {
                const { pan, ...rest } = prev;
                return rest;
            });
        }
    };

    // IFSC validation
    const handleIFSCChange = (value) => {
        const val = value.toUpperCase();
        setFormData({ ...formData, ifscCode: val });
        if (val.trim()) {
            const validation = validateIFSC(val);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, ifscCode: validation.error }));
            } else {
                setErrors(prev => {
                    const { ifscCode, ...rest } = prev;
                    return rest;
                });
            }
        } else {
            setErrors(prev => {
                const { ifscCode, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate (with inheritance)
        const validationErrors = validateAccountData(formData, formData.under, groups);

        // Validate mobile number
        if (formData.mobile.trim()) {
            const mobileValidation = validateMobileNumber(formData.mobile);
            if (!mobileValidation.isValid) {
                validationErrors.mobile = mobileValidation.error;
            }
        }

        if (duplicateWarning) {
            validationErrors.name = 'Account name already exists';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Map camelCase to snake_case for Supabase
        const account = {
            name: formData.name,
            sku: formData.sku,
            alias: formData.alias,
            under: formData.under,
            type: groups.find(g => g.id === formData.under)?.nature || coaFieldMappings[formData.under]?.defaultNature || 'asset',
            opening_balance: parseFloat(formData.openingBalance) || 0,
            balance_type: formData.balanceType,
            as_on_date: formData.asOnDate,
            contact_person: formData.contactPerson,
            mobile: formData.mobile,
            email: formData.email,
            mailing_name: formData.mailingName,
            mailing_address: formData.mailingAddress,
            billing_address: formData.billingAddress,
            shipping_address: formData.shippingAddress,
            gstin: formData.gstin,
            pan: formData.pan,
            state_name: formData.stateName,
            country: formData.country,
            credit_limit: parseFloat(formData.creditLimit) || 0,
            credit_period: parseInt(formData.creditPeriod) || 0,
            bank_name: formData.bankName,
            account_number: formData.accountNumber,
            ifsc_code: formData.ifscCode,
            branch: formData.branch,
            tax_rate: parseFloat(formData.taxRate) || 0,
            acquisition_source: formData.acquisitionSource,
            referred_by: formData.referredBy,
            status: 'active',
            // Fixed Asset Fields
            asset_category: formData.assetCategory,
            purchase_date: formData.purchaseDate || null,
            purchase_value: parseFloat(formData.purchaseValue) || 0,
            depreciation_method: formData.depreciationMethod,
            depreciation_rate: parseFloat(formData.depreciationRate) || 0,
            useful_life: parseFloat(formData.usefulLife) || 0,
            created_at: new Date().toISOString()
        };

        // Add properties if applicable
        if (formData.under === 'sundry-debtors' || formData.under === 'customer-accounts') {
            account.properties = properties.filter(p => p.name.trim() !== '');
        }

        console.log('Processed Account for Supabase:', account);

        if (onSave) {
            onSave(account);
        }

        onClose();
    };

    // Render initials avatar if no image
    const renderAvatar = () => {
        if (imagePreview || formData.accountImage) {
            return (
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <img
                        src={imagePreview || formData.accountImage}
                        alt="Account"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--border-primary)'
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleImageDelete}
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            );
        }

        if (formData.name) {
            const avatar = generateInitialsAvatar(formData.name);
            return (
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: avatar.backgroundColor,
                    color: avatar.textColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 700,
                    border: '2px solid var(--border-primary)'
                }}>
                    {avatar.initials}
                </div>
            );
        }

        return null;
    };

    return (
        <>
            <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
                <div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '900px', maxHeight: '90vh' }}
                >
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="modal-title">Create New Account</h2>
                        <button className="btn-icon" onClick={handleClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '70vh', overflowY: 'auto' }}>

                            {/* Common Fields Section */}
                            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                    Basic Information
                                </h3>

                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    {/* SKU */}
                                    <div className="form-group">
                                        <label className="form-label">SKU / Alias *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="Auto-generated"
                                            required
                                        />
                                    </div>

                                    {/* Account Name */}
                                    <div className="form-group">
                                        <label className="form-label">Account Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter account name"
                                            required
                                            style={{ borderColor: duplicateWarning ? '#ef4444' : undefined }}
                                        />
                                        {duplicateWarning && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>
                                                <AlertCircle size={14} />
                                                <span>Account "{duplicateWarning.name}" already exists</span>
                                            </div>
                                        )}
                                        {errors.name && (
                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Under (Account Group) */}
                                <div className="form-group">
                                    <label className="form-label">Under (Account Group) *</label>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                        <select
                                            className="form-select"
                                            value={formData.under}
                                            onChange={(e) => setFormData({ ...formData, under: e.target.value })}
                                            required
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select Account Group</option>
                                            {groups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {getGroupPath(group.id, groups)}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowGroupForm(true)}
                                            title="Create new group"
                                        >
                                            <Plus size={16} />
                                            New Group
                                        </button>
                                    </div>
                                </div>

                                {/* Opening Balance */}
                                <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 2fr' }}>
                                    <div className="form-group">
                                        <label className="form-label">Opening Balance</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.openingBalance}
                                            onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Dr/Cr</label>
                                        <select
                                            className="form-select"
                                            value={formData.balanceType}
                                            onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                                        >
                                            <option value="dr">Dr</option>
                                            <option value="cr">Cr</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">As on Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.asOnDate}
                                            onChange={(e) => setFormData({ ...formData, asOnDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Fields Based on Account Type */}
                            {formData.under && (
                                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        Additional Details
                                    </h3>

                                    {/* Account Image (for Sundry Debtors/Creditors) */}
                                    {showField('accountImage') && (
                                        <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                            <label className="form-label">Account Image</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                                {renderAvatar()}
                                                <div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        style={{ display: 'none' }}
                                                        id="account-image-upload"
                                                    />
                                                    <label htmlFor="account-image-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                                        <Upload size={16} />
                                                        Upload Image
                                                    </label>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                                        Max 2MB. JPG, PNG, or GIF
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Fields (for Sundry Debtors/Creditors) */}
                                    {(showField('contactPerson') || showField('mobile') || showField('email')) && (
                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {showField('contactPerson') && (
                                                <div className="form-group">
                                                    <label className="form-label">Contact Person</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={formData.contactPerson}
                                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                                        placeholder="Contact name"
                                                    />
                                                </div>
                                            )}
                                            {showField('mobile') && (
                                                <div className="form-group">
                                                    <label className="form-label">Mobile Number</label>
                                                    <input
                                                        type="tel"
                                                        className="form-input"
                                                        value={formData.mobile}
                                                        onChange={(e) => handleMobileChange(e.target.value)}
                                                        placeholder="+91 98765 43210"
                                                        pattern="[0-9+\s\-()]*"
                                                        title="Please enter a valid 10-digit mobile number"
                                                    />
                                                    {errors.mobile && (
                                                        <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                                                            {errors.mobile}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {showField('email') && (
                                                <div className="form-group">
                                                    <label className="form-label">Email</label>
                                                    <input
                                                        type="email"
                                                        className="form-input"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        placeholder="email@example.com"
                                                    />
                                                    {errors.email && (
                                                        <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.email}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Mailing Name */}
                                    {showField('mailingName') && (
                                        <div className="form-group">
                                            <label className="form-label">Mailing Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.mailingName}
                                                onChange={(e) => setFormData({ ...formData, mailingName: e.target.value })}
                                                placeholder="Name for correspondence"
                                            />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                Leave blank to use account name
                                            </span>
                                        </div>
                                    )}

                                    {/* GST Registration (Optional) */}
                                    {showField('gstRegistration') && (
                                        <div style={{
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            marginBottom: 'var(--spacing-md)'
                                        }}>
                                            <div className="form-group" style={{ marginBottom: formData.gstRegistration ? 'var(--spacing-md)' : 0 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.gstRegistration}
                                                        onChange={(e) => setFormData({ ...formData, gstRegistration: e.target.checked })}
                                                    />
                                                    <span style={{ fontWeight: 500 }}>Set/Alter GST Details</span>
                                                </label>
                                            </div>

                                            {formData.gstRegistration && (
                                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">GSTIN</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.gstin}
                                                            onChange={(e) => handleGSTINChange(e.target.value)}
                                                            placeholder="27AABCU9603R1ZM"
                                                            maxLength={15}
                                                            style={{ borderColor: errors.gstin ? '#ef4444' : undefined }}
                                                        />
                                                        {errors.gstin && (
                                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.gstin}</span>
                                                        )}
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">PAN</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.pan}
                                                            onChange={(e) => handlePANChange(e.target.value)}
                                                            placeholder="ABCDE1234F"
                                                            maxLength={10}
                                                            style={{ borderColor: errors.pan ? '#ef4444' : undefined }}
                                                        />
                                                        {errors.pan && (
                                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.pan}</span>
                                                        )}
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">State</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.stateName}
                                                            onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                                                            placeholder="e.g., Maharashtra"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Country</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.country}
                                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                            placeholder="India"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Customer Properties Management (for Sundry Debtors) */}
                                    {(formData.under === 'sundry-debtors' || formData.under === 'customer-accounts') && (
                                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    Customer Properties
                                                </h4>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={addProperty}
                                                    style={{ fontSize: 'var(--font-size-xs)', padding: '4px 12px' }}
                                                >
                                                    <Plus size={14} style={{ marginRight: '4px' }} />
                                                    Add Property
                                                </button>
                                            </div>

                                            {properties.map((property, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        padding: 'var(--spacing-md)',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-primary)',
                                                        marginBottom: 'var(--spacing-sm)',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                                            Property {index + 1}
                                                        </span>
                                                        {properties.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteProperty(index)}
                                                                style={{
                                                                    backgroundColor: '#ef4444',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    padding: '4px 8px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: 'var(--font-size-xs)'
                                                                }}
                                                            >
                                                                <Trash2 size={12} />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                                        <label className="form-label">Property Name/Label</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={property.name}
                                                            onChange={(e) => updateProperty(index, 'name', e.target.value)}
                                                            placeholder="e.g., Head Office, Branch 1, Warehouse"
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Property Address</label>
                                                        <textarea
                                                            className="form-input"
                                                            value={property.address}
                                                            onChange={(e) => updateProperty(index, 'address', e.target.value)}
                                                            rows="2"
                                                            placeholder="Enter full property address"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                Add multiple properties for this customer (e.g., different branch locations, warehouses, etc.)
                                            </span>
                                        </div>
                                    )}

                                    {/* Multiple Addresses (Tally-style) */}
                                    {(showField('mailingAddress') || showField('billingAddress') || showField('shippingAddress')) && (
                                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                                Addresses
                                            </h4>

                                            {showField('mailingAddress') && (
                                                <div className="form-group">
                                                    <label className="form-label">Mailing Address</label>

                                                    {/* Property Selection Dropdown (for customers) */}
                                                    {(formData.under === 'sundry-debtors' || formData.under === 'customer-accounts') && properties.length > 0 && (
                                                        <select
                                                            className="form-select"
                                                            onChange={(e) => {
                                                                const selectedProperty = properties.find(p => p.name === e.target.value);
                                                                if (selectedProperty) {
                                                                    setFormData({ ...formData, mailingAddress: selectedProperty.address });
                                                                }
                                                            }}
                                                            style={{ marginBottom: 'var(--spacing-xs)' }}
                                                        >
                                                            <option value="">-- Select from Properties --</option>
                                                            {properties.filter(p => p.name.trim() !== '').map((property, idx) => (
                                                                <option key={idx} value={property.name}>
                                                                    {property.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <textarea
                                                        className="form-input"
                                                        value={formData.mailingAddress}
                                                        onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
                                                        rows="2"
                                                        placeholder="Enter mailing address or select from properties above"
                                                    />
                                                </div>
                                            )}

                                            {showField('billingAddress') && (
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Billing Address
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, billingAddress: formData.mailingAddress })}
                                                            style={{
                                                                marginLeft: 'var(--spacing-sm)',
                                                                fontSize: 'var(--font-size-xs)',
                                                                color: '#3b82f6',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline'
                                                            }}
                                                        >
                                                            Same as Mailing
                                                        </button>
                                                    </label>

                                                    {/* Property Selection Dropdown (for customers) */}
                                                    {(formData.under === 'sundry-debtors' || formData.under === 'customer-accounts') && properties.length > 0 && (
                                                        <select
                                                            className="form-select"
                                                            onChange={(e) => {
                                                                const selectedProperty = properties.find(p => p.name === e.target.value);
                                                                if (selectedProperty) {
                                                                    setFormData({ ...formData, billingAddress: selectedProperty.address });
                                                                }
                                                            }}
                                                            style={{ marginBottom: 'var(--spacing-xs)' }}
                                                        >
                                                            <option value="">-- Select from Properties --</option>
                                                            {properties.filter(p => p.name.trim() !== '').map((property, idx) => (
                                                                <option key={idx} value={property.name}>
                                                                    {property.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <textarea
                                                        className="form-input"
                                                        value={formData.billingAddress}
                                                        onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                                                        rows="2"
                                                        placeholder="Enter billing address or select from properties above"
                                                    />
                                                </div>
                                            )}

                                            {showField('shippingAddress') && (
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Shipping Address
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, shippingAddress: formData.mailingAddress })}
                                                            style={{
                                                                marginLeft: 'var(--spacing-sm)',
                                                                fontSize: 'var(--font-size-xs)',
                                                                color: '#3b82f6',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline'
                                                            }}
                                                        >
                                                            Same as Mailing
                                                        </button>
                                                    </label>

                                                    {/* Property Selection Dropdown (for customers) */}
                                                    {(formData.under === 'sundry-debtors' || formData.under === 'customer-accounts') && properties.length > 0 && (
                                                        <select
                                                            className="form-select"
                                                            onChange={(e) => {
                                                                const selectedProperty = properties.find(p => p.name === e.target.value);
                                                                if (selectedProperty) {
                                                                    setFormData({ ...formData, shippingAddress: selectedProperty.address });
                                                                }
                                                            }}
                                                            style={{ marginBottom: 'var(--spacing-xs)' }}
                                                        >
                                                            <option value="">-- Select from Properties --</option>
                                                            {properties.filter(p => p.name.trim() !== '').map((property, idx) => (
                                                                <option key={idx} value={property.name}>
                                                                    {property.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <textarea
                                                        className="form-input"
                                                        value={formData.shippingAddress}
                                                        onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                        rows="2"
                                                        placeholder="Enter shipping address or select from properties above"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Credit Limit & Period */}
                                    {(showField('creditLimit') || showField('creditPeriod')) && (
                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {showField('creditLimit') && (
                                                <div className="form-group">
                                                    <label className="form-label">Credit Limit (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.creditLimit}
                                                        onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            )}
                                            {showField('creditPeriod') && (
                                                <div className="form-group">
                                                    <label className="form-label">Credit Period (days)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.creditPeriod}
                                                        onChange={(e) => setFormData({ ...formData, creditPeriod: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bank Account Fields */}
                                    {(showField('accountNumber') || showField('bankName')) && (
                                        <>
                                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                                {showField('accountNumber') && (
                                                    <div className="form-group">
                                                        <label className="form-label">Account Number</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.accountNumber}
                                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                                            placeholder="Account number"
                                                        />
                                                    </div>
                                                )}
                                                {showField('bankName') && (
                                                    <div className="form-group">
                                                        <label className="form-label">Bank Name</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.bankName}
                                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                                            placeholder="Bank name"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                                {showField('branch') && (
                                                    <div className="form-group">
                                                        <label className="form-label">Branch</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.branch}
                                                            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                                            placeholder="Branch name"
                                                        />
                                                    </div>
                                                )}
                                                {showField('ifscCode') && (
                                                    <div className="form-group">
                                                        <label className="form-label">IFSC Code</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.ifscCode}
                                                            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                                                            placeholder="SBIN0001234"
                                                            maxLength={11}
                                                        />
                                                        {errors.ifscCode && (
                                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.ifscCode}</span>
                                                        )}
                                                    </div>
                                                )}
                                                {showField('accountType') && (
                                                    <div className="form-group">
                                                        <label className="form-label">Account Type</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.accountType}
                                                            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                                        >
                                                            <option value="savings">Savings</option>
                                                            <option value="current">Current</option>
                                                            <option value="od">Overdraft</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* GST Applicable (for Income/Expense Accounts) */}
                                    {showField('gstApplicable') && (
                                        <div style={{
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            marginBottom: 'var(--spacing-md)'
                                        }}>
                                            <div className="form-group" style={{ marginBottom: formData.gstApplicable ? 'var(--spacing-md)' : 0 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.gstApplicable}
                                                        onChange={(e) => setFormData({ ...formData, gstApplicable: e.target.checked })}
                                                    />
                                                    <span style={{ fontWeight: 500 }}>Is GST Applicable?</span>
                                                </label>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                                                    Enable if this account is used in GST calculations
                                                </span>
                                            </div>

                                            {formData.gstApplicable && showField('gstRegistration') && (
                                                <>
                                                    <div className="form-group" style={{ marginBottom: formData.gstRegistration ? 'var(--spacing-md)' : 0 }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.gstRegistration}
                                                                onChange={(e) => setFormData({ ...formData, gstRegistration: e.target.checked })}
                                                            />
                                                            <span style={{ fontWeight: 500 }}>Set/Alter GST Details</span>
                                                        </label>
                                                    </div>

                                                    {formData.gstRegistration && (
                                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                                            <div className="form-group">
                                                                <label className="form-label">GSTIN</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    value={formData.gstin}
                                                                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                                                    placeholder="27AABCU9603R1ZM"
                                                                    maxLength={15}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label className="form-label">PAN</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    value={formData.pan}
                                                                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                                                    placeholder="ABCDE1234F"
                                                                    maxLength={10}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Tax Fields */}
                                    {(showField('taxRate') || showField('roundingMethod')) && (
                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {showField('taxRate') && (
                                                <div className="form-group">
                                                    <label className="form-label">Tax Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.taxRate}
                                                        onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            )}
                                            {showField('roundingMethod') && (
                                                <div className="form-group">
                                                    <label className="form-label">Rounding Method</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.roundingMethod}
                                                        onChange={(e) => setFormData({ ...formData, roundingMethod: e.target.value })}
                                                    >
                                                        <option value="normal">Normal Rounding</option>
                                                        <option value="upward">Upward Rounding</option>
                                                        <option value="downward">Downward Rounding</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Fixed Asset Fields */}
                                    {showField('assetCategory') && (
                                        <>
                                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Asset Category</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={formData.assetCategory}
                                                        onChange={(e) => setFormData({ ...formData, assetCategory: e.target.value })}
                                                        placeholder="e.g., Furniture, Equipment"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Purchase Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={formData.purchaseDate}
                                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Purchase Value (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.purchaseValue}
                                                        onChange={(e) => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Depreciation Method</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.depreciationMethod}
                                                        onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                                                    >
                                                        <option value="slm">Straight Line Method</option>
                                                        <option value="wdv">Written Down Value</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Depreciation Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.depreciationRate}
                                                        onChange={(e) => setFormData({ ...formData, depreciationRate: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Create Account
                            </button>
                        </div>
                    </form>
                </div>

                {/* Group Creation Modal */}
                {showGroupForm && (
                    <GroupCreationModal
                        groups={groups}
                        onClose={() => setShowGroupForm(false)}
                        onSave={async (newGroupData) => {
                            try {
                                const result = await accountGroupsAPI.create(newGroupData);

                                // Auto-select the new group in the "Under" dropdown
                                setFormData({ ...formData, under: result.id });

                                // Refresh parental list
                                if (onGroupCreated) onGroupCreated();

                                setShowGroupForm(false);
                                alert(`Group "${result.name}" created successfully!`);
                            } catch (err) {
                                console.error('Error creating group:', err);
                                alert(`Failed to create group: ${err.message}`);
                            }
                        }}
                    />
                )}
            </div>

            {/* Confirm Close Dialog */}
            <ConfirmDialog
                isOpen={showConfirmClose}
                onClose={() => setShowConfirmClose(false)}
                onConfirm={onClose}
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form?"
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                variant="warning"
            />
        </>
    );
}

export default NewAccountForm;
