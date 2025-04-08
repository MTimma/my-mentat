import React, { useState } from 'react'
import { Player, Card } from '../types/GameTypes'
import CardSearch from './CardSearch/CardSearch'

interface TurnControlsProps {
  activePlayer: Player | null
  onPlayCard: (playerId: number, cardId: number) => void
  onReveal: (playerId: number, cardIds: number[]) => void
  canEndTurn: boolean
  onEndTurn: (playerId: number) => void
  canDeployTroops: boolean
  onAddTroop: (playerId: number) => void
  onRemoveTroop: (playerId: number) => void
  removableTroops: number
  troopLimit: number
}

const TurnControls: React.FC<TurnControlsProps> = ({
  activePlayer,
  canEndTurn,
  onPlayCard,
  onReveal,
  onEndTurn,
  canDeployTroops,
  onAddTroop,
  onRemoveTroop,
  removableTroops,
  troopLimit
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)

  if (!activePlayer) return null

  const handlePlayCard = () => {
    setIsRevealTurn(false)
    setIsCardSelectionOpen(true)
  }

  const handleRevealTurn = () => {
    setIsRevealTurn(true)
    setIsCardSelectionOpen(true)
  }

  const handleCardSelection = (selectedCards: Card[]) => {
    setIsCardSelectionOpen(false)
    if (isRevealTurn) {
      onReveal(activePlayer.id, selectedCards.map(card => card.id))
    } else if (selectedCards.length === 1) {
      onPlayCard(activePlayer.id, selectedCards[0].id)
    }
  }

  return (
    <div className="turn-controls">
      <div className="active-player-info">
        Active Player: {activePlayer.leader.name}
      </div>
      <div className="control-buttons">
      <button 
          className="play-intrigue-button"
          onClick={handlePlayCard}
          disabled={activePlayer.agents === 0}
        >
          Play Intrigue
        </button>
        <button 
          className="play-card-button"
          onClick={handlePlayCard}
          disabled={activePlayer.agents === 0 || canEndTurn}
        >
          Play Card
        </button>
        <button 
          className="reveal-turn-button"
          onClick={handleRevealTurn}
        >
          Reveal Turn
        </button>
        <>
          <button 
            className="add-troop-button"
            onClick={() => onAddTroop(activePlayer.id)}
            disabled={!canDeployTroops || 
                      activePlayer.troops <= 0 || 
                      removableTroops >= troopLimit}
          >
            Add Troop ({troopLimit - removableTroops})
          </button>
          {removableTroops > 0 && (
            <button 
              className="remove-troop-button"
              onClick={() => onRemoveTroop(activePlayer.id)}
            >
              Remove Troop
            </button>
          )}
        </>
        <button 
          className="end-turn-button"
          onClick={() => onEndTurn(activePlayer.id)}
          disabled={!canEndTurn}
        >
          End Turn
        </button>
      </div>

      <CardSearch
        isOpen={isCardSelectionOpen}
        cards={activePlayer.deck}
        selectionCount={isRevealTurn ? activePlayer.hand.length : 1}
        onSelect={handleCardSelection}
        onCancel={() => setIsCardSelectionOpen(false)}
        isRevealTurn={isRevealTurn}
      />
    </div>
  )
}

export default TurnControls 