import React from 'react'
import { Card } from '../types/GameTypes'

interface ImperiumRowProps {
  cards: Card[]
  persuasion: number
  onAcquireArrakisLiaison: () => void
  onAcquireSpiceMustFlow: () => void
  onAcquireCard: (cardId: number) => void
}


const ImperiumRow: React.FC<ImperiumRowProps> = ({ cards, persuasion, onAcquireArrakisLiaison, onAcquireSpiceMustFlow, onAcquireCard }) => {
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
                {card.agentSpaceTypes?.map((area, index) => (
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
              disabled={!!(card.cost && card.cost > persuasion)}
            >
              Acquire
            </button>
          </div>
        ))}
      </div>
      <div className="fixed-cards">
        <div className="imperium-card fixed-card">
          <h4>Arrakis Liaison</h4>
          <div className="persuasion-cost">2💰</div>
          <button 
              onClick={() => onAcquireArrakisLiaison()} 
              disabled={!!(2 > persuasion)}
            >
              Acquire
            </button>
        </div>
        <div className="imperium-card fixed-card">
          <h4>The Spice Must Flow</h4>
          <div className="persuasion-cost">9💰</div>
          <button 
              onClick={() => onAcquireSpiceMustFlow()} 
              disabled={!!(9 > persuasion)}
            >
              Acquire
            </button>
        </div>
      </div>
    </div>
  )
}

export default ImperiumRow