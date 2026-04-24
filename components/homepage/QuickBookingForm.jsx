'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import { MUMBAI_LOCALITIES, getPincodeForLocality } from '@/lib/data/mumbaiLocalities';
import './QuickBookingForm.css';

function QuickBookingForm({ preSelectedCategory, preSelectedSubcategoryId, initialData }) {
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
        subcategory: preSelectedSubcategoryId || '',
        brand: '',
        issue: '',
        locality: '',      // selected locality name
        localityOther: '', // free-text when "Other" is chosen
    });

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
        const fetchData = async () => {
            try {
                const res = await fetch('/api/settings/quick-booking');
                const data = await res.json();
                if (data.success && data.data) {
                    setSettings(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch quick booking settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [initialData]);

    // Load brands
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await fetch('/api/settings/booking-brands');
                const data = await res.json();
                if (data.success) setBrands((data.data || []).filter(b => b.is_active));
            } catch { /* non-fatal */ }
        };
        fetchBrands();
    }, []);

    // Listen for issue prefill events from IssuesSection
    useEffect(() => {
        const handler = (e) => {
            const { categoryId, subcategoryId, issueId, issueName } = e.detail || {};
            if (issueId) {
                setFormData(prev => ({
                    ...prev,
                    category: String(categoryId || prev.category),
                    subcategory: String(subcategoryId || prev.subcategory),
                    issue: String(issueId),
                }));
                setPrefilledIssueName(issueName || null);
            }
        };
        window.addEventListener('prefillBookingIssue', handler);
        return () => window.removeEventListener('prefillBookingIssue', handler);
    }, []);

    // Derived data from settings.categories
    const visibleCategories = (settings.categories || []).filter(c => c.showOnBookingForm !== false);
    const selectedCategory = visibleCategories.find(c => c.id === parseInt(formData.category));
    const visibleSubcategories = (selectedCategory?.subcategories || []).filter(s => s.showOnBookingForm !== false);
    const selectedSubcategory = visibleSubcategories.find(s => s.id === parseInt(formData.subcategory));
    const visibleIssues = (selectedSubcategory?.issues || []).filter(i => i.showOnBookingForm !== false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const locality = formData.locality === '__other__' ? formData.localityOther.trim() : formData.locality;
        if (formData.category && formData.subcategory && formData.issue && locality) {
            const selectedBrand = brands.find(b => String(b.id) === String(formData.brand));
            const pincode = getPincodeForLocality(locality);
            const params = new URLSearchParams({
                category: formData.category,
                subcategory: formData.subcategory,
                issue: formData.issue,
                locality,
                pincode,
                ...(formData.brand && { brand: formData.brand, brandName: selectedBrand?.name || '' })
            });
            window.location.href = `/booking?${params.toString()}`;
        }
    };

    const effectiveLocality = formData.locality === '__other__' ? formData.localityOther.trim() : formData.locality;
    const isReady = !!(formData.category && formData.subcategory && formData.issue && effectiveLocality);

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
                        &nbsp;— select your area to book
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
                            brand: '',
                            locality: formData.locality,
                            localityOther: formData.localityOther,
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

                {/* Fields 3 & 4: Issue + Brand in one row */}
                {formData.subcategory && (
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        animation: 'fadeIn 0.3s ease-in',
                        alignItems: 'flex-end'
                    }}>
                        {/* Issue */}
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

                        {/* Brand — optional */}
                        {brands.length > 0 && (
                            <div className="form-group" style={{ flex: '0 0 38%', margin: 0 }}>
                                <label htmlFor="brand">Brand</label>
                                <select
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
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
                    </div>
                )}

                {/* Field 5: Your Area — locality dropdown (shown after issue is selected) */}
                {formData.issue && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="locality">
                            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Your Area / Locality
                        </label>
                        <select
                            id="locality"
                            value={formData.locality}
                            onChange={(e) => setFormData({ ...formData, locality: e.target.value, localityOther: '' })}
                            required={formData.locality !== '__other__'}
                            aria-label="Select your locality"
                        >
                            <option value="">Select your area...</option>
                            {MUMBAI_LOCALITIES.map((loc) => (
                                <option key={loc.name} value={loc.name}>{loc.name}</option>
                            ))}
                            <option value="__other__">Other — type your area below</option>
                        </select>

                        {/* Free-text input when "Other" is selected */}
                        {formData.locality === '__other__' && (
                            <input
                                type="text"
                                placeholder="Type your locality / area name"
                                value={formData.localityOther}
                                onChange={(e) => setFormData({ ...formData, localityOther: e.target.value })}
                                style={{
                                    marginTop: '8px', width: '100%', padding: '10px 14px',
                                    border: '1px solid var(--border-primary)', borderRadius: '8px',
                                    fontSize: '14px', boxSizing: 'border-box',
                                    backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)'
                                }}
                                aria-label="Type your locality"
                            />
                        )}
                    </div>
                )}

                {/* Book button */}
                <button
                    type="submit"
                    className="book-button"
                    aria-label="Book technician"
                    disabled={!isReady}
                    style={!isReady ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(40%)' } : {}}
                >
                    <Search size={18} />
                    Book Technician Now
                </button>
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
