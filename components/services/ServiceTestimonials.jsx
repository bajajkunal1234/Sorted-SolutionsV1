'use client'

import './ServiceTestimonials.css'

export default function ServiceTestimonials({ category, subcategory, location, sublocation }) {
    // TODO: Fetch from Google Reviews API based on page type
    const testimonials = [
        {
            id: 1,
            name: 'Rajesh Kumar',
            rating: 5,
            comment: 'Excellent service! The technician was professional and fixed my AC within an hour. Highly recommended!',
            date: '2 days ago'
        },
        {
            id: 2,
            name: 'Priya Sharma',
            rating: 5,
            comment: 'Very satisfied with the service. Transparent pricing and quality work. Will definitely use again.',
            date: '1 week ago'
        },
        {
            id: 3,
            name: 'Amit Patel',
            rating: 4,
            comment: 'Good service and reasonable rates. The technician was knowledgeable and explained everything clearly.',
            date: '2 weeks ago'
        },
        {
            id: 4,
            name: 'Sneha Desai',
            rating: 5,
            comment: 'Quick response and professional service. My washing machine is working perfectly now. Thank you!',
            date: '3 weeks ago'
        },
    ]

    return (
        <section className="testimonials-section">
            <div className="container">
                <h2 className="section-title">What Our Customers Say</h2>
                <div className="testimonials-scroll">
                    {testimonials.map(testimonial => (
                        <div key={testimonial.id} className="testimonial-card">
                            <div className="testimonial-header">
                                <div className="testimonial-avatar">
                                    {testimonial.name.charAt(0)}
                                </div>
                                <div className="testimonial-info">
                                    <h4 className="testimonial-name">{testimonial.name}</h4>
                                    <div className="testimonial-rating">
                                        {'★'.repeat(testimonial.rating)}
                                        {'☆'.repeat(5 - testimonial.rating)}
                                    </div>
                                </div>
                            </div>
                            <p className="testimonial-comment">{testimonial.comment}</p>
                            <span className="testimonial-date">{testimonial.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



