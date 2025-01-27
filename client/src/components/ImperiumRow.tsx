import React from 'react'
import { Card } from '../types/GameTypes'

interface ImperiumRowProps {
  cards: Card[]
  onCardSelect?: (cardId: number) => void
}


const ImperiumRow: React.FC<ImperiumRowProps> = ({ cards, onCardSelect }) => {
  return (
    <div className="imperium-section">
      <div className="imperium-row">
        {cards.map((card) => (
          <div key={card.id} className="imperium-card" onClick={() => onCardSelect?.(card.id)}>
            <div className="card-header">
              <h4>{card.name}</h4>
              {card.persuasion && <div className="persuasion-cost">{card.persuasion}💰</div>}
            </div>
            <div className="card-content">
              <div className="agent-placement">
                {card.agentSpaceTypes.map((area, index) => (
                  <div 
                    key={index} 
                    className={`placement-dot ${area}`}
                  />
                ))}
              </div>
              {card.swordIcon && <div className="sword-icon">⚔️</div>}
              {card.effect && <div className="card-effect">{card.effect}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed-cards">
        <div className="imperium-card fixed-card">
          <h4>Arrakis Liaison</h4>
        </div>
        <div className="imperium-card fixed-card">
          <h4>The Spice Must Flow</h4>
        </div>
      </div>
    </div>
  )
}

export default ImperiumRow