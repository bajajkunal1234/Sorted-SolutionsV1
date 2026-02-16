'use client'

import Link from 'next/link';
import { Wind, Droplets, Refrigerator, Microwave, Flame, Filter } from 'lucide-react';
import './ServiceProductsGrid.css';

function ServiceProductsGrid() {
    const services = [
        {
            id: 'ac',
            name: 'AC',
            fullName: 'Air Conditioner',
            icon: Wind,
            color: '#3b82f6',
            url: '/services/ac-repair'
        },
        {
            id: 'fridge',
            name: 'Fridge',
            fullName: 'Refrigerator',
            icon: Refrigerator,
            color: '#10b981',
            url: '/services/refrigerator-repair'
        },
        {
            id: 'washing-machine',
            name: 'Washing Machine',
            fullName: 'Washing Machine',
            icon: Droplets,
            color: '#6366f1',
            url: '/services/washing-machine-repair'
        },
        {
            id: 'oven',
            name: 'Ovens',
            fullName: 'Microwave Oven',
            icon: Microwave,
            color: '#f59e0b',
            url: '/services/oven-repair'
        },
        {
            id: 'hob',
            name: 'Hob Tops',
            fullName: 'Gas Stove',
            icon: Flame,
            color: '#ef4444',
            url: '/services/hob-repair'
        },
        {
            id: 'water-purifier',
            name: 'Water Purifiers',
            fullName: 'RO Water Purifier',
            icon: Filter,
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
                    >
                        <div
                            className="service-product-icon"
                            style={{ background: `${service.color}20` }}
                        >
                            <IconComponent
                                size={32}
                                style={{ color: service.color }}
                            />
                        </div>
                        <h3 className="service-product-name">{service.name}</h3>
                        <p className="service-product-subtitle">{service.fullName}</p>
                    </Link>
                );
            })}
        </div>
    );
}

export default ServiceProductsGrid;
