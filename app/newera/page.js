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
    Briefcase,
    List,
    FileText,
    Upload,
    Edit,
    LayoutGrid,
    Table,
    Eye
} from 'lucide-react';

export default function NewEraDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, liabilities, schedule, payments, interactions
    const [activeMember, setActiveMember] = useState('');
    const [data, setData] = useState({
        members: [],
        loans: [],
        repayments: [],
        payments: [],
        allocations: [],
        interactions: []
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
        repayment_day: '5',
        mobile_number: '',
        address: '',
        attachment_url: '',
        attachment_name: '',
        allocations: [] // array of { member_id: X, share_percentage: Y }
    });

    // Parsing document state
    const [documentFile, setDocumentFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [parsedData, setParsedData] = useState(null); 
    const [importTarget, setImportTarget] = useState('existing'); 
    const [importLoanId, setImportLoanId] = useState('');
    const [newLoanForm, setNewLoanForm] = useState({
        name: '',
        lender: '',
        account_number: '',
        loan_type: 'Home Loan',
        principal_amount: '',
        interest_rate_annual: '12.0',
        start_date: new Date().toISOString().split('T')[0],
        tenure_months: '',
        emi_amount: '',
        repayment_day: '5',
        mobile_number: '',
        address: ''
    });

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleView, setScheduleView] = useState('calendar'); // 'calendar' or 'list'

    // Liabilities View States
    const [editingLoanId, setEditingLoanId] = useState(null);
    const [liabilitiesView, setLiabilitiesView] = useState('card'); // 'card', 'table', 'detail'
    const [selectedDetailLoanId, setSelectedDetailLoanId] = useState('');
    const [liabilityFilterType, setLiabilityFilterType] = useState('all');
    const [liabilitySortBy, setLiabilitySortBy] = useState('name_asc');

    const startEditLoan = (loan) => {
        setEditingLoanId(loan.id);
        setLoanForm({
            name: loan.name || '',
            lender: loan.lender || '',
            account_number: loan.account_number || '',
            loan_type: loan.loan_type || 'Home Loan',
            principal_amount: String(loan.principal_amount || ''),
            interest_rate_annual: String(loan.interest_rate_annual || ''),
            start_date: loan.start_date || new Date().toISOString().split('T')[0],
            tenure_months: String(loan.tenure_months || ''),
            emi_amount: String(loan.emi_amount || ''),
            repayment_day: String(loan.repayment_day || '5'),
            mobile_number: loan.mobile_number || '',
            address: loan.address || '',
            attachment_url: loan.attachment_url || '',
            attachment_name: loan.attachment_name || '',
            allocations: []
        });
        setShowAddLoan(true);
    };

    const getFilteredAndSortedLoans = () => {
        let list = [...data.loans];

        if (liabilityFilterType !== 'all') {
            list = list.filter(l => l.loan_type === liabilityFilterType);
        }

        list.sort((a, b) => {
            if (liabilitySortBy === 'name_asc') {
                return a.name.localeCompare(b.name);
            }
            if (liabilitySortBy === 'name_desc') {
                return b.name.localeCompare(a.name);
            }
            if (liabilitySortBy === 'principal_desc') {
                return parseFloat(b.principal_amount) - parseFloat(a.principal_amount);
            }
            if (liabilitySortBy === 'principal_asc') {
                return parseFloat(a.principal_amount) - parseFloat(b.principal_amount);
            }
            if (liabilitySortBy === 'remaining_desc' || liabilitySortBy === 'remaining_asc') {
                const getRemaining = (loan) => {
                    const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                    const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
                    return Math.max(0, parseFloat(loan.principal_amount) - paidPrincipal);
                };
                return liabilitySortBy === 'remaining_desc' 
                    ? getRemaining(b) - getRemaining(a)
                    : getRemaining(a) - getRemaining(b);
            }
            return 0;
        });

        return list;
    };

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

    const [editingRepaymentId, setEditingRepaymentId] = useState(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurMonths, setRecurMonths] = useState('12');

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
                    allocations: result.allocations || [],
                    interactions: result.interactions || []
                });

                // Auto initialize member id in forms if members exist
                const defaultMember = result.members.find(m => m.name === result.activeMember);
                if (defaultMember) {
                    setPaymentForm(prev => ({ ...prev, member_id: defaultMember.id }));
                }

                // Set default allocations unconditionally when members are loaded
                if (result.members && result.members.length > 0) {
                    setLoanForm(prev => {
                        const defaultAllocations = result.members.map(m => {
                            const isAsha = m.name === 'Asha';
                            return {
                                member_id: m.id,
                                share_percentage: isAsha ? '0.0' : '25.0'
                            };
                        });
                        return { ...prev, allocations: defaultAllocations };
                    });
                }
            }
        } catch (e) {
            console.error('Error fetching data:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDocumentFile(file);
            setParsedData(null);
        }
    };

    const handleParseDocument = async () => {
        if (!documentFile) return;
        setIsParsing(true);
        try {
            const formData = new FormData();
            formData.append('file', documentFile);

            const res = await fetch('/api/newera/parse-schedule', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                setParsedData(result);
                setNewLoanForm(prev => ({
                    ...prev,
                    name: `${result.guessedLender} Loan`,
                    lender: result.guessedLender,
                    principal_amount: String(result.principal),
                    tenure_months: String(result.tenure_months),
                    emi_amount: String(result.emi_amount),
                    interest_rate_annual: String(result.interestRateGuess)
                }));
            } else {
                alert('Analysis failed: ' + result.error);
            }
        } catch (e) {
            console.error('Error parsing document:', e);
            alert('An error occurred while analyzing the document.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleSaveParsedImport = async (e) => {
        e.preventDefault();
        if (!parsedData) return;

        if (importTarget === 'existing' && !importLoanId) {
            alert('Please select an existing liability account.');
            return;
        }

        try {
            const payload = {
                action: 'import_parsed_schedule',
                loanId: importTarget === 'new' ? 'new' : importLoanId,
                loanForm: importTarget === 'new' ? newLoanForm : null,
                installments: parsedData.installments
            };

            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                setShowImportRepayments(false);
                setDocumentFile(null);
                setParsedData(null);
                fetchDashboardData();
                alert('Schedule imported successfully!');
            } else {
                alert('Import failed: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during import.');
        }
    };

    const getCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const startDayOfWeek = firstDay.getDay(); 
        const totalDays = lastDay.getDate();
        
        const days = [];
        
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ dayNum: d, dateStr });
        }
        
        return days;
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

        try {
            // Strip allocations from the form data
            const { allocations, ...loanPayload } = loanForm;
            const actionType = editingLoanId ? 'edit_loan' : 'create_loan';

            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    loanId: editingLoanId,
                    ...loanPayload
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowAddLoan(false);
                setEditingLoanId(null);
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
                    repayment_day: '5',
                    mobile_number: '',
                    address: '',
                    attachment_url: '',
                    attachment_name: '',
                    allocations: data.members.map(m => {
                        const isAsha = m.name === 'Asha';
                        return {
                            member_id: m.id,
                            share_percentage: isAsha ? '0.0' : '25.0'
                        };
                    })
                });
                fetchDashboardData();
            } else {
                alert('Error saving loan: ' + result.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitUpsertRepayment = async (e) => {
        e.preventDefault();

        const totalAmount = parseFloat(repaymentForm.expected_amount || 0);
        const principalPortion = parseFloat(repaymentForm.expected_principal || 0);
        const interestPortion = parseFloat(repaymentForm.expected_interest || 0);

        if (Math.abs((principalPortion + interestPortion) - totalAmount) > 0.01) {
            alert(`Error: Principal Component (₹${principalPortion.toLocaleString('en-IN')}) and Interest Component (₹${interestPortion.toLocaleString('en-IN')}) must sum exactly to the Expected Due Amount (₹${totalAmount.toLocaleString('en-IN')}).`);
            return;
        }

        try {
            const payload = {
                action: 'upsert_repayment',
                id: editingRepaymentId,
                ...repaymentForm,
                recur_months: (!editingRepaymentId && isRecurring) ? parseInt(recurMonths) : null
            };

            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setShowAddRepayment(false);
                setEditingRepaymentId(null);
                setIsRecurring(false);
                setRecurMonths('12');
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
                alert('Error saving schedule item: ' + result.error);
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

    const handleAttachmentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingAttachment(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'media');
            formData.append('folder', 'newera-statements');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                setLoanForm(prev => ({
                    ...prev,
                    attachment_url: result.url,
                    attachment_name: result.name
                }));
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (err) {
            console.error('Attachment upload error:', err);
            alert('An error occurred during file upload.');
        } finally {
            setIsUploadingAttachment(false);
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

            {/* Navigation Tabs */}
            <nav style={styles.navBar}>
                <button 
                    onClick={() => setActiveTab('overview')} 
                    style={{ ...styles.navTab, color: activeTab === 'overview' ? '#6366f1' : '#64748b' }}
                >
                    <Coins size={20} style={{ color: activeTab === 'overview' ? '#6366f1' : '#64748b' }} />
                    <span>Overview</span>
                </button>
                <button 
                    onClick={() => setActiveTab('liabilities')} 
                    style={{ ...styles.navTab, color: activeTab === 'liabilities' ? '#6366f1' : '#64748b' }}
                >
                    <Landmark size={20} style={{ color: activeTab === 'liabilities' ? '#6366f1' : '#64748b' }} />
                    <span>Liabilities</span>
                </button>
                <button 
                    onClick={() => setActiveTab('schedule')} 
                    style={{ ...styles.navTab, color: activeTab === 'schedule' ? '#6366f1' : '#64748b' }}
                >
                    <Calendar size={20} style={{ color: activeTab === 'schedule' ? '#6366f1' : '#64748b' }} />
                    <span>Schedules</span>
                </button>
                <button 
                    onClick={() => setActiveTab('payments')} 
                    style={{ ...styles.navTab, color: activeTab === 'payments' ? '#6366f1' : '#64748b' }}
                >
                    <ClipboardList size={20} style={{ color: activeTab === 'payments' ? '#6366f1' : '#64748b' }} />
                    <span>Payment Logs</span>
                </button>
                <button 
                    onClick={() => setActiveTab('interactions')} 
                    style={{ ...styles.navTab, color: activeTab === 'interactions' ? '#6366f1' : '#64748b' }}
                >
                    <Briefcase size={20} style={{ color: activeTab === 'interactions' ? '#6366f1' : '#64748b' }} />
                    <span>Activity Log</span>
                </button>
            </nav>

            {/* Content Container */}
            <main style={styles.mainContent}>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div style={styles.tabContentSingle}>
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

                        <div style={styles.tabContentGrid}>
                            {/* Liability Breakdowns */}
                            <div style={styles.panelCard}>
                                <h2 style={styles.panelTitle}>Liability Breakdowns</h2>
                                <div style={{ ...styles.breakdownGrid, gridTemplateColumns: '1fr' }}>
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
                                                <div style={styles.breakdownDetailRow}>
                                                    <span>₹{paidVal.toLocaleString('en-IN')} paid</span>
                                                    <span>₹{totalExpected.toLocaleString('en-IN')} principal</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent Payments Logged */}
                            <div style={styles.panelCard}>
                                <div style={styles.tabHeaderRow}>
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
                        </div>
                    </div>
                )}

                {/* LIABILITIES TAB */}
                {activeTab === 'liabilities' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow}>
                            <h2 style={styles.panelTitle}>Active Loans & Accounts Payable</h2>
                            <button onClick={() => { setEditingLoanId(null); setShowAddLoan(true); }} style={styles.primaryActionButton}>
                                <Plus size={16} /> Add Liability
                            </button>
                        </div>

                        {/* Controls: View Toggles, Filter, Sort */}
                        {data.loans.length > 0 && (
                            <div style={styles.liabilitiesControlRow}>
                                <div style={styles.viewToggleRow} style={{ ...styles.viewToggleRow, margin: 0 }}>
                                    <button 
                                        onClick={() => setLiabilitiesView('card')} 
                                        style={{
                                            ...styles.viewToggleBtn,
                                            backgroundColor: liabilitiesView === 'card' ? '#6366f1' : 'transparent',
                                            color: liabilitiesView === 'card' ? '#ffffff' : '#94a3b8',
                                            borderColor: liabilitiesView === 'card' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <LayoutGrid size={14} /> Cards
                                    </button>
                                    <button 
                                        onClick={() => setLiabilitiesView('table')} 
                                        style={{
                                            ...styles.viewToggleBtn,
                                            backgroundColor: liabilitiesView === 'table' ? '#6366f1' : 'transparent',
                                            color: liabilitiesView === 'table' ? '#ffffff' : '#94a3b8',
                                            borderColor: liabilitiesView === 'table' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <Table size={14} /> Table
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setLiabilitiesView('detail');
                                            if (data.loans.length > 0 && !selectedDetailLoanId) {
                                                setSelectedDetailLoanId(data.loans[0].id);
                                            }
                                        }} 
                                        style={{
                                            ...styles.viewToggleBtn,
                                            backgroundColor: liabilitiesView === 'detail' ? '#6366f1' : 'transparent',
                                            color: liabilitiesView === 'detail' ? '#ffffff' : '#94a3b8',
                                            borderColor: liabilitiesView === 'detail' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <Eye size={14} /> Details
                                    </button>
                                </div>

                                {liabilitiesView !== 'detail' && (
                                    <div style={styles.filtersWrapper}>
                                        <div style={styles.filterItem}>
                                            <span style={styles.filterLabel}>Type</span>
                                            <select 
                                                value={liabilityFilterType} 
                                                onChange={e => setLiabilityFilterType(e.target.value)}
                                                style={styles.filterDropdownSmall}
                                            >
                                                <option value="all">All Types</option>
                                                <option value="Home Loan">Home Loan</option>
                                                <option value="Bank OD">Bank OD</option>
                                                <option value="Business Loan (Bank)">Business Loan (Bank)</option>
                                                <option value="Business Loan (Market)">Business Loan (Market Vendor)</option>
                                                <option value="Vendor Payable (Goods)">Vendor Payable (Goods)</option>
                                            </select>
                                        </div>
                                        <div style={styles.filterItem}>
                                            <span style={styles.filterLabel}>Sort</span>
                                            <select 
                                                value={liabilitySortBy} 
                                                onChange={e => setLiabilitySortBy(e.target.value)}
                                                style={styles.filterDropdownSmall}
                                            >
                                                <option value="name_asc">Name (A-Z)</option>
                                                <option value="name_desc">Name (Z-A)</option>
                                                <option value="principal_desc">Principal (High-Low)</option>
                                                <option value="principal_asc">Principal (Low-High)</option>
                                                <option value="remaining_desc">Remaining (High-Low)</option>
                                                <option value="remaining_asc">Remaining (Low-High)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={styles.loansContainer}>
                            {data.loans.length === 0 ? (
                                <div style={styles.bigEmptyState}>
                                    <Landmark size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                    <h3>No Liabilities Logged</h3>
                                    <p>Start tracking by adding your first home loan, OD, vendor payable, or personal market loan.</p>
                                </div>
                            ) : (
                                <>
                                    {/* 1. Card View */}
                                    {liabilitiesView === 'card' && (
                                        <div style={styles.loansGrid}>
                                            {getFilteredAndSortedLoans().map(loan => {
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
                                                                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                                    <span>Phone: <strong>{loan.mobile_number || 'N/A'}</strong></span>
                                                                    {loan.address && <span style={{ marginLeft: '1rem' }}>Address: <strong>{loan.address}</strong></span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                <button 
                                                                    onClick={() => startEditLoan(loan)} 
                                                                    style={{ ...styles.iconDeleteBtn, color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }} 
                                                                    title="Edit Loan"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteLoan(loan.id)} 
                                                                    style={styles.iconDeleteBtn} 
                                                                    title="Delete Loan"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
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
                                                        {loan.attachment_url && (
                                                            <div style={{ 
                                                                marginTop: '0.75rem', 
                                                                paddingTop: '0.75rem', 
                                                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Attached Statement:</span>
                                                                <a 
                                                                    href={loan.attachment_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}
                                                                >
                                                                    📄 {loan.attachment_name || 'View Attachment'}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {getFilteredAndSortedLoans().length === 0 && (
                                                <div style={{ ...styles.bigEmptyState, gridColumn: '1 / -1' }}>
                                                    <p>No liabilities match your filters.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. Table View */}
                                    {liabilitiesView === 'table' && (
                                        <div style={styles.tableCardContainer}>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={styles.customTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Lender</th>
                                                            <th>Mobile</th>
                                                            <th>Address</th>
                                                            <th>Category</th>
                                                            <th>Principal</th>
                                                            <th>Interest</th>
                                                            <th>Remaining</th>
                                                            <th>EMI</th>
                                                            <th>Repayment Day</th>
                                                            <th>Statement</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {getFilteredAndSortedLoans().map(loan => {
                                                            const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                                                            const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
                                                            const outstanding = Math.max(0, parseFloat(loan.principal_amount) - paidPrincipal);
                                                            return (
                                                                <tr key={loan.id}>
                                                                    <td style={{ fontWeight: '700', color: '#ffffff' }}>{loan.name}</td>
                                                                    <td>{loan.lender}</td>
                                                                    <td>{loan.mobile_number || 'N/A'}</td>
                                                                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.address}>{loan.address || 'N/A'}</td>
                                                                    <td>
                                                                        <span style={{
                                                                            ...styles.statusBadge,
                                                                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                                                            color: '#818cf8',
                                                                            borderColor: 'rgba(99, 102, 241, 0.25)',
                                                                            fontSize: '0.65rem'
                                                                        }}>{loan.loan_type}</span>
                                                                    </td>
                                                                    <td>₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}</td>
                                                                    <td>{loan.interest_rate_annual}%</td>
                                                                    <td style={{ color: '#818cf8', fontWeight: '700' }}>₹{outstanding.toLocaleString('en-IN')}</td>
                                                                    <td>{loan.emi_amount ? `₹${parseFloat(loan.emi_amount).toLocaleString('en-IN')}` : 'N/A'}</td>
                                                                    <td>Day {loan.repayment_day || 5}</td>
                                                                    <td>
                                                                        {loan.attachment_url ? (
                                                                            <a 
                                                                                href={loan.attachment_url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                                                title={loan.attachment_name || 'View Statement'}
                                                                            >
                                                                                📄 View
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>None</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                            <button 
                                                                                onClick={() => startEditLoan(loan)} 
                                                                                style={{ ...styles.iconBtn, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                                                                                title="Edit Account"
                                                                            >
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteLoan(loan.id)} 
                                                                                style={{ ...styles.iconBtn, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                                                                title="Delete Account"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {getFilteredAndSortedLoans().length === 0 && (
                                                            <tr>
                                                                <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: '2rem' }}>
                                                                    No liabilities found matching filters.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Detail View */}
                                    {liabilitiesView === 'detail' && (
                                        <div style={styles.detailViewContainer}>
                                            <div style={styles.detailSelectorRow}>
                                                <span style={styles.detailSelectorLabel}>Select Account:</span>
                                                <select 
                                                    value={selectedDetailLoanId} 
                                                    onChange={e => setSelectedDetailLoanId(e.target.value)}
                                                    style={styles.detailDropdown}
                                                >
                                                    {data.loans.map(l => (
                                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {(() => {
                                                const loan = data.loans.find(l => l.id === selectedDetailLoanId);
                                                if (!loan) return <div style={styles.emptyState}>Choose a liability to inspect from the dropdown list.</div>;

                                                const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                                                const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion), 0);
                                                const paidInterest = loanPayments.reduce((sum, p) => sum + parseFloat(p.interest_portion), 0);
                                                const totalPaid = paidPrincipal + paidInterest;
                                                const outstanding = Math.max(0, parseFloat(loan.principal_amount) - paidPrincipal);

                                                const upcomingRepayments = data.repayments.filter(r => r.loan_id === loan.id && r.status !== 'paid');
                                                const loanAllocations = data.allocations.filter(a => a.loan_id === loan.id);

                                                return (
                                                    <div style={styles.detailGrid}>
                                                        {/* Summary Card */}
                                                        <div style={styles.detailMainCard}>
                                                            <div style={styles.detailMainHeader}>
                                                                <div>
                                                                    <span style={styles.loanBadge}>{loan.loan_type}</span>
                                                                    <h3 style={styles.detailMainTitle}>{loan.name}</h3>
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginTop: '0.2rem' }}>
                                                                        Supplier/Lender: <strong>{loan.lender}</strong> • Phone: <strong>{loan.mobile_number || 'N/A'}</strong> {loan.address ? `• Address: ${loan.address}` : ''}
                                                                    </span>
                                                                    {loan.attachment_url && (
                                                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Statement File:</span>
                                                                            <a 
                                                                                href={loan.attachment_url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                                            >
                                                                                📄 {loan.attachment_name || 'View Attached Statement'}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button 
                                                                        onClick={() => startEditLoan(loan)} 
                                                                        style={{ ...styles.viewToggleBtn, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                                                                    >
                                                                        <Edit size={14} /> Edit
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteLoan(loan.id)} 
                                                                        style={{ ...styles.viewToggleBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                                                    >
                                                                        <Trash2 size={14} /> Delete
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div style={styles.detailStatsRow}>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Principal Borrowed</span>
                                                                    <span style={styles.detailStatVal}>₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Remaining Principal</span>
                                                                    <span style={{ ...styles.detailStatVal, color: '#818cf8' }}>₹{outstanding.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Interest Rate</span>
                                                                    <span style={styles.detailStatVal}>{loan.interest_rate_annual}% p.a.</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Start Date</span>
                                                                    <span style={styles.detailStatVal}>{loan.start_date}</span>
                                                                </div>
                                                            </div>

                                                            <div style={{ ...styles.detailStatsRow, marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Total Paid Till Date</span>
                                                                    <span style={styles.detailStatVal}>₹{totalPaid.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Principal Repaid</span>
                                                                    <span style={styles.detailStatVal}>₹{paidPrincipal.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Interest Paid</span>
                                                                    <span style={styles.detailStatVal}>₹{paidInterest.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={styles.detailStatBox}>
                                                                    <span style={styles.detailStatLabel}>Tenure / EMI</span>
                                                                    <span style={styles.detailStatVal}>
                                                                        {loan.tenure_months ? `${loan.tenure_months} Mo` : 'N/A'} {loan.emi_amount ? `(₹${parseFloat(loan.emi_amount).toLocaleString('en-IN')})` : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Subsections: Schedule & Payment Log */}
                                                        <div style={styles.detailSectionsGrid}>
                                                            {/* Left: Upcoming Schedule */}
                                                            <div style={styles.panelCard}>
                                                                <h3 style={styles.panelTitle}>Upcoming Repayments</h3>
                                                                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                                                                    {upcomingRepayments.length === 0 ? (
                                                                        <div style={styles.emptyState}>No upcoming schedule items.</div>
                                                                    ) : (
                                                                        upcomingRepayments.map(rep => (
                                                                            <div key={rep.id} style={{ ...styles.dayDetailItem, padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                                                                                <div>
                                                                                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Date: {rep.due_date}</strong>
                                                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                                        Installment #{rep.installment_number} • Principal: ₹{Math.round(rep.expected_principal).toLocaleString('en-IN')}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ textAlign: 'right' }}>
                                                                                    <strong style={{ color: '#f59e0b', fontSize: '0.9rem' }}>₹{Math.round(rep.expected_amount).toLocaleString('en-IN')}</strong>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Right: Payment Logs */}
                                                            <div style={styles.panelCard}>
                                                                <h3 style={styles.panelTitle}>Recorded Payments</h3>
                                                                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                                                                    {loanPayments.length === 0 ? (
                                                                        <div style={styles.emptyState}>No payments logged for this liability.</div>
                                                                    ) : (
                                                                        loanPayments.map(p => {
                                                                            const member = data.members.find(m => m.id === p.member_id);
                                                                            return (
                                                                                <div key={p.id} style={{ ...styles.recentLogItem, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', margin: 0 }}>
                                                                                    <div>
                                                                                        <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{p.payment_date}</strong>
                                                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                                            By {member ? member.name : 'Unknown'} • Principal: ₹{parseFloat(p.principal_portion).toLocaleString('en-IN')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>+ ₹{parseFloat(p.amount).toLocaleString('en-IN')}</strong>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </>
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
                                    <FileText size={16} /> Parse PDF / Excel
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

                        {/* Toggle View Type */}
                        <div style={styles.viewToggleRow}>
                            <button 
                                onClick={() => setScheduleView('calendar')} 
                                style={{
                                    ...styles.viewToggleBtn,
                                    backgroundColor: scheduleView === 'calendar' ? '#6366f1' : 'transparent',
                                    color: scheduleView === 'calendar' ? '#ffffff' : '#94a3b8',
                                    borderColor: scheduleView === 'calendar' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                }}
                            >
                                <Calendar size={14} /> Calendar View
                            </button>
                            <button 
                                onClick={() => setScheduleView('list')} 
                                style={{
                                    ...styles.viewToggleBtn,
                                    backgroundColor: scheduleView === 'list' ? '#6366f1' : 'transparent',
                                    color: scheduleView === 'list' ? '#ffffff' : '#94a3b8',
                                    borderColor: scheduleView === 'list' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                }}
                            >
                                <List size={14} /> List View
                            </button>
                        </div>

                        {/* Calendar View */}
                        {scheduleView === 'calendar' && (
                            <div style={styles.calendarContainer}>
                                <div style={styles.calendarNav}>
                                    <button 
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} 
                                        style={styles.calendarNavBtn}
                                    >
                                        &larr; Prev
                                    </button>
                                    <h3 style={styles.calendarNavTitle}>
                                        {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
                                    </h3>
                                    <button 
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} 
                                        style={styles.calendarNavBtn}
                                    >
                                        Next &rarr;
                                    </button>
                                </div>

                                <div style={styles.calendarGrid}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                                        <div key={w} style={styles.weekdayCell}>{w}</div>
                                    ))}

                                    {getCalendarDays().map((day, idx) => {
                                        if (!day) return <div key={`empty-${idx}`} style={styles.emptyDayCell}></div>;

                                        const repaymentsDue = data.repayments.filter(r => 
                                            r.due_date === day.dateStr && 
                                            (selectedLoanId === 'all' || r.loan_id === selectedLoanId)
                                        );

                                        const isSelected = selectedCalendarDay === day.dateStr;

                                        return (
                                            <div 
                                                key={day.dateStr} 
                                                onClick={() => setSelectedCalendarDay(day.dateStr)}
                                                style={{
                                                    ...styles.dayCell,
                                                    borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.25)'
                                                }}
                                            >
                                                <div style={styles.dayNumLabel}>{day.dayNum}</div>
                                                <div style={styles.dayContent}>
                                                    {repaymentsDue.map(rep => {
                                                        const loan = data.loans.find(l => l.id === rep.loan_id);
                                                        return (
                                                            <div 
                                                                key={rep.id} 
                                                                style={{
                                                                    ...styles.miniRepaymentCard,
                                                                    borderColor: rep.status === 'paid' ? '#10b981' : rep.status === 'partially_paid' ? '#f59e0b' : '#ef4444',
                                                                    backgroundColor: rep.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : rep.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                                                }}
                                                            >
                                                                <div style={styles.miniRepName}>{loan ? loan.name : 'Vendor'}</div>
                                                                <div style={styles.miniRepAmt}>₹{Math.round(rep.expected_amount).toLocaleString('en-IN')}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {repaymentsDue.length > 0 && (
                                                    <div style={styles.mobileDotContainer}>
                                                        {repaymentsDue.map((r, i) => (
                                                            <span 
                                                                key={r.id} 
                                                                style={{
                                                                    ...styles.mobileDot,
                                                                    backgroundColor: r.status === 'paid' ? '#10b981' : r.status === 'partially_paid' ? '#f59e0b' : '#ef4444'
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={styles.dayDetailPanel}>
                                    <h4 style={styles.dayDetailTitle}>
                                        Due on {new Date(selectedCalendarDay).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                                    </h4>
                                    {data.repayments.filter(r => 
                                        r.due_date === selectedCalendarDay && 
                                        (selectedLoanId === 'all' || r.loan_id === selectedLoanId)
                                    ).length === 0 ? (
                                        <div style={styles.emptyDayDetails}>No scheduled repayments due on this day.</div>
                                    ) : (
                                        <div style={styles.dayDetailList}>
                                            {data.repayments
                                                .filter(r => r.due_date === selectedCalendarDay && (selectedLoanId === 'all' || r.loan_id === selectedLoanId))
                                                .map(repayment => {
                                                    const loan = data.loans.find(l => l.id === repayment.loan_id);
                                                    return (
                                                        <div key={repayment.id} style={styles.dayDetailItem}>
                                                            <div style={styles.dayDetailItemMain}>
                                                                <strong>{loan ? loan.name : 'Unknown Loan'} ({loan ? loan.lender : 'Vendor'})</strong>
                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                                    Installment #{repayment.installment_number || 'Custom'} • Principal: ₹{parseFloat(repayment.expected_principal).toLocaleString('en-IN')} • Interest: ₹{parseFloat(repayment.expected_interest).toLocaleString('en-IN')}
                                                                </span>
                                                                {repayment.notes && <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '0.15rem' }}>Notes: {repayment.notes}</span>}
                                                            </div>
                                                            <div style={styles.dayDetailItemSide}>
                                                                <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>₹{parseFloat(repayment.expected_amount).toLocaleString('en-IN')}</strong>
                                                                <div style={styles.dayDetailBtnRow}>
                                                                    <span style={{
                                                                        ...styles.statusBadge,
                                                                        backgroundColor: repayment.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : repayment.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                        color: repayment.status === 'paid' ? '#10b981' : repayment.status === 'partially_paid' ? '#f59e0b' : '#ef4444',
                                                                        borderColor: repayment.status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : repayment.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                                                                        padding: '0.1rem 0.35rem',
                                                                        fontSize: '0.65rem'
                                                                    }}>
                                                                        {repayment.status.toUpperCase()}
                                                                    </span>
                                                                    {repayment.status !== 'paid' && (
                                                                        <>
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
                                                                                style={styles.payDayBtn}
                                                                            >
                                                                                Log Pay
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setEditingRepaymentId(repayment.id);
                                                                                    setRepaymentForm({
                                                                                        loan_id: repayment.loan_id,
                                                                                        due_date: repayment.due_date,
                                                                                        installment_number: repayment.installment_number || '',
                                                                                        expected_amount: repayment.expected_amount,
                                                                                        expected_principal: repayment.expected_principal,
                                                                                        expected_interest: repayment.expected_interest,
                                                                                        notes: repayment.notes || ''
                                                                                    });
                                                                                    setShowAddRepayment(true);
                                                                                }}
                                                                                style={{ ...styles.payDayBtn, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                                                                                title="Edit Installment"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteRepayment(repayment.id)}
                                                                                style={{ ...styles.payDayBtn, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                                                                title="Delete Installment"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </>
                                                                    )}
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

                        {/* Repayments Schedule List (Rendered when scheduleView is 'list') */}
                        {scheduleView === 'list' && (
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
                                                                {repayment.status !== 'paid' && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingRepaymentId(repayment.id);
                                                                            setRepaymentForm({
                                                                                loan_id: repayment.loan_id,
                                                                                due_date: repayment.due_date,
                                                                                installment_number: repayment.installment_number || '',
                                                                                expected_amount: repayment.expected_amount,
                                                                                expected_principal: repayment.expected_principal,
                                                                                expected_interest: repayment.expected_interest,
                                                                                notes: repayment.notes || ''
                                                                            });
                                                                            setShowAddRepayment(true);
                                                                        }} 
                                                                        style={{ ...styles.payScheduleBtn, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                )}
                                                                {repayment.status !== 'paid' && (
                                                                    <button onClick={() => handleDeleteRepayment(repayment.id)} style={styles.deleteRowBtn}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
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

                {/* INTERACTIONS TAB */}
                {activeTab === 'interactions' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow}>
                            <h2 style={styles.panelTitle}>System Activity Logs</h2>
                            <button onClick={fetchDashboardData} style={styles.secondaryActionButton}>
                                Refresh Log
                            </button>
                        </div>

                        <div style={styles.scheduleTableWrapper}>
                            {data.interactions.length === 0 ? (
                                <div style={styles.bigEmptyState}>
                                    <ClipboardList size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                    <h3>No Activity Logs</h3>
                                    <p>Logs of edits, additions, and deletions will appear here once actions are performed.</p>
                                </div>
                            ) : (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Member</th>
                                            <th>Action Type</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.interactions.map(log => (
                                            <tr key={log.id}>
                                                <td style={{ color: '#94a3b8' }}>
                                                    {new Date(log.created_at).toLocaleString('en-IN', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short'
                                                    })}
                                                </td>
                                                <td>
                                                    <span style={styles.tableMember}>
                                                        {log.member_name}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        ...styles.statusBadge,
                                                        backgroundColor: log.action_type === 'login' ? 'rgba(16, 185, 129, 0.1)' 
                                                                        : log.action_type === 'logout' ? 'rgba(239, 68, 68, 0.1)' 
                                                                        : 'rgba(99, 102, 241, 0.1)',
                                                        color: log.action_type === 'login' ? '#34d399' 
                                                              : log.action_type === 'logout' ? '#f87171' 
                                                              : '#a5b4fc',
                                                        borderColor: log.action_type === 'login' ? 'rgba(16, 185, 129, 0.25)' 
                                                                    : log.action_type === 'logout' ? 'rgba(239, 68, 68, 0.25)' 
                                                                    : 'rgba(99, 102, 241, 0.2)'
                                                    }}>
                                                        {log.action_type.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ whiteSpace: 'normal', minWidth: '300px' }}>
                                                    {log.description}
                                                </td>
                                            </tr>
                                        ))}
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
                            <h3 style={styles.modalTitle}>{editingLoanId ? 'Edit Liability Account' : 'Add Liability Account'}</h3>
                            <button onClick={() => { setShowAddLoan(false); setEditingLoanId(null); }} style={styles.closeModalBtn}>×</button>
                        </div>
                        <form onSubmit={submitCreateLoan} style={styles.modalForm}>
                            <div style={styles.formGrid}>
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
                                    <label style={styles.formLabel}>Mobile Number (Lender) — Mandatory</label>
                                    <input 
                                        type="tel" 
                                        value={loanForm.mobile_number || ''} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                                        placeholder="e.g. +91 9876543210"
                                        style={styles.formInput} 
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Address (Lender) — Optional</label>
                                    <input 
                                        type="text" 
                                        value={loanForm.address || ''} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="e.g. 1st Cross, Mumbai"
                                        style={styles.formInput} 
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
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Preferred Repayment Day of Month (1-31)</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="31"
                                        value={loanForm.repayment_day || 5} 
                                        onChange={e => setLoanForm(prev => ({ ...prev, repayment_day: e.target.value }))}
                                        placeholder="e.g. 5"
                                        style={styles.formInput} 
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ ...styles.formGroup, marginBottom: '1.25rem' }}>
                                <label style={styles.formLabel}>Attach Statement / Agreement (PDF or Image)</label>
                                {loanForm.attachment_url ? (
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        backgroundColor: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid rgba(255,255,255,0.06)', 
                                        padding: '0.65rem 0.75rem', 
                                        borderRadius: '0.5rem' 
                                    }}>
                                        <a 
                                            href={loanForm.attachment_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}
                                        >
                                            📄 {loanForm.attachment_name || 'View Statement'}
                                        </a>
                                        <button 
                                            type="button" 
                                            onClick={() => setLoanForm(prev => ({ ...prev, attachment_url: '', attachment_name: '' }))}
                                            style={{ backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={handleAttachmentUpload}
                                            disabled={isUploadingAttachment}
                                            style={{
                                                fontSize: '0.85rem',
                                                color: '#94a3b8',
                                                cursor: isUploadingAttachment ? 'not-allowed' : 'pointer'
                                            }}
                                        />
                                        {isUploadingAttachment && (
                                            <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>Uploading statement... Please wait.</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Member allocations removed */}

                            <button type="submit" style={styles.modalSubmitBtn} disabled={isUploadingAttachment}>
                                {isUploadingAttachment ? 'Uploading statement...' : (editingLoanId ? 'Save Changes' : 'Save Liability Account')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Add Repayment Installment Modal */}
            {showAddRepayment && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} style={{ ...styles.modalContent, maxWidth: '450px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{editingRepaymentId ? 'Edit Due Repayment Item' : 'Add Due Repayment Item'}</h3>
                            <button onClick={() => {
                                setShowAddRepayment(false);
                                setEditingRepaymentId(null);
                                setIsRecurring(false);
                                setRecurMonths('12');
                                setRepaymentForm({
                                    loan_id: '',
                                    due_date: new Date().toISOString().split('T')[0],
                                    installment_number: '',
                                    expected_amount: '',
                                    expected_principal: '',
                                    expected_interest: '',
                                    notes: ''
                                });
                            }} style={styles.closeModalBtn}>×</button>
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

                            {!editingRepaymentId && (
                                <div style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.02)', 
                                    border: '1px solid rgba(255,255,255,0.06)', 
                                    borderRadius: '0.5rem', 
                                    padding: '0.75rem', 
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isRecurring} 
                                            onChange={e => setIsRecurring(e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        Recurring Installment?
                                    </label>
                                    
                                    {isRecurring && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Repeat monthly for:</span>
                                            <input 
                                                type="number" 
                                                min="2" 
                                                max="120" 
                                                value={recurMonths} 
                                                onChange={e => setRecurMonths(e.target.value)}
                                                style={{ ...styles.formInput, width: '80px', padding: '0.25rem 0.5rem', margin: 0 }}
                                                required
                                            />
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>months</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button type="submit" style={styles.modalSubmitBtn}>
                                {editingRepaymentId ? 'Save Changes' : 'Create Installment'}
                            </button>
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
                      {/* 4. Import & Analyze Amortization Modal */}
            {showImportRepayments && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '650px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Parse Amortization Schedule (PDF / Excel)</h3>
                            <button onClick={() => {
                                setShowImportRepayments(false);
                                setDocumentFile(null);
                                setParsedData(null);
                            }} style={styles.closeModalBtn}>×</button>
                        </div>
                        <div style={styles.modalForm}>
                            {!parsedData ? (
                                <>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Upload Amortization Document (.pdf, .xlsx, .xls, .csv)</label>
                                        <div style={{
                                            border: '2px dashed rgba(255,255,255,0.08)',
                                            borderRadius: '0.75rem',
                                            padding: '2rem',
                                            textAlign: 'center',
                                            background: 'rgba(15, 23, 42, 0.25)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }} onClick={() => fileInputRef.current?.click()}>
                                            <Upload size={32} color="#6366f1" />
                                            <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '600' }}>
                                                {documentFile ? documentFile.name : 'Select or Drop Amortization Sheet'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Supports bank output PDFs, Excel grids, or CSV lists
                                            </span>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                accept=".pdf, .xlsx, .xls, .csv" 
                                                onChange={handleFileChange}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleParseDocument} 
                                        disabled={!documentFile || isParsing}
                                        style={{
                                            ...styles.modalSubmitBtn,
                                            opacity: (!documentFile || isParsing) ? 0.6 : 1,
                                            cursor: (!documentFile || isParsing) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isParsing ? 'ANALYZING DOCUMENT...' : 'UPLOAD & ANALYZE'}
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleSaveParsedImport}>
                                    {/* Guessed Details */}
                                    <div style={{
                                        background: 'rgba(99, 102, 241, 0.05)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '0.75rem',
                                        padding: '1rem',
                                        marginBottom: '1.25rem'
                                    }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#a5b4fc', fontSize: '0.9rem' }}>ANALYSIS SUMMARY</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                            <div>Guessed Lender: <strong>{parsedData.guessedLender}</strong></div>
                                            <div>Principal parsed: <strong>₹{parsedData.principal.toLocaleString('en-IN')}</strong></div>
                                            <div>Installments found: <strong>{parsedData.tenure_months} months</strong></div>
                                            <div>Avg monthly EMI: <strong>₹{parsedData.emi_amount.toLocaleString('en-IN')}</strong></div>
                                        </div>
                                    </div>

                                    {/* Import Target */}
                                    <div style={{ ...styles.formGroup, marginBottom: '1.25rem' }}>
                                        <label style={styles.formLabel}>Target Liability Account</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                <input 
                                                    type="radio" 
                                                    name="importTarget" 
                                                    value="existing"
                                                    checked={importTarget === 'existing'}
                                                    onChange={() => setImportTarget('existing')}
                                                />
                                                Apply to Existing Account
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                <input 
                                                    type="radio" 
                                                    name="importTarget" 
                                                    value="new"
                                                    checked={importTarget === 'new'}
                                                    onChange={() => setImportTarget('new')}
                                                />
                                                Create as New Liability
                                            </label>
                                        </div>
                                    </div>

                                    {importTarget === 'existing' ? (
                                        <div style={styles.formGroup}>
                                            <label style={styles.formLabel}>Select Target Account</label>
                                            <select 
                                                value={importLoanId} 
                                                onChange={e => setImportLoanId(e.target.value)}
                                                style={styles.formSelect}
                                                required
                                            >
                                                <option value="">-- Choose Target Account --</option>
                                                {data.loans.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Category</label>
                                                    <select 
                                                        value={newLoanForm.loan_type} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, loan_type: e.target.value }))}
                                                        style={styles.formSelect}
                                                        required
                                                    >
                                                        <option value="Home Loan">Home Loan</option>
                                                        <option value="Bank OD">Bank OD</option>
                                                        <option value="Business Loan (Bank)">Business Loan (Bank)</option>
                                                        <option value="Business Loan (Market Vendor)">Business Loan (Market Vendor)</option>
                                                        <option value="Goods Payable (Supplier)">Goods Payable (Supplier)</option>
                                                    </select>
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Supplier / Lender</label>
                                                    <input 
                                                        type="text" 
                                                        value={newLoanForm.lender} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, lender: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Liability Account Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={newLoanForm.name} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, name: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Account Number / Reference</label>
                                                    <input 
                                                        type="text" 
                                                        value={newLoanForm.account_number || ''} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, account_number: e.target.value }))}
                                                        style={styles.formInput} 
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Lender Mobile Number — Mandatory</label>
                                                    <input 
                                                        type="tel" 
                                                        value={newLoanForm.mobile_number || ''} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Lender Address — Optional</label>
                                                    <input 
                                                        type="text" 
                                                        value={newLoanForm.address || ''} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, address: e.target.value }))}
                                                        style={styles.formInput} 
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Principal Amount</label>
                                                    <input 
                                                        type="number" 
                                                        value={newLoanForm.principal_amount} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, principal_amount: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Annual Interest (%)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={newLoanForm.interest_rate_annual} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, interest_rate_annual: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Repayment Day (1-31)</label>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        max="31"
                                                        value={newLoanForm.repayment_day} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, repayment_day: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Tenure (Months)</label>
                                                    <input 
                                                        type="number" 
                                                        value={newLoanForm.tenure_months} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, tenure_months: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>EMI Amount</label>
                                                    <input 
                                                        type="number" 
                                                        value={newLoanForm.emi_amount} 
                                                        onChange={e => setNewLoanForm(prev => ({ ...prev, emi_amount: e.target.value }))}
                                                        style={styles.formInput} 
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Installment Preview Table */}
                                    <div style={styles.importPreview}>
                                        <div style={styles.importPreviewHeader}>
                                            First 5 Installment Preview:
                                        </div>
                                        <div style={styles.importPreviewTableWrapper}>
                                            <table style={styles.miniTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Installment</th>
                                                        <th>Principal</th>
                                                        <th>Interest</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedData.installments.slice(0, 5).map((r, i) => (
                                                        <tr key={i}>
                                                            <td>{r.due_date}</td>
                                                            <td>₹{Math.round(r.expected_amount).toLocaleString('en-IN')}</td>
                                                            <td>₹{Math.round(r.expected_principal).toLocaleString('en-IN')}</td>
                                                            <td>₹{Math.round(r.expected_interest).toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={styles.modalSubmitBtn}
                                    >
                                        Import Schedule into Database
                                    </button>
                                </form>
                            )}
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
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.5rem 0',
        zIndex: 1000,
        height: '64px',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
    },
    navTab: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem',
        background: 'transparent',
        border: 'none',
        padding: '0.25rem 0.75rem',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: '600',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        outline: 'none',
        flex: 1
    },
    mainContent: {
        paddingBottom: '6rem' // spacer for bottom nav bar to prevent content obstruction
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
    },
    viewToggleRow: {
        display: 'flex',
        gap: '0.5rem',
        marginTop: '-0.5rem',
        marginBottom: '1rem'
    },
    viewToggleBtn: {
        padding: '0.4rem 0.75rem',
        borderRadius: '0.375rem',
        fontSize: '0.8rem',
        fontWeight: '600',
        border: '1px solid',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        transition: 'all 0.2s'
    },
    calendarContainer: {
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    calendarNav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
    },
    calendarNavBtn: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#ffffff',
        padding: '0.35rem 0.75rem',
        borderRadius: '0.375rem',
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    calendarNavTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#ffffff',
        margin: 0
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.5rem',
        width: '100%'
    },
    weekdayCell: {
        textAlign: 'center',
        fontWeight: '700',
        fontSize: '0.8rem',
        color: '#94a3b8',
        padding: '0.5rem 0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    emptyDayCell: {
        background: 'transparent',
        aspectRatio: '1',
        borderRadius: '0.5rem'
    },
    dayCell: {
        aspectRatio: '1',
        minHeight: '80px',
        padding: '0.4rem',
        borderRadius: '0.5rem',
        border: '1px solid',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s'
    },
    dayNumLabel: {
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#f8fafc'
    },
    dayContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        overflow: 'hidden',
        marginTop: '0.25rem',
        flex: 1
    },
    miniRepaymentCard: {
        padding: '0.15rem 0.3rem',
        borderRadius: '0.25rem',
        fontSize: '0.65rem',
        fontWeight: '700',
        border: '1px solid',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    miniRepName: {
        color: '#ffffff',
        opacity: 0.9,
        fontWeight: '800'
    },
    miniRepAmt: {
        fontSize: '0.6rem',
        opacity: 0.8
    },
    mobileDotContainer: {
        display: 'none',
        justifyContent: 'center',
        gap: '0.15rem',
        width: '100%',
        marginTop: '0.2rem'
    },
    mobileDot: {
        width: '5px',
        height: '5px',
        borderRadius: '50%'
    },
    dayDetailPanel: {
        marginTop: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '1.25rem'
    },
    dayDetailTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '0.75rem'
    },
    emptyDayDetails: {
        color: '#64748b',
        fontSize: '0.85rem',
        fontStyle: 'italic'
    },
    dayDetailList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
    },
    dayDetailItem: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
    },
    dayDetailItemMain: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1
    },
    dayDetailItemSide: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.4rem'
    },
    dayDetailBtnRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    payDayBtn: {
        backgroundColor: '#6366f1',
        border: 'none',
        color: '#ffffff',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.7rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    liabilitiesControlRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
    },
    filtersWrapper: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center'
    },
    filterItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem'
    },
    filterLabel: {
        fontSize: '0.75rem',
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    filterDropdownSmall: {
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#ffffff',
        padding: '0.35rem 0.6rem',
        borderRadius: '0.375rem',
        fontSize: '0.8rem',
        outline: 'none',
        cursor: 'pointer'
    },
    tableCardContainer: {
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.25rem',
        overflow: 'hidden'
    },
    customTable: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
    },
    iconBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '0.25rem',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    detailViewContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    detailSelectorRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem'
    },
    detailSelectorLabel: {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#94a3b8'
    },
    detailDropdown: {
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#ffffff',
        padding: '0.4rem 0.75rem',
        borderRadius: '0.375rem',
        fontSize: '0.85rem',
        outline: 'none',
        cursor: 'pointer',
        flex: 1
    },
    detailGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    detailMainCard: {
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.5rem'
    },
    detailMainHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        paddingBottom: '1rem',
        marginBottom: '1rem'
    },
    detailMainTitle: {
        fontSize: '1.5rem',
        fontWeight: '800',
        color: '#ffffff',
        margin: 0
    },
    detailStatsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        '@media (max-width: 800px)': {
            gridTemplateColumns: 'repeat(2, 1fr)'
        }
    },
    detailStatBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    },
    detailStatLabel: {
        fontSize: '0.75rem',
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    detailStatVal: {
        fontSize: '1.2rem',
        fontWeight: '800',
        color: '#ffffff'
    },
    detailSectionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.25rem',
        '@media (max-width: 800px)': {
            gridTemplateColumns: '1fr'
        }
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
        @media (max-width: 600px) {
            /* Compact day cells on mobile */
            div[style*="min-height: 80px"] {
                min-height: 48px !important;
                aspect-ratio: 1 !important;
                align-items: center !important;
                justify-content: center !important;
            }
            div[style*="overflow: hidden"] {
                display: none !important;
            }
            div[style*="display: none"] {
                display: flex !important;
            }
        }
    `;
    document.head.appendChild(styleEl);
}
