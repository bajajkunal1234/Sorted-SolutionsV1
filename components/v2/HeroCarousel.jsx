'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK_SLIDES = [
    {
        id: 'slide-1',
        kicker: 'AC Foam-Jet Deep Clean',
        headline: 'Beat the Mumbai Heat with 25% Off',
        subline: 'Starts at ₹599 • 90-min doorstep arrival',
        ctaText: 'Book now',
        ctaLink: '/v2/services/ac-repair',
        bgColor: '#311b6b',
        bgGradient: 'linear-gradient(135deg, #1d1042 0%, #47288f 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_speed_90_mins.png',
        badge: '25% OFF',
        active: true
    },
    {
        id: 'slide-2',
        kicker: 'Certified Pros & Genuine Parts',
        headline: 'Expert Washing Machine & Fridge Care',
        subline: '30-Day post-repair warranty included',
        ctaText: 'Explore services',
        ctaLink: '/v2/services/washing-machine-repair',
        bgColor: '#3e2723',
        bgGradient: 'linear-gradient(135deg, #2b170c 0%, #5d3a1a 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_30_day_warranty.png',
        badge: '30-DAY WARRANTY',
        active: true
    },
    {
        id: 'slide-3',
        kicker: 'Mumbai Hyper-Local Dispatch',
        headline: 'Water Purifier & Chimney Servicing',
        subline: 'Powai to Colaba • Upfront fixed pricing',
        ctaText: 'Book service',
        ctaLink: '/v2/services/water-purifier-repair',
        bgColor: '#0277bd',
        bgGradient: 'linear-gradient(135deg, #01416e 0%, #0288d1 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_pan_mumbai.png',
        badge: 'ALL MUMBAI',
        active: true
    }
];

export default function HeroCarousel({ initialSlides = null }) {
    const [slides, setSlides] = useState(
        Array.isArray(initialSlides) && initialSlides.length > 0 ? initialSlides : FALLBACK_SLIDES
    );
    const [autoSlideSeconds, setAutoSlideSeconds] = useState(7);
    const [enableVideoAdvance, setEnableVideoAdvance] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const videoRef = useRef(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Fetch live config from server
    useEffect(() => {
        let isMounted = true;
        fetch('/api/v2/hero-config')
            .then(res => res.json())
            .then(json => {
                if (isMounted && json.success && json.data?.slides?.length > 0) {
                    const activeOnly = json.data.slides.filter(s => s.active !== false);
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
    const currentSlide = activeSlides[currentIndex] || activeSlides[0] || FALLBACK_SLIDES[0];

    const nextSlide = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex(prev => (prev + 1) % total);
    }, [total]);

    const prevSlide = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex(prev => (prev - 1 + total) % total);
    }, [total]);

    // Timer-based auto advance (for images, GIFs, or fallback when video doesn't emit onEnded)
    useEffect(() => {
        if (total <= 1 || isPaused) return;

        // If current slide is a video and video-advance is enabled, let onEnded handle it
        if (currentSlide.mediaType === 'video' && enableVideoAdvance) {
            // Safety timeout in case video stalls or fails to load: 16 seconds
            const safetyTimer = setTimeout(() => {
                nextSlide();
            }, 16000);
            return () => clearTimeout(safetyTimer);
        }

        const timer = setTimeout(() => {
            nextSlide();
        }, autoSlideSeconds * 1000);

        return () => clearTimeout(timer);
    }, [currentIndex, total, isPaused, currentSlide.mediaType, enableVideoAdvance, autoSlideSeconds, nextSlide]);

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const delta = touchStartX.current - touchEndX.current;
        if (Math.abs(delta) > 40) {
            if (delta > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    };

    return (
        <div
            className="v2-hero-carousel-wrap"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                background: currentSlide.bgGradient || currentSlide.bgColor || '#311b6b',
                transition: 'background 0.4s ease',
                margin: '10px 0 16px 0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
            }}
        >
            {/* Slide Body */}
            <div
                key={currentSlide.id || currentIndex}
                className="v2-hero-carousel-slide"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px 24px 18px',
                    minHeight: 168,
                    position: 'relative'
                }}
            >
                {/* Left Text / Offer Column */}
                <div style={{ flex: 1, minWidth: 0, zIndex: 2, paddingRight: 10 }}>
                    {currentSlide.kicker && (
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'rgba(255,255,255,0.82)',
                                marginBottom: 4
                            }}
                        >
                            {currentSlide.kicker}
                        </div>
                    )}

                    <h2
                        style={{
                            fontSize: 'clamp(16px, 4.2vw, 22px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            lineHeight: 1.22,
                            margin: '0 0 5px 0',
                            letterSpacing: '-0.01em',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                    >
                        {currentSlide.headline}
                    </h2>

                    {currentSlide.subline && (
                        <p
                            style={{
                                fontSize: 'clamp(12px, 3.2vw, 13.5px)',
                                color: 'rgba(255,255,255,0.92)',
                                margin: '0 0 12px 0',
                                lineHeight: 1.3
                            }}
                        >
                            {currentSlide.subline}
                        </p>
                    )}

                    <Link
                        href={currentSlide.ctaLink || '/v2/services'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '6px 14px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.22)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            transition: 'all 0.18s ease'
                        }}
                    >
                        <span>{currentSlide.ctaText || 'Book now'}</span>
                        <ArrowRight size={13} />
                    </Link>
                </div>

                {/* Right Media Column (GIF / Video / Image) */}
                <div
                    style={{
                        width: 'clamp(120px, 36vw, 180px)',
                        height: 'clamp(120px, 36vw, 170px)',
                        position: 'relative',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                    }}
                >
                    {currentSlide.mediaType === 'video' && currentSlide.mediaUrl ? (
                        <video
                            ref={videoRef}
                            key={currentSlide.mediaUrl}
                            src={currentSlide.mediaUrl}
                            autoPlay
                            muted
                            playsInline
                            onEnded={enableVideoAdvance ? nextSlide : undefined}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: 10,
                                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.28))'
                            }}
                        />
                    ) : (
                        <img
                            key={currentSlide.mediaUrl || currentIndex}
                            src={currentSlide.mediaUrl || '/images/banners/banner_speed_90_mins.png'}
                            alt={currentSlide.headline || 'Offer banner'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.32))',
                                animation: 'v2FadeIn 0.35s ease'
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Urban Company 3-Dash Pagination Indicator */}
            {total > 1 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        zIndex: 5
                    }}
                >
                    {activeSlides.map((slide, idx) => {
                        const isActive = idx === currentIndex;
                        return (
                            <button
                                key={slide.id || idx}
                                type="button"
                                onClick={() => setCurrentIndex(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                style={{
                                    border: 'none',
                                    padding: '4px 0',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-block',
                                        height: 3.5,
                                        width: isActive ? 22 : 7,
                                        borderRadius: 2,
                                        backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
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
