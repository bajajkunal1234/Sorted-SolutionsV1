/**
 * Default templates and configurations for Urban Company-style Subcategory Pages (/v2/services/[category]/[subcategory]).
 * Provides realistic, high-converting copy and assets if the admin has not yet customized the page.
 */

export const DEFAULT_SECTION_ORDER = [
    'hero',
    'services',
    'process',
    'technicians',
    'brands',
    'coverPromise',
    'notIncluded',
    'faqs',
    'reviews'
];

export const COMMON_BRANDS = [
    'LG', 'Samsung', 'Whirlpool', 'IFB', 'Godrej',
    'Panasonic', 'Bajaj', 'Morphy Richards', 'Haier',
    'Voltas', 'Philips', 'Bosch', 'Daikin', 'Carrier'
];

export const DEFAULT_COVER_PROMISE = {
    title: 'Sorted Cover Promise',
    badge: 'sorted cover',
    enabled: true,
    points: [
        { icon: 'shield', text: 'Up to 180 days warranty' },
        { icon: 'umbrella', text: 'Up to ₹10,000 damage cover' },
        { icon: 'file-text', text: 'Fixed rate card' },
        { icon: 'headphones', text: 'On call repair quote verification' }
    ]
};

export const DEFAULT_DESKTOP_PROMISE = {
    title: 'Sorted Promise',
    badgeText: 'QUALITY ASSURED',
    points: [
        'Verified Professionals',
        'Hassle Free Booking',
        'Transparent Pricing'
    ]
};

export function getDefaultHeroSlides(categorySlug = '', subcategorySlug = '') {
    const cat = (categorySlug || '').toLowerCase();
    const sub = (subcategorySlug || '').toLowerCase();

    if (cat.includes('ac') || sub.includes('ac') || sub.includes('split') || sub.includes('window')) {
        return [
            {
                id: 'slide-1',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_speed_90_mins.png',
                title: '90-Min Doorstep Arrival',
                active: true
            },
            {
                id: 'slide-2',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_expertise_v3.png',
                title: 'Certified Cooling Technicians',
                active: true
            },
            {
                id: 'slide-3',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_30_day_warranty.png',
                title: '30-Day Post-Repair Warranty',
                active: true
            }
        ];
    }

    if (cat.includes('washing') || sub.includes('washing') || sub.includes('load') || sub.includes('semi')) {
        return [
            {
                id: 'slide-1',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_expertise_v3.png',
                title: 'Certified Washing Machine Experts',
                active: true
            },
            {
                id: 'slide-2',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_speed_90_mins.png',
                title: '90-Min Doorstep Arrival',
                active: true
            },
            {
                id: 'slide-3',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_30_day_warranty.png',
                title: 'Genuine Spare Parts with Warranty',
                active: true
            }
        ];
    }

    if (cat.includes('refrigerator') || sub.includes('door') || sub.includes('fridge')) {
        return [
            {
                id: 'slide-1',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_problem_solved_expert.png',
                title: 'Inverter Compressor & Cooling Experts',
                active: true
            },
            {
                id: 'slide-2',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_speed_90_mins.png',
                title: '90-Min Doorstep Arrival',
                active: true
            },
            {
                id: 'slide-3',
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_30_day_warranty.png',
                title: '30-Day Post-Service Warranty',
                active: true
            }
        ];
    }

    return [
        {
            id: 'slide-1',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_speed_90_mins.png',
            title: '90-Min Arrival in Mumbai',
            active: true
        },
        {
            id: 'slide-2',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_expertise_v3.png',
            title: 'Certified Background-Verified Pros',
            active: true
        },
        {
            id: 'slide-3',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_30_day_warranty.png',
            title: '30-Day Service Warranty',
            active: true
        }
    ];
}

