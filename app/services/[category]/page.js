import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksTimeline from '@/components/services/HowItWorksTimeline'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import { subcategoriesByCategory } from '@/data/servicePageContent'
import { getProblems } from '@/data/commonProblems'
import { getFAQs } from '@/data/faqs'

export default function CategoryPage({ params }) {
    const { category } = params

    // Format category name for display
    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Get subcategories for this category
    const subcategories = subcategoriesByCategory[category] || []

    // Get problems for this category
    const problems = getProblems(category)

    // Get FAQs for this category
    const faqs = getFAQs(category)

    return (
        <div className="service-page category-page">
            {/* Hero Section with Gradient Background */}
            <HeroSection
                title={`${categoryName} Repair Solutions In Mumbai`}
                subtitle="Expert technicians • Same-day service • 90-day warranty"
                category={category}
            />

            {/* Quick Booking Form - Pre-filled with category */}
            <QuickBookingEmbed preSelectedCategory={category} />

            {/* Sub-Categories Grid with Images */}
            <CategoryCards
                title={`${categoryName} Services`}
                subtitle="Choose your specific appliance type"
                cards={subcategories}
                baseUrl={`/services/${category}`}
            />

            {/* Problems We Solve - SEO Important */}
            <ProblemsSection
                title="We Solve All The Problems"
                subtitle={`Common ${categoryName.toLowerCase()} issues we fix`}
                problems={problems}
            />

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
            <BrandLogos
                title="Brands We Serve"
                subtitle="Trusted by leading appliance manufacturers"
            />

            {/* Location Links */}
            <LocationLinks
                title="We are Right In your Neighbourhood"
                subtitle="Find us in your area"
                category={categoryName}
            />

            {/* Frequently Booked Services Carousel */}
            <FrequentlyBooked
                title="Frequently Booked Services"
                subtitle="Popular services in your area"
            />

            {/* FAQ Section - Category Specific */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle={`Common questions about ${categoryName.toLowerCase()} repair`}
                faqs={faqs}
            />

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
