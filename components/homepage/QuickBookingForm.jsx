'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import './QuickBookingForm.css';

// ─── Main Form ────────────────────────────────────────────────────────────────
function QuickBookingForm({ preSelectedCategory, preSelectedSubcategoryId, initialData }) {
    const categoryMapping = {
        'ac-repair': '2',
        'washing-machine-repair': '5',
        'refrigerator-repair': '1',
        'oven-repair': '3',
        'water-purifier-repair': '6',
        'hob-repair': '4'
    };

    const initialCategory = preSelectedCategory
        ? (categoryMapping[preSelectedCategory] || preSelectedCategory)
        : '';

    const [formData, setFormData] = useState({
        category: initialCategory,
        subcategory: preSelectedSubcategoryId || '',
        issue: '',
    });

    const [prefilledIssueName, setPrefilledIssueName] = useState(null);
    const [settings, setSettings] = useState(initialData || {
        title: 'Book A Technician Now',
        subtitle: 'Get same day service | Transparent pricing | Licensed technicians',
        categories: []
    });
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) return;
        const fetchData = async () => {
            try {
                const res = await fetch('/api/settings/quick-booking');
                const data = await res.json();
                if (data.success && data.data) setSettings(data.data);
            } catch (err) {
                console.error('Failed to fetch quick booking settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [initialData]);

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
        window.addEventListener('bookingPreselect', handler);
        return () => window.removeEventListener('bookingPreselect', handler);
    }, []);

    const visibleCategories = (settings.categories || []).filter(c => c.showOnBookingForm !== false);
    const selectedCategory = visibleCategories.find(c => c.id === parseInt(formData.category));
    const visibleSubcategories = (selectedCategory?.subcategories || []).filter(s => s.showOnBookingForm !== false);
    const selectedSubcategory = visibleSubcategories.find(s => s.id === parseInt(formData.subcategory));
    const visibleIssues = (selectedSubcategory?.issues || []).filter(i => i.showOnBookingForm !== false);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.category) {
            alert('Please select your appliance.');
            return;
        }
        if (!formData.subcategory) {
            alert('Please select the appliance type.');
            return;
        }
        if (!formData.issue) {
            alert('Please select the problem.');
            return;
        }

        const params = new URLSearchParams({
            category: formData.category,
            subcategory: formData.subcategory,
            issue: formData.issue,
        });
        window.location.href = `/booking?${params.toString()}`;
    };

    return (
        <div className={`quick-booking-form ${loading ? 'loading' : ''}`}>
            <h3 className="form-title">{settings.title}</h3>
            <p className="form-subtitle">{settings.subtitle}</p>

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
                        onClick={() => {
                            setPrefilledIssueName(null);
                            setFormData(prev => ({ ...prev, category: initialCategory, subcategory: '', issue: '' }));
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280', lineHeight: 1 }}
                        title="Clear pre-selection"
                    >✕</button>
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* Field 1: Select Appliance */}
                <div className="form-group">
                    <label htmlFor="category">Select Your Appliance</label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({
                            category: e.target.value,
                            subcategory: '',
                            issue: '',
                        })}
                        required
                        aria-label="Select appliance type"
                    >
                        <option value="">Choose appliance...</option>
                        {visibleCategories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>

                {/* Field 2: Select Appliance Type */}
                {formData.category && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="subcategory">Select Appliance Type</label>
                        <select
                            id="subcategory"
                            value={formData.subcategory}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value, issue: '' })}
                            required
                            aria-label="Select appliance type"
                        >
                            <option value="">Choose type...</option>
                            {visibleSubcategories.map(subcategory => (
                                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Field 3: Issue */}
                {formData.subcategory && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="issue">What seems to be the problem?</label>
                        <select
                            id="issue"
                            value={formData.issue}
                            onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                            required
                            aria-label="Select issue type"
                        >
                            <option value="">Select issue...</option>
                            {visibleIssues.map(issue => (
                                <option key={issue.id} value={issue.id}>{issue.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Book button */}
                <button
                    type="submit"
                    className="book-button"
                    aria-label="Book technician"
                >
                    {(() => {
                        if (formData.issue) {
                            const issueObj = visibleIssues.find(i => String(i.id) === formData.issue);
                            if (issueObj && issueObj.price) {
                                return `Book Now @ ₹${issueObj.price}`;
                            }
                            return "Book Now";
                        }
                        return "Select Issue to Continue";
                    })()}
                </button>
            </form>

            <div className="form-trust">
                <span>✓ No hidden charges</span>
                <span>✓ Same day service</span>
                <span>✓ Genuine parts</span>
            </div>
        </div>
    );
}

export default QuickBookingForm;
