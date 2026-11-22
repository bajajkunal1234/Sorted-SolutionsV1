'use client';

import { useState } from 'react';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import WebServiceModal from './WebServiceModal';

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
                            src={service.web_details?.thumbnail_image || service.image || service.images?.[0]}
                            alt={service.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: (service.web_details?.thumbnail_image || service.images?.length) ? 'cover' : 'contain',
                                padding: (service.web_details?.thumbnail_image || service.images?.length) ? 0 : 8,
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
                <WebServiceModal
                    service={service}
                    onClose={() => setDetailsOpen(false)}
                />
            )}
        </>
    );
}
