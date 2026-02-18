'use client'

import { useState, useEffect } from 'react';
import { Phone, User, MapPin, Calculator, Star, Clock, Shield, TrendingUp, Award, CheckCircle } from 'lucide-react';
import QuickBookingForm from './QuickBookingForm';
import FrequentlyBookedServices from './FrequentlyBookedServices';
import ServiceProductsGrid from './ServiceProductsGrid';
import HowItWorksSection from './HowItWorksSection';
import WhyChooseUsSection from './WhyChooseUsSection';
import ServiceAreasSection from './ServiceAreasSection';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQSection';
import FooterSection from './FooterSection';
import Header from '../common/Header';
import './MobileHomepage.css';

function MobileHomepage() {
    const [currentLocation, setCurrentLocation] = useState(0);
    const locations = ['Mumbai', 'Andheri', 'Dadar', 'Ghatkopar', 'Goregaon', 'Kurla'];

    // SEO: Add meta tags
    useEffect(() => {
        // Title
        document.title = 'Appliance Repair Mumbai | AC, Washing Machine, Fridge Service | SORTED';

        // Meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Expert appliance repair in Mumbai. AC, washing machine, refrigerator service with transparent pricing. Same day service available. Licensed technicians. Book now! ☎ +91-8928895590');
        } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = 'Expert appliance repair in Mumbai. AC, washing machine, refrigerator service with transparent pricing. Same day service available. Licensed technicians. Book now! ☎ +91-8928895590';
            document.head.appendChild(meta);
        }

        // Keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        const keywords = 'AC repair Mumbai, washing machine repair, refrigerator service, appliance repair near me, same day repair, transparent pricing, genuine spare parts, licensed technicians, Andheri, Dadar, Ghatkopar';
        if (metaKeywords) {
            metaKeywords.setAttribute('content', keywords);
        } else {
            const meta = document.createElement('meta');
            meta.name = 'keywords';
            meta.content = keywords;
            document.head.appendChild(meta);
        }

        // Schema.org LocalBusiness markup
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "SORTED SOLUTIONS",
            "image": "https://sortedsolutions.in/logo.png",
            "description": "Professional appliance repair service in Mumbai with transparent pricing",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "A138 Orchard Mall, Royal Palms",
                "addressLocality": "Goregaon East",
                "addressRegion": "Mumbai",
                "postalCode": "400063",
                "addressCountry": "IN"
            },
            "telephone": "+91-8928895590",
            "priceRange": "₹₹",
            "openingHours": "Mo-Su 08:00-20:00",
            "areaServed": ["Mumbai", "Andheri", "Dadar", "Ghatkopar", "Goregaon", "Kurla", "Parel"],
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "500"
            }
        });
        document.head.appendChild(script);
    }, []);

    // Rotate locations every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentLocation((prev) => (prev + 1) % locations.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mobile-homepage">
            {/* Header */}
            <Header />

            {/* Hero Section - SEO Optimized */}
            <section className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    {/* H1 - Primary SEO Keyword */}
                    <h1 className="hero-title">
                        Same Day Appliances Repair Now In{' '}
                        <span className="location-animated">
                            {locations[currentLocation]}
                        </span>
                    </h1>

                    {/* H2 - Secondary Keywords */}
                    <h2 className="hero-subtitle">
                        Same Day Service | Transparent Pricing | 500+ Happy Customers
                    </h2>

                    {/* Trust Badges */}
                    <div className="trust-badges">
                        <div className="trust-badge">
                            <CheckCircle size={20} />
                            <span>Licensed Technicians</span>
                        </div>
                        <div className="trust-badge">
                            <Shield size={20} />
                            <span>Genuine Spare Parts</span>
                        </div>
                        <div className="trust-badge">
                            <Clock size={20} />
                            <span>Same Day Service</span>
                        </div>
                    </div>

                    {/* Quick Booking Form */}
                    <QuickBookingForm />
                </div>
            </section>

            {/* Trust Bar - Social Proof */}
            <section className="trust-bar">
                <div className="trust-stat">
                    <TrendingUp size={24} />
                    <div>
                        <strong>500+</strong>
                        <span>Repairs Completed</span>
                    </div>
                </div>
                <div className="trust-stat">
                    <Star size={24} />
                    <div>
                        <strong>4.8★</strong>
                        <span>Customer Rating</span>
                    </div>
                </div>
                <div className="trust-stat">
                    <Award size={24} />
                    <div>
                        <strong>100%</strong>
                        <span>Satisfaction</span>
                    </div>
                </div>
            </section>

            {/* Services Section - SEO Keywords */}
            <section className="services-section">
                <div className="section-container">
                    <h2 className="section-title">Our Appliance Repair Services in Mumbai</h2>
                    <p className="section-description">
                        Expert repair and service for all major home appliances. Same day service available across Mumbai.
                    </p>
                    <ServiceProductsGrid />
                </div>
            </section>

            {/* Frequently Booked Services */}
            <FrequentlyBookedServices />

            {/* How It Works */}
            <HowItWorksSection />

            {/* Why Choose Us */}
            <WhyChooseUsSection />

            {/* Service Areas - Local SEO */}
            <ServiceAreasSection />

            {/* Customer Testimonials */}
            <TestimonialsSection />

            {/* FAQs - Keyword Rich */}
            <FAQSection />

            {/* Footer */}
            <FooterSection />
        </div>
    );
}

export default MobileHomepage;



