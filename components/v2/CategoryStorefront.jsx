'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ShieldCheck,
    Clock,
    CheckCircle2,
    ChevronLeft,
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
import SlidingThumbnail from './SlidingThumbnail';

export default function CategoryStorefront({
    category = null,
    subcategories = [],
    services = [],
    categoryCounts = {},
    highlightId = null,
    initialQuery = '',
    initialType = null,
    pageConfig = null
}) {
    const router = useRouter();
    const { location, setLocationModalOpen, getItemQty, addItem, incrementItem, decrementItem, totals, items: cartItems, brandLogos } = useV2Cart();

    // Accordion state for FAQs
    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    // Reviews pagination
    const [reviewsLimit, setReviewsLimit] = useState(3);

    // Active subcategories list
    const activeSubcategories = useMemo(() => {
        if (Array.isArray(subcategories) && subcategories.length > 0) {
            return subcategories.filter(s => !s.isDeleted);
        }
        if (Array.isArray(category?.subcategories) && category.subcategories.length > 0) {
            return category.subcategories.filter(s => !s.isDeleted);
        }
        return [];
    }, [subcategories, category]);

    // Appliance type filter state (in-page subcategory filter)
    const [selectedSubcategory, setSelectedSubcategory] = useState(initialType || null);

    // Filter services based on selected appliance type
    const displayedServices = useMemo(() => {
        if (!selectedSubcategory) return services;
        const targetClean = selectedSubcategory.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetWords = selectedSubcategory.toLowerCase().replace(/-/g, ' ');
        const matched = services.filter(s => {
            const subClean = (s.subcategory || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const nameLower = (s.name || '').toLowerCase();
            const descLower = (s.description || '').toLowerCase();
            return subClean.includes(targetClean) ||
                targetClean.includes(subClean) ||
                nameLower.includes(targetWords) ||
                descLower.includes(targetWords);
        });
        return matched.length > 0 ? matched : services;
    }, [services, selectedSubcategory]);

    // Config sections (from admin or defaults)
    const hero = pageConfig?.hero || {};
    const servicesSection = pageConfig?.servicesSection || {};
    const applianceTypeSection = pageConfig?.applianceType || {};
    const process = pageConfig?.process || { steps: [] };
    const technicians = pageConfig?.technicians || { points: [] };
    const brands = pageConfig?.brands || { items: [] };
    const coverPromise = pageConfig?.coverPromise || { points: [] };
    const notIncluded = pageConfig?.notIncluded || { items: [] };
    const faqs = pageConfig?.faqs || { items: [] };
    const reviews = pageConfig?.reviews || { items: [] };
    const desktopStickyPromise = pageConfig?.desktopStickyPromise || {};

    // ── Multi-Slide Hero Carousel (Auto-scroll with Story Progress Bars) ──
    const heroSlides = useMemo(() => {
        if (Array.isArray(hero.slides) && hero.slides.length > 0) {
            const activeOnly = hero.slides.filter(s => s && s.mediaUrl && s.active !== false);
            if (activeOnly.length > 0) return activeOnly;
        }
        if (hero.mediaUrl) {
            return [{
                id: 'slide-1',
                mediaType: hero.mediaType || 'image',
                mediaUrl: hero.mediaUrl,
                title: hero.title || ''
            }];
        }
        return [
            {
                id: 'slide-1',
                mediaType: 'image',
                mediaUrl: category?.banner || '/images/banners/banner_speed_90_mins.png',
                title: '90-Min Arrival'
            }
        ];
    }, [hero.slides, hero.mediaUrl, hero.mediaType, category]);

    const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
    const [isHeroPaused, setIsHeroPaused] = useState(false);
    const heroTouchStartX = useRef(0);
    const heroTouchEndX = useRef(0);
    const heroVideoRef = useRef(null);

    const autoSlideSeconds = Number(hero.autoSlideSeconds) || 5;
    const enableVideoAdvance = hero.enableVideoAdvance !== false;
    const totalHeroSlides = heroSlides.length;
    const activeHeroSlide = heroSlides[currentHeroIdx] || heroSlides[0] || {};

    const nextHeroSlide = useCallback(() => {
        if (totalHeroSlides <= 1) return;
        setCurrentHeroIdx(prev => (prev + 1) % totalHeroSlides);
    }, [totalHeroSlides]);

    const prevHeroSlide = useCallback(() => {
        if (totalHeroSlides <= 1) return;
        setCurrentHeroIdx(prev => (prev - 1 + totalHeroSlides) % totalHeroSlides);
    }, [totalHeroSlides]);

    // Timer-based auto advance
    useEffect(() => {
        if (totalHeroSlides <= 1 || isHeroPaused) return;

        if (activeHeroSlide.mediaType === 'video' && enableVideoAdvance) {
            const safety = setTimeout(() => {
                nextHeroSlide();
            }, 18000);
            return () => clearTimeout(safety);
        }

        const timer = setTimeout(() => {
            nextHeroSlide();
        }, autoSlideSeconds * 1000);

        return () => clearTimeout(timer);
    }, [currentHeroIdx, totalHeroSlides, autoSlideSeconds, isHeroPaused, activeHeroSlide.mediaType, enableVideoAdvance, nextHeroSlide]);

    const handleHeroTouchStart = (e) => {
        heroTouchStartX.current = e.touches[0].clientX;
        setIsHeroPaused(true);
    };

    const handleHeroTouchEnd = (e) => {
        heroTouchEndX.current = e.changedTouches[0].clientX;
        setIsHeroPaused(false);
        const diff = heroTouchStartX.current - heroTouchEndX.current;
        if (diff > 40) {
            nextHeroSlide();
        } else if (diff < -40) {
            prevHeroSlide();
        }
    };

    // ── Horizontal Services Carousel Scrolling ──
    const servicesScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollButtons = () => {
        const el = servicesScrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
        const el = servicesScrollRef.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons, { passive: true });
        window.addEventListener('resize', updateScrollButtons);
        return () => {
            el.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [services]);

    const scrollServices = (direction) => {
        const el = servicesScrollRef.current;
        if (!el) return;
        const amount = direction === 'left' ? -260 : 260;
        el.scrollBy({ left: amount, behavior: 'smooth' });
    };

    // Modal state for viewing service details
    const [selectedServiceModal, setSelectedServiceModal] = useState(null);

    // Smooth scroll to cover promise anchor
    const scrollToPromise = () => {
        const el = document.getElementById('v2-cover-promise-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const formatPrice = (price) => formatINR(price);

    return (
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: 80 }}>
            {/* ══════════════ 1. TOP MEDIA & HERO BANNER (URBAN COMPANY STORIES STYLE) ══════════════ */}
            {hero.enabled !== false && (
                <section
                    style={{ position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: '#000000' }}
                    onTouchStart={handleHeroTouchStart}
                    onTouchEnd={handleHeroTouchEnd}
                    onMouseEnter={() => setIsHeroPaused(true)}
                    onMouseLeave={() => setIsHeroPaused(false)}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: 'clamp(260px, 42vw, 420px)',
                            maxHeight: 460,
                            overflow: 'hidden'
                        }}
                    >
                        {/* Current Slide Media */}
                        {activeHeroSlide.mediaType === 'video' ? (
                            <video
                                ref={heroVideoRef}
                                key={activeHeroSlide.mediaUrl}
                                src={activeHeroSlide.mediaUrl}
                                autoPlay
                                muted
                                playsInline
                                onEnded={enableVideoAdvance ? nextHeroSlide : undefined}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                            />
                        ) : (
                            <img
                                key={activeHeroSlide.mediaUrl || currentHeroIdx}
                                src={activeHeroSlide.mediaUrl}
                                alt={activeHeroSlide.title || hero.title || category?.name || 'Category'}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                                onError={(e) => {
                                    e.currentTarget.src = category?.banner || '/images/banners/banner_speed_90_mins.png';
                                }}
                            />
                        )}

                        {/* Top Gradient for Header Controls Visibility */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 110,
                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0) 100%)',
                                zIndex: 5,
                                pointerEvents: 'none'
                            }}
                        />

                        {/* Top Header Floating Bar: Back Button (Left) + Clean Logo (Right) */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 14,
                                left: 16,
                                right: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                zIndex: 12
                            }}
                        >
                            {/* Back Button */}
                            <Link
                                href="/v2"
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#0f172a',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                                    textDecoration: 'none',
                                    flexShrink: 0,
                                    transition: 'transform 0.1s ease'
                                }}
                                title="Back to Home"
                            >
                                <ArrowLeft size={19} />
                            </Link>

                            {/* Right Aligned: Brand Logo (Clean, No Pill, No Text) */}
                            <Link
                                href="/v2"
                                aria-label={brandLogos?.altText || "Sorted Solutions"}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    textDecoration: 'none',
                                    flexShrink: 0
                                }}
                            >
                                <img
                                    src={brandLogos?.darkModeLogo || brandLogos?.dayModeLogo || '/images/logos/logo-dark.png'}
                                    alt={brandLogos?.altText || "Sorted Solutions"}
                                    style={{
                                        height: 34,
                                        maxHeight: 38,
                                        width: 'auto',
                                        maxWidth: 130,
                                        objectFit: 'contain',
                                        display: 'block',
                                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))'
                                    }}
                                    onError={(e) => { e.currentTarget.src = '/images/logos/logo-dark.png'; }}
                                />
                            </Link>
                        </div>

                        {/* Desktop Navigation Arrows (Prev / Next) */}
                        {totalHeroSlides > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); prevHeroSlide(); }}
                                    aria-label="Previous slide"
                                    style={{
                                        position: 'absolute',
                                        left: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                        color: '#ffffff',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        backdropFilter: 'blur(4px)',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); nextHeroSlide(); }}
                                    aria-label="Next slide"
                                    style={{
                                        position: 'absolute',
                                        right: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                        color: '#ffffff',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        backdropFilter: 'blur(4px)',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}

                        {/* Story Progress Bars (Bottom of Slide) */}
                        {totalHeroSlides > 1 ? (
                            <div style={{
                                position: 'absolute',
                                bottom: 12,
                                left: 16,
                                right: 16,
                                display: 'flex',
                                gap: 6,
                                zIndex: 10
                            }}>
                                {heroSlides.map((slide, idx) => {
                                    const isPassed = idx < currentHeroIdx;
                                    const isCurrent = idx === currentHeroIdx;
                                    return (
                                        <button
                                            key={slide.id || idx}
                                            type="button"
                                            onClick={() => setCurrentHeroIdx(idx)}
                                            style={{
                                                flex: 1,
                                                height: 3,
                                                borderRadius: 99,
                                                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                                                overflow: 'hidden',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            aria-label={`Go to slide ${idx + 1}`}
                                        >
                                            <div
                                                key={`cat-slide-${currentHeroIdx}-${idx}`}
                                                style={{
                                                    width: isPassed ? '100%' : isCurrent ? '100%' : '0%',
                                                    height: '100%',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: 99,
                                                    animation: isCurrent && !isHeroPaused ? `v2StoryProgressFill ${autoSlideSeconds}s linear forwards` : undefined
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{
                                position: 'absolute',
                                bottom: 12,
                                left: 16,
                                right: 16,
                                height: 3,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 99,
                                zIndex: 10
                            }}>
                                <div style={{ width: '65%', height: '100%', backgroundColor: '#ffffff', borderRadius: 99 }} />
                            </div>
                        )}
                    </div>
                </section>
            )}

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
                        {/* Title, Rating & Rate Card Pill */}
                        <section style={{ marginBottom: 20 }}>
                            <div>
                                <h1 style={{
                                    fontSize: 'clamp(22px, 5vw, 28px)',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    margin: '0 0 6px 0',
                                    letterSpacing: '-0.02em'
                                }}>
                                    {hero.title || `${category?.name || 'Appliance'} Service & Repair`}
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
                                        ★ {hero.rating || '4.86'}
                                    </span>
                                    <span style={{ textDecoration: 'underline dotted', color: '#64748b' }}>
                                        ({hero.reviewsCount || '85K'} reviews)
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

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                        {/* ══════════════ 2. HORIZONTAL SCROLLING SERVICES CAROUSEL ══════════════ */}
                        {servicesSection.enabled !== false && (
                            <section id="v2-services-section" style={{ marginBottom: 28, scrollMarginTop: 80 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                                                {servicesSection.title || 'Select a Service'}
                                            </h2>
                                            {servicesSection.subtitle && (
                                                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                                    {servicesSection.subtitle}
                                                </p>
                                            )}
                                        </div>

                                        {selectedSubcategory && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    color: '#6338f5',
                                                    backgroundColor: '#f5f3ff',
                                                    padding: '4px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid #c4b5fd',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    ✓ {activeSubcategories.find(s => s.slug === selectedSubcategory)?.name || selectedSubcategory}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSubcategory(null)}
                                                    style={{
                                                        fontSize: 11.5,
                                                        fontWeight: 600,
                                                        color: '#64748b',
                                                        background: '#f1f5f9',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        padding: '4px 8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Show all
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {displayedServices.length === 0 ? (
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
                                            Go to Admin &gt; Inventory &gt; Create Service with Subtype 'Web' and Category '{category?.name}'.
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        {/* Desktop Left Scroll Button */}
                                        {canScrollLeft && (
                                            <button
                                                type="button"
                                                onClick={() => scrollServices('left')}
                                                style={{
                                                    position: 'absolute',
                                                    left: -14,
                                                    top: '42%',
                                                    transform: 'translateY(-50%)',
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 10,
                                                    color: '#0f172a'
                                                }}
                                                aria-label="Scroll services left"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                        )}

                                        {/* Track */}
                                        <div
                                            ref={servicesScrollRef}
                                            style={{
                                                display: 'flex',
                                                gap: 12,
                                                overflowX: 'auto',
                                                scrollSnapType: 'x mandatory',
                                                paddingBottom: 8,
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none'
                                            }}
                                        >
                                            {displayedServices.map(service => {
                                                const qty = getItemQty(service.id);
                                                const isHighlighted = highlightId && service.id === highlightId;
                                                const serviceImg = service.images?.[0] || category?.icon || '/images/services/ac_3d.png';

                                                return (
                                                    <div
                                                        key={service.id}
                                                        id={`svc-${service.id}`}
                                                        style={{
                                                            flex: '0 0 135px',
                                                            width: 135,
                                                            scrollSnapAlign: 'start',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            padding: 10,
                                                            borderRadius: 12,
                                                            border: isHighlighted ? '2px solid #6338f5' : '1px solid #e2e8f0',
                                                            backgroundColor: isHighlighted ? '#f5f3ff' : '#ffffff',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {/* Top: Image & Info (clickable for detail modal) */}
                                                        <div
                                                            onClick={() => setSelectedServiceModal(service)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div style={{
                                                                width: '100%',
                                                                height: 90,
                                                                borderRadius: 8,
                                                                backgroundColor: '#f8fafc',
                                                                overflow: 'hidden',
                                                                marginBottom: 8,
                                                                position: 'relative'
                                                            }}>
                                                                <img
                                                                    src={serviceImg}
                                                                    alt={service.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    onError={(e) => { e.currentTarget.src = category?.icon || '/images/services/ac_3d.png'; }}
                                                                />
                                                            </div>

                                                            <h3 style={{
                                                                fontSize: 12.5,
                                                                fontWeight: 700,
                                                                color: '#0f172a',
                                                                lineHeight: 1.25,
                                                                margin: '0 0 4px 0',
                                                                minHeight: 32,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {service.name}
                                                            </h3>

                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                                fontSize: 11,
                                                                color: '#64748b',
                                                                marginBottom: 6
                                                            }}>
                                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>★ 4.8</span>
                                                                <span>(20K)</span>
                                                            </div>
                                                        </div>

                                                        {/* Bottom: Price + ADD button */}
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginTop: 4,
                                                            paddingTop: 6,
                                                            borderTop: '1px solid #f1f5f9'
                                                        }}>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                                                                {formatPrice(service.sale_price || service.selling_price || 299)}
                                                            </div>

                                                            {qty === 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        addItem(service);
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 12px',
                                                                        borderRadius: 6,
                                                                        backgroundColor: '#ffffff',
                                                                        border: '1px solid #cbd5e1',
                                                                        color: '#6338f5',
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                >
                                                                    Add
                                                                </button>
                                                            ) : (
                                                                <div style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    backgroundColor: '#f5f3ff',
                                                                    borderRadius: 6,
                                                                    border: '1px solid #c4b5fd',
                                                                    padding: '2px 4px'
                                                                }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); decrementItem(service.id); }}
                                                                        style={{
                                                                            width: 18,
                                                                            height: 18,
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            color: '#6338f5',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            padding: 0
                                                                        }}
                                                                    >
                                                                        <Minus size={11} />
                                                                    </button>
                                                                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#6338f5', minWidth: 12, textAlign: 'center' }}>
                                                                        {qty}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); incrementItem(service.id); }}
                                                                        style={{
                                                                            width: 18,
                                                                            height: 18,
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            color: '#6338f5',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            padding: 0
                                                                        }}
                                                                    >
                                                                        <Plus size={11} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop Right Scroll Button */}
                                        {canScrollRight && (
                                            <button
                                                type="button"
                                                onClick={() => scrollServices('right')}
                                                style={{
                                                    position: 'absolute',
                                                    right: -14,
                                                    top: '42%',
                                                    transform: 'translateY(-50%)',
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 10,
                                                    color: '#0f172a'
                                                }}
                                                aria-label="Scroll services right"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ══════════════ 3. SELECT YOUR APPLIANCE TYPE SECTION ══════════════ */}
                        {applianceTypeSection.enabled !== false && activeSubcategories.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '20px 0' }} />

                                <div style={{ marginBottom: 14 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 3px 0' }}>
                                        {applianceTypeSection.title || 'Select your appliance type'}
                                    </h2>
                                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                        {applianceTypeSection.subtitle || `Choose your ${category?.name || 'appliance'} model for specialized repair and pricing`}
                                    </p>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: 12
                                }} className="v2-appliance-types-grid">
                                    {activeSubcategories.map(sub => {
                                        const isSelected = selectedSubcategory === sub.slug;
                                        const subSlides = Array.isArray(sub.thumbnailSlides) && sub.thumbnailSlides.length > 0
                                            ? sub.thumbnailSlides
                                            : null;
                                        const subIcon = sub.icon || sub.thumbnailUrl || category?.icon || '/images/services/ac_3d.png';

                                        return (
                                            <button
                                                key={sub.slug}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedSubcategory(null);
                                                    } else {
                                                        setSelectedSubcategory(sub.slug);
                                                        const el = document.getElementById('v2-services-section');
                                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }
                                                }}
                                                className="v2-appliance-type-card"
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    textAlign: 'center',
                                                    padding: '16px 12px',
                                                    backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                                                    borderRadius: 14,
                                                    border: isSelected ? '2px solid #6338f5' : '1px solid #e2e8f0',
                                                    color: 'inherit',
                                                    boxShadow: isSelected ? '0 4px 14px rgba(99,56,245,0.18)' : '0 2px 8px rgba(0,0,0,0.03)',
                                                    transition: 'all 0.18s ease',
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    position: 'relative'
                                                }}
                                            >
                                                {isSelected && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        backgroundColor: '#6338f5',
                                                        color: '#ffffff',
                                                        borderRadius: '50%',
                                                        width: 18,
                                                        height: 18,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 10,
                                                        fontWeight: 900
                                                    }}>
                                                        ✓
                                                    </span>
                                                )}
                                                <div style={{
                                                    width: 68,
                                                    height: 68,
                                                    borderRadius: 12,
                                                    backgroundColor: isSelected ? '#ede9fe' : (category?.accent || '#f8fafc'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginBottom: 10,
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}>
                                                    {subSlides ? (
                                                        <SlidingThumbnail
                                                            slides={subSlides}
                                                            fallbackUrl={subIcon}
                                                            alt={sub.name}
                                                            interval={3500}
                                                            width="100%"
                                                            height="100%"
                                                            objectFit="contain"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={subIcon}
                                                            alt={sub.name}
                                                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                                            onError={(e) => { e.currentTarget.src = category?.icon || '/images/services/ac_3d.png'; }}
                                                        />
                                                    )}
                                                </div>

                                                <span style={{
                                                    fontSize: 13.5,
                                                    fontWeight: 700,
                                                    color: isSelected ? '#6338f5' : '#0f172a',
                                                    lineHeight: 1.25,
                                                    marginBottom: 4
                                                }}>
                                                    {sub.name}
                                                </span>

                                                {sub.shortDesc && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        color: '#64748b',
                                                        lineHeight: 1.3,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {sub.shortDesc}
                                                    </span>
                                                )}

                                                <span style={{
                                                    marginTop: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: isSelected ? '#6338f5' : '#6338f5',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 3
                                                }}>
                                                    {isSelected ? 'Selected' : 'Select'} <ChevronRight size={12} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '24px 0' }} />

                        {/* ══════════════ 4. OUR PROCESS (STEP-BY-STEP) ══════════════ */}
                        {process.enabled !== false && Array.isArray(process.steps) && process.steps.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <div style={{ marginBottom: 16 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 3px 0' }}>
                                        {process.title || 'Our process'}
                                    </h2>
                                    {process.subtitle && (
                                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                            {process.subtitle}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {process.steps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                gap: 16,
                                                alignItems: 'flex-start',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: '50%',
                                                backgroundColor: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 12,
                                                fontWeight: 800,
                                                color: '#0f172a',
                                                flexShrink: 0
                                            }}>
                                                {idx + 1}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                                                    {step.title}
                                                </h3>
                                                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                                                    {step.desc}
                                                </p>
                                            </div>

                                            {step.imageUrl && (
                                                <div style={{
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: 8,
                                                    backgroundColor: '#f8fafc',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}>
                                                    <img
                                                        src={step.imageUrl}
                                                        alt={step.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '24px 0' }} />

                        {/* ══════════════ 5. TOP TECHNICIANS CARD ══════════════ */}
                        {technicians.enabled !== false && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {technicians.title || 'Top technicians'}
                                </h2>

                                <div style={{
                                    padding: 18,
                                    borderRadius: 14,
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    gap: 16,
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: '50%',
                                        backgroundColor: '#ffffff',
                                        border: '2px solid #6338f5',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={technicians.imageUrl || '/images/banners/banner_expertise_v3.png'}
                                            alt="Top Technician"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.currentTarget.src = category?.icon || '/images/services/ac_3d.png'; }}
                                        />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {technicians.badge && (
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                color: '#6338f5',
                                                backgroundColor: '#ede9fe',
                                                padding: '2px 7px',
                                                borderRadius: 4,
                                                textTransform: 'uppercase',
                                                display: 'inline-block',
                                                marginBottom: 4
                                            }}>
                                                {technicians.badge}
                                            </span>
                                        )}
                                        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                                            {technicians.name || 'Pramod Sharma & 48+ verified experts'}
                                        </h3>
                                        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 8px 0' }}>
                                            {technicians.experienceText || '7+ years experience • Verified background'}
                                        </p>

                                        {Array.isArray(technicians.points) && technicians.points.length > 0 && (
                                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#475569' }}>
                                                {technicians.points.map((pt, i) => (
                                                    <li key={i} style={{ marginBottom: 2 }}>{pt}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ══════════════ 6. WE SERVICE ALL BRANDS ══════════════ */}
                        {brands.enabled !== false && Array.isArray(brands.items) && brands.items.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                                    {brands.title || 'We service all brands'}
                                </h2>
                                {brands.subtitle && (
                                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px 0' }}>
                                        {brands.subtitle}
                                    </p>
                                )}

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {brands.items.map((brand, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: 20,
                                                backgroundColor: '#f1f5f9',
                                                color: '#1e293b',
                                                fontSize: 12.5,
                                                fontWeight: 600,
                                                border: '1px solid #e2e8f0'
                                            }}
                                        >
                                            {brand}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '24px 0' }} />

                        {/* ══════════════ 7. SORTED COVER PROMISE ══════════════ */}
                        {coverPromise.enabled !== false && (
                            <section id="v2-cover-promise-section" style={{ marginBottom: 32 }}>
                                <div style={{
                                    padding: 20,
                                    borderRadius: 14,
                                    backgroundColor: '#f0fdf4',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <ShieldCheck size={22} color="#16a34a" />
                                        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#166534', margin: 0 }}>
                                            {coverPromise.title || 'Sorted Cover Promise'}
                                        </h2>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: 12
                                    }}>
                                        {(coverPromise.points || []).map((pt, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#14532d', fontWeight: 600 }}>
                                                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                                                <span>{pt.text || pt}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ══════════════ 8. WHAT IS NOT INCLUDED ══════════════ */}
                        {notIncluded.enabled !== false && Array.isArray(notIncluded.items) && notIncluded.items.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
                                    {notIncluded.title || "What's not included"}
                                </h2>

                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                                    {notIncluded.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '24px 0' }} />

                        {/* ══════════════ 9. FREQUENTLY ASKED QUESTIONS ══════════════ */}
                        {faqs.enabled !== false && Array.isArray(faqs.items) && faqs.items.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                                    {faqs.title || 'Frequently asked questions'}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {faqs.items.map((faq, i) => {
                                        const isOpen = openFaqIndex === i;
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 12,
                                                    overflow: 'hidden',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenFaqIndex(isOpen ? -1 : i)}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '14px 16px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                                        {faq.q}
                                                    </span>
                                                    {isOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                                                </button>

                                                {isOpen && (
                                                    <div style={{
                                                        padding: '0 16px 14px 16px',
                                                        fontSize: 13,
                                                        color: '#475569',
                                                        lineHeight: 1.5,
                                                        borderTop: '1px solid #f8fafc'
                                                    }}>
                                                        {faq.a}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '24px 0' }} />

                        {/* ══════════════ 10. CUSTOMER REVIEWS & RATINGS ══════════════ */}
                        {reviews.enabled !== false && Array.isArray(reviews.items) && reviews.items.length > 0 && (
                            <section style={{ marginBottom: 32 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {reviews.title || 'Customer reviews & ratings'}
                                    </h2>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                        ★ {reviews.rating || '4.86'} ({reviews.reviewsCount || '85K'})
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {reviews.items.slice(0, reviewsLimit).map((rev, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                padding: 16,
                                                borderRadius: 12,
                                                border: '1px solid #e2e8f0',
                                                backgroundColor: '#f8fafc'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <div>
                                                    <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{rev.author}</strong>
                                                    {rev.locality && (
                                                        <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 6 }}>
                                                            • {rev.locality}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{rev.date}</span>
                                            </div>

                                            <div style={{ color: '#eab308', fontSize: 12, marginBottom: 6 }}>
                                                {'★'.repeat(rev.rating || 5)}
                                            </div>

                                            <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.45, margin: 0 }}>
                                                {rev.comment}
                                            </p>
                                        </div>
                                    ))}

                                    {reviews.items.length > reviewsLimit && (
                                        <button
                                            type="button"
                                            onClick={() => setReviewsLimit(prev => prev + 3)}
                                            style={{
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
                                            View More Reviews
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ══════════════ RIGHT COLUMN: DESKTOP STICKY SIDEBAR (CART + PROMISE) ══════════════ */}
                    <aside className="v2-subcat-desktop-sidebar">
                        <div style={{ position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Live Cart Summary Box */}
                            <div style={{
                                padding: 20,
                                borderRadius: 16,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                            }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                                    Your Cart
                                </h3>
                                <CartSummaryBody />
                            </div>

                            {/* Sorted Promise Card */}
                            <div style={{
                                padding: 18,
                                borderRadius: 16,
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ShieldCheck size={18} color="#6338f5" />
                                        <strong style={{ fontSize: 14, color: '#0f172a' }}>
                                            {desktopStickyPromise.title || 'Sorted Promise'}
                                        </strong>
                                    </div>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#10b981', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                                        {desktopStickyPromise.badgeText || 'QUALITY ASSURED'}
                                    </span>
                                </div>

                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
                                    {(desktopStickyPromise.points || [
                                        'Verified Professionals',
                                        'Hassle Free Booking',
                                        'Transparent Pricing'
                                    ]).map((pt, i) => (
                                        <li key={i}>{pt}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ══════════════ SERVICE DETAIL POPUP MODAL ══════════════ */}
            {selectedServiceModal && (
                <div
                    onClick={() => setSelectedServiceModal(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 480,
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                            animation: 'v2ModalPop 0.18s ease-out'
                        }}
                    >
                        <div style={{ position: 'relative', width: '100%', height: 200, backgroundColor: '#f1f5f9' }}>
                            <img
                                src={selectedServiceModal.images?.[0] || category?.icon || '/images/services/ac_3d.png'}
                                alt={selectedServiceModal.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                                type="button"
                                onClick={() => setSelectedServiceModal(null)}
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 12,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                                {selectedServiceModal.name}
                            </h3>

                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                                {formatPrice(selectedServiceModal.sale_price || selectedServiceModal.selling_price || 299)}
                            </div>

                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                                {selectedServiceModal.description || 'Professional doorstep service backed by verified experts, genuine spares, and 30-day warranty.'}
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    addItem(selectedServiceModal);
                                    setSelectedServiceModal(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 10,
                                    backgroundColor: '#6338f5',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Add to Cart • {formatPrice(selectedServiceModal.sale_price || selectedServiceModal.selling_price || 299)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MOBILE STICKY BOTTOM CART FOOTER BAR ══════════════ */}
            {totals.count > 0 && (
                <div
                    className="v2-mobile-bottom-cart-bar"
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: '#ffffff',
                        borderTop: '1px solid #e2e8f0',
                        padding: '12px 16px',
                        boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
                        zIndex: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            {totals.count} {totals.count === 1 ? 'item' : 'items'} added
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                            {formatPrice(totals.total)}
                        </div>
                    </div>

                    <Link
                        href="/v2/checkout"
                        style={{
                            padding: '10px 20px',
                            borderRadius: 10,
                            backgroundColor: '#6338f5',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        View Cart <ChevronRight size={16} />
                    </Link>
                </div>
            )}
        </div>
    );
}
