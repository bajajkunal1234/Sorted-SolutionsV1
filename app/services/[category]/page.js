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

    // ── Fetch dynamic settings via internal API (avoids Supabase SDK issues in Server Components) ──
    let dynamicSettings = null

    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/settings/page/${pageId}`, { cache: 'no-store' });
        if (res.ok) {
            const apiData = await res.json();
            if (apiData.success && apiData.data) {
                const d = apiData.data;
                const r = apiData.related || {};

                let resolvedFaqs = [];
                if (r.faqIds?.length > 0) {
                    try {
                        const faqRes = await fetch(`${baseUrl}/api/settings/faqs/by-ids`, {
                            method: 'POST', cache: 'no-store',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: r.faqIds })
                        });
                        if (faqRes.ok) {
                            const faqData = await faqRes.json();
                            if (faqData.faqs?.length > 0) {
                                resolvedFaqs = r.faqIds.map(id => faqData.faqs.find(f => f.id === id)).filter(Boolean).map(f => ({ question: f.question, answer: f.answer }));
                            }
                        }
                    } catch { /* ignore */ }
                }

                dynamicSettings = {
                    heroSettings: d.hero_settings,
                    problems: (r.problems || []).map(p => ({ title: p.problem_title, description: p.problem_description })),
                    services: (r.services || []).map(s => ({ name: s.service_name, price: s.price_starts_at })),
                    localities: (r.localities || []).map(l => l.locality_name),
                    brandIds: r.brandIds || [],
                    faqs: resolvedFaqs,
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
                    section_order: d.section_order,
                    sectionVisibility: d.section_visibility || {}
                };

                if (!dynamicSettings.faqs || dynamicSettings.faqs.length === 0) {
                    try {
                        const gfRes = await fetch(`${baseUrl}/api/settings/faqs/by-ids?limit=5`, { cache: 'no-store' });
                        if (gfRes.ok) { const gf = await gfRes.json(); if (gf.faqs?.length > 0) dynamicSettings.faqs = gf.faqs.map(f => ({ question: f.question, answer: f.answer })); }
                    } catch { /* ignore */ }
                }
            }
        }
    } catch (error) {
        console.error('[CategoryPage] Error fetching settings:', error.message);
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
