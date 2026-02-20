'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Save, Trash2, Search, Plus, X, AlertCircle } from 'lucide-react';

function TechnicianManager() {
    const [technicians, setTechnicians] = useState([]);
    const [accounts, setAccounts] = useState([]); // Ledger accounts
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        ledger_id: '' // Link to ledger account
    });

    const [errors, setErrors] = useState({});

    // Fetch technicians and accounts
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [techRes, accRes] = await Promise.all([
                fetch('/api/admin/technicians'),
                fetch('/api/admin/accounts?type=technician') // Fetch only technician accounts if API supports it, or filter later
            ]);

            const techData = await techRes.json();
            const accData = await accRes.json();

            if (techData.success) setTechnicians(techData.data || []);

            if (accData.success) {
                // Filter accounts that are under 'technicians' group or 'sundry-creditors' if type filter didn't work perfectly
                // For now, assume API returns all if type param is ignored, so we filter client side to be safe
                // or just use what api returned.
                setAccounts(accData.data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (!formData.password.trim()) newErrors.password = 'Password is required';
        // account_id is optional but recommended
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            const response = await fetch('/api/admin/technicians', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            // Success
            fetchData();
            setShowForm(false);
            setFormData({ name: '', username: '', password: '', ledger_id: '' });
        } catch (error) {
            console.error('Submit error:', error);
            setErrors({ submit: error.message });
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>
                        Technician User Management
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                        Create login credentials for technicians and link them to accounts
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={16} />
                    Add New Technician
                </button>
            </div>

            {/* Create Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Technician User</h3>
                            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>

                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Rahul Kumar"
                                />
                                {errors.name && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Username *</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="form-input"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="e.g. rahul.k"
                                />
                                {errors.username && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{errors.username}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        name="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Enter password"
                                    />
                                    <Lock size={16} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                                </div>
                                {errors.password && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{errors.password}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Link Layout Account (Optional)</label>
                                <select
                                    name="ledger_id"
                                    className="form-select"
                                    value={formData.ledger_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.sku || 'No SKU'})</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Linking to an account allows expense tracking and payroll.
                                </p>
                            </div>

                            {errors.submit && (
                                <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '13px', display: 'flex', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    {errors.submit}
                                </div>
                            )}

                            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Technician</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Technicians List */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: 'var(--spacing-md)' }}>Name</th>
                            <th style={{ padding: 'var(--spacing-md)' }}>Username</th>
                            <th style={{ padding: 'var(--spacing-md)' }}>Linked Account</th>
                            <th style={{ padding: 'var(--spacing-md)' }}>Status</th>
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : technicians.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No technicians found. Create one to get started.</td></tr>
                        ) : (
                            technicians.map(tech => (
                                <tr key={tech.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                    <td style={{ padding: 'var(--spacing-md)', fontWeight: 500 }}>{tech.name}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>{tech.username}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        {accounts.find(a => a.id === tech.ledger_id)?.name || <span style={{ color: 'var(--text-tertiary)' }}>- Not Linked -</span>}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px' }}>Active</span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                        {/* Actions like Edit/Delete to be implemented */}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TechnicianManager;
