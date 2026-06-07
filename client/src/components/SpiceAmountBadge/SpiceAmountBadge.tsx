import type { CSSProperties } from 'react'
import './SpiceAmountBadge.css'

const SPICE_ICON = '/icon/spice.png'

export interface SpiceAmountBadgeProps {
  amount: number
  className?: string
  title?: string
  style?: CSSProperties
}

/** Spice resource icon with white amount centered on top. */
export function SpiceAmountBadge({ amount, className, title, style }: SpiceAmountBadgeProps) {
  if (amount <= 0) return null

  return (
    <span
      className={['spice-amount-badge', className].filter(Boolean).join(' ')}
      title={title ?? `Spice ${amount}`}
      style={style}
    >
      <img src={SPICE_ICON} alt="" className="spice-amount-badge__icon" aria-hidden />
      <span className="spice-amount-badge__amt">{amount}</span>
    </span>
  )
}
