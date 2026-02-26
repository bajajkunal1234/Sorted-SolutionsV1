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
import Header from '@/components/common/Header'
import ServiceFooter from '@/components/services/ServiceFooter'
import { subcategoriesByCategory } from '@/data/servicePageContent'
import { getProblems } from '@/data/commonProblems'
import { getFAQs } from '@/data/faqs'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'
import { unstable_noStore as noStore } from 'next/cache';

export default async function CategoryPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { category } = params
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this category page
    const pageId = `cat-${category}`

    // ── Fetch dynamic settings from Supabase ──────────────────────────────────
    let dynamicSettings = null
    const supabase = createServerSupabase();
    if (!supabase) return null;

    try {
        console.log(`[LIVE DEBUG] Category PageID: ${pageId} fetching via SDK(noStore)`);

        const { data: pageSettings, error: pageError } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .maybeSingle();

        if (pageError) console.error(`[CategoryPage] page_settings fetch error for ${pageId}:`, pageError.message);
        console.log(`[CategoryPage] pageId=${pageId} found=${!!pageSettings}`);

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

                // Section Title/Subtitle overrides
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
                const { data: globalFaqs } = await supabase.from('website_faqs').select('*').order('display_order', { ascending: true }).limit(5);
                if (globalFaqs?.length > 0) {
                    dynamicSettings.faqs = globalFaqs.map(f => ({ question: f.question, answer: f.answer }));
                }
            }
        }
    } catch (error) {
        console.error('Error fetching dynamic settings for category:', error);
    }

    // 2. Fallbacks to hardcoded data
    const subcategories = (dynamicSettings?.subcategories?.length > 0) ? dynamicSettings.subcategories : (subcategoriesByCategory[category] || []);
    const problems = (dynamicSettings?.problems?.length > 0) ? dynamicSettings.problems : getProblems(category);
    const faqs = (dynamicSettings?.faqs?.length > 0) ? dynamicSettings.faqs : getFAQs(category);
    // Localities and Brands we'll pass to components (they need to handle dynamic IDs or default behavior)

    // 3. Build clickable issues list from issues_settings
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
        console.error('[CategoryPage] Failed to resolve issues:', err)
    }

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
                        title={dynamicSettings?.hero_title || `${categoryName} Solutions In Mumbai`}
                        subtitle={dynamicSettings?.hero_subtitle || "Expert technicians • Same-day service • 90-day warranty"}
                        category={category}
                        heroSettings={dynamicSettings?.heroSettings}
                    />
                );
            case 'booking':
                return sv.booking !== false && (
                    <div id="booking" key="booking">
                        <QuickBookingEmbed preSelectedCategory={category} />
                    </div>
                );
            case 'subcategories':
                return sv.subcategories !== false && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategoriesTitle || `${categoryName} Services`}
                            subtitle={dynamicSettings?.subcategoriesSubtitle || "Choose your specific appliance type"}
                            cards={subcategories}
                            baseUrl={`/ services / ${category} `}
                        />
                    </div>
                );
            case 'problems':
                return sv.problems !== false && (
                    <div id="problems" key="problems">
                        <ProblemsSection
                            title={dynamicSettings?.problems_title || "We Solve All The Problems"}
                            subtitle={dynamicSettings?.problems_subtitle || `Common ${categoryName.toLowerCase()} issues we fix`}
                            problems={problems}
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
                            title={dynamicSettings?.why_us_title || "Why Choose Us?"}
                            subtitle={dynamicSettings?.why_us_subtitle || "Experience the difference with our premium services"}
                        />
                    </div>
                );
            case 'brands':
                return sv.brands !== false && (
                    <div id="brands" key="brands">
                        <BrandLogos
                            title={dynamicSettings?.brands_title || "Brands We Serve"}
                            subtitle={dynamicSettings?.brands_subtitle || "Trusted by leading appliance manufacturers"}
                            selectedBrandIds={dynamicSettings?.brandIds}
                        />
                    </div>
                );
            case 'localities':
                return sv.localities !== false && (
                    <div id="areas" key="localities">
                        <LocationLinks
                            title={dynamicSettings?.localities_title || "We are Right In your Neighbourhood"}
                            subtitle={dynamicSettings?.localities_subtitle || "Find us in your area"}
                            category={categoryName}
                            dynamicLocalities={dynamicSettings?.localities}
                        />
                    </div>
                );
            case 'services':
                return sv.services !== false && (
                    <div id="popular" key="services">
                        <FrequentlyBooked
                            title={dynamicSettings?.services_title || "Frequently Booked Services"}
                            subtitle={dynamicSettings?.services_subtitle || "Popular services in your area"}
                            dynamicServices={dynamicSettings?.services}
                        />
                    </div>
                );
            case 'faqs':
                return sv.faqs !== false && (
                    <div id="faqs" key="faqs">
                        <FAQSection
                            title={dynamicSettings?.faqs_title || "Frequently Asked Questions"}
                            subtitle={dynamicSettings?.faqs_subtitle || `Common questions about ${categoryName.toLowerCase()} repair`}
                            faqs={faqs}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="service-page category-page">
            <Header />
            {sectionOrder.map(renderSection)}
            <ServiceFooter />
        </div>
    );
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
        description: `Expert ${categoryName} repair in Mumbai.Transparent pricing, licensed technicians, 90 - day warranty.Book now! ☎ +91 - 8928895590`,
        keywords: `${categoryName} repair Mumbai, ${categoryName} service, appliance repair near me`,
        openGraph: {
            title: `${categoryName} Repair in Mumbai`,
            description: `Same day ${categoryName} repair service in Mumbai`,
        },
    }
}
