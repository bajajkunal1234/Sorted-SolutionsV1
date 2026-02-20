// Service page content configuration
export const howItWorksStages = [
    {
        stage: 1,
        title: "Book Your Service",
        description: "Book via our website or call our customer care. Choose your preferred date and time slot.",
        image: "/images/how-it-works/booking.png",
        icon: "📅"
    },
    {
        stage: 2,
        title: "Track Your Technician",
        description: "Track your assigned technician in real-time. Get notifications when they're on the way.",
        image: "/images/how-it-works/tracking.png",
        icon: "📍"
    },
    {
        stage: 3,
        title: "Technician Visits",
        description: "Our expert technician visits your location, diagnoses the issue, and provides a detailed assessment.",
        image: "/images/how-it-works/visit.png",
        icon: "🔧"
    },
    {
        stage: 4,
        title: "Repair & Test",
        description: "Technician repairs using genuine spare parts and thoroughly tests the appliance before leaving.",
        image: "/images/how-it-works/repair.png",
        icon: "✅"
    }
]

export const whyChooseUsFeatures = [
    {
        id: "ontime",
        title: "On-Time Service",
        description: "We value your time and ensure punctual service delivery",
        icon: "Clock"
    },
    {
        id: "history",
        title: "Complete Service History",
        description: "Access your entire service history anytime, anywhere",
        icon: "History"
    },
    {
        id: "wallet",
        title: "Digital Wallet",
        description: "Convenient digital payments and wallet management",
        icon: "Wallet"
    },
    {
        id: "properties",
        title: "Multiple Properties",
        description: "Manage services for all your properties in one place",
        icon: "Building2"
    },
    {
        id: "map",
        title: "Map View Dashboard",
        description: "Visualize all your properties and services on an interactive map",
        icon: "Map"
    },
    {
        id: "tracking",
        title: "Real-Time Tracking",
        description: "Track your technician's location in real-time",
        icon: "MapPin"
    },
    {
        id: "registration",
        title: "Product Registration",
        description: "Register all your appliances for better service management",
        icon: "Package"
    },
    {
        id: "priority",
        title: "Priority Booking",
        description: "Get priority slots and faster service for registered products",
        icon: "Star"
    }
]

export const brandLogos = [
    { name: "Samsung", logo: "/images/brands/samsung.png", size: "large" },
    { name: "Daikin", logo: "/images/brands/daikin.png", size: "medium" },
    { name: "Siemens", logo: "/images/brands/siemens.png", size: "medium" },
    { name: "Bosch", logo: "/images/brands/bosch.png", size: "large" },
    { name: "LG", logo: "/images/brands/lg.png", size: "large" },
    { name: "Voltas", logo: "/images/brands/voltas.png", size: "medium" },
    { name: "Bajaj", logo: "/images/brands/bajaj.png", size: "small" },
    { name: "Haier", logo: "/images/brands/haier.png", size: "medium" },
    { name: "Mitsubishi", logo: "/images/brands/mitsubishi.png", size: "medium" },
    { name: "Faber", logo: "/images/brands/faber.png", size: "small" },
    { name: "Glenn", logo: "/images/brands/glenn.png", size: "small" },
    { name: "Sunflame", logo: "/images/brands/sunflame.png", size: "small" }
]

export const frequentlyBookedServices = [
    {
        id: "ac-servicing",
        title: "AC Servicing",
        price: 699,
        category: "ac-repair",
        description: "Complete AC cleaning and servicing"
    },
    {
        id: "ac-jet-service",
        title: "AC Jet Service",
        price: 799,
        category: "ac-repair",
        description: "Deep cleaning with jet spray"
    },
    {
        id: "ro-annual-service",
        title: "RO Annual Service",
        price: 2199,
        category: "water-purifier-repair",
        description: "Complete RO maintenance package"
    },
    {
        id: "washing-machine-service",
        title: "Washing Machine Service",
        price: 599,
        category: "washing-machine-repair",
        description: "Full service and cleaning"
    },
    {
        id: "refrigerator-gas-refill",
        title: "Refrigerator Gas Refill",
        price: 1499,
        category: "refrigerator-repair",
        description: "Gas refilling service"
    }
]

// Subcategory data for category pages
export const subcategoriesByCategory = {
    'ac-repair': [
        {
            slug: 'window-ac',
            title: 'Window AC Repair',
            description: 'Expert repair services for window AC units',
            price: 499,
            icon: '❄️'
        },
        {
            slug: 'split-ac',
            title: 'Split AC Repair',
            description: 'Professional split AC repair and maintenance',
            price: 599,
            icon: '❄️'
        },
        {
            slug: 'cassette-ac',
            title: 'Cassette AC Repair',
            description: 'Specialized cassette AC repair services',
            price: 799,
            icon: '❄️'
        }
    ],
    'washing-machine-repair': [
        {
            slug: 'front-load',
            title: 'Front Load Repair',
            description: 'Specialized repair for front loading washing machines',
            price: 599,
            icon: '🧺'
        },
        {
            slug: 'top-load',
            title: 'Top Load Repair',
            description: 'Expert service for top loading washing machines',
            price: 499,
            icon: '🧺'
        },
        {
            slug: 'semi-automatic',
            title: 'Semi Automatic Repair',
            description: 'Reliable repair for semi-automatic washers',
            price: 399,
            icon: '🧺'
        }
    ],
    'refrigerator-repair': [
        {
            slug: 'single-door',
            title: 'Single Door Repair',
            description: 'Common repairs for single door refrigerators',
            price: 399,
            icon: '🧊'
        },
        {
            slug: 'double-door',
            title: 'Double Door Repair',
            description: 'Maintenance and repair for double door models',
            price: 599,
            icon: '🧊'
        },
        {
            slug: 'side-by-side',
            title: 'Side-by-Side Repair',
            description: 'Premium repair for side-by-side refrigerators',
            price: 899,
            icon: '🧊'
        }
    ],
    'oven-repair': [
        {
            slug: 'microwave-oven',
            title: 'Microwave Oven Repair',
            description: 'Quick and reliable microwave oven repairs',
            price: 399,
            icon: '🔥'
        },
        {
            slug: 'otg-oven',
            title: 'OTG Oven Repair',
            description: 'Expert OTG oven repair and maintenance',
            price: 449,
            icon: '🔥'
        },
        {
            slug: 'deck-oven',
            title: 'Deck Oven Repair',
            description: 'Commercial deck oven repair services',
            price: 999,
            icon: '🔥'
        }
    ],
    'water-purifier-repair': [
        {
            slug: 'ro-purifier',
            title: 'RO Service',
            description: 'Complete RO water purifier maintenance',
            price: 599,
            icon: '💧'
        },
        {
            slug: 'uv-purifier',
            title: 'UV Purifier Repair',
            description: 'Repair services for UV water purifiers',
            price: 499,
            icon: '💧'
        }
    ],
    'hob-repair': [
        {
            slug: 'built-in-hob',
            title: 'Built-in HOB Repair',
            description: 'Specialized repair for built-in kitchen hobs',
            price: 599,
            icon: '🍳'
        },
        {
            slug: 'gas-stove',
            title: 'Gas Stove Repair',
            description: 'Reliable repair for traditional gas stoves',
            price: 299,
            icon: '🍳'
        }
    ]
}
