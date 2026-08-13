'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
    Coins, 
    Landmark, 
    Calendar, 
    ClipboardList, 
    User, 
    LogOut, 
    Plus, 
    Trash2, 
    CheckCircle, 
    AlertTriangle, 
    FileSpreadsheet, 
    ArrowUpRight, 
    Check, 
    TrendingDown, 
    HelpCircle,
    UserCheck,
    Briefcase
} from 'lucide-react';

export default function NewEraDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, liabilities, schedule, payments
    const [activeMember, setActiveMember] = useState('');
    const [data, setData] = useState({
        members: [],
        loans: [],
        repayments: [],
        payments: [],
        allocations: []
    });

    // Modal control states
    const [showAddLoan, setShowAddLoan] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showAddRepayment, setShowAddRepayment] = useState(false);
    const [showImportRepayments, setShowImportRepayments] = useState(false);

    // Selected loan for specific views (schedules / payments)
    const [selectedLoanId, setSelectedLoanId] = useState('all');

    // Add Loan Form State
    const [loanForm, setLoanForm] = useState({
        name: '',
        lender: '',
        account_number: '',
        loan_type: 'Home Loan',
        principal_amount: '',
        interest_rate_annual: '',
        start_date: new Date().toISOString().split('T')[0],
        tenure_months: '',
        emi_amount: '',
        allocations: [] // array of { member_id: X, share_percentage: Y }
    });

    // Add Repayment Form State
    const [repaymentForm, setRepaymentForm] = useState({
        loan_id: '',
        due_date: new Date().toISOString().split('T')[0],
        installment_number: '',
        expected_amount: '',
        expected_principal: '',
        expected_interest: '',
        notes: ''
    });

    // Add Payment Form State
    const [paymentForm, setPaymentForm] = useState({
        loan_id: '',
        repayment_id: '',
        member_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        principal_portion: '',
        interest_portion: '',
        source_of_income: 'Business',
        notes: ''
    });

    // Excel import state
    const [excelImport, setExcelImport] = useState({
        loan_id: '',
        rows: []
    });

    const fileInputRef = useRef(null);

    // Fetch initial dashboard data
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/newera');
            const result = await res.json();
            if (result.authenticated && !result.needsMember) {
                setActiveMember(result.activeMember);
                setData({
                    members: result.members || [],
                    loans: result.loans || [],
                    repayments: result.repayments || [],
                    payments: result.payments || [],
                    allocations: result.allocations || []
                });

                // Auto initialize member id in forms if members exist
                const defaultMember = result.members.find(m => m.name === result.activeMember);
                if (defaultMember) {
                    setPaymentForm(prev => ({ ...prev, member_id: defaultMember.id }));
                }

                // Set default loan selection to first loan if available
                if (result.loans && result.loans.length > 0) {
                    setLoanForm(prev => {
                        const defaultAllocations = result.members.map(m => ({
                            member_id: m.id,
                            share_percentage: (100 / result.members.length).toFixed(1)
                        }));
                        return { ...prev, allocations: defaultAllocations };
                    });
                }
            }
        } catch (e) {
            console.error('Error fetching dashboard data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Logout trigger
    const handleLogout = async () => {
        if (!confirm('Are you sure you want to exit the dashboard?')) return;
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            const result = await res.json();
            if (result.success) {
                window.location.reload();
            }
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    // Calculate aggregated figures
    const getAggregatedMetrics = () => {
        // Total Principal of active loans
        const totalPrincipal = data.loans
            .filter(l => l.status === 'active')
            .reduce((sum, l) => sum + parseFloat(l.principal_amount), 0);

        // Payments logged
        const totalPayments = data.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalPrincipalPaid = data.payments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
        const totalInterestPaid = data.payments.reduce((sum, p) => sum + parseFloat(p.interest_portion), 0);

        // Calculate current outstanding principal = total principal - total principal paid
        const outstandingPrincipal = totalPrincipal - totalPrincipalPaid;

        // Interest remaining due on schedules
        const unpaidInterestDue = data.repayments
            .filter(r => r.status !== 'paid')
            .reduce((sum, r) => sum + parseFloat(r.expected_interest), 0);

        // Total Outstanding to pay = outstanding principal + unpaid interest due
        const totalOutstandingToPay = Math.max(0, outstandingPrincipal + unpaidInterestDue);

        return {
            totalPrincipal,
            totalPayments,
            totalPrincipalPaid,
            totalInterestPaid,
            outstandingPrincipal: Math.max(0, outstandingPrincipal),
            unpaidInterestDue,
            totalOutstandingToPay
        };
    };

    const metrics = getAggregatedMetrics();

    // Auto calculate payment split when amount is changed
    const handlePaymentAmountChange = (amountVal, loanId, repaymentId) => {
        const amt = parseFloat(amountVal || 0);
        if (amt <= 0) {
            setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: '', interest_portion: '' }));
            return;
        }

        const loan = data.loans.find(l => l.id === loanId);
        if (!loan) {
            setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: amountVal, interest_portion: 0 }));
            return;
        }

        // If linked to schedule item, fetch that item to check expected portions
        const scheduleItem = data.repayments.find(r => r.id === repaymentId);
        if (scheduleItem) {
            const expectedInt = parseFloat(scheduleItem.expected_interest);
            const expectedTotal = parseFloat(scheduleItem.expected_amount);
            
            if (amt >= expectedTotal) {
                // Paid full or excess
                const intPortion = expectedInt;
                const prinPortion = amt - intPortion;
                setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: prinPortion.toFixed(2), interest_portion: intPortion.toFixed(2) }));
            } else {
                // Partial payment - pay interest portion first
                const intPortion = Math.min(expectedInt, amt);
                const prinPortion = amt - intPortion;
                setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: prinPortion.toFixed(2), interest_portion: intPortion.toFixed(2) }));
            }
        } else {
            // Default to 100% principal unless specified
            setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: amountVal, interest_portion: 0 }));
        }
    };

    // Form handlers
    const submitCreateLoan = async (e) => {
        e.preventDefault();
        
        // Validate allocations sum to 100%
        const totalShare = loanForm.allocations.reduce((sum, a) => sum + parseFloat(a.share_percentage || 0), 0);
        if (Math.abs(totalShare - 100) > 0.1) {
            alert(`Total allocation share must equal 100%. Currently it is ${totalShare}%`);
            return;
        }

        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_loan',
                    ...loanForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowAddLoan(false);
                // Reset form
                setLoanForm({
                    name: '',
                    lender: '',
                    account_number: '',
                    loan_type: 'Home Loan',
                    principal_amount: '',
                    interest_rate_annual: '',
                    start_date: new Date().toISOString().split('T')[0],
                    tenure_months: '',
                    emi_amount: '',
                    allocations: data.members.map(m => ({ member_id: m.id, share_percentage: (100 / data.members.length).toFixed(1) }))
                });
                fetchDashboardData();
            } else {
                alert('Error creating loan: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitUpsertRepayment = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upsert_repayment',
                    ...repaymentForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowAddRepayment(false);
                setRepaymentForm({
                    loan_id: '',
                    due_date: new Date().toISOString().split('T')[0],
                    installment_number: '',
                    expected_amount: '',
                    expected_principal: '',
                    expected_interest: '',
                    notes: ''
                });
                fetchDashboardData();
            } else {
                alert('Error adding schedule item: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitLogPayment = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'log_payment',
                    ...paymentForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowAddPayment(false);
                // Keep same member and date as default, reset other fields
                setPaymentForm(prev => ({
                    ...prev,
                    loan_id: '',
                    repayment_id: '',
                    amount: '',
                    principal_portion: '',
                    interest_portion: '',
                    notes: ''
                }));
                fetchDashboardData();
            } else {
                alert('Error logging payment: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteLoan = async (loanId) => {
        if (!confirm('WARNING: Deleting this liability will permanently remove its details, entire repayment schedule, and all associated payment logs. Are you absolutely sure?')) return;
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_loan', loanId })
            });
            const result = await res.json();
            if (result.success) {
                fetchDashboardData();
            } else {
                alert('Error deleting loan: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (!confirm('Are you sure you want to delete this payment log? Outstanding balances will revert.')) return;
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_payment', paymentId })
            });
            const result = await res.json();
            if (result.success) {
                fetchDashboardData();
            } else {
                alert('Error deleting payment log: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteRepayment = async (repaymentId) => {
        if (!confirm('Are you sure you want to delete this installment from the schedule?')) return;
        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_repayment', repaymentId })
            });
            const result = await res.json();
            if (result.success) {
                fetchDashboardData();
            } else {
                alert('Error deleting schedule item: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Excel Parser
    const handleExcelImportChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const dataBytes = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(dataBytes, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Smart header mapper
                const mapRow = (row) => {
                    const findVal = (keys) => {
                        const key = Object.keys(row).find(k => 
                            keys.some(pk => k.toLowerCase().replace(/[\s_-]/g, '') === pk.toLowerCase().replace(/[\s_-]/g, ''))
                        );
                        return key ? row[key] : null;
                    };

                    const rawDate = findVal(['duedate', 'date', 'month', 'period']);
                    let formattedDate = '';
                    if (rawDate) {
                        if (typeof rawDate === 'number') {
                            const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
                            formattedDate = dateObj.toISOString().split('T')[0];
                        } else {
                            try {
                                formattedDate = new Date(rawDate).toISOString().split('T')[0];
                            } catch (err) {
                                formattedDate = String(rawDate);
                            }
                        }
                    }

                    return {
                        due_date: formattedDate || new Date().toISOString().split('T')[0],
                        expected_amount: parseFloat(findVal(['amount', 'expectedamount', 'emi', 'total', 'installment']) || 0),
                        expected_principal: parseFloat(findVal(['principal', 'expectedprincipal', 'prn', 'principalpaid']) || 0),
                        expected_interest: parseFloat(findVal(['interest', 'expectedinterest', 'int', 'interestpaid']) || 0),
                        installment_number: parseInt(findVal(['installmentno', 'srno', 'no', 'number', 'inst']) || null),
                        notes: String(findVal(['notes', 'remark', 'remarks', 'desc']) || '')
                    };
                };

                const mappedRows = jsonData.map(mapRow);
                setExcelImport(prev => ({ ...prev, rows: mappedRows }));
            } catch (err) {
                alert('Failed to parse Excel file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const submitBulkImport = async () => {
        if (!excelImport.loan_id) {
            alert('Please select a target liability first.');
            return;
        }
        if (!excelImport.rows || excelImport.rows.length === 0) {
            alert('No valid rows found to import.');
            return;
        }

        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_import_repayments',
                    loanId: excelImport.loan_id,
                    rows: excelImport.rows
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowImportRepayments(false);
                setExcelImport({ loan_id: '', rows: [] });
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchDashboardData();
            } else {
                alert('Import failed: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate individual member details
    const getMemberStats = () => {
        const memberStats = data.members.map(member => {
            // Find allocations across active loans
            let expectedMonthlyObligation = 0;
            let totalPrincipalObligation = 0;

            data.loans.forEach(loan => {
                if (loan.status === 'active') {
                    const allocation = data.allocations.find(a => a.loan_id === loan.id && a.member_id === member.id);
                    if (allocation) {
                        const percent = parseFloat(allocation.share_percentage) / 100;
                        totalPrincipalObligation += parseFloat(loan.principal_amount) * percent;
                        
                        // If loan has EMI, add share
                        if (loan.emi_amount) {
                            expectedMonthlyObligation += parseFloat(loan.emi_amount) * percent;
                        }
                    }
                }
            });

            // Actual payments logged by this member
            const memberPayments = data.payments.filter(p => p.member_id === member.id);
            const totalPaid = memberPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const principalPaid = memberPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
            const interestPaid = memberPayments.reduce((sum, p) => sum + parseFloat(p.interest_portion), 0);

            return {
                ...member,
                expectedMonthlyObligation,
                totalPrincipalObligation,
                totalPaid,
                principalPaid,
                interestPaid,
                outstandingPrincipalShare: Math.max(0, totalPrincipalObligation - principalPaid)
            };
        });

        return memberStats;
    };

    const memberStats = getMemberStats();

    if (loading) {
        return (
            <div style={styles.loaderContainer}>
                <div style={styles.spinner}></div>
                <span style={styles.loaderText}>LOADING SECURE DATABASE...</span>
            </div>
        );
    }

    return (
        <div style={styles.dashboardWrapper}>
            {/* Header Area */}
            <header style={styles.header}>
                <div style={styles.headerInfo}>
                    <div style={styles.systemBadge}>NEW ERA LIABILITIES</div>
                    <span style={styles.headerTitle}>System Controller</span>
                </div>
                <div style={styles.headerActions}>
                    <div style={styles.userInfo}>
                        <UserCheck size={16} color="#6366f1" />
                        <span style={styles.userName}>{activeMember}</span>
                    </div>
                    <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
                        <LogOut size={16} />
                        <span style={styles.logoutText}>Exit Console</span>
                    </button>
                </div>
            </header>

            {/* Glowing Big Counter Section */}
            <section style={styles.heroSection}>
                <div style={styles.heroGlow}></div>
                <div style={styles.heroContent}>
                    <span style={styles.heroLabel}>TOTAL OUTSTANDING LIABILITY TO PAY</span>
                    <h1 style={styles.heroNumber}>
                        ₹{metrics.totalOutstandingToPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h1>
                    <div style={styles.heroSubmetrics}>
                        <div style={styles.heroSubItem}>
                            <span style={styles.subItemLabel}>Outstanding Principal</span>
                            <span style={styles.subItemValue}>₹{metrics.outstandingPrincipal.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={styles.divider}></div>
                        <div style={styles.heroSubItem}>
                            <span style={styles.subItemLabel}>Unpaid Interest Due</span>
                            <span style={styles.subItemValue}>₹{metrics.unpaidInterestDue.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={styles.divider}></div>
                        <div style={styles.heroSubItem}>
                            <span style={styles.subItemLabel}>Total Paid Till Date</span>
                            <span style={styles.subItemValue}>₹{metrics.totalPayments.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Navigation Tabs */}
            <nav style={styles.navBar}>
                <button 
                    onClick={() => setActiveTab('overview')} 
                    style={{ ...styles.navTab, borderBottomColor: activeTab === 'overview' ? '#6366f1' : 'transparent', color: activeTab === 'overview' ? '#ffffff' : '#94a3b8' }}
                >
                    <Coins size={16} />
                    <span>Overview</span>
                </button>
                <button 
                    onClick={() => setActiveTab('liabilities')} 
                    style={{ ...styles.navTab, borderBottomColor: activeTab === 'liabilities' ? '#6366f1' : 'transparent', color: activeTab === 'liabilities' ? '#ffffff' : '#94a3b8' }}
                >
                    <Landmark size={16} />
                    <span>Liabilities</span>
                </button>
                <button 
                    onClick={() => setActiveTab('schedule')} 
                    style={{ ...styles.navTab, borderBottomColor: activeTab === 'schedule' ? '#6366f1' : 'transparent', color: activeTab === 'schedule' ? '#ffffff' : '#94a3b8' }}
                >
                    <Calendar size={16} />
                    <span>Schedules</span>
                </button>
                <button 
                    onClick={() => setActiveTab('payments')} 
                    style={{ ...styles.navTab, borderBottomColor: activeTab === 'payments' ? '#6366f1' : 'transparent', color: activeTab === 'payments' ? '#ffffff' : '#94a3b8' }}
                >
                    <ClipboardList size={16} />
                    <span>Payment Logs</span>
                </button>
            </nav>

            {/* Content Container */}
            <main style={styles.mainContent}>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div style={styles.tabContentGrid}>
                        {/* Member Share Allocations */}
                        <div style={styles.panelCard}>
                            <h2 style={styles.panelTitle}>Member Liability Allocations</h2>
                            <div style={styles.memberListGrid}>
                                {memberStats.map(member => (
                                    <div key={member.id} style={styles.memberRow}>
                                        <div style={styles.memberRowInfo}>
                                            <div style={styles.memberRowAvatar}>{member.name[0]}</div>
                                            <div>
                                                <div style={styles.memberRowName}>{member.name}</div>
                                                <div style={styles.memberRowSub}>Monthly obligation: ₹{Math.round(member.expectedMonthlyObligation).toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                        <div style={styles.memberRowMetrics}>
                                            <div style={styles.memberRowOut}>₹{Math.round(member.outstandingPrincipalShare).toLocaleString('en-IN')} due</div>
                                            <div style={styles.memberRowPaid}>₹{Math.round(member.totalPaid).toLocaleString('en-IN')} paid</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Payments Logged */}
                        <div style={styles.panelCard}>
                            <div style={styles.panelCardHeader}>
                                <h2 style={styles.panelTitle}>Recent Payments</h2>
                                <button onClick={() => setShowAddPayment(true)} style={styles.actionButton}>
                                    <Plus size={14} /> Log Payment
                                </button>
                            </div>
                            <div style={styles.recentLogsList}>
                                {data.payments.length === 0 ? (
                                    <div style={styles.emptyState}>No payments recorded yet.</div>
                                ) : (
                                    data.payments.slice(0, 5).map(payment => {
                                        const loan = data.loans.find(l => l.id === payment.loan_id);
                                        const member = data.members.find(m => m.id === payment.member_id);
                                        return (
                                            <div key={payment.id} style={styles.recentLogItem}>
                                                <div>
                                                    <div style={styles.recentLogTitle}>{loan ? loan.name : 'Unknown Loan'}</div>
                                                    <div style={styles.recentLogSub}>
                                                        Paid by <strong>{member ? member.name : 'Unknown'}</strong> via {payment.source_of_income} on {payment.payment_date}
                                                    </div>
                                                </div>
                                                <div style={styles.recentLogAmount}>
                                                    + ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Distribution curve */}
                        <div style={{ ...styles.panelCard, gridColumn: 'span 2' }}>
                            <h2 style={styles.panelTitle}>Liability Breakdowns</h2>
                            <div style={styles.breakdownGrid}>
                                {data.loans.filter(l => l.status === 'active').map(loan => {
                                    // Total payments for this loan
                                    const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                                    const paidVal = loanPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                                    const totalExpected = parseFloat(loan.principal_amount);
                                    const progressPercent = Math.min(100, (paidVal / totalExpected) * 100);

                                    return (
                                        <div key={loan.id} style={styles.breakdownItem}>
                                            <div style={styles.breakdownHeader}>
                                                <div>
                                                    <span style={styles.breakdownName}>{loan.name}</span>
                                                    <span style={styles.breakdownLender}> ({loan.lender})</span>
                                                </div>
                                                <span style={styles.breakdownPercent}>{progressPercent.toFixed(1)}% Paid</span>
                                            </div>
                                            <div style={styles.progressBarBg}>
                                                <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }}></div>
                                            </div>
                                            <div style={styles.breakdownDetails}>
                                                <span>Paid: ₹{paidVal.toLocaleString('en-IN')}</span>
                                                <span>Total: ₹{totalExpected.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {data.loans.filter(l => l.status === 'active').length === 0 && (
                                    <div style={{ ...styles.emptyState, width: '100%' }}>No active liabilities added yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* LIABILITIES TAB */}
                {activeTab === 'liabilities' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow}>
                            <h2 style={styles.panelTitle}>Active Loans & Accounts Payable</h2>
                            <button onClick={() => setShowAddLoan(true)} style={styles.primaryActionButton}>
                                <Plus size={16} /> Add Liability
                            </button>
                        </div>

                        <div style={styles.loansContainer}>
                            {data.loans.length === 0 ? (
                                <div style={styles.bigEmptyState}>
                                    <Landmark size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                    <h3>No Liabilities Logged</h3>
                                    <p>Start tracking by adding your first home loan, OD, vendor payable, or personal market loan.</p>
                                </div>
                            ) : (
                                <div style={styles.loansGrid}>
                                    {data.loans.map(loan => {
                                        const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                                        const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
                                        const outstanding = Math.max(0, parseFloat(loan.principal_amount) - paidPrincipal);
                                        const loanAllocations = data.allocations.filter(a => a.loan_id === loan.id);

                                        return (
                                            <div key={loan.id} style={styles.loanCard}>
                                                <div style={styles.loanCardHeader}>
                                                    <div>
                                                        <span style={styles.loanBadge}>{loan.loan_type}</span>
                                                        <h3 style={styles.loanCardTitle}>{loan.name}</h3>
                                                        <span style={styles.loanCardLender}>Supplier/Lender: <strong>{loan.lender}</strong></span>
                                                    </div>
                                                    <button onClick={() => handleDeleteLoan(loan.id)} style={styles.iconDeleteBtn} title="Delete Loan">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div style={styles.loanCardDetailsGrid}>
                                                    <div style={styles.detailBox}>
                                                        <span style={styles.detailLabel}>Account Number</span>
                                                        <span style={styles.detailVal}>{loan.account_number || 'N/A'}</span>
                                                    </div>
                                                    <div style={styles.detailBox}>
                                                        <span style={styles.detailLabel}>Interest Rate</span>
                                                        <span style={styles.detailVal}>{loan.interest_rate_annual}% p.a.</span>
                                                    </div>
                                                    <div style={styles.detailBox}>
                                                        <span style={styles.detailLabel}>Principal Borrowed</span>
                                                        <span style={styles.detailVal}>₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div style={styles.detailBox}>
                                                        <span style={styles.detailLabel}>Remaining Principal</span>
                                                        <span style={styles.detailVal} style={{ color: '#818cf8', fontWeight: '700' }}>
                                                            ₹{outstanding.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Member Shares */}
                                                <div style={styles.loanCardShares}>
                                                    <span style={styles.sharesTitle}>Member Payments Distribution:</span>
                                                    <div style={styles.sharesGrid}>
                                                        {loanAllocations.map(alloc => {
                                                            const m = data.members.find(member => member.id === alloc.member_id);
                                                            return (
                                                                <div key={alloc.id} style={styles.shareBadge}>
                                                                    <span>{m ? m.name : 'Unknown'}:</span>
                                                                    <strong>{alloc.share_percentage}%</strong>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SCHEDULES TAB */}
                {activeTab === 'schedule' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow}>
                            <div style={styles.titleWithFilter}>
                                <h2 style={styles.panelTitle}>Repayment Schedules</h2>
                                <select 
                                    value={selectedLoanId} 
                                    onChange={(e) => setSelectedLoanId(e.target.value)}
                                    style={styles.filterDropdown}
                                >
                                    <option value="all">All Liabilities</option>
                                    {data.loans.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.tabActions}>
                                <button onClick={() => setShowImportRepayments(true)} style={styles.secondaryActionButton}>
                                    <FileSpreadsheet size={16} /> Import Excel
                                </button>
                                <button onClick={() => {
                                    if (data.loans.length === 0) {
                                        alert('Please add a liability first.');
                                        return;
                                    }
                                    setRepaymentForm(prev => ({ ...prev, loan_id: data.loans[0].id }));
                                    setShowAddRepayment(true);
                                }} style={styles.primaryActionButton}>
                                    <Plus size={16} /> Add Installment
                                </button>
                            </div>
                        </div>

                        {/* Repayments Schedule List */}
                        <div style={styles.scheduleTableWrapper}>
                            {data.repayments.filter(r => selectedLoanId === 'all' || r.loan_id === selectedLoanId).length === 0 ? (
                                <div style={styles.bigEmptyState}>
                                    <Calendar size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                    <h3>No Scheduled Repayments</h3>
                                    <p>Add manual installments on-the-go or upload a bank amortization sheet via Excel import.</p>
                                </div>
                            ) : (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Liability</th>
                                            <th>Due Date</th>
                                            <th>Installment #</th>
                                            <th>Expected Amount</th>
                                            <th>Principal Portion</th>
                                            <th>Interest Portion</th>
                                            <th>Status</th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.repayments
                                            .filter(r => selectedLoanId === 'all' || r.loan_id === selectedLoanId)
                                            .map(repayment => {
                                                const loan = data.loans.find(l => l.id === repayment.loan_id);
                                                return (
                                                    <tr key={repayment.id}>
                                                        <td><strong>{loan ? loan.name : 'Unknown'}</strong></td>
                                                        <td>{repayment.due_date}</td>
                                                        <td>{repayment.installment_number || 'Custom'}</td>
                                                        <td>₹{parseFloat(repayment.expected_amount).toLocaleString('en-IN')}</td>
                                                        <td>₹{parseFloat(repayment.expected_principal).toLocaleString('en-IN')}</td>
                                                        <td>₹{parseFloat(repayment.expected_interest).toLocaleString('en-IN')}</td>
                                                        <td>
                                                            <span style={{
                                                                ...styles.statusBadge,
                                                                backgroundColor: repayment.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : repayment.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: repayment.status === 'paid' ? '#10b981' : repayment.status === 'partially_paid' ? '#f59e0b' : '#ef4444',
                                                                borderColor: repayment.status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : repayment.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                                                            }}>
                                                                {repayment.status.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td><span style={styles.tableNotes}>{repayment.notes || '—'}</span></td>
                                                        <td>
                                                            <div style={styles.tableActionsRow}>
                                                                <button 
                                                                    onClick={() => {
                                                                        const activeM = data.members.find(m => m.name === activeMember);
                                                                        setPaymentForm({
                                                                            loan_id: repayment.loan_id,
                                                                            repayment_id: repayment.id,
                                                                            member_id: activeM ? activeM.id : '',
                                                                            payment_date: new Date().toISOString().split('T')[0],
                                                                            amount: repayment.expected_amount,
                                                                            principal_portion: repayment.expected_principal,
                                                                            interest_portion: repayment.expected_interest,
                                                                            source_of_income: 'Business',
                                                                            notes: `Repayment of installment #${repayment.installment_number}`
                                                                        });
                                                                        setShowAddPayment(true);
                                                                    }} 
                                                                    style={styles.payScheduleBtn} 
                                                                    disabled={repayment.status === 'paid'}
                                                                >
                                                                    Log Pay
                                                                </button>
                                                                <button onClick={() => handleDeleteRepayment(repayment.id)} style={styles.deleteRowBtn}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* PAYMENTS LOG TAB */}
                {activeTab === 'payments' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow}>
                            <h2 style={styles.panelTitle}>Payment History Logs</h2>
                            <button onClick={() => {
                                if (data.loans.length === 0) {
                                    alert('Please add a liability first.');
                                    return;
                                }
                                const firstLoan = data.loans[0];
                                const activeM = data.members.find(m => m.name === activeMember);
                                setPaymentForm(prev => ({
                                    ...prev,
                                    loan_id: firstLoan.id,
                                    member_id: activeM ? activeM.id : '',
                                    repayment_id: ''
                                }));
                                setShowAddPayment(true);
                            }} style={styles.primaryActionButton}>
                                <Plus size={16} /> Log Repayment Entry
                            </button>
                        </div>

                        {/* Payments list table */}
                        <div style={styles.scheduleTableWrapper}>
                            {data.payments.length === 0 ? (
                                <div style={styles.bigEmptyState}>
                                    <ClipboardList size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                    <h3>No Payments Recorded</h3>
                                    <p>Log a payment to start recording member contributions, principal offsets, and interest paydowns.</p>
                                </div>
                            ) : (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Liability</th>
                                            <th>Payment Date</th>
                                            <th>Paid By</th>
                                            <th>Source of Income</th>
                                            <th>Total Paid</th>
                                            <th>Principal Paid</th>
                                            <th>Interest Paid</th>
                                            <th>Notes</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.payments.map(payment => {
                                            const loan = data.loans.find(l => l.id === payment.loan_id);
                                            const member = data.members.find(m => m.id === payment.member_id);
                                            return (
                                                <tr key={payment.id}>
                                                    <td><strong>{loan ? loan.name : 'Unknown'}</strong></td>
                                                    <td>{payment.payment_date}</td>
                                                    <td>
                                                        <span style={styles.tableMember}>
                                                            {member ? member.name : 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td><span style={styles.sourceIncomeBadge}>{payment.source_of_income}</span></td>
                                                    <td><strong style={{ color: '#10b981' }}>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</strong></td>
                                                    <td>₹{parseFloat(payment.principal_portion).toLocaleString('en-IN')}</td>
                                                    <td>₹{parseFloat(payment.interest_portion).toLocaleString('en-IN')}</td>
                                                    <td><span style={styles.tableNotes}>{payment.notes || '—'}</span></td>
                                                    <td>
                                                        <button onClick={() => handleDeletePayment(payment.id)} style={styles.deleteRowBtn}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* MODALS */}

            {/* 1. Add Liability Modal */}
            {showAddLoan && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Add Liability Account</h3>
                            <button onClick={() => setShowAddLoan(false)} style={styles.closeModalBtn}>×</button>
                        </div>
                        <form onSubmit={submitCreateLoan} style={styles.modalForm}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Liability Account Name</label>
                                    <input 
                                        type="text" 
                                        value={loanForm.name} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. ICICI Home Loan, Vendor A Payable"
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Supplier / Lender</label>
                                    <input 
                                        type="text" 
                                        value={loanForm.lender} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, lender: e.target.value }))}
                                        placeholder="e.g. ICICI Bank, Mukesh Kumar (Market)"
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Account Number / Reference</label>
                                    <input 
                                        type="text" 
                                        value={loanForm.account_number} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, account_number: e.target.value }))}
                                        placeholder="e.g. 501004882103"
                                        style={styles.formInput} 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Liability Category</label>
                                    <select 
                                        value={loanForm.loan_type} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, loan_type: e.target.value }))}
                                        style={styles.formSelect}
                                    >
                                        <option value="Home Loan">Home Loan</option>
                                        <option value="Bank OD">Bank Overdraft (OD)</option>
                                        <option value="Business Loan (Bank)">Business Loan (Bank)</option>
                                        <option value="Business Loan (Market)">Business Loan (Market Vendor)</option>
                                        <option value="Vendor Payable (Goods)">Vendor Payable (Goods)</option>
                                        <option value="Other">Other Liability</option>
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Principal / Borrowed Amount</label>
                                    <input 
                                        type="number" 
                                        value={loanForm.principal_amount} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, principal_amount: e.target.value }))}
                                        placeholder="₹"
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Annual Interest Rate (%)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={loanForm.interest_rate_annual} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, interest_rate_annual: e.target.value }))}
                                        placeholder="%"
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Start Date</label>
                                    <input 
                                        type="date" 
                                        value={loanForm.start_date} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, start_date: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Tenure (Months) — Optional</label>
                                    <input 
                                        type="number" 
                                        value={loanForm.tenure_months} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, tenure_months: e.target.value }))}
                                        placeholder="For auto-amortization schedule"
                                        style={styles.formInput} 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Monthly EMI Amount — Optional</label>
                                    <input 
                                        type="number" 
                                        value={loanForm.emi_amount} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, emi_amount: e.target.value }))}
                                        placeholder="₹"
                                        style={styles.formInput} 
                                    />
                                </div>
                            </div>

                            {/* Member allocations */}
                            <div style={styles.modalSection}>
                                <h4 style={styles.modalSectionTitle}>Manage Who Pays How Much (Share %)</h4>
                                <div style={styles.allocationRowGrid}>
                                    {loanForm.allocations.map((alloc, index) => {
                                        const memberName = data.members.find(m => m.id === alloc.member_id)?.name || 'Unknown';
                                        return (
                                            <div key={alloc.member_id} style={styles.allocRow}>
                                                <span style={styles.allocName}>{memberName}</span>
                                                <input 
                                                    type="number" 
                                                    value={alloc.share_percentage}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setLoanForm(prev => {
                                                            const newAllocs = [...prev.allocations];
                                                            newAllocs[index].share_percentage = val;
                                                            return { ...prev, allocations: newAllocs };
                                                        });
                                                    }}
                                                    placeholder="%"
                                                    style={styles.allocInput}
                                                    required
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={styles.allocationHelp}>
                                    Allocations must equal exactly 100%. Equal split is pre-filled.
                                </div>
                            </div>

                            <button type="submit" style={styles.modalSubmitBtn}>Save Liability Account</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Add Repayment Installment Modal */}
            {showAddRepayment && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} style={{ ...styles.modalContent, maxWidth: '450px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Add Due Repayment Item</h3>
                            <button onClick={() => setShowAddRepayment(false)} style={styles.closeModalBtn}>×</button>
                        </div>
                        <form onSubmit={submitUpsertRepayment} style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Select Liability Account</label>
                                <select 
                                    value={repaymentForm.loan_id} 
                                    onChange={e => setRepaymentForm(prev => ({ ...prev, loan_id: e.target.value }))}
                                    style={styles.formSelect}
                                    required
                                >
                                    {data.loans.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Due Date</label>
                                <input 
                                    type="date" 
                                    value={repaymentForm.due_date} 
                                    onChange={e => setRepaymentForm(prev => ({ ...prev, due_date: e.target.value }))}
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Installment Number (Optional)</label>
                                <input 
                                    type="number" 
                                    value={repaymentForm.installment_number} 
                                    onChange={e => setRepaymentForm(prev => ({ ...prev, installment_number: e.target.value }))}
                                    placeholder="e.g. 5"
                                    style={styles.formInput} 
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Expected Due Amount</label>
                                <input 
                                    type="number" 
                                    value={repaymentForm.expected_amount} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setRepaymentForm(prev => ({
                                            ...prev,
                                            expected_amount: val,
                                            expected_principal: val, // auto set principal
                                            expected_interest: 0    // auto set interest
                                        }));
                                    }}
                                    placeholder="₹"
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Principal Component</label>
                                    <input 
                                        type="number" 
                                        value={repaymentForm.expected_principal} 
                                        onChange={e => setRepaymentForm(prev => ({ ...prev, expected_principal: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Interest Component</label>
                                    <input 
                                        type="number" 
                                        value={repaymentForm.expected_interest} 
                                        onChange={e => setRepaymentForm(prev => ({ ...prev, expected_interest: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Notes</label>
                                <input 
                                    type="text" 
                                    value={repaymentForm.notes} 
                                    onChange={e => setRepaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="e.g. Balloon payment, delayed interest"
                                    style={styles.formInput} 
                                />
                            </div>
                            <button type="submit" style={styles.modalSubmitBtn}>Create Installment</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Log Repayment Payment Modal */}
            {showAddPayment && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} style={{ ...styles.modalContent, maxWidth: '480px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Log Repayment Entry</h3>
                            <button onClick={() => setShowAddPayment(false)} style={styles.closeModalBtn}>×</button>
                        </div>
                        <form onSubmit={submitLogPayment} style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Select Liability Account</label>
                                <select 
                                    value={paymentForm.loan_id} 
                                    onChange={e => {
                                        const lid = e.target.value;
                                        setPaymentForm(prev => ({ ...prev, loan_id: lid, repayment_id: '' }));
                                    }}
                                    style={styles.formSelect}
                                    required
                                >
                                    <option value="">-- Choose Liability --</option>
                                    {data.loans.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Link to Schedule Installment (Optional)</label>
                                <select 
                                    value={paymentForm.repayment_id} 
                                    onChange={e => {
                                        const repId = e.target.value;
                                        const repItem = data.repayments.find(r => r.id === repId);
                                        if (repItem) {
                                            setPaymentForm(prev => ({ ...prev, repayment_id: repId }));
                                            handlePaymentAmountChange(repItem.expected_amount, paymentForm.loan_id, repId);
                                        } else {
                                            setPaymentForm(prev => ({ ...prev, repayment_id: repId }));
                                        }
                                    }}
                                    style={styles.formSelect}
                                >
                                    <option value="">-- Direct Payment (Not Linked) --</option>
                                    {data.repayments
                                        .filter(r => r.loan_id === paymentForm.loan_id && r.status !== 'paid')
                                        .map(r => (
                                            <option key={r.id} value={r.id}>
                                                Due {r.due_date} — Inst #{r.installment_number || 'Custom'} (₹{parseFloat(r.expected_amount).toLocaleString('en-IN')})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Paying Member</label>
                                <select 
                                    value={paymentForm.member_id} 
                                    onChange={e => setPaymentForm(prev => ({ ...prev, member_id: e.target.value }))}
                                    style={styles.formSelect}
                                    required
                                >
                                    {data.members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Payment Date</label>
                                <input 
                                    type="date" 
                                    value={paymentForm.payment_date} 
                                    onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Amount Paid</label>
                                <input 
                                    type="number" 
                                    value={paymentForm.amount} 
                                    onChange={e => handlePaymentAmountChange(e.target.value, paymentForm.loan_id, paymentForm.repayment_id)}
                                    placeholder="₹"
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Principal Component</label>
                                    <input 
                                        type="number" 
                                        value={paymentForm.principal_portion} 
                                        onChange={e => setPaymentForm(prev => ({ ...prev, principal_portion: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Interest Component</label>
                                    <input 
                                        type="number" 
                                        value={paymentForm.interest_portion} 
                                        onChange={e => setPaymentForm(prev => ({ ...prev, interest_portion: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Source of Income</label>
                                <select 
                                    value={paymentForm.source_of_income} 
                                    onChange={e => setPaymentForm(prev => ({ ...prev, source_of_income: e.target.value }))}
                                    style={styles.formSelect}
                                    required
                                >
                                    <option value="Business">Business</option>
                                    <option value="Salary">Salary</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Dividends / Equity">Dividends / Equity</option>
                                    <option value="Rental Income">Rental Income</option>
                                    <option value="Personal Savings">Personal Savings</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Transaction Notes</label>
                                <input 
                                    type="text" 
                                    value={paymentForm.notes} 
                                    onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Transaction ID, source accounts etc."
                                    style={styles.formInput} 
                                />
                            </div>

                            <button type="submit" style={styles.modalSubmitBtn}>Confirm Repayment Entry</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Import Repayments Modal */}
            {showImportRepayments && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} style={{ ...styles.modalContent, maxWidth: '550px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Import Repayments Schedule</h3>
                            <button onClick={() => setShowImportRepayments(false)} style={styles.closeModalBtn}>×</button>
                        </div>
                        <div style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Select Liability Account</label>
                                <select 
                                    value={excelImport.loan_id} 
                                    onChange={e => setExcelImport(prev => ({ ...prev, loan_id: e.target.value }))}
                                    style={styles.formSelect}
                                    required
                                >
                                    <option value="">-- Choose Target Account --</option>
                                    {data.loans.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Upload Excel / CSV File</label>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={handleExcelImportChange}
                                    style={styles.fileInput} 
                                />
                            </div>

                            {excelImport.rows.length > 0 && (
                                <div style={styles.importPreview}>
                                    <div style={styles.importPreviewHeader}>
                                        Mapped <strong>{excelImport.rows.length}</strong> rows from Excel.
                                    </div>
                                    <div style={styles.importPreviewTableWrapper}>
                                        <table style={styles.miniTable}>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Principal</th>
                                                    <th>Interest</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelImport.rows.slice(0, 5).map((r, i) => (
                                                    <tr key={i}>
                                                        <td>{r.due_date}</td>
                                                        <td>₹{r.expected_amount}</td>
                                                        <td>₹{r.expected_principal}</td>
                                                        <td>₹{r.expected_interest}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {excelImport.rows.length > 5 && (
                                            <div style={styles.miniTableMore}>
                                                ... and {excelImport.rows.length - 5} more rows
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={styles.importGuidelines}>
                                <strong>Excel Format Guidelines:</strong>
                                <ul>
                                    <li>Columns matched automatically: <em>Due Date (or Date), Expected Amount (or EMI), Principal, Interest, Notes</em></li>
                                    <li>Excel dates and plain numbers are fully supported.</li>
                                </ul>
                            </div>

                            <button 
                                onClick={submitBulkImport} 
                                disabled={!excelImport.loan_id || excelImport.rows.length === 0}
                                style={{
                                    ...styles.modalSubmitBtn,
                                    opacity: (!excelImport.loan_id || excelImport.rows.length === 0) ? 0.6 : 1,
                                    cursor: (!excelImport.loan_id || excelImport.rows.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Import Schedule into Database
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    loaderContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#94a3b8'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(99, 102, 241, 0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
    },
    loaderText: {
        fontSize: '0.8rem',
        letterSpacing: '0.2em',
        fontWeight: '700'
    },
    dashboardWrapper: {
        minHeight: '100vh',
        padding: '2rem 1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    headerInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    },
    systemBadge: {
        fontSize: '0.7rem',
        fontWeight: '900',
        letterSpacing: '0.1em',
        color: '#6366f1',
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#ffffff'
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(99, 102, 241, 0.1)',
        padding: '0.4rem 0.8rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(99, 102, 241, 0.2)'
    },
    userName: {
        fontSize: '0.875rem',
        fontWeight: '700',
        color: '#ffffff'
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'color 0.2s',
        padding: '0.4rem'
    },
    logoutText: {
        // Hidden on small screens, shown on desktop
        '@media (max-width: 600px)': {
            display: 'none'
        }
    },
    heroSection: {
        position: 'relative',
        background: 'radial-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(9, 12, 21, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        overflow: 'hidden',
        boxShadow: '0 15px 30px rgba(0,0,0,0.3)'
    },
    heroGlow: {
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
        top: '-100px',
        right: '-50px',
        borderRadius: '50%'
    },
    heroContent: {
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '0.75rem'
    },
    heroLabel: {
        fontSize: '0.8rem',
        fontWeight: '800',
        letterSpacing: '0.15em',
        color: '#94a3b8'
    },
    heroNumber: {
        fontSize: '3rem',
        fontWeight: '900',
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '0.5rem 0',
        // Text shadow simulation for glow
        textShadow: '0 0 40px rgba(99, 102, 241, 0.25)',
        '@media (max-width: 600px)': {
            fontSize: '1.8rem'
        }
    },
    heroSubmetrics: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        marginTop: '1rem',
        width: '100%'
    },
    heroSubItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    },
    subItemLabel: {
        fontSize: '0.75rem',
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    subItemValue: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#f1f5f9'
    },
    divider: {
        width: '1px',
        height: '24px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        '@media (max-width: 600px)': {
            display: 'none'
        }
    },
    navBar: {
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: '1.5rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '2px',
        // Mobile bottom navigation bar layout adjustments if needed
        '@media (max-width: 600px)': {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#0f172a',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            justifyContent: 'space-around',
            padding: '0.5rem 0',
            zIndex: 100,
            gap: 0
        }
    },
    navTab: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        padding: '0.75rem 0.5rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '600',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        '@media (max-width: 600px)': {
            flexDirection: 'column',
            gap: '0.2rem',
            fontSize: '0.75rem',
            padding: '0.25rem 0',
            borderBottom: 'none'
        }
    },
    mainContent: {
        paddingBottom: '4rem' // spacer for mobile bottom bar
    },
    tabContentGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        '@media (max-width: 800px)': {
            gridTemplateColumns: '1fr'
        }
    },
    tabContentSingle: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    panelCard: {
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
    },
    panelCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
    },
    panelTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#ffffff'
    },
    tabHeaderRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    titleWithFilter: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
    },
    filterDropdown: {
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '0.35rem 0.75rem',
        color: '#ffffff',
        outline: 'none',
        fontSize: '0.85rem'
    },
    tabActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    },
    primaryActionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.5rem 1rem',
        fontWeight: '700',
        fontSize: '0.875rem',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)'
    },
    secondaryActionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(255,255,255,0.06)',
        color: '#cbd5e1',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '0.5rem 1rem',
        fontWeight: '700',
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        background: 'rgba(99, 102, 241, 0.1)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '0.5rem',
        padding: '0.35rem 0.75rem',
        fontSize: '0.8rem',
        fontWeight: '700',
        cursor: 'pointer'
    },
    memberListGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginTop: '1rem'
    },
    memberRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)'
    },
    memberRowInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    },
    memberRowAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: '#334155',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '0.95rem'
    },
    memberRowName: {
        fontWeight: '700',
        color: '#f1f5f9',
        fontSize: '0.9rem'
    },
    memberRowSub: {
        fontSize: '0.75rem',
        color: '#64748b'
    },
    memberRowMetrics: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.15rem'
    },
    memberRowOut: {
        fontWeight: '700',
        fontSize: '0.9rem',
        color: '#818cf8'
    },
    memberRowPaid: {
        fontSize: '0.75rem',
        color: '#10b981'
    },
    recentLogsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginTop: '1rem'
    },
    recentLogItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)'
    },
    recentLogTitle: {
        fontWeight: '700',
        color: '#f1f5f9',
        fontSize: '0.875rem'
    },
    recentLogSub: {
        fontSize: '0.75rem',
        color: '#64748b',
        marginTop: '0.15rem'
    },
    recentLogAmount: {
        color: '#10b981',
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    emptyState: {
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem'
    },
    breakdownGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.25rem',
        marginTop: '1rem',
        '@media (max-width: 600px)': {
            gridTemplateColumns: '1fr'
        }
    },
    breakdownItem: {
        padding: '1rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.04)'
    },
    breakdownHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
    },
    breakdownName: {
        fontWeight: '700',
        color: '#ffffff',
        fontSize: '0.9rem'
    },
    breakdownLender: {
        color: '#64748b',
        fontSize: '0.75rem'
    },
    breakdownPercent: {
        fontSize: '0.8rem',
        fontWeight: '700',
        color: '#6366f1'
    },
    progressBarBg: {
        height: '6px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
        borderRadius: '3px'
    },
    breakdownDetails: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#64748b',
        marginTop: '0.35rem'
    },
    loansGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        '@media (max-width: 800px)': {
            gridTemplateColumns: '1fr'
        }
    },
    loanCard: {
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    loanCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    loanBadge: {
        background: 'rgba(99, 102, 241, 0.1)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        fontSize: '0.7rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.25rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        display: 'inline-block',
        marginBottom: '0.4rem'
    },
    loanCardTitle: {
        fontSize: '1.15rem',
        color: '#ffffff',
        fontWeight: '800'
    },
    loanCardLender: {
        fontSize: '0.75rem',
        color: '#64748b',
        marginTop: '0.15rem',
        display: 'block'
    },
    iconDeleteBtn: {
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        opacity: 0.6,
        cursor: 'pointer',
        padding: '0.25rem',
        transition: 'opacity 0.2s',
        ':hover': { opacity: 1 }
    },
    loanCardDetailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        background: 'rgba(0,0,0,0.1)',
        padding: '1rem',
        borderRadius: '0.75rem'
    },
    detailBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem'
    },
    detailLabel: {
        fontSize: '0.7rem',
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    detailVal: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#f1f5f9'
    },
    loanCardShares: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '0.75rem'
    },
    sharesTitle: {
        fontSize: '0.75rem',
        color: '#64748b',
        fontWeight: '700'
    },
    sharesGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem'
    },
    shareBadge: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        fontSize: '0.75rem',
        display: 'flex',
        gap: '0.25rem',
        color: '#cbd5e1'
    },
    scheduleTableWrapper: {
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        overflowX: 'auto',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        fontSize: '0.85rem'
    },
    tableHeader: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    tableNotes: {
        color: '#64748b',
        fontSize: '0.8rem',
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block'
    },
    tableMember: {
        fontWeight: '700',
        color: '#cbd5e1'
    },
    sourceIncomeBadge: {
        background: 'rgba(255,255,255,0.05)',
        padding: '0.15rem 0.4rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        color: '#cbd5e1'
    },
    tableActionsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    payScheduleBtn: {
        background: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '0.25rem',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        cursor: 'pointer',
        ':disabled': {
            background: 'rgba(255,255,255,0.05)',
            color: '#475569',
            cursor: 'not-allowed'
        }
    },
    deleteRowBtn: {
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        opacity: 0.6,
        cursor: 'pointer',
        padding: '0.25rem'
    },
    bigEmptyState: {
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
    },
    modalContent: {
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column'
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    modalTitle: {
        fontSize: '1.15rem',
        fontWeight: '800',
        color: '#ffffff'
    },
    closeModalBtn: {
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        fontSize: '1.75rem',
        cursor: 'pointer',
        lineHeight: 1
    },
    modalForm: {
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        '@media (max-width: 600px)': {
            gridTemplateColumns: '1fr'
        }
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
    },
    formLabel: {
        fontSize: '0.75rem',
        fontWeight: '700',
        color: '#a5b4fc',
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
    },
    formInput: {
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '0.65rem 0.85rem',
        color: '#ffffff',
        outline: 'none',
        fontSize: '0.9rem',
        transition: 'border-color 0.2s',
        ':focus': { borderColor: '#6366f1' }
    },
    formSelect: {
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.5rem',
        padding: '0.65rem 0.85rem',
        color: '#ffffff',
        outline: 'none',
        fontSize: '0.9rem'
    },
    modalSection: {
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '1rem',
        marginTop: '0.5rem'
    },
    modalSectionTitle: {
        fontSize: '0.8rem',
        fontWeight: '800',
        color: '#a5b4fc',
        textTransform: 'uppercase',
        marginBottom: '0.75rem'
    },
    allocationRowGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
        '@media (max-width: 600px)': {
            gridTemplateColumns: '1fr'
        }
    },
    allocRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem'
    },
    allocName: {
        fontSize: '0.85rem',
        fontWeight: '600'
    },
    allocInput: {
        width: '60px',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.35rem',
        padding: '0.25rem 0.4rem',
        color: '#ffffff',
        textAlign: 'center',
        fontSize: '0.85rem'
    },
    allocationHelp: {
        fontSize: '0.7rem',
        color: '#64748b',
        marginTop: '0.5rem',
        textAlign: 'right'
    },
    modalSubmitBtn: {
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.875rem',
        color: '#ffffff',
        fontWeight: '700',
        fontSize: '0.9rem',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        marginTop: '0.5rem'
    },
    fileInput: {
        color: '#94a3b8',
        fontSize: '0.85rem'
    },
    importPreview: {
        marginTop: '1rem',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '0.5rem',
        padding: '1rem',
        border: '1px solid rgba(255,255,255,0.05)'
    },
    importPreviewHeader: {
        fontSize: '0.85rem',
        color: '#cbd5e1',
        marginBottom: '0.5rem'
    },
    miniTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.75rem',
        textAlign: 'left'
    },
    miniTableMore: {
        fontSize: '0.7rem',
        color: '#64748b',
        marginTop: '0.5rem',
        textAlign: 'center'
    },
    importGuidelines: {
        fontSize: '0.75rem',
        color: '#64748b',
        background: 'rgba(255,255,255,0.01)',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginTop: '0.5rem'
    },
    statusBadge: {
        border: '1px solid',
        fontSize: '0.7rem',
        padding: '0.15rem 0.4rem',
        borderRadius: '0.25rem',
        fontWeight: '700',
        display: 'inline-block'
    }
};

// Global styles inject for the table borders & hover states
if (typeof window !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        th, td {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            white-space: nowrap;
        }
        tr:hover {
            background-color: rgba(255,255,255,0.01);
        }
        th {
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            background-color: rgba(255,255,255,0.01);
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleEl);
}
