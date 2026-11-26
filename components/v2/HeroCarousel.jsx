'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useV2Cart } from './CartContext';

function normalizeSlide(s = {}, idx = 0) {
    const clamp = (val, fallback) => {
        const n = Number(val);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
    };
    return {
        id: s.id || `slide-${idx + 1}`,
        mediaType: ['image', 'gif', 'video'].includes(s.mediaType) ? s.mediaType : 'image',
        mediaUrl: String(s.mediaUrl || '').trim(),
        ctaText: String(s.ctaText ?? '').trim(),
        ctaLink: String(s.ctaLink || '/v2/services').trim(),
        profilePos: {
            x: clamp(s.profilePos?.x, 98),
            y: clamp(s.profilePos?.y, 46),
            visible: s.profilePos?.visible !== false
        },
        ctaPos: {
            x: clamp(s.ctaPos?.x, 6),
            y: clamp(s.ctaPos?.y, 88)
        },
        active: s.active !== false
    };
}

const FALLBACK_SLIDES = [
    normalizeSlide({
        id: 'slide-1',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_speed_90_mins.png',
        ctaText: '',
        ctaLink: '/v2/services/ac-repair',
        profilePos: { x: 98, y: 46, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true
    }, 0),
    normalizeSlide({
        id: 'slide-2',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_30_day_warranty.png',
        ctaText: '',
        ctaLink: '/v2/services/washing-machine-repair',
        profilePos: { x: 98, y: 46, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true
    }, 1),
    normalizeSlide({
        id: 'slide-3',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_pan_mumbai.png',
        ctaText: '',
        ctaLink: '/v2/services/water-purifier-repair',
        profilePos: { x: 98, y: 46, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true
    }, 2)
];

export default function HeroCarousel({ initialSlides = null, floatingHeader = null }) {
    const router = useRouter();
    const { customerSession } = useV2Cart();

    const normalizedInitial = Array.isArray(initialSlides) && initialSlides.length > 0
        ? initialSlides.filter(s => s && s.active !== false).map((s, idx) => normalizeSlide(s, idx))
        : [];

    const [slides, setSlides] = useState(
        normalizedInitial.length > 0 ? normalizedInitial : FALLBACK_SLIDES
    );
    const [autoSlideSeconds, setAutoSlideSeconds] = useState(7);
    const [enableVideoAdvance, setEnableVideoAdvance] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const videoRef = useRef(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const didSwipeRef = useRef(false);

    // Fetch live config from server
    useEffect(() => {
        let isMounted = true;
        fetch('/api/v2/hero-config')
            .then(res => res.json())
            .then(json => {
                if (isMounted && json.success && json.data?.slides?.length > 0) {
                    const activeOnly = json.data.slides
                        .filter(s => s && s.active !== false)
                        .map((s, idx) => normalizeSlide(s, idx));
                    if (activeOnly.length > 0) {
                        setSlides(activeOnly);
                    }
                    if (json.data.autoSlideSeconds) {
                        setAutoSlideSeconds(json.data.autoSlideSeconds);
                    }
                    if (typeof json.data.enableVideoAdvance === 'boolean') {
                        setEnableVideoAdvance(json.data.enableVideoAdvance);
                    }
                }
            })
            .catch(err => {
                console.warn('Using fallback hero slides:', err.message);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const activeSlides = slides.filter(s => s.active !== false);
    const total = activeSlides.length;
    const safeIndex = total > 0 ? currentIndex % total : 0;
    const currentSlide = activeSlides[safeIndex] || activeSlides[0] || FALLBACK_SLIDES[0];

    const nextSlide = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex(prev => (prev + 1) % total);
    }, [total]);

    const prevSlide = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex(prev => (prev - 1 + total) % total);
    }, [total]);

    // Timer-based auto advance
    useEffect(() => {
        if (total <= 1 || isPaused) return;

        if (currentSlide.mediaType === 'video' && enableVideoAdvance) {
            const safetyTimer = setTimeout(() => {
                nextSlide();
            }, 16000);
            return () => clearTimeout(safetyTimer);
        }

        const timer = setTimeout(() => {
            nextSlide();
        }, autoSlideSeconds * 1000);

        return () => clearTimeout(timer);
    }, [safeIndex, total, isPaused, currentSlide.mediaType, enableVideoAdvance, autoSlideSeconds, nextSlide]);

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
        didSwipeRef.current = false;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
        if (Math.abs(touchStartX.current - touchEndX.current) > 12) {
            didSwipeRef.current = true;
        }
    };

    const handleTouchEnd = () => {
        const delta = touchStartX.current - touchEndX.current;
        if (Math.abs(delta) > 40) {
            didSwipeRef.current = true;
            if (delta > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    };

    const handleSlideClick = () => {
        if (didSwipeRef.current) {
            didSwipeRef.current = false;
            return;
        }
        if (currentSlide.ctaLink) {
            router.push(currentSlide.ctaLink);
        }
    };

    const profilePos = currentSlide.profilePos || { x: 98, y: 46, visible: true };
    const ctaPos = currentSlide.ctaPos || { x: 6, y: 88 };

    return (
        <div
            className="v2-hero-carousel-wrap"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Full-Bleed Changing Slide Media Layer (clipped inside stage so search dropdown is never clipped) */}
            <div
                className="v2-hero-media-stage"
                onClick={handleSlideClick}
                role={currentSlide.ctaLink ? 'button' : undefined}
                tabIndex={currentSlide.ctaLink ? 0 : undefined}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && currentSlide.ctaLink) {
                        e.preventDefault();
                        router.push(currentSlide.ctaLink);
                    }
                }}
                style={{ cursor: currentSlide.ctaLink ? 'pointer' : 'default' }}
            >
                {currentSlide.mediaType === 'video' && currentSlide.mediaUrl ? (
                    <video
                        ref={videoRef}
                        key={currentSlide.mediaUrl}
                        src={currentSlide.mediaUrl}
                        autoPlay
                        muted
                        playsInline
                        loop={!enableVideoAdvance}
                        onEnded={enableVideoAdvance ? nextSlide : undefined}
                        className="v2-hero-media-el"
                    />
                ) : (
                    <img
                        key={currentSlide.mediaUrl || safeIndex}
                        src={currentSlide.mediaUrl || '/images/banners/banner_speed_90_mins.png'}
                        alt="Featured offer"
                        className="v2-hero-media-el"
                    />
                )}

                {/* Subtle top scrim for floating Logo & Location legibility on mobile */}
                <div className="v2-hero-top-scrim" aria-hidden="true" />
            </div>

            {/* Fixed Floating Top Header (Logo, Location, Search Bar on Mobile) */}
            {floatingHeader && (
                <div className="v2-hero-floating-top">
                    {floatingHeader}
                </div>
            )}

            {/* Per-Slide Manually Positioned Overlay Controls (Profile Button & Optional CTA Button) */}
            <div className="v2-hero-overlay-bounds">
                {profilePos.visible !== false && (
                    <Link
                        href="/v2/customer"
                        aria-label={customerSession?.name ? `Account (${customerSession.name})` : 'Account & Profile'}
                        className="v2-hero-profile-btn"
                        suppressHydrationWarning
                        style={{
                            left: `${profilePos.x}%`,
                            top: `${profilePos.y}%`,
                            transform: `translate(-${profilePos.x}%, -${profilePos.y}%)`
                        }}
                    >
                        <User size={19} strokeWidth={2.1} />
                        {customerSession?.name && <span className="v2-hero-profile-dot" aria-hidden="true" />}
                    </Link>
                )}

                {Boolean(currentSlide.ctaText) && (
                    <Link
                        href={currentSlide.ctaLink || '/v2/services'}
                        className="v2-hero-cta-pill"
                        style={{
                            left: `${ctaPos.x}%`,
                            top: `${ctaPos.y}%`,
                            transform: `translate(-${ctaPos.x}%, -${ctaPos.y}%)`
                        }}
                    >
                        <span>{currentSlide.ctaText}</span>
                        <ArrowRight size={13} />
                    </Link>
                )}
            </div>

            {/* Bottom-right Dash Pagination Indicator */}
            {total > 1 && (
                <div className="v2-hero-dots">
                    {activeSlides.map((slide, idx) => {
                        const isActive = idx === safeIndex;
                        return (
                            <button
                                key={slide.id || idx}
                                type="button"
                                onClick={() => setCurrentIndex(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className="v2-hero-dot-btn"
                            >
                                <span
                                    style={{
                                        display: 'inline-block',
                                        height: 3.5,
                                        width: isActive ? 22 : 7,
                                        borderRadius: 2,
                                        backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.48)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                                        transition: 'all 0.25s ease'
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Desktop-only subtle arrow controls */}
            {total > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prevSlide}
                        aria-label="Previous slide"
                        className="v2-hero-arrow-btn v2-hero-arrow-left"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={nextSlide}
                        aria-label="Next slide"
                        className="v2-hero-arrow-btn v2-hero-arrow-right"
                    >
                        <ChevronRight size={16} />
                    </button>
                </>
            )}
        </div>
    );
}
