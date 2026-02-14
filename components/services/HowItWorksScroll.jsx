'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './HowItWorksScroll.css'

export default function HowItWorksScroll({
    title = "How It Works",
    subtitle = "Scroll through our simple process"
}) {
    const [stages, setStages] = useState([])
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef(null)

    useEffect(() => {
        fetch('/api/settings/how-it-works')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    setStages(data.data)
                }
            })
            .catch(error => console.error('Error fetching stages:', error))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <section className="how-it-works-scroll">
                <div className="scroll-header">
                    <h2 className="scroll-title">{title}</h2>
                    {subtitle && <p className="scroll-subtitle">{subtitle}</p>}
                </div>
                <div className="scroll-container-wrapper">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    useEffect(() => {
        checkScroll()
        window.addEventListener('resize', checkScroll)
        return () => window.removeEventListener('resize', checkScroll)
    }, [])

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setTimeout(checkScroll, 300)
        }
    }

    return (
        <section className="how-it-works-scroll">
            <div className="scroll-header">
                <h2 className="scroll-title">{title}</h2>
                {subtitle && <p className="scroll-subtitle">{subtitle}</p>}
            </div>

            <div className="scroll-wrapper">
                {canScrollLeft && (
                    <button
                        className="scroll-button scroll-left"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    className="scroll-container"
                    onScroll={checkScroll}
                >
                    {stages.map((stage, index) => (
                        <div key={stage.stage} className="scroll-card">
                            <div className="scroll-card-number">{stage.stage}</div>

                            <div className="scroll-card-icon">{stage.icon}</div>

                            <h3 className="scroll-card-title">{stage.title}</h3>
                            <p className="scroll-card-description">{stage.description}</p>

                            <div className="progress-indicator">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${((index + 1) / stages.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>

                {canScrollRight && (
                    <button
                        className="scroll-button scroll-right"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>

            <div className="scroll-dots">
                {stages.map((_, index) => (
                    <div key={index} className="dot"></div>
                ))}
            </div>
        </section>
    )
}
