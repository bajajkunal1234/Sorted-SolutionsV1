'use client';

import { useState, useMemo, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Play,
    Sparkles
} from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import { SECTION_THEMES } from '@/lib/v2/homepageSectionsConfig';
import WebServiceModal from './WebServiceModal';

const PreviewModeContext = createContext(false);

function MediaRenderer({ url, type = 'image', alt = '', className = '', style = {}, controls = false, autoPlay = true, muted = true, loop = true, poster = '' }) {
    if (!url) {
        return (
            <div
                className={className}
                style={{
                    background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: 12,
                    ...style
                }}
            >
                No Media
            </div>
        );
    }

    if (type === 'video') {
        return (
            <video
                src={url}
                poster={poster || undefined}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                controls={controls}
                playsInline
                className={className}
                style={style}
            />
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            loading="lazy"
            className={className}
            style={style}
        />
    );
}

function LiveServiceAddControl({ service, size = 'sm' }) {
    const { getItemQty, addItem, incrementItem, decrementItem } = useV2Cart();
    const qty = getItemQty(service.id);

    return (
        <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            {qty === 0 ? (
                <button
                    type="button"
                    className={`v2-hs-add-btn ${size === 'xs' ? 'xs' : ''}`}
                    onClick={() => addItem(service)}
                >
                    + ADD
                </button>
            ) : (
                <div className={`v2-hs-qty-stepper ${size === 'xs' ? 'xs' : ''}`}>
                    <button
                        type="button"
                        aria-label={`Remove one ${service.name}`}
                        onClick={() => decrementItem(service.id)}
                    >
                        −
                    </button>
                    <span>{qty}</span>
                    <button
                        type="button"
                        aria-label={`Add one more ${service.name}`}
                        onClick={() => incrementItem(service.id)}
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
}

function ServiceAddControl({ service, size = 'sm' }) {
    const isPreview = useContext(PreviewModeContext);
    if (!service) return null;
    if (isPreview) {
        return (
            <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                <button type="button" className={`v2-hs-add-btn ${size === 'xs' ? 'xs' : ''}`}>
                    + ADD
                </button>
            </div>
        );
    }
    return <LiveServiceAddControl service={service} size={size} />;
}

function SectionHeader({ section, isDark }) {
    const hasHeader = Boolean(section.title || section.description || section.ctaText);
    if (!hasHeader) return null;

    return (
        <div className="v2-hs-head">
            <div style={{ minWidth: 0, flex: 1 }}>
                {section.title && (
                    <h2
                        className="v2-hs-title"
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    >
                        {section.title}
                    </h2>
                )}
                {section.description && (
                    <p
                        className="v2-hs-desc"
                        style={{ color: isDark ? 'rgba(255,255,255,0.78)' : '#5b6476' }}
                    >
                        {section.description}
                    </p>
                )}
            </div>

            {section.ctaText && (
                <Link
                    href={section.ctaLink || '/v2/services'}
                    className={`v2-hs-cta-btn ${isDark ? 'dark' : ''}`}
                >
                    <span>{section.ctaText}</span>
                    <ArrowRight size={14} />
                </Link>
            )}
        </div>
    );
}

function resolveItems(section, servicesById) {
    return (section.items || []).map((item, idx) => {
        const svc = item.serviceId ? servicesById.get(String(item.serviceId)) : null;
        const fallbackImg = svc?.web_details?.thumbnail_image || svc?.image || svc?.images?.[0] || '';
        return {
            id: item.id || `${section.id}-item-${idx}`,
            service: svc,
            title: item.title || svc?.name || `Featured #${idx + 1}`,
            subtitle: item.subtitle || svc?.subgroup || svc?.categoryName || '',
            badge: item.badge || (svc?.discountPercent > 0 ? `${svc.discountPercent}% OFF` : ''),
            mediaUrl: item.mediaUrl || fallbackImg,
            mediaType: item.mediaUrl ? (item.mediaType || 'image') : 'image',
            priceText: svc ? formatINR(svc.price) : '',
            mrpText: svc && svc.mrp > svc.price ? formatINR(svc.mrp) : '',
            href: item.linkUrl || (svc ? `/v2/services/${svc.categorySlug}?highlight=${svc.id}` : '')
        };
    }).filter(i => i.mediaUrl || i.service || i.title);
}

/* ── Horizontal Carousel Renderer (10 Layouts) ───────────────────────────────── */
function HorizontalCarouselSection({ section, items, isDark, onOpenService }) {
    const router = useRouter();
    const scrollRef = useRef(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const touchStartX = useRef(0);

    if (items.length === 0) return null;

    const layout = section.layout || 'uc_snap_row';
    const total = items.length;
    const safeIdx = ((activeIdx % total) + total) % total;

    const handleCardClick = (item, idx = null, requireActive = false) => {
        if (requireActive && idx !== null && idx !== safeIdx) {
            setActiveIdx(idx);
            return;
        }
        if (item.service) {
            onOpenService(item.service);
        } else if (item.href) {
            router.push(item.href);
        }
    };

    const scrollByStep = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
    };

    const stepIdx = (dir) => {
        setActiveIdx(prev => (prev + dir + total) % total);
    };

    // 1. Classic UC Horizontal Snap Strip & 2. 2-Row Compact Shelf
    if (layout === 'uc_snap_row' || layout === 'grid_2row') {
        return (
            <div className="v2-hs-scroll-wrap">
                <div
                    ref={scrollRef}
                    className={layout === 'grid_2row' ? 'v2-hs-grid-2row' : 'v2-hs-snap-row'}
                >
                    {items.map((item) => (
                        <article
                            key={item.id}
                            onClick={() => handleCardClick(item)}
                            className={`v2-hs-card ${isDark ? 'dark' : ''} ${layout === 'grid_2row' ? 'compact' : ''}`}
                        >
                            <div className="v2-hs-card-media square">
                                <MediaRenderer
                                    url={item.mediaUrl}
                                    type={item.mediaType}
                                    alt={item.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                            </div>

                            <div className="v2-hs-card-body">
                                {item.subtitle && <span className="v2-hs-card-sub">{item.subtitle}</span>}
                                <h3 className="v2-hs-card-title">{item.title}</h3>
                                <div className="v2-hs-card-foot">
                                    <div className="v2-hs-price-col">
                                        {item.priceText && <strong className="v2-hs-price">{item.priceText}</strong>}
                                        {item.mrpText && <span className="v2-hs-mrp">{item.mrpText}</span>}
                                    </div>
                                    <ServiceAddControl service={item.service} size="xs" />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {total > 2 && (
                    <>
                        <button type="button" onClick={() => scrollByStep(-1)} aria-label="Scroll left" className="v2-hs-nav-arrow left">
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" onClick={() => scrollByStep(1)} aria-label="Scroll right" className="v2-hs-nav-arrow right">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>
        );
    }

    // 3. Tall Editorial Poster Cards (3:4)
    if (layout === 'poster_cards') {
        return (
            <div className="v2-hs-scroll-wrap">
                <div ref={scrollRef} className="v2-hs-snap-row">
                    {items.map((item) => (
                        <article
                            key={item.id}
                            onClick={() => handleCardClick(item)}
                            className="v2-hs-poster-card"
                        >
                            <MediaRenderer
                                url={item.mediaUrl}
                                type={item.mediaType}
                                alt={item.title}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div className="v2-hs-poster-scrim" />
                            {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                            <div className="v2-hs-poster-content">
                                {item.subtitle && <span className="v2-hs-poster-sub">{item.subtitle}</span>}
                                <h3>{item.title}</h3>
                                <div className="v2-hs-poster-foot">
                                    <div>
                                        {item.priceText && <strong>{item.priceText}</strong>}
                                        {item.mrpText && <span>{item.mrpText}</span>}
                                    </div>
                                    <ServiceAddControl service={item.service} size="xs" />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                {total > 2 && (
                    <>
                        <button type="button" onClick={() => scrollByStep(-1)} aria-label="Scroll left" className="v2-hs-nav-arrow left">
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" onClick={() => scrollByStep(1)} aria-label="Scroll right" className="v2-hs-nav-arrow right">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>
        );
    }

    // 4. Feature Card + Horizontal Scroll Row
    if (layout === 'spotlight_split') {
        const lead = items[0];
        const rest = items.slice(1);
        return (
            <div className="v2-hs-split-wrap">
                {lead && (
                    <article
                        onClick={() => handleCardClick(lead)}
                        className={`v2-hs-split-lead ${isDark ? 'dark' : ''}`}
                    >
                        <div className="v2-hs-split-lead-media">
                            <MediaRenderer
                                url={lead.mediaUrl}
                                type={lead.mediaType}
                                alt={lead.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            {lead.badge && <span className="v2-hs-badge">{lead.badge}</span>}
                        </div>
                        <div className="v2-hs-split-lead-body">
                            {lead.subtitle && <span className="v2-hs-card-sub">{lead.subtitle}</span>}
                            <h3>{lead.title}</h3>
                            <div className="v2-hs-card-foot" style={{ marginTop: 'auto' }}>
                                <div className="v2-hs-price-col">
                                    {lead.priceText && <strong className="v2-hs-price">{lead.priceText}</strong>}
                                    {lead.mrpText && <span className="v2-hs-mrp">{lead.mrpText}</span>}
                                </div>
                                <ServiceAddControl service={lead.service} />
                            </div>
                        </div>
                    </article>
                )}

                {rest.length > 0 && (
                    <div className="v2-hs-snap-row" style={{ flex: 1, minWidth: 0 }}>
                        {rest.map((item) => (
                            <article
                                key={item.id}
                                onClick={() => handleCardClick(item)}
                                className={`v2-hs-card ${isDark ? 'dark' : ''}`}
                            >
                                <div className="v2-hs-card-media square">
                                    <MediaRenderer
                                        url={item.mediaUrl}
                                        type={item.mediaType}
                                        alt={item.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                    {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                                </div>
                                <div className="v2-hs-card-body">
                                    {item.subtitle && <span className="v2-hs-card-sub">{item.subtitle}</span>}
                                    <h3 className="v2-hs-card-title">{item.title}</h3>
                                    <div className="v2-hs-card-foot">
                                        <div className="v2-hs-price-col">
                                            {item.priceText && <strong className="v2-hs-price">{item.priceText}</strong>}
                                            {item.mrpText && <span className="v2-hs-mrp">{item.mrpText}</span>}
                                        </div>
                                        <ServiceAddControl service={item.service} size="xs" />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 5. Spotlight Wide + Side Cards (Ref #2 "Meet the breeds")
    if (layout === 'spotlight_wide') {
        const prevIdx = (safeIdx - 1 + total) % total;
        const nextIdx = (safeIdx + 1) % total;
        const slots = total === 1
            ? [{ item: items[0], idx: 0, role: 'center' }]
            : total === 2
            ? [{ item: items[safeIdx], idx: safeIdx, role: 'center' }, { item: items[nextIdx], idx: nextIdx, role: 'side' }]
            : [
                { item: items[prevIdx], idx: prevIdx, role: 'side' },
                { item: items[safeIdx], idx: safeIdx, role: 'center' },
                { item: items[nextIdx], idx: nextIdx, role: 'side' }
            ];

        return (
            <div
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    const delta = touchStartX.current - e.changedTouches[0].clientX;
                    if (Math.abs(delta) > 36) stepIdx(delta > 0 ? 1 : -1);
                }}
            >
                <div className="v2-hs-spotlight-row">
                    {slots.map(({ item, idx, role }) => (
                        <article
                            key={`${item.id}-${role}`}
                            onClick={() => handleCardClick(item, idx, role !== 'center')}
                            className={`v2-hs-spotlight-card ${role}`}
                        >
                            <MediaRenderer
                                url={item.mediaUrl}
                                type={item.mediaType}
                                alt={item.title}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div className="v2-hs-poster-scrim" />
                            {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                            <div className="v2-hs-poster-content">
                                <h3>{item.title}</h3>
                                {role === 'center' && item.subtitle && (
                                    <p style={{ margin: '4px 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>
                                        {item.subtitle}
                                    </p>
                                )}
                                <div className="v2-hs-poster-foot">
                                    <div>
                                        {item.priceText && <strong>{item.priceText}</strong>}
                                        {item.mrpText && <span>{item.mrpText}</span>}
                                    </div>
                                    {role === 'center' && <ServiceAddControl service={item.service} size="xs" />}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {total > 1 && (
                    <div className="v2-hs-dots-row">
                        <button type="button" onClick={() => stepIdx(-1)} aria-label="Previous" className="v2-hs-dot-arrow">
                            <ChevronLeft size={14} />
                        </button>
                        {items.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setActiveIdx(i)}
                                aria-label={`Slide ${i + 1}`}
                                className={`v2-hs-dot ${i === safeIdx ? 'active' : ''}`}
                            />
                        ))}
                        <button type="button" onClick={() => stepIdx(1)} aria-label="Next" className="v2-hs-dot-arrow">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 6–10: Interactive Stage Carousels
    // ('peek_center' Ref #1, 'layered_pyramid' Ref #3, 'curved_arc' Ref #4, 'coverflow_deck' Ref #5, 'diagonal_cascade' Ref #6)
    const getCircularOffset = (i) => {
        let diff = i - safeIdx;
        if (diff > total / 2) diff -= total;
        if (diff < -total / 2) diff += total;
        return diff;
    };

    return (
        <div
            className={`v2-hs-stage-wrap layout-${layout}`}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                const delta = touchStartX.current - e.changedTouches[0].clientX;
                if (Math.abs(delta) > 36) stepIdx(delta > 0 ? 1 : -1);
            }}
        >
            <div className={`v2-hs-stage layout-${layout}`}>
                {items.map((item, idx) => {
                    const offset = getCircularOffset(idx);
                    const abs = Math.abs(offset);
                    if (abs > 2 && total > 4) return null;

                    let cardTransform = '';
                    let opacity = 1;
                    let zIndex = 10 - abs;

                    if (layout === 'peek_center') {
                        cardTransform = `translateX(${offset * 76}%) scale(${offset === 0 ? 1 : 0.88})`;
                        opacity = abs > 1 ? 0 : (offset === 0 ? 1 : 0.86);
                    } else if (layout === 'layered_pyramid') {
                        cardTransform = `translateX(${offset * 52}%) scale(${1 - abs * 0.14})`;
                        opacity = abs > 2 ? 0 : 1 - abs * 0.14;
                    } else if (layout === 'curved_arc') {
                        cardTransform = `translateX(${offset * 68}%) translateZ(${-abs * 70}px) rotateY(${offset * -16}deg) scale(${1 - abs * 0.08})`;
                        opacity = abs > 2 ? 0 : 1 - abs * 0.18;
                    } else if (layout === 'coverflow_deck') {
                        cardTransform = `translateX(${offset * 46}%) scale(${1 - abs * 0.15})`;
                        opacity = abs > 2 ? 0 : 1 - abs * 0.12;
                    } else if (layout === 'diagonal_cascade') {
                        cardTransform = `translateX(${offset * 56}%) translateY(${offset * 22}px) scale(${1 - abs * 0.12})`;
                        opacity = abs > 2 ? 0 : 1 - abs * 0.16;
                    }

                    return (
                        <article
                            key={item.id}
                            onClick={() => handleCardClick(item, idx, offset !== 0)}
                            className={`v2-hs-stage-card layout-${layout} ${offset === 0 ? 'is-active' : ''}`}
                            style={{
                                transform: cardTransform,
                                opacity,
                                zIndex
                            }}
                        >
                            <div className="v2-hs-stage-media">
                                <MediaRenderer
                                    url={item.mediaUrl}
                                    type={item.mediaType}
                                    alt={item.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                            </div>

                            <div className={`v2-hs-stage-caption ${layout === 'coverflow_deck' ? 'polaroid' : ''}`}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    {item.subtitle && <span className="v2-hs-stage-sub">{item.subtitle}</span>}
                                    <h3 className="v2-hs-stage-title">{item.title}</h3>
                                    {item.priceText && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <strong style={{ fontSize: 13 }}>{item.priceText}</strong>
                                            {item.mrpText && (
                                                <span style={{ fontSize: 11, textDecoration: 'line-through', opacity: 0.7 }}>{item.mrpText}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {offset === 0 && <ServiceAddControl service={item.service} size="xs" />}
                            </div>
                        </article>
                    );
                })}

                {total > 1 && (
                    <>
                        <button type="button" onClick={() => stepIdx(-1)} aria-label="Previous slide" className="v2-hs-nav-arrow left show-mobile">
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" onClick={() => stepIdx(1)} aria-label="Next slide" className="v2-hs-nav-arrow right show-mobile">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>

            {total > 1 && (
                <div className="v2-hs-dots-row">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            aria-label={`Slide ${i + 1}`}
                            className={`v2-hs-dot ${i === safeIdx ? 'active' : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Vertical Carousel Renderer (5 Layouts) ──────────────────────────────────── */
function VerticalCarouselSection({ section, items, isDark, onOpenService }) {
    const router = useRouter();
    const [activeIdx, setActiveIdx] = useState(0);
    const touchStartY = useRef(0);

    if (items.length === 0) return null;

    const layout = section.layout || 'vertical_reels_peek';
    const total = items.length;
    const safeIdx = ((activeIdx % total) + total) % total;

    const handleCardClick = (item, idx = null, requireActive = false) => {
        if (requireActive && idx !== null && idx !== safeIdx) {
            setActiveIdx(idx);
            return;
        }
        if (item.service) {
            onOpenService(item.service);
        } else if (item.href) {
            router.push(item.href);
        }
    };

    const stepIdx = (dir) => {
        setActiveIdx(prev => (prev + dir + total) % total);
    };

    // 1. Vertical Reels Snap Stack (Ref #7) & 3. Vertical Overlapping Deck
    if (layout === 'vertical_reels_peek' || layout === 'vertical_stacked_deck') {
        const getCircularOffset = (i) => {
            let diff = i - safeIdx;
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;
            return diff;
        };

        return (
            <div className="v2-hs-vert-shell">
                <div
                    className={`v2-hs-vert-viewport ${layout}`}
                    onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
                    onTouchEnd={(e) => {
                        const delta = touchStartY.current - e.changedTouches[0].clientY;
                        if (Math.abs(delta) > 36) stepIdx(delta > 0 ? 1 : -1);
                    }}
                >
                    {items.map((item, idx) => {
                        const offset = getCircularOffset(idx);
                        const abs = Math.abs(offset);
                        if (abs > 2 && total > 4) return null;

                        const translateY = layout === 'vertical_reels_peek'
                            ? offset * 76
                            : offset * 24;
                        const scale = layout === 'vertical_reels_peek'
                            ? (offset === 0 ? 1 : 0.88)
                            : (1 - abs * 0.08);
                        const opacity = abs > 1 && layout === 'vertical_reels_peek'
                            ? 0
                            : (offset === 0 ? 1 : 0.78 - abs * 0.12);

                        return (
                            <article
                                key={item.id}
                                onClick={() => handleCardClick(item, idx, offset !== 0)}
                                className={`v2-hs-vert-card ${offset === 0 ? 'is-active' : ''}`}
                                style={{
                                    transform: `translateY(${translateY}%) scale(${scale})`,
                                    opacity,
                                    zIndex: 10 - abs
                                }}
                            >
                                <MediaRenderer
                                    url={item.mediaUrl}
                                    type={item.mediaType}
                                    alt={item.title}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="v2-hs-poster-scrim" />
                                {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                                <div className="v2-hs-poster-content">
                                    {item.subtitle && <span className="v2-hs-poster-sub">{item.subtitle}</span>}
                                    <h3>{item.title}</h3>
                                    <div className="v2-hs-poster-foot">
                                        <div>
                                            {item.priceText && <strong>{item.priceText}</strong>}
                                            {item.mrpText && <span>{item.mrpText}</span>}
                                        </div>
                                        {offset === 0 && <ServiceAddControl service={item.service} size="xs" />}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {total > 1 && (
                    <div className="v2-hs-vert-controls">
                        <button type="button" onClick={() => stepIdx(-1)} aria-label="Previous vertical slide" className="v2-hs-vert-btn">
                            <ChevronUp size={18} />
                        </button>
                        <div className="v2-hs-vert-dots">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveIdx(i)}
                                    aria-label={`Slide ${i + 1}`}
                                    className={`v2-hs-vert-dot ${i === safeIdx ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                        <button type="button" onClick={() => stepIdx(1)} aria-label="Next vertical slide" className="v2-hs-vert-btn">
                            <ChevronDown size={18} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 2. Vertical Media + Info Split
    if (layout === 'vertical_story_split') {
        return (
            <div className="v2-hs-vert-feed">
                {items.map((item) => (
                    <article
                        key={item.id}
                        onClick={() => handleCardClick(item)}
                        className={`v2-hs-vert-split-card ${isDark ? 'dark' : ''}`}
                    >
                        <div className="v2-hs-vert-split-media">
                            <MediaRenderer
                                url={item.mediaUrl}
                                type={item.mediaType}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                        </div>
                        <div className="v2-hs-vert-split-body">
                            {item.subtitle && <span className="v2-hs-card-sub">{item.subtitle}</span>}
                            <h3>{item.title}</h3>
                            {item.service?.highlights?.length > 0 && (
                                <ul className="v2-hs-mini-bullets">
                                    {item.service.highlights.slice(0, 2).map((h, i) => <li key={i}>{h}</li>)}
                                </ul>
                            )}
                            <div className="v2-hs-card-foot" style={{ marginTop: 'auto' }}>
                                <div className="v2-hs-price-col">
                                    {item.priceText && <strong className="v2-hs-price">{item.priceText}</strong>}
                                    {item.mrpText && <span className="v2-hs-mrp">{item.mrpText}</span>}
                                </div>
                                <ServiceAddControl service={item.service} />
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        );
    }

    // 4. Interactive Spotlight Accordion List
    if (layout === 'vertical_accordion_list') {
        return (
            <div className="v2-hs-vert-accordion">
                {items.map((item, idx) => {
                    const isOpen = idx === safeIdx;
                    return (
                        <article
                            key={item.id}
                            className={`v2-hs-acc-item ${isOpen ? 'open' : ''} ${isDark ? 'dark' : ''}`}
                        >
                            <button
                                type="button"
                                className="v2-hs-acc-trigger"
                                onClick={() => setActiveIdx(idx)}
                            >
                                <img
                                    src={item.mediaUrl || '/images/services/ac_3d.png'}
                                    alt={item.title}
                                    className="v2-hs-acc-thumb"
                                />
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                    <strong style={{ display: 'block', fontSize: 14 }}>{item.title}</strong>
                                    {item.subtitle && (
                                        <span style={{ fontSize: 12, opacity: 0.72 }}>{item.subtitle}</span>
                                    )}
                                </div>
                                {item.priceText && (
                                    <span style={{ fontWeight: 800, fontSize: 13.5, marginRight: 6 }}>{item.priceText}</span>
                                )}
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {isOpen && (
                                <div className="v2-hs-acc-body" onClick={() => handleCardClick(item)}>
                                    <div className="v2-hs-acc-media">
                                        <MediaRenderer
                                            url={item.mediaUrl}
                                            type={item.mediaType}
                                            alt={item.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    </div>
                                    <div className="v2-hs-acc-footer">
                                        <span style={{ fontSize: 12.5, opacity: 0.8 }}>
                                            {item.service ? 'Tap to inspect service details & warranty' : 'Tap to explore'}
                                        </span>
                                        <ServiceAddControl service={item.service} />
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        );
    }

    // 5. Full-Width Vertical Feed Cards
    return (
        <div className="v2-hs-vert-feed">
            {items.map((item) => (
                <article
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`v2-hs-feed-card ${isDark ? 'dark' : ''}`}
                >
                    <div className="v2-hs-feed-media">
                        <MediaRenderer
                            url={item.mediaUrl}
                            type={item.mediaType}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {item.badge && <span className="v2-hs-badge">{item.badge}</span>}
                    </div>
                    <div className="v2-hs-feed-foot">
                        <div style={{ minWidth: 0, flex: 1 }}>
                            {item.subtitle && <span className="v2-hs-card-sub">{item.subtitle}</span>}
                            <h3 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700 }}>{item.title}</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.priceText && <strong className="v2-hs-price">{item.priceText}</strong>}
                            <ServiceAddControl service={item.service} />
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}

/* ── Image / GIF Banner Renderer (5 Layouts) ─────────────────────────────────── */
function MediaBannerSection({ section, isDark }) {
    const router = useRouter();
    const layout = section.layout || 'contained_rounded';
    if (!section.mediaUrl && !section.title) return null;

    const handleClick = () => {
        if (section.ctaLink) router.push(section.ctaLink);
    };

    if (layout === 'full_bleed') {
        return (
            <div
                onClick={handleClick}
                style={{ cursor: section.ctaLink ? 'pointer' : 'default', width: '100%' }}
            >
                <MediaRenderer
                    url={section.mediaUrl}
                    type={section.mediaType}
                    alt={section.title || 'Promotional banner'}
                    style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
                />
            </div>
        );
    }

    if (layout === 'split_left_media' || layout === 'split_right_media') {
        return (
            <div className={`v2-hs-banner-split ${layout === 'split_right_media' ? 'reverse' : ''} ${isDark ? 'dark' : ''}`}>
                <div className="v2-hs-banner-split-media" onClick={handleClick} style={{ cursor: section.ctaLink ? 'pointer' : 'default' }}>
                    <MediaRenderer
                        url={section.mediaUrl}
                        type={section.mediaType}
                        alt={section.title || 'Banner visual'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                </div>
                <div className="v2-hs-banner-split-body">
                    {section.title && <h3>{section.title}</h3>}
                    {section.description && <p>{section.description}</p>}
                    {section.ctaText && (
                        <Link href={section.ctaLink || '/v2/services'} className="v2-hs-solid-cta">
                            <span>{section.ctaText}</span>
                            <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    if (layout === 'overlay_card') {
        return (
            <div className="v2-hs-banner-overlay" onClick={handleClick} style={{ cursor: section.ctaLink ? 'pointer' : 'default' }}>
                <MediaRenderer
                    url={section.mediaUrl}
                    type={section.mediaType}
                    alt={section.title || 'Featured banner'}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="v2-hs-banner-overlay-scrim" />
                <div className="v2-hs-banner-overlay-content">
                    {section.title && <h3>{section.title}</h3>}
                    {section.description && <p>{section.description}</p>}
                    {section.ctaText && (
                        <Link
                            href={section.ctaLink || '/v2/services'}
                            className="v2-hs-glass-cta"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span>{section.ctaText}</span>
                            <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    // Default: contained_rounded
    return (
        <div
            className="v2-hs-banner-rounded"
            onClick={handleClick}
            style={{ cursor: section.ctaLink ? 'pointer' : 'default' }}
        >
            <MediaRenderer
                url={section.mediaUrl}
                type={section.mediaType}
                alt={section.title || 'Banner'}
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
            />
        </div>
    );
}

/* ── Video Showcase Renderer (4 Layouts) ─────────────────────────────────────── */
function VideoBannerSection({ section, isDark }) {
    const layout = section.layout || 'cinema_wide';
    if (!section.mediaUrl) return null;

    const videoProps = {
        url: section.mediaUrl,
        type: 'video',
        poster: section.posterUrl,
        autoPlay: section.autoplay !== false,
        muted: section.muted !== false,
        loop: section.loop !== false,
        controls: Boolean(section.controls)
    };

    if (layout === 'full_bleed_video') {
        return (
            <div className="v2-hs-video-fullbleed">
                <MediaRenderer
                    {...videoProps}
                    style={{ width: '100%', maxHeight: 460, objectFit: 'cover', display: 'block' }}
                />
                {(section.ctaText || section.title) && (
                    <div className="v2-hs-video-overlay-bar">
                        <div className="v2-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                                {section.title && <strong style={{ color: '#fff', fontSize: 16, display: 'block' }}>{section.title}</strong>}
                                {section.description && <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5 }}>{section.description}</span>}
                            </div>
                            {section.ctaText && (
                                <Link href={section.ctaLink || '/v2/services'} className="v2-hs-glass-cta">
                                    <span>{section.ctaText}</span>
                                    <ArrowRight size={14} />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (layout === 'vertical_reel_9_16') {
        return (
            <div className={`v2-hs-reel-layout ${isDark ? 'dark' : ''}`}>
                <div className="v2-hs-reel-frame">
                    <MediaRenderer
                        {...videoProps}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                </div>
                {(section.title || section.description || section.ctaText) && (
                    <div className="v2-hs-reel-meta">
                        <span className="v2-hs-reel-pill">
                            <Play size={11} /> Video Spotlight
                        </span>
                        {section.title && <h3>{section.title}</h3>}
                        {section.description && <p>{section.description}</p>}
                        {section.ctaText && (
                            <Link href={section.ctaLink || '/v2/services'} className="v2-hs-solid-cta">
                                <span>{section.ctaText}</span>
                                <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (layout === 'split_video_showcase') {
        return (
            <div className={`v2-hs-banner-split ${isDark ? 'dark' : ''}`}>
                <div className="v2-hs-banner-split-media" style={{ background: '#0f172a' }}>
                    <MediaRenderer
                        {...videoProps}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                </div>
                <div className="v2-hs-banner-split-body">
                    {section.title && <h3>{section.title}</h3>}
                    {section.description && <p>{section.description}</p>}
                    {section.ctaText && (
                        <Link href={section.ctaLink || '/v2/services'} className="v2-hs-solid-cta">
                            <span>{section.ctaText}</span>
                            <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    // Default: cinema_wide
    return (
        <div className="v2-hs-video-cinema">
            <MediaRenderer
                {...videoProps}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
        </div>
    );
}

export default function HomepageSections({ sections = [], services = [], preview = false }) {
    const [activeModalService, setActiveModalService] = useState(null);

    const servicesById = useMemo(() => {
        const map = new Map();
        (services || []).forEach(s => {
            if (s && s.id != null) map.set(String(s.id), s);
        });
        return map;
    }, [services]);

    const visibleSections = useMemo(
        () => (sections || []).filter(s => s && (preview || s.enabled !== false)),
        [sections, preview]
    );

    if (visibleSections.length === 0) return null;

    const handleOpenService = (svc) => {
        if (!preview) setActiveModalService(svc);
    };

    return (
        <PreviewModeContext.Provider value={preview}>
            {visibleSections.map((section) => {
                const themeObj = SECTION_THEMES.find(t => t.id === section.theme) || SECTION_THEMES[0];
                const isDark = themeObj.id === 'dark' || themeObj.id === 'violet';
                const isFullBleed =
                    (section.type === 'media_banner' && section.layout === 'full_bleed') ||
                    (section.type === 'video_banner' && section.layout === 'full_bleed_video');

                const resolvedItems = (section.type === 'horizontal_carousel' || section.type === 'vertical_carousel')
                    ? resolveItems(section, servicesById)
                    : [];

                // Skip header duplication on layouts that embed title/desc/cta inside the card itself
                const embedsCopy =
                    (section.type === 'media_banner' && ['split_left_media', 'split_right_media', 'overlay_card'].includes(section.layout)) ||
                    (section.type === 'video_banner' && ['full_bleed_video', 'vertical_reel_9_16', 'split_video_showcase'].includes(section.layout));

                return (
                    <section
                        key={section.id}
                        className="v2-hs-section"
                        style={{
                            backgroundColor: themeObj.bg,
                            color: themeObj.text
                        }}
                    >
                        {!embedsCopy && (
                            <div className="v2-container">
                                <SectionHeader section={section} isDark={isDark} />
                            </div>
                        )}

                        {isFullBleed ? (
                            section.type === 'media_banner' ? (
                                <MediaBannerSection section={section} isDark={isDark} />
                            ) : (
                                <VideoBannerSection section={section} isDark={isDark} />
                            )
                        ) : (
                            <div className="v2-container">
                                {section.type === 'horizontal_carousel' && (
                                    <HorizontalCarouselSection
                                        section={section}
                                        items={resolvedItems}
                                        isDark={isDark}
                                        onOpenService={handleOpenService}
                                    />
                                )}
                                {section.type === 'vertical_carousel' && (
                                    <VerticalCarouselSection
                                        section={section}
                                        items={resolvedItems}
                                        isDark={isDark}
                                        onOpenService={handleOpenService}
                                    />
                                )}
                                {section.type === 'media_banner' && (
                                    <MediaBannerSection section={section} isDark={isDark} />
                                )}
                                {section.type === 'video_banner' && (
                                    <VideoBannerSection section={section} isDark={isDark} />
                                )}
                            </div>
                        )}
                    </section>
                );
            })}

            {!preview && activeModalService && (
                <WebServiceModal
                    service={activeModalService}
                    onClose={() => setActiveModalService(null)}
                />
            )}
        </PreviewModeContext.Provider>
    );
}
