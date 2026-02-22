import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksGrid from '@/components/services/HowItWorksGrid'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import Header from '@/components/common/Header'
import { getFAQs } from '@/data/faqs'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
]

export default async function SubLocationPage({ params }) {
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
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const restHeaders = {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
        };
        const fetchOpts = { headers: restHeaders, cache: 'no-store' };
        const enc = encodeURIComponent(pageId);

        // Fetch main page settings via REST to avoid stale SDK/cache reads
        const pageSettingsRes = await fetch(
            `${supabaseUrl}/rest/v1/page_settings?page_id=eq.${enc}&select=*`,
            fetchOpts
        );
        const pageSettingsArr = await pageSettingsRes.json();
        const pageSettings = Array.isArray(pageSettingsArr) && pageSettingsArr.length > 0
            ? pageSettingsArr[0] : null;

        console.log(`[LIVE DEBUG] Subloc PageID: ${pageId}, Found: ${!!pageSettings}`);

        if (pageSettings) {
            // Use REST for mapping tables — SDK silently returns empty for these
            const [problemsRes, servicesRes, localitiesRes, brandsRes, faqsMappingRes] = await Promise.all([
                fetch(`${supabaseUrl}/rest/v1/page_problems?page_id=eq.${enc}&order=display_order.asc&select=*`, fetchOpts),
                fetch(`${supabaseUrl}/rest/v1/page_services?page_id=eq.${enc}&order=display_order.asc&select=*`, fetchOpts),
                fetch(`${supabaseUrl}/rest/v1/page_localities?page_id=eq.${enc}&order=display_order.asc&select=*`, fetchOpts),
                fetch(`${supabaseUrl}/rest/v1/page_brands_mapping?page_id=eq.${enc}&select=brand_id`, fetchOpts),
                fetch(`${supabaseUrl}/rest/v1/page_faqs_mapping?page_id=eq.${enc}&order=display_order.asc&select=faq_id`, fetchOpts),
            ]);
            const [problems, services, localities, brandsMapping, faqsMappingRaw] = await Promise.all([
                problemsRes.json(),
                servicesRes.json(),
                localitiesRes.json(),
                brandsRes.json(),
                faqsMappingRes.json(),
            ]);

            // Fetch FAQ full content for selected faq_ids
            let faqsData = [];
            const faqIds = Array.isArray(faqsMappingRaw) ? faqsMappingRaw.map(f => f.faq_id).filter(Boolean) : [];
            if (faqIds.length > 0) {
                const faqsRes = await fetch(`${supabaseUrl}/rest/v1/website_faqs?id=in.(${faqIds.join(',')})&select=question,answer`, fetchOpts);
                faqsData = await faqsRes.json();
            }

            dynamicSettings = {
                heroSettings: pageSettings.hero_settings || null,
                problemsSettings: pageSettings.problems_settings,
                servicesSettings: pageSettings.services_settings,
                problems: Array.isArray(problems) ? problems.map(p => ({ title: p.problem_title, description: p.problem_description })) : [],
                localities: Array.isArray(localities) ? localities.map(l => l.locality_name) : [],
                services: Array.isArray(services) ? services.map(s => ({ name: s.service_name, price: s.price_starts_at })) : [],
                faqs: Array.isArray(faqsData) ? faqsData.map(f => ({ question: f.question, answer: f.answer })) : [],
                brandIds: Array.isArray(brandsMapping) ? brandsMapping.map(m => m.brand_id) : [],
                sectionVisibility: pageSettings.section_visibility || {},

                // Title/Subtitle Overrides
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
                subcategories: pageSettings.subcategories_settings?.items || [],
                subcategoriesTitle: pageSettings.subcategories_settings?.title,
                subcategoriesSubtitle: pageSettings.subcategories_settings?.subtitle,
            }

            // Fallback to Global FAQs if none selected specifically
            if (dynamicSettings.faqs?.length === 0) {
                const globalRes = await fetch(`${supabaseUrl}/rest/v1/website_faqs?order=display_order.asc&limit=5&select=question,answer`, fetchOpts);
                const globalFaqs = await globalRes.json();
                if (Array.isArray(globalFaqs) && globalFaqs.length > 0) {
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

    return (
        <div className="service-page sub-location-page">
            <Header />
            {/* Hero Section */}
            {sv.hero !== false && (
                <HeroSection
                    title={`${serviceName} Repair in ${locationName}`}
                    subtitle={`Expert ${serviceName.toLowerCase()} repair services • Same-day service • All brands`}
                    category={service}
                    location={locationName}
                    heroSettings={dynamicSettings?.heroSettings || null}
                />
            )}

            {/* Quick Booking Form */}
            <div id="booking">
                <QuickBookingEmbed preSelectedCategory={service} />
            </div>

            {/* Common Problems */}
            {sv.problems !== false && (
                <div id="problems">
                    <ProblemsSection
                        title={problemsTitle}
                        subtitle={problemsSubtitle}
                        problems={problems}
                    />
                </div>
            )}

            {/* Sub-Categories / Related Services */}
            {sv.subcategories !== false && (
                <div id="services">
                    <CategoryCards
                        title={dynamicSettings?.subcategoriesTitle || "Other Services"}
                        subtitle={dynamicSettings?.subcategoriesSubtitle || "Explore our premium services"}
                        cards={(dynamicSettings?.subcategories?.length > 0) ? dynamicSettings.subcategories : serviceCategories}
                        baseUrl={`/services`}
                    />
                </div>
            )}

            {/* Location Links */}
            {sv.localities !== false && dynamicSettings?.localities && (
                <div id="areas">
                    <LocationLinks
                        title={dynamicSettings?.localities_title || "Serving All Areas"}
                        subtitle={dynamicSettings?.localities_subtitle || "Professional service at your doorstep"}
                        dynamicLocalities={dynamicSettings.localities}
                    />
                </div>
            )}

            {/* How It Works */}
            <div id="how-it-works">
                <HowItWorksGrid
                    title="How It Works"
                    subtitle="Get your appliance fixed in 4 simple steps"
                />
            </div>

            {/* Why Choose Us */}
            <div id="why-us">
                <WhyChooseUs
                    title={`Why Choose Us for ${serviceName} Repair in ${locationName}?`}
                    subtitle="Local experts with premium service quality"
                />
            </div>

            {/* Brand Logos */}
            {sv.brands !== false && (
                <div id="brands">
                    <BrandLogos
                        title={dynamicSettings?.brands_title || "All Brands Serviced"}
                        subtitle={dynamicSettings?.brands_subtitle || `We repair all major ${serviceName.toLowerCase()} brands`}
                        selectedBrandIds={dynamicSettings?.brandIds}
                    />
                </div>
            )}

            {/* Frequently Booked Services */}
            {sv.services !== false && (
                <div id="popular">
                    <FrequentlyBooked
                        title={dynamicSettings?.services_title || `Popular Services in ${locationName}`}
                        subtitle={dynamicSettings?.services_subtitle || "Most booked services in your area"}
                        dynamicServices={dynamicSettings?.services}
                    />
                </div>
            )}

            {/* FAQ Section */}
            {sv.faqs !== false && (
                <div id="faqs">
                    <FAQSection
                        title={dynamicSettings?.faqs_title || "Frequently Asked Questions"}
                        subtitle={dynamicSettings?.faqs_subtitle || `Common questions about ${serviceName.toLowerCase()} repair in ${locationName}`}
                        faqs={faqs}
                    />
                </div>
            )}

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
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
