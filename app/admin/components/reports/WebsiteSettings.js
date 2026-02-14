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
    Settings
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

function WebsiteSettings() {
    const [activeCategory, setActiveCategory] = useState(null);

    const categories = [
        {
            id: 'booking-slots',
            label: 'Booking Slots Management',
            icon: Clock,
            description: 'Configure available time slots for service bookings',
            color: '#3b82f6'
        },
        {
            id: 'header-locations',
            label: 'Homepage Header Locations',
            icon: MapPin,
            description: 'Manage locations displayed in the header dropdown',
            color: '#10b981'
        },
        {
            id: 'quick-booking',
            label: 'Homepage Quick Booking Form',
            icon: Calendar,
            description: 'Configure the quick booking form on homepage',
            color: '#f59e0b'
        },
        {
            id: 'frequent-services',
            label: 'Homepage Frequently Booked Services',
            icon: Star,
            description: 'Manage services shown in the frequently booked section',
            color: '#8b5cf6'
        },
        {
            id: 'how-it-works',
            label: 'Global How it Works?',
            icon: CheckCircle,
            description: 'Edit the "How it Works" section content',
            color: '#06b6d4'
        },
        {
            id: 'why-choose-us',
            label: 'Global Why Choose Us?',
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
            id: 'faqs',
            label: "FAQ's",
            icon: HelpCircle,
            description: 'Manage frequently asked questions',
            color: '#f97316'
        },
        {
            id: 'technician-join',
            label: 'Technician Join Form',
            icon: UserPlus,
            description: 'Configure the technician registration form',
            color: '#6366f1'
        },
        {
            id: 'footer-locations',
            label: 'Homepage Footer Other Office Locations',
            icon: Building2,
            description: 'Manage office locations in footer',
            color: '#84cc16'
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
        }
    ];

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
                    {categories.map(category => {
                        const Icon = category.icon;
                        return (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
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
                                    e.currentTarget.style.borderColor = category.color;
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = `0 8px 24px ${category.color}20`;
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
                                    backgroundColor: category.color,
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
                                            backgroundColor: `${category.color}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Icon size={24} style={{ color: category.color }} />
                                        </div>
                                        <h3 style={{
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: 600,
                                            margin: 0,
                                            color: 'var(--text-primary)',
                                            flex: 1
                                        }}>
                                            {category.label}
                                        </h3>
                                    </div>
                                    <p style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-secondary)',
                                        margin: 0,
                                        lineHeight: 1.5
                                    }}>
                                        {category.description}
                                    </p>
                                </div>

                                {/* Arrow Indicator */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'var(--spacing-md)',
                                    right: 'var(--spacing-md)',
                                    fontSize: 'var(--font-size-xl)',
                                    color: category.color,
                                    opacity: 0.5
                                }}>
                                    →
                                </div>
                            </button>
                        );
                    })}
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
                        {(() => {
                            const category = categories.find(c => c.id === activeCategory);
                            const Icon = category?.icon;
                            return Icon ? <Icon size={32} style={{ color: 'var(--color-primary)' }} /> : null;
                        })()}
                    </div>
                    <h3 style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 600,
                        marginBottom: 'var(--spacing-sm)',
                        color: 'var(--text-primary)'
                    }}>
                        {categories.find(c => c.id === activeCategory)?.label}
                    </h3>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        This management interface is under development and will be available soon.
                    </p>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 24px' }}
                    >
                        Back to Settings
                    </button>
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
