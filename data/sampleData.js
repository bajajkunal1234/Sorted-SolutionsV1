// Sample data for development/testing
// This will be used until Firebase is configured with real data

export const sampleJobs = [
    {
        id: '1',
        jobName: 'WM Dead Jogeshwari',
        thumbnail: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400',
        customer: { id: 'c1', name: 'Rajesh Kumar', phone: '+91 98765 43210' },
        property: { id: 'p1', address: 'A-101, Shanti Nagar, Jogeshwari West, Mumbai, Maharashtra 400102' },
        product: { id: 'pr1', name: 'Washing Machine', type: 'Front Load' },
        brand: { id: 'b1', name: 'LG' },
        issue: { id: 'i1', name: 'Not Starting' },
        status: 'pending',
        assignedTo: 'admin',
        assignedToName: 'Admin',
        openingDate: '2026-01-13T10:00:00',
        dueDate: '2026-01-15T18:00:00',
        tags: ['VIP'],
        warranty: false,
        createdAt: '2026-01-13T10:00:00',
        updatedAt: '2026-01-13T10:00:00',
        logNotes: [],
        interactions: [
            {
                type: 'created',
                message: 'Job created by Admin',
                timestamp: '2026-01-13T10:00:00',
                user: 'Admin'
            }
        ],
        reminders: []
    },
    {
        id: '2',
        jobName: 'Microwave Sparking Issue Malad',
        thumbnail: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400',
        customer: { id: 'c2', name: 'Priya Sharma', phone: '+91 98765 43211' },
        property: { id: 'p2', address: 'B-205, Green Valley, Malad East, Mumbai, Maharashtra 400097' },
        product: { id: 'pr2', name: 'Microwave Oven', type: 'Convection' },
        brand: { id: 'b2', name: 'Samsung' },
        issue: { id: 'i2', name: 'Sparking Inside' },
        status: 'assigned',
        assignedTo: 't1',
        assignedToName: 'Amit Patel',
        openingDate: '2026-01-13T11:30:00',
        dueDate: '2026-01-14T17:00:00',
        tags: [],
        warranty: true,
        warrantyProof: 'INV-2025-1234',
        createdAt: '2026-01-13T11:30:00',
        updatedAt: '2026-01-13T12:00:00',
        logNotes: [],
        interactions: [
            {
                type: 'created',
                message: 'Job created by Admin',
                timestamp: '2026-01-13T11:30:00',
                user: 'Admin'
            },
            {
                type: 'technician_assigned',
                message: 'Assigned to Amit Patel',
                timestamp: '2026-01-13T12:00:00',
                user: 'Admin'
            }
        ],
        reminders: []
    },
    {
        id: '3',
        jobName: 'AC Not Cooling Andheri',
        thumbnail: 'https://images.unsplash.com/photo-1631545804657-2c0e0b98c1a1?w=400',
        customer: { id: 'c3', name: 'Suresh Mehta', phone: '+91 98765 43212' },
        property: { id: 'p3', address: 'C-303, Sunrise Apartments, Andheri West, Mumbai, Maharashtra 400053' },
        product: { id: 'pr3', name: 'Air Conditioner', type: 'Split AC 1.5 Ton' },
        brand: { id: 'b3', name: 'Daikin' },
        issue: { id: 'i3', name: 'Not Cooling' },
        status: 'in-progress',
        assignedTo: 't2',
        assignedToName: 'Rahul Singh',
        openingDate: '2026-01-12T14:00:00',
        dueDate: '2026-01-14T20:00:00',
        tags: ['Aged Customer'],
        warranty: false,
        createdAt: '2026-01-12T14:00:00',
        updatedAt: '2026-01-13T09:00:00',
        logNotes: [
            {
                id: '1',
                description: 'Checked gas pressure - low. Need to refill.',
                addedBy: 'Rahul Singh',
                timestamp: '2026-01-13T09:00:00',
                files: []
            }
        ],
        interactions: [
            {
                type: 'created',
                message: 'Job created by Admin',
                timestamp: '2026-01-12T14:00:00',
                user: 'Admin'
            },
            {
                type: 'technician_assigned',
                message: 'Assigned to Rahul Singh',
                timestamp: '2026-01-12T14:30:00',
                user: 'Admin'
            },
            {
                type: 'status_changed',
                message: 'Status changed to in-progress',
                timestamp: '2026-01-13T08:30:00',
                user: 'Rahul Singh'
            },
            {
                type: 'note_added',
                message: 'Note added: Checked gas pressure - low. Need to refill.',
                timestamp: '2026-01-13T09:00:00',
                user: 'Rahul Singh'
            }
        ],
        reminders: []
    },
    {
        id: '4',
        jobName: 'Refrigerator Noise Bandra',
        thumbnail: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400',
        customer: { id: 'c4', name: 'Neha Gupta', phone: '+91 98765 43213' },
        property: { id: 'p4', address: 'D-12, Hill View Society, Bandra West, Mumbai, Maharashtra 400050' },
        product: { id: 'pr4', name: 'Refrigerator', type: 'Double Door' },
        brand: { id: 'b4', name: 'Whirlpool' },
        issue: { id: 'i4', name: 'Unusual Noise' },
        status: 'completed',
        assignedTo: 't1',
        assignedToName: 'Amit Patel',
        openingDate: '2026-01-11T09:00:00',
        dueDate: '2026-01-13T18:00:00',
        tags: [],
        warranty: false,
        createdAt: '2026-01-11T09:00:00',
        updatedAt: '2026-01-13T16:00:00',
        logNotes: [
            {
                id: '1',
                description: 'Compressor issue identified. Replaced compressor.',
                addedBy: 'Amit Patel',
                timestamp: '2026-01-13T15:00:00',
                files: []
            }
        ],
        interactions: [
            {
                type: 'created',
                message: 'Job created by Admin',
                timestamp: '2026-01-11T09:00:00',
                user: 'Admin'
            },
            {
                type: 'technician_assigned',
                message: 'Assigned to Amit Patel',
                timestamp: '2026-01-11T09:30:00',
                user: 'Admin'
            },
            {
                type: 'status_changed',
                message: 'Status changed to in-progress',
                timestamp: '2026-01-13T10:00:00',
                user: 'Amit Patel'
            },
            {
                type: 'note_added',
                message: 'Note added: Compressor issue identified. Replaced compressor.',
                timestamp: '2026-01-13T15:00:00',
                user: 'Amit Patel'
            },
            {
                type: 'status_changed',
                message: 'Status changed to completed',
                timestamp: '2026-01-13T16:00:00',
                user: 'Amit Patel'
            }
        ],
        reminders: []
    }
];

