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
import { subcategoriesByCategory } from '@/data/servicePageContent'
import { getProblems } from '@/data/commonProblems'
import { getFAQs } from '@/data/faqs'

export default function SubCategoryPage({ params }) {
    const { category, subcategory } = params

    // Format names for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subcategoryName = subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Get sibling subcategories (other subcategories in same category)
    const allSubcategories = subcategoriesByCategory[category] || []
    const siblingSubcategories = allSubcategories.filter(sub => sub.slug !== subcategory)

    // Get problems for this specific subcategory
    const problems = getProblems(category, subcategory)

    // Get FAQs for this category
    const faqs = getFAQs(category)

    return (
        <div className="service-page subcategory-page">
            {/* Hero Section */}
            <HeroSection
                title={`${subcategoryName} Repair Solutions In Mumbai`}
                subtitle={`Expert ${subcategoryName.toLowerCase()} repair and maintenance`}
                category={category}
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
                title={`${subcategoryName} Problems We Fix`}
                subtitle="Common issues with your appliance"
                problems={problems}
            />

            {/* How It Works - Grid Variant (Layout B) */}
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
