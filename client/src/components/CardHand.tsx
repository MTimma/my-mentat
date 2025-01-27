import React from 'react'
import { Card} from '../types/GameTypes'

interface CardHandProps {
  cards: Card[]
  selectedCard: number | null
  onSelectCard: (cardId: number) => void
}

const CardHand: React.FC<CardHandProps> = ({ cards, selectedCard, onSelectCard }) => {
  return (
    <div className="card-hand">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`game-card ${selectedCard === card.id ? 'selected' : ''}`}
          onClick={() => onSelectCard(card.id)}
        >
          <div className="card-header">
            <h4>{card.name}</h4>
            {card.persuasion && <div className="persuasion">⚖️ {card.persuasion}</div>}
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
            {card.resources && (
              <div className="card-resources">
                {card.resources.spice && <div>🌶️ {card.resources.spice}</div>}
                {card.resources.water && <div>💧 {card.resources.water}</div>}
                {card.resources.solari && <div>💰 {card.resources.solari}</div>}
                {card.resources.troops && <div>⚔️ {card.resources.troops}</div>}
              </div>
            )}
            {card.effect && <div className="card-effect">{card.effect}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardHand 