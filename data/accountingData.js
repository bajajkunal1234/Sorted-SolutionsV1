// Account Groups Hierarchy (Tally-compatible)
// Account Groups Hierarchy (Tally-compatible)
export const accountGroups = [
    // Primary - Assets
    { id: 'current-assets', name: 'Current Assets', parent: null, nature: 'asset' },
    { id: 'fixed-assets', name: 'Fixed Assets', parent: null, nature: 'asset' },
    { id: 'investments', name: 'Investments', parent: null, nature: 'asset' },
    { id: 'stock-in-hand', name: 'Stock-in-Hand', parent: 'current-assets', nature: 'asset' },
    { id: 'cash-in-hand', name: 'Cash-in-Hand', parent: 'current-assets', nature: 'asset' },
    { id: 'bank-accounts', name: 'Bank Accounts', parent: 'current-assets', nature: 'asset' },
    { id: 'sundry-debtors', name: 'Sundry Debtors', parent: 'current-assets', nature: 'asset' },
    { id: 'deposits-asset', name: 'Deposits (Asset)', parent: 'current-assets', nature: 'asset' },
    { id: 'loans-advances-asset', name: 'Loans & Advances (Asset)', parent: 'current-assets', nature: 'asset' },
    { id: 'misc-expenses-asset', name: 'Misc. Expenses (ASSET)', parent: null, nature: 'asset' },

    // Primary - Liabilities
    { id: 'capital-account', name: 'Capital Account', parent: null, nature: 'liability' },
    { id: 'reserves-surplus', name: 'Reserves & Surplus', parent: 'capital-account', nature: 'liability' },
    { id: 'retained-earnings', name: 'Retained Earnings', parent: 'capital-account', nature: 'liability' },
    { id: 'current-liabilities', name: 'Current Liabilities', parent: null, nature: 'liability' },
    { id: 'duties-taxes', name: 'Duties & Taxes', parent: 'current-liabilities', nature: 'liability' },
    { id: 'provisions', name: 'Provisions', parent: 'current-liabilities', nature: 'liability' },
    { id: 'sundry-creditors', name: 'Sundry Creditors', parent: 'current-liabilities', nature: 'liability' },
    { id: 'loans-liability', name: 'Loans (Liability)', parent: null, nature: 'liability' },
    { id: 'secured-loans', name: 'Secured Loans', parent: 'loans-liability', nature: 'liability' },
    { id: 'unsecured-loans', name: 'Unsecured Loans', parent: 'loans-liability', nature: 'liability' },
    { id: 'bank-od-ac', name: 'Bank OD A/c', parent: 'loans-liability', nature: 'liability' },
    { id: 'bank-occ-ac', name: 'Bank OCC A/c', parent: 'loans-liability', nature: 'liability' },

    // Primary - Incomes
    { id: 'sales-accounts', name: 'Sales Accounts', parent: null, nature: 'income' },
    { id: 'direct-incomes', name: 'Direct Incomes', parent: null, nature: 'income' },
    { id: 'income-direct', name: 'Income (Direct)', parent: 'direct-incomes', nature: 'income' },
    { id: 'indirect-incomes', name: 'Indirect Incomes', parent: null, nature: 'income' },
    { id: 'income-indirect', name: 'Income (Indirect)', parent: 'indirect-incomes', nature: 'income' },

    // Primary - Expenses
    { id: 'purchase-accounts', name: 'Purchase Accounts', parent: null, nature: 'expense' },
    { id: 'direct-expenses', name: 'Direct Expenses', parent: null, nature: 'expense' },
    { id: 'expenses-direct', name: 'Expenses (Direct)', parent: 'direct-expenses', nature: 'expense' },
    { id: 'indirect-expenses', name: 'Indirect Expenses', parent: null, nature: 'expense' },
    { id: 'expenses-indirect', name: 'Expenses (Indirect)', parent: 'indirect-expenses', nature: 'expense' },

    // Others
    { id: 'branch-divisions', name: 'Branch / Divisions', parent: null, nature: 'liability' },
    { id: 'suspense-ac', name: 'Suspense A/c', parent: null, nature: 'liability' }
];

