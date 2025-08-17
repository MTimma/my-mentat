import React, { useState } from 'react'
import { Player, Card, Gain, RewardType } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import './TurnControls.css'

interface TurnControlsProps {
  activePlayer: Player | null
  onPlayCard: (playerId: number, cardId: number) => void
  onPlayCombatIntrigue: (playerId: number, cardId: number) => void
  onReveal: (playerId: number, cardIds: number[]) => void
  canEndTurn: boolean
  onEndTurn: (playerId: number) => void
  onPassCombat: (playerId: number) => void
  canDeployTroops: boolean
  onAddTroop: (playerId: number) => void
  onRemoveTroop: (playerId: number) => void
  retreatableTroops: number
  deployableTroops: number
  gains: Gain[]
  isCombatPhase: boolean
  combatStrength: Record<number, number>
  showSelectiveBreeding?: boolean
  selectiveBreedingCards?: Card[]
  onSelectiveBreedingSelect?: (card: Card) => void
  onSelectiveBreedingCancel?: () => void
}

const TurnControls: React.FC<TurnControlsProps> = ({
  activePlayer,
  canEndTurn,
  onPlayCard,
  onPlayCombatIntrigue,
  onReveal,
  onEndTurn,
  onPassCombat,
  canDeployTroops,
  onAddTroop,
  onRemoveTroop,
  retreatableTroops,
  deployableTroops,
  gains,
  isCombatPhase,
  combatStrength,
  showSelectiveBreeding = false,
  onSelectiveBreedingSelect,
  onSelectiveBreedingCancel
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

  const handlePlayCombatIntrigue = () => {
    setIsRevealTurn(false)
    setSelectedCards([])
    onPlayCombatIntrigue(activePlayer.id, selectedCards[0].id)
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
  const handlePassCombat = () => {
    setIsRevealTurn(false)
    setSelectedCards([])
    onPassCombat(activePlayer.id)
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

  const totalOf = (type: RewardType) => gains
    .filter(g => g.type === type)
    .reduce((acc, g) => acc + (g.amount || 0), 0)

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
              Persuasion: {totalOf(RewardType.PERSUASION)}
              {' '}Combat: {totalOf(RewardType.COMBAT)}
              {' '}Spice: {totalOf(RewardType.SPICE)}
              {' '}Water: {totalOf(RewardType.WATER)}
              {' '}Solari: {totalOf(RewardType.SOLARI)}
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
                        activePlayer.troops <= 0 || deployableTroops <= 0}
            >
              Deploy Troop ({deployableTroops})
            </button>
            <button 
              className="remove-troop-button"
              onClick={() => onRemoveTroop(activePlayer.id)}
              disabled={!canDeployTroops || retreatableTroops <= 0 }
            >
              Retreat Troop ({retreatableTroops})
            </button>
          </>
          {!isCombatPhase && <button 
            className="play-intrigue-button"
            // onClick={}
            disabled={activePlayer.intrigueCount === 0}
          >
            Play Intrigue ({activePlayer.intrigueCount})
          </button>}
          {isCombatPhase && <button 
            className="play-intrigue-button"
            onClick={handlePlayCombatIntrigue}
            disabled={activePlayer.intrigueCount === 0}
          >
            Play Combat Intrigue ({activePlayer.intrigueCount})
          </button>}
          {!isCombatPhase && <button 
            className="end-turn-button"
            onClick={handleEndTurn}
            disabled={!canEndTurn}
          >
            End Turn
          </button>}
          {isCombatPhase && <button 
            className="pass-combat-button"
            onClick={handlePassCombat}
          >
            Pass Combat
          </button>}
        </div>

        <CardSearch
          isOpen={isCardSelectionOpen}
          cards={activePlayer.deck}
          selectionCount={isRevealTurn ? activePlayer.handCount: 1}
          onSelect={handleCardSelection}
          onCancel={() => setIsCardSelectionOpen(false)}
          isRevealTurn={isRevealTurn}
          text={isRevealTurn ? "Select Cards to Reveal" : "Select a Card to Play"}
        />

        <CardSearch
          isOpen={showSelectiveBreeding}
          cards={[...activePlayer.deck, ...activePlayer.discardPile, ...activePlayer.playArea]}
          selectionCount={1}
          onSelect={selected => selected[0] && onSelectiveBreedingSelect && onSelectiveBreedingSelect(selected[0])}
          onCancel={onSelectiveBreedingCancel || (() => {})}
          isRevealTurn={false}
          text="Selective Breeding: select a card to trash"
        />
      </div>
    </>
  )
}

export default TurnControls 