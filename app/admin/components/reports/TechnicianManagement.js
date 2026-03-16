'use client'

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Power, Save, X, Eye, EyeOff, Shield, Loader2, RefreshCcw } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI, accountsAPI, accountGroupsAPI } from '@/lib/adminAPI';

function TechnicianManagement() {
    const [technicians, setTechnicians] = useState([]);
    const [technicianAccounts, setTechnicianAccounts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTechnician, setEditingTechnician] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('credentials'); // 'credentials' or 'permissions'
    const [allPermissions, setAllPermissions] = useState({});
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        technician_id: '',
        password: '',
        confirmPassword: '',
        is_active: true,
        permissions: {
            viewJobs: true,
            updateJobStatus: true,
            submitExpenses: true,
            viewInventory: true,
            updateInventory: false,
            viewCustomerDetails: true,
            editCustomerDetails: false,
            viewReports: false
        }
    });

    const permissionsList = [
        { id: 'viewJobs', label: 'View Jobs', description: 'Can see assigned jobs' },
        { id: 'updateJobStatus', label: 'Update Job Status', description: 'Can mark jobs as complete/in-progress' },
        { id: 'submitExpenses', label: 'Submit Expenses', description: 'Can submit daily expenses' },
        { id: 'viewInventory', label: 'View Inventory', description: 'Can see inventory items' },
        { id: 'updateInventory', label: 'Update Inventory', description: 'Can add/remove inventory items' },
        { id: 'viewCustomerDetails', label: 'View Customer Details', description: 'Can see customer information' },
        { id: 'editCustomerDetails', label: 'Edit Customer Details', description: 'Can modify customer information' },
        { id: 'viewReports', label: 'View Reports', description: 'Can access reports and analytics' }
    ];

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            setLoading(true);
            const [techsData, permsData, accountsData, groupsData] = await Promise.all([
                techniciansAPI.getAll(),
                websiteSettingsAPI.getByKey('technician-permissions'),
                accountsAPI.getAll(), // Fetch ALL accounts to find newly created ones
                accountGroupsAPI.getAll()
            ]);

            setTechnicians(techsData || []);
            setAllPermissions(permsData?.value || {});
            const allAccounts = accountsData || [];
            setTechnicianAccounts(allAccounts);
            setGroups(groupsData || []);

            // ── Only show technicians that are linked to a proper 'technician'-type account ──
            // This prevents "Demo", "Test", or leftover rows from showing up
            const technicianTypeAccountIds = new Set(
                allAccounts
                    .filter(a => a.type === 'technician')
                    .map(a => a.id)
            );
            const filtered = (techsData || []).filter(t =>
                !t.ledger_id || technicianTypeAccountIds.has(t.ledger_id)
            );
            setTechnicians(filtered);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.technician_id) newErrors.technician_id = 'Please select a technician account';
        if (!editingTechnician || formData.password) {
            if (!formData.password || formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            const updateData = { is_active: formData.is_active };
            if (formData.password) updateData.password = formData.password;

            let techId = formData.technician_id;
            const isNewSetup = !technicians.some(t => t.id === techId);

            if (isNewSetup) {
                const selectedAccount = technicianAccounts.find(a => a.id === techId);
                if (!selectedAccount) throw new Error('Selected technician account not found');
                const phone = selectedAccount.mobile || selectedAccount.phone || '';
                const createData = {
                    ...updateData,
                    name: selectedAccount.name,
                    phone,
                    username: phone, // use phone as username for DB compatibility
                    ledger_id: selectedAccount.id
                };
                const result = await techniciansAPI.create(createData);
                techId = result.id;
            } else {
                await techniciansAPI.update(techId, updateData);
            }

            // Save Permissions
            const updatedPermissions = {
                ...allPermissions,
                [techId]: formData.permissions
            };
            await websiteSettingsAPI.save('technician-permissions', updatedPermissions, 'Technician access control permissions');

            await fetchTechnicians();
            handleCloseForm();
            alert('Technician settings saved successfully!');
        } catch (err) {
            console.error('Error saving technician:', err);
            let errorMessage = 'Failed to save technician settings';

            if (err.message?.includes('unique constraint "technicians_username_key"')) {
                errorMessage = 'This username is already taken. Please choose a different one.';
                setErrors(prev => ({ ...prev, username: 'Username already taken' }));
            } else if (err.message) {
                errorMessage = err.message;
            }

            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (tech, tab = 'credentials') => {
        setEditingTechnician(tech);
        setFormData({
            technician_id: tech.id,
            password: '',
            confirmPassword: '',
            is_active: tech.is_active !== false,
            permissions: allPermissions[tech.id] || {
                viewJobs: true,
                updateJobStatus: true,
                submitExpenses: true,
                viewInventory: true,
                updateInventory: false,
                viewCustomerDetails: true,
                editCustomerDetails: false,
                viewReports: false
            }
        });
        setActiveModalTab(tab);
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
            password: '',
            confirmPassword: '',
            is_active: true,
            permissions: {
                viewJobs: true,
                updateJobStatus: true,
                submitExpenses: true,
                viewInventory: true,
                updateInventory: false,
                viewCustomerDetails: true,
                editCustomerDetails: false,
                viewReports: false
            }
        });
        setErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);
        setActiveModalTab('credentials');
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
                            <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', fontWeight: 600 }}>Phone (Login)</th>
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
                                    <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tech.phone || '—'}</td>
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
                                                onClick={() => handleEdit(tech, 'permissions')}
                                                title="Edit permissions"
                                                style={{ color: 'var(--color-primary)' }}
                                            >
                                                <Shield size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEdit(tech, 'credentials')}
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
                        <div className="modal-header" style={{ paddingBottom: 0 }}>
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                    <h2 className="modal-title">
                                        {editingTechnician ? 'Edit' : 'Setup'} Technician Profile
                                    </h2>
                                    <button className="btn-icon" onClick={handleCloseForm}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Tabs */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    <button
                                        className={`modal-tab ${activeModalTab === 'credentials' ? 'active' : ''}`}
                                        onClick={() => setActiveModalTab('credentials')}
                                        style={{ padding: 'var(--spacing-sm) 0', borderBottom: activeModalTab === 'credentials' ? '2px solid var(--color-primary)' : 'none', color: activeModalTab === 'credentials' ? 'var(--color-primary)' : 'var(--text-secondary)', background: 'none', cursor: 'pointer', fontWeight: activeModalTab === 'credentials' ? 600 : 400 }}
                                    >
                                        Credentials
                                    </button>
                                    <button
                                        className={`modal-tab ${activeModalTab === 'permissions' ? 'active' : ''}`}
                                        onClick={() => setActiveModalTab('permissions')}
                                        style={{ padding: 'var(--spacing-sm) 0', borderBottom: activeModalTab === 'permissions' ? '2px solid var(--color-primary)' : 'none', color: activeModalTab === 'permissions' ? 'var(--color-primary)' : 'var(--text-secondary)', background: 'none', cursor: 'pointer', fontWeight: activeModalTab === 'permissions' ? 600 : 400 }}
                                    >
                                        Permissions
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                            {activeModalTab === 'credentials' ? (
                                <>
                                    {/* Technician Selection */}
                                    <div className="form-group">
                                        <label className="form-label">Technician Account *</label>
                                        <select
                                            className="form-select"
                                            value={formData.technician_id}
                                            onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                                            disabled={editingTechnician}
                                        >
                                            <option value="">Select technician account...</option>
                                            {/* Show existing technicians first */}
                                            {editingTechnician ? (
                                                <option value={editingTechnician.id}>
                                                    {editingTechnician.name} - {editingTechnician.phone}
                                                </option>
                                            ) : (
                                                <>
                                                    <optgroup label="Setup Credentials for Ledger Accounts">
                                                        {technicianAccounts
                                                            .filter(acc => {
                                                                // Only accounts explicitly created as 'technician' type
                                                                const isAlreadyTech = technicians.some(t => t.ledger_id === acc.id);
                                                                if (isAlreadyTech) return false;
                                                                return acc.type === 'technician';
                                                            })
                                                            .map(acc => (
                                                                <option key={acc.id} value={acc.id}>
                                                                    {acc.name} ({acc.type || 'Account'})
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                    <optgroup label="Existing Technician Profiles">
                                                         {technicians.map(tech => (
                                                            <option key={tech.id} value={tech.id}>
                                                                {tech.name} - {tech.phone}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            )}
                                        </select>
                                        {errors.technician_id && (
                                            <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                                                {errors.technician_id}
                                            </span>
                                        )}
                                    </div>

                                    {/* Login info note */}
                                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                        📱 Technician logs in using their <strong>mobile number</strong> + password
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
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                        Set access permissions for this technician.
                                    </p>
                                    {permissionsList.map(permission => (
                                        <div
                                            key={permission.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 'var(--spacing-sm)',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{permission.label}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{permission.description}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions[permission.id]}
                                                onChange={() => setFormData({
                                                    ...formData,
                                                    permissions: {
                                                        ...formData.permissions,
                                                        [permission.id]: !formData.permissions[permission.id]
                                                    }
                                                })}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCloseForm} disabled={saving}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TechnicianManagement;
