import React from 'react'
import type { Card } from '../../types/GameTypes'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import './CardPileGrid.css'

interface CardPileGridProps {
  cards: Card[]
  emptyLabel: string
}

const CardPileGrid: React.FC<CardPileGridProps> = ({ cards, emptyLabel }) => {
  if (cards.length === 0) {
    return <p className="card-pile-grid__empty">{emptyLabel}</p>
  }

  return (
    <div className="card-pile-grid">
      {cards.map(card => (
        <div key={card.id} className="card-pile-grid__card">
          {card.image ? (
            <img
              src={card.image}
              alt={card.name}
              title={withImageZoomHint(card.name)}
              className="card-pile-grid__image"
              draggable={false}
              data-preview-src={card.image}
            />
          ) : (
            <span className="card-pile-grid__fallback">{card.name}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default CardPileGrid
