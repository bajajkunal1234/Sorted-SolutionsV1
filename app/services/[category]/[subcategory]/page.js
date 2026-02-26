import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import IssuesSection from '@/components/services/IssuesSection'

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
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'

import { unstable_noStore as noStore } from 'next/cache';

export default async function SubCategoryPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { category, subcategory } = params

    // Format names for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-category page
    const pageId = `sub-${category}-${subcategory}`

    // ── Fetch dynamic settings from Supabase ──────────────────────────────────
    let dynamicSettings = null
    const supabase = createServerSupabase();
    if (!supabase) return null;

    try {
        console.log(`[LIVE DEBUG] Subcat PageID: ${pageId} fetching via SDK (noStore)`);

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
                { data: faqMappings }
            ] = await Promise.all([
                supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
                supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
                supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId).order('display_order', { ascending: true })
            ]);

            // Two-step FAQ fetch: IDs → content (avoids relying on FK join)
            let resolvedFaqs = []
            if (faqMappings?.length > 0) {
                const faqIds = faqMappings.map(f => f.faq_id)
                const { data: faqRows } = await supabase.from('website_faqs').select('id, question, answer').in('id', faqIds)
                if (faqRows?.length > 0) {
                    // Preserve display_order from mappings
                    resolvedFaqs = faqIds
                        .map(id => faqRows.find(f => f.id === id))
                        .filter(Boolean)
                        .map(f => ({ question: f.question, answer: f.answer }))
                }
            }

            dynamicSettings = {
                heroSettings: pageSettings.hero_settings,
                problems: (problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                services: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                localities: (localities || []).map(l => l.locality_name),
                brandIds: brandMappings?.map(m => m.brand_id) || [],
                faqs: resolvedFaqs,
                issuesSettings: pageSettings.issues_settings || null,

                // Section Mapping
                subcategories: pageSettings.subcategories_settings?.items?.length > 0 ? pageSettings.subcategories_settings.items : null,
                subcategoriesTitle: pageSettings.subcategories_settings?.title,
                subcategoriesSubtitle: pageSettings.subcategories_settings?.subtitle,

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

            // Fallback to Global FAQs only if no page-specific FAQs selected
            if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                const { data: globalFaqData } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                if (globalFaqData?.length > 0) {
                    dynamicSettings.faqs = globalFaqData.map(f => ({ question: f.question, answer: f.answer }));
                }
            }
        }
    } catch (error) {
        console.error('Error fetching dynamic settings for subcategory:', error);
    }

    // ── Fallbacks to static data if no dynamic settings exist ─────────────────
    const allSubcategories = subcategoriesByCategory[category] || []
    const siblingSubcategories = allSubcategories.filter(sub => sub.slug !== subcategory)

    const problemsTitle = dynamicSettings?.problems_title || `${subcategoryName} Problems We Fix`
    const problemsSubtitle = dynamicSettings?.problems_subtitle || 'Common issues with your appliance'
    const problems = (dynamicSettings?.problems?.length > 0) ? dynamicSettings.problems : getProblems(category, subcategory)
    const faqs = (dynamicSettings?.faqs?.length > 0) ? dynamicSettings.faqs : getFAQs(category)

    // ── Build clickable issues list from issues_settings ──────────────────────
    // Resolve saved issue IDs to full objects using booking data (direct DB call)
    let resolvedIssues = []
    const issuesSettings = dynamicSettings?.issuesSettings
    if (issuesSettings?.items?.length > 0) {
        try {
            const qbData = await fetchQuickBookingData()
            if (qbData?.categories) {
                const idSet = new Set(issuesSettings.items.map(Number))
                for (const cat of qbData.categories) {
                    for (const sub of (cat.subcategories || [])) {
                        for (const issue of (sub.issues || [])) {
                            if (idSet.has(Number(issue.id))) {
                                resolvedIssues.push({
                                    id: issue.id,
                                    name: issue.name,
                                    categoryId: cat.id,
                                    subcategoryId: sub.id
                                })
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[SubCategoryPage] Failed to resolve issues:', err)
        }
    }

    const sv = dynamicSettings?.sectionVisibility || {}
    const sectionOrder = dynamicSettings?.section_order || [
        'hero', 'booking', 'issues', 'subcategories', 'problems',
        'how_it_works', 'why_us', 'brands', 'localities', 'services', 'faqs'
    ];

    const renderSection = (key) => {
        switch (key) {
            case 'hero':
                return sv.hero !== false && (
                    <HeroSection
                        key="hero"
                        title={`${subcategoryName} Repair Solutions In Mumbai`}
                        subtitle={`Expert ${subcategoryName.toLowerCase()} repair and maintenance`}
                        category={category}
                        heroSettings={dynamicSettings?.heroSettings || null}
                    />
                );
            case 'booking':
                return sv.booking !== false && (
                    <div id="booking" key="booking">
                        <QuickBookingEmbed preSelectedCategory={category} />
                    </div>
                );
            case 'issues':
                return sv.issues !== false && resolvedIssues.length > 0 && (
                    <IssuesSection
                        key="issues"
                        title={issuesSettings?.title || 'Common Issues We Fix'}
                        subtitle={issuesSettings?.subtitle || 'Click any issue to book a repair instantly'}
                        issues={resolvedIssues}
                    />
                );
            case 'subcategories':
                return sv.subcategories !== false && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategories_title || `Other ${categoryName} Services`}
                            subtitle={dynamicSettings?.subcategories_subtitle || "Explore our complete range of services"}
                            cards={(dynamicSettings?.subcategories?.length > 0) ? dynamicSettings.subcategories : siblingSubcategories}
                            baseUrl={`/services/${category}`}
                        />
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
            case 'how_it_works':
                return sv.how_it_works !== false && (
                    <div id="how-it-works" key="how_it_works">
                        <HowItWorksSection
                            title="How It Works"
                            subtitle="Your appliance fixed in 4 simple steps"
                        />
                    </div>
                );
            case 'why_us':
                return sv.why_us !== false && (
                    <div id="why-us" key="why_us">
                        <WhyChooseUsSection
                            title="Why Choose SORTED?"
                            subtitle="Premium service you can trust"
                        />
                    </div>
                );
            case 'brands':
                return sv.brands !== false && (
                    <div id="brands" key="brands">
                        <BrandLogos
                            title={dynamicSettings?.brands_title || "Authorized Service Provider"}
                            subtitle={dynamicSettings?.brands_subtitle || "We service all major brands"}
                            selectedBrandIds={dynamicSettings?.brandIds}
                        />
                    </div>
                );
            case 'localities':
                return sv.localities !== false && (
                    <div id="areas" key="localities">
                        <LocationLinks
                            title={dynamicSettings?.localities_title || "Service Available Across Mumbai"}
                            subtitle={dynamicSettings?.localities_subtitle || "We're in your neighborhood"}
                            category={subcategoryName}
                            dynamicLocalities={dynamicSettings?.localities}
                        />
                    </div>
                );
            case 'services':
                return sv.services !== false && (
                    <div id="popular" key="services">
                        <FrequentlyBooked
                            title={dynamicSettings?.services_title || "Popular Services"}
                            subtitle={dynamicSettings?.services_subtitle || "Most booked by customers like you"}
                            dynamicServices={dynamicSettings?.services}
                        />
                    </div>
                );
            case 'faqs':
                return sv.faqs !== false && (
                    <div id="faqs" key="faqs">
                        <FAQSection
                            title={dynamicSettings?.faqs_title || "Frequently Asked Questions"}
                            subtitle={dynamicSettings?.faqs_subtitle || `Everything you need to know about ${subcategoryName.toLowerCase()} repair`}
                            faqs={faqs}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="service-page subcategory-page">
            <Header />
            {sectionOrder.map(renderSection)}
            <ServiceFooter />
        </div>
    );
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
