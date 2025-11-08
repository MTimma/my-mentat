import React, { useState } from 'react'
import { Player, Card, Cost, Reward, PendingChoice, FixedOptionsChoice, CardSelectChoice, OptionalEffect, ChoiceType, CardPile, PendingReward, GainSource } from '../../types/GameTypes'
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
  combatPasses?: Set<number>
  players?: Player[]
  optionalEffects?: OptionalEffect[]
  onPayCost?: (effect: OptionalEffect) => void
  showSelectiveBreeding?: boolean
  selectiveBreedingCards?: Card[]
  onSelectiveBreedingSelect?: (card: Card) => void
  onSelectiveBreedingCancel?: () => void
  pendingChoices?: PendingChoice[]
  onResolveChoice?: (choiceId:string, reward: Reward, source?: { type: string; id: number; name: string }) => void
  onResolveCardSelect?: (choiceId: string, cardIds: number[]) => void
  selectedCard?: Card | null
  recallMode?: boolean
  pendingRewards?: PendingReward[]
  onClaimReward?: (rewardId: string) => void
  onClaimAllRewards?: () => void
  agentPlaced?: boolean
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
  combatPasses = new Set(),
  players = [],
  optionalEffects = [],
  onPayCost,
  showSelectiveBreeding = false,
  onSelectiveBreedingSelect,
  onSelectiveBreedingCancel,
  pendingChoices = [],
  onResolveChoice,
  onResolveCardSelect,
  selectedCard = null,
  recallMode = false,
  pendingRewards = [],
  onClaimReward,
  onClaimAllRewards,
  agentPlaced = false
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [showTrashPopup, setShowTrashPopup] = useState(false)
  const [pendingEffect, setPendingEffect] = useState<typeof optionalEffects[0] | null>(null)
  const [activeCardSelect, setActiveCardSelect] = useState<CardSelectChoice | null>(null)

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
  const isAffordable = (cost: Cost | undefined): boolean => {
    if(!cost) return true
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
      if(cost.influence) left.push(<span key="influence">Influence</span>)
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
    // Only show CardSearch dialog when user clicks a card selection choice
    if (activeCardSelect) {
      return (
        <CardSearch
          isOpen={true}
          player={activePlayer!}
          piles={activeCardSelect.piles}
          customFilter={activeCardSelect.filter}
          selectionCount={activeCardSelect.selectionCount}
          text={activeCardSelect.prompt}
          isRevealTurn={activeCardSelect.selectionCount > 1}
          onSelect={(selectedCards) => {
            if (onResolveCardSelect) {
              onResolveCardSelect(activeCardSelect.id, selectedCards.map(card => card.id));
            }
            setActiveCardSelect(null);
          }}
          onCancel={() => {
            setActiveCardSelect(null);
          }}
        />
      );
    }
    
    return null;
  }

  // Render unified effects bar with cards grouped by source
  const renderEffectsBar = () => {
    // Group effects by source
    type EffectSource = {
      type: GainSource
      id: number
      name: string
    }
    
    type EffectCard = {
      source: EffectSource
      rewards: PendingReward[]
      optional: OptionalEffect[]
      choices: PendingChoice[]
    }
    
    const sourceMap = new Map<string, EffectCard>()
    
    // Add pending rewards
    pendingRewards.forEach(reward => {
      const key = `${reward.source.type}-${reward.source.id}`
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          source: reward.source,
          rewards: [],
          optional: [],
          choices: []
        })
      }
      sourceMap.get(key)!.rewards.push(reward)
    })
    
    // Add optional effects
    optionalEffects.forEach(effect => {
      const key = `${effect.source.type}-${effect.source.id}`
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          source: { type: effect.source.type, id: effect.source.id, name: effect.source.name },
          rewards: [],
          optional: [],
          choices: []
        })
      }
      sourceMap.get(key)!.optional.push(effect)
    })
    
    // Add pending choices
    pendingChoices.forEach(choice => {
      const key = `${choice.source.type}-${choice.source.id}`
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          source: { type: choice.source.type, id: choice.source.id, name: choice.source.name },
          rewards: [],
          optional: [],
          choices: []
        })
      }
      sourceMap.get(key)!.choices.push(choice)
    })
    
    if (sourceMap.size === 0) return null
    
    const effectCards = Array.from(sourceMap.values())
    
    // Helper to get list of rewards that would be cancelled by trash
    const getCancelledRewards = (card: EffectCard, trashReward: PendingReward): string => {
      const cancelled = card.rewards
        .filter(r => r.id !== trashReward.id)
        .map(r => {
          const parts: string[] = []
          if (r.reward.spice) parts.push(`Spice +${r.reward.spice}`)
          if (r.reward.water) parts.push(`Water +${r.reward.water}`)
          if (r.reward.solari) parts.push(`Solari +${r.reward.solari}`)
          if (r.reward.troops) parts.push(`Troop +${r.reward.troops}`)
          if (r.reward.drawCards) parts.push(`Draw +${r.reward.drawCards}`)
          if (r.reward.intrigueCards) parts.push(`Intrigue +${r.reward.intrigueCards}`)
          if (r.reward.influence) parts.push(`Influence +${r.reward.influence.amounts.map(i => i.amount).join('+')}`)
          return parts.join(', ')
        })
        .join('; ')
      return cancelled
    }
    
    return (
      <div className="effects-bar">
        {effectCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`effect-card ${card.optional.length > 0 ? 'optional' : 'mandatory'}`}
          >
            <div className="effect-card-header">
              {card.source.name}
              {card.optional.length > 0 && <span className="optional-tag">(Optional)</span>}
            </div>
            <div className="effect-card-body">
              {/* Mandatory Rewards */}
              {card.rewards.map(reward => (
                <button
                  key={reward.id}
                  className={`effect-btn ${reward.isTrash ? 'trash-reward' : ''}`}
                  onClick={() => onClaimReward && onClaimReward(reward.id)}
                  title={reward.isTrash ? `⚠️ Trashing this card will cancel effects that haven't been applied yet. Cancels: ${getCancelledRewards(card, reward)}` : undefined}
                >
                  {reward.isTrash && <span className="warning-icon">⚠️ </span>}
                  {renderLabel({ reward: reward.reward })}
                </button>
              ))}
              
              {/* Optional Effects */}
              {card.optional.map((eff, idx) => (
                <button 
                  key={idx}
                  className="effect-btn optional"
                  disabled={!isAffordable(eff.cost)}
                  onClick={() => handleEffectClick(eff)}
                >
                  {renderLabel(eff)}
                </button>
              ))}
              
              {/* Pending Choices */}
              {card.choices.map(choice => {
                if (choice.type === ChoiceType.CARD_SELECT) {
                  const cardSelectChoice = choice as CardSelectChoice
                  // Prompt is already set with the correct text from GameContext
                  
                  return (
                    <button
                      key={choice.id}
                      className="effect-btn choice"
                      onClick={() => setActiveCardSelect(cardSelectChoice)}
                      disabled={cardSelectChoice.disabled}
                    >
                      {cardSelectChoice.prompt}
                    </button>
                  )
                } else {
                  // Render FixedOptionsChoice with all options horizontally with OR separator
                  const fixedChoice = choice as FixedOptionsChoice
                  return (
                    <div key={choice.id} className="or-choice-container">
                      {fixedChoice.options.map((option, oidx) => (
                        <React.Fragment key={`${choice.id}-${oidx}`}>
                          {oidx > 0 && <span className="or-separator">OR</span>}
                          <button
                            className="effect-btn choice or-option"
                            disabled={option.disabled || !isAffordable(option.cost)}
                            onClick={() => onResolveChoice && onResolveChoice(choice.id, option.reward, choice.source)}
                          >
                            {renderLabel(option)}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )
                }
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {isCombatPhase && (
        <div className="combat-container">
          <div className="combat-phase-indicator">
            Combat Phase
          </div>
          <div className="combat-rankings">
            {getRankings().map(({ playerId, strength, rank }) => {
              const player = players.find(p => p.id === playerId)
              const hasPassed = combatPasses.has(playerId)
              return (
                <div key={playerId} className={`combat-rank rank-${rank} ${hasPassed ? 'passed' : ''}`}>
                  {rank}. <div className={`agent player-${playerId}`} />: {strength} strength 
                  {player && ` (${player.leader.name})`}
                  {hasPassed && <span className="pass-indicator"> ✓ Passed</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {renderEffectsBar()}
      {
        <ChoiceDialog />
        
      }

      <div className="turn-controls">
        <div className="active-player-info">
          <div className={`color-indicator ${activePlayer.color}`}></div>
          {activePlayer.leader.name}
        </div>
        <div className="selected-cards">
          {selectedCard && (
            <div className="selected-card-info">
              <div className="card-name">
                {selectedCard.name}
              </div>
              <div className="instruction">
                {recallMode ? '⬅️ Recall an agent from the board' : '➡️ Place the agent on board'}
              </div>
            </div>
          )}
          {selectedCards.length > 0 && !selectedCard && (
            <div>
              {selectedCards.map(card => card.name).join(', ')}
            </div>
          )}
          {/* Reveal summaries removed for now */}
          {selectedCards.length === 0 && !selectedCard && (
            <div>
              No card selected
            </div>
          )}
        </div>
        <div className="control-buttons">
          <button 
            className="play-card-button"
            onClick={handlePlayCard}
            disabled={activePlayer.agents === 0 || canEndTurn || agentPlaced}
            hidden={isCombatPhase}
            title={agentPlaced ? "You have already placed an agent this turn" : undefined}
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
          {!isCombatPhase && pendingRewards.length > 0 && <button 
            className="get-mandatory-effects-button"
            onClick={() => onClaimAllRewards && onClaimAllRewards()}
            disabled={pendingRewards.some(r => r.isTrash) || pendingChoices.length > 0}
            title={pendingChoices.length > 0 ? "Cannot apply mandatory effects while choices are pending" : (pendingRewards.some(r => r.isTrash) ? "Cannot auto-apply when trash rewards are present" : "")}
          >
            Get Mandatory Effects
          </button>}
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
          player={activePlayer}
          piles={[CardPile.HAND, CardPile.DISCARD, CardPile.PLAY_AREA]}
          selectionCount={1}
          onSelect={selected => selected[0] && onSelectiveBreedingSelect && onSelectiveBreedingSelect(selected[0])}
          onCancel={onSelectiveBreedingCancel || (() => {})}
          isRevealTurn={false}
          text="Selective Breeding: select a card to trash"
        />

        <CardSearch
          isOpen={showTrashPopup}
          player={activePlayer}
          piles={[CardPile.HAND, CardPile.DISCARD, CardPile.PLAY_AREA]}
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