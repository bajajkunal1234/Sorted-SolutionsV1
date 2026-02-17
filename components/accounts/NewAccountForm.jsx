'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Upload, Trash2, AlertCircle } from 'lucide-react';
import { accountGroups as sampleGroups, coaFieldMappings, sampleLedgers as sampleLedgersMock } from '../../data/accountingData';
import { acquisitionSources } from '../../data/interactionTypes';
import GroupCreationModal from './GroupCreationModal';
import ConfirmDialog from '../common/ConfirmDialog';
import {
    generateSKU,
    checkDuplicateName,
    getRequiredFields,
    validateAccountData,
    generateInitialsAvatar,
    getGroupPath
} from '../../utils/accountHelpers';
import { validateMobileNumber, validateEmail, validateGSTIN, validatePAN, validateIFSC } from '../../utils/validation';

function NewAccountForm({ onClose, onSave, preselectedType = null, existingAccounts = sampleLedgersMock, existingGroups = sampleGroups, onGroupCreated }) {
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
    // accountGroupsList is now derived from existingGroups prop

    // Customer Properties (for Sundry Debtors/Creditors)
    const [properties, setProperties] = useState([{ name: '', address: '' }]);

    // Form dirty state tracking
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Auto-generate SKU on mount
    useEffect(() => {
        if (!formData.sku) {
            const newSKU = generateSKU(formData.under, existingAccounts, {
                autoGenerate: true,
                prefix: 'ACC',
                padding: 4
            });
            setFormData(prev => ({ ...prev, sku: newSKU }));
        }
    }, [formData.under, existingAccounts]);

    // Check for duplicate names
    useEffect(() => {
        if (formData.name.trim()) {
            const duplicate = checkDuplicateName(formData.name, existingAccounts);
            setDuplicateWarning(duplicate);
        } else {
            setDuplicateWarning(null);
        }
    }, [formData.name, existingAccounts]);

    // Track form dirty state
    useEffect(() => {
        const hasData = formData.name.trim() !== '' ||
            formData.mobile.trim() !== '' ||
            formData.email.trim() !== '' ||
            formData.contactPerson.trim() !== '' ||
            properties.some(p => p.name.trim() !== '' || p.address.trim() !== '');
        setIsFormDirty(hasData);
    }, [formData, properties]);

    // Recursive function to find the nearest ancestor that has a mapping in coaFieldMappings
    const resolveEffectiveGroup = (groupId) => {
        if (!groupId) return null;
        if (coaFieldMappings[groupId]) return groupId;

        const group = existingGroups.find(g => g.id === groupId);
        return group && group.parent ? resolveEffectiveGroup(group.parent) : null;
    };

    const effectiveGroup = resolveEffectiveGroup(formData.under);

    // Get required fields based on effective group (inheritance)
    const requiredFields = getRequiredFields(effectiveGroup || formData.under);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate using effective group (so we check required fields of parent)
        const validationErrors = validateAccountData(formData, effectiveGroup || formData.under);

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

        // Determine correct nature/type from effective group
        const accountNature = effectiveGroup && coaFieldMappings[effectiveGroup]
            ? coaFieldMappings[effectiveGroup].defaultNature
            : 'asset'; // Default fallback

        // Create account object
        const account = {
            // id: Date.now(), // Let DB handle ID or generate a temp one if needed for optimistic UI
            ...formData,
            properties: (effectiveGroup === 'sundry-debtors' || effectiveGroup === 'customer-accounts') ? properties : undefined,
            type: accountNature,
            // Ensure numeric values are numbers
            openingBalance: parseFloat(formData.openingBalance) || 0,
            creditLimit: parseFloat(formData.creditLimit) || 0,
            creditPeriod: parseInt(formData.creditPeriod) || 0,
            taxRate: parseFloat(formData.taxRate) || 0,
            purchaseValue: parseFloat(formData.purchaseValue) || 0,
            depreciationRate: parseFloat(formData.depreciationRate) || 0,
            usefulLife: parseFloat(formData.usefulLife) || 0
        };

        try {
            console.log('Submitting Account:', account);
            const response = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(account)
            });

            const result = await response.json();

            if (!result.success) {
                console.error('API Error:', result.error);
                // Handle duplicate key error from DB specifically if possible
                if (result.error.includes('unique constraint') || result.error.includes('duplicate')) {
                    setErrors({ name: 'Account name or SKU already exists' });
                } else {
                    setErrors({ submit: result.error || 'Failed to create account' });
                }
                return;
            }

            console.log('Account Created:', result.data);

            if (onSave) {
                onSave(result.data);
            }

            onClose();
        } catch (error) {
            console.error('Network/Client Error:', error);
            setErrors({ submit: error.message });
        }
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

                            {/* Top Section: Name & Group (Tally Style) */}
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                padding: 'var(--spacing-lg)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label className="form-label" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 600 }}>Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter Ledger Name"
                                        autoFocus
                                        required
                                        style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 600,
                                            borderColor: duplicateWarning ? '#ef4444' : undefined,
                                            padding: '12px 16px'
                                        }}
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

                                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Alias / SKU</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="Auto-generated SKU"
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Under (Account Group)</label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <select
                                                className="form-select"
                                                value={formData.under}
                                                onChange={(e) => setFormData({ ...formData, under: e.target.value })}
                                                required
                                                style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}
                                            >
                                                <option value="">Select Group</option>
                                                {[...existingGroups]
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(group => (
                                                        <option key={group.id} value={group.id}>
                                                            {group.name}
                                                        </option>
                                                    ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowGroupForm(true)}
                                                style={{ padding: '8px' }}
                                                title="Create new group"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Body: Split Screen (Tally Style) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                minHeight: '400px',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                {/* Left Column: Mailing Details */}
                                <div style={{
                                    padding: 'var(--spacing-lg)',
                                    borderRight: '1px solid var(--border-primary)',
                                    backgroundColor: 'rgba(255,255,255,0.02)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '8px' }}>
                                        Mailing Details
                                    </h4>

                                    <div className="form-group">
                                        <label className="form-label">Name (for Correspondence)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.mailingName || ''}
                                            onChange={(e) => setFormData({ ...formData, mailingName: e.target.value })}
                                            placeholder={formData.name || "Correspondence Name"}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Address</label>
                                        <textarea
                                            className="form-input"
                                            value={formData.mailingAddress}
                                            onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
                                            rows="4"
                                            placeholder="Full Address"
                                        />
                                    </div>

                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <div className="form-group">
                                            <label className="form-label">State</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.stateName}
                                                onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                                                placeholder="e.g. Maharashtra"
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

                                    <div className="form-group">
                                        <label className="form-label">Pincode</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.pincode || ''}
                                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            placeholder="400001"
                                        />
                                    </div>

                                    {/* Contact Info (if applicable) */}
                                    {(showField('mobile') || showField('email')) && (
                                        <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px dashed var(--border-primary)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Contact Information</h5>
                                            {showField('mobile') && (
                                                <div className="form-group">
                                                    <label className="form-label">Mobile Number</label>
                                                    <input
                                                        type="tel"
                                                        className="form-input"
                                                        value={formData.mobile}
                                                        onChange={(e) => handleMobileChange(e.target.value)}
                                                        placeholder="+91"
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
                                                    <label className="form-label">Email Address</label>
                                                    <input
                                                        type="email"
                                                        className="form-input"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        placeholder="email@example.com"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Tax Registration Details */}
                                <div style={{
                                    padding: 'var(--spacing-lg)',
                                    backgroundColor: 'rgba(0,0,0,0.01)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '8px' }}>
                                        Tax Registration Details
                                    </h4>

                                    <div className="form-group">
                                        <label className="form-label">PAN / IT No.</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.pan}
                                            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                        />
                                        {errors.pan && (
                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                                                {errors.pan}
                                            </span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Registration Type</label>
                                        <select
                                            className="form-select"
                                            value={formData.gstRegistrationType || 'Regular'}
                                            onChange={(e) => setFormData({ ...formData, gstRegistrationType: e.target.value })}
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Composition">Composition</option>
                                            <option value="Unregistered">Unregistered</option>
                                            <option value="Consumer">Consumer</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">GSTIN / UIN</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.gstin}
                                            onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                            placeholder="27AABCU..."
                                            maxLength={15}
                                            disabled={formData.gstRegistrationType === 'Unregistered' || formData.gstRegistrationType === 'Consumer'}
                                            style={{
                                                backgroundColor: (formData.gstRegistrationType === 'Unregistered' || formData.gstRegistrationType === 'Consumer') ? 'var(--bg-secondary)' : undefined,
                                                opacity: (formData.gstRegistrationType === 'Unregistered' || formData.gstRegistrationType === 'Consumer') ? 0.6 : 1
                                            }}
                                        />
                                        {errors.gstin && (
                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                                                {errors.gstin}
                                            </span>
                                        )}
                                    </div>

                                    {/* Dynamic and Group-Specific Details */}
                                    {formData.under && (
                                        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px dashed var(--border-primary)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Group Specific Details</h5>

                                            {/* Bank Details */}
                                            {(showField('accountNumber')) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">A/c No.</label>
                                                        <input type="text" className="form-input" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Bank Name</label>
                                                        <input type="text" className="form-input" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Credit Terms */}
                                            {showField('creditLimit') && (
                                                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">Credit Limit</label>
                                                        <input type="number" className="form-input" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Period (Days)</label>
                                                        <input type="number" className="form-input" value={formData.creditPeriod} onChange={(e) => setFormData({ ...formData, creditPeriod: parseInt(e.target.value) })} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Inventory/Affected (for Income/Expense) */}
                                            {showField('inventoryAffected') && (
                                                <div className="form-group">
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={formData.inventoryAffected} onChange={(e) => setFormData({ ...formData, inventoryAffected: e.target.checked })} />
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Inventory values are affected?</span>
                                                    </label>
                                                </div>
                                            )}

                                            {/* Fixed Asset Details */}
                                            {showField('assetCategory') && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">Asset Category</label>
                                                        <input type="text" className="form-input" value={formData.assetCategory} onChange={(e) => setFormData({ ...formData, assetCategory: e.target.value })} placeholder="e.g. Computers, Furniture" />
                                                    </div>
                                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                        <div className="form-group">
                                                            <label className="form-label">Purchase Date</label>
                                                            <input type="date" className="form-input" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label">Purchase Value</label>
                                                            <input type="number" className="form-input" value={formData.purchaseValue} onChange={(e) => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) || 0 })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Duties & Taxes Details */}
                                            {showField('taxType') && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">Tax Type</label>
                                                        <select className="form-select" value={formData.taxType} onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}>
                                                            <option value="GST">GST</option>
                                                            <option value="Others">Others</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Percentage of Calculation (e.g. 18)</label>
                                                        <input type="number" className="form-input" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Section: Opening Balance (Tally Style) */}
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--spacing-xl)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1 }}>
                                    <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap', fontWeight: 600 }}>Opening Balance</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, maxWidth: '300px' }}>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.openingBalance}
                                            onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                                            style={{ textAlign: 'right', fontWeight: 600 }}
                                            placeholder="0.00"
                                        />
                                        <select
                                            className="form-select"
                                            value={formData.balanceType}
                                            onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                                            style={{ width: '80px', fontWeight: 600 }}
                                        >
                                            <option value="dr">Dr</option>
                                            <option value="cr">Cr</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                    <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>As on Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.asOnDate}
                                        onChange={(e) => setFormData({ ...formData, asOnDate: e.target.value })}
                                        style={{ width: '160px' }}
                                    />
                                </div>
                            </div>
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
                        onClose={() => setShowGroupForm(false)}
                        onSave={(newGroup) => {
                            // Trigger refresh in parent
                            if (onGroupCreated) onGroupCreated();

                            // Auto-select the new group
                            setFormData(prev => ({ ...prev, under: newGroup.id }));
                            setShowGroupForm(false);
                            // alert(`Group "${newGroup.name}" created successfully!`);
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




