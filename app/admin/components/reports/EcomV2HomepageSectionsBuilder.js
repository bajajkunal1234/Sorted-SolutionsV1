'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Copy,
    Film,
    Image as ImageIcon,
    Upload,
    RefreshCw,
    Info,
    Search,
    Check,
    Eye,
    Smartphone,
    Monitor,
    Layout,
    Layers,
    Video,
    Sparkles
} from 'lucide-react';
import { V2_CATEGORIES, formatINR } from '@/lib/v2/catalogConfig';
import { uploadClientMedia } from '@/lib/v2/clientUpload';
import {
    HOMEPAGE_SECTION_TYPES,
    SECTION_THEMES,
    getLayoutsForType,
    getLayoutMeta,
    sanitizeHomepageSection
} from '@/lib/v2/homepageSectionsConfig';
import HomepageSections from '@/components/v2/HomepageSections';
import '@/app/v2/v2.css';

const LINK_PRESETS = [
    { label: 'All Services', url: '/v2/services' },
    { label: 'AC Repair & Foam Jet', url: '/v2/services/ac-repair' },
    { label: 'Washing Machine Repair', url: '/v2/services/washing-machine-repair' },
    { label: 'Refrigerator Service', url: '/v2/services/refrigerator-repair' },
    { label: 'Oven & Microwave Repair', url: '/v2/services/oven-repair' },
    { label: 'Water Purifier RO Service', url: '/v2/services/water-purifier-repair' },
    { label: 'Hob & Chimney Service', url: '/v2/services/hob-repair' },
    { label: 'AMC & Care Plans', url: '/v2/customer?tab=plans' }
];

