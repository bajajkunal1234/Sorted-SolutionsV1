'use client'

import { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Search, 
    Plus, 
    Trash2, 
    Check, 
    ArrowRight, 
    ArrowLeft, 
    DollarSign, 
    ShoppingCart, 
    User, 
    Phone, 
    FileText, 
    Share2, 
    Printer, 
    Copy, 
    CheckCircle2, 
    Loader2, 
    ExternalLink,
    Store,
    Landmark,
    Smartphone,
    CreditCard
} from 'lucide-react';
import { accountsAPI, transactionsAPI, printSettingsAPI } from '@/lib/adminAPI';
import NewAccountForm from '@/app/admin/components/accounts/NewAccountForm';
import { formatMobileNumber } from '@/lib/utils/validation';

const UNIT_OPTIONS = ['Nos', 'Pcs', 'Kg', 'Gms', 'Mtr', 'Box', 'Pkt', 'Set', 'Pair', 'Ltr', 'Roll'];

const CASH_ACCOUNT_ID = '93e8c6cc-a40f-4150-98e0-c469530bd1b9';

const QUICK_LEDGER_ACCOUNTS = [
    {
        id: '93e8c6cc-a40f-4150-98e0-c469530bd1b9',
        label: 'Cash-in-hand',
        badge: 'Store Walk-in',
        icon: '💵',
        defaultMode: 'Cash',
        match: a => a.id === '93e8c6cc-a40f-4150-98e0-c469530bd1b9' || a.name?.toLowerCase().includes('cash-in-hand') || a.type === 'cash',
        fallback: {
            id: '93e8c6cc-a40f-4150-98e0-c469530bd1b9',
            name: 'Cash-in-hand',
            type: 'cash',
            under: 'cash-in-hand',
            mobile: ''
        }
    },
    {
        id: '8eaf830c-547b-411c-b93b-f3912e995206',
        label: 'Google Pay Business Clearing',
        badge: 'UPI / QR',
        icon: '📱',
        defaultMode: 'UPI',
        match: a => a.id === '8eaf830c-547b-411c-b93b-f3912e995206' || a.name?.toLowerCase().includes('google pay') || a.name?.toLowerCase().includes('gpay'),
        fallback: {
            id: '8eaf830c-547b-411c-b93b-f3912e995206',
            name: 'Google Pay Business Clearing',
            type: 'bank',
            under: 'bank-accounts',
            mobile: ''
        }
    },
    {
        id: 'fb2512f4-c3c3-44ae-9dcf-0b750b5294a6',
        label: 'HDFC Current A/c',
        badge: 'Bank / Card',
        icon: '🏦',
        defaultMode: 'Bank Transfer',
        match: a => a.id === 'fb2512f4-c3c3-44ae-9dcf-0b750b5294a6' || a.name?.toLowerCase().includes('hdfc'),
        fallback: {
            id: 'fb2512f4-c3c3-44ae-9dcf-0b750b5294a6',
            name: 'HDFC Current A/c',
            type: 'bank',
            under: 'bank-accounts',
            mobile: ''
        }
    },
    {
        id: '3070761d-3529-4038-8eda-a4c7728a41c6',
        label: 'Razorpay Clearing',
        badge: 'Online Gateway',
        icon: '⚡',
        defaultMode: 'UPI',
        match: a => a.id === '3070761d-3529-4038-8eda-a4c7728a41c6' || a.name?.toLowerCase().includes('razorpay'),
        fallback: {
            id: '3070761d-3529-4038-8eda-a4c7728a41c6',
            name: 'Razorpay Clearing',
            type: 'bank',
            under: 'bank-accounts',
            mobile: ''
        }
    }
];

