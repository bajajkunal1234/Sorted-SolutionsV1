// Mock data for transactions in Accounts tab

// Sales Invoices
export const sampleSalesInvoices = [
    {
        id: 1,
        invoiceNo: 'SI-2024-001',
        date: '2024-01-15',
        ledgerName: 'John Doe',
        amount: 5000,
        status: 'Paid'
    },
    {
        id: 2,
        invoiceNo: 'SI-2024-002',
        date: '2024-01-18',
        ledgerName: 'Jane Smith',
        amount: 8500,
        status: 'Pending'
    },
    {
        id: 3,
        invoiceNo: 'SI-2024-003',
        date: '2024-01-20',
        ledgerName: 'Acme Corp',
        amount: 12000,
        status: 'Paid'
    },
    {
        id: 4,
        invoiceNo: 'SI-2024-004',
        date: '2024-01-22',
        ledgerName: 'Tech Solutions',
        amount: 6500,
        status: 'Overdue'
    },
    {
        id: 5,
        invoiceNo: 'SI-2024-005',
        date: '2024-01-25',
        ledgerName: 'Global Enterprises',
        amount: 15000,
        status: 'Paid'
    },
    {
        id: 6,
        invoiceNo: 'SI-2024-006',
        date: '2024-01-28',
        ledgerName: 'Sunrise Ltd',
        amount: 4200,
        status: 'Pending'
    },
    {
        id: 7,
        invoiceNo: 'SI-2024-007',
        date: '2024-01-30',
        ledgerName: 'Metro Services',
        amount: 9800,
        status: 'Paid'
    },
    {
        id: 8,
        invoiceNo: 'SI-2024-008',
        date: '2024-02-01',
        ledgerName: 'Prime Industries',
        amount: 7300,
        status: 'Pending'
    },
    {
        id: 9,
        invoiceNo: 'SI-2024-009',
        date: '2024-02-03',
        ledgerName: 'Alpha Trading',
        amount: 11500,
        status: 'Paid'
    },
    {
        id: 10,
        invoiceNo: 'SI-2024-010',
        date: '2024-02-05',
        ledgerName: 'Beta Solutions',
        amount: 5600,
        status: 'Overdue'
    }
];

// Purchase Invoices
export const samplePurchaseInvoices = [
    {
        id: 1,
        invoiceNo: 'PI-2024-001',
        date: '2024-01-10',
        supplierName: 'ABC Suppliers',
        amount: 15000,
        status: 'Pending'
    },
    {
        id: 2,
        invoiceNo: 'PI-2024-002',
        date: '2024-01-12',
        supplierName: 'XYZ Parts Co',
        amount: 8200,
        status: 'Paid'
    },
    {
        id: 3,
        invoiceNo: 'PI-2024-003',
        date: '2024-01-15',
        supplierName: 'Quality Materials',
        amount: 12500,
        status: 'Paid'
    },
    {
        id: 4,
        invoiceNo: 'PI-2024-004',
        date: '2024-01-18',
        supplierName: 'Premier Wholesale',
        amount: 9800,
        status: 'Pending'
    },
    {
        id: 5,
        invoiceNo: 'PI-2024-005',
        date: '2024-01-20',
        supplierName: 'Global Imports',
        amount: 18000,
        status: 'Paid'
    },
    {
        id: 6,
        invoiceNo: 'PI-2024-006',
        date: '2024-01-23',
        supplierName: 'Tech Components Ltd',
        amount: 6700,
        status: 'Overdue'
    },
    {
        id: 7,
        invoiceNo: 'PI-2024-007',
        date: '2024-01-26',
        supplierName: 'Industrial Supply Co',
        amount: 14200,
        status: 'Paid'
    },
    {
        id: 8,
        invoiceNo: 'PI-2024-008',
        date: '2024-01-29',
        supplierName: 'Metro Distributors',
        amount: 7500,
        status: 'Pending'
    },
    {
        id: 9,
        invoiceNo: 'PI-2024-009',
        date: '2024-02-01',
        supplierName: 'Prime Vendors',
        amount: 11000,
        status: 'Paid'
    },
    {
        id: 10,
        invoiceNo: 'PI-2024-010',
        date: '2024-02-04',
        supplierName: 'Elite Suppliers',
        amount: 9200,
        status: 'Pending'
    }
];

