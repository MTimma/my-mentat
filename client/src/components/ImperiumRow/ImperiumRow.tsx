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
  const showHelenaSlot = helenaRemovedCard?.card && helenaRemovedCard?.playerId === activePlayerId

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
          {/* Helena signet ring: removed card slot (1 Persuasion less to acquire) */}
          {showHelenaSlot && (
            <div className="helena-removed-slot cards-grid main-cards">
              <div className={`imperium-card helena-card ${!canAcquire ? 'no-button' : ''}`}>
                <div className="helena-card-image-wrapper">
                  {getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE) && (
                    <img
                      src={getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE)!}
                      alt="Helena"
                      className="helena-head-corner-icon"
                    />
                  )}
                  <img
                    src={helenaRemovedCard.card.image}
                    alt={helenaRemovedCard.card.name}
                    className="card-image-ir"
                  />
                  <span className="helena-discount-badge">−1 Persuasion</span>
                </div>
                {canAcquire && (
                  <button
                    className="acquire-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAcquireCard(helenaRemovedCard.card.id)
                    }}
                    disabled={((helenaRemovedCard.card.cost ?? 0) - 1) > persuasion}
                  >
                    Acquire
                  </button>
                )}
              </div>
            </div>
          )}
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