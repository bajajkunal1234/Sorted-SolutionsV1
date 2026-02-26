'use client'

import { useState } from 'react'
import './IssuesSection.css'

/**
 * IssuesSection — shown on subcategory pages only.
 * Each issue card is clickable and pre-fills the QuickBookingForm
 * with the correct appliance, appliance type, and issue.
 */
export default function IssuesSection({
    title = "Common Issues We Fix",
    subtitle = "Click any issue to instantly book a repair",
    issues = [],           // [{ id, name, subcategoryId, categoryId }]
    categoryId,            // booking category ID (number)
    subcategoryId,         // booking subcategory ID (number)
}) {
    const [selectedIssue, setSelectedIssue] = useState(null)

    const handleIssueClick = (issue) => {
        setSelectedIssue(issue.id)

        // Fire custom event so QuickBookingForm can pre-fill itself
        window.dispatchEvent(new CustomEvent('bookingPreselect', {
            detail: {
                categoryId: categoryId || issue.categoryId,
                subcategoryId: subcategoryId || issue.subcategoryId,
                issueId: issue.id,
                issueName: issue.name
            }
        }))

        // Scroll to the #booking section
        const bookingEl = document.getElementById('booking')
        if (bookingEl) {
            bookingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    if (!issues || issues.length === 0) return null

    return (
        <section className="issues-section" id="issues">
            <div className="issues-container">
                <div className="issues-header">
                    <h2 className="issues-title">{title}</h2>
                    {subtitle && <p className="issues-subtitle">{subtitle}</p>}
                </div>

                <div className="issues-grid">
                    {issues.map((issue, index) => (
                        <button
                            key={issue.id || index}
                            className={`issue-card ${selectedIssue === issue.id ? 'issue-card--selected' : ''}`}
                            onClick={() => handleIssueClick(issue)}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            <span className="issue-icon">🔧</span>
                            <span className="issue-name">{issue.name}</span>
                            <span className="issue-cta">Book Fix →</span>
                        </button>
                    ))}
                </div>

                <p className="issues-footer-text">
                    Don't see your issue? <strong>We handle all appliance problems</strong> — just book and our technician will diagnose it.
                </p>
            </div>
        </section>
    )
}
