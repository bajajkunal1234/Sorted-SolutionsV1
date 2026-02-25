'use client'

import { useState } from 'react';
import { Phone, MapPin, User, Briefcase, Calendar, Clock, X, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { jobsAPI, customersAPI, accountGroupsAPI, accountsAPI } from '@/lib/adminAPI';
import NewAccountForm from '../accounts/NewAccountForm';
import CreateJobForm from '../CreateJobForm';

function BookingRequestCard({ booking, onConverted, onDismissed }) {
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

    const [expanded, setExpanded] = useState(false);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [createdCustomer, setCreatedCustomer] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [dismissing, setDismissing] = useState(false);

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
            // Fetch fresh customer record linked to this ledger
            const allCustomers = await customersAPI.getAll();
            const linkedCustomer = allCustomers.find(c => c.ledger_id === result.id) || result;
            setCreatedCustomer(linkedCustomer);
            setShowAccountForm(false);

            // Auto-open job form after account is created
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
            // Update the existing booking_request row in-place
            await jobsAPI.update(booking.id, {
                ...jobData,
                status: jobData.technician_id ? 'assigned' : 'pending',
            });
            onConverted(booking.id);
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
            onDismissed(booking.id);
        } catch (err) {
            console.error('Error dismissing booking:', err);
            alert('Failed to dismiss: ' + err.message);
        } finally {
            setDismissing(false);
        }
    };

    // Build prefill data for NewAccountForm
    const accountPrefill = {
        name: cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
        mobile: cust.phone || '',
        email: cust.email || '',
        under: 'customer-accounts', // Maps to Sundry Debtors > Customer Accounts
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

    // Build prefill for CreateJobForm via existingJob shape
    const jobPrefill = {
        id: booking.id,
        job_number: booking.job_number,
        status: 'booking_request',
        category: bd.categoryName || booking.category || '',
        subcategory: bd.subcategoryName || booking.subcategory || '',
        issue: bd.issueName || booking.issue || '',
        description: bd.description || '',
        scheduled_date: booking.scheduled_date || '',
        scheduled_time: booking.scheduled_time || '',
        customer_id: createdCustomer?.id || null,
        customer: createdCustomer || null,
        property: createdCustomer ? {
            id: `booking-${booking.id}`,
            property_name: 'Home',
            address: fullAddress,
        } : null,
    };

    const timeAgo = () => {
        const diff = Date.now() - new Date(booking.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div style={{
            border: '1px solid #f59e0b',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-elevated)',
            overflow: 'hidden',
            marginBottom: '12px',
        }}>
            {/* Card Header */}
            <div style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                {/* Avatar */}
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 700,
                    fontSize: '16px', flexShrink: 0
                }}>
                    {(cust.name || cust.firstName || '?')[0].toUpperCase()}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Unknown'}
                        <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                            backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 500
                        }}>
                            New Request
                        </span>
                        {createdCustomer && (
                            <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                backgroundColor: '#dcfce7', color: '#166534', fontWeight: 500
                            }}>
                                ✓ Account Created
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                        <span>{booking.category} · {booking.issue || booking.subcategory}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{timeAgo()}</span>
                    </div>
                </div>

                {/* Quick Action buttons */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {cust.phone && (
                        <a
                            href={`tel:${cust.phone}`}
                            title="Call Customer"
                            style={{
                                padding: '6px 10px', borderRadius: '6px',
                                backgroundColor: '#16a34a', color: 'white',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '12px', fontWeight: 600, textDecoration: 'none'
                            }}
                        >
                            <Phone size={14} /> Call
                        </a>
                    )}
                    {fullAddress && (
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Google Maps"
                            style={{
                                padding: '6px 10px', borderRadius: '6px',
                                backgroundColor: '#2563eb', color: 'white',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '12px', fontWeight: 600, textDecoration: 'none'
                            }}
                        >
                            <MapPin size={14} /> Map
                        </a>
                    )}

                    {/* Expand Toggle */}
                    <button
                        onClick={() => setExpanded(e => !e)}
                        title={expanded ? 'Collapse' : 'Expand'}
                        style={{
                            padding: '6px 10px', borderRadius: '6px',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-primary)',
                            display: 'flex', alignItems: 'center', cursor: 'pointer'
                        }}
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-primary)' }}>
                    {/* Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                        {cust.phone && (
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>PHONE</div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{cust.phone}</div>
                            </div>
                        )}
                        {cust.email && (
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>EMAIL</div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{cust.email}</div>
                            </div>
                        )}
                        {booking.category && (
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>APPLIANCE</div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{booking.category}</div>
                            </div>
                        )}
                        {booking.issue && (
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>ISSUE</div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{booking.issue}</div>
                            </div>
                        )}
                        {booking.scheduled_date && (
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>SCHEDULED</div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                    {new Date(booking.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {booking.scheduled_time && ` · ${booking.scheduled_time}`}
                                </div>
                            </div>
                        )}
                        {bd.description && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>SPECIAL INSTRUCTIONS</div>
                                <div style={{ fontSize: '13px' }}>{bd.description}</div>
                            </div>
                        )}
                        {fullAddress && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>ADDRESS</div>
                                <div style={{ fontSize: '13px' }}>{fullAddress}</div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleOpenAccountForm}
                            disabled={loadingGroups}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                backgroundColor: createdCustomer ? '#16a34a' : '#6366f1',
                                color: 'white', fontWeight: 600, fontSize: '13px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {loadingGroups ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                            {createdCustomer ? '✓ Account Created' : 'Create Account'}
                        </button>

                        <button
                            onClick={() => setShowJobForm(true)}
                            disabled={!createdCustomer}
                            title={!createdCustomer ? 'Create customer account first' : 'Convert to assigned job'}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                backgroundColor: createdCustomer ? '#f59e0b' : 'var(--bg-secondary)',
                                color: createdCustomer ? '#1c1917' : 'var(--text-tertiary)',
                                fontWeight: 600, fontSize: '13px',
                                cursor: createdCustomer ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Briefcase size={14} /> Convert to Job
                        </button>

                        <button
                            onClick={handleDismiss}
                            disabled={dismissing}
                            style={{
                                padding: '8px 16px', borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'transparent', color: 'var(--text-tertiary)',
                                fontWeight: 500, fontSize: '13px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                marginLeft: 'auto'
                            }}
                        >
                            {dismissing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Account Creation Modal */}
            {showAccountForm && (
                <NewAccountForm
                    onClose={() => setShowAccountForm(false)}
                    onSave={handleAccountSaved}
                    preselectedType="customer-accounts"
                    groups={groups}
                    onGroupCreated={async () => {
                        const updatedGroups = await accountGroupsAPI.getAll();
                        setGroups(updatedGroups);
                    }}
                    initialData={accountPrefill}
                />
            )}

            {/* Convert to Job Modal */}
            {showJobForm && (
                <CreateJobForm
                    onClose={() => setShowJobForm(false)}
                    onCreate={handleConvertJob}
                    existingJob={jobPrefill}
                />
            )}
        </div>
    );
}

export default BookingRequestCard;
