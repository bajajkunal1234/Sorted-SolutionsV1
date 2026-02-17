import { useState, useEffect } from 'react';
import './TestimonialsSection.css';

function TestimonialsSection() {
    const [testimonials, setTestimonials] = useState([
        { id: 1, name: 'Rajesh Kumar', rating: 5, text: 'Excellent service! Technician was on time and very professional.' },
        { id: 2, name: 'Priya Sharma', rating: 5, text: 'Fixed my AC in no time. Highly recommend!' },
        { id: 3, name: 'Amit Patel', rating: 4, text: 'Good service, fair pricing. Will use again.' },
        { id: 4, name: 'Sneha Desai', rating: 5, text: 'Very satisfied with the washing machine repair.' }
    ]);

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const res = await fetch('/api/settings/testimonials');
                const data = await res.json();
                if (data.success && data.data?.length > 0) {
                    setTestimonials(data.data.filter(t => t.is_active).map(t => ({
                        id: t.id,
                        name: t.customer_name,
                        rating: t.rating,
                        text: t.review_text
                    })));
                }
            } catch (error) {
                console.error('Error fetching testimonials:', error);
            }
        };
        fetchTestimonials();
    }, []);

    return (
        <section className="testimonials">
            <div className="section-container">
                <h2 className="section-title">What Our Customers Say</h2>
                <div className="testimonials-scroll">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className="testimonial-card">
                            <div className="rating">
                                {Array(testimonial.rating).fill('⭐').join('')}
                            </div>
                            <p className="testimonial-text">"{testimonial.text}"</p>
                            <p className="testimonial-author">- {testimonial.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default TestimonialsSection;



