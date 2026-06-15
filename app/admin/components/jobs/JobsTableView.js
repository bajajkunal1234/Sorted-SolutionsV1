'use client'

import { useState, useEffect } from 'react';
import { Calendar, User, MapPin, AlertCircle, Settings } from 'lucide-react';
import { getInitials, getLocalityFromAddress, getStatusColor } from '@/lib/utils/helpers';

function JobsTableView({ jobs, onJobClick }) {
    const [visibleColumns, setVisibleColumns] = useState({
        job: true,
        customer: true,
        locality: true,
        brand: true,
        technician: true,
        dueDate: true,
        visited: true,
        quotation: true,
        invoice: true,
        status: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // Close column dropdown on click outside
    useEffect(() => {
        if (!showColumnDropdown) return;
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.column-toggler-container')) {
                setShowColumnDropdown(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showColumnDropdown]);

    const isOverdue = (dueDate, status) => {
        if (['completed','cancelled','closed'].includes(status)) return false;
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            {/* Column Toggler Toolbar */}
            <div className="column-toggler-container" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)', position: 'relative' }}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowColumnDropdown(!showColumnDropdown);
                    }}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                >
                    <Settings size={14} />
                    <span>Columns</span>
                </button>
                {showColumnDropdown && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '160px',
                        zIndex: 110
                    }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 8px', borderBottom: '1px solid var(--border-primary)', marginBottom: '4px' }}>
                            Toggle Columns
                        </div>
                        {Object.keys(visibleColumns).map(col => (
                            <label
                                key={col}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="checkbox"
                                    checked={visibleColumns[col]}
                                    onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ textTransform: 'capitalize' }}>
                                    {col === 'dueDate' ? 'Due Date' : col === 'visited' ? 'Visited?' : col}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Scrollable Container with sticky header support */}
            <div style={{
                maxHeight: '65vh',
                overflowY: 'auto',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
                scrollbarWidth: 'thin'
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    <thead>
                        <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            {visibleColumns.job && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Job</th>
                            )}
                            {visibleColumns.customer && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Customer</th>
                            )}
                            {visibleColumns.locality && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Locality</th>
                            )}
                            {visibleColumns.brand && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Brand</th>
                            )}
                            {visibleColumns.technician && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Technician</th>
                            )}
                            {visibleColumns.dueDate && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Due Date</th>
                            )}
                            {visibleColumns.visited && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Visited?</th>
                            )}
                            {visibleColumns.quotation && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Quotation</th>
                            )}
                            {visibleColumns.invoice && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Invoice</th>
                            )}
                            {visibleColumns.status && (
                                <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Status</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => {
                            const isBooking = job.status === 'booking_request' || job.status === 'new_job_request';
                            const statusColor = getStatusColor(job.status);
                            const dueDate = job.scheduled_date || job.dueDate;
                            const overdue = isOverdue(dueDate, job.status);
                            const locality = job.locality || job.property?.locality || getLocalityFromAddress(job.property?.address) || (isBooking ? bd.customer?.address?.locality : '') || 'No locality';
                            const technicianName = job.technician?.name || job.assignedToName || 'Unassigned';
                            const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';
                            const isVisited = !!job.arrived_at;

                            const quotation = job.quotations && job.quotations.length > 0 ? job.quotations[0] : null;
                            const quoteAmount = quotation ? quotation.total_amount : null;

                            const invoice = job.sales_invoices && job.sales_invoices.length > 0 ? job.sales_invoices[0] : null;
                            const invoiceAmount = invoice ? invoice.total_amount : null;

                            let bd = {};
                            if (isBooking) {
                                try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
                            }

                            return (
                                <tr
                                    key={job.id}
                                    onClick={() => onJobClick?.(job)}
                                    style={{
                                        borderBottom: '1px solid var(--border-primary)',
                                        transition: 'background-color var(--transition-fast)',
                                        cursor: 'pointer',
                                        borderLeft: isBooking ? '3px solid #f59e0b' : 'none',
                                        backgroundColor: isBooking ? 'rgba(245,158,11,0.03)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isBooking ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isBooking ? 'rgba(245,158,11,0.03)' : 'transparent'}
                                >
                                    {visibleColumns.job && (
                                        <td style={{ padding: '6px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                {job.thumbnail && (
                                                    <img
                                                        src={job.thumbnail}
                                                        alt={jobTitle}
                                                        style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    {isBooking && (
                                                        <div style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 800, marginBottom: '2px' }}>
                                                            WEBSITE BOOKING
                                                        </div>
                                                    )}
                                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {jobTitle}
                                                    </div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                        {job.product?.name || job.product || 'No product'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.customer && (
                                        <td style={{ padding: '6px 12px' }}>
                                            <div>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}
                                                </div>
                                                {(job.customer?.phone || (isBooking && bd.customer?.phone)) && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {job.customer?.phone || bd.customer?.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.locality && (
                                        <td style={{ padding: '6px 12px' }}>
                                            <span>{locality}</span>
                                        </td>
                                    )}
                                    {visibleColumns.brand && (
                                        <td style={{ padding: '6px 12px' }}>
                                            <span>{job.brand?.name || job.brand || '-'}</span>
                                        </td>
                                    )}
                                    {visibleColumns.technician && (
                                        <td style={{ padding: '6px 12px' }}>
                                            {isBooking ? (
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Waiting</span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 600 }}>
                                                        {getInitials(technicianName)}
                                                    </div>
                                                    <span>{technicianName}</span>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.dueDate && (
                                        <td style={{ padding: '6px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={overdue && !isBooking ? { color: 'var(--color-danger)', fontWeight: 600 } : {}}>
                                                    {isBooking
                                                        ? bd.schedule?.date || 'Asap'
                                                        : dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : 'No date'
                                                    }
                                                </span>
                                                {overdue && !isBooking && <AlertCircle size={14} color="var(--color-danger)" />}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.visited && (
                                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                backgroundColor: isVisited ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: isVisited ? '#10b981' : '#ef4444'
                                            }}>
                                                {isVisited ? 'Visited' : 'No'}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.quotation && (
                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                            {quoteAmount ? (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        ₹{parseFloat(quoteAmount).toLocaleString('en-IN')}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                        {quotation.status?.replace(/_/g, ' ').replace(/-/g, ' ')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.invoice && (
                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                            {invoiceAmount ? (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#10b981' }}>
                                                        ₹{parseFloat(invoiceAmount).toLocaleString('en-IN')}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                        {invoice.status?.replace(/_/g, ' ').replace(/-/g, ' ')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.status && (
                                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                            {isBooking ? (
                                                <button className="btn btn-primary" style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#f59e0b', border: 'none' }}>
                                                    Create & Assign
                                                </button>
                                            ) : (
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600,
                                                    backgroundColor: `${statusColor}20`,
                                                    color: statusColor,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {job.status.replace(/_/g, ' ').replace(/-/g, ' ')}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {jobs.length === 0 && (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No jobs found.
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobsTableView;
