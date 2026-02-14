// Service issues mapping for instant booking form
export const serviceIssues = {
    ac: [
        'Not Cooling',
        'Water Leakage',
        'Strange Noise',
        'Not Turning On',
        'Gas Leak',
        'Remote Not Working',
        'Ice Formation',
        'Bad Smell',
        'Other',
    ],
    refrigerator: [
        'Not Cooling',
        'Ice Formation',
        'Door Not Closing',
        'Water Leakage',
        'Strange Noise',
        'Compressor Issue',
        'Light Not Working',
        'Other',
    ],
    'washing-machine': [
        'Not Starting',
        'Water Not Draining',
        'Drum Not Spinning',
        'Excessive Vibration',
        'Door Lock Issue',
        'Water Leakage',
        'Error Code Display',
        'Other',
    ],
    ro: [
        'Low Water Flow',
        'Bad Taste/Smell',
        'Leakage',
        'Filter Change Required',
        'Not Working',
        'Tank Overflow',
        'UV Light Not Working',
        'Other',
    ],
    oven: [
        'Not Heating',
        'Door Not Closing',
        'Display Error',
        'Strange Smell',
        'Turntable Not Rotating',
        'Sparking Inside',
        'Buttons Not Working',
        'Other',
    ],
    hobtop: [
        'Gas Not Igniting',
        'Flame Issues',
        'Burner Blocked',
        'Gas Leak',
        'Auto-Ignition Not Working',
        'Knob Stuck',
        'Other',
    ],
}

// Signup benefits for account promo page
export const signupBenefits = [
    {
        id: 'properties',
        icon: '🏠',
        title: 'Multiple Properties',
        description: 'Add unlimited properties and track all appliances across locations with separate service history.',
    },
    {
        id: 'registration',
        icon: '📱',
        title: 'Product Registration',
        description: 'Register all appliances, store warranties, and get timely maintenance reminders.',
    },
    {
        id: 'mapview',
        icon: '🗺️',
        title: 'Map View Dashboard',
        description: 'Visual map of all properties and appliances with quick access to service history.',
    },
    {
        id: 'history',
        icon: '📋',
        title: 'Complete Service History',
        description: 'Access all past repairs, invoices, quotations, and technician ratings.',
    },
    {
        id: 'priority',
        icon: '⚡',
        title: 'Priority Booking',
        description: 'Faster booking with saved preferences, one-click rebooking, and member discounts.',
    },
    {
        id: 'tracking',
        icon: '📍',
        title: 'Real-time Tracking',
        description: 'Track technician location live with ETA and direct communication.',
    },
    {
        id: 'wallet',
        icon: '💳',
        title: 'Digital Wallet',
        description: 'Save payment methods, view transactions, and download invoices instantly.',
    },
]

export default serviceIssues
