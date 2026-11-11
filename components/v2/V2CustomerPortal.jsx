'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Calendar,
    MapPin,
    ShieldCheck,
    User,
    Phone,
    LogOut,
    Loader2,
    Wrench,
    CreditCard,
    CheckCircle2,
    Plus,
    RefreshCw,
} from 'lucide-react';
import PhoneOtpGate from './PhoneOtpGate';
import { useV2Cart } from './CartContext';
import { formatINR } from '@/lib/v2/catalogConfig';
import { loadRazorpayCheckoutScript } from '@/lib/v2/razorpayLoader';

const STATUS_STYLES = {
    new_job_request: { label: 'Requested', bg: '#eff6ff', color: '#1d4ed8' },
    booking_request: { label: 'Requested', bg: '#eff6ff', color: '#1d4ed8' },
    pending: { label: 'Scheduled', bg: '#f5f3ff', color: '#6338f5' },
    assigned: { label: 'Tech Assigned', bg: '#fef3c7', color: '#b45309' },
    on_the_way: { label: 'On the Way', bg: '#ecfeff', color: '#0e7490' },
    in_progress: { label: 'In Progress', bg: '#fef3c7', color: '#b45309' },
    completed: { label: 'Completed', bg: '#ecfdf5', color: '#065f46' },
    cancelled: { label: 'Cancelled', bg: '#fef2f2', color: '#b91c1c' },
};

