// Admin sub-app layout.
// Overrides the root layout's manifest so that "Add to Home Screen"
// on any /admin/* page installs with start_url="/admin".
export const metadata = {
    title: 'Sorted Solutions – Admin',
    description: 'Sorted Solutions admin management portal',
    manifest: '/manifest-admin.json',
    icons: {
        icon: '/favicon-charcoal.png',
        shortcut: '/favicon.ico',
        apple: '/icons/icon-192x192.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'SS Admin',
    },
}

export default function AdminLayout({ children }) {
    return children
}
