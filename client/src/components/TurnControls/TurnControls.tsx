import React, { useState } from 'react'
import { Player, Card, Gains } from '../../types/GameTypes'
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
  gains: Gains
  isCombatPhase: boolean
  combatStrength: Record<number, number>
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
  troopLimit,
  gains,
  isCombatPhase,
  combatStrength
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  if (!activePlayer) return null

  const getRankings = () => {
    const entries = Object.entries(combatStrength)
      .map(([playerId, strength]) => ({ playerId: parseInt(playerId), strength }))
      .sort((a, b) => b.strength - a.strength)

    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
  }

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
    <>
      {isCombatPhase && (
        <div className="combat-container">
          <div className="combat-phase-indicator">
            Combat Phase
          </div>
          <div className="combat-rankings">
            {getRankings().map(({ playerId, strength, rank }) => (
              <div key={playerId} className={`combat-rank rank-${rank}`}>
                {rank}. <div className={`agent player-${playerId}`} />: {strength} strength 
              </div>
            ))}
          </div>
        </div>
      )}
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
          {isRevealTurn && gains && (
            <div>
              Persuasion: {gains.persuasionGains?.filter(g => 'cardId' in g).reduce((acc, gain) => acc + (gain.amount ? gain.amount : 0), 0)}
              Combat: {gains.combatGains?.filter(g => 'cardId' in g).reduce((acc, gain) => acc + (gain.amount ? gain.amount : 0), 0)}
              Spice: {gains.spiceGains?.filter(g => 'cardId' in g).reduce((acc, gain) => acc + (gain.amount ? gain.amount : 0), 0)}
              Water: {gains.waterGains?.filter(g => 'cardId' in g).reduce((acc, gain) => acc + (gain.amount ? gain.amount : 0), 0)}
              Solari: {gains.solariGains?.filter(g => 'cardId' in g).reduce((acc, gain) => acc + (gain.amount ? gain.amount : 0), 0)}
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
            hidden={isCombatPhase}
          >
            Play Card
          </button>
          <button 
            className="reveal-turn-button"
            onClick={handleRevealTurn}
            disabled={canEndTurn || isCombatPhase}
            hidden={isCombatPhase}
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
              Deploy Troop ({troopLimit - removableTroops})
            </button>
            <button 
              className="remove-troop-button"
              onClick={() => onRemoveTroop(activePlayer.id)}
              disabled={!canDeployTroops || removableTroops <= 0 }
            >
              Retreat Troop ({removableTroops})
            </button>
          </>
          <button 
            className="play-intrigue-button"
            onClick={handlePlayCard}
            disabled={activePlayer.intrigueCount === 0}
          >
            Play Intrigue ({activePlayer.intrigueCount})
          </button>
          {!isCombatPhase && <button 
            className="end-turn-button"
            onClick={handleEndTurn}
            disabled={!canEndTurn}
          >
            End Turn
          </button>}
          {isCombatPhase && <button 
            className="pass-combat-button"
            onClick={handleEndTurn}
          >
            Pass
          </button>}
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
    </>
  )
}

export default TurnControls 