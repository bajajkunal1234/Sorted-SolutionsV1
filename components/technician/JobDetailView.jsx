'use client'

import { useState } from 'react';
import { X, Phone, MapPin, Clock, AlertCircle, CheckCircle, Wrench, Package, DollarSign, Camera, MessageSquare } from 'lucide-react';

export default function JobDetailView({ job, onClose, onJobUpdate }) {
    const [activeWorkflowStep, setActiveWorkflowStep] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmedTime, setConfirmedTime] = useState('');
    const [completionNotes, setCompletionNotes] = useState('');
    const [resolution, setResolution] = useState('');
    const [finalAmount, setFinalAmount] = useState('');

    if (!job) return null;

    // Workflow action handlers
    const handleConfirmVisit = async () => {
        if (!confirmedTime) {
            setError('Please select a visit time');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/technician/jobs/${job.id}/confirm-visit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmedVisitTime: confirmedTime })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to confirm visit');
            }

            // Update parent component
            if (onJobUpdate) {
                onJobUpdate(data.job);
            }

            setActiveWorkflowStep(null);
            alert('Visit confirmed successfully!');
        } catch (err) {
            console.error('Error confirming visit:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartJob = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/technician/jobs/${job.id}/start-job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start job');
            }

            // Update parent component
            if (onJobUpdate) {
                onJobUpdate(data.job);
            }

            setActiveWorkflowStep(null);
            alert('Job started successfully!');
        } catch (err) {
            console.error('Error starting job:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteJob = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/technician/jobs/${job.id}/complete-job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: completionNotes,
                    resolution: resolution,
                    amount: parseFloat(finalAmount) || 0
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete job');
            }

            // Update parent component
            if (onJobUpdate) {
                onJobUpdate(data.job);
            }

            setActiveWorkflowStep(null);
            alert('Job completed successfully!');
        } catch (err) {
            console.error('Error completing job:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const getPriorityColor = (priority) => {
        const colors = {
            'urgent': '#ef4444',
            'high': '#f59e0b',
            'normal': '#3b82f6',
            'low': '#6b7280'
        };
        return colors[priority] || '#6b7280';
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)',
                width: '100%',
                maxHeight: '90vh',
                borderTopLeftRadius: 'var(--radius-xl)',
                borderTopRightRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-elevated)'
                }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '4px' }}>
                            {job.customerName}
                        </h2>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {job.id}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: 'var(--spacing-xs)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        margin: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        color: '#ef4444'
                    }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                    {/* Status & Priority Badges */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: getStatusColor(job.status) + '20',
                            color: getStatusColor(job.status),
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            {job.status}
                        </span>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: getPriorityColor(job.priority) + '20',
                            color: getPriorityColor(job.priority),
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            {job.priority}
                        </span>
                    </div>

                    {/* Customer Info */}
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Customer Details
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <Phone size={16} style={{ color: 'var(--text-secondary)' }} />
                                <a href={`tel:${job.mobile}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                    {job.mobile}
                                </a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-xs)' }}>
                                <MapPin size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px' }} />
                                <div style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {job.address}
                                    {job.locality && <div>{job.locality}, {job.city}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Info */}
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Product Details
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                <strong>{job.product?.type}</strong> - {job.product?.brand}
                            </div>
                            {job.product?.name && (
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                    {job.product.name}
                                </div>
                            )}
                            {job.product?.warranty && (
                                <div style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    backgroundColor: job.product.warranty === 'in-warranty' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: job.product.warranty === 'in-warranty' ? '#10b981' : '#ef4444',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600
                                }}>
                                    {job.product.warranty === 'in-warranty' ? 'In Warranty' : 'Out of Warranty'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Issue Details */}
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Issue
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {job.defect}
                        </div>
                        {job.issueDescription && (
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
                                {job.issueDescription}
                            </div>
                        )}
                    </div>

                    {/* Workflow Actions */}
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Actions
                        </h3>

                        {/* Confirm Visit */}
                        {job.status === 'open' && (
                            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                {activeWorkflowStep === 'confirm-visit' ? (
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-xs)'
                                        }}>
                                            Confirm Visit Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={confirmedTime}
                                            onChange={(e) => setConfirmedTime(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                                        />
                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                            <button
                                                onClick={handleConfirmVisit}
                                                disabled={loading}
                                                className="btn btn-primary"
                                                style={{ flex: 1 }}
                                            >
                                                {loading ? 'Confirming...' : 'Confirm'}
                                            </button>
                                            <button
                                                onClick={() => setActiveWorkflowStep(null)}
                                                className="btn btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setActiveWorkflowStep('confirm-visit')}
                                        className="btn btn-primary"
                                        style={{ width: '100%' }}
                                    >
                                        <Clock size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                                        Confirm Visit
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Start Job */}
                        {(job.status === 'confirmed' || job.status === 'open') && (
                            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                <button
                                    onClick={handleStartJob}
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    <Wrench size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                                    {loading ? 'Starting...' : 'Start Job'}
                                </button>
                            </div>
                        )}

                        {/* Complete Job */}
                        {job.status === 'in-progress' && (
                            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                {activeWorkflowStep === 'complete-job' ? (
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-xs)'
                                        }}>
                                            Resolution
                                        </label>
                                        <input
                                            type="text"
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            placeholder="e.g., Replaced compressor"
                                            className="form-input"
                                            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                                        />
                                        <label style={{
                                            display: 'block',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-xs)'
                                        }}>
                                            Notes (Optional)
                                        </label>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-xs)'
                                        }}>
                                            Final Job Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={finalAmount}
                                            onChange={(e) => setFinalAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="form-input"
                                            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                                        />
                                        <textarea
                                            value={completionNotes}
                                            onChange={(e) => setCompletionNotes(e.target.value)}
                                            placeholder="Additional notes..."
                                            className="form-input"
                                            rows={3}
                                            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                                        />
                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                            <button
                                                onClick={handleCompleteJob}
                                                disabled={loading}
                                                className="btn btn-primary"
                                                style={{ flex: 1 }}
                                            >
                                                {loading ? 'Completing...' : 'Complete Job'}
                                            </button>
                                            <button
                                                onClick={() => setActiveWorkflowStep(null)}
                                                className="btn btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setActiveWorkflowStep('complete-job')}
                                        className="btn btn-primary"
                                        style={{ width: '100%', backgroundColor: '#10b981' }}
                                    >
                                        <CheckCircle size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                                        Complete Job
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)' }}>
                        <a
                            href={`tel:${job.mobile}`}
                            className="btn btn-secondary"
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            <Phone size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                            Call
                        </a>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${job.location?.lat},${job.location?.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            <MapPin size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                            Navigate
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
