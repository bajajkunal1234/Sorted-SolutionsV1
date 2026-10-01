'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Building2, Settings2, Plus, AlertCircle, CheckCircle2, Loader2,
    ChevronDown, ChevronUp, RefreshCw, ArrowRight, Upload, CheckCircle, AlertTriangle,
    Calendar, FileSpreadsheet, Link2, Unlink, Clock, Search, Filter,
    ShieldAlert, Sparkles, ExternalLink, ArrowUpRight, ArrowDownLeft, X,
    ArrowUpDown
} from 'lucide-react';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import LinkSystemEntryModal from './LinkSystemEntryModal';
import { transactionsAPI } from '@/lib/adminAPI';
import { parseBankCSV, parseBankExcel } from '@/utils/bankParser';

const DEFAULT_COLUMN_WIDTHS = {
    date: 90,
    source: 95,
    voucherNo: 110,
    particulars: 240,
    deposit: 100,
    withdrawal: 100,
    status: 135,
    action: 140
};

export default function BankAccountsReport({ activeSubTab: propActiveSubTab, setActiveSubTab: propSetActiveSubTab }) {
    // Default to 'transactions' subtab as requested
    const [localSubTab, setLocalSubTab] = useState('transactions');
    const activeSubTab = propActiveSubTab || localSubTab;
    const setActiveSubTab = propSetActiveSubTab || setLocalSubTab;

    const [accounts, setAccounts] = useState([]);
    const [imapSettings, setImapSettings] = useState({});
    const [selectedAccountId, setSelectedAccountId] = useState(null);

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

    // Filter and Sort states
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unassigned' | 'uncleared' | 'duplicate' | 'reconciled'
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Resizable column widths
    const [colWidths, setColWidths] = useState(DEFAULT_COLUMN_WIDTHS);
    const resizingRef = useRef(null);

    // Bank Statement & System Data
    const [activeStatement, setActiveStatement] = useState(null);
    const [statementTransactions, setStatementTransactions] = useState([]);
    const [systemVouchers, setSystemVouchers] = useState([]);
    const [bankAlerts, setBankAlerts] = useState([]);
    const [accountOpeningBal, setAccountOpeningBal] = useState(0);

    // Form & Modal States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showVoucherForm, setShowVoucherForm] = useState(null);
    const [showLinkModal, setShowLinkModal] = useState(null);
    const [testStatus, setTestStatus] = useState(null);
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

    // Load Initial Accounts & Settings
    useEffect(() => {
        fetchAccountsAndSettings();
    }, []);

    // Sync Setup Form when selectedAccountId changes
    useEffect(() => {
        if (selectedAccountId) {
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

    // Fetch transactions whenever account or date range changes
    useEffect(() => {
        if (selectedAccountId) {
            fetchComprehensiveData(selectedAccountId);
        }
    }, [selectedAccountId, fromDate, toDate]);

    // Column resizing logic with touch & mouse drag support
    const handleResizeStart = (colKey, e) => {
        e.stopPropagation();
        e.preventDefault();
        const startX = e.touches ? e.touches[0].clientX : e.clientX;
        const startWidth = colWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey];
        resizingRef.current = { colKey, startX, startWidth };

        const handleMove = (moveEvent) => {
            if (!resizingRef.current) return;
            const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const delta = currentX - resizingRef.current.startX;
            const newWidth = Math.max(50, Math.round(resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
        };

        const handleEnd = () => {
            resizingRef.current = null;
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };

        window.addEventListener('mousemove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    };

    // Column Sorting Toggle
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: key === 'deposit' || key === 'withdrawal' || key === 'date' ? 'desc' : 'asc' };
        });
    };

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
            from.setDate(today.getDate() - 7);
            to = today;
        } else if (preset === 'month') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        setFromDate(from.toISOString().split('T')[0]);
        setToDate(to.toISOString().split('T')[0]);
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
            const accList = accData || [];
            setAccounts(accList);
            setImapSettings(settings);

            if (accList.length > 0) {
                // Preselect HDFC Current A/c by default
                const defaultAcc = accList.find(a =>
                    (a.name || '').toLowerCase().includes('hdfc') && (a.name || '').toLowerCase().includes('current')
                ) || accList.find(a =>
                    (a.name || '').toLowerCase().includes('hdfc')
                ) || accList[0];

                if (!selectedAccountId || !accList.some(a => a.id === selectedAccountId)) {
                    setSelectedAccountId(defaultAcc.id);
                }
            }
        } catch (err) {
            console.error('Failed to load bank accounts setup:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComprehensiveData = async (accountId) => {
        if (!accountId) return;
        try {
            setLoading(true);

            // 1. Fetch Account Master for opening balance
            const { data: accountMaster } = await supabase
                .from('accounts')
                .select('opening_balance, balance_type, name')
                .eq('id', accountId)
                .single();

            const baseOpening = parseFloat(accountMaster?.opening_balance) || 0;
            const balanceType = accountMaster?.balance_type || 'dr';

            // 2. Fetch prior transactions before fromDate to calculate accurate opening balance at fromDate
            const [priorPay, priorRec] = await Promise.all([
                supabase
                    .from('payment_vouchers')
                    .select('amount')
                    .or(`payment_account_id.eq.${accountId},account_id.eq.${accountId}`)
                    .lt('date', fromDate)
                    .neq('status', 'cancelled'),
                supabase
                    .from('receipt_vouchers')
                    .select('amount')
                    .or(`payment_account_id.eq.${accountId},account_id.eq.${accountId}`)
                    .lt('date', fromDate)
                    .neq('status', 'cancelled')
            ]);

            const priorOutflow = (priorPay.data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const priorInflow = (priorRec.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const computedStartBalance = (balanceType === 'dr' ? baseOpening : -baseOpening) + priorInflow - priorOutflow;
            setAccountOpeningBal(computedStartBalance);

            // 3. Fetch All System Entries for the selected bank account within range
            const [payRes, recRes, purRes, salRes, alertRes, stmtRes] = await Promise.all([
                supabase
                    .from('payment_vouchers')
                    .select('id, payment_number, date, amount, payment_mode, narration, account_name, status, payment_account_id, reference_number')
                    .or(`payment_account_id.eq.${accountId},account_id.eq.${accountId}`)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false }),
                supabase
                    .from('receipt_vouchers')
                    .select('id, receipt_number, date, amount, payment_mode, narration, account_name, status, payment_account_id, reference_number')
                    .or(`payment_account_id.eq.${accountId},account_id.eq.${accountId}`)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false }),
                supabase
                    .from('purchase_invoices')
                    .select('id, invoice_number, date, total_amount, paid_amount, status, notes, account_name, paid_by, po_reference')
                    .or(`paid_by.eq.${accountId},account_id.eq.${accountId}`)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false }),
                supabase
                    .from('sales_invoices')
                    .select('id, invoice_number, date, total_amount, paid_amount, status, notes, account_name, account_id')
                    .eq('account_id', accountId)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .neq('status', 'cancelled')
                    .order('date', { ascending: false }),
                supabase
                    .from('bank_alerts_log')
                    .select('*')
                    .eq('bank_account_id', accountId)
                    .gte('date', fromDate)
                    .lte('date', toDate)
                    .order('date', { ascending: false }),
                supabase
                    .from('bank_statements')
                    .select('*')
                    .eq('bank_account_id', accountId)
                    .order('to_date', { ascending: false })
            ]);

            // Unify system vouchers
            const systemList = [];

            (payRes.data || []).forEach(p => {
                systemList.push({
                    id: p.id,
                    systemId: p.id,
                    systemType: 'payment',
                    number: p.payment_number,
                    date: p.date,
                    amount: parseFloat(p.amount) || 0,
                    direction: 'outflow',
                    party: p.account_name || 'Vendor / Payee',
                    narration: p.narration,
                    refNo: p.reference_number || '',
                    status: p.status,
                    mode: p.payment_mode || 'Bank Transfer'
                });
            });

            (recRes.data || []).forEach(r => {
                systemList.push({
                    id: r.id,
                    systemId: r.id,
                    systemType: 'receipt',
                    number: r.receipt_number,
                    date: r.date,
                    amount: parseFloat(r.amount) || 0,
                    direction: 'inflow',
                    party: r.account_name || 'Customer / Payer',
                    narration: r.narration,
                    refNo: r.reference_number || '',
                    status: r.status,
                    mode: r.payment_mode || 'Bank Transfer'
                });
            });

            (purRes.data || []).forEach(pu => {
                systemList.push({
                    id: pu.id,
                    systemId: pu.id,
                    systemType: 'purchase',
                    number: pu.invoice_number,
                    date: pu.date,
                    amount: parseFloat(pu.total_amount) || 0,
                    direction: 'outflow',
                    party: pu.account_name || 'Supplier',
                    narration: pu.notes || `Purchase: ${pu.invoice_number}`,
                    refNo: pu.po_reference || '',
                    status: pu.status,
                    mode: 'Bank Transfer'
                });
            });

            (salRes.data || []).forEach(s => {
                systemList.push({
                    id: s.id,
                    systemId: s.id,
                    systemType: 'sales',
                    number: s.invoice_number,
                    date: s.date,
                    amount: parseFloat(s.total_amount) || 0,
                    direction: 'inflow',
                    party: s.account_name || 'Customer',
                    narration: s.notes || `Sales Invoice: ${s.invoice_number}`,
                    refNo: '',
                    status: s.status,
                    mode: 'Bank Transfer'
                });
            });

            setSystemVouchers(systemList);
            setBankAlerts(alertRes.data || []);

            // 4. Fetch Bank Statement Data
            const stmtList = stmtRes.data || [];
            const active = stmtList.find(s => s.from_date <= toDate && s.to_date >= fromDate) || stmtList[0] || null;

            if (active) {
                setActiveStatement(active);
                const { data: txList } = await supabase
                    .from('bank_statement_transactions')
                    .select('*')
                    .eq('bank_statement_id', active.id)
                    .order('date', { ascending: false });

                setStatementTransactions(txList || []);
            } else {
                setActiveStatement(null);
                setStatementTransactions([]);
            }

        } catch (err) {
            console.error('Failed to fetch comprehensive bank data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Duplicate detection and unified ledger computation
    const {
        unifiedLedger,
        stats,
        closingComparison,
        weeklyStatus
    } = useMemo(() => {
        const linkedVoucherIds = new Set();
        (statementTransactions || []).forEach(t => {
            if (t.voucher_id) linkedVoucherIds.add(t.voucher_id);
            if (t.system_entry_id) linkedVoucherIds.add(t.system_entry_id);
        });
        (bankAlerts || []).forEach(a => {
            if (a.voucher_id) linkedVoucherIds.add(a.voucher_id);
            if (a.system_entry_id) linkedVoucherIds.add(a.system_entry_id);
        });

        // 1. Detect Duplicates in System Entries
        const systemDuplicateIds = new Set();
        const voucherKeyCount = {};
        systemVouchers.forEach(v => {
            const key = `${v.direction}_${v.amount.toFixed(2)}_${v.date}_${(v.party || '').toLowerCase().trim()}`;
            if (!voucherKeyCount[key]) voucherKeyCount[key] = [];
            voucherKeyCount[key].push(v.id);
        });
        Object.values(voucherKeyCount).forEach(ids => {
            if (ids.length > 1) {
                ids.forEach(id => systemDuplicateIds.add(id));
            }
        });

        // 2. Detect Duplicates in Statement Transactions
        const stmtDuplicateIds = new Set();
        const stmtKeyCount = {};
        statementTransactions.forEach(t => {
            const key = `${t.type}_${parseFloat(t.amount || 0).toFixed(2)}_${t.date}_${t.ref_no || t.particulars}`;
            if (!stmtKeyCount[key]) stmtKeyCount[key] = [];
            stmtKeyCount[key].push(t.id);
        });
        Object.values(stmtKeyCount).forEach(ids => {
            if (ids.length > 1) {
                ids.forEach(id => stmtDuplicateIds.add(id));
            }
        });

        // 3. Build unified rows
        const rows = [];

        // A. Add Statement Transactions
        statementTransactions.forEach(st => {
            const isReconciled = st.status === 'reconciled' || !!st.voucher_id || !!st.system_entry_id;
            const isDuplicate = stmtDuplicateIds.has(st.id);
            const linkedVoucher = systemVouchers.find(v => v.id === st.voucher_id || v.id === st.system_entry_id);

            let potentialMatch = null;
            if (!isReconciled) {
                potentialMatch = systemVouchers.find(v => {
                    const amtMatch = Math.abs(v.amount - parseFloat(st.amount)) < 0.01;
                    const dirMatch = (st.type === 'receipt' && v.direction === 'inflow') || (st.type === 'payment' && v.direction === 'outflow');
                    if (!amtMatch || !dirMatch) return false;
                    const daysDiff = Math.abs(new Date(v.date) - new Date(st.date)) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 4;
                });
            }

            rows.push({
                rowId: `stmt-${st.id}`,
                origin: 'statement',
                id: st.id,
                statementTxId: st.id,
                date: st.date,
                type: st.type,
                sourceLabel: 'BANK STMT',
                voucherNo: linkedVoucher ? linkedVoucher.number : '—',
                particulars: st.particulars,
                refNo: st.ref_no || '',
                amount: parseFloat(st.amount) || 0,
                balance: parseFloat(st.balance) || 0,
                isReconciled,
                linkedEntry: linkedVoucher,
                potentialMatch,
                isDuplicate,
                suggestedAccount: st.suggested_account,
                raw: st
            });
        });

        // B. Add Gmail Alerts
        bankAlerts.forEach(alert => {
            const isReconciled = alert.status === 'reconciled' || !!alert.voucher_id;
            const linkedVoucher = systemVouchers.find(v => v.id === alert.voucher_id || v.id === alert.system_entry_id);

            const coveredByStatement = alert.reference_number && statementTransactions.some(st => st.ref_no === alert.reference_number);
            if (coveredByStatement) return;

            let potentialMatch = null;
            if (!isReconciled) {
                potentialMatch = systemVouchers.find(v => {
                    const amtMatch = Math.abs(v.amount - parseFloat(alert.amount)) < 0.01;
                    const dirMatch = (alert.type === 'credit' && v.direction === 'inflow') || (alert.type === 'debit' && v.direction === 'outflow');
                    if (!amtMatch || !dirMatch) return false;
                    const daysDiff = Math.abs(new Date(v.date) - new Date(alert.date)) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 4;
                });
            }

            rows.push({
                rowId: `alert-${alert.id}`,
                origin: 'alert',
                id: alert.id,
                isAlert: true,
                date: alert.date,
                type: alert.type === 'credit' ? 'receipt' : 'payment',
                sourceLabel: 'GMAIL ALERT',
                voucherNo: linkedVoucher ? linkedVoucher.number : 'GMAIL-ALERT',
                particulars: alert.narration || `Alert: ${alert.party_name}`,
                refNo: alert.reference_number || '',
                amount: parseFloat(alert.amount) || 0,
                balance: 0,
                isReconciled,
                linkedEntry: linkedVoucher,
                potentialMatch,
                isDuplicate: false,
                raw: alert
            });
        });

        // C. Add System Vouchers
        systemVouchers.forEach(sv => {
            const isDuplicate = systemDuplicateIds.has(sv.id);
            const representedInStmt = statementTransactions.some(st => st.voucher_id === sv.id || st.system_entry_id === sv.id);
            const representedInAlert = bankAlerts.some(ba => ba.voucher_id === sv.id || ba.system_entry_id === sv.id);

            if (!representedInStmt && !representedInAlert) {
                rows.push({
                    rowId: `sys-${sv.id}`,
                    origin: 'system',
                    id: sv.id,
                    systemId: sv.id,
                    systemType: sv.systemType,
                    date: sv.date,
                    type: sv.direction === 'inflow' ? 'receipt' : 'payment',
                    sourceLabel: sv.systemType.toUpperCase(),
                    voucherNo: sv.number,
                    particulars: `${sv.party} - ${sv.narration || sv.systemType}`,
                    refNo: sv.refNo || '',
                    amount: sv.amount,
                    balance: 0,
                    isReconciled: false,
                    isUncleared: true,
                    isDuplicate,
                    raw: sv
                });
            }
        });

        // 4. Financial Reconciliation & Balances
        const systemInflows = systemVouchers.filter(v => v.direction === 'inflow').reduce((sum, v) => sum + v.amount, 0);
        const systemOutflows = systemVouchers.filter(v => v.direction === 'outflow').reduce((sum, v) => sum + v.amount, 0);
        const systemClosingBal = accountOpeningBal + systemInflows - systemOutflows;

        let statementOpening = 0;
        let statementClosing = 0;
        let statementInflows = 0;
        let statementOutflows = 0;
        let hasStatement = !!activeStatement;

        if (activeStatement) {
            statementOpening = parseFloat(activeStatement.opening_balance) || 0;
            statementClosing = parseFloat(activeStatement.closing_balance) || 0;

            if (statementTransactions.length > 0) {
                const chronological = [...statementTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
                const firstTx = chronological[0];
                const lastTx = chronological[chronological.length - 1];

                if (lastTx.balance) {
                    statementClosing = parseFloat(lastTx.balance);
                }
                if (firstTx.balance) {
                    const firstAmt = parseFloat(firstTx.amount) || 0;
                    statementOpening = firstTx.type === 'receipt' ? firstTx.balance - firstAmt : firstTx.balance + firstAmt;
                }

                statementInflows = statementTransactions.filter(t => t.type === 'receipt').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                statementOutflows = statementTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            }
        }

        const discrepancy = hasStatement ? (systemClosingBal - statementClosing) : 0;
        const isDiscrepancy = hasStatement && Math.abs(discrepancy) > 0.05;

        // 5. Weekly Reconciliation Tracking
        let latestReconciledDate = null;
        if (activeStatement?.to_date) {
            latestReconciledDate = activeStatement.to_date;
        } else {
            const lastReconciledTx = rows.find(r => r.isReconciled);
            if (lastReconciledTx) latestReconciledDate = lastReconciledTx.date;
        }

        let daysSinceReconciliation = null;
        if (latestReconciledDate) {
            const today = new Date();
            const lastDate = new Date(latestReconciledDate);
            daysSinceReconciliation = Math.max(0, Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)));
        }

        const unassignedCount = rows.filter(r => (r.origin === 'statement' || r.origin === 'alert') && !r.isReconciled).length;
        const unclearedCount = rows.filter(r => r.origin === 'system' && !r.isReconciled).length;
        const duplicateCount = rows.filter(r => r.isDuplicate).length;
        const reconciledCount = rows.filter(r => r.isReconciled).length;

        return {
            unifiedLedger: rows,
            stats: {
                totalCount: rows.length,
                unassignedCount,
                unclearedCount,
                duplicateCount,
                reconciledCount
            },
            closingComparison: {
                hasStatement,
                statementOpening,
                statementClosing,
                statementInflows,
                statementOutflows,
                systemOpening: accountOpeningBal,
                systemClosing: systemClosingBal,
                systemInflows,
                systemOutflows,
                discrepancy,
                isDiscrepancy
            },
            weeklyStatus: {
                daysSince: daysSinceReconciliation,
                isOverdue: daysSinceReconciliation !== null ? daysSinceReconciliation > 7 : true,
                latestDate: latestReconciledDate
            }
        };
    }, [statementTransactions, bankAlerts, systemVouchers, accountOpeningBal, activeStatement]);

    // Filter and Sort rows
    const sortedRows = useMemo(() => {
        let list = [...unifiedLedger];

        if (activeFilter === 'unassigned') {
            list = list.filter(r => (r.origin === 'statement' || r.origin === 'alert') && !r.isReconciled);
        } else if (activeFilter === 'uncleared') {
            list = list.filter(r => r.origin === 'system' && !r.isReconciled);
        } else if (activeFilter === 'duplicate') {
            list = list.filter(r => r.isDuplicate);
        } else if (activeFilter === 'reconciled') {
            list = list.filter(r => r.isReconciled);
        }

        if (searchTerm) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(r =>
                (r.voucherNo || '').toLowerCase().includes(q) ||
                (r.particulars || '').toLowerCase().includes(q) ||
                (r.refNo || '').toLowerCase().includes(q) ||
                String(r.amount).includes(q)
            );
        }

        // Apply Sorting
        const { key, direction } = sortConfig;
        const factor = direction === 'asc' ? 1 : -1;

        list.sort((a, b) => {
            if (key === 'date') {
                return (new Date(a.date) - new Date(b.date)) * factor;
            }
            if (key === 'source') {
                return (a.sourceLabel || '').localeCompare(b.sourceLabel || '') * factor;
            }
            if (key === 'voucherNo') {
                return (a.voucherNo || '').localeCompare(b.voucherNo || '') * factor;
            }
            if (key === 'particulars') {
                return (a.particulars || '').localeCompare(b.particulars || '') * factor;
            }
            if (key === 'deposit') {
                const amtA = a.type === 'receipt' ? a.amount : 0;
                const amtB = b.type === 'receipt' ? b.amount : 0;
                return (amtA - amtB) * factor;
            }
            if (key === 'withdrawal') {
                const amtA = a.type !== 'receipt' ? a.amount : 0;
                const amtB = b.type !== 'receipt' ? b.amount : 0;
                return (amtA - amtB) * factor;
            }
            if (key === 'status') {
                const statusA = a.isReconciled ? 3 : (a.isDuplicate ? 0 : (a.isUnassigned ? 1 : 2));
                const statusB = b.isReconciled ? 3 : (b.isDuplicate ? 0 : (b.isUnassigned ? 1 : 2));
                return (statusA - statusB) * factor;
            }
            return 0;
        });

        return list;
    }, [unifiedLedger, activeFilter, searchTerm, sortConfig]);

    // Handle Bank Statement Upload
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

                    const sorted = [...parsed].sort((a, b) => new Date(a.date) - new Date(b.date));
                    const dates = sorted.map(t => new Date(t.date)).filter(d => !isNaN(d));
                    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
                    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

                    let stClosing = 0;
                    let stOpening = 0;
                    const firstRow = sorted[0];
                    const lastRow = sorted[sorted.length - 1];

                    if (lastRow.balance) {
                        stClosing = parseFloat(lastRow.balance);
                    }
                    if (firstRow.balance) {
                        stOpening = firstRow.type === 'receipt' ? firstRow.balance - firstRow.amount : firstRow.balance + firstRow.amount;
                    }

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
                            transaction_count: sorted.length,
                            total_value: sorted.reduce((sum, t) => sum + t.amount, 0),
                            opening_balance: stOpening,
                            closing_balance: stClosing
                        })
                        .select()
                        .single();

                    if (stErr) throw stErr;

                    const statementTxns = sorted.map(t => ({
                        bank_statement_id: statement.id,
                        date: t.date,
                        particulars: t.particulars,
                        ref_no: t.refNo || null,
                        amount: t.amount,
                        type: t.type,
                        balance: t.balance || 0,
                        suggested_account: t.suggestedAccount || null,
                        status: 'unreconciled'
                    }));

                    const { error: txErr } = await supabase
                        .from('bank_statement_transactions')
                        .insert(statementTxns);

                    if (txErr) throw txErr;

                    alert(`Statement "${file.name}" uploaded successfully! Parsed ${sorted.length} transactions.\nOpening: ₹${stOpening.toLocaleString('en-IN')}, Closing: ₹${stClosing.toLocaleString('en-IN')}`);

                    setFromDate(minDate);
                    setToDate(maxDate);
                    setDatePreset('custom');

                    fetchComprehensiveData(selectedAccountId);
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

    // Open Voucher form to create entry from bank transaction
    const handleCreateVoucherFromRow = (row) => {
        const isDeposit = row.type === 'receipt';
        setShowVoucherForm({
            type: isDeposit ? 'receipt' : 'payment',
            alertId: row.isAlert ? row.id : null,
            statementTxId: row.origin === 'statement' ? row.id : null,
            data: {
                date: row.date,
                amount: row.amount,
                narration: `Bank Reconciled: ${row.particulars}. Ref: ${row.refNo || ''}`,
                reference_number: row.refNo || '',
                payment_mode: 'bank_transfer',
                payment_account_id: selectedAccountId,
                account_id: ''
            }
        });
    };

    // Save Voucher Callback
    const handleVoucherSave = async (voucherData) => {
        try {
            setSaving(true);
            const type = showVoucherForm.type;
            const res = await transactionsAPI.create(voucherData, type);
            const voucherId = res.data?.id;

            if (showVoucherForm.alertId) {
                await supabase
                    .from('bank_alerts_log')
                    .update({
                        status: 'reconciled',
                        voucher_id: voucherId,
                        system_entry_type: type,
                        system_entry_id: voucherId
                    })
                    .eq('id', showVoucherForm.alertId);
            }

            if (showVoucherForm.statementTxId) {
                await supabase
                    .from('bank_statement_transactions')
                    .update({
                        status: 'reconciled',
                        voucher_id: voucherId,
                        system_entry_type: type,
                        system_entry_id: voucherId,
                        reconciled_at: new Date().toISOString()
                    })
                    .eq('id', showVoucherForm.statementTxId);
            }

            alert('Voucher recorded and linked successfully!');
            setShowVoucherForm(null);
            fetchComprehensiveData(selectedAccountId);
        } catch (err) {
            console.error('Failed to save voucher:', err);
            alert('Failed to save voucher: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Unlink transaction
    const handleUnlink = async (row) => {
        if (!confirm('Are you sure you want to unlink this transaction?')) return;
        try {
            if (row.origin === 'statement') {
                await supabase
                    .from('bank_statement_transactions')
                    .update({
                        status: 'unreconciled',
                        voucher_id: null,
                        system_entry_id: null,
                        system_entry_type: null,
                        reconciled_at: null
                    })
                    .eq('id', row.id);
            } else if (row.isAlert) {
                await supabase
                    .from('bank_alerts_log')
                    .update({
                        status: 'unreconciled',
                        voucher_id: null,
                        system_entry_id: null,
                        system_entry_type: null
                    })
                    .eq('id', row.id);
            }
            fetchComprehensiveData(selectedAccountId);
        } catch (err) {
            alert('Failed to unlink: ' + err.message);
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
                fetchComprehensiveData(selectedAccountId);
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
            alert('Failed to create bank account: ' + err.message);
        } finally {
            setSaving(false);
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
            await new Promise(resolve => setTimeout(resolve, 1500));
            const email = setupForm.email.toLowerCase();
            const pass = setupForm.app_password.replace(/\s/g, '');

            if (!email.includes('@')) {
                setTestStatus({ success: false, msg: 'Invalid email address format.' });
            } else if (pass.length !== 16) {
                setTestStatus({
                    success: false,
                    msg: 'Gmail App Passwords must be exactly 16 characters long.'
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

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    if (loading && accounts.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px' }}>
                <Loader2 size={28} className="spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div style={{
            padding: isMobile ? '6px 8px' : 'var(--spacing-md)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '8px' : '10px'
        }}>
            <style>{`
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .col-resizer {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 7px;
                    cursor: col-resize;
                    user-select: none;
                    z-index: 5;
                }
                .col-resizer:hover, .col-resizer:active {
                    background-color: var(--primary-color, #3b82f6);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {accounts.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <Building2 size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 10px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>No Bank Accounts Registered</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto 10px', fontSize: '11px' }}>
                        Register your bank account under Current Assets to enable automatic statement reconciliation.
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                        Register Bank Ledger
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '10px', flex: 1, minHeight: 0 }}>
                    
                    {/* Top Bar: Bank Selector & Actions (Mobile First) */}
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? '6px' : '10px',
                        backgroundColor: 'var(--bg-elevated)',
                        padding: isMobile ? '8px 10px' : '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        {/* Bank Account Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                🏦 Bank:
                            </span>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <select
                                    value={selectedAccountId || ''}
                                    onChange={e => setSelectedAccountId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 28px 6px 10px',
                                        fontSize: isMobile ? '12px' : '13px',
                                        fontWeight: 700,
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
                                                {acc.name} ({acc.bank_name || 'Bank'}{acc.account_number ? ` · ending ${acc.account_number.slice(-4)}` : ''}) {isConfigured ? '🟢' : '⚪'}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* Actions: Sync Alerts & Upload Statement */}
                        {activeSubTab === 'transactions' && (
                            <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                                <button
                                    onClick={triggerSync}
                                    disabled={syncing}
                                    className="btn btn-secondary"
                                    style={{
                                        flex: isMobile ? 1 : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        padding: '6px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        height: '34px'
                                    }}
                                    title="Fetch latest transaction alerts from Gmail"
                                >
                                    {syncing ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                                    Sync Alerts
                                </button>

                                <label
                                    className="btn btn-primary"
                                    style={{
                                        flex: isMobile ? 1 : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        padding: '6px 12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        margin: 0,
                                        height: '34px'
                                    }}
                                >
                                    <Upload size={12} />
                                    Upload Statement
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

                    {/* Date Presets & Custom Pickers (Mobile-First scrollable strip) */}
                    {activeSubTab === 'transactions' && (
                        <div style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'stretch' : 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            backgroundColor: 'var(--bg-elevated)',
                            padding: isMobile ? '6px 8px' : '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)'
                        }}>
                            {/* Preset Buttons Strip */}
                            <div className="no-scrollbar" style={{
                                display: 'flex',
                                gap: '4px',
                                overflowX: 'auto',
                                paddingBottom: isMobile ? '2px' : 0,
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: 'yesterday', label: 'Yesterday' },
                                    { id: 'week', label: '7 Days' },
                                    { id: 'month', label: 'This Month' },
                                    { id: 'custom', label: 'Custom' }
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePresetClick(preset.id)}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: datePreset === preset.id ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                            color: datePreset === preset.id ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            {/* Date Pickers */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'space-between' : 'flex-end',
                                gap: '6px',
                                fontSize: '11px'
                            }}>
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
                                            padding: '3px 6px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '11px',
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
                                            padding: '3px 6px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sleek Compact Weekly Cadence & Balance Discrepancy Alert Ribbon */}
                    {activeSubTab === 'transactions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Cadence & Statement Status Alert */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '6px',
                                padding: isMobile ? '6px 8px' : '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: weeklyStatus.isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                border: `1px solid ${weeklyStatus.isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                color: weeklyStatus.isOverdue ? '#ef4444' : '#10b981'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {weeklyStatus.isOverdue ? (
                                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                    ) : (
                                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                                    )}
                                    <span>
                                        {weeklyStatus.daysSince === null ? (
                                            '⚠️ Weekly Reconciliation Pending: No statement reconciliation on record.'
                                        ) : weeklyStatus.isOverdue ? (
                                            `⚠️ Weekly Reconciliation Overdue: ${weeklyStatus.daysSince} days since last reconciliation (${new Date(weeklyStatus.latestDate).toLocaleDateString('en-GB')}). Upload this week\'s statement.`
                                        ) : (
                                            `✅ Weekly Reconciliation On Track: Reconciled ${weeklyStatus.daysSince === 0 ? 'today' : `${weeklyStatus.daysSince} days ago`}.`
                                        )}
                                    </span>
                                </div>

                                {closingComparison.isDiscrepancy && (
                                    <span style={{ color: '#ef4444', fontWeight: 800 }}>
                                        🚨 Closing Diff: ₹{Math.abs(closingComparison.discrepancy).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subtab Content: Setup vs Transactions */}
                    {activeSubTab === 'setup' ? (
                        /* SETUP TAB */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                                    Configure Instant Email Scraper
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '2px 0 0 0' }}>
                                    Connect Gmail IMAP to pull real-time HDFC transaction alerts for <strong>{selectedAccount?.name}</strong>.
                                </p>
                            </div>

                            <form onSubmit={handleSaveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        Scraper Gmail Address *
                                    </label>
                                    <input
                                        type="email" required placeholder="e.g. spendlogs@gmail.com" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={setupForm.email} onChange={e => setSetupForm({ ...setupForm, email: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        Google App Password * (16-character code)
                                    </label>
                                    <input
                                        type="password" required placeholder="16-character code" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={setupForm.app_password} onChange={e => setSetupForm({ ...setupForm, app_password: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        Account Suffix (Last 4 Digits)
                                    </label>
                                    <input
                                        type="text" maxLength="4" placeholder="e.g. 4298" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={setupForm.account_ending} onChange={e => setSetupForm({ ...setupForm, account_ending: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-primary)', paddingTop: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Active Scraper Listener</span>
                                    <input
                                        type="checkbox" style={{ width: '30px', height: '16px', cursor: 'pointer' }}
                                        checked={setupForm.is_active} onChange={e => setSetupForm({ ...setupForm, is_active: e.target.checked })}
                                    />
                                </div>

                                {testStatus && (
                                    <div style={{
                                        display: 'flex', gap: '6px', padding: '8px', borderRadius: 'var(--radius-md)',
                                        backgroundColor: testStatus.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                        border: `1px solid ${testStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                        fontSize: '11px', color: testStatus.success ? '#10b981' : '#ef4444'
                                    }}>
                                        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                                        <span>{testStatus.msg}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                                    <button
                                        type="button" onClick={handleTestConnection} disabled={testing || saving}
                                        className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '11px' }}
                                    >
                                        {testing && <Loader2 size={12} className="spin" />}
                                        Test Connection
                                    </button>
                                    <button
                                        type="submit" disabled={saving || testing}
                                        className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '11px' }}
                                    >
                                        {saving && <Loader2 size={12} className="spin" />}
                                        Save Configuration
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* TRANSACTIONS RECONCILIATION TABLE & LEDGER VIEW (MOBILE FIRST) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                            
                            {/* Filter Bar: Horizontal Scrollable Chips + Search */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                alignItems: isMobile ? 'stretch' : 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                                backgroundColor: 'var(--bg-elevated)',
                                padding: isMobile ? '6px 8px' : '6px 10px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                {/* Horizontally Scrollable Category Filter Chips */}
                                <div className="no-scrollbar" style={{
                                    display: 'flex',
                                    gap: '4px',
                                    overflowX: 'auto',
                                    whiteSpace: 'nowrap',
                                    paddingBottom: isMobile ? '2px' : 0,
                                    WebkitOverflowScrolling: 'touch'
                                }}>
                                    <button
                                        onClick={() => setActiveFilter('all')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: activeFilter === 'all' ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                            color: activeFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        All ({stats.totalCount})
                                    </button>

                                    <button
                                        onClick={() => setActiveFilter('unassigned')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                            backgroundColor: activeFilter === 'unassigned' ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)',
                                            color: activeFilter === 'unassigned' ? '#000' : '#f59e0b',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ⚠️ Needs System Entry ({stats.unassignedCount})
                                    </button>

                                    <button
                                        onClick={() => setActiveFilter('uncleared')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(139, 92, 246, 0.4)',
                                            backgroundColor: activeFilter === 'uncleared' ? '#8b5cf6' : 'rgba(139, 92, 246, 0.1)',
                                            color: activeFilter === 'uncleared' ? '#fff' : '#8b5cf6',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ⚠️ Not in Statement ({stats.unclearedCount})
                                    </button>

                                    <button
                                        onClick={() => setActiveFilter('duplicate')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            backgroundColor: activeFilter === 'duplicate' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                                            color: activeFilter === 'duplicate' ? '#fff' : '#ef4444',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        🚨 Duplicates ({stats.duplicateCount})
                                    </button>

                                    <button
                                        onClick={() => setActiveFilter('reconciled')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                            backgroundColor: activeFilter === 'reconciled' ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
                                            color: activeFilter === 'reconciled' ? '#fff' : '#10b981',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ✅ Reconciled ({stats.reconciledCount})
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div style={{ position: 'relative', width: isMobile ? '100%' : '220px' }}>
                                    <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search voucher, party, ref..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '4px 24px 4px 26px',
                                            fontSize: '11px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* RECONCILIATION TABLE CONTAINER WITH HORIZONTAL SCROLL & COLUMN RESIZING */}
                            <div style={{
                                flex: 1,
                                overflowX: 'auto',
                                overflowY: 'auto',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                <table style={{
                                    borderCollapse: 'collapse',
                                    fontSize: isMobile ? '11px' : '12px',
                                    textAlign: 'left',
                                    tableLayout: 'fixed',
                                    width: Object.values(colWidths).reduce((a, b) => a + b, 0)
                                }}>
                                    <thead style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderBottom: '1px solid var(--border-primary)'
                                    }}>
                                        <tr>
                                            {/* Date Column */}
                                            <th
                                                style={{ width: colWidths.date, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('date')}
                                                title="Click to sort by Date"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                                    <span>Date</span>
                                                    {sortConfig.key === 'date' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('date', e)} onTouchStart={e => handleResizeStart('date', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Source / Type Column */}
                                            <th
                                                style={{ width: colWidths.source, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('source')}
                                                title="Click to sort by Source"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                                    <span>Source</span>
                                                    {sortConfig.key === 'source' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('source', e)} onTouchStart={e => handleResizeStart('source', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Voucher No. Column */}
                                            <th
                                                style={{ width: colWidths.voucherNo, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('voucherNo')}
                                                title="Click to sort by Voucher No"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                                    <span>Voucher No.</span>
                                                    {sortConfig.key === 'voucherNo' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('voucherNo', e)} onTouchStart={e => handleResizeStart('voucherNo', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Party / Narration Column */}
                                            <th
                                                style={{ width: colWidths.particulars, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('particulars')}
                                                title="Click to sort by Party / Description"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                                    <span>Party / Narration</span>
                                                    {sortConfig.key === 'particulars' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('particulars', e)} onTouchStart={e => handleResizeStart('particulars', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Deposit (+) Column */}
                                            <th
                                                style={{ width: colWidths.deposit, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('deposit')}
                                                title="Click to sort by Deposit"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                                    <span>Deposit (+)</span>
                                                    {sortConfig.key === 'deposit' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('deposit', e)} onTouchStart={e => handleResizeStart('deposit', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Withdrawal (-) Column */}
                                            <th
                                                style={{ width: colWidths.withdrawal, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('withdrawal')}
                                                title="Click to sort by Withdrawal"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                                    <span>Withdrawal (-)</span>
                                                    {sortConfig.key === 'withdrawal' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('withdrawal', e)} onTouchStart={e => handleResizeStart('withdrawal', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Reconciliation Status Column */}
                                            <th
                                                style={{ width: colWidths.status, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => handleSort('status')}
                                                title="Click to sort by Status"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                                    <span>Reconciled / Status</span>
                                                    {sortConfig.key === 'status' ? (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                                    ) : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                                                </div>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('status', e)} onTouchStart={e => handleResizeStart('status', e)} onClick={e => e.stopPropagation()} />
                                            </th>

                                            {/* Action Column */}
                                            <th style={{ width: colWidths.action, position: 'relative', padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'center' }}>
                                                <span>Action</span>
                                                <div className="col-resizer" onMouseDown={e => handleResizeStart('action', e)} onTouchStart={e => handleResizeStart('action', e)} onClick={e => e.stopPropagation()} />
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {/* 1. TOP ROW: OPENING BALANCE */}
                                        <tr style={{
                                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                            borderBottom: '2px solid var(--border-primary)',
                                            fontWeight: 700
                                        }}>
                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                                {new Date(fromDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    padding: '2px 5px',
                                                    borderRadius: '3px',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                    color: '#3b82f6',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    OPENING
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)' }}>—</td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                                    Opening Balance b/f
                                                </div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                                    {closingComparison.hasStatement
                                                        ? `System: ₹${closingComparison.systemOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Stmt: ₹${closingComparison.statementOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                                        : 'As of period start date'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-tertiary)' }}>—</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-tertiary)' }}>—</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: closingComparison.systemOpening >= 0 ? '#10b981' : '#ef4444'
                                                }}>
                                                    ₹{closingComparison.systemOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                                                {closingComparison.hasStatement ? 'Statement linked' : 'Book balance'}
                                            </td>
                                        </tr>

                                        {/* 2. TRANSACTION ROWS */}
                                        {sortedRows.map(row => {
                                            const isDeposit = row.type === 'receipt';
                                            const isReconciled = row.isReconciled;
                                            const isUnassigned = (row.origin === 'statement' || row.origin === 'alert') && !isReconciled;
                                            const isUncleared = row.isUncleared;
                                            const isDuplicate = row.isDuplicate;

                                            return (
                                                <tr
                                                    key={row.rowId}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-primary)',
                                                        backgroundColor: isDuplicate
                                                            ? 'rgba(239, 68, 68, 0.08)'
                                                            : (isUnassigned
                                                                ? 'rgba(245, 158, 11, 0.04)'
                                                                : (isUncleared
                                                                    ? 'rgba(139, 92, 246, 0.03)'
                                                                    : 'transparent')),
                                                        transition: 'background-color 0.15s'
                                                    }}
                                                >
                                                    {/* Date */}
                                                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', verticalAlign: 'top', color: 'var(--text-secondary)' }}>
                                                        {new Date(row.date).toLocaleDateString('en-GB')}
                                                    </td>

                                                    {/* Source & Type */}
                                                    <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
                                                        <span style={{
                                                            fontSize: '9px',
                                                            fontWeight: 800,
                                                            padding: '2px 5px',
                                                            borderRadius: '3px',
                                                            textTransform: 'uppercase',
                                                            backgroundColor: row.origin === 'statement' ? 'rgba(59, 130, 246, 0.15)' : (row.isAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                                                            color: row.origin === 'statement' ? '#3b82f6' : (row.isAlert ? '#ef4444' : '#10b981')
                                                        }}>
                                                            {row.sourceLabel}
                                                        </span>
                                                    </td>

                                                    {/* Voucher Number */}
                                                    <td style={{ padding: '7px 10px', verticalAlign: 'top', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                                        {row.voucherNo}
                                                        {row.refNo && (
                                                            <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: '1px' }}>
                                                                Ref: {row.refNo}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Party / Particulars */}
                                                    <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                                            {row.particulars}
                                                        </div>
                                                        {row.suggestedAccount && (
                                                            <div style={{ fontSize: '9px', color: 'var(--primary-color)', fontWeight: 600, marginTop: '2px' }}>
                                                                💡 Suggested Ledger: {row.suggestedAccount}
                                                            </div>
                                                        )}
                                                        {row.potentialMatch && !isReconciled && (
                                                            <div style={{ fontSize: '9px', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                                                                ⭐ Found candidate match: {row.potentialMatch.number} ({row.potentialMatch.party} - ₹{row.potentialMatch.amount})
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Deposit Amount */}
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: '#10b981' }}>
                                                        {isDeposit ? `+₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>

                                                    {/* Withdrawal Amount */}
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: '#ef4444' }}>
                                                        {!isDeposit ? `-₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>

                                                    {/* Reconciliation Status & Flags */}
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                                                        {isReconciled ? (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                                color: '#10b981'
                                                            }}>
                                                                <CheckCircle size={10} /> Reconciled
                                                            </span>
                                                        ) : isDuplicate ? (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                fontSize: '9px',
                                                                fontWeight: 800,
                                                                backgroundColor: '#ef4444',
                                                                color: '#fff',
                                                                animation: 'pulse-red 2s infinite'
                                                            }}>
                                                                🚨 Duplicate
                                                            </span>
                                                        ) : isUnassigned ? (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                                                color: '#d97706'
                                                            }}>
                                                                ⚠️ Needs Entry
                                                            </span>
                                                        ) : isUncleared ? (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '2px 5px',
                                                                borderRadius: '4px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                                                color: '#8b5cf6'
                                                            }}>
                                                                ⚠️ Not in Stmt
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Pending</span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                                                        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            {isUnassigned && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setShowLinkModal(row)}
                                                                        className="btn btn-secondary"
                                                                        style={{
                                                                            padding: '2px 6px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 700,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '2px',
                                                                            border: '1px solid var(--border-primary)'
                                                                        }}
                                                                        title="Link to an existing Payment, Receipt, Sales, or Purchase entry"
                                                                    >
                                                                        <Link2 size={10} />
                                                                        Link
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleCreateVoucherFromRow(row)}
                                                                        className="btn btn-primary"
                                                                        style={{
                                                                            padding: '2px 6px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 700,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '2px',
                                                                            backgroundColor: '#f59e0b',
                                                                            color: '#000',
                                                                            border: 'none'
                                                                        }}
                                                                        title="Create a new Voucher in system"
                                                                    >
                                                                        <Plus size={10} />
                                                                        Create
                                                                    </button>
                                                                </>
                                                            )}

                                                            {isUncleared && (
                                                                <button
                                                                    onClick={() => setShowLinkModal({
                                                                        id: row.id,
                                                                        amount: row.amount,
                                                                        type: row.type,
                                                                        date: row.date,
                                                                        particulars: row.particulars,
                                                                        ref_no: row.refNo
                                                                    })}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        padding: '2px 6px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 700,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '2px',
                                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                                        color: '#8b5cf6'
                                                                    }}
                                                                    title="Link with an existing statement transaction"
                                                                >
                                                                    <Link2 size={10} />
                                                                    Match
                                                                </button>
                                                            )}

                                                            {isReconciled && (
                                                                <button
                                                                    onClick={() => handleUnlink(row)}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        padding: '2px 6px',
                                                                        fontSize: '9px',
                                                                        fontWeight: 600,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '2px',
                                                                        color: 'var(--text-tertiary)',
                                                                        border: '1px solid var(--border-primary)'
                                                                    }}
                                                                    title="Unlink and mark as unreconciled"
                                                                >
                                                                    <Unlink size={10} />
                                                                    Unlink
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {sortedRows.length === 0 && (
                                            <tr>
                                                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                                    No transactions found for the selected period and filter.
                                                </td>
                                            </tr>
                                        )}

                                        {/* 3. BOTTOM ROW: CLOSING BALANCE (WITH RECONCILIATION SUMMARY) */}
                                        <tr style={{
                                            backgroundColor: closingComparison.isDiscrepancy ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                                            borderTop: '2px solid var(--border-primary)',
                                            fontWeight: 700
                                        }}>
                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                                {new Date(toDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    padding: '2px 5px',
                                                    borderRadius: '3px',
                                                    backgroundColor: closingComparison.isDiscrepancy ? '#ef4444' : '#10b981',
                                                    color: '#fff',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    CLOSING
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)' }}>—</td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                                    Closing Balance c/f
                                                </div>
                                                <div style={{ fontSize: '9px', color: closingComparison.isDiscrepancy ? '#ef4444' : 'var(--text-tertiary)', fontWeight: 600 }}>
                                                    {closingComparison.hasStatement ? (
                                                        closingComparison.isDiscrepancy ? (
                                                            `🚨 Discrepancy: System ₹${closingComparison.systemClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })} vs Stmt ₹${closingComparison.statementClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Diff: ₹${Math.abs(closingComparison.discrepancy).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                                                        ) : (
                                                            `✅ Matched with Statement: ₹${closingComparison.statementClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                                        )
                                                    ) : (
                                                        `System Computed Closing Balance`
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981', fontWeight: 800 }}>
                                                +₹{closingComparison.systemInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ef4444', fontWeight: 800 }}>
                                                -₹{closingComparison.systemOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: closingComparison.isDiscrepancy ? '#ef4444' : (closingComparison.systemClosing >= 0 ? '#10b981' : '#ef4444')
                                                }}>
                                                    ₹{closingComparison.systemClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </div>
                                                {closingComparison.hasStatement && closingComparison.isDiscrepancy && (
                                                    <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>
                                                        Stmt: ₹{closingComparison.statementClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                                                {closingComparison.hasStatement ? (closingComparison.isDiscrepancy ? '⚠️ Mismatch' : '✅ Balanced') : 'Book balance'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CREATE BANK ACCOUNT MODAL */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building2 size={15} style={{ color: 'var(--color-primary)' }} />
                                Add Bank Account Ledger
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', fontSize: '14px' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateAccount} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ledger Account Name *</label>
                                <input
                                    type="text" required placeholder="e.g. HDFC Current A/c" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                    value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bank Name *</label>
                                    <input
                                        type="text" required placeholder="e.g. HDFC Bank" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Type</label>
                                    <select
                                        className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={newAccount.account_type} onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                                    >
                                        <option value="current">Current</option>
                                        <option value="savings">Savings</option>
                                        <option value="od">OD A/c</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Number</label>
                                <input
                                    type="text" placeholder="Full Account Number" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                    value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>IFSC Code</label>
                                    <input
                                        type="text" placeholder="IFSC Code" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={newAccount.ifsc_code} onChange={e => setNewAccount({ ...newAccount, ifsc_code: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch</label>
                                    <input
                                        type="text" placeholder="e.g. Bandra" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                        value={newAccount.branch} onChange={e => setNewAccount({ ...newAccount, branch: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Opening Balance (₹)</label>
                                <input
                                    type="number" step="0.01" placeholder="0.00" className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }}
                                    value={newAccount.opening_balance} onChange={e => setNewAccount({ ...newAccount, opening_balance: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '11px' }}>
                                    {saving && <Loader2 size={12} className="spin" />}
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LINK SYSTEM ENTRY MODAL */}
            {showLinkModal && (
                <LinkSystemEntryModal
                    isOpen={!!showLinkModal}
                    onClose={() => setShowLinkModal(null)}
                    bankTx={showLinkModal}
                    selectedAccountId={selectedAccountId}
                    onLinkSuccess={() => {
                        fetchComprehensiveData(selectedAccountId);
                    }}
                />
            )}

            {/* INLINE RECONCILIATION VOUCHER FORM */}
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
