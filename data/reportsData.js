// Sample transaction data for Daybook
export const sampleTransactions = [
    {
        id: 'txn-001',
        date: '2026-01-16T09:30:00',
        type: 'sales',
        voucherNo: 'INV-2026-0001',
        account: 'Rajesh Kumar',
        debit: 0,
        credit: 5500,
        narration: 'AC Repair Service - Split AC 1.5 Ton',
        reference: 'JOB-004'
    },
    {
        id: 'txn-002',
        date: '2026-01-16T11:15:00',
        type: 'receipt',
        voucherNo: 'RCP-2026-0001',
        account: 'Rajesh Kumar',
        debit: 5500,
        credit: 0,
        narration: 'Payment received for INV-2026-0001',
        reference: 'INV-2026-0001'
    },
    {
        id: 'txn-003',
        date: '2026-01-16T14:20:00',
        type: 'purchase',
        voucherNo: 'PUR-2026-0001',
        account: 'LG Spares Supplier',
        debit: 1200,
        credit: 0,
        narration: 'AC Capacitor 2.5MFD - 10 pieces',
        reference: 'PO-001'
    },
    {
        id: 'txn-004',
        date: '2026-01-16T16:45:00',
        type: 'payment',
        voucherNo: 'PAY-2026-0001',
        account: 'Petrol Expense',
        debit: 800,
        credit: 0,
        narration: 'Technician fuel expense - Amit Patel',
        reference: 'EXP-001'
    },
    {
        id: 'txn-005',
        date: '2026-01-15T10:00:00',
        type: 'sales',
        voucherNo: 'INV-2026-0002',
        account: 'Priya Sharma',
        debit: 0,
        credit: 1500,
        narration: 'Microwave Repair Service',
        reference: 'JOB-002'
    }
];

// Sample expense data for Daily Expenses
export const sampleExpenses = [
    {
        id: 'exp-001',
        technicianId: 't1',
        technicianName: 'Amit Patel',
        date: '2026-01-16T08:30:00',
        category: 'petrol',
        amount: 800,
        description: 'Fuel for field visits - Malad to Andheri',
        receipt: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=400',
        jobId: 'JOB-002',
        status: 'pending',
        submittedDate: '2026-01-16T18:00:00'
    },
    {
        id: 'exp-002',
        technicianId: 't2',
        technicianName: 'Rahul Singh',
        date: '2026-01-16T12:00:00',
        category: 'spare_parts',
        amount: 450,
        description: 'Emergency purchase - AC drain pump',
        receipt: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
        jobId: 'JOB-003',
        status: 'pending',
        submittedDate: '2026-01-16T17:30:00'
    },
    {
        id: 'exp-003',
        technicianId: 't1',
        technicianName: 'Amit Patel',
        date: '2026-01-15T13:30:00',
        category: 'food',
        amount: 200,
        description: 'Lunch during extended job',
        receipt: null,
        jobId: 'JOB-001',
        status: 'approved',
        approvedBy: 'admin',
        approvedDate: '2026-01-15T19:00:00',
        notes: 'Approved - Extended job duration'
    },
    {
        id: 'exp-004',
        technicianId: 't2',
        technicianName: 'Rahul Singh',
        date: '2026-01-14T09:00:00',
        category: 'travel',
        amount: 150,
        description: 'Auto fare - Bandra to Malad',
        receipt: null,
        jobId: 'JOB-005',
        status: 'rejected',
        approvedBy: 'admin',
        approvedDate: '2026-01-14T20:00:00',
        notes: 'Rejected - Company vehicle was available'
    }
];

// Sample issues data
export const sampleIssues = [
    { id: 'i1', name: 'Not Starting', category: 'washing-machine', active: true },
    { id: 'i2', name: 'Sparking Inside', category: 'microwave', active: true },
    { id: 'i3', name: 'Not Cooling', category: 'air-conditioner', active: true },
    { id: 'i4', name: 'Unusual Noise', category: 'refrigerator', active: true },
    { id: 'i5', name: 'Water Leakage', category: 'washing-machine', active: true },
    { id: 'i6', name: 'Not Heating', category: 'microwave', active: true },
    { id: 'i7', name: 'Display Not Working', category: 'washing-machine', active: true },
    { id: 'i8', name: 'Door Not Closing', category: 'refrigerator', active: true },
    { id: 'i9', name: 'Gas Leakage', category: 'air-conditioner', active: true }
];

// Voucher numbering settings
export const voucherNumberingDefaults = [
    {
        voucherType: 'sales',
        prefix: 'INV',
        startingNumber: 1,
        currentNumber: 2,
        padding: 4,
        resetFrequency: 'yearly',
        lastResetDate: '2026-01-01T00:00:00',
        suffix: '',
        format: 'INV-2026-0001'
    },
    {
        voucherType: 'purchase',
        prefix: 'PUR',
        startingNumber: 1,
        currentNumber: 1,
        padding: 4,
        resetFrequency: 'yearly',
        lastResetDate: '2026-01-01T00:00:00',
        suffix: '',
        format: 'PUR-2026-0001'
    },
    {
        voucherType: 'receipt',
        prefix: 'RCP',
        startingNumber: 1,
        currentNumber: 1,
        padding: 4,
        resetFrequency: 'monthly',
        lastResetDate: '2026-01-01T00:00:00',
        suffix: '',
        format: 'RCP-2026-0001'
    },
    {
        voucherType: 'payment',
        prefix: 'PAY',
        startingNumber: 1,
        currentNumber: 1,
        padding: 4,
        resetFrequency: 'monthly',
        lastResetDate: '2026-01-01T00:00:00',
        suffix: '',
        format: 'PAY-2026-0001'
    }
];

