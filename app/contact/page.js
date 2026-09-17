// Server component — keeps metadata export, delegates tracked links to ContactLinks.jsx
import { Mail, Clock, MapPin, Building2, ShieldCheck, Award } from 'lucide-react';
import { PhoneCard, WhatsAppCard } from './ContactLinks';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

export const metadata = {
    title: 'About Us / Contact Us | Sorted Solutions',
    description: 'Learn about Sorted Solutions (A unit of Perfect Trading Company) and get in touch with our team for doorstep appliance repair in Mumbai.',
    alternates: { canonical: '/contact' },
};

export default function ContactPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f0f11)', color: 'var(--text-primary, #fff)' }}>
            <Header />
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>

                {/* Header / Intro */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
                        About Us / Contact Us
                    </h1>
                    <p style={{ fontSize: '16px', color: 'var(--text-secondary,#94a3b8)', maxWidth: '760px', margin: '0 auto', lineHeight: 1.8 }}>
                        Welcome to Sorted Solutions. We provide fast, reliable, and professional doorstep home appliance repair services across Mumbai. Whether it is routine maintenance for household appliances like microwaves, refrigerators, and washing machines, or comprehensive Annual Maintenance Contracts (AMCs) for commercial clients, our focus is on delivering prompt and effective solutions.
                    </p>
                </div>

                {/* Contact Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px', marginBottom: '40px' }}>

                    {/* Phone — client component for GTM tracking */}
                    <PhoneCard />

                    {/* Email */}
                    <a href="mailto:support@sortedsolutions.in" style={{ textDecoration: 'none' }}>
                        <div style={cardStyle}>
                            <div style={iconWrap('#10b981')}><Mail size={22} color="#fff" /></div>
                            <h3 style={cardTitle}>Email Us</h3>
                            <p style={cardValue}>support@sortedsolutions.in</p>
                            <p style={cardMeta}>We reply within 4 hours</p>
                        </div>
                    </a>

                    {/* WhatsApp — client component for GTM tracking */}
                    <WhatsAppCard />

                    {/* Hours */}
                    <div style={cardStyle}>
                        <div style={iconWrap('#f59e0b')}><Clock size={22} color="#fff" /></div>
                        <h3 style={cardTitle}>Business Hours</h3>
                        <p style={cardValue}>Mon – Sun</p>
                        <p style={cardMeta}>8:00 AM – 8:00 PM</p>
                    </div>

                </div>

                {/* Section: Our Legal Identity and Transparency */}
                <div style={sectionCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={iconWrap('#6366f1')}><Building2 size={22} color="#fff" /></div>
                        <div>
                            <h2 style={sectionTitleStyle}>Our Legal Identity and Transparency</h2>
                            <p style={sectionTextStyle}>
                                We believe in complete operational transparency for our customers. Sorted Solutions is the consumer-facing brand and official trade name operated by our legally registered entity, Perfect Trading Company. All invoicing, billing, and official business operations for Sorted Solutions are conducted under Perfect Trading Company.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Independent Service Provider */}
                <div style={sectionCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={iconWrap('#f59e0b')}><ShieldCheck size={22} color="#fff" /></div>
                        <div>
                            <h2 style={sectionTitleStyle}>Independent Service Provider</h2>
                            <p style={sectionTextStyle}>
                                Sorted Solutions operates strictly as an independent service and repair network. We possess the technical expertise to repair a wide variety of appliance brands; however, we are not affiliated with, endorsed by, or acting as an official authorized service center for any specific appliance manufacturer. Any brand names, trademarks, or logos mentioned on our website are purely for descriptive purposes and belong to their respective owners.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Our Commitment to Quality */}
                <div style={sectionCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={iconWrap('#10b981')}><Award size={22} color="#fff" /></div>
                        <div>
                            <h2 style={sectionTitleStyle}>Our Commitment to Quality</h2>
                            <p style={sectionTextStyle}>
                                We stand by the qualifications of our technicians and the quality of our work. To give our customers peace of mind, we provide a standard 30-day service warranty on our labor, alongside transparent, itemized warranties on any spare parts replaced during the repair process. Detailed diagnostic visiting fees and service terms are always communicated upfront before any work begins.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Registered Business Details */}
                <div style={{
                    background: 'var(--bg-secondary,#1a1a2e)',
                    border: '1.5px solid var(--border-primary,#2d2d3a)',
                    borderRadius: '16px',
                    padding: '32px',
                    marginBottom: '32px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: '8px' }}>
                        Registered Business Details
                    </h2>
                    <p style={{ color: 'var(--text-secondary,#94a3b8)', fontSize: '14px', marginBottom: '24px' }}>
                        For any legal, billing, or operational inquiries, please refer to our verified business information below:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '16px' }}>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>Legal Firm Name:</span>
                            <strong style={infoValueStyle}>Perfect Trading Company</strong>
                        </div>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>Operating Brand Name:</span>
                            <strong style={infoValueStyle}>Sorted Solutions</strong>
                        </div>
                        <div style={{ ...infoItemStyle, gridColumn: '1 / -1' }}>
                            <span style={infoLabelStyle}>Registered Office Address:</span>
                            <strong style={infoValueStyle}>A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra, 400065</strong>
                        </div>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>Registration / Udyam No:</span>
                            <strong style={infoValueStyle}>UDYAM-MH-14-0212678</strong>
                        </div>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>GSTIN:</span>
                            <strong style={infoValueStyle}>27DJQPB0215Q1ZY</strong>
                        </div>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>Phone:</span>
                            <a href="tel:+918928895590" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>+91-8928895590</a>
                        </div>
                        <div style={infoItemStyle}>
                            <span style={infoLabelStyle}>Email:</span>
                            <a href="mailto:support@sortedsolutions.in" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>support@sortedsolutions.in</a>
                        </div>
                    </div>
                </div>

                {/* Service Area */}
                <div style={{ background: 'var(--bg-secondary,#1a1a2e)', border: '1.5px solid var(--border-primary,#2d2d3a)', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <MapPin size={24} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Service Area</h3>
                            <p style={{ color: 'var(--text-secondary,#94a3b8)', lineHeight: 1.7, marginBottom: '12px' }}>
                                We provide appliance repair services across <strong style={{ color: '#fff' }}>Mumbai, Maharashtra</strong> including Andheri, Borivali, Kandivali, Malad, Goregaon, Bandra, Powai, Thane, Navi Mumbai and more.
                            </p>
                            <p style={{ color: 'var(--text-secondary,#94a3b8)', fontSize: '14px' }}>
                                Not sure if we serve your area? Enter your pincode in the booking form and we'll let you know instantly.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Services Note */}
                <div style={{ background: 'linear-gradient(135deg,#6366f120,#8b5cf620)', border: '1.5px solid #6366f140', borderRadius: '16px', padding: '24px 32px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary,#94a3b8)', fontSize: '15px', lineHeight: 1.7 }}>
                        We repair <strong style={{ color: '#fff' }}>Air Conditioners, Refrigerators, Washing Machines, Microwaves, Ovens, Water Purifiers</strong> and more.
                        <br />Book a technician in under 2 minutes — same-day appointments available.
                    </p>
                    <a href="/booking" style={{
                        display: 'inline-block', marginTop: '16px', padding: '12px 28px',
                        background: '#6366f1', color: '#fff', borderRadius: '10px',
                        fontWeight: 700, textDecoration: 'none', fontSize: '15px'
                    }}>
                        Book a Technician →
                    </a>
                </div>

            </div>
            <FooterSection />
        </div>
    );
}

const cardStyle = {
    background: 'var(--bg-secondary,#1a1a2e)',
    border: '1.5px solid var(--border-primary,#2d2d3a)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'border-color 0.2s',
    height: '100%',
};

const iconWrap = (bg) => ({
    width: '44px', height: '44px', borderRadius: '12px',
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px', flexShrink: 0
});

const cardTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary,#6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' };
const cardValue = { fontSize: '16px', fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: '4px' };
const cardMeta  = { fontSize: '13px', color: 'var(--text-secondary,#94a3b8)' };

const sectionCardStyle = {
    background: 'var(--bg-secondary,#1a1a2e)',
    border: '1.5px solid var(--border-primary,#2d2d3a)',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '24px'
};

const sectionTitleStyle = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary,#fff)',
    marginBottom: '8px'
};

const sectionTextStyle = {
    color: 'var(--text-secondary,#94a3b8)',
    lineHeight: 1.75,
    fontSize: '15px'
};

const infoItemStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-primary,#2d2d3a)',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
};

const infoLabelStyle = {
    fontSize: '12px',
    color: 'var(--text-tertiary,#6b7280)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

const infoValueStyle = {
    fontSize: '14px',
    color: 'var(--text-primary,#fff)',
    lineHeight: 1.5
};
