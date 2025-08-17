import React from 'react'
import {Card} from '../types/GameTypes'

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
            {typeof card.cost === 'number' && <div className="persuasion">💰 {card.cost}</div>}
          </div>
          <div className="card-content">
            <div className="agent-placement">
              {card.agentIcons.map((area, index) => (
                <div 
                  key={index} 
                  className={`placement-dot ${area}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardHand 