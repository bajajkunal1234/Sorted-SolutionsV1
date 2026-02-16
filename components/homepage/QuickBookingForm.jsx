'use client'

import { useState, useEffect } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import './QuickBookingForm.css';

function QuickBookingForm({ preSelectedCategory }) {
    // Map slugs to IDs
    const categoryMapping = {
        'ac-repair': '2',
        'washing-machine-repair': '5',
        'refrigerator-repair': '1',
        'oven-repair': '3',
        'water-purifier-repair': '6',
        'hob-repair': '4'
    };

    const initialCategory = preSelectedCategory ?
        (categoryMapping[preSelectedCategory] || preSelectedCategory) : '';

    const [formData, setFormData] = useState({
        category: initialCategory,
        subcategory: '',
        issue: '',
        pincode: ''
    });
    const [isPincodeValid, setIsPincodeValid] = useState(false);
    const [settings, setSettings] = useState({
        title: 'Book A Technician Now',
        subtitle: 'Get same day service | Transparent pricing | Licensed technicians',
        serviceable_pincodes: [],
        valid_pincode_message: '✓ We serve here!',
        invalid_pincode_message: '✗ Not serviceable',
        help_text: 'We currently serve Mumbai areas. Call us for other locations.',
        categories: []
    });
    const [loading, setLoading] = useState(true);

    // Load hierarchical data and global settings
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load global settings from API
                const res = await fetch('/api/settings/quick-booking');
                const data = await res.json();
                if (data.success) {
                    setSettings(data.data);
                }
            } catch (error) {
                console.error('Error loading booking data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Get filtered data (only items with showOnBookingForm: true)
    const visibleCategories = (settings.categories || []).filter(c => c.showOnBookingForm) || [];
    const selectedCategory = visibleCategories.find(c => c.id === parseInt(formData.category));
    const visibleSubcategories = (selectedCategory?.subcategories || []).filter(s => s.showOnBookingForm) || [];
    const selectedSubcategory = visibleSubcategories.find(s => s.id === parseInt(formData.subcategory));
    const visibleIssues = (selectedSubcategory?.issues || []).filter(i => i.showOnBookingForm) || [];


    const handlePincodeChange = (e) => {
        const pincode = e.target.value;
        setFormData({ ...formData, pincode });

        if (pincode.length === 6) {
            setIsPincodeValid(settings.serviceable_pincodes.includes(pincode));
        } else {
            setIsPincodeValid(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isPincodeValid && formData.category && formData.subcategory && formData.issue) {
            // Redirect to customer login to book service
            window.location.href = '/customer/login';
        }
    };

    return (
        <div className={`quick-booking-form ${loading ? 'loading' : ''}`}>
            <h3 className="form-title">{settings.title}</h3>
            <p className="form-subtitle">{settings.subtitle}</p>

            <form onSubmit={handleSubmit}>
                {/* Field 1: Select Appliance (Category) */}
                <div className="form-group">
                    <label htmlFor="category">Select Your Appliance</label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({
                            category: e.target.value,
                            subcategory: '',
                            issue: '',
                            pincode: formData.pincode
                        })}
                        required
                        aria-label="Select appliance type"
                    >
                        <option value="">Choose appliance...</option>
                        {visibleCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Field 2: Select Appliance Type (Subcategory) */}
                {formData.category && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="subcategory">Select Appliance Type</label>
                        <select
                            id="subcategory"
                            value={formData.subcategory}
                            onChange={(e) => setFormData({
                                ...formData,
                                subcategory: e.target.value,
                                issue: ''
                            })}
                            required
                            aria-label="Select appliance type"
                        >
                            <option value="">Choose type...</option>
                            {visibleSubcategories.map((subcategory) => (
                                <option key={subcategory.id} value={subcategory.id}>
                                    {subcategory.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Field 3: What's the Problem? (Issue) */}
                {formData.subcategory && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="issue">What's the Problem?</label>
                        <select
                            id="issue"
                            value={formData.issue}
                            onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                            required
                            aria-label="Select issue type"
                        >
                            <option value="">Select issue...</option>
                            {visibleIssues.map((issue) => (
                                <option key={issue.id} value={issue.id}>
                                    {issue.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Field 4: Your Area Pincode */}
                {formData.issue && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="pincode">Your Area Pincode</label>
                        <div className="pincode-input-wrapper">
                            <MapPin size={18} className="pincode-icon" />
                            <input
                                id="pincode"
                                type="text"
                                placeholder="Enter 6-digit pincode"
                                value={formData.pincode}
                                onChange={handlePincodeChange}
                                maxLength={6}
                                pattern="[0-9]{6}"
                                required
                                aria-label="Enter pincode"
                            />
                            {formData.pincode.length === 6 && (
                                <span className={`pincode-status ${isPincodeValid ? 'valid' : 'invalid'}`}>
                                    {isPincodeValid ? settings.valid_pincode_message : settings.invalid_pincode_message}
                                </span>
                            )}
                        </div>
                        {formData.pincode.length === 6 && !isPincodeValid && (
                            <div className="pincode-help">
                                <AlertCircle size={14} />
                                <span>{settings.help_text}</span>
                            </div>
                        )}
                    </div>
                )}

                {isPincodeValid && formData.category && formData.subcategory && formData.issue && (
                    <button type="submit" className="book-button" aria-label="Book technician">
                        <Search size={18} />
                        Book Technician Now
                    </button>
                )}
            </form>

            {/* Trust indicators */}
            <div className="form-trust">
                <span>✓ No hidden charges</span>
                <span>✓ Same day service</span>
                <span>✓ Genuine parts</span>
            </div>
        </div>
    );
}

export default QuickBookingForm;



