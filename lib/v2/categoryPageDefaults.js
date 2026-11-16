/**
 * Default templates and configurations for Urban Company-style Category Pages (/v2/services/[category]).
 * Covers the 6 main appliance categories:
 * - ac-repair (Air Conditioner)
 * - washing-machine-repair (Washing Machine)
 * - refrigerator-repair (Refrigerator)
 * - oven-repair (Microwave & Oven)
 * - water-purifier-repair (Water Purifier)
 * - hob-repair (Hob & Gas Stove)
 */

import { V2_CATEGORIES } from './catalogConfig';

export const CATEGORY_SECTION_ORDER = [
    'hero',
    'services',
    'applianceType',
    'process',
    'technicians',
    'brands',
    'coverPromise',
    'notIncluded',
    'faqs',
    'reviews'
];

export const CATEGORY_DEFAULTS = {
    'ac-repair': {
        hero: {
            title: 'Air Conditioner Service & Repair',
            rating: '4.86',
            reviewsCount: '85K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_speed_90_mins.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Doorstep Arrival',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_expertise_v3.png',
                    title: 'Certified Cooling Technicians',
                    active: true
                },
                {
                    id: 's-3',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_problem_solved_expert.png',
                    title: 'Genuine Spares & 30-Day Warranty',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'Foam-jet deep cleaning, cooling fix & genuine spare parts'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose your AC model for specialized service, parts and pricing'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Pre-service checks',
                    desc: 'Detailed inspection of temperature, airflow, power consumption, gas level & indoor/outdoor unit health.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Deep Foam-Jet cleaning & repair',
                    desc: '2X deeper cleaning with specialized foam jacket, high-pressure jet pump & genuine spare part replacements.',
                    imageUrl: '/images/banners/banner_expertise_v3.png'
                },
                {
                    title: 'Post-service cooling verification',
                    desc: 'Cooling efficiency test with digital thermometer, vibration check & spotless site clean-up.',
                    imageUrl: '/images/banners/banner_problem_solved_expert.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Pramod Sharma & 48+ verified experts',
            experienceText: '7+ years experience • 2,400+ ACs serviced',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Background checked & police verified',
                'Trained on Split, Inverter & Cassette technologies',
                'Equipped with genuine company spares & digital testing meters'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['Daikin', 'Voltas', 'LG', 'Samsung', 'Hitachi', 'Carrier', 'Blue Star', 'Panasonic', 'Lloyd', 'Mitsubishi', 'O General', 'Godrej', 'Whirlpool']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Fixed upfront rate card with no hidden fees' },
                { icon: 'headphones', text: 'Dedicated Mumbai customer support helpline' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Major copper piping replacement beyond standard allowance',
                'Scaffolding or external wall masonry work above 2nd floor without balcony access',
                'Compressor replacement without prior quotation approval'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'How frequently should I service my AC in Mumbai?',
                    a: 'Due to Mumbai\'s coastal humidity and dust, servicing your AC every 3 to 4 months ensures optimal cooling and lowers electricity consumption by up to 25%.'
                },
                {
                    q: 'What is included in Foam-Jet AC service?',
                    a: 'Foam-Jet service uses high-pressure jet pumps with specialized anti-bacterial foam to eliminate deep-seated grime, fungi, and clogged drainage coils without damaging fragile cooling fins.'
                },
                {
                    q: 'Do you provide a warranty on spare parts and gas refilling?',
                    a: 'Yes, all gas charging and spare parts replaced by Sorted Solutions carry up to 90 days warranty under the Sorted Cover program.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.86',
            reviewsCount: '85K',
            items: [
                {
                    author: 'Vikram Mehta',
                    locality: 'Andheri West',
                    rating: 5,
                    date: '2 days ago',
                    comment: 'Technician reached within 75 minutes. Did a complete foam jet clean on my Daikin split AC. Cooling is ice cold again!'
                },
                {
                    author: 'Pooja Nair',
                    locality: 'Bandra West',
                    rating: 5,
                    date: '1 week ago',
                    comment: 'Very professional. Fixed water dripping issue in 30 mins and cleaned up the floor thoroughly. Upfront price with no surprises.'
                },
                {
                    author: 'Rohit Kulkarni',
                    locality: 'Powai',
                    rating: 5,
                    date: '2 weeks ago',
                    comment: 'Great service! PCB error code on my Inverter AC was diagnosed and fixed on the spot with genuine parts.'
                }
            ]
        }
    },

    'washing-machine-repair': {
        hero: {
            title: 'Washing Machine Service & Repair',
            rating: '4.85',
            reviewsCount: '72K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_expertise_v3.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_expertise_v3.png',
                    title: 'Front & Top Load Specialists',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Arrival Across Mumbai',
                    active: true
                },
                {
                    id: 's-3',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_all_in_one_v3.png',
                    title: '30-Day Doorstep Warranty',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'Drum balance, electronic PCB, spin cycle & water leakage fixes'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose front load, top load or semi-automatic for tailored solutions'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Electrical & mechanical diagnosis',
                    desc: 'Checking inlet valve, drum bearings, pulsator, drain pump & electronic PCB control panel.',
                    imageUrl: '/images/banners/banner_expertise_v3.png'
                },
                {
                    title: 'Precision repair with genuine spares',
                    desc: 'Replacement of faulty motors, carbon brushes, shock absorbers, belts or water level sensors.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Full wash & spin cycle test',
                    desc: 'Running a test load through agitation, spin and drainage cycles to guarantee vibration-free operation.',
                    imageUrl: '/images/banners/banner_all_in_one_v3.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Sunil Pawar & 42+ verified experts',
            experienceText: '6+ years experience • 1,900+ washing machines repaired',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Trained on Front Load, Top Load & Semi-Automatic systems',
                'Expert in IFB, Bosch, LG & Samsung inverter drive motors',
                'Equipped with genuine OEM belts, valves & motherboards'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['IFB', 'LG', 'Samsung', 'Whirlpool', 'Bosch', 'Godrej', 'Panasonic', 'Haier', 'Siemens', 'Voltas Beko']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Standard rate card & genuine spares guarantee' },
                { icon: 'headphones', text: 'Dedicated customer support helpline' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Outer metal body rust repairs or complete body re-painting',
                'Main outer tub replacement without prior quotation approval'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'Why is my washing machine vibrating excessively during spin cycle?',
                    a: 'Excessive vibration is commonly caused by worn shock absorbers, uneven leveling feet, or drum bearing wear. Our technician diagnoses and balances the suspension on site.'
                },
                {
                    q: 'Do you carry spare parts on the first visit?',
                    a: 'Yes, our technicians carry common spares like inlet valves, drain pumps, capacitors, belts, and door locks for same-day resolution.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.85',
            reviewsCount: '72K',
            items: [
                {
                    author: 'Anjali Shah',
                    locality: 'Malad West',
                    rating: 5,
                    date: '3 days ago',
                    comment: 'My IFB front load stopped draining water. Technician arrived in 90 minutes, cleared coin trap and replaced the pump. Works like new!'
                },
                {
                    author: 'Deepak Sawant',
                    locality: 'Goregaon East',
                    rating: 5,
                    date: '1 week ago',
                    comment: 'Fixed heavy spin noise on my Samsung top load. Very honest technician, charged standard rate.'
                }
            ]
        }
    },

    'refrigerator-repair': {
        hero: {
            title: 'Refrigerator Service & Repair',
            rating: '4.87',
            reviewsCount: '65K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_problem_solved_expert.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_problem_solved_expert.png',
                    title: 'Single, Double & Side-by-Side Experts',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Emergency Cooling Fix',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'Defrost fix, gas charging, relay, thermostat & inverter compressor care'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose single door, double door or side-by-side refrigerator'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Gas pressure & electrical diagnosis',
                    desc: 'Checking compressor relay, thermostat, bi-metal defrost heater & gas pressure with digital gauges.',
                    imageUrl: '/images/banners/banner_problem_solved_expert.png'
                },
                {
                    title: 'Leak repair & component replacement',
                    desc: 'Sealing refrigerant line pinhole leaks, flushing capillaries & replacing faulty overload protectors.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Cooling calibration & frost-free test',
                    desc: 'Verifying temperature stabilization in freezer and fresh-food compartments before handover.',
                    imageUrl: '/images/banners/banner_all_in_one_v3.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Ramesh Yadav & 36+ verified experts',
            experienceText: '8+ years experience • 2,100+ refrigerators repaired',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Specialized in Inverter & Frost-Free cooling circuits',
                'Certified in R600a and R134a safe refrigerant charging',
                'Equipped with genuine digital relays and sensors'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['Samsung', 'LG', 'Whirlpool', 'Godrej', 'Haier', 'Bosch', 'Panasonic', 'Hitachi', 'Kelvinator', 'Liebherr']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Fixed rate card & transparent pricing' },
                { icon: 'headphones', text: 'Same-day priority response across Mumbai' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Complete cabinet replacement or interior shelf plastic re-molding',
                'Freon charging without prior vacuum and leak test approval'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'My fridge is running but not cooling. What could be the issue?',
                    a: 'This usually indicates a failed starting relay, a gas leakage, or a faulty defrost timer/bi-metal thermostat. Our technician diagnoses the exact root cause in 20 minutes.'
                },
                {
                    q: 'How long does gas charging take?',
                    a: 'Complete leak testing, vacuum evacuation, and precision gas charging takes approximately 60 to 90 minutes.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.87',
            reviewsCount: '65K',
            items: [
                {
                    author: 'Kavita Joshi',
                    locality: 'Kandivali West',
                    rating: 5,
                    date: '4 days ago',
                    comment: 'Freezer was making ice but lower section wasn\'t cooling. Fixed the defrost sensor and cooling is back to normal in 1 hour!'
                },
                {
                    author: 'Suresh Patil',
                    locality: 'Santacruz East',
                    rating: 5,
                    date: '1 week ago',
                    comment: 'Punctual, polite, and very knowledgeable technician. Gas refilling on my double-door fridge solved the problem.'
                }
            ]
        }
    },

    'oven-repair': {
        hero: {
            title: 'Microwave & Oven Service & Repair',
            rating: '4.84',
            reviewsCount: '45K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_all_in_one_v3.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_all_in_one_v3.png',
                    title: 'Solo, Grill, Convection & OTG Care',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Arrival at Your Doorstep',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'Magnetron heating, diode, turntable motor & touch panel repairs'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose microwave oven or OTG & built-in oven'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'High-voltage & radiation leak check',
                    desc: 'Testing high-voltage capacitor, diode, interlock microswitches & door seals with safety meters.',
                    imageUrl: '/images/banners/banner_all_in_one_v3.png'
                },
                {
                    title: 'Magnetron & control repair',
                    desc: 'Replacing degraded magnetrons, turntable motors, mica sheets or keypad touch membranes.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Heat chamber test & power validation',
                    desc: 'Validating wattage output with water load heating test before sealing the unit.',
                    imageUrl: '/images/banners/banner_problem_solved_expert.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Imran Khan & 28+ verified experts',
            experienceText: '6+ years experience • 1,400+ ovens repaired',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Trained on High-Voltage microwave radiation safety',
                'Expert in Convection, Grill and OTG heating circuits',
                'Equipped with genuine mica plates & magnetrons'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['LG', 'Samsung', 'IFB', 'Bajaj', 'Morphy Richards', 'Panasonic', 'Godrej', 'Haier', 'Whirlpool', 'Faber']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Fixed rate card & genuine spares' },
                { icon: 'headphones', text: 'Dedicated Mumbai support team' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Replacement of custom glass turntable plates unless ordered in advance',
                'Heavy cavity enamel re-coating'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'Why is my microwave running but not heating food?',
                    a: 'This is usually caused by a failed magnetron, blown high-voltage diode, or faulty capacitor. Our technician tests and fixes it safely on site.'
                },
                {
                    q: 'Is it safe to repair a microwave at home?',
                    a: 'Yes, our certified technicians carry professional discharging tools and radiation meters to ensure 100% safe repair in your kitchen.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.84',
            reviewsCount: '45K',
            items: [
                {
                    author: 'Nilesh Varma',
                    locality: 'Jogeshwari West',
                    rating: 5,
                    date: '5 days ago',
                    comment: 'Microwave sparked inside. Replaced burned mica sheet and cleaned the chamber. Fast and transparent pricing.'
                }
            ]
        }
    },

    'water-purifier-repair': {
        hero: {
            title: 'Water Purifier Service & Repair',
            rating: '4.88',
            reviewsCount: '58K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_location_v3.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_location_v3.png',
                    title: 'Pure Drinking Water Guaranteed',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Arrival Across Mumbai',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'RO membrane kit, UV lamp, booster pump & digital TDS calibration'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose RO purifier or UV / UF water purifier'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Digital TDS & pressure testing',
                    desc: 'Testing raw water TDS, output TDS, booster pump pressure & membrane rejection rate.',
                    imageUrl: '/images/banners/banner_location_v3.png'
                },
                {
                    title: 'Filter sanitation & membrane change',
                    desc: 'Flushing carbon & sediment filters, UV chamber descaling & fitting certified RO membrane.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Leakage check & mineral balance',
                    desc: 'Sanitizing storage tank, leak proofing all elbow joints & final TDS taste calibration.',
                    imageUrl: '/images/banners/banner_problem_solved_expert.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Sachin Jadhav & 34+ verified experts',
            experienceText: '7+ years experience • 2,200+ purifiers serviced',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Equipped with digital TDS meters & pressure gauges',
                'Expert in multi-stage RO, UV, UF and alkaline mineralizers',
                'Carries 100% genuine NSF-certified filter candles'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['Kent', 'Aquaguard', 'Eureka Forbes', 'Pureit', 'Livpure', 'AO Smith', 'Havells', 'Blue Star', 'Aqua Fresh']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Certified genuine filter cartridges' },
                { icon: 'headphones', text: 'Free TDS check with every service' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'External plumbing changes from main building supply line',
                'Iron removal or commercial pre-filtration plant setup'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'How do I know if my RO membrane needs replacement?',
                    a: 'If output water taste changes, TDS rises above 100-150 ppm, or water flow drops significantly, the membrane is choked and requires replacement.'
                },
                {
                    q: 'How often should sediment and carbon filters be changed?',
                    a: 'In Mumbai, sediment and activated carbon filters should be replaced every 6 to 9 months to protect the RO membrane.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.88',
            reviewsCount: '58K',
            items: [
                {
                    author: 'Harish Mehta',
                    locality: 'Borivali West',
                    rating: 5,
                    date: '2 days ago',
                    comment: 'Done full RO servicing on my Aquaguard. TDS dropped from 340 to 65 ppm! Water tastes fresh and sweet.'
                }
            ]
        }
    },

    'hob-repair': {
        hero: {
            title: 'Hob & Chimney Service & Repair',
            rating: '4.82',
            reviewsCount: '38K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: '/images/banners/banner_all_in_one.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_all_in_one.png',
                    title: 'Built-in Glass Hob & Chimney Experts',
                    active: true
                },
                {
                    id: 's-2',
                    mediaType: 'image',
                    mediaUrl: '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Arrival at Your Doorstep',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: 'Auto-ignition, brass burner flame, gas leakage & chimney suction cleaning'
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: 'Choose built-in glass hob or kitchen chimney'
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Gas leak & auto-ignition diagnosis',
                    desc: 'Checking gas valves, copper tubing, pulse generator, spark electrodes & chimney blower motor.',
                    imageUrl: '/images/banners/banner_all_in_one.png'
                },
                {
                    title: 'Precision cleaning & jet calibration',
                    desc: 'Cleaning clogged burner nozzles, decarbonizing brass caps & degreasing chimney baffle filters.',
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Blue flame & suction test',
                    desc: 'Ensuring steady blue flame with zero soot and strong chimney exhaust suction before completing job.',
                    imageUrl: '/images/banners/banner_expertise_v3.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Arjun Shinde & 25+ verified experts',
            experienceText: '7+ years experience • 1,600+ hobs and chimneys serviced',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Specialized in toughened glass hobs & auto-ignition systems',
                'Certified in LPG/PNG gas safety and pipe fittings',
                'Equipped with industrial degreasers and genuine spark plugs'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['Faber', 'Elica', 'Glen', 'Sunflame', 'Hindware', 'Kaff', 'Prestige', 'Bosch', 'Hafele', 'Siemens']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Fixed rate card & gas safety guarantee' },
                { icon: 'headphones', text: 'Same-day priority booking in Mumbai' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Toughened glass top replacement if shattered',
                'External duct pipe core cutting through reinforced concrete walls'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: 'Why is my gas hob producing yellow flame and black soot?',
                    a: 'A yellow flame indicates incomplete combustion caused by clogged burner nozzles or poor air-to-gas ratio. Our technician cleans and re-calibrates the jets for a clean blue flame.'
                },
                {
                    q: 'How often should a kitchen chimney be deep cleaned?',
                    a: 'In Indian cooking with spices and oil, baffle filters and suction motor blowers should be deep cleaned every 3 to 4 months to prevent motor burnout and grease fire risk.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.82',
            reviewsCount: '38K',
            items: [
                {
                    author: 'Suman Roy',
                    locality: 'Dadar West',
                    rating: 5,
                    date: '1 week ago',
                    comment: 'Auto-ignition on my 4-burner Faber hob was clicking continuously. Technician diagnosed the microswitch fault and fixed it in 30 mins.'
                }
            ]
        }
    }
};

/**
 * Returns merged default config for a category page.
 */
export function getCategoryDefaultConfig(categorySlug = '', categoryName = '') {
    const slug = (categorySlug || '').toLowerCase();
    const specific = CATEGORY_DEFAULTS[slug];
    if (specific) {
        return JSON.parse(JSON.stringify(specific));
    }

    // Generic fallback for any unexpected category
    const cat = V2_CATEGORIES.find(c => c.slug === slug);
    const catName = categoryName || cat?.name || slug;

    return {
        hero: {
            title: `${catName} Service & Repair`,
            rating: '4.85',
            reviewsCount: '50K',
            rateCardBadge: 'sorted cover',
            rateCardText: 'Standard rate card',
            mediaType: 'image',
            mediaUrl: cat?.banner || '/images/banners/banner_speed_90_mins.png',
            autoSlideSeconds: 5,
            enableVideoAdvance: true,
            slides: [
                {
                    id: 's-1',
                    mediaType: 'image',
                    mediaUrl: cat?.banner || '/images/banners/banner_speed_90_mins.png',
                    title: '90-Min Doorstep Arrival',
                    active: true
                }
            ]
        },
        servicesSection: {
            enabled: true,
            title: 'Select a Service',
            subtitle: `Professional ${catName} repair with genuine spare parts`
        },
        applianceType: {
            enabled: true,
            title: 'Select your appliance type',
            subtitle: `Choose your ${catName} model for tailored services and pricing`
        },
        process: {
            title: 'Our process',
            steps: [
                {
                    title: 'Inspection & diagnosis',
                    desc: `Comprehensive inspection of your ${catName} & clear upfront estimate.`,
                    imageUrl: '/images/banners/banner_speed_90_mins.png'
                },
                {
                    title: 'Repairs with genuine parts',
                    desc: 'Expert repair with original manufacturer-compatible components.',
                    imageUrl: '/images/banners/banner_expertise_v3.png'
                },
                {
                    title: 'Post-service testing & warranty',
                    desc: 'Complete performance verification and 30-day post-service warranty.',
                    imageUrl: '/images/banners/banner_problem_solved_expert.png'
                }
            ]
        },
        technicians: {
            title: 'Top technicians',
            badge: 'CERTIFIED & VETTED',
            name: 'Senior Appliance Care Experts',
            experienceText: '5+ years experience • Background verified',
            imageUrl: '/images/banners/banner_expertise_v3.png',
            points: [
                'Background checked & police verified',
                'Equipped with genuine spare parts',
                'Trained on latest appliance technologies'
            ]
        },
        brands: {
            title: 'We service all brands',
            subtitle: 'Expert repair with genuine manufacturer-compatible spare parts',
            items: ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Bosch', 'Panasonic', 'Haier', 'IFB', 'Voltas']
        },
        coverPromise: {
            title: 'Sorted Cover Promise',
            badge: 'sorted cover',
            enabled: true,
            points: [
                { icon: 'shield', text: '30-day post-service warranty on repairs' },
                { icon: 'umbrella', text: 'Up to ₹10,000 damage protection guarantee' },
                { icon: 'file-text', text: 'Standard rate card & transparent pricing' },
                { icon: 'headphones', text: 'Dedicated Mumbai customer support helpline' }
            ]
        },
        notIncluded: {
            title: "What's not included",
            items: [
                'Major structural body replacements without prior quotation approval'
            ]
        },
        faqs: {
            title: 'Frequently asked questions',
            items: [
                {
                    q: `How quickly can a technician visit for ${catName} repair?`,
                    a: 'Our technician can arrive at your doorstep in Mumbai within 90 minutes of booking.'
                }
            ]
        },
        reviews: {
            title: 'Customer reviews & ratings',
            rating: '4.85',
            reviewsCount: '50K',
            items: [
                {
                    author: 'Verified Customer',
                    locality: 'Mumbai',
                    rating: 5,
                    date: '1 week ago',
                    comment: `Prompt and reliable ${catName} service. Highly recommended!`
                }
            ]
        }
    };
}
