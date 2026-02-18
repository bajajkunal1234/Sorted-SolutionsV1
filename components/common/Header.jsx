'use client'

import React from 'react'
import { Phone, User } from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import './Header.css'

const Header = () => {
    return (
        <header className="mobile-header">
            <div className="header-content">
                <Link href="/" className="logo">
                    <h1>SORTED SOLUTIONS</h1>
                </Link>
                <div className="header-actions">
                    <ThemeToggle />
                    <a href="tel:+918928895590" className="call-button" aria-label="Call us now">
                        <Phone size={18} />
                        <span>Call Now</span>
                    </a>
                    <Link href="/login" className="login-button" aria-label="Login">
                        <User size={18} />
                        <span>Login</span>
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header
