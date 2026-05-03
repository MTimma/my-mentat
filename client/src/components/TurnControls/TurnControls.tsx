import React, { useState, useEffect } from 'react'
import { Player, Card, IntrigueCard, IntrigueCardType, Cost, Reward, PendingChoice, FixedOptionsChoice, CardSelectChoice, OptionalEffect, ChoiceType, CardPile, PendingReward, GainSource, CustomEffect, GameTurn, GamePhase, FactionType, GameState, ControlMarkerType, IntriguePlayEffect, InfluenceAmount } from '../../types/GameTypes'
import { intrigueCardHasCustom } from '../../utils/intrigueCardCustom'
import CardSearch from '../CardSearch/CardSearch'
import AgentIcon from '../AgentIcon/AgentIcon'
import { PLAY_EFFECT_TEXTS, PLAY_EFFECT_DISABLED_TEXTS } from '../../data/effectTexts'
import { intrigueRequirementSatisfied } from '../GameContext/requirements'
import { getLeaderImage } from '../../data/leaders'
import LeaderImageModal from '../LeaderImageModal/LeaderImageModal'
import PlayerTargetDialog from '../PlayerTargetDialog'
import './TurnControls.css'

interface TurnControlsProps {
  activePlayer: Player | null
  onPlayCard: (playerId: number, cardId: number) => void
  onPlayIntrigue: (playerId: number, cardId: number, targetPlayerId?: number) => void
  onMobilizeGarrison?: (playerId: number, count: number) => void
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
  onAutoApplyRewards?: () => void
  agentPlaced?: boolean
  opponentDiscardState?: GameTurn['opponentDiscardState']
  onOpponentDiscardChoice?: (opponentId: number, choice: 'discard' | 'loseTroop') => void
  onOpponentDiscardCard?: (opponentId: number, cardId: number) => void
  combatTroops?: Record<number, number>
  onVoiceSelectionStart?: (rewardId: string) => void
  voiceSelectionActive?: boolean
  onVoiceSelectionCancel?: () => void
  onMasterstrokeSelectionStart?: (rewardId: string) => void
  masterstrokeSelectionActive?: boolean
  onMemnonHighCouncilSelectionStart?: (rewardId: string) => void
  memnonHighCouncilSelectionActive?: boolean
  onOpponentNoCardAck?: (opponentId: number) => void
  intrigueDeck: IntrigueCard[]
  gamePhase: GamePhase
  activeIntrigueThisRound?: IntrigueCard[]
  factionInfluence?: Record<FactionType, Record<number, number>>
  factionAlliances?: Record<FactionType, number | null>
  controlMarkers?: Record<ControlMarkerType, number | null>
  firstPlayerMarker?: number
  mentatOwner?: number | null
  gameState?: GameState
  onOpenPlayerOverview?: () => void
  onTurnHistoryToggle?: () => void
}

