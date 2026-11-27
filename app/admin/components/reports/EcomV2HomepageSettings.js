'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Upload,
    Image as ImageIcon,
    Trash2,
    Plus,
    Check,
    Eye,
    RefreshCw,
    AlertCircle,
    Info,
    ArrowRight,
    ArrowLeft,
    Play,
    Pause,
    ArrowUp,
    ArrowDown,
    Layers,
    CheckCircle2,
    Sun,
    Moon,
    Layout,
    Sliders
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import SlidingThumbnail from '@/components/v2/SlidingThumbnail';
import { uploadClientMedia } from '@/lib/v2/clientUpload';
import EcomV2HomepageSectionsBuilder from './EcomV2HomepageSectionsBuilder';

const DIRECTION_STYLES = [
    { id: 'multidirectional', label: '4-Way Cycle (Top → Right → Bottom → Left) [Recommended]', desc: 'Each transition enters from a different side sequentially' },
    { id: 'vertical', label: 'Vertical Alternating (Top ⇄ Bottom)', desc: 'Alternates entering from top and bottom' },
    { id: 'horizontal', label: 'Horizontal Alternating (Left ⇄ Right)', desc: 'Alternates entering from left and right' },
    { id: 'top-only', label: 'Top Only', desc: 'Every slide enters from top' },
    { id: 'bottom-only', label: 'Bottom Only', desc: 'Every slide enters from bottom' },
    { id: 'left-only', label: 'Left Only', desc: 'Every slide enters from left' },
    { id: 'right-only', label: 'Right Only', desc: 'Every slide enters from right' }
];

