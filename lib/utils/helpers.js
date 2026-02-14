import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format date for display
 */
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
};

/**
 * Format date with time
 */
export const formatDateTime = (date) => {
    return formatDate(date, 'MMM dd, yyyy hh:mm a');
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Extract locality from full address
 * Handles both string addresses and JSONB address objects
 */
export const getLocalityFromAddress = (address) => {
    if (!address) return '';

    // Handle JSONB address object (Supabase)
    if (typeof address === 'object') {
        return address.locality || address.city || '';
    }

    // Handle string address
    const parts = address.split(',').map(p => p.trim());
    // Return the third part (Locality) if available, otherwise return first part
    return parts[2] || parts[0] || '';
};

/**
 * Generate pre-visit checklist based on product, brand, and issue
 */
export const generatePreVisitChecklist = (job) => {
    const checklist = [];

    // Add repaired part if job is in part-repairing stage
    if (job.status === 'part-repairing') {
        checklist.push({
            id: 'repaired-part',
            item: `Repaired ${job.product?.name || 'part'} for customer`,
            checked: false,
            priority: 'high'
        });
    }

    // Basic tools
    checklist.push(
        { id: 'multimeter', item: 'Multimeter', checked: false },
        { id: 'screwdriver-set', item: 'Screwdriver Set', checked: false }
    );

    // Product-specific tools
    const productName = job.product?.name?.toLowerCase() || '';
    const issueName = job.issue?.name?.toLowerCase() || '';

    if (productName.includes('washing machine') || productName.includes('wm')) {
        checklist.push(
            { id: 'drain-pump', item: 'Drain Pump (if needed)', checked: false },
            { id: 'inlet-valve', item: 'Inlet Valve', checked: false },
            { id: 'belt', item: 'Drive Belt', checked: false }
        );
    }

    if (productName.includes('ac') || productName.includes('air conditioner')) {
        checklist.push(
            { id: 'gas-cylinder', item: 'Refrigerant Gas Cylinder', checked: false },
            { id: 'pressure-gauge', item: 'Pressure Gauge', checked: false },
            { id: 'vacuum-pump', item: 'Vacuum Pump', checked: false }
        );
    }

    if (productName.includes('microwave')) {
        checklist.push(
            { id: 'magnetron', item: 'Magnetron (if needed)', checked: false },
            { id: 'capacitor', item: 'High Voltage Capacitor', checked: false }
        );
    }

    if (productName.includes('refrigerator') || productName.includes('fridge')) {
        checklist.push(
            { id: 'compressor', item: 'Compressor (if needed)', checked: false },
            { id: 'thermostat', item: 'Thermostat', checked: false },
            { id: 'gas-leak-detector', item: 'Gas Leak Detector', checked: false }
        );
    }

    // Issue-specific items
    if (issueName.includes('leak')) {
        checklist.push(
            { id: 'sealant', item: 'Sealant/Gasket', checked: false }
        );
    }

    if (issueName.includes('noise')) {
        checklist.push(
            { id: 'lubricant', item: 'Lubricant Oil', checked: false }
        );
    }

    // Brand-specific parts (if LG)
    if (job.brand?.name === 'LG') {
        checklist.push(
            { id: 'lg-parts', item: 'LG Genuine Parts Catalog', checked: false }
        );
    }

    // General items
    checklist.push(
        { id: 'safety-gear', item: 'Safety Gear (Gloves, Goggles)', checked: false },
        { id: 'cleaning-cloth', item: 'Cleaning Cloth', checked: false },
        { id: 'invoice-book', item: 'Invoice Book', checked: false }
    );

    return checklist;
};

/**
 * Group jobs by different criteria
 */
export const groupJobsBy = (jobs, groupBy) => {
    const grouped = {};

    jobs.forEach(job => {
        let key;

        switch (groupBy) {
            case 'assignee':
                key = job.technician?.name || job.technician_name || job.assignedToName || 'Unassigned';
                break;
            case 'status':
                key = job.status || 'unknown';
                break;
            case 'dueDate':
                const dueDateVal = job.scheduled_date || job.dueDate;
                if (!dueDateVal) {
                    key = 'No Due Date';
                } else {
                    const dueDate = new Date(dueDateVal);
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    if (dueDate < today && dueDate.toDateString() !== today.toDateString()) {
                        key = 'Overdue';
                    } else if (dueDate.toDateString() === today.toDateString()) {
                        key = 'Today';
                    } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                        key = 'Tomorrow';
                    } else {
                        key = formatDate(dueDate);
                    }
                }
                break;
            case 'locality':
                key = getLocalityFromAddress(job.property?.address) || 'Unknown';
                break;
            default:
                key = 'All';
        }

        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(job);
    });

    return grouped;
};

/**
 * Filter jobs based on search and filters
 */
export const filterJobs = (jobs, { searchTerm, status, dateRange, assignee }) => {
    let filtered = [...jobs];

    // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(job =>
            (job.description || job.jobName || '').toLowerCase().includes(term) ||
            (job.job_number || '').toLowerCase().includes(term) ||
            (job.customer?.name || '').toLowerCase().includes(term) ||
            getLocalityFromAddress(job.property?.address).toLowerCase().includes(term) ||
            (job.technician?.name || job.assignedToName || '').toLowerCase().includes(term)
        );
    }

    // Status filter
    if (status && status !== 'all') {
        filtered = filtered.filter(job => job.status === status);
    }

    // Assignee filter
    if (assignee && assignee !== 'all') {
        // Assume assignee filter passes an ID or name
        filtered = filtered.filter(job =>
            (job.technician_id === assignee) ||
            (job.technician?.name === assignee)
        );
    }

    // Date range filter
    if (dateRange?.start && dateRange?.end) {
        filtered = filtered.filter(job => {
            const dateStr = job.scheduled_date || job.dueDate;
            if (!dateStr) return false;
            const jobDate = new Date(dateStr);
            return jobDate >= dateRange.start && jobDate <= dateRange.end;
        });
    }

    return filtered;
};

/**
 * Sort jobs
 */
export const sortJobs = (jobs, sortBy, sortOrder = 'asc') => {
    const sorted = [...jobs];

    sorted.sort((a, b) => {
        let aVal, bVal;

        switch (sortBy) {
            case 'dueDate':
                aVal = new Date(a.scheduled_date || a.dueDate || 0);
                bVal = new Date(b.scheduled_date || b.dueDate || 0);
                break;
            case 'createdAt':
                aVal = new Date(a.created_at || a.createdAt || 0);
                bVal = new Date(b.created_at || b.createdAt || 0);
                break;
            case 'jobName':
                aVal = (a.description || a.jobName || '').toLowerCase();
                bVal = (b.description || b.jobName || '').toLowerCase();
                break;
            case 'customer':
                aVal = (a.customer?.name || '').toLowerCase();
                bVal = (b.customer?.name || '').toLowerCase();
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
    const colors = {
        'pending': '#f59e0b',
        'assigned': '#3b82f6',
        'in-progress': '#8b5cf6',
        'completed': '#10b981',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
};

/**
 * Check if date is overdue
 */
export const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const dateObj = new Date(dueDate);
    const today = new Date();
    // Only count as overdue if it's strictly before today (yesterday or earlier)
    // If it is today, it's not overdue yet usually, but strict inequality < today includes earlier today.
    // Let's use start of day comparison to be safe, or just raw formatting.
    // Simple comparison:
    return dateObj < today;
};