const TurnControls: React.FC<TurnControlsProps> = ({
  activePlayer,
  canEndTurn,
  onPlayCard,
  onPlayIntrigue,
  onMobilizeGarrison,
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
  onAutoApplyRewards,
  agentPlaced = false,
  opponentDiscardState,
  onOpponentDiscardChoice,
  onOpponentDiscardCard,
  combatTroops = {},
  onVoiceSelectionStart,
  voiceSelectionActive = false,
  onVoiceSelectionCancel,
  onMasterstrokeSelectionStart,
  masterstrokeSelectionActive = false,
  onMemnonHighCouncilSelectionStart,
  memnonHighCouncilSelectionActive = false,
  onOpponentNoCardAck,
  intrigueDeck,
  gamePhase,
  activeIntrigueThisRound = [],
  factionInfluence,
  factionAlliances,
  controlMarkers,
  firstPlayerMarker,
  mentatOwner,
  gameState,
  onOpenPlayerOverview,
  onTurnHistoryToggle
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [isIntrigueSelectionOpen, setIsIntrigueSelectionOpen] = useState(false)
  const [showTrashPopup, setShowTrashPopup] = useState(false)
  const [isLeaderImageOpen, setIsLeaderImageOpen] = useState(false)
  const [pendingIntrigueTarget, setPendingIntrigueTarget] = useState<IntrigueCard | null>(null)
  const [mobilizeCount, setMobilizeCount] = useState(0)

  useEffect(() => {
    if (activePlayer && gameState?.pendingRapidMobilization === activePlayer.id) {
      setMobilizeCount(0)
    }
  }, [gameState?.pendingRapidMobilization, activePlayer?.id])
  const [pendingEffect, setPendingEffect] = useState<typeof optionalEffects[0] | null>(null)
  const [activeCardSelect, setActiveCardSelect] = useState<CardSelectChoice | null>(null)
  const [opponentCardSelect, setOpponentCardSelect] = useState<Player | null>(null)
  const hasPendingVoiceReward = pendingRewards.some(r => r.reward.custom === CustomEffect.THE_VOICE && !r.disabled)
  const hasOpponentDiscard = Boolean(opponentDiscardState)
  const hasMandatoryRewards = pendingRewards.some(r => !r.disabled && !r.isTrash)
  const hasUnresolvedPendingRewards = pendingRewards.some(r => !r.disabled)
  const hasPendingChoicesToResolve = pendingChoices.length > 0
  const selectionBlocksEndTurn =
    voiceSelectionActive || masterstrokeSelectionActive || memnonHighCouncilSelectionActive
  const endTurnDisabled =
    !canEndTurn ||
    hasUnresolvedPendingRewards ||
    hasOpponentDiscard ||
    hasPendingChoicesToResolve ||
    selectionBlocksEndTurn
  const showAutoApplyRewardsButton =
    !isCombatPhase && pendingRewards.length > 0 && pendingRewards.some(r => !r.disabled)
  const resolvedFactionAlliances = factionAlliances ?? gameState?.factionAlliances ?? {
    [FactionType.EMPEROR]: null,
    [FactionType.SPACING_GUILD]: null,
    [FactionType.BENE_GESSERIT]: null,
    [FactionType.FREMEN]: null
  }
  const resolvedControlMarkers = controlMarkers ?? gameState?.controlMarkers ?? {
    [ControlMarkerType.ARRAKIN]: null,
    [ControlMarkerType.CARTHAG]: null,
    [ControlMarkerType.IMPERIAL_BASIN]: null
  }
  const resolvedFirstPlayerMarker = firstPlayerMarker ?? gameState?.firstPlayerMarker ?? -1
  const resolvedMentatOwner = mentatOwner ?? gameState?.mentatOwner ?? null

  // Automatically open CardSelectChoice if it's the only pending choice and not already open
  useEffect(() => {
    const cardSelectChoices = pendingChoices.filter(c => c.type === ChoiceType.CARD_SELECT) as CardSelectChoice[]
    if (cardSelectChoices.length === 1 && !activeCardSelect && !voiceSelectionActive && !masterstrokeSelectionActive && !hasOpponentDiscard) {
      setActiveCardSelect(cardSelectChoices[0])
    } else if (cardSelectChoices.length === 0 && activeCardSelect) {
      // Clear activeCardSelect if there are no more card select choices
      setActiveCardSelect(null)
    }
  }, [pendingChoices, activeCardSelect, voiceSelectionActive, masterstrokeSelectionActive, hasOpponentDiscard])

  const isEndGame = gamePhase === GamePhase.END_GAME

  if (!activePlayer) return null
  /** Same strip as Deploy/Retreat chips; show only when at least one troop action applies. */
  const showTroopActionRail =
    canDeployTroops &&
    ((deployableTroops > 0 && activePlayer.troops > 0) || retreatableTroops > 0)

  /** After agent placement or while in reveal flow / post-reveal, hide primary turn actions. */
  const hidePlayAndReveal =
    !isCombatPhase && !isEndGame && (Boolean(agentPlaced) || activePlayer.revealed || isRevealTurn)
  const playableIntrigueCards = intrigueDeck.filter(card => {
    if (gamePhase === GamePhase.END_GAME) {
      if (card.type === IntrigueCardType.ENDGAME) return true
      // Allow special cases like Tiebreaker (combat intrigue with an endgame effect).
      return Boolean(card.playEffect?.some(e => {
        if (!e.phase) return false
        const phases = Array.isArray(e.phase) ? e.phase : [e.phase]
        return phases.includes(GamePhase.END_GAME)
      }))
    }
    if (gamePhase === GamePhase.COMBAT) {
      return card.type === IntrigueCardType.COMBAT
    }
    // In normal Player Turns, only Plot intrigue can be played (combat handled separately)
    return card.type === IntrigueCardType.PLOT
  })

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

  const handlePlayIntrigueClick = () => {
    setIsRevealTurn(false)
    setIsIntrigueSelectionOpen(true)
  }

  const handlePlayCombatIntrigue = () => {
    setIsRevealTurn(false)
    setSelectedCards([])
    setIsIntrigueSelectionOpen(true)
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

  const handleCardSelection = (picked: Card[]) => {
    setIsCardSelectionOpen(false)
    if (isRevealTurn) {
      setSelectedCards(picked)
      onReveal(activePlayer.id, picked.map(card => card.id))
      setIsRevealTurn(false)
    } else if (picked.length === 1) {
      setSelectedCards([])
      onPlayCard(activePlayer.id, picked[0].id)
    }
  }

  const handleIntrigueSelection = (selectedCards: Card[]) => {
    setIsIntrigueSelectionOpen(false)
    if (selectedCards[0]) {
      const picked = selectedCards[0] as IntrigueCard
      if (!isCombatPhase && picked.targetPlayer) {
        setPendingIntrigueTarget(picked)
        return
      }
      if (isCombatPhase) {
        onPlayCombatIntrigue(activePlayer.id, selectedCards[0].id)
      } else {
        onPlayIntrigue(activePlayer.id, selectedCards[0].id)
      }
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

    const hasInfluenceForLoseEffect = (effect: IntriguePlayEffect): boolean => {
      const influence = effect.reward?.influence
      if (!influence?.chooseOne || !influence.amounts.length) return true
      const hasPlayableOption = influence.amounts.some(({ faction, amount }) => {
        if (amount >= 0) return true
        const current = gameState!.factionInfluence[faction]?.[activePlayer!.id] ?? 0
        return current >= -amount
      })
      return hasPlayableOption
    }

    const checkIntrigueCardPlayability = (card: IntrigueCard): { playable: boolean; reason?: string } => {
      if (!activePlayer || !gameState) {
        return { playable: false }
      }

      if (intrigueCardHasCustom(card, CustomEffect.BINDU_SUSPENSION)) {
        if (activePlayer.revealed) return { playable: false, reason: 'Bindu: only before Reveal' }
        if (selectedCard) return { playable: false, reason: 'Bindu: before playing a card' }
        if (agentPlaced) return { playable: false, reason: 'Bindu: before Agent placement' }
      }

      if (intrigueCardHasCustom(card, CustomEffect.STAGED_INCIDENT) && gamePhase === GamePhase.COMBAT) {
        if ((combatTroops[activePlayer.id] || 0) < 3) {
          return { playable: false, reason: 'Need at least 3 troops in the Conflict' }
        }
      }

      if (intrigueCardHasCustom(card, CustomEffect.DOUBLE_CROSS) && gamePhase === GamePhase.PLAYER_TURNS) {
        if (activePlayer.solari < 1) return { playable: false, reason: 'Cannot afford 1 Solari' }
        if (activePlayer.troops < 1) return { playable: false, reason: 'Need a troop in supply to deploy' }
        const hasTarget = players.some(
          p => p.id !== activePlayer.id && (combatTroops[p.id] || 0) >= 1
        )
        if (!hasTarget) return { playable: false, reason: 'No opponent with troops in the Conflict' }
      }

      if (intrigueCardHasCustom(card, CustomEffect.URGENT_MISSION)) {
        const hasAgent = Object.entries(gameState.occupiedSpaces).some(([, occ]) => occ.includes(activePlayer.id))
        if (!hasAgent) return { playable: false, reason: 'No Agent on the board to recall' }
      }

      const effects = card.playEffect || []
      if (effects.length === 0) {
        return { playable: false, reason: "Coming soon" } 
      }

      // Filter effects valid for current phase
      const validEffects = effects.filter(effect => {
        if (effect.phase) {
          const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
          return phases.includes(gamePhase)
        }
        return true // No phase restriction means valid for all phases
      })

      if (validEffects.length === 0) {
        return { playable: false, reason: "Invalid phase" }
      }

    // Check if there are any effects with choiceOpt (OR effects)
    const hasChoiceOpt = validEffects.some(e => e.choiceOpt)
    
    if (hasChoiceOpt) {
      let mentatTaken = false
      // For OR effects, check if at least one option is playable
      const playableOptions = validEffects.filter(effect => {
        if (effect.reward?.mentat === true) {
          const hasOtherRewards = Object.keys(effect.reward).some(key => key !== 'mentat')
          if (!hasOtherRewards && gameState.mentatOwner !== null) {
            mentatTaken = true
            return false
          }
        }
        
        if (effect.requirement) {
          if (!intrigueRequirementSatisfied(effect, card, gameState, activePlayer.id)) {
            return false
          }
        }
        
        // Check costs
        if (effect.cost) {
          if (!isAffordable(effect.cost)) {
            return false
          }
        }
        if (!hasInfluenceForLoseEffect(effect)) {
          return false
        }
        
        return true
      })
      
      if (playableOptions.length === 0) {
        // Check which reason to show
        const hasUnaffordableCost = validEffects.some(e => e.cost && !isAffordable(e.cost))
        const hasUnmetRequirement = validEffects.some(e => 
          e.requirement && !intrigueRequirementSatisfied(e, card, gameState, activePlayer.id)
        )
        const hasNoInfluenceToLose = validEffects.some(e => !hasInfluenceForLoseEffect(e))
        
        // Build conditional message from flags
        const reasons: string[] = []
        if (mentatTaken) {
          reasons.push("Mentat already taken")
        }
        if (hasUnaffordableCost) {
          reasons.push("Cannot afford")
        }
        if (hasUnmetRequirement) {
          reasons.push("Requirements not met")
        }
        if (hasNoInfluenceToLose) {
          reasons.push("No influence to lose")
        }
        
        const reason = reasons.length > 0 
          ? reasons.join("\n") 
          : "Cannot afford"
        
        return { playable: false, reason }
      }
      
      return { playable: true }
    } else {
      // For non-OR effects, ALL effects must be playable
      let hasUnaffordableCost = false
      let hasUnmetRequirement = false
      let hasNoInfluenceToLose = false
      // Mentat as only reward and already taken → card not playable, separate from "cannot afford"
      let mentatUnavailable = false
      for (const effect of validEffects) {
        if (effect.reward?.mentat === true) {
          const hasOtherRewards = Object.keys(effect.reward).some(key => key !== 'mentat')
          if (!hasOtherRewards && gameState.mentatOwner !== null) {
            mentatUnavailable = true
          }
        }
        if (effect.requirement) {
          if (!intrigueRequirementSatisfied(effect, card, gameState, activePlayer.id)) {
            hasUnmetRequirement = true
          }
        }
        if (effect.cost) {
          if (!isAffordable(effect.cost)) {
            hasUnaffordableCost = true
          }
        }
        if (!hasInfluenceForLoseEffect(effect)) {
          hasNoInfluenceToLose = true
        }
      }
      const reasons: string[] = []
      if (mentatUnavailable) reasons.push("Mentat already taken")
      if (hasUnaffordableCost) reasons.push("Cannot afford")
      if (hasUnmetRequirement) reasons.push("Requirements not met")
      if (hasNoInfluenceToLose) reasons.push("No influence to lose")
      if (reasons.length > 0) {
        return { playable: false, reason: reasons.join("\n") }
      }
      return { playable: true }
    }
  }

  const hasPlayableIntrigue = playableIntrigueCards.some(card =>
    checkIntrigueCardPlayability(card as IntrigueCard).playable
  )

  const Icon: React.FC<{ type: string; className?: string; alt?: string }> = ({ type, className, alt }) =>
    <img src={`/icon/${type}.png`} alt={alt ?? type} className={className ?? 'resource-icon'} />

  const renderIconValue = (type: string, amount: number, label: string, prefix = '') => (
    <span className="effect-icon-token" title={`${label} ${prefix}${amount}`}>
      <Icon type={type} className="effect-token-icon" alt="" />
      <span className="effect-token-amt">{prefix}{amount}</span>
    </span>
  )

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
      if (cost.influence?.amounts?.length) {
        cost.influence.amounts.forEach((inf: InfluenceAmount, idx: number) => {
          left!.push(
            <span key={`cost-influence-${idx}`} className="effect-influence-line" title={`${inf.faction} influence`}>
              <img src={`/icon/${inf.faction}.png`} alt="" className="effect-faction-icon" />
              <span className="effect-influence-amt">{inf.amount}</span>
            </span>
          )
        })
      } else if (cost.influence) {
        left.push(<span key="influence">Influence</span>)
      }
      if(cost.trash || cost.trashThisCard) {
        left.push(
          <span key="trash" className="effect-icon-token" title="Trash">
            <Icon type="trash" className="effect-token-icon" alt="" />
          </span>
        )
      }
      if(costLabel) left.push(<span key="cost">{costLabel}</span>)
    }
    const right: React.ReactNode[] = []
    right.push(renderAmt(reward.spice,'spice'))
    right.push(renderAmt(reward.water,'water'))
    right.push(renderAmt(reward.solari,'solari'))
    if(reward.combat) right.push(<React.Fragment key="combat">{renderIconValue('dagger', reward.combat, 'Combat', '+')}</React.Fragment>)
    if(reward.drawCards) right.push(<React.Fragment key="draw">{renderIconValue('draw', reward.drawCards, 'Draw')}</React.Fragment>)
    if(reward.troops) right.push(<React.Fragment key="troops">{renderIconValue('troop', reward.troops, 'Troops')}</React.Fragment>)
    if(reward.intrigueCards) right.push(<React.Fragment key="intrigue">{renderIconValue('intrigue', reward.intrigueCards, 'Intrigue', '+')}</React.Fragment>)
    if(reward.trash || reward.trashThisCard) {
      right.push(
        <span key="trash" className="effect-icon-token" title="Trash">
          <Icon type="trash" className="effect-token-icon" alt="" />
        </span>
      )
    }
    if (reward.influence?.amounts?.length) {
      reward.influence.amounts.forEach((inf: InfluenceAmount, idx: number) => {
        right.push(
          <span key={`influence-${idx}`} className="effect-influence-line" title={`${inf.faction} influence +${inf.amount}`}>
            <img src={`/icon/${inf.faction}.png`} alt="" className="effect-faction-icon" />
            <span className="effect-influence-amt">+{inf.amount}</span>
          </span>
        )
      })
    }
    if(reward.victoryPoints) right.push(<span key="vp">{reward.victoryPoints} VP</span>)
    if(reward.acquire) {
      const limit = reward.acquire.limit
      const toTopText = reward.acquireToTopThisRound ? ' to top of deck' : ''
      right.push(<span key="acquire">Acquire card (cost {limit} or less{toTopText})</span>)
    }
    if(reward.custom) {
      // Special handling for SECRETS_STEAL to show player colors
      if(reward.custom === CustomEffect.SECRETS_STEAL && players) {
        const eligiblePlayers = players.filter(p => 
          p.id !== activePlayer?.id && p.intrigueCount >= 4
        )
        
        if (eligiblePlayers.length === 0) {
          right.push(
            <span key="custom">
              Steal intrigue from player with 4 or more (0)
            </span>
          )
        } else {
          right.push(
            <span key="custom" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span>Steal intrigue from player with 4 or more (</span>
              {eligiblePlayers.map((p, idx) => (
                <React.Fragment key={p.id}>
                  {idx > 0 && <span> </span>}
                  <AgentIcon playerId={p.id} />
                </React.Fragment>
              ))}
              <span>)</span>
            </span>
          )
        }
      } else {
        const customText = PLAY_EFFECT_TEXTS[reward.custom] || reward.custom
        right.push(<span key="custom">{customText}</span>)
      }
    }
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
    if (activeCardSelect) {
      return (
        <CardSearch
          isOpen={true}
          player={activePlayer!}
          cards={activeCardSelect.cards}
          piles={activeCardSelect.piles}
          customFilter={activeCardSelect.filter}
          selectionCount={activeCardSelect.selectionCount}
          text={activeCardSelect.prompt}
          isRevealTurn={activeCardSelect.selectionCount > 1}
          onSelect={selectedCards => {
            if (onResolveCardSelect) {
              onResolveCardSelect(activeCardSelect.id, selectedCards.map(card => card.id))
            }
            setActiveCardSelect(null)
          }}
          onCancel={() => {
            setActiveCardSelect(null)
          }}
        />
      )
    }

    if (opponentCardSelect) {
      return (
        <CardSearch
          isOpen={true}
          player={opponentCardSelect}
          piles={[CardPile.DECK]}
          customFilter={card => !opponentCardSelect.playArea.some(pc => pc.id === card.id)}
          selectionCount={1}
          text={`Choose a card from ${opponentCardSelect.leader?.name || opponentCardSelect.color} to discard`}
          isRevealTurn={false}
          onSelect={selectedCards => {
            if (onOpponentDiscardCard) {
              onOpponentDiscardCard(opponentCardSelect.id, selectedCards[0].id)
            }
            setOpponentCardSelect(null)
          }}
          onCancel={() => setOpponentCardSelect(null)}
        />
      )
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
              {card.rewards.map(reward => {
                const isVoiceReward = reward.reward.custom === CustomEffect.THE_VOICE
                const isMasterstrokeReward = reward.source.type === GainSource.MASTERSTROKE
                const isMemnonReward = reward.source.type === GainSource.MEMNON_HIGH_COUNCIL
                const selectionActive = voiceSelectionActive || masterstrokeSelectionActive || memnonHighCouncilSelectionActive
                const disabled = selectionActive || reward.disabled
                const tooltip = voiceSelectionActive
                  ? 'Finish The Voice selection before claiming other rewards.'
                  : masterstrokeSelectionActive
                    ? 'Finish Masterstroke faction selection before claiming other rewards.'
                    : memnonHighCouncilSelectionActive
                    ? 'Finish faction selection before claiming other rewards.'
                    : reward.isTrash
                    ? `⚠️ Trashing this card will cancel effects that haven't been applied yet. Cancels: ${getCancelledRewards(card, reward)}`
                    : undefined
                return (
                <button
                  key={reward.id}
                  className={`effect-btn ${reward.isTrash ? 'trash-reward' : ''}`}
                  onClick={() => {
                    if (!onClaimReward) return
                    if (isVoiceReward && onVoiceSelectionStart) {
                      onVoiceSelectionStart(reward.id)
                    } else if (isMasterstrokeReward && onMasterstrokeSelectionStart) {
                      onMasterstrokeSelectionStart(reward.id)
                    } else if (isMemnonReward && onMemnonHighCouncilSelectionStart) {
                      onMemnonHighCouncilSelectionStart(reward.id)
                    } else {
                      onClaimReward(reward.id)
                    }
                  }}
                  disabled={disabled}
                  title={tooltip}
                >
                  {reward.isTrash && <span className="warning-icon">⚠️ </span>}
                  {isMasterstrokeReward ? (
                    <span className="effect-label">
                      Masterstroke: Choose 2 <Icon type="bump" className="effect-token-icon" alt="" />
                    </span>
                  ) : isMemnonReward ? (
                    <span className="effect-label">
                      Connections: Choose 1 <Icon type="bump" className="effect-token-icon" alt="" />
                    </span>
                  ) : renderLabel({ reward: reward.reward })}
                </button>
              )})}
              
              {/* Optional Effects */}
              {card.optional.map((eff, idx) => {
                const disabled = voiceSelectionActive || masterstrokeSelectionActive || !isAffordable(eff.cost)
                return (
                <button 
                  key={idx}
                  className="effect-btn optional"
                  disabled={disabled}
                  onClick={() => handleEffectClick(eff)}
                  title={voiceSelectionActive || masterstrokeSelectionActive ? 'Finish the current selection before resolving other effects.' : undefined}
                >
                  {renderLabel(eff)}
                </button>
              )})}
              
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
                      disabled={cardSelectChoice.disabled || voiceSelectionActive || masterstrokeSelectionActive}
                      title={voiceSelectionActive || masterstrokeSelectionActive ? 'Finish the current selection before resolving other choices.' : undefined}
                    >
                      {cardSelectChoice.prompt}
                    </button>
                  )
                } else {
                  // Render FixedOptionsChoice with all options horizontally with OR separator
                  const fixedChoice = choice as FixedOptionsChoice
                  return (
                    <div key={choice.id} className="or-choice-container">
                      {fixedChoice.options.map((option, oidx) => {
                        // Get disabled tooltip text if option is disabled and has a custom effect
                        let disabledTooltip: string | undefined
                        if (option.disabled && option.reward.custom) {
                          disabledTooltip = PLAY_EFFECT_DISABLED_TEXTS[option.reward.custom] || 'This option is not available'
                        }
                        
                        return (
                          <React.Fragment key={`${choice.id}-${oidx}`}>
                            {oidx > 0 && <span className="or-separator">OR</span>}
                            <button
                              className="effect-btn choice or-option"
                              disabled={option.disabled || !isAffordable(option.cost) || voiceSelectionActive || masterstrokeSelectionActive}
                              onClick={() => onResolveChoice && onResolveChoice(choice.id, option.reward, choice.source)}
                              title={voiceSelectionActive || masterstrokeSelectionActive ? 'Finish the current selection before resolving other choices.' : disabledTooltip}
                            >
                              {renderLabel(option)}
                            </button>
                          </React.Fragment>
                        )
                      })}
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

  const renderVoiceSelectionBanner = () => {
    if (!voiceSelectionActive) return null
    return (
      <div className="voice-selection-banner">
        <span>Select any board space to block with The Voice.</span>
        {onVoiceSelectionCancel && (
          <button className="secondary-btn" onClick={onVoiceSelectionCancel}>
            Cancel
          </button>
        )}
      </div>
    )
  }

  const renderOpponentDiscardPanel = () => {
    const effect = opponentDiscardState?.effect
    if (!effect) return null
    
    // For REVEREND_MOTHER_MOHIAM, show player selection if no current opponent selected
    if (effect === CustomEffect.REVEREND_MOTHER_MOHIAM && !opponentDiscardState?.currentOpponent) {
      const remainingOpponents = opponentDiscardState?.remainingOpponents || []
      const eligibleOpponents = players.filter(p => 
        remainingOpponents.includes(p.id) && p.handCount > 0
      )
      
      if (eligibleOpponents.length === 0) {
        // All opponents processed or have no cards
        return null
      }
      
      return (
        <div className="opponent-discard-panel">
          <div className="panel-title">
            Reverend Mother Mohiam
          </div>
          <div className="panel-body">
            <p>Choose which opponent to discard 2 cards from:</p>
            <div className="panel-actions">
              {eligibleOpponents.map(opponent => (
                <button
                  key={opponent.id}
                  className="primary-btn"
                  onClick={() => {
                    if (onOpponentDiscardChoice) {
                      // Set this opponent as current
                      onOpponentDiscardChoice(opponent.id, 'discard')
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <AgentIcon playerId={opponent.id} />
                  <span>{opponent.leader?.name || opponent.color} ({opponent.handCount} cards)</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
    
    const currentOpponentId = opponentDiscardState?.currentOpponent
    if (!currentOpponentId) return null
    const opponent = players.find(p => p.id === currentOpponentId)
    if (!opponent) return null
    const discardCounts = opponentDiscardState?.discardCounts || {}
    const discarded = discardCounts[currentOpponentId] || 0
    const required = effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? 2 : 1
    const remaining = Math.max(0, required - discarded)
    const availableCards = opponent.handCount
    const discardableNow = Math.min(remaining, availableCards)
    const canLoseTroop = (combatTroops[currentOpponentId] || 0) > 0
    const canDiscardCard = Boolean(onOpponentDiscardCard) && discardableNow > 0

    return (
      <div className="opponent-discard-panel">
        <div className="panel-title">
          {effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? 'Reverend Mother Mohiam' : 'Test of Humanity'}
        </div>
        <div className="panel-body">
          <div className="opponent-row">
            <AgentIcon playerId={opponent.id} />
            <span>{opponent.leader?.name || opponent.color}</span>
          </div>
          {effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? (
            <>
              {discardableNow > 0 ? (
                <>
                  <p>{`Discard ${discardableNow} more card${discardableNow !== 1 ? 's' : ''} from this player's hand.`}</p>
                  <button
                    className="primary-btn"
                    onClick={() => canDiscardCard && setOpponentCardSelect(opponent)}
                    disabled={!canDiscardCard}
                  >
                    Choose card to discard
                  </button>
                </>
              ) : (
                <>
                  <p>This opponent has no cards available to discard.</p>
                  <button
                    className="primary-btn"
                    onClick={() => onOpponentNoCardAck && onOpponentNoCardAck(opponent.id)}
                    disabled={!onOpponentNoCardAck}
                  >
                    Acknowledge
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <p>Each opponent must discard a card or lose one deployed troop.</p>
              <div className="panel-actions">
                <button
                  className="secondary-btn"
                  onClick={() => canDiscardCard && setOpponentCardSelect(opponent)}
                  disabled={!canDiscardCard}
                >
                  Discard a card
                </button>
                <button
                  className="danger-btn"
                  onClick={() => onOpponentDiscardChoice && onOpponentDiscardChoice(opponent.id, 'loseTroop')}
                  disabled={!onOpponentDiscardChoice || !canLoseTroop}
                >
                  Lose deployed troop
                </button>
              </div>
              {!canLoseTroop && (
                <small className="hint-text">
                  {canDiscardCard ? 'No deployed troops — must discard a card.' : 'No cards or troops available.'}
                </small>
              )}
            </>
          )}
        </div>
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
                  {rank}. <AgentIcon playerId={playerId} />:
                  <span className="combat-strength-token" title={`${strength} strength`}>
                    <Icon type="dagger" className="combat-strength-icon" alt="" />
                    {strength}
                  </span>
                  {player && ` (${player.leader.name})`}
                  {hasPassed && <span className="pass-indicator"> ✓ Passed</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {renderVoiceSelectionBanner()}
      {renderOpponentDiscardPanel()}
      {renderEffectsBar()}
      {showTroopActionRail && (
        <div className="turn-controls-troop-rail" role="group" aria-label="Conflict troops">
          <button
            type="button"
            className="troop-action-button troop-deploy-button"
            onClick={() => onAddTroop(activePlayer.id)}
            disabled={
              !canDeployTroops || activePlayer.troops <= 0 || deployableTroops <= 0
            }
            aria-label={`Deploy one troop. ${deployableTroops} available to deploy.`}
            title={`Deploy troop (${deployableTroops} available)`}
          >
            <span className="troop-available-count">{deployableTroops}</span>
            <img src="/icon/troop.png" alt="" className="troop-action-icon" />
            <span className="troop-action-arrow" aria-hidden="true">➤</span>
          </button>
          <div className="troop-action-status" aria-label={`${retreatableTroops} troops deployed this turn`}>
            <span className="troop-status-label">Deployed</span>
            <span className="troop-deployed-count">{retreatableTroops}</span>
          </div>
          <button
            type="button"
            className="troop-action-button troop-retreat-button"
            onClick={() => onRemoveTroop(activePlayer.id)}
            disabled={!canDeployTroops || retreatableTroops <= 0}
            aria-label={`Retreat one troop. ${retreatableTroops} can retreat.`}
            title={`Retreat troop (${retreatableTroops} available)`}
          >
            <span className="troop-action-arrow" aria-hidden="true">◄</span>
            <img src="/icon/troop.png" alt="" className="troop-action-icon" />
          </button>
        </div>
      )}
      {
        <ChoiceDialog />
        
      }

      <div
        className="turn-controls"
        hidden={
          Boolean(activeCardSelect) ||
          Boolean(opponentCardSelect) ||
          isCardSelectionOpen ||
          isIntrigueSelectionOpen ||
          showSelectiveBreeding ||
          showTrashPopup
        }
      >
        <div className="turn-controls-expanded-only">
          {showAutoApplyRewardsButton && (
            <div className="turn-controls-auto-apply-row">
              <button
                type="button"
                className="get-mandatory-effects-button"
                onClick={() => onAutoApplyRewards && onAutoApplyRewards()}
                disabled={voiceSelectionActive || masterstrokeSelectionActive}
                title={
                  voiceSelectionActive || masterstrokeSelectionActive
                    ? 'Finish the current selection before claiming rewards.'
                    : 'Auto-apply non-interactive rewards (skips The Voice, Reverend Mother Mohiam, Test of Humanity, Masterstroke, trash, and OR choices)'
                }
              >
                Auto-Apply Effects
              </button>
            </div>
          )}
          <div className="active-player-info">
            <div className={`color-indicator ${activePlayer.color}`}></div>
            {activePlayer.leader.name}
            {getLeaderImage(activePlayer.leader.name) && (
              <button
                type="button"
                className="see-leader-button"
                onClick={() => setIsLeaderImageOpen(true)}
                title="See Leader"
                aria-label={`View ${activePlayer.leader.name}`}
              >
                See Leader
              </button>
            )}
          </div>
          <LeaderImageModal
            leader={activePlayer.leader}
            isOpen={isLeaderImageOpen}
            onClose={() => setIsLeaderImageOpen(false)}
          />
          {activeIntrigueThisRound.length > 0 && (
            <div className="active-intrigue-peek" aria-label="Active intrigue this round">
              <div className="active-intrigue-preview" title="Hover to view active intrigue this round">
                <img
                  src={activeIntrigueThisRound[0].image}
                  alt={activeIntrigueThisRound[0].name}
                  className="active-intrigue-preview-img"
                />
              </div>
              <div className="active-intrigue-panel" role="region" aria-label="Active intrigue cards">
                {activeIntrigueThisRound.map(card => (
                  <img
                    key={card.id}
                    src={card.image}
                    alt={card.name}
                    className="active-intrigue-img"
                    title={card.name}
                  />
                ))}
              </div>
            </div>
          )}
        <div className="turn-controls-buttons-grid">
          <div className="utility-buttons utility-buttons--with-inline-card">
            <button 
              className="view-influence-button"
              onClick={onTurnHistoryToggle}
              title="View Turn History"
            >
              Turn History
            </button>
            <button 
              className="view-influence-button"
              onClick={onOpenPlayerOverview}
              title="View Player Overview"
            >
              Player Overview
            </button>
            <div
              className="selected-card-inline-slot"
              aria-label={
                selectedCards.length > 0
                  ? `Reveal: ${selectedCards.map(c => c.name).join(', ')}`
                  : selectedCard
                    ? `Played card: ${selectedCard.name}`
                    : 'No card selected'
              }
            >
              {selectedCards.length > 0 ? (
                <div className="selected-cards-reveal-strip">
                  {selectedCards.map(card =>
                    card.image ? (
                      <img
                        key={card.id}
                        className="selected-card-inline-img selected-card-inline-img--sm"
                        src={card.image}
                        alt={card.name}
                        title={card.name}
                      />
                    ) : (
                      <span key={card.id} className="selected-card-name-fallback">
                        {card.name}
                      </span>
                    )
                  )}
                </div>
              ) : selectedCard &&
                !activePlayer.revealed &&
                !isRevealTurn ? (
                selectedCard.image ? (
                  <img
                    className="selected-card-inline-img"
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    title={selectedCard.name}
                  />
                ) : (
                  <span className="selected-card-inline-name">{selectedCard.name}</span>
                )
              ) : (
                <span className="selected-card-inline-placeholder" aria-hidden />
              )}
            </div>
          </div>
          <div className="control-buttons">
          <div className="button-pair">
            <button 
              className="play-card-button"
              onClick={handlePlayCard}
              disabled={
                activePlayer.agents === 0 ||
                activePlayer.handCount === 0 ||
                canEndTurn ||
                agentPlaced ||
                hasOpponentDiscard ||
                hasMandatoryRewards
              }
              hidden={isCombatPhase || isEndGame || hidePlayAndReveal}
              title={
                hasOpponentDiscard
                  ? 'Resolve opponent discard instructions before taking new actions.'
                  : hasMandatoryRewards
                    ? 'Claim pending rewards before taking new actions.'
                    : agentPlaced
                      ? 'You have already placed an agent this turn'
                      : activePlayer.handCount === 0
                        ? 'No cards in hand.'
                        : undefined
              }
            >
              Play Card
            </button>
            <button 
              className="reveal-turn-button"
              onClick={handleRevealTurn}
              disabled={canEndTurn || isCombatPhase || agentPlaced || hasOpponentDiscard || hasMandatoryRewards}
              hidden={isCombatPhase || isEndGame || hidePlayAndReveal}
              title={
                hasOpponentDiscard
                  ? 'Resolve opponent discard instructions before taking new actions.'
                  : hasMandatoryRewards
                    ? 'Claim pending rewards before taking new actions.'
                    : agentPlaced ? "You have already placed an agent this turn" : undefined
              }
            >
              Reveal Turn
            </button>
          </div>
          <div className="button-pair">
            {!isCombatPhase && <button 
              className="play-intrigue-button"
              onClick={handlePlayIntrigueClick}
              disabled={
                activePlayer.intrigueCount === 0 ||
                playableIntrigueCards.length === 0 ||
                !hasPlayableIntrigue
              }
              title={
                playableIntrigueCards.length === 0
                  ? 'No intrigue cards available in the deck.'
                  : !hasPlayableIntrigue
                    ? 'No intrigue card can be played in the current situation.'
                    : undefined
              }
            >
              Play Intrigue ({activePlayer.intrigueCount})
            </button>}
            {isCombatPhase && <button 
              className="play-intrigue-button"
              onClick={handlePlayCombatIntrigue}
              disabled={
                activePlayer.intrigueCount === 0 ||
                playableIntrigueCards.length === 0 ||
                !hasPlayableIntrigue
              }
              title={
                playableIntrigueCards.length === 0
                  ? 'No combat intrigue cards available in the deck.'
                  : !hasPlayableIntrigue
                    ? 'No combat intrigue card can be played in the current situation.'
                    : undefined
              }
            >
              Play Combat Intrigue ({activePlayer.intrigueCount})
            </button>}
            {!isCombatPhase && <button 
              className="end-turn-button"
              onClick={handleEndTurn}
              disabled={endTurnDisabled}
              title={
                endTurnDisabled && canEndTurn
                  ? hasUnresolvedPendingRewards
                    ? 'Claim or resolve all pending rewards before ending your turn.'
                    : hasOpponentDiscard
                      ? 'Resolve opponent discard instructions before ending your turn.'
                      : hasPendingChoicesToResolve
                        ? 'Resolve pending choices before ending your turn.'
                        : selectionBlocksEndTurn
                          ? 'Finish the current selection before ending your turn.'
                          : undefined
                  : undefined
              }
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
        </div>
        </div>
        </div>
      </div>

      {/* Card selection overlays - outside turn-controls so they stay visible when controls are hidden */}
      <CardSearch
        isOpen={isCardSelectionOpen}
        cards={activePlayer.deck}
        selectionCount={isRevealTurn ? activePlayer.handCount : 1}
        onSelect={handleCardSelection}
        onCancel={() => {
          setIsCardSelectionOpen(false)
          setIsRevealTurn(false)
        }}
        isRevealTurn={isRevealTurn}
        text={isRevealTurn ? 'Select Cards to Reveal' : 'Select a Card to Play'}
      />

      <CardSearch
        isOpen={isIntrigueSelectionOpen}
        cards={playableIntrigueCards}
        selectionCount={1}
        onSelect={handleIntrigueSelection}
        onCancel={() => setIsIntrigueSelectionOpen(false)}
        isRevealTurn={false}
        text="Select an Intrigue card to play"
        getCardPlayability={(card) => checkIntrigueCardPlayability(card as IntrigueCard)}
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
        onCancel={() => { setShowTrashPopup(false); setPendingEffect(null) }}
        isRevealTurn={false}
        text="Select card to trash"
      />

      {pendingIntrigueTarget && (
        <PlayerTargetDialog
          card={pendingIntrigueTarget}
          players={players}
          currentPlayerId={activePlayer.id}
          onSelectTarget={tid => {
            onPlayIntrigue(activePlayer.id, pendingIntrigueTarget.id, tid)
            setPendingIntrigueTarget(null)
          }}
          onCancel={() => setPendingIntrigueTarget(null)}
        />
      )}

      {gameState?.pendingRapidMobilization === activePlayer.id && onMobilizeGarrison && (
        <div className="dialog-overlay">
          <div className="target-dialog">
            <h3>Rapid Mobilization</h3>
            <p>Deploy troops from garrison to the Conflict (0–{activePlayer.troops}).</p>
            <input
              type="number"
              min={0}
              max={activePlayer.troops}
              value={mobilizeCount}
              onChange={e =>
                setMobilizeCount(
                  Math.max(0, Math.min(activePlayer.troops, Number(e.target.value) || 0))
                )
              }
            />
            <button
              type="button"
              onClick={() => {
                onMobilizeGarrison(activePlayer.id, mobilizeCount)
                setMobilizeCount(0)
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default TurnControls 