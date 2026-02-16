import HeroSection from '@/components/services/HeroSection'
import QuickBookingEmbed from '@/components/services/QuickBookingEmbed'
import ProblemsSection from '@/components/services/ProblemsSection'
import HowItWorksGrid from '@/components/services/HowItWorksGrid'
import WhyChooseUs from '@/components/services/WhyChooseUs'
import BrandLogos from '@/components/services/BrandLogos'
import FrequentlyBooked from '@/components/services/FrequentlyBooked'
import FAQSection from '@/components/services/FAQSection'
import ServiceFooter from '@/components/services/ServiceFooter'
import { getFAQs } from '@/data/faqs'

// Service mapping
const serviceMap = {
    'ac': {
        full: 'Air Conditioner',
        category: 'ac-repair',
        description: 'Expert AC repair and servicing for all types'
    },
    'refrigerator': {
        full: 'Refrigerator',
        category: 'refrigerator-repair',
        description: 'Professional refrigerator repair and maintenance'
    },
    'wm': {
        full: 'Washing Machine',
        category: 'washing-machine-repair',
        description: 'Complete washing machine repair services'
    },
    'waterpurifier': {
        full: 'Water Purifier',
        category: 'water-purifier-repair',
        description: 'RO and water purifier repair and servicing'
    },
    'oven': {
        full: 'Oven',
        category: 'oven-repair',
        description: 'Microwave and oven repair services'
    },
    'hob': {
        full: 'HOB Stoves',
        category: 'hob-repair',
        description: 'Gas hob and stove repair services'
    }
}

export default function SubLocationPage({ params }) {
    const { loc, service } = params

    // Format location and service names
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const serviceInfo = serviceMap[service]

    if (!serviceInfo) {
        return <div>Service not found</div>
    }

    // Common problems for this service in this location
    const commonProblems = [
        `${serviceInfo.full} not working properly`,
        'Making unusual noise',
        'Performance issues',
        'Electrical problems',
        'Need regular maintenance',
        'Warranty service required'
    ]

    // Get FAQs for this service
    const faqs = getFAQs(serviceInfo.category).slice(0, 5)

    return (
        <div className="service-page sub-location-page">
            {/* Hero Section */}
            <HeroSection
                title={`${serviceInfo.full} Repair in ${locationName}`}
                subtitle={`Expert ${serviceInfo.full.toLowerCase()} repair services • Same-day service • All brands`}
                category={serviceInfo.category}
                location={locationName}
                currentService={service}
            />

            {/* Quick Booking Form */}
            <QuickBookingEmbed preSelectedCategory={serviceInfo.category} />

            {/* Common Problems */}
            <ProblemsSection
                title={`${serviceInfo.full} Problems We Solve in ${locationName}`}
                subtitle={`Common ${serviceInfo.full.toLowerCase()} issues we fix`}
                problems={commonProblems}
            />

            {/* How It Works */}
            <HowItWorksGrid
                title="How It Works"
                subtitle="Get your appliance fixed in 4 simple steps"
            />

            {/* Why Choose Us */}
            <WhyChooseUs
                title={`Why Choose Us for ${serviceInfo.full} Repair in ${locationName}?`}
                subtitle="Local experts with premium service quality"
            />

            {/* Brand Logos */}
            <BrandLogos
                title="All Brands Serviced"
                subtitle={`We repair all major ${serviceInfo.full.toLowerCase()} brands`}
            />

            {/* Frequently Booked Services */}
            <FrequentlyBooked
                title={`Popular Services in ${locationName}`}
                subtitle="Most booked services in your area"
            />

            {/* FAQ Section */}
            <FAQSection
                title="Frequently Asked Questions"
                subtitle={`Common questions about ${serviceInfo.full.toLowerCase()} repair`}
                faqs={faqs}
            />

            {/* Footer */}
            <ServiceFooter />
        </div>
    )
}

// Generate static params for all location-service combinations
export async function generateStaticParams() {
    const locations = [
        'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
        'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
        'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
    ]

    const services = ['ac', 'refrigerator', 'wm', 'waterpurifier', 'oven', 'hob']

    const params = []
    locations.forEach(loc => {
        services.forEach(service => {
            params.push({ loc, service })
        })
    })

    return params
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { loc, service } = params
    const locationName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const serviceInfo = serviceMap[service]

    if (!serviceInfo) {
        return { title: 'Service Not Found' }
    }

    return {
        title: `${serviceInfo.full} Repair in ${locationName} | Same Day Service | SORTED`,
        description: `Expert ${serviceInfo.full.toLowerCase()} repair services in ${locationName}. Same day service, all brands, 90-day warranty. Book now for fast and reliable ${serviceInfo.full.toLowerCase()} repair!`,
        keywords: `${serviceInfo.full} repair ${locationName}, ${serviceInfo.full.toLowerCase()} service ${locationName}, ${serviceInfo.full.toLowerCase()} repair near me`,
    }
}
