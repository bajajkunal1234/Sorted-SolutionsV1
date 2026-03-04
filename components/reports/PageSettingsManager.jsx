'use client'

import { useState, useEffect, useRef } from 'react';
import { exportPageSettingsToExcel, importPageSettingsFromExcel, applyImportPatch } from '@/lib/pageSettingsExcel';
import {
    Save,
    Plus,
    Trash2,
    AlertCircle,
    HelpCircle,
    MapPin,
    Tag,
    Image as ImageIcon,
    ChevronRight,
    Loader2,
    Layout,
    Palette,
    Eye,
    EyeOff,
    ExternalLink,
    Check,
    Rows,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

const DEFAULT_HERO = {
    title: '',
    subtitle: '',
    bg_type: 'gradient',
    bg_color_from: '#6366f1',
    bg_color_to: '#4f46e5',
    bg_image_url: '',
    overlay_opacity: 0.85
};

// â”€â”€ Hero Background Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HeroPreview({ hero }) {
    const getBg = () => {
        if (hero.bg_type === 'image' && hero.bg_image_url) {
            return {
                backgroundImage: `url(${hero.bg_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        }
        if (hero.bg_type === 'solid') {
            return { backgroundColor: hero.bg_color_from };
        }
        return {
            background: `linear-gradient(135deg, ${hero.bg_color_from} 0%, ${hero.bg_color_to} 100%)`
        };
    };

    const overlayStyle = {
        position: 'absolute', inset: 0,
        backgroundColor: `rgba(0,0,0,${hero.overlay_opacity ?? 0})`,
        zIndex: 1
    };

    return (
        <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            height: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--border-primary)',
            ...getBg()
        }}>
            {(hero.bg_type === 'image' && hero.bg_image_url) && <div style={overlayStyle} />}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '16px', pointerEvents: 'none' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.4)', marginBottom: '6px' }}>
                    {hero.title || <span style={{ opacity: 0.5 }}>Hero Title</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    {hero.subtitle || <span style={{ opacity: 0.5 }}>Hero Subtitle</span>}
                </div>
            </div>
        </div>
    );
}

// â”€â”€ Hero Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HeroTab({ settings, updateSection }) {
    const hero = settings.hero_settings || {};
    const update = (key, val) => updateSection('hero_settings', key, val);

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
            {/* Live Preview */}
            <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={16} /> Live Preview
                </label>
                <HeroPreview hero={hero} />
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', textAlign: 'center' }}>
                    Preview updates as you type â€” actual page may differ slightly due to full CSS
                </p>
            </div>

            {/* Text Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Hero Title</label>
                    <input
                        type="text"
                        value={hero.title || ''}
                        onChange={(e) => update('title', e.target.value)}
                        className="form-control"
                        placeholder="e.g. AC Repair Solutions In Mumbai"
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Leave blank to use the auto-generated title
                    </p>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Hero Subtitle</label>
                    <input
                        type="text"
                        value={hero.subtitle || ''}
                        onChange={(e) => update('subtitle', e.target.value)}
                        className="form-control"
                        placeholder="e.g. Expert repair & 90-day warranty"
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Leave blank to use the auto-generated subtitle
                    </p>
                </div>
            </div>

            {/* Background Type */}
            <div>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Background Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                        { id: 'gradient', label: 'ðŸŽ¨ Gradient' },
                        { id: 'solid', label: 'ðŸŸ¦ Solid Color' },
                        { id: 'image', label: 'ðŸ–¼ Image' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => update('bg_type', opt.id)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: `2px solid ${hero.bg_type === opt.id ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: hero.bg_type === opt.id ? 'var(--color-primary)10' : 'var(--bg-secondary)',
                                color: hero.bg_type === opt.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: hero.bg_type === opt.id ? 700 : 500,
                                fontSize: '13px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gradient / Solid controls */}
            {(hero.bg_type === 'gradient' || hero.bg_type === 'solid') && (
                <div style={{ display: 'grid', gridTemplateColumns: hero.bg_type === 'gradient' ? '1fr 1fr' : '1fr', gap: 'var(--spacing-lg)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                            {hero.bg_type === 'gradient' ? 'Gradient Start Color' : 'Background Color'}
                        </label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={hero.bg_color_from || '#6366f1'}
                                onChange={(e) => update('bg_color_from', e.target.value)}
                                style={{ width: '56px', height: '44px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: '2px' }}
                            />
                            <input
                                type="text"
                                value={hero.bg_color_from || '#6366f1'}
                                onChange={(e) => update('bg_color_from', e.target.value)}
                                className="form-control"
                                placeholder="#6366f1"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                    {hero.bg_type === 'gradient' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Gradient End Color</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={hero.bg_color_to || '#4f46e5'}
                                    onChange={(e) => update('bg_color_to', e.target.value)}
                                    style={{ width: '56px', height: '44px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: '2px' }}
                                />
                                <input
                                    type="text"
                                    value={hero.bg_color_to || '#4f46e5'}
                                    onChange={(e) => update('bg_color_to', e.target.value)}
                                    className="form-control"
                                    placeholder="#4f46e5"
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Image controls */}
            {hero.bg_type === 'image' && (
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Background Image URL</label>
                        <input
                            type="url"
                            value={hero.bg_image_url || ''}
                            onChange={(e) => update('bg_image_url', e.target.value)}
                            className="form-control"
                            placeholder="https://example.com/hero-bg.jpg"
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Use a high-resolution image (â‰¥1920Ã—600px) for best results
                        </p>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                            Image Overlay Darkness â€” {Math.round((hero.overlay_opacity ?? 0) * 100)}%
                        </label>
                        <input
                            type="range"
                            min="0" max="0.95" step="0.05"
                            value={hero.overlay_opacity ?? 0}
                            onChange={(e) => update('overlay_opacity', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            <span>No overlay (full image)</span>
                            <span>Dark overlay (text readable)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick color presets */}
            <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Quick Gradient Presets</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Indigo', from: '#6366f1', to: '#4f46e5' },
                        { label: 'Teal', from: '#0ea5e9', to: '#0891b2' },
                        { label: 'Emerald', from: '#10b981', to: '#059669' },
                        { label: 'Violet', from: '#8b5cf6', to: '#7c3aed' },
                        { label: 'Rose', from: '#f43f5e', to: '#e11d48' },
                        { label: 'Amber', from: '#f59e0b', to: '#d97706' },
                        { label: 'Dark Navy', from: '#1e3a5f', to: '#111827' },
                        { label: 'Slate', from: '#475569', to: '#1e293b' }
                    ].map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                update('bg_type', 'gradient');
                                update('bg_color_from', preset.from);
                                update('bg_color_to', preset.to);
                            }}
                            title={`${preset.from} â†’ ${preset.to}`}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: 'var(--radius-md)',
                                border: '3px solid white',
                                outline: `2px solid ${hero.bg_color_from === preset.from && hero.bg_color_to === preset.to ? 'var(--color-primary)' : 'transparent'}`,
                                background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        />
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                    Click a preset to apply that gradient â€” then fine-tune the colors above
                </p>
            </div>
        </div>
    );
}

// â”€â”€// ── Subcategories Tab Content ───────────────────────────────────────────────────────────────────────
function SubcategoriesTab({ settings, updateSection, pageId, bookingSettings }) {
    const subcats = settings.subcategories_settings || { items: [] };
    const selectedItems = subcats.items || [];

    // ── Derive the category slug from pageId (e.g. cat-ac-repair → ac-repair) ──
    const catSlug = pageId?.startsWith('cat-') ? pageId.replace('cat-', '') : null;

    // ── Build all subcategories grouped by category — admin picks the relevant ones ──
    const groupedSubcats = (() => {
        if (!bookingSettings?.categories) return [];
        return bookingSettings.categories
            .filter(cat => cat.subcategories?.length > 0)
            .map(cat => ({
                categoryName: cat.name,
                subcategories: cat.subcategories.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    slug: sub.slug || sub.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                }))
            }));
    })();

    // flat list for helper functions
    const allSubcats = groupedSubcats.flatMap(g => g.subcategories);

    const isSelected = (slug) => selectedItems.some(i => i.slug === slug);

    const toggleSubcat = (sub) => {
        const existing = selectedItems.findIndex(i => i.slug === sub.slug);
        let newItems;
        if (existing >= 0) {
            newItems = selectedItems.filter((_, idx) => idx !== existing);
        } else {
            // Add with existing image if any was saved before
            newItems = [...selectedItems, { slug: sub.slug, title: sub.name, image: '' }];
        }
        updateSection('subcategories_settings', 'items', newItems);
    };

    const updateImage = (slug, imageUrl) => {
        const newItems = selectedItems.map(i => i.slug === slug ? { ...i, image: imageUrl } : i);
        updateSection('subcategories_settings', 'items', newItems);
    };

    const [uploading, setUploading] = useState({});

    const uploadImage = async (slug, file) => {
        if (!file) return;
        setUploading(prev => ({ ...prev, [slug]: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) updateImage(slug, data.url);
            else if (data.success && data.data?.url) updateImage(slug, data.data.url);
        } catch (e) {
            console.error('Upload failed', e);
        } finally {
            setUploading(prev => ({ ...prev, [slug]: false }));
        }
    };

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
            {/* Section Title/Subtitle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                    <input
                        type="text"
                        value={subcats.title || ''}
                        onChange={(e) => updateSection('subcategories_settings', 'title', e.target.value)}
                        className="form-control"
                        placeholder="e.g. AC Repair Services"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                    <input
                        type="text"
                        value={subcats.subtitle || ''}
                        onChange={(e) => updateSection('subcategories_settings', 'subtitle', e.target.value)}
                        className="form-control"
                        placeholder="e.g. Choose your specific appliance type"
                    />
                </div>
            </div>

            {/* Subcategory Picker */}
            <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px' }}>
                    Select Subcategories to Show
                    <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                        ({selectedItems.length} selected)
                    </span>
                </label>

                {groupedSubcats.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)', color: 'var(--text-tertiary)' }}>
                        No subcategories found in booking settings. Add subcategories in the Quick Booking settings first.
                    </div>
                )}

                <div style={{ display: 'grid', gap: '20px' }}>
                    {groupedSubcats.map(group => (
                        <div key={group.categoryName}>
                            {/* Category Group Header */}
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '8px', paddingLeft: '4px' }}>
                                {group.categoryName}
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {group.subcategories.map(sub => {
                                    const selected = isSelected(sub.slug);
                                    const savedItem = selectedItems.find(i => i.slug === sub.slug);
                                    return (
                                        <div key={sub.slug}
                                            style={{
                                                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                borderRadius: 'var(--radius-lg)',
                                                backgroundColor: selected ? 'rgba(99,102,241,0.05)' : 'var(--bg-secondary)',
                                                overflow: 'hidden',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {/* Row 1: Toggle */}
                                            <div
                                                onClick={() => toggleSubcat(sub)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-tertiary)'}`,
                                                    backgroundColor: selected ? 'var(--color-primary)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selected && <Check size={13} color="white" strokeWidth={3} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{sub.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: '2px' }}>/{sub.slug}</div>
                                                </div>
                                                {savedItem?.image && (
                                                    <img src={savedItem.image} alt={sub.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-primary)' }} />
                                                )}
                                            </div>

                                            {/* Row 2: Image upload (only when selected) */}
                                            {selected && (
                                                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Card Image (optional)</label>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Image URL or upload below"
                                                            value={savedItem?.image || ''}
                                                            onChange={e => updateImage(sub.slug, e.target.value)}
                                                            className="form-control"
                                                            style={{ flex: 1, fontSize: '12px' }}
                                                        />
                                                        <label style={{
                                                            padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                                                            backgroundColor: uploading[sub.slug] ? 'var(--bg-secondary)' : 'var(--color-primary)',
                                                            color: uploading[sub.slug] ? 'var(--text-tertiary)' : 'white',
                                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', flexShrink: 0,
                                                            border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                                        }}>
                                                            {uploading[sub.slug] ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                                            {uploading[sub.slug] ? 'Uploading…' : 'Upload'}
                                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                                onChange={e => uploadImage(sub.slug, e.target.files[0])}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedItems.length === 0 && allSubcats.length > 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px', textAlign: 'center' }}>
                        Select subcategories above — this section will be <strong>hidden</strong> until at least one is selected.
                    </p>
                )}
            </div>
        </div>
    );
}

// â”€â”€ Section Visibility Toggle Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionVisibilityBanner({ sectionKey, visible, onToggle }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: visible ? '#10b98112' : '#ef444412',
            border: `1.5px solid ${visible ? '#10b981' : '#ef4444'}`,
            marginBottom: '20px',
            gap: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {visible
                    ? <Eye size={18} style={{ color: '#10b981' }} />
                    : <EyeOff size={18} style={{ color: '#ef4444' }} />
                }
                <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: visible ? '#10b981' : '#ef4444' }}>
                        {visible ? 'Visible on website' : 'Hidden on website'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {visible
                            ? 'This section is currently shown on the live page'
                            : 'This section is hidden from the live page â€” toggle on to show it'
                        }
                    </div>
                </div>
            </div>
            <button
                onClick={() => onToggle(sectionKey)}
                style={{
                    position: 'relative',
                    width: '52px',
                    height: '28px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: visible ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                }}
            >
                <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: visible ? '28px' : '4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    transition: 'left 0.2s ease'
                }} />
            </button>
        </div>
    );
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getPageUrl = (pageId, storedUrl = null) => {
    if (!pageId) return '/';
    // Use stored URL from DB if available (most reliable)
    if (storedUrl) return storedUrl;

    const KNOWN_LOCS = [
        'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
        'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
        'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
    ];
    if (pageId.startsWith('cat-')) return `/services/${pageId.replace('cat-', '')}`;
    if (pageId.startsWith('sub-')) {
        // sub-{cat}-{subcat}: split on second hyphen group — try known appliance slugs
        const KNOWN_CATS = [
            'ac-repair', 'washing-machine-repair', 'refrigerator-repair',
            'oven-repair', 'hob-repair', 'water-purifier-repair',
            'dishwasher-repair', 'microwave-repair', 'dryer-repair'
        ];
        const rest = pageId.replace('sub-', '');
        const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
        if (cat) return `/services/${cat}/${rest.replace(cat + '-', '')}`;
        // Fallback: split at first occurrence of second segment
        const parts = rest.split('-');
        if (parts.length >= 2) {
            const mid = Math.floor(parts.length / 2);
            return `/services/${parts.slice(0, mid).join('-')}/${parts.slice(mid).join('-')}`;
        }
        return `/services/${rest}`;
    }
    if (pageId.startsWith('loc-')) return `/location/${pageId.replace('loc-', '')}`;
    if (pageId.startsWith('sloc-')) {
        const rest = pageId.replace('sloc-', '');
        const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
        if (loc) return `/location/${loc}/${rest.replace(loc + '-', '')}`;
        return `/location/${rest}`;
    }
    return `/${pageId}`;
};

const formatLocationTitle = (id) => {
    const formatWord = (str) => str.split('-').map(w => {
        if (!w) return '';
        if (w.toLowerCase() === 'ac') return 'AC';
        if (w.toLowerCase() === 'tv') return 'TV';
        if (w.toLowerCase() === 'ro') return 'RO';
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');

    let service = '';
    let location = '';
    if (id.startsWith('loc-')) {
        const parts = id.replace('loc-', '').match(/([^-]+)-(.+)/);
        if (parts) {
            location = parts[1];
            service = parts[2];
            return `${formatWord(service)} in ${formatWord(location)}`;
        }
    } else if (id.startsWith('sloc-')) {
        const parts = id.replace('sloc-', '').match(/([^-]+)-(.+)/);
        if (parts) {
            location = parts[1];
            service = parts[2];
            return `${formatWord(service)} in ${formatWord(location)}`;
        }
    }

    // Fallbacks for cat, subcat, or general IDs
    const cleanId = id.replace(/^(cat-|subcat-|loc-|sloc-)/, '');
    return formatWord(cleanId);
};

// â”€â”€ Main PageSettingsManager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PageSettingsManager({ pageId, pageLabel, pageUrl, onRename }) {
    const [activeTab, setActiveTab] = useState('hero');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const [globalFaqs, setGlobalFaqs] = useState([]);
    const [globalBrands, setGlobalBrands] = useState([]);
    const [globalActivePages, setGlobalActivePages] = useState([]);
    const [bookingSettings, setBookingSettings] = useState(null); // for issues picker
    const [issueSearch, setIssueSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [sectionVisibility, setSectionVisibility] = useState({
        hero: true, issues: true, subcategories: true, booking: true,
        problems: true, how_it_works: true, why_us: true,
        brands: true, localities: true, services: true, faqs: true, other_locations: true
    });

    // Ref that always mirrors the latest settings — prevents stale closure reads in handleSave
    const settingsRef = useRef(null);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    const sectionVisibilityRef = useRef(null);
    useEffect(() => { sectionVisibilityRef.current = sectionVisibility; }, [sectionVisibility]);
    const globalActivePagesRef = useRef([]);
    useEffect(() => { globalActivePagesRef.current = globalActivePages; }, [globalActivePages]);

    // Search states
    const [brandSearch, setBrandSearch] = useState('');
    const [faqSearch, setFaqSearch] = useState('');
    const [fetchError, setFetchError] = useState(null);
    const [uploadingIssue, setUploadingIssue] = useState({});

    // Unified fetch effect
    useEffect(() => {
        if (pageId) {
            fetchSettings();
            fetchGlobalData();
        }
    }, [pageId]);

    const processFetchedData = (data) => {
        if (!data.success) return null;

        const d = data.data;
        const r = data.related || {};

        if (!d) {
            console.warn('[PageSettings] No existing data for', pageId, '- using defaults');
        }

        const initialized = {
            ...(d || {}),
            page_id: pageId,
            hero_settings: { ...DEFAULT_HERO, ...(d?.hero_settings || {}) },
            issues_settings: {
                title: d?.issues_settings?.title || 'Common Issues We Fix',
                subtitle: d?.issues_settings?.subtitle || 'Click any issue to book a repair instantly',
                items: d?.issues_settings?.items || []
            },
            problems_settings: {
                title: d?.problems_settings?.title || 'Problems We Solve',
                subtitle: d?.problems_settings?.subtitle || 'Common issues we fix',
                items: (r.problems?.length > 0)
                    ? r.problems.map(p => ({ question: p.problem_title, answer: p.problem_description }))
                    : (d?.problems_settings?.items || [])
            },
            services_settings: {
                title: d?.services_settings?.title || 'Popular Services',
                subtitle: d?.services_settings?.subtitle || 'Click any service to book instantly',
                items: d?.services_settings?.items || []
            },
            localities_settings: {
                title: d?.localities_settings?.title || 'Areas We Serve',
                subtitle: d?.localities_settings?.subtitle || 'Find us near you',
                items: (r.localities?.length > 0)
                    ? r.localities.map(l => l.locality_name)
                    : (d?.localities_settings?.items || [])
            },
            brands_settings: {
                title: d?.brands_settings?.title || 'Brands We Serve',
                subtitle: d?.brands_settings?.subtitle || 'Trusted by leading appliance manufacturers',
                items: (r.brandIds?.length > 0) ? r.brandIds : (d?.brands_settings?.items || [])
            },
            faqs_settings: {
                title: d?.faqs_settings?.title || 'Frequently Asked Questions',
                subtitle: d?.faqs_settings?.subtitle || 'Find answers to common questions',
                items: (r.faqIds?.length > 0) ? r.faqIds : (d?.faqs_settings?.items || [])
            },
            subcategories_settings: {
                title: d?.subcategories_settings?.title || 'Appliance Types',
                subtitle: d?.subcategories_settings?.subtitle || 'Choose your specific appliance',
                items: d?.subcategories_settings?.items || []
            },
            other_locations_settings: {
                title: d?.other_locations_settings?.title || 'Other locations',
                subtitle: d?.other_locations_settings?.subtitle || 'Explore more services near you',
                items: d?.other_locations_settings?.items || []
            },
            section_order: d?.section_order || null
        };

        return initialized;
    };

    const fetchSettings = async () => {
        if (!pageId) return;
        setLoading(true);
        try {
            console.log(`[ST-DEBUG] Fetching settings for ${pageId}...`);
            const res = await fetch(`/api/settings/page/${pageId}`, { cache: 'no-store' });
            const data = await res.json();
            console.log(`[ST-DEBUG] Fetch direct response:`, data);

            const initialized = processFetchedData(data);
            if (initialized) {
                setSettings(initialized);
                console.log(`[ST-DEBUG] State initialized/refreshed:`, initialized);
                if (initialized.section_visibility) {
                    setSectionVisibility(prev => ({ ...prev, ...initialized.section_visibility }));
                }
                setFetchError(null);
            } else {
                setFetchError(data.error || 'Server returned failure status');
            }
        } catch (error) {
            console.error('[ST-DEBUG] Fetch error:', error);
            setFetchError(error.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalData = async () => {
        try {
            console.log('[ST-DEBUG] Fetching global FAQs, Brands, Active Pages and Booking Settings...');
            const [faqRes, brandRes, bookingRes, activePagesRes] = await Promise.all([
                fetch('/api/settings/faqs'),
                fetch('/api/settings/brand-logos'),
                fetch('/api/settings/quick-booking'),
                fetch('/api/settings/active-pages')
            ]);
            const faqData = await faqRes.json();
            const brandData = await brandRes.json();
            const bookingData = await bookingRes.json();
            const activePagesData = await activePagesRes.json();
            if (faqData.success) setGlobalFaqs(faqData.data);
            if (brandData.success) setGlobalBrands(brandData.data);
            if (bookingData.success) setBookingSettings(bookingData.data);
            if (activePagesData.success) setGlobalActivePages(activePagesData.data.filter(p => p.page_type === 'location' || p.page_type === 'sublocation'));
        } catch (error) {
            console.error('[ST-DEBUG] Error fetching global data:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);

        // CRITICAL: Read from ref to avoid stale closure capturing old state
        const currentSettings = settingsRef.current;
        const currentVisibility = sectionVisibilityRef.current;

        const sItems = currentSettings?.services_settings?.items || [];
        const lItems = currentSettings?.localities_settings?.items || [];
        const pItems = currentSettings?.problems_settings?.items || [];

        // Transform other_locations_settings.items (array of IDs) to array of rich objects
        const oItemsRaw = currentSettings?.other_locations_settings?.items || [];
        // If it's already an object (saved previously), keep it. Otherwise resolve it.
        const oItems = oItemsRaw.map(item => {
            if (typeof item === 'object' && item !== null) return item;
            const page = globalActivePagesRef.current.find(p => p.page_id === item);
            return {
                id: item,
                title: page?.hero_settings?.title || formatLocationTitle(item),
                url: getPageUrl(item)
            };
        });

        console.log(`[ST-DEBUG] handleSave Stats (from ref) - S:${sItems.length}, L:${lItems.length}, P:${pItems.length}, O:${oItems.length}`);
        console.log(`[ST-DEBUG] RAW SETTINGS from ref:`, currentSettings);

        try {
            const payload = {
                ...currentSettings,
                section_visibility: currentVisibility,
                services_settings: { ...currentSettings.services_settings, items: sItems },
                localities_settings: { ...currentSettings.localities_settings, items: lItems },
                problems_settings: { ...currentSettings.problems_settings, items: pItems },
                other_locations_settings: { ...currentSettings.other_locations_settings, items: oItems }
            };

            const payloadString = JSON.stringify(payload);
            console.log(`[ST-DEBUG] FINAL PAYLOAD: S=${sItems.length}, L=${lItems.length}, P=${pItems.length}`);

            const res = await fetch(`/api/settings/page/${pageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payloadString
            });

            const data = await res.json();
            if (data.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);

                // If renamed, notify parent
                if (currentSettings.page_id !== pageId && onRename) {
                    console.log(`[ST-DEBUG] Rename detected! ${pageId} -> ${currentSettings.page_id}`);
                    onRename(currentSettings.page_id);
                } else {
                    // Refetch from DB to get the authoritative state after save
                    await fetchSettings();
                }
                console.log(`[ST-DEBUG] Save SUCCESS — ${currentSettings.page_id !== pageId ? 'RENAMED' : 'refetching'}.`);
            } else {
                console.error('[ST-DEBUG] Save FAILURE:', data.error, data.details);
                alert(`CRITICAL SAVE FAILURE:\n\nError: ${data.error}\nDetails: ${data.details || 'No extra info'}\n\nPlease check server logs.`);
            }
        } catch (error) {
            console.error('[ST-DEBUG] Save catch error:', error);
            alert('Failed to save settings: Network or server error. Check if the server is running.');
        } finally {
            setSaving(false);
        }
    };

    const toggleSectionVisibility = (key) => {
        setSectionVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ── Excel Export ──────────────────────────────────────────────────────────
    const handleExport = async () => {
        await exportPageSettingsToExcel(settings, pageLabel);
    };

    // ── Excel Import ──────────────────────────────────────────────────────────
    const [importing, setImporting] = useState(false);
    const importInputRef = useRef(null);

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const patch = await importPageSettingsFromExcel(file);
            setSettings(prev => applyImportPatch(prev, patch));
            alert(`✅ Import successful!\n\nSheets imported:\n${Object.keys(patch).map(k => '• ' + k.replace(/_/g, ' ')).join('\n')}\n\nRemember to click "Save All Changes" to persist.`);
        } catch (err) {
            console.error('Import failed:', err);
            alert('❌ Import failed: ' + err.message);
        } finally {
            setImporting(false);
            // reset so the same file can be re-imported
            if (importInputRef.current) importInputRef.current.value = '';
        }
    };


    const updateSection = (section, key, value) => {
        setSettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [section]: { ...prev[section], [key]: value }
            };
        });
    };

    const addItem = (section) => {
        setSettings(prev => {
            if (!prev) return prev;
            let newItems = [];
            if (section === 'problems_settings') {
                newItems = [...(prev.problems_settings?.items || []), { question: '', answer: '' }];
            } else if (section === 'services_settings') {
                newItems = [...(prev.services_settings?.items || []), { name: '', price: '' }];
            } else if (section === 'localities_settings') {
                newItems = [...(prev.localities_settings?.items || []), ''];
            } else if (section === 'subcategories_settings') {
                newItems = [
                    ...(prev.subcategories_settings?.items || []),
                    { title: '', description: '', price: '', image: '', slug: '', icon: '🔧' }
                ];
            }
            return {
                ...prev,
                [section]: { ...prev[section], items: newItems }
            };
        });
    };

    const removeItem = (section, index) => {
        setSettings(prev => {
            if (!prev) return prev;
            const items = [...(prev[section]?.items || [])];
            items.splice(index, 1);
            return {
                ...prev,
                [section]: { ...prev[section], items }
            };
        });
    };

    const toggleSelection = (section, id) => {
        setSettings(prev => {
            if (!prev) return prev;
            const items = prev[section]?.items || [];
            const newItems = items.includes(id) ? items.filter(i => i !== id) : [...items, id];
            return {
                ...prev,
                [section]: { ...prev[section], items: newItems }
            };
        });
    };

    const moveSection = (index, direction) => {
        setSettings(prev => {
            if (!prev) return prev;
            const currentOrder = prev.section_order || [
                'hero', 'booking', 'issues', 'subcategories', 'problems',
                'how_it_works', 'why_us', 'brands', 'localities', 'services', 'faqs'
            ];
            const newOrder = [...currentOrder];
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= newOrder.length) return prev;

            const [moved] = newOrder.splice(index, 1);
            newOrder.splice(newIndex, 0, moved);

            return {
                ...prev,
                section_order: newOrder
            };
        });
    };

    const updateItem = (section, index, field, value) => {
        setSettings(prev => {
            if (!prev) return prev;
            const items = [...(prev[section]?.items || [])];
            if (typeof items[index] === 'object') {
                items[index] = { ...items[index], [field]: value };
            } else {
                items[index] = value;
            }
            return {
                ...prev,
                [section]: { ...prev[section], items }
            };
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Loader2 className="animate-spin text-primary" size={48} />
                <span style={{ marginLeft: '12px', fontSize: '18px', color: 'var(--text-secondary)' }}>Loading settings...</span>
            </div>
        );
    }

    if (!settings || !settings.problems_settings) {
        return (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Failed to load settings</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {fetchError || 'Could not fetch settings for this page.'}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                    ID: {pageId}
                </p>
                <button
                    onClick={() => {
                        setFetchError(null);
                        fetchSettings();
                    }}
                    className="btn btn-secondary"
                >
                    Retry
                </button>
            </div>
        );
    }

    const isSubPage = pageId.startsWith('sub-');
    const tabs = [
        { id: 'hero', label: 'Hero Section', icon: Layout },
        ...(isSubPage ? [{ id: 'issues', label: 'Issues', icon: AlertCircle }] : []),
        { id: 'problems', label: 'Problems', icon: AlertCircle },
        { id: 'services', label: 'Services', icon: Tag },
        { id: 'localities', label: 'Localities', icon: MapPin },
        { id: 'brands', label: 'Brands', icon: ImageIcon },
        { id: 'subcategories', label: pageId.startsWith('cat-') ? 'Sub-Services' : 'Category Cards', icon: Layout },
        { id: 'other_locations', label: 'Other Locations', icon: MapPin },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        { id: 'layout', label: 'Layout & Navigation', icon: Rows }
    ];
    // Map from tab id to section_visibility key
    const tabVisibilityKey = { hero: 'hero', issues: 'issues', problems: 'problems', services: 'services', localities: 'localities', brands: 'brands', subcategories: 'subcategories', other_locations: 'other_locations', faqs: 'faqs', layout: null };

    // Helper: get all issues from booking settings for the current subcategory page
    const getPageIssues = () => {
        if (!bookingSettings?.categories) return [];
        const allIssues = [];
        for (const cat of (bookingSettings.categories || [])) {
            for (const sub of (cat.subcategories || [])) {
                for (const issue of (sub.issues || [])) {
                    allIssues.push({
                        id: issue.id,
                        name: issue.name,
                        subcategoryId: sub.id,
                        subcategoryName: sub.name,
                        categoryId: cat.id,
                        categoryName: cat.name,
                        // Global price from Quick Booking Form settings
                        bookingPrice: issue.price != null ? String(issue.price) : null,
                        bookingPriceLabel: issue.price_label || 'Starting from',
                    });
                }
            }
        }
        return allIssues;
    };

    return (
        <div className="page-settings-manager" style={{ paddingBottom: '80px' }}>
            {/* Page Header */}
            <div style={{
                marginBottom: 'var(--spacing-xl)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)'
            }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {pageLabel}
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                ID:
                            </p>
                            <input
                                type="text"
                                value={settings.page_id}
                                onChange={(e) => setSettings(prev => ({ ...prev, page_id: e.target.value }))}
                                className="form-control"
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    width: '280px',
                                    height: '24px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '4px'
                                }}
                            />
                            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>
                                <AlertCircle size={10} inline /> Changing this will rename the page URL
                            </p>
                        </div>
                        {(() => {
                            const effectiveUrl = pageUrl || (settings.page_id ? getPageUrl(settings.page_id) : null);
                            if (!effectiveUrl) return null;
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 600, margin: 0 }}>
                                        URL: <span style={{ fontFamily: 'monospace', fontWeight: 400, opacity: 0.8 }}>{effectiveUrl}</span>
                                    </p>
                                    <a
                                        href={effectiveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '11px',
                                            color: 'white',
                                            backgroundColor: 'var(--color-primary)',
                                            padding: '4px 12px',
                                            borderRadius: '99px',
                                            textDecoration: 'none',
                                            fontWeight: 700,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <ExternalLink size={12} />
                                        View Live Page
                                    </a>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: saveSuccess ? '#10b981' : undefined,
                        transition: 'background-color 0.3s ease'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : (saveSuccess ? <Check size={20} /> : <Save size={20} />)}
                    {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save All Changes'}
                </button>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--border-primary)',
                padding: '0 8px',
                overflowX: 'auto'
            }}>
                {tabs.map(tab => {
                    const visKey = tabVisibilityKey[tab.id];
                    const isVisible = visKey ? sectionVisibility[visKey] !== false : true;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                                borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                marginTop: '3px',
                                whiteSpace: 'nowrap',
                                opacity: isVisible ? 1 : 0.55
                            }}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {!isVisible && (
                                <span style={{
                                    fontSize: '9px', padding: '1px 5px',
                                    borderRadius: '99px', backgroundColor: '#ef444420',
                                    color: '#ef4444', fontWeight: 700, letterSpacing: '0.5px'
                                }}>HIDDEN</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="card" style={{ padding: 'var(--spacing-xl)', minHeight: '400px' }}>

                {/* ── Sitelink Copy Box ── */}
                {pageUrl && (() => {
                    const hashMap = {
                        hero: '',
                        problems: '#problems',
                        services: '#popular',
                        localities: '#areas',
                        brands: '#brands',
                        subcategories: '#services',
                        faqs: '#faqs'
                    };
                    const hash = hashMap[activeTab] ?? '';
                    const sitelink = `${pageUrl}${hash}`;
                    return (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', marginBottom: '20px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px'
                        }}>
                            <ExternalLink size={14} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                            <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, fontWeight: 600 }}>Sitelink:</span>
                            <code style={{
                                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: 'var(--color-primary)', fontSize: '12px'
                            }}>{sitelink}</code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(sitelink);
                                    const btn = document.getElementById('sl-copy-btn');
                                    if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { if (btn) btn.textContent = 'Copy'; }, 2000); }
                                }}
                                id="sl-copy-btn"
                                style={{
                                    flexShrink: 0, padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                                    backgroundColor: 'var(--color-primary)', color: 'white',
                                    border: 'none', borderRadius: '99px', cursor: 'pointer'
                                }}
                            >Copy</button>
                        </div>
                    );
                })()}

                {/* ── Section Info Banner ── */}
                {(() => {
                    const TAB_INFO = {
                        hero: {
                            icon: '🖼️',
                            what: 'Full-width banner at the top of the page with a headline, subtitle, and a background (gradient, color, or image).',
                            behavior: 'Static — not clickable. Sets the first impression for visitors.'
                        },
                        issues: {
                            icon: '🔧',
                            what: 'Grid of clickable issue cards (e.g. "Not Cooling", "Ice Formation"). Only shown on subcategory pages.',
                            behavior: '✅ Clickable — visitor clicks an issue card → booking form scrolls into view and auto-selects the appliance, appliance type, and issue.'
                        },
                        problems: {
                            icon: '⚠️',
                            what: 'Accordion/list of problems the service solves (e.g. "AC not cooling", "Making noise"). Purely informational.',
                            behavior: 'Accordion toggles expand/collapse — not linked to booking.'
                        },
                        services: {
                            icon: '💼',
                            what: 'Grid of service cards, each showing an issue name, price badge, and a "Book Now" button.',
                            behavior: '✅ Clickable — visitor clicks "Book Now" → booking form prefills with the appliance, type, and issue selected.'
                        },
                        localities: {
                            icon: '📍',
                            what: 'A list of areas/localities where the service is available (e.g. Andheri, Bandra, Malad).',
                            behavior: '✅ Each locality is a link — clicking navigates to the service\'s location page for that area.'
                        },
                        brands: {
                            icon: '🏷️',
                            what: 'Auto-scrolling logo strip showing supported brands (Samsung, LG, Whirlpool, etc.).',
                            behavior: 'Static display — not clickable. Builds trust.'
                        },
                        subcategories: {
                            icon: '🗂️',
                            what: 'Grid of cards for service subcategories or appliance types (e.g. "Split AC", "Window AC", "Cassette AC").',
                            behavior: '✅ Each card links to the corresponding subcategory page.'
                        },
                        other_locations: {
                            icon: '🗺️',
                            what: 'A row of links to the same service in other cities/locations.',
                            behavior: '✅ Each location is a link — clicking navigates to that location\'s service page.'
                        },
                        faqs: {
                            icon: '❓',
                            what: 'Accordion of frequently asked questions about the service.',
                            behavior: 'Accordion toggles expand/collapse answers — not linked to booking.'
                        },
                        layout: {
                            icon: '⚙️',
                            what: 'Controls the ORDER and VISIBILITY of all sections on this page.',
                            behavior: 'Use the toggle switches to show/hide sections, and use ↑ ↓ arrows to reorder them. Changes take effect after saving.'
                        }
                    };
                    const info = TAB_INFO[activeTab];
                    if (!info) return null;
                    return (
                        <div style={{
                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                            padding: '12px 16px', marginBottom: '20px',
                            backgroundColor: 'rgba(99,102,241,0.06)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 'var(--radius-lg)',
                            fontSize: '13px'
                        }}>
                            <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{info.icon}</span>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                    What this section is:
                                    <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>{info.what}</span>
                                </div>
                                <div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                    <strong style={{ color: info.behavior.startsWith('✅') ? '#10b981' : 'var(--text-tertiary)' }}>Visitor behaviour:</strong>
                                    {' '}{info.behavior}
                                </div>
                            </div>
                        </div>
                    );
                })()}


                {activeTab === 'hero' && (
                    <div>
                        <SectionVisibilityBanner sectionKey="hero" visible={sectionVisibility.hero} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.hero ? 1 : 0.45, pointerEvents: sectionVisibility.hero ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <HeroTab settings={settings} updateSection={updateSection} />
                        </div>
                    </div>
                )}

                {/* ── ISSUES TAB (subcategory pages only) ── */}
                {activeTab === 'issues' && isSubPage && (() => {
                    const allIssues = getPageIssues();
                    // items now stored as rich objects { id, price, description, image } OR plain IDs (legacy)
                    const rawItems = settings.issues_settings?.items || [];

                    // Normalise to rich objects
                    const selectedItems = rawItems.map(item =>
                        typeof item === 'object' && item !== null
                            ? item
                            : { id: item, price: '', description: '', image: '' }
                    );

                    const selectedIds = selectedItems.map(i => i.id);

                    const filtered = issueSearch
                        ? allIssues.filter(i =>
                            i.name.toLowerCase().includes(issueSearch.toLowerCase()) ||
                            i.subcategoryName.toLowerCase().includes(issueSearch.toLowerCase())
                        )
                        : allIssues;

                    // Group filtered issues by subcategory
                    const grouped = filtered.reduce((acc, issue) => {
                        const key = issue.subcategoryName;
                        if (!acc[key]) acc[key] = { categoryId: issue.categoryId, subcategoryId: issue.subcategoryId, issues: [] };
                        acc[key].issues.push(issue);
                        return acc;
                    }, {});

                    const isIssueSelected = (id) => selectedIds.includes(id);

                    const toggleIssue = (issue) => {
                        const existingIdx = selectedItems.findIndex(i => Number(i.id) === Number(issue.id));
                        let newItems;
                        if (existingIdx >= 0) {
                            newItems = selectedItems.filter((_, idx) => idx !== existingIdx);
                        } else {
                            newItems = [...selectedItems, { id: issue.id, price: '', description: '', image: '' }];
                        }
                        updateSection('issues_settings', 'items', newItems);
                    };

                    const updateIssueField = (id, field, value) => {
                        const newItems = selectedItems.map(i =>
                            Number(i.id) === Number(id) ? { ...i, [field]: value } : i
                        );
                        updateSection('issues_settings', 'items', newItems);
                    };

                    const uploadIssueImage = async (id, file) => {
                        if (!file) return;
                        setUploadingIssue(prev => ({ ...prev, [id]: true }));
                        try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) updateIssueField(id, 'image', data.url);
                            else if (data.success && data.data?.url) updateIssueField(id, 'image', data.data.url);
                        } catch (e) {
                            console.error('Upload failed', e);
                        } finally {
                            setUploadingIssue(prev => ({ ...prev, [id]: false }));
                        }
                    };

                    return (
                        <div>
                            <SectionVisibilityBanner sectionKey="issues" visible={sectionVisibility.issues} onToggle={toggleSectionVisibility} />
                            <div style={{ opacity: sectionVisibility.issues ? 1 : 0.45, pointerEvents: sectionVisibility.issues ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                                    {/* Section title/subtitle */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                            <input
                                                type="text"
                                                value={settings.issues_settings?.title || ''}
                                                onChange={(e) => updateSection('issues_settings', 'title', e.target.value)}
                                                className="form-control"
                                                placeholder="e.g. Common Issues We Fix"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                            <input
                                                type="text"
                                                value={settings.issues_settings?.subtitle || ''}
                                                onChange={(e) => updateSection('issues_settings', 'subtitle', e.target.value)}
                                                className="form-control"
                                                placeholder="e.g. Click any issue to book a repair"
                                            />
                                        </div>
                                    </div>

                                    {/* Stats + search */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <strong style={{ color: 'var(--color-primary)' }}>{selectedItems.length}</strong> issues selected from{' '}
                                            <strong>{allIssues.length}</strong> total
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="Search issues..."
                                                value={issueSearch}
                                                onChange={(e) => setIssueSearch(e.target.value)}
                                                className="form-control"
                                                style={{ width: '200px', padding: '6px 12px', fontSize: '13px' }}
                                            />
                                            {selectedItems.length > 0 && (
                                                <button
                                                    onClick={() => updateSection('issues_settings', 'items', [])}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info callout about rich fields */}
                                    <div style={{ padding: '12px 16px', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '16px', flexShrink: 0 }}>✨</span>
                                        <span>
                                            <strong style={{ color: 'var(--text-primary)' }}>New: Rich issue cards</strong> — After selecting an issue, expand it to add an <strong>image</strong>, <strong>price</strong>, and a short <strong>description</strong>. These appear on the live page as premium service cards.
                                        </span>
                                    </div>

                                    {/* Issue picker grouped by subcategory */}
                                    {bookingSettings ? (
                                        Object.keys(grouped).length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                                {issueSearch ? `No issues match "${issueSearch}"` : 'No issues found in global booking settings.'}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '20px' }}>
                                                {Object.entries(grouped).map(([subName, group]) => (
                                                    <div key={subName} style={{
                                                        padding: '16px',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius-lg)',
                                                        border: '1px solid var(--border-primary)'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                🔧 {subName}
                                                            </h4>
                                                            <button
                                                                onClick={() => {
                                                                    const groupIds = group.issues.map(i => i.id);
                                                                    const allSelected = groupIds.every(id => selectedIds.includes(id));
                                                                    if (allSelected) {
                                                                        const newItems = selectedItems.filter(i => !groupIds.includes(i.id));
                                                                        updateSection('issues_settings', 'items', newItems);
                                                                    } else {
                                                                        const existingIds = new Set(selectedIds.map(Number));
                                                                        const toAdd = group.issues
                                                                            .filter(i => !existingIds.has(Number(i.id)))
                                                                            .map(i => ({ id: i.id, price: '', description: '', image: '' }));
                                                                        updateSection('issues_settings', 'items', [...selectedItems, ...toAdd]);
                                                                    }
                                                                }}
                                                                className="btn btn-secondary"
                                                                style={{ padding: '3px 10px', fontSize: '11px' }}
                                                            >
                                                                {group.issues.every(i => selectedIds.includes(i.id)) ? 'Deselect All' : 'Select All'}
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                            {group.issues.map(issue => {
                                                                const isSel = isIssueSelected(issue.id);
                                                                const savedItem = selectedItems.find(i => Number(i.id) === Number(issue.id));
                                                                return (
                                                                    <div
                                                                        key={issue.id}
                                                                        style={{
                                                                            border: `2px solid ${isSel ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                                            borderRadius: 'var(--radius-lg)',
                                                                            backgroundColor: isSel ? 'rgba(99,102,241,0.04)' : 'var(--bg-primary)',
                                                                            overflow: 'hidden',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        {/* Row 1: Toggle */}
                                                                        <div
                                                                            onClick={() => toggleIssue(issue)}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                                                                        >
                                                                            <div style={{
                                                                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                                                                border: `2px solid ${isSel ? 'var(--color-primary)' : 'var(--border-tertiary)'}`,
                                                                                backgroundColor: isSel ? 'var(--color-primary)' : 'transparent',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                            }}>
                                                                                {isSel && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                                                            </div>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ fontWeight: 700, fontSize: '14px', color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{issue.name}</div>
                                                                                {savedItem?.price && <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '2px' }}>Price: {savedItem.price}</div>}
                                                                            </div>
                                                                            {savedItem?.image && (
                                                                                <img src={savedItem.image} alt={issue.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-primary)', flexShrink: 0 }} />
                                                                            )}
                                                                        </div>

                                                                        {/* Row 2: Rich fields (only when selected) */}
                                                                        {isSel && (
                                                                            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-primary)', paddingTop: '14px', display: 'grid', gap: '12px' }}>

                                                                                {/* Image */}
                                                                                <div>
                                                                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Card Image <span style={{ fontWeight: 400 }}>(optional — shown on the live card)</span></label>
                                                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Image URL or upload →"
                                                                                            value={savedItem?.image || ''}
                                                                                            onChange={e => updateIssueField(issue.id, 'image', e.target.value)}
                                                                                            className="form-control"
                                                                                            style={{ flex: 1, fontSize: '12px' }}
                                                                                        />
                                                                                        <label style={{
                                                                                            padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                                                                                            backgroundColor: uploadingIssue[issue.id] ? 'var(--bg-secondary)' : 'var(--color-primary)',
                                                                                            color: uploadingIssue[issue.id] ? 'var(--text-tertiary)' : 'white',
                                                                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', flexShrink: 0,
                                                                                            border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                                                                        }}>
                                                                                            {uploadingIssue[issue.id] ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                                                                            {uploadingIssue[issue.id] ? 'Uploading…' : 'Upload'}
                                                                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                                                                onChange={e => uploadIssueImage(issue.id, e.target.files[0])}
                                                                                            />
                                                                                        </label>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Price + Description side by side */}
                                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                                    <div>
                                                                                        <label style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                                                            Price on card
                                                                                            {/* Show global price badge */}
                                                                                            {(() => {
                                                                                                const globalIssue = allIssues.find(i => Number(i.id) === Number(issue.id));
                                                                                                if (globalIssue?.bookingPrice) {
                                                                                                    return (
                                                                                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', backgroundColor: '#10b98115', color: '#059669', border: '1px solid #10b98130' }}>
                                                                                                            🌐 Global: {globalIssue.bookingPriceLabel} ₹{Number(globalIssue.bookingPrice).toLocaleString('en-IN')}
                                                                                                        </span>
                                                                                                    );
                                                                                                }
                                                                                                return <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>(no global price set)</span>;
                                                                                            })()}
                                                                                        </label>
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder={(() => {
                                                                                                const g = allIssues.find(i => Number(i.id) === Number(issue.id));
                                                                                                return g?.bookingPrice
                                                                                                    ? `Auto: ${g.bookingPriceLabel} ₹${Number(g.bookingPrice).toLocaleString('en-IN')} — override here`
                                                                                                    : 'e.g. ₹499 onwards';
                                                                                            })()}
                                                                                            value={savedItem?.price || ''}
                                                                                            onChange={e => updateIssueField(issue.id, 'price', e.target.value)}
                                                                                            className="form-control"
                                                                                            style={{ fontSize: '12px' }}
                                                                                        />
                                                                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                                                            Leave blank to use the global price automatically.
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Short Description <span style={{ fontWeight: 400 }}>(1–2 lines)</span></label>
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="e.g. Fast, professional repair with 90-day warranty"
                                                                                            value={savedItem?.description || ''}
                                                                                            onChange={e => updateIssueField(issue.id, 'description', e.target.value)}
                                                                                            className="form-control"
                                                                                            style={{ fontSize: '12px' }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                            <Loader2 className="animate-spin" size={24} style={{ marginBottom: '8px' }} />
                                            <p>Loading global issues...</p>
                                        </div>
                                    )}
                                </div>
                            </div>{/* end opacity wrapper */}
                        </div>
                    );
                })()}

                {/* ── PROBLEMS TAB ── */}
                {activeTab === 'problems' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <SectionVisibilityBanner sectionKey="problems" visible={sectionVisibility.problems} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.problems ? 1 : 0.45, pointerEvents: sectionVisibility.problems ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input
                                        type="text"
                                        value={settings.problems_settings.title}
                                        onChange={(e) => updateSection('problems_settings', 'title', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input
                                        type="text"
                                        value={settings.problems_settings.subtitle}
                                        onChange={(e) => updateSection('problems_settings', 'subtitle', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <label style={{ fontWeight: 600 }}>Common Problems & Solutions</label>
                                    <button onClick={() => addItem('problems_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        <Plus size={14} /> Add Problem
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {settings.problems_settings.items.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Problem (e.g., AC not cooling)"
                                                    value={item.question}
                                                    onChange={(e) => updateItem('problems_settings', index, 'question', e.target.value)}
                                                    style={{ marginBottom: '8px', width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                                />
                                                <textarea
                                                    placeholder="Brief solution description"
                                                    value={item.answer}
                                                    onChange={(e) => updateItem('problems_settings', index, 'answer', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)', minHeight: '60px' }}
                                                />
                                            </div>
                                            <button onClick={() => removeItem('problems_settings', index)} className="btn btn-danger" style={{ height: 'fit-content' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {settings.problems_settings.items.length === 0 && (
                                        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>No problems added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* ── SERVICES TAB ── */}
                {activeTab === 'services' && (() => {
                    const allIssues = getPageIssues();
                    // services_settings.items = [{id, price}, ...]
                    const selectedItems = settings.services_settings?.items || [];
                    const selectedIds = selectedItems.map(i => Number(i.id));

                    const filtered = issueSearch
                        ? allIssues.filter(i =>
                            i.name.toLowerCase().includes(issueSearch.toLowerCase()) ||
                            i.subcategoryName.toLowerCase().includes(issueSearch.toLowerCase())
                        )
                        : allIssues;

                    const grouped = filtered.reduce((acc, issue) => {
                        const key = issue.subcategoryName;
                        if (!acc[key]) acc[key] = { issues: [] };
                        acc[key].issues.push(issue);
                        return acc;
                    }, {});

                    const toggleServiceIssue = (issue) => {
                        const existing = selectedItems.findIndex(i => Number(i.id) === Number(issue.id));
                        let newItems;
                        if (existing >= 0) {
                            newItems = selectedItems.filter((_, idx) => idx !== existing);
                        } else {
                            newItems = [...selectedItems, { id: issue.id, price: '' }];
                        }
                        updateSection('services_settings', 'items', newItems);
                    };

                    const updateServicePrice = (issueId, price) => {
                        const newItems = selectedItems.map(i =>
                            Number(i.id) === Number(issueId) ? { ...i, price } : i
                        );
                        updateSection('services_settings', 'items', newItems);
                    };

                    return (
                        <div>
                            <SectionVisibilityBanner sectionKey="services" visible={sectionVisibility.services} onToggle={toggleSectionVisibility} />
                            <div style={{ opacity: sectionVisibility.services ? 1 : 0.45, pointerEvents: sectionVisibility.services ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-xl)' }}>
                                {/* Section title/subtitle */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                        <input
                                            type="text"
                                            value={settings.services_settings?.title || ''}
                                            onChange={(e) => updateSection('services_settings', 'title', e.target.value)}
                                            className="form-control"
                                            placeholder="e.g. Popular Services"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                        <input
                                            type="text"
                                            value={settings.services_settings?.subtitle || ''}
                                            onChange={(e) => updateSection('services_settings', 'subtitle', e.target.value)}
                                            className="form-control"
                                            placeholder="e.g. Click any service to book instantly"
                                        />
                                    </div>
                                </div>

                                {/* Stats + search */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        <strong style={{ color: 'var(--color-primary)' }}>{selectedIds.length}</strong> services selected from{' '}
                                        <strong>{allIssues.length}</strong> total
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Search issues..."
                                            value={issueSearch}
                                            onChange={(e) => setIssueSearch(e.target.value)}
                                            className="form-control"
                                            style={{ width: '200px', padding: '6px 12px', fontSize: '13px' }}
                                        />
                                        {selectedIds.length > 0 && (
                                            <button
                                                onClick={() => updateSection('services_settings', 'items', [])}
                                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Issue picker grouped by subcategory */}
                                {allIssues.length === 0 && (
                                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)', color: 'var(--text-tertiary)' }}>
                                        No issues found. Add issues in Quick Booking settings first.
                                    </div>
                                )}

                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {Object.entries(grouped).map(([subcatName, group]) => (
                                        <div key={subcatName}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', paddingLeft: '4px' }}>
                                                    {subcatName}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const groupIds = group.issues.map(i => Number(i.id));
                                                        const allSelected = groupIds.every(id => selectedIds.includes(id));
                                                        if (allSelected) {
                                                            updateSection('services_settings', 'items', selectedItems.filter(i => !groupIds.includes(Number(i.id))));
                                                        } else {
                                                            const toAdd = group.issues.filter(i => !selectedIds.includes(Number(i.id)));
                                                            updateSection('services_settings', 'items', [...selectedItems, ...toAdd.map(i => ({ id: i.id, price: '' }))]);
                                                        }
                                                    }}
                                                    style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '99px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                >
                                                    {group.issues.every(i => selectedIds.includes(Number(i.id))) ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {group.issues.map(issue => {
                                                    const selected = selectedIds.includes(Number(issue.id));
                                                    const savedItem = selectedItems.find(i => Number(i.id) === Number(issue.id));
                                                    return (
                                                        <div key={issue.id} style={{
                                                            border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                            borderRadius: 'var(--radius-lg)',
                                                            backgroundColor: selected ? 'rgba(99,102,241,0.05)' : 'var(--bg-secondary)',
                                                            overflow: 'hidden',
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            {/* Row 1: toggle issue */}
                                                            <div
                                                                onClick={() => toggleServiceIssue(issue)}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                                                            >
                                                                <div style={{
                                                                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                                                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-tertiary)'}`,
                                                                    backgroundColor: selected ? 'var(--color-primary)' : 'transparent',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    {selected && <Check size={13} color="white" strokeWidth={3} />}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{issue.name}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>ID: {issue.id}</div>
                                                                </div>
                                                                {savedItem?.price && (
                                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>₹{savedItem.price}</div>
                                                                )}
                                                            </div>

                                                            {/* Row 2: price input (only when selected) */}
                                                            {selected && (
                                                                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                                                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                                        Price (₹) — shown on live page
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="e.g. 499 or 499-999"
                                                                        value={savedItem?.price || ''}
                                                                        onChange={e => updateServicePrice(issue.id, e.target.value)}
                                                                        className="form-control"
                                                                        style={{ fontSize: '13px', maxWidth: '200px' }}
                                                                        onClick={e => e.stopPropagation()}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {selectedIds.length === 0 && allIssues.length > 0 && (
                                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center' }}>
                                        Select issues above — this section will be <strong>hidden</strong> until at least one is selected.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}


                {/* ―― LOCALITIES TAB ―― */}
                {activeTab === 'localities' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <SectionVisibilityBanner sectionKey="localities" visible={sectionVisibility.localities} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.localities ? 1 : 0.45, pointerEvents: sectionVisibility.localities ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input type="text" value={settings.localities_settings.title} onChange={(e) => updateSection('localities_settings', 'title', e.target.value)} className="form-control" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input type="text" value={settings.localities_settings.subtitle} onChange={(e) => updateSection('localities_settings', 'subtitle', e.target.value)} className="form-control" />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <label style={{ fontWeight: 600 }}>Localities / Areas served</label>
                                    <button onClick={() => addItem('localities_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        <Plus size={14} /> Add Locality
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                    {settings.localities_settings.items.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => updateItem('localities_settings', index, null, e.target.value)}
                                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                                placeholder="Area name"
                                            />
                                            <button onClick={() => removeItem('localities_settings', index)} className="btn btn-danger" style={{ padding: '8px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* â”€â”€ BRANDS TAB â”€â”€ */}
                {activeTab === 'brands' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                        <SectionVisibilityBanner sectionKey="brands" visible={sectionVisibility.brands} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.brands ? 1 : 0.45, pointerEvents: sectionVisibility.brands ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input type="text" value={settings.brands_settings.title} onChange={(e) => updateSection('brands_settings', 'title', e.target.value)} className="form-control" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input type="text" value={settings.brands_settings.subtitle} onChange={(e) => updateSection('brands_settings', 'subtitle', e.target.value)} className="form-control" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#3b82f615', borderRadius: 'var(--radius-md)', color: '#3b82f6', flex: 1 }}>
                                    <ImageIcon size={20} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>Select {settings.brands_settings.items.length} brands for this page</p>
                                </div>
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search brands library..."
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        className="form-control"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                    <HelpCircle size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', maxHeight: '500px', overflowY: 'auto', padding: '4px' }}>
                                {globalBrands
                                    .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                                    .map(brand => {
                                        const isSelected = settings.brands_settings.items.includes(brand.id);
                                        return (
                                            <div
                                                key={brand.id}
                                                onClick={() => toggleSelection('brands_settings', brand.id)}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                    backgroundColor: isSelected ? 'var(--color-primary)08' : 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    position: 'relative',
                                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                                                }}
                                            >
                                                {isSelected && (
                                                    <div style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10 }}>
                                                        <Save size={12} strokeWidth={3} />
                                                    </div>
                                                )}
                                                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                                    <img
                                                        src={brand.logo_url}
                                                        alt={brand.name}
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: isSelected ? 'none' : 'grayscale(1)' }}
                                                    />
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, opacity: isSelected ? 1 : 0.6 }}>{brand.name}</div>
                                            </div>
                                        );
                                    })}
                                {globalBrands.length > 0 && globalBrands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No brands match "{brandSearch}"
                                    </div>
                                )}
                            </div>
                            {globalBrands.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No brands found in global library.</p>}

                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                    Need a brand not listed here?
                                    <span style={{ color: 'var(--color-primary)', cursor: 'pointer', marginLeft: '4px', fontWeight: 600 }}>Create in Global Brands Library â†’</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── SUBCATEGORIES (Sub-Services) TAB ── */}
                {activeTab === 'subcategories' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <SectionVisibilityBanner sectionKey="subcategories" visible={sectionVisibility.subcategories} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.subcategories ? 1 : 0.45, pointerEvents: sectionVisibility.subcategories ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <SubcategoriesTab
                                settings={settings}
                                updateSection={updateSection}
                                pageId={pageId}
                                bookingSettings={bookingSettings}
                            />
                        </div>
                    </div>
                )}

                {/* â”€â”€ FAQs TAB â”€â”€ */}
                {activeTab === 'faqs' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                        <SectionVisibilityBanner sectionKey="faqs" visible={sectionVisibility.faqs} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.faqs ? 1 : 0.45, pointerEvents: sectionVisibility.faqs ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input type="text" value={settings.faqs_settings.title} onChange={(e) => updateSection('faqs_settings', 'title', e.target.value)} className="form-control" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input type="text" value={settings.faqs_settings.subtitle} onChange={(e) => updateSection('faqs_settings', 'subtitle', e.target.value)} className="form-control" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#8b5cf615', borderRadius: 'var(--radius-md)', color: '#8b5cf6', flex: 1 }}>
                                    <HelpCircle size={20} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>Selected {settings.faqs_settings.items.length} FAQs for this page</p>
                                </div>
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search FAQs..."
                                        value={faqSearch}
                                        onChange={(e) => setFaqSearch(e.target.value)}
                                        className="form-control"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                    <HelpCircle size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto', padding: '4px' }}>
                                {globalFaqs
                                    .filter(f => f.question.toLowerCase().includes(faqSearch.toLowerCase()) || f.answer.toLowerCase().includes(faqSearch.toLowerCase()))
                                    .map(faq => {
                                        const isSelected = settings.faqs_settings.items.includes(faq.id);
                                        return (
                                            <div
                                                key={faq.id}
                                                onClick={() => toggleSelection('faqs_settings', faq.id)}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                    backgroundColor: isSelected ? 'var(--color-primary)08' : 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    display: 'flex',
                                                    gap: '16px',
                                                    alignItems: 'flex-start',
                                                    boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none'
                                                }}
                                            >
                                                <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-tertiary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent' }}>
                                                    {isSelected && <Save size={14} color="white" strokeWidth={3} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{faq.question}</div>
                                                    <div style={{ fontSize: '13px', opacity: 0.7, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{faq.answer.substring(0, 120)}{faq.answer.length > 120 ? '...' : ''}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {globalFaqs.length > 0 && globalFaqs.filter(f => f.question.toLowerCase().includes(faqSearch.toLowerCase()) || f.answer.toLowerCase().includes(faqSearch.toLowerCase())).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No FAQs match "{faqSearch}"
                                    </div>
                                )}
                            </div>
                            {globalFaqs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No FAQs found in global library.</p>}

                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                    Need a specific FAQ?
                                    <span style={{ color: 'var(--color-primary)', cursor: 'pointer', marginLeft: '4px', fontWeight: 600 }}>Manage Global FAQ Library →</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── OTHER LOCATIONS TAB ── */}
                {activeTab === 'other_locations' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                        <SectionVisibilityBanner sectionKey="other_locations" visible={sectionVisibility.other_locations} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.other_locations ? 1 : 0.45, pointerEvents: sectionVisibility.other_locations ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input type="text" value={settings.other_locations_settings.title} onChange={(e) => updateSection('other_locations_settings', 'title', e.target.value)} className="form-control" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input type="text" value={settings.other_locations_settings.subtitle} onChange={(e) => updateSection('other_locations_settings', 'subtitle', e.target.value)} className="form-control" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#eef2ff', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', flex: 1 }}>
                                    <MapPin size={20} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                        Selected {settings.other_locations_settings.items.filter(item => {
                                            const idStr = typeof item === 'object' ? item.id : item;
                                            return globalActivePages.some(p => p.page_id === idStr);
                                        }).length} locations for this page
                                    </p>
                                </div>
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search active location pages..."
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        className="form-control"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                    <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto', padding: '4px' }}>
                                {globalActivePages
                                    .filter(p => (p.page_id.toLowerCase().includes(locationSearch.toLowerCase()) || (p.hero_settings?.title || '').toLowerCase().includes(locationSearch.toLowerCase())))
                                    .map(loc => {
                                        // The items array could be mixed format right after load, so handle both object and string ID
                                        const currentItems = settings.other_locations_settings.items;
                                        const isSelected = currentItems.some(i => (typeof i === 'object' ? i.id === loc.page_id : i === loc.page_id));

                                        // Use custom toggle logic because toggleSelection assumes primitive arrays
                                        const handleToggle = () => {
                                            setSettings(prev => {
                                                const items = [...(prev.other_locations_settings?.items || [])];
                                                const existingIdx = items.findIndex(i => (typeof i === 'object' ? i.id === loc.page_id : i === loc.page_id));
                                                if (existingIdx >= 0) {
                                                    items.splice(existingIdx, 1);
                                                } else {
                                                    items.push(loc.page_id);
                                                }
                                                return { ...prev, other_locations_settings: { ...prev.other_locations_settings, items } };
                                            });
                                        };

                                        return (
                                            <div
                                                key={loc.page_id}
                                                onClick={handleToggle}
                                                style={{
                                                    padding: '16px', borderRadius: 'var(--radius-md)',
                                                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                    backgroundColor: isSelected ? 'var(--color-primary)08' : 'var(--bg-secondary)',
                                                    cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center',
                                                    boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none'
                                                }}
                                            >
                                                <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-tertiary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent' }}>
                                                    {isSelected && <Save size={14} color="white" strokeWidth={3} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{loc.hero_settings?.title || formatLocationTitle(loc.page_id)} ({loc.page_id})</div>
                                                    <div style={{ fontSize: '13px', opacity: 0.7, color: 'var(--text-tertiary)' }}>{getPageUrl(loc.page_id)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                            {globalActivePages.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No active location or sub-location pages found.</p>}
                        </div>
                    </div>
                )}

                {/* ── LAYOUT TAB ── */}
                {activeTab === 'layout' && (() => {
                    const DEFAULT_ORDER = [
                        'hero', 'booking', 'issues', 'subcategories', 'problems',
                        'how_it_works', 'why_us', 'brands', 'localities', 'services', 'other_locations', 'faqs'
                    ];

                    let baseOrder = settings.section_order || DEFAULT_ORDER;
                    // Append any missing sections to the end so nothing vanishes if added later
                    if (settings.section_order) {
                        const missing = DEFAULT_ORDER.filter(item => !baseOrder.includes(item));
                        if (missing.length > 0) {
                            baseOrder = [...baseOrder, ...missing];
                        }
                    }

                    const displayOrder = baseOrder.filter(key => {
                        // Hide 'issues' from the layout list if not on a sub-page
                        if (key === 'issues' && !isSubPage) return false;
                        return true;
                    });

                    const SECTION_INFO = {
                        hero: { label: 'Hero Section', icon: Layout },
                        booking: { label: 'Booking Form', icon: Check },
                        issues: { label: 'Issues Picker', icon: AlertCircle },
                        subcategories: { label: 'Category / Brands Cards', icon: Layout },
                        problems: { label: 'Problems We Fix', icon: AlertCircle },
                        how_it_works: { label: 'How It Works', icon: HelpCircle },
                        why_us: { label: 'Why Choose Us', icon: Layout },
                        brands: { label: 'Brand Logos', icon: ImageIcon },
                        localities: { label: 'Areas We Serve', icon: MapPin },
                        services: { label: 'Popular Services', icon: Tag },
                        other_locations: { label: 'Other Locations', icon: MapPin },
                        faqs: { label: 'FAQs', icon: HelpCircle }
                    };

                    const moveSection = (index, direction) => {
                        const newOrder = [...displayOrder];
                        const targetIndex = index + direction;
                        if (targetIndex < 0 || targetIndex >= newOrder.length) return;
                        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
                        setSettings(prev => ({ ...prev, section_order: newOrder }));
                    };

                    return (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#6366f110',
                                border: '1px solid #6366f140',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '10px'
                            }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                    Page Arrangement
                                </h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Drag items ↑ or ↓ to change their vertical position on the live website.
                                    Toggle the eye icon to hide/show sections completely.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '8px' }}>
                                {displayOrder.map((key, index) => {
                                    const info = SECTION_INFO[key] || { label: key, icon: Layout };
                                    const isVisible = sectionVisibility[key] !== false;
                                    const isFirst = index === 0;
                                    const isLast = index === displayOrder.length - 1;

                                    return (
                                        <div key={key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            backgroundColor: isVisible ? 'var(--bg-secondary)' : 'rgba(239, 68, 68, 0.05)',
                                            border: `1.5px solid ${isVisible ? 'var(--border-primary)' : 'rgba(239, 68, 68, 0.2)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            gap: '16px',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            opacity: isVisible ? 1 : 0.7
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                <button
                                                    onClick={() => moveSection(index, -1)}
                                                    disabled={isFirst}
                                                    style={{
                                                        border: 'none', background: 'none', padding: 0,
                                                        cursor: isFirst ? 'not-allowed' : 'pointer',
                                                        opacity: isFirst ? 0.3 : 1,
                                                        color: '#ffffff'
                                                    }}
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => moveSection(index, 1)}
                                                    disabled={isLast}
                                                    style={{
                                                        border: 'none', background: 'none', padding: 0,
                                                        cursor: isLast ? 'not-allowed' : 'pointer',
                                                        opacity: isLast ? 0.3 : 1,
                                                        color: '#ffffff'
                                                    }}
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                            </div>

                                            <div style={{
                                                width: '32px', height: '32px',
                                                borderRadius: '8px',
                                                backgroundColor: isVisible ? 'var(--color-primary-alpha)' : 'var(--bg-tertiary)',
                                                color: isVisible ? 'var(--color-primary)' : 'var(--text-tertiary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <info.icon size={18} />
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '14px', color: isVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                    {info.label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    Position: {index + 1} of {displayOrder.length}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <button
                                                    onClick={() => toggleSectionVisibility(key)}
                                                    style={{
                                                        border: 'none',
                                                        background: 'none',
                                                        padding: '8px',
                                                        cursor: 'pointer',
                                                        color: isVisible ? '#10b981' : '#ef4444',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                                    {isVisible ? 'Visible' : 'Hidden'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* â”€â”€ Sticky Save Bar â”€â”€ */}
            <div style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                backgroundColor: saveSuccess ? '#052e16' : 'var(--bg-primary)',
                borderTop: `2px solid ${saveSuccess ? '#10b981' : 'var(--border-primary)'}`,
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                marginTop: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {saving && (
                        <>
                            <Loader2 className="animate-spin" size={18} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Saving changes...</span>
                        </>
                    )}
                    {!saving && saveSuccess && (
                        <>
                            <Check size={20} style={{ color: '#10b981' }} />
                            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>All changes saved successfully!</span>
                        </>
                    )}
                    {!saving && !saveSuccess && (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            Editing: <strong style={{ color: 'var(--text-secondary)' }}>{pageLabel}</strong>
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* ── Export button ── */}
                    <button
                        type="button"
                        onClick={handleExport}
                        title="Export all section data to Excel (.xlsx)"
                        style={{
                            padding: '9px 16px', fontSize: '13px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)', cursor: 'pointer'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export .xlsx
                    </button>

                    {/* ── Import button ── */}
                    <label
                        title="Import section data from Excel"
                        style={{
                            padding: '9px 16px', fontSize: '13px', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            backgroundColor: importing ? 'var(--bg-secondary)' : '#059669',
                            color: importing ? 'var(--text-tertiary)' : 'white',
                            border: '1px solid transparent',
                            borderRadius: 'var(--radius-md)', cursor: 'pointer'
                        }}
                    >
                        {importing
                            ? <Loader2 size={14} className="animate-spin" />
                            : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 14 12 9 17 14" />
                                    <line x1="12" y1="9" x2="12" y2="21" />
                                </svg>
                            )
                        }
                        {importing ? 'Importing…' : 'Import .xlsx'}
                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={handleImportFile}
                        />
                    </label>

                    {/* ── Save button ── */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary"
                        style={{
                            padding: '10px 28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: saveSuccess ? '#10b981' : undefined,
                            transition: 'background-color 0.3s ease',
                            boxShadow: '0 2px 12px rgba(99,102,241,0.4)'
                        }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : (saveSuccess ? <Check size={18} /> : <Save size={18} />)}
                        {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    background-color: var(--bg-elevated);
                    color: var(--text-primary);
                    transition: border-color 0.2s;
                }
                .form-control:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
                .btn-danger {
                    background-color: #ef444415;
                    color: #ef4444;
                    border: 1px solid #ef444430;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }
                .btn-danger:hover { background-color: #ef444425; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}

export default PageSettingsManager;
