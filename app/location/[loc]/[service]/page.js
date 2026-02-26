import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksSection from '@/components/homepage/HowItWorksSection'
import WhyChooseUsSection from '@/components/homepage/WhyChooseUsSection'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import OtherLocationsSection from '@/components/services/OtherLocationsSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import Header from '@/components/common/Header'
import { getFAQs } from '@/data/faqs'
import { createServerSupabase } from '@/lib/supabase-server'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'

export const dynamic = 'force-dynamic'

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
]

import { unstable_noStore as noStore } from 'next/cache';
import { getFullPageData, resolveFaqs } from '@/lib/data/pageSettings';

export default async function SubLocationPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { loc, service } = params

    // Format display names
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const serviceName = service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-location page (e.g. sloc-andheri-ac-repair)
    const pageId = `sloc-${loc}-${service}`

    // ── Fetch dynamic settings via internal API (avoids Supabase SDK issues in Server Components) ──
    let dynamicSettings = null

    try {
        const apiData = await getFullPageData(pageId);
        if (apiData.success && apiData.data) {
            const d = apiData.data;
            const r = apiData.related || {};

            let resolvedFaqsList = [];
            if (r.faqIds?.length > 0) {
                const faqRes = await resolveFaqs(r.faqIds);
                if (faqRes.success) resolvedFaqsList = faqRes.faqs;
            }

            dynamicSettings = {
                heroSettings: d.hero_settings || null,
                problemsSettings: d.problems_settings,
                servicesSettings: d.services_settings,
                problems: (r.problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                localities: (r.localities || []).map(l => l.locality_name),
                services: (r.services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                faqs: resolvedFaqsList,
                brandIds: r.brandIds || [],
                sectionVisibility: d.section_visibility || {},
                hero_title: d.hero_settings?.title,
                hero_subtitle: d.hero_settings?.subtitle,
                problems_title: d.problems_settings?.title,
                problems_subtitle: d.problems_settings?.subtitle,
                services_title: d.services_settings?.title,
                services_subtitle: d.services_settings?.subtitle,
                brands_title: d.brands_settings?.title,
                brands_subtitle: d.brands_settings?.subtitle,
                faqs_title: d.faqs_settings?.title,
                faqs_subtitle: d.faqs_settings?.subtitle,
                localities_title: d.localities_settings?.title,
                localities_subtitle: d.localities_settings?.subtitle,
                how_it_works_title: d.how_it_works_settings?.title,
                how_it_works_subtitle: d.how_it_works_settings?.subtitle,
                why_us_title: d.why_us_settings?.title,
                why_us_subtitle: d.why_us_settings?.subtitle,
                other_locations_title: d.other_locations_settings?.title,
                other_locations_subtitle: d.other_locations_settings?.subtitle,
                other_locations: d.other_locations_settings?.items || [],
                subcategories: d.subcategories_settings?.items || [],
                subcategoriesTitle: d.subcategories_settings?.title,
                subcategoriesSubtitle: d.subcategories_settings?.subtitle,
                section_order: d.section_order
            };
        }
    } catch (error) {
        console.error('[SublocPage] Error natively fetching settings:', error.message);
    }

    // ── Fallbacks ────────────────────────────────────────────────────────────
    const problemsTitle = dynamicSettings?.problems_title
        || `${serviceName} Problems We Solve in ${locationName}`
    const problemsSubtitle = dynamicSettings?.problems_subtitle
        || `Common ${serviceName.toLowerCase()} issues we fix in ${locationName}`

    const serviceCategories = [
        { slug: 'ac-repair', title: 'AC Repair', description: 'All types of AC repair and servicing', price: 499, icon: '❄️' },
        { slug: 'refrigerator-repair', title: 'Refrigerator Repair', description: 'Fridge repair and gas refilling', price: 599, icon: '🧊' },
        { slug: 'oven-repair', title: 'Oven Repair', description: 'Microwave and OTG repair', price: 399, icon: '🔥' },
        { slug: 'washing-machine-repair', title: 'Washing Machine Repair', description: 'All washing machine repairs', price: 549, icon: '🌀' },
        { slug: 'water-purifier-repair', title: 'Water Purifier Repair', description: 'RO and UV purifier service', price: 449, icon: '💧' },
        { slug: 'hob-repair', title: 'Gas Hob Repair', description: 'Gas stove and hob repair', price: 349, icon: '🔥' },
    ]

    const problems = (dynamicSettings?.problems?.length > 0)
        ? dynamicSettings.problems
        : [
            { question: `${serviceName} not working properly`, answer: 'Our technicians diagnose and fix all failure types.' },
            { question: 'Making unusual noise', answer: 'We identify and resolve all mechanical sound issues.' },
            { question: 'Performance issues', answer: 'We restore optimal performance through comprehensive service.' },
            { question: 'Electrical problems', answer: 'Our certified technicians handle all electrical faults safely.' },
            { question: 'Need regular maintenance', answer: 'We offer preventive care to extend your appliance lifespan.' }
        ]

    const faqs = (dynamicSettings?.faqs?.length > 0) ? dynamicSettings.faqs : getFAQs('ac-repair').slice(0, 5)



    const sv = dynamicSettings?.sectionVisibility || {}
    const defaultOrder = [
        'hero', 'booking', 'subcategories', 'problems',
        'how_it_works', 'why_us', 'brands', 'localities', 'services', 'other_locations', 'faqs'
    ];
    let sectionOrder = dynamicSettings?.section_order || defaultOrder;
    if (dynamicSettings?.section_order) {
        const missing = defaultOrder.filter(k => !sectionOrder.includes(k));
        if (missing.length > 0) sectionOrder = [...sectionOrder, ...missing];
    }

    const renderSection = (key) => {
        switch (key) {
            case 'hero':
                return sv.hero !== false && (
                    <HeroSection
                        key="hero"
                        title={dynamicSettings?.hero_title || `${serviceName} Repair in ${locationName}`}
                        subtitle={dynamicSettings?.hero_subtitle || `Expert ${serviceName.toLowerCase()} repair services • Same-day service • All brands`}
                        category={service}
                        location={locationName}
                        heroSettings={dynamicSettings?.heroSettings || null}
                    />
                );
            case 'booking':
                return sv.booking !== false && (
                    <div id="booking" key="booking">
                        <QuickBookingEmbed preSelectedCategory={service} />
                    </div>
                );

            case 'problems':
                return sv.problems !== false && (
                    <div id="problems" key="problems">
                        <ProblemsSection
                            title={problemsTitle}
                            subtitle={problemsSubtitle}
                            problems={problems}
                        />
                    </div>
                );
            case 'subcategories':
                return sv.subcategories !== false && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategoriesTitle || "Other Services"}
                            subtitle={dynamicSettings?.subcategoriesSubtitle || "Explore our premium services"}
                            cards={(dynamicSettings?.subcategories?.length > 0) ? dynamicSettings.subcategories : serviceCategories}
                            baseUrl={`/services`}
                        />
                    </div>
                );
            case 'localities':
                return sv.localities !== false && dynamicSettings?.localities && (
                    <div id="areas" key="localities">
                        <LocationLinks
                            title={dynamicSettings?.localities_title || "Serving All Areas"}
                            subtitle={dynamicSettings?.localities_subtitle || "Professional service at your doorstep"}
                            dynamicLocalities={dynamicSettings.localities}
                        />
                    </div>
                );
            case 'how_it_works':
                return sv.how_it_works !== false && (
                    <div id="how-it-works" key="how_it_works">
                        <HowItWorksSection
                            title={dynamicSettings?.how_it_works_title || "How It Works"}
                            subtitle={dynamicSettings?.how_it_works_subtitle || "Get your appliance fixed in 4 simple steps"}
                        />
                    </div>
                );
            case 'why_us':
                return sv.why_us !== false && (
                    <div id="why-us" key="why_us">
                        <WhyChooseUsSection
                            title={dynamicSettings?.why_us_title || `Why Choose Us for ${serviceName} Repair in ${locationName}?`}
                            subtitle={dynamicSettings?.why_us_subtitle || "Local experts with premium service quality"}
                        />
                    </div>
                );
            case 'brands':
                return sv.brands !== false && (
                    <div id="brands" key="brands">
                        <BrandLogos
                            title={dynamicSettings?.brands_title || "All Brands Serviced"}
                            subtitle={dynamicSettings?.brands_subtitle || `We repair all major ${serviceName.toLowerCase()} brands`}
                            selectedBrandIds={dynamicSettings?.brandIds}
                        />
                    </div>
                );
            case 'services':
                return sv.services !== false && (
                    <div id="popular" key="services">
                        <FrequentlyBooked
                            title={dynamicSettings?.services_title || `Popular Services in ${locationName}`}
                            subtitle={dynamicSettings?.services_subtitle || "Most booked services in your area"}
                            dynamicServices={dynamicSettings?.services}
                        />
                    </div>
                );
            case 'other_locations':
                return sv.other_locations !== false && (
                    <div id="other-locations" key="other_locations">
                        <OtherLocationsSection
                            title={dynamicSettings?.other_locations_title || "Other Locations"}
                            subtitle={dynamicSettings?.other_locations_subtitle || "Explore more services near you"}
                            locations={dynamicSettings?.other_locations || []}
                        />
                    </div>
                );
            case 'faqs':
                return sv.faqs !== false && (
                    <div id="faqs" key="faqs">
                        <FAQSection
                            title={dynamicSettings?.faqs_title || "Frequently Asked Questions"}
                            subtitle={dynamicSettings?.faqs_subtitle || `Common questions about ${serviceName.toLowerCase()} repair in ${locationName}`}
                            faqs={faqs}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="service-page sub-location-page">
            <Header />
            {sectionOrder.map(renderSection)}
            <ServiceFooter />
        </div>
    );
}

// Generate static params for all location × service combinations
export async function generateStaticParams() {
    // Fetch live appliance slugs from DB so new appliances are included at build
    try {
        const supabase = createServerSupabase();
        if (!supabase) throw new Error('No supabase client');
        const { data: categories } = await supabase
            .from('booking_categories')
            .select('slug')
            .not('slug', 'is', null)

        if (categories && categories.length > 0) {
            const params = []
            LOCATIONS.forEach(loc => {
                categories.forEach(cat => {
                    params.push({ loc, service: cat.slug })
                })
            })
            return params
        }
    } catch (e) {
        console.error('generateStaticParams sub-location error:', e)
    }

    // Fallback
    const services = ['ac-repair', 'refrigerator-repair', 'washing-machine-repair', 'water-purifier-repair', 'oven-repair', 'hob-repair']
    const params = []
    LOCATIONS.forEach(loc => {
        services.forEach(service => {
            params.push({ loc, service })
        })
    })
    return params
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { loc, service } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const serviceName = service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `${serviceName} Repair in ${locationName} | Same Day Service | SORTED`,
        description: `Expert ${serviceName.toLowerCase()} repair services in ${locationName}. Same day service, all brands, 90-day warranty. Book now!`,
        keywords: `${serviceName} repair ${locationName}, ${serviceName.toLowerCase()} service ${locationName}`,
    }
}
