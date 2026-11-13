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
    ChevronUp
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';

const SECTION_LABELS = {
    hero: '🎬 Top Media & Hero',
    services: '📦 Horizontal Services Carousel',
    process: '🛠️ Our Process (Step-by-step)',
    technicians: '👨‍🔧 Top Technicians Card',
    brands: '🏷️ We Service All Brands',
    coverPromise: '🛡️ Sorted Cover Promise',
    notIncluded: '🚫 What Is Not Included',
    faqs: '❓ Frequently Asked Questions',
    reviews: '⭐ Customer Reviews & Ratings'
};

export default function EcomV2SubcategorySettings({ onBack }) {
    // List state
    const [pages, setPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Active editing page
    const [activePage, setActivePage] = useState(null); // { categorySlug, subcategorySlug, ... }
    const [pageConfig, setPageConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState('hero');

    // Linked inventory services for active subcategory
    const [linkedServices, setLinkedServices] = useState([]);
    const [otherCategoryServices, setOtherCategoryServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [reassigningId, setReassigningId] = useState(null);
    const [showOtherServices, setShowOtherServices] = useState(false);

    // Create New Page Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newCategorySlug, setNewCategorySlug] = useState('ac-repair');
    const [newCategoryName, setNewCategoryName] = useState('Air Conditioner');
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [newSubcategorySlug, setNewSubcategorySlug] = useState('');
    const [newHeroTitle, setNewHeroTitle] = useState('');
    const [creating, setCreating] = useState(false);

    // Media upload
    const [uploading, setUploading] = useState(false);
    const heroFileInputRef = useRef(null);
    const techFileInputRef = useRef(null);
    const stepFileInputRef = useRef(null);
    const [uploadingStepIdx, setUploadingStepIdx] = useState(null);

    // Initial fetch
    useEffect(() => {
        fetchPagesList();
    }, []);

    const fetchPagesList = async () => {
        setLoadingPages(true);
        try {
            const res = await fetch('/api/v2/subcategory-pages');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setPages(json.data);
            }
        } catch (err) {
            console.error('Failed to load subcategory pages list:', err);
        } finally {
            setLoadingPages(false);
        }
    };

    const fetchSubcategoryServices = async (categorySlug, subcategorySlug, subcategoryName) => {
        if (!categorySlug) return;
        setLoadingServices(true);
        try {
            const res = await fetch(`/api/v2/services?category=${categorySlug}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.services)) {
                const normSubSlug = (subcategorySlug || '').toLowerCase().trim();
                const normSubName = (subcategoryName || '').toLowerCase().trim();

                const linked = [];
                const other = [];

                json.services.forEach(item => {
                    const itemSub = (item.subcategory || '').toLowerCase().trim();
                    const isDirectMatch = itemSub && (
                        itemSub === normSubSlug ||
                        itemSub === normSubName ||
                        itemSub.replace(/\s+/g, '-') === normSubSlug ||
                        normSubSlug.includes(itemSub)
                    );

                    if (isDirectMatch) {
                        linked.push(item);
                    } else {
                        other.push(item);
                    }
                });

                setLinkedServices(linked);
                setOtherCategoryServices(other);
            }
        } catch (err) {
            console.error('Failed to load subcategory services:', err);
        } finally {
            setLoadingServices(false);
        }
    };

    const handleAssignService = async (serviceId) => {
        if (!activePage || !serviceId) return;
        setReassigningId(serviceId);
        try {
            const res = await fetch('/api/admin/inventory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: serviceId,
                    subcategory: activePage.subcategorySlug
                })
            });
            const json = await res.json();
            if (json.success) {
                await fetchSubcategoryServices(activePage.categorySlug, activePage.subcategorySlug, activePage.subcategoryName);
            } else {
                alert(json.error || 'Failed to update service subcategory');
            }
        } catch (err) {
            alert('Error updating service: ' + err.message);
        } finally {
            setReassigningId(null);
        }
    };

    const handleSelectPage = async (page) => {
        setActivePage(page);
        setLoadingConfig(true);
        setErrorMessage('');
        setSaveSuccess(false);
        fetchSubcategoryServices(page.categorySlug, page.subcategorySlug, page.subcategoryName);
        try {
            const res = await fetch(`/api/v2/subcategory-pages/${page.categorySlug}/${page.subcategorySlug}`);
            const json = await res.json();
            if (json.success && json.data) {
                setPageConfig(json.data);
            } else {
                setErrorMessage(json.error || 'Failed to load page config');
            }
        } catch (err) {
            setErrorMessage('Network error loading page config: ' + err.message);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!activePage || !pageConfig) return;
        setSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);
        try {
            const res = await fetch(`/api/v2/subcategory-pages/${activePage.categorySlug}/${activePage.subcategorySlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryName: activePage.categoryName,
                    subcategoryName: activePage.subcategoryName,
                    data: pageConfig
                })
            });
            const json = await res.json();
            if (json.success) {
                setSaveSuccess(true);
                // Refresh list
                fetchPagesList();
                setTimeout(() => setSaveSuccess(false), 3500);
            } else {
                setErrorMessage(json.error || 'Failed to save changes');
            }
        } catch (err) {
            setErrorMessage('Network error saving changes: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUploadMedia = async (file, target, stepIndex = null) => {
        if (!file) return;
        setUploading(true);
        setErrorMessage('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'website-assets');
            formData.append('folder', 'ecom-v2/subcategories');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            if (json.success && json.url) {
                if (target === 'hero') {
                    const isVideo = file.type?.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i);
                    const isGif = file.type?.includes('gif') || file.name.match(/\.gif$/i);
                    setPageConfig(prev => ({
                        ...prev,
                        hero: {
                            ...prev.hero,
                            mediaUrl: json.url,
                            mediaType: isVideo ? 'video' : isGif ? 'gif' : 'image'
                        }
                    }));
                } else if (target === 'technicians') {
                    setPageConfig(prev => ({
                        ...prev,
                        technicians: {
                            ...prev.technicians,
                            photoUrl: json.url
                        }
                    }));
                } else if (target === 'step' && stepIndex !== null) {
                    setPageConfig(prev => {
                        const newSteps = [...(prev.process?.steps || [])];
                        if (newSteps[stepIndex]) {
                            newSteps[stepIndex].imageUrl = json.url;
                        }
                        return {
                            ...prev,
                            process: {
                                ...prev.process,
                                steps: newSteps
                            }
                        };
                    });
                }
            } else {
                setErrorMessage(json.error || 'File upload failed');
            }
        } catch (err) {
            setErrorMessage('Upload error: ' + err.message);
        } finally {
            setUploading(false);
            setUploadingStepIdx(null);
        }
    };

    const handleCreatePage = async (e) => {
        e.preventDefault();
        if (!newSubcategoryName.trim()) return;
        setCreating(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/subcategory-pages/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categorySlug: newCategorySlug,
                    categoryName: newCategoryName,
                    subcategoryName: newSubcategoryName.trim(),
                    subcategorySlug: newSubcategorySlug.trim() || newSubcategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    heroTitle: newHeroTitle.trim() || `${newSubcategoryName.trim()} Check-up & Repair`
                })
            });
            const json = await res.json();
            if (json.success) {
                setCreateModalOpen(false);
                setNewSubcategoryName('');
                setNewSubcategorySlug('');
                setNewHeroTitle('');
                // Refresh list and open newly created page
                await fetchPagesList();
                handleSelectPage({
                    categorySlug: json.categorySlug,
                    subcategorySlug: json.subcategorySlug,
                    categoryName: newCategoryName,
                    subcategoryName: newSubcategoryName,
                    pageUrl: json.pageUrl
                });
            } else {
                setErrorMessage(json.error || 'Failed to create page');
            }
        } catch (err) {
            setErrorMessage('Network error creating page: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    // Filter pages
    const filteredPages = pages.filter(p => {
        const matchesCat = selectedCategoryFilter === 'ALL' || p.categorySlug === selectedCategoryFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q ||
            p.subcategoryName.toLowerCase().includes(q) ||
            p.categoryName.toLowerCase().includes(q) ||
            p.subcategorySlug.toLowerCase().includes(q) ||
            (p.headline && p.headline.toLowerCase().includes(q));
        return matchesCat && matchesQuery;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. OVERVIEW VIEW (LIST OF ALL SUBCATEGORY PAGES)
    // ──────────────────────────────────────────────────────────────────────────
    if (!activePage) {
        return (
            <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
                {/* Header with Back button and Create New Page */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    <div>
                        <button
                            onClick={onBack}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer',
                                marginBottom: 8
                            }}
                        >
                            <ArrowLeft size={14} /> Back to Ecom V2
                        </button>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                            Sub Category Pages (Urban Company UI)
                        </h2>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Configure top video/gif, horizontal services, process steps, technicians, brands, promise, FAQs & reviews for all {pages.length} subcategory pages.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: '#6338f5',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99,56,245,0.3)'
                        }}
                    >
                        <Plus size={16} /> Create New Subcategory Page
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 20
                }}>
                    {/* Category Filter Pills */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        <button
                            onClick={() => setSelectedCategoryFilter('ALL')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 999,
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                border: selectedCategoryFilter === 'ALL' ? '1.5px solid #6338f5' : '1px solid var(--border-primary)',
                                backgroundColor: selectedCategoryFilter === 'ALL' ? '#6338f5' : 'var(--bg-elevated)',
                                color: selectedCategoryFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            All Categories ({pages.length})
                        </button>
                        {V2_CATEGORIES.map(c => {
                            const count = pages.filter(p => p.categorySlug === c.slug).length;
                            const isActive = selectedCategoryFilter === c.slug;
                            return (
                                <button
                                    key={c.slug}
                                    onClick={() => setSelectedCategoryFilter(c.slug)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 999,
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        border: isActive ? '1.5px solid #6338f5' : '1px solid var(--border-primary)',
                                        backgroundColor: isActive ? '#6338f5' : 'var(--bg-elevated)',
                                        color: isActive ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {c.mobileLabel || c.name} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div style={{
                        position: 'relative',
                        minWidth: 260
                    }}>
                        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search subcategory pages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 12px 7px 32px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                fontSize: 'var(--font-size-xs)'
                            }}
                        />
                    </div>
                </div>

                {/* Subcategory Pages Grid */}
                {loadingPages ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
                        <div>Loading subcategory pages...</div>
                    </div>
                ) : filteredPages.length === 0 ? (
                    <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Layers size={36} color="var(--text-tertiary)" style={{ marginBottom: 10 }} />
                        <h3>No pages matched your search</h3>
                        <p style={{ margin: '4px 0 16px 0', fontSize: 'var(--font-size-sm)' }}>
                            Try selecting another category or click "Create New Subcategory Page".
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: 16
                    }}>
                        {filteredPages.map(page => (
                            <div
                                key={`${page.categorySlug}-${page.subcategorySlug}`}
                                className="card"
                                style={{
                                    padding: 16,
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.15s, border-color 0.15s',
                                    position: 'relative'
                                }}
                            >
                                <div>
                                    {/* Top row: Category tag + Customized badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(99,56,245,0.12)',
                                            color: '#8b5cf6'
                                        }}>
                                            {page.categoryName}
                                        </span>

                                        {page.isCustomized ? (
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                backgroundColor: 'rgba(16,185,129,0.15)',
                                                color: '#10b981',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <CheckCircle2 size={11} /> Customized
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                backgroundColor: 'rgba(148,163,184,0.15)',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                Default Template
                                            </span>
                                        )}
                                    </div>

                                    {/* Title and Media preview */}
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 8,
                                            backgroundColor: '#1e293b',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            border: '1px solid var(--border-primary)'
                                        }}>
                                            {page.mediaType === 'video' ? (
                                                <Film size={24} color="#6338f5" />
                                            ) : (
                                                <img
                                                    src={page.mediaUrl}
                                                    alt={page.subcategoryName}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.currentTarget.src = '/images/banners/banner_speed_90_mins.png'; }}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                                                {page.subcategoryName}
                                            </h3>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                                                {page.headline}
                                            </p>
                                            <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                                                {page.pageUrl}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom action buttons */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    paddingTop: 12,
                                    borderTop: '1px solid var(--border-primary)'
                                }}>
                                    <button
                                        onClick={() => handleSelectPage(page)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: '#6338f5',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            fontSize: 'var(--font-size-xs)',
                                            border: 'none',
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
                                        href={page.pageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-elevated)',
                                            color: 'var(--text-secondary)',
                                            fontSize: 'var(--font-size-xs)',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                        title="Preview Live Page in new tab"
                                    >
                                        <Eye size={13} /> Live
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create New Page Modal */}
                {createModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: 16
                    }}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: 480,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 24,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Create New Subcategory Page
                                </h3>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePage}>
                                <div className="form-group" style={{ marginBottom: 14 }}>
                                    <label className="form-label">Category *</label>
                                    <select
                                        className="form-select"
                                        value={newCategorySlug}
                                        onChange={(e) => {
                                            setNewCategorySlug(e.target.value);
                                            const cat = V2_CATEGORIES.find(c => c.slug === e.target.value);
                                            if (cat) setNewCategoryName(cat.name);
                                        }}
                                        required
                                    >
                                        {V2_CATEGORIES.map(c => (
                                            <option key={c.slug} value={c.slug}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: 14 }}>
                                    <label className="form-label">Subcategory Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Commercial Cassette AC or Direct Drive Front Load"
                                        value={newSubcategoryName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNewSubcategoryName(val);
                                            setNewSubcategorySlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                                            setNewHeroTitle(`${val} Check-up & Repair`);
                                        }}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 14 }}>
                                    <label className="form-label">URL Slug *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. commercial-cassette-ac"
                                        value={newSubcategorySlug}
                                        onChange={(e) => setNewSubcategorySlug(e.target.value)}
                                        required
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        URL: /v2/services/{newCategorySlug}/{newSubcategorySlug || 'slug'}
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">Hero Title</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Cassette AC Check-up"
                                        value={newHeroTitle}
                                        onChange={(e) => setNewHeroTitle(e.target.value)}
                                    />
                                </div>

                                {errorMessage && (
                                    <div style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', marginBottom: 12 }}>
                                        {errorMessage}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(false)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: '#6338f5',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {creating ? 'Creating...' : 'Create & Open Designer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PAGE DESIGNER VIEW (CUSTOMIZE SECTIONS FOR SELECTED SUBCATEGORY)
    // ──────────────────────────────────────────────────────────────────────────
    if (loadingConfig || !pageConfig) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
                <div>Loading page designer for {activePage.subcategoryName}...</div>
            </div>
        );
    }

    const hero = pageConfig.hero || {};
    const process = pageConfig.process || { steps: [] };
    const technicians = pageConfig.technicians || { points: [] };
    const brands = pageConfig.brands || { items: [] };
    const coverPromise = pageConfig.coverPromise || { points: [] };
    const notIncluded = pageConfig.notIncluded || { items: [] };
    const faqs = pageConfig.faqs || { items: [] };
    const reviews = pageConfig.reviews || { items: [] };
    const servicesSection = pageConfig.servicesSection || {};

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 80 }}>
            {/* Hidden file inputs for uploads */}
            <input
                ref={heroFileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadMedia(f, 'hero');
                }}
            />
            <input
                ref={techFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadMedia(f, 'technicians');
                }}
            />
            <input
                ref={stepFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && uploadingStepIdx !== null) handleUploadMedia(f, 'step', uploadingStepIdx);
                }}
            />

            {/* Designer Header Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-primary)',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-primary, #0f172a)',
                zIndex: 10
            }}>
                <div>
                    <button
                        onClick={() => setActivePage(null)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--font-size-xs)',
                            cursor: 'pointer',
                            marginBottom: 6
                        }}
                    >
                        <ArrowLeft size={13} /> Back to Pages List
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                            {activePage.subcategoryName} Designer
                        </h2>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(99,56,245,0.15)', color: '#8b5cf6', fontWeight: 700 }}>
                            {activePage.categoryName}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>
                        Live URL: /v2/services/{activePage.categorySlug}/{activePage.subcategorySlug}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a
                        href={`/v2/services/${activePage.categorySlug}/${activePage.subcategorySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        <Eye size={14} /> Preview Live Page
                    </a>

                    <button
                        onClick={handleSaveConfig}
                        disabled={saving || uploading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 20px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: saveSuccess ? '#10b981' : '#6338f5',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99,56,245,0.35)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={15} className="spin" /> Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={15} /> Saved Successfully!
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={15} /> Save Page Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error or Success notification banner */}
            {errorMessage && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 16
                }}>
                    {errorMessage}
                </div>
            )}
            {saveSuccess && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 16
                }}>
                    Page configuration saved successfully! Visit the live storefront to see the updated sections.
                </div>
            )}

            {/* Section Tab Buttons (Urban Company sections) */}
            <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 8,
                marginBottom: 20,
                borderBottom: '1px solid var(--border-primary)',
                scrollbarWidth: 'none'
            }}>
                {[
                    { id: 'hero', label: '🎬 Top Media & Hero' },
                    { id: 'services', label: linkedServices.length > 0 ? `📦 Services Carousel (${linkedServices.length})` : '📦 Services Carousel' },
                    { id: 'process', label: '🛠️ Our Process' },
                    { id: 'technicians', label: '👨‍🔧 Top Technicians' },
                    { id: 'brands', label: '🏷️ Brands Serviced' },
                    { id: 'coverPromise', label: '🛡️ Cover Promise' },
                    { id: 'notIncluded', label: '🚫 Not Included' },
                    { id: 'faqs', label: '❓ FAQs' },
                    { id: 'reviews', label: '⭐ Reviews' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: activeTab === tab.id ? '#6338f5' : 'var(--bg-elevated)',
                            color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            fontSize: 'var(--font-size-xs)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB 1: TOP MEDIA & HERO ─────────────────────────────────── */}
            {activeTab === 'hero' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Top Media & Hero Header Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Media banner (image, GIF, or looping video), main title, rating, review count, and rate card pill.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={hero.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    hero: { ...prev.hero, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    {/* Media Type Toggle + Upload */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Media Type</label>
                            <select
                                className="form-select"
                                value={hero.mediaType || 'image'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    hero: { ...prev.hero, mediaType: e.target.value }
                                }))}
                            >
                                <option value="image">Static Image (JPG / PNG / WebP)</option>
                                <option value="gif">Animated GIF</option>
                                <option value="video">Looping Video (MP4 / WebM)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Upload or Change Media</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="https://... or upload"
                                    value={hero.mediaUrl || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        hero: { ...prev.hero, mediaUrl: e.target.value }
                                    }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => heroFileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: '#6338f5',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 'var(--font-size-xs)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Live Media Preview Box */}
                    {hero.mediaUrl && (
                        <div style={{
                            width: '100%',
                            maxWidth: 520,
                            height: 220,
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            backgroundColor: '#0f172a',
                            position: 'relative',
                            marginBottom: 20,
                            border: '1px solid var(--border-primary)'
                        }}>
                            {hero.mediaType === 'video' ? (
                                <video
                                    src={hero.mediaUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <img
                                    src={hero.mediaUrl}
                                    alt="Hero media"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}
                            {/* Stories progress line simulation */}
                            <div style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 14,
                                right: 14,
                                height: 3,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 99
                            }}>
                                <div style={{ width: '40%', height: '100%', backgroundColor: '#ffffff', borderRadius: 99 }} />
                            </div>
                        </div>
                    )}

                    {/* Title & Subtitle */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Subcategory Page Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Microwave check-up"
                                value={hero.title || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    hero: { ...prev.hero, title: e.target.value }
                                }))}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Rating & Reviews Count</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="4.84"
                                    style={{ width: '45%' }}
                                    value={hero.rating || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        hero: { ...prev.hero, rating: e.target.value }
                                    }))}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="60K reviews"
                                    value={hero.reviewsCount || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        hero: { ...prev.hero, reviewsCount: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rate Card & Guarantee Pill */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Rate Card Link Text</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Standard rate card"
                                value={hero.rateCardText || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    hero: { ...prev.hero, rateCardText: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Guarantee Badge Text</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. sorted cover"
                                value={hero.rateCardBadge || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    hero: { ...prev.hero, rateCardBadge: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: SERVICES CAROUSEL ─────────────────────────────────── */}
            {activeTab === 'services' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* 1. Header & Section Settings Card */}
                    <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Horizontal Services / Issues Carousel
                                </h3>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    Displays all active published web services tagged under this subcategory on a smooth horizontal swipeable track.
                                </p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                                <input
                                    type="checkbox"
                                    checked={servicesSection.enabled !== false}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        servicesSection: { ...prev.servicesSection, enabled: e.target.checked }
                                    }))}
                                />
                                Section Visible
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Section Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Select a Service"
                                    value={servicesSection.title || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        servicesSection: { ...prev.servicesSection, title: e.target.value }
                                    }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subtitle / Description</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Transparent diagnostic pricing • Genuine spare parts"
                                    value={servicesSection.subtitle || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        servicesSection: { ...prev.servicesSection, subtitle: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>

                        <div style={{
                            padding: 12,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(99,56,245,0.08)',
                            border: '1px solid rgba(99,56,245,0.2)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                        }}>
                            <div>
                                <strong style={{ color: 'var(--text-primary)' }}>💡 How services appear here:</strong>
                                <span style={{ marginLeft: 6 }}>
                                    Services are pulled dynamically from your <strong>Inventory Tab</strong> where <code>Item Subtype = 'Web'</code> and <code>Subcategory = '{activePage.subcategorySlug}'</code>.
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => fetchSubcategoryServices(activePage.categorySlug, activePage.subcategorySlug, activePage.subcategoryName)}
                                    disabled={loadingServices}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={12} className={loadingServices ? 'spin' : ''} />
                                    {loadingServices ? 'Refreshing...' : 'Refresh Services'}
                                </button>
                                <a
                                    href={`/v2/services/${activePage.categorySlug}/${activePage.subcategorySlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: '#6338f5',
                                        color: '#ffffff',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textDecoration: 'none'
                                    }}
                                >
                                    <ExternalLink size={12} />
                                    Open Live Page ↗
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* 2. Linked Inventory Services List & Live Customer Preview */}
                    <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Services Linked to {activePage.subcategoryName}
                                    </h3>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        backgroundColor: linkedServices.length > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: linkedServices.length > 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {linkedServices.length > 0 ? `🟢 ${linkedServices.length} Active` : '⚠️ 0 Linked'}
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    These services are published from Admin Inventory and appear inside this subcategory carousel.
                                </p>
                            </div>
                        </div>

                        {loadingServices ? (
                            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                                <div style={{ fontSize: 'var(--font-size-xs)' }}>Loading linked services from inventory...</div>
                            </div>
                        ) : linkedServices.length === 0 ? (
                            <div style={{
                                padding: 24,
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px dashed var(--border-primary)',
                                textAlign: 'center'
                            }}>
                                <AlertCircle size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                                <h4 style={{ margin: '0 0 6px 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                    No services assigned to "{activePage.subcategoryName}" yet
                                </h4>
                                <p style={{ margin: '0 0 14px 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', maxWidth: 520, marginInline: 'auto' }}>
                                    To show services here, go to <strong>Inventory</strong> &gt; <strong>Create New Service</strong> (or edit an existing service), set <strong>Item Subtype = 'Web'</strong> and select <strong>Subcategory = '{activePage.subcategoryName}'</strong>.
                                </p>
                            </div>
                        ) : (
                            <div>
                                {/* Services Table / List */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    marginBottom: 24
                                }}>
                                    {linkedServices.map(svc => (
                                        <div
                                            key={svc.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-primary)',
                                                flexWrap: 'wrap',
                                                gap: 12
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
                                                <div style={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 8,
                                                    backgroundColor: 'rgba(99,56,245,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    overflow: 'hidden'
                                                }}>
                                                    {svc.image ? (
                                                        <img src={svc.image} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <Wrench size={20} color="#6338f5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {svc.name}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                        <span>SKU: {svc.sku || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Tag: {svc.subcategory || activePage.subcategorySlug}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: '#10b981' }}>
                                                        ₹{svc.price}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                                        Live Storefront Price
                                                    </div>
                                                </div>

                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: '3px 8px',
                                                    borderRadius: 999,
                                                    backgroundColor: 'rgba(16,185,129,0.12)',
                                                    color: '#10b981'
                                                }}>
                                                    ✓ Active
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Live Customer Storefront Preview (Urban Company style card) */}
                                <div style={{
                                    padding: 16,
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: '#0b0f19',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            👁️ Live Customer Storefront Preview
                                        </div>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>
                                            Horizontal Scrollable Cards
                                        </span>
                                    </div>

                                    {/* Preview container simulating white background storefront */}
                                    <div style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: 12,
                                        padding: '16px 14px',
                                        overflowX: 'auto',
                                        scrollbarWidth: 'none'
                                    }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                                            {servicesSection.title || 'Select a Service'}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                                            {linkedServices.map(svc => (
                                                <div
                                                    key={svc.id}
                                                    style={{
                                                        width: 175,
                                                        flexShrink: 0,
                                                        borderRadius: 12,
                                                        border: '1px solid #e2e8f0',
                                                        backgroundColor: '#ffffff',
                                                        padding: 12,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 6 }}>
                                                            {svc.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                                                            <span style={{ color: '#16a34a', fontWeight: 700 }}>★</span>
                                                            <span style={{ fontWeight: 600, color: '#334155' }}>4.85</span>
                                                            <span style={{ color: '#94a3b8' }}>(44K reviews)</span>
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginTop: 12,
                                                        paddingTop: 8,
                                                        borderTop: '1px solid #f1f5f9'
                                                    }}>
                                                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                                                            ₹{svc.price}
                                                        </div>
                                                        <div style={{
                                                            padding: '4px 14px',
                                                            borderRadius: 6,
                                                            border: '1px solid #6338f5',
                                                            backgroundColor: '#ffffff',
                                                            color: '#6338f5',
                                                            fontWeight: 700,
                                                            fontSize: 12
                                                        }}>
                                                            Add
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expandable: Other Web Services under this Category */}
                        {otherCategoryServices.length > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowOtherServices(!showOtherServices)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-xs)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>
                                        ℹ️ Other published web services under {activePage.categoryName} ({otherCategoryServices.length})
                                    </span>
                                    {showOtherServices ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {showOtherServices && (
                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {otherCategoryServices.map(svc => (
                                            <div
                                                key={svc.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    fontSize: 'var(--font-size-xs)'
                                                }}
                                            >
                                                <div>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{svc.name}</span>
                                                    <span style={{ marginLeft: 8, color: 'var(--text-tertiary)', fontSize: 11 }}>
                                                        (Subcategory: {svc.subcategory || 'None'})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={reassigningId === svc.id}
                                                    onClick={() => handleAssignService(svc.id)}
                                                    style={{
                                                        padding: '3px 10px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: 'rgba(99,56,245,0.15)',
                                                        color: '#8b5cf6',
                                                        border: '1px solid rgba(99,56,245,0.3)',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {reassigningId === svc.id ? 'Moving...' : `+ Move to ${activePage.subcategoryName}`}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 3: OUR PROCESS ───────────────────────────────────────── */}
            {activeTab === 'process' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Our Process (Step-by-Step Timeline)
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Numbered steps showing customer journey from inspection to quote and warranty activation.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={process.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    process: { ...prev.process, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Section Title</label>
                        <input
                            type="text"
                            className="form-input"
                            value={process.title || 'Our process'}
                            onChange={(e) => setPageConfig(prev => ({
                                ...prev,
                                process: { ...prev.process, title: e.target.value }
                            }))}
                        />
                    </div>

                    {/* Step Cards List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        {(process.steps || []).map((step, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: 16,
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary, #0f172a)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: '50%',
                                            backgroundColor: '#6338f5',
                                            color: '#fff',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <strong>Step {idx + 1}</strong>
                                    </div>

                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {idx > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSteps = [...process.steps];
                                                    const temp = newSteps[idx - 1];
                                                    newSteps[idx - 1] = newSteps[idx];
                                                    newSteps[idx] = temp;
                                                    setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                                }}
                                                style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                title="Move step up"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                        )}
                                        {idx < (process.steps.length - 1) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSteps = [...process.steps];
                                                    const temp = newSteps[idx + 1];
                                                    newSteps[idx + 1] = newSteps[idx];
                                                    newSteps[idx] = temp;
                                                    setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                                }}
                                                style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                title="Move step down"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newSteps = process.steps.filter((_, i) => i !== idx);
                                                setPageConfig(prev => ({ ...prev, process: { ...prev.process, steps: newSteps } }));
                                            }}
                                            style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                            title="Delete step"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 8 }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: 11 }}>Step Title</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Inspection & quote"
                                            value={step.title || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPageConfig(prev => {
                                                    const newSteps = [...prev.process.steps];
                                                    newSteps[idx] = { ...newSteps[idx], title: val };
                                                    return { ...prev, process: { ...prev.process, steps: newSteps } };
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontSize: 11 }}>Step Description</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="We inspect the appliance & share a repair quote for approval"
                                            value={step.description || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPageConfig(prev => {
                                                    const newSteps = [...prev.process.steps];
                                                    newSteps[idx] = { ...newSteps[idx], description: val };
                                                    return { ...prev, process: { ...prev.process, steps: newSteps } };
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Optional Step Image */}
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Optional Step Photo / Diagram URL</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="https://... (e.g. Co-Pilot meter inspection)"
                                            value={step.imageUrl || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPageConfig(prev => {
                                                    const newSteps = [...prev.process.steps];
                                                    newSteps[idx] = { ...newSteps[idx], imageUrl: val };
                                                    return { ...prev, process: { ...prev.process, steps: newSteps } };
                                                });
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadingStepIdx(idx);
                                                stepFileInputRef.current?.click();
                                            }}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                color: 'var(--text-secondary)',
                                                fontSize: 11,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Upload size={12} /> Upload
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const newSteps = [...(process.steps || [])];
                            newSteps.push({
                                number: newSteps.length + 1,
                                title: '',
                                description: '',
                                imageUrl: ''
                            });
                            setPageConfig(prev => ({
                                ...prev,
                                process: { ...prev.process, steps: newSteps }
                            }));
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed #6338f5',
                            backgroundColor: 'transparent',
                            color: '#8b5cf6',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-xs)',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} /> Add Next Process Step
                    </button>
                </div>
            )}

            {/* ─── TAB 4: TOP TECHNICIANS ───────────────────────────────────── */}
            {activeTab === 'technicians' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Top Technicians Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Professional technician verified image, background verification badge, and training credentials.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={technicians.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    technicians: { ...prev.technicians, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Section Header</label>
                            <input
                                type="text"
                                className="form-input"
                                value={technicians.title || 'Top technicians'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    technicians: { ...prev.technicians, title: e.target.value }
                                }))}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Technician Photo</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="https://... photo URL"
                                    value={technicians.photoUrl || ''}
                                    onChange={(e) => setPageConfig(prev => ({
                                        ...prev,
                                        technicians: { ...prev.technicians, photoUrl: e.target.value }
                                    }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => techFileInputRef.current?.click()}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: '#6338f5',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 'var(--font-size-xs)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Upload size={13} /> Upload Photo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Trust Badges / Points */}
                    <div style={{ marginBottom: 16 }}>
                        <label className="form-label">Trust Points (Checklist)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(technicians.points || []).map((pt, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <ShieldCheck size={16} color="#10b981" />
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={pt}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newPoints = [...prev.technicians.points];
                                                newPoints[idx] = val;
                                                return { ...prev, technicians: { ...prev.technicians, points: newPoints } };
                                            });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPoints = technicians.points.filter((_, i) => i !== idx);
                                            setPageConfig(prev => ({ ...prev, technicians: { ...prev.technicians, points: newPoints } }));
                                        }}
                                        style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPageConfig(prev => ({
                                    ...prev,
                                    technicians: {
                                        ...prev.technicians,
                                        points: [...(prev.technicians.points || []), '']
                                    }
                                }));
                            }}
                            style={{
                                marginTop: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={13} /> Add Trust Point
                        </button>
                    </div>
                </div>
            )}

            {/* ─── TAB 5: WE SERVICE ALL BRANDS ─────────────────────────────── */}
            {activeTab === 'brands' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Brands Serviced Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Grid of brand logos and cards serviced by Sorted under this subcategory.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={brands.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    brands: { ...prev.brands, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Section Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={brands.title || 'We service all brands'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    brands: { ...prev.brands, title: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Disclaimer Note</label>
                            <input
                                type="text"
                                className="form-input"
                                value={brands.disclaimer || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    brands: { ...prev.brands, disclaimer: e.target.value }
                                }))}
                            />
                        </div>
                    </div>

                    {/* Brands Chips */}
                    <div>
                        <label className="form-label">Brand Names (Pills)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {(brands.items || []).map((brandName, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 12px',
                                        borderRadius: 999,
                                        backgroundColor: 'var(--bg-primary, #0f172a)',
                                        border: '1px solid var(--border-primary)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600
                                    }}
                                >
                                    {brandName}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newItems = brands.items.filter((_, i) => i !== idx);
                                            setPageConfig(prev => ({ ...prev, brands: { ...prev.brands, items: newItems } }));
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Add Brand Input */}
                        <div style={{ display: 'flex', gap: 8, maxWidth: 300 }}>
                            <input
                                id="newBrandInput"
                                type="text"
                                className="form-input"
                                placeholder="Type brand name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim();
                                        if (val) {
                                            setPageConfig(prev => ({
                                                ...prev,
                                                brands: { ...prev.brands, items: [...(prev.brands.items || []), val] }
                                            }));
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const inp = document.getElementById('newBrandInput');
                                    if (inp && inp.value.trim()) {
                                        setPageConfig(prev => ({
                                            ...prev,
                                            brands: { ...prev.brands, items: [...(prev.brands.items || []), inp.value.trim()] }
                                        }));
                                        inp.value = '';
                                    }
                                }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#6338f5',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 6: COVER PROMISE ─────────────────────────────────────── */}
            {activeTab === 'coverPromise' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Sorted Cover Promise Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Guarantees such as 180-day warranty, damage protection cover, and fixed rate card.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={coverPromise.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    coverPromise: { ...prev.coverPromise, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Promise Header</label>
                            <input
                                type="text"
                                className="form-input"
                                value={coverPromise.title || 'Sorted Cover Promise'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    coverPromise: { ...prev.coverPromise, title: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Badge Text</label>
                            <input
                                type="text"
                                className="form-input"
                                value={coverPromise.badge || 'sorted cover'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    coverPromise: { ...prev.coverPromise, badge: e.target.value }
                                }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Promise Items</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {(coverPromise.points || []).map((pt, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <CheckCircle2 size={16} color="#06b6d4" />
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={typeof pt === 'string' ? pt : pt.text}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newPoints = [...prev.coverPromise.points];
                                                newPoints[idx] = { icon: 'shield', text: val };
                                                return { ...prev, coverPromise: { ...prev.coverPromise, points: newPoints } };
                                            });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPoints = coverPromise.points.filter((_, i) => i !== idx);
                                            setPageConfig(prev => ({ ...prev, coverPromise: { ...prev.coverPromise, points: newPoints } }));
                                        }}
                                        style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPageConfig(prev => ({
                                    ...prev,
                                    coverPromise: {
                                        ...prev.coverPromise,
                                        points: [...(prev.coverPromise.points || []), { icon: 'shield', text: '' }]
                                    }
                                }));
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={13} /> Add Promise Point
                        </button>
                    </div>
                </div>
            )}

            {/* ─── TAB 7: NOT INCLUDED ───────────────────────────────────────── */}
            {activeTab === 'notIncluded' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                What Is Not Included Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Clear expectations for customers with red ❌ bullet points.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={notIncluded.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    notIncluded: { ...prev.notIncluded, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Section Title</label>
                        <input
                            type="text"
                            className="form-input"
                            value={notIncluded.title || 'What is not included'}
                            onChange={(e) => setPageConfig(prev => ({
                                ...prev,
                                notIncluded: { ...prev.notIncluded, title: e.target.value }
                            }))}
                        />
                    </div>

                    <div>
                        <label className="form-label">Excluded Items (Red ❌)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {(notIncluded.items || []).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ color: '#ef4444', fontWeight: 800 }}>❌</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Repair of commercial appliances"
                                        value={item}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newItems = [...prev.notIncluded.items];
                                                newItems[idx] = val;
                                                return { ...prev, notIncluded: { ...prev.notIncluded, items: newItems } };
                                            });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newItems = notIncluded.items.filter((_, i) => i !== idx);
                                            setPageConfig(prev => ({ ...prev, notIncluded: { ...prev.notIncluded, items: newItems } }));
                                        }}
                                        style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPageConfig(prev => ({
                                    ...prev,
                                    notIncluded: {
                                        ...prev.notIncluded,
                                        items: [...(prev.notIncluded.items || []), '']
                                    }
                                }));
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={13} /> Add Excluded Item
                        </button>
                    </div>
                </div>
            )}

            {/* ─── TAB 8: FAQS ─────────────────────────────────────────────── */}
            {activeTab === 'faqs' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Frequently Asked Questions (FAQs)
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Interactive accordion with expandable questions and answers.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={faqs.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    faqs: { ...prev.faqs, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Section Title</label>
                        <input
                            type="text"
                            className="form-input"
                            value={faqs.title || 'Frequently asked questions'}
                            onChange={(e) => setPageConfig(prev => ({
                                ...prev,
                                faqs: { ...prev.faqs, title: e.target.value }
                            }))}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        {(faqs.items || []).map((faq, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: 14,
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary, #0f172a)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <strong>Question {idx + 1}</strong>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newItems = faqs.items.filter((_, i) => i !== idx);
                                            setPageConfig(prev => ({ ...prev, faqs: { ...prev.faqs, items: newItems } }));
                                        }}
                                        style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Question (e.g. Does the cost include spare parts?)"
                                        value={faq.question || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newItems = [...prev.faqs.items];
                                                newItems[idx] = { ...newItems[idx], question: val };
                                                return { ...prev, faqs: { ...prev.faqs, items: newItems } };
                                            });
                                        }}
                                        style={{ marginBottom: 6 }}
                                    />
                                    <textarea
                                        className="form-textarea"
                                        rows={2}
                                        placeholder="Answer explanation..."
                                        value={faq.answer || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newItems = [...prev.faqs.items];
                                                newItems[idx] = { ...newItems[idx], answer: val };
                                                return { ...prev, faqs: { ...prev.faqs, items: newItems } };
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setPageConfig(prev => ({
                                ...prev,
                                faqs: {
                                    ...prev.faqs,
                                    items: [...(prev.faqs.items || []), { question: '', answer: '' }]
                                }
                            }));
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed #6338f5',
                            backgroundColor: 'transparent',
                            color: '#8b5cf6',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={13} /> Add FAQ Item
                    </button>
                </div>
            )}

            {/* ─── TAB 9: REVIEWS ───────────────────────────────────────────── */}
            {activeTab === 'reviews' && (
                <div className="card" style={{ padding: 24, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Customer Reviews & Ratings Section
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Review breakdown bars, verified customer reviews cards, and star ratings.
                            </p>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                            <input
                                type="checkbox"
                                checked={reviews.enabled !== false}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    reviews: { ...prev.reviews, enabled: e.target.checked }
                                }))}
                            />
                            Section Visible
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Section Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={reviews.title || 'Customer Reviews'}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    reviews: { ...prev.reviews, title: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Overall Star Rating</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="4.83"
                                value={reviews.rating || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    reviews: { ...prev.reviews, rating: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Count</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="135K reviews"
                                value={reviews.totalCount || ''}
                                onChange={(e) => setPageConfig(prev => ({
                                    ...prev,
                                    reviews: { ...prev.reviews, totalCount: e.target.value }
                                }))}
                            />
                        </div>
                    </div>

                    {/* Customer Review Cards */}
                    <div style={{ marginBottom: 16 }}>
                        <label className="form-label">Customer Testimonials</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                            {(reviews.items || []).map((rev, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: 14,
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-primary, #0f172a)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                backgroundColor: '#10b981',
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
                                                ★ {rev.rating || 5}
                                            </span>
                                            <strong>{rev.name || `Review ${idx + 1}`}</strong>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newItems = reviews.items.filter((_, i) => i !== idx);
                                                setPageConfig(prev => ({ ...prev, reviews: { ...prev.reviews, items: newItems } }));
                                            }}
                                            style={{ padding: 4, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Customer Name (e.g. Vinay K.)"
                                            value={rev.name || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPageConfig(prev => {
                                                    const newItems = [...prev.reviews.items];
                                                    newItems[idx] = { ...newItems[idx], name: val };
                                                    return { ...prev, reviews: { ...prev.reviews, items: newItems } };
                                                });
                                            }}
                                        />
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Date & Tag (e.g. Nov 6, 2026 • For Not heating)"
                                            value={rev.tag || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPageConfig(prev => {
                                                    const newItems = [...prev.reviews.items];
                                                    newItems[idx] = { ...newItems[idx], tag: val };
                                                    return { ...prev, reviews: { ...prev.reviews, items: newItems } };
                                                });
                                            }}
                                        />
                                    </div>

                                    <textarea
                                        className="form-textarea"
                                        rows={2}
                                        placeholder="Review text..."
                                        value={rev.comment || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPageConfig(prev => {
                                                const newItems = [...prev.reviews.items];
                                                newItems[idx] = { ...newItems[idx], comment: val };
                                                return { ...prev, reviews: { ...prev.reviews, items: newItems } };
                                            });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPageConfig(prev => ({
                                    ...prev,
                                    reviews: {
                                        ...prev.reviews,
                                        items: [
                                            ...(prev.reviews.items || []),
                                            {
                                                name: '',
                                                rating: 5,
                                                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                                tag: `For ${activePage.subcategoryName}`,
                                                comment: ''
                                            }
                                        ]
                                    }
                                }));
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed #6338f5',
                                backgroundColor: 'transparent',
                                color: '#8b5cf6',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={13} /> Add Customer Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
