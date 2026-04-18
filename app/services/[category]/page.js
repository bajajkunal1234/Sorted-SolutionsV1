import { createServerSupabase } from '@/lib/supabase-server'
import HeroSection from '@/components/services/HeroSection'
import ServicesGrid from '@/components/services/ServicesGrid'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
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
import AnchorScrollHandler from '@/components/common/AnchorScrollHandler'

import { fetchQuickBookingData } from '@/lib/data/quickBookingData'
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { getFullPageData, resolveFaqs } from '@/lib/data/pageSettings';

export default async function CategoryPage({ params }) {
    // Force dynamic — belt-and-suspenders: noStore() + headers() + revalidate=0
    noStore();
    headers(); // Reading headers opts this route into dynamic rendering at the Vercel routing layer
    const { category } = params
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Page ID for this category page
    const pageId = `cat-${category}`

    // ── Fetch dynamic settings via internal API (avoids Supabase SDK issues in Server Components) ──
    let dynamicSettings = null

    try {
        const apiData = await getFullPageData(pageId);
        if (apiData.success && apiData.data) {
            const d = apiData.data;
            const r = apiData.related || {};

            let resolvedFaqsList = [];
            if (r.faqIds?.length > 0) {
                const faqRes = await resolveFaqs(r.faqIds);
                if (faqRes.success) resolvedFaqsList = faqRes.faqs;
            }

            dynamicSettings = {
                servicesSettings: d.services_settings || null,
                heroSettings: d.hero_settings,
                problems: (r.problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                services: (r.services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                localities: (r.localities || []).map(l => l.locality_name),
                brandIds: r.brandIds || [],
                faqs: resolvedFaqsList,
                issuesSettings: d.issues_settings || null,
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
        }
    } catch (error) {
        console.error('[CategoryPage] Error natively fetching settings:', error.message);
    }

    // Only use admin-configured data (Option B: no fallbacks)
    const subcategories = dynamicSettings?.subcategories || [];
    const problems = dynamicSettings?.problems || [];
    const faqs = dynamicSettings?.faqs || [];
    const servicesSettings = dynamicSettings?.servicesSettings;

    // ── Map category names to their URL slugs (cat.slug is not populated in DB) ──
    const CAT_SLUG_MAP = {
        'Air Conditioner': 'ac-repair',
        'Washing Machine': 'washing-machine-repair',
        'Refrigerator': 'refrigerator-repair',
        'Oven': 'oven-repair',
        'HOB Top Stoves': 'hob-repair',
        'Water Purifier': 'water-purifier-repair',
    };

    // ── Resolve service issue IDs to full objects ──
    let resolvedServices = []
    if (servicesSettings?.items?.length > 0) {
        try {
            const qbData = await fetchQuickBookingData()
            if (qbData?.categories) {
                for (const cat of qbData.categories) {
                    for (const sub of (cat.subcategories || [])) {
                        for (const issue of (sub.issues || [])) {
                            const saved = servicesSettings.items.find(s => Number(s.id) === Number(issue.id))
                            if (saved) {
                                const derivedSlug = cat.slug || CAT_SLUG_MAP[cat.name] || null;
                                resolvedServices.push({ id: issue.id, name: issue.name, price: saved.price || '', tag: saved.tag || '', categoryId: cat.id, subcategoryId: sub.id, categorySlug: derivedSlug, categoryName: cat.name })
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[CategoryPage] Failed to resolve services:', err)
        }
    }

    const sv = dynamicSettings?.sectionVisibility || {}
    const defaultOrder = [
        'hero', 'booking', 'subcategories', 'problems',
        'how_it_works', 'why_us', 'brands', 'localities', 'services', 'other_locations', 'faqs'
    ];

    let sectionOrder = dynamicSettings?.section_order || defaultOrder;
    if (dynamicSettings?.section_order) {
        // Find missing sections (new sections added after user's last save)
        const missing = defaultOrder.filter(k => !sectionOrder.includes(k));
        if (missing.length > 0) sectionOrder = [...sectionOrder, ...missing];
    }

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
                return sv.subcategories !== false && subcategories.length > 0 && (
                    <div id="services" key="subcategories">
                        <CategoryCards
                            title={dynamicSettings?.subcategoriesTitle || `${categoryName} Services`}
                            subtitle={dynamicSettings?.subcategoriesSubtitle || "Choose your specific appliance type"}
                            cards={subcategories}
                            baseUrl={`/services/${category}`}
                        />
                    </div>
                );
            case 'problems':
                return sv.problems !== false && problems.length > 0 && (
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
            <AnchorScrollHandler />
            <Header />
            {sectionOrder.map(renderSection)}
            <ServiceFooter />
        </div>
    );
}

// NOTE: generateStaticParams intentionally removed.
// This page uses `force-dynamic` + noStore() — generateStaticParams causes Vercel to
// CDN-cache a static snapshot that goes stale and overrides admin-saved content.

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
