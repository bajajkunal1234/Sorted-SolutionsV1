'use client'

import { useState, useEffect } from 'react';
import { categoryGroups, settingsByCategory } from '@/lib/data/websiteSettingsData';

function WebsiteSettings({ subSection, setSubSection }) {
    const [activeCategory, setActiveCategory] = useState(null);

    // Sync activeCategory with subSection from parent
    useEffect(() => {
        if (!subSection) {
            setActiveCategory(null);
        } else {
            // If subSection matches a group label/ID, set that group as active
            const group = categoryGroups.find(g => g.label === subSection || g.id === subSection);
            if (group) {
                setActiveCategory(group.id);
            } else {
                // Check if it's a specific setting ID
                const allSettings = Object.values(settingsByCategory).flat();
                const setting = allSettings.find(s => s.id === subSection || s.label === subSection);
                if (setting) {
                    setActiveCategory(setting.id);
                }
            }
        }
    }, [subSection]);

    const handleCategorySelect = (group) => {
        setActiveCategory(group.id);
        if (setSubSection) {
            setSubSection(group.label);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (setSubSection) setSubSection(null);
        };
    }, []);

    // Debug: Verify new version is loading
    console.log('🔧 WebsiteSettings v2.0 - Reorganized with category groups');


    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>

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
                                onClick={() => handleCategorySelect(group)}
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
                <>
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
                                        onClick={() => handleCategorySelect(setting)}
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
                </>
            )}

            {/* Category Content */}
            {activeCategory === 'booking-slots' ? (
                <div>
                    <BookingSlots />
                </div>
            ) : activeCategory === 'header-locations' ? (
                <div>
                    <HeaderLocations />
                </div>
            ) : activeCategory === 'quick-booking' ? (
                <div>
                    <QuickBookingFormSettings />
                </div>
            ) : activeCategory === 'frequent-services' ? (
                <div>
                    <FrequentlyBookedServicesSettings />
                </div>
            ) : activeCategory === 'footer-locations' ? (
                <div>
                    <FooterLocationsSettings />
                </div>
            ) : activeCategory === 'faqs' ? (
                <div>
                    <FAQsManagement />
                </div>
            ) : activeCategory === 'how-it-works' ? (
                <div>
                    <HowItWorksSettings />
                </div>
            ) : activeCategory === 'why-choose-us' ? (
                <div>
                    <WhyChooseUsSettings />
                </div>
            ) : activeCategory === 'brand-logos' ? (
                <div>
                    <BrandLogosSettings />
                </div>
            ) : activeCategory === 'seo-settings' ? (
                <div>
                    <SEOSettings />
                </div>
            ) : activeCategory === 'testimonials' ? (
                <div>
                    <CustomerTestimonialsSettings />
                </div>
            ) : activeCategory === 'technician-join-form' ? (
                <div>
                    <TechnicianJoinFormSettings />
                </div>
            ) : activeCategory === 'service-icons' ? (
                <div>
                    <ServiceIconsSettings />
                </div>
            ) : activeCategory === 'static-pages' || activeCategory === 'terms-conditions' || activeCategory === 'privacy-policy' || activeCategory === 'accessibility' ? (
                <div>
                    <StaticPagesSettings />
                </div>
            ) : activeCategory ? (
                <div>
                    {(() => {
                        const setting = Object.values(settingsByCategory).flat().find(s => s.id === activeCategory);
                        console.log('📂 WebsiteSettings Category Selection:', { activeCategory, setting });

                        if (activeCategory.startsWith('cat-') ||
                            activeCategory.startsWith('sub-') ||
                            activeCategory.startsWith('loc-') ||
                            activeCategory.startsWith('sloc-')) {
                            console.log('📑 Rendering PageSettingsManager for:', activeCategory);
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
        </div>
    );
}

export default WebsiteSettings;





