import MobileHomepage from '@/components/homepage/MobileHomepage'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'

export default async function Home() {
    const bookingData = await fetchQuickBookingData();
    return <MobileHomepage initialBookingData={bookingData} />
}
