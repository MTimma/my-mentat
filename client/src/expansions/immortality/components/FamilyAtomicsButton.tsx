import React from 'react'
import './FamilyAtomicsButton.css'

interface FamilyAtomicsButtonProps {
  disabled?: boolean
  used?: boolean
  onClick: () => void
}

const FamilyAtomicsButton: React.FC<FamilyAtomicsButtonProps> = ({ disabled, used, onClick }) => {
  const title = used
    ? 'Family Atomics already used this game'
    : 'Family Atomics: refresh the Imperium Row (once per game)'

  return (
    <button
      type="button"
      className="family-atomics-button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <img src="icon/atomic.png" alt="" className="family-atomics-button__icon" decoding="sync" />
    </button>
  )
}

export default FamilyAtomicsButton
