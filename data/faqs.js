// FAQs organized by category
export const faqsByCategory = {
    'ac-repair': [
        {
            question: "How often should I service my AC?",
            answer: "We recommend servicing your AC every 3-6 months, especially before summer and after monsoon season. Regular servicing ensures optimal performance, energy efficiency, and extends the lifespan of your AC."
        },
        {
            question: "What is included in AC servicing?",
            answer: "Our AC servicing includes filter cleaning, coil cleaning, gas pressure check, drainage cleaning, thermostat check, and overall performance testing. We also provide a detailed service report."
        },
        {
            question: "How long does AC repair take?",
            answer: "Most AC repairs are completed within 1-2 hours. However, if spare parts need to be ordered, it may take 24-48 hours. We'll provide an estimated timeline after diagnosis."
        },
        {
            question: "Do you provide warranty on repairs?",
            answer: "Yes, we provide a 90-day warranty on all repairs and spare parts. If the same issue occurs within the warranty period, we'll fix it free of charge."
        },
        {
            question: "What brands do you service?",
            answer: "We service all major AC brands including Samsung, LG, Daikin, Voltas, Blue Star, Hitachi, Carrier, and more. Our technicians are trained to handle all brands."
        }
    ],
    'oven-repair': [
        {
            question: "Why is my microwave not heating?",
            answer: "Common causes include a faulty magnetron, damaged diode, or blown fuse. Our technicians will diagnose the exact issue and provide the best solution."
        },
        {
            question: "Is it safe to repair a microwave at home?",
            answer: "Microwave repairs should only be done by trained professionals due to high voltage components. Our certified technicians follow all safety protocols."
        },
        {
            question: "How long do microwave repairs take?",
            answer: "Most microwave repairs are completed within 1 hour. If parts need replacement, we'll inform you of the timeline and cost upfront."
        },
        {
            question: "Do you repair all oven brands?",
            answer: "Yes, we repair all major brands including Samsung, LG, IFB, Whirlpool, Morphy Richards, Bajaj, and more."
        }
    ],
    'washing-machine-repair': [
        {
            question: "Why is my washing machine not draining?",
            answer: "Common causes include clogged drain pump, blocked hose, or faulty drain pump motor. Our technicians will identify and fix the issue quickly."
        },
        {
            question: "How often should I service my washing machine?",
            answer: "We recommend servicing every 6 months to ensure optimal performance and prevent major breakdowns."
        },
        {
            question: "Do you repair both front-load and top-load machines?",
            answer: "Yes, we repair all types of washing machines including front-load, top-load, semi-automatic, and fully automatic models."
        }
    ],
    'refrigerator-repair': [
        {
            question: "Why is my fridge not cooling?",
            answer: "Common causes include compressor issues, gas leakage, thermostat problems, or dirty condenser coils. We'll diagnose and fix the issue."
        },
        {
            question: "How long does refrigerator repair take?",
            answer: "Most repairs are completed within 2-3 hours. Gas refilling may take additional time for proper testing."
        },
        {
            question: "Do you provide same-day service?",
            answer: "Yes, we offer same-day service for most repairs. Book before 12 PM for same-day service availability."
        }
    ],
    'water-purifier-repair': [
        {
            question: "How often should I change RO filters?",
            answer: "Pre-filters should be changed every 6 months, RO membrane every 2-3 years, and post-carbon filter every year. We'll remind you when it's time."
        },
        {
            question: "Why is my RO water flow slow?",
            answer: "Common causes include clogged filters, low water pressure, or membrane blockage. Regular servicing prevents this issue."
        },
        {
            question: "Do you service all RO brands?",
            answer: "Yes, we service all major brands including Kent, Aquaguard, Pureit, Livpure, and more."
        }
    ],
    'hob-repair': [
        {
            question: "Why is my gas stove not igniting?",
            answer: "Common causes include clogged burner, faulty ignition switch, or gas supply issues. Our technicians will identify and fix the problem."
        },
        {
            question: "Is it safe to repair gas stoves at home?",
            answer: "Gas appliance repairs should only be done by certified professionals. Our technicians are trained in gas safety protocols."
        },
        {
            question: "How often should I service my gas hob?",
            answer: "We recommend servicing every 6-12 months to ensure safety and optimal performance."
        }
    ]
}

// Get FAQs for a specific category
export function getFAQs(category) {
    return faqsByCategory[category] || []
}
