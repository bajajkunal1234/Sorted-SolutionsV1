'use client'

import { useState, useEffect } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import './QuickBookingForm.css';

function QuickBookingForm({ preSelectedCategory, initialData }) {
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
        brand: '',
        issue: '',
        pincode: ''
    });
    const [isPincodeValid, setIsPincodeValid] = useState(false);
    const [pincodeMessage, setPincodeMessage] = useState('');
    const [prefilledIssueName, setPrefilledIssueName] = useState(null);
    const [brands, setBrands] = useState([]);
    const [settings, setSettings] = useState(initialData || {
        title: 'Book A Technician Now',
        subtitle: 'Get same day service | Transparent pricing | Licensed technicians',
        serviceable_pincodes: [],
        valid_pincode_message: '✓ We serve here!',
        invalid_pincode_message: '✗ Not serviceable',
        help_text: 'We currently serve Mumbai areas. Call us for other locations.',
        categories: []
    });
    const [loading, setLoading] = useState(!initialData);

    // Load hierarchical data and global settings
    useEffect(() => {
        if (initialData) return; // Skip fetch if data passed via props

        const loadData = async () => {
            setLoading(true);
            try {
                // Load global settings from API
                const [settingsRes, brandsRes] = await Promise.all([
                    fetch('/api/settings/quick-booking'),
                    fetch('/api/settings/booking-brands')
                ]);
                const settingsData = await settingsRes.json();
                const brandsData = await brandsRes.json();
                if (settingsData.success) setSettings(settingsData.data);
                if (brandsData.success) setBrands((brandsData.data || []).filter(b => b.is_active));
            } catch (error) {
                console.error('Error loading booking data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [initialData]);

    // Listen for pre-selection events from IssuesSection
    useEffect(() => {
        const handlePreselect = (e) => {
            const { categoryId, subcategoryId, issueId, issueName } = e.detail || {};
            if (categoryId && subcategoryId && issueId) {
                setFormData(prev => ({
                    ...prev,
                    category: String(categoryId),
                    subcategory: String(subcategoryId),
                    issue: String(issueId),
                }));
                setPrefilledIssueName(issueName || 'Selected issue');
            }
        };
        window.addEventListener('bookingPreselect', handlePreselect);
        return () => window.removeEventListener('bookingPreselect', handlePreselect);
    }, []);

    // Also fetch brands when initialData is supplied (server render path)
    useEffect(() => {
        if (!initialData) return;
        fetch('/api/settings/booking-brands')
            .then(r => r.json())
            .then(d => { if (d.success) setBrands((d.data || []).filter(b => b.is_active)); })
            .catch(() => { });
    }, [initialData]);

    // Get filtered data (only items with showOnBookingForm: true)
    const visibleCategories = (settings.categories || []).filter(c => c.showOnBookingForm !== false);
    const selectedCategory = visibleCategories.find(c => c.id === parseInt(formData.category));
    const visibleSubcategories = (selectedCategory?.subcategories || []).filter(s => s.showOnBookingForm !== false);
    const selectedSubcategory = visibleSubcategories.find(s => s.id === parseInt(formData.subcategory));
    const visibleIssues = (selectedSubcategory?.issues || []).filter(i => i.showOnBookingForm !== false);


    // Validate pincode whenever pincode or category changes
    useEffect(() => {
        if (formData.pincode.length !== 6) {
            setIsPincodeValid(false);
            setPincodeMessage('');
            return;
        }

        const advanced = settings.advanced_pincodes || [];
        // If there are advanced_pincodes, use them for validation
        if (advanced.length > 0) {
            const match = advanced.find(p => p.pincode === formData.pincode);
            if (!match) {
                setIsPincodeValid(false);
                setPincodeMessage(settings.invalid_pincode_message || '✗ Not serviceable');
                return;
            }

            // Check appliance mapping
            if (formData.category) {
                const allowed = match.appliances || [];
                if (allowed.length > 0 && !allowed.includes(String(formData.category))) {
                    setIsPincodeValid(false);
                    setPincodeMessage(`✗ This appliance is not serviced in ${match.locality}`);
                    return;
                }
            }

            // Valid
            setIsPincodeValid(true);
            setPincodeMessage(`${settings.valid_pincode_message} (${match.locality})`);
        } else {
            // Legacy fallback validation
            const isValid = (settings.serviceable_pincodes || []).includes(formData.pincode);
            setIsPincodeValid(isValid);
            setPincodeMessage(isValid ? settings.valid_pincode_message : settings.invalid_pincode_message);
        }
    }, [formData.pincode, formData.category, settings.advanced_pincodes, settings.valid_pincode_message, settings.invalid_pincode_message]);

    const handlePincodeChange = (e) => {
        const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
        setFormData({ ...formData, pincode });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isPincodeValid && formData.category && formData.subcategory && formData.issue) {
            // Redirect to universal booking wizard
            const selectedBrand = brands.find(b => String(b.id) === String(formData.brand));
            const params = new URLSearchParams({
                category: formData.category,
                subcategory: formData.subcategory,
                issue: formData.issue,
                pincode: formData.pincode,
                ...(formData.brand && { brand: formData.brand, brandName: selectedBrand?.name || '' })
            });
            window.location.href = `/booking?${params.toString()}`;
        }
    };

    return (
        <div className={`quick-booking-form ${loading ? 'loading' : ''}`}>
            <h3 className="form-title">{settings.title}</h3>
            <p className="form-subtitle">{settings.subtitle}</p>

            {/* Pre-fill banner shown when issue is clicked from IssuesSection */}
            {prefilledIssueName && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '10px', padding: '10px 16px', marginBottom: '16px',
                    backgroundColor: '#ecfdf5', border: '1.5px solid #10b981',
                    borderRadius: '10px', fontSize: '13px'
                }}>
                    <span style={{ color: '#065f46', fontWeight: 600 }}>
                        ✓ Pre-selected: <em style={{ fontStyle: 'normal', color: '#059669' }}>{prefilledIssueName}</em>
                        &nbsp;— select your brand &amp; enter pincode to book
                    </span>
                    <button
                        onClick={() => { setPrefilledIssueName(null); setFormData(prev => ({ ...prev, category: initialCategory, subcategory: '', issue: '' })); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280', lineHeight: 1 }}
                        title="Clear pre-selection"
                    >✕</button>
                </div>
            )}

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

                {/* Fields 3 & 4: Brand + Issue in one row (or Issue-only if no brands) */}
                {formData.subcategory && (
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        animation: 'fadeIn 0.3s ease-in',
                        alignItems: 'flex-end'
                    }}>
                        {/* Brand — narrower, optional */}
                        {brands.length > 0 && (
                            <div className="form-group" style={{ flex: '0 0 38%', margin: 0 }}>
                                <label htmlFor="brand">Brand</label>
                                <select
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value, issue: '' })}
                                    aria-label="Select appliance brand"
                                >
                                    <option value="">Any brand</option>
                                    {brands.map((brand) => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Issue — takes remaining space */}
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
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
                    </div>
                )}

                {/* Field 5: Your Area Pincode — shown after issue is selected */}
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
                            {formData.pincode.length === 6 && pincodeMessage && (
                                <span className={`pincode-status ${isPincodeValid ? 'valid' : 'invalid'}`}>
                                    {pincodeMessage}
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

                {/* Book button — always visible, greyed out until all fields + valid pincode */}
                {(() => {
                    const ready = isPincodeValid && formData.category && formData.subcategory && formData.issue;
                    return (
                        <button
                            type="submit"
                            className="book-button"
                            aria-label="Book technician"
                            disabled={!ready}
                            style={!ready ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(40%)' } : {}}
                        >
                            <Search size={18} />
                            Book Technician Now
                        </button>
                    );
                })()}
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



