'use client'

import Link from 'next/link';
import { MapPin, Phone, Clock } from 'lucide-react';
import './ServiceAreasSection.css';

function ServiceAreasSection() {
    const serviceAreas = [
        { name: 'Andheri', pincode: '400053', phone: '+91-8928895590' },
        { name: 'Dadar', pincode: '400014', phone: '+91-8928895590' },
        { name: 'Ghatkopar', pincode: '400077', phone: '+91-8928895590' },
        { name: 'Goregaon', pincode: '400063', phone: '+91-8928895590' },
        { name: 'Mumbai Central', pincode: '400008', phone: '+91-8928895590' },
        { name: 'Kurla', pincode: '400070', phone: '+91-8928895590' },
        { name: 'Parel', pincode: '400012', phone: '+91-8928895590' },
        { name: 'Bandra', pincode: '400050', phone: '+91-8928895590' }
    ];

    return (
        <section className="service-areas-section">
            <div className="section-container">
                <h2 className="section-title">Appliance Repair Service Areas in Mumbai</h2>
                <p className="section-description">
                    We provide same-day appliance repair services across all major areas in Mumbai.
                    AC repair, washing machine service, refrigerator repair, and more.
                </p>

                <div className="areas-grid">
                    {serviceAreas.map((area) => (
                        <Link
                            key={area.name}
                            href={`/location/${area.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="area-card"
                        >
                            <div className="area-icon">
                                <MapPin size={24} />
                            </div>
                            <h3>{area.name}</h3>
                            <p className="area-pincode">Pincode: {area.pincode}</p>
                            <button
                                className="area-call"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = `tel:${area.phone}`;
                                }}
                            >
                                <Phone size={16} />
                                Book Service
                            </button>
                        </Link>
                    ))}
                </div>

                {/* Service Hours */}
                <div className="service-hours">
                    <Clock size={20} />
                    <div>
                        <strong>Service Hours</strong>
                        <span>Monday - Sunday: 8:00 AM - 8:00 PM</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ServiceAreasSection;



