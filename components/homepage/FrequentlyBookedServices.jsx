'use client'

import { Wind, Droplets, Microwave, Refrigerator, Filter, Flame } from 'lucide-react';
import './FrequentlyBookedServices.css';

function FrequentlyBookedServices() {
    const services = [
        {
            id: 1,
            title: 'AC Cleaning & Service',
            icon: Wind,
            keywords: 'Air conditioner cleaning Mumbai',
            url: '/services/ac-cleaning',
            badge: 'Popular'
        },
        {
            id: 2,
            title: 'RO Filter Replacement',
            icon: Filter,
            keywords: 'RO water purifier service',
            url: '/services/ro-filter',
            badge: 'Seasonal'
        },
        {
            id: 3,
            title: 'Washing Machine Repair',
            icon: Droplets,
            keywords: 'WM spin issue repair',
            url: '/services/wm-spin',
            badge: null
        },
        {
            id: 4,
            title: 'Refrigerator Not Cooling',
            icon: Refrigerator,
            keywords: 'Fridge cooling problem fix',
            url: '/services/fridge-cooling',
            badge: 'Emergency'
        },
        {
            id: 5,
            title: 'Microwave Not Heating',
            icon: Microwave,
            keywords: 'Microwave oven repair',
            url: '/services/microwave-heating',
            badge: null
        },
        {
            id: 6,
            title: 'Gas Stove Burner Repair',
            icon: Flame,
            keywords: 'Gas hob service Mumbai',
            url: '/services/gas-stove',
            badge: null
        }
    ];

    return (
        <section className="frequently-booked">
            <div className="section-container">
                <h2 className="section-title">Most Frequently Booked Appliance Repairs</h2>
                <p className="section-description">
                    Quick solutions for common appliance problems. Same day service available across Mumbai.
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
                                <div className="service-icon-wrapper">
                                    <IconComponent size={32} />
                                </div>
                                <h3 className="service-title">{service.title}</h3>
                                <p className="service-keywords">{service.keywords}</p>
                            </a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default FrequentlyBookedServices;



