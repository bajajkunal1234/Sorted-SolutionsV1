'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, ArrowRight, ShieldCheck, Clock, Receipt, Sparkles, Wrench, FileText } from 'lucide-react';
import { V2_CATEGORIES, V2_HERO_CARDS } from '@/lib/v2/catalogConfig';
import { useV2Cart } from './CartContext';
import ServiceSearchBox from './ServiceSearchBox';
import ServiceCard from './ServiceCard';
import HeroCarousel from './HeroCarousel';
import SubcategoryModal from './SubcategoryModal';

export default function V2HomeClient({ services = [], categoryCounts = {} }) {
    const { location, setLocationModalOpen } = useV2Cart();
    const [selectedModalCategory, setSelectedModalCategory] = useState(null);

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
                    {/* Top Header Row: Locality Selector (Left) + Sorted Solutions Brand (Right) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 14,
                        padding: '0 4px'
                    }}>
                        {/* Mobile Top Locality Selector */}
                        <button
                            type="button"
                            className="v2-mobile-loc-btn"
                            onClick={() => setLocationModalOpen(true)}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: 0,
                                margin: 0,
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <span className="v2-mobile-loc-left" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <MapPin size={20} style={{ flexShrink: 0, color: '#ffffff' }} />
                                <span style={{ minWidth: 0, display: 'block' }}>
                                    <span className="v2-mobile-loc-title" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ffffff' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {primaryAddressTitle}
                                        </span>
                                        <ChevronDown size={15} style={{ flexShrink: 0, opacity: 0.85 }} />
                                    </span>
                                    <span className="v2-mobile-loc-sub" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                                        {secondaryAddressSub}
                                    </span>
                                </span>
                            </span>
                        </button>

                        {/* Top Right Aligned Brand: Sorted Solutions */}
                        <Link
                            href="/v2"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                flexShrink: 0,
                                textDecoration: 'none',
                                padding: '5px 12px 5px 8px',
                                borderRadius: 999,
                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                            }}>
                                <img
                                    src="/logo.jpg"
                                    alt="Sorted Solutions"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    letterSpacing: '-0.02em',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Sorted Solutions
                                </span>
                                <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 600,
                                    color: 'rgba(255, 255, 255, 0.75)',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase'
                                }}>
                                    Doorstep Care
                                </span>
                            </div>
                        </Link>
                    </div>

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

                    {/* Dynamic Auto-Sliding Hero Carousel (GIFs, Videos & Offers) */}
                    <HeroCarousel />
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
                            <button
                                key={cat.slug}
                                type="button"
                                onClick={() => setSelectedModalCategory(cat)}
                                className="v2-cat-tile"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontFamily: 'inherit'
                                }}
                            >
                                <div className="v2-cat-icon-box" style={{ background: cat.accent }}>
                                    <img src={cat.icon} alt={cat.name} />
                                </div>
                                <span className="v2-cat-label">{cat.mobileLabel}</span>
                                {categoryCounts[cat.slug] > 0 && (
                                    <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                                        {categoryCounts[cat.slug]} services
                                    </span>
                                )}
                            </button>
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

            {/* Urban Company-inspired Subcategory Bottom Sheet Modal */}
            {selectedModalCategory && (
                <SubcategoryModal
                    category={selectedModalCategory}
                    onClose={() => setSelectedModalCategory(null)}
                />
            )}
        </div>
    );
}
