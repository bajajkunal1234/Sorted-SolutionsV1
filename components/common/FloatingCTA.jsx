'use client'

/**
 * FloatingCTA — Premium animated floating action buttons
 * Only renders on public-facing pages. Hidden on /admin, /technician,
 * /customer, /login, /sitemap-page and any other internal routes.
 */

import { usePathname } from 'next/navigation'

const PHONE  = '+918928895590'
const WA_MSG = encodeURIComponent('Hi! I want to book a repair service. Can you help me?')
const WA_URL = `https://wa.me/${PHONE.replace('+', '')}?text=${WA_MSG}`

// Routes (prefix-matched) where the buttons should NOT appear
const HIDDEN_PREFIXES = ['/admin', '/technician', '/customer', '/login', '/sitemap-page']

/* ── Inline SVGs ─────────────────────────────────────────────────────────── */

/* Official WhatsApp mark (simplified) */
const WaIcon = () => (
    <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.362.626 4.67 1.815 6.695L2.667 29.333l6.817-1.786A13.267 13.267 0 0016 29.333c7.364 0 13.333-5.97 13.333-13.333S23.364 2.667 16 2.667zm0 24.266a11.04 11.04 0 01-5.63-1.542l-.402-.24-4.047 1.059 1.08-3.936-.265-.415A10.932 10.932 0 015.002 16C5.002 9.925 9.925 5 16 5s11 4.925 11 11-4.925 11-11 11zm6.03-8.226c-.33-.166-1.952-.964-2.255-1.073-.303-.11-.524-.165-.744.165-.22.33-.854 1.073-1.047 1.293-.193.22-.385.247-.715.082-.33-.165-1.393-.514-2.654-1.638-.981-.874-1.643-1.953-1.836-2.284-.193-.33-.02-.507.144-.672.149-.147.33-.385.495-.578.165-.192.22-.33.33-.55.11-.22.055-.413-.027-.578-.082-.165-.744-1.8-1.02-2.465-.27-.648-.542-.56-.744-.57-.192-.01-.413-.013-.633-.013-.22 0-.578.082-.88.412-.304.33-1.157 1.131-1.157 2.757 0 1.626 1.185 3.198 1.35 3.42.165.22 2.333 3.563 5.652 4.996.79.34 1.406.545 1.887.696.793.252 1.515.217 2.085.132.636-.096 1.953-.798 2.229-1.569.275-.77.275-1.431.193-1.57-.083-.138-.303-.22-.633-.385z"/>
    </svg>
)

/* Ringing phone — receiver shape as a filled path */
const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="fcta-phone-svg">
        <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
    </svg>
)

/* Sound-wave arcs drawn inside the call FAB */
const SoundWaves = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.8" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true" className="fcta-waves-svg">
        <path d="M16.5 11.5a4.5 4.5 0 0 0 0-3"/>
        <path d="M19.5 13a7.5 7.5 0 0 0 0-6"/>
    </svg>
)

