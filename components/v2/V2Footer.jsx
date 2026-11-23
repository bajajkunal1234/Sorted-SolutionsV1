'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Mail, MapPin, X, MessageSquare, CheckCircle2, Wrench } from 'lucide-react';
import './V2Footer.css';

function pushGtm(event) {
    if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event });
    }
}

export default function V2Footer() {
    const pathname = usePathname();
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        location: '',
        experience: '',
        specialty: 'All Appliances'
    });

    // Do not show full footer on dedicated checkout funnel
    if (pathname === '/v2/checkout') {
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            setShowJoinForm(false);
            setSubmitted(false);
            setFormData({ name: '', phone: '', location: '', experience: '', specialty: 'All Appliances' });
        }, 3200);
    };

    return (
        <footer className="v2-footer" aria-label="Website Footer">
            <div className="v2-footer-inner">
                <div className="v2-footer-grid">
                    {/* Column 1: Company Identity & Legal Registration */}
                    <div className="v2-footer-col">
                        <div className="v2-footer-brand-title">Sorted Solutions</div>
                        <div className="v2-footer-brand-unit">A unit of Perfect Trading Company</div>

                        <div className="v2-footer-address-box">
                            <MapPin size={18} className="v2-footer-address-icon" />
                            <div>
                                <strong>Registered Address:</strong><br />
                                A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra, 400065
                            </div>
                        </div>

                        <div className="v2-footer-reg-details">
                            <div>
                                <strong>Registration / Udyam No:</strong> UDYAM-MH-14-0212678
                            </div>
                            <div>
                                <strong>GSTIN:</strong> 27DJQPB0215Q1ZY
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="v2-footer-col">
                        <h3>Quick Links</h3>
                        <nav className="v2-footer-links-list" aria-label="Footer navigation">
                            <Link href="/v2/contact" className="v2-footer-link">
                                About Us / Contact Us
                            </Link>
                            <Link href="/v2/terms" className="v2-footer-link">
                                Terms, Cancellations &amp; Warranty
                            </Link>
                            <Link href="/v2/privacy" className="v2-footer-link">
                                Privacy Policy
                            </Link>
                            <Link href="/v2/accessibility" className="v2-footer-link">
                                Accessibility Statement
                            </Link>
                        </nav>
                    </div>

                    {/* Column 3: Contact & Join Our Team */}
                    <div className="v2-footer-col">
                        <h3>Contact Us</h3>
                        <div className="v2-footer-contact-list">
                            <a
                                href="tel:+918928895590"
                                className="v2-footer-contact-item"
                                onClick={() => pushGtm('custom_call_click')}
                            >
                                <Phone size={16} />
                                <span>Phone: +91-8928895590</span>
                            </a>
                            <a
                                href="mailto:support@sortedsolutions.in"
                                className="v2-footer-contact-item"
                            >
                                <Mail size={16} />
                                <span>Email: support@sortedsolutions.in</span>
                            </a>
                        </div>

                        <h4>Join Our Team</h4>
                        <button
                            type="button"
                            className="v2-footer-join-btn"
                            onClick={() => setShowJoinForm(true)}
                        >
                            <Wrench size={15} />
                            <span>Are You A Technician?</span>
                        </button>
                    </div>
                </div>

                <div className="v2-footer-divider" />

                {/* Statutory Disclaimer */}
                <div className="v2-footer-disclaimer">
                    <p>
                        <strong>Disclaimer:</strong> Sorted Solutions is an independent doorstep appliance repair service.
                        We are not an authorized service center for, nor are we affiliated with, any specific appliance brands or manufacturers.
                        All product names, logos, and brands are property of their respective owners.
                    </p>
                </div>

                {/* Bottom Bar: Copyright */}
                <div className="v2-footer-bottom">
                    <div>
                        © 2026 Perfect Trading Company. All Rights Reserved.
                    </div>
                    <div className="v2-footer-badges">
                        <span>Certified Doorstep Appliance Repair · Mumbai</span>
                    </div>
                </div>
            </div>

            {/* Technician Application Modal */}
            {showJoinForm && (
                <div
                    className="v2-footer-modal-overlay"
                    onClick={() => setShowJoinForm(false)}
                >
                    <div
                        className="v2-footer-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="v2-footer-modal-close"
                            onClick={() => setShowJoinForm(false)}
                            aria-label="Close technician modal"
                        >
                            <X size={18} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #6338f5 0%, #7c3aed 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Wrench size={18} color="#fff" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                                Join Our Technician Team
                            </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                            Earn steady income with on-time payouts across Mumbai with Sorted Solutions.
                        </p>

                        {submitted ? (
                            <div style={{
                                marginTop: 24,
                                padding: '20px 16px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid #10b981',
                                borderRadius: 12,
                                textAlign: 'center'
                            }}>
                                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                                <h4 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>Application Received!</h4>
                                <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                                    Thank you, {formData.name}. Our operations head will call you within 24 hours.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="v2-footer-form">
                                <div className="v2-footer-input-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Rahul Sharma"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="v2-footer-input-group">
                                    <label>Mobile Number (WhatsApp Preferred)</label>
                                    <input
                                        type="tel"
                                        placeholder="10-digit mobile number"
                                        pattern="[0-9]{10}"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="v2-footer-input-group">
                                    <label>Your Area / Locality in Mumbai</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Andheri East, Malad, Thane, Navi Mumbai"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="v2-footer-input-group">
                                    <label>Years of Experience</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 3"
                                        min="0"
                                        max="40"
                                        value={formData.experience}
                                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="v2-footer-input-group">
                                    <label>Primary Appliance Specialty</label>
                                    <select
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    >
                                        <option value="Air Conditioner (AC)">Air Conditioner (AC)</option>
                                        <option value="Refrigerator / Fridge">Refrigerator / Fridge</option>
                                        <option value="Washing Machine">Washing Machine</option>
                                        <option value="Microwave & Oven">Microwave &amp; Oven</option>
                                        <option value="Water Purifier (RO)">Water Purifier (RO)</option>
                                        <option value="HOB / Gas Stove">HOB / Gas Stove</option>
                                        <option value="All Appliances">Multi-Appliance Specialist</option>
                                    </select>
                                </div>

                                <button type="submit" className="v2-footer-submit-btn">
                                    Submit Application
                                </button>

                                <a
                                    href="https://wa.me/918928895590?text=Hello%20Sorted%20Solutions%20Operations%2C%20I%20am%20a%20technician%20and%20would%20like%20to%20join%20your%20team."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="v2-footer-whatsapp-btn"
                                    onClick={() => pushGtm('custom_whatsapp_click')}
                                >
                                    <MessageSquare size={16} />
                                    <span>Or Chat Directly on WhatsApp</span>
                                </a>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </footer>
    );
}
