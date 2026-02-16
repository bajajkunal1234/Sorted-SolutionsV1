'use client'

import { useState } from 'react';
import QuickBookingForm from '../homepage/QuickBookingForm';

/**
 * Standardized Quick Booking Embed for service/location pages.
 * Replaces the old form with the high-conversion homepage version.
 */
export default function QuickBookingEmbed({ preSelectedCategory, compact = false }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <section className="booking-embed-section" style={{
            padding: 'var(--spacing-xl) 0',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            margin: 'var(--spacing-xl) 0'
        }}>
            <div className="container">
                <QuickBookingForm preSelectedCategory={preSelectedCategory} />
            </div>

            <style jsx>{`
                .booking-embed-section {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }
                :global(.quick-booking-form) {
                    max-width: 800px;
                    margin: 0 auto;
                }
            `}</style>
        </section>
    );
}
