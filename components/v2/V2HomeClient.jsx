'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, ArrowRight, ShieldCheck, Clock, Receipt, Sparkles, Wrench, FileText } from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { useV2Cart } from './CartContext';
import ServiceSearchBox from './ServiceSearchBox';
import ServiceCard from './ServiceCard';
import HeroCarousel from './HeroCarousel';
import SlidingThumbnail from './SlidingThumbnail';

export default function V2HomeClient({ services = [], categoryCounts = {}, categories = [], initialLogos = null, homepageProcess = null, initialHeroSlides = null }) {
    const { location, setLocationModalOpen, brandLogos } = useV2Cart();

    const activeCategories = Array.isArray(categories) && categories.length > 0
        ? categories
        : V2_CATEGORIES;

    const effectiveLogos = brandLogos || initialLogos;
    const heroDarkLogo = effectiveLogos?.darkModeLogo || effectiveLogos?.dayModeLogo || '/images/logos/logo-dark.png';

    const primaryAddressTitle = location.flat && location.building
        ? `${location.flat}, ${location.building}`
        : (location.locality || 'Select Mumbai Locality');

    const secondaryAddressSub = location.locality
        ? `${location.locality}${location.pincode ? ` - ${location.pincode}` : ''}, Mumbai`
        : 'Tap to choose flat, society & pincode';

    const popularServices = services.slice(0, 6);

    return (
        <div>
            {/* ── Urban Company Style Full-Bleed Hero with Floating Controls ── */}
            <section className="v2-hero-wrap">
                <HeroCarousel
                    initialSlides={initialHeroSlides}
                    floatingHeader={
                        <>
                            {/* Top Floating Row: Brand Logo + Locality Selector (leaves corner clear for Profile button) */}
                            <div className="v2-hero-top-meta">
                                <Link
                                    href="/v2"
                                    aria-label={effectiveLogos?.altText || 'Sorted Solutions'}
                                    className="v2-hero-floating-logo"
                                >
                                    <img
                                        src={heroDarkLogo}
                                        alt={effectiveLogos?.altText || 'Sorted Solutions'}
                                        onError={(e) => {
                                            if (effectiveLogos?.dayModeLogo && e.currentTarget.src !== effectiveLogos.dayModeLogo) {
                                                e.currentTarget.src = effectiveLogos.dayModeLogo;
                                            } else {
                                                e.currentTarget.src = '/logo.jpg';
                                            }
                                        }}
                                    />
                                </Link>

                                <button
                                    type="button"
                                    className="v2-mobile-loc-btn"
                                    onClick={() => setLocationModalOpen(true)}
                                    suppressHydrationWarning
                                >
                                    <span className="v2-mobile-loc-left">
                                        <MapPin size={17} style={{ flexShrink: 0, color: '#ffffff' }} />
                                        <span style={{ minWidth: 0, display: 'block' }}>
                                            <span className="v2-mobile-loc-title" suppressHydrationWarning>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {primaryAddressTitle}
                                                </span>
                                                <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.9 }} />
                                            </span>
                                            <span className="v2-mobile-loc-sub" suppressHydrationWarning>
                                                {secondaryAddressSub}
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            </div>

                            {/* Floating Search Bar */}
                            <div className="v2-hero-floating-search">
                                <ServiceSearchBox variant="mobile-hero" placeholder="Search for a service" />
                            </div>
                        </>
                    }
                />
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
                        {activeCategories.map(cat => (
                            <Link
                                key={cat.slug}
                                href={`/v2/services/${cat.slug}`}
                                prefetch={true}
                                className="v2-cat-tile"
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    padding: 0,
                                    fontFamily: 'inherit'
                                }}
                            >
                                <div className="v2-cat-icon-box" style={{ background: cat.accent, overflow: 'hidden', position: 'relative' }}>
                                    <SlidingThumbnail
                                        slides={cat.thumbnailSlides}
                                        fallbackUrl={cat.icon}
                                        alt={cat.name}
                                        interval={cat.thumbnailInterval || 3500}
                                        directionCycle={
                                            cat.thumbnailDirection === 'vertical'
                                                ? ['from-top', 'from-bottom']
                                                : cat.thumbnailDirection === 'horizontal'
                                                ? ['from-right', 'from-left']
                                                : ['from-top', 'from-right', 'from-bottom', 'from-left']
                                        }
                                        width="100%"
                                        height="100%"
                                        objectFit="contain"
                                    />
                                </div>
                                <span className="v2-cat-label">{cat.mobileLabel || cat.name}</span>
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

            {/* ── Dynamic Our Process Section (Linked from Admin Our Process Templates) ── */}
            {homepageProcess?.enabled !== false && Array.isArray(homepageProcess?.steps) && homepageProcess.steps.length > 0 && (
                <section style={{ padding: '8px 0 24px' }}>
                    <div className="v2-container">
                        <div className="v2-card" style={{ padding: '22px 20px' }}>
                            <div style={{ marginBottom: 18 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                                    {homepageProcess.title || 'Our process'}
                                </h2>
                                {homepageProcess.subtitle && (
                                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                        {homepageProcess.subtitle}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {homepageProcess.steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            gap: 14,
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
                                            <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0' }}>
                                                {step.title}
                                            </h3>
                                            {step.desc && (
                                                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                                                    {step.desc}
                                                </p>
                                            )}
                                        </div>

                                        {step.imageUrl && (
                                            <div style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <img
                                                    src={step.imageUrl}
                                                    alt={step.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

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
