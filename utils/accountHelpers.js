// Helper function to generate initials avatar
export const generateInitialsAvatar = (name) => {
    if (!name) return '';

    const words = name.trim().split(' ');
    let initials = '';

    if (words.length === 1) {
        initials = words[0].substring(0, 2).toUpperCase();
    } else {
        initials = words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase();
    }

    // Generate color based on name
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];

    const charCode = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    const colorIndex = charCode % colors.length;

    return {
        initials,
        backgroundColor: colors[colorIndex],
        textColor: '#FFFFFF'
    };
};

// Check for duplicate account names
export const checkDuplicateName = (name, existingAccounts) => {
    if (!name || !existingAccounts) return null;

    const trimmedName = name.trim().toLowerCase();
    const duplicate = existingAccounts.find(
        acc => acc.name.toLowerCase() === trimmedName
    );

    return duplicate || null;
};

// Generate SKU based on settings
export const generateSKU = (accountType, existingAccounts, settings = {}) => {
    const {
        autoGenerate = true,
        prefix = 'ACC',
        format = 'numeric',
        startingNumber = 1,
        padding = 4
    } = settings;

    if (!autoGenerate) return '';

    // Get existing SKUs with same prefix
    const existingSKUs = existingAccounts
        .filter(acc => acc.sku && acc.sku.startsWith(prefix))
        .map(acc => {
            const numPart = acc.sku.replace(prefix + '-', '');
            return parseInt(numPart) || 0;
        });

    const maxNumber = existingSKUs.length > 0 ? Math.max(...existingSKUs) : startingNumber - 1;
    const nextNumber = maxNumber + 1;

    const paddedNumber = String(nextNumber).padStart(padding, '0');

    return `${prefix}-${paddedNumber}`;
};

// Get required fields based on account group
export const getRequiredFields = (underGroup) => {
    const fieldMappings = {
        'sundry-debtors': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditLimit', 'creditPeriod', 'priceLevel'
        ],
        'customer-accounts': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditLimit', 'creditPeriod', 'priceLevel'
        ],
        'sundry-creditors': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditPeriod'
        ],
        'supplier-accounts': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditPeriod'
        ],
        'bank-accounts': [
            'accountNumber', 'bankName', 'branch', 'ifscCode', 'micrCode',
            'accountType', 'enableChequePrinting'
        ],
        'cash-in-hand': [
            'currency'
        ],
        'cgst': ['taxRate', 'roundingMethod'],
        'sgst': ['taxRate', 'roundingMethod'],
        'igst': ['taxRate', 'roundingMethod'],
        'duties-taxes': ['taxType', 'taxRate', 'roundingMethod'],
        'direct-expenses': ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        'indirect-expenses': ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        'direct-incomes': ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        'indirect-incomes': ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        'fixed-assets': [
            'assetCategory', 'purchaseDate', 'purchaseValue',
            'depreciationMethod', 'depreciationRate', 'usefulLife'
        ]
    };

    return fieldMappings[underGroup] || [];
};

// Validate account data
export const validateAccountData = (data, underGroup) => {
    const errors = {};

    // Common validations
    if (!data.name || !data.name.trim()) {
        errors.name = 'Account name is required';
    }

    if (!data.under) {
        errors.under = 'Please select account group';
    }

    // Type-specific validations
    const requiredFields = getRequiredFields(underGroup);

    if (requiredFields.includes('mobile') && data.mobile) {
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(data.mobile.replace(/\D/g, ''))) {
            errors.mobile = 'Invalid mobile number';
        }
    }

    if (requiredFields.includes('email') && data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.email = 'Invalid email address';
        }
    }

    if (requiredFields.includes('gstin') && data.gstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(data.gstin)) {
            errors.gstin = 'Invalid GSTIN format';
        }
    }

    if (requiredFields.includes('pan') && data.pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(data.pan)) {
            errors.pan = 'Invalid PAN format';
        }
    }

    if (requiredFields.includes('ifscCode') && data.ifscCode) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(data.ifscCode)) {
            errors.ifscCode = 'Invalid IFSC code format';
        }
    }

    return errors;
};

// Build COA tree structure
export const buildCOATree = (groups) => {
    const tree = [];
    const groupMap = {};

    // Create map of all groups
    groups.forEach(group => {
        groupMap[group.id] = { ...group, children: [] };
    });

    // Build tree structure
    groups.forEach(group => {
        if (group.parent) {
            if (groupMap[group.parent]) {
                groupMap[group.parent].children.push(groupMap[group.id]);
            }
        } else {
            tree.push(groupMap[group.id]);
        }
    });

    return tree;
};

// Get group path (for display)
export const getGroupPath = (groupId, groups) => {
    const path = [];
    let currentId = groupId;

    while (currentId) {
        const group = groups.find(g => g.id === currentId);
        if (!group) break;

        path.unshift(group.name);
        currentId = group.parent;
    }

    return path.join(' > ');
};
