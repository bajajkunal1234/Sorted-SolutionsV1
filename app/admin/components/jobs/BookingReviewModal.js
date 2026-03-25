'use client'

import { useState, useEffect } from 'react';
import { Phone, MapPin, User, Briefcase, Calendar, Clock, X, CheckCircle2, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';
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
    const cust = bd.customer || {};
    const addr = cust.address || {};
    const schedule = bd.schedule || {};

    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [createdCustomer, setCreatedCustomer] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Build full address string
    const fullAddress = [
        addr.apartment,
        addr.street,
        addr.locality,
        addr.city,
        addr.state,
        addr.zip
    ].filter(Boolean).join(', ');

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
            // account IS the customer now — use directly
            setCreatedCustomer(result);
            setShowAccountForm(false);

            setTimeout(() => {
                setShowJobForm(true);
            }, 300);
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
            onDismissed(); // Reusing onDismissed to trigger the UI to remove the card/close modal
        } catch (err) {
            console.error('Error deleting booking:', err);
            alert('Failed to delete: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Resolve the best group ID for Customers
    const resolvedCustomerGroup = (() => {
        if (groups.length === 0) return 'customer-accounts'; // Fallback to current default
        const customersGroup = groups.find(g =>
            g.name.toLowerCase() === 'customers' ||
            g.name.toLowerCase() === 'customer accounts'
        );
        if (customersGroup) return customersGroup.id;

        const debtorsGroup = groups.find(g =>
            g.name.toLowerCase() === 'sundry debtors'
        );
        return debtorsGroup ? debtorsGroup.id : 'customer-accounts';
    })();

    const accountPrefill = {
        name: cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
        mobile: cust.phone || '',
        email: cust.email || '',
        under: resolvedCustomerGroup,
        mailing_address: fullAddress,
        billing_address: fullAddress,
        shipping_address: fullAddress,
        properties: [{
            id: Date.now(),
            name: 'Home',
            address: fullAddress,
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
        description: bd.description || '',
        scheduled_date: booking.scheduled_date || '',
        scheduled_time: booking.scheduled_time || '',
        customer_id: createdCustomer?.id || null, // This is the Ledger ID
        customer: createdCustomer || null,
        property: createdCustomer ? {
            id: `booking-${booking.id}`,
            property_name: 'Home',
            address: fullAddress,
        } : null,
    }), [booking, bd, createdCustomer, fullAddress]);

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
                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim()}</h3>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{cust.email}</div>
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
                            <div style={{ fontSize: 'var(--font-size-sm)' }}>{fullAddress || 'No address provided'}</div>
                        </div>
                        {bd.description && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ color: 'var(--text-tertiary)' }}>DETAILS / INSTRUCTIONS</label>
                                <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>{bd.description}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button onClick={handleDelete} disabled={deleting || dismissing} className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'transparent', padding: '6px 12px' }}>
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete Request'}
                        </button>
                        <button onClick={handleDismiss} disabled={dismissing || deleting} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                            {dismissing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Dismiss Request
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={handleOpenAccountForm}
                            className="btn btn-primary"
                            disabled={createdCustomer}
                        >
                            <User size={16} /> {createdCustomer ? 'Account Created' : 'Create Account'}
                        </button>

                        <button
                            onClick={() => setShowJobForm(true)}
                            className="btn btn-success"
                            disabled={!createdCustomer}
                            style={{ backgroundColor: createdCustomer ? 'var(--color-success)' : 'var(--bg-secondary)', color: createdCustomer ? 'white' : 'var(--text-tertiary)' }}
                        >
                            <CheckCircle2 size={16} /> Create & Assign Job
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
