import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, Mail, Phone, MessageSquare, CheckCircle2 } from 'lucide-react';

export const metadata = {
    title: 'Accessibility Statement | Sorted Solutions Mumbai',
    description: 'Sorted Solutions commitment to digital accessibility for all users of our doorstep appliance repair booking platform in Mumbai.',
    alternates: { canonical: '/v2/accessibility' },
};

export default function V2AccessibilityPage() {
    return (
        <div className="v2-policy-wrap">
            <div className="v2-policy-container">
                {/* Mobile Top Navigation */}
                <div className="v2-policy-mobile-nav">
                    <Link href="/v2" className="v2-policy-back-btn" aria-label="Back to home">
                        <ArrowLeft size={18} />
                    </Link>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--v2-ink)' }}>Accessibility</span>
                    <div style={{ width: 38 }} />
                </div>

                {/* Desktop Breadcrumbs */}
                <nav className="v2-policy-breadcrumbs" aria-label="Breadcrumb">
                    <Link href="/v2">Home</Link>
                    <span>/</span>
                    <span className="current">Accessibility Statement</span>
                </nav>

                {/* Hero Header */}
                <div className="v2-policy-hero">
                    <div className="v2-policy-tag">
                        <span>Digital Inclusion</span>
                    </div>
                    <h1 className="v2-policy-title">Accessibility Statement</h1>
                    <p className="v2-policy-subtitle">
                        Sorted Solutions is dedicated to providing an inclusive, accessible digital experience for all users across our web and mobile booking platforms.
                    </p>
                    <div className="v2-policy-meta-pill">
                        <Eye size={14} />
                        <span>Last Reviewed: March 2025</span>
                    </div>
                </div>

                {/* Section 1 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">Our Commitment</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            Sorted Solutions (operated by Perfect Trading Company) is committed to ensuring digital accessibility for people with disabilities. We continually refine our user interface to adhere to relevant accessibility standards and improve usability for everyone.
                        </p>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">Conformance Status</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            We aim to adhere to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>. These guidelines provide actionable criteria to make web content accessible to individuals with visual, auditory, cognitive, and motor disabilities.
                        </p>
                    </div>
                </div>

                {/* Section 3 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">Measures We Implement</h2>
                    <div className="v2-policy-card-body">
                        <p>To support digital accessibility across our platform, Sorted Solutions implements the following measures:</p>
                        <ul>
                            <li>All informative images and service icons include clear, descriptive <code>alt</code> text.</li>
                            <li>The entire booking and browsing workflow is navigable via standard keyboard controls.</li>
                            <li>High text-to-background contrast ratios meeting or exceeding WCAG AA standards.</li>
                            <li>Form fields and inputs feature associated labels, ARIA landmarks, and screen reader announcements.</li>
                            <li>Descriptive inline error indicators and assistive feedback during booking and OTP flows.</li>
                            <li>Dynamic, responsive typography with pinch-to-zoom and user scaling enabled on mobile devices.</li>
                            <li>Prominent, visible focus rings on all interactive buttons, links, and modal dialogs.</li>
                        </ul>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">Known Limitations</h2>
                    <div className="v2-policy-card-body">
                        <p>While we actively test and optimize our interfaces, some legacy or third-party components may have limitations:</p>
                        <ul>
                            <li>Certain archived PDF invoices or historical receipts may not have full screen reader tagging.</li>
                            <li>Embedded third-party widgets (e.g. Google Maps or payment gateway iFrames) operate under the design rules of their respective vendors.</li>
                        </ul>
                        <p>We are continuously working with our partners and development team to remediate any remaining barriers.</p>
                    </div>
                </div>

                {/* Section 5: Alternative Ways to Book */}
                <div className="v2-policy-card">
                    <h2 className="v2-policy-card-title">Alternative Ways to Book</h2>
                    <div className="v2-policy-card-body">
                        <p>
                            If you encounter any difficulty navigating our online platform, our customer assistance team is pleased to complete your booking directly over the phone or WhatsApp:
                        </p>
                        <ul>
                            <li><strong>Call Support:</strong> <a href="tel:+918928895590">+91 89288 95590</a></li>
                            <li><strong>WhatsApp Chat:</strong> <a href="https://wa.me/918928895590" target="_blank" rel="noopener noreferrer">Message our operations desk on WhatsApp</a></li>
                            <li><strong>Email Inquiries:</strong> <a href="mailto:support@sortedsolutions.in">support@sortedsolutions.in</a></li>
                        </ul>
                        <p>Our operational desk is active Monday through Sunday, from 8:00 AM to 8:00 PM.</p>
                    </div>
                </div>

                {/* Section 6: Feedback Box */}
                <div className="v2-policy-card" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                    <h2 className="v2-policy-card-title" style={{ color: 'var(--v2-brand)' }}>
                        Accessibility Feedback
                    </h2>
                    <div className="v2-policy-card-body">
                        <p>
                            We value your direct input. If you discover an accessibility issue or have a recommendation to improve your experience, please reach out to our team:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0' }}>
                            <a
                                href="mailto:support@sortedsolutions.in"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#6338f5', textDecoration: 'none', fontWeight: 600 }}
                            >
                                <Mail size={16} />
                                <span>support@sortedsolutions.in</span>
                            </a>
                            <a
                                href="tel:+918928895590"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#6338f5', textDecoration: 'none', fontWeight: 600 }}
                            >
                                <Phone size={16} />
                                <span>+91 89288 95590</span>
                            </a>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--v2-muted)', margin: 0 }}>
                            We aim to acknowledge and address accessibility feedback within 2 business days.
                        </p>
                    </div>
                </div>

                {/* Bottom Call to Action */}
                <div className="v2-policy-cta">
                    <h3>Explore Verified Doorstep Services</h3>
                    <p>
                        Convenient doorstep repair across Mumbai for ACs, Fridges, Washing Machines, and more.
                    </p>
                    <Link href="/v2/services" className="v2-policy-cta-btn">
                        <span>Browse Catalog</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
