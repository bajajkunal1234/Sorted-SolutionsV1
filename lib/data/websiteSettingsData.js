import {
    Wind,
    Snowflake,
    Waves,
    Droplets,
    Flame,
    FlameKindling,
    MapPin,
    CheckCircle,
    Award,
    MessageCircle,
    Calendar,
    Image as ImageIcon,
    Star,
    Building2,
    FileText,
    HelpCircle,
    Globe
} from 'lucide-react';

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
        description: 'Configure category-level service pages (auto-populated from appliances)',
        color: '#10b981',
        hasAddNew: false
    },
    {
        id: 'subcategory-pages',
        label: 'Sub Category Pages Settings',
        description: 'Configure sub-category service pages (auto-populated from appliance types)',
        color: '#f59e0b',
        hasAddNew: false
    },
    {
        id: 'location-pages',
        label: 'Location Pages Settings',
        description: 'Configure location-specific pages (15 Mumbai areas)',
        color: '#8b5cf6',
        hasAddNew: false
    },
    {
        id: 'sublocation-pages',
        label: 'Sub Location Pages Settings',
        description: 'Configure sub-location service pages (location × appliance combos)',
        color: '#06b6d4',
        hasAddNew: false
    },
    {
        id: 'global',
        label: 'Global Settings',
        description: 'Manage global website content and configurations',
        color: '#ec4899',
        hasAddNew: true
    },
    {
        id: 'google-apis',
        label: '🔗 Google APIs & Integrations',
        description: 'Configure GTM, GA4, Google Ads conversion, Search Console verification, GMB and LocalBusiness schema',
        color: '#4285f4',
        hasAddNew: false
    },
    {
        id: 'website-analytics',
        label: '📊 Website Analytics',
        description: 'Traffic overview, bookings funnel, top services, customers, traffic sources and top pages',
        color: '#10b981',
        hasAddNew: false
    }
];

/**
 * Static settings for Homepage and Global groups.
 * Category/Subcategory/Location/SubLocation entries are built dynamically
 * from live appliance data by WebsiteSettings.js via /api/settings/appliances.
 */
