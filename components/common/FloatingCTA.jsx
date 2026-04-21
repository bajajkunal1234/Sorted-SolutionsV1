'use client'

/**
 * FloatingCTA
 *
 * Renders two persistent floating action buttons in the bottom-right corner
 * of every public-facing page:
 *
 *  1. 📞 Call  — uses href="tel:+918928895590" which Google Ads / GFN can
 *                track and attribute as a call conversion.
 *  2. 💬 WhatsApp — opens wa.me with a pre-filled message.
 *
 * Both buttons have subtle animations designed to catch the visitor's eye
 * without being intrusive.
 */

const PHONE     = '+918928895590'
const WA_MSG    = encodeURIComponent('Hi! I need help with an appliance repair. Can you please assist?')
const WA_URL    = `https://wa.me/${PHONE.replace('+', '')}?text=${WA_MSG}`

export default function FloatingCTA() {
    return (
        <>
            <style>{`
                /* ── Container ─────────────────────────────── */
                .fcta-wrap {
                    position: fixed;
                    bottom: 28px;
                    right: 22px;
                    z-index: 9990;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 14px;
                    pointer-events: none;   /* children opt-in individually */
                }

                /* ── Shared pill ────────────────────────────── */
                .fcta-btn {
                    pointer-events: all;
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    padding: 13px 20px 13px 16px;
                    border-radius: 999px;
                    border: none;
                    cursor: pointer;
                    font-family: 'Outfit', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.01em;
                    text-decoration: none;
                    color: #ffffff;
                    box-shadow: 0 6px 24px rgba(0,0,0,0.25);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    white-space: nowrap;
                }

                .fcta-btn:hover {
                    transform: translateY(-3px) scale(1.04);
                    box-shadow: 0 12px 36px rgba(0,0,0,0.3);
                }

                .fcta-btn:active {
                    transform: scale(0.97);
                }

                /* Ripple shimmer on hover */
                .fcta-btn::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.18) 60%, transparent 80%);
                    background-size: 200% 100%;
                    background-position: 200% 0;
                    transition: background-position 0.55s ease;
                    pointer-events: none;
                }
                .fcta-btn:hover::after {
                    background-position: -200% 0;
                }

                /* ── Icon wrapper ───────────────────────────── */
                .fcta-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.18);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 17px;
                    line-height: 1;
                }

                /* ── Call button — deep green ───────────────── */
                .fcta-call {
                    background: linear-gradient(135deg, #1a7f5a 0%, #0f5e3e 100%);
                    animation: fcta-bounce 3.2s ease-in-out infinite;
                }

                /* ── WhatsApp button — WhatsApp green ──────── */
                .fcta-wa {
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    animation: fcta-bounce 3.2s ease-in-out infinite 0.5s;
                }

                /* ── Pulse ring around each button ──────────── */
                .fcta-btn::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 999px;
                    opacity: 0;
                    pointer-events: none;
                }
                .fcta-call::before {
                    box-shadow: 0 0 0 0 rgba(26,127,90,0.55);
                    animation: fcta-pulse-call 2.8s ease-out infinite;
                }
                .fcta-wa::before {
                    box-shadow: 0 0 0 0 rgba(37,211,102,0.55);
                    animation: fcta-pulse-wa 2.8s ease-out infinite 0.7s;
                }

                /* Bounce — gentle float up/down */
                @keyframes fcta-bounce {
                    0%, 100% { transform: translateY(0);    }
                    45%       { transform: translateY(-6px); }
                    55%       { transform: translateY(-6px); }
                }

                /* Pulse ring — call */
                @keyframes fcta-pulse-call {
                    0%   { box-shadow: 0 0 0 0   rgba(26,127,90,0.6); opacity: 1; }
                    70%  { box-shadow: 0 0 0 18px rgba(26,127,90,0);  opacity: 0; }
                    100% { box-shadow: 0 0 0 0   rgba(26,127,90,0);  opacity: 0; }
                }

                /* Pulse ring — WhatsApp */
                @keyframes fcta-pulse-wa {
                    0%   { box-shadow: 0 0 0 0   rgba(37,211,102,0.6); opacity: 1; }
                    70%  { box-shadow: 0 0 0 18px rgba(37,211,102,0);  opacity: 0; }
                    100% { box-shadow: 0 0 0 0   rgba(37,211,102,0);  opacity: 0; }
                }

                /* ── Label text ─────────────────────────────── */
                .fcta-label {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.2;
                }
                .fcta-label-main {
                    font-size: 14px;
                    font-weight: 800;
                }
                .fcta-label-sub {
                    font-size: 10px;
                    font-weight: 500;
                    opacity: 0.82;
                    letter-spacing: 0.03em;
                }

                /* ── Mobile: icon-only circles ─────────────── */
                /* 90% of visitors are on mobile — keep buttons compact so
                   they don't cover page content, but still unmissable */
                @media (max-width: 480px) {
                    .fcta-wrap {
                        bottom: 72px;   /* clear of Android bottom nav bar */
                        right: 14px;
                        gap: 12px;
                    }
                    /* Collapse pill → circle */
                    .fcta-btn {
                        width: 56px;
                        height: 56px;
                        padding: 0;
                        justify-content: center;
                        border-radius: 50%;
                    }
                    /* Hide text labels — icon only */
                    .fcta-label {
                        display: none;
                    }
                    /* Bigger icon to fill the circle */
                    .fcta-icon {
                        width: 44px;
                        height: 44px;
                        background: transparent;
                        font-size: 22px;
                    }
                    .fcta-icon svg {
                        width: 24px;
                        height: 24px;
                    }
                }
            `}</style>

            <div className="fcta-wrap" aria-label="Quick contact options">

                {/* ── WhatsApp ────────────────────────────────── */}
                <a
                    href={WA_URL}
                    className="fcta-btn fcta-wa"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat with us on WhatsApp"
                    title="WhatsApp us — we reply instantly!"
                >
                    <span className="fcta-icon" aria-hidden="true">
                        {/* WhatsApp SVG icon */}
                        <svg viewBox="0 0 32 32" width="18" height="18" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.004 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.363.627 4.672 1.817 6.698L2.667 29.333l6.82-1.787A13.267 13.267 0 0016.004 29.333c7.367 0 13.33-5.97 13.33-13.333 0-7.363-5.963-13.333-13.33-13.333zm0 24.267a11.04 11.04 0 01-5.63-1.543l-.403-.24-4.048 1.06 1.08-3.937-.264-.416A10.932 10.932 0 015.004 16c0-6.075 4.924-11 10.999-11C22.08 5 27.004 9.925 27.004 16c0 6.074-4.924 11-11 11zm6.03-8.227c-.33-.165-1.953-.964-2.256-1.073-.304-.11-.524-.165-.745.165-.22.33-.854 1.073-1.047 1.293-.192.22-.385.247-.715.082-.33-.165-1.394-.514-2.655-1.638-.981-.874-1.644-1.954-1.836-2.284-.193-.33-.02-.508.144-.672.149-.147.33-.385.495-.578.165-.192.22-.33.33-.55.11-.22.055-.413-.027-.578-.083-.165-.745-1.8-1.02-2.466-.27-.647-.543-.56-.745-.57-.192-.01-.413-.013-.633-.013-.22 0-.578.082-.88.412-.304.33-1.157 1.131-1.157 2.757 0 1.627 1.185 3.199 1.35 3.42.165.22 2.333 3.564 5.653 4.996.79.341 1.406.545 1.887.697.793.252 1.515.217 2.085.132.636-.096 1.953-.798 2.229-1.57.275-.77.275-1.432.192-1.57-.082-.138-.303-.22-.633-.385z"/>
                        </svg>
                    </span>
                    <span className="fcta-label">
                        <span className="fcta-label-main">WhatsApp Us</span>
                        <span className="fcta-label-sub">We reply instantly!</span>
                    </span>
                </a>

                {/* ── Call ─────────────────────────────────────── */}
                {/*
                    IMPORTANT: href="tel:+918928895590"
                    This format is recognised by Google Ads for call conversion
                    tracking (GFN — Google Forwarding Number & call extensions).
                    The GTM trigger on your site already fires on tel: link clicks.
                */}
                <a
                    href={`tel:${PHONE}`}
                    className="fcta-btn fcta-call"
                    aria-label={`Call us at ${PHONE}`}
                    title="Call us now — same-day service available!"
                    id="floating-call-btn"
                >
                    <span className="fcta-icon" aria-hidden="true">
                        {/* Phone SVG */}
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 0 0 0 2.18 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/>
                        </svg>
                    </span>
                    <span className="fcta-label">
                        <span className="fcta-label-main">Call Now</span>
                        <span className="fcta-label-sub">Same-day service!</span>
                    </span>
                </a>

            </div>
        </>
    )
}
