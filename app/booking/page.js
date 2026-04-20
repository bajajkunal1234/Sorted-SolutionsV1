
import { Suspense } from 'react';
import BookingWizard from '@/components/booking/BookingWizard';
import Header from '@/components/common/Header';
import FooterSection from '@/components/homepage/FooterSection';

export const metadata = {
    title: 'Book a Service | Sorted Solutions',
    description: 'Book a professional technician for your home appliance repair needs.',
    alternates: { canonical: '/booking' },
};

export default function BookingPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <Header />

            <main style={{ flexGrow: 1, padding: 'var(--spacing-2xl) var(--spacing-md)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
                        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
                            Complete Your Booking
                        </h1>
                        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>
                            You're just a few steps away from a fixed appliance.
                        </p>
                    </div>

                    <Suspense fallback={<div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>Loading booking details...</div>}>
                        <BookingWizard />
                    </Suspense>
                </div>
            </main>

            <FooterSection />
        </div>
    );
}
