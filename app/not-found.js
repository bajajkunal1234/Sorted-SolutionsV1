import Link from 'next/link'
import Header from '@/components/common/Header'
import ServiceFooter from '@/components/services/ServiceFooter'
import CallToBookButton from '@/app/CallToBookButton'

const SERVICES = [
    { label: '❄️ AC Repair',              href: '/services/ac-repair' },
    { label: '🌀 Washing Machine Repair',  href: '/services/washing-machine-repair' },
    { label: '🧊 Refrigerator Repair',    href: '/services/refrigerator-repair' },
    { label: '🔥 Oven / Microwave Repair', href: '/services/oven-repair' },
    { label: '💧 Water Purifier Repair',  href: '/services/water-purifier-repair' },
    { label: '🍳 HOB / Gas Stove Repair', href: '/services/hob-repair' },
]

export const metadata = {
    title: 'Page Not Found | Sorted Solutions',
    description: 'The page you are looking for could not be found. Book an appliance repair service or call us directly.',
}

export default function NotFound() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            <Header />

            <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
                <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>

                    {/* 404 badge */}
                    <div style={{
                        display: 'inline-block',
                        fontSize: '72px', fontWeight: 900,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        lineHeight: 1, marginBottom: '16px'
                    }}>404</div>

                    <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
                        This page doesn't exist
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 36px', lineHeight: 1.6 }}>
                        The link may be broken or the page may have moved. You can head back home or book a service directly below.
                    </p>

                    {/* Primary CTAs */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
                        <Link
                            href="/"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '12px 24px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#fff', fontWeight: 700, fontSize: '15px',
                                textDecoration: 'none'
                            }}
                        >
                            🏠 Back to Home
                        </Link>
                        <CallToBookButton />
                    </div>

                    {/* Service quick links */}
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '12px',
                        padding: '24px',
                        textAlign: 'left'
                    }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
                            Or pick a service
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {SERVICES.map(s => (
                                <Link
                                    key={s.href}
                                    href={s.href}
                                    style={{
                                        display: 'block',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        transition: 'border-color 0.15s ease'
                                    }}
                                >
                                    {s.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            <ServiceFooter />
        </div>
    )
}
