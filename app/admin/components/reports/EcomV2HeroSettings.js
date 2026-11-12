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
    Smartphone
} from 'lucide-react';

const COLOR_PRESETS = [
    {
        name: 'Royal Violet (Default)',
        bgColor: '#311b6b',
        bgGradient: 'linear-gradient(135deg, #1d1042 0%, #47288f 100%)'
    },
    {
        name: 'Festive Pink (UC Style)',
        bgColor: '#e91e63',
        bgGradient: 'linear-gradient(135deg, #880e4f 0%, #e91e63 100%)'
    },
    {
        name: 'Warm Bronze (UC Style)',
        bgColor: '#3e2723',
        bgGradient: 'linear-gradient(135deg, #2b170c 0%, #5d3a1a 100%)'
    },
    {
        name: 'Ocean Blue (UC Style)',
        bgColor: '#0288d1',
        bgGradient: 'linear-gradient(135deg, #01416e 0%, #0288d1 100%)'
    },
    {
        name: 'Emerald Pro',
        bgColor: '#059669',
        bgGradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)'
    },
    {
        name: 'Midnight Slate',
        bgColor: '#1e293b',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)'
    }
];

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

    const fileInputRef = useRef(null);

    // Fetch existing settings
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
                setSlides(json.data.slides || []);
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
                    slides,
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

    const handleAddSlide = () => {
        if (slides.length >= 6) {
            alert('Maximum 6 slides recommended for hero carousel.');
            return;
        }
        const newSlide = {
            id: `slide-${Date.now().toString(36)}`,
            kicker: 'Mumbai Doorstep Care',
            headline: 'Special Discount on Appliance Care',
            subline: 'Starts at ₹499 • 90-min arrival',
            ctaText: 'Book now',
            ctaLink: '/v2/services',
            bgColor: '#311b6b',
            bgGradient: 'linear-gradient(135deg, #1d1042 0%, #47288f 100%)',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_speed_90_mins.png',
            badge: 'SPECIAL',
            active: true,
            order: slides.length + 1
        };
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

    // File upload handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check
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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'website-assets');
            formData.append('folder', 'ecom-v2/hero');

            setUploadProgress(50);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            setUploadProgress(85);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Upload failed');

            // Detect media type
            let detectedType = 'image';
            if (isVideo) detectedType = 'video';
            else if (isGif) detectedType = 'gif';

            updateCurrentSlide('mediaUrl', json.url);
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

    const currentSlide = slides[activeSlideIndex] || slides[0] || {};

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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={20} color="#6338f5" />
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                Ecom V2 — Hero Section Carousel CMS
                            </h2>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Configure seasonal 3-slide auto-sliding hero banners (GIFs, images, or looping videos) for the <code>/v2</code> storefront.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                        <span style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: slide.bgColor || '#6338f5',
                            display: 'inline-block',
                            border: '1px solid rgba(255,255,255,0.4)'
                        }} />
                        <span>Slide {idx + 1}: {slide.kicker || 'Untitled'}</span>
                        {!slide.active && (
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
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: 20 }}>
                {/* Left Column: Form Controls */}
                <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 14,
                    padding: 20
                }}>
                    {/* Slide Header Toolbar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        marginBottom: 16,
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

                    {/* Copywriting Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                Kicker / Category Pill (e.g. "AC Foam-Jet Clean", "Salon at home")
                            </label>
                            <input
                                type="text"
                                value={currentSlide.kicker || ''}
                                onChange={(e) => updateCurrentSlide('kicker', e.target.value)}
                                placeholder="AC Foam-Jet Care"
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
                                Main Headline (Bold offer copy)
                            </label>
                            <input
                                type="text"
                                value={currentSlide.headline || ''}
                                onChange={(e) => updateCurrentSlide('headline', e.target.value)}
                                placeholder="Beat the Mumbai Heat with 25% Off"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                    Subline / Pricing Highlight
                                </label>
                                <input
                                    type="text"
                                    value={currentSlide.subline || ''}
                                    onChange={(e) => updateCurrentSlide('subline', e.target.value)}
                                    placeholder="Starts at ₹599 • 90-min arrival"
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
                                    Corner Badge (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={currentSlide.badge || ''}
                                    onChange={(e) => updateCurrentSlide('badge', e.target.value)}
                                    placeholder="25% OFF"
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
                        </div>

                        {/* CTA Destination */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                    CTA Button Text
                                </label>
                                <input
                                    type="text"
                                    value={currentSlide.ctaText || ''}
                                    onChange={(e) => updateCurrentSlide('ctaText', e.target.value)}
                                    placeholder="Book now"
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
                                        defaultValue=""
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

                        {/* Theme Preset Selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                Theme Color / Gradient Presets (Matches Urban Company styling)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                                {COLOR_PRESETS.map(preset => {
                                    const isSelected = currentSlide.bgColor === preset.bgColor;
                                    return (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => {
                                                updateCurrentSlide('bgColor', preset.bgColor);
                                                updateCurrentSlide('bgGradient', preset.bgGradient);
                                            }}
                                            style={{
                                                padding: '8px',
                                                borderRadius: 8,
                                                border: isSelected ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                                                background: preset.bgGradient,
                                                color: '#ffffff',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <span>{preset.name.split(' (')[0]}</span>
                                            {isSelected && <Check size={12} color="#fff" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Media Upload & Specifications Section */}
                        <div style={{
                            border: '1px solid var(--border-primary)',
                            borderRadius: 12,
                            padding: 14,
                            background: 'var(--bg-primary)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
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

                            {/* UPLOAD SPECS / GUIDANCE BOX (MANDATORY REQUIREMENT) */}
                            <div style={{
                                padding: '12px 14px',
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
                                    <span>Upload Guidelines & Required Dimensions</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>📐 Dimensions & Aspect Ratio:</span>
                                        <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-secondary)', fontSize: 11.5 }}>
                                            <li><strong>Cutout Model (Recommended):</strong> 800 × 600 px (4:3) or 600 × 600 px (1:1 square)</li>
                                            <li><strong>Full Banner Visual:</strong> 1200 × 600 px (2:1 wide)</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>📦 File Formats & Max Limits:</span>
                                        <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-secondary)', fontSize: 11.5 }}>
                                            <li><strong>PNG / WebP:</strong> Max 5 MB (Transparent cutout looks best)</li>
                                            <li><strong>Looping GIF:</strong> Max 8 MB (24–30 FPS, continuous loop)</li>
                                            <li><strong>Video (MP4 / WebM):</strong> Max 15 MB (5–12s duration, H.264, muted)</li>
                                        </ul>
                                    </div>
                                </div>
                                <p style={{ fontSize: 11, color: '#6338f5', margin: '8px 0 0 0', fontWeight: 500 }}>
                                    💡 <em>Pro Tip:</em> As seen in the Urban Company app, placing a transparent cutout image/GIF/video of an appliance or expert technician on the right side provides the cleanest luxury aesthetic.
                                </p>
                            </div>

                            {/* Direct File Picker */}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
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

                            {/* URL Input */}
                            <input
                                type="text"
                                value={currentSlide.mediaUrl || ''}
                                onChange={(e) => updateCurrentSlide('mediaUrl', e.target.value)}
                                placeholder="https://.../video.mp4 or /images/banners/banner.png"
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
                    </div>
                </div>

                {/* Right Column: Live Mockup Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

                    {/* Preview Screen Card */}
                    <div style={{
                        maxWidth: previewDevice === 'mobile' ? 380 : '100%',
                        margin: previewDevice === 'mobile' ? '0 auto' : '0',
                        width: '100%',
                        borderRadius: 18,
                        overflow: 'hidden',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: currentSlide.bgColor || '#311b6b',
                        background: currentSlide.bgGradient || currentSlide.bgColor || '#311b6b',
                        position: 'relative',
                        minHeight: 220,
                        padding: previewDevice === 'mobile' ? '18px 16px' : '26px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'background 0.3s ease'
                    }}>
                        {/* Slide Content Layout */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            {/* Left Text Column */}
                            <div style={{ flex: 1, minWidth: 0, zIndex: 2 }}>
                                {currentSlide.kicker && (
                                    <div style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'rgba(255,255,255,0.85)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        marginBottom: 4
                                    }}>
                                        {currentSlide.kicker}
                                    </div>
                                )}

                                <h3 style={{
                                    fontSize: previewDevice === 'mobile' ? 16 : 20,
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    lineHeight: 1.25,
                                    margin: '0 0 6px 0',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }}>
                                    {currentSlide.headline || 'Your Headline Here'}
                                </h3>

                                {currentSlide.subline && (
                                    <p style={{
                                        fontSize: previewDevice === 'mobile' ? 12 : 13.5,
                                        color: 'rgba(255,255,255,0.9)',
                                        margin: '0 0 14px 0',
                                        lineHeight: 1.3
                                    }}>
                                        {currentSlide.subline}
                                    </p>
                                )}

                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    padding: '6px 14px',
                                    borderRadius: 999,
                                    background: 'rgba(255,255,255,0.22)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.35)',
                                    cursor: 'pointer'
                                }}>
                                    <span>{currentSlide.ctaText || 'Book now'}</span>
                                    <ArrowRight size={13} />
                                </div>
                            </div>

                            {/* Right Media Column */}
                            <div style={{
                                width: previewDevice === 'mobile' ? 140 : 190,
                                height: previewDevice === 'mobile' ? 140 : 170,
                                position: 'relative',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {currentSlide.mediaUrl ? (
                                    currentSlide.mediaType === 'video' ? (
                                        <video
                                            src={currentSlide.mediaUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                borderRadius: 8
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={currentSlide.mediaUrl}
                                            alt={currentSlide.headline || 'Hero media'}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain',
                                                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
                                            }}
                                        />
                                    )
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 12,
                                        border: '2px dashed rgba(255,255,255,0.35)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: 11
                                    }}>
                                        <ImageIcon size={28} style={{ opacity: 0.6, marginBottom: 4 }} />
                                        <span>No Media</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination Indicator (Urban Company 3-dash style) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 10,
                            zIndex: 3
                        }}>
                            {slides.map((_, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        display: 'inline-block',
                                        height: 4,
                                        width: idx === activeSlideIndex ? 22 : 8,
                                        borderRadius: 2,
                                        backgroundColor: idx === activeSlideIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                        transition: 'all 0.25s ease'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        fontSize: 12,
                        color: 'var(--text-secondary)'
                    }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Hero Slide Indicator Guide:</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 0 0' }}>
                            <span style={{ display: 'inline-block', height: 4, width: 20, borderRadius: 2, background: '#6338f5' }} />
                            <span>Active expanded pill</span>
                            <span style={{ display: 'inline-block', height: 4, width: 8, borderRadius: 2, background: '#cbd5e1', marginLeft: 8 }} />
                            <span>Inactive dash</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
