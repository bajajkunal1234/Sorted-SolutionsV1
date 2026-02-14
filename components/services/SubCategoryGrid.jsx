'use client'

import Link from 'next/link'

export default function SubCategoryGrid({ title, subcategories, baseUrl }) {
    return (
        <section className="category-grid-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="category-grid">
                    {subcategories.map(subcat => (
                        <Link
                            key={subcat.id}
                            href={`${baseUrl}/${subcat.slug}`}
                            className="category-card"
                        >
                            <h3 className="category-name">{subcat.name}</h3>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}



