'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    DollarSign,
    MapPin,
    CheckSquare,
    Clock,
    Search,
    Trash2,
    Edit2,
    Phone,
    Navigation,
    CalendarCheck,
    CheckCircle2,
    Circle,
    List,
    Grid,
    CalendarDays,
    X,
    Filter,
    Repeat,
    Building2,
    Wrench,
    ExternalLink,
    Landmark
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

// Helper to compute visual styling for day-card activity badges (New Era style)
function getMiniCardProps(item) {
    const isCompleted = item.status === 'completed';
    const type = item.reminder_type || 'task';
    const direction = item.metadata?.direction || (type === 'payment' ? 'payable' : undefined);
    const isNewEra = Boolean(item.metadata?.is_newera || item.source === 'newera');

    if (type === 'payment') {
        if (direction === 'payable') {
            // Payment to make (Payable) - Red card when unpaid, green when paid (matching New Era)
            return {
                borderColor: isCompleted ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
                bgColor: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                titleColor: isCompleted ? '#6ee7b7' : '#fca5a5',
                subColor: isCompleted ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
                title: item.title || item.contact_name || 'Payment',
                sub: item.amount ? `₹${Math.round(Number(item.amount)).toLocaleString('en-IN')}` : undefined,
                prefix: isCompleted ? '✓ ' : '',
                isNewEra
            };
        } else {
            // Payment to collect (Receivable) - Green card
            return {
                borderColor: 'rgba(16, 185, 129, 0.45)',
                bgColor: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.12)',
                titleColor: isCompleted ? 'rgba(16, 185, 129, 0.6)' : '#6ee7b7',
                subColor: isCompleted ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
                title: item.title || item.contact_name || 'Collect',
                sub: item.amount ? `+₹${Math.round(Number(item.amount)).toLocaleString('en-IN')}` : undefined,
                prefix: isCompleted ? '✓ ' : '',
                isNewEra
            };
        }
    } else if (type === 'visit') {
        // Visit - Purple card
        const techOrLoc = item.metadata?.assigned_to || item.location || item.contact_name || item.due_time;
        return {
            borderColor: 'rgba(139, 92, 246, 0.45)',
            bgColor: isCompleted ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.12)',
            titleColor: isCompleted ? 'rgba(139, 92, 246, 0.6)' : '#c4b5fd',
            subColor: isCompleted ? 'rgba(255, 255, 255, 0.5)' : '#ddd6fe',
            title: item.title || item.contact_name || 'Site Visit',
            sub: techOrLoc,
            prefix: isCompleted ? '✓ ' : '📍 ',
            isNewEra: false
        };
    } else {
        // Task / General - Blue card
        return {
            borderColor: 'rgba(59, 130, 246, 0.45)',
            bgColor: isCompleted ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.12)',
            titleColor: isCompleted ? 'rgba(59, 130, 246, 0.6)' : '#93c5fd',
            subColor: isCompleted ? 'rgba(255, 255, 255, 0.5)' : '#bfdbfe',
            title: item.title || 'Task',
            sub: item.due_time || (item.priority && item.priority !== 'medium' ? `${item.priority.toUpperCase()}` : undefined),
            prefix: isCompleted ? '✓ ' : '☑ ',
            isNewEra: false
        };
    }
}

