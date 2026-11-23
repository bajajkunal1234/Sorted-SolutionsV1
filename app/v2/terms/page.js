import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldAlert, FileText } from 'lucide-react';

export const metadata = {
    title: 'Terms, Cancellations & Warranty | Sorted Solutions Mumbai',
    description: 'Read the Terms, Cancellations & Warranty conditions for using Sorted Solutions doorstep appliance repair services in Mumbai.',
    alternates: { canonical: '/v2/terms' },
};

const EFFECTIVE_DATE = 'March 1, 2025';

export default function V2TermsPage() {
    return (
        <div className="v2-policy-wrap">
            <div className="v2-policy-container">
                {/* Mobile Top Navigation */}
                <div className="v2-policy-mobile-nav">
                    <Link href="/v2" className="v2-policy-back-btn" aria-label="Back to home">
                        <ArrowLeft size={18} />
                    </Link>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--v2-ink)' }}>Terms &amp; Warranty</span>
                    <div style={{ width: 38 }} />
                </div>

                {/* Desktop Breadcrumbs */}
                <nav className="v2-policy-breadcrumbs" aria-label="Breadcrumb">
                    <Link href="/v2">Home</Link>
                    <span>/</span>
                    <span className="current">Terms, Cancellations &amp; Warranty</span>
                </nav>

                {/* Hero Header */}
                <div className="v2-policy-hero">
                    <div className="v2-policy-tag">
                        <span>Legal Agreement</span>
                    </div>
                    <h1 className="v2-policy-title">Terms, Cancellations &amp; Warranty</h1>
                    <p className="v2-policy-subtitle">
                        Please review these terms carefully before booking any doorstep repair or maintenance service with Sorted Solutions.
                    </p>
                    <div className="v2-policy-meta-pill">
                        <FileText size={14} />
                        <span>Effective Date: {EFFECTIVE_DATE}</span>
                    </div>
                </div>

                {/* Section 1 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">1. Acceptance of Terms</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            By booking a service through Sorted Solutions (a trade name operated by our legally registered entity, <strong>Perfect Trading Company</strong>), you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these terms, please do not use our services.
                        </p>
                        <p>
                            All billing, invoicing, statutory tax compliance, and official business operations are executed under Perfect Trading Company.
                        </p>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">2. Services Offered &amp; Independent Status</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Sorted Solutions provides home appliance repair, maintenance, installation, and commercial Annual Maintenance Contracts (AMCs) for appliances including Air Conditioners, Refrigerators, Washing Machines, Microwaves, Ovens, Water Purifiers, and HOB/Gas Stoves across Mumbai, Navi Mumbai, and Thane.
                        </p>
                        <p>
                            <strong>Service Capacity &amp; Qualifications:</strong> All services are fulfilled by our internally managed network of dedicated field service technicians.
                        </p>
                        <p>
                            <strong>Independent Provider:</strong> We are a strictly independent service provider. We are not an authorized service center for, nor are we affiliated with or endorsed by, any specific appliance manufacturer or brand.
                        </p>
                    </div>
                </div>

                {/* Section 3 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">3. Booking &amp; Appointments</h2>
                    <div className="v2-policy-card-body">
                        <ul>
                            <li>Bookings can be scheduled via our website, customer app portal, or phone/WhatsApp support.</li>
                            <li>A visiting/diagnosing inspection fee of <strong>₹199</strong> is charged at the time of the technician's visit, regardless of whether a repair is carried out.</li>
                            <li>The visiting fee is non-refundable once the technician has arrived at your premises.</li>
                            <li>We aim to provide same-day or next-day service, subject to technician availability in your neighborhood.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">4. Pricing &amp; Payment</h2>
                    <div className="v2-policy-card-body">
                        <ul>
                            <li>The visiting fee is payable upon arrival of the technician via UPI, credit/debit card, online portal, or cash.</li>
                            <li>Labor and repair charges are shared by the technician after diagnosis and before any work begins. You retain full right to approve or decline the estimate.</li>
                            <li>Spare parts, if required, will be itemized and quoted separately before installation.</li>
                            <li>You are under no obligation to proceed with the repair after diagnosis.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 5 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">5. Warranty on Repairs</h2>
                    <div className="v2-policy-card-body">
                        <ul>
                            <li>All repair services carried out by Sorted Solutions come with a standard <strong>30-day service warranty</strong> on labor.</li>
                            <li>This warranty covers the specific fault repaired and does not extend to new, unrelated issues or pre-existing damage.</li>
                            <li>The warranty is immediately void if the appliance is opened, modified, or repaired by any third party after our technician's visit.</li>
                            <li>Spare parts carry independent, itemized warranties based on the manufacturer's terms or the specific part replaced, which will be detailed on your final invoice.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 6 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">6. Cancellations &amp; Rescheduling</h2>
                    <div className="v2-policy-card-body">
                        <ul>
                            <li>You may cancel or reschedule a booking up to 2 hours before the scheduled appointment without any penalty.</li>
                            <li>Cancellations requested after the technician has been dispatched may incur a ₹100 cancellation fee.</li>
                            <li>To cancel or reschedule, please use your online Customer Portal or call/WhatsApp us at <a href="tel:+918928895590">+91 89288 95590</a>.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 7 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">7. Customer Responsibilities</h2>
                    <div className="v2-policy-card-body">
                        <ul>
                            <li>Please ensure the appliance is safely accessible and provide a clear, hazard-free working area for the technician.</li>
                            <li>Provide accurate information regarding the appliance brand, model, and symptoms when scheduling.</li>
                            <li>Do not attempt DIY disassembly or repairs on the appliance prior to the technician's arrival.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 8 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">8. Limitation of Liability</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Sorted Solutions is not liable for any pre-existing internal wear, physical damage, voltage fluctuations, loss of perishable goods (e.g. food inside a refrigerator), or consequential damages arising from appliance failure. Our total legal liability is strictly limited to the amount paid for the specific repair service provided.
                        </p>
                    </div>
                </div>

                {/* Section 9 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">9. Privacy &amp; Data Protection</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Your personal information (name, phone number, address) is utilized exclusively to fulfill service bookings and technician dispatch, and is never sold to third parties. Please review our <Link href="/v2/privacy">Privacy Policy</Link> for complete details.
                        </p>
                    </div>
                </div>

                {/* Section 10 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">10. Changes to Terms</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Sorted Solutions reserves the right to modify these Terms at any time. Continued use of our booking platform and services following any revisions constitutes your acceptance of the updated terms. The effective date at the top of this page indicates the date of latest publication.
                        </p>
                    </div>
                </div>

                {/* Section 11 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">11. Contact &amp; Registered Entity Details</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            If you have questions regarding these Terms &amp; Conditions, please reach out to:
                        </p>
                        <p style={{ marginTop: 10 }}>
                            <strong>Legal Entity:</strong> Perfect Trading Company (Operating as Sorted Solutions)<br />
                            <strong>Registered Address:</strong> A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra 400065<br />
                            <strong>Email:</strong> <a href="mailto:support@sortedsolutions.in">support@sortedsolutions.in</a><br />
                            <strong>Phone:</strong> <a href="tel:+918928895590">+91 89288 95590</a>
                        </p>
                    </div>
                </div>

                {/* Bottom Call to Action */}
                <div className="v2-policy-cta">
                    <h3>Ready to Book a Doorstep Service?</h3>
                    <p>
                        Experience transparent pricing, genuine spare parts, and verified Mumbai appliance repair technicians.
                    </p>
                    <Link href="/v2/services" className="v2-policy-cta-btn">
                        <span>View Services &amp; Rates</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
