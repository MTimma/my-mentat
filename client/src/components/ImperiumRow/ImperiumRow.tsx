import React from 'react'
import { Card } from '../types/GameTypes'
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
  return (
    <div className="imperium-section">
      <div className="imperium-row">
        {cards.map((card) => (
          <div key={card.id} className="imperium-card" onClick={() => onAcquireCard?.(card.id)} >
            <div className="card-header">
              <h4>{card.name}</h4>
              {card.cost && <div className="persuasion-cost">{card.cost}💰</div>}
            </div>
            <div className="card-content">
              <div className="agent-placement">
                {card.agentIcons?.map((area, index) => (
                  <div 
                    key={index} 
                    className={`placement-dot ${area}`}
                  />
                ))}
              </div>
              {card.swordIcon && <div className="sword-icon">⚔️</div>}
              {card.effect && <div className="card-effect">{card.effect}</div>}
            </div>
            <button 
              onClick={() => onAcquireCard?.(card.id)} 
              disabled={!!(card.cost && card.cost > persuasion) || !canAcquire}
            >
              Acquire
            </button>
          </div>
        ))}
      </div>
      <div className="fixed-cards">
        <div className="imperium-card fixed-card">
          <img 
            src={'imperium_row/arrakis_liaison.avif'} 
            alt={'Arrakis Liaison'}
            className="card-image-ir"
          />
          <>
          <div className="count-display">
            Count: {alCount}
          </div>
          <button 
              onClick={() => onAcquireArrakisLiaison()} 
              disabled={!!(2 > persuasion) || !canAcquire || alCount === 0}
            >
              Acquire
            </button>
          </>
        </div>
        <div className="imperium-card fixed-card">
          <img 
            src={'imperium_row/spice_must_flow.avif'} 
            alt={'The Spice Must Flow'}
            className="card-image-ir"
          />
          <>
          <div className="count-display">
            Count: {smfCount}
          </div>
          <button 
              onClick={() => onAcquireSpiceMustFlow()} 
              disabled={!!(9 > persuasion) || !canAcquire || smfCount === 0}
            >
              Acquire
            </button>
          </>
        </div>
      </div>
    </div>
  )
}

export default ImperiumRow