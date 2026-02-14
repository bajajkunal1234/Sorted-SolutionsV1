'use client'

import React, { useState, useEffect } from 'react'
import { X, Wrench, Calendar, Clock, MapPin } from 'lucide-react'

function BookServiceModal({ isOpen, onClose, onBook }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [products, setProducts] = useState([])
    const [brands, setBrands] = useState([])
    const [issues, setIssues] = useState([])
    const [properties, setProperties] = useState([])

    const [formData, setFormData] = useState({
        productId: '',
        brandId: '',
        issueId: '',
        propertyId: '',
        problemDescription: '',
        preferredDate: '',
        preferredTime: 'morning',
        urgency: 'normal',
        notes: '',
    })

    const timeSlots = [
        { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
        { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
        { value: 'evening', label: 'Evening (4 PM - 8 PM)' },
    ]

    const urgencyLevels = [
        { value: 'low', label: 'Low - Can wait a few days' },
        { value: 'normal', label: 'Normal - Within 2-3 days' },
        { value: 'high', label: 'High - As soon as possible' },
        { value: 'emergency', label: 'Emergency - Today!' },
    ]

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen])

    const fetchData = async () => {
        try {
            const customerId = localStorage.getItem('customerId')

            // Fetch products, brands, issues, and properties in parallel
            const [productsRes, brandsRes, issuesRes, propertiesRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/brands'),
                fetch('/api/issues'),
                fetch(`/api/customer/properties?customerId=${customerId}`)
            ])

            const [productsData, brandsData, issuesData, propertiesData] = await Promise.all([
                productsRes.json(),
                brandsRes.json(),
                issuesRes.json(),
                propertiesRes.json()
            ])

            setProducts(productsData.products || [])
            setBrands(brandsData.brands || [])
            setIssues(issuesData.issues || [])
            setProperties(propertiesData.properties || [])
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('Failed to load form data')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const customerId = localStorage.getItem('customerId')

            if (!customerId) {
                throw new Error('Please login first')
            }

            // Create job via API
            const response = await fetch('/api/customer/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId,
                    productId: formData.productId,
                    brandId: formData.brandId,
                    issueId: formData.issueId,
                    propertyId: formData.propertyId,
                    problemDescription: formData.problemDescription,
                    preferredDate: formData.preferredDate,
                    preferredTime: formData.preferredTime,
                    urgency: formData.urgency,
                    notes: formData.notes
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to book service')
            }

            // Success!
            if (onBook) {
                onBook(data.job)
            }

            onClose()

            // Reset form
            setFormData({
                productId: '',
                brandId: '',
                issueId: '',
                propertyId: '',
                problemDescription: '',
                preferredDate: '',
                preferredTime: 'morning',
                urgency: 'normal',
                notes: '',
            })
        } catch (err) {
            console.error('Error booking service:', err)
            setError(err.message || 'Failed to book service. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3>Book Service</h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)',
                        fontSize: 'var(--font-size-sm)',
                        color: '#ef4444'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Product Selection */}
                    <div className="form-group">
                        <label>Product/Appliance *</label>
                        <select
                            value={formData.productId}
                            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Select product</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Brand Selection */}
                    <div className="form-group">
                        <label>Brand *</label>
                        <select
                            value={formData.brandId}
                            onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Select brand</option>
                            {brands.map(brand => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Issue Type */}
                    <div className="form-group">
                        <label>Issue Type *</label>
                        <select
                            value={formData.issueId}
                            onChange={(e) => setFormData({ ...formData, issueId: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Select issue type</option>
                            {issues.map(issue => (
                                <option key={issue.id} value={issue.id}>
                                    {issue.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Property/Address */}
                    <div className="form-group">
                        <label>Service Location *</label>
                        <select
                            value={formData.propertyId}
                            onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Select address</option>
                            {properties.map(property => (
                                <option key={property.id} value={property.id}>
                                    {property.name || property.address}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Problem Description */}
                    <div className="form-group">
                        <label>Problem Description *</label>
                        <textarea
                            value={formData.problemDescription}
                            onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                            placeholder="Describe the problem in detail..."
                            className="form-input"
                            rows={3}
                            required
                        />
                    </div>

                    {/* Preferred Date */}
                    <div className="form-group">
                        <label>Preferred Date *</label>
                        <input
                            type="date"
                            value={formData.preferredDate}
                            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                            className="form-input"
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    {/* Preferred Time */}
                    <div className="form-group">
                        <label>Preferred Time *</label>
                        <select
                            value={formData.preferredTime}
                            onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                            className="form-input"
                            required
                        >
                            {timeSlots.map(slot => (
                                <option key={slot.value} value={slot.value}>
                                    {slot.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Urgency */}
                    <div className="form-group">
                        <label>Urgency *</label>
                        <select
                            value={formData.urgency}
                            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                            className="form-input"
                            required
                        >
                            {urgencyLevels.map(level => (
                                <option key={level.value} value={level.value}>
                                    {level.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Additional Notes */}
                    <div className="form-group">
                        <label>Additional Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any additional information..."
                            className="form-input"
                            rows={2}
                        />
                    </div>

                    {/* Submit Button */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? 'Booking...' : 'Book Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default BookServiceModal
