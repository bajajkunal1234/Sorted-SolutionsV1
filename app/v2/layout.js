import './v2.css';
import V2Shell from '@/components/v2/V2Shell';

export const metadata = {
    title: 'Sorted Solutions | Appliance Repair & Home Services in Mumbai',
    description:
        'Book certified AC, Washing Machine, Refrigerator, Microwave, Water Purifier & Hob repair in Mumbai with upfront GST pricing and 30-day warranty.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default function V2Layout({ children }) {
    return <V2Shell>{children}</V2Shell>;
}
