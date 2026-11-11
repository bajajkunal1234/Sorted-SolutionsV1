'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, ShoppingBag, ShieldCheck, User } from 'lucide-react';
import { useV2Cart } from './CartContext';

/**
 * Elevated mobile-web bottom navigation dock modeled after Urban Company m-web.
 */
export default function FloatingBottomDock() {
    const pathname = usePathname();
    const { totals, setCartOpen } = useV2Cart();

    const isHome = pathname === '/v2';
    const isServices = pathname?.startsWith('/v2/services');
    const isCheckout = pathname === '/v2/checkout';
    const isCustomer = pathname?.startsWith('/v2/customer');

    return (
        <nav className="v2-bottom-dock" aria-label="Mobile Navigation">
            <Link href="/v2" className={`v2-dock-item ${isHome ? 'active' : ''}`}>
                <Home size={20} strokeWidth={isHome ? 2.4 : 1.9} />
                <span>Sorted</span>
            </Link>

            <Link href="/v2/services" className={`v2-dock-item ${isServices ? 'active' : ''}`}>
                <Grid size={20} strokeWidth={isServices ? 2.4 : 1.9} />
                <span>Services</span>
            </Link>

            <button
                type="button"
                onClick={() => setCartOpen(true)}
                className={`v2-dock-item ${isCheckout ? 'active' : ''}`}
            >
                <ShoppingBag size={20} strokeWidth={isCheckout ? 2.4 : 1.9} />
                {totals.totalCount > 0 && (
                    <span className="v2-dock-badge">{totals.totalCount}</span>
                )}
                <span>Cart</span>
            </button>

            <Link href="/v2/customer?tab=plans" className="v2-dock-item">
                <ShieldCheck size={20} strokeWidth={1.9} />
                <span>Care Plans</span>
            </Link>

            <Link href="/v2/customer" className={`v2-dock-item ${isCustomer ? 'active' : ''}`}>
                <User size={20} strokeWidth={isCustomer ? 2.4 : 1.9} />
                <span>Account</span>
            </Link>
        </nav>
    );
}
