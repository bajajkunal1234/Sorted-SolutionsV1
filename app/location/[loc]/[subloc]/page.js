import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import CategoryCards from '@/components/services/CategoryCards'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksAccordion from '@/components/services/HowItWorksAccordion'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import LocationLinks from '@/components/services/LocationLinks'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import { getFAQs } from '@/data/faqs'

export default function SubLocationPage({ params }) {
    const { loc, subloc } = params

    // Format names for display
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const sublocationName = subloc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Service categories available
    const serviceCategories = [
        { slug: 'ac-repair', title: 'AC Repair', description: 'All AC types', price: 499, icon: '❄️' },
        { slug: 'refrigerator-repair', title: 'Refrigerator Repair', description: 'All brands', price: 599, icon: '🧊' },
        { slug: 'oven-repair', title: 'Oven Repair', description: 'Microwave & OTG', price: 399, icon: '🔥' },
        { slug: 'washing-machine-repair', title: 'Washing Machine', description: 'Front & top load', price: 549, icon: '🌀' },
        { slug: 'water-purifier-repair', title: 'Water Purifier', description: 'RO & UV service', price: 449, icon: '💧' },
        { slug: 'hob-repair', title: 'Gas Hob', description: 'All burner types', price: 349, icon: '🔥' },
    ]

    // Common problems
    const commonProblems = [
        'Not working properly',
        'Making strange sounds',
        'Leaking water',
        'Not cooling/heating',
        'Electrical issues',
        'Performance problems',
        'Display errors',
        'Door/lid problems'
    ]

    // Nearby areas in same location
    const nearbyAreas = [
        { name: `${locationName} East`, slug: `${loc}-east` },
        { name: `${locationName} West`, slug: `${loc}-west` },
        { name: `${locationName} North`, slug: `${loc}-north` },
    ].filter(area => area.slug !== subloc)

    // Get general FAQs
    const faqs = getFAQs('ac-repair').slice(0, 4)

    return (
        <div className="service-page sublocation-page">
            {/* Hero Section */}
            <HeroSection
                title={`Appliance Repair in ${sublocationName}, ${locationName}`}
                subtitle="Your local repair experts • Fast service • All brands"
                category="ac-repair"
            />

            {/* Quick Booking Form */}
            <QuickBookingEmbed />

            {/* Service Categories */}
            <CategoryCards
                title={`Services in ${sublocationName}`}
                subtitle="All appliance repairs available"
                cards={serviceCategories}
                baseUrl="/services"
            />

            {/* Common Problems */}
            <ProblemsSection
                title="Issues We Fix"
                subtitle={`Common appliance problems in ${sublocationName}`}
                problems={commonProblems}
            />

            {/* How It Works - Accordion Variant (Layout D) */}
            <HowItWorksAccordion
                title="How It Works"
                subtitle="Click to expand each step"
            />

            {/* Why Choose Us */}
            <WhyChooseUs
                title={`Why Choose Us in ${sublocationName}?`}
                subtitle="Local experts with premium service"
            />

            {/* Brand Logos */}
            <BrandLogos
                title="All Brands Serviced"
                subtitle="We repair every major brand"
            />

            {/* Nearby Areas */}
            {nearbyAreas.length > 0 && (
                <LocationLinks
                    title={`Other Areas in ${locationName}`}
                    subtitle="We serve nearby localities too"
                    locations={nearbyAreas}
                />
            )}

            {/* Frequently Booked Services */}
            <FrequentlyBooked
                title={`Popular in ${sublocationName}`}
                subtitle="Most requested services"
            />

            {/* FAQ Section */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle="Quick answers to common queries"
                faqs={faqs}
            />

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all sublocations
export async function generateStaticParams() {
    return [
        { loc: 'andheri', subloc: 'dn-nagar' },
        { loc: 'andheri', subloc: 'veera-desai-road' },
        { loc: 'andheri', subloc: 'airport-road' },
        { loc: 'malad', subloc: 'malad-east' },
        { loc: 'malad', subloc: 'malad-west' },
        { loc: 'ghatkopar', subloc: 'ghatkopar-east' },
    ]
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { loc, subloc } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const sublocationName = subloc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `Appliance Repair in ${sublocationName}, ${locationName} | SORTED`,
        description: `Expert appliance repair in ${sublocationName}, ${locationName}. AC, fridge, washing machine repair. Same day service. Book now!`,
        keywords: `appliance repair ${sublocationName}, ${sublocationName} repair service, ${locationName}`,
    }
}