export default function StorePOSModal({ isOpen, onClose }) {
    // Current Screen / Step: 1 = Select Account, 2 = Items & Pricing, 3 = Share Screen
    const [step, setStep] = useState(1);

    // ── Screen 1: Account State ────────────────────────────────────────────────
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [accountSearch, setAccountSearch] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showNewAccountModal, setShowNewAccountModal] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchContainerRef = useRef(null);

    // ── Screen 2: Items & Pricing State ─────────────────────────────────────────
    const createBlankRow = (id) => ({
        id: id || Date.now() + Math.random(),
        description: '',
        qty: 1,
        unit: 'Nos',
        rate: '',
    });

    const [items, setItems] = useState([
        createBlankRow(1),
        createBlankRow(2),
        createBlankRow(3),
        createBlankRow(4),
    ]);

    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [notes, setNotes] = useState('Store POS Sale');
    const [generating, setGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Screen 2: Column Resizing State & Persistence ───────────────────────────
    const DEFAULT_COL_WIDTHS = {
        num: 36,
        description: 240,
        qty: 70,
        unit: 80,
        rate: 105,
        total: 95,
        action: 38
    };

    const [colWidths, setColWidths] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('pos_column_widths');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return { ...DEFAULT_COL_WIDTHS, ...parsed };
                }
            } catch (e) {}
        }
        return DEFAULT_COL_WIDTHS;
    });

    const [resizingCol, setResizingCol] = useState(null);
    const resizeInfoRef = useRef(null);

    const handleResizeStart = (colKey, e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        e.stopPropagation();
        const startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const startWidth = colWidths[colKey] || DEFAULT_COL_WIDTHS[colKey] || 100;
        const targetCol = colKey;

        resizeInfoRef.current = { colKey: targetCol, startX, startWidth };
        setResizingCol(targetCol);

        const onMove = (moveEvt) => {
            if (!resizeInfoRef.current) return;
            const currentX = moveEvt.clientX || (moveEvt.touches && moveEvt.touches[0]?.clientX) || 0;
            const delta = currentX - resizeInfoRef.current.startX;
            const minWidths = { num: 28, description: 150, qty: 55, unit: 65, rate: 75, total: 75, action: 34 };
            const minW = minWidths[targetCol] || 50;
            const nextWidth = Math.max(minW, Math.round(resizeInfoRef.current.startWidth + delta));

            setColWidths(prev => ({
                ...prev,
                [targetCol]: nextWidth
            }));
        };

        const onEnd = () => {
            resizeInfoRef.current = null;
            setResizingCol(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);

            setColWidths(latest => {
                try {
                    localStorage.setItem('pos_column_widths', JSON.stringify(latest));
                } catch (err) {}
                return latest;
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onEnd);
    };

    const handleResetColWidths = () => {
        setColWidths(DEFAULT_COL_WIDTHS);
        try {
            localStorage.removeItem('pos_column_widths');
        } catch (e) {}
    };

    const handlePresetColWidths = (type) => {
        if (type === 'wide') {
            const wideWidths = {
                num: 36,
                description: 320,
                qty: 80,
                unit: 90,
                rate: 120,
                total: 110,
                action: 40
            };
            setColWidths(wideWidths);
            try {
                localStorage.setItem('pos_column_widths', JSON.stringify(wideWidths));
            } catch (e) {}
        } else {
            handleResetColWidths();
        }
    };

    const totalTableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

    // ── Screen 3: Generated Invoice & Share State ───────────────────────────────
    const [createdInvoice, setCreatedInvoice] = useState(null);
    const [sharePhone, setSharePhone] = useState('');
    const [copied, setCopied] = useState(false);
    const [printSettings, setPrintSettings] = useState(null);

    // Fetch initial customer accounts and print settings
    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        setLoadingAccounts(true);

        Promise.all([
            accountsAPI.getAll('all', false),
            printSettingsAPI.get().catch(() => null)
        ]).then(([accs, ps]) => {
            if (active) {
                setAccounts(Array.isArray(accs) ? accs : []);
                if (ps) setPrintSettings(ps);
            }
        }).catch(err => {
            console.error('POS accounts load error:', err);
        }).finally(() => {
            if (active) setLoadingAccounts(false);
        });

        return () => { active = false; };
    }, [isOpen]);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter suggestions based on accountSearch
    const filteredAccounts = accounts.filter(acc => {
        if (!accountSearch.trim()) return false;
        const s = accountSearch.toLowerCase().trim();
        const sDig = s.replace(/\D/g, '');
        const s10 = sDig.length >= 10 ? sDig.slice(-10) : sDig;

        if (acc.name && acc.name.toLowerCase().includes(s)) return true;
        if (acc.sku && acc.sku.toLowerCase().includes(s)) return true;

        if (sDig.length >= 3) {
            const phones = [acc.mobile, acc.phone, acc.alternate_mobile].filter(Boolean).map(p => String(p).replace(/\D/g, ''));
            if (phones.some(p => p.includes(sDig) || (s10.length >= 6 && p.endsWith(s10)))) {
                return true;
            }
        }
        return false;
    }).slice(0, 10);

    // Quick select handler for Cash and Bank clearing ledgers
    const handleSelectQuickAccount = (config) => {
        const found = accounts.find(config.match) || config.fallback;
        setSelectedAccount(found);
        setAccountSearch(found.name);
        setIsSearchOpen(false);
        if (config.defaultMode) {
            setPaymentMode(config.defaultMode);
        }
    };

    // Quick select Cash-in-hand
    const handleSelectCash = () => {
        handleSelectQuickAccount(QUICK_LEDGER_ACCOUNTS[0]);
    };

    // Row management for Screen 2
    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setErrorMsg('');
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, createBlankRow()]);
    };

    const handleRemoveItem = (index) => {
        if (items.length <= 1) {
            setItems([createBlankRow()]);
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Calculate totals
    const validItems = items.filter(it => it.description.trim() && Number(it.rate) > 0);
    const subtotal = validItems.reduce((sum, it) => sum + ((Number(it.qty) || 1) * Number(it.rate)), 0);
    const grandTotal = subtotal;

    // Reset POS for next sale
    const handleResetSale = () => {
        setStep(1);
        setSelectedAccount(null);
        setAccountSearch('');
        setItems([
            createBlankRow(1),
            createBlankRow(2),
            createBlankRow(3),
            createBlankRow(4),
        ]);
        setCreatedInvoice(null);
        setSharePhone('');
        setCopied(false);
        setErrorMsg('');
    };

    // Generate Invoice
    const handleGenerateInvoice = async () => {
        if (!selectedAccount) {
            setErrorMsg('Please select an account first.');
            setStep(1);
            return;
        }

        if (validItems.length === 0) {
            setErrorMsg('Please fill in at least 1 item name and price.');
            return;
        }

        try {
            setGenerating(true);
            setErrorMsg('');

            const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const today = invoiceDate || new Date().toISOString().split('T')[0];

            const formattedItems = validItems.map((it, idx) => ({
                id: idx + 1,
                description: it.description.trim(),
                qty: Number(it.qty) || 1,
                unit: it.unit || 'Nos',
                rate: Number(it.rate),
                total: (Number(it.qty) || 1) * Number(it.rate),
                taxRate: 0,
                discount: 0,
                productId: null,
                isCharge: false
            }));

            const invoicePayload = {
                invoice_number: invoiceNumber,
                account_id: selectedAccount.id,
                account_name: selectedAccount.name,
                account_phone: selectedAccount.phone || selectedAccount.mobile || '',
                account_mobile: selectedAccount.mobile || selectedAccount.phone || '',
                account_email: selectedAccount.email || '',
                account_address: selectedAccount.address || '',
                account_state: selectedAccount.state || 'Maharashtra',
                account_gstin: selectedAccount.gstin || '',
                date: today,
                items: formattedItems,
                subtotal: grandTotal,
                discount: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                total_tax: 0,
                total_amount: grandTotal,
                paid_amount: grandTotal,
                status: 'paid',
                notes: notes || 'Store POS Sale'
            };

            const savedInvoice = await transactionsAPI.create(invoicePayload, 'sales');
            const savedInvoiceId = savedInvoice?.data?.id || savedInvoice?.id;

            if (!savedInvoiceId) {
                throw new Error(savedInvoice?.error || savedInvoice?.message || 'Invoice could not be confirmed on server. Please try again.');
            }

            // Also create a linked receipt voucher to record the payment in accounting
            try {
                const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
                await transactionsAPI.create({
                    receipt_number: receiptNumber,
                    reference_number: invoiceNumber,
                    account_id: selectedAccount.id,
                    account_name: selectedAccount.name,
                    payment_account_id: (selectedAccount.type === 'bank' || selectedAccount.under === 'bank-accounts') ? selectedAccount.id : undefined,
                    amount: grandTotal,
                    payment_mode: paymentMode || 'Cash',
                    status: 'cleared',
                    date: today,
                    narration: `Store POS payment for ${invoiceNumber} (${paymentMode})`,
                    allocations: [{
                        invoice_id: savedInvoiceId,
                        amount_applied: grandTotal
                    }]
                }, 'receipt');
            } catch (rErr) {
                console.warn('Auto-receipt creation notice:', rErr);
            }

            const finalInvoice = {
                ...invoicePayload,
                id: savedInvoiceId
            };

            setCreatedInvoice(finalInvoice);

            // Pre-fill phone for WhatsApp sharing
            const rawPhone = selectedAccount.mobile || selectedAccount.phone || '';
            const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
            setSharePhone(cleanDigits);

            // Move to Screen 3 (Share Screen)
            setStep(3);
        } catch (err) {
            console.error('POS generate invoice error:', err);
            setErrorMsg(err.message || 'Failed to generate invoice. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    // WhatsApp Message compilation (fully defensive against null or malformed data)
    const getWhatsAppMessage = () => {
        try {
            if (!createdInvoice) return '';
            const items = Array.isArray(createdInvoice.items) ? createdInvoice.items : [];
            const itemsList = items.map((it, idx) => 
                `${idx + 1}. *${it?.description || 'Item'}* × ${it?.qty || 1} ${it?.unit || 'Nos'} — ₹${Number(it?.total || 0).toLocaleString('en-IN')}`
            ).join('\n');

            const companyName = printSettings?.company_name || 'Sorted Solutions';
            const companyPhone = printSettings?.company_phone || '+91 91520 70781';

            const invoiceTotal = Number(createdInvoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            let dateStr = '';
            try {
                dateStr = createdInvoice.date ? new Date(createdInvoice.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
            } catch {
                dateStr = new Date().toLocaleDateString('en-GB');
            }

            return `🧾 *${companyName} — Store Invoice*\n` +
                   `Invoice No: *${createdInvoice.invoice_number || 'N/A'}*\n` +
                   `Date: ${dateStr}\n` +
                   `Customer: ${createdInvoice.account_name || 'Customer'}\n\n` +
                   `*Purchased Items:*\n${itemsList || 'None'}\n\n` +
                   `*Total Paid:* ₹${invoiceTotal} (${paymentMode || 'Cash'})\n` +
                   `Status: *Paid ✅*\n\n` +
                   `Thank you for your visit!\n` +
                   `📞 Support: ${companyPhone}`;
        } catch (e) {
            console.error('Error generating WhatsApp message:', e);
            return 'Thank you for your visit!';
        }
    };

    const handleShareWhatsApp = () => {
        const cleanDigits = sharePhone.replace(/\D/g, '').slice(-10);
        if (!cleanDigits || cleanDigits.length < 10) {
            alert('Please enter a valid 10-digit customer mobile number for WhatsApp');
            return;
        }
        const text = encodeURIComponent(getWhatsAppMessage());
        window.open(`https://wa.me/91${cleanDigits}?text=${text}`, '_blank');
    };

    const handleCopyWhatsApp = async () => {
        try {
            await navigator.clipboard.writeText(getWhatsAppMessage());
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    };

    const handlePrintInvoice = () => {
        if (!createdInvoice?.id) return;
        const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
        window.open(`${baseUrl}/print?type=sales&id=${createdInvoice.id}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div 
            onClick={onClose}
            className="pos-modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                backgroundColor: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                className="pos-modal-container"
                style={{
                    width: '100%',
                    maxWidth: '920px',
                    maxHeight: '94vh',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    color: '#f8fafc',
                }}
            >
                {/* ── Top Header ────────────────────────────────────────────── */}
                <div className="pos-modal-header" style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {/* Row 1: Title and Close button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                padding: '7px',
                                borderRadius: '9px',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Store size={18} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                                    Store POS Terminal
                                </h3>
                                <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                }}>
                                    Quick Sale
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            aria-label="Close POS"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '6px',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Row 2: Responsive Step Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                        <div 
                            onClick={() => { if (step > 1) setStep(1); }}
                            style={{
                                flex: '1 1 0%',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textAlign: 'center',
                                cursor: step > 1 ? 'pointer' : 'default',
                                backgroundColor: step === 1 ? '#6366f1' : 'rgba(99, 102, 241, 0.12)',
                                color: step === 1 ? '#fff' : '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            1. Account
                        </div>
                        <span style={{ color: '#475569', fontSize: '11px' }}>→</span>
                        <div 
                            onClick={() => { if (selectedAccount && step > 2) setStep(2); }}
                            style={{
                                flex: '1 1 0%',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textAlign: 'center',
                                cursor: selectedAccount && step > 2 ? 'pointer' : 'default',
                                backgroundColor: step === 2 ? '#10b981' : 'rgba(16, 185, 129, 0.12)',
                                color: step === 2 ? '#fff' : '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            2. Items
                        </div>
                        <span style={{ color: '#475569', fontSize: '11px' }}>→</span>
                        <div style={{
                            flex: '1 1 0%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textAlign: 'center',
                            backgroundColor: step === 3 ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)',
                            color: step === 3 ? '#fff' : '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            whiteSpace: 'nowrap'
                        }}>
                            3. Share
                        </div>
                    </div>
                </div>

                {/* ── Modal Body Content ────────────────────────────────────── */}
                <div className="pos-modal-body" style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>

                    {errorMsg && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#f87171',
                            fontSize: '13px',
                            fontWeight: 500
                        }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
                        SCREEN 1: SELECT ACCOUNT
                    ════════════════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                                    Select Customer / Ledger Account <span style={{ color: '#f87171' }}>*</span>
                                </label>
                                
                                <div className="pos-account-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {/* Search Input Container */}
                                    <div ref={searchContainerRef} style={{ position: 'relative', flex: 1 }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            backgroundColor: '#1e293b',
                                            border: isSearchOpen ? '1px solid #6366f1' : '1px solid #334155',
                                            borderRadius: '10px',
                                            padding: '9px 12px',
                                            transition: 'border-color 0.15s'
                                        }}>
                                            <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
                                            <input 
                                                type="text"
                                                value={accountSearch}
                                                onChange={e => {
                                                    setAccountSearch(e.target.value);
                                                    setIsSearchOpen(true);
                                                }}
                                                onFocus={() => setIsSearchOpen(true)}
                                                placeholder="Search by customer name, phone number or SKU..."
                                                style={{
                                                    flex: 1,
                                                    background: 'none',
                                                    border: 'none',
                                                    outline: 'none',
                                                    color: '#f8fafc',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            {accountSearch && (
                                                <button 
                                                    onClick={() => {
                                                        setAccountSearch('');
                                                        setSelectedAccount(null);
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown suggestions */}
                                        {isSearchOpen && filteredAccounts.length > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 4px)',
                                                left: 0,
                                                right: 0,
                                                maxHeight: '220px',
                                                overflowY: 'auto',
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #475569',
                                                borderRadius: '10px',
                                                zIndex: 50,
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                            }}>
                                                {filteredAccounts.map(acc => (
                                                    <div 
                                                        key={acc.id}
                                                        onClick={() => {
                                                            setSelectedAccount(acc);
                                                            setAccountSearch(acc.name);
                                                            setIsSearchOpen(false);
                                                        }}
                                                        style={{
                                                            padding: '10px 14px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: selectedAccount?.id === acc.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                                            transition: 'background-color 0.1s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedAccount?.id === acc.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                                                                {acc.name}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                                {acc.mobile ? formatMobileNumber(acc.mobile) : (acc.phone || 'No phone')} {acc.sku ? `• SKU: ${acc.sku}` : ''}
                                                            </div>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            backgroundColor: 'rgba(255,255,255,0.08)',
                                                            color: '#cbd5e1',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {acc.type || 'Customer'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Create New Account Button next to search field */}
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewAccountModal(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 16px',
                                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                            borderRadius: '10px',
                                            color: '#818cf8',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <Plus size={15} />
                                        <span>Create New Account</span>
                                    </button>
                                </div>

                                {/* Quick select buttons for Cash & Bank clearing ledgers */}
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Quick Select Walk-in / Ledger:</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                        {QUICK_LEDGER_ACCOUNTS.map((q) => {
                                            const isSelected = selectedAccount && q.match(selectedAccount);
                                            return (
                                                <button 
                                                    key={q.id}
                                                    type="button"
                                                    onClick={() => handleSelectQuickAccount(q)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                                                        border: isSelected ? '1px solid #10b981' : '1px solid #334155',
                                                        borderRadius: '20px',
                                                        color: isSelected ? '#34d399' : '#cbd5e1',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <span>{q.icon} {q.label}</span>
                                                    {q.badge && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '1px 6px',
                                                            borderRadius: '10px',
                                                            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                                                            color: isSelected ? '#a7f3d0' : '#94a3b8',
                                                            fontWeight: 500
                                                        }}>
                                                            {q.badge}
                                                        </span>
                                                    )}
                                                    {isSelected && <Check size={13} style={{ strokeWidth: 3 }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Account Confirmation Card */}
                            {selectedAccount && (
                                <div style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#10b981',
                                            flexShrink: 0
                                        }}>
                                            {selectedAccount.name?.toLowerCase().includes('google pay') || selectedAccount.name?.toLowerCase().includes('gpay') ? (
                                                <Smartphone size={22} />
                                            ) : selectedAccount.type === 'cash' || selectedAccount.name?.toLowerCase().includes('cash') ? (
                                                <DollarSign size={22} />
                                            ) : selectedAccount.type === 'bank' || selectedAccount.under === 'bank-accounts' ? (
                                                <Landmark size={22} />
                                            ) : (
                                                <User size={22} />
                                            )}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-word' }}>
                                                    {selectedAccount.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#10b98125',
                                                    color: '#34d399',
                                                    fontWeight: 700
                                                }}>
                                                    SELECTED
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                                                {selectedAccount.mobile ? (
                                                    `Phone: ${formatMobileNumber(selectedAccount.mobile)}`
                                                ) : selectedAccount.under === 'bank-accounts' || selectedAccount.type === 'bank' ? (
                                                    `Bank / Clearing Account • Auto Mode: ${paymentMode}`
                                                ) : selectedAccount.type === 'cash' ? (
                                                    `Store Cash Drawer • Auto Mode: Cash`
                                                ) : (
                                                    'Walk-in / General Ledger'
                                                )}
                                                {selectedAccount.sku ? ` • SKU: ${selectedAccount.sku}` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setSelectedAccount(null);
                                            setAccountSearch('');
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'none',
                                            border: '1px solid #475569',
                                            borderRadius: '6px',
                                            color: '#94a3b8',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {/* Next Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    disabled={!selectedAccount}
                                    onClick={() => setStep(2)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 24px',
                                        backgroundColor: selectedAccount ? '#10b981' : '#334155',
                                        color: selectedAccount ? '#0f172a' : '#64748b',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        cursor: selectedAccount ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span>Continue to Items</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
                        SCREEN 2: ADD ITEMS & PRICING
                    ════════════════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Account summary chip + date */}
                            <div className="pos-account-summary-row" style={{
                                padding: '10px 14px',
                                backgroundColor: '#1e293b',
                                borderRadius: '10px',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {(selectedAccount?.type === 'bank' || selectedAccount?.type === 'cash' || selectedAccount?.under === 'bank-accounts' || selectedAccount?.under === 'cash-in-hand') ? 'Ledger:' : 'Customer:'}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                        {selectedAccount?.name}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Edit
                                    </button>
                                </div>

                                <div className="pos-account-summary-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <label style={{ fontSize: '12px', color: '#94a3b8' }}>Date:</label>
                                        <input 
                                            type="date"
                                            value={invoiceDate}
                                            onChange={e => setInvoiceDate(e.target.value)}
                                            style={{
                                                backgroundColor: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '6px',
                                                padding: '5px 8px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                                outline: 'none',
                                                colorScheme: 'dark'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <label style={{ fontSize: '12px', color: '#94a3b8' }}>Payment:</label>
                                        <select 
                                            value={paymentMode}
                                            onChange={e => setPaymentMode(e.target.value)}
                                            style={{
                                                backgroundColor: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '6px',
                                                padding: '5px 8px',
                                                color: '#34d399',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI / GPay / PhonePe</option>
                                            <option value="Card">Card</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Column resizing toolbar notice */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '2px 4px',
                                fontSize: '11px',
                                color: '#94a3b8'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>↔️ Drag column edges to resize</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handlePresetColWidths('wide')}
                                        style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                                    >
                                        Wide Names
                                    </button>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={handleResetColWidths}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                                    >
                                        Reset Widths
                                    </button>
                                </div>
                            </div>

                            {/* Table of Items with Column Resizing & Horizontal Scroll */}
                            <div className="pos-table-scroll" style={{
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                                overflowX: 'auto',
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                <table style={{
                                    width: '100%',
                                    minWidth: `${totalTableWidth}px`,
                                    borderCollapse: 'collapse',
                                    textAlign: 'left',
                                    tableLayout: 'fixed'
                                }}>
                                    <colgroup>
                                        <col style={{ width: `${colWidths.num}px` }} />
                                        <col style={{ width: `${colWidths.description}px` }} />
                                        <col style={{ width: `${colWidths.qty}px` }} />
                                        <col style={{ width: `${colWidths.unit}px` }} />
                                        <col style={{ width: `${colWidths.rate}px` }} />
                                        <col style={{ width: `${colWidths.total}px` }} />
                                        <col style={{ width: `${colWidths.action}px` }} />
                                    </colgroup>
                                    <thead>
                                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid #334155' }}>
                                            <th className="pos-col-header" style={{ width: `${colWidths.num}px`, padding: '10px 4px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>
                                                #
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'num' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('num', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th className="pos-col-header" style={{ width: `${colWidths.description}px`, padding: '10px 10px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                                                Item Name / Description <span style={{ color: '#f87171' }}>*</span>
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'description' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('description', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th className="pos-col-header" style={{ width: `${colWidths.qty}px`, padding: '10px 6px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                                                Qty
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'qty' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('qty', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th className="pos-col-header" style={{ width: `${colWidths.unit}px`, padding: '10px 6px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                                                Unit
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'unit' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('unit', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th className="pos-col-header" style={{ width: `${colWidths.rate}px`, padding: '10px 8px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                                                Price / Rate (₹)
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'rate' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('rate', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th className="pos-col-header" style={{ width: `${colWidths.total}px`, padding: '10px 8px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                                                Total (₹)
                                                <div 
                                                    className={`pos-col-resizer ${resizingCol === 'total' ? 'is-active' : ''}`}
                                                    onPointerDown={e => handleResizeStart('total', e)}
                                                    title="Drag to resize column"
                                                />
                                            </th>
                                            <th style={{ width: `${colWidths.action}px`, padding: '10px 4px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row, index) => {
                                            const lineTotal = (Number(row.qty) || 0) * (Number(row.rate) || 0);
                                            return (
                                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                                        {index + 1}
                                                    </td>
                                                    <td style={{ padding: '8px 6px' }}>
                                                        <input 
                                                            type="text"
                                                            value={row.description}
                                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                            placeholder="Type product name..."
                                                            style={{
                                                                width: '100%',
                                                                boxSizing: 'border-box',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 9px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <input 
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={row.qty}
                                                            onChange={e => handleItemChange(index, 'qty', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                boxSizing: 'border-box',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 4px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <select
                                                            value={row.unit}
                                                            onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                boxSizing: 'border-box',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 4px',
                                                                color: '#cbd5e1',
                                                                fontSize: '12px',
                                                                outline: 'none'
                                                            }}
                                                        >
                                                            {UNIT_OPTIONS.map(u => (
                                                                <option key={u} value={u}>{u}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px 4px' }}>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={row.rate}
                                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                                            placeholder="0.00"
                                                            style={{
                                                                width: '100%',
                                                                boxSizing: 'border-box',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 8px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                                textAlign: 'right'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: lineTotal > 0 ? '#34d399' : '#64748b' }}>
                                                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '8px 2px', textAlign: 'center' }}>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            title="Delete row"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#64748b',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Add Item button below table */}
                                <div style={{ padding: '10px 14px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-start' }}>
                                    <button 
                                        type="button"
                                        onClick={handleAddItem}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '7px 14px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px dashed #475569',
                                            borderRadius: '8px',
                                            color: '#cbd5e1',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.borderColor = '#94a3b8';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.borderColor = '#475569';
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>Add Item</span>
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Calculation & Action Bar */}
                            <div className="pos-bottom-bar-mobile" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#1e293b',
                                padding: '14px 18px',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                                marginTop: '4px'
                            }}>
                                <div className="pos-bottom-bar-mobile-stats" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Items</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                                            {validItems.length} item{validItems.length === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grand Total</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="pos-bottom-bar-mobile-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: '1px solid #475569',
                                            borderRadius: '10px',
                                            color: '#cbd5e1',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ArrowLeft size={15} />
                                        <span>Back</span>
                                    </button>

                                    <button 
                                        type="button"
                                        disabled={generating || validItems.length === 0}
                                        onClick={handleGenerateInvoice}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 20px',
                                            backgroundColor: (generating || validItems.length === 0) ? '#334155' : '#10b981',
                                            color: (generating || validItems.length === 0) ? '#64748b' : '#0f172a',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            cursor: (generating || validItems.length === 0) ? 'not-allowed' : 'pointer',
                                            boxShadow: validItems.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                                            transition: 'all 0.15s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {generating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        <span>{generating ? 'Generating...' : 'Generate Invoice'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
                        SCREEN 3: SHARE SCREEN
                    ════════════════════════════════════════════════════════════ */}
                    {step === 3 && createdInvoice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Success Banner */}
                            <div style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.08))',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 240px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b981',
                                        color: '#0f172a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                    }}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                                            Invoice {createdInvoice.invoice_number} Created!
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            {createdInvoice.account_name} • Paid ₹{Number(createdInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} via {paymentMode}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handlePrintInvoice}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '9px 16px',
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Printer size={15} />
                                    <span>Print Receipt</span>
                                </button>
                            </div>

                            {/* WhatsApp Sharing Card */}
                            <div style={{
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Share2 size={16} color="#22c55e" />
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                            Share Bill on WhatsApp
                                        </span>
                                    </div>
                                    {copied && (
                                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                                            ✓ Copied to clipboard!
                                        </span>
                                    )}
                                </div>

                                {/* Phone number input & WhatsApp actions */}
                                <div className="pos-share-whatsapp-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        padding: '9px 12px'
                                    }}>
                                        <Phone size={14} color="#64748b" />
                                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>+91</span>
                                        <input 
                                            type="tel"
                                            maxLength={10}
                                            value={sharePhone}
                                            onChange={e => setSharePhone(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Enter customer 10-digit mobile number..."
                                            style={{
                                                flex: 1,
                                                background: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                color: '#f8fafc',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                        <button 
                                            type="button"
                                            onClick={handleShareWhatsApp}
                                            style={{
                                                flex: 2,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '10px 16px',
                                                backgroundColor: '#22c55e',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <ExternalLink size={14} />
                                            <span>Send on WhatsApp</span>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={handleCopyWhatsApp}
                                            title="Copy message"
                                            style={{
                                                flex: 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '10px 14px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                color: '#cbd5e1',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Copy size={14} />
                                            <span>{copied ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Live message preview box */}
                                <div style={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    maxHeight: '130px',
                                    overflowY: 'auto',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    lineHeight: '1.5',
                                    color: '#94a3b8',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {getWhatsAppMessage()}
                                </div>
                            </div>

                            {/* Final Action buttons */}
                            <div className="pos-share-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: '8px',
                                        color: '#cbd5e1',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close POS
                                </button>

                                <button 
                                    type="button"
                                    onClick={handleResetSale}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px 22px',
                                        backgroundColor: '#f59e0b',
                                        color: '#0f172a',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
                                    }}
                                >
                                    <Plus size={15} />
                                    <span>New Sale (Next Customer)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── New Account Form Modal ─────────────────────────────────────── */}
            {showNewAccountModal && (
                <div 
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 11000,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div style={{
                        width: '100%',
                        maxWidth: '950px',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        borderRadius: '16px',
                        border: '1px solid #334155',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
                    }}>
                        <NewAccountForm
                            preselectedType="customers"
                            onClose={() => setShowNewAccountModal(false)}
                            onSave={async (accountData) => {
                                try {
                                    const created = await accountsAPI.create(accountData);
                                    if (created) {
                                        // Auto-select newly created account in POS
                                        setSelectedAccount(created);
                                        setAccountSearch(created.name);
                                        setShowNewAccountModal(false);
                                        // Append to local accounts list so search can find it
                                        setAccounts(prev => [created, ...prev]);
                                    }
                                } catch (err) {
                                    alert('Failed to save account: ' + err.message);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
