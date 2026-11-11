'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';

/**
 * Sticky mobile cart bar floating right above the bottom dock when cart has items.
 */
export default function FloatingCartBar() {
    const pathname = usePathname();
    const { totals, setCartOpen } = useV2Cart();

    if (totals.totalCount === 0) return null;
    if (pathname === '/v2/checkout') return null;

    return (
        <div className="v2-floating-cart-bar">
            <button
                type="button"
                onClick={() => setCartOpen(true)}
                style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                }}
            >
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {totals.totalCount} {totals.totalCount === 1 ? 'service' : 'services'} ·{' '}
                    {formatINR(totals.grandTotal)}
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    Incl. GST · Tap to edit cart
                </div>
            </button>

            <Link
                href="/v2/checkout"
                style={{
                    background: '#6338f5',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                }}
            >
                <span>Checkout</span>
                <ArrowRight size={15} />
            </Link>
        </div>
    );
}
