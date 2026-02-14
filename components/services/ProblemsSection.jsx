'use client'

import { CheckCircle } from 'lucide-react'
import './ProblemsSection.css'

export default function ProblemsSection({
    title = "We Solve All The Problems",
    subtitle = "Common issues we fix",
    problems = []
}) {
    return (
        <section className="problems-section">
            <div className="problems-header">
                <h2 className="problems-title">{title}</h2>
                {subtitle && <p className="problems-subtitle">{subtitle}</p>}
            </div>

            <div className="problems-grid">
                {problems.map((problem, index) => (
                    <div
                        key={index}
                        className="problem-item"
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <CheckCircle size={20} className="check-icon" />
                        <span className="problem-text">{problem}</span>
                    </div>
                ))}
            </div>

            <div className="problems-cta">
                <p className="cta-text">
                    Don't see your issue listed? <strong>We can help with that too!</strong>
                </p>
                <p className="cta-subtext">
                    Our expert technicians are trained to handle all types of appliance problems
                </p>
            </div>
        </section>
    )
}
