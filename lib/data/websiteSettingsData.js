import { Wind, Snowflake, Waves, Droplets, Flame, FlameKindling, MapPin, CheckCircle, Award, MessageCircle, Clock, Calendar, UserPlus, Image as ImageIcon, Map, Star, Building2, FileText, HelpCircle, Search } from 'lucide-react';

export const categoryGroups = [
    {
        id: 'homepage',
        label: 'Homepage Settings',
        description: 'Manage homepage-specific content and sections',
        color: '#3b82f6',
        hasAddNew: true
    },
    {
        id: 'category-pages',
        label: 'Category Pages Settings',
        description: 'Configure category-level service pages',
        color: '#10b981',
        hasAddNew: true
    },
    {
        id: 'subcategory-pages',
        label: 'Sub Category Pages Settings',
        description: 'Configure sub-category service pages',
        color: '#f59e0b',
        hasAddNew: true
    },
    {
        id: 'location-pages',
        label: 'Location Pages Settings',
        description: 'Configure location-specific pages',
        color: '#8b5cf6',
        hasAddNew: true
    },
    {
        id: 'sublocation-pages',
        label: 'Sub Location Pages Settings',
        description: 'Configure sub-location service pages',
        color: '#06b6d4',
        hasAddNew: true
    },
    {
        id: 'global',
        label: 'Global Settings',
        description: 'Manage global website content and configurations',
        color: '#ec4899',
        hasAddNew: true
    }
];

