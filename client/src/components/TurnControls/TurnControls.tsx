import React, { useState } from 'react'
import { Player, Card, Gain, Cost, Reward } from '../../types/GameTypes'
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
  optionalEffects?: { cost: Cost; reward: Reward; source: { type: string; id: number; name: string }; data?: { trashedCardId?: number } }[]
  onPayCost?: (effect: { cost: Cost; reward: Reward; source: { type: string; id: number; name: string }; data?: { trashedCardId?: number } }) => void
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
  optionalEffects = [],
  onPayCost,
  showSelectiveBreeding = false,
  onSelectiveBreedingSelect,
  onSelectiveBreedingCancel
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [showTrashPopup, setShowTrashPopup] = useState(false)
  const [pendingEffect, setPendingEffect] = useState<typeof optionalEffects[0] | null>(null)

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

  /* ---------- Optional effects helpers ---------- */
  const isAffordable = (cost: Cost): boolean => {
    if (!activePlayer) return false
    if(cost.spice && activePlayer.spice < cost.spice) return false
    if(cost.water && activePlayer.water < cost.water) return false
    if(cost.solari && activePlayer.solari < cost.solari) return false
    if(cost.troops && activePlayer.troops < cost.troops) return false
    // trash costs always affordable (player chooses card)
    return true
  }

  const Icon: React.FC<{type:string}> = ({type}) => <img src={`/icon/${type}.png`} alt={type} className="resource-icon" />

  const renderPart = (amount:number|undefined, type:string, sign:'+'|'-') => {
    if(!amount) return null
    return (
      <span className="res-part" key={type+sign}>
        {sign==='-'?'-':'+'}{amount}&nbsp;<Icon type={type} />
      </span>
    )
  }

  const renderLabel = (effect:{cost:Cost; reward:Reward}): React.ReactNode => {
    const {cost,reward} = effect
    const left: React.ReactNode[] = []
    left.push(renderPart(cost.spice,'spice','-'))
    left.push(renderPart(cost.water,'water','-'))
    left.push(renderPart(cost.solari,'solari','-'))
    if(cost.trash || cost.trashThisCard) left.push(<span key="trash">Trash</span>)

    const right: React.ReactNode[] = []
    right.push(renderPart(reward.spice,'spice','+'))
    right.push(renderPart(reward.water,'water','+'))
    right.push(renderPart(reward.solari,'solari','+'))
    if(reward.drawCards) right.push(<span key="draw">Draw {reward.drawCards}</span>)
    if(reward.troops) right.push(<span key="troops">+{reward.troops} Troops</span>)
    if(reward.victoryPoints) right.push(<span key="vp">+{reward.victoryPoints} VP</span>)

    return (
      <span className="effect-label">
        {left.filter(Boolean).map((n,idx)=> <React.Fragment key={idx}>{n} </React.Fragment>)}
        &nbsp;→&nbsp;
        {right.filter(Boolean).map((n,idx)=> <React.Fragment key={idx}>{n} </React.Fragment>)}
      </span>
    )
  }

  const handleEffectClick = (effect: typeof optionalEffects[0]) => {
    if(effect.cost.trash && !effect.cost.trashThisCard) {
      // need popup
      setPendingEffect(effect)
      setShowTrashPopup(true)
    } else {
      onPayCost && onPayCost(effect)
    }
  }

  const handleTrashSelect = (card: Card) => {
    if(pendingEffect && onPayCost) {
      onPayCost({ ...pendingEffect, data: { trashedCardId: card.id } })
    }
    setShowTrashPopup(false)
    setPendingEffect(null)
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
      {optionalEffects.length > 0 && (
        <div className="optional-effects-bar top-bar">
          {optionalEffects.map((eff, idx) => (
            <button key={idx}
                    className="optional-effect-btn"
                    disabled={!isAffordable(eff.cost)}
                    onClick={() => handleEffectClick(eff)}>
               {renderLabel(eff)}
            </button>
          ))}
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

        <CardSearch
          isOpen={showTrashPopup}
          cards={[...activePlayer.deck, ...activePlayer.discardPile, ...activePlayer.playArea]}
          selectionCount={1}
          onSelect={selected => selected[0] && handleTrashSelect(selected[0])}
          onCancel={() => { setShowTrashPopup(false); setPendingEffect(null);} }
          isRevealTurn={false}
          text="Select card to trash"
        />
      </div>
    </>
  )
}

export default TurnControls 