'use client'

import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Power, Save, X, Shield, Loader2, Check, AlertCircle, Receipt, Trash2, RefreshCcw, MapPin, Camera, Star, Award, User, Eye, EyeOff, Package, Calendar } from 'lucide-react';
import { websiteSettingsAPI, accountsAPI, accountGroupsAPI, transactionsAPI } from '@/lib/adminAPI';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';
import PurchaseInvoiceForm from '../accounts/PurchaseInvoiceForm';

const TechnicianLiveMap = dynamic(() => import('./TechnicianLiveMap'), {
    ssr: false,
    loading: () => <div style={{ height: 480, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>🗺️ Loading fleet map...</div>
});

const CATEGORY_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#6b7280','#f97316','#06b6d4'];

const CUSTOMER_CARD_FIELDS = [
    { id: 'photo', label: 'Profile Photo', icon: '📷' },
    { id: 'name', label: 'Name', icon: '👤' },
    { id: 'rating', label: 'Star Rating', icon: '⭐' },
    { id: 'years_experience', label: 'Years Experience', icon: '🏆' },
    { id: 'specializations', label: 'Specializations', icon: '🔧' },
    { id: 'bio', label: 'Bio / Tagline', icon: '💬' },
];

function TechnicianManagement({ initialSubTab }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ─── Fleet map state ──────────────────────────────────────────────────────
    const [activeJobs, setActiveJobs] = useState([]);
    const [fleetLoading, setFleetLoading] = useState(false);
    const [geocodeStatus, setGeocodeStatus] = useState(null);
    const [geocodeCount, setGeocodeCount] = useState(null);

    // ─── Profile tab state ────────────────────────────────────────────────────
    const [technicians, setTechnicians] = useState([]);
    const [technicianAccounts, setTechnicianAccounts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTech, setSelectedTech] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [profileDraft, setProfileDraft] = useState(null);
    const [newSpecialization, setNewSpecialization] = useState('');
    const fileInputRef = useRef(null);

    // ─── Expenses state ───────────────────────────────────────────────────────
    const [categories, setCategories] = useState([]);
    const [expenseFilter, setExpenseFilter] = useState('pending');
    const [expenses, setExpenses] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', daily_limit: '', color: '#3b82f6' });
    const [editingCat, setEditingCat] = useState(null);
    const [savingCats, setSavingCats] = useState(false);
    const [reviewNotes, setReviewNotes] = useState({});
    const [payingExpense, setPayingExpense] = useState(null);
    const [expenseAccounts, setExpenseAccounts] = useState([]);
    const [selectedTechFilter, setSelectedTechFilter] = useState('');
    const [adminExpenseViewMode, setAdminExpenseViewMode] = useState('claims');
    const [adminLedgerData, setAdminLedgerData] = useState({ summary: { total_expenses: 0, total_payments: 0, balance: 0 }, ledger: [] });
    const [adminLedgerLoading, setAdminLedgerLoading] = useState(false);

    // ─── Spares Purchases state ───────────────────────────────────────────────
    const [spares, setSpares] = useState([]);
    const [sparesLoading, setSparesLoading] = useState(false);
    const [sparesFilter, setSparesFilter] = useState('pending');
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [payingSparesInvoice, setPayingSparesInvoice] = useState(null);

    // ─── Leaves state ─────────────────────────────────────────────────────────
    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);
    const [leavesFilter, setLeavesFilter] = useState('all');

    useEffect(() => {
        if (initialSubTab) {
            if (initialSubTab === 'spares-post') {
                setActiveTab('spares');
                setSparesFilter('pending');
            } else if (initialSubTab === 'spares-pay') {
                setActiveTab('spares');
                setSparesFilter('posted');
            } else if (initialSubTab === 'expenses') {
                setActiveTab('expenses');
                setExpenseFilter('pending');
                setAdminExpenseViewMode('claims');
            } else if (initialSubTab === 'leaves') {
                setActiveTab('leaves');
                setLeavesFilter('pending');
            }
        }
    }, [initialSubTab]);

    useEffect(() => { fetchTechnicians(); fetchGeocodeCount(); }, []);
    useEffect(() => { 
        if (activeTab === 'expenses') { 
            fetchCategories(); 
            fetchExpenses(); 
            fetchExpenseAccounts();
        } else if (activeTab === 'spares') {
            fetchSpares();
        } else if (activeTab === 'leaves') {
            fetchLeaves();
        }
    }, [activeTab, expenseFilter, sparesFilter, selectedTechFilter, leavesFilter]);

    useEffect(() => {
        if (activeTab === 'expenses' && selectedTechFilter && adminExpenseViewMode === 'ledger') {
            fetchAdminLedger(selectedTechFilter);
        }
    }, [activeTab, selectedTechFilter, adminExpenseViewMode]);
    useEffect(() => { if (activeTab === 'livefleet') fetchActiveJobs(); }, [activeTab]);

    useEffect(() => {
        const channel = supabase.channel('realtime:technician_updates');
        
        channel.on('broadcast', { event: 'expense_submitted' }, ({ payload }) => {
            console.log('Realtime broadcast: expense submitted', payload);
            fetchExpenses();
            if (payload?.technicianId && selectedTechFilter === payload.technicianId) {
                fetchAdminLedger(payload.technicianId);
            }
        });

        channel.on('broadcast', { event: 'purchase_submitted' }, () => {
            console.log('Realtime broadcast: purchase submitted');
            fetchSpares();
        });

        channel.on('broadcast', { event: 'leave_submitted' }, () => {
            console.log('Realtime broadcast: leave submitted');
            fetchLeaves();
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedTechFilter]);

    const fetchSpares = async () => {
        setSparesLoading(true);
        try {
            const data = await transactionsAPI.getAll({ type: 'purchase' });
            // Filter spares purchases that are generated by technicians
            const sparesList = (data || []).filter(tx => tx.reference === 'Technician Purchase');
            setSpares(sparesList);
        } catch (err) {
            console.error('Error fetching spares purchases:', err);
        } finally {
            setSparesLoading(false);
        }
    };

    const handleSaveSparesInvoice = async (updatedData) => {
        if (!editingPurchase) return;
        try {
            const cleanData = { ...updatedData };
            const type = 'purchase';
            
            // Clean/remove any UI-only fields
            delete cleanData.__formType;
            delete cleanData.billing_address;
            delete cleanData.shipping_address;
            delete cleanData.charges;
            
            await transactionsAPI.update(editingPurchase.id, cleanData, type);
            
            alert('✅ Spares purchase invoice approved and posted successfully!');
            setEditingPurchase(null);
            fetchSpares();
        } catch (err) {
            console.error('Error posting spares purchase invoice:', err);
            alert('Error: ' + err.message);
        }
    };

    const handleToggleHandover = async (item, checked) => {
        try {
            await transactionsAPI.update(item.id, { handed_to_service_center: checked }, 'purchase');
            setSpares(prev => prev.map(s => s.id === item.id ? { ...s, handed_to_service_center: checked } : s));
        } catch (err) {
            console.error('Error updating handover status:', err);
            alert('Failed to update handover status: ' + err.message);
        }
    };

    const handleSaveSparesPaymentVoucher = async (voucherData) => {
        if (!payingSparesInvoice) return;
        try {
            await transactionsAPI.create(voucherData, 'payment');
            const isTech = payingSparesInvoice.paid_by === 'technician';
            setPayingSparesInvoice(null);
            fetchSpares();
            alert(isTech ? '✅ Technician reimbursement recorded and allocated successfully!' : '✅ Supplier payment recorded and allocated successfully!');
        } catch (err) {
            console.error('Error recording supplier payment:', err);
            alert('Error: ' + err.message);
        }
    };

    const fetchLeaves = async () => {
        setLeavesLoading(true);
        try {
            const res = await fetch('/api/admin/leaves');
            const data = await res.json();
            if (data.success) {
                setLeaves(data.leaves || []);
            }
        } catch (err) {
            console.error('Error fetching admin leaves:', err);
        } finally {
            setLeavesLoading(false);
        }
    };

    const handleUpdateLeaveStatus = async (id, status) => {
        try {
            const res = await fetch('/api/admin/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update leave status');
            
            setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
            alert(`✅ Leave request successfully ${status}!`);
        } catch (err) {
            console.error('Update leave error:', err);
            alert('Error: ' + err.message);
        }
    };

    const fetchGeocodeCount = async () => {
        try {
            const res = await fetch(`/api/admin/geocode-properties?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success) setGeocodeCount(data.needsGeocoding);
        } catch(e) {}
    };

    const fetchActiveJobs = async () => {
        setFleetLoading(true);
        try {
            const res = await fetch('/api/admin/jobs?status=in-progress&limit=50');
            const data = await res.json();
            setActiveJobs(data.jobs || data.data || []);
        } catch(e) { setActiveJobs([]); }
        finally { setFleetLoading(false); }
    };

    const handleRunGeocode = async () => {
        const msg = `This will use Google to find precise coordinates for ${geocodeCount} propert${geocodeCount === 1 ? 'y' : 'ies'} that don't have a map pin yet.\n\nIt takes about 5 seconds total. Continue?`;
        if (!window.confirm(msg)) return;
        setGeocodeStatus('running');
        try {
            const res = await fetch('/api/admin/geocode-properties', { method: 'POST' });
            const data = await res.json();
            setGeocodeStatus(data);
            fetchGeocodeCount();
        } catch(e) { setGeocodeStatus({ error: e.message }); }
    };

    const fetchTechnicians = async () => {
        try {
            setLoading(true);
            // Use the new admin technicians API
            const res = await fetch('/api/admin/technicians');
            const data = await res.json();
            if (data.success) {
                setTechnicians(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching technicians:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTech = (tech) => {
        setSelectedTech(tech);
        setProfileDraft({
            name: tech.name || '',
            photo_url: tech.photo_url || '',
            rating: tech.rating || '',
            years_experience: tech.years_experience || '',
            bio: tech.bio || '',
            specializations: tech.specializations || [],
            customer_card_fields: tech.customer_card_fields || { photo: true, name: true, rating: true, years_experience: true, specializations: false, bio: false },
            is_active: tech.is_active !== false,
            date_joined: tech.date_joined || '',
            last_working_day: tech.last_working_day || '',
        });
    };

    const handleSaveProfile = async () => {
        if (!selectedTech) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/technicians?id=${selectedTech.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileDraft),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save');
            // Update local list
            setTechnicians(prev => prev.map(t => t.id === selectedTech.id ? { ...t, ...profileDraft } : t));
            setSelectedTech(prev => ({ ...prev, ...profileDraft }));
            alert('✅ Technician profile saved!');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) {
                setProfileDraft(prev => ({ ...prev, photo_url: data.url }));
            } else throw new Error(data.error || 'Upload failed');
        } catch (err) {
            alert('Photo upload failed: ' + err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleToggleActive = async (tech) => {
        if (tech.last_working_day) {
            alert('Cannot make technician active because a last working day is set.');
            return;
        }
        try {
            const currentActive = tech.is_active !== false;
            const newActive = !currentActive;
            await fetch(`/api/admin/technicians?id=${tech.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newActive }),
            });
            fetchTechnicians();
            if (selectedTech?.id === tech.id) {
                setProfileDraft(prev => ({ ...prev, is_active: newActive }));
                setSelectedTech(prev => ({ ...prev, is_active: newActive }));
            }
        } catch (err) { alert('Failed to update status: ' + err.message); }
    };

    // ─── Expense helpers ──────────────────────────────────────────────────────
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
            const techQuery = selectedTechFilter ? `&technician_id=${selectedTechFilter}` : '';
            const res = await fetch(`/api/admin/expenses?status=${expenseFilter}${techQuery}`);
            const data = await res.json();
            setExpenses(data.expenses || []);
        } catch (err) { console.error(err); }
        finally { setExpensesLoading(false); }
    };

    const fetchAdminLedger = async (techId) => {
        if (!techId) return;
        setAdminLedgerLoading(true);
        try {
            const res = await fetch(`/api/technician/expenses/ledger?technicianId=${techId}`);
            const data = await res.json();
            if (data.success) {
                setAdminLedgerData({
                    summary: data.summary || { total_expenses: 0, total_payments: 0, balance: 0 },
                    ledger: data.ledger || []
                });
            }
        } catch (err) {
            console.error('Error fetching admin ledger:', err);
        } finally {
            setAdminLedgerLoading(false);
        }
    };

    const fetchExpenseAccounts = async () => {
        try {
            const data = await accountsAPI.getAll('expense');
            setExpenseAccounts(data || []);
        } catch (err) {
            console.error('Error fetching expense accounts:', err);
        }
    };

    const getPrefilledAccount = (expense) => {
        if (!expense || !expenseAccounts.length) return null;
        if (expense.category?.toLowerCase() === 'travel') {
            const travelAcc = expenseAccounts.find(acc => acc.name?.toLowerCase().includes('travel'));
            if (travelAcc) return travelAcc;
        }
        const officeAcc = expenseAccounts.find(acc => acc.name?.toLowerCase().includes('office')) || 
                          expenseAccounts.find(acc => acc.name?.toLowerCase().includes('general')) ||
                          expenseAccounts[0];
        return officeAcc;
    };

    const getPrefilledNarration = (expense) => {
        if (!expense) return '';
        const techName = expense.technician?.name || 'Technician';
        const catName = expense.category || '';
        const dateStr = new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const desc = expense.description || '';
        return `Paid to ${techName} for ${catName} expense request - Date: ${dateStr}${desc ? ' (Description: ' + desc + ')' : ''}`;
    };

    const handleSavePaymentVoucher = async (voucherData) => {
        if (!payingExpense) return;
        try {
            const voucher = await transactionsAPI.create(voucherData, 'payment');

            const patchRes = await fetch('/api/admin/expenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: payingExpense.id,
                    status: 'approved',
                    payment_voucher_id: voucher.id,
                    admin_notes: reviewNotes[payingExpense.id] || ''
                })
            });
            const patchData = await patchRes.json();
            if (!patchData.success) {
                throw new Error(patchData.error || 'Failed to link payment voucher to expense');
            }

            setPayingExpense(null);
            setReviewNotes(prev => { const n = {...prev}; delete n[payingExpense.id]; return n; });
            fetchExpenses();
            alert('✅ Expense approved and payment voucher linked successfully!');
        } catch (err) {
            console.error('Error saving payment and approving expense:', err);
            alert('Error: ' + err.message);
        }
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
        const cat = { id: newCategory.name.toLowerCase().replace(/\s+/g, '-'), name: newCategory.name.trim(), daily_limit: parseFloat(newCategory.daily_limit) || 0, color: newCategory.color };
        setCategories(prev => [...prev, cat]);
        setNewCategory({ name: '', daily_limit: '', color: '#3b82f6' });
    };

    const handleDeleteCategory = (idx) => { setCategories(prev => prev.filter((_, i) => i !== idx)); };

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

    const handleApproveExpenseDirectly = async (expense) => {
        try {
            const techId = expense.technician_id || expense.technician?.id;
            if (!techId) throw new Error('Technician ID not found on expense');
            
            const tech = technicians.find(t => t.id === techId);
            if (!tech) throw new Error('Technician details not found in state');
            if (!tech.ledger_id) throw new Error('Technician does not have a ledger/account mapped');

            const debitAccount = getPrefilledAccount(expense);
            if (!debitAccount) throw new Error('Debit account (Travel Expenses) not found');

            const categoryLabel = expense.category || 'Travel';
            const cleanCategoryLabel = categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);
            const notesText = reviewNotes[expense.id]?.trim() || '';
            const descriptionText = expense.description?.trim() || '';
            const formattedNotes = `Technician Expense: ${tech.name}${notesText ? ` | Admin Note: ${notesText}` : ''}`;

            const invoice_number = `EXP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

            const purchaseData = {
                invoice_number,
                reference: 'Technician Purchase',
                status: 'finalized',
                account_id: tech.ledger_id,
                account_name: tech.name,
                po_reference: tech.id,
                notes: formattedNotes,
                job_id: expense.job_id || null,
                items: [{
                    productId: debitAccount.id,
                    description: `Expense: ${cleanCategoryLabel}${descriptionText ? ` (${descriptionText})` : ''}`,
                    qty: 1,
                    rate: parseFloat(expense.amount),
                    discount: 0,
                    taxRate: 0,
                    total: parseFloat(expense.amount)
                }],
                subtotal: parseFloat(expense.amount),
                discount: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                total_tax: 0,
                total_amount: parseFloat(expense.amount),
                date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
                paid_by: 'technician',
                category: debitAccount.id
            };

            const response = await transactionsAPI.create(purchaseData, 'purchase');
            if (!response || !response.id) throw new Error('Failed to create purchase invoice for expense');

            const patchRes = await fetch('/api/admin/expenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: expense.id,
                    status: 'approved',
                    purchase_invoice_id: response.id,
                    admin_notes: reviewNotes[expense.id] || ''
                })
            });

            const patchData = await patchRes.json();
            if (!patchData.success) throw new Error(patchData.error || 'Failed to update expense status');

            setReviewNotes(prev => { const n = {...prev}; delete n[expense.id]; return n; });
            fetchExpenses();
            alert(`✅ Expense approved and posted to ${tech.name}'s account ledger successfully!`);
        } catch (err) {
            console.error('Error approving expense:', err);
            alert('Failed to approve expense: ' + err.message);
        }
    };

    const statusBadge = (status) => {
        const map = { pending: { label: 'Pending', bg: '#fef3c7', color: '#d97706' }, approved: { label: 'Approved', bg: '#d1fae5', color: '#059669' }, rejected: { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' } };
        const s = map[status] || map.pending;
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
    };

    if (loading) return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .admin-tabs-container::-webkit-scrollbar {
                    display: none;
                }
                .admin-sticky-table-container {
                    overflow: auto;
                    max-height: 550px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-primary);
                    -webkit-overflow-scrolling: touch;
                    position: relative;
                }
                .admin-sticky-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: var(--font-size-sm);
                }
                .admin-sticky-table th {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background-color: var(--bg-secondary) !important;
                    box-shadow: inset 0 -1px 0 var(--border-primary);
                    padding: 10px 14px;
                    font-weight: 600;
                    white-space: nowrap;
                    text-align: left;
                }
                .admin-sticky-table td {
                    padding: 10px 14px;
                    border-bottom: 1px solid var(--border-primary);
                    vertical-align: top;
                }
                .admin-sticky-table tr:last-child td {
                    border-bottom: none;
                }
                .admin-sticky-table tr:hover {
                    background-color: rgba(255, 255, 255, 0.015);
                }
                /* Toggle Switch CSS */
                .switch-container {
                    position: relative;
                    display: inline-block;
                    width: 38px;
                    height: 20px;
                }
                .switch-container input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .switch-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #475569;
                    transition: .3s;
                    border-radius: 20px;
                }
                .switch-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .switch-slider {
                    background-color: #10b981;
                }
                input:checked + .switch-slider:before {
                    transform: translateX(18px);
                }
                input:disabled + .switch-slider {
                    background-color: #1e293b;
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            ` }} />
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Technician Management</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Manage profiles, customer visibility, and expense approvals</p>
                </div>
            </div>

            {/* Top-level subtabs */}
            <div className="admin-tabs-container" style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 0, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                {[
                    { id: 'profile', label: '👤 Technician Profile' },
                    { id: 'expenses', label: '💰 Technician Expenses' },
                    { id: 'spares', label: '⚙️ Spares Purchases' },
                    { id: 'leaves', label: '📅 Leave Requests' },
                    { id: 'livefleet', label: '🗺️ Technicians on Map' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            padding: '8px 16px', border: 'none', cursor: 'pointer',
                            borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === t.id ? 600 : 400,
                            fontSize: 'var(--font-size-sm)', transition: 'all 0.15s',
                            flexShrink: 0
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* ──────────────── TECHNICIAN PROFILE TAB ──────────────── */}
            {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'start' }}>
                    {/* Technician list */}
                    {(!isMobile || !selectedTech) && (
                        <div style={{ flex: selectedTech ? '0 0 280px' : '1 1 100%', minWidth: '280px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', margin: 0 }}>Technicians</h3>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{technicians.length} total</span>
                            </div>
                            {technicians.length === 0 ? (
                                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                    No technicians found.<br />Add technicians via the Accounts tab.
                                </div>
                            ) : (
                                technicians.map(tech => (
                                    <div
                                        key={tech.id}
                                        onClick={() => handleSelectTech(tech)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px', cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-primary)',
                                            background: selectedTech?.id === tech.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                            borderLeft: selectedTech?.id === tech.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {tech.photo_url
                                            ? <img src={tech.photo_url} alt={tech.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>
                                                {tech.name?.[0]?.toUpperCase() || '?'}
                                              </div>
                                        }
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{tech.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tech.phone || '—'}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }} onClick={e => e.stopPropagation()}>
                                            <label className="switch-container">
                                                <input
                                                    type="checkbox"
                                                    checked={tech.is_active !== false}
                                                    disabled={!!tech.last_working_day}
                                                    onChange={() => handleToggleActive(tech)}
                                                />
                                                <span className="switch-slider"></span>
                                            </label>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: tech.is_active !== false ? '#10b981' : '#ef4444' }}>
                                                {tech.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Profile Editor */}
                    {selectedTech && profileDraft && (
                        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {isMobile && (
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => { setSelectedTech(null); setProfileDraft(null); }}
                                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, marginBottom: 4 }}
                                >
                                    ← Back to Technicians
                                </button>
                            )}
                            {/* OTP Login notice */}
                            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: '#6ee7b7', display: 'flex', gap: 8, alignItems: 'center' }}>
                                📱 <span><strong>{selectedTech.name}</strong> logs in via <strong>OTP</strong> on their registered mobile number — no password needed.</span>
                            </div>

                            {/* Photo + basic info */}
                            <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                    📋 Profile Information
                                </div>
                                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* Photo upload */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            {profileDraft.photo_url
                                                ? <img src={profileDraft.photo_url} alt="photo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-primary)' }} />
                                                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700 }}>
                                                    {profileDraft.name?.[0]?.toUpperCase() || '?'}
                                                  </div>
                                            }
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingPhoto}
                                                style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid var(--bg-elevated)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                {uploadingPhoto ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Camera size={12} />}
                                            </button>
                                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Full Name</label>
                                            <input
                                                className="form-input"
                                                value={profileDraft.name}
                                                onChange={e => setProfileDraft(p => ({ ...p, name: e.target.value }))}
                                                style={{ width: '100%', padding: '8px 12px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Rating + Experience */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>⭐ Star Rating (1–5)</label>
                                            <input
                                                type="number" min="0" max="5" step="0.1"
                                                className="form-input"
                                                value={profileDraft.rating}
                                                onChange={e => setProfileDraft(p => ({ ...p, rating: e.target.value }))}
                                                placeholder="e.g. 4.7"
                                                style={{ width: '100%', padding: '8px 12px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>🏆 Years of Experience</label>
                                            <input
                                                type="number" min="0"
                                                className="form-input"
                                                value={profileDraft.years_experience}
                                                onChange={e => setProfileDraft(p => ({ ...p, years_experience: e.target.value }))}
                                                placeholder="e.g. 5"
                                                style={{ width: '100%', padding: '8px 12px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>💬 Bio / Tagline</label>
                                        <textarea
                                            className="form-input"
                                            value={profileDraft.bio}
                                            onChange={e => setProfileDraft(p => ({ ...p, bio: e.target.value }))}
                                            placeholder="Short introduction visible to customers..."
                                            rows={2}
                                            style={{ width: '100%', padding: '8px 12px', resize: 'vertical' }}
                                        />
                                    </div>

                                    {/* Dates: Date Joined & Last Working Day */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>📅 Date Joined</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={profileDraft.date_joined || ''}
                                                onChange={e => setProfileDraft(p => ({ ...p, date_joined: e.target.value }))}
                                                style={{ width: '100%', padding: '8px 12px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>🏁 Last Working Day</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={profileDraft.last_working_day || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setProfileDraft(p => {
                                                        const updated = { ...p, last_working_day: val };
                                                        if (val) {
                                                            updated.is_active = false; // Stay inactive if last working day is set
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                                style={{ width: '100%', padding: '8px 12px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Specializations */}
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>🔧 Specializations</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                            {(profileDraft.specializations || []).map((s, i) => (
                                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', fontSize: 12, fontWeight: 600, color: '#6366f1' }}>
                                                    {s}
                                                    <button onClick={() => setProfileDraft(p => ({ ...p, specializations: p.specializations.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                className="form-input"
                                                value={newSpecialization}
                                                onChange={e => setNewSpecialization(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && newSpecialization.trim()) { setProfileDraft(p => ({ ...p, specializations: [...(p.specializations || []), newSpecialization.trim()] })); setNewSpecialization(''); } }}
                                                placeholder="e.g. AC Repair, Washing Machine..."
                                                style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
                                            />
                                            <button
                                                onClick={() => { if (newSpecialization.trim()) { setProfileDraft(p => ({ ...p, specializations: [...(p.specializations || []), newSpecialization.trim()] })); setNewSpecialization(''); } }}
                                                className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}
                                            >Add</button>
                                        </div>
                                    </div>

                                    {/* Active toggle */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <label className="switch-container">
                                                <input
                                                    type="checkbox"
                                                    checked={profileDraft.is_active}
                                                    disabled={!!profileDraft.last_working_day}
                                                    onChange={e => {
                                                        const val = e.target.checked;
                                                        setProfileDraft(p => ({ ...p, is_active: val }));
                                                    }}
                                                />
                                                <span className="switch-slider"></span>
                                            </label>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: profileDraft.is_active ? '#10b981' : '#ef4444' }}>
                                                Status: {profileDraft.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                            {profileDraft.last_working_day ? (
                                                <span style={{ color: '#ef4444' }}>⚠️ Locked to Inactive: Technician has a set last working day.</span>
                                            ) : profileDraft.is_active ? (
                                                <span>🟢 Active: Technician can log in to the mobile app and receive active job bookings.</span>
                                            ) : (
                                                <span>🔴 Inactive: Technician cannot log in and is excluded from receiving new jobs.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Card Visibility */}
                            <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>👁️ Customer Mini-Card Visibility</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Choose which fields the customer sees when viewing their assigned technician</div>
                                </div>
                                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {CUSTOMER_CARD_FIELDS.map(field => (
                                        <div key={field.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 18 }}>{field.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{field.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                        {field.id === 'photo' && (profileDraft.photo_url ? '✓ Photo uploaded' : 'No photo uploaded')}
                                                        {field.id === 'rating' && (profileDraft.rating ? `Currently: ★ ${profileDraft.rating}` : 'Not set')}
                                                        {field.id === 'years_experience' && (profileDraft.years_experience ? `${profileDraft.years_experience} yrs` : 'Not set')}
                                                        {field.id === 'specializations' && `${(profileDraft.specializations || []).length} tags`}
                                                        {field.id === 'bio' && (profileDraft.bio ? `"${profileDraft.bio.slice(0,30)}..."` : 'Not set')}
                                                        {field.id === 'name' && profileDraft.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{profileDraft.customer_card_fields?.[field.id] ? 'Visible' : 'Hidden'}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={!!profileDraft.customer_card_fields?.[field.id]}
                                                    onChange={e => setProfileDraft(p => ({ ...p, customer_card_fields: { ...p.customer_card_fields, [field.id]: e.target.checked } }))}
                                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Save */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button className="btn btn-secondary" onClick={() => { setSelectedTech(null); setProfileDraft(null); }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</> : <><Save size={14} /> Save Profile</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedTech && technicians.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-secondary)', gap: 10 }}>
                            <User size={40} style={{ opacity: 0.25 }} />
                            <div style={{ fontSize: 14 }}>Select a technician from the list to edit their profile</div>
                        </div>
                    )}
                </div>
            )}

            {/* ──────────────── EXPENSES TAB ──────────────── */}
            {activeTab === 'expenses' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', margin: 0 }}>Allowed Expense Categories</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Define what technicians can claim and the daily limits</p>
                            </div>
                            <button className="btn btn-primary" onClick={handleSaveCategories} disabled={savingCats} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {savingCats ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />} Save Categories
                            </button>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)' }}>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                                {categories.map((cat, i) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', flexWrap: 'wrap' }}>
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                                        {editingCat === i ? (
                                            <>
                                                <input className="form-input" value={cat.name} onChange={e => { const c=[...categories]; c[i]={...c[i],name:e.target.value}; setCategories(c); }} style={{ flex:1, padding:'4px 8px', fontSize:'var(--font-size-sm)' }} />
                                                <span style={{ fontSize:'var(--font-size-xs)', color:'var(--text-secondary)' }}>Daily limit ₹</span>
                                                <input className="form-input" type="number" value={cat.daily_limit} onChange={e => { const c=[...categories]; c[i]={...c[i],daily_limit:parseFloat(e.target.value)||0}; setCategories(c); }} style={{ width:'90px', padding:'4px 8px', fontSize:'var(--font-size-sm)' }} />
                                                <button className="btn-icon" onClick={() => setEditingCat(null)}><Check size={14} color="#10b981" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ flex:1, fontWeight:500, fontSize:'var(--font-size-sm)' }}>{cat.name}</span>
                                                <span style={{ fontSize:'var(--font-size-xs)', color:'var(--text-secondary)' }}>Daily limit: ₹{cat.daily_limit?.toLocaleString('en-IN') || 0}</span>
                                                <button className="btn-icon" onClick={() => setEditingCat(i)}><Edit2 size={14} /></button>
                                                <button className="btn-icon" onClick={() => handleDeleteCategory(i)}><Trash2 size={14} color="#ef4444" /></button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-primary)', flexWrap: 'wrap' }}>
                                <input className="form-input" placeholder="Category name" value={newCategory.name} onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))} style={{ flex: '1 1 120px', minWidth: '100px', padding: '6px 10px', fontSize: 'var(--font-size-sm)' }} />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Limit ₹</span>
                                <input className="form-input" type="number" placeholder="500" value={newCategory.daily_limit} onChange={e => setNewCategory(p => ({ ...p, daily_limit: e.target.value }))} style={{ width: '80px', padding: '6px 8px', fontSize: 'var(--font-size-sm)' }} />
                                <button className="btn btn-primary" onClick={handleAddCategory} style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', margin: 0 }}>Expense Requests &amp; Ledger</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Review technician claims and audit dynamic balance sheets</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                {/* Technician filter dropdown */}
                                <select 
                                    value={selectedTechFilter} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedTechFilter(val);
                                        if (!val) {
                                            setAdminExpenseViewMode('claims');
                                        }
                                    }} 
                                    className="form-select" 
                                    style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)', minWidth: '160px' }}
                                >
                                    <option value="">All Technicians</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                                    ))}
                                </select>

                                {/* Claims / Ledger Segment Toggle */}
                                {selectedTechFilter && (
                                    <div style={{ display: 'flex', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                        <button
                                            type="button"
                                            onClick={() => setAdminExpenseViewMode('claims')}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                backgroundColor: adminExpenseViewMode === 'claims' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                                color: adminExpenseViewMode === 'claims' ? '#fff' : 'var(--text-secondary)',
                                                fontWeight: 600
                                            }}
                                        >
                                            Claims List
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdminExpenseViewMode('ledger')}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                backgroundColor: adminExpenseViewMode === 'ledger' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                                color: adminExpenseViewMode === 'ledger' ? '#fff' : 'var(--text-secondary)',
                                                fontWeight: 600
                                            }}
                                        >
                                            Ledger Statement
                                        </button>
                                    </div>
                                )}

                                {/* Status filter (only relevant for Claims View) */}
                                {adminExpenseViewMode === 'claims' && (
                                    <select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} className="form-select" style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="all">All</option>
                                    </select>
                                )}

                                <button className="btn-icon" onClick={() => {
                                    if (adminExpenseViewMode === 'ledger') {
                                        fetchAdminLedger(selectedTechFilter);
                                    } else {
                                        fetchExpenses();
                                    }
                                }} title="Refresh">
                                    <RefreshCcw size={16} />
                                </button>
                            </div>
                        </div>

                        {adminExpenseViewMode === 'ledger' && selectedTechFilter ? (
                            adminLedgerLoading ? (
                                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ledger statement...</div>
                            ) : (
                                <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {/* Balance Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Approved Claims (Credit)</div>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>₹{adminLedgerData.summary.total_expenses.toLocaleString('en-IN')}</div>
                                        </div>
                                        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Received Payments (Debit)</div>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>₹{adminLedgerData.summary.total_payments.toLocaleString('en-IN')}</div>
                                        </div>
                                        <div style={{ 
                                            backgroundColor: 'var(--bg-secondary)', 
                                            border: '1px solid var(--border-primary)', 
                                            borderRadius: 'var(--radius-lg)', 
                                            padding: 'var(--spacing-md)', 
                                            textAlign: 'center',
                                            borderTop: `4px solid ${adminLedgerData.summary.balance > 0 ? '#10b981' : adminLedgerData.summary.balance < 0 ? '#ef4444' : 'var(--border-primary)'}`
                                        }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                {adminLedgerData.summary.balance > 0 ? 'Company owes Tech' : adminLedgerData.summary.balance < 0 ? 'Tech owes Company' : 'Settled Balance'}
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: adminLedgerData.summary.balance > 0 ? '#10b981' : adminLedgerData.summary.balance < 0 ? '#ef4444' : 'var(--text-primary)', marginTop: '4px' }}>
                                                ₹{Math.abs(adminLedgerData.summary.balance).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ledger Table */}
                                    <div className="admin-sticky-table-container" style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <table className="admin-sticky-table" style={{ minWidth: '850px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                                                    <th style={{ textAlign: 'left' }}>Date</th>
                                                    <th style={{ textAlign: 'left' }}>Type</th>
                                                    <th style={{ textAlign: 'left' }}>Reference</th>
                                                    <th style={{ textAlign: 'left' }}>Description</th>
                                                    <th style={{ textAlign: 'right' }}>Debit (Paid)</th>
                                                    <th style={{ textAlign: 'right' }}>Credit (Claimed)</th>
                                                    <th style={{ textAlign: 'right' }}>Running Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adminLedgerData.ledger.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            No transactions posted to this technician's ledger yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    adminLedgerData.ledger.map((entry) => (
                                                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                                {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <span style={{ 
                                                                    padding: '2px 6px', 
                                                                    borderRadius: 'var(--radius-sm)', 
                                                                    fontSize: '10px', 
                                                                    fontWeight: 700,
                                                                    backgroundColor: entry.type === 'Expense' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                                    color: entry.type === 'Expense' ? '#10b981' : '#3b82f6',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {entry.type}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', fontWeight: 600, textTransform: 'capitalize' }}>
                                                                {entry.reference}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                                                                {entry.description}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                                                                {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                                                                {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: entry.balance > 0 ? '#10b981' : entry.balance < 0 ? '#ef4444' : 'var(--text-primary)' }}>
                                                                ₹{entry.balance.toLocaleString('en-IN')}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        ) : (
                            expensesLoading ? (
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
                                                            {['mopid-petrol', 'bike-petrol'].includes(exp.category) && (
                                                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                                                    🚲 {((parseFloat(exp.amount || 0) / 100) * (exp.category === 'mopid-petrol' ? 35 : 45)).toFixed(1)} Kms
                                                                </span>
                                                            )}
                                                            {['mopid-petrol', 'bike-petrol'].includes(exp.category) && exp.latitude && exp.longitude && (
                                                                <a 
                                                                    href={`https://www.google.com/maps?q=${exp.latitude},${exp.longitude}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                                                >
                                                                    📍 Location
                                                                </a>
                                                            )}
                                                            {statusBadge(exp.status)}
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                                {new Date(exp.created_at || exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(exp.created_at || exp.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </span>
                                                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                                By: {exp.technician?.name || 'Unknown Technician'}
                                                            </span>
                                                        </div>
                                                        {exp.description && <div style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>{exp.description}</div>}
                                                        {exp.receipt && (
                                                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Camera size={12} /> Receipt Attachment:
                                                                </div>
                                                                <a href={exp.receipt} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                                                    <img 
                                                                        src={exp.receipt} 
                                                                        alt="Receipt Preview" 
                                                                        style={{ 
                                                                            maxHeight: '60px', 
                                                                            borderRadius: 'var(--radius-md)', 
                                                                            border: '1px solid var(--border-primary)', 
                                                                            cursor: 'pointer',
                                                                            backgroundColor: '#fff',
                                                                            padding: '2px'
                                                                        }} 
                                                                    />
                                                                </a>
                                                            </div>
                                                        )}
                                                        {exp.payment_voucher && (
                                                            <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                                                                <span>💳 Paid via {exp.payment_voucher.payment_number} (₹{parseFloat(exp.payment_voucher.amount || 0).toLocaleString('en-IN')})</span>
                                                            </div>
                                                        )}
                                                        {exp.purchase_invoice && (
                                                            <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>
                                                                <span>📄 Posted via purchase invoice {exp.purchase_invoice.invoice_number || `PUR-${exp.purchase_invoice.id.slice(0,8)}`} (₹{parseFloat(exp.purchase_invoice.total_amount || 0).toLocaleString('en-IN')})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-md)', flexShrink: 0 }}>
                                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>₹{parseFloat(exp.amount).toLocaleString('en-IN')}</div>
                                                    </div>
                                                </div>
                                                {exp.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginTop: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                                        <input className="form-input" placeholder="Admin note (optional for rejection)" value={reviewNotes[exp.id] || ''} onChange={e => setReviewNotes(p => ({ ...p, [exp.id]: e.target.value }))} style={{ flex: '1 1 200px', minWidth: '150px', padding: '6px 10px', fontSize: 'var(--font-size-xs)' }} />
                                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                                                            <button onClick={() => handleApproveExpenseDirectly(exp)} style={{ flex: isMobile ? 1 : 'none', padding: '6px 14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                <Check size={14} /> Approve &amp; Post to Ledger
                                                            </button>
                                                            <button onClick={() => handleReviewExpense(exp, 'rejected')} style={{ flex: isMobile ? 1 : 'none', padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                <X size={14} /> Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ──────────────── SPARES PURCHASES TAB ──────────────── */}
            {activeTab === 'spares' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', margin: 0 }}>⚙️ Technician Spares Purchases</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Review and approve technician spares purchases, allocate suppliers, and log payments</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <select value={sparesFilter} onChange={e => setSparesFilter(e.target.value)} className="form-select" style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}>
                                    <option value="pending">Pending Review</option>
                                    <option value="posted">Posted (Finalized)</option>
                                    <option value="all">All Purchases</option>
                                </select>
                                <button className="btn-icon" onClick={fetchSpares} title="Refresh"><RefreshCcw size={16} /></button>
                            </div>
                        </div>
                        {sparesLoading ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading spares purchases...</div>
                        ) : spares.filter(s => sparesFilter === 'pending' ? s.status === 'draft' : sparesFilter === 'posted' ? s.status === 'finalized' : true).length === 0 ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Package size={40} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.3 }} />
                                <div>No {sparesFilter === 'all' ? '' : sparesFilter === 'pending' ? 'pending' : 'posted'} spares purchases found</div>
                            </div>
                        ) : (
                            <div className="admin-sticky-table-container">
                                <table className="admin-sticky-table" style={{ minWidth: '1050px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                                            <th style={{ textAlign: 'left' }}>Date</th>
                                            <th style={{ textAlign: 'left' }}>Technician</th>
                                            <th style={{ textAlign: 'left' }}>Shop/Vendor</th>
                                            <th style={{ textAlign: 'left' }}>Invoice Details</th>
                                            <th style={{ textAlign: 'right' }}>Total Amount</th>
                                            <th style={{ textAlign: 'right' }}>Paid / Balance</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'center' }}>Handed to SC</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {spares.filter(s => sparesFilter === 'pending' ? s.status === 'draft' : sparesFilter === 'posted' ? s.status === 'finalized' : true).map((item) => {
                                            const techName = technicians.find(t => t.id === item.po_reference)?.name || 'Field Tech';
                                            const balance = parseFloat(item.total_amount || 0) - parseFloat(item.paid_amount || 0);
                                            const isPending = item.status === 'draft';
                                            
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background-color 0.15s' }}>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                                         <div>{new Date(item.created_at || item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div><div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{new Date(item.created_at || item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', fontWeight: 600 }}>
                                                        {techName}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                                        <div>{item.account_name}</div>
                                                        {item.vendor_invoice_number && (
                                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                                Doc Ref: {item.vendor_invoice_number}
                                                            </div>
                                                        )}
                                                        {item.notes && (
                                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                                                                {item.notes}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                                        {item.items && item.items.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {item.items.map((it, idx) => (
                                                                    <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                        • <strong>{it.description}</strong> (Qty: {it.qty} × ₹{parseFloat(it.rate || 0).toLocaleString('en-IN')})
                                                                    </div>
                                                                 ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No items</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', fontWeight: 700 }}>
                                                        ₹{parseFloat(item.total_amount || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                                                        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Paid: ₹{parseFloat(item.paid_amount || 0).toLocaleString('en-IN')}</div>
                                                        <div style={{ fontSize: 12, color: balance > 0 ? '#ef4444' : '#10b981', fontWeight: 700, marginTop: 2 }}>
                                                            Bal: ₹{balance.toLocaleString('en-IN')}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                                            backgroundColor: isPending ? '#fef3c7' : '#d1fae5',
                                                            color: isPending ? '#d97706' : '#059669'
                                                        }}>
                                                            {isPending ? 'Pending Audit' : 'Posted'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={!!item.handed_to_service_center}
                                                            onChange={(e) => handleToggleHandover(item, e.target.checked)}
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                                                        {isPending ? (
                                                            <button
                                                                onClick={() => setEditingPurchase(item)}
                                                                className="btn btn-primary"
                                                                style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', minHeight: '28px', backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                                                            >
                                                                Review &amp; Post
                                                            </button>
                                                        ) : balance > 0 ? (
                                                            <button
                                                                onClick={() => setPayingSparesInvoice(item)}
                                                                className="btn btn-primary"
                                                                style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', minHeight: '28px', backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }}
                                                            >
                                                                {item.paid_by === 'technician' ? 'Pay Technician' : 'Pay Supplier'}
                                                            </button>
                                                        ) : (
                                                            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Settled</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ──────────────── LEAVE REQUESTS TAB ──────────────── */}
            {activeTab === 'leaves' && (
                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Calendar size={18} color="var(--color-primary)" /> Leave Requests
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Review and approve/reject technician leave schedules.</p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Technician Filter */}
                            <select
                                value={selectedTechFilter}
                                onChange={e => setSelectedTechFilter(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                            >
                                <option value="">All Technicians</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={leavesFilter}
                                onChange={e => setLeavesFilter(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>

                            {/* Refresh Button */}
                            <button onClick={fetchLeaves} disabled={leavesLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                <RefreshCcw size={14} style={{ animation: leavesLoading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
                            </button>
                        </div>
                    </div>

                    {leavesLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading leaves...</div>
                    ) : leaves.filter(l => {
                        const matchesTech = selectedTechFilter ? l.technician_id === selectedTechFilter : true;
                        const matchesStatus = leavesFilter === 'all' ? true : l.status === leavesFilter;
                        return matchesTech && matchesStatus;
                    }).length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-primary)', borderRadius: 10 }}>No leave requests found.</div>
                    ) : (
                        <div className="admin-sticky-table-container">
                            <table className="admin-sticky-table" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                                        <th style={{ textAlign: 'left' }}>Technician</th>
                                        <th style={{ textAlign: 'left' }}>Leave Date</th>
                                        <th style={{ textAlign: 'left' }}>Reason</th>
                                        <th style={{ textAlign: 'left' }}>Applied On</th>
                                        <th style={{ textAlign: 'left' }}>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves.filter(l => {
                                        const matchesTech = selectedTechFilter ? l.technician_id === selectedTechFilter : true;
                                        const matchesStatus = leavesFilter === 'all' ? true : l.status === leavesFilter;
                                        return matchesTech && matchesStatus;
                                    }).map(l => {
                                        const appliedDate = new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        const leaveDateFormatted = new Date(l.leave_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                                        
                                        return (
                                            <tr key={l.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{l.technician_name}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{leaveDateFormatted}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{l.reason || '-'}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 11 }}>{appliedDate}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 12,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        backgroundColor: l.status === 'approved' ? 'rgba(16,185,129,0.1)' : (l.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'),
                                                        color: l.status === 'approved' ? '#10b981' : (l.status === 'rejected' ? '#ef4444' : '#f59e0b')
                                                    }}>
                                                        {l.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    {l.status === 'pending' ? (
                                                        <div style={{ display: 'inline-flex', gap: 8 }}>
                                                            <button
                                                                onClick={() => handleUpdateLeaveStatus(l.id, 'approved')}
                                                                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateLeaveStatus(l.id, 'rejected')}
                                                                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Resolved</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }).reverse()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ──────────────── FLEET MAP TAB ──────────────── */}
            {activeTab === 'livefleet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Live Technician Fleet</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Real-time locations of all technicians currently on in-progress jobs.</p>
                        </div>
                    </div>
                    <TechnicianLiveMap activeJobs={activeJobs} />
                </div>
            )}

            {payingExpense && (
                <PaymentVoucherForm
                    onClose={() => setPayingExpense(null)}
                    onSave={handleSavePaymentVoucher}
                    accountType="expense"
                    existingPayment={{
                        account_id: getPrefilledAccount(payingExpense)?.id || '',
                        account_name: getPrefilledAccount(payingExpense)?.name || '',
                        amount: payingExpense.amount,
                        notes: getPrefilledNarration(payingExpense),
                        date: new Date().toISOString().split('T')[0]
                    }}
                />
            )}

            {editingPurchase && (
                <PurchaseInvoiceForm
                    onClose={() => setEditingPurchase(null)}
                    onSave={handleSaveSparesInvoice}
                    existingInvoice={editingPurchase}
                />
            )}

            {payingSparesInvoice && (
                <PaymentVoucherForm
                    onClose={() => setPayingSparesInvoice(null)}
                    onSave={handleSaveSparesPaymentVoucher}
                    accountType={payingSparesInvoice.paid_by === 'technician' ? 'technician' : 'vendor'}
                    existingPayment={{
                        account_id: payingSparesInvoice.paid_by === 'technician'
                            ? (technicians.find(t => t.id === payingSparesInvoice.po_reference)?.ledger_id || '')
                            : (payingSparesInvoice.account_id || ''),
                        account_name: payingSparesInvoice.paid_by === 'technician'
                            ? (technicians.find(t => t.id === payingSparesInvoice.po_reference)?.name || '')
                            : (payingSparesInvoice.account_name || ''),
                        amount: (parseFloat(payingSparesInvoice.total_amount || 0) - parseFloat(payingSparesInvoice.paid_amount || 0)).toString(),
                        notes: payingSparesInvoice.paid_by === 'technician'
                            ? `Reimbursement to technician for spares purchase ${payingSparesInvoice.invoice_number || payingSparesInvoice.vendor_invoice_number || payingSparesInvoice.id}`
                            : `Payment to supplier for spares purchase invoice ${payingSparesInvoice.invoice_number || payingSparesInvoice.vendor_invoice_number || payingSparesInvoice.id}`,
                        date: new Date().toISOString().split('T')[0],
                        allocations: [
                            {
                                invoice_id: payingSparesInvoice.id,
                                invoice_ref: payingSparesInvoice.invoice_number || payingSparesInvoice.vendor_invoice_number || `PUR-${payingSparesInvoice.id?.slice(0,8)}`,
                                invoice_total: parseFloat(payingSparesInvoice.total_amount || 0),
                                invoice_balance: parseFloat(payingSparesInvoice.total_amount || 0) - parseFloat(payingSparesInvoice.paid_amount || 0),
                                amount_applied: parseFloat(payingSparesInvoice.total_amount || 0) - parseFloat(payingSparesInvoice.paid_amount || 0),
                            }
                        ]
                    }}
                />
            )}

            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );
}

export default TechnicianManagement;
