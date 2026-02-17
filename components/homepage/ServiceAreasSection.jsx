'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Clock, Loader2 } from 'lucide-react';
import './ServiceAreasSection.css';

function ServiceAreasSection() {
    const [serviceAreas, setServiceAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchServiceAreas = async () => {
            try {
                const response = await fetch('/api/settings/locations?service_areas=true');
                const result = await response.json();
                if (result.success) {
                    setServiceAreas(result.data);
                } else {
                    setError('Failed to load service areas');
                }
            } catch (err) {
                console.error('Error fetching service areas:', err);
                setError('An error occurred while loading service areas');
            } finally {
                setLoading(false);
            }
        };

        fetchServiceAreas();
    }, []);

    if (loading) {
        return (
            <section className="service-areas-section py-20 bg-background-alt">
                <div className="section-container text-center">
                    <Loader2 className="animate-spin mx-auto text-primary mb-4" size={40} />
                    <p className="text-secondary">Loading service areas...</p>
                </div>
            </section>
        );
    }

    if (error || serviceAreas.length === 0) {
        return null; // Or show a default message or fallback
    }

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
                            key={area.id || area.name}
                            href={`/location/${area.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="area-card"
                        >
                            <div className="area-icon">
                                <MapPin size={24} />
                            </div>
                            <h3>{area.name}</h3>
                            <p className="area-pincode">{area.pincode ? `Pincode: ${area.pincode}` : 'Serving your area'}</p>
                            <button
                                className="area-call"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (area.phone) window.location.href = `tel:${area.phone}`;
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



