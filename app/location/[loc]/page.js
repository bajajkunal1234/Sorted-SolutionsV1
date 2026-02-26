import { createServerSupabase } from '@/lib/supabase-server'
import HeroSection from '@/components/services/HeroSection'

export const dynamic = 'force-dynamic'
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
import { getProblems } from '@/data/commonProblems'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'

import { unstable_noStore as noStore } from 'next/cache';

export default async function LocationPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { loc } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this location page
    const pageId = `loc-${loc}`

    // ── Fetch dynamic settings from Supabase ──────────────────────────────────
    let dynamicSettings = null
    const supabase = createServerSupabase();
    if (!supabase) return null;

    try {
        console.log(`[LIVE DEBUG] Location PageID: ${pageId} fetching via SDK (noStore)`);

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
                { data: brandMappings },
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
                heroSettings: pageSettings.hero_settings,
                problems: (problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                localities: (localities || []).map(l => l.locality_name),
                brandIds: brandMappings?.map(m => m.brand_id) || [],
                faqs: (faqsMapping || [])
                    .filter(f => f.website_faqs)
                    .map(f => ({ question: f.website_faqs.question, answer: f.website_faqs.answer })),

                // Section Mapping
                subcategories: pageSettings.subcategories_settings?.items?.length > 0 ? pageSettings.subcategories_settings.items : null,
                subcategories_title: pageSettings.subcategories_settings?.title,
                subcategories_subtitle: pageSettings.subcategories_settings?.subtitle,

                // Section Title/Subtitle overrides (CRITICAL for matching sv flags)
                hero_title: pageSettings.hero_settings?.title,
                hero_subtitle: pageSettings.hero_settings?.subtitle,
                problems_title: pageSettings.problems_settings?.title,
                problems_subtitle: pageSettings.problems_settings?.subtitle,
                services_title: pageSettings.services_settings?.title,
                services_subtitle: pageSettings.services_settings?.subtitle,
                localities_title: pageSettings.localities_settings?.title,
                localities_subtitle: pageSettings.localities_settings?.subtitle,
                brands_title: pageSettings.brands_settings?.title,
                brands_subtitle: pageSettings.brands_settings?.subtitle,
                faqs_title: pageSettings.faqs_settings?.title,
                faqs_subtitle: pageSettings.faqs_settings?.subtitle,
                how_it_works_title: pageSettings.how_it_works_settings?.title,
                how_it_works_subtitle: pageSettings.how_it_works_settings?.subtitle,
                why_us_title: pageSettings.why_us_settings?.title,
                why_us_subtitle: pageSettings.why_us_settings?.subtitle,
                section_order: pageSettings.section_order,

                // Section visibility flags
                sectionVisibility: pageSettings.section_visibility || {}
            };

            // Fallback to Global FAQs if none selected
            if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                const { data: globalFaqs } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                if (globalFaqs?.length > 0) {
                    dynamicSettings.faqs = globalFaqs.map(f => ({ question: f.question, answer: f.answer }));
                }
            }
        }
    } catch (error) {
        console.error('Error fetching dynamic settings for location:', error);
    }

    // Main service categories available in this location (Keep static as it's general for all locations)
    const serviceCategories = [
        { slug: 'ac-repair', title: 'AC Repair', description: 'All types of AC repair and servicing', price: 499, icon: '❄️' },
        { slug: 'refrigerator-repair', title: 'Refrigerator Repair', description: 'Fridge repair and gas refilling', price: 599, icon: '🧊' },
        { slug: 'oven-repair', title: 'Oven Repair', description: 'Microwave and OTG repair', price: 399, icon: '🔥' },
        { slug: 'washing-machine-repair', title: 'Washing Machine Repair', description: 'All washing machine repairs', price: 549, icon: '🌀' },
        { slug: 'water-purifier-repair', title: 'Water Purifier Repair', description: 'RO and UV purifier service', price: 449, icon: '💧' },
        { slug: 'hob-repair', title: 'Gas Hob Repair', description: 'Gas stove and hob repair', price: 349, icon: '🔥' },
    ]

    // Fallbacks
    const problems = (dynamicSettings?.problems?.length > 0) ? dynamicSettings.problems : getProblems('ac-repair') // Default to AC problems for locations
    const faqs = (dynamicSettings?.faqs?.length > 0) ? dynamicSettings.faqs : getFAQs('ac-repair').slice(0, 3)
    const sublocations = (dynamicSettings?.localities?.length > 0) ? dynamicSettings.localities : [
        `${locationName} East`,
        `${locationName} West`,
        `${locationName} Central`,
    ]



    const sv = dynamicSettings?.sectionVisibility || {}
    const sectionOrder = dynamicSettings?.section_order || [
        'hero', 'booking', 'subcategories', 'problems',
        'how_it_works', 'why_us', 'brands', 'localities', 'services', 'faqs'
    ];

    const renderSection = (key) => {
        switch (key) {
            case 'hero':
                return sv.hero !== false && (
                    <HeroSection
                        key="hero"
                        title={dynamicSettings?.hero_title || `Appliance Repair Services in ${locationName}`}
                        subtitle={dynamicSettings?.hero_subtitle || "Expert technicians • All brands • Same-day service available"}
                        category="ac-repair"
                        location={locationName}
                        heroSettings={dynamicSettings?.heroSettings}
                    />
                );
            case 'booking':
                return sv.booking !== false && (
                    <div id="booking" key="booking">
                        <QuickBookingEmbed />
                    </div>
                );

            case 'subcategories':
                return (sv.subcategories !== false && (dynamicSettings?.subcategories?.length > 0 || serviceCategories.length > 0)) && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategories_title || `Our Services in ${locationName}`}
                            subtitle={dynamicSettings?.subcategories_subtitle || "Choose your appliance type"}
                            cards={dynamicSettings?.subcategories?.length > 0 ? dynamicSettings.subcategories : serviceCategories}
                            baseUrl="/services"
                        />
                    </div>
                );
            case 'problems':
                return sv.problems !== false && (
                    <div id="problems" key="problems">
                        <ProblemsSection
                            title={dynamicSettings?.problems_title || "Problems We Solve"}
                            subtitle={dynamicSettings?.problems_subtitle || `Common appliance issues in ${locationName}`}
                            problems={problems}
                        />
                    </div>
                );
            case 'how_it_works':
                return sv.how_it_works !== false && (
                    <div id="how-it-works" key="how_it_works">
                        <HowItWorksSection
                            title={dynamicSettings?.how_it_works_title || "How It Works"}
                            subtitle={dynamicSettings?.how_it_works_subtitle || "Scroll through our simple process"}
                        />
                    </div>
                );
            case 'why_us':
                return sv.why_us !== false && (
                    <div id="why-us" key="why_us">
                        <WhyChooseUsSection
                            title={dynamicSettings?.why_us_title || `Why Choose Us in ${locationName}?`}
                            subtitle={dynamicSettings?.why_us_subtitle || "Local service with premium quality"}
                        />
                    </div>
                );
            case 'brands':
                return sv.brands !== false && (
                    <div id="brands" key="brands">
                        <BrandLogos
                            title="Brands We Serve"
                            subtitle="Trusted by leading appliance manufacturers"
                            selectedBrandIds={dynamicSettings?.brandIds}
                        />
                    </div>
                );
            case 'localities':
                return sv.localities !== false && (
                    <div id="areas" key="localities">
                        <LocationLinks
                            title={dynamicSettings?.localities_title || `We Serve All Areas in ${locationName}`}
                            subtitle={dynamicSettings?.localities_subtitle || "Find your specific locality"}
                            dynamicLocalities={dynamicSettings?.localities}
                        />
                    </div>
                );
            case 'services':
                return sv.services !== false && (
                    <div id="popular" key="services">
                        <FrequentlyBooked
                            title={dynamicSettings?.services_title || `Popular in ${locationName}`}
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
                            subtitle={dynamicSettings?.faqs_subtitle || "Common questions about our services"}
                            faqs={faqs}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="service-page location-page">
            <Header />
            {sectionOrder.map(renderSection)}
            <ServiceFooter />
        </div>
    );
}

// Generate static params for all locations
export async function generateStaticParams() {
    return [
        { loc: 'andheri' },
        { loc: 'malad' },
        { loc: 'ghatkopar' },
        { loc: 'bandra' },
        { loc: 'kurla' },
        { loc: 'parel' },
        { loc: 'dadar' },
        { loc: 'borivali' },
        { loc: 'goregaon' },
    ]
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { loc } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `Appliance Repair in ${locationName} | AC, Fridge, Washing Machine | SORTED`,
        description: `Expert appliance repair services in ${locationName}. AC, refrigerator, washing machine, oven repair. Same day service, all brands. Book now!`,
        keywords: `appliance repair ${locationName}, AC repair ${locationName}, fridge repair ${locationName}`,
    }
}
