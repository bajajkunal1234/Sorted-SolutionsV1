'use client'

import Link from 'next/link';
import { Wind, Droplets, Refrigerator, Microwave, Flame, Filter } from 'lucide-react';
import { logInteraction } from '@/lib/interactions';
import './ServiceProductsGrid.css';

function ServiceProductsGrid() {
    const services = [
        {
            id: 'ac',
            name: 'Air Conditioner',
            fullName: 'Air Conditioner',
            icon: Wind,
            image: '/images/services/ac_3d.png',
            color: '#3b82f6',
            url: '/services/ac-repair'
        },
        {
            id: 'fridge',
            name: 'Refrigerator',
            fullName: 'Refrigerator',
            icon: Refrigerator,
            image: '/images/services/fridge_3d.png',
            color: '#10b981',
            url: '/services/refrigerator-repair'
        },
        {
            id: 'washing-machine',
            name: 'Washing Machine',
            fullName: 'Washing Machine',
            icon: Droplets,
            image: '/images/services/washing_machine_3d.png',
            color: '#6366f1',
            url: '/services/washing-machine-repair'
        },
        {
            id: 'oven',
            name: 'Oven',
            fullName: 'Oven',
            icon: Microwave,
            image: '/images/services/oven_3d.png',
            color: '#f59e0b',
            url: '/services/oven-repair'
        },
        {
            id: 'hob',
            name: 'Gas Stove / Hob',
            fullName: 'Gas Stove',
            icon: Flame,
            image: '/images/services/hob_3d.png',
            color: '#ef4444',
            url: '/services/hob-repair'
        },
        {
            id: 'water-purifier',
            name: 'Water Purifier',
            fullName: 'RO Water Purifier',
            icon: Filter,
            image: '/images/services/water_purifier_3d.png',
            color: '#06b6d4',
            url: '/services/water-purifier-repair'
        }
    ];

    return (
        <div className="service-products-grid">
            {services.map((service) => {
                const IconComponent = service.icon;
                return (
                    <Link
                        key={service.id}
                        href={service.url}
                        className="service-product-card"
                        onClick={() => logInteraction({
                            type: 'homepage-service-click',
                            category: 'navigation',
                            description: `User clicked on ${service.name} from homepage`,
                            metadata: { serviceId: service.id, serviceName: service.name },
                            source: 'Website'
                        })}
                    >
                        <div
                            className="service-product-icon"
                            style={{ background: service.image ? 'transparent' : `${service.color}20` }}
                        >
                            {service.image ? (
                                <img
                                    src={service.image}
                                    alt={service.name}
                                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            ) : null}
                            <IconComponent
                                size={32}
                                style={{
                                    color: service.color,
                                    display: service.image ? 'none' : 'block'
                                }}
                            />
                        </div>
                        <h3 className="service-product-name">{service.name}</h3>
                    </Link>
                );
            })}
        </div>
    );
}

export default ServiceProductsGrid;
