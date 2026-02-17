'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { frequentlyBookedServices } from '@/data/servicePageContent'
import './FrequentlyBooked.css'

export default function FrequentlyBooked({
    title = "Frequently Booked Services",
    subtitle = "Popular services in your area",
    dynamicServices = null // New prop
}) {
    const [services, setServices] = useState(frequentlyBookedServices)
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    useEffect(() => {
        // If dynamic services are passed from the parent (e.g. from page_services table)
        if (dynamicServices && dynamicServices.length > 0) {
            setServices(dynamicServices.map((s, i) => ({
                id: i,
                title: s.name,
                description: `Professional ${s.name} at your doorstep`,
                price: s.price
            })));
            setLoading(false);
            return;
        }

        fetch('/api/settings/frequently-booked')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    setServices(data.data)
                }
            })
            .catch(error => console.error('Error fetching services:', error))
            .finally(() => setLoading(false))
    }, [dynamicServices])

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    useEffect(() => {
        if (!loading) {
            checkScroll()
            window.addEventListener('resize', checkScroll)
            return () => window.removeEventListener('resize', checkScroll)
        }
    }, [loading])

    if (loading) {
        return (
            <section className="frequently-booked">
                <div className="booked-header">
                    <h2 className="booked-title">{title}</h2>
                    {subtitle && <p className="booked-subtitle">{subtitle}</p>}
                </div>
                <div className="carousel-wrapper">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 350
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setTimeout(checkScroll, 300)
        }
    }

    return (
        <section className="frequently-booked">
            <div className="booked-header">
                <h2 className="booked-title">{title}</h2>
                {subtitle && <p className="booked-subtitle">{subtitle}</p>}
            </div>

            <div className="carousel-wrapper">
                {canScrollLeft && (
                    <button
                        className="carousel-button carousel-left"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    className="carousel-container"
                    onScroll={checkScroll}
                >
                    {services.map((service, index) => (
                        <div
                            key={service.id}
                            className="service-card"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="service-badge">Popular</div>

                            <h3 className="service-title">{service.title}</h3>
                            <p className="service-description">{service.description}</p>

                            <div className="service-price">
                                <span className="price-label">Starting at</span>
                                <span className="price-amount">₹{service.price}</span>
                            </div>

                            <button className="book-now-btn">
                                Book Now
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}

                    {/* Promotional card */}
                    <div className="promo-card">
                        <div className="promo-icon">🎯</div>
                        <h3 className="promo-title">Need Something Else?</h3>
                        <p className="promo-text">
                            Explore our full range of services
                        </p>
                        <button className="promo-button">View All Services</button>
                    </div>
                </div>

                {canScrollRight && (
                    <button
                        className="carousel-button carousel-right"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </section>
    )
}
