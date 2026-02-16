'use client'

import { useState } from 'react';
import {
    Clock,
    MapPin,
    Calendar,
    Star,
    CheckCircle,
    Award,
    MessageCircle,
    HelpCircle,
    UserPlus,
    Building2,
    FileText,
    Shield,
    Eye,
    Settings,
    Wind,
    Snowflake,
    Waves,
    Droplets,
    Flame,
    FlameKindling,
    Image as ImageIcon
} from 'lucide-react';
import BookingSlots from './BookingSlots';
import HeaderLocations from './HeaderLocations';
import QuickBookingFormSettings from './QuickBookingFormSettings';
import FrequentlyBookedServicesSettings from './FrequentlyBookedServicesSettings';
import FooterLocationsSettings from './FooterLocationsSettings';
import FAQsManagement from './FAQsManagement';
import HowItWorksSettings from './HowItWorksSettings';
import WhyChooseUsSettings from './WhyChooseUsSettings';
import BrandLogosSettings from './BrandLogosSettings';
import SEOSettings from './SEOSettings';
import CustomerTestimonialsSettings from './CustomerTestimonialsSettings';
import TechnicianJoinFormSettings from './TechnicianJoinFormSettings';
import ServiceIconsSettings from './ServiceIconsSettings';
import StaticPagesSettings from './StaticPagesSettings';
import PageSettingsManager from '@/components/reports/PageSettingsManager';

