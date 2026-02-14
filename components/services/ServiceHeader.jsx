'use client'

import Link from 'next/link'
import './ServiceHeader.css'

export default function ServiceHeader({ pageType, title }) {
    const categories = [
        { name: 'All Services', slug: '/services' },
        { name: 'AC', slug: '/services/ac-repair' },
        { name: 'WM', slug: '/services/washing-machine-repair' },
        { name: 'Ovens', slug: '/services/oven-repair' },
        { name: 'Refrigerator', slug: '/services/refrigerator-repair' },
        { name: 'RO', slug: '/services/water-purifier-repair' },
        { name: 'HOB', slug: '/services/hob-repair' },
    ]

    return (
        <header className="service-header">
            <div className="service-header-top">
                <Link href="/" className="service-logo">
                    <h1>SORTED SOLUTIONS</h1>
                </Link>
            </div>

            <nav className="service-nav">
                {categories.map((cat, idx) => (
                    <Link key={idx} href={cat.slug} className="service-nav-link">
                        {cat.name}
                    </Link>
                ))}
            </nav>

            <div className="service-title-section">
                <h1 className="service-page-title">{title}</h1>
            </div>
        </header>
    )
}



