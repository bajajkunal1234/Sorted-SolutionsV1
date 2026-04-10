'use client'

import { useState, useEffect } from 'react';
import { Phone, MapPin, User, X, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { useMemo } from 'react';
import { jobsAPI, accountGroupsAPI, accountsAPI } from '@/lib/adminAPI';
import NewAccountForm from '../accounts/NewAccountForm';
import CreateJobForm from '../CreateJobForm';

function BookingReviewModal({ booking, onClose, onConverted, onDismissed }) {
    // Try to get booking data from booking_data column or fallback to notes JSON string
    let bd = booking.booking_data || {};
    if (Object.keys(bd).length === 0 && booking.notes) {
        try {
            bd = JSON.parse(booking.notes);
        } catch (e) {
            console.error('Failed to parse booking notes:', e);
        }
    }

    // Also support flat structure (customer app bookings store data directly on job row)
    const cust = bd.customer || {
        name: booking.customer_name || '',
        phone: booking.customer_phone || '',
        email: booking.customer_email || '',
        address: {},
    };
    const addr = cust.address || {};
    const schedule = bd.schedule || {};

    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [createdCustomer, setCreatedCustomer] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // -- Auto-detect if account already exists for this booking's phone number --
    const [checkingAccount, setCheckingAccount] = useState(true);
    const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

    useEffect(() => {
        const phone = cust.phone || booking.customer_name; // customer app stores name in customer_name
        if (!phone) { setCheckingAccount(false); return; }

        // Normalise: last 10 digits
        const digits = phone.replace(/\D/g, '').slice(-10);
        if (!digits || digits.length < 7) { setCheckingAccount(false); return; }

        // Check accounts table via admin API
        fetch(`/api/admin/accounts?type=customer`)
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
            .catch(() => {/* silent — don't block the UI */})
            .finally(() => setCheckingAccount(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id]);

    // Build full address string
    const fullAddress = [
        addr.flat_number || addr.apartment,
        addr.building_name || addr.building,
        addr.street,
        addr.locality,
        addr.city,
        addr.state,
        addr.zip || addr.pincode
    ].filter(Boolean).join(', ')
        || booking.property?.address
        || '';

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress || cust.name)}`;

    const handleOpenAccountForm = async () => {
        if (groups.length === 0) {
            setLoadingGroups(true);
            try {
                const data = await accountGroupsAPI.getAll();
                setGroups(data || []);
            } catch (e) {
                console.error('Failed to load groups:', e);
            } finally {
                setLoadingGroups(false);
            }
        }
        setShowAccountForm(true);
    };

    const handleAccountSaved = async (accountData) => {
        try {
            let result;
            if (accountData.id) {
                result = await accountsAPI.update(accountData);
            } else {
                result = await accountsAPI.create(accountData);
            }
            setCreatedCustomer(result);
            setAccountAlreadyExists(false); // was newly created via form
            setShowAccountForm(false);
            setTimeout(() => setShowJobForm(true), 300);
        } catch (err) {
            console.error('Error saving account:', err);
            alert('Failed to save account: ' + err.message);
        }
    };

    const handleConvertJob = async (jobData) => {
        try {
            await jobsAPI.update(booking.id, {
                ...jobData,
                status: jobData.technician_id ? 'assigned' : 'booking_request',
            });
            onConverted();
        } catch (err) {
            console.error('Error converting booking to job:', err);
            alert('Failed to convert booking: ' + err.message);
        }
    };

    const handleDismiss = async () => {
        if (!confirm('Dismiss this booking request?')) return;
        setDismissing(true);
        try {
            await jobsAPI.update(booking.id, { status: 'cancelled' });
            onDismissed();
        } catch (err) {
            console.error('Error dismissing booking:', err);
            alert('Failed to dismiss: ' + err.message);
        } finally {
            setDismissing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this booking request? This action cannot be undone.')) return;
        setDeleting(true);
        try {
            await jobsAPI.delete(booking.id);
            onDismissed();
        } catch (err) {
            console.error('Error deleting booking:', err);
            alert('Failed to delete: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Resolve the best group ID for Customers
    const resolvedCustomerGroup = (() => {
        if (groups.length === 0) return 'sundry-debtors';
        const customersGroup = groups.find(g =>
            g.name.toLowerCase() === 'customers' ||
            g.name.toLowerCase() === 'customer accounts'
        );
        if (customersGroup) return customersGroup.id;
        const debtorsGroup = groups.find(g => g.name.toLowerCase() === 'sundry debtors');
        return debtorsGroup ? debtorsGroup.id : 'sundry-debtors';
    })();

    const accountPrefill = {
        name: cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
        mobile: cust.phone || '',
        email: cust.email || '',
        under: resolvedCustomerGroup,
        mailing_address: fullAddress,
        billing_address: fullAddress,
        shipping_address: fullAddress,
        acquisitionSource: 'website',
        properties: [{
            id: Date.now(),
            name: 'Home',
            address: addr.street || fullAddress,
            flat_number: addr.flat_number || addr.apartment || '',
            building_name: addr.building_name || addr.building || '',
            locality: addr.locality || '',
            pincode: addr.zip || addr.pincode || '',
            contactPerson: cust.name || '',
            contactPhone: cust.phone || ''
        }]
    };

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
        property: createdCustomer ? {
            id: `booking-${booking.id}`,
            property_name: 'Home',
            address: fullAddress,
        } : null,
    }), [booking, bd, schedule, createdCustomer, fullAddress]);

    // -- Account button rendering logic --
    const renderAccountButton = () => {
        if (checkingAccount) {
            return (
                <button className="btn btn-secondary" disabled style={{ minWidth: 160 }}>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Checking...
                </button>
            );
        }

        if (accountAlreadyExists && createdCustomer) {
            return (
                <button
                    className="btn"
                    disabled
                    style={{
                        minWidth: 160,
                        backgroundColor: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.35)',
                        cursor: 'default',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    title={`Account found: ${createdCustomer.name} (${createdCustomer.sku || createdCustomer.id})`}
                >
                    <UserCheck size={15} />
                    Acct Already Exists
                </button>
            );
        }

        if (!accountAlreadyExists && createdCustomer) {
            return (
                <button className="btn btn-primary" disabled style={{ minWidth: 160 }}>
                    <CheckCircle2 size={15} /> Account Created
                </button>
            );
        }

        return (
            <button
                onClick={handleOpenAccountForm}
                className="btn btn-primary"
                disabled={loadingGroups}
                style={{ minWidth: 160 }}
            >
                {loadingGroups ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <User size={15} />}
                {loadingGroups ? 'Loading...' : 'Create Account'}
            </button>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Review Website Booking</h2>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    {/* Customer Info Card */}
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '18px' }}>
                                    {(cust.name || cust.firstName || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                            {cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim()}
                                        </h3>
                                        {accountAlreadyExists && (
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                ✓ Account Linked
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {cust.email || cust.phone}
                                    </div>
                                    {accountAlreadyExists && createdCustomer?.sku && (
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            {createdCustomer.sku} · {createdCustomer.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
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
                            <div style={{ fontSize: 'var(--font-size-sm)' }}>{fullAddress || booking.property?.address || 'No address provided'}</div>
                        </div>
                        {(bd.description || booking.description) && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>DETAILS / INSTRUCTIONS</label>
                                <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>{bd.description || booking.description}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button onClick={handleDelete} disabled={deleting || dismissing} className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'transparent', padding: '6px 12px' }}>
                            {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Request'}
                        </button>
                        <button onClick={handleDismiss} disabled={dismissing || deleting} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                            {dismissing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={16} />} Dismiss Request
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        {renderAccountButton()}

                        <button
                            onClick={() => setShowJobForm(true)}
                            className="btn btn-success"
                            disabled={!createdCustomer || checkingAccount}
                            style={{
                                backgroundColor: createdCustomer && !checkingAccount ? 'var(--color-success)' : 'var(--bg-secondary)',
                                color: createdCustomer && !checkingAccount ? 'white' : 'var(--text-tertiary)',
                                minWidth: 160,
                            }}
                        >
                            <CheckCircle2 size={16} /> Create &amp; Assign Job
                        </button>
                    </div>
                </div>

                {showAccountForm && (
                    <NewAccountForm
                        onClose={() => setShowAccountForm(false)}
                        onSave={handleAccountSaved}
                        preselectedType={resolvedCustomerGroup}
                        groups={groups}
                        onGroupCreated={async () => {
                            const updatedGroups = await accountGroupsAPI.getAll();
                            setGroups(updatedGroups);
                        }}
                        initialData={accountPrefill}
                    />
                )}

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
