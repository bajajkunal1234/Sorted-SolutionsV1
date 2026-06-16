'use client'

import { useState, useEffect, Fragment } from 'react';
import { Calendar, User, MapPin, AlertCircle } from 'lucide-react';
import { getInitials, getLocalityFromAddress, getStatusColor } from '@/lib/utils/helpers';

function JobsTableView({ jobs, onJobClick, visibleColumns, groupBy, groupedJobs, sortBy, sortOrder, onSort }) {
    const [columnWidths, setColumnWidths] = useState({
        job: 200,
        customer: 140,
        locality: 160,
        brand: 100,
        appliance: 140,
        applianceType: 120,
        technician: 130,
        dueDate: 140,
        visited: 80,
        quotation: 100,
        invoice: 100,
        status: 120
    });

    const [columnOrder, setColumnOrder] = useState([
        'job',
        'customer',
        'locality',
        'brand',
        'appliance',
        'applianceType',
        'technician',
        'dueDate',
        'visited',
        'quotation',
        'invoice',
        'status'
    ]);
    const [canDrag, setCanDrag] = useState(true);
    const [draggedOverCol, setDraggedOverCol] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedOrder = localStorage.getItem('admin_column_order');
        if (savedOrder) {
            try {
                const parsed = JSON.parse(savedOrder);
                const validKeys = [
                    'job',
                    'customer',
                    'locality',
                    'brand',
                    'appliance',
                    'applianceType',
                    'technician',
                    'dueDate',
                    'visited',
                    'quotation',
                    'invoice',
                    'status'
                ];
                const isValid = Array.isArray(parsed) && 
                                parsed.every(key => validKeys.includes(key)) && 
                                parsed.length === validKeys.length;
                if (isValid) {
                    setColumnOrder(parsed);
                }
            } catch (e) {
                console.error('Failed to load column order from localStorage', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage when columnOrder changes, after initial load is done
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('admin_column_order', JSON.stringify(columnOrder));
        }
    }, [columnOrder, isLoaded]);

    const handleDragStart = (e, col) => {
        e.dataTransfer.setData('text/plain', col);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetCol) => {
        e.preventDefault();
        const sourceCol = e.dataTransfer.getData('text/plain');
        if (sourceCol && sourceCol !== targetCol) {
            setColumnOrder(prev => {
                const newOrder = [...prev];
                const sourceIndex = newOrder.indexOf(sourceCol);
                const targetIndex = newOrder.indexOf(targetCol);
                if (sourceIndex !== -1 && targetIndex !== -1) {
                    newOrder.splice(sourceIndex, 1);
                    newOrder.splice(targetIndex, 0, sourceCol);
                }
                return newOrder;
            });
        }
    };

    const isOverdue = (dueDate, status) => {
        if (['completed','cancelled','closed'].includes(status)) return false;
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const handleMouseDown = (e, col) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = columnWidths[col];

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            setColumnWidths(prev => ({
                ...prev,
                [col]: Math.max(60, startWidth + deltaX) // Min width of 60px
            }));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Calculate total table width based on visible columns
    const totalWidth = Object.keys(visibleColumns || {})
        .filter(col => visibleColumns[col])
        .reduce((sum, col) => sum + (columnWidths[col] || 100), 0);

    const renderRow = (job) => {
        const isBooking = job.status === 'booking_request' || job.status === 'new_job_request';
        const statusColor = getStatusColor(job.status);
        const dueDate = job.scheduled_date || job.dueDate;
        const overdue = isOverdue(dueDate, job.status);
        
        let bd = {};
        if (isBooking) {
            try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
        }

        const locality = job.locality || job.property?.locality || getLocalityFromAddress(job.property?.address) || (isBooking ? bd.customer?.address?.locality : '') || 'No locality';
        const technicianName = job.technician?.name || job.assignedToName || 'Unassigned';
        const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';
        const isVisited = !!job.arrived_at;

        const quotation = job.quotations && job.quotations.length > 0 ? job.quotations[0] : null;
        const quoteAmount = quotation ? quotation.total_amount : null;

        const invoice = job.sales_invoices && job.sales_invoices.length > 0 ? job.sales_invoices[0] : null;
        const invoiceAmount = invoice ? invoice.total_amount : null;

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
                {columnOrder.map(col => {
                    if (!visibleColumns?.[col]) return null;
                    switch (col) {
                        case 'job':
                            return (
                                <td key="job" style={{ padding: '6px 12px', width: columnWidths.job, minWidth: columnWidths.job, maxWidth: columnWidths.job, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', overflow: 'hidden' }}>
                                        {job.thumbnail && (
                                            <img
                                                src={job.thumbnail}
                                                alt={jobTitle}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    objectFit: 'cover',
                                                    flexShrink: 0
                                                }}
                                            />
                                        )}
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {isBooking && (
                                                <div style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 800, marginBottom: '2px' }}>
                                                    WEBSITE BOOKING
                                                </div>
                                            )}
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={jobTitle}>
                                                {jobTitle}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            );
                        case 'customer':
                            return (
                                <td key="customer" style={{ padding: '6px 12px', width: columnWidths.customer, minWidth: columnWidths.customer, maxWidth: columnWidths.customer, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}>
                                            {job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}
                                        </div>
                                        {(job.customer?.phone || (isBooking && bd.customer?.phone)) && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.customer?.phone || bd.customer?.phone}>
                                                {job.customer?.phone || bd.customer?.phone}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            );
                        case 'locality':
                            return (
                                <td key="locality" style={{ padding: '6px 12px', width: columnWidths.locality, minWidth: columnWidths.locality, maxWidth: columnWidths.locality, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={locality}>
                                        {locality}
                                    </div>
                                </td>
                            );
                        case 'brand':
                            return (
                                <td key="brand" style={{ padding: '6px 12px', width: columnWidths.brand, minWidth: columnWidths.brand, maxWidth: columnWidths.brand, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.brand?.name || job.brand || '-'}>
                                        {job.brand?.name || job.brand || '-'}
                                    </span>
                                </td>
                            );
                        case 'appliance':
                            return (
                                <td key="appliance" style={{ padding: '6px 12px', width: columnWidths.appliance, minWidth: columnWidths.appliance, maxWidth: columnWidths.appliance, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.appliance || '-'}>
                                        {job.appliance || '-'}
                                    </span>
                                </td>
                            );
                        case 'applianceType':
                            return (
                                <td key="applianceType" style={{ padding: '6px 12px', width: columnWidths.applianceType, minWidth: columnWidths.applianceType, maxWidth: columnWidths.applianceType, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.subcategory || '-'}>
                                        {job.subcategory || '-'}
                                    </span>
                                </td>
                            );
                        case 'technician':
                            return (
                                <td key="technician" style={{ padding: '6px 12px', width: columnWidths.technician, minWidth: columnWidths.technician, maxWidth: columnWidths.technician, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isBooking ? (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Waiting</span>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 600, flexShrink: 0 }}>
                                                {getInitials(technicianName)}
                                            </div>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={technicianName}>{technicianName}</span>
                                        </div>
                                    )}
                                </td>
                            );
                        case 'dueDate':
                            return (
                                <td key="dueDate" style={{ padding: '6px 12px', width: columnWidths.dueDate, minWidth: columnWidths.dueDate, maxWidth: columnWidths.dueDate, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        <span style={overdue && !isBooking ? { color: 'var(--color-danger)', fontWeight: 600 } : {}}>
                                            {isBooking
                                                ? bd.schedule?.date || 'Asap'
                                                : dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : 'No date'
                                            }
                                        </span>
                                        {overdue && !isBooking && <AlertCircle size={14} color="var(--color-danger)" style={{ flexShrink: 0 }} />}
                                    </div>
                                </td>
                            );
                        case 'visited':
                            return (
                                <td key="visited" style={{ padding: '6px 12px', textAlign: 'center', width: columnWidths.visited, minWidth: columnWidths.visited, maxWidth: columnWidths.visited, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            );
                        case 'quotation':
                            return (
                                <td key="quotation" style={{ padding: '6px 12px', textAlign: 'right', width: columnWidths.quotation, minWidth: columnWidths.quotation, maxWidth: columnWidths.quotation, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {quoteAmount ? (
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                ₹{parseFloat(quoteAmount).toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {quotation.status?.replace(/_/g, ' ').replace(/-/g, ' ')}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                    )}
                                </td>
                            );
                        case 'invoice':
                            return (
                                <td key="invoice" style={{ padding: '6px 12px', textAlign: 'right', width: columnWidths.invoice, minWidth: columnWidths.invoice, maxWidth: columnWidths.invoice, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {invoiceAmount ? (
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontWeight: 600, color: '#10b981' }}>
                                                ₹{parseFloat(invoiceAmount).toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {invoice.status?.replace(/_/g, ' ').replace(/-/g, ' ')}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                    )}
                                </td>
                            );
                        case 'status':
                            return (
                                <td key="status" style={{ padding: '6px 12px', textAlign: 'center', width: columnWidths.status, minWidth: columnWidths.status, maxWidth: columnWidths.status, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                            textTransform: 'capitalize',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {job.status.replace(/_/g, ' ').replace(/-/g, ' ')}
                                        </span>
                                    )}
                                </td>
                            );
                        default:
                            return null;
                    }
                })}
            </tr>
        );
    };

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            {/* Horizontal scroll support for table */}
            <div style={{
                overflowX: 'auto',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                backgroundColor: 'var(--bg-elevated)',
                position: 'relative'
            }}>
                <table style={{
                    width: totalWidth || '100%',
                    tableLayout: 'fixed',
                    borderCollapse: 'collapse',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    <thead>
                        <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            {columnOrder.map(col => {
                                if (!visibleColumns?.[col]) return null;

                                const colToSortKey = {
                                    job: 'jobName',
                                    customer: 'customer',
                                    locality: 'locality',
                                    brand: 'brand',
                                    technician: 'assignee',
                                    dueDate: 'dueDate',
                                    visited: 'visited',
                                    quotation: 'quotation',
                                    invoice: 'invoice',
                                    status: 'status',
                                    appliance: 'appliance',
                                    applianceType: 'applianceType'
                                };
                                const sortKey = colToSortKey[col];
                                const isSorted = sortBy === sortKey;
                                const isSortable = !!sortKey;
                                const isDraggedOver = draggedOverCol === col;

                                return (
                                    <th 
                                        key={col}
                                        onClick={() => {
                                            if (isSortable && onSort) {
                                                onSort(sortKey);
                                            }
                                        }}
                                        draggable={canDrag}
                                        onDragStart={(e) => handleDragStart(e, col)}
                                        onDragOver={handleDragOver}
                                        onDragEnter={() => { if (canDrag) setDraggedOverCol(col); }}
                                        onDragLeave={() => setDraggedOverCol(null)}
                                        onDrop={(e) => { handleDrop(e, col); setDraggedOverCol(null); }}
                                        style={{
                                            position: 'sticky',
                                            top: 0,
                                            backgroundColor: isDraggedOver ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                                            zIndex: 10,
                                            padding: '8px 12px',
                                            textAlign: col === 'visited' || col === 'status' ? 'center' : col === 'quotation' || col === 'invoice' ? 'right' : 'left',
                                            fontWeight: 600,
                                            borderBottom: '2px solid var(--border-primary)',
                                            color: isSorted ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            width: columnWidths[col],
                                            minWidth: columnWidths[col],
                                            maxWidth: columnWidths[col],
                                            position: 'relative',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            cursor: isSortable ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            transition: 'color var(--transition-fast), background-color var(--transition-fast)',
                                            opacity: canDrag ? 1 : 0.8
                                        }}
                                        onMouseEnter={(e) => {
                                            if (isSortable) e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isSortable && !isSorted) e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        <span style={{ textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {col === 'dueDate' ? 'Due Date' : col === 'visited' ? 'Visited?' : col === 'applianceType' ? 'Appliance Type' : col}
                                            {isSorted && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </span>
                                        {/* Resize handle */}
                                        <div
                                            onMouseDown={(e) => {
                                                e.stopPropagation(); // Prevent trigger sort
                                                handleMouseDown(e, col);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: '6px',
                                                cursor: 'col-resize',
                                                zIndex: 15,
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                setCanDrag(false);
                                                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                setCanDrag(true);
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {groupBy && groupBy !== 'none' && groupedJobs && Object.keys(groupedJobs).length > 0 ? (
                            Object.entries(groupedJobs).map(([groupName, groupJobsList]) => {
                                if (!groupJobsList || groupJobsList.length === 0) return null;
                                
                                const visibleColumnsCount = Object.keys(visibleColumns || {})
                                    .filter(col => visibleColumns[col]).length;

                                return (
                                    <Fragment key={groupName}>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 600 }}>
                                            <td 
                                                colSpan={visibleColumnsCount} 
                                                style={{ 
                                                    padding: '8px 12px', 
                                                    color: 'var(--text-primary)', 
                                                    borderBottom: '1px solid var(--border-primary)', 
                                                    textAlign: 'left',
                                                    textTransform: 'uppercase',
                                                    fontSize: '11px',
                                                    letterSpacing: '0.05em'
                                                }}
                                            >
                                                {groupName} ({groupJobsList.length})
                                            </td>
                                        </tr>
                                        {groupJobsList.map(job => renderRow(job))}
                                    </Fragment>
                                );
                            })
                        ) : (
                            jobs.map(job => renderRow(job))
                        )}
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
