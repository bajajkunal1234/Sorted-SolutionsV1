// Server component — keeps metadata export, delegates tracked links to ContactLinks.jsx
import { Mail, Clock, MapPin } from 'lucide-react';
import { PhoneCard, WhatsAppCard } from './ContactLinks';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

export const metadata = {
    title: 'Contact Us | Sorted Solutions',
    description: 'Get in touch with Sorted Solutions for appliance repair services in Mumbai. Call, WhatsApp, or email us.',
    alternates: { canonical: '/contact' },
};

export default function ContactPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f0f11)', color: 'var(--text-primary, #fff)' }}>
            <Header />
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                    <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
                        Get In Touch
                    </h1>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary,#94a3b8)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                        Have a question or need to book a repair? We're available 7 days a week across Mumbai.
                    </p>
                </div>

                {/* Contact Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px', marginBottom: '48px' }}>

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
    marginBottom: '16px',
});

const cardTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary,#6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' };
const cardValue = { fontSize: '16px', fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: '4px' };
const cardMeta  = { fontSize: '13px', color: 'var(--text-secondary,#94a3b8)' };