function LayoutSchematic({ layoutId }) {
    const box = { background: 'currentColor', borderRadius: 2, opacity: 0.78 };
    const dim = { background: 'currentColor', borderRadius: 2, opacity: 0.28 };

    switch (layoutId) {
        case 'peek_center':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 28 }}>
                    <div style={{ ...dim, width: 10, height: 18 }} />
                    <div style={{ ...box, width: 24, height: 24 }} />
                    <div style={{ ...dim, width: 10, height: 18 }} />
                </div>
            );
        case 'spotlight_wide':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 28 }}>
                    <div style={{ ...dim, width: 10, height: 20 }} />
                    <div style={{ ...box, width: 26, height: 22 }} />
                    <div style={{ ...dim, width: 10, height: 20 }} />
                </div>
            );
        case 'layered_pyramid':
            return (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                    <div style={{ ...dim, width: 14, height: 16, marginRight: -5 }} />
                    <div style={{ ...dim, width: 16, height: 20, marginRight: -6, opacity: 0.45 }} />
                    <div style={{ ...box, width: 18, height: 24, zIndex: 2 }} />
                    <div style={{ ...dim, width: 16, height: 20, marginLeft: -6, opacity: 0.45 }} />
                    <div style={{ ...dim, width: 14, height: 16, marginLeft: -5 }} />
                </div>
            );
        case 'curved_arc':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: 28 }}>
                    <div style={{ ...dim, width: 10, height: 22, transform: 'skewY(6deg)' }} />
                    <div style={{ ...box, width: 14, height: 20, transform: 'skewY(2deg)' }} />
                    <div style={{ ...box, width: 14, height: 20, transform: 'skewY(-2deg)' }} />
                    <div style={{ ...dim, width: 10, height: 22, transform: 'skewY(-6deg)' }} />
                </div>
            );
        case 'coverflow_deck':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                    <div style={{ ...dim, width: 12, height: 16, marginRight: -4 }} />
                    <div style={{ ...box, width: 20, height: 22, zIndex: 2, border: '1.5px solid #fff' }} />
                    <div style={{ ...dim, width: 12, height: 16, marginLeft: -4 }} />
                </div>
            );
        case 'diagonal_cascade':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: 28 }}>
                    <div style={{ ...dim, width: 11, height: 16, transform: 'translateY(-4px)' }} />
                    <div style={{ ...box, width: 14, height: 20 }} />
                    <div style={{ ...dim, width: 11, height: 16, transform: 'translateY(4px)' }} />
                </div>
            );
        case 'grid_2row':
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 12px)', gap: 2, justifyContent: 'center', alignContent: 'center', height: 28 }}>
                    {[0, 1, 2, 3, 4, 5].map(i => <div key={i} style={{ ...box, height: 10 }} />)}
                </div>
            );
        case 'poster_cards':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 28 }}>
                    <div style={{ ...box, width: 13, height: 24 }} />
                    <div style={{ ...box, width: 13, height: 24 }} />
                    <div style={{ ...dim, width: 13, height: 24 }} />
                </div>
            );
        case 'spotlight_split':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 28 }}>
                    <div style={{ ...box, width: 20, height: 24 }} />
                    <div style={{ ...dim, width: 11, height: 18 }} />
                    <div style={{ ...dim, width: 11, height: 18 }} />
                </div>
            );
        case 'vertical_reels_peek':
        case 'vertical_stacked_deck':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: 28 }}>
                    <div style={{ ...dim, width: 20, height: 5 }} />
                    <div style={{ ...box, width: 24, height: 14 }} />
                    <div style={{ ...dim, width: 20, height: 5 }} />
                </div>
            );
        case 'vertical_story_split':
        case 'split_left_media':
        case 'split_video_showcase':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 28 }}>
                    <div style={{ ...box, width: 20, height: 20 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ ...box, width: 20, height: 4 }} />
                        <div style={{ ...dim, width: 16, height: 4 }} />
                        <div style={{ ...dim, width: 12, height: 5 }} />
                    </div>
                </div>
            );
        case 'split_right_media':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 28 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ ...box, width: 20, height: 4 }} />
                        <div style={{ ...dim, width: 16, height: 4 }} />
                    </div>
                    <div style={{ ...box, width: 20, height: 20 }} />
                </div>
            );
        case 'vertical_accordion_list':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: 28 }}>
                    <div style={{ ...box, width: 34, height: 12 }} />
                    <div style={{ ...dim, width: 34, height: 5 }} />
                    <div style={{ ...dim, width: 34, height: 5 }} />
                </div>
            );
        case 'vertical_reel_9_16':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 28 }}>
                    <div style={{ ...box, width: 14, height: 24 }} />
                    <div style={{ ...dim, width: 18, height: 12 }} />
                </div>
            );
        case 'full_bleed':
        case 'full_bleed_video':
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                    <div style={{ ...box, width: '100%', height: 20, borderRadius: 0 }} />
                </div>
            );
        default:
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 28 }}>
                    <div style={{ ...box, width: 14, height: 20 }} />
                    <div style={{ ...box, width: 14, height: 20 }} />
                    <div style={{ ...dim, width: 14, height: 20 }} />
                </div>
            );
    }
}

