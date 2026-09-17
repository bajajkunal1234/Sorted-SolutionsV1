'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, X } from 'lucide-react';
import './FooterSection.css';

function FooterSection() {
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', location: '', experience: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Join form:', formData);
        setShowJoinForm(false);
        setFormData({ name: '', email: '', location: '', experience: '' });
    };

    return (
        <footer className="footer-section">
            <div className="footer-content">
                {/* Column 1: Company & Registered Office */}
                <div className="footer-column company-column">
                    <h3 className="company-title">Sorted Solutions</h3>
                    <p className="company-unit-tag">A unit of Perfect Trading Company</p>
                    <div className="office-address">
                        <MapPin size={18} className="address-icon" />
                        <div>
                            <strong>Registered Address:</strong><br />
                            A-138, Orchard Corporate Park, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai, Maharashtra, 400065
                        </div>
                    </div>
                    <div className="registration-details">
                        <p><strong>Registration / Udyam No:</strong> UDYAM-MH-14-0212678</p>
                        <p><strong>GSTIN:</strong> 27DJQPB0215Q1ZY</p>
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className="footer-column">
                    <h3>Quick Links</h3>
                    <Link href="/contact">Contact Us</Link>
                    <Link href="/terms">Terms & Conditions</Link>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/accessibility">Accessibility Statement</Link>
                </div>

                {/* Column 3: Contact Us & Join Our Team */}
                <div className="footer-column">
                    <h3>Contact Us</h3>
                    <div className="contact-links-list">
                        <a 
                            href="tel:+918928895590" 
                            className="contact-item"
                            onClick={() => { 
                                if (typeof window !== 'undefined') { 
                                    window.dataLayer = window.dataLayer || []; 
                                    window.dataLayer.push({ event: 'custom_call_click' }); 
                                } 
                            }}
                        >
                            <Phone size={16} />
                            <span>Phone: +91-8928895590</span>
                        </a>
                        <a href="mailto:support@sortedsolutions.in" className="contact-item">
                            <Mail size={16} />
                            <span>Email: support@sortedsolutions.in</span>
                        </a>
                    </div>

                    <div className="join-team-block">
                        <h4>Join Our Team</h4>
                        <button className="join-button" onClick={() => setShowJoinForm(true)}>
                            Are You A Technician?
                        </button>
                    </div>
                </div>
            </div>

            {/* Brand & Service Disclaimer */}
            <div className="footer-disclaimer">
                <p>
                    <strong>Disclaimer:</strong> Sorted Solutions is an independent doorstep appliance repair service. We are not an authorized service center for, nor are we affiliated with, any specific appliance brands or manufacturers. All product names, logos, and brands are property of their respective owners.
                </p>
            </div>

            {/* Bottom Copyright */}
            <div className="footer-bottom">
                <p>©️ 2026 Perfect Trading Company. All Rights Reserved.</p>
            </div>

            {/* Join Form Modal */}
            {showJoinForm && (
                <div className="modal-overlay" onClick={() => setShowJoinForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowJoinForm(false)} aria-label="Close modal">
                            <X size={24} />
                        </button>
                        <h2>Join Our Team</h2>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Years of Experience"
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                required
                            />
                            <button type="submit" className="submit-button">Submit Application</button>
                        </form>
                    </div>
                </div>
            )}
        </footer>
    );
}

export default FooterSection;




