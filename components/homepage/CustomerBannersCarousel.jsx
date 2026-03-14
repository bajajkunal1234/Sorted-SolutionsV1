'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './CustomerBannersCarousel.css';

export default function CustomerBannersCarousel() {
    const [banners, setBanners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBanners() {
            try {
                const res = await fetch('/api/settings/section-configs?id=customer-app-banners');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data?.extra_config?.banners) {
                        const activeBanners = data.data.extra_config.banners.filter(b => b.active);
                        if (activeBanners.length > 0) {
                            setBanners(activeBanners);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch home banners', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBanners();
    }, []);

    // Auto-advance
    useEffect(() => {
        if (banners.length <= 1) return;
        
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000); // 5 seconds per slide
        
        return () => clearInterval(timer);
    }, [banners.length]);

    if (loading || banners.length === 0) return null;

    return (
        <div className="customer-banners-wrapper">
            <div className="customer-banners-carousel" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {banners.map((banner, index) => (
                    <div key={banner.id} className="banner-slide">
                        {banner.targetUrl && banner.targetUrl.trim() !== '' ? (
                            <Link href={banner.targetUrl}>
                                <img src={banner.imageUrl} alt={banner.title} className="banner-image" loading={index === 0 ? "eager" : "lazy"} />
                            </Link>
                        ) : (
                            <img src={banner.imageUrl} alt={banner.title} className="banner-image" loading={index === 0 ? "eager" : "lazy"} />
                        )}
                    </div>
                ))}
            </div>
            
            {/* Pagination Dots */}
            {banners.length > 1 && (
                <div className="banner-pagination">
                    {banners.map((_, i) => (
                        <button 
                            key={i} 
                            className={`banner-dot ${i === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

