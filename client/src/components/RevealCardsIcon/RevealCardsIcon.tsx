import React from 'react'
import './RevealCardsIcon.css'

/** Fanned card backs from the TurnControls Reveal slot. */
export default function RevealCardsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={['reveal-cards-icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 32 40"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="rgba(255,255,255,0.07)" stroke="currentColor" strokeWidth="1.2">
        <rect x="3.5" y="6" width="18" height="26" rx="2.2" transform="rotate(-7 12.5 19)" />
        <rect x="7" y="5.5" width="18" height="26" rx="2.2" />
        <rect x="10.5" y="6" width="18" height="26" rx="2.2" transform="rotate(7 19.5 19)" />
      </g>
    </svg>
  )
}