export default function EcomV2HomepageSettings({ onBack }) {
    // Main Section Tab: 'sections' | 'logos' | 'thumbnails'
    const [activeSection, setActiveSection] = useState('sections');

    // Homepage Sections Builder State
    const [sections, setSections] = useState([]);

    // Logos State
    const [logos, setLogos] = useState({
        dayModeLogo: '/images/logos/logo-day.png',
        darkModeLogo: '/images/logos/logo-dark.png',
        altText: 'Sorted Solutions'
    });
    const [uploadingLogoType, setUploadingLogoType] = useState(null); // 'day' | 'dark'

    // Thumbnails State
    const [configs, setConfigs] = useState({});
    const [activeSlug, setActiveSlug] = useState('ac-repair');
    const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
    const [isLivePreviewPaused, setIsLivePreviewPaused] = useState(false);
    const [currentPreviewDirection, setCurrentPreviewDirection] = useState('from-top');

    // General State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const logoFileInputRef = useRef(null);
    const slideFileInputRef = useRef(null);

    // Fetch existing homepage config
    useEffect(() => {
        fetchHomepageConfig();
    }, []);

    const fetchHomepageConfig = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/homepage-config');
            const json = await res.json();
            if (json.success && json.data) {
                if (json.data.logos) {
                    setLogos({
                        dayModeLogo: json.data.logos.dayModeLogo || '/images/logos/logo-day.png',
                        darkModeLogo: json.data.logos.darkModeLogo || json.data.logos.dayModeLogo || '/images/logos/logo-dark.png',
                        altText: json.data.logos.altText || 'Sorted Solutions'
                    });
                }
                if (json.data.categories) {
                    setConfigs(json.data.categories);
                }
                if (Array.isArray(json.data.sections)) {
                    setSections(json.data.sections);
                }
            } else {
                setErrorMessage(json.error || 'Failed to load homepage config');
            }
        } catch (err) {
            setErrorMessage('Network error loading homepage config: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const activeCat = V2_CATEGORIES.find(c => c.slug === activeSlug) || V2_CATEGORIES[0];
    const currentCatConfig = configs[activeSlug] || {
        categorySlug: activeSlug,
        categoryName: activeCat?.name || activeSlug,
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 's-1', url: activeCat?.icon || '/images/services/ac_3d.png', title: 'Default 3D Icon' }
        ]
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);
        try {
            const res = await fetch('/api/v2/homepage-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logos,
                    categories: configs,
                    sections
                })
            });
            const json = await res.json();
            if (json.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
            } else {
                setErrorMessage(json.error || 'Failed to save homepage settings');
            }
        } catch (err) {
            setErrorMessage('Network error saving homepage settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Logo Upload Handler ──
    const handleUploadLogo = async (file, type) => {
        if (!file) return;
        setUploadingLogoType(type);
        setErrorMessage('');

        // Immediate local preview for zero-latency feedback
        try {
            const previewUrl = URL.createObjectURL(file);
            if (type === 'day') {
                setLogos(prev => ({ ...prev, dayModeLogo: previewUrl }));
            } else {
                setLogos(prev => ({ ...prev, darkModeLogo: previewUrl }));
            }
        } catch (e) {
            // ignore
        }

        try {
            const url = await uploadClientMedia(file, {
                folder: 'ecom-v2/logos',
                bucket: 'website-assets',
                preserveFormat: true
            });
            if (type === 'day') {
                setLogos(prev => ({
                    ...prev,
                    dayModeLogo: url,
                    darkModeLogo: prev.darkModeLogo === '/logo.jpg' ? url : prev.darkModeLogo
                }));
            } else {
                setLogos(prev => ({ ...prev, darkModeLogo: url }));
            }
        } catch (err) {
            setErrorMessage('Network error during upload: ' + err.message);
        } finally {
            setUploadingLogoType(null);
        }
    };

    // ── Thumbnails Handlers ──
    const updateCurrentCategoryConfig = (updater) => {
        setConfigs(prev => {
            const current = prev[activeSlug] || {
                categorySlug: activeSlug,
                categoryName: activeCat?.name || activeSlug,
                interval: 3500,
                directionStyle: 'multidirectional',
                slides: []
            };
            const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
            return {
                ...prev,
                [activeSlug]: updated
            };
        });
    };

    const handleUploadSlideImage = async (file, slideIdx) => {
        if (!file) return;
        setUploadingSlideIdx(slideIdx);
        setErrorMessage('');
        try {
            const url = await uploadClientMedia(file, {
                folder: 'ecom-v2/thumbnails',
                bucket: 'website-assets',
                preserveFormat: true
            });
            updateCurrentCategoryConfig(current => {
                const slides = Array.isArray(current.slides) ? [...current.slides] : [];
                while (slides.length <= slideIdx) {
                    slides.push({ id: `slide-${slides.length + 1}`, url: '', title: `Slide #${slides.length + 1}` });
                }
                slides[slideIdx] = {
                    ...slides[slideIdx],
                    url,
                    title: slides[slideIdx]?.title || file.name.replace(/\.[^/.]+$/, '')
                };
                return { ...current, slides };
            });
        } catch (err) {
            setErrorMessage('Network error during upload: ' + err.message);
        } finally {
            setUploadingSlideIdx(null);
        }
    };

    const handleAddSlide = () => {
        updateCurrentCategoryConfig(current => {
            const slides = Array.isArray(current.slides) ? [...current.slides] : [];
            slides.push({
                id: `slide-${Date.now().toString(36)}`,
                url: '',
                title: `Slide #${slides.length + 1}`
            });
            return { ...current, slides };
        });
    };

    const handleRemoveSlide = (idx) => {
        updateCurrentCategoryConfig(current => {
            const slides = (current.slides || []).filter((_, i) => i !== idx);
            return { ...current, slides };
        });
    };

    const handleSlideFieldChange = (idx, field, value) => {
        updateCurrentCategoryConfig(current => {
            const slides = Array.isArray(current.slides) ? [...current.slides] : [];
            if (slides[idx]) {
                slides[idx] = { ...slides[idx], [field]: value };
            }
            return { ...current, slides };
        });
    };

    const getDirectionCycle = (style) => {
        switch (style) {
            case 'vertical':
                return ['from-top', 'from-bottom'];
            case 'horizontal':
                return ['from-right', 'from-left'];
            case 'top-only':
                return ['from-top'];
            case 'bottom-only':
                return ['from-bottom'];
            case 'left-only':
                return ['from-left'];
            case 'right-only':
                return ['from-right'];
            case 'multidirectional':
            default:
                return ['from-top', 'from-right', 'from-bottom', 'from-left'];
        }
    };

    const slidesToPreview = (currentCatConfig.slides || []).filter(s => s && s.url);

    return (
        <div style={{ padding: '0 0 20px', maxWidth: 1280, margin: '0 auto' }}>
            {/* Hidden Logo File Input (Supports PNG with transparency, SVG, WebP, JPG) */}
            <input
                ref={logoFileInputRef}
                type="file"
                accept=".png,image/png,.svg,image/svg+xml,.jpg,.jpeg,image/jpeg,.webp,image/webp,image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingLogoType) {
                        handleUploadLogo(file, uploadingLogoType);
                    }
                    e.target.value = '';
                }}
            />

            {/* Hidden Slide File Input */}
            <input
                ref={slideFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingSlideIdx !== null) {
                        handleUploadSlideImage(file, uploadingSlideIdx);
                    }
                    e.target.value = '';
                }}
            />

            {/* Compact Single-Row Action Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: '1px solid var(--border-primary)',
                flexWrap: 'wrap'
            }}>
                <button
                    type="button"
                    onClick={onBack}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 11px',
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a
                        href="/v2"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 11px',
                            borderRadius: 8,
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Eye size={14} /> Preview /v2
                    </a>

                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={saving || loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 8,
                            backgroundColor: saveSuccess ? '#10b981' : '#3b82f6',
                            color: '#ffffff',
                            fontSize: 12.5,
                            fontWeight: 700,
                            border: 'none',
                            cursor: (saving || loading) ? 'not-allowed' : 'pointer',
                            opacity: (saving || loading) ? 0.7 : 1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={14} className="spin" /> Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={14} /> Saved!
                            </>
                        ) : (
                            <>
                                <Check size={14} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error & Success Alerts */}
            {errorMessage && (
                <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: 12.5,
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <AlertCircle size={16} /> {errorMessage}
                </div>
            )}

            {saveSuccess && (
                <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: 12.5,
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <CheckCircle2 size={16} /> Homepage settings saved! Changes are live on /v2.
                </div>
            )}

            {/* Full-Width Mobile-Fit Segmented Tabs (Zero Horizontal Scrollbar) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 6,
                marginBottom: 14,
                padding: 4,
                borderRadius: 10,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveSection('sections')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 6px',
                        border: 'none',
                        borderRadius: 7,
                        backgroundColor: activeSection === 'sections' ? '#3b82f6' : 'transparent',
                        color: activeSection === 'sections' ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: activeSection === 'sections' ? 700 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <Layers size={14} style={{ flexShrink: 0 }} />
                    <span>Sections ({sections.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('logos')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 6px',
                        border: 'none',
                        borderRadius: 7,
                        backgroundColor: activeSection === 'logos' ? '#3b82f6' : 'transparent',
                        color: activeSection === 'logos' ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: activeSection === 'logos' ? 700 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <Sun size={14} style={{ flexShrink: 0 }} />
                    <span>Brand Logos</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('thumbnails')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 6px',
                        border: 'none',
                        borderRadius: 7,
                        backgroundColor: activeSection === 'thumbnails' ? '#3b82f6' : 'transparent',
                        color: activeSection === 'thumbnails' ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: activeSection === 'thumbnails' ? 700 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <ImageIcon size={14} style={{ flexShrink: 0 }} />
                    <span>Thumbnails</span>
                </button>
            </div>

            {activeSection === 'sections' && (
                <EcomV2HomepageSectionsBuilder
                    sections={sections}
                    onChange={setSections}
                />
            )}

            {/* ══════════════════════════════════════════════════════════════════════════════ */}
            {/* SECTION 1: WEBSITE BRAND LOGOS (DAY MODE & DARK MODE)                        */}
            {/* ══════════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'logos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Intro Card */}
                    <div className="card" style={{
                        padding: 20,
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                    }}>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Official Brand Logo Settings
                            </h2>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Upload separate logos for light surfaces (desktop header, invoices) and dark surfaces (mobile violet hero header).
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Brand Alt Text:</span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Sorted Solutions"
                                value={logos.altText}
                                onChange={(e) => setLogos(prev => ({ ...prev, altText: e.target.value }))}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-xs)',
                                    width: 180
                                }}
                            />
                        </div>
                    </div>

                    {/* Logo Cards Grid: Day Mode vs Dark Mode */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                        gap: 20
                    }}>
                        {/* ── CARD 1: DAY MODE LOGO (LIGHT BACKGROUND) ── */}
                        <div className="card" style={{
                            padding: 22,
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: '#fef3c7',
                                        color: '#d97706',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Sun size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            Day Mode Logo
                                        </h3>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            For light/white backgrounds & desktop header
                                        </span>
                                    </div>
                                </div>

                                <span style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569'
                                }}>
                                    Light Theme
                                </span>
                            </div>

                            {/* Visual Preview Box (White Background) */}
                            <div
                                onClick={() => {
                                    setUploadingLogoType('day');
                                    logoFileInputRef.current?.click();
                                }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleUploadLogo(file, 'day');
                                }}
                                title="Click or drag & drop a PNG/SVG/JPG logo here"
                                style={{
                                    width: '100%',
                                    height: 160,
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#ffffff',
                                    border: '2px dashed #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    padding: 16,
                                    cursor: 'pointer',
                                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04)',
                                    transition: 'border-color 0.15s ease'
                                }}
                            >
                                {logos.dayModeLogo ? (
                                    <img
                                        src={logos.dayModeLogo}
                                        alt={logos.altText || "Day Mode Logo"}
                                        style={{
                                            maxWidth: '85%',
                                            maxHeight: '85%',
                                            objectFit: 'contain',
                                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))'
                                        }}
                                        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
                                    />
                                ) : (
                                    <ImageIcon size={36} color="#94a3b8" />
                                )}

                                <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    fontSize: 10,
                                    color: '#64748b',
                                    backgroundColor: 'rgba(255,255,255,0.92)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 600
                                }}>
                                    Preview on White Surface (Click / Drag to Upload PNG)
                                </div>
                            </div>

                            {/* Upload & URL Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="https://... or /logo.jpg"
                                        value={logos.dayModeLogo}
                                        onChange={(e) => setLogos(prev => ({ ...prev, dayModeLogo: e.target.value }))}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 'var(--font-size-xs)'
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUploadingLogoType('day');
                                            logoFileInputRef.current?.click();
                                        }}
                                        disabled={uploadingLogoType === 'day'}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: '#3b82f6',
                                            color: '#ffffff',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {uploadingLogoType === 'day' ? (
                                             <RefreshCw size={13} className="spin" />
                                        ) : (
                                            <Upload size={13} />
                                        )}
                                        Upload PNG / Logo
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>
                                        Supports PNG (transparency preserved) • SVG • WebP • JPG
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setLogos(prev => ({ ...prev, dayModeLogo: '/logo.jpg' }))}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#6338f5',
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        Reset to Default
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── CARD 2: DARK MODE LOGO (DARK BACKGROUND) ── */}
                        <div className="card" style={{
                            padding: 22,
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: '#311b6b',
                                        color: '#c4b5fd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Moon size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            Dark Mode Logo
                                        </h3>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            For dark surfaces & mobile hero banner
                                        </span>
                                    </div>
                                </div>

                                <span style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    backgroundColor: '#311b6b',
                                    color: '#ffffff'
                                }}>
                                    Dark Theme
                                </span>
                            </div>

                            {/* Visual Preview Box (Dark Violet Background) */}
                            <div
                                onClick={() => {
                                    setUploadingLogoType('dark');
                                    logoFileInputRef.current?.click();
                                }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleUploadLogo(file, 'dark');
                                }}
                                title="Click or drag & drop a PNG/SVG/JPG logo here"
                                style={{
                                    width: '100%',
                                    height: 160,
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#1d1042',
                                    border: '2px dashed rgba(167,139,250,0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    padding: 16,
                                    cursor: 'pointer',
                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4)',
                                    transition: 'border-color 0.15s ease'
                                }}
                            >
                                {logos.darkModeLogo ? (
                                    <img
                                        src={logos.darkModeLogo}
                                        alt={logos.altText || "Dark Mode Logo"}
                                        style={{
                                            maxWidth: '85%',
                                            maxHeight: '85%',
                                            objectFit: 'contain',
                                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                                        }}
                                        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
                                    />
                                ) : (
                                    <ImageIcon size={36} color="#6d28d9" />
                                )}

                                <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    fontSize: 10,
                                    color: '#c4b5fd',
                                    backgroundColor: 'rgba(0,0,0,0.65)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    border: '1px solid rgba(255,255,255,0.18)',
                                    fontWeight: 600
                                }}>
                                    Preview on Dark Surface (Click / Drag to Upload PNG)
                                </div>
                            </div>

                            {/* Upload & URL Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="https://... or /logo.jpg"
                                        value={logos.darkModeLogo}
                                        onChange={(e) => setLogos(prev => ({ ...prev, darkModeLogo: e.target.value }))}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 'var(--font-size-xs)'
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUploadingLogoType('dark');
                                            logoFileInputRef.current?.click();
                                        }}
                                        disabled={uploadingLogoType === 'dark'}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: '#6338f5',
                                            color: '#ffffff',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {uploadingLogoType === 'dark' ? (
                                            <RefreshCw size={13} className="spin" />
                                        ) : (
                                            <Upload size={13} />
                                        )}
                                        Upload PNG / Logo
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                                        Supports PNG (transparency preserved) • SVG • WebP • JPG
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setLogos(prev => ({ ...prev, darkModeLogo: prev.dayModeLogo }))}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#6338f5',
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        Copy Day Mode Logo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── LIVE STOREFRONT BRANDING SIMULATION ── */}
                    <div className="card" style={{
                        padding: 24,
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={18} color="#6338f5" />
                                <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                                    Live Storefront UI Simulation
                                </strong>
                            </div>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.12)', padding: '3px 10px', borderRadius: 20 }}>
                                ✓ Clean Brand Logo (No Pill, No Extra Text)
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: 16
                        }}>
                            {/* Desktop Day Mode Header Mock */}
                            <div style={{
                                padding: 16,
                                backgroundColor: '#ffffff',
                                borderRadius: 12,
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                                    Desktop Header (Day Mode)
                                </span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '10px 16px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <img
                                            src={logos.dayModeLogo || '/logo.jpg'}
                                            alt={logos.altText || "Logo"}
                                            style={{
                                                height: 38,
                                                maxHeight: 44,
                                                width: 'auto',
                                                maxWidth: 160,
                                                objectFit: 'contain',
                                                display: 'block'
                                            }}
                                            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
                                        />
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 12px',
                                        borderRadius: 20,
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        fontSize: 11,
                                        color: '#64748b'
                                    }}>
                                        <span>📍 Mumbai — Select Locality</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Dark Hero Banner Mock */}
                            <div style={{
                                padding: 16,
                                backgroundColor: '#1d1042',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                                    Mobile Hero Banner (Dark Mode — Just Clean Logo)
                                </span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '8px 4px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffffff', fontSize: 12, fontWeight: 600 }}>
                                        <span>📍 Select Mumbai Locality</span>
                                    </div>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={logos.darkModeLogo || logos.dayModeLogo || '/logo.jpg'}
                                            alt={logos.altText || "Logo"}
                                            style={{
                                                height: 38,
                                                maxHeight: 44,
                                                width: 'auto',
                                                maxWidth: 140,
                                                objectFit: 'contain',
                                                display: 'block'
                                            }}
                                            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════════ */}
            {/* SECTION 2: SERVICES THUMBNAILS (CATEGORY 3-IMAGE SLIDING CAROUSEL)            */}
            {/* ══════════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'thumbnails' && (
                <div>
                    {/* Category Selector Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 10,
                        marginBottom: 20,
                        scrollbarWidth: 'none'
                    }}>
                        {V2_CATEGORIES.map(cat => {
                            const isSelected = cat.slug === activeSlug;
                            const catCfg = configs[cat.slug] || {};
                            const slideCount = Array.isArray(catCfg.slides) && catCfg.slides.length > 0
                                ? catCfg.slides.filter(s => s && s.url).length
                                : 1;

                            return (
                                <button
                                    key={cat.slug}
                                    type="button"
                                    onClick={() => setActiveSlug(cat.slug)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 16px',
                                        borderRadius: 'var(--radius-lg)',
                                        border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-primary)',
                                        backgroundColor: isSelected ? 'rgba(59,130,246,0.1)' : 'var(--bg-elevated)',
                                        color: isSelected ? '#3b82f6' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease',
                                        fontWeight: isSelected ? 700 : 500
                                    }}
                                >
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        backgroundColor: cat.accent,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <img src={cat.icon} alt={cat.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                                    </div>
                                    <span>{cat.mobileLabel || cat.name}</span>
                                    <span style={{
                                        fontSize: 11,
                                        padding: '2px 6px',
                                        borderRadius: 999,
                                        backgroundColor: isSelected ? '#3b82f6' : 'rgba(148,163,184,0.2)',
                                        color: isSelected ? '#ffffff' : 'var(--text-tertiary)',
                                        fontWeight: 600
                                    }}>
                                        {slideCount} slides
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Content Layout: Left Editor + Right Interactive Live Preview */}
                    <div className="ecom-v2-two-col-grid">
                        {/* ── Left Column: Slide Configuration ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Category Title & Badge */}
                            <div className="card" style={{
                                padding: 20,
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {activeCat?.name} Thumbnail Settings
                                        </h2>
                                        <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            Category Slug: <code>{activeSlug}</code> • Standard 3D Icon: <code>{activeCat?.icon}</code>
                                        </p>
                                    </div>

                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        backgroundColor: activeCat?.accent || '#eef2ff',
                                        color: '#0f172a'
                                    }}>
                                        {activeCat?.mobileLabel}
                                    </span>
                                </div>

                                {/* Motion Style & Interval Controls */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: 16,
                                    paddingTop: 14,
                                    borderTop: '1px solid var(--border-primary)'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                            Slide Transition Direction
                                        </label>
                                        <select
                                            className="form-select"
                                            value={currentCatConfig.directionStyle || 'multidirectional'}
                                            onChange={(e) => updateCurrentCategoryConfig({ directionStyle: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        >
                                            {DIRECTION_STYLES.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                Slide Duration
                                            </label>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: '#3b82f6', fontWeight: 700 }}>
                                                {((currentCatConfig.interval || 3500) / 1000).toFixed(1)}s
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2000"
                                            max="8000"
                                            step="500"
                                            value={currentCatConfig.interval || 3500}
                                            onChange={(e) => updateCurrentCategoryConfig({ interval: Number(e.target.value) })}
                                            style={{ width: '100%', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            Interval before transitioning to next image
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Slides List (Slots 1, 2, 3) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Thumbnail Image Slides ({currentCatConfig.slides?.length || 0})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddSlide}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'rgba(59,130,246,0.12)',
                                            color: '#3b82f6',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} /> Add Image Slide
                                    </button>
                                </div>

                                {(currentCatConfig.slides || []).map((slide, idx) => (
                                    <div
                                        key={slide.id || idx}
                                        className="card"
                                        style={{
                                            padding: 16,
                                            backgroundColor: 'var(--bg-elevated)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 12
                                        }}
                                    >
                                        {/* Slide Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    backgroundColor: '#3b82f6',
                                                    color: '#ffffff',
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                                    {idx === 0 ? 'Primary Default Thumbnail' : `Slide #${idx + 1}`}
                                                </strong>
                                            </div>

                                            {(currentCatConfig.slides?.length > 1) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSlide(idx)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: 4,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        fontSize: 11
                                                    }}
                                                    title="Remove slide"
                                                >
                                                    <Trash2 size={14} /> Remove
                                                </button>
                                            )}
                                        </div>

                                        {/* Slide Body: Image Preview + Inputs */}
                                        <div className="ecom-v2-tile-slide-row">
                                            {/* Thumbnail Preview Box */}
                                            <div style={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: activeCat?.accent || '#f1f5f9',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                position: 'relative'
                                            }}>
                                                {slide.url ? (
                                                    <img
                                                        src={slide.url}
                                                        alt={slide.title || 'Slide'}
                                                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                                        onError={(e) => { e.currentTarget.src = activeCat?.icon; }}
                                                    />
                                                ) : (
                                                    <ImageIcon size={28} color="var(--text-tertiary)" />
                                                )}
                                            </div>

                                            {/* Upload and URL Inputs */}
                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="https://... or /images/..."
                                                        value={slide.url || ''}
                                                        onChange={(e) => handleSlideFieldChange(idx, 'url', e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            padding: '8px 12px',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid var(--border-primary)',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: 'var(--font-size-xs)'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUploadingSlideIdx(idx);
                                                            slideFileInputRef.current?.click();
                                                        }}
                                                        disabled={uploadingSlideIdx === idx}
                                                        style={{
                                                            padding: '8px 14px',
                                                            borderRadius: 'var(--radius-md)',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-primary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: 'var(--font-size-xs)',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {uploadingSlideIdx === idx ? (
                                                            <RefreshCw size={13} className="spin" />
                                                        ) : (
                                                            <Upload size={13} />
                                                        )}
                                                        Upload
                                                    </button>
                                                </div>

                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Slide caption or description (e.g. 90-Min Arrival)"
                                                    value={slide.title || ''}
                                                    onChange={(e) => handleSlideFieldChange(idx, 'title', e.target.value)}
                                                    style={{
                                                        padding: '7px 12px',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-primary)',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 'var(--font-size-xs)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Right Column: Interactive Live Sandbox Preview ── */}
                        <div className="ecom-v2-preview-sticky">
                            <div className="card" style={{
                                padding: 24,
                                backgroundColor: '#ffffff',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Sparkles size={18} color="#6338f5" />
                                        <strong style={{ fontSize: 15, color: '#0f172a' }}>Live Storefront Card</strong>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsLivePreviewPaused(prev => !prev)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#f8fafc',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: isLivePreviewPaused ? '#ef4444' : '#10b981',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        {isLivePreviewPaused ? <Play size={11} /> : <Pause size={11} />}
                                        {isLivePreviewPaused ? 'Paused' : 'Auto Sliding'}
                                    </button>
                                </div>

                                {/* Exact /v2 Homepage Category Tile Simulation */}
                                <div style={{
                                    padding: '30px 20px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: 16,
                                    border: '1px dashed #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20
                                }}>
                                    <div style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 20,
                                        backgroundColor: activeCat?.accent || '#eef2ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                        marginBottom: 10
                                    }}>
                                        <SlidingThumbnail
                                            slides={slidesToPreview}
                                            fallbackUrl={activeCat?.icon}
                                            alt={activeCat?.name}
                                            interval={currentCatConfig.interval || 3500}
                                            directionCycle={getDirectionCycle(currentCatConfig.directionStyle)}
                                            isPaused={isLivePreviewPaused}
                                            width="100%"
                                            height="100%"
                                            objectFit="contain"
                                            onSlideChange={({ direction }) => {
                                                setCurrentPreviewDirection(direction);
                                            }}
                                        />
                                    </div>

                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        textAlign: 'center'
                                    }}>
                                        {activeCat?.mobileLabel || activeCat?.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                                        3 services
                                    </span>
                                </div>

                                {/* Motion Status & Direction Indicator */}
                                <div style={{
                                    padding: '12px 14px',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: 10,
                                    marginBottom: 16
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Active Direction:</span>
                                        <span style={{
                                            fontWeight: 700,
                                            color: '#3b82f6',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em'
                                        }}>
                                            {currentPreviewDirection.replace('from-', 'Slide from ')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 6 }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Total Slides:</span>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                            {slidesToPreview.length} configured
                                        </span>
                                    </div>
                                </div>

                                {/* Instructions note */}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>
                                    <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>
                                        When you add 3 images, the tile on the live homepage will cycle through them automatically. Each transition slides in from a different side (Top, Right, Bottom, Left).
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
