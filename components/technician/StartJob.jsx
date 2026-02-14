'use client'

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, StopCircle, Camera, Video, Upload, X, FileText } from 'lucide-react';

function StartJob({ job, onComplete, onCancel }) {
    const [timerRunning, setTimerRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [uploadedMedia, setUploadedMedia] = useState([]);
    const [notes, setNotes] = useState('');
    const [defectDescription, setDefectDescription] = useState(job.defect || '');
    const [diagnosisLogs, setDiagnosisLogs] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        let interval;
        if (timerRunning) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerRunning]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        const newMedia = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
            url: URL.createObjectURL(file),
            file
        }));
        setUploadedMedia([...uploadedMedia, ...newMedia]);
    };

    const removeMedia = (id) => {
        setUploadedMedia(uploadedMedia.filter(m => m.id !== id));
    };

    const handleStartJob = () => {
        if (uploadedMedia.length === 0) {
            alert('Please upload at least one photo or video showing the defect before starting the diagnosis.');
            return;
        }
        console.log('Starting timer...');
        setTimerRunning(true);
        console.log('Timer started, timerRunning should be true');
    };

    const handleStopTimer = () => {
        if (elapsedTime === 0) {
            alert('Timer has not been started yet.');
            return;
        }

        // Save current diagnosis as a log entry
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            duration: elapsedTime,
            notes: notes,
            media: [...uploadedMedia],
            defectDescription: defectDescription
        };

        setDiagnosisLogs([...diagnosisLogs, logEntry]);

        // Reset for next diagnosis session
        setTimerRunning(false);
        setElapsedTime(0);
        setNotes('');
        setUploadedMedia([]);

        alert('Diagnosis log saved! You can start a new diagnosis session or proceed to spare parts.');
    };

    const removeLogEntry = (id) => {
        if (window.confirm('Are you sure you want to remove this diagnosis entry?')) {
            setDiagnosisLogs(diagnosisLogs.filter(log => log.id !== id));
        }
    };

    const handleComplete = () => {
        if (diagnosisLogs.length === 0 && !timerRunning) {
            alert('Please complete at least one diagnosis session before proceeding.');
            return;
        }

        // If timer is running, save current session first
        let finalLogs = [...diagnosisLogs];
        if (timerRunning && elapsedTime > 0) {
            finalLogs.push({
                id: Date.now(),
                timestamp: new Date().toISOString(),
                duration: elapsedTime,
                notes: notes,
                media: [...uploadedMedia],
                defectDescription: defectDescription
            });
        }

        onComplete({
            diagnosisLogs: finalLogs,
            totalDiagnosisTime: finalLogs.reduce((sum, log) => sum + log.duration, 0),
            defectDescription
        });
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Play size={20} color="#3b82f6" />
                Start Diagnosis
            </h3>

            {/* Timer */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: timerRunning ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center',
                border: timerRunning ? '2px solid #10b981' : '2px solid #3b82f6'
            }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    {timerRunning ? 'DIAGNOSIS IN PROGRESS' : 'READY TO START'}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: timerRunning ? '#10b981' : '#3b82f6', fontFamily: 'monospace' }}>
                    {formatTime(elapsedTime)}
                </div>
                <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
                    {!timerRunning ? (
                        <button
                            onClick={handleStartJob}
                            className="btn btn-primary"
                            style={{ padding: '8px 20px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Play size={16} />
                            Start Diagnosis
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setTimerRunning(false)}
                                className="btn"
                                style={{ padding: '8px 16px', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Pause size={16} />
                                Pause
                            </button>
                            <button
                                onClick={handleStopTimer}
                                className="btn"
                                style={{ padding: '8px 16px', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <StopCircle size={16} />
                                Stop & Save Log
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Diagnosis Logs */}
            {diagnosisLogs.length > 0 && (
                <div style={{
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#10b981' }}>
                        Saved Diagnosis Logs ({diagnosisLogs.length})
                    </h4>
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {diagnosisLogs.map((log, index) => (
                            <div key={log.id} style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-xs)' }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            Session {index + 1} - {formatTime(log.duration)}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {new Date(log.timestamp).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeLogEntry(log.id)}
                                        style={{
                                            background: '#ef4444',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '4px 8px',
                                            color: 'white',
                                            fontSize: 'var(--font-size-xs)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                                {log.notes && (
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)', fontStyle: 'italic' }}>
                                        "{log.notes}"
                                    </div>
                                )}
                                {log.media.length > 0 && (
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        📎 {log.media.length} file(s) attached
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Defect Description */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Defect Description *
                </label>
                <textarea
                    value={defectDescription}
                    onChange={(e) => setDefectDescription(e.target.value)}
                    placeholder="Describe the defect you observed..."
                    className="form-input"
                    rows="3"
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>

            {/* Media Upload */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Upload Product/Defect Photo * (Required before starting diagnosis)
                </label>
                <div style={{
                    border: '2px dashed var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    cursor: 'pointer'
                }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Click to upload or drag and drop
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        Photos, videos, or documents
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Uploaded Media */}
                {uploadedMedia.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--spacing-sm)' }}>
                        {uploadedMedia.map(media => (
                            <div key={media.id} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                                {media.type === 'image' ? (
                                    <img src={media.url} alt={media.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                ) : media.type === 'video' ? (
                                    <div style={{ width: '100%', height: '100px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Video size={32} color="var(--text-secondary)" />
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: '100px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={32} color="var(--text-secondary)" />
                                    </div>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeMedia(media.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    <X size={12} color="white" />
                                </button>
                                <div style={{ padding: '4px', fontSize: 'var(--font-size-xs)', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {media.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Initial Notes */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Diagnostic Notes (Type while diagnosing)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Note down your findings as you diagnose the issue..."
                    className="form-input"
                    rows="3"
                    style={{ width: '100%', resize: 'vertical' }}
                />
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
                    onClick={handleComplete}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', backgroundColor: '#10b981' }}
                    disabled={diagnosisLogs.length === 0 && !timerRunning}
                >
                    Next: Spare Parts
                </button>
            </div>
        </div>
    );
}

export default StartJob;

