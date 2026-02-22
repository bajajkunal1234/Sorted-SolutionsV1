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
                {problems.map((problem, index) => {
                    const isObject = typeof problem === 'object' && problem !== null;
                    const titleValue = isObject ? (problem.problem_title || problem.title || problem.question) : problem;
                    const descValue = isObject ? (problem.problem_description || problem.description || problem.answer) : null;

                    return (
                        <div
                            key={index}
                            className="problem-item"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="problem-content-wrapper">
                                <div className="problem-main">
                                    <CheckCircle size={20} className="check-icon" />
                                    <span className="problem-text">{titleValue}</span>
                                </div>
                                {descValue && (
                                    <p className="problem-description">{descValue}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
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
