'use client'

import React, { useState, useEffect } from 'react'
import { Phone, User, Menu, X, ChevronDown, Shield } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from './ThemeToggle'
import './Header.css'

const NAV_LINKS = [
    {
        label: 'Services',
        children: [
            { label: 'AC Repair', href: '/services/ac-repair' },
            { label: 'Washing Machine', href: '/services/washing-machine-repair' },
            { label: 'Refrigerator', href: '/services/refrigerator-repair' },
            { label: 'Oven / Microwave', href: '/services/oven-repair' },
            { label: 'Water Purifier', href: '/services/water-purifier-repair' },
            { label: 'HOB / Gas Stove', href: '/services/hob-repair' },
        ]
    },
]

const Header = () => {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <>
            <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
                <div className="site-header__inner">

                    {/* ── Logo ── */}
                    <Link href="/" className="site-header__logo" aria-label="Sorted Solutions Home">
                        <div className="header-logo-wrap">
                            <Image
                                src="/logo-light.jpg"
                                alt="Sorted Solutions"
                                width={49}
                                height={49}
                                className="header-logo-img logo-light"
                                priority
                            />
                            <Image
                                src="/logo-dark.jpg"
                                alt="Sorted Solutions"
                                width={49}
                                height={49}
                                className="header-logo-img logo-dark"
                                priority
                            />
                        </div>
                        <div className="header-logo-text">
                            <span className="header-logo-name">Sorted<span className="header-logo-accent header-logo-name-solutions"> Solutions</span></span>
                        </div>
                    </Link>

                    {/* ── Desktop Nav ── */}
                    <nav className="site-header__nav" aria-label="Main navigation">
                        {NAV_LINKS.map((link) =>
                            link.children ? (
                                <div
                                    key={link.label}
                                    className="header-dropdown"
                                    onMouseEnter={() => setDropdownOpen(true)}
                                    onMouseLeave={() => setDropdownOpen(false)}
                                >
                                    <button className="header-nav-btn" aria-haspopup="true" aria-expanded={dropdownOpen}>
                                        {link.label}
                                        <ChevronDown size={14} className={`header-chevron ${dropdownOpen ? 'open' : ''}`} />
                                    </button>
                                    <div className={`header-dropdown__menu ${dropdownOpen ? 'visible' : ''}`}>
                                        <div className="header-dropdown__grid">
                                            {link.children.map(child => (
                                                <Link key={child.href} href={child.href} className="header-dropdown__item">
                                                    <span className="header-dropdown__dot" />
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link key={link.label} href={link.href} className="header-nav-btn">{link.label}</Link>
                            )
                        )}


                    </nav>

                    {/* ── Actions ── */}
                    <div className="site-header__actions">
                        <ThemeToggle />
                        <a href="tel:+918928895590" className="header-btn header-btn--call" aria-label="Call +91-8928895590">
                            <Phone size={16} />
                            <span>+91-8928895590</span>
                        </a>
                        <Link href="/login" className="header-btn header-btn--login" aria-label="Login">
                            <User size={16} />
                            <span className="header-btn-text">Login</span>
                        </Link>
                        <button
                            className="header-menu-toggle"
                            aria-label="Toggle menu"
                            onClick={() => setMobileOpen(v => !v)}
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Mobile drawer ── */}
            <div className={`header-mobile-drawer ${mobileOpen ? 'open' : ''}`}>
                <div className="header-mobile-drawer__inner">
                    <p className="header-mobile-section">Services</p>
                    {NAV_LINKS[0].children.map(child => (
                        <Link
                            key={child.href}
                            href={child.href}
                            className="header-mobile-link"
                            onClick={() => setMobileOpen(false)}
                        >
                            {child.label}
                        </Link>
                    ))}
                    <hr className="header-mobile-divider" />
                    <a href="tel:+918928895590" className="header-btn header-btn--call header-btn--full">
                        <Phone size={16} /> +91-8928895590
                    </a>
                    <Link href="/login" className="header-btn header-btn--login header-btn--full" onClick={() => setMobileOpen(false)}>
                        <User size={16} /> Login to Portal
                    </Link>
                </div>
            </div>
            {mobileOpen && <div className="header-mobile-overlay" onClick={() => setMobileOpen(false)} />}
        </>
    )
}

export default Header
