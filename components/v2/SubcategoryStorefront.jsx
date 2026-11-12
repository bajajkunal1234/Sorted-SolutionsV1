'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, ChevronRight, Wrench, Sparkles, MapPin } from 'lucide-react';
import { useV2Cart } from './CartContext';
import ServiceCard from './ServiceCard';
import CartSummaryBody from './CartSummaryBody';

export default function SubcategoryStorefront({
    category = null,
    subcategory = null,
    services = [],
    categoryCounts = {},
    highlightId = null,
    initialQuery = '',
}) {
    const router = useRouter();
    const { location, setLocationModalOpen } = useV2Cart();
    const [selectedSubgroup, setSelectedSubgroup] = useState('ALL');
    const [filterText, setFilterText] = useState(initialQuery || '');

    const subcategoriesList = category?.subcategories || [];

    // Filter services by subcategory keyword matching, fallback to category services if no specific keywords match
    const subcategoryServices = useMemo(() => {
        if (!subcategory || !subcategory.keywords || subcategory.keywords.length === 0) {
            return services;
        }

        const keywords = subcategory.keywords.map(k => k.toLowerCase());
        const matched = services.filter(service => {
            const text = `${service.name} ${service.description || ''} ${service.subgroup || ''}`.toLowerCase();
            return keywords.some(k => text.includes(k));
        });

        // If specific keyword matching found results, return them. Otherwise return all category services.
        return matched.length > 0 ? matched : services;
    }, [services, subcategory]);

    // Apply search filter if user types in search box
    const filteredServices = useMemo(() => {
        let list = subcategoryServices;
        if (filterText.trim()) {
            const q = filterText.trim().toLowerCase();
            list = list.filter(
                s =>
                    s.name.toLowerCase().includes(q) ||
                    (s.subgroup && s.subgroup.toLowerCase().includes(q)) ||
                    (s.description && s.description.toLowerCase().includes(q))
            );
        }
        return list;
    }, [subcategoryServices, filterText]);

    // Group services by subgroup
    const groupedServices = useMemo(() => {
        const groups = {};
        filteredServices.forEach(item => {
            const key = item.subgroup || 'Popular Packages';
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
        return category?.subgroups || [];
    }, [groupedServices, category]);

    const scrollToSection = (groupName) => {
        setSelectedSubgroup(groupName);
        if (groupName === 'ALL') return;
        const el = document.getElementById(`grp-${groupName.replace(/\s+/g, '-')}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div>
            {/* ── Subcategory Hero Header ── */}
            <section className="v2-cat-page-header">
                <div className="v2-container">
                    {/* Top Bar: Back Link + Locality Pill */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 12
                    }}>
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
                            <ArrowLeft size={15} /> All Appliances
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

                    {/* Breadcrumbs */}
                    <nav style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#64748b',
                        marginBottom: 10
                    }}>
                        <Link href="/v2" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
                        <ChevronRight size={12} />
                        <span>{category?.name || 'Services'}</span>
                        <ChevronRight size={12} />
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{subcategory?.name}</span>
                    </nav>

                    {/* Main Title & Subtitle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        marginBottom: 16
                    }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            backgroundColor: category?.accent || '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <img
                                src={subcategory?.icon || category?.icon}
                                alt={subcategory?.name || 'Subcategory'}
                                style={{ maxWidth: '75%', maxHeight: '75%', objectFit: 'contain' }}
                            />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: 'clamp(20px, 4.5vw, 26px)',
                                fontWeight: 800,
                                color: '#0f172a',
                                margin: '0 0 4px 0',
                                letterSpacing: '-0.02em'
                            }}>
                                {subcategory?.headline || subcategory?.name || category?.name}
                            </h1>
                            <p style={{
                                fontSize: 13,
                                color: '#64748b',
                                margin: 0,
                                lineHeight: 1.35
                            }}>
                                {subcategory?.shortDesc || category?.tagline}
                            </p>
                        </div>
                    </div>

                    {/* Trust Badges Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                        fontSize: 12,
                        color: '#475569',
                        padding: '10px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={14} color="#6338f5" />
                            <strong>90-Min Doorstep Arrival</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <ShieldCheck size={14} color="#10b981" />
                            <span>30-Day Service Warranty</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle2 size={14} color="#3b82f6" />
                            <span>Fixed GST Invoicing</span>
                        </div>
                    </div>

                    {/* Subcategories Switcher Pills (Switch easily without leaving page) */}
                    {subcategoriesList.length > 1 && (
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            overflowX: 'auto',
                            paddingBottom: 6,
                            scrollbarWidth: 'none'
                        }}>
                            {subcategoriesList.map(sub => {
                                const isActive = sub.slug === subcategory?.slug;
                                return (
                                    <Link
                                        key={sub.slug}
                                        href={`/v2/services/${category.slug}/${sub.slug}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '8px 16px',
                                            borderRadius: 999,
                                            border: isActive ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                            backgroundColor: isActive ? '#6338f5' : '#ffffff',
                                            color: isActive ? '#ffffff' : '#334155',
                                            textDecoration: 'none',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            boxShadow: isActive ? '0 2px 8px rgba(99,56,245,0.25)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <img
                                            src={sub.icon || category.icon}
                                            alt={sub.name}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                objectFit: 'contain',
                                                filter: isActive ? 'brightness(0) invert(1)' : 'none'
                                            }}
                                        />
                                        <span>{sub.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Subgroup Filter Pills (Mobile Horizontal Scroll) ── */}
            {subgroupNames.length > 0 && (
                <div className="v2-subgroup-strip">
                    <div className="v2-container" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        <button
                            type="button"
                            onClick={() => scrollToSection('ALL')}
                            className={`v2-subgroup-pill ${selectedSubgroup === 'ALL' ? 'active' : ''}`}
                        >
                            All ({subcategoryServices.length})
                        </button>
                        {subgroupNames.map(name => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => scrollToSection(name)}
                                className={`v2-subgroup-pill ${selectedSubgroup === name ? 'active' : ''}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 3-Column Layout (Desktop) / 1-Column Layout (Mobile) ── */}
            <div className="v2-container" style={{ padding: '24px 16px' }}>
                <div className="v2-cat-layout">
                    {/* Left Sticky Rail: Subgroups (Desktop only) */}
                    <aside className="v2-cat-left-rail">
                        <div className="v2-subgroup-rail-card">
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Service Types
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedSubgroup('ALL')}
                                className={`v2-rail-btn ${selectedSubgroup === 'ALL' ? 'active' : ''}`}
                            >
                                <span>All Packages</span>
                                <span className="v2-rail-badge">{subcategoryServices.length}</span>
                            </button>
                            {subgroupNames.map(name => {
                                const count = subcategoryServices.filter(s => (s.subgroup || 'Services') === name).length;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setSelectedSubgroup(name)}
                                        className={`v2-rail-btn ${selectedSubgroup === name ? 'active' : ''}`}
                                    >
                                        <span>{name}</span>
                                        {count > 0 && <span className="v2-rail-badge">{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Center Column: Service Packages List */}
                    <main className="v2-cat-center-feed">
                        {visibleGroups.length === 0 ? (
                            <div className="v2-cat-empty-card">
                                <Wrench size={36} color="#94a3b8" />
                                <h3>No published packages match this filter</h3>
                                <p>
                                    Switch subcategories or search for a specific repair issue above.
                                </p>
                            </div>
                        ) : (
                            visibleGroups.map(([groupName, items]) => (
                                <section
                                    key={groupName}
                                    id={`grp-${groupName.replace(/\s+/g, '-')}`}
                                    className="v2-service-group-section"
                                >
                                    <div className="v2-service-group-title">
                                        <h2>{groupName}</h2>
                                        <span>{items.length} options</span>
                                    </div>

                                    <div className="v2-service-cards-stack">
                                        {items.map(service => (
                                            <ServiceCard
                                                key={service.id}
                                                service={service}
                                                isHighlighted={String(highlightId) === String(service.id)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </main>

                    {/* Right Column: Sticky Cart Summary (Desktop only) */}
                    <aside className="v2-cat-right-cart">
                        <div className="v2-sticky-cart-card">
                            <CartSummaryBody />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
