'use client'

import { useState } from 'react';
import { Phone, Mail, MapPin, X } from 'lucide-react';
import './FooterSection.css';

function FooterSection() {
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', location: '', experience: '' });

    const locations = ['Andheri', 'Dadar', 'Ghatkopar', 'Mumbai Central', 'Kurla', 'Parel'];

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Join form:', formData);
        setShowJoinForm(false);
        setFormData({ name: '', email: '', location: '', experience: '' });
    };

    return (
        <footer className="footer-section">
            <div className="footer-content">
                <div className="footer-column">
                    <h3>Quick Links</h3>
                    <a href="/contact">Contact Us</a>
                    <a href="/terms">Terms & Conditions</a>
                    <a href="/privacy">Privacy Policy</a>
                    <a href="/accessibility">Accessibility Statement</a>
                </div>

                <div className="footer-column">
                    <h3>Join Our Team</h3>
                    <button className="join-button" onClick={() => setShowJoinForm(true)}>
                        Are You A Technician?
                    </button>
                </div>

                <div className="footer-column">
                    <h3>Head Office</h3>
                    <p className="office-address">
                        <MapPin size={16} />
                        A138 Orchard Mall, Royal Palms, Goregaon East
                    </p>
                    <h4>Other Locations</h4>
                    <div className="locations-grid">
                        {locations.map((loc) => (
                            <span key={loc} className="location-tag">{loc}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2024 Sorted Solutions. All rights reserved.</p>
            </div>

            {/* Join Form Modal */}
            {showJoinForm && (
                <div className="modal-overlay" onClick={() => setShowJoinForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowJoinForm(false)}>
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




