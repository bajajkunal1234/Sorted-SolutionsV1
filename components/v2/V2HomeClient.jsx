'use client';

import Link from 'next/link';
import { MapPin, ChevronDown, ArrowRight, ShieldCheck, Clock, Receipt, Sparkles, Wrench, FileText } from 'lucide-react';
import { V2_CATEGORIES, V2_HERO_CARDS } from '@/lib/v2/catalogConfig';
import { useV2Cart } from './CartContext';
import ServiceSearchBox from './ServiceSearchBox';
import ServiceCard from './ServiceCard';

export default function V2HomeClient({ services = [], categoryCounts = {} }) {
    const { location, setLocationModalOpen } = useV2Cart();

    const primaryAddressTitle = location.flat && location.building
        ? `${location.flat}, ${location.building}`
        : (location.locality || 'Select Mumbai Locality');

    const secondaryAddressSub = location.locality
        ? `${location.locality}${location.pincode ? ` - ${location.pincode}` : ''}, Mumbai`
        : 'Tap to choose flat, society & pincode';

    const popularServices = services.slice(0, 6);

    return (
        <div>
            {/* ── Urban Company Inspired Dark Violet Hero ── */}
            <section className="v2-hero-wrap">
                <div className="v2-container" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    {/* Mobile Top Locality Selector */}
                    <button
                        type="button"
                        className="v2-mobile-loc-btn"
                        onClick={() => setLocationModalOpen(true)}
                    >
                        <span className="v2-mobile-loc-left">
                            <MapPin size={19} style={{ flexShrink: 0 }} />
                            <span style={{ minWidth: 0 }}>
                                <span className="v2-mobile-loc-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {primaryAddressTitle}
                                    <ChevronDown size={16} />
                                </span>
                                <span className="v2-mobile-loc-sub" style={{ display: 'block' }}>
                                    {secondaryAddressSub}
                                </span>
                            </span>
                        </span>
                    </button>

                    {/* Mobile Search Pill */}
                    <ServiceSearchBox variant="mobile-hero" />

                    {/* Mobile Compact Headline */}
                    <div className="v2-hero-mobile-banner">
                        <div>
                            <h1 style={{ color: '#ffffff' }}>Appliance care, sorted in 90 mins</h1>
                        </div>
                    </div>

                    {/* Desktop Rich Headline */}
                    <div className="v2-hero-headline">
                        <div>
                            <span className="v2-hero-kicker">Mumbai Hyper-Local Dispatch</span>
                            <h1>Home appliance services, priced upfront & delivered on time.</h1>
                            <p>
                                Add verified repairs & foam-jet services straight to your cart across 6 Mumbai appliance specialties.
                            </p>
                        </div>
                        <Link
                            href="/v2/services"
                            style={{
                                color: '#fff',
                                textDecoration: 'none',
                                fontSize: 13.5,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px 16px',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.14)',
                                border: '1px solid rgba(255,255,255,0.22)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Browse all services <ArrowRight size={15} />
                        </Link>
                    </div>

                    {/* Offer / Service Highlight Strip (Horizontal Mobile + 4-Col Desktop) */}
                    <div className="v2-promo-strip">
                        {V2_HERO_CARDS.map(card => (
                            <Link key={card.id} href={card.href} className="v2-promo-card">
                                <div className="v2-promo-thumb">
                                    <img src={card.image} alt={card.title} />
                                    <span className="v2-promo-badge">{card.badge}</span>
                                </div>
                                <div className="v2-promo-meta">
                                    <strong>{card.title}</strong>
                                    <span>{card.subtitle}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── White 4-Col (Mobile) / 6-Col (Desktop) Category Grid ── */}
            <section className="v2-surface-sheet">
                <div className="v2-container">
                    <div className="v2-section-head">
                        <h2>Appliance Services</h2>
                        <Link
                            href="/v2/services"
                            style={{ fontSize: 13, fontWeight: 700, color: '#6338f5', textDecoration: 'none' }}
                        >
                            Explore all →
                        </Link>
                    </div>

                    <div className="v2-cat-grid">
                        {V2_CATEGORIES.map(cat => (
                            <Link key={cat.slug} href={`/v2/services/${cat.slug}`} className="v2-cat-tile">
                                <div className="v2-cat-icon-box" style={{ background: cat.accent }}>
                                    <img src={cat.icon} alt={cat.name} />
                                </div>
                                <span className="v2-cat-label">{cat.mobileLabel}</span>
                                {categoryCounts[cat.slug] > 0 && (
                                    <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                                        {categoryCounts[cat.slug]} services
                                    </span>
                                )}
                            </Link>
                        ))}

                        {/* 2 Utility Tiles to complete balanced 4x2 mobile grid */}
                        <Link href="/v2/customer?tab=plans" className="v2-cat-tile">
                            <div className="v2-cat-icon-box" style={{ background: '#f5f3ff' }}>
                                <ShieldCheck size={32} color="#6338f5" />
                            </div>
                            <span className="v2-cat-label">AMC & Care Plans</span>
                        </Link>

                        <Link href="/v2/customer" className="v2-cat-tile">
                            <div className="v2-cat-icon-box" style={{ background: '#f8fafc' }}>
                                <FileText size={32} color="#0f172a" />
                            </div>
                            <span className="v2-cat-label">My Bookings & Bills</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Live Published Web Services OR Catalog Readiness Notice ── */}
            <section style={{ padding: '24px 0' }}>
                <div className="v2-container">
                    <div className="v2-section-head">
                        <h2>Most Booked Packages</h2>
                        <Link
                            href="/v2/services"
                            style={{ fontSize: 13, fontWeight: 700, color: '#6338f5', textDecoration: 'none' }}
                        >
                            View catalog
                        </Link>
                    </div>

                    {popularServices.length > 0 ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: 14,
                            }}
                        >
                            {popularServices.map(svc => (
                                <ServiceCard key={svc.id} service={svc} />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="v2-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                background: '#fff',
                                borderColor: '#ddd6fe',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        background: '#f5f3ff',
                                        color: '#6338f5',
                                        display: 'grid',
                                        placeItems: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: 15 }}>
                                        Storefront Ready for Web Services
                                    </strong>
                                    <span style={{ fontSize: 13, color: '#64748b' }}>
                                        No items are marked <code>subtype = &apos;web&apos;</code> in Admin Inventory yet, so internal technician pricing stays hidden.
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                                {V2_CATEGORIES.map(cat => (
                                    <Link
                                        key={cat.slug}
                                        href={`/v2/services/${cat.slug}`}
                                        className="v2-cat-pill"
                                    >
                                        <Wrench size={13} />
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Sorted Trust & Transparency Pillars ── */}
            <section style={{ padding: '4px 0 28px' }}>
                <div className="v2-container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 14,
                        }}
                    >
                        <div className="v2-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Receipt size={22} color="#6338f5" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong style={{ display: 'block', fontSize: 14.5 }}>Standardized GST Pricing</strong>
                                <span style={{ fontSize: 13, color: '#5b6476' }}>
                                    See itemized service charges & GST before booking — pay seamlessly via Razorpay.
                                </span>
                            </div>
                        </div>
                        <div className="v2-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Clock size={22} color="#6338f5" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong style={{ display: 'block', fontSize: 14.5 }}>Live Slot Confirmation</strong>
                                <span style={{ fontSize: 13, color: '#5b6476' }}>
                                    Real-time Mumbai technician capacity synced directly from our Admin dispatcher.
                                </span>
                            </div>
                        </div>
                        <div className="v2-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <ShieldCheck size={22} color="#0b875b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong style={{ display: 'block', fontSize: 14.5 }}>30-Day Service Warranty</strong>
                                <span style={{ fontSize: 13, color: '#5b6476' }}>
                                    Every repair carries digital job tracking, technician OTP verification & GST invoice history.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
