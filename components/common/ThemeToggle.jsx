'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import './ThemeToggle.css'

export default function ThemeToggle() {
    const [theme, setTheme] = useState('dark') // Default matching RootLayout

    useEffect(() => {
        // Initialize from localStorage or document attribute
        const storedTheme = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'dark'
        setTheme(storedTheme)
        document.documentElement.setAttribute('data-theme', storedTheme)
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
    }

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className={`theme-toggle-icon ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </div>
        </button>
    )
}