export const settingsByCategory = {
    homepage: [
        {
            id: 'header-locations',
            label: 'Homepage Header Locations',
            icon: MapPin,
            description: 'Manage locations displayed in the header dropdown',
            color: '#10b981'
        },
        {
            id: 'frequent-services',
            label: 'Homepage Frequently Booked Services',
            icon: Star,
            description: 'Manage services shown in the frequently booked section',
            color: '#8b5cf6'
        },
        {
            id: 'why-choose-us',
            label: 'Homepage Why Choose Us',
            icon: Award,
            description: 'Edit the "Why Choose Us" section content and titles',
            color: '#ec4899'
        },
        {
            id: 'how-it-works',
            label: 'Homepage How It Works',
            icon: CheckCircle,
            description: 'Edit the "How it Works" section content',
            color: '#06b6d4'
        },
        {
            id: 'brand-logos',
            label: 'Homepage Brand Logos',
            icon: ImageIcon,
            description: 'Manage brand logos displayed in the ticker',
            color: '#8b5cf6'
        },
        {
            id: 'footer-locations',
            label: 'Homepage Footer Other Office Locations',
            icon: Building2,
            description: 'Manage office locations in footer',
            color: '#84cc16'
        }
    ],
    'category-pages': [
        { id: 'cat-ac', label: 'Air Conditioner Page Settings', url: '/services/ac-repair', icon: Wind, description: 'Manage settings for the main AC category page', color: '#10b981' },
        { id: 'cat-fridge', label: 'Refrigerator Page Settings', url: '/services/refrigerator', icon: Snowflake, description: 'Manage settings for the main Refrigerator category page', color: '#3b82f6' },
        { id: 'cat-wm', label: 'Washing Machine Page Settings', url: '/services/washing-machine', icon: Waves, description: 'Manage settings for the main Washing Machine category page', color: '#8b5cf6' },
        { id: 'cat-ro', label: 'RO / Water Purifier Page Settings', url: '/services/water-purifier', icon: Droplets, description: 'Manage settings for the main RO category page', color: '#06b6d4' },
        { id: 'cat-oven', label: 'Oven Page Settings', url: '/services/oven', icon: Flame, description: 'Manage settings for the main Oven category page', color: '#f59e0b' },
        { id: 'cat-hob', label: 'Hob Top Gas Stoves Page Settings', url: '/services/hob', icon: FlameKindling, description: 'Manage settings for the main Hob category page', color: '#ef4444' }
    ],
    'subcategory-pages': [
        // AC Sub
        { id: 'sub-split-ac', label: 'Split AC Page Settings', url: '/services/ac-repair/split-ac', icon: Wind, description: 'Configure Split AC service page', color: '#10b981' },
        { id: 'sub-window-ac', label: 'Window AC Page Settings', url: '/services/ac-repair/window-ac', icon: Wind, description: 'Configure Window AC service page', color: '#10b981' },
        { id: 'sub-cassette-ac', label: 'Cassette AC Page Settings', url: '/services/ac-repair/cassette-ac', icon: Wind, description: 'Configure Cassette AC service page', color: '#10b981' },
        { id: 'sub-tower-ac', label: 'Tower AC Page Settings', url: '/services/ac-repair/tower-ac', icon: Wind, description: 'Configure Tower AC service page', color: '#10b981' },
        // Fridge Sub
        { id: 'sub-single-fridge', label: 'Single Door Refrigerator Page Settings', url: '/services/refrigerator/single-door', icon: Snowflake, description: 'Configure Single Door Fridge content', color: '#3b82f6' },
        { id: 'sub-double-fridge', label: 'Double Door Refrigerator Page Settings', url: '/services/refrigerator/double-door', icon: Snowflake, description: 'Configure Double Door Fridge content', color: '#3b82f6' },
        { id: 'sub-side-fridge', label: 'Side By Side Refrigerator Page Settings', url: '/services/refrigerator/side-by-side', icon: Snowflake, description: 'Configure Side By Side Fridge content', color: '#3b82f6' },
        // WM Sub
        { id: 'sub-top-wm', label: 'Top Load Washing Machine Page Settings', url: '/services/washing-machine/top-load', icon: Waves, description: 'Configure Top Load WM content', color: '#8b5cf6' },
        { id: 'sub-front-wm', label: 'Front Load Washing Machine Page Settings', url: '/services/washing-machine/front-load', icon: Waves, description: 'Configure Front Load WM content', color: '#8b5cf6' },
        { id: 'sub-semi-wm', label: 'Semi Automatic Washing Machine Page Settings', url: '/services/washing-machine/semi-automatic', icon: Waves, description: 'Configure Semi Automatic WM content', color: '#8b5cf6' },
        // RO Sub
        { id: 'sub-uv-ro', label: 'UV Water Purifier Page Settings', url: '/services/water-purifier/uv', icon: Droplets, description: 'Configure UV RO content', color: '#06b6d4' },
        { id: 'sub-ro-ro', label: 'RO Water Purifier Page Settings', url: '/services/water-purifier/ro', icon: Droplets, description: 'Configure RO content', color: '#06b6d4' },
        { id: 'sub-alkaline-ro', label: 'Alkaline Water Purifier Page Settings', url: '/services/water-purifier/alkaline', icon: Droplets, description: 'Configure Alkaline RO content', color: '#06b6d4' },
        // Oven Sub
        { id: 'sub-solo-oven', label: 'Solo Microwave Oven Page Settings', url: '/services/oven/solo', icon: Flame, description: 'Configure Solo Oven content', color: '#f59e0b' },
        { id: 'sub-grill-oven', label: 'Grill Microwave Oven Page Settings', url: '/services/oven/grill', icon: Flame, description: 'Configure Grill Oven content', color: '#f59e0b' },
        { id: 'sub-convection-oven', label: 'Convection Microwave Oven Page Settings', url: '/services/oven/convection', icon: Flame, description: 'Configure Convection Oven content', color: '#f59e0b' },
        // Hob Sub
        { id: 'sub-2-hob', label: '2 Burners HOB Top Stove Page Settings', url: '/services/hob/2-burners', icon: FlameKindling, description: 'Configure 2 Burner Hob content', color: '#ef4444' },
        { id: 'sub-3-hob', label: '3 Burners HOB Top Stove Page Settings', url: '/services/hob/3-burners', icon: FlameKindling, description: 'Configure 3 Burner Hob content', color: '#ef4444' },
        { id: 'sub-4-hob', label: '4 Burners HOB Top Stove Page Settings', url: '/services/hob/4-burners', icon: FlameKindling, description: 'Configure 4 Burner Hob content', color: '#ef4444' },
        { id: 'sub-5-hob', label: '5 Burners HOB Top Stove Page Settings', url: '/services/hob/5-burners', icon: FlameKindling, description: 'Configure 5 Burner Hob content', color: '#ef4444' }
    ],
    'location-pages': [
        "Andheri", "Malad", "Jogeshwari", "Kandivali", "Goregaon",
        "Ville Parle", "Santacruz", "Bandra", "Khar", "Mahim",
        "Dadar", "Powai", "Saki Naka", "Ghatkopar", "Kurla"
    ].map(loc => ({
        id: `loc-${loc.toLowerCase().replace(/\s+/g, '-')}`,
        label: `${loc} Page Settings`,
        url: `/location/${loc.toLowerCase().replace(/\s+/g, '-')}`,
        icon: MapPin,
        description: `Manage content for ${loc} location page`,
        color: '#8b5cf6'
    })),
    'sublocation-pages': (() => {
        const locs = ["Andheri", "Malad", "Jogeshwari", "Kandivali", "Goregaon", "Ville Parle", "Santacruz", "Bandra", "Khar", "Mahim", "Dadar", "Powai", "Saki Naka", "Ghatkopar", "Kurla"];
        const svcs = [
            { name: "AC", full: "Air Conditioner", icon: Wind, color: '#10b981', slug: 'ac' },
            { name: "Fridge", full: "Refrigerator", icon: Snowflake, color: '#3b82f6', slug: 'fridge' },
            { name: "WM", full: "Washing Machine", icon: Waves, color: '#8b5cf6', slug: 'washing-machine' },
            { name: "RO", full: "Water Purifier", icon: Droplets, color: '#06b6d4', slug: 'water-purifier' },
            { name: "Oven", full: "Oven", icon: Flame, color: '#f59e0b', slug: 'oven' },
            { name: "Hob", full: "Hob Top Gas Stoves", icon: FlameKindling, color: '#ef4444', slug: 'hob' }
        ];
        const items = [];
        locs.forEach(loc => {
            svcs.forEach(svc => {
                items.push({
                    id: `sloc-${loc.toLowerCase().replace(/\s+/g, '-')}-${svc.name.toLowerCase()}`,
                    label: `${svc.name} ${loc} Page Settings`,
                    url: `/location/${loc.toLowerCase().replace(/\s+/g, '-')}/${svc.slug}`,
                    icon: svc.icon,
                    description: `Manage ${svc.full} in ${loc} page content`,
                    color: svc.color
                });
            });
        });
        return items;
    })(),
    global: [
        {
            id: 'faqs',
            label: 'Global FAQs Management',
            icon: HelpCircle,
            description: 'Manage frequently asked questions across the website',
            color: '#f97316'
        },
        {
            id: 'testimonials',
            label: 'Customer Testimonials',
            icon: MessageCircle,
            description: 'Manage customer reviews and testimonials',
            color: '#14b8a6'
        },
        {
            id: 'booking-slots',
            label: 'Booking Slots Management',
            icon: Clock,
            description: 'Configure available time slots for service bookings',
            color: '#3b82f6'
        },
        {
            id: 'quick-booking',
            label: 'Global Quick Booking Form',
            icon: Calendar,
            description: 'Configure the quick booking form used across the site',
            color: '#f59e0b'
        },
        {
            id: 'technician-join-form',
            label: 'Technician Join Form',
            icon: UserPlus,
            description: 'Configure the join form for new technicians',
            color: '#3b82f6'
        },
        {
            id: 'service-icons',
            label: 'Service Icons Management',
            icon: Map,
            description: 'Manage icons shown on Category/Subcategory and other pages',
            color: '#10b981'
        },
        {
            id: 'seo-settings',
            label: 'SEO Settings',
            icon: Search,
            description: 'Manage meta tags, schema markup and keywords',
            color: '#0ea5e9'
        },
        {
            id: 'static-pages',
            label: 'Static Pages Settings',
            icon: FileText,
            description: 'Manage content for static pages like About Us, Contact, etc.',
            color: '#6366f1'
        }
    ]
};
