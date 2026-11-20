
import { Suspense } from 'react';
import BookingWizard from '@/components/booking/BookingWizard';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';
import { cachedFetchQuickBookingData } from '@/lib/data/quickBookingData';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Book a Service | Sorted Solutions',
    description: 'Book a professional technician for your home appliance repair needs.',
    alternates: { canonical: '/booking' },
};

export default async function BookingPage() {
    let initialMetadata = null;
    try {
        const bookingData = await cachedFetchQuickBookingData();
        if (bookingData?.categories) {
            const cats = bookingData.categories || [];
            const subs = cats.flatMap(c => c.subcategories || []);
            const issues = subs.flatMap(s => s.issues || []);
            initialMetadata = { categories: cats, subcategories: subs, issues };
        }
    } catch (e) {
        console.error('Failed to pre-fetch quick booking data for /booking:', e);
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <Header />

            <main style={{ flexGrow: 1, padding: 'var(--spacing-2xl) var(--spacing-md)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Suspense fallback={<div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>Loading booking details...</div>}>
                        <BookingWizard initialMetadata={initialMetadata} />
                    </Suspense>
                </div>
            </main>

            <FooterSection />
        </div>
    );
}
