'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { MUMBAI_LOCALITIES, getPincodeForLocality } from '@/lib/data/mumbaiLocalities';
import './QuickBookingForm.css';

// ─── Searchable Locality Combobox ────────────────────────────────────────────
function LocalityCombobox({ value, onChange }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // When a locality is selected from outside (e.g. form reset), sync the display
    useEffect(() => {
        if (!open) {
            setQuery(value === '__other__' ? '' : (value || ''));
        }
    }, [value, open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                // If user typed but didn't pick, treat as "Other"
                if (focused && query && !MUMBAI_LOCALITIES.find(l => l.name.toLowerCase() === query.toLowerCase())) {
                    onChange('__other__', query);
                }
                setFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [focused, query, onChange]);

    const filtered = query.trim().length === 0
        ? MUMBAI_LOCALITIES
        : MUMBAI_LOCALITIES.filter(l =>
            l.name.toLowerCase().includes(query.trim().toLowerCase())
        );

    const handleSelect = (loc) => {
        setQuery(loc.name);
        setOpen(false);
        setFocused(false);
        onChange(loc.name);
    };

    const handleOther = () => {
        setOpen(false);
        setFocused(false);
        onChange('__other__', query);
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setOpen(true);
        // Clear selection if user is typing
        if (value && value !== '__other__') {
            onChange('');
        }
    };

    const handleFocus = () => {
        setOpen(true);
        setFocused(true);
        inputRef.current?.select();
    };

    const displayValue = value === '__other__' ? query : query;

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Input */}
            <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none'
                }} />
                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    placeholder="Search your area..."
                    autoComplete="off"
                    style={{
                        width: '100%',
                        padding: '10px 36px 10px 34px',
                        border: '1px solid var(--border-primary, #e2e8f0)',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        background: 'var(--bg-elevated, #fff)',
                        color: 'var(--text-primary, #1e293b)',
                        outline: 'none',
                        cursor: 'text',
                    }}
                    aria-label="Search your locality or area"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    role="combobox"
                />
                <Search size={13} style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none'
                }} />
            </div>

            {/* Dropdown list */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--bg-elevated, #fff)',
                    border: '1px solid var(--border-primary, #e2e8f0)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 220,
                    overflowY: 'auto',
                    zIndex: 999,
                    scrollbarWidth: 'thin',
                }}>
                    {filtered.length === 0 && (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>
                            No match — you can still{' '}
                            <span
                                onClick={handleOther}
                                style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                use "{query}" as your area
                            </span>
                        </div>
                    )}

                    {filtered.map(loc => (
                        <div
                            key={loc.name}
                            onMouseDown={() => handleSelect(loc)}
                            style={{
                                padding: '9px 14px',
                                fontSize: 13,
                                cursor: 'pointer',
                                color: 'var(--text-primary, #1e293b)',
                                borderBottom: '1px solid rgba(0,0,0,0.04)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: loc.name === value ? 'rgba(59,130,246,0.08)' : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = loc.name === value ? 'rgba(59,130,246,0.08)' : 'transparent'}
                        >
                            <span>{loc.name}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{loc.pincode}</span>
                        </div>
                    ))}

                    {/* "Other" option always at the bottom */}
                    {filtered.length > 0 && (
                        <div
                            onMouseDown={handleOther}
                            style={{
                                padding: '9px 14px',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: '#64748b',
                                borderTop: '1px solid rgba(0,0,0,0.06)',
                                fontStyle: 'italic',
                                background: value === '__other__' ? 'rgba(59,130,246,0.06)' : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = value === '__other__' ? 'rgba(59,130,246,0.06)' : 'transparent'}
                        >
                            My area is not listed — use "{query || 'other'}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

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
        brand: '',
        issue: '',
        locality: '',
        localityOther: '',
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
        const fetchBrands = async () => {
            try {
                const res = await fetch('/api/settings/booking-brands');
                const data = await res.json();
                if (data.success) setBrands((data.data || []).filter(b => b.is_active));
            } catch { }
        };
        fetchBrands();
    }, []);

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

    const visibleCategories = (settings.categories || []).filter(c => c.showOnBookingForm !== false);
    const selectedCategory = visibleCategories.find(c => c.id === parseInt(formData.category));
    const visibleSubcategories = (selectedCategory?.subcategories || []).filter(s => s.showOnBookingForm !== false);
    const selectedSubcategory = visibleSubcategories.find(s => s.id === parseInt(formData.subcategory));
    const visibleIssues = (selectedSubcategory?.issues || []).filter(i => i.showOnBookingForm !== false);

    // Handle locality selection from combobox
    const handleLocalityChange = (localityName, otherText) => {
        if (localityName === '__other__') {
            setFormData(prev => ({ ...prev, locality: '__other__', localityOther: otherText || '' }));
        } else if (localityName === '') {
            setFormData(prev => ({ ...prev, locality: '', localityOther: '' }));
        } else {
            setFormData(prev => ({ ...prev, locality: localityName, localityOther: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const locality = formData.locality === '__other__'
            ? formData.localityOther.trim()
            : formData.locality;
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

    const effectiveLocality = formData.locality === '__other__'
        ? formData.localityOther.trim()
        : formData.locality;
    const isReady = !!(formData.category && formData.subcategory && formData.issue && effectiveLocality);

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
                            brand: '',
                            locality: formData.locality,
                            localityOther: formData.localityOther,
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

                {/* Fields 3 & 4: Issue + Brand */}
                {formData.subcategory && (
                    <div style={{ display: 'flex', gap: '10px', animation: 'fadeIn 0.3s ease-in', alignItems: 'flex-end' }}>
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
                                {visibleIssues.map(issue => (
                                    <option key={issue.id} value={issue.id}>{issue.name}</option>
                                ))}
                            </select>
                        </div>
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
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Field 5: Locality — searchable combobox */}
                {formData.issue && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                        <label htmlFor="locality-search">
                            <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Your Area / Locality
                        </label>
                        <LocalityCombobox
                            value={formData.locality}
                            onChange={handleLocalityChange}
                        />
                        {/* Manual pincode override when "Other" is selected */}
                        {formData.locality === '__other__' && (
                            <div style={{ marginTop: 8 }}>
                                <input
                                    type="text"
                                    placeholder="Type your locality / area name"
                                    value={formData.localityOther}
                                    onChange={(e) => setFormData({ ...formData, localityOther: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '1px solid var(--border-primary, #e2e8f0)',
                                        borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
                                        background: 'var(--bg-elevated, #fff)',
                                        color: 'var(--text-primary, #1e293b)',
                                        outline: 'none',
                                    }}
                                    aria-label="Type your locality"
                                />
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    We'll still accept your booking — our team will confirm the area.
                                </div>
                            </div>
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

            <div className="form-trust">
                <span>✓ No hidden charges</span>
                <span>✓ Same day service</span>
                <span>✓ Genuine parts</span>
            </div>
        </div>
    );
}

export default QuickBookingForm;
