export const metadata = {
    title: 'Terms, Cancellations & Warranty | Sorted Solutions',
    description: 'Read the Terms, Cancellations & Warranty for using Sorted Solutions appliance repair services in Mumbai.',
    alternates: { canonical: '/terms' },
};

const EFFECTIVE_DATE = 'March 1, 2025';

import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

export default function TermsPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary,#0f0f11)', color: 'var(--text-primary,#fff)' }}>
            <Header />
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>

                <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Terms, Cancellations & Warranty</h1>
                <p style={{ color: 'var(--text-secondary,#94a3b8)', marginBottom: '48px', fontSize: '14px' }}>Effective Date: {EFFECTIVE_DATE}</p>

                <Section title="1. Acceptance of Terms">
                    By booking a service through Sorted Solutions (a trade name operated by our legally registered entity, Perfect Trading Company), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services. All billing, invoicing, and official business operations are executed under Perfect Trading Company.
                </Section>

                <Section title="2. Services Offered & Independent Status">
                    <p>Sorted Solutions provides home appliance repair, maintenance, installation, and commercial Annual Maintenance Contracts (AMCs) for appliances including Air Conditioners, Refrigerators, Washing Machines, Microwaves, Ovens, Water Purifiers, and HOB/Gas Stoves in Mumbai and surrounding areas.</p>
                    <p style={{ marginTop: '12px' }}><strong>Service Capacity & Qualifications:</strong> All services are fulfilled by our internally managed network of dedicated field service technicians.</p>
                    <p style={{ marginTop: '12px' }}><strong>Independent Provider:</strong> We are a strictly independent service provider. We are not an authorized service center for, nor are we affiliated with or endorsed by, any specific appliance manufacturer or brand.</p>
                </Section>

                <Section title="3. Booking & Appointments">
                    <ul>
                        <li>Bookings can be made via our website, app, or by calling us.</li>
                        <li>A visiting/diagnosing fee of ₹199 is charged at the time of the technician's visit, regardless of whether the repair is carried out.</li>
                        <li>The visiting fee is non-refundable once the technician has visited your premises.</li>
                        <li>We aim to provide same-day or next-day service, subject to technician availability in your area.</li>
                    </ul>
                </Section>

                <Section title="4. Pricing & Payment">
                    <ul>
                        <li>The visiting fee is payable at the time of the technician's arrival, in cash or via UPI.</li>
                        <li>Repair charges are shared by the technician before any work begins. You have the right to approve or decline.</li>
                        <li>Spare parts, if required, will be quoted separately before installation.</li>
                        <li>You are under no obligation to proceed with the repair after diagnosis.</li>
                    </ul>
                </Section>

                <Section title="5. Warranty on Repairs">
                    <ul>
                        <li>All repairs carried out by Sorted Solutions come with a 30-day service warranty.</li>
                        <li>This warranty covers the specific issue repaired and does not extend to new or unrelated problems.</li>
                        <li>The warranty is void if the appliance is tampered with by a third party after our repair.</li>
                        <li>Spare parts carry independent, itemized warranties based on the manufacturer's terms or the specific part replaced, which will be detailed on your final invoice.</li>
                    </ul>
                </Section>

                <Section title="6. Cancellations & Rescheduling">
                    <ul>
                        <li>You may cancel or reschedule a booking up to 2 hours before the scheduled appointment without any charge.</li>
                        <li>Cancellations made after the technician is dispatched may incur a ₹100 cancellation charge.</li>
                        <li>To cancel, please call or WhatsApp us at +91 89288 95590.</li>
                    </ul>
                </Section>

                <Section title="7. Customer Responsibilities">
                    <ul>
                        <li>Please ensure the appliance is accessible and the working area is safe for the technician.</li>
                        <li>Provide accurate information about the appliance model and issue when booking.</li>
                        <li>Do not attempt DIY repairs on the appliance before the technician's visit.</li>
                    </ul>
                </Section>

                <Section title="8. Limitation of Liability">
                    Sorted Solutions is not liable for any pre-existing damage to the appliance, loss of data, or consequential damages arising from the use of our services. Our liability is limited to the cost of the repair service provided.
                </Section>

                <Section title="9. Privacy">
                    Your personal information (name, phone, address) is used only to fulfill service bookings and is never sold to third parties. Please read our <a href="/privacy" style={{ color: '#6366f1' }}>Privacy Policy</a> for full details.
                </Section>

                <Section title="10. Changes to Terms">
                    Sorted Solutions reserves the right to update these Terms at any time. Continued use of our services after changes constitutes acceptance of the updated terms. The effective date at the top of this page will reflect the latest revision.
                </Section>

                <Section title="11. Contact & Registered Address">
                    <p>For any questions about these Terms, contact us at <a href="mailto:support@sortedsolutions.in" style={{ color: '#6366f1' }}>support@sortedsolutions.in</a> or call <a href="tel:+918928895590" style={{ color: '#6366f1' }}>+91 89288 95590</a>.</p>
                    <p style={{ marginTop: '12px' }}><strong>Registered Address:</strong> A-138, Orchard Business Park, Royal Palms, Aarey Colony, Goregaon East, Mumbai 400065</p>
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
