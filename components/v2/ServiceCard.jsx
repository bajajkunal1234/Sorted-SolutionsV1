'use client';

import { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';

export default function ServiceCard({ service, highlighted = false }) {
    const { getItemQty, addItem, incrementItem, decrementItem } = useV2Cart();
    const [detailsOpen, setDetailsOpen] = useState(false);

    const qty = getItemQty(service.id);

    return (
        <>
            <article
                id={`svc-${service.id}`}
                className="v2-service-card"
                style={
                    highlighted
                        ? { borderColor: '#6338f5', boxShadow: '0 0 0 3px rgba(99, 56, 245, 0.14)' }
                        : undefined
                }
            >
                <div className="v2-service-info">
                    <span className="v2-service-tag">{service.subgroup}</span>
                    <h3 className="v2-service-title">{service.name}</h3>

                    <div className="v2-price-row">
                        <span className="v2-price-now">{formatINR(service.price)}</span>
                        {service.mrp > service.price && (
                            <>
                                <span className="v2-price-mrp">{formatINR(service.mrp)}</span>
                                {service.discountPercent > 0 && (
                                    <span className="v2-discount-pill">{service.discountPercent}% OFF</span>
                                )}
                            </>
                        )}
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>
                            {service.gstApplicable ? `+ ${service.gstRate}% GST` : 'Tax incl.'}
                        </span>
                    </div>

                    {service.highlights && service.highlights.length > 0 ? (
                        <ul className="v2-service-bullets">
                            {service.highlights.slice(0, 3).map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ fontSize: 13, color: '#5b6476', margin: '8px 0' }}>
                            {service.description || service.warrantyNote}
                        </p>
                    )}

                    <button
                        type="button"
                        className="v2-details-link"
                        onClick={() => setDetailsOpen(true)}
                    >
                        View details & warranty
                    </button>
                </div>

                <div className="v2-service-media">
                    <div className="v2-service-thumb">
                        <img
                            src={service.image}
                            alt={service.name}
                            style={{
                                objectFit: service.images?.length ? 'cover' : 'contain',
                                padding: service.images?.length ? 0 : 12,
                            }}
                        />
                    </div>

                    <div className="v2-add-action-wrap">
                        {qty === 0 ? (
                            <button
                                type="button"
                                className="v2-btn-add"
                                onClick={() => addItem(service)}
                            >
                                + ADD
                            </button>
                        ) : (
                            <div className="v2-qty-stepper">
                                <button
                                    type="button"
                                    aria-label={`Remove one ${service.name}`}
                                    onClick={() => decrementItem(service.id)}
                                >
                                    −
                                </button>
                                <span>{qty}</span>
                                <button
                                    type="button"
                                    aria-label={`Add one more ${service.name}`}
                                    onClick={() => incrementItem(service.id)}
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </article>

            {detailsOpen && (
                <div
                    className="v2-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-label={service.name}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setDetailsOpen(false);
                    }}
                >
                    <div className="v2-sheet">
                        <div className="v2-sheet-head">
                            <div>
                                <div style={{ fontSize: 11.5, color: '#6338f5', fontWeight: 700 }}>
                                    {service.categoryName} · {service.subgroup}
                                </div>
                                <strong style={{ fontSize: 16 }}>{service.name}</strong>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailsOpen(false)}
                                aria-label="Close service details"
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

                        <div className="v2-sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <div className="v2-price-row" style={{ marginTop: 0 }}>
                                    <span className="v2-price-now" style={{ fontSize: 20 }}>
                                        {formatINR(service.price)}
                                    </span>
                                    {service.mrp > service.price && (
                                        <span className="v2-price-mrp">{formatINR(service.mrp)}</span>
                                    )}
                                </div>
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                    HSN/SAC: {service.hsnCode}
                                </span>
                            </div>

                            {service.description && (
                                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.55 }}>
                                    {service.description}
                                </p>
                            )}

                            {service.highlights?.length > 0 && (
                                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Info size={15} color="#6338f5" />
                                        Service Scope & Terms
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {service.highlights.map((h, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#334155' }}>
                                                <CheckCircle2 size={15} color="#0b875b" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <span>{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 12,
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                                <span>{service.warrantyNote}</span>
                            </div>
                        </div>

                        <div className="v2-sheet-foot">
                            {qty === 0 ? (
                                <button
                                    type="button"
                                    className="v2-primary-btn"
                                    onClick={() => {
                                        addItem(service);
                                        setDetailsOpen(false);
                                    }}
                                >
                                    Add to Cart · {formatINR(service.price)}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="v2-primary-btn"
                                    onClick={() => setDetailsOpen(false)}
                                >
                                    In Cart ({qty}) · Done
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
