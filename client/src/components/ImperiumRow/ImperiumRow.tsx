import React, { useState } from 'react'
import { Card } from '../../types/GameTypes'
import './ImperiumRow.css'

interface ImperiumRowProps {
  cards: Card[]
  canAcquire: boolean
  persuasion: number
  alCount: number
  smfCount: number
  onAcquireArrakisLiaison: () => void
  onAcquireSpiceMustFlow: () => void
  onAcquireCard: (cardId: number) => void
}


const ImperiumRow: React.FC<ImperiumRowProps> = ({ cards, canAcquire, persuasion, alCount, smfCount, onAcquireArrakisLiaison, onAcquireSpiceMustFlow, onAcquireCard }) => {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <div className="imperium-section">
      <button 
        className="imperium-toggle-mobile"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={isVisible ? "Hide Imperium Row" : "Show Imperium Row"}
      >
        {isVisible ? "▲ Hide Imperium Row" : "▼ Show Imperium Row"}
      </button>
      {isVisible && (
        <>
          {/* Main imperium row cards - 5 cards */}
          <div className={`cards-grid main-cards ${!canAcquire ? 'no-buttons' : ''}`}>
            {cards.map((card) => (
              <div key={card.id} className={`imperium-card ${!canAcquire ? 'no-button' : ''}`} onClick={() => canAcquire && onAcquireCard?.(card.id)} >
                <img 
                  src={card.image}
                  alt={card.name}
                  className="card-image-ir"
                />
                {canAcquire && (
                  <button 
                    className="acquire-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAcquireCard?.(card.id)
                    }} 
                    disabled={!!(card.cost && card.cost > persuasion)}
                  >
                    Acquire
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Fixed cards row - 2 cards with counts */}
          <div className={`cards-grid fixed-cards-row ${!canAcquire ? 'no-buttons' : ''}`}>
            <div className={`imperium-card fixed-card ${!canAcquire ? 'no-button' : ''}`}>
              <img 
                src={'imperium_row/arrakis_liaison.avif'} 
                alt={'Arrakis Liaison'}
                className="card-image-ir"
              />
              <div className="count-display">
                Count: {alCount}
              </div>
              {canAcquire && (
                <button 
                  className="acquire-button"
                  onClick={() => onAcquireArrakisLiaison()} 
                  disabled={!!(2 > persuasion) || alCount === 0}
                >
                  Acquire
                </button>
              )}
            </div>
            <div className={`imperium-card fixed-card ${!canAcquire ? 'no-button' : ''}`}>
              <img 
                src={'imperium_row/spice_must_flow.avif'} 
                alt={'The Spice Must Flow'}
                className="card-image-ir"
              />
              <div className="count-display">
                Count: {smfCount}
              </div>
              {canAcquire && (
                <button 
                  className="acquire-button"
                  onClick={() => onAcquireSpiceMustFlow()} 
                  disabled={!!(9 > persuasion) || smfCount === 0}
                >
                  Acquire
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ImperiumRow