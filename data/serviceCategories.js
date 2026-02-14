// Service categories for the landing page
export const serviceCategories = [
    {
        id: 'ac',
        name: 'AC',
        icon: '❄️',
        color: '#3b82f6',
        route: '/services/ac',
        badge: null,
        subcategories: [
            { id: 'window-ac', name: 'Window AC', route: '/services/window-ac' },
            { id: 'split-ac', name: 'Split AC', route: '/services/split-ac' },
        ],
    },
    {
        id: 'refrigerator',
        name: 'Refrigerator',
        icon: '🧊',
        color: '#06b6d4',
        route: '/services/refrigerator',
        badge: null,
        subcategories: [
            { id: 'single-door', name: 'Single Door Refrigerator', route: '/services/single-door-refrigerator' },
            { id: 'double-door', name: 'Double Door Refrigerator', route: '/services/double-door-refrigerator' },
            { id: 'freezer', name: 'Freezer Refrigerator', route: '/services/freezer-refrigerator' },
            { id: 'sidebyside', name: 'Side By Side Refrigerator', route: '/services/sidebyside-refrigerator' },
        ],
    },
    {
        id: 'washing-machine',
        name: 'Washing Machine',
        icon: '🧺',
        color: '#8b5cf6',
        route: '/services/wm',
        badge: null,
        subcategories: [
            { id: 'semiauto', name: 'Semi Automatic Washing Machine', route: '/services/semiauto-wm' },
            { id: 'frontload', name: 'Front Load Washing Machine', route: '/services/frontload-wm' },
            { id: 'topload', name: 'Top Load Washing Machine', route: '/services/topload-wm' },
        ],
    },
    {
        id: 'ro',
        name: 'RO / Water Purifier',
        icon: '💧',
        color: '#14b8a6',
        route: '/services/ro',
        badge: null,
        subcategories: [
            { id: 'domestic', name: 'Domestic Water Purifiers', route: '/services/domestic-ro' },
            { id: 'commercial', name: 'Commercial / Plant Purifiers', route: '/services/comm-ro' },
            { id: 'undersink', name: 'Under The Sink Water Purifiers', route: '/services/undersink-ro' },
        ],
    },
    {
        id: 'oven',
        name: 'Oven',
        icon: '📡',
        color: '#ec4899',
        route: '/services/ovens',
        badge: null,
        subcategories: [
            { id: 'microwave', name: 'Microwave Oven', route: '/services/microwave-oven' },
            { id: 'otg', name: 'OTG Oven', route: '/services/otg-oven' },
            { id: 'inbuilt', name: 'In-Built Oven', route: '/services/inbuilt-oven' },
        ],
    },
    {
        id: 'hobtop',
        name: 'Hob Top Gas Stoves',
        icon: '🔥',
        color: '#f59e0b',
        route: '/services/hobtops',
        badge: null,
        subcategories: [
            { id: '2br', name: '2 Burners HOB Top Stove', route: '/services/2br-hob' },
            { id: '3br', name: '3 Burners HOB Top Stove', route: '/services/3br-hob' },
            { id: '4br', name: '4 Burners HOB Top Stove', route: '/services/4br-hob' },
            { id: '5br', name: '5 Burners HOB Top Stove', route: '/services/5br-hob' },
        ],
    },
]

// Cities for location selector
export const cities = [
    { id: 'mumbai', name: 'Mumbai', areas: ['Andheri', 'Bandra', 'Dadar', 'Powai'] },
    { id: 'delhi', name: 'Delhi', areas: ['Connaught Place', 'Dwarka', 'Rohini', 'Saket'] },
    { id: 'bangalore', name: 'Bangalore', areas: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout'] },
    { id: 'pune', name: 'Pune', areas: ['Kothrud', 'Viman Nagar', 'Hinjewadi', 'Wakad'] },
]

export default serviceCategories
