'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Calendar, Loader2 } from 'lucide-react';
import BookingSteps from './BookingSteps';
import './BookingWizard.css';

export default function BookingWizard() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState('service');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data for "pretty" display of pre-filled IDs
    const [metadata, setMetadata] = useState({
        categories: [],
        subcategories: [],
        issues: []
    });

    const [formData, setFormData] = useState({
        // Service Details
        category: '',
        subcategory: '',
        issue: '',
        pincode: '',

        // Contact Info
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        address: '',
        apartment: '',
        city: '',
        state: '',
        zip: '',
        specialInstructions: '',
        smsAlerts: false,

        // Slot Info
        date: '',
        timeSlot: ''
    });

    // Load initial data and parse URL params
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);

                // 1. Fetch metadata to resolve IDs to names
                const res = await fetch('/api/settings/quick-booking');
                const data = await res.json();

                if (data.success) {
                    // Flatten data structures for easy lookup
                    const categories = data.data.categories || [];
                    const subcategories = categories.flatMap(c => c.subcategories || []);
                    const issues = subcategories.flatMap(s => s.issues || []);

                    setMetadata({ categories, subcategories, issues });
                }

                // 2. Parse URL params
                const categoryId = searchParams.get('category');
                const subcategoryId = searchParams.get('subcategory');
                const issueId = searchParams.get('issue');
                const pincode = searchParams.get('pincode');

                if (categoryId) {
                    setFormData(prev => ({
                        ...prev,
                        category: categoryId,
                        subcategory: subcategoryId || '',
                        issue: issueId || '',
                        pincode: pincode || ''
                    }));
                }
            } catch (error) {
                console.error('Failed to initialize booking wizard', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [searchParams]);

    // Helper to get name from ID
    const getName = (type, id) => {
        if (!id) return '';
        const output = metadata[type === 'appliance' ? 'categories' : type === 'type' ? 'subcategories' : 'issues']
            .find(item => item.id.toString() === id.toString());
        return output ? output.name : 'Selected';
    };

    const handleNext = () => {
        if (currentStep === 'service') setCurrentStep('contact');
        else if (currentStep === 'contact') setCurrentStep('slot');
        else if (currentStep === 'slot') setCurrentStep('review');
    };

    const handleBack = () => {
        if (currentStep === 'contact') setCurrentStep('service');
        else if (currentStep === 'slot') setCurrentStep('contact');
        else if (currentStep === 'review') setCurrentStep('slot');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                categoryId: formData.category,
                subcategoryId: formData.subcategory,
                issueId: formData.issue,
                pincode: formData.pincode,
                description: formData.specialInstructions,
                customer: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    address: {
                        street: formData.address,
                        apartment: formData.apartment,
                        city: formData.city,
                        state: formData.state,
                        zip: formData.zip
                    }
                },
                schedule: {
                    date: formData.date,
                    slot: formData.timeSlot
                }
            };

            console.log('Submitting Booking:', payload);

            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to complete booking');
            }

            // Success!
            router.push('/booking/success?id=' + result.jobId);

        } catch (error) {
            console.error('Booking failed:', error);
            alert(error.message || 'Failed to submit booking. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader2 className="animate-spin" color="var(--color-primary)" size={40} />
            </div>
        );
    }

    return (
        <div className="booking-wizard-container animate-slide-in">
            <div className="booking-card">
                {/* Header / Stepper */}
                <div className="booking-header">
                    <BookingSteps currentStep={currentStep} />
                </div>

                <div className="booking-body">
                    {/* Step 1: Service Detail */}
                    {currentStep === 'service' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Service Details</h2>

                            <div className="service-summary">
                                <div className="summary-row">
                                    <span className="summary-label">Appliance</span>
                                    <span className="summary-value">{getName('appliance', formData.category)}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Service Type</span>
                                    <span className="summary-value">{getName('type', formData.subcategory)}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Issue</span>
                                    <span className="summary-value">{getName('issue', formData.issue)}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Pincode</span>
                                    <span className="summary-value">{formData.pincode}</span>
                                </div>
                            </div>

                            <p style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                ℹ️ Service details are pre-selected. Go back to homepage to change.
                            </p>
                        </div>
                    )}

                    {/* Step 2: Contact Info */}
                    {currentStep === 'contact' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>How do we reach you?</h2>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Email Address*</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number*</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="+91-0000000000"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                                <input
                                    type="checkbox"
                                    id="smsAlerts"
                                    checked={formData.smsAlerts}
                                    onChange={e => setFormData({ ...formData, smsAlerts: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <label htmlFor="smsAlerts" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Send me alerts about my booking by text message.
                                </label>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-lg)' }} className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">First Name*</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name*</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Street Address*</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Suite, Apt, etc...</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.apartment}
                                    onChange={e => setFormData({ ...formData, apartment: e.target.value })}
                                />
                            </div>

                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div className="form-group">
                                    <label className="form-label">City*</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State*</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.state}
                                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Zipcode*</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.zip}
                                        onChange={e => setFormData({ ...formData, zip: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Special Instructions</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={formData.specialInstructions}
                                    onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
                                    placeholder="Gate code, parking instructions, etc."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Slot Selection */}
                    {currentStep === 'slot' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Choose a Date & Time</h2>
                            <div style={{ padding: 'var(--spacing-2xl) 0', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                                <Calendar className="text-secondary" size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Availability Slot</h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', maxWidth: '300px', margin: '0 auto' }}>
                                    Select a preferred time slot for your service appointment.
                                </p>

                                <div className="slots-container" style={{ maxWidth: '500px', margin: 'var(--spacing-xl) auto 0' }}>
                                    {['Morning (8am - 12pm)', 'Afternoon (12pm - 4pm)', 'Evening (4pm - 8pm)'].map(slot => (
                                        <div
                                            key={slot}
                                            onClick={() => setFormData({ ...formData, timeSlot: slot })}
                                            className={`slot-button ${formData.timeSlot === slot ? 'selected' : ''}`}
                                        >
                                            {slot}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 'review' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Review Your Booking</h2>

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Service Overview</h3>
                                    <div className="form-grid" style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Appliance</span>
                                            <div style={{ fontWeight: 600 }}>{getName('appliance', formData.category)}</div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Issue</span>
                                            <div style={{ fontWeight: 600 }}>{getName('issue', formData.issue)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Contact Details</h3>
                                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <div style={{ fontWeight: 600 }}>{formData.firstName} {formData.lastName}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)' }}>{formData.email} | {formData.phone}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                            {formData.address}, {formData.apartment && formData.apartment + ','} {formData.city}, {formData.state} {formData.zip}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: 'var(--spacing-md)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Schedule</h3>
                                    <div style={{ fontWeight: 600, marginTop: 'var(--spacing-sm)' }}>
                                        {formData.timeSlot || 'Preferred slot to be confirmed'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="booking-footer">
                    {currentStep !== 'service' ? (
                        <button
                            onClick={handleBack}
                            className="btn btn-secondary"
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {currentStep === 'review' ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn btn-primary"
                            style={{ padding: '12px 32px' }}
                        >
                            {submitting ? 'Processing...' : 'Complete Booking'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="btn btn-primary"
                            style={{ padding: '12px 32px' }}
                        >
                            Next Step <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
