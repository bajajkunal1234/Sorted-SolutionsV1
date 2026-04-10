'use client'

import { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, User, X, CheckCircle2, Loader2, UserCog } from 'lucide-react';
import { jobsAPI, accountGroupsAPI, accountsAPI } from '@/lib/adminAPI';
import NewAccountForm from '../accounts/NewAccountForm';
import CreateJobForm from '../CreateJobForm';

function BookingReviewModal({ booking, onClose, onConverted, onDismissed }) {
    // ── Parse booking data ──────────────────────────────────────────────────────
    // Website bookings store data in booking.notes (JSON), customer-app bookings
    // store fields directly on the job row.
    let bd = booking.booking_data || {};
    if (Object.keys(bd).length === 0 && booking.notes) {
        try { bd = JSON.parse(booking.notes); } catch (e) { /* ignore */ }
    }
    const cust = bd.customer || {
        name: booking.customer_name || '',
        phone: booking.customer_phone || '',
        email: booking.customer_email || '',
        address: {},
    };
    const addr = cust.address || {};
    const schedule = bd.schedule || {};

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

    // ── Auto-detect existing account on open (by phone number) ─────────────────
    useEffect(() => {
        const phone = cust.phone;
        if (!phone) { setCheckingAccount(false); return; }
        const digits = phone.replace(/\D/g, '').slice(-10);
        if (!digits || digits.length < 7) { setCheckingAccount(false); return; }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id]);

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
                ? await accountsAPI.update(accountData)
                : await accountsAPI.create(accountData);
            setCreatedCustomer(result);
            setAccountConfirmed(true);
            setShowAccountForm(false);
            // Auto-open job form after a brief pause so the footer re-renders
            setTimeout(() => setShowJobForm(true), 350);
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
                status: jobData.technician_id ? 'assigned' : 'booking_request',
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

    // ── Account group resolution ────────────────────────────────────────────────
    const resolvedCustomerGroup = useMemo(() => {
        if (groups.length === 0) return 'sundry-debtors';
        const g = groups.find(g =>
            g.name.toLowerCase() === 'customers' || g.name.toLowerCase() === 'customer accounts'
        );
        if (g) return g.id;
        const d = groups.find(g => g.name.toLowerCase() === 'sundry debtors');
        return d ? d.id : 'sundry-debtors';
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
            return {
                ...createdCustomer,
                acquisition_source: createdCustomer.acquisition_source || 'Website Organic',
                // Add booking property so admin can verify / save it
                properties: (createdCustomer.properties?.length > 0)
                    ? createdCustomer.properties
                    : [bookingPropertyPrefill],
            };
        }
        return {
            name: cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
            mobile: cust.phone || '',
            email: cust.email || '',
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
        status: 'booking_request',
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
            return (
                <button className="btn" disabled style={{
                    minWidth: 175,
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.35)',
                    cursor: 'default',
                }}>
                    <CheckCircle2 size={14} /> Account Confirmed
                </button>
            );
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
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>

                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Review Booking Request</h2>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    {/* Customer Info */}
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                                    {(cust.name || cust.firstName || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                            {cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Unknown'}
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
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {cust.email || cust.phone || ''}
                                    </div>
                                    {accountAlreadyExists && createdCustomer?.sku && (
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            {createdCustomer.sku} · {createdCustomer.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                                {cust.phone && (
                                    <a href={`tel:${cust.phone}`} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                                        <Phone size={14} /> Call
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
                <div className="modal-footer" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button onClick={handleDelete} disabled={deleting || dismissing} className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'transparent', padding: '6px 12px' }}>
                            {deleting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Request'}
                        </button>
                        <button onClick={handleDismiss} disabled={dismissing || deleting} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                            {dismissing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={15} />} Dismiss
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        {renderAccountButton()}

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
            </div>
        </div>
    );
}

export default BookingReviewModal;
