'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import './CategoryCards.css'

export default function CategoryCards({
    title = "Our Services",
    subtitle = "Choose your service category",
    cards,
    baseUrl = "/services"
}) {
    return (
        <section className="category-cards-section">
            <div className="section-header">
                <h2 className="section-title">{title}</h2>
                {subtitle && <p className="section-subtitle">{subtitle}</p>}
            </div>

            <div className="cards-grid">
                {cards.map((card, index) => (
                    <Link
                        key={card.slug}
                        href={`${baseUrl}/${card.slug}`}
                        className="category-card"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="card-image-wrapper">
                            {card.image ? (
                                <Image
                                    src={card.image}
                                    alt={card.title}
                                    width={300}
                                    height={200}
                                    className="card-image"
                                />
                            ) : (
                                <div className="card-image-placeholder">
                                    <span className="placeholder-icon">{card.icon || '🔧'}</span>
                                </div>
                            )}
                            <div className="card-overlay">
                                <ArrowRight size={32} className="arrow-icon" />
                            </div>
                        </div>

                        <div className="card-content">
                            <h3 className="card-title">{card.title}</h3>
                            {card.description && (
                                <p className="card-description">{card.description}</p>
                            )}
                            {card.price && (
                                <div className="card-price">
                                    Starting at <span className="price-value">₹{card.price}</span>
                                </div>
                            )}
                        </div>

                        <div className="card-footer">
                            <span className="view-details">
                                View Details
                                <ArrowRight size={16} />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}
