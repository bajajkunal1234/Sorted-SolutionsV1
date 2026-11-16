'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Upload,
    Film,
    Image as ImageIcon,
    Trash2,
    Plus,
    ArrowUp,
    ArrowDown,
    Check,
    ExternalLink,
    Eye,
    RefreshCw,
    AlertCircle,
    Info,
    ArrowRight,
    ArrowLeft,
    Sliders,
    Search,
    ShieldCheck,
    Wrench,
    Clock,
    Star,
    HelpCircle,
    MessageSquare,
    X,
    Layers,
    FileText,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Pencil,
    RotateCcw,
    Layout
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import SlidingThumbnail from '@/components/v2/SlidingThumbnail';

const SECTION_LABELS = {
    hero: '🎬 Top Media & Hero',
    services: '📦 Horizontal Services Carousel',
    applianceType: '📱 Select Your Appliance Type',
    process: '🛠️ Our Process (Step-by-step)',
    technicians: '👨‍🔧 Top Technicians Card',
    brands: '🏷️ We Service All Brands',
    coverPromise: '🛡️ Sorted Cover Promise',
    notIncluded: '🚫 What Is Not Included',
    faqs: '❓ Frequently Asked Questions',
    reviews: '⭐ Customer Reviews & Ratings'
};

export default function EcomV2CategorySettings({ onBack }) {
    // List state
    const [pages, setPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Active editing page
    const [activePage, setActivePage] = useState(null); // { categorySlug, categoryName, ... }
    const [pageConfig, setPageConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState('hero');

    // Media upload
    const [uploading, setUploading] = useState(false);
    const heroFileInputRef = useRef(null);
    const slideFileInputRef = useRef(null);
    const techFileInputRef = useRef(null);
    const stepFileInputRef = useRef(null);
    const [uploadingStepIdx, setUploadingStepIdx] = useState(null);
    const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
    const [adminPreviewIdx, setAdminPreviewIdx] = useState(0);

    // Fetch all category pages on mount
    useEffect(() => {
        fetchCategoryPages();
    }, []);

    const fetchCategoryPages = async () => {
        setLoadingPages(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/category-pages');
            const json = await res.json();
            if (json.success && Array.isArray(json.pages)) {
                setPages(json.pages);
            } else {
                setErrorMessage(json.error || 'Failed to load category pages');
            }
        } catch (err) {
            setErrorMessage('Network error fetching category pages: ' + err.message);
        } finally {
            setLoadingPages(false);
        }
    };

    // Open category page for editing
    const handleSelectPage = async (page) => {
        setActivePage(page);
        setLoadingConfig(true);
        setErrorMessage('');
        setSaveSuccess(false);
        setActiveTab('hero');
        setAdminPreviewIdx(0);
        try {
            const res = await fetch(`/api/v2/category-pages/${page.categorySlug}`);
            const json = await res.json();
            if (json.success && json.data) {
                setPageConfig(json.data);
            } else {
                setErrorMessage(json.error || 'Failed to load category page config');
            }
        } catch (err) {
            setErrorMessage('Network error loading category config: ' + err.message);
        } finally {
            setLoadingConfig(false);
        }
    };

    // Save category page changes
    const handleSaveConfig = async () => {
        if (!activePage || !pageConfig) return;
        setSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);
        try {
            const res = await fetch(`/api/v2/category-pages/${activePage.categorySlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pageConfig)
            });
            const json = await res.json();
            if (json.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
                fetchCategoryPages();
            } else {
                setErrorMessage(json.error || 'Failed to save category page');
            }
        } catch (err) {
            setErrorMessage('Network error saving category page: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Generic upload handler
    const uploadFile = async (file, folder = 'ecom-v2/categories') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'website-assets');
        formData.append('folder', folder);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const json = await res.json();
        if (!json.success || !json.url) {
            throw new Error(json.error || 'Upload failed');
        }
        return json.url;
    };

    // Filter pages by search query
    const filteredPages = pages.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.categoryName?.toLowerCase().includes(q) ||
            p.categorySlug?.toLowerCase().includes(q)
        );
    });

    const activeCatData = V2_CATEGORIES.find(c => c.slug === activePage?.categorySlug) || null;

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: 1280, margin: '0 auto' }}>
            {/* Top Back & Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-lg)',
                flexWrap: 'wrap',
                gap: 'var(--spacing-md)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <button
                        onClick={() => {
                            if (activePage) {
                                setActivePage(null);
                                setPageConfig(null);
                            } else if (onBack) {
                                onBack();
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <ArrowLeft size={16} />
                        {activePage ? 'Back to Categories List' : 'Back to Ecom V2'}
                    </button>

                    <div>
                        <h1 style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 800,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <span>{activePage ? `${activePage.categoryName} Page Designer` : 'Category Pages (Urban Company UI)'}</span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(6,182,212,0.15)',
                                color: '#06b6d4'
                            }}>
                                6 Categories
                            </span>
                        </h1>
                        <p style={{ margin: '3px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            {activePage
                                ? `Live URL: /v2/services/${activePage.categorySlug} (also accessible via /${activePage.categorySlug})`
                                : 'Configure the 6 main category pages with hero banners, services carousel, and "Select your appliance type" section.'}
                        </p>
                    </div>
                </div>

                {activePage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a
                            href={`/v2/services/${activePage.categorySlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 15px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                textDecoration: 'none'
                            }}
                        >
                            <Eye size={15} /> Preview Live Page
                        </a>

                        <button
                            onClick={handleSaveConfig}
                            disabled={saving || loadingConfig}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '9px 20px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: '#6338f5',
                                color: '#ffffff',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 700,
                                border: 'none',
                                cursor: (saving || loadingConfig) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(99,56,245,0.35)',
                                opacity: (saving || loadingConfig) ? 0.7 : 1
                            }}
                        >
                            {saving ? (
                                <>
                                    <RefreshCw size={15} className="spin" /> Saving...
                                </>
                            ) : saveSuccess ? (
                                <>
                                    <Check size={16} /> Saved Successfully!
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} /> Save Category Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Error & Success Alerts */}
            {errorMessage && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <AlertCircle size={18} /> {errorMessage}
                </div>
            )}

            {saveSuccess && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <CheckCircle2 size={18} /> Category page saved! Changes are live on /v2/services/{activePage?.categorySlug}.
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* VIEW A: LIST OF 6 CATEGORY PAGES                                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {!activePage && (
                <div>
                    {/* Search Bar */}
                    <div style={{ marginBottom: 20, maxWidth: 440 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search category pages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px 9px 36px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Category Cards Grid */}
                    {loadingPages ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
                            <div>Loading category pages...</div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                            gap: 16
                        }}>
                            {filteredPages.map(page => {
                                const catMeta = V2_CATEGORIES.find(c => c.slug === page.categorySlug);

                                return (
                                    <div
                                        key={page.categorySlug}
                                        className="card"
                                        style={{
                                            padding: 20,
                                            backgroundColor: 'var(--bg-elevated)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: 16,
                                            transition: 'transform 0.15s ease, border-color 0.15s ease'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <span style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    padding: '3px 8px',
                                                    borderRadius: 4,
                                                    backgroundColor: 'rgba(99,56,245,0.12)',
                                                    color: '#6338f5'
                                                }}>
                                                    {page.categorySlug}
                                                </span>

                                                <span style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: page.isCustomized ? '#10b981' : 'var(--text-tertiary)',
                                                    backgroundColor: page.isCustomized ? 'rgba(16,185,129,0.12)' : 'var(--bg-secondary)',
                                                    padding: '2px 8px',
                                                    borderRadius: 4
                                                }}>
                                                    {page.isCustomized ? '✓ Customized' : 'Default Template'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: 12,
                                                    backgroundColor: page.accent || 'var(--bg-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}>
                                                    <img
                                                        src={page.icon}
                                                        alt={page.categoryName}
                                                        style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                                    />
                                                </div>

                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <h3 style={{ margin: '0 0 2px 0', fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        {page.categoryName}
                                                    </h3>
                                                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {catMeta?.tagline || `Expert ${page.categoryName} repair services`}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#6338f5', marginTop: 4, fontWeight: 600 }}>
                                                        Includes {page.subcategoriesCount || catMeta?.subcategories?.length || 3} subcategories
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-primary)' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPage(page)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: '#6338f5',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <Sliders size={13} /> Edit Page UI
                                            </button>

                                            <a
                                                href={`/v2/services/${page.categorySlug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border-primary)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600,
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <Eye size={13} /> Live
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* VIEW B: CATEGORY PAGE DESIGNER (9+ TABS)                           */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activePage && pageConfig && (
                <div>
                    {/* Tabs Navigation */}
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        overflowX: 'auto',
                        paddingBottom: 8,
                        marginBottom: 20,
                        borderBottom: '2px solid var(--border-primary)',
                        scrollbarWidth: 'none'
                    }}>
                        {Object.entries(SECTION_LABELS).map(([tabKey, tabLabel]) => {
                            const isSelected = activeTab === tabKey;
                            return (
                                <button
                                    key={tabKey}
                                    type="button"
                                    onClick={() => setActiveTab(tabKey)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '9px 15px',
                                        border: 'none',
                                        borderBottom: isSelected ? '3px solid #6338f5' : '3px solid transparent',
                                        backgroundColor: isSelected ? 'rgba(99,56,245,0.08)' : 'transparent',
                                        color: isSelected ? '#6338f5' : 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: isSelected ? 800 : 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                        marginBottom: -2
                                    }}
                                >
                                    {tabLabel}
                                </button>
                            );
                        })}
                    </div>

                    {/* TAB 1: HERO SECTION */}
                    {activeTab === 'hero' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                        Top Media & Hero Header Section
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Configure multi-slide auto-scrolling images/videos, main headline, star ratings, and rate card banner.
                                    </p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pageConfig.hero?.enabled !== false}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            hero: { ...prev.hero, enabled: e.target.checked }
                                        }))}
                                    />
                                    Section Visible
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Category Page Title *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={pageConfig.hero?.title || ''}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            hero: { ...prev.hero, title: e.target.value }
                                        }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Star Rating & Review Count
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            placeholder="4.86"
                                            value={pageConfig.hero?.rating || ''}
                                            onChange={(e) => setPageConfig(prev => ({
                                                ...prev,
                                                hero: { ...prev.hero, rating: e.target.value }
                                            }))}
                                            style={{ width: '35%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="85K reviews"
                                            value={pageConfig.hero?.reviewsCount || ''}
                                            onChange={(e) => setPageConfig(prev => ({
                                                ...prev,
                                                hero: { ...prev.hero, reviewsCount: e.target.value }
                                            }))}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Rate Card Badge & Text
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            placeholder="sorted cover"
                                            value={pageConfig.hero?.rateCardBadge || ''}
                                            onChange={(e) => setPageConfig(prev => ({
                                                ...prev,
                                                hero: { ...prev.hero, rateCardBadge: e.target.value }
                                            }))}
                                            style={{ width: '40%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Standard rate card"
                                            value={pageConfig.hero?.rateCardText || ''}
                                            onChange={(e) => setPageConfig(prev => ({
                                                ...prev,
                                                hero: { ...prev.hero, rateCardText: e.target.value }
                                            }))}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Slides Management */}
                            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>
                                        Hero Slides (Multi-Slide Auto Scroll Stories)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newSlides = [...(pageConfig.hero?.slides || [])];
                                            newSlides.push({
                                                id: `slide-${Date.now()}`,
                                                mediaType: 'image',
                                                mediaUrl: '/images/banners/banner_speed_90_mins.png',
                                                title: 'New Slide',
                                                active: true
                                            });
                                            setPageConfig(prev => ({
                                                ...prev,
                                                hero: { ...prev.hero, slides: newSlides }
                                            }));
                                        }}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: 6,
                                            backgroundColor: '#6338f5',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        <Plus size={13} /> Add Slide
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {(pageConfig.hero?.slides || []).map((slide, idx) => (
                                        <div
                                            key={slide.id || idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: 12,
                                                borderRadius: 10,
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', width: 20 }}>
                                                #{idx + 1}
                                            </span>

                                            <div style={{ width: 60, height: 44, borderRadius: 6, backgroundColor: '#000', overflow: 'hidden', flexShrink: 0 }}>
                                                {slide.mediaType === 'video' ? (
                                                    <video src={slide.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <img src={slide.mediaUrl} alt="Slide" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}
                                            </div>

                                            <select
                                                value={slide.mediaType || 'image'}
                                                onChange={(e) => {
                                                    const newSlides = [...pageConfig.hero.slides];
                                                    newSlides[idx].mediaType = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, hero: { ...prev.hero, slides: newSlides } }));
                                                }}
                                                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 11 }}
                                            >
                                                <option value="image">Image (JPG/PNG/WebP)</option>
                                                <option value="video">Video (MP4/WebM)</option>
                                            </select>

                                            <input
                                                type="text"
                                                placeholder="Media URL"
                                                value={slide.mediaUrl || ''}
                                                onChange={(e) => {
                                                    const newSlides = [...pageConfig.hero.slides];
                                                    newSlides[idx].mediaUrl = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, hero: { ...prev.hero, slides: newSlides } }));
                                                }}
                                                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUploadingSlideIdx(idx);
                                                    slideFileInputRef.current?.click();
                                                }}
                                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <Upload size={12} /> Upload
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSlides = pageConfig.hero.slides.filter((_, i) => i !== idx);
                                                    setPageConfig(prev => ({ ...prev, hero: { ...prev.hero, slides: newSlides } }));
                                                }}
                                                style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete slide"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SERVICES CAROUSEL */}
                    {activeTab === 'services' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                        Horizontal Services / Issues Carousel
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Displays all active published web services belonging to {activePage.categoryName} on a smooth horizontal swipe track.
                                    </p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pageConfig.servicesSection?.enabled !== false}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            servicesSection: { ...prev.servicesSection, enabled: e.target.checked }
                                        }))}
                                    />
                                    Section Visible
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Section Title
                                    </label>
                                    <input
                                        type="text"
                                        value={pageConfig.servicesSection?.title || ''}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            servicesSection: { ...prev.servicesSection, title: e.target.value }
                                        }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Subtitle / Description
                                    </label>
                                    <input
                                        type="text"
                                        value={pageConfig.servicesSection?.subtitle || ''}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            servicesSection: { ...prev.servicesSection, subtitle: e.target.value }
                                        }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'rgba(99,56,245,0.08)', border: '1px solid rgba(99,56,245,0.2)', fontSize: 12.5, color: '#6338f5' }}>
                                💡 <strong>Dynamic Service Loading:</strong> Services are pulled automatically from your <strong>Inventory Tab</strong> where Item Subtype = 'Web' and Category matches '{activePage.categoryName}'. Each card includes price, rating, duration and an <strong>Add</strong> button that links directly to the customer checkout cart.
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SELECT YOUR APPLIANCE TYPE SECTION (NEW) */}
                    {activeTab === 'applianceType' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                        "Select your appliance type" Section
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Displayed below the service carousel, allowing customers to choose their exact appliance model (e.g. Front Load, Top Load, Split AC, Double Door).
                                    </p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pageConfig.applianceType?.enabled !== false}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            applianceType: { ...prev.applianceType, enabled: e.target.checked }
                                        }))}
                                    />
                                    Section Visible
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Section Title
                                    </label>
                                    <input
                                        type="text"
                                        value={pageConfig.applianceType?.title || 'Select your appliance type'}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            applianceType: { ...prev.applianceType, title: e.target.value }
                                        }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        Subtitle / Caption
                                    </label>
                                    <input
                                        type="text"
                                        value={pageConfig.applianceType?.subtitle || ''}
                                        onChange={(e) => setPageConfig(prev => ({
                                            ...prev,
                                            applianceType: { ...prev.applianceType, subtitle: e.target.value }
                                        }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Subcategories Preview Grid */}
                            <div>
                                <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px 0' }}>
                                    Subcategories under {activePage.categoryName} ({activeCatData?.subcategories?.length || 0})
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: 12
                                }}>
                                    {(activeCatData?.subcategories || []).map(sub => (
                                        <div
                                            key={sub.slug}
                                            style={{
                                                padding: 14,
                                                borderRadius: 12,
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <div style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: activeCatData?.accent || '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                <img src={sub.icon || activeCatData?.icon} alt={sub.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                            </div>
                                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{sub.name}</strong>
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>/{sub.slug}</span>
                                            <a
                                                href={`/v2/services/${activePage.categorySlug}/${sub.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ marginTop: 8, fontSize: 11, color: '#6338f5', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                            >
                                                Preview Subcategory <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: OUR PROCESS */}
                    {activeTab === 'process' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                        Step-by-Step Service Process
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Show customer what happens during the service visit.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newSteps = [...(pageConfig.process?.steps || [])];
                                        newSteps.push({
                                            title: `Step ${newSteps.length + 1}`,
                                            desc: 'Description of service step',
                                            imageUrl: ''
                                        });
                                        setPageConfig(prev => ({
                                            ...prev,
                                            process: { ...prev.process, steps: newSteps }
                                        }));
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: '#6338f5', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    <Plus size={13} /> Add Step
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {(pageConfig.process?.steps || []).map((step, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: 14,
                                            borderRadius: 10,
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            gap: 12,
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#6338f5', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {idx + 1}
                                        </span>

                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <input
                                                type="text"
                                                placeholder="Step title"
                                                value={step.title || ''}
                                                onChange={(e) => {
                                                    const newSteps = [...pageConfig.process.steps];
                                                    newSteps[idx].title = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                                }}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                            />
                                            <textarea
                                                rows={2}
                                                placeholder="Step description"
                                                value={step.desc || ''}
                                                onChange={(e) => {
                                                    const newSteps = [...pageConfig.process.steps];
                                                    newSteps[idx].desc = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                                }}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newSteps = pageConfig.process.steps.filter((_, i) => i !== idx);
                                                setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                            }}
                                            style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: TECHNICIANS */}
                    {activeTab === 'technicians' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <h2 style={{ margin: '0 0 16px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                Top Technicians Card
                            </h2>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Lead Technician / Team Name</label>
                                    <input
                                        type="text"
                                        value={pageConfig.technicians?.name || ''}
                                        onChange={(e) => setPageConfig(prev => ({ ...prev, technicians: { ...prev.technicians, name: e.target.value } }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Experience Text</label>
                                    <input
                                        type="text"
                                        value={pageConfig.technicians?.experienceText || ''}
                                        onChange={(e) => setPageConfig(prev => ({ ...prev, technicians: { ...prev.technicians, experienceText: e.target.value } }))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: BRANDS */}
                    {activeTab === 'brands' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <h2 style={{ margin: '0 0 16px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                We Service All Brands
                            </h2>
                            <textarea
                                rows={4}
                                placeholder="Comma separated brands: LG, Samsung, Daikin, Voltas..."
                                value={(pageConfig.brands?.items || []).join(', ')}
                                onChange={(e) => {
                                    const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    setPageConfig(prev => ({ ...prev, brands: { ...prev.brands, items } }));
                                }}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>
                    )}

                    {/* TAB 7: COVER PROMISE */}
                    {activeTab === 'coverPromise' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <h2 style={{ margin: '0 0 16px 0', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                Sorted Cover Promise Card
                            </h2>
                            <input
                                type="text"
                                value={pageConfig.coverPromise?.title || 'Sorted Cover Promise'}
                                onChange={(e) => setPageConfig(prev => ({ ...prev, coverPromise: { ...prev.coverPromise, title: e.target.value } }))}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: 12 }}
                            />
                        </div>
                    )}

                    {/* TAB 8: FAQS */}
                    {activeTab === 'faqs' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h2 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                    Frequently Asked Questions
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newFaqs = [...(pageConfig.faqs?.items || [])];
                                        newFaqs.push({ q: 'New Question?', a: 'Answer here.' });
                                        setPageConfig(prev => ({ ...prev, faqs: { ...prev.faqs, items: newFaqs } }));
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: '#6338f5', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    <Plus size={13} /> Add FAQ
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(pageConfig.faqs?.items || []).map((faq, idx) => (
                                    <div key={idx} style={{ padding: 12, borderRadius: 10, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', gap: 10 }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <input
                                                type="text"
                                                placeholder="Question"
                                                value={faq.q || ''}
                                                onChange={(e) => {
                                                    const newFaqs = [...pageConfig.faqs.items];
                                                    newFaqs[idx].q = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, faqs: { ...prev.faqs, items: newFaqs } }));
                                                }}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                            />
                                            <textarea
                                                rows={2}
                                                placeholder="Answer"
                                                value={faq.a || ''}
                                                onChange={(e) => {
                                                    const newFaqs = [...pageConfig.faqs.items];
                                                    newFaqs[idx].a = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, faqs: { ...prev.faqs, items: newFaqs } }));
                                                }}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newFaqs = pageConfig.faqs.items.filter((_, i) => i !== idx);
                                                setPageConfig(prev => ({ ...prev, faqs: { ...prev.faqs, items: newFaqs } }));
                                            }}
                                            style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 9: REVIEWS */}
                    {activeTab === 'reviews' && (
                        <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h2 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 800 }}>
                                    Customer Reviews & Ratings
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newRevs = [...(pageConfig.reviews?.items || [])];
                                        newRevs.push({
                                            author: 'New Customer',
                                            locality: 'Mumbai',
                                            rating: 5,
                                            date: 'Just now',
                                            comment: 'Great service!'
                                        });
                                        setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newRevs } }));
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: '#6338f5', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    <Plus size={13} /> Add Review
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(pageConfig.reviews?.items || []).map((rev, idx) => (
                                    <div key={idx} style={{ padding: 12, borderRadius: 10, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', gap: 10 }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Customer Name"
                                                    value={rev.author || ''}
                                                    onChange={(e) => {
                                                        const newRevs = [...pageConfig.reviews.items];
                                                        newRevs[idx].author = e.target.value;
                                                        setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newRevs } }));
                                                    }}
                                                    style={{ width: '50%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Locality (e.g. Andheri West)"
                                                    value={rev.locality || ''}
                                                    onChange={(e) => {
                                                        const newRevs = [...pageConfig.reviews.items];
                                                        newRevs[idx].locality = e.target.value;
                                                        setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newRevs } }));
                                                    }}
                                                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                />
                                            </div>
                                            <textarea
                                                rows={2}
                                                placeholder="Review comment"
                                                value={rev.comment || ''}
                                                onChange={(e) => {
                                                    const newRevs = [...pageConfig.reviews.items];
                                                    newRevs[idx].comment = e.target.value;
                                                    setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newRevs } }));
                                                }}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newRevs = pageConfig.reviews.items.filter((_, i) => i !== idx);
                                                setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newRevs } }));
                                            }}
                                            style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden Slide File Input */}
            <input
                ref={slideFileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingSlideIdx !== null && pageConfig?.hero?.slides) {
                        try {
                            const url = await uploadFile(file, 'ecom-v2/categories/hero');
                            const isVid = file.type.startsWith('video/');
                            const newSlides = [...pageConfig.hero.slides];
                            newSlides[uploadingSlideIdx].mediaUrl = url;
                            newSlides[uploadingSlideIdx].mediaType = isVid ? 'video' : 'image';
                            setPageConfig(prev => ({ ...prev, hero: { ...prev.hero, slides: newSlides } }));
                        } catch (err) {
                            setErrorMessage('Slide upload failed: ' + err.message);
                        }
                    }
                    e.target.value = '';
                }}
            />
        </div>
    );
}
