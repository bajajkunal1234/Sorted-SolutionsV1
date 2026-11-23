import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock } from 'lucide-react';

export const metadata = {
    title: 'Privacy Policy | Sorted Solutions Mumbai',
    description: 'Learn how Sorted Solutions (Perfect Trading Company) collects, uses, and safeguards your personal information when booking appliance repair services in Mumbai.',
    alternates: { canonical: '/v2/privacy' },
};

const EFFECTIVE_DATE = 'March 1, 2025';

export default function V2PrivacyPage() {
    return (
        <div className="v2-policy-wrap">
            <div className="v2-policy-container">
                {/* Mobile Top Navigation */}
                <div className="v2-policy-mobile-nav">
                    <Link href="/v2" className="v2-policy-back-btn" aria-label="Back to home">
                        <ArrowLeft size={18} />
                    </Link>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--v2-ink)' }}>Privacy Policy</span>
                    <div style={{ width: 38 }} />
                </div>

                {/* Desktop Breadcrumbs */}
                <nav className="v2-policy-breadcrumbs" aria-label="Breadcrumb">
                    <Link href="/v2">Home</Link>
                    <span>/</span>
                    <span className="current">Privacy Policy</span>
                </nav>

                {/* Hero Header */}
                <div className="v2-policy-hero">
                    <div className="v2-policy-tag">
                        <span>Data Protection &amp; Transparency</span>
                    </div>
                    <h1 className="v2-policy-title">Privacy Policy</h1>
                    <p className="v2-policy-subtitle">
                        Learn how Sorted Solutions collects, utilizes, and protects your personal data when you interact with our platform or book doorstep services.
                    </p>
                    <div className="v2-policy-meta-pill">
                        <Lock size={14} />
                        <span>Effective Date: {EFFECTIVE_DATE}</span>
                    </div>
                </div>

                {/* Section 1 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">1. Introduction</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Welcome to Sorted Solutions, a consumer brand and trade name operated by our legally registered entity, <strong>Perfect Trading Company</strong>. We respect your privacy and are committed to protecting your personal information.
                        </p>
                        <p>
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit our website (<a href="https://sortedsolutions.in">sortedsolutions.in</a>), use our customer portal, schedule service bookings, or contact our support team.
                        </p>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">2. Information We Collect</h2>
                    <div className="v2-policy-card-body">
                        <p>To provide our doorstep appliance repair and AMC services, we may collect the following categories of personal information:</p>
                        <ul>
                            <li><strong>Contact Information:</strong> Your name, phone number, email address, and complete physical address/location for technician dispatch.</li>
                            <li><strong>Service Details:</strong> Information regarding your appliances, model numbers, service history, and specific issues or complaints reported.</li>
                            <li><strong>Device and Usage Data:</strong> Standard log data such as IP address, browser type, operating system, and pages visited, which helps us improve performance and site usability.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 3 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">3. How We Use Your Information</h2>
                    <div className="v2-policy-card-body">
                        <p>We use the collected information strictly for legitimate business operations and service delivery. Specifically, we use your data to:</p>
                        <ul>
                            <li>Schedule and dispatch field service technicians to your location.</li>
                            <li>Generate job estimates, tax invoices, and process secure payments.</li>
                            <li>Send booking confirmations, appointment reminders, technician status, and updates.</li>
                            <li>Honor our standard 30-day labor warranty and itemized spare parts warranties.</li>
                            <li>Provide dedicated customer support and address inquiries or feedback.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">4. How We Share Your Information</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            We value your trust. <strong>We do not sell, rent, or trade your personal information to third parties or marketing brokers.</strong> We share your data only in the following limited, operational circumstances:
                        </p>
                        <ul>
                            <li><strong>With Our Technicians:</strong> Your name, service address, and phone number are shared with our internally managed technicians solely to fulfill the requested repair job.</li>
                            <li><strong>For Legal &amp; Statutory Compliance:</strong> We may disclose data if mandated by applicable Indian law, government regulatory authority, or to protect the rights, property, and safety of Perfect Trading Company, our staff, or customers.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 5 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">5. Data Security</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            We implement standard technical and organizational security measures—including TLS encryption, role-based database permissions, and secure server environments—to safeguard your information from unauthorized access, loss, or misuse.
                        </p>
                    </div>
                </div>

                {/* Section 6 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">6. Cookies and Tracking</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Our website uses essential cookies and performance analytics (e.g., Google Analytics) to preserve your session, remember cart items, and analyze traffic trends. You can disable cookies in your browser settings, although certain features like cart persistence may be impacted.
                        </p>
                    </div>
                </div>

                {/* Section 7 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">7. Third-Party Links</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Our platform may contain links to external third-party services (such as payment gateways or mapping providers). We are not responsible for the privacy practices or policies of external sites. We encourage you to review their respective privacy statements.
                        </p>
                    </div>
                </div>

                {/* Section 8 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">8. Changes to This Privacy Policy</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            We may periodically update this policy to reflect operational or regulatory adjustments. Revisions will be published directly on this page with an updated effective date. Continued use of our platform constitutes agreement to the updated policy.
                        </p>
                    </div>
                </div>

                {/* Section 9 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">9. Contact Us</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our data team:
                        </p>
                        <div style={{ marginTop: 12, lineHeight: 1.8 }}>
                            <p><strong>Legal Entity:</strong> Perfect Trading Company (Operating as Sorted Solutions)</p>
                            <p><strong>Email:</strong> <a href="mailto:support@sortedsolutions.in">support@sortedsolutions.in</a></p>
                            <p><strong>Phone:</strong> <a href="tel:+918928895590">+91 89288 95590</a></p>
                            <p><strong>Registered Office:</strong> A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra 400065</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Call to Action */}
                <div className="v2-policy-cta">
                    <h3>Book Doorstep Service with Total Peace of Mind</h3>
                    <p>
                        Upfront transparent estimates, certified field engineers, and complete data privacy across Mumbai.
                    </p>
                    <Link href="/v2/services" className="v2-policy-cta-btn">
                        <span>Book an Appointment</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
