'use client'

import { useState } from 'react'
import { Calendar, MapPin, Wrench, ArrowRight, X } from 'lucide-react'
import './QuickBookingEmbed.css'

export default function QuickBookingEmbed({ preSelectedCategory, compact = false }) {
    const [isExpanded, setIsExpanded] = useState(!compact)
    const [formData, setFormData] = useState({
        category: preSelectedCategory || '',
        location: '',
        date: '',
        issue: ''
    })

    const categories = [
        { value: 'ac-repair', label: 'AC Repair' },
        { value: 'washing-machine-repair', label: 'Washing Machine' },
        { value: 'oven-repair', label: 'Oven Repair' },
        { value: 'refrigerator-repair', label: 'Refrigerator' },
        { value: 'water-purifier-repair', label: 'Water Purifier' },
        { value: 'hob-repair', label: 'HOB Repair' }
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        // Redirect to customer login to book service
        window.location.href = '/customer/login'
    }

    if (compact && !isExpanded) {
        return (
            <div className="quick-booking-compact" onClick={() => setIsExpanded(true)}>
                <div className="compact-content">
                    <Wrench size={24} />
                    <span>Quick Booking</span>
                    <ArrowRight size={20} />
                </div>
            </div>
        )
    }

    return (
        <div className="quick-booking-embed">
            {compact && (
                <button
                    className="close-booking"
                    onClick={() => setIsExpanded(false)}
                    aria-label="Close booking form"
                >
                    <X size={20} />
                </button>
            )}

            <div className="booking-header">
                <Wrench size={28} className="booking-icon" />
                <div>
                    <h3 className="booking-title">Quick Booking</h3>
                    <p className="booking-subtitle">Get instant service in 3 easy steps</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-row">
                    <div className="form-field">
                        <label className="field-label">
                            <Wrench size={16} />
                            Service Type
                        </label>
                        <select
                            className="field-input"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Service</option>
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <MapPin size={16} />
                            Location
                        </label>
                        <input
                            type="text"
                            className="field-input"
                            placeholder="Enter your area"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label className="field-label">
                            <Calendar size={16} />
                            Preferred Date
                        </label>
                        <input
                            type="date"
                            className="field-input"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <Wrench size={16} />
                            Issue Description
                        </label>
                        <input
                            type="text"
                            className="field-input"
                            placeholder="Brief description"
                            value={formData.issue}
                            onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                        />
                    </div>
                </div>

                <button type="submit" className="booking-submit-btn">
                    Book Now
                    <ArrowRight size={20} />
                </button>
            </form>

            <div className="booking-features">
                <div className="feature-badge">
                    <span className="badge-icon">✓</span>
                    90-Day Warranty
                </div>
                <div className="feature-badge">
                    <span className="badge-icon">✓</span>
                    Same-Day Service
                </div>
                <div className="feature-badge">
                    <span className="badge-icon">✓</span>
                    Genuine Parts
                </div>
            </div>
        </div>
    )
}
