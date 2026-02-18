// Interaction types and categories

export const interactionCategories = [
    { id: 'acquisition', label: 'Customer Acquisition', color: '#3b82f6' },
    { id: 'account', label: 'Account Management', color: '#8b5cf6' },
    { id: 'job', label: 'Job/Booking', color: '#10b981' },
    { id: 'sales', label: 'Sales/Transactions', color: '#f59e0b' },
    { id: 'communication', label: 'Communication', color: '#06b6d4' }
];

export const interactionTypes = {
    // Customer Acquisition
    'clicked-google-ad': {
        label: 'Clicked Google Ad',
        category: 'acquisition',
        icon: '🎯',
        description: 'Customer clicked on sponsored Google Ad'
    },
    'visited-website': {
        label: 'Visited Website',
        category: 'acquisition',
        icon: '🌐',
        description: 'Customer visited website'
    },
    'called-from-ad': {
        label: 'Called from Google Ad',
        category: 'acquisition',
        icon: '📞',
        description: 'Customer called after seeing Google Ad'
    },
    'direct-call': {
        label: 'Direct Call',
        category: 'acquisition',
        icon: '☎️',
        description: 'Customer called directly'
    },
    'referral': {
        label: 'Referral',
        category: 'acquisition',
        icon: '👥',
        description: 'Customer referred by someone'
    },
    'walk-in': {
        label: 'Walk-in',
        category: 'acquisition',
        icon: '🚶',
        description: 'Customer visited office'
    },

    // Account Management
    'account-created-admin': {
        label: 'Account Created by Admin',
        category: 'account',
        icon: '👤',
        description: 'Admin created customer account'
    },
    'account-created-website': {
        label: 'Account Created via Website',
        category: 'account',
        icon: '✨',
        description: 'Customer signed up via website'
    },
    'account-updated': {
        label: 'Account Updated',
        category: 'account',
        icon: '✏️',
        description: 'Account details updated'
    },
    'account-deleted': {
        label: 'Account Deleted',
        category: 'account',
        icon: '🗑️',
        description: 'Account removed from system'
    },
    'user-login': {
        label: 'User Logged In',
        category: 'account',
        icon: '🔑',
        description: 'User successfully logged into the system'
    },
    'user-logout': {
        label: 'User Logged Out',
        category: 'account',
        icon: '🚪',
        description: 'User logged out of the system'
    },

    // Job/Booking
    'booking-created-website': {
        label: 'Created Booking via Website',
        category: 'job',
        icon: '📅',
        description: 'Customer created booking online'
    },
    'job-created-admin': {
        label: 'Job Created by Admin',
        category: 'job',
        icon: '🔧',
        description: 'Admin created job for customer'
    },
    'job-assigned': {
        label: 'Job Assigned',
        category: 'job',
        icon: '👨‍🔧',
        description: 'Technician assigned to job'
    },
    'job-started': {
        label: 'Job Started',
        category: 'job',
        icon: '▶️',
        description: 'Technician started working on job'
    },
    'job-completed': {
        label: 'Job Completed',
        category: 'job',
        icon: '✅',
        description: 'Job completed successfully'
    },
    'job-cancelled': {
        label: 'Job Cancelled',
        category: 'job',
        icon: '❌',
        description: 'Job cancelled'
    },

    // Sales/Transactions
    'sales-invoice-created': {
        label: 'Sales Invoice Created',
        category: 'sales',
        icon: '📄',
        description: 'Sales invoice generated'
    },
    'payment-received': {
        label: 'Payment Received',
        category: 'sales',
        icon: '💰',
        description: 'Payment collected from customer'
    },
    'quotation-sent': {
        label: 'Quotation Sent',
        category: 'sales',
        icon: '📋',
        description: 'Quotation sent to customer'
    },
    'quotation-accepted': {
        label: 'Quotation Accepted',
        category: 'sales',
        icon: '✔️',
        description: 'Customer accepted quotation'
    },
    'purchase-invoice-created': {
        label: 'Purchase Invoice Created',
        category: 'sales',
        icon: '🧾',
        description: 'Purchase invoice created'
    },
    'sales-invoice-edited': {
        label: 'Sales Invoice Edited',
        category: 'sales',
        icon: '✏️',
        description: 'Admin edited sales invoice'
    },
    'purchase-invoice-edited': {
        label: 'Purchase Invoice Edited',
        category: 'sales',
        icon: '✏️',
        description: 'Admin edited purchase invoice'
    },
    'quotation-edited': {
        label: 'Quotation Edited',
        category: 'sales',
        icon: '✏️',
        description: 'Admin edited quotation'
    },
    'receipt-voucher-edited': {
        label: 'Receipt Voucher Edited',
        category: 'sales',
        icon: '✏️',
        description: 'Admin edited receipt voucher'
    },
    'payment-voucher-edited': {
        label: 'Payment Voucher Edited',
        category: 'sales',
        icon: '✏️',
        description: 'Admin edited payment voucher'
    },

    // Communication
    'email-sent': {
        label: 'Email Sent',
        category: 'communication',
        icon: '📧',
        description: 'Email sent to customer'
    },
    'sms-sent': {
        label: 'SMS Sent',
        category: 'communication',
        icon: '💬',
        description: 'SMS notification sent'
    },
    'whatsapp-message': {
        label: 'WhatsApp Message',
        category: 'communication',
        icon: '📱',
        description: 'WhatsApp message sent'
    },
    'call-made': {
        label: 'Call Made',
        category: 'communication',
        icon: '📞',
        description: 'Outbound call to customer'
    },
    'call-received': {
        label: 'Call Received',
        category: 'communication',
        icon: '📲',
        description: 'Inbound call from customer'
    }
};

// Get interaction type details
export const getInteractionType = (typeId) => {
    return interactionTypes[typeId] || {
        label: typeId,
        category: 'other',
        icon: '📌',
        description: 'Unknown interaction type'
    };
};

// Get category details
export const getCategory = (categoryId) => {
    return interactionCategories.find(c => c.id === categoryId) || {
        id: 'other',
        label: 'Other',
        color: '#6b7280'
    };
};

// Customer acquisition sources
export const acquisitionSources = [
    { id: 'google-ads', label: 'Google Ads', icon: '🎯' },
    { id: 'website-organic', label: 'Website (Organic)', icon: '🌐' },
    { id: 'direct-call', label: 'Direct Call', icon: '☎️' },
    { id: 'referral', label: 'Referral', icon: '👥' },
    { id: 'walk-in', label: 'Walk-in', icon: '🚶' },
    { id: 'facebook', label: 'Facebook', icon: '📘' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
    { id: 'repeat-customer', label: 'Repeat Customer', icon: '🔄' },
    { id: 'other', label: 'Other', icon: '📌' }
];
