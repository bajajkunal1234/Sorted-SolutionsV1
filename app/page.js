import MobileHomepage from '@/components/homepage/MobileHomepage'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'
import CustomerRedirect from '@/components/common/CustomerRedirect'

export const dynamic = 'force-dynamic'

export const metadata = {
    alternates: {
        canonical: '/',
    },
}
export default async function Home() {
    const bookingData = await fetchQuickBookingData();
    return (
        <>
            {/* Auto-redirect logged-in customers to their dashboard */}
            <CustomerRedirect />
            <MobileHomepage initialBookingData={bookingData} />
        </>
    )
}
