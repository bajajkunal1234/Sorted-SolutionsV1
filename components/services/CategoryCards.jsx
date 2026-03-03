'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import './CategoryCards.css'

export default function CategoryCards({
    title = "Our Services",
    subtitle = "Choose your service category",
    cards = [],
    baseUrl = "/services"
}) {
    if (!cards || cards.length === 0) return null;

    return (
        <section className="category-cards-section">
            <div className="section-header">
                <h2 className="section-title">{title}</h2>
                {subtitle && <p className="section-subtitle">{subtitle}</p>}
            </div>

            <div className="subcategory-pills-grid">
                {cards.map((card, index) => (
                    <Link
                        key={card.slug || index}
                        href={`${baseUrl}/${card.slug}`}
                        className="subcategory-pill"
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        {/* Thumbnail */}
                        <div className="subcategory-thumb">
                            {card.image ? (
                                <img
                                    src={card.image}
                                    alt={card.title}
                                    className="subcategory-thumb-img"
                                />
                            ) : (
                                <div className="subcategory-thumb-placeholder">
                                    <span>{card.icon || '🔧'}</span>
                                </div>
                            )}
                        </div>

                        {/* Text */}
                        <div className="subcategory-pill-content">
                            <span className="subcategory-pill-title">{card.title}</span>
                            {card.description && (
                                <span className="subcategory-pill-desc">{card.description}</span>
                            )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight size={18} className="subcategory-pill-arrow" />
                    </Link>
                ))}
            </div>
        </section>
    )
}
