'use client'

import QuickBookingForm from '../homepage/QuickBookingForm';

/**
 * Standardized Quick Booking Embed for service/location pages.
 * Receives server-fetched `initialData` so subtitle/category are
 * correct on first paint — no flash of stale defaults.
 */
export default function QuickBookingEmbed({ preSelectedCategory, preSelectedSubcategoryId, initialData }) {
    return (
        <section
            className="booking-embed-section"
            style={{
                padding: 'var(--spacing-xl) 0',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                margin: 'var(--spacing-xl) 0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
        >
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 var(--spacing-md)' }}>
                <QuickBookingForm
                    preSelectedCategory={preSelectedCategory}
                    preSelectedSubcategoryId={preSelectedSubcategoryId}
                    initialData={initialData}
                />
            </div>
        </section>
    );
}
