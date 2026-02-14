'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin, FileText, Shield, Users } from 'lucide-react'
import './ServiceFooter.css'

export default function ServiceFooter() {
    const officeLocations = [
        { name: 'Andheri', slug: 'andheri' },
        { name: 'Dadar', slug: 'dadar' },
        { name: 'Ghatkopar', slug: 'ghatkopar' },
        { name: 'Mumbai Central', slug: 'mumbai-central' },
        { name: 'Kurla', slug: 'kurla' },
        { name: 'Parel', slug: 'parel' }
    ]

    return (
        <footer className="service-footer">
            <div className="footer-content">
                {/* Contact Information */}
                <div className="footer-column">
                    <h4 className="footer-heading">
                        <Phone size={20} />
                        Contact Us
                    </h4>
                    <div className="footer-links">
                        <a href="tel:+919876543210" className="footer-link">
                            <Phone size={16} />
                            +91 98765 43210
                        </a>
                        <a href="mailto:info@sortedsolutions.com" className="footer-link">
                            <Mail size={16} />
                            info@sortedsolutions.com
                        </a>
                        <div className="footer-link">
                            <MapPin size={16} />
                            <div>
                                <strong>Head Office:</strong><br />
                                A-138 Orchard Mall,<br />
                                Royal Palms, Goregaon East
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legal Links */}
                <div className="footer-column">
                    <h4 className="footer-heading">
                        <FileText size={20} />
                        Legal
                    </h4>
                    <div className="footer-links">
                        <Link href="/terms" className="footer-link">
                            Terms & Conditions
                        </Link>
                        <Link href="/privacy" className="footer-link">
                            Privacy Policy
                        </Link>
                        <Link href="/accessibility" className="footer-link">
                            Accessibility Statement
                        </Link>
                    </div>
                </div>

                {/* Office Locations */}
                <div className="footer-column">
                    <h4 className="footer-heading">
                        <MapPin size={20} />
                        Other Office Locations
                    </h4>
                    <div className="footer-links">
                        {officeLocations.map(location => (
                            <Link
                                key={location.slug}
                                href={`/location/${location.slug}`}
                                className="footer-link"
                            >
                                {location.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Join Us */}
                <div className="footer-column">
                    <h4 className="footer-heading">
                        <Users size={20} />
                        Join Our Team
                    </h4>
                    <div className="footer-links">
                        <Link href="/technician" className="footer-link highlight">
                            <Shield size={16} />
                            Are You A Technician?
                        </Link>
                        <p className="footer-text">
                            Join our network of skilled professionals and grow your career with us.
                        </p>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="footer-bottom">
                <p className="copyright">
                    © {new Date().getFullYear()} Sorted Solutions. All rights reserved.
                </p>
                <p className="tagline">
                    Expert Appliance Repair Services | Mumbai's Most Trusted Service Provider
                </p>
            </div>
        </footer>
    )
}
