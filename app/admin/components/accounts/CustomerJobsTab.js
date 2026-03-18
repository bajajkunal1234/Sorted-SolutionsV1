'use client'

import { useState, useEffect } from 'react';
import { Loader2, Briefcase } from 'lucide-react';
import { jobsAPI } from '@/lib/adminAPI';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

function CustomerJobsTab({ customerId, onClose }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            if (!customerId) return;
            try {
                setLoading(true);
                // The GET /api/admin/jobs supports customer_id filter via API service
                const data = await jobsAPI.getAll({ customer_id: customerId });
                setJobs(data || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load jobs');
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [customerId]);

    const handleJobClick = (job) => {
        if (typeof window !== 'undefined' && window.openJobInJobsTab) {
            window.openJobInJobsTab(job);
            onClose(); // Close the AccountDetailModal
        } else {
            alert('Navigation to Jobs tab is not available.');
        }
    };

    const renderStatusBadge = (status) => {
        const colorMap = {
            'pending': ['#fef3c7', '#d97706'],
            'assigned': ['#e0e7ff', '#4f46e5'],
            'in-progress': ['#dbeafe', '#2563eb'],
            'completed': ['#d1fae5', '#059669'],
            'cancelled': ['#fee2e2', '#dc2626'],
            'booking_request': ['#fce7f3', '#db2777']
        };

        const [bg, c] = colorMap[status] || ['#f1f5f9', '#475569'];
        return (
            <span style={{
                padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                fontWeight: 600, backgroundColor: bg, color: c, textTransform: 'capitalize'
            }}>
                {status?.replace('_', ' ') || 'Unknown'}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 'var(--spacing-lg)', color: 'var(--color-danger)', textAlign: 'center' }}>
                {error}
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div style={{
                padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)', minHeight: '300px', justifyContent: 'center'
            }}>
                <Briefcase size={48} style={{ opacity: 0.2 }} />
                <h3>No Jobs Found</h3>
                <p>There are no jobs associated with this account.</p>
            </div>
        );
    }

    // Sort jobs by created_at descending
    const sortedJobs = [...jobs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                Jobs History ({jobs.length})
            </h3>

            <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Job ID</th>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Category</th>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Amount</th>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Technician</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedJobs.map((job) => (
                            <tr
                                key={job.id}
                                onClick={() => handleJobClick(job)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: 'var(--spacing-md)', fontWeight: 500, color: 'var(--color-primary)' }}>
                                    {job.job_number || 'N/A'}
                                </td>
                                <td style={{ padding: 'var(--spacing-md)' }}>
                                    {job.category || 'N/A'}
                                </td>
                                <td style={{ padding: 'var(--spacing-md)' }}>
                                    {new Date(job.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>
                                    {formatCurrency(job.amount || 0)}
                                </td>
                                <td style={{ padding: 'var(--spacing-md)' }}>
                                    {renderStatusBadge(job.status)}
                                </td>
                                <td style={{ padding: 'var(--spacing-md)' }}>
                                    {job.technician?.name || 'Unassigned'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CustomerJobsTab;
