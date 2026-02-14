'use client'

import { useState } from 'react';
import { X, User, FileText, Bell, History, Receipt, Edit2, Save, MapPin, Phone, Mail, Package, Shield, Upload, Trash2, Plus, AlertCircle } from 'lucide-react';
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';
import { getRequiredFields, generateInitialsAvatar } from '@/lib/utils/accountHelpers';
import { accountGroups } from '@/lib/data/accountingData';
import { validateMobileNumber } from '@/lib/utils/validation';
import CustomerPropertiesTab from './accounts/CustomerPropertiesTab';
import RemindersTab from './accounts/RemindersTab';
import InteractionsTab from './accounts/InteractionsTab';
import TransactionsTab from './accounts/TransactionsTab';
import RentAMCTab from './accounts/RentAMCTab';

function AccountDetailModal({ account, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [editedAccount, setEditedAccount] = useState({
        ...account,
        // Ensure all fields exist with defaults
        contactPerson: account.contactPerson || '',
        mobile: account.mobile || '',
        email: account.email || '',
        mailingName: account.mailingName || '',
        accountImage: account.accountImage || null,

        // GST fields
        gstRegistration: account.gstRegistration || false,
        gstin: account.gstin || '',
        pan: account.pan || '',
        stateName: account.stateName || '',
        country: account.country || 'India',

        // Credit fields
        creditLimit: account.creditLimit || 0,
        creditPeriod: account.creditPeriod || 0,
        priceLevel: account.priceLevel || 'default',

        // Bank fields
        accountNumber: account.accountNumber || '',
        bankName: account.bankName || '',
        branch: account.branch || '',
        ifscCode: account.ifscCode || '',
        micrCode: account.micrCode || '',
        accountType: account.accountType || 'savings',

        // Tax fields
        taxRate: account.taxRate || 0,
        roundingMethod: account.roundingMethod || 'normal',

        // Fixed Asset fields
        assetCategory: account.assetCategory || '',
        purchaseDate: account.purchaseDate || '',
        purchaseValue: account.purchaseValue || 0,
        depreciationMethod: account.depreciationMethod || 'slm',
        depreciationRate: account.depreciationRate || 0,

        // Opening Balance
        openingBalance: account.openingBalance || 0,
        balanceType: account.balanceType || 'dr',
        asOnDate: account.asOnDate || new Date().toISOString().split('T')[0],

        // Currency
        currency: account.currency || 'INR'
    });

    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState(account.accountImage || null);

    // Determine which tabs to show based on account type
    const isCustomer = account.type === 'customer';

    const baseTabs = [
        { id: 'details', label: 'Master Details', icon: User }
    ];

    const customerOnlyTabs = isCustomer ? [
        { id: 'properties', label: 'Properties', icon: MapPin }
    ] : [];

    const commonTabs = [
        { id: 'reminders', label: 'Reminders', icon: Bell },
        { id: 'interactions', label: 'Interactions', icon: History },
        { id: 'transactions', label: 'Transactions', icon: Receipt }
    ];

    const rentAmcTabs = isCustomer ? [
        { id: 'rentamc', label: 'Rent/AMC', icon: Package }
    ] : [];

    const tabs = [...baseTabs, ...customerOnlyTabs, ...commonTabs, ...rentAmcTabs];

    const groupPath = getGroupPath(account.under, accountGroups);
    const isPositive = (account.closingBalance || 0) >= 0;

    // Get required fields for current account type
    const requiredFields = getRequiredFields(editedAccount.under || account.under);
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
                setEditedAccount(prev => ({ ...prev, accountImage: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        setImagePreview(null);
        setEditedAccount(prev => ({ ...prev, accountImage: null }));
    };

    // Mobile number validation
    const handleMobileChange = (value) => {
        setEditedAccount({ ...editedAccount, mobile: value });

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

    const handleSave = () => {
        // Validate mobile number
        if (editedAccount.mobile && editedAccount.mobile.trim()) {
            const mobileValidation = validateMobileNumber(editedAccount.mobile);
            if (!mobileValidation.isValid) {
                setErrors({ mobile: mobileValidation.error });
                return;
            }
        }

        onUpdate(editedAccount);
        setIsEditing(false);
    };

    // Render initials avatar if no image
    const renderAvatar = () => {
        if (imagePreview || editedAccount.accountImage) {
            return (
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img
                        src={imagePreview || editedAccount.accountImage}
                        alt="Account"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--border-primary)'
                        }}
                    />
                    {isEditing && (
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
                    )}
                </div>
            );
        }

        if (editedAccount.name) {
            const avatar = generateInitialsAvatar(editedAccount.name);
            return (
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: avatar.backgroundColor,
                    color: avatar.textColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <h2 className="modal-title" style={{ margin: 0 }}>{account.name}</h2>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                backgroundColor: isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 500,
                                textTransform: 'capitalize'
                            }}>
                                {isPositive ? 'Receivable' : 'Payable'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                            <span style={{ fontFamily: 'monospace' }}>{account.sku}</span>
                            <span>•</span>
                            <span>{groupPath}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{account.type}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        {activeTab === 'details' && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            >
                                {isEditing ? <><Save size={16} /> Save</> : <><Edit2 size={16} /> Edit</>}
                            </button>
                        )}
                        <button className="btn-icon" onClick={onClose} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="modal-tabs" style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '60vh', overflowY: 'auto' }}>
                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            {/* Basic Information */}
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                    Basic Information
                                </h3>

                                {/* Account Image (for Sundry Debtors/Creditors) */}
                                {showField('accountImage') && (
                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                        <label className="form-label">Account Image</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                            {renderAvatar()}
                                            {isEditing && (
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
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Ledger Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedAccount.name}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, name: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">SKU Code</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedAccount.sku}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-tertiary)', fontFamily: 'monospace' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select className="form-select" value={editedAccount.type} disabled style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                            <option value="customer">Customer</option>
                                            <option value="supplier">Supplier</option>
                                            <option value="technician">Technician</option>
                                            <option value="cash">Cash/Bank</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Under Group *</label>
                                        <select
                                            className="form-select"
                                            value={editedAccount.under}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, under: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        >
                                            {accountGroups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {getGroupPath(group.id, accountGroups)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Contact Fields */}
                                {(showField('contactPerson') || showField('mobile') || showField('email')) && (
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 'var(--spacing-md)' }}>
                                        {showField('contactPerson') && (
                                            <div className="form-group">
                                                <label className="form-label">Contact Person</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.contactPerson}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, contactPerson: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="Contact name"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('mobile') && (
                                            <div className="form-group">
                                                <label className="form-label">Mobile Number</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={editedAccount.mobile}
                                                    onChange={(e) => handleMobileChange(e.target.value)}
                                                    disabled={!isEditing}
                                                    placeholder="+91 98765 43210"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
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
                                                    value={editedAccount.email}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, email: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="email@example.com"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mailing Name */}
                                {showField('mailingName') && (
                                    <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                                        <label className="form-label">Mailing Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedAccount.mailingName}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, mailingName: e.target.value })}
                                            disabled={!isEditing}
                                            placeholder="Name for correspondence"
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            Leave blank to use account name
                                        </span>
                                    </div>
                                )}

                                {/* Opening Balance */}
                                <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 2fr', marginTop: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Opening Balance</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editedAccount.openingBalance}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, openingBalance: parseFloat(e.target.value) || 0 })}
                                            disabled={!isEditing}
                                            step="0.01"
                                            placeholder="0.00"
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Dr/Cr</label>
                                        <select
                                            className="form-select"
                                            value={editedAccount.balanceType}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, balanceType: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
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
                                            value={editedAccount.asOnDate}
                                            onChange={(e) => setEditedAccount({ ...editedAccount, asOnDate: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* GST Registration (Optional) */}
                            {showField('gstRegistration') && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        GST Registration
                                    </h3>
                                    <div className="form-group" style={{ marginBottom: editedAccount.gstRegistration ? 'var(--spacing-md)' : 0 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: isEditing ? 'pointer' : 'default' }}>
                                            <input
                                                type="checkbox"
                                                checked={editedAccount.gstRegistration}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, gstRegistration: e.target.checked })}
                                                disabled={!isEditing}
                                            />
                                            <span style={{ fontWeight: 500 }}>Set/Alter GST Details</span>
                                        </label>
                                    </div>

                                    {editedAccount.gstRegistration && (
                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            <div className="form-group">
                                                <label className="form-label">GSTIN</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.gstin}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, gstin: e.target.value.toUpperCase() })}
                                                    disabled={!isEditing}
                                                    placeholder="27AABCU9603R1ZM"
                                                    maxLength={15}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">PAN</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.pan}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, pan: e.target.value.toUpperCase() })}
                                                    disabled={!isEditing}
                                                    placeholder="ABCDE1234F"
                                                    maxLength={10}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">State</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.stateName}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, stateName: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="e.g., Maharashtra"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Country</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.country}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, country: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="India"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Credit Limit & Period */}
                            {(showField('creditLimit') || showField('creditPeriod')) && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        Credit Management
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        {showField('creditLimit') && (
                                            <div className="form-group">
                                                <label className="form-label">Credit Limit (₹)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={editedAccount.creditLimit}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, creditLimit: parseFloat(e.target.value) || 0 })}
                                                    disabled={!isEditing}
                                                    placeholder="0"
                                                    step="0.01"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('creditPeriod') && (
                                            <div className="form-group">
                                                <label className="form-label">Credit Period (days)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={editedAccount.creditPeriod}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, creditPeriod: parseInt(e.target.value) || 0 })}
                                                    disabled={!isEditing}
                                                    placeholder="0"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('priceLevel') && (
                                            <div className="form-group">
                                                <label className="form-label">Price Level</label>
                                                <select
                                                    className="form-select"
                                                    value={editedAccount.priceLevel}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, priceLevel: e.target.value })}
                                                    disabled={!isEditing}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                >
                                                    <option value="default">Default</option>
                                                    <option value="wholesale">Wholesale</option>
                                                    <option value="retail">Retail</option>
                                                    <option value="premium">Premium</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bank Account Fields */}
                            {(showField('accountNumber') || showField('bankName')) && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        Bank Details
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        {showField('accountNumber') && (
                                            <div className="form-group">
                                                <label className="form-label">Account Number</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.accountNumber}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, accountNumber: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="Account number"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('bankName') && (
                                            <div className="form-group">
                                                <label className="form-label">Bank Name</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.bankName}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, bankName: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="Bank name"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
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
                                                    value={editedAccount.branch}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, branch: e.target.value })}
                                                    disabled={!isEditing}
                                                    placeholder="Branch name"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('ifscCode') && (
                                            <div className="form-group">
                                                <label className="form-label">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={editedAccount.ifscCode}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, ifscCode: e.target.value.toUpperCase() })}
                                                    disabled={!isEditing}
                                                    placeholder="SBIN0001234"
                                                    maxLength={11}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                        )}
                                        {showField('accountType') && (
                                            <div className="form-group">
                                                <label className="form-label">Account Type</label>
                                                <select
                                                    className="form-select"
                                                    value={editedAccount.accountType}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, accountType: e.target.value })}
                                                    disabled={!isEditing}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                >
                                                    <option value="savings">Savings</option>
                                                    <option value="current">Current</option>
                                                    <option value="od">Overdraft</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tax Fields */}
                            {(showField('taxRate') || showField('roundingMethod')) && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        Tax Information
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        {showField('taxRate') && (
                                            <div className="form-group">
                                                <label className="form-label">Tax Rate (%)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={editedAccount.taxRate}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, taxRate: parseFloat(e.target.value) || 0 })}
                                                    disabled={!isEditing}
                                                    placeholder="0"
                                                    step="0.01"
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                />
                                            </div>
                                        )}
                                        {showField('roundingMethod') && (
                                            <div className="form-group">
                                                <label className="form-label">Rounding Method</label>
                                                <select
                                                    className="form-select"
                                                    value={editedAccount.roundingMethod}
                                                    onChange={(e) => setEditedAccount({ ...editedAccount, roundingMethod: e.target.value })}
                                                    disabled={!isEditing}
                                                    style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                                >
                                                    <option value="normal">Normal Rounding</option>
                                                    <option value="upward">Upward Rounding</option>
                                                    <option value="downward">Downward Rounding</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fixed Asset Fields */}
                            {showField('assetCategory') && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                        Fixed Asset Details
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Asset Category</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editedAccount.assetCategory}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, assetCategory: e.target.value })}
                                                disabled={!isEditing}
                                                placeholder="e.g., Furniture, Equipment"
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Purchase Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={editedAccount.purchaseDate}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, purchaseDate: e.target.value })}
                                                disabled={!isEditing}
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Purchase Value (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editedAccount.purchaseValue}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, purchaseValue: parseFloat(e.target.value) || 0 })}
                                                disabled={!isEditing}
                                                placeholder="0"
                                                step="0.01"
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Depreciation Method</label>
                                            <select
                                                className="form-select"
                                                value={editedAccount.depreciationMethod}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, depreciationMethod: e.target.value })}
                                                disabled={!isEditing}
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
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
                                                value={editedAccount.depreciationRate}
                                                onChange={(e) => setEditedAccount({ ...editedAccount, depreciationRate: parseFloat(e.target.value) || 0 })}
                                                disabled={!isEditing}
                                                placeholder="0"
                                                step="0.01"
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Financial Summary */}
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                    Financial Summary
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 'var(--spacing-md)'
                                }}>
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Closing Balance
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-2xl)',
                                            fontWeight: 700,
                                            color: isPositive ? 'var(--color-success)' : 'var(--color-danger)'
                                        }}>
                                            {formatCurrency(account.closingBalance)}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            {isPositive ? 'To Receive' : 'To Pay'}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Jobs Completed
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-2xl)',
                                            fontWeight: 700,
                                            color: 'var(--text-primary)'
                                        }}>
                                            {account.jobsDone || 0}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Total Jobs
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'properties' && isCustomer && (
                        <CustomerPropertiesTab customerId={account.id} />
                    )}

                    {activeTab === 'reminders' && (
                        <RemindersTab accountId={account.id} accountName={account.name} />
                    )}

                    {activeTab === 'interactions' && (
                        <InteractionsTab accountId={account.id} accountName={account.name} />
                    )}

                    {activeTab === 'transactions' && (
                        <TransactionsTab accountId={account.id} accountName={account.name} />
                    )}

                    {activeTab === 'rentamc' && isCustomer && (
                        <RentAMCTab customerId={account.id} />
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ borderTop: '2px solid var(--border-primary)', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            Last updated: {new Date().toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                            {isEditing && (
                                <button className="btn btn-primary" onClick={handleSave}>
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountDetailModal;