export default function V2CustomerPortal({ initialTab = 'bookings' }) {
    const {
        hydrated,
        customerSession,
        saveCustomerSession,
        logoutCustomerSession,
        saveLocation,
    } = useV2Cart();

    const [activeTab, setActiveTab] = useState(
        ['bookings', 'properties', 'plans', 'profile'].includes(initialTab) ? initialTab : 'bookings'
    );

    useEffect(() => {
        if (['bookings', 'properties', 'plans', 'profile'].includes(initialTab)) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);
    const [loginPhone, setLoginPhone] = useState('');

    const [jobs, setJobs] = useState([]);
    const [properties, setProperties] = useState([]);
    const [amcs, setAmcs] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [invoicesByJob, setInvoicesByJob] = useState({});
    const [loadingData, setLoadingData] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    const customerId = customerSession?.customerId || customerSession?.id || null;

    const loadPortalData = useCallback(async () => {
        if (!customerId) return;
        setLoadingData(true);
        try {
            const [jobsRes, propsRes, amcRes, rentalRes] = await Promise.all([
                fetch(`/api/customer/jobs?customerId=${encodeURIComponent(customerId)}`),
                fetch(`/api/customer/properties?customerId=${encodeURIComponent(customerId)}`),
                fetch(`/api/customer/amc?customerId=${encodeURIComponent(customerId)}`),
                fetch(`/api/customer/rentals?customerId=${encodeURIComponent(customerId)}`),
            ]);

            const [jobsJson, propsJson, amcJson, rentalJson] = await Promise.all([
                jobsRes.json().catch(() => ({})),
                propsRes.json().catch(() => ({})),
                amcRes.json().catch(() => ({})),
                rentalRes.json().catch(() => ({})),
            ]);

            if (jobsJson.success) setJobs(jobsJson.jobs || []);
            if (propsJson.success) setProperties(propsJson.properties || propsJson.data || []);
            if (amcJson.success) setAmcs(amcJson.contracts || amcJson.amcs || amcJson.data || []);
            if (rentalJson.success) setRentals(rentalJson.rentals || rentalJson.data || []);
        } catch (_) {
        } finally {
            setLoadingData(false);
        }
    }, [customerId]);

    useEffect(() => {
        if (customerId) loadPortalData();
    }, [customerId, loadPortalData]);

    const handleLoadInvoiceAndPay = async (job) => {
        setActionMessage('');
        try {
            const invRes = await fetch(`/api/customer/jobs/${job.id}/invoice`);
            const invJson = await invRes.json();
            if (!invJson.success || !invJson.invoice) {
                setActionMessage(`No generated bill found yet for ${job.jobNumber}.`);
                return;
            }
            const inv = invJson.invoice;
            setInvoicesByJob(prev => ({ ...prev, [job.id]: inv }));

            const due = Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0));
            if (inv.status === 'paid' || due <= 0) {
                setActionMessage(`Invoice ${inv.invoice_number} is already paid.`);
                return;
            }

            const loaded = await loadRazorpayCheckoutScript();
            if (!loaded || !window.Razorpay) {
                setActionMessage('Unable to open Razorpay gateway.');
                return;
            }

            const orderRes = await fetch('/api/customer/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: due,
                    receipt: job.id,
                    job_id: job.id,
                    account_id: customerId,
                    invoice_id: inv.id,
                    collected_by: 'customer',
                    amount_label: 'full',
                }),
            });
            const orderJson = await orderRes.json();
            if (!orderJson.success || !orderJson.order) {
                setActionMessage(orderJson.error || 'Could not start online payment.');
                return;
            }

            const rzp = new window.Razorpay({
                key: orderJson.keyId,
                amount: orderJson.order.amount,
                currency: orderJson.order.currency || 'INR',
                name: 'Sorted Solutions',
                description: `Invoice ${inv.invoice_number} (${job.jobNumber})`,
                order_id: orderJson.order.id,
                theme: { color: '#6338f5' },
                handler: async (resp) => {
                    await fetch('/api/v2/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'confirm_payment',
                            ...resp,
                            job_id: job.id,
                            invoice_id: inv.id,
                            account_id: customerId,
                            account_name: customerSession?.name || 'Customer',
                            amount: due,
                        }),
                    });
                    setActionMessage(`Payment successful for ${inv.invoice_number}!`);
                    loadPortalData();
                },
            });
            rzp.open();
        } catch (err) {
            setActionMessage(err.message || 'Unable to process invoice.');
        }
    };

    if (!hydrated) {
        return (
            <div className="v2-container" style={{ paddingTop: 48, textAlign: 'center' }}>
                <Loader2 size={28} color="#6338f5" />
            </div>
        );
    }

    if (!customerSession) {
        return (
            <div className="v2-container" style={{ paddingTop: 32, maxWidth: 460 }}>
                <div className="v2-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <span className="v2-service-tag">Sorted Customer App Preview</span>
                        <h1 style={{ margin: '4px 0 6px', fontSize: 22 }}>Sign in with Mobile OTP</h1>
                        <p style={{ margin: 0, fontSize: 13.5, color: '#5b6476' }}>
                            Track your bookings, download GST invoices, approve technician quotes & manage AMC plans.
                        </p>
                    </div>

                    <PhoneOtpGate
                        phone={loginPhone}
                        onPhoneChange={setLoginPhone}
                        verifiedPhone=""
                        containerId="v2-portal-recaptcha"
                        autoCreateIfNew
                        onVerified={(phone10, lookup) => {
                            if (lookup?.id) {
                                saveCustomerSession(lookup);
                            }
                        }}
                    />

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, fontSize: 12.5, color: '#64748b' }}>
                        Prefer classic username & password login?{' '}
                        <Link href="/login" style={{ color: '#6338f5', fontWeight: 700, textDecoration: 'none' }}>
                            Go to Classic Login →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="v2-container" style={{ paddingTop: 20 }}>
            {/* Top Welcome Header */}
            <div
                className="v2-card"
                style={{
                    background: 'linear-gradient(135deg, #1d1042, #47288f)',
                    color: '#fff',
                    border: 'none',
                    marginBottom: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}
            >
                <div>
                    <div style={{ fontSize: 12, color: '#fde68a', fontWeight: 700 }}>
                        Sorted Care Account
                    </div>
                    <h1 style={{ margin: '2px 0 4px', fontSize: 21 }}>
                        Hi, {customerSession.name || 'Customer'}
                    </h1>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                        +91 {String(customerSession.phone || '').replace(/\D/g, '').slice(-10)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Link
                        href="/v2/services"
                        style={{
                            background: '#fff',
                            color: '#1d1042',
                            textDecoration: 'none',
                            padding: '9px 14px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        <Plus size={15} /> Book Service
                    </Link>
                    <button
                        type="button"
                        onClick={loadPortalData}
                        style={{
                            background: 'rgba(255,255,255,0.16)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: 10,
                            width: 38,
                            height: 38,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="v2-cat-pills-row" style={{ marginBottom: 16 }}>
                {[
                    { id: 'bookings', label: `Bookings (${jobs.length})`, icon: Calendar },
                    { id: 'properties', label: `Addresses (${properties.length})`, icon: MapPin },
                    { id: 'plans', label: `Care Plans (${amcs.length + rentals.length})`, icon: ShieldCheck },
                    { id: 'profile', label: 'Profile', icon: User },
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`v2-cat-pill ${activeTab === tab.id ? 'active' : ''}`}
                            style={{ cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {actionMessage && (
                <div
                    className="v2-card"
                    style={{ marginBottom: 14, background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontSize: 13.5, fontWeight: 600 }}
                >
                    {actionMessage}
                </div>
            )}

            {loadingData ? (
                <div className="v2-card" style={{ textAlign: 'center', padding: 36 }}>
                    <Loader2 size={24} color="#6338f5" />
                </div>
            ) : (
                <>
                    {/* TAB 1: BOOKINGS */}
                    {activeTab === 'bookings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {jobs.length === 0 ? (
                                <div className="v2-card" style={{ textAlign: 'center', padding: 36 }}>
                                    <Wrench size={28} color="#6338f5" style={{ marginBottom: 8 }} />
                                    <h3 style={{ margin: '0 0 6px' }}>No service bookings yet</h3>
                                    <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#64748b' }}>
                                        Add an appliance service from the storefront to track technician dispatch live.
                                    </p>
                                    <Link href="/v2/services" className="v2-primary-btn" style={{ width: 'auto', padding: '0 20px' }}>
                                        Explore Services
                                    </Link>
                                </div>
                            ) : (
                                jobs.map(job => {
                                    const st = STATUS_STYLES[job.status] || { label: job.status || 'Active', bg: '#f1f5f9', color: '#334155' };
                                    const inv = invoicesByJob[job.id];
                                    return (
                                        <div key={job.id} className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                <div>
                                                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                                        {job.jobNumber} · {job.product?.type || 'Appliance Service'}
                                                    </div>
                                                    <strong style={{ fontSize: 16 }}>
                                                        {job.issue || job.notes || 'Service Request'}
                                                    </strong>
                                                </div>
                                                <span
                                                    style={{
                                                        background: st.bg,
                                                        color: st.color,
                                                        padding: '4px 10px',
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {st.label}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: '#475569' }}>
                                                {job.dueDate && (
                                                    <span>
                                                        Slot: <strong>{job.dueDate}</strong> {job.confirmedVisitTime ? `(${job.confirmedVisitTime})` : ''}
                                                    </span>
                                                )}
                                                {job.locality && (
                                                    <span>Area: <strong>{job.locality}</strong></span>
                                                )}
                                                {job.assignedTechnician && (
                                                    <span>Technician: <strong>{job.assignedTechnician}</strong></span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                                                {job.technicianMobile && (
                                                    <a href={`tel:${job.technicianMobile}`} className="v2-secondary-btn" style={{ height: 36, fontSize: 12.5 }}>
                                                        <Phone size={14} /> Call Technician
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleLoadInvoiceAndPay(job)}
                                                    className="v2-secondary-btn"
                                                    style={{ height: 36, fontSize: 12.5 }}
                                                >
                                                    <CreditCard size={14} />
                                                    {inv?.status === 'paid'
                                                        ? `Invoice ${inv.invoice_number} Paid`
                                                        : inv
                                                        ? `Pay Due ${formatINR((inv.total_amount || 0) - (inv.paid_amount || 0))}`
                                                        : 'Check Bill / Pay Online'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 2: PROPERTIES */}
                    {activeTab === 'properties' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {properties.length === 0 ? (
                                <div className="v2-card" style={{ textAlign: 'center', padding: 32 }}>
                                    No saved Mumbai addresses yet. Complete your first checkout to save an address!
                                </div>
                            ) : (
                                properties.map((prop, idx) => (
                                    <div key={prop.id || idx} className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <MapPin size={16} color="#6338f5" />
                                            <strong>{prop.name || prop.locality || 'Mumbai Home'}</strong>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#475569' }}>
                                            {[prop.flat_number, prop.building_name, prop.address, prop.locality, prop.pincode]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </div>
                                        <button
                                            type="button"
                                            className="v2-secondary-btn"
                                            style={{ height: 34, fontSize: 12.5, alignSelf: 'flex-start' }}
                                            onClick={() => {
                                                saveLocation({
                                                    locality: prop.locality || '',
                                                    pincode: prop.pincode || '',
                                                    flat: prop.flat_number || '',
                                                    building: prop.building_name || '',
                                                });
                                                setActionMessage(`Active service locality updated to ${prop.locality || 'selected address'}.`);
                                            }}
                                        >
                                            <CheckCircle2 size={14} color="#0b875b" /> Use as Active Location
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB 3: AMC & RENTALS */}
                    {activeTab === 'plans' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {amcs.length === 0 && rentals.length === 0 ? (
                                <div className="v2-card" style={{ textAlign: 'center', padding: 36 }}>
                                    <ShieldCheck size={30} color="#6338f5" style={{ marginBottom: 8 }} />
                                    <h3 style={{ margin: '0 0 6px' }}>No Active AMC or Rental Plans</h3>
                                    <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#64748b' }}>
                                        Annual Maintenance Contracts protect your AC & Water Purifier with scheduled preventive visits.
                                    </p>
                                    <Link href="/v2/services/ac-repair" className="v2-primary-btn" style={{ width: 'auto', padding: '0 20px' }}>
                                        Explore AC Services & AMC
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {amcs.map((amc, i) => (
                                        <div key={amc.id || i} className="v2-card">
                                            <span className="v2-service-tag">AMC Contract</span>
                                            <strong style={{ display: 'block', fontSize: 15 }}>
                                                {amc.planName || amc.plan_name || amc.appliance_type || 'Annual Maintenance Contract'}
                                            </strong>
                                            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                                                Status: <strong>{amc.status || 'Active'}</strong>
                                                {amc.endDate ? ` · Valid until ${amc.endDate}` : ''}
                                                {typeof amc.servicesTotal === 'number'
                                                    ? ` · Visits: ${amc.servicesUsed || 0}/${amc.servicesTotal}`
                                                    : ''}
                                            </div>
                                        </div>
                                    ))}
                                    {rentals.map((rent, i) => (
                                        <div key={rent.id || i} className="v2-card">
                                            <span className="v2-service-tag">Appliance Rental</span>
                                            <strong style={{ display: 'block', fontSize: 15 }}>
                                                {rent.productName || rent.appliance_name || rent.plan_name || 'Rental Plan'}
                                            </strong>
                                            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                                                Status: <strong>{rent.status || 'Active'}</strong>
                                                {rent.monthlyRent ? ` · ${formatINR(rent.monthlyRent)}/mo` : ''}
                                                {rent.nextRentDueDate ? ` · Next due ${rent.nextRentDueDate}` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB 4: PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="v2-card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <strong style={{ fontSize: 16 }}>Account Information</strong>
                            <div style={{ fontSize: 13.5, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div>Name: <strong>{customerSession.name || 'Sorted Customer'}</strong></div>
                                <div>Phone: <strong>+91 {String(customerSession.phone || '').replace(/\D/g, '').slice(-10)}</strong></div>
                                <div>Account ID: <code>{customerId}</code></div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <Link href="/customer" className="v2-secondary-btn">
                                    Open Classic Customer Portal
                                </Link>
                                <button
                                    type="button"
                                    onClick={logoutCustomerSession}
                                    className="v2-secondary-btn"
                                    style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                                >
                                    <LogOut size={15} /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
