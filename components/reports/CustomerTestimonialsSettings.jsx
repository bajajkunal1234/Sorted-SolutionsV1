'use client'

import { useState, useEffect } from 'react';
import { Star, Plus, Trash2, Edit2, Save, X, ThumbsUp, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';

function CustomerTestimonialsSettings() {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [displaySettings, setDisplaySettings] = useState({
        showOnHomepage: true,
        showOnServicePages: true,
        autoRotate: true,
        rotationInterval: 5,
        showRating: true,
        showLocation: true,
        showDate: true,
        showVerifiedBadge: true,
        minRating: 4
    });

    const [googleReviewsSettings, setGoogleReviewsSettings] = useState({
        placeId: '',
        apiKey: '',
        autoSync: false,
        syncInterval: 24
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTestimonial, setNewTestimonial] = useState({
        customerName: '',
        location: '',
        rating: 5,
        review: '',
        service: '',
        verified: false,
        featured: false
    });

    // Load data from backend
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch testimonials
                const resT = await fetch('/api/settings/testimonials');
                const dataT = await resT.json();
                if (dataT.success) {
                    const mapped = dataT.data.map(t => ({
                        id: t.id,
                        customerName: t.customer_name,
                        location: t.location,
                        rating: t.rating,
                        review: t.review_text,
                        date: t.date,
                        service: t.service_type,
                        verified: t.is_verified,
                        featured: t.is_featured,
                        source: t.source
                    }));
                    setTestimonials(mapped);
                }

                // Fetch configs
                const resConfig = await fetch('/api/settings/section-configs?id=testimonials');
                const dataConfig = await resConfig.json();
                if (dataConfig.success && dataConfig.data) {
                    if (dataConfig.data.extra_config?.display) {
                        setDisplaySettings(dataConfig.data.extra_config.display);
                    }
                    if (dataConfig.data.extra_config?.googleSync) {
                        setGoogleReviewsSettings(dataConfig.data.extra_config.googleSync);
                    }
                }
            } catch (error) {
                console.error('Error loading Testimonials settings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleEdit = (testimonial) => {
        setEditingId(testimonial.id);
        setEditForm({ ...testimonial });
    };

    const handleSaveEdit = async () => {
        // Optimistic update locally
        setTestimonials(testimonials.map(t => t.id === editingId ? editForm : t));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this testimonial?')) {
            try {
                // If it's a real ID (UUID), delete from backend too
                if (typeof id === 'string' && id.length > 20) {
                    await fetch(`/api/settings/testimonials?id=${id}`, { method: 'DELETE' });
                }
                setTestimonials(testimonials.filter(t => t.id !== id));
            } catch (error) {
                console.error('Error deleting testimonial:', error);
            }
        }
    };

    const handleAddTestimonial = () => {
        if (newTestimonial.customerName && newTestimonial.review) {
            const tempId = `temp-${Date.now()}`;
            setTestimonials([{
                ...newTestimonial,
                id: tempId,
                date: new Date().toISOString().split('T')[0],
                source: 'Manual Entry'
            }, ...testimonials]);
            setNewTestimonial({
                customerName: '',
                location: '',
                rating: 5,
                review: '',
                service: '',
                verified: false,
                featured: false
            });
            setShowAddForm(false);
        }
    };

    const handleSyncGoogleReviews = () => {
        alert('Google Reviews sync will be implemented via edge functions');
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Save each testimonial that is new or changed
            // For simplicity in this Admin UI, we'll just save everything
            // In a larger app, we'd only save dirty items
            for (const t of testimonials) {
                const body = {
                    customer_name: t.customerName,
                    location: t.location,
                    rating: t.rating,
                    review_text: t.review,
                    date: t.date,
                    service_type: t.service,
                    is_verified: t.verified,
                    is_featured: t.featured,
                    source: t.source
                };

                if (typeof t.id === 'string' && t.id.startsWith('temp-')) {
                    await fetch('/api/settings/testimonials', {
                        method: 'POST',
                        body: JSON.stringify(body)
                    });
                } else {
                    await fetch('/api/settings/testimonials', {
                        method: 'PUT',
                        body: JSON.stringify({ id: t.id, ...body })
                    });
                }
            }

            // Save configs
            await fetch('/api/settings/section-configs', {
                method: 'POST',
                body: JSON.stringify({
                    section_id: 'testimonials',
                    extra_config: {
                        display: displaySettings,
                        googleSync: googleReviewsSettings
                    }
                })
            });

            alert('Testimonials settings saved successfully!');
            // Reload to get real IDs
            window.location.reload();
        } catch (error) {
            console.error('Error saving testimonials:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        size={16}
                        fill={star <= rating ? '#f59e0b' : 'none'}
                        stroke={star <= rating ? '#f59e0b' : '#d1d5db'}
                    />
                ))}
            </div>
        );
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Customer Testimonials Settings
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage customer reviews and testimonials displayed on your website
                </p>
            </div>

            {/* Google Reviews Integration */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid #4285f4' }}>
                < div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#4285f415',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Star size={20} style={{ color: '#4285f4' }} />
                        </div>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                            Google Reviews Integration
                        </h4>
                    </div>
                    <button
                        onClick={handleSyncGoogleReviews}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                        <RefreshCw size={16} />
                        Sync Now
                    </button>
                </div >

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Google Place ID
                        </label>
                        <input
                            type="text"
                            value={googleReviewsSettings.placeId}
                            onChange={(e) => setGoogleReviewsSettings({ ...googleReviewsSettings, placeId: e.target.value })}
                            placeholder="ChIJXXXXXXXXXXXXXXXXXXXX"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontFamily: 'monospace'
                            }}
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                            Find your Place ID at{' '}
                            <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>
                                Google Place ID Finder <ExternalLink size={10} style={{ display: 'inline' }} />
                            </a>
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--spacing-sm)', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Google API Key
                            </label>
                            <input
                                type="password"
                                value={googleReviewsSettings.apiKey}
                                onChange={(e) => setGoogleReviewsSettings({ ...googleReviewsSettings, apiKey: e.target.value })}
                                placeholder="Enter your Google Places API key"
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', padding: 'var(--spacing-sm)' }}>
                            <input
                                type="checkbox"
                                checked={googleReviewsSettings.autoSync}
                                onChange={(e) => setGoogleReviewsSettings({ ...googleReviewsSettings, autoSync: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Auto-sync every {googleReviewsSettings.syncInterval}h</span>
                        </label>
                    </div>
                </div>
            </div >

            {/* Display Settings */}
            < div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Display Settings
                </h4>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Show On
                        </label>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showOnHomepage}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showOnHomepage: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Homepage</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showOnServicePages}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showOnServicePages: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Service Pages</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Display Options
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showRating}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showRating: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Show star rating</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showLocation}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showLocation: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Show location</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showDate}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showDate: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Show date</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.showVerifiedBadge}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showVerifiedBadge: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Show verified badge</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={displaySettings.autoRotate}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, autoRotate: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Auto-rotate testimonials</span>
                        </label>
                        {displaySettings.autoRotate && (
                            <div style={{ marginLeft: '26px', marginTop: 'var(--spacing-sm)' }}>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                    Rotation Interval: {displaySettings.rotationInterval} seconds
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="15"
                                    value={displaySettings.rotationInterval}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, rotationInterval: parseInt(e.target.value) })}
                                    style={{ width: '200px' }}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Minimum Rating to Display: {displaySettings.minRating} stars
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={displaySettings.minRating}
                            onChange={(e) => setDisplaySettings({ ...displaySettings, minRating: parseInt(e.target.value) })}
                            style={{ width: '200px' }}
                        />
                    </div>
                </div>
            </div >

            {/* Add New Testimonial Button */}
            {
                !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                    >
                        <Plus size={18} />
                        Add Manual Testimonial
                    </button>
                )
            }

            {/* Add Testimonial Form */}
            {
                showAddForm && (
                    <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Add New Testimonial
                        </h4>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Customer Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Rajesh Kumar"
                                        value={newTestimonial.customerName}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, customerName: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Andheri, Mumbai"
                                        value={newTestimonial.location}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, location: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Service
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., AC Repair"
                                        value={newTestimonial.service}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, service: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Rating
                                    </label>
                                    <select
                                        value={newTestimonial.rating}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: parseInt(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    >
                                        <option value={5}>5 Stars</option>
                                        <option value={4}>4 Stars</option>
                                        <option value={3}>3 Stars</option>
                                        <option value={2}>2 Stars</option>
                                        <option value={1}>1 Star</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Review *
                                </label>
                                <textarea
                                    placeholder="Enter customer review..."
                                    value={newTestimonial.review}
                                    onChange={(e) => setNewTestimonial({ ...newTestimonial, review: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newTestimonial.verified}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, verified: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Verified Customer</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newTestimonial.featured}
                                        onChange={(e) => setNewTestimonial({ ...newTestimonial, featured: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Featured Testimonial</span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                            <button
                                onClick={handleAddTestimonial}
                                className="btn btn-primary"
                                disabled={!newTestimonial.customerName || !newTestimonial.review}
                            >
                                <Save size={16} />
                                Add Testimonial
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewTestimonial({
                                        customerName: '',
                                        location: '',
                                        rating: 5,
                                        review: '',
                                        service: '',
                                        verified: false,
                                        featured: false
                                    });
                                }}
                                className="btn btn-secondary"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Testimonials List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {testimonials.map((testimonial) => (
                    <div
                        key={testimonial.id}
                        className="card"
                        style={{
                            padding: 'var(--spacing-lg)',
                            border: editingId === testimonial.id ? '2px solid var(--color-primary)' : testimonial.featured ? '2px solid #f59e0b' : '1px solid var(--border-primary)'
                        }}
                    >
                        {editingId === testimonial.id ? (
                            // Edit Mode (similar to add form)
                            <div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    {/* Similar fields as add form */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Customer Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.customerName}
                                                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Rating
                                            </label>
                                            <select
                                                value={editForm.rating}
                                                onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            >
                                                <option value={5}>5 Stars</option>
                                                <option value={4}>4 Stars</option>
                                                <option value={3}>3 Stars</option>
                                                <option value={2}>2 Stars</option>
                                                <option value={1}>1 Star</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Review
                                        </label>
                                        <textarea
                                            value={editForm.review}
                                            onChange={(e) => setEditForm({ ...editForm, review: e.target.value })}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.featured}
                                                onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Featured</span>
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                    <button onClick={handleSaveEdit} className="btn btn-primary">
                                        <Save size={16} />
                                        Save
                                    </button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary">
                                        <X size={16} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {testimonial.customerName}
                                            </h4>
                                            {testimonial.verified && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    backgroundColor: '#10b98115',
                                                    color: '#10b981',
                                                    border: '1px solid #10b98130'
                                                }}>
                                                    ✓ VERIFIED
                                                </span>
                                            )}
                                            {testimonial.featured && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    backgroundColor: '#f59e0b15',
                                                    color: '#f59e0b',
                                                    border: '1px solid #f59e0b30'
                                                }}>
                                                    ⭐ FEATURED
                                                </span>
                                            )}
                                        </div>
                                        {renderStars(testimonial.rating)}
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            onClick={() => handleEdit(testimonial)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(testimonial.id)}
                                            className="btn btn-danger"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', margin: 'var(--spacing-sm) 0', lineHeight: 1.6 }}>
                                    "{testimonial.review}"
                                </p>

                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                                    {testimonial.service && <span>Service: {testimonial.service}</span>}
                                    {testimonial.location && <span>📍 {testimonial.location}</span>}
                                    <span>📅 {new Date(testimonial.date).toLocaleDateString()}</span>
                                    <span style={{ color: testimonial.source === 'Google Reviews' ? '#4285f4' : 'var(--text-tertiary)' }}>
                                        Source: {testimonial.source}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                <button
                    onClick={handleSaveAll}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save All Changes
                </button>
            </div>
        </div >
    );
}

export default CustomerTestimonialsSettings;





