'use client'

import { useState, useEffect } from 'react'
import './ServiceTestimonials.css'

// Fallback shown only if admin has no testimonials yet
const PLACEHOLDER_TESTIMONIALS = [
    {
        id: 'ph1',
        customerName: 'Rajesh Kumar',
        rating: 5,
        review: 'Excellent service! The technician was professional and fixed my AC within an hour. Highly recommended!',
        date: '2 days ago',
        location: 'Mumbai',
        verified: true,
    },
    {
        id: 'ph2',
        customerName: 'Priya Sharma',
        rating: 5,
        review: 'Very satisfied with the service. Transparent pricing and quality work. Will definitely use again.',
        date: '1 week ago',
        location: 'Bengaluru',
        verified: true,
    },
    {
        id: 'ph3',
        customerName: 'Amit Patel',
        rating: 5,
        review: 'Good service and reasonable rates. The technician was knowledgeable and explained everything clearly.',
        date: '2 weeks ago',
        location: 'Pune',
        verified: false,
    },
];

export default function ServiceTestimonials({ category, subcategory, location, sublocation }) {
    const [testimonials, setTestimonials] = useState([]);
    const [googleUrl, setGoogleUrl] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Fetch only admin-approved reviews
        fetch('/api/settings/testimonials?public=true')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.success && data.data?.length > 0) {
                    // Map DB columns → component shape
                    const mapped = data.data.map(t => ({
                        id: t.id,
                        customerName: t.customer_name,
                        rating: t.rating,
                        review: t.review_text,
                        date: t.date
                            ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '',
                        location: t.location,
                        verified: t.is_verified,
                        featured: t.is_featured,
                        source: t.source,
                    }));
                    // Show featured first, then the rest
                    const sorted = [
                        ...mapped.filter(t => t.featured),
                        ...mapped.filter(t => !t.featured),
                    ];
                    setTestimonials(sorted);
                }
            })
            .catch(() => { })
            .finally(() => setLoaded(true));

        // Fetch Google Business URL for the button
        fetch('/api/settings/section-configs?id=testimonials')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const url = data?.data?.extra_config?.googleSync?.googleBusinessUrl || '';
                if (url) setGoogleUrl(url);
            })
            .catch(() => { });
    }, []);

    const displayList = loaded && testimonials.length > 0 ? testimonials : PLACEHOLDER_TESTIMONIALS;
    const viewGoogleHref = googleUrl || 'https://www.google.com/search?q=Sorted+Solutions+reviews';

    // Google logo G SVG (official brand colours)
    const GoogleG = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );

    return (
        <section className="testimonials-section">
            <div className="container">
                <h2 className="section-title">What Our Customers Say</h2>

                <div className="testimonials-scroll">
                    {displayList.map(testimonial => (
                        <div key={testimonial.id} className="testimonial-card">
                            <div className="testimonial-header">
                                <div className="testimonial-avatar">
                                    {testimonial.customerName?.charAt(0) || '?'}
                                </div>
                                <div className="testimonial-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <h4 className="testimonial-name">{testimonial.customerName}</h4>
                                        {testimonial.verified && (
                                            <span className="testimonial-verified" title="Verified customer">✓</span>
                                        )}
                                    </div>
                                    <div className="testimonial-rating">
                                        {'★'.repeat(testimonial.rating)}
                                        {'☆'.repeat(5 - testimonial.rating)}
                                    </div>
                                </div>
                            </div>
                            <p className="testimonial-comment">"{testimonial.review}"</p>
                            <div className="testimonial-footer">
                                {testimonial.location && (
                                    <span className="testimonial-location">📍 {testimonial.location}</span>
                                )}
                                <span className="testimonial-date">{testimonial.date}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View us on Google CTA */}
                <div className="testimonials-google-cta">
                    <div className="google-rating-badge">
                        <span className="google-stars">★★★★★</span>
                        <span className="google-rating-text">Rated 4.9 on Google</span>
                    </div>
                    <a
                        href={viewGoogleHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-google"
                    >
                        <GoogleG />
                        View us on Google
                    </a>
                </div>
            </div>
        </section>
    )
}
