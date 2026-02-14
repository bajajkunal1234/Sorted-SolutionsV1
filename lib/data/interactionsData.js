// Mock interactions data for testing

export const sampleInteractions = [
    // Google Ad Campaign - Customer 1 (John Doe)
    {
        id: 1,
        type: 'clicked-google-ad',
        category: 'acquisition',
        timestamp: '2024-02-01T10:30:00Z',
        customerId: null, // Will be linked when account created
        customerName: 'Anonymous',
        jobId: null,
        invoiceId: null,
        performedBy: 'system',
        performedByName: 'System',
        description: 'Customer clicked Google Ad campaign "AC Repair Mumbai"',
        metadata: {
            gclid: 'abc123xyz',
            utm_source: 'google',
            utm_campaign: 'ac-repair-mumbai',
            utm_medium: 'cpc',
            ip_address: '192.168.1.100',
            device: 'Mobile',
            browser: 'Chrome'
        },
        source: 'Google Ads',
        status: 'completed'
    },
    {
        id: 2,
        type: 'visited-website',
        category: 'acquisition',
        timestamp: '2024-02-01T10:31:00Z',
        customerId: null,
        customerName: 'Anonymous',
        jobId: null,
        invoiceId: null,
        performedBy: 'system',
        performedByName: 'System',
        description: 'Customer visited website homepage',
        metadata: {
            page: '/',
            referrer: 'google.com',
            duration: '2m 30s'
        },
        source: 'Website',
        status: 'completed'
    },
    {
        id: 3,
        type: 'booking-created-website',
        category: 'job',
        timestamp: '2024-02-01T10:35:00Z',
        customerId: null,
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: null,
        performedBy: 'customer',
        performedByName: 'John Doe',
        description: 'Customer created booking for AC Repair',
        metadata: {
            service: 'AC Repair',
            problem: 'Not cooling',
            scheduledDate: '2024-02-02',
            scheduledTime: '10:00 AM',
            phone: '+91 98765 43210'
        },
        source: 'Website',
        status: 'completed'
    },
    {
        id: 4,
        type: 'account-created-admin',
        category: 'account',
        timestamp: '2024-02-01T11:00:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: null,
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Admin created customer account from website booking',
        metadata: {
            source: 'Google Ads',
            phone: '+91 98765 43210',
            address: 'Andheri, Mumbai'
        },
        source: 'Admin Panel',
        status: 'completed'
    },
    {
        id: 5,
        type: 'job-assigned',
        category: 'job',
        timestamp: '2024-02-01T11:30:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Technician Ramesh Sharma assigned to job',
        metadata: {
            technicianId: 'TECH-001',
            technicianName: 'Ramesh Sharma',
            scheduledDate: '2024-02-02',
            scheduledTime: '10:00 AM'
        },
        source: 'Admin Panel',
        status: 'completed'
    },
    {
        id: 6,
        type: 'job-started',
        category: 'job',
        timestamp: '2024-02-02T10:05:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: null,
        performedBy: 'tech-001',
        performedByName: 'Ramesh Sharma',
        description: 'Technician started working on AC Repair',
        metadata: {
            location: 'Andheri, Mumbai',
            startTime: '10:05 AM'
        },
        source: 'Technician App',
        status: 'completed'
    },
    {
        id: 7,
        type: 'job-completed',
        category: 'job',
        timestamp: '2024-02-02T12:30:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: null,
        performedBy: 'tech-001',
        performedByName: 'Ramesh Sharma',
        description: 'Job completed successfully',
        metadata: {
            duration: '2h 25m',
            partsUsed: ['Gas refill', 'Filter'],
            completionTime: '12:30 PM'
        },
        source: 'Technician App',
        status: 'completed'
    },
    {
        id: 8,
        type: 'sales-invoice-created',
        category: 'sales',
        timestamp: '2024-02-02T12:35:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: 'SI-2024-001',
        performedBy: 'tech-001',
        performedByName: 'Ramesh Sharma',
        description: 'Sales invoice created for AC Repair',
        metadata: {
            amount: 5000,
            items: [
                { name: 'AC Service', price: 3500 },
                { name: 'Gas Refill', price: 1000 },
                { name: 'Filter', price: 500 }
            ]
        },
        source: 'Technician App',
        status: 'completed'
    },
    {
        id: 9,
        type: 'payment-received',
        category: 'sales',
        timestamp: '2024-02-02T12:40:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: 'SI-2024-001',
        performedBy: 'tech-001',
        performedByName: 'Ramesh Sharma',
        description: 'Payment received from customer',
        metadata: {
            amount: 5000,
            method: 'Cash',
            receiptNo: 'RV-2024-001'
        },
        source: 'Technician App',
        status: 'completed'
    },

    // Direct Call - Customer 2 (Jane Smith)
    {
        id: 10,
        type: 'direct-call',
        category: 'acquisition',
        timestamp: '2024-02-01T09:00:00Z',
        customerId: null,
        customerName: 'Anonymous',
        jobId: null,
        invoiceId: null,
        performedBy: 'system',
        performedByName: 'System',
        description: 'Customer called office directly',
        metadata: {
            phone: '+91 98765 11111',
            duration: '5m 30s'
        },
        source: 'Phone',
        status: 'completed'
    },
    {
        id: 11,
        type: 'account-created-admin',
        category: 'account',
        timestamp: '2024-02-01T09:15:00Z',
        customerId: 'CUST-002',
        customerName: 'Jane Smith',
        jobId: null,
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Admin created customer account from phone call',
        metadata: {
            source: 'Direct Call',
            phone: '+91 98765 11111',
            address: 'Bandra, Mumbai'
        },
        source: 'Admin Panel',
        status: 'completed'
    },
    {
        id: 12,
        type: 'job-created-admin',
        category: 'job',
        timestamp: '2024-02-01T09:30:00Z',
        customerId: 'CUST-002',
        customerName: 'Jane Smith',
        jobId: 'JOB-002',
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Admin created job for Refrigerator Repair',
        metadata: {
            service: 'Refrigerator Repair',
            problem: 'Not cooling',
            scheduledDate: '2024-02-02',
            scheduledTime: '2:00 PM'
        },
        source: 'Admin Panel',
        status: 'completed'
    },

    // Referral - Customer 3 (Acme Corp)
    {
        id: 13,
        type: 'referral',
        category: 'acquisition',
        timestamp: '2024-02-01T14:00:00Z',
        customerId: null,
        customerName: 'Anonymous',
        jobId: null,
        invoiceId: null,
        performedBy: 'system',
        performedByName: 'System',
        description: 'Customer referred by John Doe',
        metadata: {
            referredBy: 'John Doe',
            referredById: 'CUST-001'
        },
        source: 'Referral',
        status: 'completed'
    },
    {
        id: 14,
        type: 'account-created-admin',
        category: 'account',
        timestamp: '2024-02-01T14:15:00Z',
        customerId: 'CUST-003',
        customerName: 'Acme Corp',
        jobId: null,
        invoiceId: null,
        performedBy: 'admin-002',
        performedByName: 'Priya Sharma',
        description: 'Admin created customer account from referral',
        metadata: {
            source: 'Referral',
            referredBy: 'John Doe',
            phone: '+91 98765 22222',
            address: 'Powai, Mumbai'
        },
        source: 'Admin Panel',
        status: 'completed'
    },
    {
        id: 15,
        type: 'quotation-sent',
        category: 'sales',
        timestamp: '2024-02-01T15:00:00Z',
        customerId: 'CUST-003',
        customerName: 'Acme Corp',
        jobId: null,
        invoiceId: 'QT-2024-001',
        performedBy: 'admin-002',
        performedByName: 'Priya Sharma',
        description: 'Quotation sent for AMC contract',
        metadata: {
            amount: 50000,
            service: 'Annual Maintenance Contract',
            validUntil: '2024-02-15'
        },
        source: 'Admin Panel',
        status: 'completed'
    },

    // More interactions
    {
        id: 16,
        type: 'email-sent',
        category: 'communication',
        timestamp: '2024-02-01T16:00:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: 'JOB-001',
        invoiceId: 'SI-2024-001',
        performedBy: 'system',
        performedByName: 'System',
        description: 'Invoice email sent to customer',
        metadata: {
            to: 'john@example.com',
            subject: 'Invoice for AC Repair - SI-2024-001',
            attachments: ['invoice.pdf']
        },
        source: 'System',
        status: 'completed'
    },
    {
        id: 17,
        type: 'sms-sent',
        category: 'communication',
        timestamp: '2024-02-02T09:30:00Z',
        customerId: 'CUST-002',
        customerName: 'Jane Smith',
        jobId: 'JOB-002',
        invoiceId: null,
        performedBy: 'system',
        performedByName: 'System',
        description: 'Technician on the way notification',
        metadata: {
            to: '+91 98765 11111',
            message: 'Your technician Ramesh is on the way. ETA: 15 mins'
        },
        source: 'System',
        status: 'completed'
    },
    {
        id: 18,
        type: 'quotation-accepted',
        category: 'sales',
        timestamp: '2024-02-03T10:00:00Z',
        customerId: 'CUST-003',
        customerName: 'Acme Corp',
        jobId: null,
        invoiceId: 'QT-2024-001',
        performedBy: 'customer',
        performedByName: 'Acme Corp',
        description: 'Customer accepted quotation for AMC',
        metadata: {
            amount: 50000,
            acceptedDate: '2024-02-03'
        },
        source: 'Customer Portal',
        status: 'completed'
    },
    {
        id: 19,
        type: 'job-assigned',
        category: 'job',
        timestamp: '2024-02-01T09:35:00Z',
        customerId: 'CUST-002',
        customerName: 'Jane Smith',
        jobId: 'JOB-002',
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Technician Suresh Patel assigned to job',
        metadata: {
            technicianId: 'TECH-002',
            technicianName: 'Suresh Patel',
            scheduledDate: '2024-02-02',
            scheduledTime: '2:00 PM'
        },
        source: 'Admin Panel',
        status: 'completed'
    },
    {
        id: 20,
        type: 'account-updated',
        category: 'account',
        timestamp: '2024-02-03T11:00:00Z',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        jobId: null,
        invoiceId: null,
        performedBy: 'admin-001',
        performedByName: 'Raj Kumar',
        description: 'Customer address updated',
        metadata: {
            field: 'address',
            oldValue: 'Andheri, Mumbai',
            newValue: 'Andheri West, Mumbai 400053'
        },
        source: 'Admin Panel',
        status: 'completed'
    }
];

// Helper function to get interactions by customer
export const getInteractionsByCustomer = (customerId) => {
    return sampleInteractions
        .filter(i => i.customerId === customerId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper function to get interactions by job
export const getInteractionsByJob = (jobId) => {
    return sampleInteractions
        .filter(i => i.jobId === jobId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper function to get interactions by date range
export const getInteractionsByDateRange = (startDate, endDate) => {
    return sampleInteractions
        .filter(i => {
            const timestamp = new Date(i.timestamp);
            return timestamp >= new Date(startDate) && timestamp <= new Date(endDate);
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper function to get interactions by type
export const getInteractionsByType = (type) => {
    return sampleInteractions
        .filter(i => i.type === type)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper function to get interactions by category
export const getInteractionsByCategory = (category) => {
    return sampleInteractions
        .filter(i => i.category === category)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};
