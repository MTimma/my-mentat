import React, { useState } from 'react'
import { Player, Card } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import './TurnControls.css'

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
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  if (!activePlayer) return null

  const handlePlayCard = () => {
    setIsRevealTurn(false)
    setIsCardSelectionOpen(true)
  }

  const handleRevealTurn = () => {
    setIsRevealTurn(true)
    setIsCardSelectionOpen(true)
  }
  const handleEndTurn = () => {
    setIsRevealTurn(false)
    setSelectedCards([])
    onEndTurn(activePlayer.id)
  }

  const handleCardSelection = (selectedCards: Card[]) => {
    setIsCardSelectionOpen(false)
    setSelectedCards(selectedCards)
    if (isRevealTurn) {
      onReveal(activePlayer.id, selectedCards.map(card => card.id))
    } else if (selectedCards.length === 1) {
      onPlayCard(activePlayer.id, selectedCards[0].id)
    }
  }

  return (
    <div className="turn-controls">
      <div className="active-player-info">
        <div className={`color-indicator ${activePlayer.color}`}></div>
        {activePlayer.leader.name}
      </div>
      <div className="selected-cards">
        {selectedCards.length > 0 && (
          <div>
            {selectedCards.map(card => card.name).join(', ')}
          </div>
        )}
        {isRevealTurn && (
          <div>
            Persuasion: {selectedCards.reduce((acc, card) => acc + (card.persuasion ? card.persuasion : 0), 0)}
            Combat: {selectedCards.reduce((acc, card) => acc + (card.combat? card.combat : 0), 0)}
            Spice: {selectedCards.reduce((acc, card) => acc + (card.resources?.spice ? card.resources.spice : 0), 0)}
            Water: {selectedCards.reduce((acc, card) => acc + (card.resources?.water ? card.resources.water : 0), 0)}
            Solari: {selectedCards.reduce((acc, card) => acc + (card.resources?.solari ? card.resources.solari : 0), 0)}
          </div>
        )}
        {selectedCards.length === 0 && (
          <div>
            No card selected
          </div>
        )}
      </div>
      <div className="control-buttons">
      
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
          disabled={canEndTurn}
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
          <button 
            className="remove-troop-button"
            onClick={() => onRemoveTroop(activePlayer.id)}
            disabled={!canDeployTroops || removableTroops <= 0 }
          >
            Remove Troop ({removableTroops})
          </button>
        </>
        <button 
          className="play-intrigue-button"
          onClick={handlePlayCard}
          disabled={activePlayer.intrigueCount === 0}
        >
          Play Intrigue ({activePlayer.intrigueCount})
        </button>
        <button 
          className="end-turn-button"
          onClick={handleEndTurn}
          disabled={!canEndTurn}
        >
          End Turn
        </button>
      </div>

      <CardSearch
        isOpen={isCardSelectionOpen}
        cards={activePlayer.deck}
        selectionCount={isRevealTurn ? activePlayer.handCount: 1}
        onSelect={handleCardSelection}
        onCancel={() => setIsCardSelectionOpen(false)}
        isRevealTurn={isRevealTurn}
      />
    </div>
  )
}

export default TurnControls 