import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import IssuesSection from '@/components/services/IssuesSection'
import ServicesGrid from '@/components/services/ServicesGrid'

export const dynamic = 'force-dynamic'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksSection from '@/components/homepage/HowItWorksSection'
import WhyChooseUsSection from '@/components/homepage/WhyChooseUsSection'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import OtherLocationsSection from '@/components/services/OtherLocationsSection'
import Header from '@/components/common/Header'
import ServiceFooter from '@/components/services/ServiceFooter'

import { createServerSupabase } from '@/lib/supabase-server'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'

import { unstable_noStore as noStore } from 'next/cache';
import { getFullPageData, resolveFaqs } from '@/lib/data/pageSettings';

export default async function SubCategoryPage({ params }) {
    noStore(); // Opt out of caching to ensure real-time Admin updates
    const { category, subcategory } = params

    // Format names for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this sub-category page
    const pageId = `sub-${category}-${subcategory}`

    // ── Fetch dynamic settings via internal API (avoids Supabase SDK issues in Server Components) ──
    let dynamicSettings = null

    try {
        console.log(`[SubcatPage] Fetching settings for ${pageId} natively`);
        const apiData = await getFullPageData(pageId);

        if (apiData.success && apiData.data) {
            const d = apiData.data;
            const r = apiData.related || {};

            // Resolve FAQs via internal DB query
            let resolvedFaqsList = [];
            if (r.faqIds?.length > 0) {
                const faqRes = await resolveFaqs(r.faqIds);
                if (faqRes.success) resolvedFaqsList = faqRes.faqs;
            }

            dynamicSettings = {
                heroSettings: d.hero_settings,
                problems: (r.problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                services: (r.services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                localities: (r.localities || []).map(l => l.locality_name),
                brandIds: r.brandIds || [],
                faqs: resolvedFaqsList,
                issuesSettings: d.issues_settings || null,
                servicesSettings: d.services_settings || null,

                subcategories: d.subcategories_settings?.items?.length > 0 ? d.subcategories_settings.items : null,
                subcategoriesTitle: d.subcategories_settings?.title,
                subcategoriesSubtitle: d.subcategories_settings?.subtitle,

                hero_title: d.hero_settings?.title,
                hero_subtitle: d.hero_settings?.subtitle,
                problems_title: d.problems_settings?.title,
                problems_subtitle: d.problems_settings?.subtitle,
                services_title: d.services_settings?.title,
                services_subtitle: d.services_settings?.subtitle,
                localities_title: d.localities_settings?.title,
                localities_subtitle: d.localities_settings?.subtitle,
                brands_title: d.brands_settings?.title,
                brands_subtitle: d.brands_settings?.subtitle,
                faqs_title: d.faqs_settings?.title,
                faqs_subtitle: d.faqs_settings?.subtitle,
                how_it_works_title: d.how_it_works_settings?.title,
                how_it_works_subtitle: d.how_it_works_settings?.subtitle,
                why_us_title: d.why_us_settings?.title,
                why_us_subtitle: d.why_us_settings?.subtitle,
                other_locations_title: d.other_locations_settings?.title,
                other_locations_subtitle: d.other_locations_settings?.subtitle,
                other_locations: d.other_locations_settings?.items || [],
                section_order: d.section_order,

                sectionVisibility: d.section_visibility || {}
            };

            // Fallback to Global FAQs natively
            if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                // To avoid another HTTP loopback for Global FAQs, 
                // we'll just let the static getFAQs fallback handle logic below if needed
            }
        }
    } catch (error) {
        console.error('[SubcatPage] Error natively fetching settings:', error.message);
    }

    // Only use admin-configured data (Option B: no fallbacks)
    const problemsTitle = dynamicSettings?.problems_title || `${subcategoryName} Problems We Fix`
    const problemsSubtitle = dynamicSettings?.problems_subtitle || 'Common issues with your appliance'
    const problems = dynamicSettings?.problems || []
    const faqs = dynamicSettings?.faqs || []
    const subcategories = dynamicSettings?.subcategories || []

    // ── Build clickable issues list from issues_settings ──────────────────────
    let resolvedIssues = []
    let resolvedServices = []
    const issuesSettings = dynamicSettings?.issuesSettings
    const servicesSettings = dynamicSettings?.servicesSettings

    const needsQBData = (issuesSettings?.items?.length > 0) || (servicesSettings?.items?.length > 0)
    if (needsQBData) {
        try {
            const qbData = await fetchQuickBookingData()
            if (qbData?.categories) {
                // Resolve Issues
                // items can be plain IDs (legacy) or rich objects { id, price, description, image }
                if (issuesSettings?.items?.length > 0) {
                    const itemsMap = new Map()
                    for (const item of issuesSettings.items) {
                        if (typeof item === 'object' && item !== null) {
                            itemsMap.set(Number(item.id), item)
                        } else {
                            itemsMap.set(Number(item), {})
                        }
                    }
                    for (const cat of qbData.categories) {
                        for (const sub of (cat.subcategories || [])) {
                            for (const issue of (sub.issues || [])) {
                                const extraData = itemsMap.get(Number(issue.id))
                                if (extraData !== undefined) {
                                    // Price priority: per-page override → global booking price → ''
                                    const resolvedPrice = extraData.price
                                        || (issue.price != null
                                            ? `${issue.price_label || 'Starting from'} \u20B9${Number(issue.price).toLocaleString('en-IN')}`
                                            : '')
                                    resolvedIssues.push({
                                        id: issue.id,
                                        name: issue.name,
                                        categoryId: cat.id,
                                        subcategoryId: sub.id,
                                        price: resolvedPrice,
                                        description: extraData.description || '',
                                        image: extraData.image || ''
                                    })
                                }
                            }
                        }
                    }
                }
                // Resolve Services (same issues but with price)
                if (servicesSettings?.items?.length > 0) {
                    for (const cat of qbData.categories) {
                        for (const sub of (cat.subcategories || [])) {
                            for (const issue of (sub.issues || [])) {
                                const saved = servicesSettings.items.find(s => Number(s.id) === Number(issue.id))
                                if (saved) {
                                    resolvedServices.push({ id: issue.id, name: issue.name, price: saved.price || '', categoryId: cat.id, subcategoryId: sub.id, categorySlug: cat.slug, categoryName: cat.name })
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[SubCategoryPage] Failed to resolve issues/services:', err)
        }
    }

    const sv = dynamicSettings?.sectionVisibility || {}
    const defaultOrder = [
        'hero', 'booking', 'issues', 'subcategories', 'problems',
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
                return sv.subcategories !== false && subcategories.length > 0 && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategoriesTitle || `Other ${categoryName} Services`}
                            subtitle={dynamicSettings?.subcategoriesSubtitle || "Explore our complete range of services"}
                            cards={subcategories}
                            baseUrl={`/services/${category}`}
                        />
                    </div>
                );
            case 'problems':
                return sv.problems !== false && problems.length > 0 && (
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
                return sv.services !== false && resolvedServices.length > 0 && (
                    <div key="services">
                        <ServicesGrid
                            title={servicesSettings?.title || "Popular Services"}
                            subtitle={servicesSettings?.subtitle || "Click any service to book instantly"}
                            services={resolvedServices}
                            currentCategory={category}
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
                return sv.faqs !== false && faqs.length > 0 && (
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
