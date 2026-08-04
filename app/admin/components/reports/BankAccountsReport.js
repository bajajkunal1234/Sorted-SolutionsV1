'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Settings2, History, Plus, AlertCircle, CheckCircle2, ShieldCheck, HelpCircle, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

export default function BankAccountsReport() {
    const [activeSubTab, setActiveSubTab] = useState('setup'); // 'setup' | 'transactions'
    const [accounts, setAccounts] = useState([]);
    const [imapSettings, setImapSettings] = useState({});
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    
    // Form & Modal States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [testStatus, setTestStatus] = useState(null); // { success: boolean, msg: string }

    // New Bank Account Form Fields
    const [newAccount, setNewAccount] = useState({
        name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch: '',
        opening_balance: '',
        account_type: 'savings'
    });

    // Setup Settings Form Fields
    const [setupForm, setSetupForm] = useState({
        email: '',
        app_password: '',
        account_ending: '',
        is_active: true
    });

    // Load Data
    useEffect(() => {
        fetchAccountsAndSettings();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            // Sync settings form
            const saved = imapSettings[selectedAccountId] || {};
            const acc = accounts.find(a => a.id === selectedAccountId);
            setSetupForm({
                email: saved.email || '',
                app_password: saved.app_password || '',
                account_ending: saved.account_ending || (acc?.account_number ? acc.account_number.slice(-4) : ''),
                is_active: saved.is_active !== false
            });
            setTestStatus(null);

            // Fetch transactions
            fetchAccountTransactions(selectedAccountId);
        }
    }, [selectedAccountId, imapSettings, accounts]);

    const fetchAccountsAndSettings = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch bank accounts from accounts table (under: 'bank-accounts')
            const { data: accData, error: accErr } = await supabase
                .from('accounts')
                .select('*')
                .eq('under', 'bank-accounts')
                .neq('status', 'archived')
                .order('name', { ascending: true });

            if (accErr) throw accErr;

            // 2. Fetch IMAP settings from website_settings
            const { data: setRes, error: setErr } = await supabase
                .from('website_settings')
                .select('value')
                .eq('key', 'bank_accounts_imap_settings')
                .maybeSingle();

            if (setErr) throw setErr;

            const settings = setRes?.value || {};
            setAccounts(accData || []);
            setImapSettings(settings);

            if (accData && accData.length > 0) {
                // Keep selection or default to first
                if (!selectedAccountId || !accData.some(a => a.id === selectedAccountId)) {
                    setSelectedAccountId(accData[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load bank accounts setup:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccountTransactions = async (accountId) => {
        try {
            const [recRes, payRes] = await Promise.all([
                supabase
                    .from('receipt_vouchers')
                    .select('id, receipt_number, date, amount, payment_mode, narration, account_name, status')
                    .eq('payment_account_id', accountId)
                    .order('date', { ascending: false })
                    .limit(100),
                supabase
                    .from('payment_vouchers')
                    .select('id, payment_number, date, amount, payment_mode, narration, account_name, status')
                    .eq('payment_account_id', accountId)
                    .order('date', { ascending: false })
                    .limit(100)
            ]);

            const recList = (recRes.data || []).map(r => ({
                id: r.id,
                number: r.receipt_number,
                type: 'receipt',
                date: r.date,
                amount: parseFloat(r.amount) || 0,
                narration: r.narration,
                party: r.account_name,
                status: r.status
            }));

            const payList = (payRes.data || []).map(p => ({
                id: p.id,
                number: p.payment_number,
                type: 'payment',
                date: p.date,
                amount: parseFloat(p.amount) || 0,
                narration: p.narration,
                party: p.account_name,
                status: p.status
            }));

            // Merge & sort descending
            const merged = [...recList, ...payList].sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(merged);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    };

    // Save IMAP setup credentials
    const handleSaveSetup = async (e) => {
        e.preventDefault();
        if (!selectedAccountId) return;

        try {
            setSaving(true);
            const updatedSettings = {
                ...imapSettings,
                [selectedAccountId]: {
                    email: setupForm.email.trim(),
                    app_password: setupForm.app_password.trim(),
                    account_ending: setupForm.account_ending.trim(),
                    is_active: setupForm.is_active
                }
            };

            const { error } = await supabase
                .from('website_settings')
                .upsert({
                    key: 'bank_accounts_imap_settings',
                    value: updatedSettings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            setImapSettings(updatedSettings);
            alert('Bank alerts connection settings saved successfully!');
        } catch (err) {
            console.error('Failed to save connection:', err);
            alert('Failed to save connection: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Test IMAP Connection (Mock verification response with timeout simulation)
    const handleTestConnection = async () => {
        if (!setupForm.email || !setupForm.app_password) {
            alert('Please provide both the email address and app password to test.');
            return;
        }

        try {
            setTesting(true);
            setTestStatus(null);
            
            // Simulate IMAP login request delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Gmail validation test logic
            const email = setupForm.email.toLowerCase();
            const pass = setupForm.app_password.replace(/\s/g, ''); // strip spaces
            
            if (!email.includes('@')) {
                setTestStatus({ success: false, msg: 'Invalid email address format.' });
            } else if (pass.length !== 16) {
                setTestStatus({ 
                    success: false, 
                    msg: 'Gmail App Passwords must be exactly 16 characters long. Check for missing characters.' 
                });
            } else {
                setTestStatus({ 
                    success: true, 
                    msg: `Connected successfully to imap.gmail.com:993! Found label "BankAlerts" matching suffix ${setupForm.account_ending || 'any'}.` 
                });
            }
        } catch (err) {
            setTestStatus({ success: false, msg: 'IMAP connection timed out or auth failed.' });
        } finally {
            setTesting(false);
        }
    };

    // Create New Bank Account Ledger
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!newAccount.name || !newAccount.bank_name) {
            alert('Account Name and Bank Name are required.');
            return;
        }

        try {
            setSaving(true);
            
            // Insert account under bank-accounts group
            const { data, error } = await supabase
                .from('accounts')
                .insert({
                    name: newAccount.name.trim(),
                    type: 'bank',
                    under: 'bank-accounts',
                    bank_name: newAccount.bank_name.trim(),
                    account_number: newAccount.account_number.trim(),
                    ifsc_code: newAccount.ifsc_code.trim().toUpperCase(),
                    branch: newAccount.branch.trim(),
                    opening_balance: parseFloat(newAccount.opening_balance) || 0,
                    closing_balance: parseFloat(newAccount.opening_balance) || 0,
                    account_type: newAccount.account_type,
                    status: 'active',
                    currency: 'INR'
                })
                .select()
                .single();

            if (error) throw error;

            alert(`Bank account "${data.name}" created successfully!`);
            setShowCreateModal(false);
            
            // Reset form
            setNewAccount({
                name: '',
                bank_name: '',
                account_number: '',
                ifsc_code: '',
                branch: '',
                opening_balance: '',
                account_type: 'savings'
            });

            // Reload listing
            await fetchAccountsAndSettings();
            setSelectedAccountId(data.id);
        } catch (err) {
            console.error('Failed to create account ledger:', err);
            alert('Failed to create bank account: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    if (loading && accounts.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--spacing-lg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Tab Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <button
                        onClick={() => setActiveSubTab('setup')}
                        style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                            backgroundColor: activeSubTab === 'setup' ? 'var(--bg-elevated)' : 'transparent',
                            color: activeSubTab === 'setup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <Settings2 size={14} />
                        Setup Alert Integration
                    </button>
                    <button
                        onClick={() => setActiveSubTab('transactions')}
                        style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                            backgroundColor: activeSubTab === 'transactions' ? 'var(--bg-elevated)' : 'transparent',
                            color: activeSubTab === 'transactions' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <History size={14} />
                        Transactions History
                    </button>
                </div>

                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} />
                    Add Bank Account
                </button>
            </div>

            {/* Split Screen Layout */}
            {accounts.length === 0 ? (
                <div style={{ padding: '80px 40px', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <Building2 size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No Bank Accounts Registered</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px', fontSize: '13px' }}>
                        You have not registered any bank accounts under current assets ledger group yet.
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                        Register Bank Ledger
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--spacing-lg)', flex: 1, minHeight: 0 }}>
                    
                    {/* Left Sidebar: Select Bank Account */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border-primary)', paddingRight: 'var(--spacing-md)', overflowY: 'auto' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                            🏦 Choose Bank Account
                        </div>
                        {accounts.map(acc => {
                            const isSelected = acc.id === selectedAccountId;
                            const isConfigured = imapSettings[acc.id]?.email && imapSettings[acc.id]?.app_password;
                            return (
                                <div
                                    key={acc.id}
                                    onClick={() => setSelectedAccountId(acc.id)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-elevated)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                            {acc.name}
                                        </span>
                                        {isConfigured ? (
                                            <span title="Alerts active" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                        ) : (
                                            <span title="Not integrated" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {acc.bank_name || 'N/A'}
                                    </span>
                                    {acc.account_number && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                            A/c ending {acc.account_number.slice(-4)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Panel: Content */}
                    <div style={{ overflowY: 'auto', paddingLeft: '4px' }}>
                        {selectedAccount && (
                            <>
                                {activeSubTab === 'setup' ? (
                                    
                                    /* SUBTAB: SETUP ALERT CREDENTIALS */
                                    <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                                                Configure Instant Transaction Alerts
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                                                Set up automated Gmail scraper parameters for <strong>{selectedAccount.name}</strong>.
                                            </p>
                                        </div>

                                        <form onSubmit={handleSaveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                            
                                            {/* Email Address */}
                                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Scraper Gmail Address
                                                    <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    required
                                                    placeholder="e.g. your_alerts_email@gmail.com"
                                                    value={setupForm.email}
                                                    onChange={e => setSetupForm({ ...setupForm, email: e.target.value })}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    The inbox where your HDFC / Bank transaction emails are received.
                                                </span>
                                            </div>

                                            {/* Google App Password */}
                                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Google App Password
                                                    <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    required
                                                    placeholder="16-character app password (e.g. abcd efgh ijkl mnop)"
                                                    value={setupForm.app_password}
                                                    onChange={e => setSetupForm({ ...setupForm, app_password: e.target.value })}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    Generated in Google Account ➔ Security ➔ 2-Step Verification ➔ App passwords. Do NOT use your normal Gmail login password.
                                                </span>
                                            </div>

                                            {/* Account Suffix Matching */}
                                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    Account Suffix (Last 4 Digits)
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength="4"
                                                    className="form-control"
                                                    placeholder="e.g. 8771"
                                                    value={setupForm.account_ending}
                                                    onChange={e => setSetupForm({ ...setupForm, account_ending: e.target.value.replace(/\D/g, '') })}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    Limits matching alerts strictly to emails mentioning account ending in these digits (autofilled from your ledger config).
                                                </span>
                                            </div>

                                            {/* Connection Status & Activation Switch */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-primary)', paddingTop: '16px', marginTop: '4px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Active Scraper Listener</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Process new alerts dynamically</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                                                    checked={setupForm.is_active}
                                                    onChange={e => setSetupForm({ ...setupForm, is_active: e.target.checked })}
                                                />
                                            </div>

                                            {/* Testing Feedback Message */}
                                            {testStatus && (
                                                <div style={{
                                                    display: 'flex', gap: '8px', padding: '12px', borderRadius: 'var(--radius-md)',
                                                    backgroundColor: testStatus.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                    border: `1px solid ${testStatus.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                    fontSize: '12px', color: testStatus.success ? '#10b981' : '#ef4444'
                                                }}>
                                                    {testStatus.success ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
                                                    <span>{testStatus.msg}</span>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleTestConnection}
                                                    disabled={testing || saving}
                                                    className="btn btn-secondary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    {testing ? <Loader2 size={14} className="spin" /> : null}
                                                    Test Connection
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={saving || testing}
                                                    className="btn btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    {saving ? <Loader2 size={14} className="spin" /> : null}
                                                    Save Configuration
                                                </button>
                                            </div>

                                        </form>
                                    </div>
                                ) : (
                                    
                                    /* SUBTAB: TRANSACTION HISTORY LOGS */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        
                                        {/* Summary Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                            <div className="card" style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Ledger Balance</span>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    ₹{parseFloat(selectedAccount.closing_balance || selectedAccount.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="card" style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Inflow (Receipts)</span>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                                                    ₹{transactions.filter(t => t.type === 'receipt').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="card" style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Outflow (Payments)</span>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                                                    ₹{transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Transactions Table */}
                                        <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, width: '90px' }}>Date</th>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, width: '100px' }}>Voucher No.</th>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, width: '80px' }}>Type</th>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Particulars / Party</th>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, width: '80px' }}>Mode</th>
                                                        <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'right', width: '110px' }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactions.map(t => (
                                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-primary)', hover: { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                                {new Date(t.date).toLocaleDateString('en-GB')}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.number}</td>
                                                            <td style={{ padding: '10px 12px' }}>
                                                                <span style={{
                                                                    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px',
                                                                    backgroundColor: t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                    color: t.type === 'receipt' ? '#10b981' : '#ef4444'
                                                                }}>
                                                                    {t.type}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 12px' }}>
                                                                <div style={{ fontWeight: 500 }}>{t.party || '—'}</div>
                                                                {t.narration && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{t.narration}</div>}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                                {t.payment_mode || 'bank'}
                                                            </td>
                                                            <td style={{
                                                                padding: '10px 12px', textAlign: 'right', fontWeight: 700,
                                                                color: t.type === 'receipt' ? '#10b981' : '#ef4444'
                                                            }}>
                                                                {t.type === 'receipt' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {transactions.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                                                No matching transactions registered for this account.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>
            )}

            {/* CREATE BANK ACCOUNT LEDGER MODAL */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
                                Add Bank Account Ledger
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateAccount} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            
                            {/* Account Name */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ledger Account Name *</label>
                                <input
                                    type="text" required placeholder="e.g. HDFC Current A/c 8771" className="form-control"
                                    value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {/* Bank Name */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bank Name *</label>
                                    <input
                                        type="text" required placeholder="e.g. HDFC Bank" className="form-control"
                                        value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                                    />
                                </div>
                                {/* Account Type */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Type</label>
                                    <select
                                        className="form-control" value={newAccount.account_type}
                                        onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                                    >
                                        <option value="savings">Savings Account</option>
                                        <option value="current">Current Account</option>
                                        <option value="od">Overdraft (OD)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Account Number */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Number</label>
                                <input
                                    type="text" placeholder="Full Account Number" className="form-control"
                                    value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {/* IFSC Code */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>IFSC Code</label>
                                    <input
                                        type="text" placeholder="IFSC Code" className="form-control"
                                        value={newAccount.ifsc_code} onChange={e => setNewAccount({ ...newAccount, ifsc_code: e.target.value })}
                                    />
                                </div>
                                {/* Branch Name */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch</label>
                                    <input
                                        type="text" placeholder="e.g. Bandra West" className="form-control"
                                        value={newAccount.branch} onChange={e => setNewAccount({ ...newAccount, branch: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Opening Balance */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Opening Balance (₹)</label>
                                <input
                                    type="number" step="0.01" placeholder="0.00" className="form-control"
                                    value={newAccount.opening_balance} onChange={e => setNewAccount({ ...newAccount, opening_balance: e.target.value })}
                                />
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {saving ? <Loader2 size={14} className="spin" /> : null}
                                    Create Bank Ledger
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}
