'use client'

import { useState, useEffect } from 'react';
import { categoryGroups } from '@/lib/data/websiteSettingsData';
import * as Icons from 'lucide-react';

// Settings Components
import HeaderLocations from './HeaderLocations';
import QuickBookingFormSettings from './QuickBookingFormSettings';
import FrequentlyBookedServicesSettings from './FrequentlyBookedServicesSettings';
import FooterLocationsSettings from './FooterLocationsSettings';
import FAQsManagement from './FAQsManagement';
import HowItWorksSettings from './HowItWorksSettings';
import WhyChooseUsSettings from './WhyChooseUsSettings';
import BrandLogosSettings from './BrandLogosSettings';
import HomepageBrandLogosSettings from './HomepageBrandLogosSettings';
import CustomerTestimonialsSettings from './CustomerTestimonialsSettings';
import StaticPagesSettings from './StaticPagesSettings';
import PageSettingsManager from '@/components/reports/PageSettingsManager';
import PageBuilderTool from './PageBuilderTool';
import GoogleAPIsSettings from '@/components/reports/GoogleAPIsSettings';
import WebsiteAnalytics from '@/components/reports/WebsiteAnalytics';

const LOCATIONS = [
    "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
    "ville-parle", "santacruz", "bandra", "khar", "mahim",
    "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
];

// Static settings (homepage, global) that never change
import { staticSettingsByCategory } from '@/lib/data/websiteSettingsData';

/**
 * Build the dynamic settingsByCategory object from live appliance data fetched from the API.
 * Category/subcategory/location/sublocation entries come from DB; homepage & global are static.
 */
function buildDynamicSettings(applianceData, staticSettings) {
    const result = { ...(staticSettings || {}) };

    const categoryPages = [];
    const subcategoryPages = [];
    const locationPages = [];
    const sublocationPages = [];

    (applianceData || []).forEach(appliance => {
        const slug = appliance.slug;
        const color = appliance.color || '#10b981';
        const IconComp = Icons[appliance.icon_name] || Icons.Package;

        // Category page entry
        categoryPages.push({
            id: `cat-${slug}`,
            label: `${appliance.name} Page Settings`,
            url: `/services/${slug}`,
            icon: IconComp,
            description: `Manage settings for the main ${appliance.name} category page`,
            color
        });

        // Subcategory page entries
        (appliance.subcategories || []).forEach(sub => {
            const subSlug = sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-');
            subcategoryPages.push({
                id: `sub-${slug}-${subSlug}`,
                label: `${sub.name} Page Settings`,
                url: `/services/${slug}/${subSlug}`,
                icon: IconComp,
                description: `Configure ${sub.name} service page under ${appliance.name}`,
                color
            });
        });

        // Sub-location pages (15 locations × this appliance)
        LOCATIONS.forEach(loc => {
            const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            sublocationPages.push({
                id: `sloc-${loc}-${slug}`,
                label: `${appliance.name} in ${locName}`,
                url: `/location/${loc}/${slug}`,
                icon: Icons.MapPin,
                description: `Manage ${appliance.name} service content for ${locName}`,
                color: '#8b5cf6'
            });
        });
    });

    // All 15 location pages (one per location, not per appliance)
    LOCATIONS.forEach(loc => {
        const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        locationPages.push({
            id: `loc-${loc}`,
            label: `${locName} Page Settings`,
            url: `/location/${loc}`,
            icon: Icons.MapPin,
            description: `Manage content for ${locName} location page`,
            color: '#8b5cf6'
        });
    });

    // Helper to merge and deduplicate by ID
    const mergePages = (staticKey, dynamicList) => {
        const pageMap = new Map();
        // Add static ones first
        (staticSettings[staticKey] || []).forEach(p => pageMap.set(p.id, p));
        // Add dynamic ones (can overwrite static if same ID)
        dynamicList.forEach(p => pageMap.set(p.id, p));
        return Array.from(pageMap.values());
    };

    result['category-pages'] = mergePages('category-pages', categoryPages);
    result['subcategory-pages'] = mergePages('subcategory-pages', subcategoryPages);
    result['location-pages'] = mergePages('location-pages', locationPages);
    result['sublocation-pages'] = mergePages('sublocation-pages', sublocationPages);

    return result;
}

