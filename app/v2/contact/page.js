import Link from 'next/link';
import { ArrowLeft, Building2, ShieldCheck, Award, MapPin, ArrowRight } from 'lucide-react';
import ContactCardsV2 from './ContactCardsV2';

export const metadata = {
    title: 'About Us / Contact Us | Sorted Solutions Mumbai',
    description: 'Learn about Sorted Solutions (A unit of Perfect Trading Company) and get in touch with our team for doorstep appliance repair across Mumbai.',
    alternates: { canonical: '/v2/contact' },
};

export default function V2ContactPage() {
    return (
        <div className="v2-policy-wrap">
            <div className="v2-policy-container">
                {/* Mobile Top Navigation */}
                <div className="v2-policy-mobile-nav">
                    <Link href="/v2" className="v2-policy-back-btn" aria-label="Back to home">
                        <ArrowLeft size={18} />
                    </Link>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--v2-ink)' }}>About Us / Contact</span>
                    <div style={{ width: 38 }} />
                </div>

                {/* Desktop Breadcrumbs */}
                <nav className="v2-policy-breadcrumbs" aria-label="Breadcrumb">
                    <Link href="/v2">Home</Link>
                    <span>/</span>
                    <span className="current">About Us / Contact Us</span>
                </nav>

                {/* Hero Header */}
                <div className="v2-policy-hero">
                    <div className="v2-policy-tag">
                        <span>Sorted Solutions · Verified Identity</span>
                    </div>
                    <h1 className="v2-policy-title">About Us / Contact Us</h1>
                    <p className="v2-policy-subtitle">
                        Welcome to Sorted Solutions. We provide fast, reliable, and professional doorstep home appliance repair services across Mumbai. Whether it is routine maintenance for household appliances like microwaves, refrigerators, and washing machines, or comprehensive Annual Maintenance Contracts (AMCs) for commercial clients, our focus is on delivering prompt and effective solutions.
                    </p>
                </div>

                {/* Interactive Contact Cards Grid */}
                <ContactCardsV2 />

                {/* Section 1: Legal Identity & Operational Transparency */}
                <div className="v2-policy-card">
                    <div className="v2-policy-card-title">
                        <Building2 size={20} color="#6338f5" />
                        <span>Our Legal Identity and Transparency</span>
                    </div>
                    <div className="v2-policy-card-body">
                        <p>
                            We believe in complete operational transparency for our customers. Sorted Solutions is the consumer-facing brand and official trade name operated by our legally registered entity, <strong>Perfect Trading Company</strong>.
                        </p>
                        <p>
                            All invoicing, billing, statutory compliance, and official business operations for Sorted Solutions are conducted under Perfect Trading Company.
                        </p>
                    </div>
                </div>

                {/* Section 2: Independent Service Provider */}
                <div className="v2-policy-card">
                    <div className="v2-policy-card-title">
                        <ShieldCheck size={20} color="#d97706" />
                        <span>Independent Service Provider</span>
                    </div>
                    <div className="v2-policy-card-body">
                        <p>
                            Sorted Solutions operates strictly as an independent service and repair network. We possess the technical expertise to repair a wide variety of appliance brands; however, we are <strong>not affiliated with, endorsed by, or acting as an official authorized service center</strong> for any specific appliance manufacturer.
                        </p>
                        <p>
                            Any brand names, trademarks, or logos mentioned on our website are purely for descriptive purposes to indicate appliance compatibility and belong to their respective trademark owners.
                        </p>
                    </div>
                </div>

                {/* Section 3: Commitment to Quality */}
                <div className="v2-policy-card">
                    <div className="v2-policy-card-title">
                        <Award size={20} color="#059669" />
                        <span>Our Commitment to Quality</span>
                    </div>
                    <div className="v2-policy-card-body">
                        <p>
                            We stand by the qualifications of our technicians and the quality of our work. To give our customers peace of mind, we provide a standard <strong>30-day service warranty</strong> on our labor, alongside transparent, itemized warranties on any spare parts replaced during the repair process.
                        </p>
                        <p>
                            Detailed diagnostic visiting fees and service terms are always communicated upfront before any work begins, ensuring zero hidden surprises.
                        </p>
                    </div>
                </div>

                {/* Section 4: Registered Business Details */}
                <div className="v2-policy-card">
                    <div className="v2-policy-card-title">
                        <span>Registered Business Details</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--v2-muted)', margin: '0 0 16px' }}>
                        For any legal, statutory, billing, or operational inquiries, please refer to our verified business credentials below:
                    </p>

                    <div className="v2-biz-grid">
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">Legal Entity Name</span>
                            <span className="v2-biz-val">Perfect Trading Company</span>
                        </div>
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">Operating Brand Name</span>
                            <span className="v2-biz-val">Sorted Solutions</span>
                        </div>
                        <div className="v2-biz-item full-width">
                            <span className="v2-biz-lbl">Registered Office Address</span>
                            <span className="v2-biz-val">
                                A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra, 400065
                            </span>
                        </div>
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">Registration / Udyam No</span>
                            <span className="v2-biz-val">UDYAM-MH-14-0212678</span>
                        </div>
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">GSTIN</span>
                            <span className="v2-biz-val">27DJQPB0215Q1ZY</span>
                        </div>
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">Support Helpline</span>
                            <a href="tel:+918928895590" className="v2-biz-val" style={{ color: '#6338f5', textDecoration: 'none' }}>
                                +91-8928895590
                            </a>
                        </div>
                        <div className="v2-biz-item">
                            <span className="v2-biz-lbl">Official Email</span>
                            <a href="mailto:support@sortedsolutions.in" className="v2-biz-val" style={{ color: '#6338f5', textDecoration: 'none' }}>
                                support@sortedsolutions.in
                            </a>
                        </div>
                    </div>
                </div>

                {/* Section 5: Service Coverage Area */}
                <div className="v2-policy-card">
                    <div className="v2-policy-card-title">
                        <MapPin size={20} color="#6338f5" />
                        <span>Service Coverage Area</span>
                    </div>
                    <div className="v2-policy-card-body">
                        <p>
                            We provide doorstep appliance repair and AMC services across <strong>Mumbai, Navi Mumbai, and Thane</strong>, including:
                        </p>
                        <p style={{ color: 'var(--v2-ink)', fontWeight: 600 }}>
                            Andheri, Bandra, Borivali, Goregaon, Juhu, Kandivali, Malad, Powai, Santacruz, Vile Parle, Chembur, Ghatkopar, Mulund, Thane West, Vashi, Nerul, Kharghar, and all surrounding areas.
                        </p>
                        <p>
                            Enter your pincode on any service page or during checkout to check instant technician availability in your neighborhood.
                        </p>
                    </div>
                </div>

                {/* Bottom Call to Action */}
                <div className="v2-policy-cta">
                    <h3>Need an Appliance Repaired Today?</h3>
                    <p>
                        Book certified doorstep repair for ACs, Refrigerators, Washing Machines, Microwaves, and Water Purifiers with upfront GST pricing and a 30-day warranty.
                    </p>
                    <Link href="/v2/services" className="v2-policy-cta-btn">
                        <span>Explore All Services</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
