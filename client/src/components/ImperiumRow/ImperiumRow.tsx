import React, { useState } from 'react'
import { Card } from '../../types/GameTypes'
import { getLeaderIconPath, LEADER_NAMES } from '../../data/leaders'
import './ImperiumRow.css'

interface HelenaRemovedCard {
  cardId: number
  playerId: number
  card: Card
}

interface ImperiumRowProps {
  cards: Card[]
  canAcquire: boolean
  persuasion: number
  alCount: number
  smfCount: number
  onAcquireArrakisLiaison: () => void
  onAcquireSpiceMustFlow: () => void
  onAcquireCard: (cardId: number) => void
  helenaRemovedCard?: HelenaRemovedCard | null
  activePlayerId?: number
}


const ImperiumRow: React.FC<ImperiumRowProps> = ({ cards, canAcquire, persuasion, alCount, smfCount, onAcquireArrakisLiaison, onAcquireSpiceMustFlow, onAcquireCard, helenaRemovedCard, activePlayerId }) => {
  const [isVisible, setIsVisible] = useState(true)
  const helenaSlotData =
    helenaRemovedCard?.card && helenaRemovedCard?.playerId === activePlayerId
      ? helenaRemovedCard
      : null

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
        <div className="imperium-row-layout">
          {/* Primary strip: Helena (optional) + 5 Imperium row cards — single horizontal row, scales to viewport */}
          <div
            className={`imperium-row-primary ${!canAcquire ? 'no-buttons' : ''}`}
          >
            {helenaSlotData && (
              <div
                className={`imperium-card helena-card ${!canAcquire ? 'no-button' : ''}`}
              >
                <div className="helena-card-image-wrapper">
                  {getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE) && (
                    <img
                      src={getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE)!}
                      alt="Helena"
                      className="helena-head-corner-icon"
                    />
                  )}
                  <img
                    src={helenaSlotData.card.image}
                    alt={helenaSlotData.card.name}
                    className="card-image-ir"
                  />
                  <span className="helena-discount-badge">−1 Persuasion</span>
                </div>
                {canAcquire && (
                  <button
                    className="acquire-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAcquireCard(helenaSlotData.card.id)
                    }}
                    disabled={((helenaSlotData.card.cost ?? 0) - 1) > persuasion}
                  >
                    Acquire
                  </button>
                )}
              </div>
            )}
            {cards.map((card) => (
              <div
                key={card.id}
                className={`imperium-card ${!canAcquire ? 'no-button' : ''}`}
                onClick={() => canAcquire && onAcquireCard?.(card.id)}
              >
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
          {/* Reserve: Arrakis Liaison + Spice Must Flow — second row, stays on screen */}
          <div className={`imperium-row-reserve ${!canAcquire ? 'no-buttons' : ''}`}>
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
        </div>
      )}
    </div>
  )
}

export default ImperiumRow