// Sample Ledgers
export const sampleLedgers = [
    {
        id: 'led-001',
        sku: 'CX-001',
        name: 'Rajesh Kumar',
        type: 'customer',
        under: 'customer-accounts',
        subGroup: null,
        address: {
            line1: 'A-101, Shanti Nagar',
            line2: 'Near Railway Station',
            locality: 'Jogeshwari West',
            pincode: '400102',
            state: 'Maharashtra',
            country: 'India'
        },
        properties: [
            {
                id: 'prop-001',
                label: 'Home',
                address: {
                    line1: 'A-101, Shanti Nagar',
                    line2: 'Near Railway Station',
                    locality: 'Jogeshwari West',
                    pincode: '400102',
                    state: 'Maharashtra'
                }
            }
        ],
        phone: '+91 98765 43210',
        email: 'rajesh@example.com',
        gstApplicable: false,
        leadSource: 'Word of Mouth',
        openingBalance: 0,
        closingBalance: 5000,
        jobsDone: 3,
        createdAt: '2026-01-10T10:00:00',
        interactions: []
    },
    {
        id: 'led-002',
        sku: 'CX-002',
        name: 'Priya Sharma',
        type: 'customer',
        under: 'customer-accounts',
        subGroup: null,
        address: {
            line1: 'B-205, Green Valley',
            line2: 'Opposite Metro Station',
            locality: 'Malad East',
            pincode: '400097',
            state: 'Maharashtra',
            country: 'India'
        },
        properties: [
            {
                id: 'prop-002',
                label: 'Home',
                address: {
                    line1: 'B-205, Green Valley',
                    line2: 'Opposite Metro Station',
                    locality: 'Malad East',
                    pincode: '400097',
                    state: 'Maharashtra'
                }
            }
        ],
        phone: '+91 98765 43211',
        email: 'priya@example.com',
        gstApplicable: false,
        leadSource: 'Google Search',
        openingBalance: 0,
        closingBalance: -2000,
        jobsDone: 2,
        createdAt: '2026-01-11T14:30:00',
        interactions: []
    },
    {
        id: 'led-003',
        sku: 'TX-001',
        name: 'Amit Patel',
        type: 'technician',
        under: 'sundry-creditors',
        subGroup: null,
        address: {
            line1: 'C-12, Tech Colony',
            line2: 'Near Bus Depot',
            locality: 'Andheri West',
            pincode: '400053',
            state: 'Maharashtra',
            country: 'India'
        },
        phone: '+91 98765 11111',
        email: 'amit@sortedsolutions.in',
        gstApplicable: false,
        leadSource: 'Employee',
        openingBalance: 0,
        closingBalance: 15000,
        jobsDone: 0,
        createdAt: '2026-01-05T09:00:00',
        interactions: []
    },
    {
        id: 'led-004',
        sku: 'CASH',
        name: 'Cash in Hand',
        type: 'cash',
        under: 'cash-in-hand',
        subGroup: null,
        openingBalance: 10000,
        closingBalance: 25000,
        jobsDone: 0,
        createdAt: '2026-01-01T00:00:00',
        interactions: []
    },
    {
        id: 'led-005',
        sku: 'SUP-001',
        name: 'LG Spares Supplier',
        type: 'supplier',
        under: 'supplier-accounts',
        subGroup: null,
        address: {
            line1: 'Shop 45, Electronics Market',
            line2: 'Lamington Road',
            locality: 'Grant Road',
            pincode: '400007',
            state: 'Maharashtra',
            country: 'India'
        },
        phone: '+91 98765 99999',
        email: 'lg.spares@example.com',
        gstApplicable: true,
        gstin: '27AABCU9603R1ZM',
        gstRate: 18,
        leadSource: 'Direct',
        openingBalance: 0,
        closingBalance: -50000,
        jobsDone: 0,
        createdAt: '2026-01-01T00:00:00',
        interactions: []
    }
];

// Sample Products
export const sampleProducts = [
    {
        id: 'prod-001',
        name: 'Washing Machine Repair Service',
        type: 'service',
        hsnCode: '998599',
        hsnDescription: 'Repair and maintenance services',
        unit: 'Service',
        defaultRate: 800,
        gstRate: 18,
        salesAccount: 'sales-18'
    },
    {
        id: 'prod-002',
        name: 'AC Gas Refill',
        type: 'service',
        hsnCode: '998599',
        hsnDescription: 'Repair and maintenance services',
        unit: 'Service',
        defaultRate: 1500,
        gstRate: 18,
        salesAccount: 'sales-18'
    },
    {
        id: 'prod-003',
        name: 'WM Drain Pump',
        type: 'product',
        hsnCode: '84137090',
        hsnDescription: 'Pumps for liquids',
        unit: 'Piece',
        defaultRate: 450,
        gstRate: 18,
        salesAccount: 'sales-18'
    },
    {
        id: 'prod-004',
        name: 'Microwave Magnetron',
        type: 'product',
        hsnCode: '85404000',
        hsnDescription: 'Electronic tubes',
        unit: 'Piece',
        defaultRate: 1200,
        gstRate: 18,
        salesAccount: 'sales-18'
    }
];

// GST Rates
export const gstRates = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' }
];

// Lead Sources
export const leadSources = [
    { value: 'word-of-mouth', label: 'Word of Mouth' },
    { value: 'google-search', label: 'Google Search' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'referral', label: 'Referral' },
    { value: 'direct', label: 'Direct' },
    { value: 'other', label: 'Other' }
];

