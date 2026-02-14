'use client'

import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Square, CheckCircle } from 'lucide-react';

function SourcingTimer({ onComplete, onCancel }) {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [phase, setPhase] = useState('sourcing'); // 'sourcing' or 'repair'
    const [sourcingTime, setSourcingTime] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartSourcing = () => {
        setIsRunning(true);
        setPhase('sourcing');
    };

    const handleBackWithPart = () => {
        setSourcingTime(elapsedTime);
        setPhase('repair');
        alert(`Sourcing completed in ${formatTime(elapsedTime)}. Timer continues for repair.`);
    };

    const handleRepairComplete = () => {
        setIsRunning(false);
        const repairTime = elapsedTime - sourcingTime;

        onComplete({
            totalTime: elapsedTime,
            sourcingTime,
            repairTime,
            phase: 'completed'
        });
    };

    const handlePauseResume = () => {
        setIsRunning(!isRunning);
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Clock size={20} color="#f59e0b" />
                Immediate Spare Part Sourcing
            </h3>

            {/* Current Phase */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: phase === 'sourcing' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center',
                border: `2px solid ${phase === 'sourcing' ? '#f59e0b' : '#8b5cf6'}`
            }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    CURRENT PHASE
                </div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: phase === 'sourcing' ? '#f59e0b' : '#8b5cf6', textTransform: 'uppercase' }}>
                    {phase === 'sourcing' ? '🚗 Sourcing Part' : '🔧 Repairing Product'}
                </div>
            </div>

            {/* Timer Display */}
            <div style={{
                padding: 'var(--spacing-xl)',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)',
                border: '2px solid var(--border-primary)'
            }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    TOTAL TIME
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 700, fontFamily: 'monospace', color: isRunning ? '#10b981' : 'var(--text-primary)' }}>
                    {formatTime(elapsedTime)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    {isRunning ? '⏱️ Timer Running' : '⏸️ Timer Paused'}
                </div>
            </div>

            {/* Time Breakdown */}
            {phase === 'repair' && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)'
                }}>
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Sourcing Time</div>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#f59e0b' }}>{formatTime(sourcingTime)}</div>
                    </div>
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Repair Time</div>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#8b5cf6' }}>{formatTime(elapsedTime - sourcingTime)}</div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)'
            }}>
                {phase === 'sourcing' ? (
                    <>
                        <strong>Instructions:</strong>
                        <ol style={{ marginTop: 'var(--spacing-xs)', marginBottom: 0, paddingLeft: 'var(--spacing-md)' }}>
                            <li>Start timer before leaving to source part</li>
                            <li>Click "Back with Part" when you return</li>
                            <li>Timer will continue for repair phase</li>
                        </ol>
                    </>
                ) : (
                    <>
                        <strong>Repair Phase:</strong>
                        <p style={{ marginTop: 'var(--spacing-xs)', marginBottom: 0 }}>
                            Complete the repair work. Timer is tracking total time. Click "Repair Complete" when done to proceed to quotation.
                        </p>
                    </>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                {!isRunning && elapsedTime === 0 && (
                    <button
                        onClick={handleStartSourcing}
                        className="btn btn-primary"
                        style={{ padding: 'var(--spacing-md)', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                        <Play size={16} />
                        Start Sourcing Timer
                    </button>
                )}

                {isRunning && phase === 'sourcing' && (
                    <>
                        <button
                            onClick={handleBackWithPart}
                            className="btn btn-primary"
                            style={{ padding: 'var(--spacing-md)', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <CheckCircle size={16} />
                            Back with Part - Start Repair
                        </button>
                        <button
                            onClick={handlePauseResume}
                            className="btn btn-secondary"
                            style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <Pause size={14} />
                            Pause Timer
                        </button>
                    </>
                )}

                {phase === 'repair' && (
                    <>
                        <button
                            onClick={handleRepairComplete}
                            className="btn btn-primary"
                            style={{ padding: 'var(--spacing-md)', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <CheckCircle size={16} />
                            Repair Complete - Create Quotation
                        </button>
                        {isRunning ? (
                            <button
                                onClick={handlePauseResume}
                                className="btn btn-secondary"
                                style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Pause size={14} />
                                Pause Timer
                            </button>
                        ) : (
                            <button
                                onClick={handlePauseResume}
                                className="btn btn-secondary"
                                style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Play size={14} />
                                Resume Timer
                            </button>
                        )}
                    </>
                )}

                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default SourcingTimer;

