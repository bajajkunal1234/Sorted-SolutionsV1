'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    Wrench,
    CheckCircle2,
    XCircle,
    HelpCircle,
    ShieldCheck,
    Tag,
    Star,
    MessageSquare,
    Sparkles,
    RotateCcw,
    Search,
    Check,
    X,
    Filter,
    RefreshCw,
    Bot
} from 'lucide-react';
import {
    classifyReview,
    detectTargetCategory,
    autoSelectReviewsForService,
    APPLIANCE_CATEGORIES
} from '@/lib/v2/reviewClassifier';

export const DEFAULT_WEB_DETAILS = {
    subgroup: '',
    badge: '',
    visible_sections: {
        our_process: true,
        whats_included: true,
        whats_not_included: true,
        what_we_need: true,
        warranty_note: true,
        all_brands: true,
        faqs: true,
        feedbacks: true
    },
    our_process: {
        title: 'Our Process',
        subtitle: 'Transparent doorstep inspection, upfront quote & 30-day warranty',
        steps: [
            { title: 'Doorstep Inspection & Diagnosis', desc: 'Our verified technician thoroughly inspects the appliance and provides an upfront quote before any work starts.' },
            { title: 'Customer Approval', desc: 'Repairs begin only after you review and approve the itemized quote; no surprise charges.' },
            { title: 'Genuine Parts & Precision Repair', desc: 'We install high-grade genuine spare parts according to official manufacturer standards.' },
            { title: 'Post-Repair Testing & 30-Day Warranty', desc: 'Rigorous safety and performance check followed by a digital invoice with 30-day warranty.' }
        ]
    },
    whats_included: {
        title: "What's Included",
        items: [
            'Comprehensive multi-point diagnosis and inspection',
            'Doorstep labor and expert servicing by vetted technician',
            'Electrical safety, load check, and component test',
            'Complete cleanup of service area after completion'
        ]
    },
    whats_not_included: {
        title: "What's Not Included",
        items: [
            'Replacement spare parts (billed transparently as per standard rate card)',
            'External civil, masonry, or electrical rewiring beyond connection points',
            'Workshop transportation if major off-site overhaul is required'
        ]
    },
    what_we_need: {
        title: 'What We Will Need From You',
        items: [
            'Safe, unobstructed physical access to the appliance',
            'Working electrical power supply and power socket nearby',
            'Water connection and bucket (if wet cleaning or jet-wash is required)'
        ]
    },
    warranty_note: {
        title: '30-Day Service Guarantee',
        text: 'Every service is backed by our 30-day Sorted Promise. If the same issue recurs within 30 days of completion, our expert will revisit and resolve it free of charge.'
    },
    all_brands: {
        title: 'We Service All Major Brands',
        brands: ['Daikin', 'Voltas', 'LG', 'Samsung', 'Hitachi', 'Carrier', 'Blue Star', 'Panasonic', 'Godrej', 'Whirlpool', 'Haier', 'IFB', 'Bosch']
    },
    feedbacks: {
        title: 'Customer Feedbacks & Ratings',
        items: []
    },
    faqs: {
        title: 'Frequently Asked Questions',
        items: [
            { q: 'How quickly will the technician arrive?', a: 'Our verified technician will arrive within 90 minutes of booking confirmation or at your chosen scheduled slot.' },
            { q: 'Are spare parts included in the visit price?', a: 'The service charge covers diagnosis and standard servicing labor. If replacement parts are needed, our technician shares the upfront rate card price for your approval first.' },
            { q: 'What happens if the problem reoccurs?', a: 'All repairs carry a 30-day Sorted Service Warranty. If the same issue returns within 30 days, our expert revisits free of charge.' },
            { q: 'What payment methods do you accept?', a: 'You can pay online securely via UPI, Credit/Debit cards, NetBanking via Razorpay, or cash/UPI to the technician upon job completion.' }
        ]
    }
};