export const expenseCategories = [
    { id: 'petrol', label: 'Petrol/Fuel', color: '#f59e0b' },
    { id: 'spare_parts', label: 'Spare Parts', color: '#3b82f6' },
    { id: 'food', label: 'Food', color: '#10b981' },
    { id: 'travel', label: 'Travel', color: '#8b5cf6' },
    { id: 'other', label: 'Other', color: '#6b7280' }
];

// Sample pre-visit requirements data
export const sampleRequirements = [
    {
        id: 'req-001',
        productCategory: 'washing-machine',
        brand: 'LG',
        issue: 'Not Starting',
        requirements: [
            { item: 'Multimeter', quantity: 1, mandatory: true, notes: 'For electrical testing' },
            { item: 'Screwdriver Set', quantity: 1, mandatory: true, notes: 'Phillips and flathead' },
            { item: 'Door Lock Assembly', quantity: 1, mandatory: false, notes: 'Common failure point' },
            { item: 'Control Board', quantity: 1, mandatory: false, notes: 'Backup if needed' }
        ],
        active: true
    },
    {
        id: 'req-002',
        productCategory: 'air-conditioner',
        brand: 'Samsung',
        issue: 'Not Cooling',
        requirements: [
            { item: 'Gas Pressure Gauge', quantity: 1, mandatory: true, notes: 'Check refrigerant' },
            { item: 'Leak Detector', quantity: 1, mandatory: true, notes: 'Find gas leaks' },
            { item: 'Refrigerant Gas R32', quantity: 1, mandatory: false, notes: 'For refilling' },
            { item: 'Capacitor 2.5MFD', quantity: 2, mandatory: false, notes: 'Common spare' }
        ],
        active: true
    },
    {
        id: 'req-003',
        productCategory: 'microwave',
        brand: 'Samsung',
        issue: 'Sparking Inside',
        requirements: [
            { item: 'Waveguide Cover', quantity: 2, mandatory: true, notes: 'Primary cause of sparking' },
            { item: 'Insulated Gloves', quantity: 1, mandatory: true, notes: 'Safety equipment' },
            { item: 'Magnetron', quantity: 1, mandatory: false, notes: 'If waveguide replacement fails' }
        ],
        active: true
    }
];

export const brands = [
    'LG', 'Samsung', 'Whirlpool', 'IFB', 'Bosch', 'Godrej', 'Haier', 'Voltas', 'Blue Star', 'Carrier', 'Other'
];

// Financial Data for Reports

// Sales Invoices with GST breakdown
export const salesInvoices = [
    {
        id: 'INV-2026-001',
        date: '2026-01-15',
        customerName: 'Rajesh Kumar',
        customerGSTIN: '27AABCU9603R1ZM',
        customerState: 'Maharashtra',
        items: [
            { description: 'AC Service - 1.5 Ton Split', hsn: '998599', qty: 1, rate: 1500, taxRate: 18 }
        ],
        subtotal: 1500,
        cgst: 135,
        sgst: 135,
        igst: 0,
        total: 1770,
        paymentMode: 'UPI',
        paymentStatus: 'paid',
        technician: 'Amit Patel',
        invoiceType: 'B2B'
    },
    {
        id: 'INV-2026-002',
        date: '2026-01-15',
        customerName: 'Priya Sharma',
        customerGSTIN: null,
        customerState: 'Maharashtra',
        items: [
            { description: 'Gas Refilling R32', hsn: '382440', qty: 1, rate: 2500, taxRate: 18 },
            { description: 'AC Capacitor', hsn: '853222', qty: 2, rate: 150, taxRate: 18 }
        ],
        subtotal: 2800,
        cgst: 252,
        sgst: 252,
        igst: 0,
        total: 3304,
        paymentMode: 'Cash',
        paymentStatus: 'paid',
        technician: 'Rahul Singh',
        invoiceType: 'B2C'
    },
    {
        id: 'INV-2026-003',
        date: '2026-01-14',
        customerName: 'Tech Solutions Pvt Ltd',
        customerGSTIN: '27AABCT1234R1Z5',
        customerState: 'Maharashtra',
        items: [
            { description: 'AC Installation - 2 Ton', hsn: '998599', qty: 3, rate: 3500, taxRate: 18 },
            { description: 'Copper Piping', hsn: '740400', qty: 15, rate: 200, taxRate: 18 }
        ],
        subtotal: 13500,
        cgst: 1215,
        sgst: 1215,
        igst: 0,
        total: 15930,
        paymentMode: 'Bank Transfer',
        paymentStatus: 'pending',
        technician: 'Vikram Kumar',
        invoiceType: 'B2B'
    },
    {
        id: 'INV-2026-004',
        date: '2026-01-13',
        customerName: 'Mumbai Hotels Ltd',
        customerGSTIN: '09AABCH1234R1Z6',
        customerState: 'Delhi',
        items: [
            { description: 'AC Repair - Commercial', hsn: '998599', qty: 5, rate: 2000, taxRate: 18 }
        ],
        subtotal: 10000,
        cgst: 0,
        sgst: 0,
        igst: 1800,
        total: 11800,
        paymentMode: 'Credit',
        paymentStatus: 'partial',
        technician: 'Amit Patel',
        invoiceType: 'B2B'
    },
    {
        id: 'INV-2026-005',
        date: '2026-01-12',
        customerName: 'Anita Desai',
        customerGSTIN: null,
        customerState: 'Maharashtra',
        items: [
            { description: 'AC Cleaning Service', hsn: '998599', qty: 2, rate: 800, taxRate: 18 }
        ],
        subtotal: 1600,
        cgst: 144,
        sgst: 144,
        igst: 0,
        total: 1888,
        paymentMode: 'Card',
        paymentStatus: 'paid',
        technician: 'Rahul Singh',
        invoiceType: 'B2C'
    }
];

