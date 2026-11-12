'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, CheckCircle2, Wrench, ArrowLeft } from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { useV2Cart } from './CartContext';
import ServiceCard from './ServiceCard';
import CartSummaryBody from './CartSummaryBody';

/**
 * Urban Company inspired 3-Column Storefront (Left Subgroup Rail, Center Services, Right Sticky Cart)
 * gracefully adapts to 1-Column Mobile view with sticky category & subgroup strips.
 */
export default function CategoryStorefront({
    activeCategory = null,
    services = [],
    categoryCounts = {},
    highlightId = null,
    initialQuery = '',
}) {
    const { location, setLocationModalOpen } = useV2Cart();
    const [selectedSubgroup, setSelectedSubgroup] = useState('ALL');
    const [filterText, setFilterText] = useState(initialQuery || '');

    const filteredServices = useMemo(() => {
        let list = services;
        if (filterText.trim()) {
            const q = filterText.trim().toLowerCase();
            list = list.filter(
                s =>
                    s.name.toLowerCase().includes(q) ||
                    s.subgroup.toLowerCase().includes(q) ||
                    s.description.toLowerCase().includes(q)
            );
        }
        return list;
    }, [services, filterText]);

    const groupedServices = useMemo(() => {
        const groups = {};
        filteredServices.forEach(item => {
            const key = item.subgroup || 'Services';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.entries(groups);
    }, [filteredServices]);

    const visibleGroups = useMemo(() => {
        if (selectedSubgroup === 'ALL') return groupedServices;
        return groupedServices.filter(([name]) => name === selectedSubgroup);
    }, [groupedServices, selectedSubgroup]);

    const subgroupNames = useMemo(() => {
        if (groupedServices.length > 0) return groupedServices.map(([n]) => n);
        return activeCategory?.subgroups || [];
    }, [groupedServices, activeCategory]);

    const scrollToSection = (groupName) => {
        setSelectedSubgroup(groupName);
        if (groupName === 'ALL') return;
        const el = document.getElementById(`grp-${groupName.replace(/\s+/g, '-')}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div>
            {/* ── Top Category Header & Horizontal Switcher ── */}
            <section className="v2-cat-page-header">
                <div className="v2-container">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <Link
                            href="/v2"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                textDecoration: 'none',
                                color: '#475569',
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            <ArrowLeft size={15} /> Back to Home
                        </Link>
                        <button
                            type="button"
                            onClick={() => setLocationModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                border: '1px solid #e2e8f0',
                                background: '#fff',
                                borderRadius: 999,
                                padding: '5px 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#0f172a',
                            }}
                        >
                            <MapPin size={13} color="#6338f5" />
                            {location.locality || 'Select Mumbai Area'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        {activeCategory ? (
                            <img
                                src={activeCategory.icon}
                                alt={activeCategory.name}
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 14,
                                    background: activeCategory.accent,
                                    padding: 6,
                                    objectFit: 'contain',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 14,
                                    background: '#f5f3ff',
                                    color: '#6338f5',
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                            >
                                <Wrench size={24} />
                            </div>
                        )}
                        <div>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                                {activeCategory ? activeCategory.name : 'All Appliance Services'}
                            </h1>
                            <p style={{ margin: '3px 0 0', fontSize: 13.5, color: '#5b6476' }}>
                                {activeCategory
                                    ? activeCategory.tagline
                                    : 'Explore all website-published repairs, maintenance & AMC packages in Mumbai'}
                            </p>
                        </div>
                    </div>

                    {/* 6 Category Switcher Pills */}
                    <div className="v2-cat-pills-row">
                        <Link
                            href="/v2/services"
                            className={`v2-cat-pill ${!activeCategory ? 'active' : ''}`}
                        >
                            All ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
                        </Link>
                        {V2_CATEGORIES.map(cat => (
                            <Link
                                key={cat.slug}
                                href={cat.subcategories?.[0] ? `/v2/services/${cat.slug}/${cat.subcategories[0].slug}` : `/v2/services/${cat.slug}`}
                                className={`v2-cat-pill ${activeCategory?.slug === cat.slug ? 'active' : ''}`}
                            >
                                <img src={cat.icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                                {cat.shortLabel}
                                {categoryCounts[cat.slug] > 0 ? ` (${categoryCounts[cat.slug]})` : ''}
                            </Link>
                        ))}
                    </div>

                    {/* Subcategory Pills Row */}
                    {activeCategory?.subcategories?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10, paddingBottom: 4, scrollbarWidth: 'none' }}>
                            {activeCategory.subcategories.map(sub => (
                                <Link
                                    key={sub.slug}
                                    href={`/v2/services/${activeCategory.slug}/${sub.slug}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 14px',
                                        borderRadius: 999,
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        color: '#334155',
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <img src={sub.icon || activeCategory.icon} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                                    <span>{sub.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Mobile Subgroup Pills */}
                    {subgroupNames.length > 0 && (
                        <div className="v2-mobile-subgroups">
                            <button
                                type="button"
                                className={`v2-cat-pill ${selectedSubgroup === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSelectedSubgroup('ALL')}
                            >
                                All Services
                            </button>
                            {subgroupNames.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    className={`v2-cat-pill ${selectedSubgroup === name ? 'active' : ''}`}
                                    onClick={() => scrollToSection(name)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Urban Company 3-Column Storefront Body ── */}
            <div className="v2-container v2-3col-layout">
                {/* LEFT STICKY RAIL: Subcategory navigation + Sorted Promise */}
                <aside className="v2-left-rail">
                    <div className="v2-card">
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
                            Select Service Type
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button
                                type="button"
                                className={`v2-subgroup-nav-btn ${selectedSubgroup === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSelectedSubgroup('ALL')}
                            >
                                All Packages ({filteredServices.length})
                            </button>
                            {subgroupNames.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    className={`v2-subgroup-nav-btn ${selectedSubgroup === name ? 'active' : ''}`}
                                    onClick={() => scrollToSection(name)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="v2-card" style={{ background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <ShieldCheck size={18} color="#0b875b" />
                            <strong style={{ fontSize: 14 }}>Sorted Promise</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#334155' }}>
                            <div style={{ display: 'flex', gap: 7 }}>
                                <CheckCircle2 size={14} color="#0b875b" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>Verified Mumbai technicians</span>
                            </div>
                            <div style={{ display: 'flex', gap: 7 }}>
                                <CheckCircle2 size={14} color="#0b875b" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>30-day warranty on repairs</span>
                            </div>
                            <div style={{ display: 'flex', gap: 7 }}>
                                <CheckCircle2 size={14} color="#0b875b" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>Official GST invoice generated</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* CENTER FEED: Service Catalog Cards */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="search"
                            className="v2-input"
                            placeholder={`Filter ${activeCategory?.name || 'services'}...`}
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>

                    {visibleGroups.length > 0 ? (
                        visibleGroups.map(([groupName, items]) => (
                            <div
                                key={groupName}
                                id={`grp-${groupName.replace(/\s+/g, '-')}`}
                                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{groupName}</h2>
                                    <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
                                        {items.length} {items.length === 1 ? 'package' : 'packages'}
                                    </span>
                                </div>
                                {items.map(svc => (
                                    <ServiceCard
                                        key={svc.id}
                                        service={svc}
                                        highlighted={highlightId === svc.id}
                                    />
                                ))}
                            </div>
                        ))
                    ) : (
                        <div className="v2-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
                            <Wrench size={28} color="#6338f5" style={{ marginBottom: 10 }} />
                            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>
                                No published web packages here yet
                            </h3>
                            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#64748b', maxWidth: 440, marginInline: 'auto' }}>
                                {filterText
                                    ? `No active website packages match "${filterText}". Clear your filter to check all packages.`
                                    : 'To publish a service in this category, mark its Subtype as "Web (Website Booking)" inside Admin → Inventory.'}
                            </p>
                            {filterText && (
                                <button
                                    type="button"
                                    className="v2-secondary-btn"
                                    onClick={() => setFilterText('')}
                                >
                                    Clear filter
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* RIGHT STICKY RAIL (Desktop): Persistent Cart Sidebar */}
                <aside className="v2-right-rail">
                    <div className="v2-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <strong style={{ fontSize: 16 }}>Cart Summary</strong>
                            {location.locality && (
                                <span style={{ fontSize: 11.5, color: '#6338f5', fontWeight: 600 }}>
                                    {location.locality}
                                </span>
                            )}
                        </div>
                        <CartSummaryBody compact />
                    </div>
                </aside>
            </div>
        </div>
    );
}
