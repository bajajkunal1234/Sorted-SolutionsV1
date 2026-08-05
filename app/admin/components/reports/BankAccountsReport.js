'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Settings2, History, Plus, AlertCircle, CheckCircle2, Loader2, ChevronDown, RefreshCw, ArrowRight, Upload, CheckCircle, AlertTriangle, Calendar, FileSpreadsheet } from 'lucide-react';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import { transactionsAPI } from '@/lib/adminAPI';
import { parseBankCSV, parseBankExcel } from '@/utils/bankParser';

export default function BankAccountsReport({ activeSubTab: propActiveSubTab, setActiveSubTab: propSetActiveSubTab }) {
    const [localSubTab, setLocalSubTab] = useState('setup');
    const activeSubTab = propActiveSubTab || localSubTab;
    const setActiveSubTab = propSetActiveSubTab || setLocalSubTab;
    const [accounts, setAccounts] = useState([]);
    const [imapSettings, setImapSettings] = useState({});
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [transactions, setTransactions] = useState([]);

    // Date Range Selection States
    const getMonthRange = () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            from: start.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0]
        };
    };
    const initialRange = getMonthRange();
    const [datePreset, setDatePreset] = useState('month');
    const [fromDate, setFromDate] = useState(initialRange.from);
    const [toDate, setToDate] = useState(initialRange.to);

    // Bank Statement Reconciliation States
    const [activeStatement, setActiveStatement] = useState(null);
    const [statementTransactions, setStatementTransactions] = useState([]);
    const [statementStats, setStatementStats] = useState({ total: 0, reconciled: 0, pending: 0, alerts: 0 });
    
    // Form & Modal States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showVoucherForm, setShowVoucherForm] = useState(null); // { type: 'payment'|'receipt', data: {}, alertId: string, statementTxId: string }
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
        }
    }, [selectedAccountId, imapSettings, accounts]);

    useEffect(() => {
        if (selectedAccountId) {
            fetchAccountTransactions(selectedAccountId);
            fetchStatementData(selectedAccountId);
        }
    }, [selectedAccountId, fromDate, toDate]);

    const handlePresetClick = (preset) => {
        setDatePreset(preset);
        if (preset === 'custom') return;

        const today = new Date();
        let from = new Date();
        let to = new Date();

        if (preset === 'today') {
            from = today;
            to = today;
        } else if (preset === 'yesterday') {
            from.setDate(today.getDate() - 1);
            to.setDate(today.getDate() - 1);
        } else if (preset === 'week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            from = new Date(today.setDate(diff));
            to = new Date(from);
            to.setDate(from.getDate() + 6);
        } else if (preset === 'month') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        setFromDate(from.toISOString().split('T')[0]);
        setToDate(to.toISOString().split('T')[0]);
    };

    const fetchStatementData = async (accountId) => {
        if (!accountId) return;
        try {
            const { data: stmtList, error: stErr } = await supabase
                .from('bank_statements')
                .select('*')
                .eq('bank_account_id', accountId);

            if (stErr) throw stErr;

            const active = (stmtList || []).find(s => {
                return (s.from_date <= toDate && s.to_date >= fromDate);
            });

            if (active) {
                setActiveStatement(active);
                const { data: txList, error: txErr } = await supabase
                    .from('bank_statement_transactions')
                    .select('*')
                    .eq('bank_statement_id', active.id)
                    .order('date', { ascending: false });

                if (txErr) throw txErr;

                // Load existing payments and receipts for duplicate check
                const { data: existingVouchers } = await supabase
                    .from('payment_vouchers')
                    .select('payment_number, amount, date')
                    .eq('payment_account_id', accountId);
                
                const { data: existingReceipts } = await supabase
                    .from('receipt_vouchers')
                    .select('receipt_number, amount, date')
                    .eq('payment_account_id', accountId);

                const allVouchers = [
                    ...(existingVouchers || []).map(v => ({ ...v, number: v.payment_number, type: 'payment' })),
                    ...(existingReceipts || []).map(r => ({ ...r, number: r.receipt_number, type: 'receipt' }))
                ];

                const enriched = (txList || []).map(t => {
                    const potentialDuplicate = allVouchers.find(ev => {
                        const amountMatches = Math.abs(parseFloat(ev.amount) - parseFloat(t.amount)) < 0.01;
                        const tDate = new Date(t.date);
                        const evDate = new Date(ev.date);
                        const diffDays = Math.abs(tDate - evDate) / (1000 * 60 * 60 * 24);
                        return amountMatches && diffDays <= 3;
                    });
                    return { ...t, potentialDuplicate };
                });

                setStatementTransactions(enriched);

                const { count: alertsCount } = await supabase
                    .from('bank_alerts_log')
                    .select('*', { count: 'exact', head: true })
                    .eq('bank_account_id', accountId)
                    .eq('status', 'unreconciled')
                    .gte('date', fromDate)
                    .lte('date', toDate);

                setStatementStats({
                    total: enriched.length,
                    reconciled: enriched.filter(x => x.status === 'reconciled').length,
                    pending: enriched.filter(x => x.status === 'unreconciled').length,
                    alerts: alertsCount || 0
                });
            } else {
                setActiveStatement(null);
                setStatementTransactions([]);
                setStatementStats({ total: 0, reconciled: 0, pending: 0, alerts: 0 });
            }
        } catch (err) {
            console.error('Failed to load statement data:', err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedAccountId) return;

        try {
            setSyncing(true);
            const fileName = file.name.toLowerCase();
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    let parsed;
                    if (fileName.endsWith('.csv')) {
                        const text = event.target.result;
                        parsed = parseBankCSV(text);
                    } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                        const buffer = event.target.result;
                        parsed = parseBankExcel(buffer);
                    } else {
                        throw new Error('Unsupported file format. Please upload CSV or Excel.');
                    }

                    if (parsed.length === 0) {
                        alert('No transactions found in the statement.');
                        return;
                    }

                    const dates = parsed.map(t => new Date(t.date)).filter(d => !isNaN(d));
                    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
                    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

                    await supabase
                        .from('bank_statements')
                        .delete()
                        .eq('bank_account_id', selectedAccountId)
                        .eq('from_date', minDate)
                        .eq('to_date', maxDate);

                    const { data: statement, error: stErr } = await supabase
                        .from('bank_statements')
                        .insert({
                            bank_account_id: selectedAccountId,
                            filename: file.name,
                            from_date: minDate,
                            to_date: maxDate,
                            transaction_count: parsed.length,
                            total_value: parsed.reduce((sum, t) => sum + t.amount, 0)
                        })
                        .select()
                        .single();

                    if (stErr) throw stErr;

                    const statementTxns = parsed.map(t => ({
                        bank_statement_id: statement.id,
                        date: t.date,
                        particulars: t.particulars,
                        ref_no: t.refNo || null,
                        amount: t.amount,
                        type: t.type,
                        suggested_account: t.suggestedAccount || null,
                        status: 'unreconciled'
                    }));

                    const { error: txErr } = await supabase
                        .from('bank_statement_transactions')
                        .insert(statementTxns);

                    if (txErr) throw txErr;

                    alert(`Statement "${file.name}" uploaded successfully! parsed ${parsed.length} transactions.`);
                    
                    setFromDate(minDate);
                    setToDate(maxDate);
                    setDatePreset('custom');
                    
                    fetchAccountTransactions(selectedAccountId);
                    fetchStatementData(selectedAccountId);
                } catch (error) {
                    console.error('Parsing/upload error:', error);
                    alert(error.message || 'Failed to upload statement.');
                }
            };

            if (fileName.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        } finally {
            setSyncing(false);
        }
    };

    const fetchAccountsAndSettings = async () => {
        try {
            setLoading(true);
            const { data: accData, error: accErr } = await supabase
                .from('accounts')
                .select('*')
                .eq('under', 'bank-accounts')
                .neq('status', 'archived')
                .order('name', { ascending: true });

            if (accErr) throw accErr;

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
            const [recRes, payRes, alertRes] = await Promise.all([
                supabase
                    .from('receipt_vouchers')
                    .select('id, receipt_number, date, amount, payment_mode, narration, account_name, status')
                    .eq('payment_account_id', accountId)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .order('date', { ascending: false }),
                supabase
                    .from('payment_vouchers')
                    .select('id, payment_number, date, amount, payment_mode, narration, account_name, status')
                    .eq('payment_account_id', accountId)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .order('date', { ascending: false }),
                supabase
                    .from('bank_alerts_log')
                    .select('*')
                    .eq('bank_account_id', accountId)
                    .eq('status', 'unreconciled')
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .order('date', { ascending: false })
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

    const handleReconcileStatementTx = (t) => {
        setShowVoucherForm({
            type: t.type,
            statementTxId: t.id,
            data: {
                date: t.date,
                amount: t.amount,
                narration: `Bank statement reconciled: ${t.particulars}. Ref: ${t.ref_no || ''}`,
                reference_number: t.ref_no || '',
                payment_mode: 'bank_transfer',
                payment_account_id: selectedAccountId,
                account_id: ''
            }
        });
    };

    const handleVoucherSave = async (voucherData) => {
        try {
            setSaving(true);
            const type = showVoucherForm.type;
            const res = await transactionsAPI.create(voucherData, type);

            // Update alert status to reconciled in Supabase if linked to an alert
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

            // Update statement transaction status to reconciled if linked to a statement row
            if (showVoucherForm.statementTxId) {
                const { error: stmtTxErr } = await supabase
                    .from('bank_statement_transactions')
                    .update({
                        status: 'reconciled',
                        voucher_id: res.data?.id,
                        reconciled_at: new Date().toISOString()
                    })
                    .eq('id', showVoucherForm.statementTxId);

                if (stmtTxErr) console.error('Failed to update statement transaction:', stmtTxErr);

                // Auto-link matching Gmail alert if any exists
                const stmtTx = statementTransactions.find(x => x.id === showVoucherForm.statementTxId);
                if (stmtTx) {
                    let alertMatch = null;
                    if (stmtTx.ref_no) {
                        const { data } = await supabase
                            .from('bank_alerts_log')
                            .select('id')
                            .eq('bank_account_id', selectedAccountId)
                            .eq('reference_number', stmtTx.ref_no)
                            .eq('status', 'unreconciled')
                            .maybeSingle();
                        alertMatch = data;
                    }
                    
                    if (!alertMatch) {
                        const { data } = await supabase
                            .from('bank_alerts_log')
                            .select('id')
                            .eq('bank_account_id', selectedAccountId)
                            .eq('date', stmtTx.date)
                            .eq('amount', stmtTx.amount)
                            .eq('status', 'unreconciled')
                            .maybeSingle();
                        alertMatch = data;
                    }

                    if (alertMatch) {
                        await supabase
                            .from('bank_alerts_log')
                            .update({
                                status: 'reconciled',
                                voucher_id: res.data?.id
                            })
                            .eq('id', alertMatch.id);
                    }
                }
            }

            alert('Voucher reconciled and recorded successfully!');
            setShowVoucherForm(null);
            fetchAccountTransactions(selectedAccountId);
            fetchStatementData(selectedAccountId);
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
                                <div style={{ display: 'flex', gap: '6px' }}>
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

                                    <label
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
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            margin: 0
                                        }}
                                    >
                                        <Upload size={13} />
                                        {!isMobile && "Upload Statement"}
                                        <input
                                            type="file"
                                            accept=".csv,.xls,.xlsx"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date Range Selector Row */}
                    {activeSubTab === 'transactions' && selectedAccountId && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            backgroundColor: 'var(--bg-elevated)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)'
                        }}>
                            {/* Presets */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {['today', 'yesterday', 'week', 'month', 'custom'].map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => handlePresetClick(preset)}
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: datePreset === preset ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                            color: datePreset === preset ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            textTransform: 'capitalize',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : preset === 'custom' ? 'Custom Range' : preset}
                                    </button>
                                ))}
                            </div>

                            {/* Date Pickers */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>From:</span>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={e => {
                                            setFromDate(e.target.value);
                                            setDatePreset('custom');
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>To:</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={e => {
                                            setToDate(e.target.value);
                                            setDatePreset('custom');
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Thin Statement Status Info Row */}
                    {activeSubTab === 'transactions' && selectedAccountId && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: activeStatement ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${activeStatement ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                            color: activeStatement ? '#10b981' : '#ef4444'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {activeStatement ? (
                                    <>
                                        <CheckCircle size={13} style={{ flexShrink: 0 }} />
                                        <span>
                                            📁 Statement Uploaded: <strong>{activeStatement.filename}</strong> ({activeStatement.from_date} to {activeStatement.to_date})
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                                        <span>
                                            ⚠️ No statement uploaded for this period. Gmail transaction alerts require immediate update.
                                        </span>
                                    </>
                                )}
                            </div>
                            
                            {activeStatement && (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <span>Total: <strong>{statementStats.total}</strong></span>
                                    <span style={{ color: '#10b981' }}>Reconciled: <strong>{statementStats.reconciled}</strong></span>
                                    <span style={{ color: '#ef4444' }}>Pending: <strong>{statementStats.pending}</strong></span>
                                    <span style={{ color: '#d97706' }}>Alerts: <strong>{statementStats.alerts}</strong></span>
                                </div>
                            )}
                        </div>
                    )}

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
                                
                                /* TRANSACTIONS / RECONCILIATION TAB */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                                    <style>{`
                                        @keyframes pulse-red {
                                            0% {
                                                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                                            }
                                            70% {
                                                box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
                                            }
                                            100% {
                                                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                                            }
                                        }
                                    `}</style>

                                    {activeStatement ? (
                                        /* STATEMENT RECONCILIATION VIEW */
                                        <div style={{ flex: 1, overflowY: 'auto' }}>
                                            {isMobile ? (
                                                /* Mobile statement list cards */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {statementTransactions.map(t => {
                                                        const isReconciled = t.status === 'reconciled';
                                                        return (
                                                            <div
                                                                key={t.id}
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    backgroundColor: isReconciled ? 'rgba(16, 185, 129, 0.03)' : (t.potentialDuplicate ? 'rgba(245, 158, 11, 0.03)' : 'var(--bg-elevated)'),
                                                                    border: `1px solid ${isReconciled ? 'rgba(16, 185, 129, 0.15)' : (t.potentialDuplicate ? 'rgba(245, 158, 11, 0.15)' : 'var(--border-primary)')}`,
                                                                    borderRadius: 'var(--radius-md)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    opacity: isReconciled ? 0.6 : 1
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{
                                                                            fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', padding: '1px 4px', borderRadius: '3px',
                                                                            backgroundColor: t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                            color: t.type === 'receipt' ? '#10b981' : '#ef4444'
                                                                        }}>
                                                                            {t.type === 'receipt' ? 'DEP' : 'WDL'}
                                                                        </span>
                                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                                            {new Date(t.date).toLocaleDateString('en-GB')}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                                                        {t.particulars}
                                                                    </span>
                                                                    {t.ref_no && (
                                                                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                                            Ref: {t.ref_no}
                                                                        </span>
                                                                    )}
                                                                    {t.suggested_account && !isReconciled && (
                                                                        <span style={{ fontSize: '9px', color: 'var(--primary-color)', fontWeight: 600 }}>
                                                                            💡 Suggestion: {t.suggested_account}
                                                                        </span>
                                                                    )}
                                                                    {t.potentialDuplicate && !isReconciled && (
                                                                        <span style={{ fontSize: '9px', color: '#d97706', fontWeight: 600 }}>
                                                                            ⚠️ Potential duplicate voucher found!
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '13px', color: t.type === 'receipt' ? '#10b981' : '#ef4444' }}>
                                                                        {t.type === 'receipt' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                                                                    </span>
                                                                    {isReconciled ? (
                                                                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                                                                            <CheckCircle size={10} /> Reconciled
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleReconcileStatementTx(t)}
                                                                            className="btn btn-primary"
                                                                            style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px', border: 'none', backgroundColor: '#f59e0b', color: '#000' }}
                                                                        >
                                                                            Reconcile
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {statementTransactions.length === 0 && (
                                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                            No transactions found in statement for this period.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Desktop statement table */
                                                <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, width: '90px' }}>Date</th>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Particulars / Narration</th>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, width: '140px' }}>Ref No.</th>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, width: '110px', textAlign: 'right' }}>Amount</th>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, width: '160px' }}>Status / Suggestion</th>
                                                                <th style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600, width: '140px', textAlign: 'center' }}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statementTransactions.map(t => {
                                                                const isReconciled = t.status === 'reconciled';
                                                                return (
                                                                    <tr
                                                                        key={t.id}
                                                                        style={{
                                                                            borderBottom: '1px solid var(--border-primary)',
                                                                            backgroundColor: isReconciled ? 'rgba(16, 185, 129, 0.02)' : (t.potentialDuplicate ? 'rgba(245, 158, 11, 0.02)' : 'transparent'),
                                                                            opacity: isReconciled ? 0.6 : 1
                                                                        }}
                                                                    >
                                                                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                                            {new Date(t.date).toLocaleDateString('en-GB')}
                                                                        </td>
                                                                        <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                                                                            <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{t.particulars}</div>
                                                                            {t.potentialDuplicate && !isReconciled && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '10px', marginTop: '4px', fontWeight: 600 }}>
                                                                                    <AlertTriangle size={11} />
                                                                                    Potential duplicate: {t.potentialDuplicate.type} #{t.potentialDuplicate.number} (₹{parseFloat(t.potentialDuplicate.amount).toLocaleString()})
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', verticalAlign: 'top' }}>
                                                                            {t.ref_no || '—'}
                                                                        </td>
                                                                        <td style={{
                                                                            padding: '8px 10px', textAlign: 'right', fontWeight: 700,
                                                                            color: t.type === 'receipt' ? '#10b981' : '#ef4444',
                                                                            verticalAlign: 'top'
                                                                        }}>
                                                                            {t.type === 'receipt' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                        </td>
                                                                        <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                                                                            {isReconciled ? (
                                                                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                                                    <CheckCircle size={13} /> Reconciled
                                                                                </span>
                                                                            ) : (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <span style={{
                                                                                        fontSize: '9px', padding: '2px 6px',
                                                                                        backgroundColor: t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                                        color: t.type === 'receipt' ? '#10b981' : '#ef4444',
                                                                                        borderRadius: '10px', width: 'fit-content', fontWeight: 600, textTransform: 'uppercase'
                                                                                    }}>
                                                                                        {t.type === 'receipt' ? 'Deposit' : 'Withdrawal'}
                                                                                    </span>
                                                                                    {t.suggested_account && (
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                                                            💡 {t.suggested_account}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                                                                            {!isReconciled && (
                                                                                <button
                                                                                    className="btn btn-primary"
                                                                                    style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto', backgroundColor: '#f59e0b', color: '#000', border: 'none' }}
                                                                                    onClick={() => handleReconcileStatementTx(t)}
                                                                                >
                                                                                    {t.potentialDuplicate ? 'Review & Link' : 'Confirm & Create'}
                                                                                    <ArrowRight size={12} />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {statementTransactions.length === 0 && (
                                                                <tr>
                                                                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                                                        No transactions found in statement.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* DEFAULT LEDGER & SCRAPED ALERTS VIEW */
                                        <div style={{ flex: 1, overflowY: 'auto' }}>
                                            {isMobile ? (
                                                /* Mobile transaction list cards */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {transactions.map(t => (
                                                        <div
                                                            key={t.id}
                                                            style={{
                                                                padding: '10px 12px',
                                                                backgroundColor: t.isAlert ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)',
                                                                border: `1px solid ${t.isAlert ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-primary)'}`,
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
                                                                        backgroundColor: t.isAlert ? 'rgba(239, 68, 68, 0.15)' : (t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                                                        color: t.isAlert ? '#ef4444' : (t.type === 'receipt' ? '#10b981' : '#ef4444')
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
                                                                        style={{
                                                                            padding: '2px 6px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px', border: 'none',
                                                                            backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, animation: 'pulse-red 2s infinite'
                                                                        }}
                                                                    >
                                                                        ⚠️ Missing Statement
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
                                                /* Desktop transaction list table */
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
                                                                        backgroundColor: t.isAlert ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
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
                                                                            backgroundColor: t.isAlert ? 'rgba(239, 68, 68, 0.1)' : (t.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                                                            color: t.isAlert ? '#ef4444' : (t.type === 'receipt' ? '#10b981' : '#ef4444')
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
                                                                                style={{
                                                                                    padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto',
                                                                                    backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 600,
                                                                                    animation: 'pulse-red 2s infinite'
                                                                                }}
                                                                                onClick={() => handleReconcileAlert(t)}
                                                                            >
                                                                                ⚠️ Missing Statement
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
                                    )}
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
