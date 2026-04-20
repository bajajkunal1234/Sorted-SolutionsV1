'use client';

export default function ServiceSchema({ serviceType, locationName = "Mumbai", services = [] }) {
    // Only generate schema if we have valid services with prices
    const validServices = services.filter(s => s && s.name);
    
    if (validServices.length === 0) return null;

    const schemaOffers = validServices.map(s => {
        // Extract strictly numerical value for Google Schema validation.
        // e.g., "Starting from ₹499" -> "499"
        // If no numerical price exists, fallback to a logical default to prevent validation errors 
        let priceNum = "499"; 
        if (s.price) {
            const raw = s.price.toString().replace(/[^0-9.]/g, '');
            if (raw && !isNaN(parseFloat(raw))) {
                priceNum = raw;
            }
        }

        return {
            "@type": "Offer",
            "itemOffered": {
                "@type": "Service",
                "name": s.name
            },
            "priceCurrency": "INR",
            "price": priceNum
        };
    });

    const schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": serviceType,
        "provider": {
            "@type": "LocalBusiness",
            "name": "Sorted Solutions"
        },
        "areaServed": [
            {
                "@type": "City",
                "name": locationName
            }
        ],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": `${serviceType} Services`,
            "itemListElement": schemaOffers
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
