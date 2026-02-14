'use client'

import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, X } from 'lucide-react';

export default function ProfilePage() {
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [customerId, setCustomerId] = useState(null);

    // Get customer ID from session/auth
    useEffect(() => {
        const storedCustomerId = localStorage.getItem('customerId');
        if (storedCustomerId) {
            setCustomerId(storedCustomerId);
        } else {
            setCustomerId('default-customer-id');
        }
    }, []);

    // Fetch customer profile
    useEffect(() => {
        if (!customerId) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/customer/profile?customerId=${customerId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                setCustomer(data.customer);
                setFormData(data.customer);
                setError(null);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [customerId]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/customer/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, ...formData })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            setCustomer(data.customer);
            setEditing(false);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData(customer);
        setEditing(false);
    };

    if (loading && !customer) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading profile...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: '#ef4444' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ height: '100%', overflow: 'auto', backgroundColor: 'var(--bg-primary)', padding: 'var(--spacing-md)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)'
            }}>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                    My Profile
                </h1>
                {!editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="btn btn-secondary"
                        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                    >
                        <Edit2 size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
                        Edit
                    </button>
                )}
            </div>

            {/* Profile Picture */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 700,
                    color: 'white'
                }}>
                    {customer?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>

            {/* Profile Information */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-lg)',
                border: '1px solid var(--border-primary)'
            }}>
                {editing ? (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-xs)',
                                color: 'var(--text-primary)'
                            }}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-xs)',
                                color: 'var(--text-primary)'
                            }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-xs)',
                                color: 'var(--text-primary)'
                            }}>
                                Mobile
                            </label>
                            <input
                                type="tel"
                                value={formData.mobile || ''}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                <Save size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="btn btn-secondary"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <User size={20} style={{ color: 'var(--text-tertiary)' }} />
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Name</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>{customer?.name || 'Not set'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <Mail size={20} style={{ color: 'var(--text-tertiary)' }} />
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Email</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>{customer?.email || 'Not set'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <Phone size={20} style={{ color: 'var(--text-tertiary)' }} />
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Mobile</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>{customer?.mobile || 'Not set'}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Account Info */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-lg)',
                border: '1px solid var(--border-primary)',
                marginTop: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Account Information
                </h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Customer ID</span>
                        <span style={{ fontWeight: 500 }}>{customer?.id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Member Since</span>
                        <span style={{ fontWeight: 500 }}>
                            {customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