export default function DayPlannerTab() {
    // Current date reference
    const todayStr = useMemo(() => toDateStr(new Date()), []);

    // Current navigation month/year
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // View mode: 'month' | 'agenda'
    const [viewMode, setViewMode] = useState('month');

    // Data state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Search states
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'payment' | 'visit' | 'task'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialDate, setModalInitialDate] = useState(todayStr);
    const [editingItem, setEditingItem] = useState(null);

    // Fetch planner items for visible date window
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch a 3-month window around currentDate
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

    // Counts for filter pills
    const counts = useMemo(() => {
        let payments = 0;
        let visits = 0;
        let tasks = 0;
        for (const it of items) {
            if (it.reminder_type === 'payment') payments++;
            else if (it.reminder_type === 'visit') visits++;
            else tasks++;
        }
        return { all: items.length, payments, visits, tasks };
    }, [items]);

    // Calendar grid computation (matches New Era Sunday-first format with empty cards)
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Sunday is 0, Monday is 1 ... Saturday is 6
        const startDayIndex = firstDayOfMonth.getDay();

        const days = [];

        // Previous month padding (empty cells)
        for (let i = 0; i < startDayIndex; i++) {
            days.push(null);
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
            for (let i = 0; i < remaining; i++) {
                days.push(null);
            }
        }

        return days;
    }, [currentDate]);

    // Format header title (e.g., September 2026)
    const monthYearTitle = currentDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

    // Format full header title (e.g., October 2026)
    const monthYearLongTitle = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Format human readable selected date
    const selectedDateHeader = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate + 'T00:00:00');
        const isToday = selectedDate === todayStr;
        const formatted = d.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        return isToday ? `Today • ${formatted}` : formatted;
    }, [selectedDate, todayStr]);

    return (
        <div className="planner-container">
            <style jsx>{`
                .planner-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 10px;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                .planner-header-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-radius: 12px;
                    padding: 8px 12px;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .month-nav {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .month-title {
                    font-size: 15px;
                    font-weight: 700;
                    min-width: 120px;
                    text-align: center;
                    color: var(--text-primary);
                }
                .nav-btn {
                    padding: 6px;
                    border-radius: 6px;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .nav-btn:hover {
                    background: var(--bg-hover);
                }
                .today-btn {
                    padding: 4px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 6px;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    cursor: pointer;
                }
                .view-toggle {
                    display: flex;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: 8px;
                    padding: 2px;
                }
                .toggle-btn {
                    padding: 5px 10px;
                    font-size: 12px;
                    font-weight: 600;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: transparent;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .toggle-btn.active {
                    background: var(--bg-elevated);
                    color: var(--color-primary);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .add-action-btn {
                    padding: 7px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    border-radius: 8px;
                    border: none;
                    background: #6366f1;
                    color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-left: auto;
                }
                .filter-pills-bar {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    overflow-x: auto;
                    padding-bottom: 2px;
                    -webkit-overflow-scrolling: touch;
                }
                .filter-pills-bar::-webkit-scrollbar {
                    display: none;
                }
                .pill {
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    cursor: pointer;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }
                .pill.active {
                    background: var(--color-primary);
                    border-color: var(--color-primary);
                    color: #ffffff;
                }
                .search-input-mobile {
                    width: 100%;
                    padding: 7px 10px 7px 30px;
                    font-size: 12px;
                    border-radius: 8px;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    box-sizing: border-box;
                }
                .calendar-card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-radius: 12px;
                    overflow: hidden;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 12px;
                }
                .calendar-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2px 4px 10px;
                    border-bottom: 1px solid var(--border-primary);
                    margin-bottom: 8px;
                }
                .calendar-nav-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }
                .calendar-sub-hint {
                    font-size: 11px;
                    color: var(--text-secondary);
                }
                .weekdays-header {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(0, 1fr));
                    gap: 6px;
                    text-align: center;
                    padding: 4px 0 8px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(0, 1fr));
                    gap: 6px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .empty-day-cell {
                    background: rgba(255, 255, 255, 0.01);
                    min-height: 95px;
                    border-radius: 8px;
                    border: 1px dashed rgba(255, 255, 255, 0.04);
                    box-sizing: border-box;
                }
                .day-cell {
                    background: rgba(15, 23, 42, 0.35);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    min-height: 95px;
                    padding: 6px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    gap: 4px;
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.15s ease;
                    box-sizing: border-box;
                    overflow: hidden;
                    position: relative;
                }
                .day-cell:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.12);
                }
                .day-cell.selected {
                    border-color: #6366f1 !important;
                    background: rgba(99, 102, 241, 0.12) !important;
                    box-shadow: 0 0 0 1px #6366f1, 0 4px 14px rgba(99, 102, 241, 0.18);
                }
                .day-cell.today {
                    border-color: rgba(99, 102, 241, 0.4);
                }
                .day-cell-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }
                .day-num-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #f8fafc;
                }
                .day-num-label.today {
                    color: #818cf8;
                    font-weight: 800;
                }
                .day-num-label.selected {
                    color: #ffffff;
                    font-weight: 800;
                }
                .day-item-count {
                    font-size: 9px;
                    font-weight: 800;
                    color: #94a3b8;
                    background: rgba(255, 255, 255, 0.08);
                    padding: 1px 4px;
                    border-radius: 10px;
                }
                .day-content {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    overflow-y: auto;
                    max-height: 140px;
                    width: 100%;
                    scrollbar-width: thin;
                }
                .mini-activity-card {
                    padding: 3px 5px;
                    border-radius: 4px;
                    border: 1px solid;
                    display: block;
                    text-align: left;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    min-width: 0;
                    max-width: 100%;
                    box-sizing: border-box;
                    transition: transform 0.1s;
                }
                .mini-card-title {
                    font-size: 10.5px;
                    font-weight: 800;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    line-height: 1.2;
                }
                .mini-card-sub {
                    font-size: 9.5px;
                    font-weight: 600;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    opacity: 0.9;
                    margin-top: 1px;
                }
                .mini-more-pill {
                    font-size: 9px;
                    font-weight: 700;
                    color: #94a3b8;
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 3px;
                    padding: 1px 4px;
                    text-align: center;
                    margin-top: 1px;
                }
                .mobile-dot-container {
                    display: none;
                }
                .mobile-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                }
                .dot-payment { background: #10b981; }
                .dot-payable { background: #ef4444; }
                .dot-visit { background: #8b5cf6; }
                .dot-task { background: #3b82f6; }
                .schedule-card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-radius: 12px;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .schedule-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--border-primary);
                    padding-bottom: 10px;
                }
                .schedule-title {
                    font-size: 15px;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-primary);
                }
                .schedule-count {
                    font-size: 11px;
                    color: var(--text-secondary);
                }
                .activity-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .planner-main-content {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    width: 100%;
                }

                /* Mobile Viewport */
                @media (max-width: 640px) {
                    .calendar-card {
                        padding: 8px 6px;
                    }
                    .calendar-grid {
                        gap: 3px;
                    }
                    .weekdays-header {
                        gap: 3px;
                        font-size: 10px;
                        padding-bottom: 4px;
                    }
                    .empty-day-cell {
                        min-height: 48px;
                        border-radius: 6px;
                    }
                    .day-cell {
                        min-height: 48px;
                        max-height: 64px;
                        padding: 4px 2px;
                        border-radius: 6px;
                        align-items: center;
                        justifyContent: center;
                    }
                    .day-cell-top {
                        justify-content: center;
                    }
                    .day-num-label {
                        font-size: 12px;
                    }
                    .day-item-count {
                        display: none !important;
                    }
                    .day-content {
                        display: none !important;
                    }
                    .mobile-dot-container {
                        display: flex !important;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 2px;
                        margin-top: 2px;
                        width: 100%;
                    }
                }
            `}</style>

            {/* Header: Month Navigator + View Switcher + Primary Add Button */}
            <div className="planner-header-bar">
                {/* Month Navigator */}
                <div className="month-nav">
                    <button onClick={handlePrevMonth} className="nav-btn" title="Previous Month">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="month-title">{monthYearTitle}</span>
                    <button onClick={handleNextMonth} className="nav-btn" title="Next Month">
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={handleToday} className="today-btn">
                        Today
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div className="view-toggle">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
                    >
                        <Grid size={13} />
                        Month
                    </button>
                    <button
                        onClick={() => setViewMode('agenda')}
                        className={`toggle-btn ${viewMode === 'agenda' ? 'active' : ''}`}
                    >
                        <List size={13} />
                        Agenda
                    </button>
                </div>

                {/* Quick Add Plan Button */}
                <button onClick={() => handleOpenAdd(selectedDate)} className="add-action-btn">
                    <Plus size={15} />
                    <span>Plan Day</span>
                </button>
            </div>

            {/* Filter Pills & Search Bar (Mobile Friendly Scrollable Row) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="filter-pills-bar">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`pill ${typeFilter === 'all' ? 'active' : ''}`}
                    >
                        All ({counts.all})
                    </button>
                    <button
                        onClick={() => setTypeFilter('payment')}
                        className={`pill ${typeFilter === 'payment' ? 'active' : ''}`}
                        style={{ color: typeFilter === 'payment' ? '#ffffff' : '#10b981' }}
                    >
                        <DollarSign size={12} />
                        Payments ({counts.payments})
                    </button>
                    <button
                        onClick={() => setTypeFilter('visit')}
                        className={`pill ${typeFilter === 'visit' ? 'active' : ''}`}
                        style={{ color: typeFilter === 'visit' ? '#ffffff' : '#8b5cf6' }}
                    >
                        <MapPin size={12} />
                        Visits ({counts.visits})
                    </button>
                    <button
                        onClick={() => setTypeFilter('task')}
                        className={`pill ${typeFilter === 'task' ? 'active' : ''}`}
                        style={{ color: typeFilter === 'task' ? '#ffffff' : '#3b82f6' }}
                    >
                        <CheckSquare size={12} />
                        Tasks ({counts.tasks})
                    </button>

                    {/* Status Toggle Pill */}
                    <button
                        onClick={() => setStatusFilter(prev => prev === 'all' ? 'pending' : prev === 'pending' ? 'completed' : 'all')}
                        className="pill"
                        style={{
                            borderColor: statusFilter !== 'all' ? 'var(--color-primary)' : 'var(--border-primary)',
                            color: statusFilter !== 'all' ? 'var(--color-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        <Filter size={11} />
                        {statusFilter === 'all' ? 'Status: All' : statusFilter === 'pending' ? 'Pending Only' : 'Completed Only'}
                    </button>

                    {/* Search Toggle Pill */}
                    <button
                        onClick={() => setShowSearch(prev => !prev)}
                        className="pill"
                        style={{ color: showSearch ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                        title="Search plans"
                    >
                        <Search size={12} />
                    </button>
                </div>

                {/* Collapsible Search Input */}
                {showSearch && (
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search by title, contact, address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-mobile"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="planner-main-content">

                {/* View 1: Month Calendar Grid */}
                {viewMode === 'month' && (
                    <div className="calendar-card">
                        {/* Month header & subtitle like New Era */}
                        <div className="calendar-card-header">
                            <h3 className="calendar-nav-title">
                                {monthYearLongTitle}
                            </h3>
                            <span className="calendar-sub-hint">
                                Click any date to inspect details
                            </span>
                        </div>

                        {/* Weekday headers: SUN MON TUE WED THU FRI SAT */}
                        <div className="weekdays-header">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(w => (
                                <span key={w}>{w}</span>
                            ))}
                        </div>

                        {/* 7-column calendar grid with New Era activity cards */}
                        <div className="calendar-grid">
                            {calendarDays.map((cell, idx) => {
                                if (!cell) {
                                    return <div key={`empty-${idx}`} className="empty-day-cell" />;
                                }

                                const isSelected = cell.dateStr === selectedDate;
                                const isToday = cell.dateStr === todayStr;
                                const dayItems = itemsByDate[cell.dateStr] || [];

                                const hasPayable = dayItems.some(i => i.reminder_type === 'payment' && (i.metadata?.direction === 'payable' || !i.metadata?.direction));
                                const hasReceivable = dayItems.some(i => i.reminder_type === 'payment' && i.metadata?.direction === 'receivable');
                                const hasVisit = dayItems.some(i => i.reminder_type === 'visit');
                                const hasTask = dayItems.some(i => i.reminder_type === 'task' || i.reminder_type === 'general');

                                return (
                                    <div
                                        key={cell.dateStr}
                                        onClick={() => setSelectedDate(cell.dateStr)}
                                        className={`day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                    >
                                        <div className="day-cell-top">
                                            <span className={`day-num-label ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}>
                                                {cell.dayNumber}
                                            </span>

                                            {dayItems.length > 3 && (
                                                <span className="day-item-count" title={`${dayItems.length} activities`}>
                                                    {dayItems.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Desktop / Tablet: Activity Cards Stack (New Era style) */}
                                        <div className="day-content">
                                            {dayItems.slice(0, 3).map((item) => {
                                                const card = getMiniCardProps(item);
                                                const isNewEraItem = Boolean(item.metadata?.is_newera || item.source === 'newera');
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="mini-activity-card"
                                                        onClick={(e) => {
                                                            if (isNewEraItem) {
                                                                e.stopPropagation();
                                                                setSelectedDate(cell.dateStr);
                                                                const loanId = item.metadata?.loan_id || '';
                                                                let url = `/newera?tab=schedule&day=${cell.dateStr}`;
                                                                if (loanId) url += `&loan_id=${loanId}`;
                                                                window.open(url, '_blank');
                                                            }
                                                        }}
                                                        style={{
                                                            borderColor: card.borderColor,
                                                            backgroundColor: card.bgColor,
                                                            cursor: isNewEraItem ? 'pointer' : 'default'
                                                        }}
                                                        title={
                                                            isNewEraItem
                                                                ? `New Era Liability: ${item.title} (${item.amount ? `₹${Number(item.amount).toLocaleString('en-IN')}` : ''}) — Click to open in Liabilities Tracker (new tab)`
                                                                : `${item.title || item.contact_name} ${item.amount ? `(₹${Number(item.amount).toLocaleString('en-IN')})` : ''}`
                                                        }
                                                    >
                                                        <div className="mini-card-title" style={{ color: card.titleColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {card.prefix}{card.title}
                                                            </span>
                                                            {isNewEraItem && <ExternalLink size={9} style={{ opacity: 0.7, flexShrink: 0 }} />}
                                                        </div>
                                                        {card.sub && (
                                                            <div className="mini-card-sub" style={{ color: card.subColor }}>
                                                                {card.sub}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {dayItems.length > 3 && (
                                                <div className="mini-more-pill">
                                                    +{dayItems.length - 3} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile Dots Indicator (Phone screen view) */}
                                        {dayItems.length > 0 && (
                                            <div className="mobile-dot-container">
                                                {hasPayable && <span className="mobile-dot dot-payable" title="Payment to Make" />}
                                                {hasReceivable && <span className="mobile-dot dot-payment" title="Payment to Collect" />}
                                                {hasVisit && <span className="mobile-dot dot-visit" title="Visit" />}
                                                {hasTask && <span className="mobile-dot dot-task" title="Task" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* View 2: Agenda View */}
                {viewMode === 'agenda' && (
                    <div className="schedule-card">
                        <div className="schedule-header">
                            <h4 className="schedule-title">Upcoming Agenda</h4>
                            <button
                                onClick={() => handleOpenAdd(selectedDate)}
                                className="add-action-btn"
                                style={{ padding: '5px 10px', fontSize: '11px' }}
                            >
                                <Plus size={13} />
                                Add
                            </button>
                        </div>

                        {Object.keys(itemsByDate).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
                                <CalendarCheck size={32} style={{ opacity: 0.3, marginBottom: '6px' }} />
                                <p style={{ margin: 0, fontSize: '13px' }}>No scheduled plans found.</p>
                            </div>
                        ) : (
                            Object.keys(itemsByDate).sort().map((dateStr) => {
                                const dItems = itemsByDate[dateStr];
                                const isCurrent = dateStr === todayStr;

                                return (
                                    <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                                                {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            {isCurrent && (
                                                <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--color-primary)', color: '#ffffff', fontWeight: 700 }}>
                                                    TODAY
                                                </span>
                                            )}
                                        </div>

                                        <div className="activity-list">
                                            {dItems.map(item => (
                                                <MobilePlanCardItem
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

                {/* Selected Date Schedule Card (In Month View: Sits below the calendar on mobile, side-by-side on desktop) */}
                {viewMode === 'month' && (
                    <div className="schedule-card">
                        <div className="schedule-header">
                            <div>
                                <h4 className="schedule-title">{selectedDateHeader}</h4>
                                <span className="schedule-count">
                                    {selectedDateItems.length} {selectedDateItems.length === 1 ? 'activity' : 'activities'} scheduled
                                </span>
                            </div>

                            <button
                                onClick={() => handleOpenAdd(selectedDate)}
                                className="add-action-btn"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                                <Plus size={14} />
                                Add Plan
                            </button>
                        </div>

                        {/* List of items on selected date */}
                        <div className="activity-list">
                            {selectedDateItems.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '24px 12px',
                                        color: 'var(--text-secondary)',
                                        border: '1px dashed var(--border-primary)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <CalendarCheck size={28} style={{ opacity: 0.3, marginBottom: '6px' }} />
                                    <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                                        No activities for this day
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAdd(selectedDate)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#6366f1',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Schedule a payment, visit, or task
                                    </button>
                                </div>
                            ) : (
                                selectedDateItems.map((item) => (
                                    <MobilePlanCardItem
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

            {/* Creation / Edit Modal */}
            {isModalOpen && (
                <DayPlanModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePlan}
                    initialDate={modalInitialDate}
                    editItem={editingItem}
                />
            )}
        </div>
    );
}

// Compact Mobile-First Card for Each Planned Item
function MobilePlanCardItem({ item, onToggleComplete, onEdit, onDelete }) {
    const isPayment = item.reminder_type === 'payment';
    const isVisit = item.reminder_type === 'visit';
    const isCompleted = item.status === 'completed';
    const isNewEra = Boolean(item.metadata?.is_newera || item.source === 'newera');

    const direction = item.metadata?.direction || 'payable';

    const typeColor = isPayment ? '#10b981' : isVisit ? '#8b5cf6' : '#3b82f6';
    const typeBg = isPayment ? 'rgba(16, 185, 129, 0.12)' : isVisit ? 'rgba(139, 92, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)';

    const openInNewEra = (e) => {
        if (e) e.stopPropagation();
        const dayStr = item.due_date || '';
        const loanId = item.metadata?.loan_id || '';
        let url = `/newera?tab=schedule`;
        if (dayStr) url += `&day=${dayStr}`;
        if (loanId) url += `&loan_id=${loanId}`;
        window.open(url, '_blank');
    };

    return (
        <div
            onClick={isNewEra ? openInNewEra : undefined}
            style={{
                backgroundColor: 'var(--bg-secondary)',
                border: isNewEra
                    ? (isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.35)')
                    : '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                opacity: isCompleted ? 0.65 : 1,
                boxSizing: 'border-box',
                cursor: isNewEra ? 'pointer' : 'default',
                transition: 'border-color 0.15s ease, background-color 0.15s ease'
            }}
            title={isNewEra ? "New Era Liability Installment — Click to open in New Era Tracker (new tab)" : undefined}
        >
            {/* Top Row: Type Pill, Time, Status, Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {/* One-Tap Complete Checkbox */}
                    <button
                        type="button"
                        onClick={(e) => onToggleComplete(item, e)}
                        title={isCompleted ? (isNewEra ? 'Mark Unpaid' : 'Mark Pending') : (isNewEra ? 'Mark Paid' : 'Mark Completed')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: isCompleted ? '#10b981' : 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {isCompleted ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </button>

                    {/* Type Badge */}
                    <span
                        style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: typeBg,
                            color: typeColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                        }}
                    >
                        {isPayment ? <DollarSign size={10} /> : isVisit ? <MapPin size={10} /> : <CheckSquare size={10} />}
                        {isPayment ? (direction === 'payable' ? 'Payable' : 'Receivable') : isVisit ? 'Visit' : 'Task'}
                    </span>

                    {/* New Era Liability Badge */}
                    {isNewEra && (
                        <span
                            onClick={openInNewEra}
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(99, 102, 241, 0.16)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer'
                            }}
                            title="Synced from New Era Liabilities Tracker — Click to open in new tab"
                        >
                            <Landmark size={10} />
                            New Era
                        </span>
                    )}

                    {/* Installment Number Badge */}
                    {item.metadata?.installment_number && (
                        <span
                            style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}
                        >
                            Inst #{item.metadata.installment_number}
                        </span>
                    )}

                    {/* Recurring Badge */}
                    {item.is_recurring && (
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                color: '#6366f1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                            title="Repeats automatically"
                        >
                            <Repeat size={10} />
                            {item.recurrence_pattern?.frequency === 'weekly' ? 'Weekly' : item.recurrence_pattern?.frequency === 'daily' ? 'Daily' : 'Monthly'}
                        </span>
                    )}

                    {/* Account DB Link Badge */}
                    {item.account_id && (
                        <span
                            style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}
                            title="Linked to Account DB"
                        >
                            <Building2 size={9} />
                            Account
                        </span>
                    )}

                    {/* Time Slot */}
                    {item.due_time && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Clock size={10} />
                            {item.due_time}
                        </span>
                    )}
                </div>

                {/* Actions: Tracker link for New Era, Edit & Delete for standard items */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isNewEra ? (
                        <button
                            type="button"
                            onClick={openInNewEra}
                            style={{
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="Open installment in New Era Liabilities Tracker (new tab)"
                        >
                            <span>Tracker</span>
                            <ExternalLink size={11} />
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px', color: 'var(--text-secondary)' }}
                                title="Edit"
                            >
                                <Edit2 size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item.id, e);
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px', color: '#ef4444' }}
                                title="Delete"
                            >
                                <Trash2 size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Title & Amount / Payee */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        <span>{item.title}</span>
                        {isNewEra && <ExternalLink size={11} style={{ opacity: 0.6 }} />}
                    </div>

                    {item.contact_name && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {isNewEra ? `Lender: ${item.contact_name}` : (isPayment ? `To: ${item.contact_name}` : `Contact: ${item.contact_name}`)}
                        </div>
                    )}
                </div>

                {/* Prominent Payment Amount */}
                {isPayment && (
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isCompleted ? '#10b981' : (direction === 'payable' ? '#ef4444' : '#10b981'),
                        whiteSpace: 'nowrap'
                    }}>
                        {isCompleted ? '✓ ' : (direction === 'payable' ? '-' : '+')}{formatCurrency(item.amount)}
                    </div>
                )}
            </div>

            {/* Visit Details: Quick Phone & Map Actions */}
            {isVisit && (item.contact_phone || item.location || item.metadata?.assigned_to) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {item.metadata?.assigned_to && (
                        <span style={{ fontSize: '11px', color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                            <Wrench size={11} />
                            {item.metadata.assigned_to}
                        </span>
                    )}
                    {item.contact_phone && (
                        <a
                            href={`tel:${item.contact_phone}`}
                            style={{
                                fontSize: '11px',
                                color: 'var(--color-primary)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 600
                            }}
                        >
                            <Phone size={11} />
                            Call
                        </a>
                    )}
                    {item.location && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: '11px',
                                color: '#8b5cf6',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 600
                            }}
                        >
                            <Navigation size={11} />
                            {item.location.length > 25 ? `${item.location.substring(0, 25)}...` : item.location}
                        </a>
                    )}
                </div>
            )}

            {/* Description Notes */}
            {item.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                    "{item.description}"
                </div>
            )}
        </div>
    );
}
