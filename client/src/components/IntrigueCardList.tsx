import React, { useState } from 'react'
import { IntrigueCard } from '../types/GameTypes'
import PlayerTargetDialog from './PlayerTargetDialog'
import { useGame } from './GameContext/GameContext'

interface IntrigueCardListProps {
  cards: IntrigueCard[]
  onPlayCard: (cardId: number, targetPlayerId?: number) => void
  playable?: boolean
  showPlayButton?: boolean
}

const IntrigueCardList: React.FC<IntrigueCardListProps> = ({
  cards,
  onPlayCard,
  playable = true,
  showPlayButton = true
}) => {
  const { gameState } = useGame()
  const [targetingCard, setTargetingCard] = useState<IntrigueCard | null>(null)

  const handlePlayCard = (card: IntrigueCard) => {
    if (card.effect.targetPlayer) {
      setTargetingCard(card)
    } else {
      onPlayCard(card.id)
    }
  }

  const handleSelectTarget = (targetId: number) => {
    if (targetingCard) {
      onPlayCard(targetingCard.id, targetId)
      setTargetingCard(null)
    }
  }

  return (
    <>
      <div className="intrigue-cards">
        {cards.map(card => (
          <div key={card.id} className={`intrigue-card ${card.type.toLowerCase()}`}>
            <div className="intrigue-card-header">
              <h4>{card.name}</h4>
              <span className="card-type">{card.type}</span>
            </div>
            <p className="card-description">{card.description}</p>
            {playable && showPlayButton && (
              <button 
                onClick={() => handlePlayCard(card)}
                className="play-intrigue-button"
              >
                {card.effect.targetPlayer ? 'Choose Target' : 'Play Card'}
              </button>
            )}
          </div>
        ))}
      </div>

      {targetingCard && (
        <PlayerTargetDialog
          card={targetingCard}
          players={gameState.players}
          currentPlayerId={gameState.activePlayerId}
          onSelectTarget={handleSelectTarget}
          onCancel={() => setTargetingCard(null)}
        />
      )}
    </>
  )
}

export default IntrigueCardList 