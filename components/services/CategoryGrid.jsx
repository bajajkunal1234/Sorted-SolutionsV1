'use client'

import Link from 'next/link'
import './CategoryGrid.css'

export default function CategoryGrid({ title, categories, baseUrl }) {
    return (
        <section className="category-grid-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="category-grid">
                    {categories.map(category => (
                        <Link
                            key={category.id}
                            href={`${baseUrl}/${category.slug}`}
                            className="category-card"
                        >
                            <div className="category-icon">{category.icon}</div>
                            <h3 className="category-name">{category.name}</h3>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}



