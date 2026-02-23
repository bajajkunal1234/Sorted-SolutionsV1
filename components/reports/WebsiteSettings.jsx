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
            gap: '6px',
            marginBottom: 'var(--spacing-lg)',
            flexWrap: 'wrap'
        }}>
            {crumbs.map((crumb, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {i > 0 && <ChevronRight size={14} style={{ opacity: 0.4 }} />}
                    {i < crumbs.length - 1 ? (
                        <button
                            onClick={() => onNavigate(i)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-primary)10'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {crumb.label}
                        </button>
                    ) : (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {crumb.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ label, subLabel, color, pageUrl, isBuilt, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                border: `1.5px solid ${hovered ? color : 'var(--border-primary)'}`,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: hovered ? `${color}08` : 'var(--bg-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                transform: hovered ? 'translateY(-2px)' : 'none',
                boxShadow: hovered ? `0 4px 16px ${color}20` : 'none',
                width: '100%'
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
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                </div>
                {subLabel && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.2s ease'
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

// ── Group Card (top-level) ───────────────────────────────────────────────────
function GroupCard({ group, count, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="card"
            style={{
                padding: 'var(--spacing-lg)',
                border: `2px solid ${hovered ? group.color : 'var(--border-primary)'}`,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                transform: hovered ? 'translateY(-4px)' : 'none',
                boxShadow: hovered ? `0 8px 24px ${group.color}20` : 'none'
            }}
        >
            <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '100px', height: '100px', borderRadius: '50%',
                backgroundColor: group.color, opacity: 0.1
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        {group.label}
                    </h3>
                    {count !== null && (
                        <span style={{
                            fontSize: '11px', padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: `${group.color}20`,
                            color: group.color, fontWeight: 700
                        }}>
                            {count} pages
                        </span>
                    )}
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {group.description}
                </p>
            </div>
            <div style={{
                position: 'absolute', bottom: 'var(--spacing-md)', right: 'var(--spacing-md)',
                fontSize: 'var(--font-size-xl)', color: group.color, opacity: 0.5
            }}>→</div>
        </button>
    );
}

// ── Page List View: Category Pages ──────────────────────────────────────────
function CategoryPageList({ appliances, color, onSelectPage }) {
    const [search, setSearch] = useState('');
    const filtered = appliances.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search category pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
                {filtered.map(appliance => {
                    const pageId = `cat-${appliance.slug}`;
                    const ApIcon = getIcon(appliance.icon_name);
                    return (
                        <PageCard
                            key={pageId}
                            label={`${appliance.name} Repair`}
                            subLabel={`/${appliance.slug}`}
                            color={appliance.color || color}
                            pageUrl={`/${appliance.slug}`}
                            isBuilt={appliance.isBuilt}
                            onClick={() => onSelectPage({
                                pageId,
                                pageLabel: `${appliance.name} Repair — Category Page`,
                                pageUrl: `/${appliance.slug}`
                            })}
                        />
                    );
                })}
                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No categories match "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Sub Category Pages ──────────────────────────────────────
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
    ).filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.parentName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search sub-category pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
                {allSubs.map(sub => (
                    <PageCard
                        key={sub.pageId}
                        label={`${sub.name}`}
                        subLabel={`Under ${sub.parentName} → /${sub.parentSlug}/${sub.slug}`}
                        color={sub.parentColor}
                        pageUrl={`/${sub.parentSlug}/${sub.slug}`}
                        isBuilt={sub.isBuilt}
                        onClick={() => onSelectPage({
                            pageId: sub.pageId,
                            pageLabel: `${sub.name} — ${sub.parentName} Sub-Category Page`,
                            pageUrl: `/${sub.parentSlug}/${sub.slug}`
                        })}
                    />
                ))}
                {allSubs.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No sub-categories match "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Location Pages ──────────────────────────────────────────
function LocationPageList({ locations, color, onSelectPage }) {
    const [search, setSearch] = useState('');
    const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search location pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 12px 10px 36px',
                        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
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
                        No locations match "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Page List View: Sub Location Pages ──────────────────────────────────────
function SubLocationPageList({ appliances, color, onSelectPage }) {
    const [search, setSearch] = useState('');
    const [selectedAppliance, setSelectedAppliance] = useState('all');

    // Build flat list from appliances' built-in sublocations list
    const sublocations = appliances.flatMap(appliance =>
        (appliance.sublocations || []).map(locSlug => {
            const locName = locSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return {
                pageId: `sloc-${locSlug}-${appliance.slug}`,
                label: `${appliance.name} Repair in ${locName}`,
                locName,
                locSlug,
                applianceName: appliance.name,
                applianceSlug: appliance.slug,
                color: appliance.color || color
            };
        })
    );

    const filteredAppliances = ['all', ...appliances.map(a => a.slug)];
    const filtered = sublocations.filter(s => {
        const matchSearch = s.label.toLowerCase().includes(search.toLowerCase());
        const matchAppliance = selectedAppliance === 'all' || s.applianceSlug === selectedAppliance;
        return matchSearch && matchAppliance;
    });

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <input
                        type="text"
                        placeholder="Search sub-location pages..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                            fontSize: '13px'
                        }}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                </div>
                <select
                    value={selectedAppliance}
                    onChange={e => setSelectedAppliance(e.target.value)}
                    style={{
                        padding: '10px 12px', border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer'
                    }}
                >
                    <option value="all">All Appliances</option>
                    {appliances.map(a => (
                        <option key={a.slug} value={a.slug}>{a.name}</option>
                    ))}
                </select>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
                Showing {filtered.length} of {sublocations.length} sub-location pages
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px', maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
                {filtered.map(s => (
                    <PageCard
                        key={s.pageId}
                        label={s.label}
                        subLabel={`/repairs/${s.locSlug}/${s.applianceSlug}`}
                        color={s.color}
                        pageUrl={`/repairs/${s.locSlug}/${s.applianceSlug}`}
                        isBuilt={false}
                        onClick={() => onSelectPage({
                            pageId: s.pageId,
                            pageLabel: s.label,
                            pageUrl: `/repairs/${s.locSlug}/${s.applianceSlug}`
                        })}
                    />
                ))}
                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No sub-location pages match your filters
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

    // Sync with parent subSection prop (back navigation from parent)
    useEffect(() => {
        if (!subSection) {
            setNav({ level: 'groups' });
        }
    }, [subSection]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [appRes, locRes] = await Promise.all([
                fetch('/api/settings/appliances'),
                fetch('/api/settings/locations')
            ]);
            const appData = await appRes.json();
            const locData = await locRes.json();

            if (appData.success) {
                // Attach sublocations list to each appliance
                const enriched = (appData.data || []).map(a => ({
                    ...a,
                    sublocations: SUBLOCATION_LIST
                }));
                setAppliances(enriched);
            }
            if (locData.success) setLocations(locData.data || []);
        } catch (err) {
            console.error('Error fetching website pages data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const navigateToGroup = (groupId) => {
        setNav({ level: 'list', group: groupId });
        if (setSubSection) setSubSection(groupId);
    };

    const navigateToPage = (groupId, pageInfo) => {
        setNav({ level: 'page', group: groupId, ...pageInfo });
        if (setSubSection) setSubSection(pageInfo.pageLabel);
    };

    const navigateBack = (toLevel) => {
        if (toLevel === 0) {
            setNav({ level: 'groups' });
            if (setSubSection) setSubSection(null);
        } else if (toLevel === 1) {
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
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: s.color, opacity: 0.1 }} />
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', backgroundColor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon size={20} style={{ color: s.color }} />
                                            </div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{s.label}</h3>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{s.description}</p>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '18px', color: s.color, opacity: 0.5 }}>→</div>
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
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: s.color, opacity: 0.1 }} />
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', backgroundColor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon size={20} style={{ color: s.color }} />
                                            </div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{s.label}</h3>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{s.description}</p>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '18px', color: s.color, opacity: 0.5 }}>→</div>
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
                {nav.pageId === 'faqs' && <FAQsManagement />}
                {nav.pageId === 'how-it-works' && <HowItWorksSettings />}
                {nav.pageId === 'why-choose-us' && <WhyChooseUsSettings />}
                {nav.pageId === 'brand-logos' && <BrandLogosSettings />}
                {nav.pageId === 'testimonials' && <CustomerTestimonialsSettings />}
                {(nav.pageId === 'static-pages' || nav.pageId === 'terms-conditions' || nav.pageId === 'privacy-policy' || nav.pageId === 'accessibility') && <StaticPagesSettings />}
            </div>
        );
    }

    // ── Google APIs (direct render, no sub-list) ──────────────────────────────
    if (nav.level === 'list' && nav.group === 'google-apis') {
        return (
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <Breadcrumb
                    crumbs={[{ label: 'Website Settings' }, { label: 'Google APIs & Integrations' }]}
                    onNavigate={navigateBack}
                />
                <GoogleAPIsSettings />
            </div>
        );
    }

    // ── Website Analytics (direct render, no sub-list) ─────────────────────────
    if (nav.level === 'list' && nav.group === 'website-analytics') {
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
