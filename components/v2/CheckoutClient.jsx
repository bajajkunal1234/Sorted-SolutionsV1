'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    Calendar,
    Clock,
    MapPin,
    ShieldCheck,
    CreditCard,
    Wallet,
    Loader2,
    ArrowLeft,
    AlertCircle,
    FileText,
    ShoppingBag,
} from 'lucide-react';
import LocalityCombobox from '@/components/common/LocalityCombobox';
import PhoneOtpGate from './PhoneOtpGate';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import { loadRazorpayCheckoutScript } from '@/lib/v2/razorpayLoader';

function formatDateTab(dateStr) {
    try {
        const d = new Date(`${dateStr}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
        const dayLabel =
            diffDays === 0
                ? 'Today'
                : diffDays === 1
                ? 'Tomorrow'
                : d.toLocaleDateString('en-IN', { weekday: 'short' });
        const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return { dayLabel, datePart };
    } catch (_) {
        return { dayLabel: dateStr, datePart: '' };
    }
}

export default function CheckoutClient() {
    const {
        items,
        hydrated,
        totals,
        location,
        saveLocation,
        customerSession,
        saveCustomerSession,
        incrementItem,
        decrementItem,
        clearCart,
    } = useV2Cart();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [verifiedPhone, setVerifiedPhone] = useState('');

    const [flatNumber, setFlatNumber] = useState('');
    const [buildingName, setBuildingName] = useState('');
    const [street, setStreet] = useState('');
    const [locality, setLocality] = useState('');
    const [pincode, setPincode] = useState('');
    const [specialNotes, setSpecialNotes] = useState('');

    const [slotsMap, setSlotsMap] = useState({});
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('online');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pendingOrder, setPendingOrder] = useState(null);
    const [completedOrder, setCompletedOrder] = useState(null);

    // Sync initial address & customer session
    useEffect(() => {
        if (!hydrated) return;
        setLocality(prev => prev || location.locality || '');
        setPincode(prev => prev || location.pincode || '');
        setFlatNumber(prev => prev || location.flat || '');
        setBuildingName(prev => prev || location.building || '');

        if (customerSession) {
            setName(prev => prev || customerSession.name || customerSession.full_name || '');
            setEmail(prev => prev || customerSession.email || '');
            const sessPhone = String(customerSession.phone || customerSession.mobile || '')
                .replace(/\D/g, '')
                .slice(-10);
            if (sessPhone.length === 10) {
                setPhone(prev => prev || sessPhone);
                setVerifiedPhone(prev => prev || sessPhone);
            }
        }
    }, [hydrated, location, customerSession]);

    // Fetch live Mumbai booking slots
    useEffect(() => {
        let mounted = true;
        const loadSlots = async () => {
            setSlotsLoading(true);
            try {
                const res = await fetch('/api/booking/available-slots?days=4&showAll=true');
                const json = await res.json();
                if (mounted && json.success && json.data) {
                    setSlotsMap(json.data);
                    const dates = Object.keys(json.data);
                    if (dates.length > 0) {
                        const firstWithAvailable =
                            dates.find(d => (json.data[d] || []).some(s => s.available)) || dates[0];
                        setSelectedDate(firstWithAvailable);
                        const firstSlot = (json.data[firstWithAvailable] || []).find(s => s.available);
                        if (firstSlot) setSelectedSlot(firstSlot.label);
                    }
                }
            } catch (_) {
            } finally {
                if (mounted) setSlotsLoading(false);
            }
        };
        loadSlots();
        return () => {
            mounted = false;
        };
    }, []);

    const dateKeys = useMemo(() => Object.keys(slotsMap), [slotsMap]);
    const currentDaySlots = slotsMap[selectedDate] || [];

    const openRazorpayModal = async (prepared) => {
        setError('');
        const loaded = await loadRazorpayCheckoutScript();
        if (!loaded || !window.Razorpay) {
            setError('Unable to load Razorpay payment gateway. Please retry or pick Pay After Service.');
            return;
        }

        const rawPhone = phone.replace(/\D/g, '').slice(-10);
        const options = {
            key: prepared.keyId,
            amount: prepared.razorpayOrder.amount,
            currency: prepared.razorpayOrder.currency || 'INR',
            name: 'Sorted Solutions',
            description: `Booking ${prepared.bookingNumber}`,
            order_id: prepared.razorpayOrder.id,
            prefill: {
                name: name.trim(),
                contact: `+91${rawPhone}`,
                email: email.trim() || undefined,
            },
            theme: { color: '#6338f5' },
            handler: async (rzpResponse) => {
                setSubmitting(true);
                try {
                    const confirmRes = await fetch('/api/v2/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'confirm_payment',
                            razorpay_order_id: rzpResponse.razorpay_order_id,
                            razorpay_payment_id: rzpResponse.razorpay_payment_id,
                            razorpay_signature: rzpResponse.razorpay_signature,
                            job_id: prepared.bookingId,
                            invoice_id: prepared.invoiceId,
                            account_id: prepared.customerId,
                            account_name: prepared.customerName,
                            amount: prepared.totals?.grandTotal || totals.grandTotal,
                        }),
                    });
                    const confirmJson = await confirmRes.json();
                    if (!confirmJson.success) {
                        throw new Error(confirmJson.error || 'Payment verification failed');
                    }

                    clearCart();
                    setPendingOrder(null);
                    setCompletedOrder({
                        ...prepared,
                        paidOnline: true,
                        paymentId: confirmJson.paymentId,
                        receiptNumber: confirmJson.receiptNumber,
                    });
                } catch (err) {
                    setError(err.message || 'Payment captured, but verification encountered an error.');
                } finally {
                    setSubmitting(false);
                }
            },
            modal: {
                ondismiss: () => {
                    setPendingOrder(prepared);
                    setSubmitting(false);
                },
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setError('');

        if (pendingOrder && paymentMethod === 'online' && pendingOrder.razorpayOrder) {
            await openRazorpayModal(pendingOrder);
            return;
        }

        const rawPhone = phone.replace(/\D/g, '').slice(-10);
        if (!name.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (rawPhone.length !== 10 || verifiedPhone !== rawPhone) {
            setError('Please verify your 10-digit mobile number with OTP before confirming.');
            return;
        }
        if (!flatNumber.trim() || !buildingName.trim() || !street.trim() || !locality.trim()) {
            setError('Please complete your Flat, Building, Street & Mumbai Locality.');
            return;
        }
        if (!selectedDate || !selectedSlot) {
            setError('Please pick a date and arrival time slot.');
            return;
        }

        setSubmitting(true);
        try {
            saveLocation({
                locality: locality.trim(),
                pincode: pincode.trim(),
                flat: flatNumber.trim(),
                building: buildingName.trim(),
            });

            const res = await fetch('/api/v2/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'prepare_order',
                    items: items.map(i => ({ id: i.id, qty: i.qty })),
                    paymentMethod,
                    notes: specialNotes.trim(),
                    session_id: typeof window !== 'undefined' ? sessionStorage.getItem('sorted_session_id') : null,
                    customer: {
                        name: name.trim(),
                        phone: rawPhone,
                        email: email.trim(),
                        address: {
                            flat_number: flatNumber.trim(),
                            building_name: buildingName.trim(),
                            street: street.trim(),
                            locality: locality.trim(),
                            city: 'Mumbai',
                            pincode: pincode.trim(),
                        },
                    },
                    schedule: {
                        date: selectedDate,
                        slot: selectedSlot,
                    },
                }),
            });

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Could not create your booking.');
            }

            // Persist unified customer session immediately
            saveCustomerSession({
                id: json.customerAuthId || json.customerId,
                phone: rawPhone,
                name: json.customerName || name.trim(),
                email: email.trim(),
                profile_complete: true,
            });

            if (paymentMethod === 'online' && json.razorpayOrder) {
                await openRazorpayModal(json);
                return;
            }

            clearCart();
            setCompletedOrder({
                ...json,
                paidOnline: false,
            });
        } catch (err) {
            setError(err.message || 'Checkout error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!hydrated) {
        return (
            <div className="v2-container" style={{ paddingTop: 48, textAlign: 'center' }}>
                <Loader2 size={28} color="#6338f5" />
            </div>
        );
    }

    if (completedOrder) {
        return (
            <div className="v2-container" style={{ paddingTop: 32, maxWidth: 680 }}>
                <div className="v2-card" style={{ padding: 28, textAlign: 'center' }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 999,
                            background: '#ecfdf5',
                            color: '#0b875b',
                            display: 'grid',
                            placeItems: 'center',
                            margin: '0 auto 16px',
                        }}
                    >
                        <CheckCircle2 size={34} />
                    </div>
                    <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>
                        Booking Confirmed!
                    </h1>
                    <p style={{ margin: '0 0 20px', fontSize: 14, color: '#5b6476' }}>
                        {completedOrder.paidOnline
                            ? 'Upfront payment verified and official GST invoice generated.'
                            : 'Your Mumbai slot is booked. You can pay online anytime or upon technician visit.'}
                    </p>

                    <div
                        style={{
                            background: '#f8fafc',
                            borderRadius: 14,
                            padding: 16,
                            textAlign: 'left',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 12,
                            marginBottom: 20,
                            fontSize: 13,
                        }}
                    >
                        <div>
                            <div style={{ color: '#64748b', fontSize: 11.5 }}>Booking Reference</div>
                            <strong style={{ fontSize: 15 }}>{completedOrder.bookingNumber}</strong>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: 11.5 }}>GST Invoice</div>
                            <strong style={{ fontSize: 15 }}>{completedOrder.invoiceNumber}</strong>
                        </div>
                        {completedOrder.receiptNumber && (
                            <div>
                                <div style={{ color: '#64748b', fontSize: 11.5 }}>Payment Receipt</div>
                                <strong style={{ fontSize: 15, color: '#0b875b' }}>
                                    {completedOrder.receiptNumber}
                                </strong>
                            </div>
                        )}
                        <div>
                            <div style={{ color: '#64748b', fontSize: 11.5 }}>Total Amount</div>
                            <strong style={{ fontSize: 15 }}>
                                {formatINR(completedOrder.totals?.grandTotal)} ({completedOrder.paidOnline ? 'Paid' : 'Due on Visit'})
                            </strong>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                        <Link href="/v2/customer" className="v2-primary-btn" style={{ width: 'auto', padding: '0 22px' }}>
                            Track in Customer Portal
                        </Link>
                        <Link href="/v2" className="v2-secondary-btn">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (items.length === 0 && !pendingOrder) {
        return (
            <div className="v2-container" style={{ paddingTop: 40, maxWidth: 620 }}>
                <div className="v2-card" style={{ textAlign: 'center', padding: 36 }}>
                    <ShoppingBag size={36} color="#6338f5" style={{ marginBottom: 12 }} />
                    <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Your Cart is Empty</h1>
                    <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                        Add an AC service, washing machine check-up, or RO filter package first.
                    </p>
                    <Link href="/v2/services" className="v2-primary-btn" style={{ width: 'auto', padding: '0 22px' }}>
                        Browse Services
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="v2-container" style={{ paddingTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Link
                    href="/v2/services"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#475569', fontSize: 13.5, fontWeight: 600 }}
                >
                    <ArrowLeft size={16} /> Continue Browsing
                </Link>
                <span style={{ fontSize: 12.5, color: '#0b875b', fontWeight: 700 }}>
                    Instant Slot + GST Invoice
                </span>
            </div>

            <form
                onSubmit={handlePlaceOrder}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                    gap: 20,
                    alignItems: 'start',
                }}
            >
                {/* LEFT COLUMN: Contact, Address, Slot, Payment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {pendingOrder && (
                        <div
                            className="v2-card"
                            style={{ background: '#fffbeb', borderColor: '#fde68a', display: 'flex', flexDirection: 'column', gap: 10 }}
                        >
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div style={{ fontSize: 13.5, color: '#78350f' }}>
                                    <strong>Booking {pendingOrder.bookingNumber} reserved!</strong> Razorpay payment was closed before completion.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="v2-primary-btn"
                                    style={{ width: 'auto', padding: '0 16px', height: 38 }}
                                    onClick={() => openRazorpayModal(pendingOrder)}
                                >
                                    Retry Payment ({formatINR(pendingOrder.totals?.grandTotal)})
                                </button>
                                <button
                                    type="button"
                                    className="v2-secondary-btn"
                                    style={{ height: 38 }}
                                    onClick={() => {
                                        clearCart();
                                        setCompletedOrder({ ...pendingOrder, paidOnline: false });
                                        setPendingOrder(null);
                                    }}
                                >
                                    Pay Later in Portal
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 1. Customer & OTP */}
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <strong style={{ fontSize: 16 }}>1. Contact & OTP Verification</strong>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                            <div>
                                <label className="v2-field-label">Full Name *</label>
                                <input
                                    className="v2-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Rohan Sharma"
                                    required
                                />
                            </div>
                            <div>
                                <label className="v2-field-label">Email (for GST Invoice PDF)</label>
                                <input
                                    type="email"
                                    className="v2-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="rohan@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="v2-field-label">Mobile Number (SMS OTP) *</label>
                            <PhoneOtpGate
                                phone={phone}
                                onPhoneChange={setPhone}
                                verifiedPhone={verifiedPhone}
                                containerId="v2-checkout-recaptcha"
                                onResetVerification={() => setVerifiedPhone('')}
                                onVerified={(verified10, lookup) => {
                                    setPhone(verified10);
                                    setVerifiedPhone(verified10);
                                    if (lookup?.name && !name.trim()) setName(lookup.name);
                                }}
                            />
                        </div>
                    </div>

                    {/* 2. Mumbai Address */}
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin size={17} color="#6338f5" />
                            <strong style={{ fontSize: 16 }}>2. Mumbai Service Address</strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                            <div>
                                <label className="v2-field-label">Flat / Wing *</label>
                                <input
                                    className="v2-input"
                                    value={flatNumber}
                                    onChange={(e) => setFlatNumber(e.target.value)}
                                    placeholder="e.g. A-1201"
                                    required
                                />
                            </div>
                            <div>
                                <label className="v2-field-label">Building / Society *</label>
                                <input
                                    className="v2-input"
                                    value={buildingName}
                                    onChange={(e) => setBuildingName(e.target.value)}
                                    placeholder="e.g. Cliff Ave, Hiranandani"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="v2-field-label">Street / Landmark *</label>
                            <input
                                className="v2-input"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="Road name or nearby landmark"
                                required
                            />
                        </div>

                        <div>
                            <label className="v2-field-label">Mumbai Locality & Pincode *</label>
                            <LocalityCombobox
                                value={locality}
                                pincode={pincode}
                                onChange={(loc, pin) => {
                                    setLocality(loc);
                                    setPincode(pin);
                                }}
                            />
                        </div>
                    </div>

                    {/* 3. Date & Time Slot */}
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={17} color="#6338f5" />
                            <strong style={{ fontSize: 16 }}>3. Select Arrival Slot</strong>
                        </div>

                        {slotsLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13.5 }}>
                                <Loader2 size={16} /> Loading live Mumbai technician slots...
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                    {dateKeys.map(dateKey => {
                                        const { dayLabel, datePart } = formatDateTab(dateKey);
                                        const active = selectedDate === dateKey;
                                        return (
                                            <button
                                                key={dateKey}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDate(dateKey);
                                                    const avail = (slotsMap[dateKey] || []).find(s => s.available);
                                                    setSelectedSlot(avail ? avail.label : '');
                                                }}
                                                style={{
                                                    minWidth: 96,
                                                    padding: '9px 12px',
                                                    borderRadius: 11,
                                                    border: active ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                                    background: active ? '#f5f3ff' : '#fff',
                                                    color: active ? '#4b23d4' : '#334155',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{dayLabel}</div>
                                                <div style={{ fontSize: 11.5 }}>{datePart}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
                                    {currentDaySlots.length === 0 ? (
                                        <span style={{ fontSize: 13, color: '#64748b' }}>
                                            No slots scheduled for this date. Pick another day.
                                        </span>
                                    ) : (
                                        currentDaySlots.map(slot => {
                                            const active = selectedSlot === slot.label;
                                            return (
                                                <button
                                                    key={slot.id || slot.label}
                                                    type="button"
                                                    disabled={!slot.available}
                                                    onClick={() => setSelectedSlot(slot.label)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: 10,
                                                        border: active ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                                        background: !slot.available
                                                            ? '#f8fafc'
                                                            : active
                                                            ? '#f5f3ff'
                                                            : '#fff',
                                                        color: !slot.available
                                                            ? '#94a3b8'
                                                            : active
                                                            ? '#4b23d4'
                                                            : '#0f172a',
                                                        cursor: slot.available ? 'pointer' : 'not-allowed',
                                                        textAlign: 'left',
                                                        fontFamily: 'inherit',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                                                        <Clock size={14} />
                                                        <span>{slot.label}</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, marginTop: 2, color: slot.available ? '#0b875b' : '#ef4444' }}>
                                                        {slot.available
                                                            ? `${slot.slotsAvailableCount || 1} tech slots left`
                                                            : slot.reason === 'expired'
                                                            ? 'Slot cutoff passed'
                                                            : 'Fully booked'}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="v2-field-label">Special Notes for Technician (Optional)</label>
                            <input
                                className="v2-input"
                                value={specialNotes}
                                onChange={(e) => setSpecialNotes(e.target.value)}
                                placeholder="e.g. Society gate entry note, outdoor unit on 4th floor"
                            />
                        </div>
                    </div>

                    {/* 4. Payment Method */}
                    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <strong style={{ fontSize: 16 }}>4. Choose Payment Option</strong>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: 12,
                                borderRadius: 12,
                                border: paymentMethod === 'online' ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                background: paymentMethod === 'online' ? '#f5f3ff' : '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                type="radio"
                                name="v2_payment_mode"
                                checked={paymentMethod === 'online'}
                                onChange={() => setPaymentMethod('online')}
                            />
                            <CreditCard size={18} color="#6338f5" />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>Pay Online Now (Razorpay UPI / Cards)</div>
                                <div style={{ fontSize: 12, color: '#5b6476' }}>
                                    Instant confirmed receipt & automatic GST invoice settlement
                                </div>
                            </div>
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: 12,
                                borderRadius: 12,
                                border: paymentMethod === 'pay_after_service' ? '1.5px solid #6338f5' : '1px solid #e2e8f0',
                                background: paymentMethod === 'pay_after_service' ? '#f5f3ff' : '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                type="radio"
                                name="v2_payment_mode"
                                checked={paymentMethod === 'pay_after_service'}
                                onChange={() => setPaymentMethod('pay_after_service')}
                            />
                            <Wallet size={18} color="#0f172a" />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>Pay After Service / Inspection</div>
                                <div style={{ fontSize: 12, color: '#5b6476' }}>
                                    Pay technician via UPI / Card / Cash or online inside your portal
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* RIGHT COLUMN: Order Summary & Submit */}
                <aside className="v2-card" style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={17} color="#6338f5" />
                        <strong style={{ fontSize: 16 }}>Order Summary</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {items.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    fontSize: 13.5,
                                    paddingBottom: 8,
                                    borderBottom: '1px solid #f1f5f9',
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        {formatINR(item.price)} x {item.qty}
                                    </div>
                                </div>
                                <div className="v2-qty-stepper" style={{ height: 30, boxShadow: 'none' }}>
                                    <button type="button" onClick={() => decrementItem(item.id)}>−</button>
                                    <span>{item.qty}</span>
                                    <button type="button" onClick={() => incrementItem(item.id)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>Services Subtotal</span>
                            <span>{formatINR(totals.itemsSubtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>CGST + SGST</span>
                            <span>{formatINR(totals.totalTax)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                            <span>Total Amount</span>
                            <span>{formatINR(totals.grandTotal)}</span>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: 10, borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="v2-primary-btn" disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 size={16} />
                                <span>Processing...</span>
                            </>
                        ) : paymentMethod === 'online' ? (
                            <span>Pay {formatINR(totals.grandTotal)} & Confirm Slot</span>
                        ) : (
                            <span>Confirm Booking ({formatINR(totals.grandTotal)})</span>
                        )}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#0b875b', fontWeight: 600 }}>
                        <ShieldCheck size={15} />
                        <span>30-day warranty + free rescheduling in Customer Portal</span>
                    </div>
                </aside>
            </form>
        </div>
    );
}
