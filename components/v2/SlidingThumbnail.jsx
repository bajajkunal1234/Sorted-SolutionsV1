'use client';

import { useState, useEffect, useRef } from 'react';

const DEFAULT_DIRECTIONS = ['from-top', 'from-right', 'from-bottom', 'from-left'];

/**
 * SlidingThumbnail
 * 
 * Smooth multi-directional sliding thumbnail for categories & subcategories.
 * When multiple images are provided (e.g. 3 images), transitions seamlessly
 * alternating directions (Top → Right → Bottom → Left) with hardware-accelerated transforms.
 */
export default function SlidingThumbnail({
    slides = [],
    fallbackUrl = '',
    alt = 'Appliance Thumbnail',
    interval = 3500, // milliseconds between slides
    directionCycle = DEFAULT_DIRECTIONS,
    isPaused = false,
    width = '100%',
    height = '100%',
    aspectRatio = '1/1',
    objectFit = 'contain',
    borderRadius = 0,
    className = '',
    onSlideChange = null
}) {
    // Normalize slides to an array of URLs
    const normalizedSlides = (Array.isArray(slides) ? slides : [])
        .map(s => {
            if (!s) return null;
            if (typeof s === 'string') return s.trim();
            return (s.url || s.mediaUrl || s.src || '').trim();
        })
        .filter(Boolean);

    // If no valid slides, fallback to fallbackUrl
    const effectiveSlides = normalizedSlides.length > 0
        ? normalizedSlides
        : (fallbackUrl ? [fallbackUrl] : []);

    const total = effectiveSlides.length;

    // State
    const [currentIdx, setCurrentIdx] = useState(0);
    const [prevIdx, setPrevIdx] = useState(null);
    const [transitionDirection, setTransitionDirection] = useState('from-top');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const directionStepRef = useRef(0);
    const transitionTimerRef = useRef(null);

    // Handle slide change
    const triggerNext = () => {
        if (total <= 1) return;

        const nextDirection = directionCycle[directionStepRef.current % directionCycle.length] || 'from-top';
        directionStepRef.current += 1;

        setTransitionDirection(nextDirection);
        setPrevIdx(currentIdx);
        setIsTransitioning(true);

        const nextIndex = (currentIdx + 1) % total;
        setCurrentIdx(nextIndex);

        if (typeof onSlideChange === 'function') {
            onSlideChange({ index: nextIndex, direction: nextDirection });
        }

        // Clear existing transition timer
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
            setIsTransitioning(false);
            setPrevIdx(null);
        }, 650); // Matches CSS transition duration
    };

    // Auto-advance timer
    useEffect(() => {
        if (total <= 1 || isPaused) return;

        const timer = setInterval(() => {
            triggerNext();
        }, Math.max(2000, Number(interval) || 3500));

        return () => {
            clearInterval(timer);
            if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        };
    }, [total, isPaused, currentIdx, interval]);

    // Single image case (no sliding needed)
    if (total <= 1) {
        const singleSrc = effectiveSlides[0] || fallbackUrl;
        return (
            <div
                className={`v2-sliding-thumb ${className}`}
                style={{
                    position: 'relative',
                    width,
                    height,
                    aspectRatio,
                    overflow: 'hidden',
                    borderRadius,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {singleSrc ? (
                    <img
                        src={singleSrc}
                        alt={alt}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit,
                            display: 'block'
                        }}
                        loading="lazy"
                    />
                ) : null}
            </div>
        );
    }

    // Helper to calculate start & exit transform positions
    const getTransform = (direction, role) => {
        // role: 'enter-start' | 'enter-end' | 'exit-end'
        if (role === 'enter-end') return 'translate(0, 0)';

        switch (direction) {
            case 'from-top':
                return role === 'enter-start' ? 'translateY(-100%)' : 'translateY(100%)';
            case 'from-right':
                return role === 'enter-start' ? 'translateX(100%)' : 'translateX(-100%)';
            case 'from-bottom':
                return role === 'enter-start' ? 'translateY(100%)' : 'translateY(-100%)';
            case 'from-left':
                return role === 'enter-start' ? 'translateX(-100%)' : 'translateX(100%)';
            default:
                return 'translate(0, 0)';
        }
    };

    return (
        <div
            className={`v2-sliding-thumb ${className}`}
            style={{
                position: 'relative',
                width,
                height,
                aspectRatio,
                overflow: 'hidden',
                borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                isolation: 'isolate'
            }}
        >
            {/* Outgoing previous slide */}
            {isTransitioning && prevIdx !== null && (
                <div
                    key={`prev-${prevIdx}`}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        transform: getTransform(transitionDirection, 'exit-end'),
                        opacity: 0,
                        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        pointerEvents: 'none'
                    }}
                >
                    <img
                        src={effectiveSlides[prevIdx]}
                        alt={alt}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit,
                            display: 'block'
                        }}
                    />
                </div>
            )}

            {/* Current active slide */}
            <div
                key={`current-${currentIdx}`}
                style={{
                    position: 'absolute',
                    inset: 0,
                    transform: isTransitioning ? getTransform(transitionDirection, 'enter-end') : 'translate(0, 0)',
                    opacity: 1,
                    transition: isTransitioning
                        ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease'
                        : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                }}
            >
                <img
                    src={effectiveSlides[currentIdx]}
                    alt={alt}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit,
                        display: 'block'
                    }}
                />
            </div>
        </div>
    );
}
