import './globals.css'

export const metadata = {
    title: 'Sorted Solutions - Expert Appliance Repair Services',
    description: 'Professional repair services for AC, Refrigerator, Washing Machine, RO, Oven, and more. On-time service with 90-day warranty.',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-theme="dark">
            <body>{children}</body>
        </html>
    )
}