// Quotations
export const sampleQuotations = [
    {
        id: 1,
        quoteNo: 'QT-2024-001',
        date: '2024-01-20',
        customerName: 'Jane Smith',
        amount: 8000,
        status: 'Sent'
    },
    {
        id: 2,
        quoteNo: 'QT-2024-002',
        date: '2024-01-22',
        customerName: 'Acme Corp',
        amount: 15000,
        status: 'Accepted'
    },
    {
        id: 3,
        quoteNo: 'QT-2024-003',
        date: '2024-01-24',
        customerName: 'Tech Solutions',
        amount: 6500,
        status: 'Rejected'
    },
    {
        id: 4,
        quoteNo: 'QT-2024-004',
        date: '2024-01-26',
        customerName: 'Global Enterprises',
        amount: 12000,
        status: 'Sent'
    },
    {
        id: 5,
        quoteNo: 'QT-2024-005',
        date: '2024-01-28',
        customerName: 'Sunrise Ltd',
        amount: 9500,
        status: 'Accepted'
    },
    {
        id: 6,
        quoteNo: 'QT-2024-006',
        date: '2024-01-30',
        customerName: 'Metro Services',
        amount: 7200,
        status: 'Sent'
    },
    {
        id: 7,
        quoteNo: 'QT-2024-007',
        date: '2024-02-01',
        customerName: 'Prime Industries',
        amount: 11500,
        status: 'Draft'
    },
    {
        id: 8,
        quoteNo: 'QT-2024-008',
        date: '2024-02-03',
        customerName: 'Alpha Trading',
        amount: 8800,
        status: 'Accepted'
    },
    {
        id: 9,
        quoteNo: 'QT-2024-009',
        date: '2024-02-05',
        customerName: 'Beta Solutions',
        amount: 10200,
        status: 'Sent'
    },
    {
        id: 10,
        quoteNo: 'QT-2024-010',
        date: '2024-02-07',
        customerName: 'Omega Inc',
        amount: 13500,
        status: 'Draft'
    }
];

// Receipt Vouchers
export const sampleReceipts = [
    {
        id: 1,
        receiptNo: 'RV-2024-001',
        date: '2024-01-18',
        fromAccount: 'John Doe',
        amount: 5000,
        paymentMethod: 'Cash'
    },
    {
        id: 2,
        receiptNo: 'RV-2024-002',
        date: '2024-01-20',
        fromAccount: 'Acme Corp',
        amount: 12000,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 3,
        receiptNo: 'RV-2024-003',
        date: '2024-01-22',
        fromAccount: 'Global Enterprises',
        amount: 15000,
        paymentMethod: 'Cheque'
    },
    {
        id: 4,
        receiptNo: 'RV-2024-004',
        date: '2024-01-25',
        fromAccount: 'Metro Services',
        amount: 9800,
        paymentMethod: 'UPI'
    },
    {
        id: 5,
        receiptNo: 'RV-2024-005',
        date: '2024-01-28',
        fromAccount: 'Alpha Trading',
        amount: 11500,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 6,
        receiptNo: 'RV-2024-006',
        date: '2024-01-30',
        fromAccount: 'Jane Smith',
        amount: 8500,
        paymentMethod: 'Cash'
    },
    {
        id: 7,
        receiptNo: 'RV-2024-007',
        date: '2024-02-02',
        fromAccount: 'Sunrise Ltd',
        amount: 4200,
        paymentMethod: 'UPI'
    },
    {
        id: 8,
        receiptNo: 'RV-2024-008',
        date: '2024-02-04',
        fromAccount: 'Prime Industries',
        amount: 7300,
        paymentMethod: 'Cheque'
    },
    {
        id: 9,
        receiptNo: 'RV-2024-009',
        date: '2024-02-06',
        fromAccount: 'Tech Solutions',
        amount: 6500,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 10,
        receiptNo: 'RV-2024-010',
        date: '2024-02-08',
        fromAccount: 'Beta Solutions',
        amount: 5600,
        paymentMethod: 'Cash'
    }
];

// Payment Vouchers
export const samplePayments = [
    {
        id: 1,
        paymentNo: 'PV-2024-001',
        date: '2024-01-12',
        toAccount: 'ABC Suppliers',
        amount: 15000,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 2,
        paymentNo: 'PV-2024-002',
        date: '2024-01-14',
        toAccount: 'XYZ Parts Co',
        amount: 8200,
        paymentMethod: 'Cheque'
    },
    {
        id: 3,
        paymentNo: 'PV-2024-003',
        date: '2024-01-17',
        toAccount: 'Quality Materials',
        amount: 12500,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 4,
        paymentNo: 'PV-2024-004',
        date: '2024-01-21',
        toAccount: 'Global Imports',
        amount: 18000,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 5,
        paymentNo: 'PV-2024-005',
        date: '2024-01-24',
        toAccount: 'Industrial Supply Co',
        amount: 14200,
        paymentMethod: 'Cheque'
    },
    {
        id: 6,
        paymentNo: 'PV-2024-006',
        date: '2024-01-27',
        toAccount: 'Premier Wholesale',
        amount: 9800,
        paymentMethod: 'UPI'
    },
    {
        id: 7,
        paymentNo: 'PV-2024-007',
        date: '2024-01-31',
        toAccount: 'Prime Vendors',
        amount: 11000,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 8,
        paymentNo: 'PV-2024-008',
        date: '2024-02-03',
        toAccount: 'Metro Distributors',
        amount: 7500,
        paymentMethod: 'Cash'
    },
    {
        id: 9,
        paymentNo: 'PV-2024-009',
        date: '2024-02-05',
        toAccount: 'Elite Suppliers',
        amount: 9200,
        paymentMethod: 'Bank Transfer'
    },
    {
        id: 10,
        paymentNo: 'PV-2024-010',
        date: '2024-02-07',
        toAccount: 'Tech Components Ltd',
        amount: 6700,
        paymentMethod: 'Cheque'
    }
];
