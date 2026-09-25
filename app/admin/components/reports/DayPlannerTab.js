'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    DollarSign,
    MapPin,
    CheckSquare,
    Clock,
    Filter,
    Search,
    Check,
    Trash2,
    Edit2,
    AlertCircle,
    ArrowUpRight,
    ArrowDownLeft,
    Phone,
    Navigation,
    CalendarCheck,
    CheckCircle2,
    Circle,
    List,
    Grid,
    CalendarDays
} from 'lucide-react';
import DayPlanModal from './DayPlanModal';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

// Helper to format Date to 'YYYY-MM-DD'
function toDateStr(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function DayPlannerTab() {
    // Current date reference
    const todayStr = useMemo(() => toDateStr(new Date()), []);

    // Current navigation month/year
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // View mode: 'month' | 'week' | 'agenda'
    const [viewMode, setViewMode] = useState('month');

    // Data state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Search states
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'payment' | 'visit' | 'task'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialDate, setModalInitialDate] = useState(todayStr);
    const [editingItem, setEditingItem] = useState(null);

    // Fetch planner items for visible date window
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch a 3-month window around currentDate to support smooth navigation
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            const startWindow = new Date(year, month - 1, 1);
            const endWindow = new Date(year, month + 2, 0);

            const startStr = toDateStr(startWindow);
            const endStr = toDateStr(endWindow);

            const res = await fetch(`/api/admin/planner?start_date=${startStr}&end_date=${endStr}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to load planner data');
            }

            setItems(data.data || []);
        } catch (err) {
            console.error('Error fetching planner items:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Navigation handlers
    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(toDateStr(now));
    };

    // Open modal to add plan on a specific day
    const handleOpenAdd = (dateStr) => {
        setEditingItem(null);
        setModalInitialDate(dateStr || selectedDate || todayStr);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    // Save item (Create or Update)
    const handleSavePlan = async (payload) => {
        const isEdit = !!payload.id;
        const res = await fetch('/api/admin/planner', {
            method: isEdit ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
            throw new Error(result.error || 'Failed to save plan');
        }

        // Refresh items
        fetchItems();
    };

    // Toggle complete status
    const handleToggleComplete = async (item, e) => {
        if (e) e.stopPropagation();
        const nextStatus = item.status === 'completed' ? 'pending' : 'completed';

        // Optimistic update
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: nextStatus } : it));

        try {
            const res = await fetch('/api/admin/planner', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, status: nextStatus })
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Failed to toggle status');
            }
        } catch (err) {
            console.error('Error toggling status:', err);
            // Revert
            fetchItems();
        }
    };

    // Delete item
    const handleDeleteItem = async (itemId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to remove this scheduled item?')) return;

        // Optimistic delete
        setItems(prev => prev.filter(it => it.id !== itemId));

        try {
            const res = await fetch(`/api/admin/planner?id=${itemId}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Failed to delete item');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
            fetchItems();
        }
    };

    // Filtered items based on search, type, and status
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (typeFilter !== 'all' && item.reminder_type !== typeFilter) return false;
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title?.toLowerCase().includes(q);
                const matchContact = item.contact_name?.toLowerCase().includes(q);
                const matchLocation = item.location?.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchContact && !matchLocation && !matchDesc) return false;
            }

            return true;
        });
    }, [items, typeFilter, statusFilter, searchQuery]);

    // Items grouped by due_date
    const itemsByDate = useMemo(() => {
        const map = {};
        for (const item of filteredItems) {
            const d = item.due_date;
            if (!map[d]) map[d] = [];
            map[d].push(item);
        }
        return map;
    }, [filteredItems]);

    // Selected day's items
    const selectedDateItems = useMemo(() => {
        return itemsByDate[selectedDate] || [];
    }, [itemsByDate, selectedDate]);

    // Month KPI Stats
    const monthStats = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthItems = items.filter(it => {
            if (!it.due_date) return false;
            const d = new Date(it.due_date + 'T00:00:00');
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const payments = monthItems.filter(it => it.reminder_type === 'payment');
        const visits = monthItems.filter(it => it.reminder_type === 'visit');
        const completed = monthItems.filter(it => it.status === 'completed');
        const pending = monthItems.filter(it => it.status !== 'completed');

        const totalPayableAmount = payments
            .filter(p => (p.metadata?.direction || 'payable') === 'payable')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const totalReceivableAmount = payments
            .filter(p => p.metadata?.direction === 'receivable')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        return {
            totalPlanned: monthItems.length,
            paymentsCount: payments.length,
            totalPayableAmount,
            totalReceivableAmount,
            visitsCount: visits.length,
            completedCount: completed.length,
            pendingCount: pending.length
        };
    }, [items, currentDate]);

    // Calendar grid computation
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Adjust so Monday is 0, Sunday is 6
        let startDayIndex = firstDayOfMonth.getDay() - 1;
        if (startDayIndex < 0) startDayIndex = 6;

        const days = [];

        // Previous month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthLastDay - i);
            days.push({
                date: d,
                dateStr: toDateStr(d),
                isCurrentMonth: false,
                dayNumber: d.getDate()
            });
        }

        // Current month days
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({
                date: d,
                dateStr: toDateStr(d),
                isCurrentMonth: true,
                dayNumber: i
            });
        }

        // Next month padding to fill grid to multiple of 7
        const remaining = 7 - (days.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(year, month + 1, i);
                days.push({
                    date: d,
                    dateStr: toDateStr(d),
                    isCurrentMonth: false,
                    dayNumber: i
                });
            }
        }

        return days;
    }, [currentDate]);

    // Week view days computation
    const weekDays = useMemo(() => {
        const sel = new Date(selectedDate + 'T00:00:00');
        let dayIndex = sel.getDay() - 1;
        if (dayIndex < 0) dayIndex = 6;

        const startOfWeek = new Date(sel);
        startOfWeek.setDate(sel.getDate() - dayIndex);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push({
                date: d,
                dateStr: toDateStr(d),
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate()
            });
        }
        return days;
    }, [selectedDate]);

    // Format header title (e.g., September 2026)
    const monthYearTitle = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Format human readable selected date
    const selectedDateTitle = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }, [selectedDate]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--spacing-md)', gap: 'var(--spacing-md)', minHeight: '100%', overflowY: 'auto' }}>

            {/* KPI Metric Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                }}
            >
                {/* Total Planned */}
                <div
                    className="card"
                    style={{
                        padding: '14px 16px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                        <CalendarCheck size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Planned in {currentDate.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {monthStats.totalPlanned} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>items</span>
                        </div>
                    </div>
                </div>

                {/* Payments Due */}
                <div
                    className="card"
                    style={{
                        padding: '14px 16px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Payments to Make ({monthStats.paymentsCount})
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                            {formatCurrency(monthStats.totalPayableAmount)}
                        </div>
                    </div>
                </div>

                {/* Visits Planned */}
                <div
                    className="card"
                    style={{
                        padding: '14px 16px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                        <MapPin size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Visits Scheduled
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>
                            {monthStats.visitsCount} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>visits</span>
                        </div>
                    </div>
                </div>

                {/* Pending vs Completed */}
                <div
                    className="card"
                    style={{
                        padding: '14px 16px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Status Overview
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            <span style={{ color: '#f59e0b' }}>{monthStats.pendingCount} Pending</span>
                            <span style={{ margin: '0 6px', color: 'var(--border-primary)' }}>•</span>
                            <span style={{ color: '#10b981' }}>{monthStats.completedCount} Done</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation & Controls Bar */}
            <div
                style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg, 10px)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}
            >
                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handlePrevMonth}
                        className="btn-icon"
                        title="Previous Month"
                        style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <h3 style={{ margin: '0 8px', fontSize: '18px', fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>
                        {monthYearTitle}
                    </h3>

                    <button
                        onClick={handleNextMonth}
                        className="btn-icon"
                        title="Next Month"
                        style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <ChevronRight size={18} />
                    </button>

                    <button
                        onClick={handleToday}
                        className="btn btn-secondary"
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        Today
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <button
                        onClick={() => setViewMode('month')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'month' ? 'var(--bg-elevated)' : 'transparent',
                            color: viewMode === 'month' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <Grid size={14} />
                        Month
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'week' ? 'var(--bg-elevated)' : 'transparent',
                            color: viewMode === 'week' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <CalendarDays size={14} />
                        Week
                    </button>
                    <button
                        onClick={() => setViewMode('agenda')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'agenda' ? 'var(--bg-elevated)' : 'transparent',
                            color: viewMode === 'agenda' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <List size={14} />
                        Agenda
                    </button>
                </div>

                {/* Filter and Add Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '160px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Filter plans..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 10px 6px 30px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="payment">Payments Only</option>
                        <option value="visit">Visits Only</option>
                        <option value="task">Tasks Only</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>

                    {/* Plan Activity Primary Action */}
                    <button
                        onClick={() => handleOpenAdd(selectedDate)}
                        className="btn btn-primary"
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--color-primary)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={16} />
                        Plan Activity
                    </button>
                </div>
            </div>

            {/* Main Content Layout: Calendar Grid + Day Details Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'agenda' ? '1fr' : 'minmax(0, 1.8fr) minmax(320px, 1.2fr)', gap: '16px', alignItems: 'start' }}>

                {/* Calendar View Area */}
                {viewMode === 'month' && (
                    <div
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg, 10px)',
                            border: '1px solid var(--border-primary)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Days of week header */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderBottom: '1px solid var(--border-primary)',
                                textAlign: 'center',
                                padding: '10px 0',
                                fontWeight: 700,
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <span>MON</span>
                            <span>TUE</span>
                            <span>WED</span>
                            <span>THU</span>
                            <span>FRI</span>
                            <span>SAT</span>
                            <span>SUN</span>
                        </div>

                        {/* Calendar Day Cells */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                autoRows: 'minmax(105px, 1fr)',
                                backgroundColor: 'var(--border-primary)',
                                gap: '1px'
                            }}
                        >
                            {calendarDays.map((cell) => {
                                const isSelected = cell.dateStr === selectedDate;
                                const isToday = cell.dateStr === todayStr;
                                const dayItems = itemsByDate[cell.dateStr] || [];

                                return (
                                    <div
                                        key={cell.dateStr}
                                        onClick={() => setSelectedDate(cell.dateStr)}
                                        style={{
                                            backgroundColor: isSelected
                                                ? 'var(--bg-hover)'
                                                : cell.isCurrentMonth
                                                    ? 'var(--bg-elevated)'
                                                    : 'var(--bg-secondary)',
                                            padding: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background-color 0.15s ease',
                                            outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                                            outlineOffset: '-2px',
                                            zIndex: isSelected ? 2 : 1
                                        }}
                                    >
                                        {/* Day Cell Top: Date Number & Add Button */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: isToday ? 700 : 500,
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                                                    color: isToday ? '#ffffff' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)'
                                                }}
                                            >
                                                {cell.dayNumber}
                                            </span>

                                            {/* Quick + on cell */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAdd(cell.dateStr);
                                                }}
                                                title={`Plan for ${cell.dateStr}`}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--text-tertiary)',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        {/* Day items list inside cell */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                                            {dayItems.slice(0, 3).map((item) => {
                                                const isPayment = item.reminder_type === 'payment';
                                                const isVisit = item.reminder_type === 'visit';
                                                const isCompleted = item.status === 'completed';

                                                const badgeBg = isPayment
                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                    : isVisit
                                                        ? 'rgba(139, 92, 246, 0.15)'
                                                        : 'rgba(59, 130, 246, 0.15)';

                                                const badgeColor = isPayment
                                                    ? '#10b981'
                                                    : isVisit
                                                        ? '#8b5cf6'
                                                        : '#3b82f6';

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDate(cell.dateStr);
                                                            handleOpenEdit(item);
                                                        }}
                                                        title={`${item.title} (${item.status})`}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '2px 5px',
                                                            borderRadius: '4px',
                                                            backgroundColor: badgeBg,
                                                            color: badgeColor,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            opacity: isCompleted ? 0.6 : 1,
                                                            textDecoration: isCompleted ? 'line-through' : 'none'
                                                        }}
                                                    >
                                                        {isPayment ? <DollarSign size={10} style={{ flexShrink: 0 }} /> :
                                                            isVisit ? <MapPin size={10} style={{ flexShrink: 0 }} /> :
                                                                <CheckSquare size={10} style={{ flexShrink: 0 }} />}
                                                        <span style={{ fontWeight: 600 }}>
                                                            {isPayment && item.amount ? `₹${item.amount} ` : ''}
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {dayItems.length > 3 && (
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, paddingLeft: '4px' }}>
                                                    +{dayItems.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Week View Area */}
                {viewMode === 'week' && (
                    <div
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg, 10px)',
                            border: '1px solid var(--border-primary)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                backgroundColor: 'var(--border-primary)',
                                gap: '1px',
                                minHeight: '480px'
                            }}
                        >
                            {weekDays.map((wd) => {
                                const isSelected = wd.dateStr === selectedDate;
                                const isToday = wd.dateStr === todayStr;
                                const dayItems = itemsByDate[wd.dateStr] || [];

                                return (
                                    <div
                                        key={wd.dateStr}
                                        onClick={() => setSelectedDate(wd.dateStr)}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                                            padding: '10px 8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            borderTop: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent'
                                        }}
                                    >
                                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                {wd.dayName}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '16px',
                                                    fontWeight: 700,
                                                    width: '28px',
                                                    height: '28px',
                                                    lineHeight: '28px',
                                                    margin: '4px auto 0',
                                                    borderRadius: '50%',
                                                    backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                                                    color: isToday ? '#ffffff' : 'var(--text-primary)'
                                                }}
                                            >
                                                {wd.dayNumber}
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                            {dayItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(wd.dateStr);
                                                        handleOpenEdit(item);
                                                    }}
                                                    style={{
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border-primary)',
                                                        backgroundColor: item.reminder_type === 'payment' ? 'rgba(16, 185, 129, 0.1)' :
                                                            item.reminder_type === 'visit' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                        {item.title}
                                                    </div>
                                                    {item.due_time && (
                                                        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <Clock size={10} />
                                                            {item.due_time}
                                                        </div>
                                                    )}
                                                    {item.amount > 0 && (
                                                        <div style={{ color: '#10b981', fontWeight: 700 }}>
                                                            ₹{item.amount}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAdd(wd.dateStr);
                                                }}
                                                style={{
                                                    marginTop: 'auto',
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    border: '1px dashed var(--border-primary)',
                                                    background: 'transparent',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Plus size={12} />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Agenda View Area */}
                {viewMode === 'agenda' && (
                    <div
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg, 10px)',
                            border: '1px solid var(--border-primary)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Upcoming Scheduled Activities</h4>
                            <button
                                onClick={() => handleOpenAdd(selectedDate)}
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                            >
                                <Plus size={14} /> Add Plan
                            </button>
                        </div>

                        {Object.keys(itemsByDate).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                                <CalendarCheck size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>No scheduled plans found for the selected filters.</p>
                            </div>
                        ) : (
                            Object.keys(itemsByDate).sort().map((dateStr) => {
                                const dItems = itemsByDate[dateStr];
                                const isPast = dateStr < todayStr;
                                const isCurrent = dateStr === todayStr;

                                return (
                                    <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                color: isCurrent ? 'var(--color-primary)' : isPast ? 'var(--text-secondary)' : 'var(--text-primary)'
                                            }}>
                                                {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            {isCurrent && (
                                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-primary)', color: '#ffffff', fontWeight: 700 }}>
                                                    TODAY
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                                            {dItems.map(item => (
                                                <PlanCardItem
                                                    key={item.id}
                                                    item={item}
                                                    onToggleComplete={handleToggleComplete}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={handleDeleteItem}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Selected Date Details Panel (Only shown in Month & Week mode) */}
                {viewMode !== 'agenda' && (
                    <div
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg, 10px)',
                            border: '1px solid var(--border-primary)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            position: 'sticky',
                            top: '16px'
                        }}
                    >
                        {/* Day Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                    {selectedDate === todayStr ? 'Today\'s Schedule' : 'Day Schedule'}
                                </div>
                                <h3 style={{ margin: '3px 0 0 0', fontSize: '16px', fontWeight: 700 }}>
                                    {selectedDateTitle}
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {selectedDateItems.length} {selectedDateItems.length === 1 ? 'activity' : 'activities'} scheduled
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenAdd(selectedDate)}
                                className="btn btn-primary"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={14} />
                                Add Plan
                            </button>
                        </div>

                        {/* List of Activities on Selected Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
                            {selectedDateItems.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '32px 16px',
                                        color: 'var(--text-secondary)',
                                        border: '1px dashed var(--border-primary)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <CalendarCheck size={32} style={{ opacity: 0.3, marginBottom: '6px' }} />
                                    <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                                        No activities planned for this day.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAdd(selectedDate)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--color-primary)',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Schedule a payment, visit, or reminder
                                    </button>
                                </div>
                            ) : (
                                selectedDateItems.map((item) => (
                                    <PlanCardItem
                                        key={item.id}
                                        item={item}
                                        onToggleComplete={handleToggleComplete}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDeleteItem}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Plan / Reminder Creation Modal */}
            <DayPlanModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePlan}
                initialDate={modalInitialDate}
                editItem={editingItem}
            />
        </div>
    );
}

// Subcomponent: Plan Item Card
function PlanCardItem({ item, onToggleComplete, onEdit, onDelete }) {
    const isPayment = item.reminder_type === 'payment';
    const isVisit = item.reminder_type === 'visit';
    const isTask = item.reminder_type === 'task' || item.reminder_type === 'general';
    const isCompleted = item.status === 'completed';

    const direction = item.metadata?.direction || 'payable';

    const typeColor = isPayment ? '#10b981' : isVisit ? '#8b5cf6' : '#3b82f6';

    const getPriorityBadge = (p) => {
        switch (p) {
            case 'high':
                return { label: 'High', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
            case 'low':
                return { label: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
            default:
                return { label: 'Med', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
        }
    };

    const priorityBadge = getPriorityBadge(item.priority);

    return (
        <div
            style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: isCompleted ? 0.65 : 1,
                transition: 'all 0.15s ease',
                position: 'relative'
            }}
        >
            {/* Top row: Checkbox, Title & Type badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <button
                    type="button"
                    onClick={(e) => onToggleComplete(item, e)}
                    title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: '2px',
                        color: isCompleted ? '#10b981' : 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Type Icon Badge */}
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isPayment ? 'rgba(16, 185, 129, 0.15)' :
                                    isVisit ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: typeColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                        >
                            {isPayment ? <DollarSign size={10} /> : isVisit ? <MapPin size={10} /> : <CheckSquare size={10} />}
                            {isPayment ? (direction === 'payable' ? 'Payable' : 'Receivable') : isVisit ? 'Visit' : 'Task'}
                        </span>

                        {/* Priority Badge */}
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: priorityBadge.bg,
                                color: priorityBadge.color
                            }}
                        >
                            {priorityBadge.label}
                        </span>

                        {/* Time */}
                        {item.due_time && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Clock size={11} />
                                {item.due_time}
                            </span>
                        )}
                    </div>

                    <h4
                        style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none'
                        }}
                    >
                        {item.title}
                    </h4>
                </div>

                {/* Edit & Delete actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                        }}
                        className="btn-icon"
                        title="Edit"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}
                    >
                        <Edit2 size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id, e);
                        }}
                        className="btn-icon"
                        title="Delete"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Context Details: Payment amount or Visit address/phone */}
            {isPayment && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.contact_name ? `Payee: ${item.contact_name}` : 'Amount'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: direction === 'payable' ? '#ef4444' : '#10b981' }}>
                        {direction === 'payable' ? '-' : '+'}{formatCurrency(item.amount)}
                    </span>
                </div>
            )}

            {isVisit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px' }}>
                    {item.contact_name && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.contact_name}</span>
                            {item.contact_phone && (
                                <a
                                    href={`tel:${item.contact_phone}`}
                                    style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                                >
                                    <Phone size={10} />
                                    {item.contact_phone}
                                </a>
                            )}
                        </div>
                    )}

                    {item.location && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                {item.location}
                            </span>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                            >
                                <Navigation size={10} />
                                Map
                            </a>
                        </div>
                    )}

                    {item.metadata?.assigned_to && (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                            Assigned to: <strong style={{ color: 'var(--text-secondary)' }}>{item.metadata.assigned_to}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* Description/Notes */}
            {item.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0 4px' }}>
                    "{item.description}"
                </div>
            )}
        </div>
    );
}
