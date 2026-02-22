import { createServerSupabase } from '@/lib/supabase-server'
import HeroSection from '@/components/services/HeroSection'

export const dynamic = 'force-dynamic'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksTimeline from '@/components/services/HowItWorksTimeline'
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

export default async function CategoryPage({ params }) {
    const { category } = params
    const pageId = `cat-${category}`

    // Format category name for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // 1. Fetch Dynamic Data from Supabase
    let dynamicSettings = null;
    const supabase = createServerSupabase();

    if (!supabase) {
        console.error('[LIVE DEBUG] Supabase client not initialized');
    } else {
        try {
            const { data: pageSettings, error: pageError } = await supabase
                .from('page_settings')
                .select('*')
                .eq('page_id', pageId)
                .single();

            console.log(`[LIVE DEBUG] PageID: ${pageId}, Found: ${!!pageSettings}`);
            if (pageError && pageError.code !== 'PGRST116') {
                console.error('[LIVE DEBUG] DB Error:', pageError);
            }

            if (pageSettings) {
                // Fetch related data
                const [
                    { data: problems },
                    { data: services },
                    { data: localities },
                    { data: brandMappings },
                    { data: faqMappings }
                ] = await Promise.all([
                    supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                    supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                    supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                    supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
                    supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId)
                ]);

                console.log(`[LIVE DEBUG] Fetched for ${pageId}:`, {
                    problems: problems?.length || 0,
                    services: services?.length || 0,
                    localities: localities?.length || 0,
                    brandMappings: brandMappings?.length || 0,
                    faqMappings: faqMappings?.length || 0
                });

                // Map data to component formats
                dynamicSettings = {
                    heroSettings: pageSettings.hero_settings,
                    problems: problems?.length > 0 ? problems.map(h => h.problem_title) : null,
                    services: services?.length > 0 ? services.map(s => ({ name: s.service_name, price: s.price_starts_at })) : null,
                    localities: localities?.length > 0 ? localities.map(l => l.locality_name) : null,
                    brandIds: brandMappings?.map(m => m.brand_id) || [],
                    faqIds: faqMappings?.map(m => m.faq_id) || [],

                    // New Subcategories Mapping
                    subcategories: pageSettings.subcategories_settings?.items?.length > 0 ? pageSettings.subcategories_settings.items : null,
                    subcategoriesTitle: pageSettings.subcategories_settings?.title,
                    subcategoriesSubtitle: pageSettings.subcategories_settings?.subtitle,

                    // Section Title/Subtitle overrides
                    problems_title: pageSettings.problems_settings?.title,
                    problems_subtitle: pageSettings.problems_settings?.subtitle,
                    services_title: pageSettings.services_settings?.title,
                    services_subtitle: pageSettings.services_settings?.subtitle,
                    localities_title: pageSettings.localities_settings?.title,
                    localities_subtitle: pageSettings.localities_settings?.subtitle,

                    // Section visibility flags (default true if not set)
                    sectionVisibility: pageSettings.section_visibility || {}
                };

                // Fetch specific brand and FAQ objects if we have IDs
                if (dynamicSettings.faqIds.length > 0) {
                    const { data: fullFaqs } = await supabase.from('website_faqs').select('*').in('id', dynamicSettings.faqIds);
                    dynamicSettings.faqs = fullFaqs?.map(f => ({ question: f.question, answer: f.answer }));
                } else {
                    // Fallback to Global FAQs if none selected specifically
                    const { data: globalFaqs } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                    if (globalFaqs?.length > 0) {
                        dynamicSettings.faqs = globalFaqs.map(f => ({ question: f.question, answer: f.answer }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching dynamic settings:', error);
        }
    }

    // 2. Fallbacks to hardcoded data
    const subcategories = dynamicSettings?.subcategories || subcategoriesByCategory[category] || []
    const problems = dynamicSettings?.problems || getProblems(category)
    const faqs = dynamicSettings?.faqs || getFAQs(category)
    // Localities and Brands we'll pass to components (they need to handle dynamic IDs or default behavior)

    const sv = dynamicSettings?.sectionVisibility || {}

    return (
        <div className="service-page category-page">
            <Header />
            {/* Hero Section with Gradient Background */}
            {sv.hero !== false && (
                <HeroSection
                    title={`${categoryName} Solutions In Mumbai`}
                    subtitle="Expert technicians • Same-day service • 90-day warranty"
                    category={category}
                    heroSettings={dynamicSettings?.heroSettings}
                />
            )}

            {/* Quick Booking Form - Pre-filled with category */}
            <QuickBookingEmbed preSelectedCategory={category} />

            {/* Sub-Categories Grid with Images */}
            {sv.subcategories !== false && (
                <CategoryCards
                    title={dynamicSettings?.subcategoriesTitle || `${categoryName} Services`}
                    subtitle={dynamicSettings?.subcategoriesSubtitle || "Choose your specific appliance type"}
                    cards={subcategories}
                    baseUrl={`/services/${category}`}
                />
            )}

            {/* Problems We Solve - SEO Important */}
            {sv.problems !== false && (
                <ProblemsSection
                    title={dynamicSettings?.problems_title || "We Solve All The Problems"}
                    subtitle={dynamicSettings?.problems_subtitle || `Common ${categoryName.toLowerCase()} issues we fix`}
                    problems={problems}
                />
            )}

            {/* How It Works - Timeline Variant (Layout A) */}
            <HowItWorksTimeline
                title="How It Works"
                subtitle="Get your appliance fixed in 4 simple steps"
            />

            {/* Why Choose Us - Features Panel */}
            <WhyChooseUs
                title="Why Choose Us?"
                subtitle="Experience the difference with our premium services"
            />

            {/* Brand Logos */}
            {sv.brands !== false && (
                <BrandLogos
                    title="Brands We Serve"
                    subtitle="Trusted by leading appliance manufacturers"
                    selectedBrandIds={dynamicSettings?.brandIds}
                />
            )}

            {/* Location Links */}
            {sv.localities !== false && (
                <LocationLinks
                    title={dynamicSettings?.localities_title || "We are Right In your Neighbourhood"}
                    subtitle={dynamicSettings?.localities_subtitle || "Find us in your area"}
                    category={categoryName}
                    dynamicLocalities={dynamicSettings?.localities}
                />
            )}

            {/* Frequently Booked Services Carousel */}
            {sv.services !== false && (
                <FrequentlyBooked
                    title={dynamicSettings?.services_title || "Frequently Booked Services"}
                    subtitle={dynamicSettings?.services_subtitle || "Popular services in your area"}
                    dynamicServices={dynamicSettings?.services}
                />
            )}

            {/* FAQ Section - Category Specific */}
            {sv.faqs !== false && (
                <FAQSection
                    title="Frequently Asked Questions"
                    subtitle={`Common questions about ${categoryName.toLowerCase()} repair`}
                    faqs={faqs}
                />
            )}

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all categories
export async function generateStaticParams() {
    return [
        { category: 'ac-repair' },
        { category: 'refrigerator-repair' },
        { category: 'oven-repair' },
        { category: 'hob-repair' },
        { category: 'washing-machine-repair' },
        { category: 'water-purifier-repair' },
    ]
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { category } = params
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `${categoryName} Repair in Mumbai | Same Day Service | SORTED`,
        description: `Expert ${categoryName} repair in Mumbai. Transparent pricing, licensed technicians, 90-day warranty. Book now! ☎ +91-8928895590`,
        keywords: `${categoryName} repair Mumbai, ${categoryName} service, appliance repair near me`,
        openGraph: {
            title: `${categoryName} Repair in Mumbai`,
            description: `Same day ${categoryName} repair service in Mumbai`,
        },
    }
}