export const sampleCustomers = [
    { id: 'c1', name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@example.com' },
    { id: 'c2', name: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@example.com' },
    { id: 'c3', name: 'Suresh Mehta', phone: '+91 98765 43212', email: 'suresh@example.com' },
    { id: 'c4', name: 'Neha Gupta', phone: '+91 98765 43213', email: 'neha@example.com' }
];

export const sampleBrands = [
    { id: 'b1', name: 'LG' },
    { id: 'b2', name: 'Samsung' },
    { id: 'b3', name: 'Daikin' },
    { id: 'b4', name: 'Whirlpool' },
    { id: 'b5', name: 'Godrej' },
    { id: 'b6', name: 'Voltas' },
    { id: 'b7', name: 'Haier' },
    { id: 'b8', name: 'Panasonic' },
    { id: 'b9', name: 'Other' }
];

export const sampleIssues = [
    { id: 'i1', name: 'Not Starting' },
    { id: 'i2', name: 'Sparking Inside' },
    { id: 'i3', name: 'Not Cooling' },
    { id: 'i4', name: 'Unusual Noise' },
    { id: 'i5', name: 'Water Leakage' },
    { id: 'i6', name: 'Not Heating' },
    { id: 'i7', name: 'Display Not Working' },
    { id: 'i8', name: 'Door Not Closing' },
    { id: 'i9', name: 'Other' }
];

export const sampleTechnicians = [
    { id: 'admin', name: 'Admin', phone: '+91 98765 00000', email: 'admin@sortedsolutions.in' },
    { id: 't1', name: 'Amit Patel', phone: '+91 98765 11111', email: 'amit@sortedsolutions.in' },
    { id: 't2', name: 'Rahul Singh', phone: '+91 98765 22222', email: 'rahul@sortedsolutions.in' },
    { id: 't3', name: 'Vikram Rao', phone: '+91 98765 33333', email: 'vikram@sortedsolutions.in' }
];

export const jobStatuses = [
    { value: 'pending', label: 'Pending', color: '#f59e0b' },
    { value: 'assigned', label: 'Assigned', color: '#3b82f6' },
    { value: 'in-progress', label: 'In Progress', color: '#8b5cf6' },
    { value: 'completed', label: 'Completed', color: '#10b981' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
];

export const tagOptions = [
    { value: 'VIP', label: 'VIP', color: '#ec4899' },
    { value: 'Aged Customer', label: 'Aged Customer', color: '#f59e0b' },
    { value: 'Urgent', label: 'Urgent', color: '#ef4444' },
    { value: 'Follow-up', label: 'Follow-up', color: '#3b82f6' }
];