// Terms & Conditions Templates
export const termsTemplates = [
    {
        id: 'standard',
        name: 'Standard Terms',
        content: `1. Payment is due within 7 days of invoice date.
2. All repairs carry a 30-day warranty.
3. Spare parts are covered under manufacturer warranty.
4. Service charges are non-refundable.
5. Prices are inclusive of GST as applicable.`
    },
    {
        id: 'warranty',
        name: 'Warranty Service',
        content: `1. This is a warranty service - No charges applicable.
2. Only manufacturing defects are covered.
3. Physical damage is not covered under warranty.
4. Warranty void if tampered by unauthorized personnel.`
    }
];

// Invoice Tags
export const invoiceTags = [
    { value: 'quotation-converted', label: 'Quotation Converted', color: '#3b82f6' },
    { value: 'discounted', label: 'Discounted', color: '#f59e0b' },
    { value: 'warranty', label: 'Warranty', color: '#10b981' },
    { value: 'urgent', label: 'Urgent', color: '#ef4444' },
    { value: 'vip', label: 'VIP', color: '#ec4899' }
];

// Company Details (for invoices)
export const companyDetails = {
    name: 'Sorted Solutions',
    address: {
        line1: 'Shop No. 12, Ground Floor',
        line2: 'Shanti Complex, SV Road',
        locality: 'Malad West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400064',
        country: 'India'
    },
    phone: '+91 98765 00000',
    email: 'admin@sortedsolutions.in',
    website: 'www.sortedsolutions.in',
    gstin: '27XXXXX1234X1ZX', // Placeholder
    pan: 'XXXXX1234X',
    stateCode: '27' // Maharashtra
};

// Chart of Accounts Field Mappings
export const coaFieldMappings = {
    'sundry-debtors': {
        fields: ['accountImage', 'contactPerson', 'mobile', 'email', 'mailingName', 'gstRegistration', 'gstin', 'pan', 'mailingAddress', 'billingAddress', 'shippingAddress', 'creditLimit', 'creditPeriod', 'priceLevel', 'stateName', 'country'],
        canHaveLedgers: true,
        defaultNature: 'asset'
    },
    'sundry-creditors': {
        fields: ['accountImage', 'contactPerson', 'mobile', 'email', 'mailingName', 'gstRegistration', 'gstin', 'pan', 'mailingAddress', 'billingAddress', 'shippingAddress', 'creditPeriod', 'stateName', 'country'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    },
    'bank-accounts': {
        fields: ['accountNumber', 'bankName', 'branch', 'ifscCode', 'micrCode', 'accountType', 'enableChequePrinting'],
        canHaveLedgers: true,
        defaultNature: 'asset'
    },
    'bank-od-ac': {
        fields: ['accountNumber', 'bankName', 'branch', 'ifscCode', 'micrCode', 'accountType', 'enableChequePrinting'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    },
    'bank-occ-ac': {
        fields: ['accountNumber', 'bankName', 'branch', 'ifscCode', 'micrCode', 'accountType', 'enableChequePrinting'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    },
    'cash-in-hand': {
        fields: ['currency'],
        canHaveLedgers: true,
        defaultNature: 'asset'
    },
    'duties-taxes': {
        fields: ['taxType', 'taxRate', 'roundingMethod'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    },
    'direct-expenses': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'expense'
    },
    'indirect-expenses': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'expense'
    },
    'direct-incomes': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'income'
    },
    'indirect-incomes': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'costCenterAllocation', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'income'
    },
    'sales-accounts': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'income'
    },
    'purchase-accounts': {
        fields: ['gstApplicable', 'gstRegistration', 'gstin', 'inventoryAffected'],
        canHaveLedgers: true,
        defaultNature: 'expense'
    },
    'fixed-assets': {
        fields: ['assetCategory', 'purchaseDate', 'purchaseValue', 'depreciationMethod', 'depreciationRate', 'usefulLife'],
        canHaveLedgers: true,
        defaultNature: 'asset'
    },
    'capital-account': {
        fields: ['pan', 'mailingAddress', 'stateName', 'country'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    },
    'loans-liability': {
        fields: ['pan', 'mailingAddress', 'stateName', 'country'],
        canHaveLedgers: true,
        defaultNature: 'liability'
    }
};

// Primary COA Groups (Top Level)
export const primaryCOAGroups = [
    { id: 'capital-account', name: 'Capital Account', nature: 'liability' },
    { id: 'current-assets', name: 'Current Assets', nature: 'asset' },
    { id: 'current-liabilities', name: 'Current Liabilities', nature: 'liability' },
    { id: 'fixed-assets', name: 'Fixed Assets', nature: 'asset' },
    { id: 'direct-expenses', name: 'Direct Expenses', nature: 'expense' },
    { id: 'indirect-expenses', name: 'Indirect Expenses', nature: 'expense' },
    { id: 'direct-incomes', name: 'Direct Incomes', nature: 'income' },
    { id: 'indirect-incomes', name: 'Indirect Incomes', nature: 'income' },
    { id: 'duties-taxes', name: 'Duties & Taxes', nature: 'liability' }
];

