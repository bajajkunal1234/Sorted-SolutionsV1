export const metadata = {
    title: 'Privacy Policy | Sorted Solutions',
    description: 'Learn how Sorted Solutions (Perfect Trading Company) collects, uses, and protects your personal data when you use our doorstep appliance repair services in Mumbai.',
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

                <Section title="1. Introduction">
                    Welcome to Sorted Solutions, a trade name operated by our legally registered entity, Perfect Trading Company. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (<a href="https://sortedsolutions.in" style={{ color: '#818cf8' }}>sortedsolutions.in</a>), book our services, or interact with us.
                </Section>

                <Section title="2. Information We Collect">
                    <p>To provide our doorstep appliance repair services, we may collect the following types of personal information:</p>
                    <ul style={{ marginTop: '10px' }}>
                        <li><strong>Contact Information:</strong> Your name, phone number, email address, and complete physical address/location for technician dispatch.</li>
                        <li><strong>Service Details:</strong> Information regarding your appliances, repair history, and the specific issues you report.</li>
                        <li><strong>Device and Usage Data:</strong> When you visit our website, we may automatically collect standard log data such as your IP address, browser type, operating system, and pages visited, which helps us improve our website experience.</li>
                    </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                    <p>We use the information we collect strictly to operate our business and provide you with high-quality service. Specifically, we use your data to:</p>
                    <ul style={{ marginTop: '10px' }}>
                        <li>Schedule and dispatch technicians to your location.</li>
                        <li>Provide cost estimates, invoices, and process payments.</li>
                        <li>Communicate with you regarding your booking, delays, or service updates.</li>
                        <li>Honor our 30-day service warranty and itemized parts warranties.</li>
                        <li>Respond to your customer support inquiries.</li>
                    </ul>
                </Section>

                <Section title="4. How We Share Your Information">
                    <p>We value your trust. We do not sell, rent, or trade your personal information to third parties. We only share your data in the following limited circumstances:</p>
                    <ul style={{ marginTop: '10px' }}>
                        <li><strong>With Our Technicians:</strong> Your name, address, and phone number are shared with our internally managed field service technicians solely to fulfill your requested repair job.</li>
                        <li><strong>For Legal Compliance:</strong> We may disclose your information if required to do so by law, government request, or to protect the rights, property, and safety of Perfect Trading Company, our employees, or the public.</li>
                    </ul>
                </Section>

                <Section title="5. Data Security">
                    We implement reasonable administrative and technical security measures to protect your personal information from unauthorized access, alteration, or disclosure. While we strive to protect your data, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </Section>

                <Section title="6. Cookies and Tracking">
                    Our website may use cookies and similar tracking technologies to enhance user experience and analyze website traffic. You can choose to disable cookies through your browser settings, though this may affect how certain features of our website function.
                </Section>

                <Section title="7. Third-Party Links">
                    Our website may contain links to third-party websites. We are not responsible for the privacy practices or the content of those external sites. We encourage you to read the privacy policies of any website you visit.
                </Section>

                <Section title="8. Changes to This Privacy Policy">
                    We reserve the right to update this Privacy Policy at any time. Any changes will be posted on this page with an updated "Effective Date." Your continued use of our services after any modifications indicates your acceptance of the new terms.
                </Section>

                <Section title="9. Contact Us">
                    <p>If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us at:</p>
                    <div style={{ marginTop: '14px', lineHeight: 1.8 }}>
                        <p><strong>Legal Firm Name:</strong> Perfect Trading Company (Operating as Sorted Solutions)</p>
                        <p><strong>Email:</strong> <a href="mailto:support@sortedsolutions.in" style={{ color: '#818cf8' }}>support@sortedsolutions.in</a></p>
                        <p><strong>Phone:</strong> <a href="tel:+918928895590" style={{ color: '#818cf8' }}>+91 89288 95590</a></p>
                        <p><strong>Registered Address:</strong> A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra 400065</p>
                    </div>
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
