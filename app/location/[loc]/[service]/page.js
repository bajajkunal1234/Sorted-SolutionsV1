import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksGrid from '@/components/services/HowItWorksGrid'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import Header from '@/components/common/Header'
import { getFAQs } from '@/data/faqs'
import { supabase } from '@/lib/supabase'

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
    try {
        const { data: pageSettings } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .single()

        if (pageSettings) {
            const [
                { data: problems },
                { data: services },
                { data: faqsMapping }
            ] = await Promise.all([
                supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_faqs_mapping')
                    .select('faq_id, website_faqs(question, answer)')
                    .eq('page_id', pageId)
                    .order('display_order', { ascending: true })
            ])

            dynamicSettings = {
                heroSettings: pageSettings.hero_settings || null,
                problemsSettings: pageSettings.problems_settings,
                servicesSettings: pageSettings.services_settings,
                problems: (problems || []).map(p => ({ question: p.problem_title, answer: p.problem_description })),
                services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                faqs: (faqsMapping || [])
                    .filter(f => f.website_faqs)
                    .map(f => ({ question: f.website_faqs.question, answer: f.website_faqs.answer }))
            }
        }
    } catch (error) {
        console.error('Error fetching sub-location dynamic settings:', error)
    }

    // ── Fallbacks ────────────────────────────────────────────────────────────
    const problemsTitle = dynamicSettings?.problemsSettings?.title
        || `${serviceName} Problems We Solve in ${locationName}`
    const problemsSubtitle = dynamicSettings?.problemsSettings?.subtitle
        || `Common ${serviceName.toLowerCase()} issues we fix in ${locationName}`

    const problems = dynamicSettings?.problems?.length
        ? dynamicSettings.problems
        : [
            { question: `${serviceName} not working properly`, answer: 'Our technicians diagnose and fix all failure types.' },
            { question: 'Making unusual noise', answer: 'We identify and resolve all mechanical sound issues.' },
            { question: 'Performance issues', answer: 'We restore optimal performance through comprehensive service.' },
            { question: 'Electrical problems', answer: 'Our certified technicians handle all electrical faults safely.' },
            { question: 'Need regular maintenance', answer: 'We offer preventive care to extend your appliance lifespan.' }
        ]

    const faqs = dynamicSettings?.faqs?.length ? dynamicSettings.faqs : getFAQs('ac-repair').slice(0, 5)

    return (
        <div className="service-page sub-location-page">
            <Header />
            {/* Hero Section */}
            <HeroSection
                title={`${serviceName} Repair in ${locationName}`}
                subtitle={`Expert ${serviceName.toLowerCase()} repair services • Same-day service • All brands`}
                category={service}
                location={locationName}
                heroSettings={dynamicSettings?.heroSettings || null}
            />

            {/* Quick Booking Form */}
            <QuickBookingEmbed preSelectedCategory={service} />

            {/* Common Problems */}
            <ProblemsSection
                title={problemsTitle}
                subtitle={problemsSubtitle}
                problems={problems}
            />

            {/* How It Works */}
            <HowItWorksGrid
                title="How It Works"
                subtitle="Get your appliance fixed in 4 simple steps"
            />

            {/* Why Choose Us */}
            <WhyChooseUs
                title={`Why Choose Us for ${serviceName} Repair in ${locationName}?`}
                subtitle="Local experts with premium service quality"
            />

            {/* Brand Logos */}
            <BrandLogos
                title="All Brands Serviced"
                subtitle={`We repair all major ${serviceName.toLowerCase()} brands`}
            />

            {/* Frequently Booked Services */}
            <FrequentlyBooked
                title={`Popular Services in ${locationName}`}
                subtitle="Most booked services in your area"
            />

            {/* FAQ Section */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle={`Common questions about ${serviceName.toLowerCase()} repair in ${locationName}`}
                faqs={faqs}
            />

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all location × service combinations
export async function generateStaticParams() {
    // Fetch live appliance slugs from DB so new appliances are included at build
    try {
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