export default function EcomV2HomepageSectionsBuilder({ sections = [], onChange }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [webServices, setWebServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [serviceQuery, setServiceQuery] = useState('');
    const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
    const [previewDevice, setPreviewDevice] = useState('mobile');
    const [uploadingKey, setUploadingKey] = useState(null); // 'banner' | `item-${idx}`

    const bannerInputRef = useRef(null);
    const itemInputRef = useRef(null);
    const pendingItemIdxRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        setLoadingServices(true);
        fetch('/api/v2/services')
            .then(r => r.json())
            .then(json => {
                if (mounted && json.success) {
                    setWebServices(json.services || []);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (mounted) setLoadingServices(false);
            });
        return () => { mounted = false; };
    }, []);

    const safeIdx = sections.length > 0 ? Math.min(activeIdx, sections.length - 1) : 0;
    const currentSection = sections[safeIdx] ? sanitizeHomepageSection(sections[safeIdx], safeIdx) : null;

    const updateSections = (nextList) => {
        onChange(nextList.map((s, idx) => sanitizeHomepageSection({ ...s, order: idx + 1 }, idx)));
    };

    const handleAddSection = (type) => {
        const layouts = getLayoutsForType(type);
        const typeMeta = HOMEPAGE_SECTION_TYPES.find(t => t.id === type);
        const countOfType = sections.filter(s => s.type === type).length + 1;

        const newSec = sanitizeHomepageSection({
            id: `sec-${Date.now().toString(36)}`,
            type,
            layout: layouts[0].id,
            theme: 'light',
            enabled: true,
            title: type === 'horizontal_carousel'
                ? `Featured Services ${countOfType > 1 ? `#${countOfType}` : ''}`.trim()
                : type === 'vertical_carousel'
                ? `Spotlight Showcase`
                : type === 'video_banner'
                ? `See Sorted in Action`
                : `Seasonal Offer`,
            description: '',
            ctaText: type.includes('carousel') ? 'View all' : '',
            ctaLink: '/v2/services',
            mediaType: type === 'video_banner' ? 'video' : 'image',
            mediaUrl: type === 'media_banner' ? '/images/banners/banner_speed_90_mins.png' : '',
            items: []
        }, sections.length);

        const next = [...sections, newSec];
        updateSections(next);
        setActiveIdx(next.length - 1);
    };

    const updateCurrentSection = (patch) => {
        if (!currentSection) return;
        const next = [...sections];
        next[safeIdx] = { ...currentSection, ...patch };
        updateSections(next);
    };

    const handleMoveSection = (from, to) => {
        if (to < 0 || to >= sections.length) return;
        const next = [...sections];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        updateSections(next);
        setActiveIdx(to);
    };

    const handleDuplicateSection = (idx) => {
        const src = sections[idx];
        if (!src) return;
        const copy = sanitizeHomepageSection({
            ...src,
            id: `sec-${Date.now().toString(36)}`,
            title: src.title ? `${src.title} (Copy)` : 'Copied Section'
        }, sections.length);
        const next = [...sections];
        next.splice(idx + 1, 0, copy);
        updateSections(next);
        setActiveIdx(idx + 1);
    };

    const handleDeleteSection = (idx) => {
        if (!confirm('Remove this homepage section?')) return;
        const next = sections.filter((_, i) => i !== idx);
        updateSections(next);
        setActiveIdx(Math.max(0, idx - 1));
    };

    // Service picker filtering
    const filteredServices = useMemo(() => {
        const q = serviceQuery.trim().toLowerCase();
        return webServices.filter(svc => {
            if (serviceCategoryFilter !== 'all' && svc.categorySlug !== serviceCategoryFilter) return false;
            if (!q) return true;
            return (
                svc.name?.toLowerCase().includes(q) ||
                svc.categoryName?.toLowerCase().includes(q) ||
                svc.subgroup?.toLowerCase().includes(q)
            );
        });
    }, [webServices, serviceQuery, serviceCategoryFilter]);

    const selectedServiceIds = useMemo(() => {
        const set = new Set();
        (currentSection?.items || []).forEach(it => {
            if (it.serviceId) set.add(String(it.serviceId));
        });
        return set;
    }, [currentSection]);

    const handleToggleServiceInCarousel = (svc) => {
        if (!currentSection) return;
        const idStr = String(svc.id);
        const exists = selectedServiceIds.has(idStr);
        if (exists) {
            updateCurrentSection({
                items: currentSection.items.filter(it => String(it.serviceId) !== idStr)
            });
        } else {
            updateCurrentSection({
                items: [
                    ...currentSection.items,
                    {
                        id: `item-${Date.now().toString(36)}-${svc.id}`,
                        serviceId: idStr,
                        title: '',
                        subtitle: '',
                        badge: '',
                        mediaType: 'image',
                        mediaUrl: '',
                        linkUrl: ''
                    }
                ]
            });
        }
    };

    const handleAddCustomMediaItem = () => {
        if (!currentSection) return;
        updateCurrentSection({
            items: [
                ...currentSection.items,
                {
                    id: `item-${Date.now().toString(36)}`,
                    serviceId: '',
                    title: 'Featured Highlight',
                    subtitle: '90-min arrival • Mumbai',
                    badge: 'NEW',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    linkUrl: '/v2/services'
                }
            ]
        });
    };

    const handleUpdateItem = (itemIdx, patch) => {
        if (!currentSection) return;
        const nextItems = [...currentSection.items];
        nextItems[itemIdx] = { ...nextItems[itemIdx], ...patch };
        updateCurrentSection({ items: nextItems });
    };

    const handleMoveItem = (from, to) => {
        if (!currentSection || to < 0 || to >= currentSection.items.length) return;
        const nextItems = [...currentSection.items];
        const [moved] = nextItems.splice(from, 1);
        nextItems.splice(to, 0, moved);
        updateCurrentSection({ items: nextItems });
    };

    const handleRemoveItem = (itemIdx) => {
        if (!currentSection) return;
        updateCurrentSection({
            items: currentSection.items.filter((_, i) => i !== itemIdx)
        });
    };

    const handleUploadMedia = async (file, target, itemIdx = null) => {
        if (!file || !currentSection) return;
        const isVideo = file.type.startsWith('video/');
        const isGif = file.type === 'image/gif';
        const maxBytes = isVideo ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
        if (file.size > maxBytes) {
            alert(`File exceeds max limit (${isVideo ? '15 MB for video' : '8 MB for image/GIF'}).`);
            return;
        }

        const key = target === 'banner' ? 'banner' : `item-${itemIdx}`;
        setUploadingKey(key);
        try {
            const url = await uploadClientMedia(file, {
                folder: 'ecom-v2/homepage-sections',
                bucket: 'website-assets',
                preserveFormat: true
            });
            const detectedType = isVideo ? 'video' : isGif ? 'gif' : 'image';

            if (target === 'banner') {
                updateCurrentSection({ mediaUrl: url, mediaType: detectedType });
            } else if (itemIdx !== null) {
                handleUpdateItem(itemIdx, { mediaUrl: url, mediaType: detectedType });
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploadingKey(null);
        }
    };

    const currentLayoutMeta = currentSection
        ? getLayoutMeta(currentSection.type, currentSection.layout)
        : null;
    const availableLayouts = currentSection ? getLayoutsForType(currentSection.type) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadMedia(file, 'banner');
                    e.target.value = '';
                }}
            />
            <input
                ref={itemInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && pendingItemIdxRef.current !== null) {
                        handleUploadMedia(file, 'item', pendingItemIdxRef.current);
                    }
                    pendingItemIdxRef.current = null;
                    e.target.value = '';
                }}
            />

            {/* Top Add-Section Action Bar */}
            <div style={{
                padding: 18,
                borderRadius: 14,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Layers size={18} color="#6338f5" />
                        <span>Homepage Sections Builder</span>
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        Design your <code>/v2</code> homepage stack section by section (Horizontal Carousels, Vertical Carousels, Image/GIF Banners &amp; Video Sections). Remember to click <strong>Save Changes</strong> above when done.
                    </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {HOMEPAGE_SECTION_TYPES.map(st => (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => handleAddSection(st.id)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 13px',
                                borderRadius: 9,
                                border: '1px solid rgba(99,56,245,0.35)',
                                backgroundColor: 'rgba(99,56,245,0.08)',
                                color: '#6338f5',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={14} /> {st.shortLabel}
                        </button>
                    ))}
                </div>
            </div>

            {sections.length === 0 ? (
                <div style={{
                    padding: '44px 24px',
                    borderRadius: 16,
                    border: '2px dashed var(--border-primary)',
                    background: 'var(--bg-elevated)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                }}>
                    <Sparkles size={32} color="#6338f5" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                        No Custom Homepage Sections Added Yet
                    </h3>
                    <p style={{ margin: '0 auto 18px', maxWidth: 500, fontSize: 13 }}>
                        Right now <code>/v2</code> shows the default &quot;Most Booked Packages&quot; grid below the category tiles. Add your first Horizontal Carousel, Vertical Carousel, Banner, or Video section above to build a custom homepage!
                    </p>
                </div>
            ) : (
                <div className="ecom-v2-sidebar-grid">
                    {/* Left Sidebar: Ordered Homepage Stack */}
                    <div style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 14,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 4px 6px' }}>
                            Page Order ({sections.length} {sections.length === 1 ? 'Section' : 'Sections'})
                        </div>

                        {sections.map((sec, idx) => {
                            const isActive = idx === safeIdx;
                            const typeInfo = HOMEPAGE_SECTION_TYPES.find(t => t.id === sec.type);
                            const layoutMeta = getLayoutMeta(sec.type, sec.layout);
                            return (
                                <div
                                    key={sec.id || idx}
                                    onClick={() => setActiveIdx(idx)}
                                    style={{
                                        padding: '10px 11px',
                                        borderRadius: 10,
                                        border: isActive ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                                        background: isActive ? 'rgba(99,56,245,0.08)' : 'var(--bg-primary)',
                                        cursor: 'pointer',
                                        opacity: sec.enabled === false ? 0.55 : 1
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6338f5', textTransform: 'uppercase' }}>
                                            #{idx + 1} · {typeInfo?.shortLabel}
                                        </span>
                                        {sec.enabled === false && (
                                            <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                                                HIDDEN
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '3px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {sec.title || '(Untitled Section)'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {layoutMeta?.name}
                                        {(sec.type === 'horizontal_carousel' || sec.type === 'vertical_carousel') && ` · ${(sec.items || []).length} items`}
                                    </div>

                                    <div
                                        style={{ display: 'flex', gap: 4, marginTop: 8 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button type="button" title="Move Up" disabled={idx === 0} onClick={() => handleMoveSection(idx, idx - 1)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>
                                            <ArrowUp size={12} />
                                        </button>
                                        <button type="button" title="Move Down" disabled={idx === sections.length - 1} onClick={() => handleMoveSection(idx, idx + 1)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', cursor: idx === sections.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === sections.length - 1 ? 0.4 : 1 }}>
                                            <ArrowDown size={12} />
                                        </button>
                                        <button type="button" title="Duplicate Section" onClick={() => handleDuplicateSection(idx)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', cursor: 'pointer' }}>
                                            <Copy size={12} />
                                        </button>
                                        <button type="button" title="Delete Section" onClick={() => handleDeleteSection(idx)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', marginLeft: 'auto' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Area: Active Section Editor + Live Preview */}
                    {currentSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
                            {/* Section Settings Card */}
                            <div style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 14,
                                padding: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                            }}>
                                {/* Header & Enable Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border-primary)' }}>
                                    <div>
                                        <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                                            Editing Section #{safeIdx + 1}
                                        </strong>
                                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                            ({HOMEPAGE_SECTION_TYPES.find(t => t.id === currentSection.type)?.label})
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <select
                                            value={currentSection.theme}
                                            onChange={(e) => updateCurrentSection({ theme: e.target.value })}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: 12,
                                                fontWeight: 600
                                            }}
                                        >
                                            {SECTION_THEMES.map(t => (
                                                <option key={t.id} value={t.id}>Theme: {t.label}</option>
                                            ))}
                                        </select>

                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: currentSection.enabled ? '#10b981' : '#ef4444' }}>
                                            <input
                                                type="checkbox"
                                                checked={currentSection.enabled !== false}
                                                onChange={(e) => updateCurrentSection({ enabled: e.target.checked })}
                                                style={{ accentColor: '#10b981' }}
                                            />
                                            <span>{currentSection.enabled !== false ? 'Visible on /v2' : 'Hidden'}</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Title + Optional Description + CTA Button */}
                                <div className="ecom-v2-form-grid-2col">
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            Section Title
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSection.title}
                                            onChange={(e) => updateCurrentSection({ title: e.target.value })}
                                            placeholder="e.g. Summer AC Deep Clean Specials"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: 13,
                                                fontWeight: 600
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            CTA Button Text (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSection.ctaText}
                                            onChange={(e) => updateCurrentSection({ ctaText: e.target.value })}
                                            placeholder="Leave empty to hide CTA button"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: 13
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="ecom-v2-form-grid-2col">
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                            Description Box (Optional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={currentSection.description}
                                            onChange={(e) => updateCurrentSection({ description: e.target.value })}
                                            placeholder="Short subtitle or offer explanation shown under the title..."
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: 12.5,
                                                resize: 'vertical'
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
                                                value={currentSection.ctaLink}
                                                onChange={(e) => updateCurrentSection({ ctaLink: e.target.value })}
                                                placeholder="/v2/services/ac-repair"
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 12,
                                                    fontFamily: 'monospace'
                                                }}
                                            />
                                            <select
                                                value=""
                                                onChange={(e) => { if (e.target.value) updateCurrentSection({ ctaLink: e.target.value }); }}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: 12
                                                }}
                                            >
                                                <option value="" disabled>Presets</option>
                                                {LINK_PRESETS.map(p => <option key={p.url} value={p.url}>{p.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Layout Picker Grid */}
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        <Layout size={15} color="#6338f5" />
                                        <span>Choose Layout Style ({availableLayouts.length} options available)</span>
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
                                        {availableLayouts.map(lay => {
                                            const selected = currentSection.layout === lay.id;
                                            return (
                                                <button
                                                    key={lay.id}
                                                    type="button"
                                                    onClick={() => updateCurrentSection({ layout: lay.id })}
                                                    style={{
                                                        padding: 10,
                                                        borderRadius: 10,
                                                        border: selected ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                                                        background: selected ? 'rgba(99,56,245,0.08)' : 'var(--bg-primary)',
                                                        color: selected ? '#6338f5' : 'var(--text-primary)',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: selected ? '#6338f5' : 'rgba(100,116,139,0.16)', color: selected ? '#fff' : 'var(--text-secondary)' }}>
                                                            {lay.badge}
                                                        </span>
                                                        {selected && <Check size={13} color="#6338f5" />}
                                                    </div>
                                                    <LayoutSchematic layoutId={lay.id} />
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{lay.name}</div>
                                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>{lay.desc}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Dynamic Ratio & Pixel Guide Box */}
                                {currentLayoutMeta && (
                                    <div style={{
                                        padding: '12px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(99,56,245,0.06)',
                                        border: '1px solid rgba(99,56,245,0.22)',
                                        fontSize: 12,
                                        lineHeight: 1.5
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#6338f5', marginBottom: 4 }}>
                                            <Info size={14} />
                                            <span>Image / GIF / Video Upload Guide for &quot;{currentLayoutMeta.name}&quot;</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: 'var(--text-secondary)', fontSize: 11.5 }}>
                                            <span><strong>Aspect Ratio:</strong> {currentLayoutMeta.ratio}</span>
                                            <span><strong>Recommended Pixels:</strong> {currentLayoutMeta.pixels}</span>
                                            <span><strong>Format &amp; Limits:</strong> {currentLayoutMeta.maxSize}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Media Uploader for Image/GIF Banner & Video Showcase */}
                                {(currentSection.type === 'media_banner' || currentSection.type === 'video_banner') && (
                                    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                            <strong style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {currentSection.type === 'video_banner' ? <Video size={15} color="#6338f5" /> : <ImageIcon size={15} color="#6338f5" />}
                                                <span>{currentSection.type === 'video_banner' ? 'Upload Section Video (MP4 / WebM)' : 'Upload Section Image or Animated GIF'}</span>
                                            </strong>

                                            <button
                                                type="button"
                                                onClick={() => bannerInputRef.current?.click()}
                                                disabled={uploadingKey === 'banner'}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '8px 14px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    background: '#6338f5',
                                                    color: '#fff',
                                                    fontSize: 12.5,
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {uploadingKey === 'banner' ? <><RefreshCw size={13} className="animate-spin" /> Uploading...</> : <><Upload size={13} /> Upload File</>}
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={currentSection.mediaUrl}
                                            onChange={(e) => updateCurrentSection({ mediaUrl: e.target.value })}
                                            placeholder="https://... or /images/banners/..."
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-primary)',
                                                background: 'var(--bg-elevated)',
                                                color: 'var(--text-primary)',
                                                fontSize: 12,
                                                fontFamily: 'monospace'
                                            }}
                                        />

                                        {currentSection.type === 'video_banner' && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={currentSection.autoplay} onChange={(e) => updateCurrentSection({ autoplay: e.target.checked })} /> Autoplay
                                                </label>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={currentSection.muted} onChange={(e) => updateCurrentSection({ muted: e.target.checked })} /> Muted (recommended for autoplay)
                                                </label>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={currentSection.loop} onChange={(e) => updateCurrentSection({ loop: e.target.checked })} /> Loop
                                                </label>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={currentSection.controls} onChange={(e) => updateCurrentSection({ controls: e.target.checked })} /> Show Player Controls
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Carousel Items Manager + Service Multi-Picker */}
                                {(currentSection.type === 'horizontal_carousel' || currentSection.type === 'vertical_carousel') && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {/* Service Picker */}
                                        <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                                <strong style={{ fontSize: 13 }}>Select Services for This Carousel</strong>
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomMediaItem}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                        padding: '5px 10px',
                                                        borderRadius: 7,
                                                        border: '1px solid var(--border-primary)',
                                                        background: 'var(--bg-elevated)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 11.5,
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Plus size={13} /> Add Custom Media Card
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                                                    <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-secondary)' }} />
                                                    <input
                                                        type="text"
                                                        value={serviceQuery}
                                                        onChange={(e) => setServiceQuery(e.target.value)}
                                                        placeholder="Search published web services..."
                                                        style={{
                                                            width: '100%',
                                                            padding: '7px 10px 7px 30px',
                                                            borderRadius: 8,
                                                            border: '1px solid var(--border-primary)',
                                                            background: 'var(--bg-elevated)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: 12
                                                        }}
                                                    />
                                                </div>
                                                <select
                                                    value={serviceCategoryFilter}
                                                    onChange={(e) => setServiceCategoryFilter(e.target.value)}
                                                    style={{
                                                        padding: '7px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid var(--border-primary)',
                                                        background: 'var(--bg-elevated)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 12
                                                    }}
                                                >
                                                    <option value="all">All Categories</option>
                                                    {V2_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            {loadingServices ? (
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 12 }}>Loading published services...</div>
                                            ) : (
                                                <div style={{ maxHeight: 190, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                                                    {filteredServices.slice(0, 40).map(svc => {
                                                        const isAdded = selectedServiceIds.has(String(svc.id));
                                                        return (
                                                            <button
                                                                key={svc.id}
                                                                type="button"
                                                                onClick={() => handleToggleServiceInCarousel(svc)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 8,
                                                                    padding: '6px 8px',
                                                                    borderRadius: 8,
                                                                    border: isAdded ? '1.5px solid #10b981' : '1px solid var(--border-primary)',
                                                                    background: isAdded ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                                                                    color: 'var(--text-primary)',
                                                                    textAlign: 'left',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <img
                                                                    src={svc.web_details?.thumbnail_image || svc.image || svc.images?.[0] || '/images/services/ac_3d.png'}
                                                                    alt=""
                                                                    style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                                                                />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {svc.name}
                                                                    </div>
                                                                    <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                                                                        {formatINR(svc.price)} · {svc.categoryName}
                                                                    </div>
                                                                </div>
                                                                <span style={{ fontSize: 10.5, fontWeight: 800, color: isAdded ? '#10b981' : '#6338f5' }}>
                                                                    {isAdded ? '✓ Added' : '+ Add'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Configured Items List with Custom Image/GIF/Video Upload per Item */}
                                        {(currentSection.items || []).length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <strong style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                                    Carousel Cards ({currentSection.items.length}) — Upload custom Image, GIF or Video per card if desired:
                                                </strong>

                                                {currentSection.items.map((item, iIdx) => {
                                                    const linkedSvc = item.serviceId ? webServices.find(s => String(s.id) === String(item.serviceId)) : null;
                                                    return (
                                                        <div key={item.id || iIdx} style={{
                                                            padding: 10,
                                                            borderRadius: 10,
                                                            border: '1px solid var(--border-primary)',
                                                            background: 'var(--bg-primary)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 8
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                                                                    #{iIdx + 1} · {linkedSvc ? `Service: ${linkedSvc.name}` : 'Custom Media Card'}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    <button type="button" disabled={iIdx === 0} onClick={() => handleMoveItem(iIdx, iIdx - 1)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', cursor: 'pointer' }}>
                                                                        <ArrowUp size={12} />
                                                                    </button>
                                                                    <button type="button" disabled={iIdx === currentSection.items.length - 1} onClick={() => handleMoveItem(iIdx, iIdx + 1)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', cursor: 'pointer' }}>
                                                                        <ArrowDown size={12} />
                                                                    </button>
                                                                    <button type="button" onClick={() => handleRemoveItem(iIdx)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer' }}>
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
                                                                <input
                                                                    type="text"
                                                                    value={item.title}
                                                                    onChange={(e) => handleUpdateItem(iIdx, { title: e.target.value })}
                                                                    placeholder={linkedSvc ? `Override title (${linkedSvc.name})` : 'Card Title'}
                                                                    style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={item.subtitle}
                                                                    onChange={(e) => handleUpdateItem(iIdx, { subtitle: e.target.value })}
                                                                    placeholder="Subtitle / Tagline (optional)"
                                                                    style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={item.badge}
                                                                    onChange={(e) => handleUpdateItem(iIdx, { badge: e.target.value })}
                                                                    placeholder="Badge e.g. 20% OFF"
                                                                    style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                                />
                                                            </div>

                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        pendingItemIdxRef.current = iIdx;
                                                                        itemInputRef.current?.click();
                                                                    }}
                                                                    disabled={uploadingKey === `item-${iIdx}`}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 5,
                                                                        padding: '6px 10px',
                                                                        borderRadius: 6,
                                                                        border: 'none',
                                                                        background: '#6338f5',
                                                                        color: '#fff',
                                                                        fontSize: 11.5,
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {uploadingKey === `item-${iIdx}` ? <><RefreshCw size={12} className="animate-spin" /> Uploading...</> : <><Film size={12} /> Upload Image/GIF/Video</>}
                                                                </button>

                                                                <input
                                                                    type="text"
                                                                    value={item.mediaUrl}
                                                                    onChange={(e) => handleUpdateItem(iIdx, { mediaUrl: e.target.value })}
                                                                    placeholder="Custom media URL (leave blank to use service thumbnail)"
                                                                    style={{ flex: 1, minWidth: 160, padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 11.5, fontFamily: 'monospace' }}
                                                                />

                                                                {!linkedSvc && (
                                                                    <input
                                                                        type="text"
                                                                        value={item.linkUrl}
                                                                        onChange={(e) => handleUpdateItem(iIdx, { linkUrl: e.target.value })}
                                                                        placeholder="Click Link e.g. /v2/services"
                                                                        style={{ width: 160, padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 11.5, fontFamily: 'monospace' }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Live Section Preview */}
                            <div style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 14,
                                padding: 16
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        <Eye size={16} color="#6338f5" />
                                        <span>Live Section Preview</span>
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
                                                background: previewDevice === 'mobile' ? 'rgba(99,56,245,0.1)' : 'transparent',
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
                                                background: previewDevice === 'desktop' ? 'rgba(99,56,245,0.1)' : 'transparent',
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

                                <div style={{
                                    maxWidth: previewDevice === 'mobile' ? 400 : '100%',
                                    margin: previewDevice === 'mobile' ? '0 auto' : '0',
                                    borderRadius: 14,
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div className="v2-root" style={{ minHeight: 'auto' }}>
                                        <HomepageSections
                                            sections={[currentSection]}
                                            services={webServices}
                                            preview={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
