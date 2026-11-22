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
    CheckCircle2
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import SlidingThumbnail from '@/components/v2/SlidingThumbnail';
import { uploadClientMedia } from '@/lib/v2/clientUpload';

const DIRECTION_STYLES = [
    { id: 'multidirectional', label: '4-Way Cycle (Top → Right → Bottom → Left) [Recommended]', desc: 'Each transition enters from a different side sequentially' },
    { id: 'vertical', label: 'Vertical Alternating (Top ⇄ Bottom)', desc: 'Alternates entering from top and bottom' },
    { id: 'horizontal', label: 'Horizontal Alternating (Left ⇄ Right)', desc: 'Alternates entering from left and right' },
    { id: 'top-only', label: 'Top Only', desc: 'Every slide enters from top' },
    { id: 'bottom-only', label: 'Bottom Only', desc: 'Every slide enters from bottom' },
    { id: 'left-only', label: 'Left Only', desc: 'Every slide enters from left' },
    { id: 'right-only', label: 'Right Only', desc: 'Every slide enters from right' }
];

export default function EcomV2ThumbnailsSettings({ onBack }) {
    const [configs, setConfigs] = useState({});
    const [activeSlug, setActiveSlug] = useState('ac-repair');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
    const [isLivePreviewPaused, setIsLivePreviewPaused] = useState(false);
    const [currentPreviewDirection, setCurrentPreviewDirection] = useState('from-top');

    const fileInputRef = useRef(null);

    // Fetch existing thumbnails config
    useEffect(() => {
        fetchThumbnailsConfig();
    }, []);

    const fetchThumbnailsConfig = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/thumbnails-config');
            const json = await res.json();
            if (json.success && json.data) {
                setConfigs(json.data);
            } else {
                setErrorMessage(json.error || 'Failed to load thumbnails config');
            }
        } catch (err) {
            setErrorMessage('Network error loading thumbnails config: ' + err.message);
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
            const res = await fetch('/api/v2/thumbnails-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories: configs })
            });
            const json = await res.json();
            if (json.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
            } else {
                setErrorMessage(json.error || 'Failed to save thumbnails');
            }
        } catch (err) {
            setErrorMessage('Network error saving thumbnails: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

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

    const handleUploadImage = async (file, slideIdx) => {
        if (!file) return;
        setUploading(true);
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
            setUploading(false);
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

    // Calculate direction cycle
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
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: 1280, margin: '0 auto' }}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingSlideIdx !== null) {
                        handleUploadImage(file, uploadingSlideIdx);
                    }
                    e.target.value = '';
                }}
            />

            {/* Top Navigation Bar */}
            <div className="ecom-v2-header-container" style={{
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={onBack}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--font-size-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Website Settings
                    </button>
                    <div>
                        <h1 style={{
                            margin: 0,
                            fontSize: 'clamp(18px, 4vw, 24px)',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap'
                        }}>
                            <span>Services Thumbnails</span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(59,130,246,0.15)',
                                color: '#3b82f6'
                            }}>
                                Homepage Category Tiles
                            </span>
                        </h1>
                        <p style={{ margin: '3px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            Configure 3-image sliding thumbnails with dynamic directional slide transitions (Top → Right → Bottom → Left)
                        </p>
                    </div>
                </div>

                <div className="ecom-v2-header-actions">
                    <a
                        href="/v2"
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
                        <Eye size={15} /> Preview Live /v2
                    </a>

                    <button
                        onClick={handleSaveAll}
                        disabled={saving || loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 20px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 700,
                            border: 'none',
                            cursor: (saving || loading) ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                            opacity: (saving || loading) ? 0.7 : 1
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
                                <Check size={16} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
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
                    <CheckCircle2 size={18} /> Services thumbnails saved! Changes are live on /v2 homepage.
                </div>
            )}

            {/* Category Selector Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 10,
                marginBottom: 24,
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
                                flexShrink: 0,
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
                                                    fileInputRef.current?.click();
                                                }}
                                                disabled={uploading && uploadingSlideIdx === idx}
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
                                                {uploading && uploadingSlideIdx === idx ? (
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
    );
}