export default function WebServiceDetailsEditor({
    value = null,
    onChange,
    disabled = false,
    serviceName = '',
    categoryName = ''
}) {
    // Merge provided value with defaults safely
    const data = React.useMemo(() => {
        const base = JSON.parse(JSON.stringify(DEFAULT_WEB_DETAILS));
        if (!value || typeof value !== 'object') return base;

        return {
            ...value,
            subgroup: value.subgroup || value.badge || '',
            badge: value.badge || value.subgroup || '',
            description: value.description || null,
            thumbnail_image: value.thumbnail_image || null,
            hero_image: value.hero_image || null,
            visible_sections: {
                ...base.visible_sections,
                ...(value.visible_sections || {})
            },
            our_process: {
                ...base.our_process,
                ...(value.our_process || {}),
                steps: Array.isArray(value.our_process?.steps) ? value.our_process.steps : base.our_process.steps
            },
            whats_included: {
                ...base.whats_included,
                ...(value.whats_included || {}),
                items: Array.isArray(value.whats_included?.items) ? value.whats_included.items : base.whats_included.items
            },
            whats_not_included: {
                ...base.whats_not_included,
                ...(value.whats_not_included || {}),
                items: Array.isArray(value.whats_not_included?.items) ? value.whats_not_included.items : base.whats_not_included.items
            },
            what_we_need: {
                ...base.what_we_need,
                ...(value.what_we_need || {}),
                items: Array.isArray(value.what_we_need?.items) ? value.what_we_need.items : base.what_we_need.items
            },
            warranty_note: {
                ...base.warranty_note,
                ...(value.warranty_note || {})
            },
            all_brands: {
                ...base.all_brands,
                ...(value.all_brands || {}),
                brands: Array.isArray(value.all_brands?.brands) ? value.all_brands.brands : base.all_brands.brands
            },
            feedbacks: {
                ...base.feedbacks,
                ...(value.feedbacks || {}),
                items: Array.isArray(value.feedbacks?.items) ? value.feedbacks.items : base.feedbacks.items
            },
            faqs: {
                ...base.faqs,
                ...(value.faqs || {}),
                items: Array.isArray(value.faqs?.items) ? value.faqs.items : base.faqs.items
            }
        };
    }, [value]);

    const [activeSectionTab, setActiveSectionTab] = useState('our_process');
    const [expandedSections, setExpandedSections] = useState({
        our_process: true,
        whats_included: false,
        whats_not_included: false,
        what_we_need: false,
        warranty_note: false,
        all_brands: false,
        feedbacks: false,
        faqs: false
    });

    const updateData = (updater) => {
        if (disabled || !onChange) return;
        const next = typeof updater === 'function' ? updater(data) : updater;
        onChange(next);
    };

    const toggleSectionVisibility = (sectionKey) => {
        if (disabled) return;
        updateData(prev => ({
            ...prev,
            visible_sections: {
                ...prev.visible_sections,
                [sectionKey]: !prev.visible_sections?.[sectionKey]
            }
        }));
    };

    const toggleAccordion = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SECTION_DEFS = [
        { key: 'our_process', label: 'Our Process', icon: Wrench, color: '#6338f5', desc: 'Doorstep inspection, approval, repair & warranty steps' },
        { key: 'whats_included', label: "What's Included", icon: CheckCircle2, color: '#10b981', desc: 'Scope of service, inspection and diagnostic points' },
        { key: 'whats_not_included', label: "What's Not Included", icon: XCircle, color: '#f59e0b', desc: 'Spare parts, external masonry and exclusions' },
        { key: 'what_we_need', label: 'What We Need From You', icon: HelpCircle, color: '#06b6d4', desc: 'Power, water access, and appliance clearance' },
        { key: 'warranty_note', label: 'Warranty Note', icon: ShieldCheck, color: '#8b5cf6', desc: '30-day service guarantee and terms' },
        { key: 'all_brands', label: 'All Brands Service', icon: Tag, color: '#ec4899', desc: 'Brands supported (LG, Samsung, Voltas, etc.)' },
        { key: 'faqs', label: "FAQ's", icon: MessageSquare, color: '#3b82f6', desc: 'Frequently asked questions & detailed answers' },
        { key: 'feedbacks', label: 'Feedbacks / Reviews', icon: Star, color: '#eab308', desc: 'Customer reviews, ratings and comments' }
    ];

    // Helper to update array item
    const updateArrayItem = (section, arrayProp, index, fieldOrVal, val) => {
        updateData(prev => {
            const current = [...(prev[section]?.[arrayProp] || [])];
            if (typeof fieldOrVal === 'string' && val !== undefined) {
                current[index] = { ...current[index], [fieldOrVal]: val };
            } else {
                current[index] = fieldOrVal;
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [arrayProp]: current
                }
            };
        });
    };

    const addArrayItem = (section, arrayProp, newItem) => {
        updateData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [arrayProp]: [...(prev[section]?.[arrayProp] || []), newItem]
            }
        }));
    };

    const removeArrayItem = (section, arrayProp, index) => {
        updateData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [arrayProp]: (prev[section]?.[arrayProp] || []).filter((_, i) => i !== index)
            }
        }));
    };

    const resetToDefaults = () => {
        if (confirm('Reset all website service specific details to default values?')) {
            updateData(JSON.parse(JSON.stringify(DEFAULT_WEB_DETAILS)));
        }
    };

    // Google Reviews selection state
    const [availableGoogleReviews, setAvailableGoogleReviews] = useState([]);
    const [loadingGoogleReviews, setLoadingGoogleReviews] = useState(false);
    const [reviewSearchQuery, setReviewSearchQuery] = useState('');
    const [filterCategoryOnly, setFilterCategoryOnly] = useState(false);
    const [feedbacksMode, setFeedbacksMode] = useState('google'); // 'google' | 'custom'

    const fetchGoogleReviews = async () => {
        try {
            setLoadingGoogleReviews(true);
            const res = await fetch('/api/settings/testimonials');
            const json = await res.json();
            if (json && json.success && Array.isArray(json.data)) {
                setAvailableGoogleReviews(json.data);
            }
        } catch (err) {
            console.error('Failed to load testimonials:', err);
        } finally {
            setLoadingGoogleReviews(false);
        }
    };

    useEffect(() => {
        fetchGoogleReviews();
    }, []);

    // Only reviews marked visible by admin in Website Settings
    const visibleGoogleReviews = useMemo(() => {
        return (availableGoogleReviews || []).filter(r => r.show_on_website === true);
    }, [availableGoogleReviews]);

    // Detect target appliance category for this service via AI classifier
    const targetCatKey = useMemo(() => {
        return detectTargetCategory(categoryName, serviceName);
    }, [categoryName, serviceName]);

    const targetCatDef = targetCatKey ? APPLIANCE_CATEGORIES[targetCatKey] : null;

    // Filter reviews that strictly match this target appliance category (whole-word matching, no substring leaks)
    const categoryMatchedReviews = useMemo(() => {
        if (!targetCatKey) return [];
        return visibleGoogleReviews.filter(r => {
            const info = classifyReview(r);
            return info.matchesCategory(targetCatKey);
        });
    }, [visibleGoogleReviews, targetCatKey]);

    const categoryMatchCount = categoryMatchedReviews.length;

    // AI notification notice
    const [aiNotice, setAiNotice] = useState(null);

    // Auto-select relevant reviews on initial load if no feedbacks are currently selected
    const autoSelectedRef = useRef(false);
    useEffect(() => {
        if (!disabled && !autoSelectedRef.current && visibleGoogleReviews.length > 0) {
            const currentItems = data.feedbacks?.items || [];
            if (currentItems.length === 0) {
                autoSelectedRef.current = true;
                const result = autoSelectReviewsForService({
                    serviceName,
                    categoryName,
                    availableReviews: visibleGoogleReviews,
                    targetCount: 60
                });
                if (result && result.selectedReviews?.length > 0) {
                    updateData(prev => ({
                        ...prev,
                        feedbacks: {
                            ...prev.feedbacks,
                            items: result.selectedReviews
                        }
                    }));
                }
            }
        }
    }, [visibleGoogleReviews, serviceName, categoryName, disabled, data.feedbacks?.items]);

    // AI Auto-Select Reviews action (includes all category matches, generic reviews, and rating-only reviews)
    const handleAiAutoSelect = () => {
        if (disabled) return;
        const result = autoSelectReviewsForService({
            serviceName,
            categoryName,
            availableReviews: visibleGoogleReviews,
            targetCount: 60
        });

        updateData(prev => ({
            ...prev,
            feedbacks: {
                ...prev.feedbacks,
                items: result.selectedReviews
            }
        }));

        setAiNotice({
            message: `🤖 AI Auto-Selected ${result.selectedReviews.length} reviews (${result.directMatchCount} ${result.targetCategoryLabel} + ${result.genericWithTextCount || 0} generic + ${result.ratingOnlyCount || 0} 5-star ratings without text). Conflicting appliance reviews were excluded.`,
            type: 'success'
        });
        setTimeout(() => setAiNotice(null), 8000);
    };

    // Filtered visible reviews based on search & category
    const filteredGoogleReviews = useMemo(() => {
        let list = visibleGoogleReviews;

        if (filterCategoryOnly && targetCatKey) {
            // Strictly show reviews matching target appliance category
            list = list.filter(r => {
                const info = classifyReview(r);
                return info.matchesCategory(targetCatKey);
            });
        }

        if (reviewSearchQuery.trim()) {
            const q = reviewSearchQuery.toLowerCase().trim();
            list = list.filter(r =>
                (r.customer_name || '').toLowerCase().includes(q) ||
                (r.review_text || '').toLowerCase().includes(q) ||
                (r.location || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [visibleGoogleReviews, filterCategoryOnly, targetCatKey, reviewSearchQuery]);

    // Check if a specific review is selected
    const isReviewSelected = (rev) => {
        const selected = data.feedbacks?.items || [];
        return selected.some(item =>
            (item.id && rev.id && String(item.id) === String(rev.id)) ||
            (item.name?.toLowerCase() === rev.customer_name?.toLowerCase() &&
             (item.comment || '').trim() === (rev.review_text || '').trim())
        );
    };

    // Toggle a review selection
    const toggleReviewSelection = (rev) => {
        if (disabled) return;
        const current = [...(data.feedbacks?.items || [])];
        const idx = current.findIndex(item =>
            (item.id && rev.id && String(item.id) === String(rev.id)) ||
            (item.name?.toLowerCase() === rev.customer_name?.toLowerCase() &&
             (item.comment || '').trim() === (rev.review_text || '').trim())
        );

        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push({
                id: rev.id,
                name: rev.customer_name,
                location: rev.location || 'Mumbai',
                rating: rev.rating || 5,
                comment: rev.review_text || '',
                date: rev.date || '',
                source: 'Google Reviews'
            });
        }

        updateData(prev => ({
            ...prev,
            feedbacks: {
                ...prev.feedbacks,
                items: current
            }
        }));
    };

    // Quick Select Top N
    const handleSelectTopN = (n) => {
        if (disabled) return;
        const listToPick = filteredGoogleReviews.length > 0 ? filteredGoogleReviews : visibleGoogleReviews;
        const topReviews = listToPick.slice(0, n).map(rev => ({
            id: rev.id,
            name: rev.customer_name,
            location: rev.location || 'Mumbai',
            rating: rev.rating || 5,
            comment: rev.review_text || '',
            date: rev.date || '',
            source: 'Google Reviews'
        }));

        updateData(prev => ({
            ...prev,
            feedbacks: {
                ...prev.feedbacks,
                items: topReviews
            }
        }));
    };

    // Clear all selected feedbacks
    const handleClearSelectedFeedbacks = () => {
        if (disabled) return;
        updateData(prev => ({
            ...prev,
            feedbacks: {
                ...prev.feedbacks,
                items: []
            }
        }));
    };

    // Reorder selected feedback (move up or down)
    const moveSelectedFeedback = (index, direction) => {
        if (disabled) return;
        const current = [...(data.feedbacks?.items || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= current.length) return;
        const temp = current[index];
        current[index] = current[targetIndex];
        current[targetIndex] = temp;
        updateData(prev => ({
            ...prev,
            feedbacks: {
                ...prev.feedbacks,
                items: current
            }
        }));
    };

    return (
        <div style={{
            marginTop: 20,
            marginBottom: 20,
            border: '1px solid #6338f5',
            borderRadius: 14,
            backgroundColor: 'rgba(99, 56, 245, 0.03)',
            padding: 20
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🌐</span>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                            Website Service Specific Details (Storefront Modal)
                        </h3>
                        <span style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: '#6338f5',
                            color: '#ffffff',
                            textTransform: 'uppercase'
                        }}>
                            Subtype: Web
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        Select which sections should appear in the live popup modal when customers click this service. Customize content for each below.
                    </p>
                </div>

                {!disabled && (
                    <button
                        type="button"
                        onClick={resetToDefaults}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 10px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                        title="Reset all sections to defaults"
                    >
                        <RotateCcw size={13} /> Reset Defaults
                    </button>
                )}
            </div>

            {/* Service Card Tag / Subgroup Pill */}
            <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Service Card Tag / Badge Pill (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={data.subgroup || data.badge || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, subgroup: e.target.value, badge: e.target.value }))}
                        disabled={disabled}
                        placeholder="e.g. Dry Service, Foam-Jet Service, Bestseller (leave blank to auto-detect)"
                        style={{ flex: 1, minWidth: 260, maxWidth: 450, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        Shows on service card pill & image badge (leave blank to auto-detect from name e.g. &ldquo;Dry Service&rdquo;).
                    </span>
                </div>
            </div>

            {/* Selection Boxes Grid */}
            <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                    Tick sections to make visible on live website:
                </label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 10
                }}>
                    {SECTION_DEFS.map(s => {
                        const isChecked = data.visible_sections?.[s.key] !== false;
                        const IconComponent = s.icon;
                        return (
                            <div
                                key={s.key}
                                onClick={() => toggleSectionVisibility(s.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    border: isChecked ? `2px solid ${s.color}` : '1px solid var(--border-primary)',
                                    backgroundColor: isChecked ? `${s.color}14` : 'var(--bg-secondary)',
                                    cursor: disabled ? 'default' : 'pointer',
                                    userSelect: 'none',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSectionVisibility(s.key)}
                                        disabled={disabled}
                                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: s.color }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <IconComponent size={14} color={s.color} />
                                            {s.label}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    backgroundColor: isChecked ? `${s.color}25` : 'var(--bg-elevated)',
                                    color: isChecked ? s.color : 'var(--text-tertiary)'
                                }}>
                                    {isChecked ? 'Visible' : 'Hidden'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section Tab Selector for Editing */}
            <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 8,
                marginBottom: 14,
                borderBottom: '1px solid var(--border-primary)'
            }}>
                {SECTION_DEFS.map(s => {
                    const isChecked = data.visible_sections?.[s.key] !== false;
                    const isActive = activeSectionTab === s.key;
                    const IconComponent = s.icon;
                    return (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setActiveSectionTab(s.key)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: 'none',
                                backgroundColor: isActive ? s.color : 'var(--bg-secondary)',
                                color: isActive ? '#ffffff' : (isChecked ? 'var(--text-primary)' : 'var(--text-tertiary)'),
                                fontSize: 12.5,
                                fontWeight: isActive ? 700 : 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <IconComponent size={13} color={isActive ? '#ffffff' : s.color} />
                            {s.label}
                            {isChecked && (
                                <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#ffffff' : '#10b981'
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active Section Content Editor */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: 18
            }}>
                {/* 1. OUR PROCESS */}
                {activeSectionTab === 'our_process' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#6338f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Wrench size={16} /> Our Process Section Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Step-by-step diagnostic and repair process shown to customer.
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.our_process !== false}
                                    onChange={() => toggleSectionVisibility('our_process')}
                                    disabled={disabled}
                                    style={{ accentColor: '#6338f5' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                                <input
                                    type="text"
                                    value={data.our_process?.title || ''}
                                    onChange={(e) => updateData(prev => ({ ...prev, our_process: { ...prev.our_process, title: e.target.value } }))}
                                    disabled={disabled}
                                    placeholder="Our process"
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Subtitle</label>
                                <input
                                    type="text"
                                    value={data.our_process?.subtitle || ''}
                                    onChange={(e) => updateData(prev => ({ ...prev, our_process: { ...prev.our_process, subtitle: e.target.value } }))}
                                    disabled={disabled}
                                    placeholder="Transparent doorstep inspection, upfront quote & 30-day warranty"
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                                />
                            </div>
                        </div>

                        {/* Steps List */}
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Process Steps</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                            {(data.our_process?.steps || []).map((step, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'flex-start',
                                        backgroundColor: 'var(--bg-secondary)',
                                        padding: 10,
                                        borderRadius: 8,
                                        border: '1px solid var(--border-primary)'
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
                                        flexShrink: 0,
                                        marginTop: 4
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <input
                                            type="text"
                                            value={step.title || ''}
                                            onChange={(e) => updateArrayItem('our_process', 'steps', idx, 'title', e.target.value)}
                                            disabled={disabled}
                                            placeholder="Step title"
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                        />
                                        <input
                                            type="text"
                                            value={step.desc || ''}
                                            onChange={(e) => updateArrayItem('our_process', 'steps', idx, 'desc', e.target.value)}
                                            disabled={disabled}
                                            placeholder="Step description..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                        />
                                    </div>
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('our_process', 'steps', idx)}
                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, marginTop: 4 }}
                                            title="Delete step"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => addArrayItem('our_process', 'steps', { title: `Step ${(data.our_process?.steps?.length || 0) + 1}`, desc: '' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #6338f5', backgroundColor: 'rgba(99,56,245,0.08)', color: '#6338f5', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add Step
                            </button>
                        )}
                    </div>
                )}

                {/* 2. WHAT'S INCLUDED */}
                {activeSectionTab === 'whats_included' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={16} /> What's Included Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Clear bullet points of what this service covers.
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.whats_included !== false}
                                    onChange={() => toggleSectionVisibility('whats_included')}
                                    disabled={disabled}
                                    style={{ accentColor: '#10b981' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.whats_included?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, whats_included: { ...prev.whats_included, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="What's Included"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Included Points</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {(data.whats_included?.items || []).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateArrayItem('whats_included', 'items', idx, e.target.value)}
                                        disabled={disabled}
                                        placeholder="e.g. Complete diagnostic check & doorstep labor"
                                        style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    />
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('whats_included', 'items', idx)}
                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                                            title="Delete item"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => addArrayItem('whats_included', 'items', '')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #10b981', backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add Included Point
                            </button>
                        )}
                    </div>
                )}

                {/* 3. WHAT'S NOT INCLUDED */}
                {activeSectionTab === 'whats_not_included' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <XCircle size={16} /> What's Not Included Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Exclusions and external costs (e.g. spare parts, masonry).
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.whats_not_included !== false}
                                    onChange={() => toggleSectionVisibility('whats_not_included')}
                                    disabled={disabled}
                                    style={{ accentColor: '#f59e0b' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.whats_not_included?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, whats_not_included: { ...prev.whats_not_included, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="What's Not Included"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Excluded Points</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {(data.whats_not_included?.items || []).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <XCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateArrayItem('whats_not_included', 'items', idx, e.target.value)}
                                        disabled={disabled}
                                        placeholder="e.g. Spare parts replacement charges (as per rate card)"
                                        style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    />
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('whats_not_included', 'items', idx)}
                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                                            title="Delete item"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => addArrayItem('whats_not_included', 'items', '')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add Excluded Point
                            </button>
                        )}
                    </div>
                )}

                {/* 4. WHAT WE WILL NEED FROM YOU */}
                {activeSectionTab === 'what_we_need' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <HelpCircle size={16} /> What We Will Need From You
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Requirements from the customer (e.g. power plug, water access, ladder).
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.what_we_need !== false}
                                    onChange={() => toggleSectionVisibility('what_we_need')}
                                    disabled={disabled}
                                    style={{ accentColor: '#06b6d4' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.what_we_need?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, what_we_need: { ...prev.what_we_need, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="What We Will Need From You"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Requirement Points</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {(data.what_we_need?.items || []).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <HelpCircle size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateArrayItem('what_we_need', 'items', idx, e.target.value)}
                                        disabled={disabled}
                                        placeholder="e.g. Working electrical plug socket near unit"
                                        style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    />
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('what_we_need', 'items', idx)}
                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                                            title="Delete item"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => addArrayItem('what_we_need', 'items', '')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', color: '#06b6d4', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add Requirement Point
                            </button>
                        )}
                    </div>
                )}

                {/* 5. WARRANTY NOTE */}
                {activeSectionTab === 'warranty_note' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ShieldCheck size={16} /> Warranty Note Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Warranty guarantee card shown with guarantee badge.
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.warranty_note !== false}
                                    onChange={() => toggleSectionVisibility('warranty_note')}
                                    disabled={disabled}
                                    style={{ accentColor: '#8b5cf6' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Warranty Heading</label>
                            <input
                                type="text"
                                value={data.warranty_note?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, warranty_note: { ...prev.warranty_note, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="30-Day Service Guarantee"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Warranty Description</label>
                            <textarea
                                value={data.warranty_note?.text || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, warranty_note: { ...prev.warranty_note, text: e.target.value } }))}
                                disabled={disabled}
                                rows={3}
                                placeholder="Every service is backed by our 30-day warranty..."
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}
                            />
                        </div>
                    </div>
                )}

                {/* 6. ALL BRANDS SERVICE */}
                {activeSectionTab === 'all_brands' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Tag size={16} /> All Brands Service Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Brands we service (shown as brand badge pills).
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.all_brands !== false}
                                    onChange={() => toggleSectionVisibility('all_brands')}
                                    disabled={disabled}
                                    style={{ accentColor: '#ec4899' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.all_brands?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, all_brands: { ...prev.all_brands, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="We Service All Major Brands"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                            Brands List (comma-separated or edited below)
                        </label>
                        <textarea
                            value={(data.all_brands?.brands || []).join(', ')}
                            onChange={(e) => {
                                const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                updateData(prev => ({ ...prev, all_brands: { ...prev.all_brands, brands: list } }));
                            }}
                            disabled={disabled}
                            rows={2}
                            placeholder="Daikin, Voltas, LG, Samsung, Hitachi, Carrier, Blue Star, Panasonic, Godrej, Whirlpool..."
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 10 }}
                        />

                        {/* Brand Pills Preview */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(data.all_brands?.brands || []).map((b, i) => (
                                <span
                                    key={i}
                                    style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        padding: '4px 9px',
                                        borderRadius: 6,
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {b}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 7. FAQ'S */}
                {activeSectionTab === 'faqs' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MessageSquare size={16} /> FAQ's Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Frequently asked questions & clear answers shown as accordions.
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.faqs !== false}
                                    onChange={() => toggleSectionVisibility('faqs')}
                                    disabled={disabled}
                                    style={{ accentColor: '#3b82f6' }}
                                />
                                Show on website
                            </label>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.faqs?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, faqs: { ...prev.faqs, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="Frequently Asked Questions"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Questions & Answers</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                            {(data.faqs?.items || []).map((faq, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 8,
                                        padding: 12,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <input
                                            type="text"
                                            value={faq.q || ''}
                                            onChange={(e) => updateArrayItem('faqs', 'items', idx, 'q', e.target.value)}
                                            disabled={disabled}
                                            placeholder="Question: e.g. How quickly will the technician arrive?"
                                            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                        />
                                        {!disabled && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayItem('faqs', 'items', idx)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                                                title="Delete FAQ"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        value={faq.a || ''}
                                        onChange={(e) => updateArrayItem('faqs', 'items', idx, 'a', e.target.value)}
                                        disabled={disabled}
                                        rows={2}
                                        placeholder="Answer: e.g. Our verified technician will arrive within 90 minutes..."
                                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12.5, lineHeight: 1.4 }}
                                    />
                                </div>
                            ))}
                        </div>

                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => addArrayItem('faqs', 'items', { q: '', a: '' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add FAQ
                            </button>
                        )}
                    </div>
                )}

                {/* 8. FEEDBACKS / REVIEWS */}
                {activeSectionTab === 'feedbacks' && (
                    <div>
                        {/* Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Star size={16} /> Customer Feedbacks & Reviews Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Select authentic Google Reviews made visible in Website Settings, or create custom reviews for this service.
                                </span>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={data.visible_sections?.feedbacks !== false}
                                    onChange={() => toggleSectionVisibility('feedbacks')}
                                    disabled={disabled}
                                    style={{ accentColor: '#eab308' }}
                                />
                                Show on website
                            </label>
                        </div>

                        {/* Title input */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Section Title</label>
                            <input
                                type="text"
                                value={data.feedbacks?.title || ''}
                                onChange={(e) => updateData(prev => ({ ...prev, feedbacks: { ...prev.feedbacks, title: e.target.value } }))}
                                disabled={disabled}
                                placeholder="Customer Feedbacks & Ratings"
                                style={{ width: '100%', maxWidth: 400, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                        </div>

                        {/* ── SELECTED REVIEWS SUMMARY BANNER ── */}
                        <div style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 10,
                            border: (data.feedbacks?.items || []).length > 0 ? '1px solid #eab308' : '1px dashed var(--border-primary)',
                            backgroundColor: (data.feedbacks?.items || []).length > 0 ? 'rgba(234, 179, 8, 0.05)' : 'var(--bg-secondary)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Star size={15} fill="#eab308" color="#eab308" />
                                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                        Selected for this Service ({(data.feedbacks?.items || []).length})
                                    </strong>
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                        — will appear in the website modal popup
                                    </span>
                                </div>
                                {(data.feedbacks?.items || []).length > 0 && !disabled && (
                                    <button
                                        type="button"
                                        onClick={handleClearSelectedFeedbacks}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#ef4444',
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        <X size={13} /> Clear All
                                    </button>
                                )}
                            </div>

                            {(data.feedbacks?.items || []).length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '6px 0' }}>
                                    No reviews selected yet. Check items from the Google Reviews list below to showcase them on this service.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {(data.feedbacks?.items || []).map((fb, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                borderRadius: 6,
                                                backgroundColor: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-primary)',
                                                gap: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    backgroundColor: '#eab308',
                                                    color: '#000000',
                                                    flexShrink: 0
                                                }}>
                                                    #{idx + 1}
                                                </span>
                                                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                    {fb.name || 'Verified Customer'}
                                                </span>
                                                <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                                    {Array.from({ length: fb.rating || 5 }).map((_, s) => (
                                                        <Star key={s} size={11} fill="#eab308" color="#eab308" />
                                                    ))}
                                                </div>
                                                {fb.source === 'Google Reviews' && (
                                                    <span style={{
                                                        fontSize: 9.5,
                                                        fontWeight: 800,
                                                        padding: '1px 5px',
                                                        borderRadius: 4,
                                                        backgroundColor: 'rgba(66, 133, 244, 0.12)',
                                                        color: '#4285F4',
                                                        border: '1px solid rgba(66, 133, 244, 0.25)',
                                                        flexShrink: 0
                                                    }}>
                                                        Google
                                                    </span>
                                                )}
                                                {(fb.comment || fb.review_text)?.trim() && (
                                                    <span style={{
                                                        fontSize: 12,
                                                        color: 'var(--text-secondary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontStyle: 'italic',
                                                        flex: 1
                                                    }}>
                                                        &ldquo;{(fb.comment || fb.review_text).trim()}&rdquo;
                                                    </span>
                                                )}
                                            </div>

                                            {!disabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveSelectedFeedback(idx, -1)}
                                                        disabled={idx === 0}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            color: idx === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                                            padding: 2
                                                        }}
                                                        title="Move Up"
                                                    >
                                                        <ChevronUp size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveSelectedFeedback(idx, 1)}
                                                        disabled={idx === (data.feedbacks?.items || []).length - 1}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            color: idx === (data.feedbacks?.items || []).length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                            cursor: idx === (data.feedbacks?.items || []).length - 1 ? 'not-allowed' : 'pointer',
                                                            padding: 2
                                                        }}
                                                        title="Move Down"
                                                    >
                                                        <ChevronDown size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeArrayItem('feedbacks', 'items', idx)}
                                                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                                        title="Remove from this service"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── MODE TABS: GOOGLE REVIEWS vs MANUAL REVIEWS ── */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 }}>
                            <button
                                type="button"
                                onClick={() => setFeedbacksMode('google')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: feedbacksMode === 'google' ? '1px solid #6338f5' : '1px solid var(--border-primary)',
                                    backgroundColor: feedbacksMode === 'google' ? '#6338f5' : 'var(--bg-secondary)',
                                    color: feedbacksMode === 'google' ? '#ffffff' : 'var(--text-primary)',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <Star size={14} />
                                Select from Google Reviews ({visibleGoogleReviews.length} Visible)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFeedbacksMode('custom')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: feedbacksMode === 'custom' ? '1px solid #6338f5' : '1px solid var(--border-primary)',
                                    backgroundColor: feedbacksMode === 'custom' ? '#6338f5' : 'var(--bg-secondary)',
                                    color: feedbacksMode === 'custom' ? '#ffffff' : 'var(--text-primary)',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                ✏️ Custom / Manual Reviews
                            </button>
                        </div>

                        {/* ── MODE 1: GOOGLE REVIEWS SELECTOR ── */}
                        {feedbacksMode === 'google' && (
                            <div>
                                {/* AI Notice Banner */}
                                {aiNotice && (
                                    <div style={{
                                        marginBottom: 10,
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        backgroundColor: 'rgba(99, 56, 245, 0.15)',
                                        border: '1px solid #6338f5',
                                        color: '#e0e7ff',
                                        fontSize: 12.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        lineHeight: 1.45
                                    }}>
                                        <span>{aiNotice.message}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAiNotice(null)}
                                            style={{ border: 'none', background: 'none', color: '#c4b5fd', cursor: 'pointer', padding: 2 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Toolbar: Search, Filters, AI Auto-Select, Quick Select */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    marginBottom: 10,
                                    padding: 10,
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    {/* Search Input */}
                                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                        <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="text"
                                            value={reviewSearchQuery}
                                            onChange={(e) => setReviewSearchQuery(e.target.value)}
                                            placeholder="Search reviews by name, keyword (e.g. Kunal, microwave, quick)..."
                                            style={{
                                                width: '100%',
                                                padding: '6px 28px 6px 30px',
                                                borderRadius: 6,
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                color: 'var(--text-primary)',
                                                fontSize: 12.5
                                            }}
                                        />
                                        {reviewSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setReviewSearchQuery('')}
                                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Match Filter Chip (Strict appliance matches only) */}
                                    {targetCatKey && (
                                        <button
                                            type="button"
                                            onClick={() => setFilterCategoryOnly(prev => !prev)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: filterCategoryOnly ? '1.5px solid #6338f5' : '1px solid var(--border-primary)',
                                                backgroundColor: filterCategoryOnly ? 'rgba(99, 56, 245, 0.2)' : 'var(--bg-elevated)',
                                                color: filterCategoryOnly ? '#a78bfa' : 'var(--text-secondary)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title={`Show only reviews directly mentioning ${targetCatDef?.label || categoryName} (excluding other appliances)`}
                                        >
                                            <Filter size={12} />
                                            {targetCatDef?.label || categoryName} Matches ({categoryMatchCount})
                                        </button>
                                    )}

                                    {/* Quick Actions & AI Auto-Select */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {/* AI Auto-Select Button */}
                                        <button
                                            type="button"
                                            onClick={handleAiAutoSelect}
                                            disabled={disabled || visibleGoogleReviews.length === 0}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: 6,
                                                border: '1px solid #7c3aed',
                                                background: 'linear-gradient(135deg, #6338f5 0%, #8b5cf6 100%)',
                                                color: '#ffffff',
                                                fontSize: 12,
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                boxShadow: '0 2px 6px rgba(99, 56, 245, 0.25)'
                                            }}
                                            title="AI will auto-select product-specific reviews for this service + top generic reviews, excluding conflicting appliances"
                                        >
                                            <Sparkles size={13} />
                                            🤖 AI Auto-Select
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectTopN(3)}
                                            disabled={disabled || filteredGoogleReviews.length === 0}
                                            style={{
                                                padding: '5px 9px',
                                                borderRadius: 6,
                                                border: '1px solid #6338f5',
                                                backgroundColor: 'rgba(99, 56, 245, 0.08)',
                                                color: '#6338f5',
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ⚡ Select Top 3
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectTopN(5)}
                                            disabled={disabled || filteredGoogleReviews.length === 0}
                                            style={{
                                                padding: '5px 9px',
                                                borderRadius: 6,
                                                border: '1px solid #6338f5',
                                                backgroundColor: 'rgba(99, 56, 245, 0.08)',
                                                color: '#6338f5',
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title="Select only top 5 reviews"
                                        >
                                            ⚡ Select Top 5
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAiAutoSelect}
                                            disabled={disabled || visibleGoogleReviews.length === 0}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #10b981',
                                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                                color: '#10b981',
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title="Auto-select all category-eligible reviews (50+) so customers can paginate with 'Show More Reviews'"
                                        >
                                            ⚡ Select All Eligible (50+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={fetchGoogleReviews}
                                            disabled={loadingGoogleReviews}
                                            style={{
                                                padding: 5,
                                                borderRadius: 6,
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer'
                                            }}
                                            title="Refresh reviews from database"
                                        >
                                            <RefreshCw size={13} style={{ animation: loadingGoogleReviews ? 'spin 1s linear infinite' : 'none' }} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                        Showing {filteredGoogleReviews.length} of {visibleGoogleReviews.length} visible Google reviews (click review to toggle selection)
                                    </span>
                                    <span>
                                        <strong>{(data.feedbacks?.items || []).filter(i => isReviewSelected(i) || i.source === 'Google Reviews').length}</strong> selected
                                    </span>
                                </div>

                                {/* Reviews Scroll List */}
                                <div style={{
                                    maxHeight: 460,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    paddingRight: 4
                                }}>
                                    {loadingGoogleReviews && (
                                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
                                            Loading Google reviews...
                                        </div>
                                    )}

                                    {!loadingGoogleReviews && filteredGoogleReviews.length === 0 && (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: 30,
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 8,
                                            border: '1px dashed var(--border-primary)',
                                            color: 'var(--text-secondary)',
                                            fontSize: 13
                                        }}>
                                            No visible Google reviews match your filters.
                                            {(filterCategoryOnly || reviewSearchQuery) && (
                                                <div style={{ marginTop: 8 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setFilterCategoryOnly(false); setReviewSearchQuery(''); }}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            color: '#6338f5',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Clear filters
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!loadingGoogleReviews && filteredGoogleReviews.map((rev) => {
                                        const selected = isReviewSelected(rev);
                                        return (
                                            <div
                                                key={rev.id || rev.customer_name}
                                                onClick={() => toggleReviewSelection(rev)}
                                                style={{
                                                    padding: 11,
                                                    borderRadius: 8,
                                                    border: selected ? '1.5px solid #6338f5' : '1px solid var(--border-primary)',
                                                    backgroundColor: selected ? 'rgba(99, 56, 245, 0.12)' : 'var(--bg-secondary)',
                                                    cursor: disabled ? 'default' : 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 6
                                                }}
                                            >
                                                {/* Header Row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                        <div style={{ flexShrink: 0 }}>
                                                            {selected ? (
                                                                <CheckSquare size={16} color="#6338f5" />
                                                            ) : (
                                                                <Square size={16} color="var(--text-tertiary)" />
                                                            )}
                                                        </div>

                                                        {/* Avatar */}
                                                        <div style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            backgroundColor: selected ? '#6338f5' : 'var(--bg-elevated)',
                                                            color: selected ? '#ffffff' : 'var(--text-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 11,
                                                            fontWeight: 800,
                                                            flexShrink: 0
                                                        }}>
                                                            {(rev.customer_name || 'C').charAt(0).toUpperCase()}
                                                        </div>

                                                        <strong style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                            {rev.customer_name}
                                                        </strong>

                                                        {rev.location && (
                                                            <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                                • {rev.location}
                                                            </span>
                                                        )}

                                                        <span style={{
                                                            fontSize: 9.5,
                                                            fontWeight: 800,
                                                            padding: '1px 5px',
                                                            borderRadius: 4,
                                                            backgroundColor: 'rgba(66, 133, 244, 0.12)',
                                                            color: '#4285F4',
                                                            border: '1px solid rgba(66, 133, 244, 0.25)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            flexShrink: 0
                                                        }}>
                                                            <span style={{ fontWeight: 900 }}>G</span> Google
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                        <div style={{ display: 'flex', gap: 1 }}>
                                                            {Array.from({ length: rev.rating || 5 }).map((_, s) => (
                                                                <Star key={s} size={12} fill="#eab308" color="#eab308" />
                                                            ))}
                                                        </div>
                                                        {rev.date && (
                                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                                {rev.date}
                                                            </span>
                                                        )}
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: 5,
                                                            backgroundColor: selected ? '#6338f5' : 'var(--bg-elevated)',
                                                            color: selected ? '#ffffff' : 'var(--text-secondary)',
                                                            border: selected ? 'none' : '1px solid var(--border-primary)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3
                                                        }}>
                                                            {selected ? (
                                                                <>
                                                                    <Check size={11} /> Selected
                                                                </>
                                                            ) : (
                                                                '+ Select'
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Review Comment Quote (only if text exists) */}
                                                {rev.review_text && rev.review_text.trim().length > 0 && (
                                                    <p style={{
                                                        margin: '2px 0 0 24px',
                                                        fontSize: 12.5,
                                                        color: 'var(--text-secondary)',
                                                        lineHeight: 1.45,
                                                        fontStyle: 'italic'
                                                    }}>
                                                        &ldquo;{rev.review_text.trim()}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── MODE 2: CUSTOM / MANUAL REVIEWS ── */}
                        {feedbacksMode === 'custom' && (
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                    Add custom testimonials manually for this service (e.g. from WhatsApp, offline clients, or specific feedback).
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                    {(data.feedbacks?.items || []).map((fb, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 8,
                                                padding: 12,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 200 }}>
                                                    <input
                                                        type="text"
                                                        value={fb.name || ''}
                                                        onChange={(e) => updateArrayItem('feedbacks', 'items', idx, 'name', e.target.value)}
                                                        disabled={disabled}
                                                        placeholder="Customer Name (e.g. Kunal M.)"
                                                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 700 }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={fb.location || ''}
                                                        onChange={(e) => updateArrayItem('feedbacks', 'items', idx, 'location', e.target.value)}
                                                        disabled={disabled}
                                                        placeholder="Location (e.g. Andheri West)"
                                                        style={{ width: 140, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700 }}>Rating:</span>
                                                    <select
                                                        value={fb.rating || 5}
                                                        onChange={(e) => updateArrayItem('feedbacks', 'items', idx, 'rating', Number(e.target.value))}
                                                        disabled={disabled}
                                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}
                                                    >
                                                        <option value={5}>⭐ 5 Stars</option>
                                                        <option value={4}>⭐ 4 Stars</option>
                                                        <option value={3}>⭐ 3 Stars</option>
                                                    </select>
                                                    {!disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeArrayItem('feedbacks', 'items', idx)}
                                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                                                            title="Delete review"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <textarea
                                                value={fb.comment || ''}
                                                onChange={(e) => updateArrayItem('feedbacks', 'items', idx, 'comment', e.target.value)}
                                                disabled={disabled}
                                                rows={2}
                                                placeholder="Customer review comment..."
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12.5, lineHeight: 1.4 }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('feedbacks', 'items', { name: '', rating: 5, location: 'Mumbai', comment: '', source: 'Manual' })}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #eab308', backgroundColor: 'rgba(234,179,8,0.08)', color: '#ca8a04', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /> Add Custom Review
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
