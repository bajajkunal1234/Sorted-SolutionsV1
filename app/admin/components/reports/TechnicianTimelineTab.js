'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
    Calendar, Play, Pause, ChevronLeft, ChevronRight, 
    RefreshCcw, AlertTriangle, Clock, MapPin, 
    PhoneCall, Award, Eye, Briefcase, Activity
} from 'lucide-react';

const TechnicianTimelineMap = dynamic(() => import('./TechnicianTimelineMap'), { ssr: false });

export default function TechnicianTimelineTab() {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const nowIST = new Date(utc + (3600000 * 5.5));
        return nowIST.toISOString().split('T')[0];
    });

    const [loading, setLoading] = useState(false);
    const [timelineData, setTimelineData] = useState(null);
    
    // Calendar Picker States
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [monthlyDistances, setMonthlyDistances] = useState({});
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Playback States
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1); // multiplier
    const [panTo, setPanTo] = useState(null);

    const playbackIntervalRef = useRef(null);

    // Fetch technicians list
    useEffect(() => {
        const fetchTechs = async () => {
            const { data, error } = await supabase
                .from('technicians')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (!error && data) {
                setTechnicians(data);
                if (data.length > 0) {
                    setSelectedTechId(data[0].id);
                }
            }
        };
        fetchTechs();
    }, []);

    // Fetch Timeline route and interactions data
    const fetchTimeline = async () => {
        if (!selectedTechId || !selectedDate) return;
        setLoading(true);
        setIsPlaying(false);
        setPlaybackIndex(null);
        try {
            const res = await fetch(`/api/admin/technician-location-history?technicianId=${selectedTechId}&date=${selectedDate}`);
            const payload = await res.json();
            if (payload.success) {
                setTimelineData(payload.data);
            } else {
                console.error(payload.error);
                setTimelineData(null);
            }
        } catch (err) {
            console.error(err);
            setTimelineData(null);
        } finally {
            setLoading(false);
        }
    };

    // Fetch monthly summary on month or tech change
    const fetchMonthlySummary = async () => {
        if (!selectedTechId || !currentMonth) return;
        setMonthlyLoading(true);
        try {
            const res = await fetch(`/api/admin/technician-location-history?technicianId=${selectedTechId}&month=${currentMonth}`);
            const payload = await res.json();
            if (payload.success) {
                setMonthlyDistances(payload.data || {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMonthlyLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [selectedTechId, selectedDate]);

    useEffect(() => {
        if (showCalendarModal) {
            fetchMonthlySummary();
        }
    }, [selectedTechId, currentMonth, showCalendarModal]);

    // Playback loop
    useEffect(() => {
        if (isPlaying && timelineData && timelineData.routePath && timelineData.routePath.length > 0) {
            const delay = Math.max(50, 1000 / playbackSpeed);
            playbackIntervalRef.current = setInterval(() => {
                setPlaybackIndex(prev => {
                    if (prev === null) return 0;
                    if (prev >= timelineData.routePath.length - 1) {
                        setIsPlaying(false);
                        clearInterval(playbackIntervalRef.current);
                        return null;
                    }
                    return prev + 1;
                });
            }, delay);
        } else {
            if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
            }
        }

        return () => {
            if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
            }
        };
    }, [isPlaying, playbackSpeed, timelineData]);

    const activePlaybackPosition = 
        playbackIndex !== null && timelineData?.routePath
            ? timelineData.routePath[playbackIndex] 
            : null;

    // Synchronize selected timeline card highlight with active playback coordinate time
    const getActiveTimelineCardIndex = () => {
        if (!activePlaybackPosition || !timelineData?.timeline) return -1;
        const targetTime = new Date(activePlaybackPosition.time);

        let closestIndex = 0;
        let minDiff = Infinity;

        timelineData.timeline.forEach((item, idx) => {
            const diff = Math.abs(new Date(item.time) - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = idx;
            }
        });

        return closestIndex;
    };

    const activeTimelineIndex = getActiveTimelineCardIndex();

    // Calendar Modal Logic (OneLap Style)
    const renderCalendarGrid = () => {
        const [year, month] = currentMonth.split('-').map(Number);
        const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sun
        const daysInMonth = new Date(year, month, 0).getDate();

        const grid = [];
        
        // Fill empty offsets
        for (let i = 0; i < firstDayIndex; i++) {
            grid.push(<div key={`empty-${i}`} style={{ height: '70px', border: '1px solid var(--border-color)', opacity: 0.2 }} />);
        }

        // Fill day blocks
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const km = monthlyDistances[dateStr];
            const isToday = dateStr === selectedDate;

            grid.push(
                <button
                    key={`day-${day}`}
                    onClick={() => {
                        setSelectedDate(dateStr);
                        setShowCalendarModal(false);
                    }}
                    style={{
                        height: '70px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isToday ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--color-primary)' : 'inherit' }}>{day}</span>
                    <span style={{ 
                        fontSize: '9px', 
                        fontWeight: '600', 
                        color: km && km > 0 ? '#10b981' : 'var(--text-secondary)'
                    }}>
                        {km !== undefined ? `${km.toFixed(1)} km` : '0.0 km'}
                    </span>
                </button>
            );
        }

        return grid;
    };

    const handleMonthChange = (direction) => {
        const [year, month] = currentMonth.split('-').map(Number);
        let nextYear = year;
        let nextMonth = month + direction;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        } else if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        }

        setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--spacing-md)', height: 'calc(100vh - 180px)', minHeight: '550px' }}>
            <style>{`
                @keyframes ping {
                    0% { transform: scale(1); opacity: 1; }
                    70%, 100% { transform: scale(2.2); opacity: 0; }
                }
                .timeline-card {
                    transition: border var(--transition-fast), background var(--transition-fast);
                }
                .timeline-card.active {
                    border-left: 4px solid var(--color-primary);
                    background-color: var(--bg-hover);
                }
            `}</style>

            {/* LEFT CONTAINER: Map & Playback Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', position: 'relative' }}>
                <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <TechnicianTimelineMap
                        routePath={timelineData?.routePath || []}
                        stops={timelineData?.stopsCount ? timelineData.timeline.filter(t => t.type === 'stop') : []}
                        jobsList={timelineData?.jobsList || []}
                        playbackPosition={activePlaybackPosition}
                        panTo={panTo}
                    />
                </div>

                {/* Floating Playback Controls Bar */}
                {timelineData?.routePath && timelineData.routePath.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        gap: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <button
                                className="btn btn-primary"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                            </button>

                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }}
                                onClick={() => {
                                    setPlaybackIndex(null);
                                    setIsPlaying(false);
                                }}
                            >
                                Reset
                            </button>
                        </div>

                        {/* Progress slider */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <input
                                type="range"
                                min={0}
                                max={timelineData.routePath.length - 1}
                                value={playbackIndex || 0}
                                onChange={(e) => {
                                    setPlaybackIndex(parseInt(e.target.value));
                                }}
                                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                {activePlaybackPosition 
                                    ? new Date(activePlaybackPosition.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                    : '00:00:00'}
                            </span>
                        </div>

                        {/* Playback speed selector */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 5, 10, 20].map(speed => (
                                <button
                                    key={`speed-${speed}`}
                                    onClick={() => setPlaybackSpeed(speed)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: playbackSpeed === speed ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                        color: playbackSpeed === speed ? 'var(--text-inverse)' : 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT CONTAINER: Timeline Sidebar details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflow: 'hidden' }}>
                {/* Header Filter Panel */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        {/* Tech Selector */}
                        <div style={{ flex: 1 }}>
                            <select
                                className="form-control"
                                value={selectedTechId}
                                onChange={(e) => setSelectedTechId(e.target.value)}
                                style={{ width: '100%', padding: '6px' }}
                            >
                                <option value="">Select Technician...</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Review Selector */}
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowCalendarModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '6px 12px' }}
                        >
                            <Calendar size={14} />
                            {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </button>

                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px' }}
                            onClick={fetchTimeline}
                            disabled={loading}
                        >
                            <RefreshCcw size={14} className={loading ? "spin" : ""} />
                        </button>
                    </div>

                    {/* Quick day summary tags */}
                    {timelineData && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-xs)', marginTop: '4px' }}>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '6px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Distance</div>
                                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', color: '#10b981' }}>{timelineData.totalDistanceKm} km</div>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '6px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Parking Stops</div>
                                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{timelineData.stopsCount} stops</div>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '6px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Violations</div>
                                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', color: timelineData.violationsCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                                    {timelineData.violationsCount} alerts
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline vertical scroll list */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                            <RefreshCcw size={28} className="spin" style={{ marginBottom: 'var(--spacing-sm)' }} />
                            <span>Loading timeline path logs...</span>
                        </div>
                    ) : !timelineData || timelineData.timeline.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                            <Activity size={32} style={{ opacity: 0.5, marginBottom: 'var(--spacing-xs)' }} />
                            <span>No route logs found for this date.</span>
                        </div>
                    ) : (
                        timelineData.timeline.map((event, idx) => {
                            const isHighlighted = idx === activeTimelineIndex;
                            const isStop = event.type === 'stop';
                            const isJob = event.type === 'job_action';
                            const isCall = event.type === 'interaction' && event.title?.includes('Call');
                            const isStartEnd = event.type === 'shift_start' || event.type === 'shift_end';

                            let cardBorderColor = 'var(--border-color)';
                            let iconColor = 'var(--text-secondary)';
                            let IconComponent = MapPin;

                            if (isStop) {
                                cardBorderColor = '#64748b';
                                iconColor = '#64748b';
                                IconComponent = Clock;
                            } else if (isJob) {
                                cardBorderColor = '#f59e0b';
                                iconColor = '#f59e0b';
                                IconComponent = Briefcase;
                            } else if (isCall) {
                                cardBorderColor = '#3b82f6';
                                iconColor = '#3b82f6';
                                IconComponent = PhoneCall;
                            } else if (isStartEnd) {
                                cardBorderColor = '#10b981';
                                iconColor = '#10b981';
                                IconComponent = Award;
                            }

                            return (
                                <div
                                    key={`timeline-card-${idx}`}
                                    className={`timeline-card ${isHighlighted ? 'active' : ''}`}
                                    onClick={() => {
                                        if (event.lat && event.lng) {
                                            setPanTo({ lat: event.lat, lng: event.lng });
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (event.lat && event.lng) {
                                            setPanTo({ lat: event.lat, lng: event.lng });
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        gap: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)',
                                        border: `1px solid ${event.warning ? '#ef4444' : cardBorderColor}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        borderLeft: isHighlighted ? '4px solid var(--color-primary)' : `4px solid ${event.warning ? '#ef4444' : cardBorderColor}`
                                    }}
                                >
                                    {/* Event Icon */}
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <IconComponent size={14} style={{ color: iconColor }} />
                                    </div>

                                    {/* Text Description */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{event.title}</span>
                                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {event.description}
                                        </div>

                                        {/* Warning Process Violation alert */}
                                        {event.warning && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '4px',
                                                marginTop: '6px',
                                                padding: '4px 6px',
                                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: '#ef4444',
                                                fontSize: '9.5px',
                                                fontWeight: '500'
                                            }}>
                                                <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                                                <span>{event.warning}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MONTHLY CALENDAR DIALOG (OneLap Style popup) */}
            {showCalendarModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '450px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Calendar Header */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold' }}>Select Date</h3>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                onClick={() => setShowCalendarModal(false)}
                            >
                                Close
                            </button>
                        </div>

                        {/* Month Switcher Toolbar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            backgroundColor: 'var(--bg-primary)'
                        }}>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '4px' }}
                                onClick={() => handleMonthChange(-1)}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>
                                {new Date(currentMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '4px' }}
                                onClick={() => handleMonthChange(1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div style={{ padding: 'var(--spacing-md)' }}>
                            {monthlyLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                                    <RefreshCcw className="spin" size={24} />
                                </div>
                            ) : (
                                <>
                                    {/* Weekdays Labels */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
                                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                                            <span key={day} style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{day}</span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                        {renderCalendarGrid()}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
