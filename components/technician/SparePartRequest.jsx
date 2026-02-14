'use client'

import { useState, useRef } from 'react';
import { Package, Calendar, Camera, DollarSign, AlertCircle, Zap, Clock } from 'lucide-react';
import SourcingTimer from '@/components/technician/SourcingTimer';

function SparePartRequest({ job, onComplete, onCancel }) {
    const [sourcingMode, setSourcingMode] = useState(null); // null, 'immediate', 'order'
    const [partName, setPartName] = useState('');
    const [partCode, setPartCode] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [collectingPart, setCollectingPart] = useState(false);
    const [partPhoto, setPartPhoto] = useState(null);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const fileInputRef = useRef(null);

    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPartPhoto({
                name: file.name,
                url: URL.createObjectURL(file),
                file
            });
        }
    };

    const handleTimerComplete = (timerData) => {
        // After immediate sourcing and repair, go to quotation
        onComplete({
            sourcingMode: 'immediate',
            timerData,
            proceedToQuotation: true
        });
    };

    const handleSubmit = () => {
        if (!partName.trim()) {
            alert('Please enter the spare part name.');
            return;
        }

        if (collectingPart && !partPhoto) {
            alert('Please upload a photo of the sample part being collected.');
            return;
        }

        if (!rescheduleDate || !rescheduleTime) {
            alert('Please select a rescheduled date and time.');
            return;
        }

        onComplete({
            sourcingMode: 'order',
            partName,
            partCode,
            quantity,
            collectingPart,
            partPhoto,
            advanceAmount,
            rescheduledDateTime: new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString()
        });
    };

    // Show timer if immediate sourcing selected
    if (sourcingMode === 'immediate') {
        return (
            <SourcingTimer
                onComplete={handleTimerComplete}
                onCancel={() => setSourcingMode(null)}
            />
        );
    }

    // Show mode selection if not selected
    if (sourcingMode === null) {
        return (
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <Package size={20} color="#f59e0b" />
                    Spare Part Required
                </h3>

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                    How would you like to proceed with the spare part?
                </p>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {/* Immediate Sourcing Option */}
                    <button
                        onClick={() => setSourcingMode('immediate')}
                        className="btn"
                        style={{
                            padding: 'var(--spacing-lg)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '2px solid #10b981',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 'var(--spacing-sm)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <Zap size={24} color="#10b981" />
                            <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: '#10b981' }}>
                                Source Immediately from Nearby Supplier
                            </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Get the part now, repair on-site, and complete the job today.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: '#10b981' }}>
                            <Clock size={14} />
                            Timer will track sourcing + repair time
                        </div>
                    </button>

                    {/* Order & Reschedule Option */}
                    <button
                        onClick={() => setSourcingMode('order')}
                        className="btn"
                        style={{
                            padding: 'var(--spacing-lg)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '2px solid #f59e0b',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 'var(--spacing-sm)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <Calendar size={24} color="#f59e0b" />
                            <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: '#f59e0b' }}>
                                Order Part & Reschedule Job
                            </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Part needs to be ordered. Job will be rescheduled for later.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: '#f59e0b' }}>
                            <DollarSign size={14} />
                            Optional advance payment collection
                        </div>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: 'var(--spacing-md)', padding: '10px' }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Package size={20} color="#f59e0b" />
                Spare Part Required
            </h3>

            {/* Alert */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                gap: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                color: '#f59e0b'
            }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    Job will be rescheduled after spare part request. Timer will be stopped automatically.
                </div>
            </div>

            {/* Part Details */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Spare Part Name *
                </label>
                <input
                    type="text"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="e.g., Compressor - Samsung 1.5T"
                    className="form-input"
                    style={{ width: '100%' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Part Code (Optional)
                    </label>
                    <input
                        type="text"
                        value={partCode}
                        onChange={(e) => setPartCode(e.target.value)}
                        placeholder="e.g., COMP-SAM-1.5T"
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Quantity
                    </label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="form-input"
                        style={{ width: '100%' }}
                        min="1"
                    />
                </div>
            </div>

            {/* Collect Sample Checkbox */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={collectingPart}
                            onChange={(e) => {
                                setCollectingPart(e.target.checked);
                                if (!e.target.checked) {
                                    setPartPhoto(null);
                                }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                        />
                        <div>
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                Collect Sample
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Collect the defective part from customer as a sample to source the exact same new part
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Part Photo (if collecting sample) */}
            {collectingPart && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Sample Part Photo * (Mandatory)
                    </label>
                    {!partPhoto ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--spacing-lg)',
                                textAlign: 'center',
                                backgroundColor: 'var(--bg-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                Take photo of the sample part
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                            <img src={partPhoto.url} alt="Part" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                            <button
                                onClick={() => setPartPhoto(null)}
                                className="btn"
                                style={{
                                    position: 'absolute',
                                    top: 'var(--spacing-xs)',
                                    right: 'var(--spacing-xs)',
                                    padding: '4px 8px',
                                    backgroundColor: '#ef4444',
                                    fontSize: 'var(--font-size-xs)'
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Advance Amount */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Advance Amount (₹)
                </label>
                <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter advance amount (0 if none)"
                    className="form-input"
                    style={{ width: '100%' }}
                    min="0"
                    step="100"
                />
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Leave as 0 if no advance is required
                </div>
            </div>

            {/* Reschedule Date & Time */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Reschedule Job *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                    <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                    <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', backgroundColor: '#f59e0b' }}
                >
                    {advanceAmount > 0 ? `Next: Collect ₹${advanceAmount}` : 'Reschedule Job'}
                </button>
            </div>
        </div>
    );
}

export default SparePartRequest;

