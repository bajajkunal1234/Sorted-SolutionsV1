import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksScroll from '@/components/services/HowItWorksScroll'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import { getFAQs } from '@/data/faqs'

export default function LocationPage({ params }) {
    const { loc } = params

    // Format location name
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Main service categories available in this location
    const serviceCategories = [
        { slug: 'ac-repair', title: 'AC Repair', description: 'All types of AC repair and servicing', price: 499, icon: '❄️' },
        { slug: 'refrigerator-repair', title: 'Refrigerator Repair', description: 'Fridge repair and gas refilling', price: 599, icon: '🧊' },
        { slug: 'oven-repair', title: 'Oven Repair', description: 'Microwave and OTG repair', price: 399, icon: '🔥' },
        { slug: 'washing-machine-repair', title: 'Washing Machine Repair', description: 'All washing machine repairs', price: 549, icon: '🌀' },
        { slug: 'water-purifier-repair', title: 'Water Purifier Repair', description: 'RO and UV purifier service', price: 449, icon: '💧' },
        { slug: 'hob-repair', title: 'Gas Hob Repair', description: 'Gas stove and hob repair', price: 349, icon: '🔥' },
    ]

    // Common problems across all appliances
    const commonProblems = [
        'Appliance not working',
        'Making unusual noise',
        'Water leakage issues',
        'Not heating/cooling properly',
        'Electrical problems',
        'Gas leakage (for hobs)',
        'Display not working',
        'Door/lid issues',
        'Strange smells',
        'Performance issues'
    ]

    // Nearby sublocations
    const sublocations = [
        { name: `${locationName} East`, slug: `${loc}-east` },
        { name: `${locationName} West`, slug: `${loc}-west` },
        { name: `${locationName} Central`, slug: `${loc}-central` },
    ]

    // Get general FAQs
    const faqs = getFAQs('ac-repair').slice(0, 3) // Use first 3 AC FAQs as general

    return (
        <div className="service-page location-page">
            {/* Hero Section */}
            <HeroSection
                title={`Appliance Repair Services in ${locationName}`}
                subtitle="Expert technicians • All brands • Same-day service available"
                category="ac-repair"
            />

            {/* Quick Booking Form */}
            <QuickBookingEmbed />

            {/* Service Categories Available */}
            <CategoryCards
                title={`Our Services in ${locationName}`}
                subtitle="Choose your appliance type"
                cards={serviceCategories}
                baseUrl="/services"
            />

            {/* Common Problems */}
            <ProblemsSection
                title="Problems We Solve"
                subtitle={`Common appliance issues in ${locationName}`}
                problems={commonProblems}
            />

            {/* How It Works - Scroll Variant (Layout C) */}
            <HowItWorksScroll
                title="How It Works"
                subtitle="Scroll through our simple process"
            />

            {/* Why Choose Us */}
            <WhyChooseUs
                title="Why Choose Us in ${locationName}?"
                subtitle="Local service with premium quality"
            />

            {/* Brand Logos */}
            <BrandLogos
                title="All Brands Serviced"
                subtitle="We repair all major appliance brands"
            />

            {/* Nearby Sublocations */}
            <LocationLinks
                title={`We Serve All Areas in ${locationName}`}
                subtitle="Find your specific locality"
                locations={sublocations}
            />

            {/* Frequently Booked Services */}
            <FrequentlyBooked
                title={`Popular in ${locationName}`}
                subtitle="Most booked services in your area"
            />

            {/* FAQ Section */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle="Common questions about our services"
                faqs={faqs}
            />

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all locations
export async function generateStaticParams() {
    return [
        { loc: 'andheri' },
        { loc: 'malad' },
        { loc: 'ghatkopar' },
        { loc: 'bandra' },
        { loc: 'kurla' },
        { loc: 'parel' },
        { loc: 'dadar' },
        { loc: 'borivali' },
    ]
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { loc } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `Appliance Repair in ${locationName} | AC, Fridge, Washing Machine | SORTED`,
        description: `Expert appliance repair services in ${locationName}. AC, refrigerator, washing machine, oven repair. Same day service, all brands. Book now!`,
        keywords: `appliance repair ${locationName}, AC repair ${locationName}, fridge repair ${locationName}`,
    }
}
