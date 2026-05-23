// Customer sub-app layout.
// Overrides the root layout's manifest so that "Add to Home Screen"
// on any /customer/* page installs with start_url="/customer".
export const metadata = {
    title: 'Sorted Solutions – My Account',
    description: 'Track your Sorted Solutions bookings and service history',
    manifest: '/manifest-customer.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'My Account',
    },
}

export default function CustomerLayout({ children }) {
    return children
}