// Purchase Invoices
export const purchaseInvoices = [
    {
        id: 'PUR-2026-001',
        date: '2026-01-14',
        vendorName: 'LG Spares Supplier',
        vendorGSTIN: '27AABCL9876R1Z1',
        items: [
            { description: 'AC Capacitor 2.5MFD', hsn: '853222', qty: 20, rate: 120, taxRate: 18 },
            { description: 'Remote Control', hsn: '852580', qty: 10, rate: 250, taxRate: 18 }
        ],
        subtotal: 4900,
        cgst: 441,
        sgst: 441,
        igst: 0,
        total: 5782,
        paymentStatus: 'paid',
        paymentMode: 'Bank Transfer'
    },
    {
        id: 'PUR-2026-002',
        date: '2026-01-13',
        vendorName: 'Samsung Parts Distributor',
        vendorGSTIN: '27AABCS5432R1Z2',
        items: [
            { description: 'R32 Gas Cylinder', hsn: '382440', qty: 5, rate: 1800, taxRate: 18 }
        ],
        subtotal: 9000,
        cgst: 810,
        sgst: 810,
        igst: 0,
        total: 10620,
        paymentStatus: 'pending',
        paymentMode: 'Credit'
    },
    {
        id: 'PUR-2026-003',
        date: '2026-01-10',
        vendorName: 'Tools & Equipment Co',
        vendorGSTIN: '09AABCT7890R1Z3',
        items: [
            { description: 'Vacuum Pump', hsn: '841410', qty: 2, rate: 5500, taxRate: 18 },
            { description: 'Manifold Gauge', hsn: '903289', qty: 2, rate: 3200, taxRate: 18 }
        ],
        subtotal: 17400,
        cgst: 0,
        sgst: 0,
        igst: 3132,
        total: 20532,
        paymentStatus: 'paid',
        paymentMode: 'Bank Transfer'
    }
];

// Balance Sheet Data
export const balanceSheetData = {
    asOnDate: '2026-01-16',
    assets: {
        currentAssets: {
            cashAndBank: 125000,
            accountsReceivable: 45000,
            inventory: 85000,
            prepaidExpenses: 12000
        },
        fixedAssets: {
            equipment: 350000,
            vehicles: 800000,
            lessDepreciation: -150000
        }
    },
    liabilities: {
        currentLiabilities: {
            accountsPayable: 35000,
            shortTermLoans: 50000,
            outstandingExpenses: 18000
        },
        longTermLiabilities: {
            termLoan: 200000
        }
    },
    equity: {
        capital: 800000,
        retainedEarnings: 164000
    }
};

// Profit & Loss Data
export const profitLossData = {
    period: '2026-01',
    revenue: {
        serviceRevenue: 185000,
        productSales: 45000
    },
    costOfGoodsSold: {
        sparePartsCost: 32000,
        directLabor: 28000
    },
    operatingExpenses: {
        technicianSalaries: 75000,
        fuelTransportation: 15000,
        rent: 25000,
        utilities: 8000,
        marketing: 12000,
        administrative: 18000
    },
    otherIncome: {
        interestIncome: 500
    },
    otherExpenses: {
        interestExpense: 3500
    },
    taxExpense: 8000
};

// Monthly trends for charts
export const monthlySalesTrends = [
    { month: '2025-08', sales: 145000, profit: 32000 },
    { month: '2025-09', sales: 168000, profit: 38000 },
    { month: '2025-10', sales: 192000, profit: 45000 },
    { month: '2025-11', sales: 178000, profit: 41000 },
    { month: '2025-12', sales: 215000, profit: 52000 },
    { month: '2026-01', sales: 230000, profit: 58000 }
];
