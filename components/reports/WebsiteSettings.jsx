'use client'

import { useState, useEffect } from 'react';
import {
    MapPin,
    Star,
    CheckCircle,
    Award,
    MessageCircle,
    HelpCircle,
    Building2,
    FileText,
    Shield,
    Eye,
    Settings,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Tag,
    Package,
    Wind,
    Waves,
    Snowflake,
    Flame,
    Droplets,
    Layers,
    Grid,
    ExternalLink,
    Search
} from 'lucide-react';
import HeaderLocations from './HeaderLocations';
import FrequentlyBookedServicesSettings from './FrequentlyBookedServicesSettings';
import FooterLocationsSettings from './FooterLocationsSettings';
import FAQsManagement from './FAQsManagement';
import HowItWorksSettings from './HowItWorksSettings';
import WhyChooseUsSettings from './WhyChooseUsSettings';
import BrandLogosSettings from './BrandLogosSettings';
import CustomerTestimonialsSettings from './CustomerTestimonialsSettings';
import StaticPagesSettings from './StaticPagesSettings';
import PageSettingsManager from './PageSettingsManager';
import GoogleAPIsSettings from './GoogleAPIsSettings';
import WebsiteAnalytics from './WebsiteAnalytics';


// ── Icon map for appliances ──────────────────────────────────────────────────
const ICON_MAP = {
    Wind, Waves, Snowflake, Flame, Droplets,
    Package, Tag, Settings, Layers, Grid
};

function getIcon(iconName) {
    return ICON_MAP[iconName] || Package;
}

// ── Breadcrumb Component ─────────────────────────────────────────────────────
function Breadcrumb({ crumbs, onNavigate }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 'var(--spacing-lg)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-tertiary)'
        }}>
            {crumbs.map((crumb, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx > 0 && <span>/</span>}
                    <button
                        onClick={() => onNavigate(crumbs.length - 1 - idx)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: idx === crumbs.length - 1 ? 'var(--text-primary)' : 'inherit',
                            fontWeight: idx === crumbs.length - 1 ? 600 : 400,
                            cursor: idx === crumbs.length - 1 ? 'default' : 'pointer',
                            fontSize: 'inherit'
                        }}
                    >
                        {crumb.label}
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── Group Card Component ─────────────────────────────────────────────────────
function GroupCard({ group, count, onClick }) {
    const [hover, setHover] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: 'var(--spacing-lg)',
                border: '2px solid var(--border-primary)',
                borderColor: hover ? group.color : 'var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                transform: hover ? 'translateY(-4px)' : 'none',
                boxShadow: hover ? `0 8px 24px ${group.color}20` : 'none'
            }}
        >
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

            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        {group.label}
                    </h3>
                    {count !== null && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: `${group.color}20`,
                            color: group.color
                        }}>
                            {count} pages
                        </span>
                    )}
                </div>
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                    paddingRight: '20px'
                }}>
                    {group.description}
                </p>
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    color: group.color,
                    opacity: 0.5
                }}>
                    <ChevronRight size={20} />
                </div>
            </div>
        </button>
    );
}

// ── Page Card Component ──────────────────────────────────────────────────────
function PageCard({ label, subLabel, color, pageUrl, isBuilt, onClick }) {
    const [hover, setHover] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                width: '100%',
                border: '1px solid var(--border-primary)',
                borderColor: hover ? color : 'var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: hover ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
            }}
        >
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isBuilt ? '#10b981' : '#94a3b8',
                flexShrink: 0
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {label}
                </div>
                {subLabel && (
                    <div style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {subLabel}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {pageUrl && (
                    <a
                        href={pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="View live page"
                        style={{
                            padding: '6px',
                            color: 'var(--text-tertiary)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ExternalLink size={12} />
                    </a>
                )}
                <ChevronRight size={16} style={{ color: color, opacity: 0.7 }} />
            </div>
        </button>
    );
}

// ── Page List View: Category Pages ───────────────────────────────────────────
function CategoryPageList({ appliances, color, onSelectPage }) {
    const [search, setSearch] = useState('');

    const filtered = appliances.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search category pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.4
                }} />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '10px'
            }}>
                {filtered.map(appliance => {
                    const pageId = `cat-${appliance.slug}`;
                    return (
                        <PageCard
                            key={pageId}
                            label={`${appliance.name} Repair`}
                            subLabel={`/services/${appliance.slug}`}
                            color={appliance.color || color}
                            pageUrl={`/services/${appliance.slug}`}
                            isBuilt={appliance.pageIds?.built > 0}
                            onClick={() => onSelectPage({
                                pageId,
                                pageLabel: `${appliance.name} Repair — Category Page`,
                                pageUrl: `/services/${appliance.slug}`
                            })}
                        />
                    );
                })}

                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No category pages found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Sub Category Pages ───────────────────────────────────────
