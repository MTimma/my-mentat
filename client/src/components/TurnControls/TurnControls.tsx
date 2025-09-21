import React, { useState } from 'react'
import { Player, Card, Cost, Reward, PendingChoice } from '../../types/GameTypes'
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
  isCombatPhase: boolean
  combatStrength: Record<number, number>
  optionalEffects?: { cost: Cost; reward: Reward; source: { type: string; id: number; name: string }; data?: { trashedCardId?: number } }[]
  onPayCost?: (effect: { cost: Cost; reward: Reward; source: { type: string; id: number; name: string }; data?: { trashedCardId?: number } }) => void
  showSelectiveBreeding?: boolean
  selectiveBreedingCards?: Card[]
  onSelectiveBreedingSelect?: (card: Card) => void
  onSelectiveBreedingCancel?: () => void
  pendingChoices?: PendingChoice[]
  onResolveChoice?: (choiceId:string, reward: Reward) => void
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
  isCombatPhase,
  combatStrength,
  optionalEffects = [],
  onPayCost,
  showSelectiveBreeding = false,
  onSelectiveBreedingSelect,
  onSelectiveBreedingCancel,
  pendingChoices = [],
  onResolveChoice
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [showTrashPopup, setShowTrashPopup] = useState(false)
  const [pendingEffect, setPendingEffect] = useState<typeof optionalEffects[0] | null>(null)
  const [showChoicePopup, setShowChoicePopup] = useState(false)
  const [activeChoice, setActiveChoice] = useState<PendingChoice | null>(null)

  React.useEffect(()=>{
    if(!showChoicePopup && pendingChoices.length>0){
      setShowChoicePopup(true);
      setActiveChoice(pendingChoices[0]);
    }
  },[pendingChoices, showChoicePopup]);

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

  const Icon: React.FC<{ type: string; className?: string }> = ({ type, className }) =>
    <img src={`/icon/${type}.png`} alt={type} className={className ?? 'resource-icon'} />

  const renderAmt = (amount: number | undefined, type: string) => {
    if (!amount) return null
    return (
      <span className="res-part" key={type}>
        <Icon type={type} />
        <span className="res-amt">{amount}</span>
      </span>
    )
  }

  const renderLabel = (opt: {cost?: Cost; reward: Reward; costLabel?: string; rewardLabel?: string}): React.ReactNode => {
    const {cost,reward,costLabel,rewardLabel} = opt
    let left = null;
    if(cost){
      left = []
      left.push(renderAmt(cost.spice,'spice'))
      left.push(renderAmt(cost.water,'water'))
      left.push(renderAmt(cost.solari,'solari'))
      left.push(renderAmt(cost.influence?.amount,'influence'))
      if(cost.trash || cost.trashThisCard) left.push(<span key="trash">Trash</span>)
      if(costLabel) left.push(<span key="cost">{costLabel}</span>)
    }
    const right: React.ReactNode[] = []
    right.push(renderAmt(reward.spice,'spice'))
    right.push(renderAmt(reward.water,'water'))
    right.push(renderAmt(reward.solari,'solari'))
    if(reward.drawCards) right.push(<span key="draw">Draw {reward.drawCards}</span>)
    if(reward.troops) right.push(<span key="troops">{reward.troops} Troops</span>)
    if(reward.victoryPoints) right.push(<span key="vp">{reward.victoryPoints} VP</span>)
    if(rewardLabel) right.push(<span key="reward">{rewardLabel}</span>)

    return (
      <span className="effect-label">
        {left?.filter(Boolean).map((n,idx)=> <React.Fragment key={idx}>{n} </React.Fragment>)}
        {left && right && <>&nbsp;→&nbsp;</>}
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
      if(onPayCost){onPayCost(effect)}
    }
  }

  const handleTrashSelect = (card: Card) => {
    if(pendingEffect && onPayCost) {
      onPayCost({ ...pendingEffect, data: { trashedCardId: card.id } })
    }
    setShowTrashPopup(false)
    setPendingEffect(null)
  }

  const ChoiceDialog = () => {
    if(!activeChoice) return null;
    return (
      <div className="card-selection-dialog-overlay">
        <div className="card-selection-dialog">
          <h2>Choose one reward</h2>
          <div className="choices-list">
            {activeChoice.options.map((opt, idx:number)=>(
              <button key={idx}
                      className="choice-btn"
                      disabled={opt.disabled}
                      onClick={()=>{
                        if(opt.disabled) return;
                        if(onResolveChoice){onResolveChoice(activeChoice.id,opt.reward)}
                        const next=pendingChoices.find(c=>c.id!==activeChoice.id);
                        if(next){setActiveChoice(next);} else {setShowChoicePopup(false);setActiveChoice(null);}                
                      }}>
                {renderLabel(opt)}
              </button>))}
          </div>
        </div>
      </div>
    );
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
          {/* Reveal summaries removed for now */}
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

        <ChoiceDialog />
      </div>
    </>
  )
}

export default TurnControls 