function WebsiteSettings({ subSection, setSubSection }) {
    const [activeCategory, setActiveCategory] = useState(null);
    const [settingsByCategory, setSettingsByCategory] = useState(staticSettingsByCategory || {});
    const [loadingAppliances, setLoadingAppliances] = useState(true);

    // Fetch live appliance data to build dynamic settings menu
    useEffect(() => {
        fetchApplianceData();
    }, []);

    const fetchApplianceData = async () => {
        setLoadingAppliances(true);
        try {
            // Fetch appliance metadata (for auto-generated pages) and the actual active pages from DB in parallel
            const [applianceRes, activePagesRes] = await Promise.all([
                fetch('/api/settings/appliances'),
                fetch('/api/settings/active-pages')
            ]);
            const [applianceData, activePagesData] = await Promise.all([
                applianceRes.json(),
                activePagesRes.json()
            ]);

            let dynamicSettings = buildDynamicSettings(
                applianceData.success ? applianceData.data : [],
                staticSettingsByCategory
            );

            // Also merge any manually-created pages that aren't yet in appliance data
            if (activePagesData.success && activePagesData.data?.length > 0) {
                const KNOWN_LOCS = ['andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
                    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim', 'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'];

                const KNOWN_CATS = [
                    'ac-repair', 'washing-machine-repair', 'refrigerator-repair',
                    'oven-repair', 'hob-repair', 'water-purifier-repair',
                    'dishwasher-repair', 'microwave-repair', 'dryer-repair'
                ];
                const getPageUrlFromId = (pageId) => {
                    if (pageId.startsWith('cat-')) return `/services/${pageId.replace('cat-', '')}`;
                    if (pageId.startsWith('sub-')) {
                        const rest = pageId.replace('sub-', '');
                        const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
                        if (cat) return `/services/${cat}/${rest.replace(cat + '-', '')}`;
                        // Fallback: split at midpoint
                        const parts = rest.split('-');
                        if (parts.length >= 2) {
                            const mid = Math.ceil(parts.length / 2);
                            return `/services/${parts.slice(0, mid).join('-')}/${parts.slice(mid).join('-')}`;
                        }
                        return `/services/${rest}`;
                    }
                    if (pageId.startsWith('loc-')) return `/location/${pageId.replace('loc-', '')}`;
                    if (pageId.startsWith('sloc-')) {
                        const rest = pageId.replace('sloc-', '');
                        const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
                        return loc ? `/location/${loc}/${rest.replace(loc + '-', '')}` : `/location/${rest}`;
                    }
                    return `/${pageId}`;
                };

                const typeToCategoryKey = {
                    category: 'category-pages', cat: 'category-pages',
                    subcategory: 'subcategory-pages', sub: 'subcategory-pages',
                    location: 'location-pages', loc: 'location-pages',
                    sublocation: 'sublocation-pages', 'sub-loc': 'sublocation-pages',
                };

                activePagesData.data.forEach(page => {
                    const categoryKey = typeToCategoryKey[page.page_type];
                    if (!categoryKey) return;

                    const existingIds = new Set((dynamicSettings[categoryKey] || []).map(p => p.id));
                    if (!existingIds.has(page.page_id)) {
                        // This is a manually-created page not in the appliance system — add it
                        const displayTitle = page.hero_settings?.title ||
                            page.page_id.replace(/^(cat|sub|loc|sloc)-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        dynamicSettings[categoryKey] = [
                            ...(dynamicSettings[categoryKey] || []),
                            {
                                id: page.page_id,
                                label: `${displayTitle} Page Settings`,
                                url: getPageUrlFromId(page.page_id),
                                icon: Icons.MapPin,
                                description: `Manage sections for ${displayTitle}`,
                                color: '#6366f1'
                            }
                        ];
                    }
                });
            }

            setSettingsByCategory(dynamicSettings);
            return dynamicSettings; // Return so callers can use it immediately
        } catch (e) {
            console.error('Failed to fetch appliance data for WebsiteSettings:', e);
            return null;
        } finally {
            setLoadingAppliances(false);
        }
    };

    // Sync activeCategory with subSection from parent
    useEffect(() => {
        if (!subSection) {
            setActiveCategory(null);
        } else {
            const group = categoryGroups.find(g => g.label === subSection || g.id === subSection);
            if (group) {
                setActiveCategory(group.id);
            } else {
                const allSettings = Object.values(settingsByCategory).flat();
                const setting = allSettings.find(s => s.id === subSection || s.label === subSection);
                if (setting) setActiveCategory(setting.id);
            }
        }
    }, [subSection, settingsByCategory]);

    const handleCategorySelect = (group) => {
        setActiveCategory(group.id);
        if (setSubSection) setSubSection(group.label);
    };

    useEffect(() => {
        return () => { if (setSubSection) setSubSection(null); };
    }, []);

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>

            {/* Category Grid - only when no category selected */}
            {!activeCategory && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    {categoryGroups.map(group => (
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
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: group.color, opacity: 0.1 }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                        {group.label}
                                    </h3>
                                    {/* Show count badges for dynamic groups */}
                                    {['category-pages', 'subcategory-pages', 'location-pages', 'sublocation-pages'].includes(group.id) && (
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: `${group.color}20`,
                                            color: group.color,
                                            fontWeight: 600
                                        }}>
                                            {loadingAppliances ? '...' : `${(settingsByCategory[group.id] || []).length} pages`}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    {group.description}
                                </p>
                            </div>
                            <div style={{ position: 'absolute', bottom: 'var(--spacing-md)', right: 'var(--spacing-md)', fontSize: 'var(--font-size-xl)', color: group.color, opacity: 0.5 }}>→</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Settings grid within a group */}
            {activeCategory && categoryGroups.find(g => g.id === activeCategory) && settingsByCategory[activeCategory] && (
                <>
                    {/* Back button */}
                    <button
                        onClick={() => { setActiveCategory(null); if (setSubSection) setSubSection(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}
                    >
                        ← Back to all settings
                    </button>

                    {loadingAppliances && ['category-pages', 'subcategory-pages', 'location-pages', 'sublocation-pages'].includes(activeCategory) && (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                            Loading pages...
                        </div>
                    )}

                    {settingsByCategory[activeCategory].length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {settingsByCategory[activeCategory].map(setting => {
                                const RawIcon = setting.icon;
                                const Icon = typeof RawIcon === 'string' ? (Icons[RawIcon] || Icons.Package) : RawIcon;
                                return (
                                    <button
                                        key={setting.id}
                                        onClick={() => handleCategorySelect(setting)}
                                        className="card"
                                        style={{ padding: 'var(--spacing-lg)', border: '2px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left', position: 'relative', overflow: 'hidden' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = setting.color; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${setting.color}20`; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: setting.color, opacity: 0.1 }} />
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                                <div style={{ padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: `${setting.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {Icon && <Icon size={24} style={{ color: setting.color }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{setting.label}</h3>
                                                    {setting.url && (
                                                        <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-primary)', opacity: 0.8, margin: '2px 0 0 0' }}>
                                                            URL :: {setting.url}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{setting.description}</p>
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 'var(--spacing-md)', right: 'var(--spacing-md)', fontSize: 'var(--font-size-xl)', color: setting.color, opacity: 0.5 }}>→</div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-elevated)', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                                No pages registered yet.
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                Go to <strong>Global Settings → Quick Booking Form → Appliances</strong> tab and use the <strong>🌐 Page Builder</strong> on each appliance to register its pages here.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Specific component renderers */}
            {activeCategory === 'header-locations' ? (
                <HeaderLocations />
            ) : activeCategory === 'quick-booking' ? (
                <QuickBookingFormSettings />
            ) : activeCategory === 'frequent-services' ? (
                <FrequentlyBookedServicesSettings />
            ) : activeCategory === 'footer-locations' ? (
                <FooterLocationsSettings />
            ) : activeCategory === 'faqs' ? (
                <FAQsManagement />
            ) : activeCategory === 'how-it-works' ? (
                <HowItWorksSettings />
            ) : activeCategory === 'why-choose-us' ? (
                <WhyChooseUsSettings />
            ) : activeCategory === 'homepage-brand-logos' ? (
                <HomepageBrandLogosSettings />
            ) : activeCategory === 'brand-logos' ? (
                <BrandLogosSettings />
            ) : activeCategory === 'testimonials' ? (
                <CustomerTestimonialsSettings />
            ) : activeCategory === 'page-builder' ? (
                <PageBuilderTool
                    onEditPage={async (page) => {
                        // Fetch fresh data first and use it directly — don't rely on stale state
                        const freshSettings = await fetchApplianceData();
                        setActiveCategory(page.page_id);
                        if (setSubSection) setSubSection(page.hero_settings?.title || page.page_id);
                    }}
                    onPageCreated={(newPageId, newPageType) => {
                        // Already refreshed in onEditPage — no need to re-fetch
                        fetchApplianceData();
                    }}
                />
            ) : activeCategory === 'google-apis' ? (
                <GoogleAPIsSettings />
            ) : activeCategory === 'website-analytics' ? (
                <WebsiteAnalytics />
            ) : activeCategory === 'static-pages' || activeCategory === 'terms-conditions' || activeCategory === 'privacy-policy' || activeCategory === 'accessibility' ? (
                <StaticPagesSettings />
            ) : activeCategory &&
                (activeCategory.startsWith('cat-') ||
                    activeCategory.startsWith('sub-') ||
                    activeCategory.startsWith('loc-') ||
                    activeCategory.startsWith('sloc-')) ? (
                (() => {
                    const allSettings = Object.values(settingsByCategory).flat();
                    const setting = allSettings.find(s => s.id === activeCategory);

                    // Derive URL from page_id directly as fallback (so newly created pages always get a URL)
                    const derivePageUrl = (id) => {
                        if (!id) return '/';
                        if (id.startsWith('cat-')) return `/services/${id.replace('cat-', '')}`;
                        if (id.startsWith('sub-')) {
                            const rest = id.replace('sub-', '');
                            const KNOWN_CATS = ['ac-repair', 'washing-machine-repair', 'refrigerator-repair', 'oven-repair', 'hob-repair', 'water-purifier-repair'];
                            const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
                            if (cat) return `/services/${cat}/${rest.replace(cat + '-', '')}`;
                            const parts = rest.split('-');
                            if (parts.length >= 2) {
                                const mid = Math.ceil(parts.length / 2);
                                return `/services/${parts.slice(0, mid).join('-')}/${parts.slice(mid).join('-')}`;
                            }
                            return `/services/${rest}`;
                        }
                        if (id.startsWith('loc-')) return `/location/${id.replace('loc-', '')}`;
                        if (id.startsWith('sloc-')) {
                            const rest = id.replace('sloc-', '');
                            const KNOWN_LOCS = ['andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon', 'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim', 'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'];
                            const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
                            return loc ? `/location/${loc}/${rest.replace(loc + '-', '')}` : `/location/${rest}`;
                        }
                        return `/${id}`;
                    };

                    return (
                        <div>
                            <button
                                onClick={() => {
                                    // Go back to the group this setting belongs to
                                    let groupId = 'category-pages';
                                    if (activeCategory.startsWith('sub-')) groupId = 'subcategory-pages';
                                    else if (activeCategory.startsWith('sloc-')) groupId = 'sublocation-pages';
                                    else if (activeCategory.startsWith('loc-')) groupId = 'location-pages';
                                    setActiveCategory(groupId);
                                    if (setSubSection) setSubSection(groupId);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}
                            >
                                ← Back
                            </button>
                            <PageSettingsManager
                                key={activeCategory}
                                pageId={activeCategory}
                                pageLabel={setting?.label || activeCategory}
                                pageUrl={setting?.url || derivePageUrl(activeCategory)}
                                onRename={(newId) => {
                                    setActiveCategory(newId);
                                    if (setSubSection) setSubSection(newId);
                                    // Optionally refresh appliance data to update the sidebar/menu
                                    fetchApplianceData();
                                }}
                            />
                        </div>
                    );
                })()
            ) : null}
        </div>
    );
}

export default WebsiteSettings;
