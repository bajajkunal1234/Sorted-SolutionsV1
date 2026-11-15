'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, ChevronDown, ShoppingCart, User } from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import ServiceSearchBox from './ServiceSearchBox';

export default function DesktopHeader() {
    const pathname = usePathname();
    const {
        location,
        setLocationModalOpen,
        totals,
        setCartOpen,
        customerSession,
        brandLogos,
    } = useV2Cart();

    const locText = location.locality
        ? `${location.locality}${location.pincode ? `, ${location.pincode}` : ''}`
        : 'Mumbai — Select Locality';

    const headerLogo = brandLogos?.dayModeLogo || '/images/logos/logo-day.png';

    return (
        <header className="v2-desktop-header">
            <div className="v2-container v2-header-inner">
                <Link href="/v2" className="v2-brand-link" aria-label={brandLogos?.altText || "Sorted Solutions"} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <img
                        src={headerLogo}
                        alt={brandLogos?.altText || "Sorted Solutions"}
                        style={{
                            height: 38,
                            maxHeight: 44,
                            width: 'auto',
                            maxWidth: 160,
                            objectFit: 'contain',
                            display: 'block'
                        }}
                        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
                    />
                </Link>

                <div className="v2-header-controls">
                    <button
                        type="button"
                        className="v2-loc-pill"
                        onClick={() => setLocationModalOpen(true)}
                    >
                        <MapPin size={16} color="#6338f5" style={{ flexShrink: 0 }} />
                        <span className="v2-loc-pill-text">{locText}</span>
                        <ChevronDown size={15} color="#64748b" style={{ flexShrink: 0 }} />
                    </button>

                    <ServiceSearchBox variant="desktop" />
                </div>

                <nav className="v2-header-actions" aria-label="Main navigation">
                    <Link
                        href="/v2/services"
                        className={`v2-nav-link ${pathname?.startsWith('/v2/services') ? 'active' : ''}`}
                    >
                        Services
                    </Link>
                    <Link
                        href="/v2/customer?tab=plans"
                        className={`v2-nav-link ${pathname === '/v2/customer' ? 'active' : ''}`}
                    >
                        AMC & Rentals
                    </Link>

                    <button
                        type="button"
                        className={`v2-cart-btn ${totals.totalCount > 0 ? 'has-items' : ''}`}
                        onClick={() => setCartOpen(true)}
                    >
                        <ShoppingCart size={16} />
                        <span>
                            {totals.totalCount > 0
                                ? `${totals.totalCount} · ${formatINR(totals.grandTotal)}`
                                : 'Cart'}
                        </span>
                    </button>

                    <Link href="/v2/customer" className="v2-icon-btn">
                        <User size={16} />
                        <span>{customerSession?.name?.split(' ')[0] || 'Account'}</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
}
