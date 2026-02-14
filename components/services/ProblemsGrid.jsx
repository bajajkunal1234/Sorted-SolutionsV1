'use client'

import './ProblemsGrid.css'

export default function ProblemsGrid({ title, problems }) {
    return (
        <section className="problems-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="problems-grid">
                    {problems.map((problem, idx) => (
                        <div key={idx} className="problem-card">
                            <span className="problem-icon">⚠️</span>
                            <p className="problem-text">{problem}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



