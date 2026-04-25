import React from 'react'
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
  const helenaSlotData = helenaRemovedCard?.card ? helenaRemovedCard : null
  const helenaCanAcquire = Boolean(
    canAcquire && helenaSlotData && activePlayerId === helenaSlotData.playerId
  )

  return (
    <div className="imperium-section">
      <div className="imperium-row-layout imperium-row-layout--single">
        <div className={`imperium-row-strip ${!canAcquire ? 'no-buttons' : ''}`}>
          {helenaSlotData && (
            <div
              className={`imperium-card helena-card ${!helenaCanAcquire ? 'no-button' : ''}`}
              onClick={() => helenaCanAcquire && onAcquireCard?.(helenaSlotData.card.id)}
              title={
                helenaCanAcquire
                  ? undefined
                  : 'Helena may acquire this card for 1 Persuasion less during her Reveal turn.'
              }
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
              {helenaCanAcquire && (
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
          <div className="imperium-row-divider" role="separator" aria-orientation="vertical" />
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
    </div>
  )
}

export default ImperiumRow