function SubCategoryPageList({ appliances, color, onSelectPage }) {
    const [search, setSearch] = useState('');

    const allSubs = appliances.flatMap(a =>
        (a.subcategories || []).map(sub => ({
            ...sub,
            parentName: a.name,
            parentSlug: a.slug,
            parentColor: a.color || color,
            pageId: `sub-${a.slug}-${sub.slug}`
        }))
    ).filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.parentName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search sub-category pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.4
                }} />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '10px'
            }}>
                {allSubs.map(sub => (
                    <PageCard
                        key={sub.pageId}
                        label={`${sub.name}`}
                        subLabel={`Under ${sub.parentName} → /services/${sub.parentSlug}/${sub.slug}`}
                        color={sub.parentColor}
                        pageUrl={`/services/${sub.parentSlug}/${sub.slug}`}
                        isBuilt={false} // Would need specific build check for each sub
                        onClick={() => onSelectPage({
                            pageId: sub.pageId,
                            pageLabel: `${sub.name} — ${sub.parentName} Sub-Category Page`,
                            pageUrl: `/services/${sub.parentSlug}/${sub.slug}`
                        })}
                    />
                ))}

                {allSubs.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No sub-category pages found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Location Pages ───────────────────────────────────────────
function LocationPageList({ locations, color, onSelectPage }) {
    const [search, setSearch] = useState('');

    const filtered = locations.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search location pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.4
                }} />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '10px'
            }}>
                {filtered.map(loc => {
                    const slug = loc.slug || loc.name.toLowerCase().replace(/\s+/g, '-');
                    const pageId = `loc-${slug}`;
                    return (
                        <PageCard
                            key={pageId}
                            label={loc.name}
                            subLabel={`/${slug}`}
                            color={color}
                            pageUrl={`/${slug}`}
                            isBuilt={false}
                            onClick={() => onSelectPage({
                                pageId,
                                pageLabel: `${loc.name} — Location Page`,
                                pageUrl: `/${slug}`
                            })}
                        />
                    );
                })}

                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No location pages found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Sub Location Pages ───────────────────────────────────────