/* ── Component ───────────────────────────────────────────────────────────── */
export default function FloatingCTA() {
    const pathname = usePathname()

    // Don't render on any internal/app route
    if (HIDDEN_PREFIXES.some(prefix => pathname?.startsWith(prefix))) return null

    return (
        <>
            <style>{`
                /* ── Wrapper — spans full bottom edge ─────── */
                .fcta-wrap {
                    position: fixed;
                    bottom: 32px;
                    left: 0;
                    right: 0;
                    z-index: 9990;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding: 0 20px;
                    pointer-events: none;
                }

                /* ── Shared row ───────────────────────────── */
                .fcta-row {
                    pointer-events: all;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-decoration: none;
                    cursor: pointer;
                }

                /* WA on left  →  [●FAB] [label] */
                .fcta-wa  { flex-direction: row; }
                /* Call on right → [label] [●FAB] */
                .fcta-call { flex-direction: row; }

                /* ── Label pill ───────────────────────────── */
                .fcta-lbl {
                    font-family: 'Outfit', sans-serif;
                    font-size: 13.5px;
                    font-weight: 800;
                    letter-spacing: 0.01em;
                    white-space: nowrap;
                    padding: 9px 18px;
                    border-radius: 999px;
                    color: #fff;
                    box-shadow: 0 4px 18px rgba(0,0,0,0.22);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                }

                /* WA label slides RIGHT (away from left-anchored FAB) */
                .fcta-wa:hover .fcta-lbl {
                    transform: translateX(4px);
                    box-shadow: 0 8px 28px rgba(0,0,0,0.28);
                }
                /* Call label slides LEFT (away from right-anchored FAB) */
                .fcta-call:hover .fcta-lbl {
                    transform: translateX(-4px);
                    box-shadow: 0 8px 28px rgba(0,0,0,0.28);
                }

                .fcta-wa  .fcta-lbl { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
                .fcta-call .fcta-lbl { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }

                /* ── Circular FAB ─────────────────────────── */
                .fcta-fab {
                    position: relative;
                    width: 62px;
                    height: 62px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 8px 28px rgba(0,0,0,0.3);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    overflow: visible;
                }

                .fcta-row:hover .fcta-fab {
                    transform: scale(1.1);
                    box-shadow: 0 14px 40px rgba(0,0,0,0.38);
                }
                .fcta-row:active .fcta-fab { transform: scale(0.95); }

                /* WhatsApp — green radial */
                .fcta-wa .fcta-fab {
                    background: radial-gradient(circle at 35% 30%, #4ade80, #22c55e 45%, #15803d);
                    animation: fcta-wa-breathe 3s ease-in-out infinite;
                }

                /* Call — blue radial */
                .fcta-call .fcta-fab {
                    background: radial-gradient(circle at 35% 30%, #60a5fa, #3b82f6 45%, #1e40af);
                }

                /* Inner glow disc (creates depth) */
                .fcta-fab-inner {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* ── Sonar rings ──────────────────────────── */
                /* Two concentric expanding rings behind each FAB */
                .fcta-fab::before,
                .fcta-fab::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1;
                }

                /* WhatsApp rings */
                .fcta-wa .fcta-fab::before {
                    border: 2.5px solid rgba(34, 197, 94, 0.65);
                    animation: fcta-sonar 2.6s ease-out infinite;
                }
                .fcta-wa .fcta-fab::after {
                    border: 2px solid rgba(34, 197, 94, 0.4);
                    animation: fcta-sonar 2.6s ease-out infinite 0.9s;
                }

                /* Call rings */
                .fcta-call .fcta-fab::before {
                    border: 2.5px solid rgba(59, 130, 246, 0.7);
                    animation: fcta-sonar 2.4s ease-out infinite;
                }
                .fcta-call .fcta-fab::after {
                    border: 2px solid rgba(59, 130, 246, 0.4);
                    animation: fcta-sonar 2.4s ease-out infinite 0.8s;
                }

                @keyframes fcta-sonar {
                    0%   { transform: scale(1);   opacity: 1;   }
                    100% { transform: scale(2.1); opacity: 0;   }
                }

                /* ── WhatsApp icon: breathe ───────────────── */
                @keyframes fcta-wa-breathe {
                    0%, 100% { box-shadow: 0 8px 28px rgba(0,0,0,0.3),  0 0 0  0  rgba(34,197,94,0.4); }
                    50%       { box-shadow: 0 8px 28px rgba(0,0,0,0.22), 0 0 0 10px rgba(34,197,94,0);  }
                }

                /* ── Phone icon: ringing shake ────────────── */
                .fcta-phone-svg {
                    animation: phone-ring 3.5s ease-in-out infinite;
                    transform-origin: center;
                    display: block;
                }

                @keyframes phone-ring {
                    0%,  55%, 100% { transform: rotate(0deg) scale(1);      }
                    58%            { transform: rotate(-20deg) scale(1.12);  }
                    62%            { transform: rotate(20deg) scale(1.12);   }
                    66%            { transform: rotate(-16deg) scale(1.08);  }
                    70%            { transform: rotate(16deg) scale(1.08);   }
                    74%            { transform: rotate(-10deg) scale(1.04);  }
                    78%            { transform: rotate(10deg) scale(1.04);   }
                    82%            { transform: rotate(-5deg) scale(1.02);   }
                    86%            { transform: rotate(0deg) scale(1);       }
                }

                /* Sound-wave SVG: fades in during ring animation */
                .fcta-waves-svg {
                    position: absolute;
                    right: 7px;
                    top: 50%;
                    transform: translateY(-50%);
                    animation: waves-show 3.5s ease-in-out infinite;
                }

                @keyframes waves-show {
                    0%,  50%, 100% { opacity: 0; }
                    60%, 80%       { opacity: 1; }
                }

                /* ── Mobile ───────────────────────────────── */
                @media (max-width: 480px) {
                    .fcta-wrap {
                        bottom: 72px;   /* above Android browser nav bar */
                        padding: 0 12px;
                    }
                    .fcta-fab {
                        width: 54px;
                        height: 54px;
                    }
                    .fcta-fab-inner svg {
                        width: 24px;
                        height: 24px;
                    }
                    .fcta-lbl {
                        font-size: 12px;
                        padding: 8px 14px;
                    }
                }
            `}</style>

            <div className="fcta-wrap" aria-label="Quick contact options">

                {/* ── WhatsApp ──────────────────────────────── */}
                <a
                    href={WA_URL}
                    className="fcta-row fcta-wa"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Get A Quote on WhatsApp"
                    title="Get a quote on WhatsApp — we reply instantly!"
                >
                    <div className="fcta-fab">
                        <span className="fcta-fab-inner"><WaIcon /></span>
                    </div>
                    <span className="fcta-lbl">Get A Quote</span>
                </a>

                {/* ── Call ─────────────────────────────────── */}
                {/*
                    href="tel:+918928895590" — Google Ads GFN compatible.
                    id="floating-call-btn"  — use as GTM click trigger target.
                */}
                <a
                    href={`tel:${PHONE}`}
                    className="fcta-row fcta-call"
                    aria-label="Book Technician in 60s"
                    title="Book a technician in 60 seconds — same-day service!"
                    id="floating-call-btn"
                >
                    <span className="fcta-lbl">Book Technician in 60s</span>
                    <div className="fcta-fab">
                        <span className="fcta-fab-inner">
                            <PhoneIcon />
                            <SoundWaves />
                        </span>
                    </div>
                </a>

            </div>
        </>
    )
}
