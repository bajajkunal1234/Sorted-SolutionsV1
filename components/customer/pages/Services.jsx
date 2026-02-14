'use client'

import { useState, useEffect } from 'react';
import { Plus, Clock, Wrench, CheckCircle, XCircle, Phone, MapPin, Calendar } from 'lucide-react';

export default function ServicesPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [customerId, setCustomerId] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);

    // Get customer ID from session/auth
    useEffect(() => {
        // TODO: Replace with actual auth when implemented
        // For now, get from localStorage or use a default
        const storedCustomerId = localStorage.getItem('customerId');
        if (storedCustomerId) {
            setCustomerId(storedCustomerId);
        } else {
            // Use a default for testing
            setCustomerId('default-customer-id');
        }
    }, []);

    // Fetch jobs
    useEffect(() => {
        if (!customerId) return;

        const fetchJobs = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/customer/jobs?customerId=${customerId}&status=${filterStatus}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch jobs');
                }

                const data = await response.json();
                setJobs(data.jobs || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                setError('Failed to load service requests');
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [customerId, filterStatus]);

    const getStatusColor = (status) => {
        const colors = {
            'open': '#f59e0b',
            'confirmed': '#3b82f6',
            'in-progress': '#8b5cf6',
            'completed': '#10b981',
            'cancelled': '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={18} />;
            case 'cancelled':
                return <XCircle size={18} />;
            case 'in-progress':
                return <Wrench size={18} />;
            default:
                return <Clock size={18} />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCancelJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to cancel this service request?')) {
            return;
        }

        try {
            const response = await fetch(`/api/customer/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', customerId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel job');
            }

            // Update jobs list
            setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'cancelled' } : j));
            alert('Service request cancelled successfully');
        } catch (err) {
            console.error('Error cancelling job:', err);
            alert(err.message);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                    My Services
                </h1>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Track your service requests
                </p>
            </div>

            {/* Filters */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-xs)',
                overflowX: 'auto'
            }}>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}
                >
                    <option value="all">All Requests</option>
                    <option value="open">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Jobs List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        Loading...
                    </div>
                ) : error ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {error}
                    </div>
                ) : jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        <Wrench size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.3 }} />
                        <div style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-xs)' }}>
                            No service requests yet
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            Book a service from the Home tab
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-normal)'
                                }}
                                onClick={() => setSelectedJob(job)}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '4px' }}>
                                            {job.product?.type} - {job.product?.brand}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {job.id}
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        backgroundColor: getStatusColor(job.status) + '20',
                                        color: getStatusColor(job.status),
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600
                                    }}>
                                        {getStatusIcon(job.status)}
                                        <span style={{ textTransform: 'capitalize' }}>{job.status}</span>
                                    </div>
                                </div>

                                {/* Issue */}
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                    <strong>Issue:</strong> {job.issue}
                                </div>

                                {/* Address */}
                                <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                    <MapPin size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{job.locality}, {job.city}</span>
                                </div>

                                {/* Technician */}
                                {job.assignedTechnician && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                        <Wrench size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Technician: {job.assignedTechnician}
                                        </span>
                                        {job.technicianMobile && (
                                            <a href={`tel:${job.technicianMobile}`} style={{ color: '#3b82f6', marginLeft: 'auto' }}>
                                                <Phone size={14} />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Visit Time */}
                                {job.confirmedVisitTime && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Visit: {formatDate(job.confirmedVisitTime)}
                                        </span>
                                    </div>
                                )}

                                {/* Actions */}
                                {job.status !== 'completed' && job.status !== 'cancelled' && (
                                    <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCancelJob(job.id);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ width: '100%', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs)' }}
                                        >
                                            Cancel Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'flex-end'
                }} onClick={() => setSelectedJob(null)}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        width: '100%',
                        maxHeight: '80vh',
                        borderTopLeftRadius: 'var(--radius-xl)',
                        borderTopRightRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-lg)',
                        overflow: 'auto'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
                            Service Request Details
                        </h2>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Request ID</div>
                                <div style={{ fontSize: 'var(--font-size-sm)' }}>{selectedJob.id}</div>
                            </div>

                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Product</div>
                                <div style={{ fontSize: 'var(--font-size-sm)' }}>{selectedJob.product?.type} - {selectedJob.product?.brand}</div>
                            </div>

                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Issue</div>
                                <div style={{ fontSize: 'var(--font-size-sm)' }}>{selectedJob.issue}</div>
                            </div>

                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Status</div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    backgroundColor: getStatusColor(selectedJob.status) + '20',
                                    color: getStatusColor(selectedJob.status),
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600
                                }}>
                                    {getStatusIcon(selectedJob.status)}
                                    <span style={{ textTransform: 'capitalize' }}>{selectedJob.status}</span>
                                </div>
                            </div>

                            {selectedJob.notes && (
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Notes</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)' }}>{selectedJob.notes}</div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedJob(null)}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
