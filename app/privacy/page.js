export const metadata = {
    title: 'Privacy Policy | Sorted Solutions',
    description: 'Learn how Sorted Solutions collects, uses, and protects your personal data when you use our appliance repair services.',
    alternates: { canonical: '/privacy' },
};

const EFFECTIVE_DATE = 'March 1, 2025';

import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

export default function PrivacyPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary,#0f0f11)', color: 'var(--text-primary,#fff)' }}>
            <Header />
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>

                <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
                <p style={{ color: 'var(--text-secondary,#94a3b8)', marginBottom: '48px', fontSize: '14px' }}>Effective Date: {EFFECTIVE_DATE}</p>

                <Section title="1. Who We Are">
                    Sorted Solutions is a home appliance repair service operating in Mumbai, Maharashtra, India. Our website is <strong>sortedsolutions.in</strong> and we can be reached at <a href="mailto:support@sortedsolutions.in" style={{ color: '#6366f1' }}>support@sortedsolutions.in</a>.
                </Section>

                <Section title="2. Information We Collect">
                    When you use our booking service, we collect:
                    <ul>
                        <li><strong>Personal details:</strong> Name, phone number, email address</li>
                        <li><strong>Address information:</strong> Your service address and pincode</li>
                        <li><strong>Appliance details:</strong> Type, brand, and the issue you're reporting</li>
                        <li><strong>Booking history:</strong> Past service requests and technician visits</li>
                        <li><strong>Usage data:</strong> Pages visited, booking steps completed (via Google Analytics)</li>
                    </ul>
                    We do <strong>not</strong> collect payment card details. Payments are made directly to the technician via cash or UPI.
                </Section>

                <Section title="3. How We Use Your Information">
                    <ul>
                        <li>To schedule and fulfil your appliance repair booking</li>
                        <li>To send you booking confirmations and service updates via WhatsApp/SMS/email</li>
                        <li>To assign the most suitable technician in your area</li>
                        <li>To follow up on service quality and warranty claims</li>
                        <li>To improve our services using anonymised analytics data</li>
                    </ul>
                </Section>

                <Section title="4. How We Share Your Information">
                    <ul>
                        <li><strong>Technicians:</strong> We share your name, phone, and address with the assigned technician only to complete your booking.</li>
                        <li><strong>Service providers:</strong> We use tools like Google Analytics and Supabase (database hosting) that process data on our behalf under strict data processing agreements.</li>
                        <li>We <strong>never sell</strong> your personal data to third parties for marketing purposes.</li>
                    </ul>
                </Section>

                <Section title="5. Data Retention">
                    We retain your booking data for up to <strong>3 years</strong> for warranty tracking and service history purposes. You may request deletion of your account and data at any time by contacting us.
                </Section>

                <Section title="6. Your Rights">
                    You have the right to:
                    <ul>
                        <li>Access the personal data we hold about you</li>
                        <li>Correct inaccurate information</li>
                        <li>Request deletion of your data</li>
                        <li>Opt out of marketing communications at any time</li>
                    </ul>
                    To exercise any of these rights, email us at <a href="mailto:support@sortedsolutions.in" style={{ color: '#6366f1' }}>support@sortedsolutions.in</a>.
                </Section>

                <Section title="7. Cookies & Analytics">
                    Our website uses cookies and Google Analytics to understand how visitors use the site. This data is anonymised and used only to improve user experience. You can disable cookies in your browser settings at any time.
                </Section>

                <Section title="8. Security">
                    We use industry-standard security practices to protect your data, including encrypted database storage (Supabase) and HTTPS across all pages. However, no method of internet transmission is 100% secure and we cannot guarantee absolute security.
                </Section>

                <Section title="9. Third-Party Links">
                    Our website may contain links to third-party sites (e.g. WhatsApp, Google Maps). We are not responsible for the privacy practices of those sites.
                </Section>

                <Section title="10. Changes to This Policy">
                    We may update this Privacy Policy from time to time. The effective date at the top of this page reflects the latest revision. Continued use of our services after changes constitutes acceptance.
                </Section>

                <Section title="11. Contact">
                    For any privacy concerns, contact us at <a href="mailto:support@sortedsolutions.in" style={{ color: '#6366f1' }}>support@sortedsolutions.in</a> or call <a href="tel:+918928895590" style={{ color: '#6366f1' }}>+91 89288 95590</a>.
                </Section>
            </div>
            <FooterSection />
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary,#fff)' }}>{title}</h2>
            <div style={{ color: 'var(--text-secondary,#94a3b8)', lineHeight: 1.8, fontSize: '15px' }}>
                {typeof children === 'string' ? <p>{children}</p> : children}
            </div>
        </div>
    );
}
