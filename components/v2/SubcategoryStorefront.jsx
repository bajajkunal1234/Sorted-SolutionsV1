'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ShieldCheck,
    Clock,
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Wrench,
    Sparkles,
    MapPin,
    Star,
    Umbrella,
    FileText,
    Headphones,
    Share2,
    Plus,
    Minus,
    Check
} from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import CartSummaryBody from './CartSummaryBody';

export default function SubcategoryStorefront({
    category = null,
    subcategory = null,
    services = [],
    categoryCounts = {},
    highlightId = null,
    initialQuery = '',
    pageConfig = null
}) {
    const router = useRouter();
    const { location, setLocationModalOpen, getItemQty, addItem, incrementItem, decrementItem, totals, items: cartItems } = useV2Cart();

    // Accordion state for FAQs
    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    // Reviews pagination
    const [reviewsLimit, setReviewsLimit] = useState(3);

    // Filter services by item.subcategory first, fallback to keyword matching, then category services
    const subcategoryServices = useMemo(() => {
        if (!subcategory) return services;

        const normSubSlug = (subcategory.slug || '').toLowerCase().trim();
        const normSubName = (subcategory.name || '').toLowerCase().trim();

        // 1. Direct match on item.subcategory (by slug or name)
        const directMatches = services.filter(service => {
            const itemSub = (service.subcategory || '').toLowerCase().trim();
            if (!itemSub) return false;
            return (
                itemSub === normSubSlug ||
                itemSub === normSubName ||
                itemSub.replace(/\s+/g, '-') === normSubSlug ||
                normSubSlug.includes(itemSub)
            );
        });

        if (directMatches.length > 0) {
            return directMatches;
        }

        // 2. Keyword fallback match if subcategory is not explicitly set on item
        if (subcategory.keywords && subcategory.keywords.length > 0) {
            const keywords = subcategory.keywords.map(k => k.toLowerCase());
            const matched = services.filter(service => {
                const text = `${service.name} ${service.description || ''} ${service.subgroup || ''}`.toLowerCase();
                return keywords.some(k => text.includes(k));
            });
            if (matched.length > 0) return matched;
        }

        // 3. Fallback to all category services
        return services;
    }, [services, subcategory]);

    // Config sections (from admin or defaults)
    const hero = pageConfig?.hero || {};
    const servicesSection = pageConfig?.servicesSection || {};
    const process = pageConfig?.process || { steps: [] };
    const technicians = pageConfig?.technicians || { points: [] };
    const brands = pageConfig?.brands || { items: [] };
    const coverPromise = pageConfig?.coverPromise || { points: [] };
    const notIncluded = pageConfig?.notIncluded || { items: [] };
    const faqs = pageConfig?.faqs || { items: [] };
    const reviews = pageConfig?.reviews || { items: [] };
    const desktopStickyPromise = pageConfig?.desktopStickyPromise || {};

    const scrollToPromise = () => {
        const el = document.getElementById('v2-cover-promise-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: 100 }}>
            {/* ── Subcategory Top Bar ── */}
            <div style={{
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #f1f5f9',
                position: 'sticky',
                top: 0,
                zIndex: 40
            }}>
                <div className="v2-container" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px'
                }}>
                    <Link
                        href="/v2"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            textDecoration: 'none',
                            color: '#1e293b',
                            fontSize: 14,
                            fontWeight: 700
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>{subcategory?.name || category?.name}</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setLocationModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            borderRadius: 999,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#1e293b'
                        }}
                    >
                        <MapPin size={13} color="#6338f5" />
                        <span>{location.locality || 'Mumbai'}</span>
                    </button>
                </div>
            </div>

            {/* ── Main Layout: Left Content Column + Right Sticky Sidebar ── */}
            <div className="v2-container" style={{ padding: '0 16px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr)',
                    gap: 32,
                    maxWidth: 1140,
                    margin: '0 auto'
                }} className="v2-subcat-desktop-grid">
                    {/* ══════════════ LEFT COLUMN (URBAN COMPANY STOREFRONT FLOW) ══════════════ */}
                    <div style={{ minWidth: 0 }}>
                        {/* 1. TOP HERO MEDIA BANNER */}
                        {hero.enabled !== false && (
                            <section style={{ marginBottom: 20 }}>
                                <div style={{
                                    width: '100%',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    backgroundColor: '#0f172a',
                                    aspectRatio: '16/9',
                                    maxHeight: 380
                                }}>
                                    {hero.mediaType === 'video' ? (
                                        <video
                                            src={hero.mediaUrl || '/images/banners/banner_speed_90_mins.png'}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <img
                                            src={hero.mediaUrl || subcategory?.icon || '/images/banners/banner_problem_solved_expert.png'}
                                            alt={hero.title || subcategory?.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    )}

                                    {/* Stories Progress Bar at bottom of media */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 12,
                                        left: 16,
                                        right: 16,
                                        height: 3,
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        borderRadius: 99
                                    }}>
                                        <div style={{ width: '65%', height: '100%', backgroundColor: '#ffffff', borderRadius: 99 }} />
                                    </div>
                                </div>

                                {/* Title & Rating */}
                                <div style={{ marginTop: 16 }}>
                                    <h1 style={{
                                        fontSize: 'clamp(22px, 5vw, 28px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        margin: '0 0 6px 0',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {hero.title || `${subcategory?.name || 'Appliance'} check-up`}
                                    </h1>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 14,
                                        color: '#475569',
                                        marginBottom: 14
                                    }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, color: '#0f172a' }}>
                                            ★ {hero.rating || '4.84'}
                                        </span>
                                        <span style={{ textDecoration: 'underline dotted', color: '#64748b' }}>
                                            ({hero.reviewsCount || '60K'} reviews)
                                        </span>
                                    </div>

                                    {/* Rate Card / Cover Banner Pill */}
                                    <button
                                        type="button"
                                        onClick={scrollToPromise}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: '#0d9488',
                                                textTransform: 'lowercase',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
                                                ✓ {hero.rateCardBadge || 'sorted cover'}
                                            </span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                                {hero.rateCardText || 'Standard rate card'}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} color="#64748b" />
                                    </button>
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 2. HORIZONTAL SCROLLING SERVICES CAROUSEL */}
                        {servicesSection.enabled !== false && (
                            <section style={{ marginBottom: 28 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                                        {servicesSection.title || 'Select a Service'}
                                    </h2>
                                    {servicesSection.subtitle && (
                                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                            {servicesSection.subtitle}
                                        </p>
                                    )}
                                </div>

                                {subcategoryServices.length === 0 ? (
                                    <div style={{
                                        padding: 24,
                                        borderRadius: 12,
                                        backgroundColor: '#f8fafc',
                                        border: '1px dashed #cbd5e1',
                                        textAlign: 'center',
                                        color: '#64748b'
                                    }}>
                                        <Wrench size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>Services ready to be added</div>
                                        <div style={{ fontSize: 12, marginTop: 4 }}>
                                            Go to Admin &gt; Inventory &gt; Create Service with Subtype 'Web' and Subcategory '{subcategory?.slug}'.
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        gap: 12,
                                        overflowX: 'auto',
                                        paddingBottom: 8,
                                        scrollbarWidth: 'none',
                                        WebkitOverflowScrolling: 'touch'
                                    }}>
                                        {subcategoryServices.map(service => {
                                            const qty = getItemQty(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    style={{
                                                        width: 'clamp(160px, 42vw, 190px)',
                                                        flexShrink: 0,
                                                        borderRadius: 14,
                                                        border: qty > 0 ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                                        backgroundColor: '#ffffff',
                                                        padding: 14,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        boxShadow: qty > 0 ? '0 4px 12px rgba(99,56,245,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div>
                                                        <h3 style={{
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            color: '#0f172a',
                                                            margin: '0 0 6px 0',
                                                            lineHeight: 1.3
                                                        }}>
                                                            {service.name}
                                                        </h3>

                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            fontSize: 12,
                                                            color: '#64748b',
                                                            marginBottom: 10
                                                        }}>
                                                            <span style={{ color: '#16a34a', fontWeight: 700 }}>★</span>
                                                            <span style={{ fontWeight: 600, color: '#334155' }}>
                                                                {service.rating || '4.8'}
                                                            </span>
                                                            <span style={{ fontSize: 11 }}>
                                                                ({service.reviewsCount ? `${Math.round(service.reviewsCount / 1000)}K` : '20K'})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginTop: 10,
                                                        paddingTop: 8,
                                                        borderTop: '1px solid #f1f5f9'
                                                    }}>
                                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                                            {formatINR(service.price)}
                                                        </div>

                                                        {qty === 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => addItem(service)}
                                                                style={{
                                                                    padding: '6px 16px',
                                                                    borderRadius: 8,
                                                                    border: '1px solid #6338f5',
                                                                    backgroundColor: '#ffffff',
                                                                    color: '#6338f5',
                                                                    fontWeight: 700,
                                                                    fontSize: 13,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                Add
                                                            </button>
                                                        ) : (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                backgroundColor: '#6338f5',
                                                                borderRadius: 8,
                                                                padding: '4px 8px',
                                                                color: '#ffffff'
                                                            }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => decrementItem(service.id)}
                                                                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    <Minus size={13} />
                                                                </button>
                                                                <span style={{ fontSize: 12, fontWeight: 700 }}>{qty}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => incrementItem(service.id)}
                                                                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 3. OUR PROCESS SECTION (VERTICAL TIMELINE) */}
                        {process.enabled !== false && (process.steps || []).length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0' }}>
                                    {process.title || 'Our process'}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {process.steps.map((st, idx) => {
                                        const isLast = idx === process.steps.length - 1;
                                        return (
                                            <div key={idx} style={{ display: 'flex', gap: 16 }}>
                                                {/* Left timeline bubble + line */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: '50%',
                                                        backgroundColor: '#f1f5f9',
                                                        color: '#334155',
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {st.number || idx + 1}
                                                    </div>
                                                    {!isLast && (
                                                        <div style={{
                                                            width: 2,
                                                            flex: 1,
                                                            backgroundColor: '#e2e8f0',
                                                            margin: '4px 0'
                                                        }} />
                                                    )}
                                                </div>

                                                {/* Right Content */}
                                                <div style={{ paddingBottom: isLast ? 0 : 24, flex: 1 }}>
                                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                                                        {st.title}
                                                    </h3>
                                                    <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.45 }}>
                                                        {st.description}
                                                    </p>
                                                    {st.imageUrl && (
                                                        <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', maxWidth: 300 }}>
                                                            <img src={st.imageUrl} alt={st.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 4. TOP TECHNICIANS SECTION */}
                        {technicians.enabled !== false && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {technicians.title || 'Top technicians'}
                                </h2>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 20,
                                    padding: '16px 0'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                        {(technicians.points || []).map((pt, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <ShieldCheck size={18} color="#10b981" />
                                                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                                    {pt}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {technicians.photoUrl && (
                                        <div style={{
                                            width: 120,
                                            height: 120,
                                            borderRadius: 16,
                                            overflow: 'hidden',
                                            backgroundColor: '#f8fafc',
                                            flexShrink: 0
                                        }}>
                                            <img
                                                src={technicians.photoUrl}
                                                alt="Top technician"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 5. WE SERVICE ALL BRANDS SECTION */}
                        {brands.enabled !== false && (brands.items || []).length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                                    {brands.title || 'We service all brands'}
                                </h2>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                    gap: 10,
                                    marginBottom: 12
                                }}>
                                    {brands.items.map((bName, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '10px 8px',
                                                borderRadius: 10,
                                                border: '1px solid #e2e8f0',
                                                backgroundColor: '#f8fafc',
                                                textAlign: 'center',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#1e293b'
                                            }}
                                        >
                                            {bName}
                                        </div>
                                    ))}
                                </div>

                                {brands.disclaimer && (
                                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                                        {brands.disclaimer}
                                    </p>
                                )}
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 6. COVER PROMISE SECTION */}
                        {coverPromise.enabled !== false && (
                            <section id="v2-cover-promise-section" style={{ marginBottom: 32 }}>
                                <h2 style={{
                                    fontSize: 20,
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    margin: '0 0 16px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <span style={{ color: '#0d9488' }}>✓</span> {coverPromise.title || 'Sorted Cover Promise'}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {(coverPromise.points || []).map((pt, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Check size={14} />
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                                {typeof pt === 'string' ? pt : pt.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 7. WHAT IS NOT INCLUDED SECTION */}
                        {notIncluded.enabled !== false && (notIncluded.items || []).length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {notIncluded.title || 'What is not included'}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {notIncluded.items.map((it, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 14 }}>✕</span>
                                            <span style={{ fontSize: 14, color: '#475569' }}>
                                                {it}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 8. FREQUENTLY ASKED QUESTIONS */}
                        {faqs.enabled !== false && (faqs.items || []).length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {faqs.title || 'Frequently asked questions'}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {faqs.items.map((faq, idx) => {
                                        const isOpen = openFaqIndex === idx;
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    padding: '14px 0'
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 0,
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        gap: 12
                                                    }}
                                                >
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                                                        {faq.question}
                                                    </span>
                                                    {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                                                </button>

                                                {isOpen && (
                                                    <p style={{ fontSize: 13, color: '#475569', margin: '10px 0 0 0', lineHeight: 1.5 }}>
                                                        {faq.answer}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* 9. CUSTOMER REVIEWS & RATINGS */}
                        {reviews.enabled !== false && (
                            <section style={{ marginBottom: 40 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {reviews.title || 'Customer Reviews'}
                                </h2>

                                {/* Rating summary score + Distribution Bars */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 24,
                                    marginBottom: 20,
                                    padding: 16,
                                    backgroundColor: '#f8fafc',
                                    borderRadius: 14
                                }}>
                                    <div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
                                            ★ {reviews.rating || '4.83'}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>
                                            {reviews.totalCount || '135K reviews'}
                                        </div>
                                    </div>

                                    {/* Mini bars */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {[
                                            { star: 5, pct: '88%' },
                                            { star: 4, pct: '8%' },
                                            { star: 3, pct: '2%' },
                                            { star: 2, pct: '1%' },
                                            { star: 1, pct: '1%' }
                                        ].map(b => (
                                            <div key={b.star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
                                                <span style={{ width: 14 }}>★ {b.star}</span>
                                                <div style={{ flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 99 }}>
                                                    <div style={{ width: b.pct, height: '100%', backgroundColor: '#0f172a', borderRadius: 99 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Review Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {(reviews.items || []).slice(0, reviewsLimit).map((rev, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '12px 0',
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <strong style={{ fontSize: 14, color: '#0f172a' }}>
                                                    {rev.name}
                                                </strong>
                                                <span style={{
                                                    fontSize: 11,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    backgroundColor: '#16a34a',
                                                    color: '#ffffff',
                                                    fontWeight: 700
                                                }}>
                                                    ★ {rev.rating || 5}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                                                {rev.date} {rev.tag ? `• ${rev.tag}` : ''}
                                            </div>
                                            <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.45 }}>
                                                {rev.comment}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {(reviews.items || []).length > reviewsLimit && (
                                    <button
                                        type="button"
                                        onClick={() => setReviewsLimit(prev => prev + 5)}
                                        style={{
                                            marginTop: 16,
                                            width: '100%',
                                            padding: '10px 16px',
                                            borderRadius: 10,
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#ffffff',
                                            color: '#6338f5',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Show more reviews
                                    </button>
                                )}
                            </section>
                        )}
                    </div>

                    {/* ══════════════ RIGHT STICKY COLUMN (DESKTOP ONLY) ══════════════ */}
                    <div className="v2-subcat-desktop-sidebar">
                        <div style={{
                            position: 'sticky',
                            top: 80,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20
                        }}>
                            {/* Sorted Promise Card */}
                            <div style={{
                                padding: 20,
                                borderRadius: 16,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {desktopStickyPromise.title || 'Sorted Promise'}
                                    </h3>
                                    <span style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        letterSpacing: '0.04em',
                                        padding: '3px 8px',
                                        borderRadius: 999,
                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdfa 100%)',
                                        color: '#0369a1',
                                        border: '1px solid #bae6fd'
                                    }}>
                                        {desktopStickyPromise.badgeText || 'QUALITY ASSURED'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                                    {(desktopStickyPromise.points || [
                                        'Verified Professionals',
                                        'Hassle Free Booking',
                                        'Transparent Pricing'
                                    ]).map((pt, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                                            <CheckCircle2 size={15} color="#10b981" />
                                            <span>{pt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Summary Card */}
                            <div style={{
                                padding: 20,
                                borderRadius: 16,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                            }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                                    Cart Summary
                                </h3>
                                <CartSummaryBody />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile Floating Cart Bar (Appears when items are in cart) ── */}
            {cartItems.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    padding: '12px 16px',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                    borderTop: '1px solid #e2e8f0',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }} className="v2-subcat-mobile-cart-bar">
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            {formatINR(totals.finalTotal)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
                        </div>
                    </div>

                    <Link
                        href="/v2/checkout"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 20px',
                            borderRadius: 12,
                            backgroundColor: '#6338f5',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 14,
                            textDecoration: 'none',
                            boxShadow: '0 4px 14px rgba(99,56,245,0.35)'
                        }}
                    >
                        <span>View Cart</span>
                        <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            {/* Embedded styles for responsive desktop/mobile layout */}
            <style jsx global>{`
                @media (min-width: 900px) {
                    .v2-subcat-desktop-grid {
                        grid-template-columns: minmax(0, 1fr) 340px !important;
                    }
                    .v2-subcat-desktop-sidebar {
                        display: block !important;
                    }
                    .v2-subcat-mobile-cart-bar {
                        display: none !important;
                    }
                }
                @media (max-width: 899px) {
                    .v2-subcat-desktop-sidebar {
                        display: none !important;
                    }
                    .v2-subcat-mobile-cart-bar {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
}
