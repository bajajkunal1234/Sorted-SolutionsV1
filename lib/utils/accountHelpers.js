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
            const parts = acc.sku.split('-');
            const numPart = parts.length > 1 ? parts[1] : acc.sku.replace(prefix, '');
            return parseInt(numPart) || 0;
        });

    const maxNumber = existingSKUs.length > 0 ? Math.max(...existingSKUs) : startingNumber - 1;
    const nextNumber = maxNumber + 1;

    const paddedNumber = String(nextNumber).padStart(padding, '0');

    return prefix.endsWith('-') ? `${prefix}${paddedNumber}` : `${prefix}-${paddedNumber}`;
};

// Generate Short KU / Alias based on Group
export const generateShortKU = (underGroup, existingAccounts, groups = []) => {
    let prefix = 'A'; // Generic Account

    const group = groups.find(g => g.id === underGroup);
    const groupName = group?.name?.toLowerCase() || '';

    if (underGroup === 'customer-accounts' || underGroup === 'sundry-debtors' || groupName.includes('customer') || groupName === 'sundry debtors') {
        prefix = 'C';
    } else if (underGroup === 'supplier-accounts' || underGroup === 'sundry-creditors' || groupName.includes('supplier') || groupName === 'sundry creditors') {
        prefix = 'S';
    } else if (underGroup === 'bank-accounts' || groupName.includes('bank')) {
        prefix = 'B';
    } else if (underGroup === 'fixed-assets' || groupName.includes('fixed asset')) {
        prefix = 'FA';
    }

    // Find next number for this prefix
    const existingNums = existingAccounts
        .filter(acc => acc.sku && acc.sku.startsWith(prefix))
        .map(acc => {
            const numPart = acc.sku.substring(prefix.length);
            return parseInt(numPart) || 0;
        })
        .filter(n => n > 0);

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 101;
    return `${prefix}${nextNum}`;
};

// Get required fields based on account group (with inheritance)
export const getRequiredFields = (underGroup, groups = []) => {
    const fieldMappings = {
        'sundry-debtors': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditLimit', 'creditPeriod', 'priceLevel', 'properties'
        ],
        'customer-accounts': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditLimit', 'creditPeriod', 'priceLevel', 'properties'
        ],
        'sundry-creditors': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditPeriod', 'properties'
        ],
        'supplier-accounts': [
            'accountImage', 'contactPerson', 'mobile', 'email', 'mailingName',
            'gstRegistration', 'gstin', 'pan', 'stateName', 'country',
            'mailingAddress', 'billingAddress', 'shippingAddress',
            'creditPeriod', 'properties'
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

    // Check if the group itself has mappings
    if (fieldMappings[underGroup]) {
        return fieldMappings[underGroup];
    }

    // If not, traverse up the parent tree
    let currentGroupId = underGroup;
    while (currentGroupId) {
        const group = groups.find(g => g.id === currentGroupId);
        if (!group || !group.parent) break;

        if (fieldMappings[group.parent]) {
            return fieldMappings[group.parent];
        }
        currentGroupId = group.parent;
    }

    return [];
};

// Validate account data
export const validateAccountData = (data, underGroup, groups = []) => {
    const errors = {};

    // Common validations
    if (!data.name || !data.name.trim()) {
        errors.name = 'Account name is required';
    }

    if (!data.under) {
        errors.under = 'Please select account group';
    }

    // Type-specific validations (with inheritance)
    const requiredFields = getRequiredFields(underGroup, groups);

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
