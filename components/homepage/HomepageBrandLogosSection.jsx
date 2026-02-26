'use client';

import { useState, useEffect } from 'react';
import BrandLogos from '../services/BrandLogos';

export default function HomepageBrandLogosSection() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/settings/section-configs?id=homepage-brand-logos')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data?.config) {
                    setConfig(data.data.config);
                }
            })
            .catch(err => console.error('Error fetching homepage brand logos config:', err))
            .finally(() => setLoading(false));
    }, []);

    // If loading or if there's no configuration, let BrandLogos handle its own defaults/loading states
    // However, if the admin explicitly cleared all logos (config.selectedBrandIds === []), 
    // we still pass that down so BrandLogos can return null and hide the section.

    // If we haven't loaded the config yet, we can either hide it or show a loading state. 
    // Showing nothing until config loads prevents layout layout shifts of wrong text.
    if (loading) return null;

    const title = config?.title || "Brands We Serve";
    const subtitle = config?.subtitle !== undefined ? config.subtitle : "Trusted by leading appliance manufacturers";
    const selectedBrandIds = config?.selectedBrandIds !== undefined ? config.selectedBrandIds : null;

    return (
        <BrandLogos
            title={title}
            subtitle={subtitle}
            selectedBrandIds={selectedBrandIds}
        />
    );
}
