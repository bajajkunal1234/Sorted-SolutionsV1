'use client'

import { useState, useEffect } from 'react';
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
    Check
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

// â”€â”€ Subcategories Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SubcategoriesTab({ settings, updateSection, addItem, removeItem, updateItem }) {
    const subcats = settings.subcategories_settings || { items: [] };

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                    <input
                        type="text"
                        value={subcats.title || ''}
                        onChange={(e) => updateSection('subcategories_settings', 'title', e.target.value)}
                        className="form-control"
                        placeholder="e.g. Washing Machine Services"
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

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600 }}>Subcategory Cards</label>
                    <button onClick={() => addItem('subcategories_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                        <Plus size={14} /> Add Subcategory
                    </button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {subcats.items.map((item, index) => (
                        <div key={index} style={{
                            padding: '16px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-primary)',
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr auto',
                            gap: '16px',
                            alignItems: 'start'
                        }}>
                            {/* Image Preview / Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{
                                    width: '120px',
                                    height: '80px',
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {item.image ? (
                                        <img src={item.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <ImageIcon size={24} style={{ opacity: 0.3 }} />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Image URL"
                                    value={item.image || ''}
                                    onChange={(e) => updateItem('subcategories_settings', index, 'image', e.target.value)}
                                    style={{ fontSize: '11px', padding: '4px', width: '100%' }}
                                />
                            </div>

                            {/* Content Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Title</label>
                                    <input
                                        type="text"
                                        value={item.title || ''}
                                        onChange={(e) => updateItem('subcategories_settings', index, 'title', e.target.value)}
                                        className="form-control"
                                        placeholder="e.g. Front Load Repair"
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Description / Subtitle</label>
                                    <input
                                        type="text"
                                        value={item.description || ''}
                                        onChange={(e) => updateItem('subcategories_settings', index, 'description', e.target.value)}
                                        className="form-control"
                                        placeholder="Brief details about this type"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Price (â‚¹)</label>
                                    <input
                                        type="number"
                                        value={item.price || ''}
                                        onChange={(e) => updateItem('subcategories_settings', index, 'price', e.target.value)}
                                        className="form-control"
                                        placeholder="599"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Slug / Path</label>
                                    <input
                                        type="text"
                                        value={item.slug || ''}
                                        onChange={(e) => updateItem('subcategories_settings', index, 'slug', e.target.value)}
                                        className="form-control"
                                        placeholder="front-load"
                                    />
                                </div>
                            </div>

                            <button onClick={() => removeItem('subcategories_settings', index)} className="btn btn-danger" style={{ marginTop: '4px' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {subcats.items.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>No custom subcategories added. The page will use default fallbacks.</p>
                            <button onClick={() => addItem('subcategories_settings')} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                                <Plus size={14} /> Add First Subcategory
                            </button>
                        </div>
                    )}
                </div>
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

// â”€â”€ Main PageSettingsManager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PageSettingsManager({ pageId, pageLabel, pageUrl }) {
    const [activeTab, setActiveTab] = useState('hero');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const [globalFaqs, setGlobalFaqs] = useState([]);
    const [globalBrands, setGlobalBrands] = useState([]);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [sectionVisibility, setSectionVisibility] = useState({
        hero: true, problems: true, services: true,
        localities: true, brands: true, faqs: true, subcategories: true
    });

    // Search states
    const [brandSearch, setBrandSearch] = useState('');
    const [faqSearch, setFaqSearch] = useState('');
    const [fetchError, setFetchError] = useState(null);

    // Unified fetch effect
    useEffect(() => {
        if (pageId) {
            fetchSettings();
            fetchGlobalData();
        }
    }, [pageId]);

    const fetchSettings = async () => {
        if (!pageId) return;
        setLoading(true);
        try {
            console.log(`[ST-DEBUG] Fetching settings for ${pageId}...`);
            const res = await fetch(`/api/settings/page/${pageId}`, { cache: 'no-store' });
            const data = await res.json();

            if (data.success) {
                const d = data.data;

                // If no row exists yet (new page), use defaults so admin can save for the first time
                if (!d) {
                    console.warn('[ST-DEBUG] No data returned from API for', pageId, '- initializing with defaults');
                }

                console.log('[ST-DEBUG] Loaded page settings. Row ID check:', d?.id || 'NEW PAGE');

                // Robust initialization with defaults (works for both existing and new pages)
                const initialized = {
                    ...(d || {}),
                    page_id: pageId,
                    hero_settings: { ...DEFAULT_HERO, ...(d?.hero_settings || {}) },
                    problems_settings: {
                        title: 'Problems We Solve',
                        subtitle: 'Common issues we fix',
                        items: [],
                        ...(d?.problems_settings || {})
                    },
                    services_settings: {
                        title: 'Our Services',
                        subtitle: 'Best in class services',
                        items: [],
                        ...(d?.services_settings || {})
                    },
                    localities_settings: {
                        title: 'Areas We Serve',
                        subtitle: 'Find us near you',
                        items: [],
                        ...(d?.localities_settings || {})
                    },
                    brands_settings: {
                        title: 'Brands We Serve',
                        subtitle: 'Trusted by leading appliance manufacturers',
                        items: [],
                        ...(d?.brands_settings || {})
                    },
                    faqs_settings: {
                        title: 'Frequently Asked Questions',
                        subtitle: 'Find answers to common questions',
                        items: [],
                        ...(d?.faqs_settings || {})
                    },
                    subcategories_settings: {
                        title: 'Appliance Types',
                        subtitle: 'Choose your specific appliance',
                        items: [],
                        ...(d?.subcategories_settings || {})
                    }
                };

                setSettings(initialized);
                if (initialized.section_visibility) {
                    setSectionVisibility(prev => ({ ...prev, ...initialized.section_visibility }));
                }
                setFetchError(null);
            } else {
                console.error('[ST-DEBUG] Fetch failed:', data.error);
                setFetchError(data.error || 'Server returned failure status');
            }
        } catch (error) {
            console.error('[ST-DEBUG] Fetch error:', error);
            setFetchError(error.message || 'Network error or server crash');
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalData = async () => {
        try {
            console.log('[ST-DEBUG] Fetching global FAQs and Brands...');
            const [faqRes, brandRes] = await Promise.all([
                fetch('/api/settings/faqs'),
                fetch('/api/settings/brand-logos')
            ]);
            const faqData = await faqRes.json();
            const brandData = await brandRes.json();
            if (faqData.success) setGlobalFaqs(faqData.data);
            if (brandData.success) setGlobalBrands(brandData.data);
        } catch (error) {
            console.error('[ST-DEBUG] Error fetching global data:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);

        // --- LOUD DIAGNOSTICS ---
        console.log('%c[ST-DEBUG] SAVE TRIGGERED', 'background: #4f46e5; color: white; padding: 4px 8px; font-weight: bold;');
        console.log('[ST-DEBUG] Current raw settings state:', settings);
        console.log('[ST-DEBUG] Services count to send:', settings?.services_settings?.items?.length || 0);
        console.log('[ST-DEBUG] Problems count to send:', settings?.problems_settings?.items?.length || 0);

        if (settings?.services_settings?.items?.length === 0 && settings?.problems_settings?.items?.length === 0) {
            console.warn('[ST-DEBUG] WARNING: Saving with 0 items. Is this intended?');
        }

        try {
            const payload = { ...settings, section_visibility: sectionVisibility };
            console.log('%c[ST-DEBUG] FINAL PAYLOAD:', 'color: #10b981; font-weight: bold;', JSON.stringify(payload, null, 2));
            console.log('%c[ST-DEBUG] FETCH URL:', 'color: #10b981; font-weight: bold;', `/api/settings/page/${pageId}`);

            const res = await fetch(`/api/settings/page/${pageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Debug-Client': 'PageSettingsManager'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setSaveSuccess(true);
                await fetchSettings();
                setTimeout(() => setSaveSuccess(false), 3000);
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

    const tabs = [
        { id: 'hero', label: 'Hero Section', icon: Layout },
        { id: 'problems', label: 'Problems', icon: AlertCircle },
        { id: 'services', label: 'Services', icon: Tag },
        { id: 'localities', label: 'Localities', icon: MapPin },
        { id: 'brands', label: 'Brands', icon: ImageIcon },
        { id: 'subcategories', label: pageId.startsWith('cat-') ? 'Sub-Services' : 'Category Cards', icon: Layout },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle }
    ];
    // Map from tab id to section_visibility key
    const tabVisibilityKey = { hero: 'hero', problems: 'problems', services: 'services', localities: 'localities', brands: 'brands', subcategories: 'subcategories', faqs: 'faqs' };

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
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            ID: <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{pageId}</span>
                        </p>
                        {pageUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 600, margin: 0 }}>
                                    URL: <span style={{ fontFamily: 'monospace' }}>{pageUrl}</span>
                                </p>
                                <a
                                    href={pageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        color: 'white',
                                        backgroundColor: 'var(--color-primary)',
                                        padding: '2px 8px',
                                        borderRadius: '99px',
                                        textDecoration: 'none',
                                        fontWeight: 700
                                    }}
                                >
                                    <ExternalLink size={12} />
                                    View Live Page
                                </a>
                            </div>
                        )}
                    </div>
                </div>
                <button
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

                {/* ── HERO TAB ── */}
                {activeTab === 'hero' && (
                    <div>
                        <SectionVisibilityBanner sectionKey="hero" visible={sectionVisibility.hero} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.hero ? 1 : 0.45, pointerEvents: sectionVisibility.hero ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <HeroTab settings={settings} updateSection={updateSection} />
                        </div>
                    </div>
                )}

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

                {/* ── SUBCATEGORIES TAB ── */}
                {activeTab === 'subcategories' && (
                    <div>
                        <SectionVisibilityBanner sectionKey="subcategories" visible={sectionVisibility.subcategories} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.subcategories ? 1 : 0.45, pointerEvents: sectionVisibility.subcategories ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <SubcategoriesTab
                                settings={settings}
                                updateSection={updateSection}
                                addItem={addItem}
                                removeItem={removeItem}
                                updateItem={updateItem}
                            />
                        </div>
                    </div>
                )}

                {/* ── SERVICES TAB ── */}
                {activeTab === 'services' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <SectionVisibilityBanner sectionKey="services" visible={sectionVisibility.services} onToggle={toggleSectionVisibility} />
                        <div style={{ opacity: sectionVisibility.services ? 1 : 0.45, pointerEvents: sectionVisibility.services ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'grid', gap: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                    <input
                                        type="text"
                                        value={settings.services_settings.title}
                                        onChange={(e) => updateSection('services_settings', 'title', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                    <input
                                        type="text"
                                        value={settings.services_settings.subtitle}
                                        onChange={(e) => updateSection('services_settings', 'subtitle', e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <label style={{ fontWeight: 600 }}>Popular Services & Pricing</label>
                                    <button onClick={() => addItem('services_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        <Plus size={14} /> Add Service
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {settings.services_settings.items.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', alignItems: 'center' }}>
                                            <div style={{ flex: 2 }}>
                                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Service Name</label>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateItem('services_settings', index, 'name', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Starts From (₹)</label>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => updateItem('services_settings', index, 'price', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                                />
                                            </div>
                                            <button onClick={() => removeItem('services_settings', index)} className="btn btn-danger" style={{ marginTop: '20px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {settings.services_settings.items.length === 0 && (
                                        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>No services added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                <button
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

