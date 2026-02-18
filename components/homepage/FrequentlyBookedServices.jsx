'use client'

import { useState, useEffect } from 'react';
import { Wind, Droplets, Microwave, Refrigerator, Filter, Flame } from 'lucide-react';
import './FrequentlyBookedServices.css';

function FrequentlyBookedServices() {
    const [displaySettings, setDisplaySettings] = useState({
        sectionTitle: 'Frequently Booked Appliance Repairs',
        sectionDescription: 'Quick solutions for common appliance problems. Same day service available across Mumbai.'
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/settings/section-configs?id=frequently-booked-config');
                const data = await res.json();
                if (data.success && data.data?.value) {
                    setDisplaySettings({
                        sectionTitle: data.data.value.sectionTitle || 'Frequently Booked Appliance Repairs',
                        sectionDescription: data.data.value.sectionDescription || 'Quick solutions for common appliance problems. Same day service available across Mumbai.'
                    });
                }
            } catch (error) {
                console.error('Error fetching Frequently Booked display settings:', error);
            }
        };
        fetchConfig();
    }, []);

    const services = [
        {
            id: 1,
            title: 'AC Cleaning & Service',
            icon: Wind,
            image: '/images/services/ac_3d.png',
            keywords: 'Air conditioner cleaning Mumbai',
            url: '/services/ac-cleaning',
            badge: 'Popular'
        },
        {
            id: 2,
            title: 'RO Filter Replacement',
            icon: Filter,
            image: '/images/services/water_purifier_3d.png',
            keywords: 'RO water purifier service',
            url: '/services/ro-filter',
            badge: 'Seasonal'
        },
        {
            id: 3,
            title: 'Washing Machine Repair',
            icon: Droplets,
            image: '/images/services/washing_machine_3d.png',
            keywords: 'WM spin issue repair',
            url: '/services/wm-spin',
            badge: null
        },
        {
            id: 4,
            title: 'Refrigerator Not Cooling',
            icon: Refrigerator,
            image: '/images/services/fridge_3d.png',
            keywords: 'Fridge cooling problem fix',
            url: '/services/fridge-cooling',
            badge: 'Emergency'
        },
        {
            id: 5,
            title: 'Microwave Not Heating',
            icon: Microwave,
            image: '/images/services/oven_3d.png',
            keywords: 'Microwave oven repair',
            url: '/services/microwave-heating',
            badge: null
        },
        {
            id: 6,
            title: 'Gas Stove Burner Repair',
            icon: Flame,
            image: '/images/services/hob_3d.png',
            keywords: 'Gas hob service Mumbai',
            url: '/services/gas-stove',
            badge: null
        }
    ];

    return (
        <section className="frequently-booked">
            <div className="section-container">
                <h2 className="section-title">{displaySettings.sectionTitle}</h2>
                <p className="section-description">
                    {displaySettings.sectionDescription}
                </p>
                <div className="services-grid">
                    {services.map((service) => {
                        const IconComponent = service.icon;
                        return (
                            <a key={service.id} href={service.url} className="service-card">
                                {service.badge && (
                                    <span className={`service-badge ${service.badge.toLowerCase()}`}>
                                        {service.badge}
                                    </span>
                                )}
                                <div className="service-icon-wrapper" style={{ background: service.image ? 'transparent' : 'var(--bg-secondary)' }}>
                                    {service.image ? (
                                        <img
                                            src={service.image}
                                            alt={service.title}
                                            style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <IconComponent
                                        size={32}
                                        style={{ display: service.image ? 'none' : 'block' }}
                                    />
                                </div>
                                <h3 className="service-title">{service.title}</h3>
                            </a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default FrequentlyBookedServices;



