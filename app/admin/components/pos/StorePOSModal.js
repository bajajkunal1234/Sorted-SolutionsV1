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
    Store
} from 'lucide-react';
import { accountsAPI, transactionsAPI, printSettingsAPI } from '@/lib/adminAPI';
import NewAccountForm from '@/app/admin/components/accounts/NewAccountForm';
import { formatMobileNumber } from '@/lib/utils/validation';

const UNIT_OPTIONS = ['Nos', 'Pcs', 'Kg', 'Gms', 'Mtr', 'Box', 'Pkt', 'Set', 'Pair', 'Ltr', 'Roll'];

const CASH_ACCOUNT_ID = '93e8c6cc-a40f-4150-98e0-c469530bd1b9';

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

    // Quick select Cash-in-hand
    const handleSelectCash = () => {
        const cashAcc = accounts.find(a => 
            a.id === CASH_ACCOUNT_ID || 
            a.name?.toLowerCase().includes('cash-in-hand') ||
            a.type === 'cash'
        ) || {
            id: CASH_ACCOUNT_ID,
            name: 'Cash-in-hand',
            type: 'cash',
            under: 'cash-in-hand',
            mobile: ''
        };

        setSelectedAccount(cashAcc);
        setAccountSearch(cashAcc.name);
        setIsSearchOpen(false);
        setPaymentMode('Cash');
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
            const savedInvoiceId = savedInvoice?.data?.id || savedInvoice?.id || `inv-${Date.now()}`;

            // Also create a linked receipt voucher to record the payment in accounting
            try {
                const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
                await transactionsAPI.create({
                    receipt_number: receiptNumber,
                    reference_number: invoiceNumber,
                    account_id: selectedAccount.id,
                    account_name: selectedAccount.name,
                    amount: grandTotal,
                    payment_mode: paymentMode || 'Cash',
                    status: 'cleared',
                    date: today,
                    narration: `Store POS payment for ${invoiceNumber} (${paymentMode})`,
                    allocations: savedInvoiceId ? [{
                        invoice_id: savedInvoiceId,
                        amount_applied: grandTotal
                    }] : []
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

    // WhatsApp Message compilation
    const getWhatsAppMessage = () => {
        if (!createdInvoice) return '';
        const itemsList = createdInvoice.items.map((it, idx) => 
            `${idx + 1}. *${it.description}* × ${it.qty} ${it.unit} — ₹${Number(it.total).toLocaleString('en-IN')}`
        ).join('\n');

        const companyName = printSettings?.company_name || 'Sorted Solutions';
        const companyPhone = printSettings?.company_phone || '+91 91520 70781';

        return `🧾 *${companyName} — Store Invoice*\n` +
               `Invoice No: *${createdInvoice.invoice_number}*\n` +
               `Date: ${new Date(createdInvoice.date).toLocaleDateString('en-GB')}\n` +
               `Customer: ${createdInvoice.account_name}\n\n` +
               `*Purchased Items:*\n${itemsList}\n\n` +
               `*Total Paid:* ₹${Number(createdInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${paymentMode})\n` +
               `Status: *Paid ✅*\n\n` +
               `Thank you for your visit!\n` +
               `📞 Support: ${companyPhone}`;
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
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '92vh',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    color: '#f8fafc',
                }}
            >
                {/* ── Top Header ────────────────────────────────────────────── */}
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '8px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Store size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                                    Store POS Terminal
                                </h3>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Quick Sale
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                Fast store billing without inventory tracking
                            </p>
                        </div>
                    </div>

                    {/* Step Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: step === 1 ? '#6366f1' : 'rgba(99, 102, 241, 0.15)',
                            color: step === 1 ? '#fff' : '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                            1. Account
                        </span>
                        <span style={{ color: '#475569', fontSize: '11px' }}>→</span>
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: step === 2 ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                            color: step === 2 ? '#fff' : '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            2. Items
                        </span>
                        <span style={{ color: '#475569', fontSize: '11px' }}>→</span>
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: step === 3 ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                            color: step === 3 ? '#fff' : '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                            3. Share
                        </span>
                    </div>

                    <button 
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Modal Body Content ────────────────────────────────────── */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

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
                                
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

                                {/* Quick select button for Cash below field */}
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Quick Select:</span>
                                    <button 
                                        type="button"
                                        onClick={handleSelectCash}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            backgroundColor: selectedAccount?.id === CASH_ACCOUNT_ID ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                            border: selectedAccount?.id === CASH_ACCOUNT_ID ? '1px solid #10b981' : '1px solid #334155',
                                            borderRadius: '20px',
                                            color: selectedAccount?.id === CASH_ACCOUNT_ID ? '#34d399' : '#cbd5e1',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <span>💵 Cash-in-hand (Store Walk-in)</span>
                                        {selectedAccount?.id === CASH_ACCOUNT_ID && <Check size={13} />}
                                    </button>
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
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#10b981'
                                        }}>
                                            {selectedAccount.type === 'cash' ? <DollarSign size={22} /> : <User size={22} />}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
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
                                                {selectedAccount.mobile ? `Phone: ${formatMobileNumber(selectedAccount.mobile)}` : 'No phone attached'}
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
                                            cursor: 'pointer'
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Account summary chip + date */}
                            <div style={{
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
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Customer:</span>
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                                                padding: '4px 8px',
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
                                                padding: '4px 8px',
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

                            {/* Table of Items */}
                            <div style={{
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #334155' }}>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', width: '35px', textAlign: 'center' }}>#</th>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Item Name / Description <span style={{ color: '#f87171' }}>*</span></th>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', width: '80px' }}>Qty</th>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', width: '90px' }}>Unit</th>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', width: '120px' }}>Price / Rate (₹)</th>
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', width: '110px', textAlign: 'right' }}>Total (₹)</th>
                                            <th style={{ padding: '10px 12px', width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row, index) => {
                                            const lineTotal = (Number(row.qty) || 0) * (Number(row.rate) || 0);
                                            return (
                                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                                        {index + 1}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input 
                                                            type="text"
                                                            value={row.description}
                                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                            placeholder="Type product / item name..."
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 10px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input 
                                                            type="number"
                                                            min="0.1"
                                                            step="any"
                                                            value={row.qty}
                                                            onChange={e => handleItemChange(index, 'qty', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 8px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <select
                                                            value={row.unit}
                                                            onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 6px',
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
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={row.rate}
                                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                                            placeholder="0.00"
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '6px',
                                                                padding: '7px 10px',
                                                                color: '#f8fafc',
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                                textAlign: 'right'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: lineTotal > 0 ? '#34d399' : '#64748b' }}>
                                                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
                                                                display: 'flex',
                                                                alignItems: 'center'
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
                                <div style={{ padding: '12px 16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-start' }}>
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
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#1e293b',
                                padding: '14px 20px',
                                borderRadius: '12px',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Items Count</div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                            {validItems.length} item{validItems.length === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Grand Total</div>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
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
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 22px',
                                            backgroundColor: (generating || validItems.length === 0) ? '#334155' : '#10b981',
                                            color: (generating || validItems.length === 0) ? '#64748b' : '#0f172a',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            cursor: (generating || validItems.length === 0) ? 'not-allowed' : 'pointer',
                                            boxShadow: validItems.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {generating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        <span>{generating ? 'Generating Invoice...' : 'Generate Invoice'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
                        SCREEN 3: SHARE SCREEN
                    ════════════════════════════════════════════════════════════ */}
                    {step === 3 && createdInvoice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Success Banner */}
                            <div style={{
                                padding: '18px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.08))',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b981',
                                        color: '#0f172a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                    }}>
                                        <CheckCircle2 size={26} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                                            Invoice {createdInvoice.invoice_number} Created!
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                                            {createdInvoice.account_name} • Paid ₹{Number(createdInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} via {paymentMode}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handlePrintInvoice}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '9px 16px',
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
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

                                {/* Phone number input */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flex: 1,
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        padding: '8px 12px'
                                    }}>
                                        <Phone size={14} color="#64748b" />
                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>+91</span>
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

                                    <button 
                                        type="button"
                                        onClick={handleShareWhatsApp}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '9px 18px',
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
                                        <span>Send WhatsApp</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={handleCopyWhatsApp}
                                        title="Copy message"
                                        style={{
                                            padding: '9px 14px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                            color: '#cbd5e1',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Copy size={14} />
                                        <span>Copy</span>
                                    </button>
                                </div>

                                {/* Live message preview box */}
                                <div style={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    maxHeight: '140px',
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
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
                                        display: 'flex',
                                        alignItems: 'center',
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
