'use client';

import React, { useState } from 'react';
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
    RotateCcw
} from 'lucide-react';

export const DEFAULT_WEB_DETAILS = {
    visible_sections: {
        our_process: true,
        whats_included: true,
        whats_not_included: true,
        what_we_need: true,
        warranty_note: true,
        all_brands: true,
        feedbacks: true,
        faqs: true
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
        items: [
            { name: 'Kunal M.', rating: 5, location: 'Andheri West', comment: 'Super fast arrival within 90 minutes. Diagnosed the issue quickly and resolved it cleanly.' },
            { name: 'Ritu S.', rating: 5, location: 'Powai', comment: 'Very polite technician, clean work and transparent rate card pricing. Highly recommended!' },
            { name: 'Devendra P.', rating: 5, location: 'Bandra', comment: 'Prompt service and hassle-free warranty support. Best appliance repair service in Mumbai.' }
        ]
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
        { key: 'feedbacks', label: 'Feedbacks / Reviews', icon: Star, color: '#eab308', desc: 'Customer reviews, ratings and comments' },
        { key: 'faqs', label: "FAQ's", icon: MessageSquare, color: '#3b82f6', desc: 'Frequently asked questions & detailed answers' }
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

                {/* 7. FEEDBACKS / REVIEWS */}
                {activeSectionTab === 'feedbacks' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Star size={16} /> Customer Feedbacks & Reviews Content
                                </h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Authentic customer testimonials and star ratings for this service.
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

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Customer Reviews</label>
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
                                onClick={() => addArrayItem('feedbacks', 'items', { name: '', rating: 5, location: 'Mumbai', comment: '' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #eab308', backgroundColor: 'rgba(234,179,8,0.08)', color: '#ca8a04', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add Customer Review
                            </button>
                        )}
                    </div>
                )}

                {/* 8. FAQ'S */}
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
            </div>
        </div>
    );
}
