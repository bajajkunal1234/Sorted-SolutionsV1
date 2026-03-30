'use client'

import { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Plus, AlertCircle, Calendar } from 'lucide-react';
import { coaFieldMappings, sampleLedgers } from '@/lib/data/accountingData';
import { acquisitionSources } from '@/lib/data/interactionTypes';
import GroupCreationModal from './GroupCreationModal';
import { accountGroupsAPI } from '@/lib/adminAPI';
import ConfirmDialog from '@/app/admin/components/common/ConfirmDialog';
import {
    generateSKU,
    generateShortKU,
    checkDuplicateName,
    getRequiredFields,
    validateAccountData,
    generateInitialsAvatar,
    getGroupPath
} from '@/lib/utils/accountHelpers';
import { validateMobileNumber, validateEmail, validateGSTIN, validatePAN, validateIFSC } from '@/lib/utils/validation';
import dynamic from 'next/dynamic';

const ClientPinDropMap = dynamic(() => import('@/components/common/PinDropMap'), {
    ssr: false,
    loading: () => <div style={{ height: '200px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>🗺️ Loading map...</div>
});

// ─── Mumbai locality → pincode mapping ─────────────────────────────────────
const MUMBAI_LOCALITIES = [
    { name: 'Aarey Colony', pincode: '400065' },
    { name: 'Airoli', pincode: '400708' },
    { name: 'Andheri East', pincode: '400069' },
    { name: 'Andheri West', pincode: '400058' },
    { name: 'Antop Hill', pincode: '400037' },
    { name: 'Bandra East', pincode: '400051' },
    { name: 'Bandra West', pincode: '400050' },
    { name: 'BKC / Bandra Kurla Complex', pincode: '400051' },
    { name: 'Borivali East', pincode: '400066' },
    { name: 'Borivali West', pincode: '400092' },
    { name: 'Breach Candy', pincode: '400026' },
    { name: 'Bhandup East', pincode: '400042' },
    { name: 'Bhandup West', pincode: '400078' },
    { name: 'Bhendi Bazar', pincode: '400003' },
    { name: 'Byculla', pincode: '400027' },
    { name: 'Chakala', pincode: '400059' },
    { name: 'Chandivali', pincode: '400072' },
    { name: 'Charni Road', pincode: '400004' },
    { name: 'Chembur', pincode: '400071' },
    { name: 'Chembur Colony', pincode: '400074' },
    { name: 'Chinchpokli', pincode: '400012' },
    { name: 'Churchgate', pincode: '400020' },
    { name: 'Chunabhatti', pincode: '400022' },
    { name: 'Colaba', pincode: '400005' },
    { name: 'Cotton Green', pincode: '400033' },
    { name: 'Crawford Market', pincode: '400001' },
    { name: 'CST / Fort', pincode: '400001' },
    { name: 'Cuffe Parade', pincode: '400005' },
    { name: 'Cumballa Hill', pincode: '400026' },
    { name: 'Currey Road', pincode: '400012' },
    { name: 'Dahisar East', pincode: '400068' },
    { name: 'Dahisar West', pincode: '400068' },
    { name: 'Dadar East', pincode: '400014' },
    { name: 'Dadar West', pincode: '400028' },
    { name: 'Dharavi', pincode: '400017' },
    { name: 'Diva', pincode: '400612' },
    { name: 'Dockyard Road', pincode: '400010' },
    { name: 'Dongri', pincode: '400009' },
    { name: 'Film City', pincode: '400065' },
    { name: 'Ghansoli', pincode: '400701' },
    { name: 'Ghatkopar East', pincode: '400077' },
    { name: 'Ghatkopar West', pincode: '400086' },
    { name: 'Goregaon East', pincode: '400063' },
    { name: 'Goregaon West', pincode: '400062' },
    { name: 'Govandi', pincode: '400043' },
    { name: 'Grant Road', pincode: '400007' },
    { name: 'GTB Nagar', pincode: '400037' },
    { name: 'Hiranandani Gardens', pincode: '400076' },
    { name: 'Infinity Mall Malad', pincode: '400064' },
    { name: 'Jogeshwari East', pincode: '400060' },
    { name: 'Jogeshwari West', pincode: '400102' },
    { name: 'Juhu', pincode: '400049' },
    { name: 'Kalina', pincode: '400098' },
    { name: 'Kalwa', pincode: '400605' },
    { name: 'Kandivali East', pincode: '400101' },
    { name: 'Kandivali West', pincode: '400067' },
    { name: 'Kanjurmarg East', pincode: '400042' },
    { name: 'Kanjurmarg West', pincode: '400078' },
    { name: 'Kemps Corner', pincode: '400036' },
    { name: 'Khar East', pincode: '400052' },
    { name: 'Khar West', pincode: '400052' },
    { name: 'King Circle / Matunga', pincode: '400019' },
    { name: 'Koparkhairane', pincode: '400709' },
    { name: 'Kopri', pincode: '400603' },
    { name: 'Kurla East', pincode: '400024' },
    { name: 'Kurla West', pincode: '400070' },
    { name: 'Lalbaug', pincode: '400012' },
    { name: 'Lokhandwala', pincode: '400053' },
    { name: 'Lower Parel', pincode: '400013' },
    { name: 'Mahim', pincode: '400016' },
    { name: 'Mahalaxmi', pincode: '400011' },
    { name: 'Malabar Hill', pincode: '400006' },
    { name: 'Malad East', pincode: '400097' },
    { name: 'Malad West', pincode: '400064' },
    { name: 'Mankhurd', pincode: '400088' },
    { name: 'Marine Lines', pincode: '400002' },
    { name: 'Marol', pincode: '400059' },
    { name: 'Masjid', pincode: '400009' },
    { name: 'Matunga', pincode: '400019' },
    { name: 'Matunga Road', pincode: '400016' },
    { name: 'Mazgaon', pincode: '400010' },
    { name: 'MIDC Andheri', pincode: '400093' },
    { name: 'Mira Road', pincode: '401107' },
    { name: 'Mulund East', pincode: '400081' },
    { name: 'Mulund West', pincode: '400080' },
    { name: 'Mumbai Central', pincode: '400008' },
    { name: 'Mumbra', pincode: '400612' },
    { name: 'Nagpada', pincode: '400008' },
    { name: 'Nana Chowk', pincode: '400007' },
    { name: 'Nariman Point', pincode: '400021' },
    { name: 'Nahur', pincode: '400078' },
    { name: 'Naupada', pincode: '400602' },
    { name: 'Oshiwara', pincode: '400102' },
    { name: 'Parel', pincode: '400012' },
    { name: 'Powai', pincode: '400076' },
    { name: 'Prabhadevi', pincode: '400025' },
    { name: 'Prabhadevi East', pincode: '400025' },
    { name: 'Rabale', pincode: '400701' },
    { name: 'Reay Road', pincode: '400010' },
    { name: 'Sakinaka', pincode: '400072' },
    { name: 'Sandhurst Road', pincode: '400009' },
    { name: 'Sanpada', pincode: '400705' },
    { name: 'Santacruz East', pincode: '400055' },
    { name: 'Santacruz West', pincode: '400054' },
    { name: 'SEEPZ', pincode: '400096' },
    { name: 'Sewri', pincode: '400015' },
    { name: 'Sion', pincode: '400022' },
    { name: 'Sion Koliwada', pincode: '400037' },
    { name: 'Tardeo', pincode: '400034' },
    { name: 'Thane East', pincode: '400603' },
    { name: 'Thane West', pincode: '400601' },
    { name: 'Tilak Nagar', pincode: '400089' },
    { name: 'Turbhe', pincode: '400705' },
    { name: 'Vakola', pincode: '400055' },
    { name: 'Vashi', pincode: '400703' },
    { name: 'Versova', pincode: '400061' },
    { name: 'Vidyavihar', pincode: '400077' },
    { name: 'Vikhroli East', pincode: '400079' },
    { name: 'Vikhroli West', pincode: '400083' },
    { name: 'Vile Parle East', pincode: '400057' },
    { name: 'Vile Parle West', pincode: '400056' },
    { name: 'Wadala', pincode: '400037' },
    { name: 'Wadi Bunder', pincode: '400009' },
    { name: 'Wagle Estate', pincode: '400604' },
    { name: 'Walkeshwar', pincode: '400006' },
    { name: 'Worli', pincode: '400018' },
    { name: 'Worli Sea Face', pincode: '400030' },
];

function NewAccountForm({ onClose, onSave, preselectedType = null, groups = [], onGroupCreated, initialData = null, ledgers = [] }) {
    // Common fields
    const [formData, setFormData] = useState({
        sku: initialData?.sku || '',
        name: initialData?.name || '',
        alias: initialData?.alias || '',
        under: initialData?.under || preselectedType || '',
        openingBalance: initialData?.opening_balance || 0,
        balanceType: initialData?.balance_type || 'dr',
        asOnDate: initialData?.as_on_date || new Date().toISOString().split('T')[0],

        // Dynamic fields will be added based on 'under' selection
        accountImage: initialData?.image_url || null,
        contactPerson: initialData?.contact_person || '',
        mobile: initialData?.mobile || '',
        email: initialData?.email || '',
        mailingName: initialData?.mailing_name || '',

        // GST Registration (Optional for all account types)
        gstRegistration: !!initialData?.gstin,
        gstin: initialData?.gstin || '',
        pan: initialData?.pan || '',
        stateName: initialData?.state_name || '',
        country: initialData?.country || 'India',

        // Customer description (stored in mailing_address DB column)
        customerDescription: initialData?.mailing_address || '',

        // Credit fields
        creditLimit: initialData?.credit_limit || 0,
        creditPeriod: initialData?.credit_period || 0,
        priceLevel: initialData?.price_level || 'default',

        // Bank fields
        accountNumber: initialData?.account_number || '',
        bankName: initialData?.bank_name || '',
        branch: initialData?.branch || '',
        ifscCode: initialData?.ifsc_code || '',
        micrCode: initialData?.micr_code || '',
        accountType: initialData?.account_type || 'savings',
        enableChequePrinting: initialData?.enable_cheque_printing || false,

        // Tax fields
        taxType: initialData?.tax_type || '',
        taxRate: initialData?.tax_rate || 0,
        roundingMethod: initialData?.rounding_method || 'normal',

        // Expense/Income fields with GST
        gstApplicable: initialData?.gst_applicable || false,
        costCenterAllocation: initialData?.cost_center_allocation || false,
        inventoryAffected: initialData?.inventory_affected || false,

        // Fixed Asset fields
        assetCategory: initialData?.asset_category || '',
        purchaseDate: initialData?.purchase_date || '',
        purchaseValue: initialData?.purchase_value || 0,
        depreciationMethod: initialData?.depreciation_method || 'slm',
        depreciationRate: initialData?.depreciation_rate || 0,
        usefulLife: initialData?.useful_life || 0,

        // Currency
        currency: initialData?.currency || 'INR',

        // Acquisition Source (How did you hear about us?)
        acquisitionSource: initialData?.acquisition_source || '',
        referredBy: initialData?.referred_by || '',

        // Status
        status: initialData?.status || 'active'
    });

    const [errors, setErrors] = useState({});
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [imagePreview, setImagePreview] = useState(initialData?.image_url || null);
    const [showGroupForm, setShowGroupForm] = useState(false);


    // Customer Properties (for Sundry Debtors/Creditors)
    const [properties, setProperties] = useState(initialData?.properties?.length > 0
        ? initialData.properties
        : [{ id: Date.now(), name: '', flat_number: '', building_name: '', address: '', locality: '', pincode: '', contactPerson: '', contactPhone: '' }]);

    // Form dirty state tracking
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Provide a fail-safe way to load ledgers if not passed in as a prop
    const [localLedgers, setLocalLedgers] = useState(ledgers);
    useEffect(() => {
        if (ledgers && ledgers.length > 0) {
            setLocalLedgers(ledgers);
        } else if (!initialData) {
            import('@/lib/adminAPI').then(({ accountsAPI }) => {
                accountsAPI.getAll().then(data => {
                    if (data && data.length > 0) {
                        setLocalLedgers(data);
                    }
                }).catch(err => console.error('Failed to pre-fetch accounts for SKU generation:', err));
            });
        }
    }, [ledgers, initialData]);

    // Auto-generate SKU/KU dynamically
    useEffect(() => {
        if (!initialData) {
            const liveLedgers = localLedgers.length > 0 ? localLedgers : (typeof sampleLedgers !== 'undefined' ? sampleLedgers : []);
            const newKU = generateShortKU(formData.under, liveLedgers, groups);
            setFormData(prev => prev.sku !== newKU ? { ...prev, sku: newKU } : prev);
        }
    }, [formData.under, groups, localLedgers, initialData]);

    // Update 'under' if preselectedType or groups change
    useEffect(() => {
        if (!formData.under && preselectedType) {
            setFormData(prev => ({ ...prev, under: preselectedType }));
        }
    }, [preselectedType, groups]);

    // Default As on Date to start of financial year for customers
    useEffect(() => {
        if (!initialData && formData.under === 'sundry-debtors') {
            const today = new Date();
            const currentYear = today.getFullYear();
            const startYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
            setFormData(prev => ({ ...prev, asOnDate: `${startYear}-04-01` }));
        }
    }, [formData.under, initialData]);

    // Check for duplicate names against live ledgers (only if name changed and not editing)
    useEffect(() => {
        if (formData.name.trim() && formData.name !== initialData?.name) {
            const liveLedgers = localLedgers.length > 0 ? localLedgers : (typeof sampleLedgers !== 'undefined' ? sampleLedgers : []);
            const duplicate = checkDuplicateName(formData.name, liveLedgers);
            setDuplicateWarning(duplicate);
        } else {
            setDuplicateWarning(null);
        }
    }, [formData.name, initialData, localLedgers]);

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
        setProperties([...properties, { id: Date.now(), name: '', flat_number: '', building_name: '', address: '', locality: '', pincode: '', contactPerson: '', contactPhone: '' }]);
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

    const handlePropertyLocalityChange = (index, localityName) => {
        const found = MUMBAI_LOCALITIES.find(l => l.name === localityName);
        const updated = [...properties];
        updated[index].locality = localityName;
        if (found) {
            updated[index].pincode = found.pincode;
        }
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
        } else if (showField('mobile') || formData.under === 'sundry-debtors' || groups.find(g => g.id === formData.under)?.name?.toLowerCase().includes('customer')) {
            validationErrors.mobile = 'Mobile Number is required';
        }

        if (showField('customerDescription') && !formData.customerDescription?.trim()) {
            validationErrors.customerDescription = 'Customer Description is required';
        }

        if (showField('acquisitionSource') && !formData.acquisitionSource) {
            validationErrors.acquisitionSource = 'Acquisition Source is required';
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
            id: initialData?.id, // Include ID if editing
            name: formData.name,
            sku: formData.sku,
            alias: formData.alias,
            under: formData.under,
            type: (() => {
                const underLower = (formData.under || '').toLowerCase();
                const groupNameLower = (groups.find(g => g.id === formData.under)?.name || '').toLowerCase();
                if (underLower.includes('customer') || underLower.includes('debtor') || groupNameLower.includes('customer') || groupNameLower.includes('debtor')) return 'customer';
                if (underLower.includes('supplier') || underLower.includes('creditor') || groupNameLower.includes('supplier') || groupNameLower.includes('creditor')) return 'supplier';
                if (underLower.includes('technician') || groupNameLower.includes('technician')) return 'technician';
                if (underLower.includes('bank') || groupNameLower.includes('bank')) return 'bank';
                if (underLower.includes('cash') || groupNameLower.includes('cash')) return 'cash';
                return groups.find(g => g.id === formData.under)?.nature || coaFieldMappings[formData.under]?.defaultNature || 'asset';
            })(),
            opening_balance: parseFloat(formData.openingBalance) || 0,
            balance_type: formData.balanceType,
            as_on_date: formData.asOnDate,
            contact_person: formData.contactPerson,
            mobile: formData.mobile,
            email: formData.email,
            mailing_name: formData.mailingName,
            mailing_address: formData.customerDescription,
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
            tax_type: formData.gstGroupType || formData.taxType || '',
            gst_ledger_nature: formData.gstLedgerNature || '',
            acquisition_source: formData.acquisitionSource,
            referred_by: formData.referredBy,
            status: initialData?.status || 'active',
            // Fixed Asset Fields
            asset_category: formData.assetCategory,
            purchase_date: formData.purchaseDate || null,
            purchase_value: parseFloat(formData.purchaseValue) || 0,
            depreciation_method: formData.depreciationMethod,
            depreciation_rate: parseFloat(formData.depreciationRate) || 0,
            useful_life: parseFloat(formData.useful_life) || 0,
            created_at: initialData?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Add properties if applicable
        if (showField('properties')) {
            // Validate property fields if any part of a property is filled
            const invalidProp = properties.find(p => {
                const isNotEmpty = p.name.trim() || p.address.trim() || p.flat_number?.trim() || p.building_name?.trim() || p.locality?.trim() || p.pincode?.trim();
                if (isNotEmpty) {
                    return !p.address?.trim() || !p.flat_number?.trim() || !p.building_name?.trim() || !p.locality?.trim() || !p.pincode?.trim();
                }
                return false;
            });

            if (invalidProp) {
                setErrors(prev => ({ ...prev, properties: 'Please fill all mandatory property fields (Flat/Wing, Building Name, Street Address/Area, Locality, Pincode) for the added properties.' }));
                return;
            }

            account.properties = properties.filter(p => p.name.trim() !== '' || p.address.trim() !== '' || p.flat_number?.trim() || p.building_name?.trim());
        }

        if (onSave) {
            onSave(account);
            // Note: onClose is called by the parent (AccountsTab.handleFormSave) on success.
            // Do NOT call onClose() here — it creates a race condition where the form closes
            // before the async save completes, preventing error recovery.
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

    // Add local state for date text so typing/backspace doesn't fight YYYY-MM-DD constraint
    const [dateInputStr, setDateInputStr] = useState(() => {
        if (!formData.asOnDate) return '';
        const parts = formData.asOnDate.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return '';
    });
    
    // Sync local date text back when asOnDate changes externally (e.g. edit mode initialization)
    useEffect(() => {
        if (formData.asOnDate) {
            const parts = formData.asOnDate.split('-');
            if (parts.length === 3 && dateInputStr.length !== 10) {
                setDateInputStr(`${parts[2]}/${parts[1]}/${parts[0]}`);
            }
        }
    }, [formData.asOnDate]);

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
                                        <label className="form-label">Account Code *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.sku}
                                            disabled
                                            placeholder="Auto-generated"
                                            style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
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
                                            style={{ colorScheme: 'dark' }}
                                            value={formData.asOnDate || ''}
                                            onChange={e => setFormData({ ...formData, asOnDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Status Field */}
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
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
                                                    <label className="form-label">Mobile Number *</label>
                                                    <input
                                                        type="tel"
                                                        className="form-input"
                                                        value={formData.mobile}
                                                        onChange={(e) => handleMobileChange(e.target.value)}
                                                        onBlur={() => {
                                                            if (!formData.mobile.trim()) setErrors(prev => ({ ...prev, mobile: 'Mobile Number is required' }));
                                                        }}
                                                        placeholder="+91 98765 43210"
                                                        pattern="[0-9+\s\(\)\-]*"
                                                        title="Please enter a valid 10-digit mobile number"
                                                        style={{ borderColor: errors.mobile ? '#ef4444' : undefined }}
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
                                    {showField('properties') && (
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
                                            {errors.properties && (
                                                <div style={{ color: '#ef4444', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                                                    {errors.properties}
                                                </div>
                                            )}

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



                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Flat / Wing *</label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={property.flat_number || ''}
                                                                onChange={(e) => updateProperty(index, 'flat_number', e.target.value)}
                                                                placeholder="e.g. A-402"
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Building Name *</label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={property.building_name || ''}
                                                                onChange={(e) => updateProperty(index, 'building_name', e.target.value)}
                                                                placeholder="e.g. Sunrise Residency"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                                        <label className="form-label">Street Address / Area *</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={property.address}
                                                            onChange={(e) => updateProperty(index, 'address', e.target.value)}
                                                            placeholder="e.g. Opposite Bank of India, MG Road"
                                                        />
                                                    </div>

                                                    {/* Pin Drop Map */}
                                                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                                        <ClientPinDropMap
                                                            label="📍 Confirm location on map"
                                                            building={property.building_name || ''}
                                                            street={property.address || ''}
                                                            localityQuery={property.locality || ''}
                                                            pincodeQuery={property.pincode || ''}
                                                            initialLat={property.lat}
                                                            initialLng={property.lng}
                                                            onChange={({ lat, lng }) => {
                                                                updateProperty(index, 'lat', lat);
                                                                updateProperty(index, 'lng', lng);
                                                            }}
                                                            height="200px"
                                                        />
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Locality *</label>
                                                            <select
                                                                className="form-select"
                                                                value={property.locality}
                                                                onChange={(e) => handlePropertyLocalityChange(index, e.target.value)}
                                                            >
                                                                <option value="">Select Locality</option>
                                                                {MUMBAI_LOCALITIES.map((loc) => (
                                                                    <option key={loc.name} value={loc.name}>
                                                                        {loc.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Pincode *</label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={property.pincode}
                                                                onChange={(e) => updateProperty(index, 'pincode', e.target.value)}
                                                                placeholder="e.g. 400053"
                                                                maxLength={6}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Property Type */}
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Property Type</label>
                                                        <select
                                                            className="form-select"
                                                            value={property.property_type || 'residential'}
                                                            onChange={(e) => updateProperty(index, 'property_type', e.target.value)}
                                                        >
                                                            <option value="residential">Residential</option>
                                                            <option value="commercial">Commercial</option>
                                                            <option value="industrial">Industrial</option>
                                                        </select>
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

                                            {showField('customerDescription') && (
                                                <div className="form-group">
                                                    <label className="form-label">Customer Description</label>
                                                    <textarea
                                                        className="form-input"
                                                        value={formData.customerDescription || ''}
                                                        onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                                                        rows="3"
                                                        placeholder="Add any specific notes or context deeply specific to this customer..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Credit Limit, Period & Price Level */}
                                    {(showField('creditLimit') || showField('creditPeriod') || showField('priceLevel')) && (
                                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
                                            {showField('priceLevel') && (
                                                <div className="form-group">
                                                    <label className="form-label">Price Level</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.priceLevel}
                                                        onChange={(e) => setFormData({ ...formData, priceLevel: e.target.value })}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        <option value="retail">Retail</option>
                                                        <option value="wholesale">Wholesale</option>
                                                        <option value="dealer">Dealer</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Customer Description */}
                                    {showField('customerDescription') && (
                                        <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                                            <label className="form-label">Customer Description *</label>
                                            <textarea
                                                className="form-input"
                                                value={formData.customerDescription || ''}
                                                onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                                                onBlur={() => { if (!formData.customerDescription?.trim()) setErrors(prev => ({ ...prev, customerDescription: 'Customer Description is required' })); else setErrors(prev => { const e = {...prev}; delete e.customerDescription; return e; }); }}
                                                rows="3"
                                                placeholder="Specific notes or context about this customer..."
                                                style={{ resize: 'vertical', borderColor: errors.customerDescription ? '#ef4444' : undefined }}
                                            />
                                            {errors.customerDescription && (
                                                <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.customerDescription}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* GST Ledger Properties — shown for Duties & Taxes type groups */}
                                    {(() => {
                                        const selectedGroup = groups.find(g => g.id === formData.under);
                                        const groupName = (selectedGroup?.name || selectedGroup?.label || '').toLowerCase();
                                        const parentName = (selectedGroup?.parent_name || selectedGroup?.parent_label || '').toLowerCase();
                                        const isDutiesTax = groupName.includes('duties') || groupName.includes('tax') || parentName.includes('duties') || parentName.includes('tax');
                                        if (!isDutiesTax) return null;
                                        return (
                                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: '#6366f1' }}>GST Ledger Properties</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">GST Group Type</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.gstGroupType || ''}
                                                            onChange={(e) => setFormData({ ...formData, gstGroupType: e.target.value })}
                                                        >
                                                            <option value="">-- Select --</option>
                                                            <option value="CGST">CGST (Central GST)</option>
                                                            <option value="SGST">SGST (State GST)</option>
                                                            <option value="IGST">IGST (Integrated GST)</option>
                                                            <option value="UTGST">UTGST (Union Territory GST)</option>
                                                            <option value="CESS">GST Cess</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">GST Rate (%)</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.taxRate || 0}
                                                            onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                                                        >
                                                            <option value={0}>0% (Exempt)</option>
                                                            <option value={0.1}>0.1%</option>
                                                            <option value={0.25}>0.25%</option>
                                                            <option value={1.5}>1.5%</option>
                                                            <option value={3}>3%</option>
                                                            <option value={5}>5%</option>
                                                            <option value={6}>6%</option>
                                                            <option value={12}>12%</option>
                                                            <option value={18}>18%</option>
                                                            <option value={28}>28%</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">GST Ledger Nature</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.gstLedgerNature || 'output'}
                                                            onChange={(e) => setFormData({ ...formData, gstLedgerNature: e.target.value })}
                                                        >
                                                            <option value="output">Output Tax (Liability)</option>
                                                            <option value="input">Input Tax Credit (Asset)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Acquisition Fields */}
                                    {(showField('acquisitionSource') || showField('referredBy')) && (
                                        <div style={{
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            marginBottom: 'var(--spacing-md)'
                                        }}>
                                            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: '#3b82f6' }}>
                                                Acquisition Details
                                            </h3>
                                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                                {showField('acquisitionSource') && (
                                                    <div className="form-group">
                                                        <label className="form-label">Acquisition Source *</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.acquisitionSource}
                                                            onChange={(e) => setFormData({ ...formData, acquisitionSource: e.target.value })}
                                                            onBlur={() => { if (!formData.acquisitionSource) setErrors(prev => ({ ...prev, acquisitionSource: 'Acquisition Source is required' })); else setErrors(prev => { const e = {...prev}; delete e.acquisitionSource; return e; }); }}
                                                            style={{ borderColor: errors.acquisitionSource ? '#ef4444' : undefined }}
                                                        >
                                                            <option value="">-- Select Source --</option>
                                                            <option value="direct">Direct / Walk-in</option>
                                                            <option value="referral">Referral</option>
                                                            <option value="google">Google Ads</option>
                                                            <option value="social">Social Media</option>
                                                            <option value="website">Website Organic</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                        {errors.acquisitionSource && (
                                                            <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>{errors.acquisitionSource}</span>
                                                        )}
                                                    </div>
                                                )}
                                                {showField('referredBy') && (
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Referred By</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={formData.referredBy}
                                                            onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                                                            placeholder="Name or details"
                                                        />
                                                    </div>
                                                )}
                                            </div>
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
