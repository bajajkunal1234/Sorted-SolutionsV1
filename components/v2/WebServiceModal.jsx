'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    CheckCircle2,
    XCircle,
    HelpCircle,
    ShieldCheck,
    Tag,
    Star,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Wrench,
    Check
} from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import { DEFAULT_WEB_DETAILS } from '@/app/admin/components/inventory/WebServiceDetailsEditor';

export default function WebServiceModal({
    service,
    category = null,
    onClose
}) {
    const { getItemQty, addItem, incrementItem, decrementItem } = useV2Cart();
    const [openFaqIndices, setOpenFaqIndices] = useState({ 0: true });
    const [visibleReviewCount, setVisibleReviewCount] = useState(5);

    useEffect(() => {
        setVisibleReviewCount(5);
    }, [service?.id]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!service) return null;

    const qty = getItemQty ? getItemQty(service.id) : 0;
    const price = Number(service.sale_price ?? service.selling_price ?? service.price ?? 299) || 299;
    const mrp = Number(service.retail_price ?? service.mrp ?? price) || price;
    const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

    // Merge service's web_details with defaults
    const webDetails = service.web_details || {};
    const visibleSections = webDetails.visible_sections || DEFAULT_WEB_DETAILS.visible_sections;

    const processConfig = webDetails.our_process || DEFAULT_WEB_DETAILS.our_process;
    const includedConfig = webDetails.whats_included || DEFAULT_WEB_DETAILS.whats_included;
    const notIncludedConfig = webDetails.whats_not_included || DEFAULT_WEB_DETAILS.whats_not_included;
    const whatWeNeedConfig = webDetails.what_we_need || DEFAULT_WEB_DETAILS.what_we_need;
    const warrantyConfig = webDetails.warranty_note || DEFAULT_WEB_DETAILS.warranty_note;
    const brandsConfig = webDetails.all_brands || DEFAULT_WEB_DETAILS.all_brands;
    const feedbacksConfig = webDetails.feedbacks || DEFAULT_WEB_DETAILS.feedbacks;
    const faqsConfig = webDetails.faqs || DEFAULT_WEB_DETAILS.faqs;

    const toggleFaq = (idx) => {
        setOpenFaqIndices(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const heroUrl = service.web_details?.hero_image || service.heroImage || service.images?.[1] || service.images?.[0] || service.image || category?.icon || '/images/services/ac_3d.png';

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
            }}
            role="dialog"
            aria-modal="true"
            aria-label={service.name}
        >
            <div
                style={{
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    maxWidth: 580,
                    width: '100%',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                    animation: 'v2ModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* ── Scrollable Body containing Hero Image and Details ── */}
                <div
                    style={{
                        overflowY: 'auto',
                        flex: 1,
                        width: '100%',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {/* ── Header Image (2:1 Widescreen Ratio) & Close Button ── */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1', backgroundColor: '#f8fafc', flexShrink: 0, overflow: 'hidden' }}>
                        <img
                            src={heroUrl}
                            alt={service.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = category?.icon || '/images/services/ac_3d.png'; }}
                        />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.4) 100%)'
                        }} />

                        {/* Close '✕' Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            style={{
                                position: 'absolute',
                                top: 14,
                                right: 14,
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <X size={18} />
                        </button>

                        {/* Badge over image */}
                        {service.subgroup && (
                            <div style={{
                                position: 'absolute',
                                bottom: 12,
                                left: 16,
                                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                backdropFilter: 'blur(4px)',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: 6,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {service.subgroup}
                            </div>
                        )}
                    </div>

                    {/* ── Content Body with Details & Sections ── */}
                    <div
                        style={{
                            padding: '20px 22px 28px 22px'
                        }}
                    >
                        {/* Title Row with Service Name on Left and Add Button on Right */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6338f5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        {service.categoryName || category?.name || 'Home Appliance Service'}
                                    </span>
                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: '#ca8a04' }}>
                                        <Star size={13} fill="#eab308" color="#eab308" /> 4.9 (Verified)
                                    </span>
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                                    {service.name}
                                </h2>
                            </div>

                            {/* Add Button / Stepper beside the service title */}
                            <div style={{ flexShrink: 0, marginTop: 4 }}>
                                {qty === 0 ? (
                                    <button
                                        type="button"
                                        className="v2-btn-add"
                                        onClick={() => addItem && addItem(service)}
                                        style={{
                                            height: 36,
                                            minWidth: 88,
                                            padding: '0 16px',
                                            borderRadius: 9,
                                            border: '1.5px solid #d8ccff',
                                            backgroundColor: '#ffffff',
                                            color: '#6338f5',
                                            fontSize: 13,
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 10px rgba(99, 56, 245, 0.12)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 4,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        + ADD
                                    </button>
                                ) : (
                                    <div
                                        className="v2-qty-stepper"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            height: 36,
                                            borderRadius: 9,
                                            border: '1.5px solid #6338f5',
                                            backgroundColor: '#f5f3ff',
                                            color: '#6338f5',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 10px rgba(99, 56, 245, 0.14)'
                                        }}
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Remove one ${service.name}`}
                                            onClick={() => decrementItem && decrementItem(service.id)}
                                            style={{
                                                width: 30,
                                                height: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#6338f5',
                                                fontWeight: 800,
                                                fontSize: 16,
                                                cursor: 'pointer',
                                                display: 'grid',
                                                placeItems: 'center'
                                            }}
                                        >
                                            −
                                        </button>
                                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', minWidth: 24, textAlign: 'center' }}>
                                            {qty}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label={`Add one more ${service.name}`}
                                            onClick={() => incrementItem && incrementItem(service.id)}
                                            style={{
                                                width: 30,
                                                height: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#6338f5',
                                                fontWeight: 800,
                                                fontSize: 16,
                                                cursor: 'pointer',
                                                display: 'grid',
                                                placeItems: 'center'
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    {/* Price Row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                            {formatINR(price)}
                        </span>
                        {mrp > price && (
                            <span style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'line-through' }}>
                                {formatINR(mrp)}
                            </span>
                        )}
                        {discount > 0 && (
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: '#10b981',
                                backgroundColor: '#dcfce7',
                                padding: '2px 8px',
                                borderRadius: 6
                            }}>
                                {discount}% OFF
                            </span>
                        )}
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                            {service.gst_applicable !== false && service.gstApplicable !== false ? '+ 18% GST' : 'Tax inclusive'}
                        </span>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '0 0 20px 0', whiteSpace: 'pre-line' }}>
                        {service.description || service.web_details?.description || 'Professional doorstep service backed by verified experts, genuine spares, and 30-day warranty.'}
                    </p>

                    <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '16px 0 22px 0' }} />

                    {/* ══════════════ 1. OUR PROCESS ══════════════ */}
                    {visibleSections.our_process !== false && Array.isArray(processConfig?.steps) && processConfig.steps.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wrench size={16} color="#6338f5" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {processConfig.title || 'Our Process'}
                                    </h3>
                                    {processConfig.subtitle && (
                                        <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>
                                            {processConfig.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 6 }}>
                                {processConfig.steps.map((st, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: '#f1f5f9',
                                            border: '1.5px solid #cbd5e1',
                                            color: '#0f172a',
                                            fontSize: 11.5,
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: 1
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
                                                {st.title}
                                            </div>
                                            {st.desc && (
                                                <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.45 }}>
                                                    {st.desc}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 2. WHAT'S INCLUDED ══════════════ */}
                    {visibleSections.whats_included !== false && Array.isArray(includedConfig?.items) && includedConfig.items.length > 0 && (
                        <div style={{
                            marginBottom: 20,
                            padding: 16,
                            borderRadius: 14,
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <CheckCircle2 size={17} color="#10b981" />
                                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#166534', margin: 0 }}>
                                    {includedConfig.title || "What's Included"}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {includedConfig.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
                                        <span style={{ fontSize: 12.8, color: '#166534', lineHeight: 1.45 }}>
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 3. WHAT'S NOT INCLUDED ══════════════ */}
                    {visibleSections.whats_not_included !== false && Array.isArray(notIncludedConfig?.items) && notIncludedConfig.items.length > 0 && (
                        <div style={{
                            marginBottom: 20,
                            padding: 16,
                            borderRadius: 14,
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <XCircle size={17} color="#f59e0b" />
                                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#92400e', margin: 0 }}>
                                    {notIncludedConfig.title || "What's Not Included"}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {notIncludedConfig.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ color: '#d97706', fontWeight: 800, fontSize: 13, lineHeight: '14px' }}>✕</span>
                                        <span style={{ fontSize: 12.8, color: '#92400e', lineHeight: 1.45 }}>
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 4. WHAT WE WILL NEED FROM YOU ══════════════ */}
                    {visibleSections.what_we_need !== false && Array.isArray(whatWeNeedConfig?.items) && whatWeNeedConfig.items.length > 0 && (
                        <div style={{
                            marginBottom: 20,
                            padding: 16,
                            borderRadius: 14,
                            backgroundColor: '#ecfeff',
                            border: '1px solid #a5f3fc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <HelpCircle size={17} color="#06b6d4" />
                                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#155e75', margin: 0 }}>
                                    {whatWeNeedConfig.title || "What We Will Need From You"}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {whatWeNeedConfig.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ color: '#0891b2', fontWeight: 800 }}>•</span>
                                        <span style={{ fontSize: 12.8, color: '#155e75', lineHeight: 1.45 }}>
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 5. WARRANTY NOTE ══════════════ */}
                    {visibleSections.warranty_note !== false && warrantyConfig && (
                        <div style={{
                            marginBottom: 20,
                            padding: 16,
                            borderRadius: 14,
                            backgroundColor: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start'
                        }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                backgroundColor: '#6338f5',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#4c1d95', margin: '0 0 4px 0' }}>
                                    {warrantyConfig.title || '30-Day Service Guarantee'}
                                </h4>
                                <p style={{ fontSize: 12.8, color: '#5b21b6', margin: 0, lineHeight: 1.5 }}>
                                    {warrantyConfig.text || 'Every service is backed by our 30-day Sorted Promise. If the same issue recurs within 30 days, we revisit and resolve it free of charge.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 6. ALL BRANDS SERVICE ══════════════ */}
                    {visibleSections.all_brands !== false && Array.isArray(brandsConfig?.brands) && brandsConfig.brands.length > 0 && (
                        <div style={{ marginBottom: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <Tag size={16} color="#ec4899" />
                                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {brandsConfig.title || 'We Service All Major Brands'}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {brandsConfig.brands.map((brand, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            color: '#334155'
                                        }}
                                    >
                                        {brand}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 7. FAQ'S ══════════════ */}
                    {visibleSections.faqs !== false && Array.isArray(faqsConfig?.items) && faqsConfig.items.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                                <MessageSquare size={16} color="#3b82f6" />
                                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {faqsConfig.title || 'Frequently Asked Questions'}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {faqsConfig.items.map((faq, i) => {
                                    const isOpen = Boolean(openFaqIndices[i]);
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                borderRadius: 10,
                                                border: '1px solid #e2e8f0',
                                                overflow: 'hidden',
                                                backgroundColor: '#ffffff'
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleFaq(i)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 10,
                                                    border: 'none',
                                                    background: isOpen ? '#f8fafc' : '#ffffff',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: '#0f172a'
                                                }}
                                            >
                                                <span>{faq.q}</span>
                                                {isOpen ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
                                            </button>
                                            {isOpen && (
                                                <div style={{
                                                    padding: '10px 14px 14px 14px',
                                                    fontSize: 12.5,
                                                    color: '#475569',
                                                    lineHeight: 1.5,
                                                    backgroundColor: '#f8fafc',
                                                    borderTop: '1px solid #f1f5f9'
                                                }}>
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ 8. FEEDBACKS / REVIEWS (LAST SECTION) ══════════════ */}
                    {visibleSections.feedbacks !== false && Array.isArray(feedbacksConfig?.items) && feedbacksConfig.items.length > 0 && (() => {
                        const allReviews = feedbacksConfig.items;
                        const displayedReviews = allReviews.slice(0, visibleReviewCount);
                        const hasMoreReviews = visibleReviewCount < allReviews.length;

                        return (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                                    <Star size={16} fill="#eab308" color="#eab308" />
                                    <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {feedbacksConfig.title || 'Customer Reviews & Feedback'}
                                    </h3>
                                    {allReviews.length > 0 && (
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                            ({allReviews.length})
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {displayedReviews.map((fb, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid #e2e8f0'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{fb.name || fb.customer_name || 'Verified Customer'}</strong>
                                                    {fb.location && (
                                                        <span style={{ fontSize: 11.5, color: '#64748b' }}>• {fb.location}</span>
                                                    )}
                                                    {(fb.source === 'Google Reviews' || fb.source === 'google' || !fb.source) && (
                                                        <span style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            padding: '1px 6px',
                                                            borderRadius: 4,
                                                            backgroundColor: '#eef2ff',
                                                            color: '#4338ca',
                                                            border: '1px solid #e0e7ff',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3
                                                        }}>
                                                            <span style={{ color: '#4285F4', fontWeight: 900 }}>G</span> Google Review
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                        {Array.from({ length: fb.rating || 5 }).map((_, si) => (
                                                            <Star key={si} size={12} fill="#eab308" color="#eab308" />
                                                        ))}
                                                    </div>
                                                    {fb.date && (
                                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                            {fb.date}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {(fb.comment || fb.review_text) && (
                                                <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0 0 0', lineHeight: 1.45, fontStyle: 'italic' }}>
                                                    &ldquo;{fb.comment || fb.review_text}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {hasMoreReviews && (
                                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                                        <button
                                            type="button"
                                            onClick={() => setVisibleReviewCount(prev => prev + 5)}
                                            style={{
                                                padding: '8px 22px',
                                                borderRadius: 9999,
                                                border: '1.5px solid #cbd5e1',
                                                backgroundColor: '#ffffff',
                                                color: '#6338f5',
                                                fontSize: 12.5,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                transition: 'all 0.15s ease',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            <span>Show More Reviews</span>
                                            <ChevronDown size={15} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes v2ModalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.96) translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
