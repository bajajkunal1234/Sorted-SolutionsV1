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
    Layout,
    Link2,
    ListOrdered
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { getDefaultTemplateIdForCategory } from '@/lib/v2/processTemplates';
import SlidingThumbnail from '@/components/v2/SlidingThumbnail';

const SECTION_LABELS = {
    hero: '🎬 Top Media & Hero',
    services: '📦 Horizontal Services Carousel',
    applianceType: '📱 Subcategories (Appliance Types)',
    process: '🛠️ Our Process (Step-by-step)',
    technicians: '👨‍🔧 Top Technicians Card',
    brands: '🏷️ We Service All Brands',
    coverPromise: '🛡️ Sorted Cover Promise',
    notIncluded: '🚫 What Is Not Included',
    faqs: '❓ Frequently Asked Questions',
    reviews: '⭐ Customer Reviews & Ratings'
};

export default function EcomV2CategorySettings({ onBack, onOpenProcessTemplates }) {
    // List state
    const [pages, setPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Our Process Templates state
    const [processTemplates, setProcessTemplates] = useState([]);
    const [loadingProcessTemplates, setLoadingProcessTemplates] = useState(false);

    // Active editing page
    const [activePage, setActivePage] = useState(null); // { categorySlug, categoryName, ... }
    const [pageConfig, setPageConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState('hero');

    // Subcategory management states
    const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
    const [newSubcatForm, setNewSubcatForm] = useState({
        name: '',
        slug: '',
        shortDesc: '',
        icon: '',
        thumbnailSlides: []
    });
    const subcatFileInputRef = useRef(null);
    const [subcatUploadTarget, setSubcatUploadTarget] = useState(null); // { subIdx: number | 'new', slideIdx?: number }

    // Media upload
    const [uploading, setUploading] = useState(false);
    const heroFileInputRef = useRef(null);
    const slideFileInputRef = useRef(null);
    const techFileInputRef = useRef(null);
    const stepFileInputRef = useRef(null);
    const [uploadingStepIdx, setUploadingStepIdx] = useState(null);
    const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
    const [adminPreviewIdx, setAdminPreviewIdx] = useState(0);

    // Fetch all category pages & Our Process templates on mount
    useEffect(() => {
        fetchCategoryPages();
        fetchProcessTemplates();
    }, []);

    const fetchProcessTemplates = async () => {
        setLoadingProcessTemplates(true);
        try {
            const res = await fetch('/api/v2/process-templates');
            const json = await res.json();
            if (json.success && Array.isArray(json.data?.templates)) {
                setProcessTemplates(json.data.templates);
            }
        } catch (err) {
            console.error('Failed to fetch process templates:', err);
        } finally {
            setLoadingProcessTemplates(false);
        }
    };

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
                const catInfo = V2_CATEGORIES.find(c => c.slug === page.categorySlug);
                const defaultSubs = (catInfo?.subcategories || []).map(s => ({
                    slug: s.slug,
                    name: s.name,
                    shortDesc: s.shortDesc || '',
                    icon: s.icon || catInfo?.icon || '/images/services/ac_3d.png',
                    thumbnailSlides: Array.isArray(s.thumbnailSlides) && s.thumbnailSlides.length > 0
                        ? s.thumbnailSlides
                        : (s.icon ? [{ id: '1', url: s.icon, title: s.name }] : []),
                    enabled: s.enabled !== false
                }));
                const loadedSubcats = Array.isArray(json.data.subcategories) && json.data.subcategories.length > 0
                    ? json.data.subcategories
                    : defaultSubs;

                setPageConfig({
                    ...json.data,
                    subcategories: loadedSubcats
                });
            } else {
                setErrorMessage(json.error || 'Failed to load category page config');
            }
        } catch (err) {
            setErrorMessage('Network error loading category config: ' + err.message);
        } finally {
            setLoadingConfig(false);
        }
    };

    // Subcategory Action Handlers
    const handleAddSubcategorySubmit = () => {
        const name = newSubcatForm.name.trim();
        if (!name) {
            setErrorMessage('Subcategory Name is required');
            return;
        }
        const rawSlug = newSubcatForm.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = rawSlug.toLowerCase();

        const currentSubs = pageConfig?.subcategories || [];
        if (currentSubs.some(s => s.slug === slug)) {
            setErrorMessage(`A subcategory with slug "${slug}" already exists.`);
            return;
        }

        const fallbackIcon = activeCatData?.icon || '/images/services/ac_3d.png';
        const finalIcon = newSubcatForm.icon || fallbackIcon;
        const slides = Array.isArray(newSubcatForm.thumbnailSlides) && newSubcatForm.thumbnailSlides.length > 0
            ? newSubcatForm.thumbnailSlides
            : [{ id: '1', url: finalIcon, title: name }];

        const newSub = {
            slug,
            name,
            shortDesc: newSubcatForm.shortDesc || '',
            icon: finalIcon,
            thumbnailSlides: slides,
            enabled: true,
            isCustomCreated: true
        };

        setPageConfig(prev => ({
            ...prev,
            subcategories: [...(prev.subcategories || []), newSub]
        }));

        setIsAddingSubcategory(false);
        setNewSubcatForm({
            name: '',
            slug: '',
            shortDesc: '',
            icon: '',
            thumbnailSlides: []
        });
    };

    const handleAddSlideToNewSubcat = () => {
        setNewSubcatForm(prev => {
            const nextSlides = [...(prev.thumbnailSlides || [])];
            if (nextSlides.length >= 3) {
                setErrorMessage('Maximum 3 slides allowed per subcategory thumbnail');
                return prev;
            }
            nextSlides.push({
                id: `slide-${nextSlides.length + 1}`,
                url: prev.icon || activeCatData?.icon || '/images/services/ac_3d.png',
                title: prev.name || 'Slide'
            });
            return { ...prev, thumbnailSlides: nextSlides };
        });
    };

    const handleRemoveSlideFromNewSubcat = (slideIdx) => {
        setNewSubcatForm(prev => {
            const nextSlides = (prev.thumbnailSlides || []).filter((_, i) => i !== slideIdx);
            return {
                ...prev,
                thumbnailSlides: nextSlides,
                icon: slideIdx === 0 && nextSlides[0]?.url ? nextSlides[0].url : prev.icon
            };
        });
    };

    const handleUpdateSlideInNewSubcat = (slideIdx, url) => {
        setNewSubcatForm(prev => {
            const nextSlides = [...(prev.thumbnailSlides || [])];
            if (nextSlides[slideIdx]) {
                nextSlides[slideIdx] = { ...nextSlides[slideIdx], url };
            }
            return {
                ...prev,
                thumbnailSlides: nextSlides,
                icon: slideIdx === 0 ? url : prev.icon
            };
        });
    };

    const handleUpdateSubcategory = (idx, field, value) => {
        setPageConfig(prev => {
            const nextSubs = [...(prev.subcategories || [])];
            nextSubs[idx] = { ...nextSubs[idx], [field]: value };
            return { ...prev, subcategories: nextSubs };
        });
    };

    const handleMoveSubcategory = (idx, direction) => {
        setPageConfig(prev => {
            const nextSubs = [...(prev.subcategories || [])];
            const targetIdx = idx + direction;
            if (targetIdx < 0 || targetIdx >= nextSubs.length) return prev;
            const temp = nextSubs[idx];
            nextSubs[idx] = nextSubs[targetIdx];
            nextSubs[targetIdx] = temp;
            return { ...prev, subcategories: nextSubs };
        });
    };

    const handleDeleteSubcategory = (idx) => {
        const sub = pageConfig?.subcategories?.[idx];
        if (!window.confirm(`Delete subcategory "${sub?.name || 'this subcategory'}"? It will no longer display on the website.`)) {
            return;
        }
        setPageConfig(prev => ({
            ...prev,
            subcategories: (prev.subcategories || []).filter((_, i) => i !== idx)
        }));
    };

    const handleAddSlideToSubcategory = (subIdx) => {
        setPageConfig(prev => {
            const nextSubs = [...(prev.subcategories || [])];
            const targetSub = { ...nextSubs[subIdx] };
            const currentSlides = [...(targetSub.thumbnailSlides || [])];
            if (currentSlides.length >= 3) {
                setErrorMessage('Maximum 3 slides allowed per subcategory thumbnail');
                return prev;
            }
            currentSlides.push({
                id: `slide-${currentSlides.length + 1}`,
                url: targetSub.icon || activeCatData?.icon || '/images/services/ac_3d.png',
                title: targetSub.name || 'Slide'
            });
            targetSub.thumbnailSlides = currentSlides;
            nextSubs[subIdx] = targetSub;
            return { ...prev, subcategories: nextSubs };
        });
    };

    const handleRemoveSlideFromSubcategory = (subIdx, slideIdx) => {
        setPageConfig(prev => {
            const nextSubs = [...(prev.subcategories || [])];
            const targetSub = { ...nextSubs[subIdx] };
            const currentSlides = (targetSub.thumbnailSlides || []).filter((_, i) => i !== slideIdx);
            targetSub.thumbnailSlides = currentSlides;
            if (slideIdx === 0 && currentSlides[0]?.url) {
                targetSub.icon = currentSlides[0].url;
            }
            nextSubs[subIdx] = targetSub;
            return { ...prev, subcategories: nextSubs };
        });
    };

    const handleUpdateSubcategorySlide = (subIdx, slideIdx, url) => {
        setPageConfig(prev => {
            const nextSubs = [...(prev.subcategories || [])];
            const targetSub = { ...nextSubs[subIdx] };
            const nextSlides = [...(targetSub.thumbnailSlides || [])];
            if (nextSlides[slideIdx]) {
                nextSlides[slideIdx] = { ...nextSlides[slideIdx], url };
            }
            targetSub.thumbnailSlides = nextSlides;
            if (slideIdx === 0) {
                targetSub.icon = url;
            }
            nextSubs[subIdx] = targetSub;
            return { ...prev, subcategories: nextSubs };
        });
    };

    const handleSubcatImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !subcatUploadTarget) return;

        setUploading(true);
        setErrorMessage('');
        try {
            const url = await uploadFile(file, 'ecom-v2/subcategories');
            const { subIdx, slideIdx } = subcatUploadTarget;

            if (subIdx === 'new') {
                if (typeof slideIdx === 'number') {
                    setNewSubcatForm(prev => {
                        const nextSlides = [...(prev.thumbnailSlides || [])];
                        nextSlides[slideIdx] = { id: `slide-${slideIdx + 1}`, url, title: prev.name || 'Slide' };
                        return { ...prev, thumbnailSlides: nextSlides, icon: prev.icon || url };
                    });
                } else {
                    setNewSubcatForm(prev => ({
                        ...prev,
                        icon: url,
                        thumbnailSlides: prev.thumbnailSlides?.length > 0 ? prev.thumbnailSlides : [{ id: 'slide-1', url, title: prev.name || 'Slide' }]
                    }));
                }
            } else {
                setPageConfig(prev => {
                    const nextSubs = [...(prev.subcategories || [])];
                    const targetSub = { ...nextSubs[subIdx] };

                    if (typeof slideIdx === 'number') {
                        const nextSlides = [...(targetSub.thumbnailSlides || [])];
                        nextSlides[slideIdx] = { id: `slide-${slideIdx + 1}`, url, title: targetSub.name || 'Slide' };
                        targetSub.thumbnailSlides = nextSlides;
                        if (!targetSub.icon) targetSub.icon = url;
                    } else {
                        targetSub.icon = url;
                        if (!targetSub.thumbnailSlides || targetSub.thumbnailSlides.length === 0) {
                            targetSub.thumbnailSlides = [{ id: 'slide-1', url, title: targetSub.name || 'Slide' }];
                        } else {
                            const nextSlides = [...targetSub.thumbnailSlides];
                            nextSlides[0] = { ...nextSlides[0], url };
                            targetSub.thumbnailSlides = nextSlides;
                        }
                    }

                    nextSubs[subIdx] = targetSub;
                    return { ...prev, subcategories: nextSubs };
                });
            }
        } catch (err) {
            setErrorMessage('Failed to upload subcategory image: ' + err.message);
        } finally {
            setUploading(false);
            setSubcatUploadTarget(null);
            if (subcatFileInputRef.current) subcatFileInputRef.current.value = '';
        }
    };

    // Save category page changes
    const handleSaveConfig = async () => {
        if (!activePage || !pageConfig) return;
        setSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);
        try {
            const fallbackTplId =
                pageConfig.process?.templateId ||
                getDefaultTemplateIdForCategory(activePage.categorySlug) ||
                processTemplates[0]?.id ||
                null;

            const payloadToSave = {
                ...pageConfig,
                process: {
                    enabled: pageConfig.process?.enabled !== false,
                    templateId: fallbackTplId
                }
            };

            const res = await fetch(`/api/v2/category-pages/${activePage.categorySlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSave)
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
                                ? `Live URL: /v2/services/${activePage.categorySlug}`
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

                            {/* ══════════════ Subcategories Management ══════════════ */}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    padding: '14px 18px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    marginBottom: 20
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>Subcategories / Appliance Types</span>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#6338f5', color: '#ffffff', fontWeight: 700 }}>
                                                {(pageConfig.subcategories || []).length} Types
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            Manage subcategories for <strong>{activePage.categoryName}</strong>. Configure up to 3 animated sliding thumbnails, rename, reorder, or add new appliance types.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsAddingSubcategory(prev => !prev)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: isAddingSubcategory ? 'var(--bg-elevated)' : '#6338f5',
                                            color: isAddingSubcategory ? 'var(--text-primary)' : '#ffffff',
                                            border: isAddingSubcategory ? '1px solid var(--border-primary)' : 'none',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {isAddingSubcategory ? <X size={14} /> : <Plus size={14} />}
                                        {isAddingSubcategory ? 'Cancel' : 'Add Subcategory'}
                                    </button>
                                </div>

                                {/* ── Add Subcategory Form ── */}
                                {isAddingSubcategory && (
                                    <div style={{
                                        padding: 20,
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: 'rgba(99, 56, 245, 0.05)',
                                        border: '2px solid #6338f5',
                                        marginBottom: 24
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#6338f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Plus size={16} /> Add New Subcategory to {activePage.categoryName}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingSubcategory(false)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                                                    Subcategory Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Cassette AC, Double Door, Tower AC"
                                                    value={newSubcatForm.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                        setNewSubcatForm(prev => ({
                                                            ...prev,
                                                            name: val,
                                                            slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                                                                ? autoSlug
                                                                : prev.slug
                                                        }));
                                                    }}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                                                    Slug (Inventory Subcategory Match) *
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. cassette-ac"
                                                    value={newSubcatForm.slug}
                                                    onChange={(e) => setNewSubcatForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                                                />
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                                                    Must match the subcategory in Inventory to tag services.
                                                </div>
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                                                    Short Description / Subtitle
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Complete chemical wash, fan motor & gas refill"
                                                    value={newSubcatForm.shortDesc}
                                                    onChange={(e) => setNewSubcatForm(prev => ({ ...prev, shortDesc: e.target.value }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Primary Icon / Thumbnail Upload */}
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                                                Primary Icon / Thumbnail URL
                                            </label>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img
                                                        src={newSubcatForm.icon || activeCatData?.icon || '/images/services/ac_3d.png'}
                                                        alt="Preview"
                                                        style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="https://... or /images/services/..."
                                                    value={newSubcatForm.icon}
                                                    onChange={(e) => setNewSubcatForm(prev => ({ ...prev, icon: e.target.value }))}
                                                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSubcatUploadTarget({ subIdx: 'new' });
                                                        if (subcatFileInputRef.current) subcatFileInputRef.current.click();
                                                    }}
                                                    style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#6338f5', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                                                >
                                                    <Upload size={13} /> Upload Image
                                                </button>
                                            </div>
                                        </div>

                                        {/* Up to 3 Slide Animations */}
                                        <div style={{ padding: 14, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', marginBottom: 18 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        Animated 3-Slide Thumbnails (Optional)
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                        Images automatically slide in from top, bottom, left and right like homepage tiles.
                                                    </div>
                                                </div>
                                                {(newSubcatForm.thumbnailSlides || []).length < 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSlideToNewSubcat}
                                                        style={{ padding: '5px 10px', borderRadius: 6, backgroundColor: '#6338f5', color: '#ffffff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        <Plus size={11} /> Add Slide ({3 - (newSubcatForm.thumbnailSlides || []).length} left)
                                                    </button>
                                                )}
                                            </div>

                                            {(newSubcatForm.thumbnailSlides || []).length === 0 ? (
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 0' }}>
                                                    No extra slides added yet. The primary icon above will be used as the single thumbnail. Click "Add Slide" to enable animated sliding.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {newSubcatForm.thumbnailSlides.map((slide, sIdx) => (
                                                        <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 800, color: '#6338f5', width: 55, flexShrink: 0 }}>
                                                                Slide #{sIdx + 1}
                                                            </span>
                                                            <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                                <img src={slide.url || newSubcatForm.icon || activeCatData?.icon} alt={`Slide ${sIdx + 1}`} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="Slide image URL"
                                                                value={slide.url || ''}
                                                                onChange={(e) => handleUpdateSlideInNewSubcat(sIdx, e.target.value)}
                                                                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 11 }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSubcatUploadTarget({ subIdx: 'new', slideIdx: sIdx });
                                                                    if (subcatFileInputRef.current) subcatFileInputRef.current.click();
                                                                }}
                                                                style={{ padding: '6px 10px', borderRadius: 6, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                            >
                                                                <Upload size={11} /> Upload
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSlideFromNewSubcat(sIdx)}
                                                                style={{ padding: '6px', borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                                                                title="Remove Slide"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingSubcategory(false)}
                                                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddSubcategorySubmit}
                                                style={{ padding: '8px 18px', borderRadius: 'var(--radius-md)', backgroundColor: '#6338f5', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <Check size={14} /> Add Subcategory
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Subcategories List ── */}
                                {(!pageConfig.subcategories || pageConfig.subcategories.length === 0) ? (
                                    <div style={{ padding: 32, textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)', color: 'var(--text-secondary)' }}>
                                        <p style={{ margin: '0 0 12px 0', fontSize: 13 }}>No subcategories configured for this category yet.</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingSubcategory(true)}
                                            style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#6338f5', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                        >
                                            <Plus size={14} /> Add First Subcategory
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {pageConfig.subcategories.map((sub, idx) => {
                                            const slides = Array.isArray(sub.thumbnailSlides) && sub.thumbnailSlides.length > 0
                                                ? sub.thumbnailSlides
                                                : (sub.icon ? [{ id: '1', url: sub.icon, title: sub.name }] : []);

                                            return (
                                                <div
                                                    key={sub.slug || idx}
                                                    style={{
                                                        padding: 18,
                                                        borderRadius: 'var(--radius-lg)',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border-primary)',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    {/* Card Top Action Bar */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: 10,
                                                        marginBottom: 14,
                                                        paddingBottom: 10,
                                                        borderBottom: '1px solid var(--border-primary)'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {/* Reorder Buttons */}
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === 0}
                                                                    onClick={() => handleMoveSubcategory(idx, -1)}
                                                                    title="Move Up"
                                                                    style={{
                                                                        padding: 4,
                                                                        borderRadius: 4,
                                                                        border: '1px solid var(--border-primary)',
                                                                        backgroundColor: 'var(--bg-elevated)',
                                                                        color: idx === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                                        cursor: idx === 0 ? 'not-allowed' : 'pointer'
                                                                    }}
                                                                >
                                                                    <ArrowUp size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === pageConfig.subcategories.length - 1}
                                                                    onClick={() => handleMoveSubcategory(idx, 1)}
                                                                    title="Move Down"
                                                                    style={{
                                                                        padding: 4,
                                                                        borderRadius: 4,
                                                                        border: '1px solid var(--border-primary)',
                                                                        backgroundColor: 'var(--bg-elevated)',
                                                                        color: idx === pageConfig.subcategories.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                                        cursor: idx === pageConfig.subcategories.length - 1 ? 'not-allowed' : 'pointer'
                                                                    }}
                                                                >
                                                                    <ArrowDown size={12} />
                                                                </button>
                                                            </div>

                                                            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                                                                #{idx + 1}
                                                            </span>

                                                            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                                                {sub.name || 'Untitled Subcategory'}
                                                            </strong>

                                                            <span style={{
                                                                fontSize: 11,
                                                                fontFamily: 'monospace',
                                                                padding: '2px 8px',
                                                                borderRadius: 6,
                                                                backgroundColor: 'rgba(99, 56, 245, 0.1)',
                                                                color: '#8b5cf6',
                                                                fontWeight: 700
                                                            }}>
                                                                /{sub.slug}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={sub.enabled !== false}
                                                                    onChange={(e) => handleUpdateSubcategory(idx, 'enabled', e.target.checked)}
                                                                />
                                                                Visible
                                                            </label>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSubcategory(idx)}
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: 6,
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                                    color: '#ef4444',
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                                title="Delete Subcategory"
                                                            >
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card Body Grid (Left: Details, Right: Thumbnails & 3-Slide Manager) */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                                        gap: 20
                                                    }}>
                                                        {/* Left: Info Inputs */}
                                                        <div>
                                                            <div style={{ marginBottom: 12 }}>
                                                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                                    Subcategory Name *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={sub.name || ''}
                                                                    onChange={(e) => handleUpdateSubcategory(idx, 'name', e.target.value)}
                                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13 }}
                                                                />
                                                            </div>

                                                            <div style={{ marginBottom: 12 }}>
                                                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                                    Subcategory Slug (Inventory Match) *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={sub.slug || ''}
                                                                    onChange={(e) => handleUpdateSubcategory(idx, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}
                                                                />
                                                            </div>

                                                            <div>
                                                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                                    Short Description / Subtitle
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={sub.shortDesc || ''}
                                                                    placeholder="e.g. Foam-jet deep cleaning, cooling fix & genuine parts"
                                                                    onChange={(e) => handleUpdateSubcategory(idx, 'shortDesc', e.target.value)}
                                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                                />
                                                            </div>

                                                            <div style={{
                                                                marginTop: 14,
                                                                padding: '8px 12px',
                                                                borderRadius: 6,
                                                                backgroundColor: 'var(--bg-elevated)',
                                                                border: '1px solid var(--border-primary)',
                                                                fontSize: 11,
                                                                color: 'var(--text-secondary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6
                                                            }}>
                                                                <Info size={13} color="#6338f5" style={{ flexShrink: 0 }} />
                                                                <span>
                                                                    Services created in <strong>Inventory</strong> with Subcategory <strong>"{sub.slug}"</strong> automatically filter under this card on the website.
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right: Thumbnails & 3-Slide Animated Images */}
                                                        <div style={{
                                                            padding: 14,
                                                            borderRadius: 8,
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            border: '1px solid var(--border-primary)'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                                <div>
                                                                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <ImageIcon size={14} color="#6338f5" />
                                                                        <span>Thumbnails & 3-Slide Animation</span>
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                                        Slides in from top, bottom, left & right
                                                                    </div>
                                                                </div>

                                                                {slides.length < 3 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddSlideToSubcategory(idx)}
                                                                        style={{
                                                                            padding: '4px 10px',
                                                                            borderRadius: 6,
                                                                            backgroundColor: '#6338f5',
                                                                            color: '#ffffff',
                                                                            border: 'none',
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4
                                                                        }}
                                                                    >
                                                                        <Plus size={11} /> Add Slide ({3 - slides.length} left)
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Animated Preview + Slides List */}
                                                            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                                                {/* Animated Live Preview Box */}
                                                                <div style={{
                                                                    width: 72,
                                                                    height: 72,
                                                                    borderRadius: 12,
                                                                    backgroundColor: activeCatData?.accent || '#f8fafc',
                                                                    border: '1px solid var(--border-primary)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden',
                                                                    flexShrink: 0,
                                                                    position: 'relative'
                                                                }}>
                                                                    {slides.length > 0 ? (
                                                                        <SlidingThumbnail
                                                                            slides={slides}
                                                                            fallbackUrl={sub.icon || activeCatData?.icon || '/images/services/ac_3d.png'}
                                                                            alt={sub.name}
                                                                            interval={2500}
                                                                            width="100%"
                                                                            height="100%"
                                                                            objectFit="contain"
                                                                        />
                                                                    ) : (
                                                                        <img
                                                                            src={sub.icon || activeCatData?.icon || '/images/services/ac_3d.png'}
                                                                            alt={sub.name}
                                                                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                                                        />
                                                                    )}
                                                                </div>

                                                                {/* Slides Inputs */}
                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                    {slides.map((slide, sIdx) => (
                                                                        <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#6338f5', width: 48, flexShrink: 0 }}>
                                                                                #{sIdx + 1}
                                                                            </span>
                                                                            <input
                                                                                type="text"
                                                                                value={slide.url || ''}
                                                                                onChange={(e) => handleUpdateSubcategorySlide(idx, sIdx, e.target.value)}
                                                                                placeholder="Slide image URL"
                                                                                style={{
                                                                                    flex: 1,
                                                                                    padding: '5px 8px',
                                                                                    borderRadius: 6,
                                                                                    border: '1px solid var(--border-primary)',
                                                                                    backgroundColor: 'var(--bg-secondary)',
                                                                                    color: 'var(--text-primary)',
                                                                                    fontSize: 11
                                                                                }}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSubcatUploadTarget({ subIdx: idx, slideIdx: sIdx });
                                                                                    if (subcatFileInputRef.current) subcatFileInputRef.current.click();
                                                                                }}
                                                                                style={{
                                                                                    padding: '5px 8px',
                                                                                    borderRadius: 6,
                                                                                    backgroundColor: 'var(--bg-secondary)',
                                                                                    color: 'var(--text-secondary)',
                                                                                    border: '1px solid var(--border-primary)',
                                                                                    fontSize: 11,
                                                                                    cursor: 'pointer',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 4
                                                                                }}
                                                                                title="Upload Image"
                                                                            >
                                                                                <Upload size={11} />
                                                                            </button>
                                                                            {slides.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveSlideFromSubcategory(idx, sIdx)}
                                                                                    style={{
                                                                                        padding: '5px',
                                                                                        borderRadius: 6,
                                                                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                                                                        color: '#ef4444',
                                                                                        border: 'none',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                    title="Delete Slide"
                                                                                >
                                                                                    <Trash2 size={11} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: OUR PROCESS (LINK TEMPLATE) */}
                    {activeTab === 'process' && (() => {
                        const selectedTplId =
                            pageConfig.process?.templateId ||
                            getDefaultTemplateIdForCategory(activePage.categorySlug) ||
                            processTemplates[0]?.id ||
                            '';
                        const linkedTemplate =
                            processTemplates.find(t => t.id === selectedTplId) ||
                            processTemplates[0] ||
                            null;

                        return (
                            <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                                    <div>
                                        <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Link2 size={18} color="#10b981" /> Link an "Our Process" Template
                                        </h2>
                                        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            Select which reusable Our Process template should display on the <strong>{activePage.categoryName}</strong> page.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={pageConfig.process?.enabled !== false}
                                                onChange={(e) => setPageConfig(prev => ({
                                                    ...prev,
                                                    process: { ...prev.process, enabled: e.target.checked }
                                                }))}
                                            />
                                            Section Visible
                                        </label>

                                        <button
                                            type="button"
                                            onClick={fetchProcessTemplates}
                                            title="Refresh templates list"
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 6,
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                color: 'var(--text-secondary)',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <RefreshCw size={12} /> Refresh
                                        </button>

                                        {onOpenProcessTemplates && (
                                            <button
                                                type="button"
                                                onClick={onOpenProcessTemplates}
                                                style={{
                                                    padding: '7px 12px',
                                                    borderRadius: 6,
                                                    border: '1px solid #10b981',
                                                    backgroundColor: 'rgba(16,185,129,0.12)',
                                                    color: '#10b981',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}
                                            >
                                                <ListOrdered size={13} /> Manage / Create Templates
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {loadingProcessTemplates ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                        Loading Our Process templates...
                                    </div>
                                ) : processTemplates.length === 0 ? (
                                    <div style={{
                                        padding: 28,
                                        borderRadius: 12,
                                        border: '1px dashed var(--border-primary)',
                                        textAlign: 'center',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <p style={{ margin: '0 0 10px 0', fontSize: 13.5 }}>
                                            No Our Process templates created yet.
                                        </p>
                                        {onOpenProcessTemplates && (
                                            <button
                                                type="button"
                                                onClick={onOpenProcessTemplates}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    backgroundColor: '#6338f5',
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Go to Our Process Templates →
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Dropdown Selector */}
                                        <div style={{ marginBottom: 18 }}>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                                Assigned Our Process Template
                                            </label>
                                            <select
                                                value={linkedTemplate?.id || ''}
                                                onChange={(e) => setPageConfig(prev => ({
                                                    ...prev,
                                                    process: {
                                                        enabled: prev.process?.enabled !== false,
                                                        templateId: e.target.value
                                                    }
                                                }))}
                                                style={{
                                                    width: '100%',
                                                    maxWidth: 480,
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border-primary)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 13.5,
                                                    fontWeight: 700
                                                }}
                                            >
                                                {processTemplates.map(tpl => (
                                                    <option key={tpl.id} value={tpl.id}>
                                                        {tpl.name} ({(tpl.steps || []).length} steps)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quick Visual Template Cards */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                            gap: 10,
                                            marginBottom: 22
                                        }}>
                                            {processTemplates.map(tpl => {
                                                const isPicked = linkedTemplate?.id === tpl.id;
                                                return (
                                                    <button
                                                        key={tpl.id}
                                                        type="button"
                                                        onClick={() => setPageConfig(prev => ({
                                                            ...prev,
                                                            process: {
                                                                enabled: prev.process?.enabled !== false,
                                                                templateId: tpl.id
                                                            }
                                                        }))}
                                                        style={{
                                                            padding: 12,
                                                            borderRadius: 10,
                                                            border: isPicked ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                                                            backgroundColor: isPicked ? 'rgba(99,56,245,0.12)' : 'var(--bg-secondary)',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            color: 'var(--text-primary)',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                                                            <strong style={{ fontSize: 13 }}>{tpl.name}</strong>
                                                            {isPicked && <CheckCircle2 size={15} color="#6338f5" />}
                                                        </div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                                            Heading: &ldquo;{tpl.title || 'Our process'}&rdquo; • {(tpl.steps || []).length} steps
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Read-only Linked Template Preview */}
                                        {linkedTemplate && (
                                            <div style={{
                                                padding: 18,
                                                borderRadius: 12,
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                            Linked Template Preview (Read-Only)
                                                        </div>
                                                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                                                            {linkedTemplate.title || 'Our process'}
                                                        </div>
                                                        {linkedTemplate.subtitle && (
                                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                                {linkedTemplate.subtitle}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                                                        Edit steps in <strong>Ecom V2 Settings → Our Process</strong>
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {(linkedTemplate.steps || []).map((step, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: 12,
                                                                borderRadius: 9,
                                                                backgroundColor: 'var(--bg-elevated)',
                                                                border: '1px solid var(--border-primary)',
                                                                display: 'flex',
                                                                gap: 12,
                                                                alignItems: 'flex-start'
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: '50%',
                                                                backgroundColor: '#6338f5',
                                                                color: '#fff',
                                                                fontSize: 11,
                                                                fontWeight: 800,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {idx + 1}
                                                            </span>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                    {step.title}
                                                                </div>
                                                                {step.desc && (
                                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                                                                        {step.desc}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {step.imageUrl && (
                                                                <img
                                                                    src={step.imageUrl}
                                                                    alt={step.title}
                                                                    style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })()}

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
            {/* Hidden Subcategory Thumbnail & Slide File Input */}
            <input
                ref={subcatFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleSubcatImageSelect}
            />
        </div>
    );
}
