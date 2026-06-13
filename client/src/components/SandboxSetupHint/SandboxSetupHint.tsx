import React from 'react'
import './SandboxSetupHint.css'

export interface SandboxSetupHintProps {
  label: string
  style?: React.CSSProperties
  className?: string
  /** Horizontal alignment at the anchor point. */
  anchor?: 'left' | 'center' | 'right'
  /** Board overlay: above anchor. Footer: static row below imperium row. */
  placement?: 'above' | 'inline'
}

const SandboxSetupHint: React.FC<SandboxSetupHintProps> = ({
  label,
  style,
  className,
  anchor = 'right',
  placement,
}) => (
  <div
    className={[
      'sandbox-setup-hint',
      anchor === 'left' ? 'sandbox-setup-hint--anchor-left' : '',
      anchor === 'center' ? 'sandbox-setup-hint--anchor-center' : '',
      placement === 'above' ? 'sandbox-setup-hint--placement-above' : '',
      placement === 'inline' ? 'sandbox-setup-hint--inline' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    style={style}
    role="note"
  >
    <span className="sandbox-setup-hint__icon" aria-hidden="true">
      i
    </span>
    <span className="sandbox-setup-hint__text">{label}</span>
  </div>
)

export default SandboxSetupHint
