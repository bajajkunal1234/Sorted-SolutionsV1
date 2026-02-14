'use client'

import './ServicesGrid.css'

export default function ServicesGrid({ title, services }) {
    return (
        <section className="services-grid-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="services-grid">
                    {services.map(service => (
                        <div key={service.id} className="service-card">
                            <h3 className="service-name">{service.name}</h3>
                            <p className="service-description">{service.description}</p>
                            <div className="service-price">₹{service.price}</div>
                            <button className="book-now-btn">Book Now</button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



