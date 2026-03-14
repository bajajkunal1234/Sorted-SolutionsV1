'use client'

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, RefreshCcw, Receipt, CheckCircle, AlertCircle, Search, Printer, FileText } from 'lucide-react';
import { accountsAPI, accountGroupsAPI, rentalsAPI, transactionsAPI } from '@/lib/adminAPI';
import NewAccountForm from '@/app/admin/components/accounts/NewAccountForm';
import PrintAgreementModal from './PrintAgreementModal';
import SetupInvoiceModal from './SetupInvoiceModal';

// ─── Receipt Picker Modal ────────────────────────────────────────────────────
function ReceiptPickerModal({ customerId, expectedAmount, onSelect, onClose }) {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await transactionsAPI.getAll({ type: 'receipt', account_id: customerId });
                setReceipts(data || []);
            } catch (err) {
                console.error('Failed to load receipts:', err);
            } finally {
                setLoading(false);
            }
        };
        if (customerId) load();
    }, [customerId]);

    const filtered = receipts.filter(r => {
        const term = search.toLowerCase();
        return (
            !term ||
            (r.reference || '').toLowerCase().includes(term) ||
            (r.description || '').toLowerCase().includes(term) ||
            String(r.amount || '').includes(term)
        );
    });

    const fmtAmount = (n) => `₹${Number(n || 0).toLocaleString()}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Link Receipt Voucher</h3>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)' }}>
                    <div style={{
                        padding: '10px 14px', backgroundColor: expectedAmount > 0 ? '#6366f110' : 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                        fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px'
                    }}>
                        {expectedAmount > 0
                            ? <>Select the receipt voucher for <strong style={{ color: 'var(--text-primary)' }}>{fmtAmount(expectedAmount)}</strong>. Only matching amounts are highlighted.</>
                            : 'Select a receipt voucher to link.'}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            className="form-input"
                            style={{ paddingLeft: 32, fontSize: 13 }}
                            placeholder="Search by reference, description, amount..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div style={{ padding: '12px 20px', maxHeight: '380px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                            <RefreshCcw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                            <p>Loading receipts...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                            <Receipt size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <p>{receipts.length === 0 ? 'No receipt vouchers found for this customer.' : 'No receipts match your search.'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {filtered.map(r => {
                                const amtMatch = expectedAmount > 0 && Number(r.amount) === Number(expectedAmount);
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => onSelect(r)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 14px', border: `2px solid ${amtMatch ? '#10b981' : 'var(--border-primary)'}`,
                                            borderRadius: 'var(--radius-md)', backgroundColor: amtMatch ? '#10b98108' : 'var(--bg-secondary)',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                                                {r.reference || r.voucher_number || `Receipt #${r.id}`}
                                                {amtMatch && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ AMOUNT MATCHES</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {fmtDate(r.date)}{r.description ? ` · ${r.description}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: amtMatch ? '#10b981' : 'var(--text-primary)', flexShrink: 0, marginLeft: 16 }}>
                                            {fmtAmount(r.amount)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ─── Linked Receipt Badge ────────────────────────────────────────────────────
function LinkedReceiptBadge({ receipt, enteredAmount, onUnlink }) {
    const amtMatch = Number(receipt.amount) === Number(enteredAmount);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            backgroundColor: amtMatch ? '#10b98110' : '#f59e0b10',
            border: `1px solid ${amtMatch ? '#10b98140' : '#f59e0b40'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {amtMatch
                    ? <CheckCircle size={14} color="#10b981" />
                    : <AlertCircle size={14} color="#f59e0b" />}
                <span style={{ fontSize: 12, fontWeight: 600, color: amtMatch ? '#10b981' : '#f59e0b' }}>
                    {receipt.reference || `Receipt #${receipt.id}`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    ₹{Number(receipt.amount).toLocaleString()}
                    {!amtMatch && ` (entered ₹${Number(enteredAmount).toLocaleString()} — mismatch)`}
                </span>
            </div>
            <button type="button" onClick={onUnlink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                <X size={14} />
            </button>
        </div>
    );
}

// ─── Main Form ───────────────────────────────────────────────────────────────
function NewRentalForm({ plans = [], onClose, onSave }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [customerReceipts, setCustomerReceipts] = useState([]);
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);

    // Receipt picker state
    const [showDepositPicker, setShowDepositPicker] = useState(false);
    const [showAdvancePicker, setShowAdvancePicker] = useState(false);
    const [depositReceipt, setDepositReceipt] = useState(null);
    const [advanceReceipt, setAdvanceReceipt] = useState(null);

    // Post-creation success state
    const [successData, setSuccessData] = useState(null);
    const [showPrintAgreement, setShowPrintAgreement] = useState(false);
    const [showPrintInvoice, setShowPrintInvoice] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        property: null,
        planId: '',
        selectedTenure: null,
        serialNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        depositAmount: 0,
        rentAdvance: 0,
        notes: ''
    });

    const fetchCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await accountsAPI.getAll();
            setCustomers(data || []);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
        accountGroupsAPI.getAll().then(data => setGroups(data || [])).catch(() => {});
    }, [fetchCustomers]);

    // Load customer receipts when customer changes
    const handleCustomerChange = async (id) => {
        setFormData(prev => ({ ...prev, customerId: id, property: null }));
        setDepositReceipt(null);
        setAdvanceReceipt(null);
        setCustomerReceipts([]);
        if (!id) return;
        try {
            const data = await transactionsAPI.getAll({ type: 'receipt', account_id: id });
            setCustomerReceipts(data || []);
        } catch (err) {
            console.error('Failed to load customer receipts:', err);
        }
    };

    // Auto-link: find first unlinked receipt matching the amount for this customer
    const autoLink = useCallback((amount, excludeId) => {
        if (!amount || amount <= 0 || !customerReceipts.length) return null;
        return customerReceipts.find(r =>
            Number(r.amount) === Number(amount) &&
            String(r.id) !== String(excludeId)
        ) || null;
    }, [customerReceipts]);

    const handleDepositChange = (val) => {
        const amount = parseInt(val) || 0;
        setFormData(prev => ({ ...prev, depositAmount: amount }));
        const match = autoLink(amount, advanceReceipt?.id);
        setDepositReceipt(match);
    };

    const handleAdvanceChange = (val) => {
        const amount = parseInt(val) || 0;
        setFormData(prev => ({ ...prev, rentAdvance: amount }));
        const match = autoLink(amount, depositReceipt?.id);
        setAdvanceReceipt(match);
    };

    const customersGroupId = groups.find(g =>
        g.name?.toLowerCase().includes('customer') &&
        (g.parent_name?.toLowerCase().includes('sundry') || g.nature === 'asset')
    )?.id || groups.find(g => g.name?.toLowerCase() === 'customers')?.id || '';

    const selectedPlan = plans.find(p => p.id === formData.planId);

    // Amount matching checks (informational only — not blocking)
    const depositOk = formData.depositAmount <= 0 || !depositReceipt || Number(depositReceipt.amount) === Number(formData.depositAmount);
    const advanceOk = formData.rentAdvance <= 0 || !advanceReceipt || Number(advanceReceipt.amount) === Number(formData.rentAdvance);
    const canSubmit = true; // Receipt linking is optional

    const handleNewAccountSave = async (accountData) => {
        try {
            const newAccount = await accountsAPI.create(accountData);
            if (newAccount?.id) {
                await fetchCustomers();
                setFormData(prev => ({ ...prev, customerId: String(newAccount.id) }));
            }
        } catch (err) {
            alert('Failed to create account: ' + err.message);
        }
        setShowNewAccountForm(false);
    };

    const calculateEndDate = (startDate, duration, unit) => {
        const date = new Date(startDate);
        if (unit.includes('month')) date.setMonth(date.getMonth() + duration);
        else if (unit.includes('year')) date.setFullYear(date.getFullYear() + duration);
        return date.toISOString().split('T')[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.selectedTenure) { alert('Please select a tenure option'); return; }
        if (!canSubmit) { alert('Please link receipt vouchers that match the entered amounts.'); return; }

        try {
            const result = await onSave({
                ...formData,
                customerName: customers.find(c => String(c.id) === String(formData.customerId))?.name,
                productName: selectedPlan?.product_name,
                monthlyRent: formData.selectedTenure.monthlyRent,
                securityDeposit: formData.selectedTenure.securityDeposit,
                setupFee: formData.selectedTenure.setupFee,
                depositPaid: formData.depositAmount >= formData.selectedTenure.securityDeposit,
                depositReceiptId: depositReceipt?.id || null,
                advanceReceiptId: advanceReceipt?.id || null,
                tenure: {
                    duration: formData.selectedTenure.duration,
                    unit: formData.selectedTenure.unit,
                    startDate: formData.startDate,
                    endDate: calculateEndDate(formData.startDate, formData.selectedTenure.duration, formData.selectedTenure.unit)
                }
            });

            if (result) {
                setSuccessData(result);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const update = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                    
                    {successData ? (
                        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <CheckCircle color="#10b981" size={64} style={{ marginBottom: 'var(--spacing-md)' }} />
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                Rental Created Successfully!
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: '400px' }}>
                                The rental agreement for <strong>{successData.customerName || successData.accounts?.name || 'Customer'}</strong> has been activated in the system.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', width: '100%', maxWidth: '300px' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPrintAgreement(true)} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <Printer size={18} />
                                    Print Agreement PDF
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPrintInvoice(true)} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <FileText size={18} />
                                    Generate Setup Invoice
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={onClose} 
                                    style={{ marginTop: 'var(--spacing-md)', padding: '12px' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="modal-header" style={{ flexShrink: 0 }}>
                                <h2 className="modal-title">New Rental Agreement</h2>
                                <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        {/* Scrollable body */}
                        <div className="modal-content" style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>

                            {/* Customer */}
                            <div className="form-group">
                                <label className="form-label">Customer *</label>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <select className="form-select" value={formData.customerId}
                                        onChange={e => handleCustomerChange(e.target.value)} required style={{ flex: 1 }}>
                                        <option value="">{loading ? 'Loading...' : 'Select Customer'}</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.phone || c.mobile || 'No phone'})</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-secondary"
                                        onClick={() => setShowNewAccountForm(true)} disabled={loading}>
                                        {loading ? <RefreshCcw size={16} className="spin" /> : <Plus size={16} />}
                                        New Customer
                                    </button>
                                </div>
                            </div>

                            {/* Property */}
                            {formData.customerId && (() => {
                                const sel = customers.find(c => String(c.id) === String(formData.customerId));
                                const props = sel?.properties || [];
                                if (!props.length) return null;
                                return (
                                    <div className="form-group">
                                        <label className="form-label">Delivery Property/Location</label>
                                        <select className="form-select"
                                            value={formData.property ? String(formData.property.id) : ''}
                                            onChange={e => {
                                                const found = props.find(p => String(p.id) === String(e.target.value));
                                                setFormData(prev => ({ ...prev, property: found || null }));
                                            }}>
                                            <option value="">Select property...</option>
                                            {props.map(p => {
                                                const parts = [];
                                                if (p.flat_number) parts.push(p.flat_number);
                                                if (p.building_name) parts.push(p.building_name);
                                                const prefix = parts.length > 0 ? parts.join(', ') + ' - ' : '';
                                                return <option key={p.id} value={String(p.id)}>{prefix}{p.label || p.address || p.name || `Property ${p.id}`}</option>;
                                            })}
                                        </select>
                                    </div>
                                );
                            })()}

                            {/* Rental Plan */}
                            <div className="form-group">
                                <label className="form-label">Rental Plan *</label>
                                <select className="form-select" value={formData.planId}
                                    onChange={e => update('planId', e.target.value) || update('selectedTenure', null)} required>
                                    <option value="">Select Rental Plan</option>
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                </select>
                            </div>

                            {/* Tenure Options */}
                            {selectedPlan && Array.isArray(selectedPlan.tenure_options) && (
                                <div className="form-group">
                                    <label className="form-label">Select Tenure *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                        {selectedPlan.tenure_options.map((t, i) => (
                                            <div key={i} onClick={() => update('selectedTenure', t)} style={{
                                                padding: 'var(--spacing-md)',
                                                border: `2px solid ${formData.selectedTenure === t ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                                backgroundColor: formData.selectedTenure === t ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)',
                                                transition: 'all 0.15s'
                                            }}>
                                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 4 }}>{t.duration} {t.unit}</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>Rent: <strong>₹{t.monthlyRent}/mo</strong></div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Deposit: ₹{t.securityDeposit}</div>
                                                {t.setupFee > 0 && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Setup: ₹{t.setupFee}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Serial Number */}
                            <div className="form-group">
                                <label className="form-label">Serial Number</label>
                                <input type="text" className="form-input" value={formData.serialNumber}
                                    onChange={e => update('serialNumber', e.target.value)} placeholder="Enter product serial number" />
                            </div>

                            {/* Start Date */}
                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input type="date" className="form-input" value={formData.startDate}
                                    onChange={e => update('startDate', e.target.value)} required />
                            </div>

                            {/* Security Deposit + Receipt */}
                            <div className="form-group">
                                <label className="form-label">Security Deposit Collected (₹)</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="number" className="form-input" value={formData.depositAmount} min="0"
                                        onChange={e => handleDepositChange(e.target.value)}
                                        placeholder="0" style={{ flex: 1 }} />
                                    {formData.depositAmount > 0 && formData.customerId && (
                                        <button type="button" className="btn btn-secondary"
                                            onClick={() => setShowDepositPicker(true)}
                                            style={{ whiteSpace: 'nowrap', borderColor: depositReceipt ? (depositOk ? '#10b981' : '#f59e0b') : undefined }}>
                                            <Receipt size={14} style={{ marginRight: 4 }} />
                                            {depositReceipt ? 'Change' : 'Link Receipt'}
                                        </button>
                                    )}
                                </div>
                                {formData.selectedTenure && formData.depositAmount < formData.selectedTenure.securityDeposit && formData.depositAmount > 0 && (
                                    <span style={{ fontSize: 12, color: '#f59e0b' }}>
                                        Pending: ₹{(formData.selectedTenure.securityDeposit - formData.depositAmount).toLocaleString()}
                                    </span>
                                )}
                                {depositReceipt && (
                                    <LinkedReceiptBadge receipt={depositReceipt} enteredAmount={formData.depositAmount}
                                        onUnlink={() => setDepositReceipt(null)} />
                                )}
                                {formData.depositAmount > 0 && !depositReceipt && (
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        ⓘ No matching receipt auto-linked. You can link one manually or skip.
                                    </div>
                                )}
                            </div>

                            {/* Rent Advance + Receipt */}
                            <div className="form-group">
                                <label className="form-label">Rent Advance Taken (₹)</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="number" className="form-input" value={formData.rentAdvance} min="0"
                                        onChange={e => handleAdvanceChange(e.target.value)}
                                        placeholder="0" style={{ flex: 1 }} />
                                    {formData.rentAdvance > 0 && formData.customerId && (
                                        <button type="button" className="btn btn-secondary"
                                            onClick={() => setShowAdvancePicker(true)}
                                            style={{ whiteSpace: 'nowrap', borderColor: advanceReceipt ? (advanceOk ? '#10b981' : '#f59e0b') : undefined }}>
                                            <Receipt size={14} style={{ marginRight: 4 }} />
                                            {advanceReceipt ? 'Change' : 'Link Receipt'}
                                        </button>
                                    )}
                                </div>
                                {formData.selectedTenure && formData.rentAdvance > 0 && (
                                    <span style={{ fontSize: 12, color: '#10b981' }}>
                                        Covers {Math.floor(formData.rentAdvance / formData.selectedTenure.monthlyRent)} month(s) advance
                                    </span>
                                )}
                                {advanceReceipt && (
                                    <LinkedReceiptBadge receipt={advanceReceipt} enteredAmount={formData.rentAdvance}
                                        onUnlink={() => setAdvanceReceipt(null)} />
                                )}
                                {formData.rentAdvance > 0 && !advanceReceipt && (
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        ⓘ No matching receipt auto-linked. You can link one manually or skip.
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" value={formData.notes}
                                    onChange={e => update('notes', e.target.value)} rows="3"
                                    placeholder="Any special instructions or notes..." />
                            </div>

                            {/* Summary */}
                            {formData.selectedTenure && (
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Rental Summary</h4>
                                    <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                                        <div>Monthly Rent: <strong>₹{formData.selectedTenure.monthlyRent}</strong></div>
                                        <div>Security Deposit: <strong>₹{formData.selectedTenure.securityDeposit}</strong></div>
                                        {formData.selectedTenure.setupFee > 0 && <div>Setup Fee: <strong>₹{formData.selectedTenure.setupFee}</strong></div>}
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-primary)' }}>
                                            Deposit Collected: <strong>₹{formData.depositAmount.toLocaleString()}</strong>
                                            {depositReceipt && <span style={{ marginLeft: 8, fontSize: 11, color: depositOk ? '#10b981' : '#f59e0b' }}>{depositOk ? '✓ Verified' : '⚠ Mismatch'}</span>}
                                        </div>
                                        {formData.rentAdvance > 0 && (
                                            <div>Rent Advance: <strong>₹{formData.rentAdvance.toLocaleString()}</strong>
                                                {advanceReceipt && <span style={{ marginLeft: 8, fontSize: 11, color: advanceOk ? '#10b981' : '#f59e0b' }}>{advanceOk ? '✓ Verified' : '⚠ Mismatch'}</span>}
                                            </div>
                                        )}
                                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                            Total Collected: <strong>₹{(formData.depositAmount + formData.rentAdvance).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer — always visible */}
                        <div className="modal-footer" style={{ flexShrink: 0 }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Create Rental</button>
                        </div>
                    </form>
                        </>
                    )}
                </div>
            </div>

            {/* Print Modals that render OVER the current modal */}
            {showPrintAgreement && (
                <PrintAgreementModal 
                    type="rental" 
                    data={successData} 
                    onClose={() => setShowPrintAgreement(false)} 
                />
            )}
            
            {showPrintInvoice && (
                <SetupInvoiceModal 
                    type="rental" 
                    data={successData} 
                    onClose={() => setShowPrintInvoice(false)} 
                />
            )}

            {/* New Customer Form */}
            {showNewAccountForm && (
                <NewAccountForm
                    onClose={() => setShowNewAccountForm(false)}
                    onSave={handleNewAccountSave}
                    preselectedType={customersGroupId}
                    initialData={customersGroupId ? { under: customersGroupId } : {}}
                    groups={groups}
                    onGroupCreated={g => setGroups(prev => [...prev, g])}
                />
            )}

            {/* Deposit Receipt Picker */}
            {showDepositPicker && (
                <ReceiptPickerModal
                    customerId={formData.customerId}
                    expectedAmount={formData.depositAmount}
                    onSelect={r => { setDepositReceipt(r); setShowDepositPicker(false); }}
                    onClose={() => setShowDepositPicker(false)}
                />
            )}

            {/* Advance Receipt Picker */}
            {showAdvancePicker && (
                <ReceiptPickerModal
                    customerId={formData.customerId}
                    expectedAmount={formData.rentAdvance}
                    onSelect={r => { setAdvanceReceipt(r); setShowAdvancePicker(false); }}
                    onClose={() => setShowAdvancePicker(false)}
                />
            )}
        </>
    );
}

export default NewRentalForm;
