// Rental Plans - Products available for rent with pricing tiers
export const rentalPlans = [
    {
        id: 'RENT-001',
        productId: 'washing-machine-7kg',
        productName: 'Washing Machine - 7kg Front Load',
        productImage: '/assets/washing-machine.jpg',
        category: 'Appliances',
        tenureOptions: [
            { duration: 1, unit: 'month', monthlyRent: 2000, securityDeposit: 5000, setupFee: 500 },
            { duration: 3, unit: 'months', monthlyRent: 1800, securityDeposit: 4500, setupFee: 500 },
            { duration: 6, unit: 'months', monthlyRent: 1600, securityDeposit: 4000, setupFee: 0 },
            { duration: 1, unit: 'year', monthlyRent: 1400, securityDeposit: 3500, setupFee: 0 },
            { duration: 3, unit: 'years', monthlyRent: 1200, securityDeposit: 3000, setupFee: 0 }
        ],
        includedServices: ['Free installation', 'Quarterly maintenance', 'Free replacement if defective'],
        terms: 'Deposit refundable after tenure completion. Customer responsible for minor damages.',
        isActive: true,
        createdAt: '2026-01-15T00:00:00Z'
    },
    {
        id: 'RENT-002',
        productId: 'ac-1.5-ton',
        productName: 'Air Conditioner - 1.5 Ton Split',
        productImage: '/assets/ac.jpg',
        category: 'Appliances',
        tenureOptions: [
            { duration: 1, unit: 'month', monthlyRent: 2500, securityDeposit: 6000, setupFee: 1000 },
            { duration: 3, unit: 'months', monthlyRent: 2200, securityDeposit: 5500, setupFee: 1000 },
            { duration: 6, unit: 'months', monthlyRent: 2000, securityDeposit: 5000, setupFee: 500 },
            { duration: 1, unit: 'year', monthlyRent: 1800, securityDeposit: 4500, setupFee: 0 },
            { duration: 3, unit: 'years', monthlyRent: 1500, securityDeposit: 4000, setupFee: 0 }
        ],
        includedServices: ['Free installation', 'Gas refill once per year', 'Quarterly service', 'Free uninstallation'],
        terms: 'Installation charges included. Gas refill beyond quota charged separately.',
        isActive: true,
        createdAt: '2026-01-10T00:00:00Z'
    },
    {
        id: 'RENT-003',
        productId: 'microwave-25l',
        productName: 'Microwave Oven - 25L',
        productImage: '/assets/microwave.jpg',
        category: 'Appliances',
        tenureOptions: [
            { duration: 1, unit: 'month', monthlyRent: 800, securityDeposit: 2000, setupFee: 200 },
            { duration: 3, unit: 'months', monthlyRent: 700, securityDeposit: 1800, setupFee: 200 },
            { duration: 6, unit: 'months', monthlyRent: 600, securityDeposit: 1500, setupFee: 0 },
            { duration: 1, unit: 'year', monthlyRent: 500, securityDeposit: 1200, setupFee: 0 }
        ],
        includedServices: ['Free delivery', 'Annual service', 'Free replacement if defective'],
        terms: 'Deposit refundable on return. Customer responsible for cleaning.',
        isActive: true,
        createdAt: '2026-01-12T00:00:00Z'
    }
];

