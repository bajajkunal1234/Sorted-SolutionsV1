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
    Sliders,
    Monitor,
    Smartphone,
    MapPin,
    ChevronDown,
    Search,
    User,
    Move
} from 'lucide-react';
import { uploadClientMedia } from '@/lib/v2/clientUpload';

const LINK_SUGGESTIONS = [
    { label: 'All Services', url: '/v2/services' },
    { label: 'AC Repair & Foam Jet', url: '/v2/services/ac-repair' },
    { label: 'Washing Machine Repair', url: '/v2/services/washing-machine-repair' },
    { label: 'Refrigerator Service', url: '/v2/services/refrigerator-repair' },
    { label: 'Oven & Microwave Repair', url: '/v2/services/oven-repair' },
    { label: 'Water Purifier RO Service', url: '/v2/services/water-purifier-repair' },
    { label: 'Hob & Chimney Service', url: '/v2/services/hob-repair' },
    { label: 'AMC & Care Plans', url: '/v2/customer?tab=plans' }
];

const PROFILE_PRESETS = [
    { label: 'Top Right', x: 98, y: 4 },
    { label: 'Top Left', x: 2, y: 4 },
    { label: 'Below Search Right', x: 98, y: 48 }
];

const CTA_PRESETS = [
    { label: 'Bottom Left', x: 6, y: 88 },
    { label: 'Bottom Center', x: 50, y: 88 },
    { label: 'Bottom Right', x: 94, y: 82 },
    { label: 'Middle Left', x: 6, y: 66 }
];