function SubLocationPageList({ appliances, color, onSelectPage }) {
    const [search, setSearch] = useState('');
    const LOCATIONS = [
        "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
        "ville-parle", "santacruz", "bandra", "khar", "mahim",
        "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
    ];

    const allSlocs = appliances.flatMap(a =>
        LOCATIONS.map(loc => {
            const locLabel = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return {
                applianceName: a.name,
                applianceSlug: a.slug,
                location: loc,
                locationLabel: locLabel,
                color: a.color || color,
                pageId: `sloc-${loc}-${a.slug}`
            };
        })
    ).filter(s =>
        s.applianceName.toLowerCase().includes(search.toLowerCase()) ||
        s.locationLabel.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search sub-location pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.4
                }} />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '10px'
            }}>
                {allSlocs.map(sloc => (
                    <PageCard
                        key={sloc.pageId}
                        label={`${sloc.applianceName} in ${sloc.locationLabel}`}
                        subLabel={`/location/${sloc.location}/${sloc.applianceSlug}`}
                        color={sloc.color}
                        pageUrl={`/location/${sloc.location}/${sloc.applianceSlug}`}
                        isBuilt={false}
                        onClick={() => onSelectPage({
                            pageId: sloc.pageId,
                            pageLabel: `${sloc.applianceName} in ${sloc.locationLabel} — Sub-Location Page`,
                            pageUrl: `/location/${sloc.location}/${sloc.applianceSlug}`
                        })}
                    />
                ))}

                {allSlocs.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No sub-location pages found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main WebsiteSettings ─────────────────────────────────────────────────────
function WebsiteSettings({ subSection, setSubSection }) {
    // nav: null → list of groups
    // { group: 'category-pages' } → page list for that group
    // { group: ..., pageId, pageLabel, pageUrl } → PageSettingsManager
    const [nav, setNav] = useState({ level: 'groups' });

    // Data
    const [appliances, setAppliances] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const SUBLOCATION_LIST = [
        "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
        "ville-parle", "santacruz", "bandra", "khar", "mahim",
        "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const res = await fetch('/api/settings/appliances');
            const data = await res.json();
            if (data.success) {
                setAppliances(data.data);
                if (data.locations) setLocations(data.locations.map(l => ({ name: l.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), slug: l })));
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const navigateToGroup = (groupId) => {
        setNav({ level: 'list', group: groupId });
        if (setSubSection) setSubSection(groupId);
    };

    const navigateToPage = (group, pageInfo) => {
        setNav({ level: 'page', group, ...pageInfo });
        if (setSubSection) setSubSection(pageInfo.pageLabel);
    };

    const navigateBack = (steps = 1) => {
        if (steps === 2 || nav.level === 'page') {
            setNav({ level: 'groups' });
            if (setSubSection) setSubSection(null);
        } else {
            setNav(prev => ({ level: 'list', group: prev.group }));
            if (setSubSection) setSubSection(nav.group);
        }
    };

    // Top-level group definitions
    const categoryGroups = [
        { id: 'homepage', label: 'Homepage Settings', description: 'Manage homepage-specific content and sections', color: '#3b82f6' },
        { id: 'global', label: 'Global Settings', description: 'Manage global website content and configurations', color: '#ec4899' },
        { id: 'category-pages', label: 'Category Pages Settings', description: `Configure category-level service pages (${appliances.length} pages)`, color: '#10b981' },
        { id: 'subcategory-pages', label: 'Sub Category Pages Settings', description: `Configure sub-category service pages (${appliances.reduce((n, a) => n + (a.subcategories?.length || 0), 0)} pages)`, color: '#f59e0b' },
        { id: 'location-pages', label: 'Location Pages Settings', description: `Configure location-specific pages (${locations.length} pages)`, color: '#8b5cf6' },
        { id: 'sublocation-pages', label: 'Sub Location Pages Settings', description: `Configure sub-location service pages (${appliances.length * SUBLOCATION_LIST.length} pages)`, color: '#06b6d4' },
        { id: 'google-apis', label: '🔗 Google APIs & Integrations', description: 'Configure GTM, GA4, Google Ads conversion tracking, Search Console, and LocalBusiness schema markup', color: '#4285f4' },
        { id: 'website-analytics', label: '📊 Website Analytics', description: 'Traffic overview, bookings funnel, top services, customers and traffic sources', color: '#10b981' },
    ];


    const homepageSettings = [
        { id: 'header-locations', label: 'Homepage Header Locations', icon: MapPin, description: 'Manage locations displayed in the header dropdown', color: '#10b981' },
        { id: 'frequent-services', label: 'Homepage Frequently Booked Services', icon: Star, description: 'Manage services shown in the frequently booked section', color: '#8b5cf6' },
        { id: 'footer-locations', label: 'Homepage Footer Other Office Locations', icon: Building2, description: 'Manage office locations in footer', color: '#84cc16' }
    ];

    const globalSettings = [
        { id: 'how-it-works', label: 'Global How It Works', icon: CheckCircle, description: 'Edit the "How it Works" section content', color: '#06b6d4' },
        { id: 'why-choose-us', label: 'Global Why Choose Us', icon: Award, description: 'Edit the "Why Choose Us" section content', color: '#ec4899' },
        { id: 'testimonials', label: 'Customer Testimonials', icon: MessageCircle, description: 'Manage customer reviews and testimonials', color: '#14b8a6' },
        { id: 'brand-logos', label: 'Global Brand Logos Library', icon: ImageIcon, description: 'Manage logos for all appliance brands', color: '#8b5cf6' },
        { id: 'terms-conditions', label: 'Terms & Conditions', icon: FileText, description: 'Edit Terms & Conditions page content', color: '#64748b' },
        { id: 'privacy-policy', label: 'Privacy Policy', icon: Shield, description: 'Edit Privacy Policy page content', color: '#0ea5e9' },
        { id: 'accessibility', label: 'Accessibility Statement', icon: Eye, description: 'Edit Accessibility Statement page content', color: '#a855f7' },
        { id: 'faqs', label: 'Global FAQ Settings', icon: HelpCircle, description: 'Manage frequently asked questions (Global Library)', color: '#f97316' }
    ];

    const pageCountsByGroup = {
        'homepage': null,
        'global': null,
        'category-pages': appliances.length,
        'subcategory-pages': appliances.reduce((n, a) => n + (a.subcategories?.length || 0), 0),
        'location-pages': locations.length,
        'sublocation-pages': appliances.length * SUBLOCATION_LIST.length,
        'google-apis': null
    };

    // ── Render: Page editor (level = 'page') ─────────────────────────────
    if (nav.level === 'page') {
        const groupLabel = categoryGroups.find(g => g.id === nav.group)?.label || nav.group;
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[
                        { label: 'Website Settings' },
                        { label: groupLabel },
                        { label: nav.pageLabel }
                    ]}
                    onNavigate={navigateBack}
                />
                <PageSettingsManager
                    pageId={nav.pageId}
                    pageLabel={nav.pageLabel}
                    pageUrl={nav.pageUrl}
                />
            </div>
        );
    }

    // ── Render: Page list (level = 'list') ────────────────────────────────
    if (nav.level === 'list') {
        const group = categoryGroups.find(g => g.id === nav.group);
        const groupLabel = group?.label || nav.group;
        const groupColor = group?.color || '#6366f1';

        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: groupLabel }]}
                    onNavigate={navigateBack}
                />

                {/* ── Homepage settings list ── */}
                {nav.group === 'homepage' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {homepageSettings.map(s => {
                            const Icon = s.icon;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setNav({ level: 'page', group: 'homepage', pageId: s.id, pageLabel: s.label, pageUrl: null })}
                                    className="card"
                                    style={{
                                        padding: 'var(--spacing-lg)', border: '2px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-elevated)',
                                        cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left', position: 'relative', overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = s.color;
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}20`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: s.color, opacity: 0.1 }} />
                                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={20} style={{ color: s.color }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0 }}>{s.label}</h3>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{s.description}</p>
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', color: s.color, opacity: 0.5 }}>
                                        <ChevronRight size={16} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Global settings list ── */}
                {nav.group === 'global' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {globalSettings.map(s => {
                            const Icon = s.icon;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setNav({ level: 'page', group: 'global', pageId: s.id, pageLabel: s.label, pageUrl: null })}
                                    className="card"
                                    style={{
                                        padding: 'var(--spacing-lg)', border: '2px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-elevated)',
                                        cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left', position: 'relative', overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = s.color;
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}20`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: s.color, opacity: 0.1 }} />
                                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={20} style={{ color: s.color }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0 }}>{s.label}</h3>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{s.description}</p>
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', color: s.color, opacity: 0.5 }}>
                                        <ChevronRight size={16} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Category pages list ── */}
                {nav.group === 'category-pages' && (
                    loadingData ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '60px', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={24} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading category pages...</span>
                        </div>
                    ) : (
                        <CategoryPageList
                            appliances={appliances}
                            color={groupColor}
                            onSelectPage={(pageInfo) => navigateToPage(nav.group, pageInfo)}
                        />
                    )
                )}

                {/* ── Sub-category pages list ── */}
                {nav.group === 'subcategory-pages' && (
                    loadingData ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '60px', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={24} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading sub-category pages...</span>
                        </div>
                    ) : (
                        <SubCategoryPageList
                            appliances={appliances}
                            color={groupColor}
                            onSelectPage={(pageInfo) => navigateToPage(nav.group, pageInfo)}
                        />
                    )
                )}

                {/* ── Location pages list ── */}
                {nav.group === 'location-pages' && (
                    loadingData ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '60px', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={24} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading location pages...</span>
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                No locations found. Add locations in the Header Locations setting first.
                            </p>
                        </div>
                    ) : (
                        <LocationPageList
                            locations={locations}
                            color={groupColor}
                            onSelectPage={(pageInfo) => navigateToPage(nav.group, pageInfo)}
                        />
                    )
                )}

                {/* ── Sub-location pages list ── */}
                {nav.group === 'sublocation-pages' && (
                    loadingData ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '60px', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={24} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading sub-location pages...</span>
                        </div>
                    ) : (
                        <SubLocationPageList
                            appliances={appliances}
                            color={groupColor}
                            onSelectPage={(pageInfo) => navigateToPage(nav.group, pageInfo)}
                        />
                    )
                )}
            </div>
        );
    }

    // ── Render: top-level page selector (level = 'page', but for non-PageSettingsManager pages) ──
    // Special handling for known global settings that have their own components
    if (nav.level === 'page' && nav.group === 'homepage') {
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: 'Homepage Settings' }, { label: nav.pageLabel }]}
                    onNavigate={navigateBack}
                />
                {nav.pageId === 'header-locations' && <HeaderLocations />}
                {nav.pageId === 'frequent-services' && <FrequentlyBookedServicesSettings />}
                {nav.pageId === 'footer-locations' && <FooterLocationsSettings />}
            </div>
        );
    }

    if (nav.level === 'page' && nav.group === 'global') {
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: 'Global Settings' }, { label: nav.pageLabel }]}
                    onNavigate={navigateBack}
                />
                {nav.pageId === 'how-it-works' && <HowItWorksSettings />}
                {nav.pageId === 'why-choose-us' && <WhyChooseUsSettings />}
                {nav.pageId === 'testimonials' && <CustomerTestimonialsSettings />}
                {nav.pageId === 'brand-logos' && <BrandLogosSettings />}
                {nav.pageId === 'static-pages' && <StaticPagesSettings />}
                {nav.pageId === 'terms-conditions' && <StaticPagesSettings initialTab="Terms & Conditions" />}
                {nav.pageId === 'privacy-policy' && <StaticPagesSettings initialTab="Privacy Policy" />}
                {nav.pageId === 'accessibility' && <StaticPagesSettings initialTab="Accessibility Statement" />}
                {nav.pageId === 'faqs' && <FAQsManagement />}
            </div>
        );
    }

    if (nav.group === 'google-apis') {
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: 'Google APIs' }]}
                    onNavigate={navigateBack}
                />
                <GoogleAPIsSettings />
            </div>
        );
    }

    if (nav.group === 'website-analytics') {
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: 'Website Analytics' }]}
                    onNavigate={navigateBack}
                />
                <WebsiteAnalytics />
            </div>
        );
    }

    // ── Render: Groups grid (level = 'groups') ────────────────────────────

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {loadingData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    <Loader2 className="animate-spin" size={14} />
                    Loading page data...
                </div>
            )}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                {categoryGroups.map(group => (
                    <GroupCard
                        key={group.id}
                        group={group}
                        count={pageCountsByGroup[group.id]}
                        onClick={() => navigateToGroup(group.id)}
                    />
                ))}
            </div>

            <style jsx>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default WebsiteSettings;
