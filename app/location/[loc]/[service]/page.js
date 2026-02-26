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

export default async function SubLocationPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { loc, service } = params

    // Format display names
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const serviceName = service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-location page (e.g. sloc-andheri-ac-repair)
    const pageId = `sloc-${loc}-${service}`

    // ── Fetch dynamic settings from Supabase ──────────────────────────────────
    let dynamicSettings = null
    const supabase = createServerSupabase();
    if (!supabase) return null;

    try {
        console.log(`[LIVE DEBUG] Subloc PageID: ${pageId} fetching via SDK (noStore)`);

        const { data: pageSettings } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .single();

        if (pageSettings) {
            const [
                { data: problems },
                { data: services },
                { data: localities },
                { data: brandsMapping },
                { data: faqsMapping }
            ] = await Promise.all([
                supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
                supabase.from('page_faqs_mapping')
                    .select('faq_id, website_faqs(question, answer)')
                    .eq('page_id', pageId)
                    .order('display_order', { ascending: true })
            ]);

            dynamicSettings = {
                heroSettings: pageSettings.hero_settings || null,
                problemsSettings: pageSettings.problems_settings,
                servicesSettings: pageSettings.services_settings,
                problems: (problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                localities: (localities || []).map(l => l.locality_name),
                services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                faqs: (faqsMapping || [])
                    .filter(f => f.website_faqs)
                    .map(f => ({ question: f.website_faqs.question, answer: f.website_faqs.answer })),
                brandIds: brandsMapping?.map(m => m.brand_id) || [],
                sectionVisibility: pageSettings.section_visibility || {},

                // Title/Subtitle Overrides (CRITICAL for matching sv flags)
                hero_title: pageSettings.hero_settings?.title,
                hero_subtitle: pageSettings.hero_settings?.subtitle,
                problems_title: pageSettings.problems_settings?.title,
                problems_subtitle: pageSettings.problems_settings?.subtitle,
                services_title: pageSettings.services_settings?.title,
                services_subtitle: pageSettings.services_settings?.subtitle,
                brands_title: pageSettings.brands_settings?.title,
                brands_subtitle: pageSettings.brands_settings?.subtitle,
                faqs_title: pageSettings.faqs_settings?.title,
                faqs_subtitle: pageSettings.faqs_settings?.subtitle,
                localities_title: pageSettings.localities_settings?.title,
                localities_subtitle: pageSettings.localities_settings?.subtitle,
                how_it_works_title: pageSettings.how_it_works_settings?.title,
                how_it_works_subtitle: pageSettings.how_it_works_settings?.subtitle,
                why_us_title: pageSettings.why_us_settings?.title,
                why_us_subtitle: pageSettings.why_us_settings?.subtitle,
                subcategories: pageSettings.subcategories_settings?.items || [],
                subcategoriesTitle: pageSettings.subcategories_settings?.title,
                subcategoriesSubtitle: pageSettings.subcategories_settings?.subtitle,
                section_order: pageSettings.section_order
            }

            // Fallback to Global FAQs if none selected
            if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                const { data: globalFaqs } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                if (globalFaqs?.length > 0) {
                    dynamicSettings.faqs = globalFaqs.map(f => ({ question: f.question, answer: f.answer }));
                }
            }
        }
    } catch (error) {
        console.error('Error fetching sub-location dynamic settings:', error)
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
    const sectionOrder = dynamicSettings?.section_order || [
        'hero', 'booking', 'problems', 'subcategories', 'localities',
        'how_it_works', 'why_us', 'brands', 'services', 'faqs'
    ];

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
