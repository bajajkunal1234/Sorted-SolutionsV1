'use client'

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Power, Save, X, Eye, EyeOff, Shield } from 'lucide-react';
import { techniciansAPI } from '@/lib/adminAPI';

function TechnicianManagement() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTechnician, setEditingTechnician] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        technician_id: '',
        username: '',
        password: '',
        confirmPassword: '',
        is_active: true
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            const data = await techniciansAPI.getAll();
            setTechnicians(data || []);
        } catch (err) {
            console.error('Error fetching technicians:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.technician_id) {
            newErrors.technician_id = 'Please select a technician account';
        }

        if (!formData.username || formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        // Password validation (only required for new technicians or if changing password)
        if (!editingTechnician || formData.password) {
            if (!formData.password || formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            const updateData = {
                username: formData.username,
                is_active: formData.is_active
            };

            // Only include password if it's provided
            if (formData.password) {
                updateData.password = formData.password;
            }

            if (editingTechnician) {
                await techniciansAPI.update(formData.technician_id, updateData);
            } else {
                await techniciansAPI.update(formData.technician_id, updateData);
            }

            await fetchTechnicians();
            handleCloseForm();
            alert('Technician credentials saved successfully!');
        } catch (err) {
            console.error('Error saving technician:', err);
            alert('Failed to save technician: ' + err.message);
        }
    };

    const handleEdit = (tech) => {
        setEditingTechnician(tech);
        setFormData({
            technician_id: tech.id,
            username: tech.username || '',
            password: '',
            confirmPassword: '',
            is_active: tech.is_active !== false
        });
        setShowForm(true);
    };

    const handleToggleActive = async (tech) => {
        try {
            await techniciansAPI.update(tech.id, { is_active: !tech.is_active });
            await fetchTechnicians();
        } catch (err) {
            console.error('Error toggling status:', err);
            alert('Failed to update status: ' + err.message);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingTechnician(null);
        setFormData({
            technician_id: '',
            username: '',
            password: '',
            confirmPassword: '',
            is_active: true
        });
        setErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    if (loading) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                <p>Loading technicians...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)'
            }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Technician Management
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Manage technician login credentials and access
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={16} />
                    Setup Credentials
                </button>
            </div>

            {/* Technicians Table */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600 }}>Name</th>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600 }}>Phone</th>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600 }}>Username</th>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'center', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {technicians.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No technicians found. Create technician accounts in the Accounts tab first.
                                </td>
                            </tr>
                        ) : (
                            technicians.map(tech => (
                                <tr key={tech.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                    <td style={{ padding: 'var(--spacing-md)' }}>{tech.name}</td>
                                    <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>{tech.phone}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        {tech.username ? (
                                            <span style={{
                                                fontFamily: 'monospace',
                                                backgroundColor: 'var(--bg-secondary)',
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)'
                                            }}>
                                                {tech.username}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                                Not set
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 12px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 500,
                                            backgroundColor: tech.is_active !== false ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                            color: tech.is_active !== false ? 'var(--color-success)' : 'var(--color-danger)'
                                        }}>
                                            {tech.is_active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEdit(tech)}
                                                title="Edit credentials"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleToggleActive(tech)}
                                                title={tech.is_active !== false ? 'Deactivate' : 'Activate'}
                                                style={{
                                                    color: tech.is_active !== false ? 'var(--color-danger)' : 'var(--color-success)'
                                                }}
                                            >
                                                <Power size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">
                                    {editingTechnician ? 'Edit' : 'Setup'} Technician Credentials
                                </h2>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {editingTechnician ? 'Update login credentials' : 'Create login credentials for technician'}
                                </p>
                            </div>
                            <button className="btn-icon" onClick={handleCloseForm}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Technician Selection */}
                            <div className="form-group">
                                <label className="form-label">Technician Account *</label>
                                <select
                                    className="form-select"
                                    value={formData.technician_id}
                                    onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                                    disabled={editingTechnician}
                                >
                                    <option value="">Select technician...</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>
                                            {tech.name} - {tech.phone}
                                        </option>
                                    ))}
                                </select>
                                {errors.technician_id && (
                                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                                        {errors.technician_id}
                                    </span>
                                )}
                            </div>

                            {/* Username */}
                            <div className="form-group">
                                <label className="form-label">Username *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., john_tech"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                />
                                {errors.username && (
                                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                                        {errors.username}
                                    </span>
                                )}
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <label className="form-label">
                                    Password {editingTechnician ? '(leave blank to keep current)' : '*'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="Minimum 8 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-tertiary)',
                                            padding: '4px'
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                                        {errors.password}
                                    </span>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group">
                                <label className="form-label">Confirm Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="Re-enter password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-tertiary)',
                                            padding: '4px'
                                        }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                                        {errors.confirmPassword}
                                    </span>
                                )}
                            </div>

                            {/* Active Status */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span className="form-label" style={{ marginBottom: 0 }}>
                                        <Shield size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                        Active (Allow login)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCloseForm}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                <Save size={16} />
                                Save Credentials
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TechnicianManagement;
