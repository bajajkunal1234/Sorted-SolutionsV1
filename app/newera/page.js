'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
    Eye,
    SlidersHorizontal
} from 'lucide-react';

const DEFAULT_LIABILITY_COLUMNS = [
    { id: 'name', label: 'Name', width: 160, visible: true, sortable: true },
    { id: 'lender', label: 'Lender', width: 140, visible: true, sortable: true },
    { id: 'mobile_number', label: 'Mobile', width: 130, visible: true, sortable: true },
    { id: 'address', label: 'Address', width: 150, visible: true, sortable: true },
    { id: 'loan_type', label: 'Category', width: 130, visible: true, sortable: true },
    { id: 'principal_amount', label: 'Principal', width: 130, visible: true, sortable: true },
    { id: 'interest_rate_annual', label: 'Interest', width: 95, visible: true, sortable: true },
    { id: 'remaining', label: 'Remaining', width: 130, visible: true, sortable: true },
    { id: 'emi_amount', label: 'EMI', width: 110, visible: true, sortable: true },
    { id: 'repayment_day', label: 'Repayment Day', width: 130, visible: true, sortable: true },
    { id: 'attachment_url', label: 'Statement', width: 110, visible: true, sortable: false },
    { id: 'actions', label: 'Actions', width: 100, visible: true, sortable: false }
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

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
    const [listScopeFilter, setListScopeFilter] = useState('all'); // 'all', 'month', 'unpaid'

    const todayDateObj = new Date();
    const isCurrentMonth = 
        currentMonth.getFullYear() === todayDateObj.getFullYear() && 
        currentMonth.getMonth() === todayDateObj.getMonth();

    const handleMonthChange = (newDate) => {
        setCurrentMonth(newDate);
        const today = new Date();
        if (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth()) {
            setSelectedCalendarDay(today.toISOString().split('T')[0]);
        } else {
            const y = newDate.getFullYear();
            const m = String(newDate.getMonth() + 1).padStart(2, '0');
            setSelectedCalendarDay(`${y}-${m}-01`);
        }
    };

    const availableYears = useMemo(() => {
        let minYear = 2020;
        let maxYear = 2045;
        const currentYear = currentMonth ? currentMonth.getFullYear() : 2026;
        const thisYear = new Date().getFullYear();
        if (currentYear < minYear) minYear = currentYear;
        if (currentYear > maxYear) maxYear = currentYear;
        if (thisYear < minYear) minYear = thisYear;
        if (thisYear > maxYear) maxYear = thisYear;

        (data?.loans || []).forEach(l => {
            if (l.start_date) {
                const y = parseInt(String(l.start_date).slice(0, 4), 10);
                if (!isNaN(y)) {
                    if (y < minYear) minYear = y;
                    if (y > maxYear) maxYear = y;
                }
            }
        });
        (data?.repayments || []).forEach(r => {
            if (r.due_date) {
                const y = parseInt(String(r.due_date).slice(0, 4), 10);
                if (!isNaN(y)) {
                    if (y < minYear) minYear = y;
                    if (y > maxYear) maxYear = y;
                }
            }
        });
        (data?.payments || []).forEach(p => {
            if (p.payment_date) {
                const y = parseInt(String(p.payment_date).slice(0, 4), 10);
                if (!isNaN(y)) {
                    if (y < minYear) minYear = y;
                    if (y > maxYear) maxYear = y;
                }
            }
        });

        const years = [];
        for (let y = minYear; y <= maxYear; y++) {
            years.push(y);
        }
        return years;
    }, [data?.loans, data?.repayments, data?.payments, currentMonth]);

    // Liabilities View States
    const [editingLoanId, setEditingLoanId] = useState(null);
    const [liabilitiesView, setLiabilitiesView] = useState('table'); // 'table', 'card', 'detail'
    const [selectedDetailLoanId, setSelectedDetailLoanId] = useState('');
    const [liabilityFilterType, setLiabilityFilterType] = useState('all');
    const [liabilitySortBy, setLiabilitySortBy] = useState('name_asc');

    // Dynamic Columns & Sorting for Liabilities Table
    const [liabilityColumns, setLiabilityColumns] = useState(DEFAULT_LIABILITY_COLUMNS);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [tableSort, setTableSort] = useState({ column: 'name', direction: 'asc' });
    const columnSettingsRef = useRef(null);

    // Close column settings on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
                setShowColumnSettings(false);
            }
        };
        if (showColumnSettings) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showColumnSettings]);

    // Load saved column preferences
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('newera_liabilities_columns');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const merged = DEFAULT_LIABILITY_COLUMNS.map(def => {
                        const found = parsed.find(p => p.id === def.id);
                        return found ? { ...def, width: found.width || def.width, visible: found.visible !== undefined ? found.visible : def.visible } : def;
                    });
                    setLiabilityColumns(merged);
                } catch (e) {
                    console.error('Failed to load column settings:', e);
                }
            }
        }
    }, []);

    // Dynamic Mobile & Native APK Safe Area Detection (prevents top notification bar and bottom 3-button phone navigation overlap)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isNative = !!window.Capacitor || 
                             window.location.protocol === 'capacitor:' || 
                             /capacitor/i.test(navigator.userAgent) ||
                             window.matchMedia('(display-mode: standalone)').matches;

            if (isNative) {
                document.documentElement.classList.add('is-native-app');
            }

            // Test if env(safe-area-inset-bottom) is natively reported
            const testDiv = document.createElement('div');
            testDiv.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom, 0px);visibility:hidden;pointer-events:none;';
            document.body.appendChild(testDiv);
            const reportedInset = testDiv.offsetHeight || 0;
            document.body.removeChild(testDiv);

            if (reportedInset > 0) {
                document.documentElement.style.setProperty('--safe-bottom', reportedInset + 'px');
            } else if (isNative && /android/i.test(navigator.userAgent)) {
                // On Android APK where insets were zeroed out by window layout, apply 48px to clear 3-button navigation
                document.documentElement.style.setProperty('--safe-bottom', '48px');
            } else {
                document.documentElement.style.setProperty('--safe-bottom', '0px');
            }

            // Test if env(safe-area-inset-top) is natively reported
            const testTopDiv = document.createElement('div');
            testTopDiv.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top, 0px);visibility:hidden;pointer-events:none;';
            document.body.appendChild(testTopDiv);
            const reportedTopInset = testTopDiv.offsetHeight || 0;
            document.body.removeChild(testTopDiv);

            if (reportedTopInset > 0) {
                document.documentElement.style.setProperty('--safe-top', reportedTopInset + 'px');
            } else if (isNative && /android/i.test(navigator.userAgent)) {
                // On Android APK where insets were zeroed out by window layout, apply 38px to clear top notification/status bar
                document.documentElement.style.setProperty('--safe-top', '38px');
            } else {
                document.documentElement.style.setProperty('--safe-top', '0px');
            }
        }
    }, []);

    const saveColumnsConfig = (newCols) => {
        setLiabilityColumns(newCols);
        if (typeof window !== 'undefined') {
            localStorage.setItem('newera_liabilities_columns', JSON.stringify(newCols));
        }
    };

    const handleColumnResizeMouseDown = (colId, e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const currentCol = liabilityColumns.find(c => c.id === colId);
        if (!currentCol) return;
        const startWidth = currentCol.width || 120;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            setLiabilityColumns(prev => prev.map(c => 
                c.id === colId ? { ...c, width: Math.max(60, startWidth + deltaX) } : c
            ));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setLiabilityColumns(latestCols => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('newera_liabilities_columns', JSON.stringify(latestCols));
                }
                return latestCols;
            });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleColumnResizeTouchStart = (colId, e) => {
        e.stopPropagation();
        if (!e.touches || e.touches.length === 0) return;
        const startX = e.touches[0].clientX;
        const currentCol = liabilityColumns.find(c => c.id === colId);
        if (!currentCol) return;
        const startWidth = currentCol.width || 120;

        const handleTouchMove = (moveEvent) => {
            if (!moveEvent.touches || moveEvent.touches.length === 0) return;
            const deltaX = moveEvent.touches[0].clientX - startX;
            setLiabilityColumns(prev => 
                prev.map(c => c.id === colId ? { ...c, width: Math.max(60, startWidth + deltaX) } : c)
            );
        };

        const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            setLiabilityColumns(latestCols => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('newera_liabilities_columns', JSON.stringify(latestCols));
                }
                return latestCols;
            });
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
    };

    const handleHeaderSort = (colId) => {
        const colDef = liabilityColumns.find(c => c.id === colId);
        if (!colDef || !colDef.sortable) return;

        setTableSort(prev => {
            const nextDir = (prev.column === colId && prev.direction === 'asc') ? 'desc' : 'asc';
            if (colId === 'name') setLiabilitySortBy(nextDir === 'asc' ? 'name_asc' : 'name_desc');
            else if (colId === 'principal_amount') setLiabilitySortBy(nextDir === 'asc' ? 'principal_asc' : 'principal_desc');
            else if (colId === 'remaining') setLiabilitySortBy(nextDir === 'asc' ? 'remaining_asc' : 'remaining_desc');
            return { column: colId, direction: nextDir };
        });
    };

    const toggleColumnVisibility = (colId) => {
        const visibleCols = liabilityColumns.filter(c => c.visible);
        const col = liabilityColumns.find(c => c.id === colId);
        if (col && col.visible && visibleCols.length <= 1) {
            alert('At least one column must remain visible.');
            return;
        }
        const updated = liabilityColumns.map(c => 
            c.id === colId ? { ...c, visible: !c.visible } : c
        );
        saveColumnsConfig(updated);
    };

    const resetColumns = () => {
        saveColumnsConfig(DEFAULT_LIABILITY_COLUMNS);
    };

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

    const getLoanRemaining = (loan) => {
        if (!loan) return 0;
        const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
        const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion || 0), 0);
        return Math.max(0, parseFloat(loan.principal_amount || 0) - paidPrincipal);
    };

    const getFilteredAndSortedLoans = () => {
        let list = [...data.loans];

        if (liabilitySearchQuery) {
            const q = liabilitySearchQuery.toLowerCase();
            list = list.filter(l => 
                l.name.toLowerCase().includes(q) || 
                l.lender.toLowerCase().includes(q) || 
                l.loan_type.toLowerCase().includes(q) ||
                (l.mobile_number && l.mobile_number.toLowerCase().includes(q)) ||
                (l.address && l.address.toLowerCase().includes(q))
            );
        }

        if (liabilityFilterType !== 'all') {
            list = list.filter(l => l.loan_type === liabilityFilterType);
        }

        const getRemaining = getLoanRemaining;

        if (liabilitiesView === 'table' && tableSort.column) {
            const dir = tableSort.direction === 'asc' ? 1 : -1;
            list.sort((a, b) => {
                switch (tableSort.column) {
                    case 'name':
                        return a.name.localeCompare(b.name) * dir;
                    case 'lender':
                        return (a.lender || '').localeCompare(b.lender || '') * dir;
                    case 'mobile_number':
                        return (a.mobile_number || '').localeCompare(b.mobile_number || '') * dir;
                    case 'address':
                        return (a.address || '').localeCompare(b.address || '') * dir;
                    case 'loan_type':
                        return (a.loan_type || '').localeCompare(b.loan_type || '') * dir;
                    case 'principal_amount':
                        return (parseFloat(a.principal_amount || 0) - parseFloat(b.principal_amount || 0)) * dir;
                    case 'interest_rate_annual':
                        return (parseFloat(a.interest_rate_annual || 0) - parseFloat(b.interest_rate_annual || 0)) * dir;
                    case 'remaining':
                        return (getRemaining(a) - getRemaining(b)) * dir;
                    case 'emi_amount':
                        return (parseFloat(a.emi_amount || 0) - parseFloat(b.emi_amount || 0)) * dir;
                    case 'repayment_day':
                        return ((parseInt(a.repayment_day) || 5) - (parseInt(b.repayment_day) || 5)) * dir;
                    default:
                        return 0;
                }
            });
        } else {
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
                    return liabilitySortBy === 'remaining_desc' 
                        ? getRemaining(b) - getRemaining(a)
                        : getRemaining(a) - getRemaining(b);
                }
                return 0;
            });
        }

        return list;
    };

    const getFilteredPayments = () => {
        let list = [...data.payments];
        if (paymentSearchQuery) {
            const q = paymentSearchQuery.toLowerCase();
            list = list.filter(p => {
                const loan = data.loans.find(l => l.id === p.loan_id);
                const member = data.members.find(m => m.id === p.member_id);
                return (
                    (loan && loan.name.toLowerCase().includes(q)) ||
                    (loan && loan.lender.toLowerCase().includes(q)) ||
                    (member && member.name.toLowerCase().includes(q)) ||
                    (p.source_of_income && p.source_of_income.toLowerCase().includes(q)) ||
                    (p.notes && p.notes.toLowerCase().includes(q))
                );
            });
        }
        list.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
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

    // Search & View toggles
    const [liabilitySearchQuery, setLiabilitySearchQuery] = useState('');
    const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
    const [paymentsView, setPaymentsView] = useState('table'); // 'table' or 'detail'
    const [selectedDetailPaymentId, setSelectedDetailPaymentId] = useState('');

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

    const [autoBreakdownBadge, setAutoBreakdownBadge] = useState({ text: '', type: '' });

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

    const normalizeDateStr = (d) => {
        if (!d) return '';
        return typeof d === 'string' ? d.split('T')[0] : '';
    };

    const formatShortIndian = (num) => {
        if (!num) return '0';
        const val = Math.abs(num);
        if (val >= 10000000) {
            return (num / 10000000).toFixed(val % 10000000 === 0 ? 0 : 1) + 'Cr';
        }
        if (val >= 100000) {
            return (num / 100000).toFixed(val % 100000 === 0 ? 0 : 1) + 'L';
        }
        if (val >= 1000) {
            return (num / 1000).toFixed(val % 1000 === 0 ? 0 : 0) + 'k';
        }
        return Math.round(num).toString();
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

    // Helper to calculate interest and principal breakdown based on statements or interest rates
    const calculatePaymentSplit = (loanId, paymentDate, amountInput, repaymentIdInput) => {
        const loan = data.loans.find(l => l.id === loanId);
        if (!loan) {
            return {
                repayment_id: '',
                amount: amountInput || '',
                principal_portion: amountInput || '',
                interest_portion: '0',
                badgeText: '',
                badgeType: ''
            };
        }

        // Check if there are schedule repayments for this loan
        const loanRepayments = data.repayments.filter(r => r.loan_id === loanId);
        let matchedRepayment = null;

        if (repaymentIdInput) {
            matchedRepayment = loanRepayments.find(r => r.id === repaymentIdInput);
        } else if (paymentDate && loanRepayments.length > 0) {
            // Find repayment matching the month & year of paymentDate
            const pMonth = paymentDate.slice(0, 7); // 'YYYY-MM'
            // First prefer unpaid matching that month
            matchedRepayment = loanRepayments.find(r => r.due_date && r.due_date.slice(0, 7) === pMonth && r.status !== 'paid');
            // If none unpaid matching month, try any matching month
            if (!matchedRepayment) {
                matchedRepayment = loanRepayments.find(r => r.due_date && r.due_date.slice(0, 7) === pMonth);
            }
            // If still none, find nearest unpaid installment
            if (!matchedRepayment) {
                const upcoming = loanRepayments.filter(r => r.status !== 'paid');
                if (upcoming.length > 0) {
                    matchedRepayment = upcoming[0];
                }
            }
        }

        const effectiveRepaymentId = matchedRepayment ? matchedRepayment.id : (repaymentIdInput || '');
        const amountNum = (amountInput !== undefined && amountInput !== '') 
            ? parseFloat(amountInput) 
            : (matchedRepayment 
                ? parseFloat(matchedRepayment.expected_amount) 
                : (loan.emi_amount ? parseFloat(loan.emi_amount) : 0));
        
        const effectiveAmount = isNaN(amountNum) || amountNum <= 0
            ? (amountInput !== undefined ? amountInput : '') 
            : (amountInput !== undefined && amountInput !== '' ? amountInput : (Number.isInteger(amountNum) ? String(amountNum) : amountNum.toFixed(2)));

        // Case 1: Matched with a schedule installment (e.g. Axis Finance statement)
        if (matchedRepayment) {
            const expTotal = parseFloat(matchedRepayment.expected_amount || 0);
            const expInterest = parseFloat(matchedRepayment.expected_interest || 0);
            const expPrincipal = parseFloat(matchedRepayment.expected_principal || 0);

            let prin = 0;
            let intr = 0;

            if (isNaN(amountNum) || amountNum <= 0) {
                prin = '';
                intr = '';
            } else if (Math.abs(amountNum - expTotal) < 0.01) {
                prin = expPrincipal;
                intr = expInterest;
            } else if (amountNum >= expInterest) {
                intr = expInterest;
                prin = amountNum - intr;
            } else {
                intr = amountNum;
                prin = 0;
            }

            const formattedPrin = prin !== '' ? (Number.isInteger(prin) ? String(prin) : prin.toFixed(2)) : '';
            const formattedIntr = intr !== '' ? (Number.isInteger(intr) ? String(intr) : intr.toFixed(2)) : '';
            const instLabel = matchedRepayment.installment_number ? `Inst #${matchedRepayment.installment_number}` : 'Installment';

            return {
                repayment_id: matchedRepayment.id,
                amount: effectiveAmount,
                principal_portion: formattedPrin,
                interest_portion: formattedIntr,
                badgeText: `Auto-read from Statement Schedule: ${instLabel} (Due ${matchedRepayment.due_date}) — Interest ₹${Math.round(expInterest).toLocaleString('en-IN')}, Principal ₹${Math.round(expPrincipal).toLocaleString('en-IN')}`,
                badgeType: 'schedule'
            };
        }

        // Case 2: No schedule installment, but loan has annual interest rate
        const annualRate = parseFloat(loan.interest_rate_annual || 0);
        if (annualRate > 0) {
            const remainingPrincipal = getLoanRemaining(loan);
            const principalBase = remainingPrincipal > 0 ? remainingPrincipal : parseFloat(loan.principal_amount || 0);
            const monthlyInterest = Math.round((principalBase * (annualRate / 100)) / 12);

            let prin = 0;
            let intr = 0;

            if (isNaN(amountNum) || amountNum <= 0) {
                prin = '';
                intr = '';
            } else if (amountNum >= monthlyInterest) {
                intr = monthlyInterest;
                prin = amountNum - intr;
            } else {
                intr = amountNum;
                prin = 0;
            }

            const formattedPrin = prin !== '' ? (Number.isInteger(prin) ? String(prin) : prin.toFixed(2)) : '';
            const formattedIntr = intr !== '' ? (Number.isInteger(intr) ? String(intr) : intr.toFixed(2)) : '';

            return {
                repayment_id: '',
                amount: effectiveAmount,
                principal_portion: formattedPrin,
                interest_portion: formattedIntr,
                badgeText: `Auto-calculated: ${annualRate}% p.a. on ₹${Math.round(principalBase).toLocaleString('en-IN')} balance = ₹${monthlyInterest.toLocaleString('en-IN')} interest`,
                badgeType: 'formula'
            };
        }

        // Case 3: 0% interest
        const formattedPrin = (!isNaN(amountNum) && amountNum > 0) ? (Number.isInteger(amountNum) ? String(amountNum) : amountNum.toFixed(2)) : '';
        return {
            repayment_id: '',
            amount: effectiveAmount,
            principal_portion: formattedPrin,
            interest_portion: '0',
            badgeText: '0% Interest liability — 100% allocated to principal',
            badgeType: 'zero'
        };
    };

    // Auto calculate payment split when amount is changed
    const handlePaymentAmountChange = (amountVal, loanId, repaymentId, paymentDate) => {
        const amt = parseFloat(amountVal || 0);
        if (amt <= 0) {
            setPaymentForm(prev => ({ ...prev, amount: amountVal, principal_portion: '', interest_portion: '' }));
            setAutoBreakdownBadge({ text: '', type: '' });
            return;
        }

        const split = calculatePaymentSplit(loanId, paymentDate || paymentForm.payment_date, amountVal, repaymentId);
        setPaymentForm(prev => ({
            ...prev,
            amount: amountVal,
            principal_portion: split.principal_portion,
            interest_portion: split.interest_portion
        }));
        setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
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
                setAutoBreakdownBadge({ text: '', type: '' });
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
        <div style={styles.dashboardWrapper} className="dashboard-wrapper">
            {/* Header Area */}
            <header style={styles.header} className="dashboard-header">
                <div style={styles.headerInfo} className="header-info">
                    <div style={styles.systemBadge} className="system-badge">NEW ERA LIABILITIES</div>
                    <span style={styles.headerTitle} className="header-title">System Controller</span>
                </div>
                <div style={styles.headerActions} className="header-actions">
                    <div style={styles.userInfo} className="user-info">
                        <UserCheck size={16} color="#6366f1" />
                        <span style={styles.userName}>{activeMember}</span>
                    </div>
                    <button onClick={handleLogout} style={styles.logoutButton} className="logout-btn" title="Logout">
                        <LogOut size={16} />
                        <span style={styles.logoutText} className="logout-text">Exit Console</span>
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav style={styles.navBar} className="bottom-nav-bar">
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
                        <section style={styles.heroSection} className="hero-section">
                            <div style={styles.heroGlow}></div>
                            <div style={styles.heroContent}>
                                <span style={styles.heroLabel}>OUTSTANDING PRINCIPAL AMOUNT</span>
                                <h1 style={styles.heroNumber} className="hero-number">
                                    ₹{metrics.outstandingPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h1>
                                <div style={styles.heroSubmetrics} className="hero-submetrics">
                                    <div style={styles.heroSubItem} className="hero-sub-item">
                                        <span style={styles.subItemLabel}>Total Outstanding to Pay</span>
                                        <span style={styles.subItemValue}>₹{Math.round(metrics.totalOutstandingToPay).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={styles.divider} className="divider"></div>
                                    <div style={styles.heroSubItem} className="hero-sub-item">
                                        <span style={styles.subItemLabel}>Unpaid Interest Due</span>
                                        <span style={styles.subItemValue}>₹{Math.round(metrics.unpaidInterestDue).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={styles.divider} className="divider"></div>
                                    <div style={styles.heroSubItem} className="hero-sub-item">
                                        <span style={styles.subItemLabel}>Total Paid Till Date</span>
                                        <span style={styles.subItemValue}>₹{Math.round(metrics.totalPayments).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.25rem' }}>
                                    <a 
                                        href="/sorted-tracker-v2.apk" 
                                        download="sorted-tracker-v2.apk"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                            color: '#ffffff',
                                            padding: '0.4rem 0.9rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                        }}
                                    >
                                        📲 Install Android App (V2 APK)
                                    </a>
                                </div>
                            </div>
                        </section>

                    </div>
                )}

                {/* LIABILITIES TAB */}
                {activeTab === 'liabilities' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow} className="tab-header-row">
                            <h2 style={styles.panelTitle}>Active Loans & Accounts Payable</h2>
                            <button onClick={() => { setEditingLoanId(null); setShowAddLoan(true); }} style={styles.primaryActionButton}>
                                <Plus size={16} /> Add Liability
                            </button>
                        </div>

                        {/* Controls: View Toggles, Filter, Sort */}
                        {data.loans.length > 0 && (
                            <div style={styles.liabilitiesControlRow} className="liabilities-control-row">
                                <div style={{ ...styles.viewToggleRow, margin: 0 }} className="view-toggle-row">
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
                                    <div style={styles.filtersWrapper} className="filters-wrapper">
                                        <div style={{ ...styles.filterItem, flex: 1, minWidth: '160px' }}>
                                            <span style={styles.filterLabel}>Search</span>
                                            <input 
                                                type="text" 
                                                placeholder="Search name, lender..."
                                                value={liabilitySearchQuery}
                                                onChange={e => setLiabilitySearchQuery(e.target.value)}
                                                style={styles.filterInput}
                                            />
                                        </div>
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

                                        {liabilitiesView === 'table' && (
                                            <div ref={columnSettingsRef} style={{ position: 'relative' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowColumnSettings(prev => !prev)}
                                                    style={{
                                                        ...styles.viewToggleBtn,
                                                        backgroundColor: showColumnSettings ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                                        color: showColumnSettings ? '#ffffff' : '#94a3b8',
                                                        borderColor: showColumnSettings ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontSize: '0.8rem',
                                                        padding: '0.35rem 0.65rem'
                                                    }}
                                                    title="Configure table columns"
                                                >
                                                    <SlidersHorizontal size={14} />
                                                    <span>Columns ({liabilityColumns.filter(c => c.visible).length})</span>
                                                </button>

                                                {showColumnSettings && (
                                                    <div style={styles.colSettingsPopover}>
                                                        <div style={styles.colSettingsHeader}>
                                                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff' }}>Manage Columns</span>
                                                            <button type="button" onClick={resetColumns} style={styles.colResetBtn}>Reset</button>
                                                        </div>
                                                        <div style={styles.colSettingsList}>
                                                            {liabilityColumns.map(col => (
                                                                <label key={col.id} style={styles.colSettingsItem}>
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={col.visible}
                                                                        onChange={() => toggleColumnVisibility(col.id)}
                                                                        style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                                    />
                                                                    <span style={{ color: col.visible ? '#f8fafc' : '#64748b', fontSize: '0.8rem' }}>
                                                                        {col.label}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setShowColumnSettings(false)}
                                                            style={styles.colSettingsDoneBtn}
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                        <div style={styles.loansGrid} className="loans-grid">
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
                                    {liabilitiesView === 'table' && (() => {
                                        const visibleColumns = liabilityColumns.filter(c => c.visible);
                                        const totalTableWidth = visibleColumns.reduce((sum, c) => sum + (c.width || 120), 0);
                                        const sortedLoans = getFilteredAndSortedLoans();

                                        return (
                                            <div style={styles.tableCardContainer} className="table-card-container">
                                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                                                    <table style={{ ...styles.customTable, tableLayout: 'fixed', minWidth: `${totalTableWidth}px`, width: '100%' }}>
                                                        <thead>
                                                            <tr>
                                                                {visibleColumns.map(col => {
                                                                    const isSorted = tableSort.column === col.id;
                                                                    return (
                                                                        <th 
                                                                            key={col.id} 
                                                                            style={{ 
                                                                                width: `${col.width}px`, 
                                                                                minWidth: `${col.width}px`, 
                                                                                position: 'relative', 
                                                                                cursor: col.sortable ? 'pointer' : 'default', 
                                                                                userSelect: 'none' 
                                                                            }}
                                                                            onClick={() => col.sortable && handleHeaderSort(col.id)}
                                                                            title={col.sortable ? `Sort by ${col.label}` : undefined}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', paddingRight: '6px' }}>
                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                                                                                {col.sortable && (
                                                                                    <span style={{ fontSize: '10px', color: isSorted ? '#818cf8' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                                                                        {isSorted ? (tableSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span 
                                                                                className="col-resizer" 
                                                                                onMouseDown={e => handleColumnResizeMouseDown(col.id, e)} 
                                                                                onTouchStart={e => handleColumnResizeTouchStart(col.id, e)} 
                                                                                onClick={e => e.stopPropagation()} 
                                                                            />
                                                                        </th>
                                                                    );
                                                                })}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sortedLoans.map(loan => {
                                                                const loanPayments = data.payments.filter(p => p.loan_id === loan.id);
                                                                const paidPrincipal = loanPayments.reduce((sum, p) => sum + parseFloat(p.principal_portion || 0), 0);
                                                                const outstanding = Math.max(0, parseFloat(loan.principal_amount || 0) - paidPrincipal);

                                                                return (
                                                                    <tr key={loan.id}>
                                                                        {visibleColumns.map(col => {
                                                                            switch (col.id) {
                                                                                case 'name':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.name}>
                                                                                            {loan.name}
                                                                                        </td>
                                                                                    );
                                                                                case 'lender':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.lender}>
                                                                                            {loan.lender}
                                                                                        </td>
                                                                                    );
                                                                                case 'mobile_number':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            {loan.mobile_number || 'N/A'}
                                                                                        </td>
                                                                                    );
                                                                                case 'address':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.address}>
                                                                                            {loan.address || 'N/A'}
                                                                                        </td>
                                                                                    );
                                                                                case 'loan_type':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            <span style={{
                                                                                                ...styles.statusBadge,
                                                                                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                                                                                color: '#818cf8',
                                                                                                borderColor: 'rgba(99, 102, 241, 0.25)',
                                                                                                fontSize: '0.65rem'
                                                                                            }}>{loan.loan_type}</span>
                                                                                        </td>
                                                                                    );
                                                                                case 'principal_amount':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            ₹{parseFloat(loan.principal_amount || 0).toLocaleString('en-IN')}
                                                                                        </td>
                                                                                    );
                                                                                case 'interest_rate_annual':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            {loan.interest_rate_annual}%
                                                                                        </td>
                                                                                    );
                                                                                case 'remaining':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, color: '#818cf8', fontWeight: '700' }}>
                                                                                            ₹{outstanding.toLocaleString('en-IN')}
                                                                                        </td>
                                                                                    );
                                                                                case 'emi_amount':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            {loan.emi_amount ? `₹${parseFloat(loan.emi_amount).toLocaleString('en-IN')}` : 'N/A'}
                                                                                        </td>
                                                                                    );
                                                                                case 'repayment_day':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
                                                                                            Day {loan.repayment_day || 5}
                                                                                        </td>
                                                                                    );
                                                                                case 'attachment_url':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
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
                                                                                    );
                                                                                case 'actions':
                                                                                    return (
                                                                                        <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>
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
                                                                                    );
                                                                                default:
                                                                                    return <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}>-</td>;
                                                                            }
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
                                                            {sortedLoans.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={visibleColumns.length} style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: '2rem' }}>
                                                                        No liabilities found matching filters.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

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

                                                            <div style={styles.detailStatsRow} className="detail-stats-row">
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

                                                            <div style={{ ...styles.detailStatsRow, marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }} className="detail-stats-row">
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
                                                        <div style={styles.detailSectionsGrid} className="detail-sections-grid">
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
                        <div style={styles.tabHeaderRow} className="tab-header-row">
                            <div style={styles.titleWithFilter} className="title-with-filter">
                                <h2 style={styles.panelTitle}>Repayment Schedules</h2>
                                <select 
                                    value={selectedLoanId} 
                                    onChange={(e) => setSelectedLoanId(e.target.value)}
                                    style={styles.filterDropdown}
                                    className="filter-dropdown"
                                >
                                    <option value="all">All Liabilities</option>
                                    {data.loans.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.lender})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.tabActions} className="tab-actions">
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

                        {/* Monthly Summary Cards: Total Borrowed & Total Paid in Current Month */}
                        {(() => {
                            const monthYearStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                            const currentMonthLoans = data.loans.filter(l => 
                                (selectedLoanId === 'all' || l.id === selectedLoanId) &&
                                normalizeDateStr(l.start_date).startsWith(monthYearStr)
                            );
                            const totalBorrowedInMonth = currentMonthLoans.reduce((sum, l) => sum + parseFloat(l.principal_amount || 0), 0);

                            const currentMonthPayments = data.payments.filter(p => 
                                (selectedLoanId === 'all' || p.loan_id === selectedLoanId) &&
                                normalizeDateStr(p.payment_date).startsWith(monthYearStr)
                            );
                            const totalPaidInMonth = currentMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

                            return (
                                <div style={styles.scheduleSummaryCards} className="schedule-summary-cards">
                                    <div style={styles.scheduleSummaryCard}>
                                        <div style={styles.scheduleSummaryCardTop}>
                                            <div>
                                                <span style={styles.scheduleSummaryLabel}>
                                                    Total Borrowed ({currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })})
                                                </span>
                                                <div style={{ ...styles.scheduleSummaryValue, color: '#38bdf8' }}>
                                                    ₹{totalBorrowedInMonth.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div style={{ ...styles.scheduleSummaryIconWrapper, backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
                                                <ArrowUpRight size={22} />
                                            </div>
                                        </div>
                                        <div style={styles.scheduleSummarySubtext}>
                                            {currentMonthLoans.length === 0 
                                                ? 'No new liabilities taken this month' 
                                                : `${currentMonthLoans.length} new liabilit${currentMonthLoans.length === 1 ? 'y' : 'ies'} taken`}
                                        </div>
                                    </div>

                                    <div style={styles.scheduleSummaryCard}>
                                        <div style={styles.scheduleSummaryCardTop}>
                                            <div>
                                                <span style={styles.scheduleSummaryLabel}>
                                                    Total Paid ({currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })})
                                                </span>
                                                <div style={{ ...styles.scheduleSummaryValue, color: '#34d399' }}>
                                                    ₹{totalPaidInMonth.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div style={{ ...styles.scheduleSummaryIconWrapper, backgroundColor: 'rgba(52, 211, 153, 0.12)', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.25)' }}>
                                                <TrendingDown size={22} />
                                            </div>
                                        </div>
                                        <div style={styles.scheduleSummarySubtext}>
                                            {currentMonthPayments.length === 0 
                                                ? 'No payments recorded this month' 
                                                : `${currentMonthPayments.length} payment${currentMonthPayments.length === 1 ? '' : 's'} logged`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Toggle View Type & Shared Month Navigator */}
                        <div style={styles.viewToggleRow} className="view-toggle-row">
                            <div style={styles.viewToggleBtnGroup} className="view-toggle-btn-group">
                                <button 
                                    onClick={() => setScheduleView('calendar')} 
                                    style={{
                                        ...styles.viewToggleBtn,
                                        backgroundColor: scheduleView === 'calendar' ? '#6366f1' : 'transparent',
                                        color: scheduleView === 'calendar' ? '#ffffff' : '#94a3b8',
                                        borderColor: scheduleView === 'calendar' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                    }}
                                    className="view-toggle-btn"
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
                                    className="view-toggle-btn"
                                >
                                    <List size={14} /> List View
                                </button>
                            </div>

                            {/* Month & Year Navigation (Accessible in BOTH Calendar and List View) */}
                            <div style={styles.calendarNavCenter} className="calendar-nav-center">
                                <button 
                                    onClick={() => handleMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} 
                                    style={styles.calendarNavBtn}
                                    className="calendar-nav-btn"
                                    title="Previous Month"
                                >
                                    &larr; Prev
                                </button>

                                {/* Month Selector */}
                                <select
                                    value={currentMonth.getMonth()}
                                    onChange={(e) => handleMonthChange(new Date(currentMonth.getFullYear(), parseInt(e.target.value, 10), 1))}
                                    style={styles.calendarSelect}
                                    className="calendar-month-select"
                                    aria-label="Select Month"
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={name} value={idx} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                                            {name}
                                        </option>
                                    ))}
                                </select>

                                {/* Year Selector */}
                                <select
                                    value={currentMonth.getFullYear()}
                                    onChange={(e) => handleMonthChange(new Date(parseInt(e.target.value, 10), currentMonth.getMonth(), 1))}
                                    style={styles.calendarSelect}
                                    className="calendar-year-select"
                                    aria-label="Select Year"
                                >
                                    {availableYears.map(yr => (
                                        <option key={yr} value={yr} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>

                                {/* Quick Today Button */}
                                <button 
                                    onClick={() => handleMonthChange(new Date())} 
                                    style={{
                                        ...styles.calendarNavBtn,
                                        ...(isCurrentMonth ? styles.calendarTodayActive : styles.calendarTodayHighlight)
                                    }}
                                    className="calendar-today-btn"
                                    title="Jump to Current Month (Today)"
                                >
                                    {isCurrentMonth ? '● Today' : '↺ Today'}
                                </button>

                                <button 
                                    onClick={() => handleMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} 
                                    style={styles.calendarNavBtn}
                                    className="calendar-nav-btn"
                                    title="Next Month"
                                >
                                    Next &rarr;
                                </button>
                            </div>

                            {/* In List View: Scope Filter (Month Only vs All Months) */}
                            {scheduleView === 'list' && (
                                <div style={styles.listScopeWrapper} className="list-scope-wrapper">
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>Show:</span>
                                    <select
                                        value={listScopeFilter}
                                        onChange={(e) => setListScopeFilter(e.target.value)}
                                        style={styles.filterDropdownSmall}
                                        className="filter-dropdown-small"
                                    >
                                        <option value="all">All Months (Entire Schedule)</option>
                                        <option value="month">{currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })} Only</option>
                                        <option value="unpaid">All Unpaid Only</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Calendar View */}
                        {scheduleView === 'calendar' && (
                            <div style={styles.calendarContainer} className="calendar-container">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }} className="calendar-grid-header">
                                    <h3 style={styles.calendarNavTitle} className="calendar-nav-title">
                                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        Click any date to inspect details
                                    </span>
                                </div>

                                <div style={styles.calendarGrid} className="calendar-grid">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                                        <div key={w} style={styles.weekdayCell} className="weekday-cell">{w}</div>
                                    ))}

                                    {getCalendarDays().map((day, idx) => {
                                        if (!day) return <div key={`empty-${idx}`} style={styles.emptyDayCell} className="empty-day-cell"></div>;

                                        const dateStr = day.dateStr;
                                        const isSelected = selectedCalendarDay === dateStr;
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                                        // 1. Borrowed on this day (new liabilities)
                                        const dayLoans = data.loans.filter(l => 
                                            normalizeDateStr(l.start_date) === dateStr && 
                                            (selectedLoanId === 'all' || l.id === selectedLoanId)
                                        );
                                        const dayBorrowedTotal = dayLoans.reduce((sum, l) => sum + parseFloat(l.principal_amount || 0), 0);

                                        // 2. Payments made on this day
                                        const dayPayments = data.payments.filter(p => 
                                            normalizeDateStr(p.payment_date) === dateStr && 
                                            (selectedLoanId === 'all' || p.loan_id === selectedLoanId)
                                        );
                                        const dayPaidTotal = dayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

                                        // 3. Scheduled Repayments due on this day
                                        const repaymentsDue = data.repayments.filter(r => 
                                            normalizeDateStr(r.due_date) === dateStr && 
                                            (selectedLoanId === 'all' || r.loan_id === selectedLoanId)
                                        );
                                        const dayDueTotal = repaymentsDue.filter(r => r.status !== 'paid').reduce((sum, r) => sum + parseFloat(r.expected_amount || 0), 0);

                                        const hasActivity = dayLoans.length > 0 || dayPayments.length > 0 || repaymentsDue.length > 0;

                                        return (
                                            <div 
                                                key={dateStr} 
                                                onClick={() => setSelectedCalendarDay(dateStr)}
                                                className="calendar-day-cell"
                                                style={{
                                                    ...styles.dayCell,
                                                    borderColor: isSelected ? '#6366f1' : isToday ? 'rgba(99, 102, 241, 0.4)' : hasActivity ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : isToday ? 'rgba(99, 102, 241, 0.04)' : 'rgba(15, 23, 42, 0.35)'
                                                }}
                                            >
                                                {/* Day Header with Day Number and Daily Totals */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px', width: '100%', minWidth: 0, overflow: 'hidden' }} className="day-cell-top">
                                                    <span style={{
                                                        ...styles.dayNumLabel,
                                                        color: isToday ? '#818cf8' : isSelected ? '#ffffff' : '#f8fafc',
                                                        fontWeight: (isToday || isSelected) ? '800' : '700'
                                                    }} className="day-cell-num">
                                                        {day.dayNum}
                                                    </span>

                                                    {/* Day Totals Summary Chips (Desktop only - hidden on mobile to avoid column blowout) */}
                                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap', minWidth: 0, maxWidth: 'calc(100% - 22px)', justifyContent: 'flex-end', overflow: 'hidden' }} className="day-totals-chips">
                                                        {dayBorrowedTotal > 0 && (
                                                            <span 
                                                                style={{ 
                                                                    fontSize: '0.58rem', 
                                                                    fontWeight: '800', 
                                                                    color: '#38bdf8', 
                                                                    backgroundColor: 'rgba(56, 189, 248, 0.16)', 
                                                                    padding: '1px 3px', 
                                                                    borderRadius: '3px',
                                                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '100%'
                                                                }} 
                                                                title={`Total Borrowed on ${dateStr}: ₹${dayBorrowedTotal.toLocaleString('en-IN')}`}
                                                            >
                                                                +₹{formatShortIndian(dayBorrowedTotal)}
                                                            </span>
                                                        )}
                                                        {dayPaidTotal > 0 && (
                                                            <span 
                                                                style={{ 
                                                                    fontSize: '0.58rem', 
                                                                    fontWeight: '800', 
                                                                    color: '#34d399', 
                                                                    backgroundColor: 'rgba(52, 211, 153, 0.16)', 
                                                                    padding: '1px 3px', 
                                                                    borderRadius: '3px',
                                                                    border: '1px solid rgba(52, 211, 153, 0.3)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '100%'
                                                                }} 
                                                                title={`Total Paid on ${dateStr}: ₹${dayPaidTotal.toLocaleString('en-IN')}`}
                                                            >
                                                                ✓₹{formatShortIndian(dayPaidTotal)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Desktop Items Content */}
                                                <div style={styles.dayContent} className="day-content">
                                                    {/* 1. New Liabilities Borrowed */}
                                                    {dayLoans.map(loan => (
                                                        <div 
                                                            key={`loan-${loan.id}`} 
                                                            className="mini-rep-card"
                                                            style={{
                                                                ...styles.miniRepaymentCard,
                                                                borderColor: 'rgba(56, 189, 248, 0.4)',
                                                                backgroundColor: 'rgba(56, 189, 248, 0.12)'
                                                            }}
                                                            title={`Borrowed: ${loan.name} (${loan.lender}) - ₹${parseFloat(loan.principal_amount).toLocaleString('en-IN')}`}
                                                        >
                                                            <div className="mini-rep-name" style={{ ...styles.miniRepName, color: '#38bdf8' }}>+ {loan.name}</div>
                                                            <div className="mini-rep-amt" style={{ ...styles.miniRepAmt, color: '#bae6fd' }}>₹{Math.round(loan.principal_amount).toLocaleString('en-IN')}</div>
                                                        </div>
                                                    ))}

                                                    {/* 2. Payments Made */}
                                                    {dayPayments.map(payment => {
                                                        const loan = data.loans.find(l => l.id === payment.loan_id);
                                                        return (
                                                            <div 
                                                                key={`payment-${payment.id}`} 
                                                                className="mini-rep-card"
                                                                style={{
                                                                    ...styles.miniRepaymentCard,
                                                                    borderColor: 'rgba(52, 211, 153, 0.4)',
                                                                    backgroundColor: 'rgba(52, 211, 153, 0.12)'
                                                                }}
                                                                title={`Paid: ₹${parseFloat(payment.amount).toLocaleString('en-IN')} (${loan ? loan.name : 'Unknown'})`}
                                                            >
                                                                <div className="mini-rep-name" style={{ ...styles.miniRepName, color: '#34d399' }}>✓ {loan ? loan.name : 'Payment'}</div>
                                                                <div className="mini-rep-amt" style={{ ...styles.miniRepAmt, color: '#a7f3d0' }}>₹{Math.round(payment.amount).toLocaleString('en-IN')}</div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* 3. Scheduled Repayments Due */}
                                                    {repaymentsDue.map(rep => {
                                                        const isPaid = rep.status === 'paid';
                                                        const isAlreadyPaidOnSameDay = isPaid && dayPayments.some(p => p.repayment_id === rep.id || p.loan_id === rep.loan_id);
                                                        if (isAlreadyPaidOnSameDay) return null;

                                                        const loan = data.loans.find(l => l.id === rep.loan_id);
                                                        return (
                                                            <div 
                                                                key={`rep-${rep.id}`} 
                                                                className="mini-rep-card"
                                                                style={{
                                                                    ...styles.miniRepaymentCard,
                                                                    borderColor: rep.status === 'paid' ? '#10b981' : rep.status === 'partially_paid' ? '#f59e0b' : '#ef4444',
                                                                    backgroundColor: rep.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : rep.status === 'partially_paid' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                                                }}
                                                                title={`${isPaid ? 'Paid' : 'Due'}: ${loan ? loan.name : 'Vendor'} - ₹${parseFloat(rep.expected_amount).toLocaleString('en-IN')} (${rep.status.toUpperCase()})`}
                                                            >
                                                                <div className="mini-rep-name" style={styles.miniRepName}>{isPaid ? '✓ ' : ''}{loan ? loan.name : 'Vendor'}</div>
                                                                <div className="mini-rep-amt" style={styles.miniRepAmt}>₹{Math.round(rep.expected_amount).toLocaleString('en-IN')}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Mobile Dots Container */}
                                                {hasActivity && (
                                                    <div style={styles.mobileDotContainer} className="mobile-dot-container">
                                                        {dayLoans.map(l => (
                                                            <span 
                                                                key={`dot-loan-${l.id}`} 
                                                                style={{ ...styles.mobileDot, backgroundColor: '#38bdf8' }}
                                                                title={`Borrowed: ₹${parseFloat(l.principal_amount).toLocaleString('en-IN')}`}
                                                            />
                                                        ))}
                                                        {dayPayments.map(p => (
                                                            <span 
                                                                key={`dot-pay-${p.id}`} 
                                                                style={{ ...styles.mobileDot, backgroundColor: '#34d399' }}
                                                                title={`Paid: ₹${parseFloat(p.amount).toLocaleString('en-IN')}`}
                                                            />
                                                        ))}
                                                        {repaymentsDue.filter(r => !(r.status === 'paid' && dayPayments.some(p => p.repayment_id === r.id || p.loan_id === r.loan_id))).map(r => (
                                                            <span 
                                                                key={`dot-rep-${r.id}`} 
                                                                style={{
                                                                    ...styles.mobileDot,
                                                                    backgroundColor: r.status === 'paid' ? '#10b981' : r.status === 'partially_paid' ? '#f59e0b' : '#ef4444'
                                                                }}
                                                                title={`Due: ₹${parseFloat(r.expected_amount).toLocaleString('en-IN')}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Day Detail Panel */}
                                {(() => {
                                    const selectedDateStr = selectedCalendarDay;
                                    const selectedDayLoans = data.loans.filter(l => 
                                        (selectedLoanId === 'all' || l.id === selectedLoanId) &&
                                        normalizeDateStr(l.start_date) === selectedDateStr
                                    );
                                    const selectedDayBorrowedTotal = selectedDayLoans.reduce((sum, l) => sum + parseFloat(l.principal_amount || 0), 0);

                                    const selectedDayPayments = data.payments.filter(p => 
                                        (selectedLoanId === 'all' || p.loan_id === selectedLoanId) &&
                                        normalizeDateStr(p.payment_date) === selectedDateStr
                                    );
                                    const selectedDayPaidTotal = selectedDayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

                                    const selectedDayRepayments = data.repayments.filter(r => 
                                        (selectedLoanId === 'all' || r.loan_id === selectedLoanId) &&
                                        normalizeDateStr(r.due_date) === selectedDateStr
                                    );
                                    const selectedDayDueTotal = selectedDayRepayments.filter(r => r.status !== 'paid').reduce((sum, r) => sum + parseFloat(r.expected_amount || 0), 0);

                                    const hasSelectedActivity = selectedDayLoans.length > 0 || selectedDayPayments.length > 0 || selectedDayRepayments.length > 0;

                                    return (
                                        <div style={styles.dayDetailPanel} className="day-detail-panel">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }} className="day-detail-header">
                                                <h4 style={{ ...styles.dayDetailTitle, margin: 0 }}>
                                                    Activity on {new Date(selectedCalendarDay + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'long' })}
                                                </h4>

                                                {/* Selected Day Totals Summary Chips */}
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }} className="day-detail-chips">
                                                    {selectedDayBorrowedTotal > 0 && (
                                                        <span style={{ 
                                                            backgroundColor: 'rgba(56, 189, 248, 0.15)', 
                                                            color: '#38bdf8', 
                                                            border: '1px solid rgba(56, 189, 248, 0.3)', 
                                                            padding: '0.2rem 0.6rem', 
                                                            borderRadius: '0.375rem', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: '700' 
                                                        }}>
                                                            Borrowed: ₹{selectedDayBorrowedTotal.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                    {selectedDayPaidTotal > 0 && (
                                                        <span style={{ 
                                                            backgroundColor: 'rgba(52, 211, 153, 0.15)', 
                                                            color: '#34d399', 
                                                            border: '1px solid rgba(52, 211, 153, 0.3)', 
                                                            padding: '0.2rem 0.6rem', 
                                                            borderRadius: '0.375rem', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: '700' 
                                                        }}>
                                                            Paid: ₹{selectedDayPaidTotal.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                    {selectedDayDueTotal > 0 && (
                                                        <span style={{ 
                                                            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                                            color: '#f87171', 
                                                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                                                            padding: '0.2rem 0.6rem', 
                                                            borderRadius: '0.375rem', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: '700' 
                                                        }}>
                                                            Due: ₹{selectedDayDueTotal.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {!hasSelectedActivity ? (
                                                <div style={styles.emptyDayDetails}>No borrowings, payments, or scheduled repayments on this day.</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                    {/* Section 1: New Liabilities Borrowed */}
                                                    {selectedDayLoans.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                <ArrowUpRight size={14} /> New Liabilities Borrowed (Day Total: ₹{selectedDayBorrowedTotal.toLocaleString('en-IN')})
                                                            </div>
                                                            <div style={styles.dayDetailList}>
                                                                {selectedDayLoans.map(loan => (
                                                                    <div key={`sel-loan-${loan.id}`} className="day-detail-item" style={{ ...styles.dayDetailItem, borderColor: 'rgba(56, 189, 248, 0.25)', backgroundColor: 'rgba(56, 189, 248, 0.04)' }}>
                                                                        <div style={styles.dayDetailItemMain}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                <strong>{loan.name}</strong>
                                                                                <span style={{ ...styles.statusBadge, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)', fontSize: '0.65rem' }}>
                                                                                    {loan.loan_type}
                                                                                </span>
                                                                            </div>
                                                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                                                Lender: <strong>{loan.lender}</strong> • Interest: {loan.interest_rate_annual}% p.a.
                                                                                {loan.tenure_months ? ` • Tenure: ${loan.tenure_months} mos` : ''}
                                                                                {loan.emi_amount ? ` • EMI: ₹${parseFloat(loan.emi_amount).toLocaleString('en-IN')}` : ''}
                                                                            </span>
                                                                        </div>
                                                                        <div style={styles.dayDetailItemSide} className="day-detail-item-side">
                                                                            <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>
                                                                                ₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}
                                                                            </strong>
                                                                            <button 
                                                                                onClick={() => startEditLoan(loan)} 
                                                                                style={{ ...styles.payDayBtn, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                                                                            >
                                                                                Edit Account
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Section 2: Payments Recorded */}
                                                    {selectedDayPayments.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                <CheckCircle size={14} /> Payments Recorded (Day Total: ₹{selectedDayPaidTotal.toLocaleString('en-IN')})
                                                            </div>
                                                            <div style={styles.dayDetailList}>
                                                                {selectedDayPayments.map(payment => {
                                                                    const loan = data.loans.find(l => l.id === payment.loan_id);
                                                                    const member = data.members.find(m => m.id === payment.member_id);
                                                                    return (
                                                                        <div key={`sel-pay-${payment.id}`} className="day-detail-item" style={{ ...styles.dayDetailItem, borderColor: 'rgba(52, 211, 153, 0.25)', backgroundColor: 'rgba(52, 211, 153, 0.04)' }}>
                                                                            <div style={styles.dayDetailItemMain}>
                                                                                <strong>{loan ? loan.name : 'Unknown Loan'} ({loan ? loan.lender : 'Vendor'})</strong>
                                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                                                    Paid by: <strong>{member ? member.name : 'Unknown'}</strong> via {payment.source_of_income}
                                                                                    {payment.principal_portion ? ` • Principal: ₹${parseFloat(payment.principal_portion).toLocaleString('en-IN')}` : ''}
                                                                                    {payment.interest_portion ? ` • Interest: ₹${parseFloat(payment.interest_portion).toLocaleString('en-IN')}` : ''}
                                                                                </span>
                                                                                {payment.notes && (
                                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>
                                                                                        Notes: {payment.notes}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div style={styles.dayDetailItemSide} className="day-detail-item-side">
                                                                                <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>
                                                                                    ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                                                                                </strong>
                                                                                <button 
                                                                                    onClick={() => handleDeletePayment(payment.id)}
                                                                                    style={{ ...styles.payDayBtn, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                                                                >
                                                                                    Delete Log
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Section 3: Scheduled Repayments Due */}
                                                    {selectedDayRepayments.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                <Calendar size={14} /> Scheduled Repayments {selectedDayDueTotal > 0 ? `Due (Day Due: ₹${selectedDayDueTotal.toLocaleString('en-IN')})` : `(All Paid)`}
                                                            </div>
                                                            <div style={styles.dayDetailList}>
                                                                {selectedDayRepayments.map(repayment => {
                                                                    const loan = data.loans.find(l => l.id === repayment.loan_id);
                                                                    return (
                                                                        <div key={repayment.id} style={styles.dayDetailItem} className="day-detail-item">
                                                                            <div style={styles.dayDetailItemMain}>
                                                                                <strong>{loan ? loan.name : 'Unknown Loan'} ({loan ? loan.lender : 'Vendor'})</strong>
                                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                                                    Installment #{repayment.installment_number || 'Custom'} • Principal: ₹{parseFloat(repayment.expected_principal).toLocaleString('en-IN')} • Interest: ₹{parseFloat(repayment.expected_interest).toLocaleString('en-IN')}
                                                                                </span>
                                                                                {repayment.notes && <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '0.15rem' }}>Notes: {repayment.notes}</span>}
                                                                            </div>
                                                                            <div style={styles.dayDetailItemSide} className="day-detail-item-side">
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
                                                                                                    const instLabel = repayment.installment_number ? `Inst #${repayment.installment_number}` : 'Installment';
                                                                                                    setPaymentForm({
                                                                                                        loan_id: repayment.loan_id,
                                                                                                        repayment_id: repayment.id,
                                                                                                        member_id: activeM ? activeM.id : '',
                                                                                                        payment_date: new Date().toISOString().split('T')[0],
                                                                                                        amount: String(repayment.expected_amount),
                                                                                                        principal_portion: String(repayment.expected_principal),
                                                                                                        interest_portion: String(repayment.expected_interest),
                                                                                                        source_of_income: 'Business',
                                                                                                        notes: `Repayment of installment #${repayment.installment_number}`
                                                                                                    });
                                                                                                    setAutoBreakdownBadge({
                                                                                                        text: `Auto-read from Statement Schedule: ${instLabel} (Due ${repayment.due_date}) — Interest ₹${Math.round(parseFloat(repayment.expected_interest)).toLocaleString('en-IN')}, Principal ₹${Math.round(parseFloat(repayment.expected_principal)).toLocaleString('en-IN')}`,
                                                                                                        type: 'schedule'
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
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Repayments Schedule List (Rendered when scheduleView is 'list') */}
                        {scheduleView === 'list' && (
                            <div style={styles.scheduleTableWrapper}>
                                {(() => {
                                    const monthYearPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                                    const displayedRepayments = data.repayments.filter(r => {
                                        if (selectedLoanId !== 'all' && r.loan_id !== selectedLoanId) return false;
                                        if (listScopeFilter === 'month') {
                                            return normalizeDateStr(r.due_date).startsWith(monthYearPrefix);
                                        }
                                        if (listScopeFilter === 'unpaid') {
                                            return r.status !== 'paid';
                                        }
                                        return true;
                                    });

                                    if (displayedRepayments.length === 0) {
                                        return (
                                            <div style={styles.bigEmptyState}>
                                                <Calendar size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                                <h3>No Scheduled Repayments Found</h3>
                                                <p>
                                                    {listScopeFilter === 'month' 
                                                        ? `No installments due in ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} for ${selectedLoanId === 'all' ? 'any liability' : 'this liability'}.`
                                                        : listScopeFilter === 'unpaid'
                                                            ? 'All installments for this selection are paid.'
                                                            : 'No scheduled repayments logged yet.'}
                                                </p>
                                                {listScopeFilter !== 'all' && (
                                                    <button 
                                                        onClick={() => setListScopeFilter('all')} 
                                                        style={{ ...styles.primaryActionButton, marginTop: '1rem' }}
                                                    >
                                                        Show All Months (Entire Schedule)
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
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
                                                {displayedRepayments.map(repayment => {
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
                                                                            const instLabel = repayment.installment_number ? `Inst #${repayment.installment_number}` : 'Installment';
                                                                            setPaymentForm({
                                                                                loan_id: repayment.loan_id,
                                                                                repayment_id: repayment.id,
                                                                                member_id: activeM ? activeM.id : '',
                                                                                payment_date: new Date().toISOString().split('T')[0],
                                                                                amount: String(repayment.expected_amount),
                                                                                principal_portion: String(repayment.expected_principal),
                                                                                interest_portion: String(repayment.expected_interest),
                                                                                source_of_income: 'Business',
                                                                                notes: `Repayment of installment #${repayment.installment_number}`
                                                                            });
                                                                            setAutoBreakdownBadge({
                                                                                text: `Auto-read from Statement Schedule: ${instLabel} (Due ${repayment.due_date}) — Interest ₹${Math.round(parseFloat(repayment.expected_interest)).toLocaleString('en-IN')}, Principal ₹${Math.round(parseFloat(repayment.expected_principal)).toLocaleString('en-IN')}`,
                                                                                type: 'schedule'
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
                                    );
                                })()}
                            </div>
                        )}
                </div>
            )}

                {/* PAYMENTS LOG TAB */}
                {activeTab === 'payments' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow} className="tab-header-row">
                            <h2 style={styles.panelTitle}>Payment History Logs</h2>
                            <button onClick={() => {
                                if (data.loans.length === 0) {
                                    alert('Please add a liability first.');
                                    return;
                                }
                                const firstLoan = data.loans[0];
                                const activeM = data.members.find(m => m.name === activeMember);
                                const today = new Date().toISOString().split('T')[0];
                                const split = calculatePaymentSplit(firstLoan.id, today, '', '');
                                setPaymentForm({
                                    loan_id: firstLoan.id,
                                    repayment_id: split.repayment_id,
                                    member_id: activeM ? activeM.id : '',
                                    payment_date: today,
                                    amount: split.amount,
                                    principal_portion: split.principal_portion,
                                    interest_portion: split.interest_portion,
                                    source_of_income: 'Business',
                                    notes: ''
                                });
                                setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
                                setShowAddPayment(true);
                            }} style={styles.primaryActionButton}>
                                <Plus size={16} /> Log Repayment Entry
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }} className="payments-control-row">
                            <div style={styles.viewToggleGroup} className="view-toggle-row">
                                <button 
                                    onClick={() => setPaymentsView('table')} 
                                    style={{
                                        ...styles.viewToggleBtn,
                                        backgroundColor: paymentsView === 'table' ? '#6366f1' : 'transparent',
                                        color: paymentsView === 'table' ? '#ffffff' : '#94a3b8',
                                        borderColor: paymentsView === 'table' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                    }}
                                >
                                    <List size={14} /> Table View
                                </button>
                                <button 
                                    onClick={() => {
                                        setPaymentsView('detail');
                                        const filteredList = getFilteredPayments();
                                        if (filteredList.length > 0 && !selectedDetailPaymentId) {
                                            setSelectedDetailPaymentId(filteredList[0].id);
                                        }
                                    }} 
                                    style={{
                                        ...styles.viewToggleBtn,
                                        backgroundColor: paymentsView === 'detail' ? '#6366f1' : 'transparent',
                                        color: paymentsView === 'detail' ? '#ffffff' : '#94a3b8',
                                        borderColor: paymentsView === 'detail' ? '#6366f1' : 'rgba(255,255,255,0.08)'
                                    }}
                                >
                                    <Eye size={14} /> Inspector View
                                </button>
                            </div>

                            <div style={styles.filtersWrapper} className="filters-wrapper">
                                <div style={{ ...styles.filterItem, flex: 1, minWidth: '200px' }} className="filter-item">
                                    <span style={styles.filterLabel}>Search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search logs by note, source..."
                                        value={paymentSearchQuery}
                                        onChange={e => setPaymentSearchQuery(e.target.value)}
                                        style={styles.filterInput}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 1. Payments list table */}
                        {paymentsView === 'table' && (
                            <div style={styles.scheduleTableWrapper}>
                                {getFilteredPayments().length === 0 ? (
                                    <div style={styles.bigEmptyState}>
                                        <ClipboardList size={48} color="#475569" style={{ marginBottom: '1rem' }} />
                                        <h3>No Payments Recorded</h3>
                                        <p>{paymentSearchQuery ? 'No payment records match your search criteria.' : 'Log a payment to start recording member contributions, principal offsets, and interest paydowns.'}</p>
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
                                            {getFilteredPayments().map(payment => {
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
                        )}

                        {/* 2. Detail Inspector view */}
                        {paymentsView === 'detail' && (
                            <div style={styles.detailViewContainer}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Select Payment Record:</span>
                                    <select 
                                        value={selectedDetailPaymentId} 
                                        onChange={e => setSelectedDetailPaymentId(e.target.value)}
                                        style={{ ...styles.filterDropdownSmall, minWidth: '220px' }}
                                    >
                                        {getFilteredPayments().map(p => {
                                            const loan = data.loans.find(l => l.id === p.loan_id);
                                            const member = data.members.find(m => m.id === p.member_id);
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.payment_date} - {loan ? loan.name : 'Unknown'} (₹{parseFloat(p.amount).toLocaleString('en-IN')})
                                                </option>
                                            );
                                        })}
                                        {getFilteredPayments().length === 0 && (
                                            <option value="">No payments found</option>
                                        )}
                                    </select>
                                </div>

                                {(() => {
                                    const payment = getFilteredPayments().find(p => p.id === selectedDetailPaymentId) || getFilteredPayments()[0];
                                    if (!payment) return <div style={styles.emptyState}>No payments to inspect. Please check search queries or log a payment.</div>;

                                    const loan = data.loans.find(l => l.id === payment.loan_id);
                                    const member = data.members.find(m => m.id === payment.member_id);

                                    return (
                                        <div style={styles.detailGrid} className="detail-sections-grid">
                                            {/* Main Payment card */}
                                            <div style={styles.detailMainCard}>
                                                <div style={styles.detailMainHeader}>
                                                    <div>
                                                        <span style={{ ...styles.loanBadge, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                                            {payment.source_of_income || 'Manual Entry'}
                                                        </span>
                                                        <h3 style={styles.detailMainTitle}>Payment Log Details</h3>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginTop: '0.2rem' }}>
                                                            Paid by <strong>{member ? member.name : 'Unknown'}</strong> on <strong>{payment.payment_date}</strong>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <button 
                                                            onClick={() => handleDeletePayment(payment.id)} 
                                                            style={{ ...styles.viewToggleBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                                        >
                                                            <Trash2 size={14} /> Delete Record
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{ ...styles.detailStatsRow, marginTop: '1.5rem' }} className="detail-stats-row">
                                                    <div style={styles.detailStatBox}>
                                                        <span style={styles.detailStatLabel}>Total Amount Paid</span>
                                                        <span style={{ ...styles.detailStatVal, color: '#10b981' }}>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div style={styles.detailStatBox}>
                                                        <span style={styles.detailStatLabel}>Principal Portion</span>
                                                        <span style={styles.detailStatVal}>₹{parseFloat(payment.principal_portion).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div style={styles.detailStatBox}>
                                                        <span style={styles.detailStatLabel}>Interest Portion</span>
                                                        <span style={styles.detailStatVal}>₹{parseFloat(payment.interest_portion).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div style={styles.detailStatBox}>
                                                        <span style={styles.detailStatLabel}>Payment Type</span>
                                                        <span style={styles.detailStatVal}>{payment.payment_type || 'Standard'}</span>
                                                    </div>
                                                </div>

                                                {payment.notes && (
                                                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                                        <span style={{ ...styles.detailStatLabel, display: 'block', marginBottom: '0.4rem' }}>Notes & Memo</span>
                                                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                                            {payment.notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Liability account overview card */}
                                            {loan && (
                                                <div style={styles.detailMainCard}>
                                                    <h3 style={{ ...styles.detailMainTitle, fontSize: '1.1rem', marginBottom: '0.75rem', color: '#818cf8' }}>
                                                        Associated Liability Account
                                                    </h3>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                                        <div>
                                                            <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Account Name</span>
                                                            <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 'bold' }}>{loan.name}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Lender / Supplier</span>
                                                            <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{loan.lender}</span>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                            <div>
                                                                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Category</span>
                                                                <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>{loan.loan_type}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Account Number</span>
                                                                <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>{loan.account_number || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* INTERACTIONS TAB */}
                {activeTab === 'interactions' && (
                    <div style={styles.tabContentSingle}>
                        <div style={styles.tabHeaderRow} className="tab-header-row">
                            <h2 style={styles.panelTitle}>System Activity Logs</h2>
                            <button onClick={fetchDashboardData} style={styles.secondaryActionButton}>
                                Refresh Log
                            </button>
                        </div>

                        <div style={styles.scheduleTableWrapper} className="schedule-table-wrapper">
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
                            <div style={styles.formGrid} className="form-grid">
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
                                    step="any"
                                    value={repaymentForm.expected_amount} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        const loan = data.loans.find(l => l.id === repaymentForm.loan_id);
                                        let prin = '';
                                        let intr = '';
                                        if (val) {
                                            const amtNum = parseFloat(val);
                                            const rate = loan ? parseFloat(loan.interest_rate_annual || 0) : 0;
                                            if (rate > 0) {
                                                const rem = getLoanRemaining(loan) || parseFloat(loan.principal_amount || 0);
                                                const mIntr = Math.round((rem * (rate / 100)) / 12);
                                                const iPart = Math.min(amtNum, mIntr);
                                                intr = String(iPart);
                                                prin = String(Math.max(0, amtNum - iPart));
                                            } else {
                                                prin = String(amtNum);
                                                intr = '0';
                                            }
                                        }
                                        setRepaymentForm(prev => ({
                                            ...prev,
                                            expected_amount: val,
                                            expected_principal: prin,
                                            expected_interest: intr
                                        }));
                                    }}
                                    placeholder="₹"
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>
                            <div style={styles.formGrid} className="form-grid">
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
                            <button onClick={() => {
                                setShowAddPayment(false);
                                setAutoBreakdownBadge({ text: '', type: '' });
                            }} style={styles.closeModalBtn}>×</button>
                        </div>
                        <form onSubmit={submitLogPayment} style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Select Liability Account</label>
                                <select 
                                    value={paymentForm.loan_id} 
                                    onChange={e => {
                                        const lid = e.target.value;
                                        const split = calculatePaymentSplit(lid, paymentForm.payment_date, '', '');
                                        setPaymentForm(prev => ({ 
                                            ...prev, 
                                            loan_id: lid, 
                                            repayment_id: split.repayment_id,
                                            amount: split.amount,
                                            principal_portion: split.principal_portion,
                                            interest_portion: split.interest_portion
                                        }));
                                        setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
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
                                        if (repId) {
                                            const split = calculatePaymentSplit(paymentForm.loan_id, paymentForm.payment_date, '', repId);
                                            setPaymentForm(prev => ({ 
                                                ...prev, 
                                                repayment_id: repId,
                                                amount: split.amount,
                                                principal_portion: split.principal_portion,
                                                interest_portion: split.interest_portion
                                            }));
                                            setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
                                        } else {
                                            const split = calculatePaymentSplit(paymentForm.loan_id, paymentForm.payment_date, paymentForm.amount, '');
                                            setPaymentForm(prev => ({ 
                                                ...prev, 
                                                repayment_id: '',
                                                principal_portion: split.principal_portion,
                                                interest_portion: split.interest_portion
                                            }));
                                            setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
                                        }
                                    }}
                                    style={styles.formSelect}
                                >
                                    <option value="">-- Direct Payment (Not Linked) --</option>
                                    {data.repayments
                                        .filter(r => r.loan_id === paymentForm.loan_id && (r.status !== 'paid' || r.id === paymentForm.repayment_id))
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
                                    onChange={e => {
                                        const newDate = e.target.value;
                                        const split = calculatePaymentSplit(paymentForm.loan_id, newDate, paymentForm.amount, '');
                                        setPaymentForm(prev => ({ 
                                            ...prev, 
                                            payment_date: newDate,
                                            repayment_id: split.repayment_id,
                                            amount: split.amount || prev.amount,
                                            principal_portion: split.principal_portion,
                                            interest_portion: split.interest_portion
                                        }));
                                        setAutoBreakdownBadge({ text: split.badgeText, type: split.badgeType });
                                    }}
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Amount Paid</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    value={paymentForm.amount} 
                                    onChange={e => handlePaymentAmountChange(e.target.value, paymentForm.loan_id, paymentForm.repayment_id, paymentForm.payment_date)}
                                    placeholder="₹"
                                    style={styles.formInput} 
                                    required 
                                />
                            </div>

                            <div style={styles.formGrid} className="form-grid">
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Principal Component</label>
                                    <input 
                                        type="number" 
                                        step="any"
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
                                        step="any"
                                        value={paymentForm.interest_portion} 
                                        onChange={e => setPaymentForm(prev => ({ ...prev, interest_portion: e.target.value }))}
                                        style={styles.formInput} 
                                        required 
                                    />
                                </div>
                            </div>

                            {autoBreakdownBadge?.text && (
                                <div style={{
                                    marginTop: '-0.25rem',
                                    marginBottom: '0.85rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.78rem',
                                    lineHeight: '1.35',
                                    backgroundColor: autoBreakdownBadge.type === 'schedule' 
                                        ? 'rgba(16, 185, 129, 0.12)' 
                                        : autoBreakdownBadge.type === 'formula' 
                                        ? 'rgba(59, 130, 246, 0.12)' 
                                        : 'rgba(148, 163, 184, 0.12)',
                                    border: `1px solid ${
                                        autoBreakdownBadge.type === 'schedule' 
                                            ? 'rgba(16, 185, 129, 0.3)' 
                                            : autoBreakdownBadge.type === 'formula' 
                                            ? 'rgba(59, 130, 246, 0.3)' 
                                            : 'rgba(148, 163, 184, 0.25)'
                                    }`,
                                    color: autoBreakdownBadge.type === 'schedule' 
                                        ? '#34d399' 
                                        : autoBreakdownBadge.type === 'formula' 
                                        ? '#60a5fa' 
                                        : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '0.9rem' }}>{autoBreakdownBadge.type === 'schedule' ? '📄' : autoBreakdownBadge.type === 'formula' ? '⚡' : 'ℹ️'}</span>
                                    <span>{autoBreakdownBadge.text}</span>
                                </div>
                            )}

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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }} className="form-grid">
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }} className="form-grid">
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }} className="form-grid">
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }} className="form-grid-three">
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }} className="form-grid">
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
        padding: 'calc(max(var(--safe-top, env(safe-area-inset-top, 0px)), 0px) + 1.5rem) 1.5rem calc(6.5rem + var(--safe-bottom, env(safe-area-inset-bottom, 0px))) 1.5rem',
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
        backgroundColor: 'rgba(9, 13, 22, 0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.5rem 0',
        paddingBottom: 'calc(0.5rem + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 4px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 4px)',
        boxSizing: 'border-box',
        zIndex: 1000,
        minHeight: 'calc(64px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
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
        paddingBottom: 'calc(6.5rem + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))' // spacer for bottom nav bar to prevent content obstruction
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
    scheduleSummaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1.25rem'
    },
    scheduleSummaryCard: {
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
    },
    scheduleSummaryCardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '0.5rem'
    },
    scheduleSummaryLabel: {
        fontSize: '0.75rem',
        color: '#94a3b8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    scheduleSummaryValue: {
        fontSize: '1.6rem',
        fontWeight: '800',
        marginTop: '0.25rem',
        letterSpacing: '-0.02em'
    },
    scheduleSummaryIconWrapper: {
        width: '42px',
        height: '42px',
        borderRadius: '0.75rem',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    scheduleSummarySubtext: {
        fontSize: '0.8rem',
        color: '#64748b'
    },
    viewToggleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        marginTop: '-0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
    },
    viewToggleBtnGroup: {
        display: 'flex',
        gap: '0.4rem',
        alignItems: 'center'
    },
    listScopeWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem'
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
        gap: '1rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
    },
    calendarNav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        gap: '0.5rem',
        flexWrap: 'wrap'
    },
    calendarNavCenter: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    calendarSelect: {
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        color: '#ffffff',
        padding: '0.35rem 0.65rem',
        borderRadius: '0.375rem',
        fontSize: '0.9rem',
        fontWeight: '700',
        outline: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    calendarTodayHighlight: {
        background: 'rgba(99, 102, 241, 0.25)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        color: '#a5b4fc',
        fontWeight: '700',
        padding: '0.35rem 0.65rem'
    },
    calendarTodayActive: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#94a3b8',
        fontWeight: '500',
        padding: '0.35rem 0.65rem'
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
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '0.5rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
    },
    weekdayCell: {
        textAlign: 'center',
        fontWeight: '700',
        fontSize: '0.8rem',
        color: '#94a3b8',
        padding: '0.5rem 0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        minWidth: 0,
        overflow: 'hidden'
    },
    emptyDayCell: {
        background: 'rgba(255, 255, 255, 0.01)',
        minHeight: '95px',
        minWidth: 0,
        borderRadius: '0.5rem',
        border: '1px dashed rgba(255, 255, 255, 0.03)',
        boxSizing: 'border-box'
    },
    dayCell: {
        minHeight: '95px',
        minWidth: 0,
        maxWidth: '100%',
        padding: '0.45rem',
        borderRadius: '0.5rem',
        border: '1px solid',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '0.25rem',
        transition: 'all 0.2s',
        overflow: 'hidden',
        boxSizing: 'border-box'
    },
    dayNumLabel: {
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#f8fafc',
        flexShrink: 0
    },
    dayContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        overflowY: 'auto',
        overflowX: 'hidden',
        marginTop: '0.25rem',
        flex: 1,
        minWidth: 0,
        width: '100%',
        maxHeight: '190px',
        boxSizing: 'border-box'
    },
    miniRepaymentCard: {
        padding: '0.2rem 0.35rem',
        borderRadius: '0.25rem',
        fontSize: '0.65rem',
        fontWeight: '700',
        border: '1px solid',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'block'
    },
    miniRepName: {
        color: '#ffffff',
        opacity: 0.9,
        fontWeight: '800',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        maxWidth: '100%',
        display: 'block'
    },
    miniRepAmt: {
        fontSize: '0.6rem',
        opacity: 0.8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        maxWidth: '100%',
        display: 'block'
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
        alignItems: 'center',
        flexWrap: 'wrap'
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
    filterInput: {
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#ffffff',
        padding: '0.35rem 0.6rem',
        borderRadius: '0.375rem',
        fontSize: '0.8rem',
        outline: 'none',
        width: '100%'
    },
    colSettingsPopover: {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '6px',
        width: '240px',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        padding: '0.85rem',
        zIndex: 999,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
    },
    colSettingsHeader: {
        fontWeight: '700',
        fontSize: '0.85rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.6rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
    },
    colResetBtn: {
        background: 'none',
        border: 'none',
        color: '#818cf8',
        fontSize: '0.75rem',
        cursor: 'pointer',
        padding: '2px 4px',
        fontWeight: '600'
    },
    colSettingsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        maxHeight: '240px',
        overflowY: 'auto'
    },
    colSettingsItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '0.2rem 0'
    },
    colSettingsDoneBtn: {
        marginTop: '0.6rem',
        width: '100%',
        padding: '0.4rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '0.375rem',
        color: '#ffffff',
        cursor: 'pointer'
    },
    tableCardContainer: {
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1rem',
        padding: '1.25rem',
        overflowX: 'auto',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
    },
    customTable: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        fontSize: '0.85rem',
        color: '#cbd5e1'
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
            color: #cbd5e1;
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
        .col-resizer {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 7px;
            cursor: col-resize;
            user-select: none;
            z-index: 10;
        }
        .col-resizer:hover, .col-resizer:active {
            background-color: #6366f1 !important;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Calendar Grid Global Layout (ensures equal 1/7 column widths on all screens) */
        .calendar-container {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .calendar-grid {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
        }
        .weekday-cell {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-align: center !important;
        }
        .empty-day-cell {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .calendar-day-cell {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .calendar-day-cell .day-cell-top {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .calendar-day-cell .day-totals-chips {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
        }
        .calendar-day-cell .day-content {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
        }
        .calendar-day-cell .mini-rep-card {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: block !important;
        }
        .calendar-day-cell .mini-rep-name,
        .calendar-day-cell .mini-rep-amt {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: block !important;
            min-width: 0 !important;
            max-width: 100% !important;
        }

        /* Mobile Viewport & Tracker Layout Overrides */
        @media (max-width: 600px) {
            html, body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
            }
            .dashboard-wrapper {
                padding-top: calc(max(var(--safe-top, 0px), env(safe-area-inset-top, 0px)) + 0.85rem) !important;
                padding-bottom: calc(6.5rem + var(--safe-bottom, env(safe-area-inset-bottom, 0px))) !important;
                padding-left: max(env(safe-area-inset-left, 0px), 0.5rem) !important;
                padding-right: max(env(safe-area-inset-right, 0px), 0.5rem) !important;
                overflow-x: hidden !important;
                max-width: 100vw !important;
                box-sizing: border-box !important;
            }

            .is-native-app .dashboard-wrapper {
                padding-top: calc(max(var(--safe-top, 38px), env(safe-area-inset-top, 38px)) + 0.85rem) !important;
            }

            /* Dashboard Header */
            .dashboard-header {
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding-bottom: 0.75rem !important;
            }
            .system-badge {
                font-size: 0.62rem !important;
            }
            .header-title {
                font-size: 1rem !important;
            }
            .header-actions {
                gap: 0.4rem !important;
            }
            .user-info {
                padding: 0.25rem 0.5rem !important;
                font-size: 0.75rem !important;
            }
            .logout-text { display: none !important; }

            /* Overview Tab */
            .hero-section {
                padding: 1.25rem 0.75rem !important;
                border-radius: 1rem !important;
            }
            .hero-number {
                font-size: 1.5rem !important;
                word-break: break-word !important;
            }
            .hero-submetrics {
                flex-direction: column !important;
                gap: 0.6rem !important;
                align-items: center !important;
                width: 100% !important;
            }
            .hero-sub-item {
                align-items: center !important;
                text-align: center !important;
            }
            .divider { display: none !important; }

            /* Tab Header & Action Controls */
            .tab-header-row {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.75rem !important;
            }
            .title-with-filter {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.4rem !important;
                width: 100% !important;
            }
            .filter-dropdown {
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .tab-actions {
                width: 100% !important;
                display: flex !important;
                gap: 0.5rem !important;
            }
            .tab-actions button {
                flex: 1 !important;
                justify-content: center !important;
                padding: 0.45rem 0.6rem !important;
                font-size: 0.8rem !important;
            }

            /* View Toggles & Schedule Controls */
            .view-toggle-row {
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 0.5rem !important;
            }
            .view-toggle-btn-group {
                display: flex !important;
                width: 100% !important;
                gap: 0.35rem !important;
            }
            .view-toggle-btn-group .view-toggle-btn {
                flex: 1 !important;
                justify-content: center !important;
                padding: 0.35rem 0.5rem !important;
                font-size: 0.75rem !important;
            }
            .list-scope-wrapper {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                width: 100% !important;
            }
            .list-scope-wrapper select {
                flex: 1 !important;
            }

            /* Schedules Tab - Top Summary Cards */
            .schedule-summary-cards {
                grid-template-columns: 1fr !important;
                gap: 0.65rem !important;
                width: 100% !important;
            }

            /* Schedules Tab - CALENDAR GRID & CELLS */
            .calendar-container {
                padding: 0.65rem 0.35rem !important;
                border-radius: 0.75rem !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }
            .calendar-nav {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                gap: 0.25rem !important;
                margin-bottom: 0.5rem !important;
                flex-wrap: wrap !important;
            }
            .calendar-nav-center {
                display: flex !important;
                align-items: center !important;
                gap: 0.25rem !important;
                justify-content: center !important;
                flex-wrap: wrap !important;
            }
            .calendar-month-select, .calendar-year-select {
                padding: 0.25rem 0.35rem !important;
                font-size: 0.75rem !important;
            }
            .calendar-today-btn {
                padding: 0.25rem 0.45rem !important;
                font-size: 0.72rem !important;
            }
            .calendar-nav-title {
                font-size: 0.9rem !important;
                font-weight: 800 !important;
            }
            .calendar-nav button {
                padding: 0.25rem 0.45rem !important;
                font-size: 0.75rem !important;
            }
            .calendar-grid {
                display: grid !important;
                grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
                gap: 2px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            .weekday-cell {
                font-size: 0.65rem !important;
                font-weight: 800 !important;
                padding: 0.25rem 0 !important;
                text-align: center !important;
                letter-spacing: 0 !important;
            }
            .empty-day-cell {
                border-radius: 0.25rem !important;
                min-height: 38px !important;
            }
            .calendar-day-cell {
                min-height: 40px !important;
                max-height: 52px !important;
                aspect-ratio: 1 !important;
                padding: 2px 1px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 1px !important;
                overflow: hidden !important;
                min-width: 0 !important;
                border-radius: 0.35rem !important;
                box-sizing: border-box !important;
            }
            .calendar-day-cell .day-cell-top {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                width: 100% !important;
            }
            .calendar-day-cell .day-cell-num {
                font-size: 0.75rem !important;
                line-height: 1 !important;
                text-align: center !important;
            }
            /* HIDE TEXT PILLS INSIDE CALENDAR CELLS ON MOBILE TO PREVENT EXPANSION */
            .calendar-day-cell .day-totals-chips {
                display: none !important;
            }
            .calendar-day-cell .day-content {
                display: none !important;
            }
            /* SHOW INDICATOR DOTS INSTEAD */
            .calendar-day-cell .mobile-dot-container {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                align-items: center !important;
                gap: 2px !important;
                margin-top: 2px !important;
                max-width: 100% !important;
                overflow: hidden !important;
            }
            .mobile-dot {
                width: 4px !important;
                height: 4px !important;
                border-radius: 50% !important;
                flex-shrink: 0 !important;
            }

            /* Schedules Tab - Selected Day Detail Panel */
            .day-detail-panel {
                margin-top: 0.75rem !important;
                padding-top: 0.75rem !important;
            }
            .day-detail-header {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 0.4rem !important;
                margin-bottom: 0.75rem !important;
            }
            .day-detail-chips {
                width: 100% !important;
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 0.3rem !important;
            }
            .day-detail-item {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 0.5rem !important;
                padding: 0.65rem 0.75rem !important;
            }
            .day-detail-item-side {
                width: 100% !important;
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-top: 1px solid rgba(255, 255, 255, 0.04) !important;
                padding-top: 0.4rem !important;
            }

            /* Liabilities & Payments Controls */
            .liabilities-control-row, .payments-control-row {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 0.6rem !important;
            }
            .filters-wrapper {
                flex-direction: column !important;
                align-items: stretch !important;
                width: 100% !important;
                gap: 0.4rem !important;
            }
            .filter-item {
                width: 100% !important;
                display: flex !important;
                align-items: center !important;
                gap: 0.35rem !important;
            }
            .filter-item input, .filter-item select {
                flex: 1 !important;
                width: 100% !important;
            }

            /* Tables Across All Tabs */
            .table-card-container, .schedule-table-wrapper {
                padding: 0.5rem 0.35rem !important;
                border-radius: 0.75rem !important;
                width: 100% !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            th, td {
                padding: 0.55rem 0.65rem !important;
                font-size: 0.75rem !important;
            }

            /* Form & Modal Grids */
            .modal-overlay {
                padding: 0.5rem !important;
            }
            .modal-content {
                width: 100% !important;
                max-height: 94vh !important;
                border-radius: 1rem !important;
            }
            .modal-header {
                padding: 0.85rem 1rem !important;
            }
            .modal-form {
                padding: 0.85rem 1rem !important;
                gap: 0.75rem !important;
            }
            .form-grid { grid-template-columns: 1fr !important; }
            .form-grid-three { grid-template-columns: 1fr !important; }
            .breakdown-grid { grid-template-columns: 1fr !important; }
            .allocation-row-grid { grid-template-columns: 1fr !important; }

            /* Bottom Nav Bar */
            .bottom-nav-bar {
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: auto !important;
                min-height: calc(58px + var(--safe-bottom, env(safe-area-inset-bottom, 0px))) !important;
                padding-top: 6px !important;
                padding-bottom: max(var(--safe-bottom, env(safe-area-inset-bottom, 0px)), 12px) !important;
                padding-left: max(env(safe-area-inset-left, 0px), 4px) !important;
                padding-right: max(env(safe-area-inset-right, 0px), 4px) !important;
                box-sizing: border-box !important;
                z-index: 1000 !important;
            }
            .bottom-nav-bar button {
                padding: 0.2rem 0.1rem !important;
                font-size: 0.65rem !important;
                gap: 0.15rem !important;
            }
            .bottom-nav-bar button svg {
                width: 18px !important;
                height: 18px !important;
            }
        }

        @media (max-width: 800px) {
            .tab-content-grid { grid-template-columns: 1fr !important; }
            .overview-grid { grid-template-columns: 1fr !important; }
            .loans-grid { grid-template-columns: 1fr !important; }
            .detail-stats-row { grid-template-columns: repeat(2, 1fr) !important; }
            .detail-sections-grid { grid-template-columns: 1fr !important; }
        }
    `;
    document.head.appendChild(styleEl);
}
