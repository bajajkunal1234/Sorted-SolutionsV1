import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'

export const dynamic = 'force-dynamic'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksGrid from '@/components/services/HowItWorksGrid'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import Header from '@/components/common/Header'
import ServiceFooter from '@/components/services/ServiceFooter'
import { subcategoriesByCategory } from '@/data/servicePageContent'
import { getProblems } from '@/data/commonProblems'
import { getFAQs } from '@/data/faqs'
import { supabase } from '@/lib/supabase'

export default async function SubCategoryPage({ params }) {
    const { category, subcategory } = params

    // Format names for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-category page
    const pageId = `sub-${category}-${subcategory}`

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
            ])

            dynamicSettings = {
                heroSettings: pageSettings.hero_settings || null,
                problemsSettings: pageSettings.problems_settings,
                problems: (problems || []).map(p => ({ question: p.problem_title, answer: p.problem_description })),
                localities: (localities || []).map(l => l.locality_name),
                services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                faqs: (faqsMapping || [])
                    .filter(f => f.website_faqs)
                    .map(f => ({ question: f.website_faqs.question, answer: f.website_faqs.answer }))
            }
        }
    } catch (error) {
        console.error('Error fetching sub-category dynamic settings:', error)
    }

    // ── Fallbacks to static data if no dynamic settings exist ─────────────────
    const allSubcategories = subcategoriesByCategory[category] || []
    const siblingSubcategories = allSubcategories.filter(sub => sub.slug !== subcategory)

    const problemsTitle = dynamicSettings?.problemsSettings?.title || `${subcategoryName} Problems We Fix`
    const problemsSubtitle = dynamicSettings?.problemsSettings?.subtitle || 'Common issues with your appliance'
    const problems = dynamicSettings?.problems?.length ? dynamicSettings.problems : getProblems(category, subcategory)
    const faqs = dynamicSettings?.faqs?.length ? dynamicSettings.faqs : getFAQs(category)

    return (
        <div className="service-page subcategory-page">
            <Header />
            {/* Hero Section */}
            <HeroSection
                title={`${subcategoryName} Repair Solutions In Mumbai`}
                subtitle={`Expert ${subcategoryName.toLowerCase()} repair and maintenance`}
                category={category}
                heroSettings={dynamicSettings?.heroSettings || null}
            />

            {/* Quick Booking Form - Pre-filled */}
            <QuickBookingEmbed preSelectedCategory={category} />

            {/* Sibling Subcategories */}
            {siblingSubcategories.length > 0 && (
                <CategoryCards
                    title={`Other ${categoryName} Services`}
                    subtitle="Explore our complete range of services"
                    cards={siblingSubcategories}
                    baseUrl={`/services/${category}`}
                />
            )}

            {/* Problems We Solve - Subcategory Specific */}
            <ProblemsSection
                title={problemsTitle}
                subtitle={problemsSubtitle}
                problems={problems}
            />

            {/* How It Works */}
            <HowItWorksGrid
                title="How It Works"
                subtitle="Your appliance fixed in 4 simple steps"
            />

            {/* Why Choose Us */}
            <WhyChooseUs
                title="Why Choose SORTED?"
                subtitle="Premium service you can trust"
            />

            {/* Brand Logos */}
            <BrandLogos
                title="Authorized Service Provider"
                subtitle="We service all major brands"
            />

            {/* Location Links */}
            <LocationLinks
                title="Service Available Across Mumbai"
                subtitle="We're in your neighborhood"
                category={subcategoryName}
            />

            {/* Frequently Booked Services */}
            <FrequentlyBooked
                title="Popular Services"
                subtitle="Most booked by customers like you"
            />

            {/* FAQ Section */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle={`Everything you need to know about ${subcategoryName.toLowerCase()} repair`}
                faqs={faqs}
            />

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all subcategories
export async function generateStaticParams() {
    // Fetch subcategories from DB so new appliances added via admin are included at build time
    try {
        const { data: categories } = await supabase
            .from('booking_categories')
            .select('slug')
        const { data: subcategories } = await supabase
            .from('booking_subcategories')
            .select('slug, booking_categories(slug)')

        if (subcategories && subcategories.length > 0) {
            return subcategories
                .filter(s => s.slug && s.booking_categories?.slug)
                .map(s => ({
                    category: s.booking_categories.slug,
                    subcategory: s.slug
                }))
        }
    } catch (e) {
        console.error('generateStaticParams subcategory error:', e)
    }

    // Fallback to hardcoded list
    return [
        { category: 'ac-repair', subcategory: 'window-ac' },
        { category: 'ac-repair', subcategory: 'split-ac' },
        { category: 'ac-repair', subcategory: 'cassette-ac' },
        { category: 'oven-repair', subcategory: 'microwave-oven' },
        { category: 'oven-repair', subcategory: 'otg-oven' },
        { category: 'oven-repair', subcategory: 'deck-oven' },
    ]
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { category, subcategory } = params
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `${subcategoryName} Repair in Mumbai | Expert Service | SORTED`,
        description: `Professional ${subcategoryName.toLowerCase()} repair service in Mumbai. Same day service, transparent pricing, 90-day warranty. Book now!`,
        keywords: `${subcategoryName} repair, ${subcategoryName} service Mumbai, ${categoryName} repair`,
    }
}