function WebsiteSettings() {
    const [activeCategory, setActiveCategory] = useState(null);

    // Debug: Verify new version is loading
    console.log('🔧 WebsiteSettings v2.0 - Reorganized with category groups');

    // Main category groups
    const categoryGroups = [
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

    // Settings within each category
    const settingsByCategory = {
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
            { id: 'sub-window-ac', label: 'Window AC Page Settings', url: '/services/ac-repair/window-ac', icon: Wind, description: 'Configure Window AC specific content', color: '#10b981' },
            { id: 'sub-split-ac', label: 'Split AC Page Settings', url: '/services/ac-repair/split-ac', icon: Wind, description: 'Configure Split AC specific content', color: '#10b981' },
            // Refrigerator Sub
            { id: 'sub-single-fridge', label: 'Single Door Refrigerator Page Settings', url: '/services/refrigerator/single-door', icon: Snowflake, description: 'Configure Single Door Fridge content', color: '#3b82f6' },
            { id: 'sub-double-fridge', label: 'Double Door Refrigerator Page Settings', url: '/services/refrigerator/double-door', icon: Snowflake, description: 'Configure Double Door Fridge content', color: '#3b82f6' },
            { id: 'sub-freezer-fridge', label: 'Freezer Refrigerator Page Settings', url: '/services/refrigerator/freezer', icon: Snowflake, description: 'Configure Freezer Fridge content', color: '#3b82f6' },
            { id: 'sub-side-fridge', label: 'Side By Side Refrigerator Page Settings', url: '/services/refrigerator/side-by-side', icon: Snowflake, description: 'Configure Side By Side Fridge content', color: '#3b82f6' },
            // WM Sub
            { id: 'sub-semi-wm', label: 'Semi Automatic Washing Machine Page Settings', url: '/services/washing-machine/semi-automatic', icon: Waves, description: 'Configure Semi-Auto WM content', color: '#8b5cf6' },
            { id: 'sub-front-wm', label: 'Front Load Washing Machine Page Settings', url: '/services/washing-machine/front-load', icon: Waves, description: 'Configure Front Load WM content', color: '#8b5cf6' },
            { id: 'sub-top-wm', label: 'Top Load Washing Machine Page Settings', url: '/services/washing-machine/top-load', icon: Waves, description: 'Configure Top Load WM content', color: '#8b5cf6' },
            // RO Sub
            { id: 'sub-domestic-ro', label: 'Domestic Water Purifiers Page Settings', url: '/services/water-purifier/domestic', icon: Droplets, description: 'Configure Domestic RO content', color: '#06b6d4' },
            { id: 'sub-commercial-ro', label: 'Commercial / Plant Purifiers Page Settings', url: '/services/water-purifier/commercial', icon: Droplets, description: 'Configure Commercial RO content', color: '#06b6d4' },
            // Oven Sub
            { id: 'sub-microwave-oven', label: 'Microwave Oven Page Settings', url: '/services/oven/microwave', icon: Flame, description: 'Configure Microwave Oven content', color: '#f59e0b' },
            { id: 'sub-otg-oven', label: 'OTG Oven Page Settings', url: '/services/oven/otg', icon: Flame, description: 'Configure OTG Oven content', color: '#f59e0b' },
            { id: 'sub-inbuilt-oven', label: 'In-Built Oven Page Settings', url: '/services/oven/in-built', icon: Flame, description: 'Configure In-Built Oven content', color: '#f59e0b' },
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
                id: 'how-it-works',
                label: 'Global How It Works',
                icon: CheckCircle,
                description: 'Edit the "How it Works" section content',
                color: '#06b6d4'
            },
            {
                id: 'why-choose-us',
                label: 'Global Why Choose Us',
                icon: Award,
                description: 'Edit the "Why Choose Us" section content',
                color: '#ec4899'
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
                id: 'technician-join',
                label: 'Technician Join Form',
                icon: UserPlus,
                description: 'Configure the technician registration form',
                color: '#6366f1'
            },
            {
                id: 'terms-conditions',
                label: 'Terms & Conditions',
                icon: FileText,
                description: 'Edit Terms & Conditions page content',
                color: '#64748b'
            },
            {
                id: 'privacy-policy',
                label: 'Privacy Policy',
                icon: Shield,
                description: 'Edit Privacy Policy page content',
                color: '#0ea5e9'
            },
            {
                id: 'accessibility',
                label: 'Accessibility Statement',
                icon: Eye,
                description: 'Edit Accessibility Statement page content',
                color: '#a855f7'
            },
            {
                id: 'faqs',
                label: "Global FAQ's Management",
                icon: HelpCircle,
                description: 'Manage frequently asked questions',
                color: '#f97316'
            },
            {
                id: 'brand-logos',
                label: 'Global Brand Logos Management',
                icon: ImageIcon,
                description: 'Manage brand logos library for all pages',
                color: '#3b82f6'
            }
        ]
    };


    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                    <Settings size={28} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>
                        Website Settings
                    </h2>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage all website content, forms, and configurations from one place
                </p>
            </div>

            {/* Category Grid - Only show when no category is selected */}
            {!activeCategory && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    {categoryGroups.map(group => {
                        return (
                            <button
                                key={group.id}
                                onClick={() => setActiveCategory(group.id)}
                                className="card"
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    border: '2px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'left',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = group.color;
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = `0 8px 24px ${group.color}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Icon Background */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    backgroundColor: group.color,
                                    opacity: 0.1
                                }} />

                                {/* Content */}
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 'var(--spacing-sm)'
                                    }}>
                                        <h3 style={{
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: 600,
                                            margin: 0,
                                            color: 'var(--text-primary)'
                                        }}>
                                            {group.label}
                                        </h3>
                                        {group.hasAddNew && (
                                            <span style={{
                                                fontSize: 'var(--font-size-xs)',
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: `${group.color}20`,
                                                color: group.color,
                                                fontWeight: 600
                                            }}>
                                                Add New
                                            </span>
                                        )}
                                    </div>
                                    <p style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-secondary)',
                                        margin: 0,
                                        lineHeight: 1.5
                                    }}>
                                        {group.description}
                                    </p>
                                </div>

                                {/* Arrow Indicator */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'var(--spacing-md)',
                                    right: 'var(--spacing-md)',
                                    fontSize: 'var(--font-size-xl)',
                                    color: group.color,
                                    opacity: 0.5
                                }}>
                                    →
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Show settings within a category group */}
            {activeCategory && categoryGroups.find(g => g.id === activeCategory) && settingsByCategory[activeCategory] && (
                <div>
                    {/* Back Button */}
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-lg)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>

                    {/* Category Header */}
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                            {categoryGroups.find(g => g.id === activeCategory)?.label}
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            {categoryGroups.find(g => g.id === activeCategory)?.description}
                        </p>
                    </div>

                    {/* Settings Grid */}
                    {settingsByCategory[activeCategory].length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
                            {settingsByCategory[activeCategory].map(setting => {
                                const Icon = setting.icon;
                                return (
                                    <button
                                        key={setting.id}
                                        onClick={() => setActiveCategory(setting.id)}
                                        className="card"
                                        style={{
                                            padding: 'var(--spacing-lg)',
                                            border: '2px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: 'var(--bg-elevated)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = setting.color;
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = `0 8px 24px ${setting.color}20`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {/* Icon Background */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-20px',
                                            right: '-20px',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            backgroundColor: setting.color,
                                            opacity: 0.1
                                        }} />

                                        {/* Content */}
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)',
                                                marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                <div style={{
                                                    padding: 'var(--spacing-sm)',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: `${setting.color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Icon size={24} style={{ color: setting.color }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{
                                                        fontSize: 'var(--font-size-base)',
                                                        fontWeight: 600,
                                                        margin: 0,
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        {setting.label}
                                                    </h3>
                                                    {setting.url && (
                                                        <p style={{
                                                            fontSize: '11px',
                                                            fontFamily: 'monospace',
                                                            color: 'var(--color-primary)',
                                                            opacity: 0.8,
                                                            margin: '2px 0 0 0'
                                                        }}>
                                                            URL :: {setting.url}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--text-secondary)',
                                                margin: 0,
                                                lineHeight: 1.5
                                            }}>
                                                {setting.description}
                                            </p>
                                        </div>

                                        {/* Arrow Indicator */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 'var(--spacing-md)',
                                            right: 'var(--spacing-md)',
                                            fontSize: 'var(--font-size-xl)',
                                            color: setting.color,
                                            opacity: 0.5
                                        }}>
                                            →
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="card" style={{
                            padding: 'var(--spacing-xl)',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '2px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                No settings available in this category yet. Click "Add New" to create one.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Category Content */}
            {activeCategory === 'booking-slots' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <BookingSlots />
                </div>
            ) : activeCategory === 'header-locations' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <HeaderLocations />
                </div>
            ) : activeCategory === 'quick-booking' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <QuickBookingFormSettings />
                </div>
            ) : activeCategory === 'frequent-services' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <FrequentlyBookedServicesSettings />
                </div>
            ) : activeCategory === 'footer-locations' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <FooterLocationsSettings />
                </div>
            ) : activeCategory === 'faqs' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <FAQsManagement />
                </div>
            ) : activeCategory === 'how-it-works' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <HowItWorksSettings />
                </div>
            ) : activeCategory === 'why-choose-us' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <WhyChooseUsSettings />
                </div>
            ) : activeCategory === 'brand-logos' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <BrandLogosSettings />
                </div>
            ) : activeCategory === 'seo-settings' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <SEOSettings />
                </div>
            ) : activeCategory === 'testimonials' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <CustomerTestimonialsSettings />
                </div>
            ) : activeCategory === 'technician-join-form' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <TechnicianJoinFormSettings />
                </div>
            ) : activeCategory === 'service-icons' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <ServiceIconsSettings />
                </div>
            ) : activeCategory === 'static-pages' || activeCategory === 'terms-conditions' || activeCategory === 'privacy-policy' || activeCategory === 'accessibility' ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    <StaticPagesSettings />
                </div>
            ) : activeCategory ? (
                <div>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: 'var(--spacing-md)', padding: '8px 16px' }}
                    >
                        ← Back to Website Settings
                    </button>
                    {(() => {
                        const setting = Object.values(settingsByCategory).flat().find(s => s.id === activeCategory);
                        if (activeCategory.startsWith('cat-') ||
                            activeCategory.startsWith('sub-') ||
                            activeCategory.startsWith('loc-') ||
                            activeCategory.startsWith('sloc-')) {
                            return (
                                <PageSettingsManager
                                    pageId={activeCategory}
                                    pageLabel={setting?.label || activeCategory}
                                />
                            );
                        }

                        // Fallback for other non-implemented settings
                        return (
                            <div className="card" style={{
                                padding: 'var(--spacing-xl)',
                                backgroundColor: 'var(--bg-elevated)',
                                border: '2px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-primary)15',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    {setting?.icon && <setting.icon size={32} style={{ color: 'var(--color-primary)' }} />}
                                </div>
                                <h3 style={{
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-sm)',
                                    color: 'var(--text-primary)'
                                }}>
                                    {setting?.label}
                                </h3>
                                <p style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-secondary)',
                                    marginBottom: 'var(--spacing-lg)'
                                }}>
                                    This management interface is under development and will be available soon.
                                </p>
                            </div>
                        );
                    })()}
                </div>
            ) : null}

            {/* Info Box */}
            {!activeCategory && (
                <div style={{
                    padding: 'var(--spacing-lg)',
                    backgroundColor: '#3b82f615',
                    border: '1px solid #3b82f640',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--spacing-lg)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: '#3b82f620',
                            flexShrink: 0
                        }}>
                            <Settings size={20} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <h4 style={{
                                fontSize: 'var(--font-size-base)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-xs)',
                                color: 'var(--text-primary)'
                            }}>
                                Centralized Website Management
                            </h4>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                margin: 0,
                                lineHeight: 1.6
                            }}>
                                All website content and configurations can be managed from this interface.
                                Click on any category above to access its management panel. Changes made here
                                will be reflected on your live website immediately.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WebsiteSettings;





