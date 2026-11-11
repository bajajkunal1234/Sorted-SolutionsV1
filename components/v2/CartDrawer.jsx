'use client';

import { X, ShoppingCart } from 'lucide-react';
import { useV2Cart } from './CartContext';
import CartSummaryBody from './CartSummaryBody';

export default function CartDrawer() {
    const { cartOpen, setCartOpen, totals } = useV2Cart();

    if (!cartOpen) return null;

    return (
        <div
            className="v2-backdrop drawer-right"
            role="dialog"
            aria-modal="true"
            aria-label="Service Cart"
            onClick={(e) => {
                if (e.target === e.currentTarget) setCartOpen(false);
            }}
        >
            <div className="v2-sheet">
                <div className="v2-sheet-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShoppingCart size={18} color="#6338f5" />
                        <strong style={{ fontSize: 16 }}>
                            Your Cart {totals.totalCount > 0 ? `(${totals.totalCount})` : ''}
                        </strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCartOpen(false)}
                        aria-label="Close cart"
                        style={{
                            border: 'none',
                            background: '#f1f5f9',
                            borderRadius: 999,
                            width: 32,
                            height: 32,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="v2-sheet-body">
                    <CartSummaryBody onCheckoutClick={() => setCartOpen(false)} />
                </div>
            </div>
        </div>
    );
}
