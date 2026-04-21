'use client'

import { useState } from 'react'
import './IssuesSection.css'

/**
 * IssuesSection — shown on subcategory pages only.
 * Each issue card is clickable and pre-fills the QuickBookingForm
 * with the correct appliance, appliance type, and issue.
 *
 * issue shape: { id, name, subcategoryId, categoryId, price?, description?, image? }
 */
export default function IssuesSection({
    title = "Common Issues We Fix",
    subtitle = "Select an issue to instantly book a repair",
    issues = [],
    categoryId,
    subcategoryId,
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

                {/* ── Header ── */}
                <div className="issues-header">
                    <h2 className="issues-title">{title}</h2>
                    {subtitle && <p className="issues-subtitle">{subtitle}</p>}
                </div>

                {/* ── Cards Grid ── */}
                <div className="issues-grid">
                    {issues.map((issue, index) => {
                        const isSelected = selectedIssue === issue.id
                        const hasImage = !!issue.image
                        const hasPrice = !!issue.price
                        const hasDescription = !!issue.description

                        return (
                            <button
                                key={issue.id || index}
                                className={`issue-card ${isSelected ? 'issue-card--selected' : ''}`}
                                onClick={() => handleIssueClick(issue)}
                                style={{ animationDelay: `${index * 0.05}s` }}
                                aria-label={`Book repair for: ${issue.name}`}
                            >
                                {/* Selected checkmark badge */}
                                {isSelected && (
                                    <div className="issue-card__check">✓ Selected</div>
                                )}

                                {/* Image area */}
                                <div className="issue-card__image-wrap">
                                    {hasImage ? (
                                        <img
                                            src={issue.image}
                                            alt={issue.name}
                                            className="issue-card__image"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="issue-card__image-placeholder">
                                            <span className="issue-card__placeholder-icon">🔧</span>
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="issue-card__body">
                                    <div className="issue-card__title-row">
                                        <h3 className="issue-card__name">{issue.name}</h3>
                                        {hasPrice && (
                                            <div className="issue-card__price">
                                                <strong>{issue.price}</strong>
                                            </div>
                                        )}
                                    </div>
                                    {hasDescription && (
                                        <p className="issue-card__description">{issue.description}</p>
                                    )}
                                </div>

                                {/* CTA */}
                                <div className="issue-card__footer">
                                    <span className="issue-card__cta">
                                        {isSelected ? '✓ Booking Form Ready' : 'Book Now →'}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* ── Footer nudge ── */}
                <div className="issues-footer">
                    <span className="issues-footer-icon">💬</span>
                    <span>
                        Don't see your issue?&nbsp;
                        <strong>We handle all appliance problems</strong> — just book and our technician will diagnose it on-site.
                    </span>
                </div>
            </div>
        </section>
    )
}
