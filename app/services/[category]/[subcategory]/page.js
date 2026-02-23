import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'

export const dynamic = 'force-dynamic'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksSection from '@/components/homepage/HowItWorksSection'
import WhyChooseUsSection from '@/components/homepage/WhyChooseUsSection'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import Header from '@/components/common/Header'
import ServiceFooter from '@/components/services/ServiceFooter'
import { subcategoriesByCategory } from '@/data/servicePageContent'
import { getProblems } from '@/data/commonProblems'
import { getFAQs } from '@/data/faqs'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function SubCategoryPage({ params }) {
    const { category, subcategory } = params

    // Format names for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-category page
    const pageId = `sub-${category}-${subcategory}`

    // ── Fetch dynamic settings from Supabase ──────────────────────────────────
    let dynamicSettings = null
    const supabase = createServerSupabase()

    if (supabase) {
        try {
            const { data: pageSettings, error: pageError } = await supabase
                .from('page_settings')
                .select('*')
                .eq('page_id', pageId)
                .single()

            console.log(`[LIVE DEBUG] Subcat PageID: ${pageId}, Found: ${!!pageSettings}`);

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
                    problems: (problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                    localities: (localities || []).map(l => l.locality_name),
                    services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                    faqs: (faqsMapping || [])
                        .filter(f => f.website_faqs)
                        .map(f => ({ question: f.website_faqs.question, answer: f.website_faqs.answer })),
                    brandIds: brandsMapping?.map(m => m.brand_id) || [],
                    sectionVisibility: pageSettings.section_visibility || {},

                    // Title/Subtitle Overrides
                    problems_title: pageSettings.problems_settings?.title,
                    problems_subtitle: pageSettings.problems_settings?.subtitle,
                    services_title: pageSettings.services_settings?.title,
                    services_subtitle: pageSettings.services_settings?.subtitle,
                    localities_title: pageSettings.localities_settings?.title,
                    localities_subtitle: pageSettings.localities_settings?.subtitle,
                    brands_title: pageSettings.brands_settings?.title,
                    brands_subtitle: pageSettings.brands_settings?.subtitle,
                    faqs_title: pageSettings.faqs_settings?.title,
                    faqs_subtitle: pageSettings.faqs_settings?.subtitle
                }

                if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                    const { data: globalFaqs } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                    if (globalFaqs?.length > 0) {
                        dynamicSettings.faqs = globalFaqs.map(f => ({ question: f.question, answer: f.answer }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching sub-category dynamic settings:', error)
        }
    }

    // ── Fallbacks to static data if no dynamic settings exist ─────────────────
    const allSubcategories = subcategoriesByCategory[category] || []
    const siblingSubcategories = allSubcategories.filter(sub => sub.slug !== subcategory)

    const problemsTitle = dynamicSettings?.problems_title || `${subcategoryName} Problems We Fix`
    const problemsSubtitle = dynamicSettings?.problems_subtitle || 'Common issues with your appliance'
    const problems = (dynamicSettings?.problems?.length > 0) ? dynamicSettings.problems : getProblems(category, subcategory)
    const faqs = (dynamicSettings?.faqs?.length > 0) ? dynamicSettings.faqs : getFAQs(category)

    const sv = dynamicSettings?.sectionVisibility || {}

    return (
        <div className="service-page subcategory-page">
            <Header />
            {/* Hero Section */}
            {sv.hero !== false && (
                <HeroSection
                    title={`${subcategoryName} Repair Solutions In Mumbai`}
                    subtitle={`Expert ${subcategoryName.toLowerCase()} repair and maintenance`}
                    category={category}
                    heroSettings={dynamicSettings?.heroSettings || null}
                />
            )}

            {/* Quick Booking Form - Pre-filled */}
            <div id="booking">
                <QuickBookingEmbed preSelectedCategory={category} />
            </div>

            {/* Related Services / Category Cards */}
            {sv.subcategories !== false && (
                <div id="services">
                    <CategoryCards
                        title={dynamicSettings?.subcategories_title || `Other ${categoryName} Services`}
                        subtitle={dynamicSettings?.subcategories_subtitle || "Explore our complete range of services"}
                        cards={(dynamicSettings?.subcategories?.length > 0) ? dynamicSettings.subcategories : siblingSubcategories}
                        baseUrl={`/services/${category}`}
                    />
                </div>
            )}

            {/* Problems We Solve - Subcategory Specific */}
            {sv.problems !== false && (
                <div id="problems">
                    <ProblemsSection
                        title={problemsTitle}
                        subtitle={problemsSubtitle}
                        problems={problems}
                    />
                </div>
            )}

            {/* How It Works - Standardized */}
            <div id="how-it-works">
                <HowItWorksSection
                    title="How It Works"
                    subtitle="Your appliance fixed in 4 simple steps"
                />
            </div>

            {/* Why Choose Us - Standardized */}
            <div id="why-us">
                <WhyChooseUsSection
                    title="Why Choose SORTED?"
                    subtitle="Premium service you can trust"
                />
            </div>

            {/* Brand Logos */}
            {sv.brands !== false && (
                <div id="brands">
                    <BrandLogos
                        title={dynamicSettings?.brands_title || "Authorized Service Provider"}
                        subtitle={dynamicSettings?.brands_subtitle || "We service all major brands"}
                        selectedBrandIds={dynamicSettings?.brandIds}
                    />
                </div>
            )}

            {/* Location Links */}
            {sv.localities !== false && (
                <div id="areas">
                    <LocationLinks
                        title={dynamicSettings?.localities_title || "Service Available Across Mumbai"}
                        subtitle={dynamicSettings?.localities_subtitle || "We're in your neighborhood"}
                        category={subcategoryName}
                        dynamicLocalities={dynamicSettings?.localities}
                    />
                </div>
            )}

            {/* Frequently Booked Services */}
            {sv.services !== false && (
                <div id="popular">
                    <FrequentlyBooked
                        title={dynamicSettings?.services_title || "Popular Services"}
                        subtitle={dynamicSettings?.services_subtitle || "Most booked by customers like you"}
                        dynamicServices={dynamicSettings?.services}
                    />
                </div>
            )}

            {/* FAQ Section */}
            {sv.faqs !== false && (
                <div id="faqs">
                    <FAQSection
                        title={dynamicSettings?.faqs_title || "Frequently Asked Questions"}
                        subtitle={dynamicSettings?.faqs_subtitle || `Everything you need to know about ${subcategoryName.toLowerCase()} repair`}
                        faqs={faqs}
                    />
                </div>
            )}

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all subcategories
export async function generateStaticParams() {
    // Fetch subcategories from DB so new appliances added via admin are included at build time
    const supabase = createServerSupabase()
    if (!supabase) return [];

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
