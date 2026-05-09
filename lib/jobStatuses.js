/**
 * jobStatuses.js — Single source of truth for the 9-status job lifecycle.
 * Imported by Admin, Technician, and Customer apps.
 */

// ── The 9 canonical DB status values ────────────────────────────────────────

export const JOB_STATUSES = {
    new_job_request: {
        label: 'New Job Request',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.25)',
        step: 0,
        desc: 'Your request has been received and is being reviewed.',
    },
    scheduled: {
        label: 'Scheduled',
        color: '#38bdf8',
        bg: 'rgba(56,189,248,0.12)',
        border: 'rgba(56,189,248,0.25)',
        step: 1,
        desc: 'Your appointment is confirmed. A technician will visit you soon.',
    },
    diagnosing_quoting: {
        label: 'Diagnosing & Quoting',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.12)',
        border: 'rgba(139,92,246,0.25)',
        step: 2,
        desc: 'Our technician is diagnosing the issue and preparing your estimate.',
    },
    quotation_sent: {
        label: 'Quotation Sent',
        color: '#a78bfa',
        bg: 'rgba(167,139,250,0.12)',
        border: 'rgba(167,139,250,0.25)',
        step: 3,
        desc: 'We\'ve sent you a cost estimate. Please review and approve below.',
    },
    parts_ordered: {
        label: 'Parts Ordered',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.12)',
        border: 'rgba(249,115,22,0.25)',
        step: 3,
        desc: 'A part has been ordered. Work will resume once it arrives.',
    },
    work_in_progress: {
        label: 'Work In Progress',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.25)',
        step: 4,
        desc: 'Repair work is actively in progress.',
    },
    cx_reschedule: {
        label: 'Cx Reschedule',
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.12)',
        border: 'rgba(6,182,212,0.25)',
        step: -1,
        desc: 'You have rescheduled this appointment. We\'ll confirm your new slot shortly.',
    },
    cancelled: {
        label: 'Cancelled',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.25)',
        step: -1,
        desc: 'This service request has been cancelled.',
    },
    closed: {
        label: 'Closed',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.25)',
        step: 5,
        desc: 'Your service is complete. Thank you for choosing Sorted!',
    },
};

// ── Sub-status badges for New Job Request (shown to admin only) ──────────────

export const SOURCE_LABELS = {
    customer_app:     { label: 'Customer Booking Request', color: '#38bdf8',  emoji: '🔵' },
    website_enquiry:  { label: 'Booking Enquiry',          color: '#f59e0b',  emoji: '🟡' },
    website_booking:  { label: 'Website Booking Request',  color: '#10b981',  emoji: '🟢' },
};

// ── Role permissions ─────────────────────────────────────────────────────────

/** Statuses a technician is allowed to manually set */
export const TECH_SETTABLE_STATUSES = [
    'scheduled',
    'diagnosing_quoting',
    'quotation_sent',
    'parts_ordered',
    'work_in_progress',
    'cx_reschedule',
];

/** Statuses only admin can set */
export const ADMIN_ONLY_STATUSES = [
    'new_job_request',
    'cancelled',
    'closed',
];

// ── Customer-facing filter groups ────────────────────────────────────────────

export const ACTIVE_STATUSES = [
    'new_job_request',
    'scheduled',
    'diagnosing_quoting',
    'quotation_sent',
    'parts_ordered',
    'work_in_progress',
    'cx_reschedule',
];

export const PAST_STATUSES = ['cancelled', 'closed'];

// ── Notification event types for each status transition ─────────────────────

export const STATUS_TO_EVENT = {
    new_job_request:    'booking_created_website',
    scheduled:          'job_scheduled',
    diagnosing_quoting: 'job_diagnosing',
    quotation_sent:     'quotation_sent',
    parts_ordered:      'parts_ordered',
    work_in_progress:   'work_in_progress',
    cx_reschedule:      'job_rescheduled_cx',
    cancelled:          'job_cancelled',
    closed:             'job_closed',
};

// ── Journey steps shown to customer ─────────────────────────────────────────

export const JOURNEY_STEPS = [
    { label: 'Received',   statusKey: 'new_job_request'    },
    { label: 'Scheduled',  statusKey: 'scheduled'          },
    { label: 'Diagnosing', statusKey: 'diagnosing_quoting' },
    { label: 'Estimate',   statusKey: 'quotation_sent'     },
    { label: 'Repairing',  statusKey: 'work_in_progress'   },
    { label: 'Closed',     statusKey: 'closed'             },
];

// ── Admin Kanban column order ────────────────────────────────────────────────

export const KANBAN_COLUMNS = [
    'new_job_request',
    'scheduled',
    'diagnosing_quoting',
    'quotation_sent',
    'parts_ordered',
    'work_in_progress',
    'cx_reschedule',
    'cancelled',
    'closed',
];

// ── Migration map: old status → new status ───────────────────────────────────
// Used for any in-memory normalisation on the frontend until DB migration runs.

export const LEGACY_STATUS_MAP = {
    'booking_request':   'new_job_request',
    'assigned':          'scheduled',
    'in-progress':       'work_in_progress',
    'in_progress':       'work_in_progress',
    'quotation-sent':    'quotation_sent',
    'spare-part-needed': 'parts_ordered',
    'spare_part_needed': 'parts_ordered',
    'completed':         'closed',
};

/**
 * Normalise a status value — maps any legacy string to the canonical 9-status value.
 * Safe to call on any job status before rendering.
 */
export function normaliseStatus(status) {
    if (!status) return 'new_job_request';
    return LEGACY_STATUS_MAP[status] || status;
}

/**
 * Get the display config for a status, with legacy normalisation.
 */
export function getStatusConfig(status) {
    const canonical = normaliseStatus(status);
    return JOB_STATUSES[canonical] || JOB_STATUSES.new_job_request;
}
