// Technician sub-app layout.
// Overrides the root layout's manifest so that "Add to Home Screen"
// on any /technician/* page installs with start_url="/technician".
export const metadata = {
    title: 'Sorted Solutions – Technician Portal',
    description: 'Manage your assigned jobs on the go',
    manifest: '/manifest-technician.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Tech Portal',
    },
}

export default function TechnicianLayout({ children }) {
    return children
}
