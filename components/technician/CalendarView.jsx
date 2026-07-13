'use client'

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Briefcase, Plus, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiCall } from '@/lib/offlineSync';

const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Skip next 6 working days (skipping weekly off day) to find min date
function getMinLeaveDate(weeklyOffDay = 'Sunday') {
    const d = new Date();
    // Adjust to India Standard Time (UTC+5:30)
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istDate = new Date(utc + (3600000 * 5.5));
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyOffIndex = dayNames.indexOf(weeklyOffDay);
    
    let workingDays = 0;
    let checkDate = new Date(istDate);
    while (workingDays < 6) {
        checkDate.setDate(checkDate.getDate() + 1);
        if (checkDate.getDay() !== weeklyOffIndex) {
            workingDays++;
        }
    }
    let minDate = new Date(checkDate);
    minDate.setDate(minDate.getDate() + 1);
    if (minDate.getDay() === weeklyOffIndex) {
        minDate.setDate(minDate.getDate() + 1);
    }
    return minDate;
}

export default function CalendarView({ technicianId, jobs = [], onSelectJob, setActiveTab, technicianData }) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString(new Date()));
    
    // Leaves state
    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);
    const [leaveDate, setLeaveDate] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [submittingLeave, setSubmittingLeave] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const weeklyOffDay = technicianData?.weekly_off_day || 'Sunday';
    const minLeaveDateObj = getMinLeaveDate(weeklyOffDay);
    const minLeaveDateStr = getLocalDateString(minLeaveDateObj);

    // Fetch applied leaves
    const fetchLeaves = async () => {
        if (!technicianId) return;
        setLeavesLoading(true);
        try {
            const res = await apiCall(`/api/technician/leaves?technicianId=${technicianId}`);
            const data = await res.json();
            if (data.success) {
                setLeaves(data.leaves || []);
            }
        } catch (e) {
            console.error('Failed to fetch leaves:', e);
        } finally {
            setLeavesLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();

        // Listen for real-time leave status updates from admin
        const channel = supabase.channel('realtime:technician_updates');
        channel.on('broadcast', { event: 'leave_status_updated' }, ({ payload }) => {
            if (payload?.technicianId === technicianId) {
                console.log('Realtime: Leave status updated');
                fetchLeaves();
            }
        });
        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [technicianId]);

    useEffect(() => {
        if (selectedDateStr >= minLeaveDateStr) {
            setLeaveDate(selectedDateStr);
        } else {
            setLeaveDate('');
        }
    }, [selectedDateStr, minLeaveDateStr]);

    // Handle Month Nav
    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Calendar Calculations
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
    
    const blanks = Array(firstDayIndex).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Check if date has jobs
    const getJobsForDate = (dateStr) => {
        return jobs.filter(j => j.dueDate === dateStr);
    };

    // Check if date has leaves
    const getLeaveForDate = (dateStr) => {
        return leaves.find(l => l.leave_date === dateStr);
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!leaveDate || !leaveReason.trim()) {
            setError('Please fill in both the leave date and reason.');
            return;
        }

        const selDateObj = new Date(leaveDate);
        if (selDateObj.getDay() === 0) {
            setError('Sundays are fixed rest days. Leave applications for Sundays are not allowed.');
            return;
        }

        // Validate 6 working days rule
        const selDateZero = new Date(leaveDate);
        selDateZero.setHours(0,0,0,0);
        const minAllowedZero = new Date(minLeaveDateObj);
        minAllowedZero.setHours(0,0,0,0);

        if (selDateZero < minAllowedZero) {
            setError(`Leave must be applied at least 6 working days in advance. Earliest allowed: ${minLeaveDateStr}`);
            return;
        }

        setSubmittingLeave(true);
        try {
            const res = await apiCall('/api/technician/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_id: technicianId,
                    leave_date: leaveDate,
                    reason: leaveReason.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit leave request');

            setSuccessMsg('✅ Leave request submitted successfully! Admin has been notified.');
            setLeaveDate('');
            setLeaveReason('');
            fetchLeaves();

            // Send Supabase realtime broadcast
            const channel = supabase.channel('realtime:technician_updates');
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'leave_submitted',
                        payload: { technicianId }
                    });
                    supabase.removeChannel(channel);
                }
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmittingLeave(false);
        }
    };

    // Filter jobs for currently selected date
    const selectedDateJobs = getJobsForDate(selectedDateStr);
    const selectedDateLeave = getLeaveForDate(selectedDateStr);

    return (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            {/* Back Button to Dashboard */}
            <div style={{ alignSelf: 'flex-start' }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                >
                    <ChevronLeft size={14} /> Back to Dashboard
                </button>
            </div>

            <div style={{ maxWidth: '340px', width: '100%', alignSelf: 'center', padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Calendar Navigation Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                        <CalendarIcon size={16} color="#ec4899" /> {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={prevMonth} style={{ padding: '5px', borderRadius: '50%', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={12} />
                        </button>
                        <button onClick={nextMonth} style={{ padding: '5px', borderRadius: '50%', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>

                {/* Week Day Titles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {blanks.map((_, i) => (
                        <div key={`blank-${i}`} style={{ height: '34px' }} />
                    ))}
                    {days.map(day => {
                        const mm = String(currentMonth + 1).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        const dateStr = `${currentYear}-${mm}-${dd}`;
                        const isSelected = selectedDateStr === dateStr;
                        const isToday = getLocalDateString(new Date()) === dateStr;
                        const dateJobs = getJobsForDate(dateStr);
                        const dateLeave = getLeaveForDate(dateStr);
                        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const isWeeklyOff = dayNames[dayOfWeek] === weeklyOffDay;

                        let borderStyle = '1px solid var(--border-primary)';
                        let bgColor = 'transparent';
                        let textColor = 'var(--text-primary)';

                        if (isToday) {
                            borderStyle = '1px solid #3b82f6';
                            textColor = '#3b82f6';
                        }
                        if (isWeeklyOff) {
                            bgColor = 'rgba(255,255,255,0.01)';
                            textColor = 'var(--text-tertiary)';
                        }
                        if (dateLeave) {
                            if (dateLeave.status === 'approved') {
                                bgColor = 'rgba(239,68,68,0.1)';
                                borderStyle = '1px solid rgba(239,68,68,0.3)';
                                textColor = '#ef4444';
                            } else if (dateLeave.status === 'rejected') {
                                borderStyle = '1px dashed var(--border-primary)';
                            } else {
                                bgColor = 'rgba(245,158,11,0.08)';
                                borderStyle = '1px solid rgba(245,158,11,0.3)';
                                textColor = '#f59e0b';
                            }
                        }
                        if (isSelected) {
                            bgColor = '#ec4899';
                            borderStyle = '1px solid #ec4899';
                            textColor = '#ffffff';
                        }

                        return (
                            <button
                                key={`day-${day}`}
                                onClick={() => setSelectedDateStr(dateStr)}
                                style={{
                                    height: '34px',
                                    borderRadius: '6px',
                                    border: borderStyle,
                                    backgroundColor: bgColor,
                                    color: textColor,
                                    fontWeight: isToday || isSelected ? 700 : 400,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    padding: '2px',
                                    fontSize: '11px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span>{day}</span>
                                {dateJobs.length > 0 && !isSelected && (
                                    <span style={{
                                        width: '4px',
                                        height: '4px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3b82f6',
                                        position: 'absolute',
                                        bottom: '3px'
                                    }} />
                                )}
                                {dateLeave && dateLeave.status === 'approved' && !isSelected && (
                                    <span style={{ fontSize: '7px', position: 'absolute', bottom: '1px', opacity: 0.8 }}>OFF</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Daily Timeline Detail */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📅 Timeline for {new Date(selectedDateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </h4>

                {selectedDateLeave && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: selectedDateLeave.status === 'approved' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                        border: `1px solid ${selectedDateLeave.status === 'approved' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                        color: selectedDateLeave.status === 'approved' ? '#f87171' : '#fbbf24',
                        fontSize: '13px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} />
                        <span>
                            {selectedDateLeave.status === 'approved' 
                                ? `Approved Leave: ${selectedDateLeave.reason || 'Rest day'}` 
                                : `Applied Leave (Pending Approval): ${selectedDateLeave.reason}`}
                        </span>
                    </div>
                )}

                {selectedDateJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        No jobs scheduled for this date.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {selectedDateJobs.map(job => (
                            <div 
                                key={job.id} 
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s'
                                }}
                                onClick={() => {
                                    onSelectJob(job);
                                    setActiveTab('jobs');
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{job.job_number}</span>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontWeight: 700,
                                        backgroundColor: job.status === 'in-progress' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                        color: job.status === 'in-progress' ? '#3b82f6' : '#10b981'
                                    }}>
                                        {job.status.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                                    👤 {job.customerName}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Briefcase size={12} /> {job.product?.brand} {job.product?.name} · {job.defect}
                                </div>
                                <div style={{ fontSize: '12px', color: '#ec4899', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                    <Clock size={12} /> {job.confirmedVisitTime || 'Time slots not set'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Apply Leave Panel - Conditionally shown only on or after the 7th working day from today */}
            {selectedDateStr >= minLeaveDateStr && (
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📅 Apply for Leave
                    </h4>
                    <p style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ⚠️ Notice period rule: Leaves must be requested at least 1 week (6 working days) in advance. Sundays are fixed off days.
                    </p>

                    {error && (
                        <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={14} /> <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={14} /> <span>{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Leave Date</label>
                            <input 
                                type="date"
                                min={minLeaveDateStr}
                                value={leaveDate}
                                onChange={(e) => setLeaveDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason for Leave</label>
                            <textarea 
                                rows="2"
                                placeholder="Please explain the reason for this leave request..."
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    resize: 'none',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={submittingLeave}
                            style={{
                                padding: '10px',
                                backgroundColor: '#ec4899',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                                opacity: submittingLeave ? 0.6 : 1,
                                fontSize: '13px'
                            }}
                        >
                            {submittingLeave ? 'Submitting request...' : '🚀 Submit Leave Request'}
                        </button>
                    </form>
                </div>
            )}

            {/* Applied Leaves History Panel - Always visible */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#ec4899" /> Applied Leaves History
                </h4>

                {leavesLoading && leaves.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>Loading leaves history...</div>
                ) : leaves.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No leave requests made yet.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {leaves.map(l => (
                            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                                        {new Date(l.leave_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {l.reason}
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: l.status === 'approved' ? 'rgba(16,185,129,0.1)' : (l.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'),
                                    color: l.status === 'approved' ? '#10b981' : (l.status === 'rejected' ? '#ef4444' : '#f59e0b')
                                }}>
                                    {l.status.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