export const staticSettingsByCategory = {
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
            id: 'footer-locations',
            label: 'Homepage Footer Other Office Locations',
            icon: Building2,
            description: 'Manage office locations in footer',
            color: '#84cc16'
        }
    ],
    // category-pages, subcategory-pages, location-pages, sublocation-pages
    // are populated dynamically by WebsiteSettings.js from /api/settings/appliances
    'category-pages': [
        { id: 'cat-ac-repair', label: 'AC Repair Page', url: '/services/ac-repair', icon: 'Wind', color: '#3b82f6', categoryGroupId: 'category-pages' },
        { id: 'cat-washing-machine-repair', label: 'Washing Machine Repair Page', url: '/services/washing-machine-repair', icon: 'Waves', color: '#10b981', categoryGroupId: 'category-pages' },
        { id: 'cat-oven-repair', label: 'Oven Repair Page', url: '/services/oven-repair', icon: 'Flame', color: '#f59e0b', categoryGroupId: 'category-pages' },
        { id: 'cat-refrigerator-repair', label: 'Refrigerator Repair Page', url: '/services/refrigerator-repair', icon: 'Snowflake', color: '#8b5cf6', categoryGroupId: 'category-pages' },
        { id: 'cat-water-purifier-repair', label: 'Water Purifier Repair Page', url: '/services/water-purifier-repair', icon: 'Droplets', color: '#06b6d4', categoryGroupId: 'category-pages' },
        { id: 'cat-hob-repair', label: 'HOB Service Page', url: '/services/hob-repair', icon: 'FlameKindling', color: '#ec4899', categoryGroupId: 'category-pages' }
    ],
    'subcategory-pages': [
        { id: 'sub-ac-repair-split-ac', label: 'Split AC Service', url: '/services/ac-repair/split-ac', icon: 'Wind', color: '#3b82f6', categoryGroupId: 'subcategory-pages' },
        { id: 'sub-ac-repair-window-ac', label: 'Window AC Service', url: '/services/ac-repair/window-ac', icon: 'Wind', color: '#3b82f6', categoryGroupId: 'subcategory-pages' },
        { id: 'sub-washing-machine-repair-top-load', label: 'Top Load Washing Machine', url: '/services/washing-machine-repair/top-load', icon: 'Waves', color: '#10b981', categoryGroupId: 'subcategory-pages' },
        { id: 'sub-washing-machine-repair-front-load', label: 'Front Load Washing Machine', url: '/services/washing-machine-repair/front-load', icon: 'Waves', color: '#10b981', categoryGroupId: 'subcategory-pages' }
    ],
    'location-pages': [
        { id: 'loc-andheri', label: 'Andheri Page', url: '/location/andheri', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-malad', label: 'Malad Page', url: '/location/malad', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-jogeshwari', label: 'Jogeshwari Page', url: '/location/jogeshwari', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-kandivali', label: 'Kandivali Page', url: '/location/kandivali', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-goregaon', label: 'Goregaon Page', url: '/location/goregaon', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-ville-parle', label: 'Ville Parle Page', url: '/location/ville-parle', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-santacruz', label: 'Santacruz Page', url: '/location/santacruz', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-bandra', label: 'Bandra Page', url: '/location/bandra', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-khar', label: 'Khar Page', url: '/location/khar', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-mahim', label: 'Mahim Page', url: '/location/mahim', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-dadar', label: 'Dadar Page', url: '/location/dadar', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-powai', label: 'Powai Page', url: '/location/powai', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-saki-naka', label: 'Saki Naka Page', url: '/location/saki-naka', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-ghatkopar', label: 'Ghatkopar Page', url: '/location/ghatkopar', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' },
        { id: 'loc-kurla', label: 'Kurla Page', url: '/location/kurla', icon: 'MapPin', color: '#8b5cf6', categoryGroupId: 'location-pages' }
    ],
    'sublocation-pages': [
        // AC Repair Combinations
        { id: 'sloc-andheri-ac-repair', label: 'AC Repair in Andheri', url: '/location/andheri/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-malad-ac-repair', label: 'AC Repair in Malad', url: '/location/malad/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-bandra-ac-repair', label: 'AC Repair in Bandra', url: '/location/bandra/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-borivali-ac-repair', label: 'AC Repair in Borivali', url: '/location/borivali/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-kandivali-ac-repair', label: 'AC Repair in Kandivali', url: '/location/kandivali/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-goregaon-ac-repair', label: 'AC Repair in Goregaon', url: '/location/goregaon/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-powai-ac-repair', label: 'AC Repair in Powai', url: '/location/powai/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-ghatkopar-ac-repair', label: 'AC Repair in Ghatkopar', url: '/location/ghatkopar/ac-repair', icon: 'Wind', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },

        // Washing Machine Combinations
        { id: 'sloc-andheri-washing-machine-repair', label: 'Washing Machine Repair in Andheri', url: '/location/andheri/washing-machine-repair', icon: 'Waves', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-malad-washing-machine-repair', label: 'Washing Machine Repair in Malad', url: '/location/malad/washing-machine-repair', icon: 'Waves', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-bandra-washing-machine-repair', label: 'Washing Machine Repair in Bandra', url: '/location/bandra/washing-machine-repair', icon: 'Waves', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-powai-washing-machine-repair', label: 'Washing Machine Repair in Powai', url: '/location/powai/washing-machine-repair', icon: 'Waves', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },

        // Refrigerator Combinations
        { id: 'sloc-andheri-refrigerator-repair', label: 'Refrigerator Repair in Andheri', url: '/location/andheri/refrigerator-repair', icon: 'Snowflake', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-malad-refrigerator-repair', label: 'Refrigerator Repair in Malad', url: '/location/malad/refrigerator-repair', icon: 'Snowflake', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-bandra-refrigerator-repair', label: 'Refrigerator Repair in Bandra', url: '/location/bandra/refrigerator-repair', icon: 'Snowflake', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },

        // Microwave/Oven Combinations
        { id: 'sloc-andheri-microwave-oven-repair', label: 'Oven Repair in Andheri', url: '/location/andheri/microwave-oven-repair', icon: 'Flame', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },
        { id: 'sloc-malad-microwave-oven-repair', label: 'Oven Repair in Malad', url: '/location/malad/microwave-oven-repair', icon: 'Flame', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },

        // Water Purifier Combinations
        { id: 'sloc-andheri-water-purifier-repair', label: 'RO Service in Andheri', url: '/location/andheri/water-purifier-repair', icon: 'Droplets', color: '#06b6d4', categoryGroupId: 'sublocation-pages' },

        // HOB Combinations
        { id: 'sloc-andheri-hob-repair', label: 'HOB Service in Andheri', url: '/location/andheri/hob-repair', icon: 'FlameKindling', color: '#06b6d4', categoryGroupId: 'sublocation-pages' }
    ],
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
            id: 'quick-booking',
            label: 'Global Quick Booking Form',
            icon: Calendar,
            description: 'Manage appliances, subcategories, issues and pincode settings for the booking form',
            color: '#f59e0b'
        },
        {
            id: 'page-builder',
            label: 'Website Page Builder',
            icon: Globe,
            description: 'Register and generate frontend pages for new appliances and locations',
            color: '#6366f1'
        },
        {
            id: 'brand-logos',
            label: 'Global Brand Logos Library',
            icon: ImageIcon,
            description: 'Manage a centralized library of brand logos to be used across all service and location pages',
            color: '#8b5cf6'
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

// Keep legacy export for any files that still import settingsByCategory
export const settingsByCategory = staticSettingsByCategory;
