import React from 'react'
import type { Card } from '../../types/GameTypes'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import './CardPileGrid.css'

interface CardPileGridProps {
  cards: Card[]
  emptyLabel: string
  onSelectCard?: (card: Card) => void
}

const CardPileGrid: React.FC<CardPileGridProps> = ({ cards, emptyLabel, onSelectCard }) => {
  if (cards.length === 0) {
    return <p className="card-pile-grid__empty">{emptyLabel}</p>
  }

  return (
    <div className="card-pile-grid">
      {cards.map(card => {
        const art = card.image ? (
          <img
            src={card.image}
            alt={card.name}
            title={onSelectCard ? card.name : withImageZoomHint(card.name)}
            className="card-pile-grid__image"
            draggable={false}
            data-preview-src={card.image}
          />
        ) : (
          <span className="card-pile-grid__fallback">{card.name}</span>
        )
        if (!onSelectCard) {
          return (
            <div key={card.id} className="card-pile-grid__card">
              {art}
            </div>
          )
        }
        return (
          <button
            key={card.id}
            type="button"
            className="card-pile-grid__card card-pile-grid__card--selectable"
            onClick={() => onSelectCard(card)}
            aria-label={`Discard ${card.name}`}
          >
            {art}
          </button>
        )
      })}
    </div>
  )
}

export default CardPileGrid
