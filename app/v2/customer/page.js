import V2CustomerPortal from '@/components/v2/V2CustomerPortal';

export const dynamic = 'force-dynamic';

export default function V2CustomerPage({ searchParams }) {
    const initialTab = searchParams?.tab || 'bookings';
    return <V2CustomerPortal initialTab={initialTab} />;
}