export function getSubcategoryDefaultConfig(categorySlug, subcategorySlug, categoryName = '', subcategoryName = '') {
    const cat = (categorySlug || '').toLowerCase();
    const sub = (subcategorySlug || '').toLowerCase();
    const defaultSlides = getDefaultHeroSlides(categorySlug, subcategorySlug);

    // ── 1. Microwave & Oven Specific Defaults ──
    if (cat.includes('oven') || sub.includes('microwave') || sub.includes('otg')) {
        return {
            hero: {
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_problem_solved_expert.png',
                slides: defaultSlides,
                autoSlideSeconds: 5,
                enableVideoAdvance: true,
                title: subcategoryName ? `${subcategoryName} check-up` : 'Microwave check-up',
                subtitle: 'Accurate diagnostic & doorstep repair within 90 minutes',
                rating: '4.84',
                reviewsCount: '60K',
                rateCardText: 'Standard rate card',
                rateCardBadge: 'sorted cover',
                enabled: true
            },
            servicesSection: {
                title: 'Select a Service',
                subtitle: 'Transparent diagnostic pricing • Genuine spare parts',
                enabled: true
            },
            process: {
                title: 'Our process',
                enabled: true,
                steps: [
                    {
                        number: 1,
                        title: 'Inspection & quote',
                        description: 'We inspect the appliance & share a repair quote for approval',
                        imageUrl: ''
                    },
                    {
                        number: 2,
                        title: 'Approval or expert review',
                        description: 'Repair begins after your approval, if you are unsure you can call expert',
                        imageUrl: ''
                    },
                    {
                        number: 3,
                        title: 'Repair & spare parts',
                        description: 'If needed, we will source spare parts at fixed rates for the repair',
                        imageUrl: ''
                    },
                    {
                        number: 4,
                        title: 'Warranty activation',
                        description: 'Your appliance will automatically come under 180 days warranty after the repair',
                        imageUrl: ''
                    }
                ]
            },
            technicians: {
                title: 'Top technicians',
                photoUrl: '/images/banners/banner_expertise_v3.png',
                enabled: true,
                points: [
                    'Background verified',
                    'Trained across all major brands',
                    'Certified under Skill India Programme'
                ]
            },
            brands: {
                title: 'We service all brands',
                disclaimer: 'Logos & trademarks are used for illustrative purposes. We do not claim any affiliation with the respective brand.',
                enabled: true,
                items: ['LG', 'Panasonic', 'Bajaj', 'Morphy Richards', 'Godrej', 'IFB', 'Whirlpool', 'Samsung', 'Haier', 'Voltas', 'Philips', 'Bosch']
            },
            coverPromise: DEFAULT_COVER_PROMISE,
            notIncluded: {
                title: 'What is not included',
                enabled: true,
                items: [
                    'Repair of commercial microwave ovens',
                    'Cabinet outer chassis denting or color repainting'
                ]
            },
            faqs: {
                title: 'Frequently asked questions',
                enabled: true,
                items: [
                    {
                        question: 'Does the cost include spare parts?',
                        answer: 'Inspection charges cover the diagnostic visit. If parts like the magnetron, high voltage diode, capacitor or touch keypad need replacement, upfront rates are quoted before proceeding.'
                    },
                    {
                        question: 'What if the same issue occurs again?',
                        answer: 'All microwave repairs are covered by our Sorted Care service warranty. If the same fault recurs during the warranty period, we provide free doorstep re-inspection.'
                    },
                    {
                        question: 'How can I verify the quote shared?',
                        answer: 'Technicians show the official fixed rate card on their app with transparent itemized spare parts pricing.'
                    }
                ]
            },
            reviews: {
                title: 'Customer Reviews',
                enabled: true,
                rating: '4.84',
                totalCount: '60K reviews',
                distribution: { star5: '88%', star4: '8%', star3: '2%', star2: '1%', star1: '1%' },
                items: [
                    {
                        id: 'rev-1',
                        name: 'Vinay K.',
                        rating: 5,
                        date: 'Nov 6, 2026',
                        tag: 'For Not heating, Microwave Check-up',
                        comment: 'Very good service and issue was explained clearly. Resolved promptly within 45 mins.'
                    },
                    {
                        id: 'rev-2',
                        name: 'Binal A.',
                        rating: 5,
                        date: 'Nov 6, 2026',
                        tag: 'For Not heating, HV Capacitor, HV Fuse',
                        comment: 'Microwave is fixed. Very skillful person. Saved 2-3 days by fixing at site.'
                    },
                    {
                        id: 'rev-3',
                        name: 'Nelofur Yasin',
                        rating: 5,
                        date: 'Nov 4, 2026',
                        tag: 'For Not working, Magnetron, Mica Sheet',
                        comment: 'He has been absolutely brilliant and very patient with the investigation. 5 stars.'
                    }
                ]
            },
            desktopStickyPromise: DEFAULT_DESKTOP_PROMISE,
            sectionOrder: DEFAULT_SECTION_ORDER
        };
    }

    // ── 2. Air Conditioner Specific Defaults ──
    if (cat.includes('ac') || sub.includes('split') || sub.includes('window') || sub.includes('cassette')) {
        return {
            hero: {
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_speed_90_mins.png',
                slides: defaultSlides,
                autoSlideSeconds: 5,
                enableVideoAdvance: true,
                title: subcategoryName ? `${subcategoryName} Service & Repair` : 'AC Service & Repair',
                subtitle: 'Foam-jet deep wash, gas leak fix & PCB repair with 90-min arrival',
                rating: '4.86',
                reviewsCount: '85K',
                rateCardText: 'Standard rate card',
                rateCardBadge: 'sorted cover',
                enabled: true
            },
            servicesSection: {
                title: 'Select a Service',
                subtitle: 'Foam-jet cleaning, cooling fix & genuine spare parts',
                enabled: true
            },
            process: {
                title: 'Our process',
                enabled: true,
                steps: [
                    {
                        number: 1,
                        title: 'Pre-service checks',
                        description: 'Pre-service inspection includes a free gas level check via digital pressure gauge.',
                        imageUrl: ''
                    },
                    {
                        number: 2,
                        title: 'Foam-jet deep wash',
                        description: 'High-pressure foam-jet washing of cooling coils, blower fan and indoor unit.',
                        imageUrl: ''
                    },
                    {
                        number: 3,
                        title: 'Outdoor unit & leak checks',
                        description: 'Jet-spray wash of condenser unit, drain pipe de-clogging and amperage check.',
                        imageUrl: ''
                    },
                    {
                        number: 4,
                        title: 'Post-service temperature test',
                        description: 'Accurate grill temperature measurement to verify optimal cooling performance.',
                        imageUrl: ''
                    }
                ]
            },
            technicians: {
                title: 'Top technicians',
                photoUrl: '/images/banners/banner_expertise_v3.png',
                enabled: true,
                points: [
                    'Background verified & police cleared',
                    'Trained on Inverter, Dual-Inverter & Rotary Compressors',
                    'Certified HVAC professionals'
                ]
            },
            brands: {
                title: 'We service all brands',
                disclaimer: 'Logos & trademarks are used for illustrative purposes. We do not claim any affiliation with the respective brand.',
                enabled: true,
                items: ['Daikin', 'Voltas', 'LG', 'Samsung', 'Hitachi', 'Carrier', 'Blue Star', 'Panasonic', 'Godrej', 'Mitsubishi', 'Lloyd', 'O General']
            },
            coverPromise: DEFAULT_COVER_PROMISE,
            notIncluded: {
                title: 'What is not included',
                enabled: true,
                items: [
                    'Repair or scaffolding beyond 2nd floor exterior walls without safety harness access',
                    'Structural wall cutting or specialized civil carpentry work'
                ]
            },
            faqs: {
                title: 'Frequently asked questions',
                enabled: true,
                items: [
                    {
                        question: 'What is foam-jet AC servicing?',
                        answer: 'Foam-jet uses a specialized biodegradable foaming agent and a high-pressure jet gun to remove embedded dirt and fungus deep inside the cooling fins, providing 2x better airflow than basic water wash.'
                    },
                    {
                        question: 'Does the service include gas charging?',
                        answer: 'Inspection includes digital gas level measurement. If a leak is detected and gas refill is required, leak detection, brazing, and gas top-up are quoted upfront with fixed rates.'
                    },
                    {
                        question: 'What warranty is offered on AC repairs?',
                        answer: 'All repairs and spare part replacements include up to 180 days service warranty for complete peace of mind.'
                    }
                ]
            },
            reviews: {
                title: 'Customer Reviews',
                enabled: true,
                rating: '4.86',
                totalCount: '85K reviews',
                distribution: { star5: '90%', star4: '7%', star3: '2%', star2: '1%', star1: '0%' },
                items: [
                    {
                        id: 'rev-1',
                        name: 'Rohan Mehta',
                        rating: 5,
                        date: 'Nov 8, 2026',
                        tag: 'For Foam-Jet Deep Clean, Split AC',
                        comment: 'Excellent foam-jet wash. AC feels brand new and cooling is back to 16 degrees instantly.'
                    },
                    {
                        id: 'rev-2',
                        name: 'Pooja Sharma',
                        rating: 5,
                        date: 'Nov 5, 2026',
                        tag: 'For Gas Charging & PCB Fix',
                        comment: 'Technician reached within 75 mins in Powai. Very professional and fixed the gas leak on site.'
                    }
                ]
            },
            desktopStickyPromise: DEFAULT_DESKTOP_PROMISE,
            sectionOrder: DEFAULT_SECTION_ORDER
        };
    }

    // ── 3. Washing Machine Specific Defaults ──
    if (cat.includes('washing') || sub.includes('load') || sub.includes('semi')) {
        return {
            hero: {
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_expertise_v3.png',
                slides: defaultSlides,
                autoSlideSeconds: 5,
                enableVideoAdvance: true,
                title: subcategoryName ? `${subcategoryName} Washing Machine Repair` : 'Washing Machine Repair',
                subtitle: 'Drum balance, PCB repair, inlet valve & drainage fixes with genuine parts',
                rating: '4.82',
                reviewsCount: '48K',
                rateCardText: 'Standard rate card',
                rateCardBadge: 'sorted cover',
                enabled: true
            },
            servicesSection: {
                title: 'Select a Service',
                subtitle: 'Front load, top load & semi-automatic doorstep repairs',
                enabled: true
            },
            process: {
                title: 'Our process',
                enabled: true,
                steps: [
                    {
                        number: 1,
                        title: 'Inspection & error code diagnostics',
                        description: 'We test motor, drum bearing, drainage pump, and electronic PCB error codes.',
                        imageUrl: ''
                    },
                    {
                        number: 2,
                        title: 'Upfront estimate',
                        description: 'Technician shares a clear itemized quote before replacing any spare parts.',
                        imageUrl: ''
                    },
                    {
                        number: 3,
                        title: 'Repair with genuine spares',
                        description: 'High-grade replacement belts, shock absorbers, valves, or motor capacitors installed at home.',
                        imageUrl: ''
                    },
                    {
                        number: 4,
                        title: 'Spin & drain calibration',
                        description: 'Live test spin cycle at full RPM to ensure zero vibrations and smooth draining.',
                        imageUrl: ''
                    }
                ]
            },
            technicians: {
                title: 'Top technicians',
                photoUrl: '/images/banners/banner_expertise_v3.png',
                enabled: true,
                points: [
                    'Background verified professionals',
                    'Trained across Direct Drive and Belt Drive systems',
                    '100% genuine OEM-grade replacement parts'
                ]
            },
            brands: {
                title: 'We service all brands',
                disclaimer: 'Logos & trademarks are used for illustrative purposes. We do not claim any affiliation with the respective brand.',
                enabled: true,
                items: ['IFB', 'Bosch', 'Samsung', 'LG', 'Whirlpool', 'Panasonic', 'Godrej', 'Haier', 'Siemens', 'Voltas Beko']
            },
            coverPromise: DEFAULT_COVER_PROMISE,
            notIncluded: {
                title: 'What is not included',
                enabled: true,
                items: [
                    'Repair of commercial laundry units (>15kg)',
                    'Outer metal body rust patch fabrication'
                ]
            },
            faqs: {
                title: 'Frequently asked questions',
                enabled: true,
                items: [
                    {
                        question: 'My washing machine vibrates heavily during spin. Can it be repaired?',
                        answer: 'Yes! Excessive vibration is typically caused by worn shock absorbers, unbalanced suspension springs, or faulty drum bearings, which our technicians fix on site.'
                    },
                    {
                        question: 'Do you provide genuine spare parts?',
                        answer: 'Yes, all replacement components are 100% genuine and covered by warranty.'
                    }
                ]
            },
            reviews: {
                title: 'Customer Reviews',
                enabled: true,
                rating: '4.82',
                totalCount: '48K reviews',
                distribution: { star5: '86%', star4: '10%', star3: '2%', star2: '1%', star1: '1%' },
                items: [
                    {
                        id: 'rev-1',
                        name: 'Amitabh Joshi',
                        rating: 5,
                        date: 'Nov 7, 2026',
                        tag: 'For Front Load Drum Noise Fix',
                        comment: 'Replaced the drum bearing in under an hour. Machine runs whisper quiet now.'
                    }
                ]
            },
            desktopStickyPromise: DEFAULT_DESKTOP_PROMISE,
            sectionOrder: DEFAULT_SECTION_ORDER
        };
    }

    // ── 4. Refrigerator Specific Defaults ──
    if (cat.includes('refrigerator') || sub.includes('door') || sub.includes('fridge')) {
        return {
            hero: {
                mediaType: 'image',
                mediaUrl: '/images/banners/banner_problem_solved_expert.png',
                slides: defaultSlides,
                autoSlideSeconds: 5,
                enableVideoAdvance: true,
                title: subcategoryName ? `${subcategoryName} Refrigerator Repair` : 'Refrigerator Repair',
                subtitle: 'Cooling coil, thermostat, inverter compressor & defrost diagnostics',
                rating: '4.85',
                reviewsCount: '52K',
                rateCardText: 'Standard rate card',
                rateCardBadge: 'sorted cover',
                enabled: true
            },
            servicesSection: {
                title: 'Select a Service',
                subtitle: 'Single door, double door & frost-free cooling solutions',
                enabled: true
            },
            process: {
                title: 'Our process',
                enabled: true,
                steps: [
                    { number: 1, title: 'Cooling & gas inspection', description: 'Technician checks compressor relay, thermostat and refrigerant gas level.', imageUrl: '' },
                    { number: 2, title: 'Diagnosis & upfront quote', description: 'Clear quote with transparent part costs before any work begins.', imageUrl: '' },
                    { number: 3, title: 'On-site repair', description: 'Relay replacement, thermostat calibration, or condenser coil cleaning.', imageUrl: '' },
                    { number: 4, title: 'Post-repair freeze test', description: 'Temperature drop verification in freezer and fresh-food compartments.', imageUrl: '' }
                ]
            },
            technicians: {
                title: 'Top technicians',
                photoUrl: '/images/banners/banner_expertise_v3.png',
                enabled: true,
                points: ['Background verified', 'Experts in Frost-Free and Inverter compressors', 'Up to 180 days warranty']
            },
            brands: {
                title: 'We service all brands',
                disclaimer: 'Logos & trademarks are used for illustrative purposes. We do not claim any affiliation with the respective brand.',
                enabled: true,
                items: ['Samsung', 'LG', 'Whirlpool', 'Godrej', 'Haier', 'Bosch', 'Panasonic', 'Hitachi', 'Liebherr']
            },
            coverPromise: DEFAULT_COVER_PROMISE,
            notIncluded: {
                title: 'What is not included',
                enabled: true,
                items: ['Repair of commercial cold storage or display chillers', 'Cabinet door replacement']
            },
            faqs: {
                title: 'Frequently asked questions',
                enabled: true,
                items: [
                    { question: 'Why is my fridge not cooling but light is on?', answer: 'This is usually caused by a tripped compressor relay, faulty defrost timer, or gas leak. Our technician can diagnose and fix this on site.' }
                ]
            },
            reviews: {
                title: 'Customer Reviews',
                enabled: true,
                rating: '4.85',
                totalCount: '52K reviews',
                distribution: { star5: '89%', star4: '8%', star3: '2%', star2: '1%', star1: '0%' },
                items: [
                    { id: 'rev-1', name: 'Kavita Patel', rating: 5, date: 'Nov 9, 2026', tag: 'For Double Door Cooling Fix', comment: 'Fixed the defrost heater issue quickly. Excellent service!' }
                ]
            },
            desktopStickyPromise: DEFAULT_DESKTOP_PROMISE,
            sectionOrder: DEFAULT_SECTION_ORDER
        };
    }

    // ── 5. Generic / Default Template for Any Other Subcategory ──
    const displayTitle = subcategoryName || (subcategorySlug ? subcategorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Appliance Service');

    return {
        hero: {
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_speed_90_mins.png',
            slides: defaultSlides,
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            title: `${displayTitle} Check-up & Repair`,
            subtitle: 'Doorstep inspection, certified technicians & genuine parts within 90 mins',
            rating: '4.83',
            reviewsCount: '35K',
            rateCardText: 'Standard rate card',
            rateCardBadge: 'sorted cover',
            enabled: true
        },
        servicesSection: {
            title: 'Select a Service',
            subtitle: 'Choose from certified packages and repair solutions below',
            enabled: true
        },
        process: {
            title: 'Our process',
            enabled: true,
            steps: [
                { number: 1, title: 'Inspection & quote', description: 'We inspect the appliance & share a repair quote for approval', imageUrl: '' },
                { number: 2, title: 'Approval or expert review', description: 'Repair begins after your approval, if you are unsure you can call expert', imageUrl: '' },
                { number: 3, title: 'Repair & spare parts', description: 'If needed, we will source spare parts at fixed rates for the repair', imageUrl: '' },
                { number: 4, title: 'Warranty activation', description: 'Your appliance will automatically come under 180 days warranty after the repair', imageUrl: '' }
            ]
        },
        technicians: {
            title: 'Top technicians',
            photoUrl: '/images/banners/banner_expertise_v3.png',
            enabled: true,
            points: ['Background verified', 'Trained across all major brands', 'Certified under Skill India Programme']
        },
        brands: {
            title: 'We service all brands',
            disclaimer: 'Logos & trademarks are used for illustrative purposes. We do not claim any affiliation with the respective brand.',
            enabled: true,
            items: COMMON_BRANDS
        },
        coverPromise: DEFAULT_COVER_PROMISE,
        notIncluded: {
            title: 'What is not included',
            enabled: true,
            items: ['Repair of commercial grade appliances', 'Structural cabinet alteration']
        },
        faqs: {
            title: 'Frequently asked questions',
            enabled: true,
            items: [
                { question: 'Does the cost include spare parts?', answer: 'Inspection fee covers the visit and diagnostic checks. Spare parts are quoted upfront before replacement.' },
                { question: 'What warranty is provided?', answer: 'All services include up to 180 days Sorted Care warranty.' }
            ]
        },
        reviews: {
            title: 'Customer Reviews',
            enabled: true,
            rating: '4.83',
            totalCount: '35K reviews',
            distribution: { star5: '87%', star4: '9%', star3: '2%', star2: '1%', star1: '1%' },
            items: [
                { id: 'rev-1', name: 'Rajesh K.', rating: 5, date: 'Nov 5, 2026', tag: 'For Doorstep Inspection', comment: 'Very professional, diagnosed and repaired the fault on site.' }
            ]
        },
        desktopStickyPromise: DEFAULT_DESKTOP_PROMISE,
        sectionOrder: DEFAULT_SECTION_ORDER
    };
}
