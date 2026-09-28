import React from 'react'
import './FamilyAtomicsButton.css'

interface FamilyAtomicsButtonProps {
  disabled?: boolean
  used?: boolean
  onClick: () => void
  /** `turn` matches Play/Intrigue/Tech. `birdseye` matches the seat utility buttons. */
  variant?: 'turn' | 'birdseye'
}

const FamilyAtomicsButton: React.FC<FamilyAtomicsButtonProps> = ({
  disabled,
  used,
  onClick,
  variant = 'turn',
}) => {
  const title = used
    ? 'Family Atomics already used this game'
    : 'Family Atomics: refresh the Imperium Row (once per game)'

  const className =
    variant === 'birdseye'
      ? 'birdseye-seat-btn birdseye-seat-btn--atomics'
      : 'selected-card-inline-slot selected-card-action-placeholder selected-card-action-placeholder--atomics'

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <img src="/icon/atomic.png" alt="" className="family-atomics-button__icon" decoding="sync" />
    </button>
  )
}

export default FamilyAtomicsButton
