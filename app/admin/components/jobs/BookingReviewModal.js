'use client'

import { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, User, X, CheckCircle2, Loader2, UserCog, UserX, MessageCircle } from 'lucide-react';
import { jobsAPI, accountGroupsAPI, accountsAPI } from '@/lib/adminAPI';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/helpers';
import NewAccountForm from '../accounts/NewAccountForm';
import { formatMobileNumber } from '@/lib/utils/validation';
import CreateJobForm from '../CreateJobForm';

function BookingReviewModal({ booking, onClose, onConverted, onDismissed }) {
    // ── Parse booking data ──────────────────────────────────────────────────────
    // Website bookings store data in booking.notes (JSON), customer-app bookings
    // store fields directly on the job row.
    let bd = booking.booking_data || {};
    if (Object.keys(bd).length === 0 && booking.notes) {
        try { bd = JSON.parse(booking.notes); } catch (e) { /* ignore */ }
    }
    const isEnquiry = booking.status === 'enquiry';
    const cust = bd.customer || {
        name: booking.customer_name || (isEnquiry ? 'Website Lead' : ''),
        phone: booking.customer?.mobile || booking.customer?.phone || booking.customer_phone || '',
        email: booking.customer?.email || booking.customer_email || '',
        address: booking.property || {},
    };
    const addr = cust.address || {};
    const schedule = bd.schedule || {
        date: booking.scheduled_date,
        slot: booking.scheduled_time
    };

    // ── State ───────────────────────────────────────────────────────────────────
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [createdCustomer, setCreatedCustomer] = useState(null);    // matched / created account
    const [accountConfirmed, setAccountConfirmed] = useState(false); // admin has reviewed & saved
    const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [checkingAccount, setCheckingAccount] = useState(true);
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [submittingDenial, setSubmittingDenial] = useState(false);

    // ── Auto-detect existing account on open (by phone number or customer_id) ──
    useEffect(() => {
        if (booking.customer_id) {
            setCheckingAccount(true);
            fetch(`/api/admin/accounts?id=${booking.customer_id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success && d.data) {
                        const match = d.data;
                        if (match) {
                            setCreatedCustomer(match);
                            setAccountAlreadyExists(true);
                            return;
                        }
                    }
                    searchByPhone();
                })
                .catch(() => {
                    searchByPhone();
                })
                .finally(() => setCheckingAccount(false));
            return;
        }

        searchByPhone();

        function searchByPhone() {
            const phone = cust.phone;
            if (!phone) { setCheckingAccount(false); return; }
            const digits = phone.replace(/\D/g, '').slice(-10);
            if (!digits || digits.length < 7) { setCheckingAccount(false); return; }

            setCheckingAccount(true);
            fetch('/api/admin/accounts?type=customer')
                .then(r => r.json())
                .then(d => {
                    if (!d.success) return;
                    const match = (d.data || []).find(acc => {
                        const m = (acc.mobile || acc.phone || '').replace(/\D/g, '').slice(-10);
                        return m === digits;
                    });
                    if (match) {
                        setCreatedCustomer(match);
                        setAccountAlreadyExists(true);
                    }
                })
                .catch(() => { /* silent — don't block UI */ })
                .finally(() => setCheckingAccount(false));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id, booking.customer_id]);

    // ── Address helpers ─────────────────────────────────────────────────────────
    const fullAddress = [
        addr.flat_number || addr.apartment,
        addr.building_name || addr.building,
        addr.street,
        addr.locality,
        addr.city,
        addr.state,
        addr.zip || addr.pincode,
    ].filter(Boolean).join(', ') || booking.property?.address || '';

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress || cust.name || '')}`;

    const whatsappUrl = useMemo(() => {
        if (!cust.phone) return '';
        const clean = cust.phone.replace(/\D/g, '');
        return `https://wa.me/${clean.length === 10 ? '91' + clean : clean}`;
    }, [cust.phone]);

    // ── Load account groups on demand ───────────────────────────────────────────
    const ensureGroups = async () => {
        if (groups.length > 0) return;
        setLoadingGroups(true);
        try { setGroups((await accountGroupsAPI.getAll()) || []); }
        catch (e) { console.error('Failed to load groups:', e); }
        finally { setLoadingGroups(false); }
    };

    const handleOpenAccountForm = async () => {
        await ensureGroups();
        setShowAccountForm(true);
    };

    // ── Save handler (covers both CREATE new and CONFIRM existing) ──────────────
    const handleAccountSaved = async (accountData) => {
        try {
            const result = accountData.id
                ? await accountsAPI.update(accountData.id, accountData)
                : await accountsAPI.create(accountData);
            setCreatedCustomer(result);
            setAccountConfirmed(true);
            setShowAccountForm(false);
        } catch (err) {
            console.error('Error saving account:', err);
            alert('Failed to save account: ' + err.message);
        }
    };

    // ── Convert booking → job ───────────────────────────────────────────────────
    const handleConvertJob = async (jobData) => {
        try {
            await jobsAPI.update(booking.id, {
                ...jobData,
                status: jobData.technician_id ? 'scheduled' : 'new_job_request',
            });
            onConverted();
        } catch (err) {
            console.error('Error converting booking:', err);
            alert('Failed to convert booking: ' + err.message);
        }
    };

    const handleDismiss = async () => {
        if (!confirm('Dismiss this booking request?')) return;
        setDismissing(true);
        try { await jobsAPI.update(booking.id, { status: 'cancelled' }); onDismissed(); }
        catch (err) { alert('Failed to dismiss: ' + err.message); }
        finally { setDismissing(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Permanently delete this booking? This cannot be undone.')) return;
        setDeleting(true);
        try { await jobsAPI.delete(booking.id); onDismissed(); }
        catch (err) { alert('Failed to delete: ' + err.message); }
        finally { setDeleting(false); }
    };

    const handleDenySubmit = async () => {
        if (!denyReason.trim()) return;
        setSubmittingDenial(true);
        try {
            // 1. Create customer interaction
            const interactionPayload = {
                customer_id: createdCustomer?.id || null,
                customer_name: createdCustomer?.name || cust.name || null,
                job_id: booking.id,
                type: 'cx-denied-service',
                category: 'job',
                description: `Customer Denied Service. Reason: ${denyReason}`,
                performed_by_name: 'Admin',
                source: 'Admin App',
                timestamp: new Date().toISOString()
            };

            const postRes = await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interactionPayload),
            });
            const postData = await postRes.json();
            if (!postData.success) {
                throw new Error(postData.error || 'Failed to save interaction');
            }

            // 2. Update job status to 'cancelled'
            await jobsAPI.update(booking.id, { status: 'cancelled' });

            // 3. Close modal & refresh jobs
            onDismissed();
        } catch (err) {
            console.error('Error submitting denial:', err);
            alert('Failed to record denial: ' + err.message);
        } finally {
            setSubmittingDenial(false);
            setShowDenyModal(false);
        }
    };

    // ── Account group resolution ────────────────────────────────────────────────
    const resolvedCustomerGroup = useMemo(() => {
        if (groups.length === 0) return 'customers';
        const g = groups.find(g =>
            g.name.toLowerCase() === 'customers' || g.name.toLowerCase() === 'customer accounts'
        );
        if (g) return g.id;
        const d = groups.find(g => g.name.toLowerCase() === 'sundry debtors');
        return d ? d.id : 'customers';
    }, [groups]);

    // ── Property prefill from this booking ──────────────────────────────────────
    const bookingPropertyPrefill = {
        id: `booking-${booking.id}`,
        name: 'Home',
        address: addr.street || fullAddress || '',
        flat_number: addr.flat_number || addr.apartment || '',
        building_name: addr.building_name || addr.building || '',
        locality: addr.locality || '',
        pincode: addr.zip || addr.pincode || '',
        contactPerson: cust.name || '',
        contactPhone: cust.phone || '',
    };

    // ── Form pre-fill ───────────────────────────────────────────────────────────
    // For an existing account: merge account data + booking property so admin can confirm
    // For a new account: fully pre-fill from booking
    const accountPrefill = useMemo(() => {
        if (accountAlreadyExists && createdCustomer) {
            // Normalize mobile: accounts may store number in `mobile`, `phone`, or neither (old records).
            // Fall back to the booking's phone so the field is never blank.
            const normalizedMobile =
                createdCustomer.mobile?.trim() ||
                createdCustomer.phone?.trim() ||
                cust.phone?.trim() || '';

            return {
                ...createdCustomer,
                mobile: normalizedMobile,
                email: createdCustomer.email?.trim() || cust.email?.trim() || '',
                acquisition_source: createdCustomer.acquisition_source || 'Website Organic',
                // Add booking property so admin can verify / save it
                properties: (createdCustomer.properties?.length > 0)
                    ? createdCustomer.properties
                    : [bookingPropertyPrefill],
            };
        }
        return {
            name: cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || (isEnquiry ? 'Website Lead' : ''),
            mobile: cust.phone?.trim() || '',
            email: cust.email?.trim() || '',
            under: resolvedCustomerGroup,
            acquisition_source: 'Website Organic',
            mailing_address: fullAddress,
            billing_address: fullAddress,
            shipping_address: fullAddress,
            properties: [bookingPropertyPrefill],
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountAlreadyExists, createdCustomer, resolvedCustomerGroup]);


    // ── Job pre-fill ────────────────────────────────────────────────────────────
    const jobPrefill = useMemo(() => ({
        id: booking.id,
        job_number: booking.job_number,
        status: 'new_job_request',
        category: bd.categoryName || booking.category || '',
        subcategory: bd.subcategoryName || booking.subcategory || '',
        appliance: bd.applianceName || booking.appliance || bd.categoryName || booking.category || '',
        brand: bd.brandName || booking.brand || '',
        issue: bd.issueName || booking.issue || '',
        description: bd.description || booking.description || '',
        scheduled_date: schedule.date || booking.scheduled_date || '',
        scheduled_time: schedule.slot || booking.scheduled_time || '',
        customer_id: createdCustomer?.id || null,
        customer: createdCustomer || null,
        property: {
            id: booking.property_id || `booking-${booking.id}`,
            property_name: 'Home',
            address: fullAddress,
            flat_number: addr.flat_number || addr.apartment || '',
            building_name: addr.building_name || addr.building || '',
            locality: addr.locality || '',
            pincode: addr.zip || addr.pincode || '',
        },
        warranty: booking.warranty || (bd.serviceCoverage === 'warranty') || false,
        warranty_proof: booking.warranty_proof || bd.warrantyInfo || '',
    }), [booking, bd, schedule, createdCustomer, fullAddress, addr]);

    // ── Account button rendering ────────────────────────────────────────────────
    const renderAccountButton = () => {
        if (checkingAccount) {
            return (
                <button className="btn btn-secondary" disabled style={{ minWidth: 175 }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Checking...
                </button>
            );
        }

        // Admin has clicked Confirm/Create and saved
        if (accountConfirmed) {
            return null; // Save space
        }

        // Account found automatically — admin must review before proceeding
        if (accountAlreadyExists && createdCustomer) {
            return (
                <button
                    onClick={handleOpenAccountForm}
                    disabled={loadingGroups}
                    className="btn"
                    title={`Found: ${createdCustomer.name} (${createdCustomer.sku || '—'}). Review & confirm to proceed.`}
                    style={{
                        minWidth: 175,
                        backgroundColor: 'rgba(245,158,11,0.12)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.45)',
                    }}
                >
                    {loadingGroups
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <UserCog size={14} />
                    }
                    Confirm Account
                </button>
            );
        }

        // No account — create new
        return (
            <button
                onClick={handleOpenAccountForm}
                className="btn btn-primary"
                disabled={loadingGroups}
                style={{ minWidth: 175 }}
            >
                {loadingGroups
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <User size={14} />
                }
                {loadingGroups ? 'Loading...' : 'Create Account'}
            </button>
        );
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>

                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">{isEnquiry ? 'Review Website Enquiry' : 'Review Booking Request'}</h2>
                    {booking.created_at && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 500 }}>
                            Booked: {formatDateTime(booking.created_at)} ({formatRelativeTime(booking.created_at)})
                        </p>
                    )}
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    {/* Customer Info */}
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                        <div className="booking-review-customer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                                    {(cust.name || cust.firstName || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                            {cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || (isEnquiry ? 'Website Lead' : 'Unknown')}
                                        </h3>
                                        {checkingAccount && (
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>checking account…</span>
                                        )}
                                        {!checkingAccount && accountAlreadyExists && (
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                                ⚡ Account Found
                                            </span>
                                        )}
                                        {accountConfirmed && (
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                ✓ Confirmed
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                        {cust.email && <span>{cust.email}</span>}
                                        {cust.email && cust.phone && <span style={{ color: 'var(--text-tertiary)' }}>·</span>}
                                        {cust.phone && <span>{formatMobileNumber(cust.phone)}</span>}
                                    </div>
                                    {accountAlreadyExists && createdCustomer?.sku && (
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            {createdCustomer.sku} · {createdCustomer.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="booking-review-customer-actions" style={{ display: 'flex', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                                {cust.phone && (
                                    <a href={`tel:${cust.phone}`} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                                        <Phone size={14} /> Call
                                    </a>
                                )}
                                {whatsappUrl && (
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(34,197,94,0.08)',
                                            color: '#22c55e',
                                            border: '1px solid rgba(34,197,94,0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        <MessageCircle size={14} /> WhatsApp
                                    </a>
                                )}
                                {fullAddress && (
                                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                                        <MapPin size={14} /> Map
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>SERVICE</label>
                            <div style={{ fontWeight: 600 }}>{booking.category}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{booking.issue || booking.subcategory}</div>
                        </div>
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>PREFERRED SCHEDULE</label>
                            <div style={{ fontWeight: 600 }}>{schedule.date || booking.scheduled_date || 'Not specified'}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{schedule.slot || booking.scheduled_time || ''}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>LOCALITY / ADDRESS</label>
                            <div style={{ fontSize: 'var(--font-size-sm)' }}>{fullAddress || 'No address provided'}</div>
                        </div>
                        {(bd.description || booking.description) && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>DETAILS / INSTRUCTIONS</label>
                                <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>{bd.description || booking.description}</div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Account helper tip */}
                    {!checkingAccount && accountAlreadyExists && !accountConfirmed && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b', marginBottom: 'var(--spacing-md)' }}>
                            <strong>Account already exists</strong> — click <strong>Confirm Account</strong> to review the customer's details and address before creating the job.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer booking-review-footer" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <div className="booking-review-footer-left" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button onClick={handleDelete} disabled={deleting || dismissing} className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'transparent', padding: '6px 12px' }}>
                            {deleting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Request'}
                        </button>
                        <button onClick={handleDismiss} disabled={dismissing || deleting} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                            {dismissing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={15} />} Dismiss
                        </button>
                    </div>

                    <div className="booking-review-footer-right" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        {renderAccountButton()}

                        {accountConfirmed && (
                            <button
                                onClick={() => setShowDenyModal(true)}
                                className="btn"
                                style={{
                                    backgroundColor: 'var(--color-danger)',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    minWidth: 150,
                                }}
                            >
                                <UserX size={15} /> Cx Denied Service
                            </button>
                        )}

                        <button
                            onClick={() => setShowJobForm(true)}
                            className="btn btn-success"
                            disabled={!accountConfirmed || checkingAccount}
                            title={!accountConfirmed ? 'Confirm the account first' : 'Create and assign the job'}
                            style={{
                                backgroundColor: accountConfirmed ? 'var(--color-success)' : 'var(--bg-secondary)',
                                color: accountConfirmed ? 'white' : 'var(--text-tertiary)',
                                minWidth: 175,
                            }}
                        >
                            <CheckCircle2 size={15} /> Create &amp; Assign Job
                        </button>
                    </div>
                </div>

                {/* Account Form (NewAccountForm opens in create OR edit mode depending on whether id is present) */}
                {showAccountForm && (
                    <NewAccountForm
                        onClose={() => setShowAccountForm(false)}
                        onSave={handleAccountSaved}
                        preselectedType={resolvedCustomerGroup}
                        groups={groups}
                        onGroupCreated={async () => setGroups((await accountGroupsAPI.getAll()) || [])}
                        initialData={accountPrefill}
                    />
                )}

                {/* Job Form */}
                {showJobForm && (
                    <CreateJobForm
                        onClose={() => setShowJobForm(false)}
                        onCreate={handleConvertJob}
                        existingJob={jobPrefill}
                    />
                )}

                {/* Denial Reason Sub-Modal */}
                {showDenyModal && (
                    <div className="modal-overlay" onClick={() => setShowDenyModal(false)} style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%', margin: '20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-xl)' }}>
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                <h3 className="modal-title" style={{ margin: 0, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                    <UserX size={18} style={{ color: 'var(--color-danger)' }} /> Customer Denied Service
                                </h3>
                                <button className="btn-icon" onClick={() => setShowDenyModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ padding: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                    Please enter the reason customer denied service:
                                </label>
                                <textarea
                                    className="form-input"
                                    value={denyReason}
                                    onChange={e => setDenyReason(e.target.value)}
                                    placeholder="e.g. Price too high, got repaired elsewhere, customer rescheduled externally..."
                                    style={{
                                        width: '100%',
                                        height: '110px',
                                        padding: '10px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        fontSize: 'var(--font-size-sm)',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
                                <button className="btn btn-secondary" onClick={() => setShowDenyModal(false)}>
                                    Cancel
                                </button>
                                <button 
                                    className="btn" 
                                    onClick={handleDenySubmit}
                                    disabled={!denyReason.trim() || submittingDenial}
                                    style={{
                                        backgroundColor: 'var(--color-danger)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: (!denyReason.trim() || submittingDenial) ? 'not-allowed' : 'pointer',
                                        opacity: (!denyReason.trim() || submittingDenial) ? 0.6 : 1
                                    }}
                                >
                                    {submittingDenial ? (
                                        <>
                                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Confirm Denial
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BookingReviewModal;
