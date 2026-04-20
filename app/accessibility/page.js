import { Mail, Phone } from 'lucide-react';

export const metadata = {
    title: 'Accessibility Statement | Sorted Solutions',
    description: 'Sorted Solutions commitment to digital accessibility for all users of our appliance repair booking platform.',
    alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary,#0f0f11)', color: 'var(--text-primary,#fff)', padding: '60px 24px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Accessibility Statement</h1>
                <p style={{ color: 'var(--text-secondary,#94a3b8)', marginBottom: '48px', fontSize: '14px' }}>Last reviewed: March 2025</p>

                <Section title="Our Commitment">
                    Sorted Solutions is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards to our website and booking platform.
                </Section>

                <Section title="Conformance Status">
                    We aim to conform to the <strong style={{ color: '#fff' }}>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>. These guidelines explain how to make web content more accessible to people with disabilities. Conformance with these guidelines helps make the web more user-friendly for all people.
                </Section>

                <Section title="Measures We Take">
                    To support accessibility, Sorted Solutions takes the following measures:
                    <ul>
                        <li>All images include descriptive alt text</li>
                        <li>The website is fully navigable via keyboard</li>
                        <li>Colour contrast ratios meet WCAG AA standards across all pages</li>
                        <li>Form fields have associated labels and ARIA attributes</li>
                        <li>Error messages are descriptive and identify the specific issue</li>
                        <li>The booking wizard supports screen readers with clear step indicators</li>
                        <li>Font sizes are responsive and user-scalable</li>
                        <li>All interactive elements have visible focus states</li>
                    </ul>
                </Section>

                <Section title="Known Limitations">
                    While we strive for full accessibility, some areas may still be under improvement:
                    <ul>
                        <li>Some older PDF documents linked from the admin section may not be fully accessible</li>
                        <li>Third-party content embedded in our site (e.g. Google Maps) is outside our direct control</li>
                    </ul>
                    We are actively working to address these limitations.
                </Section>

                <Section title="Alternative Ways to Book">
                    If you experience difficulty using our website, you can book a service by:
                    <ul>
                        <li>Calling us: <a href="tel:+918928895590" style={{ color: '#6366f1' }}>+91 89288 95590</a></li>
                        <li>WhatsApp: <a href="https://wa.me/918928895590" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>Chat on WhatsApp</a></li>
                        <li>Email: <a href="mailto:support@sortedsolutions.in" style={{ color: '#6366f1' }}>support@sortedsolutions.in</a></li>
                    </ul>
                    Our team is available Monday to Sunday, 8 AM to 8 PM.
                </Section>

                {/* Contact box */}
                <div style={{ background: 'var(--bg-secondary,#1a1a2e)', border: '1.5px solid var(--border-primary,#2d2d3a)', borderRadius: '16px', padding: '28px', marginTop: '48px' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>Accessibility Feedback</h3>
                    <p style={{ color: 'var(--text-secondary,#94a3b8)', lineHeight: 1.7, marginBottom: '20px' }}>
                        We welcome your feedback on the accessibility of our website. If you encounter any barriers or have suggestions for improvement, please let us know:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <a href="mailto:support@sortedsolutions.in" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6366f1', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>
                            <Mail size={18} /> support@sortedsolutions.in
                        </a>
                        <a href="tel:+918928895590" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6366f1', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>
                            <Phone size={18} /> +91 89288 95590
                        </a>
                    </div>
                    <p style={{ color: 'var(--text-tertiary,#6b7280)', fontSize: '13px', marginTop: '16px' }}>
                        We aim to respond to accessibility feedback within 2 business days.
                    </p>
                </div>

                <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border-primary,#2d2d3a)', color: 'var(--text-tertiary,#6b7280)', fontSize: '13px' }}>
                    © {new Date().getFullYear()} Sorted Solutions. All rights reserved. | Mumbai, Maharashtra, India
                </div>
            </div>
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
