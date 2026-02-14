// Categories
export const productCategories = [
    { id: 'spare-parts', name: 'Spare Parts', color: '#3b82f6' },
    { id: 'services', name: 'Services', color: '#10b981' },
    { id: 'consumables', name: 'Consumables', color: '#f59e0b' },
    { id: 'tools', name: 'Tools', color: '#8b5cf6' },
    { id: 'accessories', name: 'Accessories', color: '#ec4899' }
];

// Units of Measure
export const unitsOfMeasure = [
    { value: 'piece', label: 'Piece' },
    { value: 'kg', label: 'Kg' },
    { value: 'liter', label: 'Liter' },
    { value: 'meter', label: 'Meter' },
    { value: 'service', label: 'Service' },
    { value: 'hour', label: 'Hour' },
    { value: 'set', label: 'Set' },
    { value: 'box', label: 'Box' }
];

// Sample Products
export const sampleProducts = [
    {
        id: 'prod-001',
        sku: 'PROD-001',
        name: 'WM Drain Pump',
        type: 'product',
        category: 'spare-parts',
        brand: 'Universal',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '84137090',
        hsnDescription: 'Pumps for liquids',
        openingBalance: {
            quantity: 50,
            date: '2025-04-01'
        },
        currentStock: 35,
        reorderLevel: 10,
        salePrice: 450,
        purchasePrice: 300,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-14T10:30:00',
        notes: [],
        reminders: []
    },
    {
        id: 'prod-002',
        sku: 'PROD-002',
        name: 'AC Capacitor 2.5MFD',
        type: 'product',
        category: 'spare-parts',
        brand: 'Havells',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '85322100',
        hsnDescription: 'Fixed capacitors',
        openingBalance: {
            quantity: 100,
            date: '2025-04-01'
        },
        currentStock: 75,
        reorderLevel: 20,
        salePrice: 180,
        purchasePrice: 120,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-12T15:20:00',
        notes: [],
        reminders: []
    },
    {
        id: 'prod-003',
        sku: 'PROD-003',
        name: 'Microwave Magnetron',
        type: 'product',
        category: 'spare-parts',
        brand: 'LG',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '85404000',
        hsnDescription: 'Electronic tubes',
        openingBalance: {
            quantity: 20,
            date: '2025-04-01'
        },
        currentStock: 8,
        reorderLevel: 5,
        salePrice: 1200,
        purchasePrice: 800,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-13T09:45:00',
        notes: [],
        reminders: []
    },
    {
        id: 'serv-001',
        sku: 'SERV-001',
        name: 'Washing Machine Repair Service',
        type: 'service',
        category: 'services',
        brand: null,
        images: [],
        unitOfMeasure: 'service',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '998599',
        hsnDescription: 'Repair and maintenance services',
        openingBalance: null,
        currentStock: null,
        reorderLevel: null,
        salePrice: 800,
        purchasePrice: null,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-10T14:00:00',
        notes: [],
        reminders: []
    },
    {
        id: 'serv-002',
        sku: 'SERV-002',
        name: 'AC Gas Refill Service',
        type: 'service',
        category: 'services',
        brand: null,
        images: [],
        unitOfMeasure: 'service',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '998599',
        hsnDescription: 'Repair and maintenance services',
        openingBalance: null,
        currentStock: null,
        reorderLevel: null,
        salePrice: 1500,
        purchasePrice: null,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-11T11:30:00',
        notes: [],
        reminders: []
    },
    {
        id: 'prod-004',
        sku: 'PROD-004',
        name: 'Refrigerator Thermostat',
        type: 'product',
        category: 'spare-parts',
        brand: 'Samsung',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '90328900',
        hsnDescription: 'Automatic regulating instruments',
        openingBalance: {
            quantity: 30,
            date: '2025-04-01'
        },
        currentStock: 0,
        reorderLevel: 10,
        salePrice: 650,
        purchasePrice: 450,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-14T16:00:00',
        notes: [],
        reminders: [
            {
                id: 'rem-001',
                type: 'low-stock',
                message: 'Stock is out - reorder immediately',
                date: '2026-01-15T00:00:00',
                active: true
            }
        ]
    },
    {
        id: 'cons-001',
        sku: 'CONS-001',
        name: 'Cleaning Solution (500ml)',
        type: 'product',
        category: 'consumables',
        brand: 'Colin',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '34029090',
        hsnDescription: 'Cleaning preparations',
        openingBalance: {
            quantity: 50,
            date: '2025-04-01'
        },
        currentStock: 42,
        reorderLevel: 15,
        salePrice: 120,
        purchasePrice: 80,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-10T12:00:00',
        notes: [],
        reminders: []
    },
    {
        id: 'tool-001',
        sku: 'TOOL-001',
        name: 'Multimeter Digital',
        type: 'product',
        category: 'tools',
        brand: 'Fluke',
        images: [],
        unitOfMeasure: 'piece',
        gstApplicable: true,
        gstRate: 18,
        hsnCode: '90303300',
        hsnDescription: 'Instruments for measuring voltage',
        openingBalance: {
            quantity: 5,
            date: '2025-04-01'
        },
        currentStock: 4,
        reorderLevel: 2,
        salePrice: 2500,
        purchasePrice: 1800,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-05T10:00:00',
        notes: [],
        reminders: []
    }
];

// Stock Status Types
export const stockStatuses = {
    IN_STOCK: 'in-stock',
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock',
    NOT_APPLICABLE: 'not-applicable' // For services
};

// Reminder Types
export const reminderTypes = [
    { value: 'low-stock', label: 'Low Stock Alert' },
    { value: 'reorder', label: 'Reorder Reminder' },
    { value: 'expiry', label: 'Expiry Alert' },
    { value: 'custom', label: 'Custom Reminder' }
];
