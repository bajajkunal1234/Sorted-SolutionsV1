'use client'

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Power, Save, X, Eye, EyeOff, Shield, Loader2, Check, AlertCircle, Receipt, Trash2, RefreshCcw } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI, accountsAPI, accountGroupsAPI } from '@/lib/adminAPI';

const CATEGORY_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#6b7280','#f97316','#06b6d4'];

function TechnicianManagement() {
    const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'expenses'

    // ─── Credentials state ───────────────────────────────────────────────────
    const [technicians, setTechnicians] = useState([]);
    const [technicianAccounts, setTechnicianAccounts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTechnician, setEditingTechnician] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('credentials');
    const [allPermissions, setAllPermissions] = useState({});
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        technician_id: '', password: '', confirmPassword: '', is_active: true,
        permissions: { viewJobs: true, updateJobStatus: true, submitExpenses: true, viewInventory: true, updateInventory: false, viewCustomerDetails: true, editCustomerDetails: false, viewReports: false }
    });
    const [errors, setErrors] = useState({});

    // ─── Expenses state ───────────────────────────────────────────────────────
    const [categories, setCategories] = useState([]);
    const [expenseFilter, setExpenseFilter] = useState('pending');
    const [expenses, setExpenses] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', daily_limit: '', color: '#3b82f6' });
    const [editingCat, setEditingCat] = useState(null); // index being edited
    const [savingCats, setSavingCats] = useState(false);
    const [reviewNotes, setReviewNotes] = useState({});

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

    useEffect(() => { fetchTechnicians(); }, []);
    useEffect(() => { if (activeTab === 'expenses') { fetchCategories(); fetchExpenses(); } }, [activeTab, expenseFilter]);

    const fetchTechnicians = async () => {
        try {
            setLoading(true);
            const [techsData, permsData, accountsData, groupsData] = await Promise.all([
                techniciansAPI.getAll(),
                websiteSettingsAPI.getByKey('technician-permissions'),
                accountsAPI.getAll(),
                accountGroupsAPI.getAll()
            ]);
            setTechnicians(techsData || []);
            setAllPermissions(permsData?.value || {});
            setGroups(groupsData || []);

            const getGroupIds = (groupName) => {
                const targetGroup = (groupsData || []).find(g => g.name.toLowerCase() === groupName.toLowerCase());
                if (!targetGroup) return new Set();
                const ids = new Set([targetGroup.id]);
                const addChildren = (parentId) => {
                    (groupsData || []).filter(g => g.under === parentId).forEach(c => { ids.add(c.id); addChildren(c.id); });
                };
                addChildren(targetGroup.id);
                return ids;
            };
            const validGroupIds = getGroupIds('Technicians');
            const validTechAccounts = (accountsData || []).filter(a => validGroupIds.has(a.under));
            setTechnicianAccounts(validTechAccounts);
            const validAccountIds = new Set(validTechAccounts.map(a => a.id));
            setTechnicians((techsData || []).filter(t => !t.ledger_id || validAccountIds.has(t.ledger_id)));
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/expense-categories');
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (err) { console.error(err); }
    };

    const fetchExpenses = async () => {
        setExpensesLoading(true);
        try {
            const res = await fetch(`/api/admin/expenses?status=${expenseFilter}`);
            const data = await res.json();
            setExpenses(data.expenses || []);
        } catch (err) { console.error(err); }
        finally { setExpensesLoading(false); }
    };

    const handleSaveCategories = async () => {
        setSavingCats(true);
        try {
            await fetch('/api/admin/expense-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories })
            });
            setEditingCat(null);
        } catch (err) { alert('Failed to save categories'); }
        finally { setSavingCats(false); }
    };

    const handleAddCategory = () => {
        if (!newCategory.name.trim()) return;
        const cat = {
            id: newCategory.name.toLowerCase().replace(/\s+/g, '-'),
            name: newCategory.name.trim(),
            daily_limit: parseFloat(newCategory.daily_limit) || 0,
            color: newCategory.color
        };
        setCategories(prev => [...prev, cat]);
        setNewCategory({ name: '', daily_limit: '', color: '#3b82f6' });
    };

    const handleDeleteCategory = (idx) => {
        setCategories(prev => prev.filter((_, i) => i !== idx));
    };

    const handleReviewExpense = async (expense, status) => {
        try {
            const res = await fetch('/api/admin/expenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expense.id, status, admin_notes: reviewNotes[expense.id] || '' })
            });
            const data = await res.json();
            if (data.success) {
                setExpenses(prev => prev.filter(e => e.id !== expense.id));
                setReviewNotes(prev => { const n = {...prev}; delete n[expense.id]; return n; });
            } else { alert(data.error || 'Failed to update'); }
        } catch (err) { alert('Failed to update expense'); }
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
                const result = await techniciansAPI.create({ ...updateData, name: selectedAccount.name, phone, username: phone, ledger_id: selectedAccount.id });
                techId = result.id;
            } else {
                await techniciansAPI.update(techId, updateData);
            }
            const updatedPermissions = { ...allPermissions, [techId]: formData.permissions };
            await websiteSettingsAPI.save('technician-permissions', updatedPermissions, 'Technician access control permissions');
            await fetchTechnicians();
            handleCloseForm();
            alert('Technician settings saved successfully!');
        } catch (err) {
            alert(err.message || 'Failed to save technician settings');
        } finally { setSaving(false); }
    };

    const handleEdit = (tech, tab = 'credentials') => {
        setEditingTechnician(tech);
        setFormData({ technician_id: tech.id, password: '', confirmPassword: '', is_active: tech.is_active !== false, permissions: allPermissions[tech.id] || { viewJobs: true, updateJobStatus: true, submitExpenses: true, viewInventory: true, updateInventory: false, viewCustomerDetails: true, editCustomerDetails: false, viewReports: false } });
        setActiveModalTab(tab);
        setShowForm(true);
    };

    const handleToggleActive = async (tech) => {
        try {
            await techniciansAPI.update(tech.id, { is_active: !tech.is_active });
            await fetchTechnicians();
        } catch (err) { alert('Failed to update status: ' + err.message); }
    };

    const handleCloseForm = () => {
        setShowForm(false); setEditingTechnician(null);
        setFormData({ technician_id: '', password: '', confirmPassword: '', is_active: true, permissions: { viewJobs: true, updateJobStatus: true, submitExpenses: true, viewInventory: true, updateInventory: false, viewCustomerDetails: true, editCustomerDetails: false, viewReports: false } });
        setErrors({}); setShowPassword(false); setShowConfirmPassword(false); setActiveModalTab('credentials');
    };

    const statusBadge = (status) => {
        const map = { pending: { label: 'Pending', bg: '#fef3c7', color: '#d97706' }, approved: { label: 'Approved', bg: '#d1fae5', color: '#059669' }, rejected: { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' } };
        const s = map[status] || map.pending;
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
    };

    if (loading) return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Technician Management</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Manage credentials, permissions and expense approvals</p>
                </div>
                {activeTab === 'credentials' && (
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> Setup Credentials
                    </button>
                )}
            </div>

            {/* Top-level subtabs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 0 }}>
                {[
                    { id: 'credentials', label: '🔐 Technician Credentials' },
                    { id: 'expenses', label: '💰 Technician Expenses' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            padding: '8px 16px', border: 'none', cursor: 'pointer', borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            backgroundColor: 'transparent', color: activeTab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === t.id ? 600 : 400, fontSize: 'var(--font-size-sm)', transition: 'all 0.15s'
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* ──────────────── CREDENTIALS TAB ──────────────── */}
            {activeTab === 'credentials' && (
                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
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
                                <tr><td colSpan="4" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>No technicians found. Create technician accounts in the Accounts tab first.</td></tr>
                            ) : (
                                technicians.map(tech => (
                                    <tr key={tech.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                        <td style={{ padding: 'var(--spacing-md)' }}>{tech.name}</td>
                                        <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tech.phone || '—'}</td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 500, backgroundColor: tech.is_active !== false ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: tech.is_active !== false ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {tech.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end' }}>
                                                <button className="btn-icon" onClick={() => handleEdit(tech, 'permissions')} title="Edit permissions" style={{ color: 'var(--color-primary)' }}><Shield size={16} /></button>
                                                <button className="btn-icon" onClick={() => handleEdit(tech, 'credentials')} title="Edit credentials"><Edit2 size={16} /></button>
                                                <button className="btn-icon" onClick={() => handleToggleActive(tech)} title={tech.is_active !== false ? 'Deactivate' : 'Activate'} style={{ color: tech.is_active !== false ? 'var(--color-danger)' : 'var(--color-success)' }}><Power size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ──────────────── EXPENSES TAB ──────────────── */}
            {activeTab === 'expenses' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                    {/* Allowed Categories Section */}
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', margin: 0 }}>Allowed Expense Categories</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Define what technicians can claim and the daily limits</p>
                            </div>
                            <button className="btn btn-primary" onClick={handleSaveCategories} disabled={savingCats} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {savingCats ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Categories
                            </button>
                        </div>

                        <div style={{ padding: 'var(--spacing-md)' }}>
                            {/* Existing categories */}
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                                {categories.map((cat, i) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                                        {editingCat === i ? (
                                            <>
                                                <input className="form-input" value={cat.name} onChange={e => { const c=[...categories]; c[i]={...c[i],name:e.target.value}; setCategories(c); }} style={{ flex:1, padding:'4px 8px', fontSize:'var(--font-size-sm)' }} />
                                                <span style={{ fontSize:'var(--font-size-xs)', color:'var(--text-secondary)' }}>Daily limit ₹</span>
                                                <input className="form-input" type="number" value={cat.daily_limit} onChange={e => { const c=[...categories]; c[i]={...c[i],daily_limit:parseFloat(e.target.value)||0}; setCategories(c); }} style={{ width:'90px', padding:'4px 8px', fontSize:'var(--font-size-sm)' }} />
                                                <select value={cat.color} onChange={e => { const c=[...categories]; c[i]={...c[i],color:e.target.value}; setCategories(c); }} style={{ padding:'4px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-primary)', background:'var(--bg-primary)' }}>
                                                    {CATEGORY_COLORS.map(col => <option key={col} value={col} style={{ backgroundColor:col }}>{col}</option>)}
                                                </select>
                                                <button className="btn-icon" onClick={() => setEditingCat(null)}><Check size={14} color="#10b981" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ flex:1, fontWeight:500, fontSize:'var(--font-size-sm)' }}>{cat.name}</span>
                                                <span style={{ fontSize:'var(--font-size-xs)', color:'var(--text-secondary)' }}>Daily limit: ₹{cat.daily_limit?.toLocaleString('en-IN') || 0}</span>
                                                <button className="btn-icon" onClick={()=>setEditingCat(i)}><Edit2 size={14} /></button>
                                                <button className="btn-icon" onClick={()=>handleDeleteCategory(i)}><Trash2 size={14} color="#ef4444" /></button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add new category */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-primary)' }}>
                                <input className="form-input" placeholder="Category name" value={newCategory.name} onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--font-size-sm)' }} />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Limit ₹</span>
                                <input className="form-input" type="number" placeholder="500" value={newCategory.daily_limit} onChange={e => setNewCategory(p => ({ ...p, daily_limit: e.target.value }))} style={{ width: '80px', padding: '6px 8px', fontSize: 'var(--font-size-sm)' }} />
                                <select value={newCategory.color} onChange={e => setNewCategory(p => ({ ...p, color: e.target.value }))} style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
                                    {CATEGORY_COLORS.map(col => <option key={col} value={col}>{col}</option>)}
                                </select>
                                <button className="btn btn-primary" onClick={handleAddCategory} style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Expense Requests Section */}
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', margin: 0 }}>Expense Requests</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Review and approve technician expense claims</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} className="form-select" style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="all">All</option>
                                </select>
                                <button className="btn-icon" onClick={fetchExpenses} title="Refresh"><RefreshCcw size={16} /></button>
                            </div>
                        </div>

                        {expensesLoading ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading expenses...</div>
                        ) : expenses.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Receipt size={40} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.3 }} />
                                <div>No {expenseFilter === 'all' ? '' : expenseFilter} expense requests</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 0 }}>
                                {expenses.map((exp, idx) => {
                                    const cat = categories.find(c => c.id === exp.category);
                                    return (
                                        <div key={exp.id} style={{ padding: 'var(--spacing-md)', borderBottom: idx < expenses.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>{cat?.name || exp.category}</span>
                                                        {statusBadge(exp.status)}
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                            {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        Tech ID: {exp.technician_id}
                                                    </div>
                                                    {exp.description && <div style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>{exp.description}</div>}
                                                    {exp.admin_notes && <div style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626', marginTop: '4px' }}>Admin note: {exp.admin_notes}</div>}
                                                </div>
                                                <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-md)', flexShrink: 0 }}>
                                                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>₹{parseFloat(exp.amount).toLocaleString('en-IN')}</div>
                                                </div>
                                            </div>
                                            {exp.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginTop: 'var(--spacing-xs)' }}>
                                                    <input
                                                        className="form-input"
                                                        placeholder="Admin note (optional for rejection)"
                                                        value={reviewNotes[exp.id] || ''}
                                                        onChange={e => setReviewNotes(p => ({ ...p, [exp.id]: e.target.value }))}
                                                        style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
                                                    />
                                                    <button onClick={() => handleReviewExpense(exp, 'approved')} style={{ padding: '6px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Check size={14} /> Approve
                                                    </button>
                                                    <button onClick={() => handleReviewExpense(exp, 'rejected')} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <X size={14} /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ──────────────── CREDENTIALS MODAL ──────────────── */}
            {showForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header" style={{ paddingBottom: 0 }}>
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                    <h2 className="modal-title">{editingTechnician ? 'Edit' : 'Setup'} Technician Profile</h2>
                                    <button className="btn-icon" onClick={handleCloseForm}><X size={20} /></button>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    {['credentials', 'permissions'].map(t => (
                                        <button key={t} onClick={() => setActiveModalTab(t)} style={{ padding: 'var(--spacing-sm) 0', borderBottom: activeModalTab === t ? '2px solid var(--color-primary)' : 'none', color: activeModalTab === t ? 'var(--color-primary)' : 'var(--text-secondary)', background: 'none', cursor: 'pointer', fontWeight: activeModalTab === t ? 600 : 400, border: 'none', borderBottom: activeModalTab === t ? '2px solid var(--color-primary)' : '2px solid transparent', textTransform: 'capitalize', fontSize: 'var(--font-size-sm)' }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                            {activeModalTab === 'credentials' ? (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Technician Account *</label>
                                        <select className="form-select" value={formData.technician_id} onChange={e => setFormData({ ...formData, technician_id: e.target.value })} disabled={editingTechnician}>
                                            <option value="">Select technician account...</option>
                                            {editingTechnician ? (
                                                <option value={editingTechnician.id}>{editingTechnician.name} - {editingTechnician.phone}</option>
                                            ) : (
                                                <>
                                                    <optgroup label="Setup Credentials for Ledger Accounts">
                                                        {technicianAccounts.filter(acc => !technicians.some(t => t.ledger_id === acc.id)).map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Existing Technician Profiles">
                                                        {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name} - {tech.phone}</option>)}
                                                    </optgroup>
                                                </>
                                            )}
                                        </select>
                                        {errors.technician_id && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.technician_id}</span>}
                                    </div>
                                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                        📱 Technician logs in using their <strong>mobile number</strong> + password
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Password {editingTechnician ? '(leave blank to keep current)' : '*'}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Minimum 8 characters" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ paddingRight: '40px' }} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                        {errors.password && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.password}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Confirm Password *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={showConfirmPassword ? 'text' : 'password'} className="form-input" placeholder="Re-enter password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} style={{ paddingRight: '40px' }} />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                        {errors.confirmPassword && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>{errors.confirmPassword}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                            <span className="form-label" style={{ marginBottom: 0 }}><Shield size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Active (Allow login)</span>
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Set access permissions for this technician.</p>
                                    {permissionsList.map(permission => (
                                        <div key={permission.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{permission.label}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{permission.description}</div>
                                            </div>
                                            <input type="checkbox" checked={!!formData.permissions[permission.id]} onChange={() => setFormData({ ...formData, permissions: { ...formData.permissions, [permission.id]: !formData.permissions[permission.id] } })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCloseForm} disabled={saving}>Cancel</button>
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