// Active Rentals - Current rental agreements
export const activeRentals = [
    {
        id: 'RENTAL-001',
        customerId: 1,
        customerName: 'Rajesh Kumar',
        planId: 'RENT-001',
        productName: 'Washing Machine - 7kg Front Load',
        serialNumber: 'WM-SN-12345',
        tenure: { duration: 6, unit: 'months', startDate: '2026-01-15', endDate: '2026-07-15' },
        monthlyRent: 1600,
        securityDeposit: 4000,
        setupFee: 0,
        depositPaid: true,
        depositPaidDate: '2026-01-15',
        depositRefunded: false,
        rentCycle: 'monthly',
        nextRentDueDate: '2026-02-15',
        rentsPaid: 1,
        rentsRemaining: 5,
        lastServiceDate: '2026-01-15',
        nextServiceDate: '2026-04-15',
        serviceHistory: [
            { date: '2026-01-15', type: 'installation', technicianId: 1, technicianName: 'Amit Sharma', notes: 'Installed and tested successfully' }
        ],
        status: 'active',
        deliveryAddressId: 'ADDR-001',
        notes: 'Customer requested quarterly service',
        createdAt: '2026-01-15T00:00:00Z',
        createdBy: 'ADMIN-001'
    },
    {
        id: 'RENTAL-002',
        customerId: 2,
        customerName: 'Priya Sharma',
        planId: 'RENT-002',
        productName: 'Air Conditioner - 1.5 Ton Split',
        serialNumber: 'AC-SN-67890',
        tenure: { duration: 1, unit: 'year', startDate: '2026-01-10', endDate: '2027-01-10' },
        monthlyRent: 1800,
        securityDeposit: 4500,
        setupFee: 0,
        depositPaid: true,
        depositPaidDate: '2026-01-10',
        depositRefunded: false,
        rentCycle: 'monthly',
        nextRentDueDate: '2026-02-10',
        rentsPaid: 1,
        rentsRemaining: 11,
        lastServiceDate: '2026-01-10',
        nextServiceDate: '2026-04-10',
        serviceHistory: [
            { date: '2026-01-10', type: 'installation', technicianId: 2, technicianName: 'Rahul Verma', notes: 'Installed with gas check' }
        ],
        status: 'active',
        deliveryAddressId: 'ADDR-002',
        notes: 'Customer prefers weekend service',
        createdAt: '2026-01-10T00:00:00Z',
        createdBy: 'ADMIN-001'
    },
    {
        id: 'RENTAL-003',
        customerId: 3,
        customerName: 'Amit Patel',
        planId: 'RENT-003',
        productName: 'Microwave Oven - 25L',
        serialNumber: 'MW-SN-11111',
        tenure: { duration: 3, unit: 'months', startDate: '2026-01-18', endDate: '2026-04-18' },
        monthlyRent: 700,
        securityDeposit: 1800,
        setupFee: 200,
        depositPaid: true,
        depositPaidDate: '2026-01-18',
        depositRefunded: false,
        rentCycle: 'monthly',
        nextRentDueDate: '2026-02-18',
        rentsPaid: 1,
        rentsRemaining: 2,
        lastServiceDate: '2026-01-18',
        nextServiceDate: null,
        serviceHistory: [
            { date: '2026-01-18', type: 'delivery', technicianId: 1, technicianName: 'Amit Sharma', notes: 'Delivered and demo given' }
        ],
        status: 'active',
        deliveryAddressId: 'ADDR-003',
        notes: '',
        createdAt: '2026-01-18T00:00:00Z',
        createdBy: 'ADMIN-001'
    },
    {
        id: 'RENTAL-004',
        customerId: 4,
        customerName: 'Sneha Desai',
        planId: 'RENT-001',
        productName: 'Washing Machine - 7kg Front Load',
        serialNumber: 'WM-SN-22222',
        tenure: { duration: 1, unit: 'year', startDate: '2026-01-12', endDate: '2027-01-12' },
        monthlyRent: 1400,
        securityDeposit: 3500,
        setupFee: 0,
        depositPaid: true,
        depositPaidDate: '2026-01-12',
        depositRefunded: false,
        rentCycle: 'monthly',
        nextRentDueDate: '2026-02-12',
        rentsPaid: 1,
        rentsRemaining: 11,
        lastServiceDate: '2026-01-12',
        nextServiceDate: '2026-04-12',
        serviceHistory: [
            { date: '2026-01-12', type: 'installation', technicianId: 3, technicianName: 'Vikram Singh', notes: 'Installed successfully' }
        ],
        status: 'active',
        deliveryAddressId: 'ADDR-004',
        notes: 'Customer requested evening service slots',
        createdAt: '2026-01-12T00:00:00Z',
        createdBy: 'ADMIN-001'
    }
];

// AMC Plans - Service packages available
export const amcPlans = [
    {
        id: 'AMC-PLAN-001',
        name: 'Domestic RO AMC - Annual',
        category: 'Water Purifier',
        applicableProducts: ['RO', 'UV', 'UF'],
        duration: { value: 1, unit: 'year' },
        price: 2500,
        services: [
            { type: 'filter_change', item: 'PP Filter', quantity: 4, frequency: 'quarterly' },
            { type: 'filter_change', item: 'Membrane', quantity: 1, frequency: 'annual' },
            { type: 'checkup', item: 'TDS Check', quantity: 12, frequency: 'monthly' },
            { type: 'service', item: 'General Service', quantity: 4, frequency: 'quarterly' }
        ],
        benefits: ['Free emergency visits', '24/7 customer support', 'Priority service booking', 'Parts at discounted rates'],
        terms: 'AMC valid for 12 months from activation. Service visits scheduled as per plan.',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'AMC-PLAN-002',
        name: 'AC Comprehensive AMC',
        category: 'Air Conditioner',
        applicableProducts: ['Split AC', 'Window AC', 'Cassette AC'],
        duration: { value: 1, unit: 'year' },
        price: 3500,
        services: [
            { type: 'service', item: 'Deep Cleaning', quantity: 2, frequency: 'half-yearly' },
            { type: 'service', item: 'Gas Check', quantity: 4, frequency: 'quarterly' },
            { type: 'service', item: 'Filter Cleaning', quantity: 4, frequency: 'quarterly' },
            { type: 'checkup', item: 'General Checkup', quantity: 4, frequency: 'quarterly' }
        ],
        benefits: ['Free gas refill (once)', 'Priority service', 'Discounted parts', 'Emergency support'],
        terms: 'AMC covers service and maintenance. Gas refill beyond quota charged separately.',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'AMC-PLAN-003',
        name: 'Washing Machine Care Plan',
        category: 'Washing Machine',
        applicableProducts: ['Front Load', 'Top Load', 'Semi-Automatic'],
        duration: { value: 1, unit: 'year' },
        price: 2000,
        services: [
            { type: 'service', item: 'Deep Cleaning', quantity: 2, frequency: 'half-yearly' },
            { type: 'service', item: 'Drum Cleaning', quantity: 4, frequency: 'quarterly' },
            { type: 'checkup', item: 'General Checkup', quantity: 4, frequency: 'quarterly' }
        ],
        benefits: ['Free service visits', 'Discounted spare parts', 'Priority support'],
        terms: 'AMC covers regular maintenance. Major repairs charged separately.',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z'
    }
];

