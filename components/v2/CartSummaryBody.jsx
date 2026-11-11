'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';

/**
 * Shared Cart contents + tax breakdown + Proceed CTA.
 * Used in both the Desktop Sticky Right Sidebar and the Slide-over CartDrawer.
 */
export default function CartSummaryBody({ onCheckoutClick, compact = false }) {
    const { items, totals, incrementItem, decrementItem, removeItem } = useV2Cart();

    if (items.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: compact ? '24px 8px' : '40px 16px' }}>
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: '#f5f3ff',
                        color: '#6338f5',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 12px',
                    }}
                >
                    <ShoppingBag size={24} />
                </div>
                <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>
                    No items in your cart
                </strong>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                    Tap + ADD on any service card to build your booking.
                </span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(item => (
                    <div
                        key={item.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            paddingBottom: 10,
                            borderBottom: '1px solid #f1f5f9',
                        }}
                    >
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    lineHeight: 1.3,
                                }}
                            >
                                {item.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                {formatINR(item.price)} x {item.qty} ={' '}
                                <strong style={{ color: '#0f172a' }}>
                                    {formatINR(item.price * item.qty)}
                                </strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <div className="v2-qty-stepper" style={{ height: 30, boxShadow: 'none' }}>
                                <button
                                    type="button"
                                    aria-label={`Decrease quantity of ${item.name}`}
                                    onClick={() => decrementItem(item.id)}
                                >
                                    −
                                </button>
                                <span>{item.qty}</span>
                                <button
                                    type="button"
                                    aria-label={`Increase quantity of ${item.name}`}
                                    onClick={() => incrementItem(item.id)}
                                >
                                    +
                                </button>
                            </div>
                            {!compact && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    aria-label={`Remove ${item.name}`}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: 4,
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Price & Tax Summary */}
            <div
                style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Item subtotal</span>
                    <span>{formatINR(totals.itemsSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>GST (CGST + SGST)</span>
                    <span>{formatINR(totals.totalTax)}</span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        fontSize: 15,
                        color: '#0f172a',
                        paddingTop: 6,
                        borderTop: '1px dashed #cbd5e1',
                    }}
                >
                    <span>Total Payable</span>
                    <span>{formatINR(totals.grandTotal)}</span>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#0b875b',
                    fontWeight: 600,
                }}
            >
                <ShieldCheck size={15} />
                <span>30-day service warranty + GST invoice included</span>
            </div>

            <Link
                href="/v2/checkout"
                onClick={onCheckoutClick}
                className="v2-primary-btn"
            >
                Proceed to Checkout ({formatINR(totals.grandTotal)})
                <ArrowRight size={16} />
            </Link>
        </div>
    );
}
