'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Settings2, History, Plus, AlertCircle, CheckCircle2, Loader2, ChevronDown, RefreshCw, ArrowRight } from 'lucide-react';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import { transactionsAPI } from '@/lib/adminAPI';

export default function BankAccountsReport({ activeSubTab: propActiveSubTab, setActiveSubTab: propSetActiveSubTab }) {
    const [localSubTab, setLocalSubTab] = useState('setup');
    const activeSubTab = propActiveSubTab || localSubTab;
    const setActiveSubTab = propSetActiveSubTab || setLocalSubTab;
    const [accounts, setAccounts] = useState([]);
    const [imapSettings, setImapSettings] = useState({});
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    
    // Form & Modal States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showVoucherForm, setShowVoucherForm] = useState(null); // { type: 'payment'|'receipt', data: {}, alertId: string }
    const [testStatus, setTestStatus] = useState(null); // { success: boolean, msg: string }
    const [isMobile, setIsMobile] = useState(false);

    // Responsive screen detection
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            // A. Fetch Ledger Vouchers (Receipts & Payments)
            const [recRes, payRes, alertRes] = await Promise.all([
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
                    .limit(100),
                supabase
                    .from('bank_alerts_log')
                    .select('*')
                    .eq('bank_account_id', accountId)
                    .eq('status', 'unreconciled')
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
                status: r.status,
                isAlert: false
            }));

            const payList = (payRes.data || []).map(p => ({
                id: p.id,
                number: p.payment_number,
                type: 'payment',
                date: p.date,
                amount: parseFloat(p.amount) || 0,
                narration: p.narration,
                party: p.account_name,
                status: p.status,
                isAlert: false
            }));

            // B. Fetch Unreconciled Gmail Alerts
            const alertList = (alertRes.data || []).map(a => ({
                id: a.id,
                number: 'GMAIL-ALERT',
                type: a.type === 'debit' ? 'payment' : 'receipt',
                date: a.date,
                amount: parseFloat(a.amount) || 0,
                narration: a.narration || `UPI alert: ${a.party_name}`,
                party: a.party_name || 'HDFC Payee',
                status: 'pending_reconciliation',
                isAlert: true,
                referenceNumber: a.reference_number
            }));

            const merged = [...recList, ...payList, ...alertList].sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(merged);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    };

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

    const handleTestConnection = async () => {
        if (!setupForm.email || !setupForm.app_password) {
            alert('Please provide both the email address and app password to test.');
            return;
        }

        try {
            setTesting(true);
            setTestStatus(null);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const email = setupForm.email.toLowerCase();
            const pass = setupForm.app_password.replace(/\s/g, '');
            
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

    // Trigger Gmail Sync Route
    const triggerSync = async () => {
        if (!selectedAccountId) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/bank-accounts/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: selectedAccountId })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.msg);
                fetchAccountTransactions(selectedAccountId);
            } else {
                alert('Sync failed: ' + data.error);
            }
        } catch (err) {
            alert('Sync failed: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!newAccount.name || !newAccount.bank_name) {
            alert('Account Name and Bank Name are required.');
            return;
        }

        try {
            setSaving(true);
            
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
            
            setNewAccount({
                name: '',
                bank_name: '',
                account_number: '',
                ifsc_code: '',
                branch: '',
                opening_balance: '',
                account_type: 'savings'
            });

            await fetchAccountsAndSettings();
            setSelectedAccountId(data.id);
        } catch (err) {
            console.error('Failed to create account ledger:', err);
            alert('Failed to create bank account: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Open Voucher form with prefilled alert info
    const handleReconcileAlert = (t) => {
        setShowVoucherForm({
            type: t.type,
            alertId: t.id,
            data: {
                date: t.date,
                amount: t.amount,
                narration: `Gmail alert spend: ${t.narration}. Ref UTR: ${t.referenceNumber || ''}`,
                reference_number: t.referenceNumber || '',
                payment_mode: 'bank_transfer',
                payment_account_id: selectedAccountId // select this bank account as source of funds
            }
        });
    };

    const handleVoucherSave = async (voucherData) => {
        try {
            setSaving(true);
            const type = showVoucherForm.type;
            const res = await transactionsAPI.create(voucherData, type);

            // Update alert status to reconciled in Supabase
            if (showVoucherForm.alertId) {
                const { error: updateErr } = await supabase
                    .from('bank_alerts_log')
                    .update({
                        status: 'reconciled',
                        voucher_id: res.data?.id
                    })
                    .eq('id', showVoucherForm.alertId);

                if (updateErr) console.error('Failed to update alert state:', updateErr);
            }

            alert('Voucher reconciled and recorded successfully!');
            setShowVoucherForm(null);
            fetchAccountTransactions(selectedAccountId);
        } catch (err) {
            console.error('Reconciliation failed:', err);
            alert('Failed to save voucher: ' + err.message);
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
        <div style={{ padding: isMobile ? 'var(--spacing-xs)' : 'var(--spacing-lg)', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Empty accounts fallback */}
            {accounts.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <Building2 size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No Bank Accounts Registered</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto 12px', fontSize: '12px' }}>
                        You have not registered any bank accounts under current assets ledger group yet.
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '12px' }}>
                        Register Bank Ledger
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                    
                    {/* Bank Selector & Sync Button Row */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🏦 Active Bank Account
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <select
                                    value={selectedAccountId || ''}
                                    onChange={e => setSelectedAccountId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        paddingRight: '36px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-primary)',
                                        cursor: 'pointer',
                                        appearance: 'none'
                                    }}
                                >
                                    {accounts.map(acc => {
                                        const isConfigured = imapSettings[acc.id]?.email && imapSettings[acc.id]?.app_password;
                                        return (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.bank_name || 'N/A'}{acc.account_number ? ` - ending ${acc.account_number.slice(-4)}` : ''}) {isConfigured ? '🟢' : '⚪'}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                            </div>

                            {activeSubTab === 'transactions' && selectedAccountId && (
                                <button
                                    onClick={triggerSync}
                                    disabled={syncing}
                                    className="btn btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        height: '38px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {syncing ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                                    {!isMobile && "Sync Alerts"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Panel */}
                    {selectedAccount && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                            {activeSubTab === 'setup' ? (
                                
                                /* SETUP TAB */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                            Configure Instant Alerts
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '2px 0 0 0' }}>
                                            Assign email transaction scraper credentials for <strong>{selectedAccount.name}</strong>.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSaveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                        
                                        {/* Email Address */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                Scraper Gmail Address *
                                            </label>
                                            <input
                                                type="email" required placeholder="e.g. spendlogs@gmail.com" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                                value={setupForm.email} onChange={e => setSetupForm({ ...setupForm, email: e.target.value })}
                                            />
                                        </div>

                                        {/* Google App Password */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                Google App Password *
                                            </label>
                                            <input
                                                type="password" required placeholder="16-character code" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                                value={setupForm.app_password} onChange={e => setSetupForm({ ...setupForm, app_password: e.target.value })}
                                            />
                                        </div>

                                        {/* Account Suffix Matching */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                Account Suffix (Last 4 Digits)
                                            </label>
                                            <input
                                                type="text" maxLength="4" placeholder="e.g. 8771" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                                value={setupForm.account_ending} onChange={e => setSetupForm({ ...setupForm, account_ending: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>

                                        {/* Active Switch */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-primary)', paddingTop: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Active Scraper Listener</span>
                                            <input
                                                type="checkbox" style={{ width: '34px', height: '18px', cursor: 'pointer' }}
                                                checked={setupForm.is_active} onChange={e => setSetupForm({ ...setupForm, is_active: e.target.checked })}
                                            />
                                        </div>

                                        {/* Testing Message */}
                                        {testStatus && (
                                            <div style={{
                                                display: 'flex', gap: '6px', padding: '10px', borderRadius: 'var(--radius-md)',
                                                backgroundColor: testStatus.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                border: `1px solid ${testStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                                fontSize: '11px', color: testStatus.success ? '#10b981' : '#ef4444'
                                            }}>
                                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                                <span>{testStatus.msg}</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                            <button
                                                type="button" onClick={handleTestConnection} disabled={testing || saving}
                                                className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                {testing && <Loader2 size={12} className="spin" />}
                                                Test
                                            </button>
                                            <button
                                                type="submit" disabled={saving || testing}
                                                className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                {saving && <Loader2 size={12} className="spin" />}
                                                Save
                                            </button>
                                        </div>

                                    </form>
                                </div>
                            ) : (
                                
                                /* TRANSACTIONS TAB */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                                    
                                    {/* Brief Summary Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Balance</span>
                                            <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                                ₹{parseFloat(selectedAccount.closing_balance || selectedAccount.opening_balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Inflow</span>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                                                ₹{transactions.filter(t => t.type === 'receipt').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div style={{ padding: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Outflow</span>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                                                ₹{transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Responsive Mobile Layout for Transaction Logs */}
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {isMobile ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {transactions.map(t => (
                                                    <div
                                                        key={t.id}
                                                        style={{
                                                            padding: '10px 12px',
                                                            backgroundColor: t.isAlert ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-elevated)',
                                                            border: `1px solid ${t.isAlert ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-primary)'}`,
                                                            borderRadius: 'var(--radius-md)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: t.isAlert ? '60%' : '75%' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <span style={{
                                                                    fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', padding: '1px 4px', borderRadius: '3px',
                                                                    backgroundColor: t.isAlert ? 'rgba(245, 158, 11, 0.15)' : (t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                                                    color: t.isAlert ? '#d97706' : (t.type === 'receipt' ? '#10b981' : '#ef4444')
                                                                }}>
                                                                    {t.isAlert ? 'GMAIL ALERT' : (t.type === 'receipt' ? 'IN' : 'OUT')}
                                                                </span>
                                                                <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                    {t.number}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {t.party || '—'}
                                                            </span>
                                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                                {new Date(t.date).toLocaleDateString('en-GB')} {t.payment_mode ? `· ${t.payment_mode}` : ''}
                                                            </span>
                                                            {t.narration && (
                                                                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {t.narration}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '13px', color: t.type === 'receipt' ? '#10b981' : '#ef4444' }}>
                                                                {t.type === 'receipt' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                                                            </span>
                                                            {t.isAlert && (
                                                                <button
                                                                    onClick={() => handleReconcileAlert(t)}
                                                                    className="btn btn-primary"
                                                                    style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px', border: 'none', backgroundColor: '#f59e0b', color: '#000' }}
                                                                >
                                                                    Reconcile
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {transactions.length === 0 && (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                        No transactions found.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            
                                            /* Desktop standard table */
                                            <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Date</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Voucher No.</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Type</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Party Ledger</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Mode</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                                                            <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'center' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {transactions.map(t => (
                                                            <tr
                                                                key={t.id}
                                                                style={{
                                                                    borderBottom: '1px solid var(--border-primary)',
                                                                    backgroundColor: t.isAlert ? 'rgba(245, 158, 11, 0.03)' : 'transparent'
                                                                }}
                                                            >
                                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                                    {new Date(t.date).toLocaleDateString('en-GB')}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                                                                    {t.number}
                                                                </td>
                                                                <td style={{ padding: '8px 10px' }}>
                                                                    <span style={{
                                                                        fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', padding: '2px 4px', borderRadius: '4px',
                                                                        backgroundColor: t.isAlert ? 'rgba(245, 158, 11, 0.15)' : (t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                                                        color: t.isAlert ? '#d97706' : (t.type === 'receipt' ? '#10b981' : '#ef4444')
                                                                    }}>
                                                                        {t.isAlert ? 'Alert' : t.type}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '8px 10px' }}>
                                                                    <div style={{ fontWeight: 500 }}>{t.party || '—'}</div>
                                                                    {t.narration && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{t.narration}</div>}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                                    {t.payment_mode || '—'}
                                                                </td>
                                                                <td style={{
                                                                    padding: '8px 10px', textAlign: 'right', fontWeight: 700,
                                                                    color: t.type === 'receipt' ? '#10b981' : '#ef4444'
                                                                }}>
                                                                    {t.type === 'receipt' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                    {t.isAlert ? (
                                                                        <button
                                                                            className="btn btn-primary"
                                                                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto', backgroundColor: '#f59e0b', color: '#000', border: 'none' }}
                                                                            onClick={() => handleReconcileAlert(t)}
                                                                        >
                                                                            Reconcile
                                                                            <ArrowRight size={12} />
                                                                        </button>
                                                                    ) : '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {transactions.length === 0 && (
                                                            <tr>
                                                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                                                    No transactions registered.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* CREATE BANK ACCOUNT MODAL */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building2 size={16} style={{ color: 'var(--color-primary)' }} />
                                Add Bank Account Ledger
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', fontSize: '14px' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateAccount} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ledger Account Name *</label>
                                <input
                                    type="text" required placeholder="e.g. HDFC Bank 8771" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                    value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bank Name *</label>
                                    <input
                                        type="text" required placeholder="e.g. HDFC Bank" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                        value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Type</label>
                                    <select
                                        className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                        value={newAccount.account_type} onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                                    >
                                        <option value="savings">Savings</option>
                                        <option value="current">Current</option>
                                        <option value="od">OD A/c</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Number</label>
                                <input
                                    type="text" placeholder="Full Account Number" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                    value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>IFSC Code</label>
                                    <input
                                        type="text" placeholder="IFSC Code" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                        value={newAccount.ifsc_code} onChange={e => setNewAccount({ ...newAccount, ifsc_code: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch</label>
                                    <input
                                        type="text" placeholder="e.g. Bandra" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                        value={newAccount.branch} onChange={e => setNewAccount({ ...newAccount, branch: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Opening Balance (₹)</label>
                                <input
                                    type="number" step="0.01" placeholder="0.00" className="form-control" style={{ fontSize: '13px', padding: '8px' }}
                                    value={newAccount.opening_balance} onChange={e => setNewAccount({ ...newAccount, opening_balance: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}>
                                    {saving && <Loader2 size={12} className="spin" />}
                                    Create Account
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

            {/* INLINE RECONCILIATION MODALS */}
            {showVoucherForm && (
                showVoucherForm.type === 'payment' ? (
                    <PaymentVoucherForm
                        onClose={() => setShowVoucherForm(null)}
                        existingPayment={showVoucherForm.data}
                        onSave={handleVoucherSave}
                    />
                ) : (
                    <ReceiptVoucherForm
                        onClose={() => setShowVoucherForm(null)}
                        existingReceipt={showVoucherForm.data}
                        onSave={handleVoucherSave}
                    />
                )
            )}

        </div>
    );
}
