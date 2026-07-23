import React from 'react'
import { BoardScopedModal } from '../BoardScopedModal'
import './SellMelangePopup.css'

interface SellMelangePopupProps {
  onClose: () => void
  onOptionSelect: (option: { spiceCost: number; solariReward: number }) => void
  playerSpice: number
}

const SellMelangePopup: React.FC<SellMelangePopupProps> = ({ onClose, onOptionSelect, playerSpice }) => {
  const options = [
    { spiceCost: 2, solariReward: 6 },
    { spiceCost: 3, solariReward: 8 },
    { spiceCost: 4, solariReward: 10 },
    { spiceCost: 5, solariReward: 12 },
  ]

  return (
    <BoardScopedModal isOpen overlayClassName="sell-melange-popup">
      <div className="sell-melange-content">
        <h2>Sell Melange</h2>
        <div className="options">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onOptionSelect(option)}
              disabled={playerSpice < option.spiceCost}
            >
              Sell {option.spiceCost} spice for {option.solariReward} solari
            </button>
          ))}
        </div>
        <button type="button" className="close-button modal-btn modal-btn--secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </BoardScopedModal>
  )
}

export default SellMelangePopup