function clampPercent(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function normalizeSlide(s = {}, idx = 0) {
    return {
        id: s.id || `slide-${idx + 1}-${Date.now().toString(36)}`,
        mediaType: ['image', 'gif', 'video'].includes(s.mediaType) ? s.mediaType : 'image',
        mediaUrl: String(s.mediaUrl || '').trim(),
        ctaText: String(s.ctaText ?? '').trim(),
        ctaLink: String(s.ctaLink || '/v2/services').trim(),
        profilePos: {
            x: clampPercent(s.profilePos?.x, 98),
            y: clampPercent(s.profilePos?.y, 4),
            visible: s.profilePos?.visible !== false
        },
        ctaPos: {
            x: clampPercent(s.ctaPos?.x, 6),
            y: clampPercent(s.ctaPos?.y, 88)
        },
        active: s.active !== false,
        order: typeof s.order === 'number' ? s.order : idx + 1
    };
}

export default function EcomV2HeroSettings({ onBack }) {
    const [slides, setSlides] = useState([]);
    const [autoSlideSeconds, setAutoSlideSeconds] = useState(7);
    const [enableVideoAdvance, setEnableVideoAdvance] = useState(true);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [draggingTarget, setDraggingTarget] = useState(null); // 'profile' | 'cta' | null

    const fileInputRef = useRef(null);
    const overlayBoundsRef = useRef(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/v2/hero-config');
            const json = await res.json();
            if (json.success && json.data) {
                const normalized = (json.data.slides || []).map((s, idx) => normalizeSlide(s, idx));
                setSlides(normalized);
                setAutoSlideSeconds(json.data.autoSlideSeconds || 7);
                setEnableVideoAdvance(json.data.enableVideoAdvance ?? true);
            }
        } catch (err) {
            console.error('Failed to load hero config:', err);
            setErrorMsg('Failed to load current settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!slides || slides.length === 0) {
            setErrorMsg('At least one hero slide is required.');
            return;
        }

        setSaving(true);
        setErrorMsg('');
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/v2/hero-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slides: slides.map((s, idx) => normalizeSlide(s, idx)),
                    autoSlideSeconds: Number(autoSlideSeconds) || 7,
                    enableVideoAdvance
                })
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to save');

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3500);
        } catch (err) {
            console.error('Error saving hero config:', err);
            setErrorMsg(err.message || 'Error saving changes');
        } finally {
            setSaving(false);
        }
    };

    const updateCurrentSlide = (field, value) => {
        setSlides(prev => {
            const next = [...prev];
            if (next[activeSlideIndex]) {
                next[activeSlideIndex] = { ...next[activeSlideIndex], [field]: value };
            }
            return next;
        });
    };

    const updateNestedPos = (key, patch) => {
        setSlides(prev => {
            const next = [...prev];
            if (next[activeSlideIndex]) {
                next[activeSlideIndex] = {
                    ...next[activeSlideIndex],
                    [key]: { ...(next[activeSlideIndex][key] || {}), ...patch }
                };
            }
            return next;
        });
    };

    // Drag-to-position handler on Live Preview
    useEffect(() => {
        if (!draggingTarget) return;

        const handlePointerMove = (e) => {
            const boundsEl = overlayBoundsRef.current;
            if (!boundsEl) return;
            const rect = boundsEl.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
            const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));

            if (draggingTarget === 'profile') {
                updateNestedPos('profilePos', { x, y });
            } else if (draggingTarget === 'cta') {
                updateNestedPos('ctaPos', { x, y });
            }
        };

        const handlePointerUp = () => {
            setDraggingTarget(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingTarget, activeSlideIndex]);

    const handleAddSlide = () => {
        if (slides.length >= 6) {
            alert('Maximum 6 slides recommended for hero carousel.');
            return;
        }
        const newSlide = normalizeSlide({
            id: `slide-${Date.now().toString(36)}`,
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_speed_90_mins.png',
            ctaText: '',
            ctaLink: '/v2/services',
            profilePos: { x: 98, y: 4, visible: true },
            ctaPos: { x: 6, y: 88 },
            active: true,
            order: slides.length + 1
        }, slides.length);
        setSlides(prev => [...prev, newSlide]);
        setActiveSlideIndex(slides.length);
    };

    const handleDeleteSlide = (index) => {
        if (slides.length <= 1) {
            alert('You must keep at least 1 hero slide.');
            return;
        }
        if (!confirm('Are you sure you want to delete this slide?')) return;
        setSlides(prev => prev.filter((_, i) => i !== index));
        if (activeSlideIndex >= slides.length - 1) {
            setActiveSlideIndex(Math.max(0, slides.length - 2));
        }
    };

    const handleMoveSlide = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= slides.length) return;
        setSlides(prev => {
            const next = [...prev];
            const item = next.splice(fromIndex, 1)[0];
            next.splice(toIndex, 0, item);
            return next;
        });
        setActiveSlideIndex(toIndex);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isGif = file.type === 'image/gif';
        const maxSizeBytes = isVideo ? 15 * 1024 * 1024 : 8 * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            alert(`File exceeds maximum size limit (${isVideo ? '15 MB for video' : '8 MB for image/gif'}). Please optimize before uploading.`);
            return;
        }

        setUploading(true);
        setUploadProgress(20);
        setErrorMsg('');

        try {
            setUploadProgress(40);
            const url = await uploadClientMedia(file, {
                folder: 'ecom-v2/hero',
                bucket: 'website-assets',
                preserveFormat: true
            });

            let detectedType = 'image';
            if (isVideo) detectedType = 'video';
            else if (isGif) detectedType = 'gif';

            updateCurrentSlide('mediaUrl', url);
            updateCurrentSlide('mediaType', detectedType);
            setUploadProgress(100);
        } catch (err) {
            console.error('Upload failed:', err);
            setErrorMsg(`File upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const currentSlide = normalizeSlide(slides[activeSlideIndex] || slides[0] || {}, activeSlideIndex);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                <p>Loading Hero Carousel settings...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Top Navigation & Action Bar */}
            <div className="ecom-v2-header-container" style={{
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            ← Back
                        </button>
                    )}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Sparkles size={20} color="#6338f5" />
                            <h2 style={{ fontSize: 'clamp(16px, 3.5vw, 18px)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                Ecom V2 — Hero Section Carousel CMS
                            </h2>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Upload full-bleed hero banners (GIFs, videos, or images) that slide beneath floating Logo, Location, Search, Profile &amp; CTA controls on <code>/v2</code>.
                        </p>
                    </div>
                </div>

                <div className="ecom-v2-header-actions">
                    <a
                        href="/v2"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 14px',
                            borderRadius: 8,
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        <ExternalLink size={14} /> View Storefront
                    </a>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 18px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: saveSuccess ? '#10b981' : '#6338f5',
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" /> Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={14} /> Saved Successfully!
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 20
                }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Global Timing Bar */}
            <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sliders size={18} color="#6338f5" />
                    <div>
                        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Global Auto-Slide Behavior</strong>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            How the hero banners cycle for customers on mobile and desktop
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={enableVideoAdvance}
                            onChange={(e) => setEnableVideoAdvance(e.target.checked)}
                            style={{ accentColor: '#6338f5', width: 16, height: 16 }}
                        />
                        <span>Auto-slide immediately when Video ends (<code>onEnded</code>)</span>
                    </label>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Image/GIF slide duration:</span>
                        <select
                            value={autoSlideSeconds}
                            onChange={(e) => setAutoSlideSeconds(Number(e.target.value))}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 12.5,
                                fontWeight: 600
                            }}
                        >
                            <option value={5}>5 seconds</option>
                            <option value={7}>7 seconds (Recommended)</option>
                            <option value={9}>9 seconds</option>
                            <option value={12}>12 seconds</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Slide Tabs Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                overflowX: 'auto',
                paddingBottom: 4
            }}>
                {slides.map((slide, idx) => (
                    <button
                        key={slide.id || idx}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: activeSlideIndex === idx ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                            backgroundColor: activeSlideIndex === idx ? 'rgba(99,56,245,0.08)' : 'var(--bg-elevated)',
                            color: activeSlideIndex === idx ? '#6338f5' : 'var(--text-primary)',
                            fontWeight: activeSlideIndex === idx ? 700 : 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s'
                        }}
                    >
                        <span>Slide {idx + 1}</span>
                        <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(99,56,245,0.12)',
                            color: '#6338f5',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {slide.mediaType || 'image'}
                        </span>
                        {slide.active === false && (
                            <span style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, background: '#fee2e2', color: '#991b1b' }}>
                                OFF
                            </span>
                        )}
                    </button>
                ))}

                {slides.length < 6 && (
                    <button
                        type="button"
                        onClick={handleAddSlide}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: '1px dashed var(--border-primary)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} /> Add Slide
                    </button>
                )}
            </div>

            {/* Slide Editor + Live Preview Grid */}
            <div className="ecom-v2-two-col-grid">
                {/* Left Column: Form Controls */}
                <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 14,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    {/* Slide Header Toolbar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        borderBottom: '1px solid var(--border-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                Editing Slide {activeSlideIndex + 1} of {slides.length}
                            </strong>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={currentSlide.active !== false}
                                    onChange={(e) => updateCurrentSlide('active', e.target.checked)}
                                    style={{ accentColor: '#10b981' }}
                                />
                                <span style={{ color: currentSlide.active !== false ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                    {currentSlide.active !== false ? 'Active' : 'Disabled'}
                                </span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                type="button"
                                title="Move Earlier"
                                onClick={() => handleMoveSlide(activeSlideIndex, activeSlideIndex - 1)}
                                disabled={activeSlideIndex === 0}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    cursor: activeSlideIndex === 0 ? 'not-allowed' : 'pointer',
                                    opacity: activeSlideIndex === 0 ? 0.4 : 1
                                }}
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                type="button"
                                title="Move Later"
                                onClick={() => handleMoveSlide(activeSlideIndex, activeSlideIndex + 1)}
                                disabled={activeSlideIndex === slides.length - 1}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    cursor: activeSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: activeSlideIndex === slides.length - 1 ? 0.4 : 1
                                }}
                            >
                                <ArrowDown size={14} />
                            </button>
                            <button
                                type="button"
                                title="Delete Slide"
                                onClick={() => handleDeleteSlide(activeSlideIndex)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #fecaca',
                                    backgroundColor: '#fff1f2',
                                    color: '#e11d48',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* 1. Hero Slide Media (GIF / Video / Image) */}
                    <div style={{
                        border: '1px solid var(--border-primary)',
                        borderRadius: 12,
                        padding: 14,
                        background: 'var(--bg-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Film size={16} color="#6338f5" />
                                <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Hero Slide Media (GIF / Video / Image)</strong>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['image', 'gif', 'video'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => updateCurrentSlide('mediaType', type)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            border: currentSlide.mediaType === type ? '1.5px solid #6338f5' : '1px solid var(--border-primary)',
                                            backgroundColor: currentSlide.mediaType === type ? 'rgba(99,56,245,0.1)' : 'transparent',
                                            color: currentSlide.mediaType === type ? '#6338f5' : 'var(--text-secondary)',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full-Bleed Upload Guidance Box */}
                        <div style={{
                            padding: '11px 13px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(99, 56, 245, 0.05)',
                            border: '1px solid rgba(99, 56, 245, 0.2)',
                            marginBottom: 12,
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            lineHeight: 1.5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#6338f5', marginBottom: 4 }}>
                                <Info size={14} />
                                <span>Full-Bleed Hero Banner Guidelines</span>
                            </div>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-secondary)', fontSize: 11.5 }}>
                                <li><strong>Recommended Canvas:</strong> 1200 × 960 px (5:4) or 1080 × 900 px full artwork with baked-in text/offers.</li>
                                <li><strong>Top Safe Zone:</strong> Keep the top ~32% clean/solid color so the floating Logo, Location &amp; Search Bar stay crisp.</li>
                                <li><strong>Max Sizes:</strong> PNG/WebP/GIF up to 8 MB • MP4/WebM video up to 15 MB (muted).</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '9px 16px',
                                    borderRadius: 8,
                                    border: '1px solid #6338f5',
                                    backgroundColor: '#6338f5',
                                    color: '#ffffff',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    cursor: uploading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" /> Uploading ({uploadProgress}%)...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={14} /> Upload GIF, Video or Image
                                    </>
                                )}
                            </button>

                            <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                or enter URL below
                            </span>
                        </div>

                        <input
                            type="text"
                            value={currentSlide.mediaUrl || ''}
                            onChange={(e) => updateCurrentSlide('mediaUrl', e.target.value)}
                            placeholder="https://.../hero-slide.mp4 or /images/banners/banner.png"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>

                    {/* 2. Optional CTA Button Text + CTA Destination Link */}
                    <div className="ecom-v2-form-grid-cta">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    CTA Button Text (Optional)
                                </label>
                                {currentSlide.ctaText && (
                                    <button
                                        type="button"
                                        onClick={() => updateCurrentSlide('ctaText', '')}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#6338f5',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={currentSlide.ctaText || ''}
                                onChange={(e) => updateCurrentSlide('ctaText', e.target.value)}
                                placeholder="Leave blank to hide CTA button"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 13
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                CTA Destination Link
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="text"
                                    value={currentSlide.ctaLink || ''}
                                    onChange={(e) => updateCurrentSlide('ctaLink', e.target.value)}
                                    placeholder="/v2/services/ac-repair"
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: 12.5,
                                        fontFamily: 'monospace'
                                    }}
                                />
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) updateCurrentSlide('ctaLink', e.target.value);
                                    }}
                                    value=""
                                    style={{
                                        padding: '8px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-secondary)',
                                        fontSize: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="" disabled>Presets</option>
                                    {LINK_SUGGESTIONS.map(l => (
                                        <option key={l.url} value={l.url}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 3. Per-Slide Floating Placement: Profile Button & CTA Button */}
                    <div style={{
                        border: '1px solid var(--border-primary)',
                        borderRadius: 12,
                        padding: 14,
                        background: 'var(--bg-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Move size={15} color="#6338f5" />
                                <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                    Button Placement on Slide {activeSlideIndex + 1}
                                </strong>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                Use sliders, presets, or drag directly on Live Preview →
                            </span>
                        </div>

                        {/* Profile Button Placement */}
                        <div style={{
                            padding: 12,
                            borderRadius: 10,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={14} color="#6338f5" />
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Profile Button (Mobile Hero)
                                    </span>
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={currentSlide.profilePos.visible !== false}
                                        onChange={(e) => updateNestedPos('profilePos', { visible: e.target.checked })}
                                        style={{ accentColor: '#6338f5' }}
                                    />
                                    <span>Visible on this slide</span>
                                </label>
                            </div>

                            {currentSlide.profilePos.visible !== false && (
                                <>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                        {PROFILE_PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                onClick={() => updateNestedPos('profilePos', { x: p.x, y: p.y })}
                                                style={{
                                                    padding: '4px 9px',
                                                    borderRadius: 6,
                                                    border: '1px solid var(--border-primary)',
                                                    background: (currentSlide.profilePos.x === p.x && currentSlide.profilePos.y === p.y)
                                                        ? 'rgba(99,56,245,0.12)' : 'var(--bg-primary)',
                                                    color: (currentSlide.profilePos.x === p.x && currentSlide.profilePos.y === p.y)
                                                        ? '#6338f5' : 'var(--text-secondary)',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ecom-v2-form-grid-2col">
                                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                            Horizontal X: <strong>{currentSlide.profilePos.x}%</strong>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={currentSlide.profilePos.x}
                                                onChange={(e) => updateNestedPos('profilePos', { x: Number(e.target.value) })}
                                                style={{ width: '100%', accentColor: '#6338f5', marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                            Vertical Y: <strong>{currentSlide.profilePos.y}%</strong>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={currentSlide.profilePos.y}
                                                onChange={(e) => updateNestedPos('profilePos', { y: Number(e.target.value) })}
                                                style={{ width: '100%', accentColor: '#6338f5', marginTop: 4 }}
                                            />
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* CTA Button Placement */}
                        <div style={{
                            padding: 12,
                            borderRadius: 10,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            opacity: currentSlide.ctaText ? 1 : 0.65
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ArrowRight size={14} color="#6338f5" />
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        CTA Button Placement
                                    </span>
                                </div>
                                {!currentSlide.ctaText && (
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        Add CTA Button Text above to display
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {CTA_PRESETS.map(p => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateNestedPos('ctaPos', { x: p.x, y: p.y })}
                                        style={{
                                            padding: '4px 9px',
                                            borderRadius: 6,
                                            border: '1px solid var(--border-primary)',
                                            background: (currentSlide.ctaPos.x === p.x && currentSlide.ctaPos.y === p.y)
                                                ? 'rgba(99,56,245,0.12)' : 'var(--bg-primary)',
                                            color: (currentSlide.ctaPos.x === p.x && currentSlide.ctaPos.y === p.y)
                                                ? '#6338f5' : 'var(--text-secondary)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="ecom-v2-form-grid-2col">
                                <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                    Horizontal X: <strong>{currentSlide.ctaPos.x}%</strong>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={currentSlide.ctaPos.x}
                                        onChange={(e) => updateNestedPos('ctaPos', { x: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#6338f5', marginTop: 4 }}
                                    />
                                </label>
                                <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                    Vertical Y: <strong>{currentSlide.ctaPos.y}%</strong>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={currentSlide.ctaPos.y}
                                        onChange={(e) => updateNestedPos('ctaPos', { y: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#6338f5', marginTop: 4 }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Interactive Live Mockup Preview */}
                <div className="ecom-v2-preview-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            <Eye size={16} color="#6338f5" /> Live Storefront Preview
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('mobile')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: previewDevice === 'mobile' ? '1px solid #6338f5' : '1px solid var(--border-primary)',
                                    backgroundColor: previewDevice === 'mobile' ? 'rgba(99,56,245,0.1)' : 'transparent',
                                    color: previewDevice === 'mobile' ? '#6338f5' : 'var(--text-secondary)',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Smartphone size={13} /> Mobile
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('desktop')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: previewDevice === 'desktop' ? '1px solid #6338f5' : '1px solid var(--border-primary)',
                                    backgroundColor: previewDevice === 'desktop' ? 'rgba(99,56,245,0.1)' : 'transparent',
                                    color: previewDevice === 'desktop' ? '#6338f5' : 'var(--text-secondary)',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Monitor size={13} /> Desktop
                            </button>
                        </div>
                    </div>

                    {/* Preview Frame matching /v2 */}
                    <div style={{
                        maxWidth: previewDevice === 'mobile' ? 380 : '100%',
                        margin: previewDevice === 'mobile' ? '0 auto' : '0',
                        width: '100%',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: '#1d1042',
                        position: 'relative',
                        height: previewDevice === 'mobile' ? 325 : 260,
                        userSelect: 'none'
                    }}>
                        {/* Full-Bleed Slide Media */}
                        {currentSlide.mediaUrl ? (
                            currentSlide.mediaType === 'video' ? (
                                <video
                                    key={currentSlide.mediaUrl}
                                    src={currentSlide.mediaUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                            ) : (
                                <img
                                    key={currentSlide.mediaUrl}
                                    src={currentSlide.mediaUrl}
                                    alt="Hero slide preview"
                                    draggable={false}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                            )
                        ) : (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 12
                            }}>
                                <ImageIcon size={32} style={{ opacity: 0.6, marginBottom: 6 }} />
                                <span>No Slide Media Uploaded</span>
                            </div>
                        )}

                        {/* Subtle Top Scrim & Fixed Floating Header in Mobile Mode */}
                        {previewDevice === 'mobile' && (
                            <>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 140,
                                    background: 'linear-gradient(180deg, rgba(15,23,42,0.44) 0%, rgba(15,23,42,0.16) 58%, rgba(15,23,42,0) 100%)',
                                    pointerEvents: 'none',
                                    zIndex: 2
                                }} />

                                <div style={{
                                    position: 'relative',
                                    zIndex: 10,
                                    padding: '12px 14px 0',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{ paddingRight: 52, marginBottom: 10 }}>
                                        <img
                                            src="/images/logos/logo-dark.png"
                                            alt="Sorted"
                                            draggable={false}
                                            style={{
                                                height: 20,
                                                width: 'auto',
                                                objectFit: 'contain',
                                                display: 'block',
                                                marginBottom: 5,
                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
                                            <MapPin size={15} />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>
                                                    <span>Select Mumbai Locality</span>
                                                    <ChevronDown size={13} />
                                                </div>
                                                <div style={{ fontSize: 11, opacity: 0.88 }}>
                                                    Tap to choose flat, society &amp; pincode
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: '#fff',
                                        borderRadius: 11,
                                        padding: '0 12px',
                                        height: 40,
                                        boxShadow: '0 6px 18px rgba(13,7,36,0.22)',
                                        color: '#64748b',
                                        fontSize: 12.5
                                    }}>
                                        <Search size={15} />
                                        <span>Search for a service</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Draggable Per-Slide Overlay Bounds */}
                        <div
                            ref={overlayBoundsRef}
                            style={{
                                position: 'absolute',
                                inset: previewDevice === 'mobile' ? '12px 14px 16px' : '16px 20px 20px',
                                pointerEvents: 'none',
                                zIndex: 20
                            }}
                        >
                            {/* Draggable Profile Button (Mobile Preview) */}
                            {previewDevice === 'mobile' && currentSlide.profilePos.visible !== false && (
                                <div
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        setDraggingTarget('profile');
                                    }}
                                    title="Drag to move Profile Button"
                                    style={{
                                        position: 'absolute',
                                        left: `${currentSlide.profilePos.x}%`,
                                        top: `${currentSlide.profilePos.y}%`,
                                        transform: `translate(-${currentSlide.profilePos.x}%, -${currentSlide.profilePos.y}%)`,
                                        pointerEvents: 'auto',
                                        cursor: draggingTarget === 'profile' ? 'grabbing' : 'grab',
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        color: '#1e293b',
                                        border: draggingTarget === 'profile' ? '2px solid #6338f5' : '1.5px dashed #6338f5',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        touchAction: 'none'
                                    }}
                                >
                                    <User size={18} />
                                </div>
                            )}

                            {/* Draggable CTA Button (When ctaText is provided) */}
                            {Boolean(currentSlide.ctaText) && (
                                <div
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        setDraggingTarget('cta');
                                    }}
                                    title="Drag to move CTA Button"
                                    style={{
                                        position: 'absolute',
                                        left: `${currentSlide.ctaPos.x}%`,
                                        top: `${currentSlide.ctaPos.y}%`,
                                        transform: `translate(-${currentSlide.ctaPos.x}%, -${currentSlide.ctaPos.y}%)`,
                                        pointerEvents: 'auto',
                                        cursor: draggingTarget === 'cta' ? 'grabbing' : 'grab',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        padding: '7px 14px',
                                        borderRadius: 999,
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        backdropFilter: 'blur(8px)',
                                        border: draggingTarget === 'cta' ? '2px solid #a78bfa' : '1.5px dashed rgba(255,255,255,0.7)',
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                                        whiteSpace: 'nowrap',
                                        touchAction: 'none'
                                    }}
                                >
                                    <span>{currentSlide.ctaText}</span>
                                    <ArrowRight size={13} />
                                </div>
                            )}
                        </div>

                        {/* Pagination Dashes */}
                        {slides.length > 1 && (
                            <div style={{
                                position: 'absolute',
                                bottom: 10,
                                right: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                zIndex: 18
                            }}>
                                {slides.map((_, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            display: 'inline-block',
                                            height: 3.5,
                                            width: idx === activeSlideIndex ? 22 : 7,
                                            borderRadius: 2,
                                            backgroundColor: idx === activeSlideIndex ? '#ffffff' : 'rgba(255,255,255,0.48)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.35)'
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{
                        padding: '11px 14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45
                    }}>
                        {previewDevice === 'mobile' ? (
                            <span>
                                💡 <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Drag the dashed <strong style={{ color: '#6338f5' }}>Profile</strong> or <strong style={{ color: '#6338f5' }}>CTA</strong> button directly on the preview above to adjust its placement for Slide {activeSlideIndex + 1}.
                            </span>
                        ) : (
                            <span>
                                🖥️ <strong style={{ color: 'var(--text-primary)' }}>Desktop view:</strong> Logo, Location, Search &amp; Account appear in the sticky top header bar; you can drag the <strong style={{ color: '#6338f5' }}>CTA button</strong> on the slide banner.
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