// Active AMCs - Current AMC subscriptions
export const activeAMCs = [
    {
        id: 'AMC-001',
        customerId: 1,
        customerName: 'Rajesh Kumar',
        planId: 'AMC-PLAN-001',
        planName: 'Domestic RO AMC - Annual',
        productType: 'RO Water Purifier',
        productBrand: 'Kent',
        productModel: 'Grand Plus',
        serialNumber: 'KENT-12345',
        installationAddressId: 'ADDR-001',
        startDate: '2026-01-19',
        endDate: '2027-01-19',
        amcAmount: 2500,
        paymentStatus: 'paid',
        paymentDate: '2026-01-19',
        invoiceId: 'INV-001',
        servicesCompleted: [
            { date: '2026-01-19', type: 'filter_change', item: 'PP Filter', technicianId: 1, technicianName: 'Amit Sharma', jobId: 'JOB-001' }
        ],
        servicesRemaining: {
            'PP Filter': 3,
            'Membrane': 1,
            'TDS Check': 11,
            'General Service': 3
        },
        nextServiceDate: '2026-04-19',
        nextServiceType: 'filter_change',
        reminders: [
            { id: 'REM-001', type: 'service_due', dueDate: '2026-04-19', status: 'pending' },
            { id: 'REM-002', type: 'renewal_reminder', dueDate: '2026-12-19', status: 'pending' }
        ],
        status: 'active',
        autoRenew: true,
        notes: 'Customer prefers weekend visits',
        createdAt: '2026-01-19T00:00:00Z',
        createdBy: 'ADMIN-001'
    }
];

// Customer Properties/Addresses
export const customerProperties = [
    {
        id: 'ADDR-001',
        customerId: 1,
        label: 'Home',
        isPrimary: true,
        address: {
            line1: 'Flat 301, Building A',
            line2: 'Green Valley Apartments',
            area: 'Andheri West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400058',
            landmark: 'Near Metro Station'
        },
        contactPerson: 'Rajesh Kumar',
        contactPhone: '+91 98765 43210',
        alternatePhone: '+91 98765 43211',
        propertyType: 'residential',
        accessInstructions: 'Ring bell twice, gate code: 1234',
        installedProducts: ['RENTAL-001', 'AMC-001'],
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z'
    },
    {
        id: 'ADDR-002',
        customerId: 2,
        label: 'Residence',
        isPrimary: true,
        address: {
            line1: 'B-204, Sunrise Towers',
            line2: 'Linking Road',
            area: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            landmark: 'Opposite Shoppers Stop'
        },
        contactPerson: 'Priya Sharma',
        contactPhone: '+91 98765 11111',
        alternatePhone: null,
        propertyType: 'residential',
        accessInstructions: 'Security at gate, call before visit',
        installedProducts: ['RENTAL-002'],
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-01-10T00:00:00Z'
    },
    {
        id: 'ADDR-003',
        customerId: 3,
        label: 'Home',
        isPrimary: true,
        address: {
            line1: '12/A, Shanti Nagar',
            line2: 'SV Road',
            area: 'Goregaon West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400062',
            landmark: 'Near Railway Station'
        },
        contactPerson: 'Amit Patel',
        contactPhone: '+91 98765 22222',
        alternatePhone: null,
        propertyType: 'residential',
        accessInstructions: 'First floor, no lift',
        installedProducts: ['RENTAL-003'],
        createdAt: '2026-01-18T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z'
    },
    {
        id: 'ADDR-004',
        customerId: 4,
        label: 'Apartment',
        isPrimary: true,
        address: {
            line1: 'C-501, Ocean View',
            line2: 'Carter Road',
            area: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            landmark: 'Near Bandstand'
        },
        contactPerson: 'Sneha Desai',
        contactPhone: '+91 98765 33333',
        alternatePhone: '+91 98765 33334',
        propertyType: 'residential',
        accessInstructions: 'Lift available, 5th floor',
        installedProducts: ['RENTAL-004'],
        createdAt: '2026-01-12T00:00:00Z',
        updatedAt: '2026-01-12T00:00:00Z'
    }
];
