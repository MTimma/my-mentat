import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { Player, Card, IntrigueCard, IntrigueCardType, Cost, Reward, Gain, PendingChoice, FixedOptionsChoice, CardSelectChoice, OptionalEffect, ChoiceType, CardPile, PendingReward, GainSource, CustomEffect, GameTurn, GamePhase, FactionType, GameState, ControlMarkerType, IntriguePlayEffect, InfluenceAmount, InfluenceAmounts, TurnType, RewardType, AUTO_APPLIED_CUSTOM_EFFECTS } from '../../types/GameTypes'
import { intrigueCardHasCustom } from '../../utils/intrigueCardCustom'
import CardSearch from '../CardSearch/CardSearch'
import AgentIcon from '../AgentIcon/AgentIcon'
import { PLAY_EFFECT_TEXTS, PLAY_EFFECT_DISABLED_TEXTS } from '../../data/effectTexts'
import { intrigueRequirementSatisfied } from '../GameContext/requirements'
import { getPlayAreaCardsForTurnView } from '../../utils/playAreaDisplay'
import {
  getAnyFactionInfluenceGainIcon,
  getAnyFactionInfluenceLossIcon,
  isAnyFactionInfluenceChoice,
} from '../../utils/influenceDisplay'
import { canAffordInfluenceOptionalEffect } from '../../utils/influenceChoices'
import { getLeaderIconPath, getLeaderImage } from '../../data/leaders'
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
  onClaimReward?: (rewardId: string, customData?: { trashedCardId?: number; [key: string]: unknown }) => void
  onClaimAllRewards?: () => void
  onAutoApplyRewards?: () => void
  autoApplyMandatoryRewards?: boolean
  autoAppliedRewardSummary?: Array<{ id: string; sourceName: string; reward: Reward }>
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
  isHistoryView?: boolean
  onOpenPlayerOverview?: () => void
  onTurnHistoryToggle?: () => void
}

const TurnHistoryIcon = () => (
  <svg className="utility-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 6.5h8.5" />
    <path d="M5 11.5h6.5" />
    <path d="M5 16.5h5" />
    <circle cx="16.5" cy="15.5" r="4.25" />
    <path d="M16.5 13v2.7l2 1.1" />
    <path d="M3.5 6.5h.01M3.5 11.5h.01M3.5 16.5h.01" />
  </svg>
)

const PlayerOverviewIcon = () => (
  <svg className="utility-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="7.25" cy="7.25" r="2.25" />
    <path d="M3.75 13.25c.6-1.85 1.85-2.75 3.5-2.75s2.9.9 3.5 2.75" />
    <circle cx="15.75" cy="6.75" r="1.85" />
    <path d="M12.85 11.75c.5-1.35 1.5-2 2.9-2s2.4.65 2.9 2" />
    <path d="M5 20v-3.25" />
    <path d="M11 20v-5.25" />
    <path d="M17 20v-7.25" />
    <path d="M3.5 20h16.75" />
  </svg>
)

const MagnifyingGlassIcon = () => (
  <svg className="see-leader-magnifier" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="10.5" cy="10.5" r="5.5" />
    <path d="M15 15l4.5 4.5" />
  </svg>
)

/** Rewards that require a tap / modal / board step (not plain +resource claims), e.g. The Voice. */
function rewardNeedsInteractionHighlight(reward: Reward): boolean {
  if (reward.custom) {
    return !AUTO_APPLIED_CUSTOM_EFFECTS.includes(reward.custom)
  }
  if (reward.mentat || reward.acquire) return true
  if (reward.influence?.chooseOne) return true
  return false
}

const TurnControls: React.FC<TurnControlsProps> = ({
  activePlayer,
  canEndTurn,
  onPlayCard,
  onPlayIntrigue,
  onMobilizeGarrison,
  onPlayCombatIntrigue,
  onReveal,
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
  pendingRewards = [],
  onClaimReward,
  onAutoApplyRewards,
  autoApplyMandatoryRewards = true,
  autoAppliedRewardSummary = [],
  agentPlaced = false,
  opponentDiscardState,
  onOpponentDiscardChoice,
  onOpponentDiscardCard,
  combatTroops = {},
  onVoiceSelectionStart,
  voiceSelectionActive = false,
  onMasterstrokeSelectionStart,
  masterstrokeSelectionActive = false,
  onMemnonHighCouncilSelectionStart,
  memnonHighCouncilSelectionActive = false,
  onOpponentNoCardAck,
  intrigueDeck,
  gamePhase,
  activeIntrigueThisRound = [],
  gameState,
  isHistoryView = false,
  onOpenPlayerOverview,
  onTurnHistoryToggle
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [isIntrigueSelectionOpen, setIsIntrigueSelectionOpen] = useState(false)
  const [showTrashPopup, setShowTrashPopup] = useState(false)
  const [isLeaderImageOpen, setIsLeaderImageOpen] = useState(false)
  const [pendingIntrigueTarget, setPendingIntrigueTarget] = useState<IntrigueCard | null>(null)
  const [mobilizeCount, setMobilizeCount] = useState(0)

  useEffect(() => {
    if (activePlayer?.id !== undefined && gameState?.pendingRapidMobilization === activePlayer.id) {
      setMobilizeCount(0)
    }
  }, [gameState?.pendingRapidMobilization, activePlayer?.id])

  useEffect(() => {
    setIsRevealTurn(false)
  }, [activePlayer?.id])
  const [pendingEffect, setPendingEffect] = useState<typeof optionalEffects[0] | null>(null)
  const [pendingTrashReward, setPendingTrashReward] = useState<PendingReward | null>(null)
  const [activeCardSelect, setActiveCardSelect] = useState<CardSelectChoice | null>(null)
  const [opponentCardSelect, setOpponentCardSelect] = useState<Player | null>(null)
  const [activeFixedChoice, setActiveFixedChoice] = useState<FixedOptionsChoice | null>(null)
  const [activeCardEffectSource, setActiveCardEffectSource] = useState<{ type: GainSource; id: number } | null>(null)
  const [activeCardPreviewId, setActiveCardPreviewId] = useState<number | null>(null)
  const [activeIntriguePreviewCard, setActiveIntriguePreviewCard] = useState<IntrigueCard | null>(null)

  /** Clears played-card overlay; avoids stale preview ids matching deck/discard after trash. */
  const closeCardEffectsDialog = useCallback(() => {
    setActiveCardPreviewId(null)
    setActiveCardEffectSource(null)
  }, [])

  const hasOpponentDiscard = Boolean(opponentDiscardState)
  const hasMandatoryRewards = pendingRewards.some(r => !r.disabled && !r.isTrash)
  // Automatically open CardSelectChoice if it's the only pending choice and not already open
  useEffect(() => {
    const cardSelectChoices = pendingChoices.filter(c => c.type === ChoiceType.CARD_SELECT) as CardSelectChoice[]
    if (!isHistoryView && cardSelectChoices.length === 1 && !activeCardSelect && !voiceSelectionActive && !masterstrokeSelectionActive && !hasOpponentDiscard) {
      setActiveCardSelect(cardSelectChoices[0])
    } else if (cardSelectChoices.length === 0 && activeCardSelect) {
      // Clear activeCardSelect if there are no more card select choices
      setActiveCardSelect(null)
    }
  }, [pendingChoices, activeCardSelect, voiceSelectionActive, masterstrokeSelectionActive, hasOpponentDiscard])

  useEffect(() => {
    if (activeFixedChoice && !pendingChoices.some(choice => choice.id === activeFixedChoice.id)) {
      setActiveFixedChoice(null)
    }
  }, [activeFixedChoice, pendingChoices])

  useEffect(() => {
    if (!isHistoryView) return

    setActiveCardPreviewId(null)
    setActiveCardEffectSource(null)
    setActiveCardSelect(null)
    setOpponentCardSelect(null)
    setActiveFixedChoice(null)
    setPendingEffect(null)
    setPendingTrashReward(null)
    setIsCardSelectionOpen(false)
    setIsIntrigueSelectionOpen(false)
    setShowTrashPopup(false)
    setPendingIntrigueTarget(null)
    setIsRevealTurn(false)
    setActiveIntriguePreviewCard(null)
  }, [
    isHistoryView,
    activePlayer?.id,
    gameState?.currTurn?.playerId,
    gameState?.currTurn?.type,
    gameState?.currTurn?.cardId,
    gameState?.currTurn?.revealedCardIds?.join(',')
  ])

  const isEndGame = gamePhase === GamePhase.END_GAME

  const playedIntrigueCards = (gameState?.currTurn?.playedIntrigueCard || [])
    .map(play =>
      gameState?.intrigueDiscard.find(card => card.id === play.cardId) ||
      gameState?.intrigueDeck.find(card => card.id === play.cardId) ||
      activeIntrigueThisRound.find(card => card.id === play.cardId)
    )
    .filter((card): card is IntrigueCard => Boolean(card))
  const playedIntriguePreviewIdsKeyEarly = playedIntrigueCards.map(c => c.id).join(',')
  const playAreaPreviewIdsKeyEarly = activePlayer
    ? [
        ...activePlayer.playArea,
        ...(selectedCard && !activePlayer.revealed && !isRevealTurn ? [selectedCard] : [])
      ]
        .filter((card, index, cards) => cards.findIndex(c => c.id === card.id) === index)
        .map(c => c.id)
        .join(',')
    : ''

  useEffect(() => {
    if (!activePlayer || isHistoryView || activeCardPreviewId === null) return
    const ids =
      playAreaPreviewIdsKeyEarly.length > 0
        ? playAreaPreviewIdsKeyEarly.split(',').map(Number)
        : []
    if (!ids.includes(activeCardPreviewId)) {
      setActiveCardPreviewId(null)
      setActiveCardEffectSource(null)
    }
  }, [activePlayer, isHistoryView, activeCardPreviewId, playAreaPreviewIdsKeyEarly])

  useEffect(() => {
    if (isHistoryView || activeIntriguePreviewCard === null) return
    const ids =
      playedIntriguePreviewIdsKeyEarly.length > 0
        ? playedIntriguePreviewIdsKeyEarly.split(',').map(Number)
        : []
    if (!ids.includes(activeIntriguePreviewCard.id)) {
      setActiveIntriguePreviewCard(null)
      setActiveCardEffectSource(null)
    }
  }, [activeIntriguePreviewCard, isHistoryView, playedIntriguePreviewIdsKeyEarly])

  if (!activePlayer) return null
  const activeLeaderIconPath = getLeaderIconPath(activePlayer.leader.name)
  const isKwisatzHaderach = (card: Card) =>
    card.playEffect?.some(effect =>
      effect.beforePlaceAgent?.recallAgent ||
      effect.reward?.custom === CustomEffect.KWISATZ_HADERACH
    ) ?? false
  const hasRecallableAgent = Object.values(gameState?.occupiedSpaces ?? {}).some(playerIds =>
    playerIds.includes(activePlayer.id)
  )
  const canPlayKwisatzWithNoAgents =
    activePlayer.agents === 0 &&
    hasRecallableAgent &&
    activePlayer.deck.some(isKwisatzHaderach)

  /** After agent placement or while in reveal flow / post-reveal, hide primary turn actions. */
  const hidePlayAndReveal =
    !isCombatPhase && !isEndGame && (Boolean(agentPlaced) || activePlayer.revealed || isRevealTurn)
  const primaryTurnActionsHidden = isHistoryView || isCombatPhase || isEndGame || hidePlayAndReveal
  const playActionDisabled =
    (activePlayer.agents === 0 && !canPlayKwisatzWithNoAgents) ||
    activePlayer.handCount === 0 ||
    isHistoryView ||
    canEndTurn ||
    agentPlaced ||
    hasOpponentDiscard ||
    hasMandatoryRewards
  const revealActionDisabled =
    isHistoryView || canEndTurn || isCombatPhase || agentPlaced || hasOpponentDiscard || hasMandatoryRewards
  const playActionTitle =
    hasOpponentDiscard
      ? 'Resolve opponent discard instructions before taking new actions.'
      : hasMandatoryRewards
        ? 'Claim pending rewards before taking new actions.'
        : agentPlaced
          ? 'You have already placed an agent this turn'
          : activePlayer.handCount === 0
            ? 'No cards in hand.'
            : activePlayer.agents === 0 && canPlayKwisatzWithNoAgents
              ? 'Play Kwisatz Haderach by recalling one of your agents.'
              : activePlayer.agents === 0
                ? 'No agents remaining.'
                : undefined
  const remainingAgentsLabel = `${activePlayer.agents} agent${activePlayer.agents === 1 ? '' : 's'} left`
  const showRevealPersuasionRemaining =
    activePlayer.revealed && Boolean(gameState?.canAcquireIR)
  const revealPersuasionRemaining = activePlayer.persuasion
  const troopsInConflict = combatTroops[activePlayer.id] || 0
  const revealTroopStrength = troopsInConflict * 2
  const revealCombatTotal =
    troopsInConflict > 0
      ? Math.max(
          activePlayer.combatValue || 0,
          gameState?.combatStrength?.[activePlayer.id] ?? 0,
          revealTroopStrength
        )
      : 0
  const revealSwordStrength = Math.max(0, revealCombatTotal - revealTroopStrength)
  const isActiveRevealTurn = activePlayer.revealed && gameState?.currTurn?.type === TurnType.REVEAL
  const showRevealCombat = isActiveRevealTurn && revealCombatTotal > 0
  const revealActionTitle =
    hasOpponentDiscard
      ? 'Resolve opponent discard instructions before taking new actions.'
      : hasMandatoryRewards
        ? 'Claim pending rewards before taking new actions.'
        : agentPlaced ? 'You have already placed an agent this turn' : undefined
  const playableIntrigueCards = useMemo(
    () =>
      intrigueDeck.filter(card => {
        if (gamePhase === GamePhase.END_GAME) {
          if (card.type === IntrigueCardType.ENDGAME) return true
          // Allow special cases like Tiebreaker (combat intrigue with an endgame effect).
          return Boolean(
            card.playEffect?.some(e => {
              if (!e.phase) return false
              const phases = Array.isArray(e.phase) ? e.phase : [e.phase]
              return phases.includes(GamePhase.END_GAME)
            })
          )
        }
        if (gamePhase === GamePhase.COMBAT) {
          return card.type === IntrigueCardType.COMBAT
        }
        // In normal Player Turns, only Plot intrigue can be played (combat handled separately)
        return card.type === IntrigueCardType.PLOT
      }),
    [intrigueDeck, gamePhase]
  )

  const handCardSearchIdsKey = [...activePlayer.deck]
    .map(c => c.id)
    .sort((a, b) => a - b)
    .join(',')
  const handCardsForCardSearch = useMemo(() => activePlayer.deck, [handCardSearchIdsKey])

  const playCardPickerPlayabilityKey = useMemo(
    () => `${activePlayer.agents}|${JSON.stringify(gameState?.occupiedSpaces ?? {})}`,
    [activePlayer.agents, gameState?.occupiedSpaces],
  )

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
    setIsIntrigueSelectionOpen(true)
  }

  const handleRevealTurn = () => {
    setIsRevealTurn(true)
    setIsCardSelectionOpen(true)
  }
  const handleCardSelection = (picked: Card[]) => {
    setIsCardSelectionOpen(false)
    if (isRevealTurn) {
      onReveal(activePlayer.id, picked.map(card => card.id))
      setIsRevealTurn(false)
    } else if (picked.length === 1) {
      onPlayCard(activePlayer.id, picked[0].id)
    }
  }

  const checkPlayCardPlayability = (card: Card): { playable: boolean; reason?: string } => {
    if (!isRevealTurn && activePlayer.agents === 0 && !isKwisatzHaderach(card)) {
      return { playable: false, reason: 'No agents remaining' }
    }
    return { playable: true }
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
  const isAffordable = (cost: Cost | undefined, reward?: Reward): boolean => {
    if (!cost && !reward) return true
    if (!activePlayer || !gameState) return false
    return canAffordInfluenceOptionalEffect(gameState, activePlayer.id, cost, reward)
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

  const intriguePlayabilityKey = useMemo(() => {
    const inf = gameState?.factionInfluence
    const infSig = inf
      ? Object.values(FactionType)
          .map(f => `${f}:${Object.values(inf[f] ?? {}).join(',')}`)
          .join(';')
      : ''
    const pl = players?.map(p => `${p.id}i${p.intrigueCount}`).join(',') ?? ''
    return [
      gamePhase,
      gameState?.mentatOwner,
      selectedCard?.id,
      agentPlaced ? 1 : 0,
      activePlayer.revealed ? 1 : 0,
      activePlayer.spice,
      activePlayer.water,
      activePlayer.solari,
      activePlayer.troops,
      JSON.stringify(gameState?.occupiedSpaces ?? {}),
      JSON.stringify(combatTroops ?? {}),
      infSig,
      pl,
    ].join('|')
  }, [
    gamePhase,
    gameState?.mentatOwner,
    gameState?.occupiedSpaces,
    gameState?.factionInfluence,
    selectedCard?.id,
    agentPlaced,
    activePlayer.revealed,
    activePlayer.spice,
    activePlayer.water,
    activePlayer.solari,
    activePlayer.troops,
    combatTroops,
    players,
  ])

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

  const renderCostResource = (amount: number | undefined, type: string) => {
    if (!amount) return null
    return (
      <span className="effect-resource-cost" key={type} title={`Pay ${amount} ${type}`}>
        <Icon type={type} className="effect-resource-cost-icon" alt="" />
        <span className="effect-resource-cost-amt" aria-hidden="true">
          {amount}
        </span>
      </span>
    )
  }

  const renderWaterReward = (amount: number | undefined) => {
    if (!amount) return null
    return (
      <span className="res-part" key="water" title={`Water +${amount}`}>
        {Array.from({ length: Math.max(0, amount) }, (_, index) => (
          <Icon key={index} type="water" alt="" />
        ))}
      </span>
    )
  }

  const renderRepeatedIconReward = (key: string, type: string, amount: number | undefined, label: string) => {
    if (!amount) return null
    return (
      <span className="effect-icon-token" key={key} title={`${label} +${amount}`}>
        {Array.from({ length: Math.max(0, amount) }, (_, index) => (
          <Icon key={index} type={type} className="effect-token-icon" alt="" />
        ))}
      </span>
    )
  }

  const getFactionBumpIcon = (faction: FactionType) => {
    switch (faction) {
      case FactionType.SPACING_GUILD:
        return '/icon/guild_bump.png'
      case FactionType.BENE_GESSERIT:
        return '/icon/bene_bump.png'
      case FactionType.EMPEROR:
        return '/icon/emperor_bump.png'
      case FactionType.FREMEN:
        return '/icon/fremen_bump.png'
    }
  }

  const renderInfluenceAmounts = (
    influence: InfluenceAmounts,
    side: 'cost' | 'reward',
    keyPrefix: string
  ): React.ReactNode[] => {
    if (isAnyFactionInfluenceChoice(influence)) {
      const amount = influence.amounts[0].amount
      const icon =
        side === 'cost'
          ? getAnyFactionInfluenceLossIcon()
          : getAnyFactionInfluenceGainIcon(amount)
      const title =
        side === 'cost'
          ? `Lose ${amount} influence with any faction`
          : `Gain ${amount} influence with any faction`
      return [
        <span key={`${keyPrefix}-any`} className="effect-influence-line" title={title}>
          <img src={icon} alt="" className="effect-faction-icon effect-faction-bump-icon" />
          {side === 'cost' && amount > 1 && (
            <span className="effect-influence-amt">{amount}</span>
          )}
        </span>,
      ]
    }

    return influence.amounts.map((inf: InfluenceAmount, idx: number) => {
      if (side === 'cost') {
        return (
          <span key={`${keyPrefix}-${idx}`} className="effect-influence-line" title={`${inf.faction} influence`}>
            <img src={`/icon/${inf.faction}.png`} alt="" className="effect-faction-icon" />
            <span className="effect-influence-amt">{inf.amount}</span>
          </span>
        )
      }
      return (
        <span key={`${keyPrefix}-${idx}`} className="effect-influence-line" title={`${inf.faction} influence +${inf.amount}`}>
          <img src={getFactionBumpIcon(inf.faction)} alt="" className="effect-faction-icon effect-faction-bump-icon" />
          {inf.amount > 1 && <span className="effect-influence-amt">+{inf.amount}</span>}
        </span>
      )
    })
  }

  const renderLabel = (opt: {cost?: Cost; reward: Reward; costLabel?: string; rewardLabel?: string}): React.ReactNode => {
    const {cost,reward,costLabel,rewardLabel} = opt
    let left = null;
    if(cost){
      left = []
      if (cost.influence?.amounts?.length) {
        left!.push(...renderInfluenceAmounts(cost.influence, 'cost', 'cost-influence'))
      } else if (cost.influence) {
        left.push(<span key="influence">Influence</span>)
      }
      left.push(renderCostResource(cost.spice, 'spice'))
      left.push(renderCostResource(cost.water, 'water'))
      left.push(renderCostResource(cost.solari, 'solari'))
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
    right.push(renderWaterReward(reward.water))
    right.push(renderAmt(reward.solari,'solari'))
    if(reward.persuasion) {
      right.push(
        <span key="persuasion" className="effect-icon-token" title={`Persuasion +${reward.persuasion}`}>
          <span className="effect-persuasion-diamond" aria-hidden="true" />
          <span className="effect-token-amt">+{reward.persuasion}</span>
        </span>
      )
    }
    if(reward.combat) right.push(<React.Fragment key="combat">{renderIconValue('dagger', reward.combat, 'Combat', '+')}</React.Fragment>)
    right.push(renderRepeatedIconReward('draw', 'draw', reward.drawCards, 'Draw'))
    if(reward.troops) right.push(<React.Fragment key="troops">{renderIconValue('troop', reward.troops, 'Troops')}</React.Fragment>)
    right.push(renderRepeatedIconReward('intrigue', 'intrigue', reward.intrigueCards, 'Intrigue'))
    if(reward.trash || reward.trashThisCard) {
      right.push(
        <span key="trash" className="effect-icon-token" title="Trash">
          <Icon type="trash" className="effect-token-icon" alt="" />
        </span>
      )
    }
    if (reward.influence?.amounts?.length) {
      right.push(...renderInfluenceAmounts(reward.influence, 'reward', 'influence'))
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
        {left?.filter(Boolean).map((n, idx) => <React.Fragment key={idx}>{n}</React.Fragment>)}
        {left && right.some(Boolean) && <span className="effect-arrow" aria-hidden="true">→</span>}
        {right.filter(Boolean).map((n, idx) => <React.Fragment key={idx}>{n}</React.Fragment>)}
      </span>
    )
  }

  const handleEffectClick = (effect: typeof optionalEffects[0]) => {
    if(effect.cost.trash && !effect.cost.trashThisCard) {
      // need popup
      setPendingEffect(effect)
      setShowTrashPopup(true)
      closeCardEffectsDialog()
    } else {
      if(onPayCost){onPayCost(effect)}
      if (
        effect.cost?.trashThisCard ||
        effect.reward?.custom ||
        (effect.reward && (effect.reward.trash || effect.reward.trashThisCard))
      ) {
        closeCardEffectsDialog()
      }
    }
  }

  const handleTrashSelect = (card: Card) => {
    if(pendingEffect && onPayCost) {
      onPayCost({ ...pendingEffect, data: { trashedCardId: card.id } })
    } else if (pendingTrashReward && onClaimReward) {
      onClaimReward(pendingTrashReward.id, { trashedCardId: card.id })
    }
    setShowTrashPopup(false)
    setPendingEffect(null)
    setPendingTrashReward(null)
    closeCardEffectsDialog()
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

  const renderFixedChoiceOptions = (
    fixedChoice: FixedOptionsChoice,
    variant: 'dialog' | 'compact',
    onResolvedCompactOption?: (option: { reward: Reward; cost?: Cost }) => void
  ) => {
    const showOrBetween = fixedChoice.options.length > 1
    return (
      <div
        className={[
          'fixed-choice-options',
          `fixed-choice-options--${variant}`,
          showOrBetween ? 'fixed-choice-options--or' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-label={fixedChoice.prompt || 'Choose one option'}
      >
        {fixedChoice.options.map((option, index) => {
          let disabledTooltip: string | undefined
          if (option.disabled && option.reward.custom) {
            disabledTooltip = PLAY_EFFECT_DISABLED_TEXTS[option.reward.custom] || 'This option is not available'
          }
          const cannotAfford = !isAffordable(option.cost)
          return (
            <Fragment key={`${fixedChoice.id}-${index}`}>
              {showOrBetween && index > 0 && (
                <span className="or-separator" aria-hidden="true">
                  OR
                </span>
              )}
              <button
                type="button"
                className={`effect-btn choice fixed-choice-option fixed-choice-option--${variant}${showOrBetween ? ' or-option' : ''}`}
                disabled={option.disabled || cannotAfford || voiceSelectionActive || masterstrokeSelectionActive}
                onClick={() => {
                  if (onResolveChoice) {
                    onResolveChoice(fixedChoice.id, option.reward, fixedChoice.source)
                  }
                  setActiveFixedChoice(null)
                  if (variant === 'compact') {
                    onResolvedCompactOption?.(option)
                  }
                }}
                title={cannotAfford ? 'Cannot afford this option.' : disabledTooltip}
              >
                {renderLabel(option)}
              </button>
            </Fragment>
          )
        })}
      </div>
    )
  }

  const FixedChoiceDialog = () => {
    if (!activeFixedChoice) return null

    return (
      <div className="dialog-overlay">
        <div className="target-dialog fixed-choice-dialog">
          <h3>{activeFixedChoice.prompt || 'Choose one option'}</h3>
          {renderFixedChoiceOptions(activeFixedChoice, 'dialog')}
          <button
            type="button"
            className="secondary-btn fixed-choice-cancel"
            onClick={() => setActiveFixedChoice(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

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

  const effectCardHasPendingInput = (effectCard: EffectCard | undefined): boolean =>
    Boolean(
      effectCard &&
        (effectCard.rewards.some(r => !r.disabled) ||
          effectCard.optional.length > 0 ||
          effectCard.choices.some(c => !c.disabled))
    )

  const buildEffectCards = () => {
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
    return Array.from(sourceMap.values())
  }

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

  const renderRewardContent = (reward: PendingReward) => {
    const isMasterstrokeReward = reward.source.type === GainSource.MASTERSTROKE
    const isMemnonReward = reward.source.type === GainSource.MEMNON_HIGH_COUNCIL
    if (isMasterstrokeReward) {
      return (
        <span className="effect-label">
          Choose 2 <Icon type="bump" className="effect-token-icon" alt="" />
        </span>
      )
    }
    if (isMemnonReward) {
      return (
        <span className="effect-label">
          Choose 1 <Icon type="bump" className="effect-token-icon" alt="" />
        </span>
      )
    }
    return renderLabel({ reward: reward.reward })
  }

  const closesPreviewAfterPendingReward = (reward: PendingReward) =>
    reward.isTrash || Boolean(reward.reward.custom)

  const closesPreviewAfterCompactFixedOption = (option: { reward: Reward; cost?: Cost }) =>
    Boolean(option.reward.custom) ||
    Boolean(option.reward.trash) ||
    Boolean(option.reward.trashThisCard) ||
    Boolean(option.cost?.trash) ||
    Boolean(option.cost?.trashThisCard)

  const onCompactFixedOptionResolved = (option: { reward: Reward; cost?: Cost }) => {
    if (closesPreviewAfterCompactFixedOption(option)) closeCardEffectsDialog()
  }

  const renderTrashRewardButtonContent = (reward: PendingReward, variant: 'overlay' | 'compact') => {
    const label = reward.reward.trashThisCard
      ? variant === 'overlay'
        ? 'Trash'
        : 'Trash this card'
      : variant === 'overlay'
        ? 'Trash'
        : 'Choose card to trash'
    return (
      <span className="trash-reward-label">
        <Icon type="trash" className="trash-reward-icon" alt="" />
        <span className="trash-reward-text">{label}</span>
      </span>
    )
  }

  const renderEffectActions = (card: EffectCard, variant: 'overlay' | 'compact') => {
    const selectionActive = voiceSelectionActive || masterstrokeSelectionActive || memnonHighCouncilSelectionActive
    return (
      <>
        {card.rewards.map(reward => {
          const isVoiceReward = reward.reward.custom === CustomEffect.THE_VOICE
          const isMasterstrokeReward = reward.source.type === GainSource.MASTERSTROKE
          const isMemnonReward = reward.source.type === GainSource.MEMNON_HIGH_COUNCIL
          const interactionHighlight =
            !reward.isTrash &&
            (reward.source.type === GainSource.MASTERSTROKE ||
              reward.source.type === GainSource.MEMNON_HIGH_COUNCIL ||
              rewardNeedsInteractionHighlight(reward.reward))
          const disabled = selectionActive || reward.disabled
          const tooltip = voiceSelectionActive
            ? 'Finish The Voice selection before claiming other rewards.'
            : masterstrokeSelectionActive
              ? 'Finish Masterstroke faction selection before claiming other rewards.'
              : memnonHighCouncilSelectionActive
                ? 'Finish faction selection before claiming other rewards.'
                : reward.isTrash
                  ? `Trashing this card will cancel effects that haven't been applied yet. Cancels: ${getCancelledRewards(card, reward)}`
                  : undefined
          return (
            <button
              key={reward.id}
              className={`effect-btn effect-btn--${variant} ${reward.isTrash ? 'trash-reward' : ''} ${interactionHighlight ? 'effect-btn--interaction-choice' : ''}`.trim()}
              onClick={() => {
                if (!onClaimReward) return
                if (isVoiceReward && onVoiceSelectionStart) {
                  onVoiceSelectionStart(reward.id)
                  closeCardEffectsDialog()
                } else if (isMasterstrokeReward && onMasterstrokeSelectionStart) {
                  onMasterstrokeSelectionStart(reward.id)
                } else if (isMemnonReward && onMemnonHighCouncilSelectionStart) {
                  onMemnonHighCouncilSelectionStart(reward.id)
                } else if (reward.isTrash && reward.reward.trash && !reward.reward.trashThisCard) {
                  setPendingTrashReward(reward)
                  setShowTrashPopup(true)
                  closeCardEffectsDialog()
                } else {
                  onClaimReward(reward.id)
                  if (closesPreviewAfterPendingReward(reward)) {
                    closeCardEffectsDialog()
                  }
                }
              }}
              disabled={disabled}
              title={tooltip}
              aria-label={
                reward.isTrash
                  ? reward.reward.trashThisCard
                    ? `Trash ${card.source.name}`
                    : `Choose a card to trash (${card.source.name})`
                  : undefined
              }
            >
              {reward.isTrash
                ? renderTrashRewardButtonContent(reward, variant)
                : renderRewardContent(reward)}
            </button>
          )
        })}

        {card.optional.map((eff, idx) => {
          const disabled = voiceSelectionActive || masterstrokeSelectionActive || !isAffordable(eff.cost, eff.reward)
          return (
            <button
              key={`${eff.id}-${idx}`}
              className={`effect-btn effect-btn--${variant} optional effect-btn--interaction-choice`}
              disabled={disabled}
              onClick={() => handleEffectClick(eff)}
              title={
                voiceSelectionActive || masterstrokeSelectionActive
                  ? 'Finish the current selection before resolving other effects.'
                  : disabled
                    ? 'Cannot afford this optional effect.'
                    : undefined
              }
            >
              {renderLabel(eff)}
            </button>
          )
        })}

        {card.choices.map(choice => {
          if (choice.type === ChoiceType.CARD_SELECT) {
            const cardSelectChoice = choice as CardSelectChoice
            return (
              <button
                key={choice.id}
                className={`effect-btn effect-btn--${variant} choice`}
                onClick={() => setActiveCardSelect(cardSelectChoice)}
                disabled={cardSelectChoice.disabled || voiceSelectionActive || masterstrokeSelectionActive}
                title={voiceSelectionActive || masterstrokeSelectionActive ? 'Finish the current selection before resolving other choices.' : undefined}
              >
                {cardSelectChoice.prompt}
              </button>
            )
          }

          const fixedChoice = choice as FixedOptionsChoice
          if (variant === 'compact') {
            const isInlineOrChoice = fixedChoice.options.length > 1
            const defaultOrPrompt =
              fixedChoice.prompt === 'Choose one reward' || fixedChoice.prompt === 'Choose one option'
            return (
              <div
                key={choice.id}
                className={[
                  'card-effects-inline-choice',
                  isInlineOrChoice ? 'card-effects-inline-choice--or' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {!isInlineOrChoice && !defaultOrPrompt && fixedChoice.prompt && (
                  <div className="card-effects-inline-choice-title">{fixedChoice.prompt}</div>
                )}
                {renderFixedChoiceOptions(fixedChoice, 'compact', onCompactFixedOptionResolved)}
              </div>
            )
          }

          return (
            <button
              key={choice.id}
              className={`effect-btn effect-btn--${variant} choice`}
              onClick={() => setActiveFixedChoice(fixedChoice)}
              disabled={fixedChoice.disabled || voiceSelectionActive || masterstrokeSelectionActive}
              title={
                voiceSelectionActive || masterstrokeSelectionActive
                  ? 'Finish the current selection before resolving other choices.'
                  : undefined
              }
            >
              {fixedChoice.prompt || 'Choose one'}
            </button>
          )
        })}
      </>
    )
  }

  const renderTurnCard = (card: Card, mode: 'played' | 'revealed', effectCards: EffectCard[]) => {
    const effectCard = effectCards.find(entry => entry.source.type === GainSource.CARD && entry.source.id === card.id)
    const hasPendingInput = effectCardHasPendingInput(effectCard)
    return (
      <button
        key={card.id}
        type="button"
        className={[
          'turn-card-frame',
          `turn-card-frame--${mode}`,
          hasPendingInput ? 'turn-card-frame--has-effects' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => {
          setActiveIntriguePreviewCard(null)
          setActiveCardPreviewId(card.id)
          if (effectCard) {
            setActiveCardEffectSource({ type: effectCard.source.type, id: effectCard.source.id })
          } else {
            setActiveCardEffectSource(null)
          }
        }}
        aria-label={hasPendingInput ? `Resolve pending effects for ${card.name}` : card.name}
        title={hasPendingInput ? `Resolve pending effects for ${card.name}` : card.name}
      >
        {card.image ? (
          <img
            className="selected-card-inline-img"
            src={card.image}
            alt={card.name}
            title={card.name}
          />
        ) : (
          <span className="selected-card-inline-name">{card.name}</span>
        )}
      </button>
    )
  }

  const renderPlayCardPlaceholder = () => {
    const isChangingSelectedCard = Boolean(selectedCard && !agentPlaced && !activePlayer.revealed && !isRevealTurn)
    const actionLabel = isChangingSelectedCard ? 'Change' : 'Play'

    return (
      <button
        key="play-card-placeholder"
        type="button"
        className="selected-card-inline-slot selected-card-inline-placeholder selected-card-action-placeholder selected-card-action-placeholder--play"
        onClick={handlePlayCard}
        disabled={playActionDisabled}
        title={playActionTitle ?? remainingAgentsLabel}
        aria-label={`${actionLabel} card, ${remainingAgentsLabel}`}
      >
        <span className="selected-card-action-label selected-card-action-label--play">{actionLabel}</span>
        <span className="selected-card-play-agent-badge" aria-hidden="true">
          <span className="selected-card-agent-badge">
            <AgentIcon playerId={activePlayer.id} className="selected-card-agent-icon" />
            <span className="selected-card-agent-count">{activePlayer.agents}</span>
          </span>
        </span>
      </button>
    )
  }

  const renderIntrigueActionButton = () => {
    const disabled =
      activePlayer.intrigueCount === 0 ||
      playableIntrigueCards.length === 0 ||
      !hasPlayableIntrigue
    const title =
      activePlayer.intrigueCount === 0
        ? 'No intrigue cards.'
        : playableIntrigueCards.length === 0
          ? isCombatPhase ? 'No combat intrigue cards available in the deck.' : 'No intrigue cards available in the deck.'
          : !hasPlayableIntrigue
            ? isCombatPhase ? 'No combat intrigue card can be played in the current situation.' : 'No intrigue card can be played in the current situation.'
            : undefined

    return (
      <button
        type="button"
        className="selected-card-inline-slot selected-card-action-placeholder selected-card-action-placeholder--intrigue"
        onClick={isCombatPhase ? handlePlayCombatIntrigue : handlePlayIntrigueClick}
        disabled={disabled}
        title={title}
        aria-label={`Play intrigue card. ${activePlayer.intrigueCount} intrigue cards available.`}
      >
        <span className="selected-card-action-intrigue-stack">
          <img
            src="/icon/intrigue.png"
            alt=""
            className="selected-card-action-intrigue-icon"
            decoding="sync"
            fetchPriority="high"
          />
          <span className="selected-card-action-count selected-card-action-count--intrigue-overlay">
            {activePlayer.intrigueCount}
          </span>
        </span>
      </button>
    )
  }

  const renderIntegratedEffects = (
    effectCards: EffectCard[],
    visibleCardIds: Set<number>,
    stripIntrigueCards: IntrigueCard[]
  ) => {
    const playedIntrigueIds = new Set(stripIntrigueCards.map(c => c.id))
    const fallbackCards = effectCards.filter(card => {
      if (card.source.type === GainSource.CARD) {
        return !visibleCardIds.has(card.source.id)
      }
      if (card.source.type === GainSource.INTRIGUE) {
        return !playedIntrigueIds.has(card.source.id)
      }
      return true
    })
    if (fallbackCards.length === 0) return null

    return (
      <div className="effects-inline-panel" aria-label="Other pending effects">
        {fallbackCards.map(card => (
          <div key={`${card.source.type}-${card.source.id}`} className="effect-chip-group">
            <span className="effect-chip-source">{card.source.name}</span>
            <div className="effect-chip-actions">
              {renderEffectActions(card, 'compact')}
            </div>
          </div>
        ))}
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

  const effectCards = buildEffectCards()
  const basePlayAreaCards = isHistoryView && gameState
    ? getPlayAreaCardsForTurnView(gameState, activePlayer)
    : activePlayer.playArea
  const playAreaCards = [
    ...basePlayAreaCards,
    ...(selectedCard && !activePlayer.revealed && !isRevealTurn ? [selectedCard] : [])
  ].filter((card, index, cards) => cards.findIndex(c => c.id === card.id) === index)

  const historicalRevealedCardIds =
    isHistoryView &&
    gameState?.currTurn?.type === TurnType.REVEAL &&
    gameState.currTurn.playerId === activePlayer.id
      ? gameState.currTurn.revealedCardIds ?? []
      : []
  const liveRevealedCardIds =
    !isHistoryView &&
    gameState?.currTurn?.type === TurnType.REVEAL &&
    gameState.currTurn.playerId === activePlayer.id
      ? gameState.currTurn.revealedCardIds ?? []
      : []
  const revealedCardIds = new Set([
    ...liveRevealedCardIds,
    ...historicalRevealedCardIds
  ])
  const playedAreaCards = playAreaCards.filter(card => !revealedCardIds.has(card.id))
  const revealedAreaCards = playAreaCards.filter(card => revealedCardIds.has(card.id))
  /** Intrigue thumbnails live in this strip too; empty playArea after trash still shows them. */
  const showPlayedCardStrip =
    playAreaCards.length > 0 || playedIntrigueCards.length > 0
  const visibleCardIds = new Set(playAreaCards.map(card => card.id))
  const turnGains = gameState?.currTurn
    ? (gameState.gains || []).filter(gain => gain.playerId === gameState.currTurn?.playerId)
    : []
  const gainToReward = (gain: (typeof turnGains)[number]): Reward => {
    switch (gain.type) {
      case RewardType.PERSUASION:
        return { persuasion: gain.amount }
      case RewardType.COMBAT:
        return { combat: gain.amount }
      case RewardType.SPICE:
        return { spice: gain.amount }
      case RewardType.WATER:
        return { water: gain.amount }
      case RewardType.SOLARI:
        return { solari: gain.amount }
      case RewardType.TROOPS:
        return { troops: gain.amount }
      case RewardType.INTRIGUE:
        return { intrigueCards: gain.amount }
      case RewardType.INFLUENCE: {
        const rawName = gain.name.endsWith(' Acquire')
          ? gain.name.slice(0, -' Acquire'.length)
          : gain.name
        return { influence: { amounts: [{ faction: rawName as FactionType, amount: gain.amount }] } }
      }
      case RewardType.VICTORY_POINTS:
        return { victoryPoints: gain.amount }
      case RewardType.DRAW:
      case RewardType.CARD:
        return { drawCards: gain.amount }
      case RewardType.DEPLOY:
        return { deployTroops: gain.amount }
      case RewardType.RETREAT:
        return { retreatTroops: gain.amount }
      default:
        return {}
    }
  }
  const imperiumAcquireGainsLive: Gain[] =
    !isHistoryView && gameState?.currTurn?.acquiredCards?.length && (gameState.gains?.length || 0) > 0
      ? (() => {
          const ct = gameState.currTurn!
          const acquiredIds = new Set(ct.acquiredCards!.map(c => c.id))
          return gameState.gains!.filter(g => {
            if (g.playerId !== ct.playerId || g.round !== gameState!.currentRound) return false
            if (g.source !== GainSource.CARD || !acquiredIds.has(g.sourceId)) return false
            if (g.name.endsWith(' Acquire')) return true
            return false
          })
        })()
      : []

  type VisibleGainChip = {
    id: string
    groupId: string
    title: string
    reward: Reward
    rewardLabel?: string
  }

  const imperiumAcquisitionChipItems: VisibleGainChip[] = imperiumAcquireGainsLive.map((gain, index) => {
    const cardMeta = gameState?.currTurn?.acquiredCards?.find(c => c.id === gain.sourceId)
    const cardTitle = cardMeta?.name ?? gain.name.replace(/ Acquire$/, '')
    return {
      id: `imperium-acquire-${gain.sourceId}-${gain.type}-${gain.name}-${index}`,
      groupId: `Acquire · ${cardTitle}`,
      title: `${cardTitle} (acquired)`,
      reward: gainToReward(gain)
    }
  })

  const visibleGainItems: VisibleGainChip[] = isHistoryView
    ? turnGains.map((gain, index) => ({
        id: `${gain.source}-${gain.sourceId}-${gain.type}-${index}`,
        groupId: `${gain.source}-${gain.sourceId}-${gain.name}`,
        title: gain.name,
        reward: gainToReward(gain)
      }))
    : [
        ...autoAppliedRewardSummary.map(item => ({
          id: item.id,
          groupId: item.sourceName,
          title: item.sourceName,
          reward: item.reward
        })),
        ...imperiumAcquisitionChipItems
      ]
  const visibleGainGroups = Array.from(
    visibleGainItems.reduce((groups, item) => {
      const group = groups.get(item.groupId) || {
        id: item.groupId,
        title: item.title,
        items: [] as typeof visibleGainItems
      }
      group.items.push(item)
      groups.set(item.groupId, group)
      return groups
    }, new Map<string, { id: string; title: string; items: typeof visibleGainItems }>())
      .values()
  )
  const autoApplySkipsCustom = [
    CustomEffect.THE_VOICE,
    CustomEffect.REVEREND_MOTHER_MOHIAM,
    CustomEffect.TEST_OF_HUMANITY
  ]
  const trashThisCardSourceKeys = new Set(
    pendingRewards
      .filter(reward => !reward.disabled && reward.source.type === GainSource.CARD && reward.reward.trashThisCard)
      .map(reward => `${reward.source.type}:${reward.source.id}`)
  )
  const simpleAutoApplyCount = pendingRewards.filter(
    reward =>
      !reward.disabled &&
      !reward.isTrash &&
      !trashThisCardSourceKeys.has(`${reward.source.type}:${reward.source.id}`) &&
      reward.source.type !== GainSource.MASTERSTROKE &&
      (!reward.reward.custom || !autoApplySkipsCustom.includes(reward.reward.custom))
  ).length
  const showAutoApplyRewardsButton =
    !isHistoryView && !autoApplyMandatoryRewards && !isCombatPhase && simpleAutoApplyCount > 0
  const activeCardEffect = activeCardEffectSource
    ? effectCards.find(card =>
      card.source.type === activeCardEffectSource.type && card.source.id === activeCardEffectSource.id
    )
    : null
  const activeCardPreviewCard = activeCardPreviewId !== null
    ? playAreaCards.find(card => card.id === activeCardPreviewId) ?? null
    : null
  const activeCardLietKynesPersuasion =
    activeCardPreviewCard?.revealEffect?.some(effect => effect.reward?.custom === CustomEffect.LIET_KYNES)
      ? gameState?.gains.find(gain =>
        gain.playerId === activePlayer.id &&
        gain.source === GainSource.CARD &&
        gain.sourceId === activeCardPreviewCard.id &&
        gain.type === RewardType.PERSUASION
      )?.amount ?? null
      : null
  const activeCardLietKynesCountedCards =
    activeCardLietKynesPersuasion !== null
      ? playAreaCards.filter(card => card.faction?.includes(FactionType.FREMEN))
      : []
  const activeCardIsSignetRing =
    activeCardPreviewCard?.playEffect?.some(effect => effect.reward?.custom === CustomEffect.SIGNET_RING) ?? false
  const activeCardSignetGains =
    activeCardIsSignetRing && activeCardPreviewCard
      ? (gameState?.gains ?? []).filter(
          gain =>
            gain.playerId === activePlayer.id &&
            gain.round === gameState?.currentRound &&
            gain.source === GainSource.CARD &&
            gain.sourceId === activeCardPreviewCard.id
        )
      : []

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
      {renderOpponentDiscardPanel()}
      {
        <ChoiceDialog />
        
      }
      <FixedChoiceDialog />
      {activeCardPreviewCard && (
        <div className="dialog-overlay">
          <div className="target-dialog card-effects-dialog">
            {activeCardPreviewCard.image ? (
              <img
                src={activeCardPreviewCard.image}
                alt={activeCardPreviewCard.name}
                className="card-effects-dialog-image"
              />
            ) : (
              <h3>{activeCardPreviewCard.name}</h3>
            )}
            {activeCardLietKynesPersuasion !== null && (
              <div className="card-effects-dialog-note">
                Liet Kynes reveal: {activeCardLietKynesPersuasion} persuasion
                {activeCardLietKynesCountedCards.length > 0 && (
                  <div className="liet-counted-cards" aria-label="Fremen cards counted for Liet Kynes">
                    {activeCardLietKynesCountedCards.map(card => (
                      <img
                        key={card.id}
                        src={card.image}
                        alt={card.name}
                        title={card.name}
                        className="liet-counted-card-image"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeCardSignetGains.length > 0 && (
              <div className="card-effects-dialog-note card-effects-dialog-note--signet">
                <div className="signet-ring-effect-heading">
                  {activePlayer.leader.signetRingTitle
                    ? `${activePlayer.leader.signetRingTitle}`
                    : 'Signet ring'}
                  <span className="signet-ring-effect-applied"> · applied</span>
                </div>
                {activePlayer.leader.signetRingText && (
                  <div className="signet-ring-effect-text">{activePlayer.leader.signetRingText}</div>
                )}
                <div className="signet-ring-applied-chips" aria-label="Signet ring effects applied">
                  {activeCardSignetGains.map((gain, index) => (
                    <span key={`${gain.type}-${gain.amount}-${index}`} className="signet-ring-applied-chip">
                      {renderLabel({ reward: gainToReward(gain) })}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {activeCardEffect && (
              <div className="card-effects-dialog-actions">
                {renderEffectActions(activeCardEffect, 'compact')}
              </div>
            )}
            <button
              type="button"
              className="secondary-btn fixed-choice-cancel"
              onClick={closeCardEffectsDialog}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {activeIntriguePreviewCard && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={activeIntriguePreviewCard.name}
        >
          <div className="target-dialog card-effects-dialog intrigue-preview-dialog">
            {activeIntriguePreviewCard.image ? (
              <img
                src={activeIntriguePreviewCard.image}
                alt={activeIntriguePreviewCard.name}
                className="card-effects-dialog-image"
              />
            ) : (
              <h3>{activeIntriguePreviewCard.name}</h3>
            )}
            {activeCardEffect &&
              activeCardEffect.source.type === GainSource.INTRIGUE &&
              activeCardEffect.source.id === activeIntriguePreviewCard.id && (
                <div className="card-effects-dialog-actions">
                  {renderEffectActions(activeCardEffect, 'compact')}
                </div>
              )}
            <button
              type="button"
              className="secondary-btn fixed-choice-cancel"
              onClick={() => {
                setActiveIntriguePreviewCard(null)
                setActiveCardEffectSource(null)
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
          {effectCards.length > 0 && (
            <div className="turn-controls-effects-row">
              {renderIntegratedEffects(effectCards, visibleCardIds, playedIntrigueCards)}
            </div>
          )}
          <div className="active-player-info">
            <div className={`color-indicator ${activePlayer.color}`}></div>
            <div className="active-player-actions" aria-label="Active player shortcuts">
              <div className="active-player-main-actions">
                {getLeaderImage(activePlayer.leader.name) && (
                  <button
                    type="button"
                    className="see-leader-button"
                    onClick={() => setIsLeaderImageOpen(true)}
                    title="See Leader"
                    aria-label={`View ${activePlayer.leader.name}`}
                  >
                    {activeLeaderIconPath ? (
                      <img
                        src={activeLeaderIconPath}
                        alt=""
                        className="see-leader-icon"
                        draggable={false}
                      />
                    ) : (
                      <span className="see-leader-icon-fallback" aria-hidden="true">
                        {activePlayer.leader.name.charAt(0)}
                      </span>
                    )}
                    <MagnifyingGlassIcon />
                  </button>
                )}
                {visibleGainGroups.length > 0 && (
                  <>
                    {visibleGainGroups.map(group => (
                      <div
                        key={group.id}
                        className="auto-applied-gains-summary"
                        aria-label={`${isHistoryView ? 'Turn gains' : 'Automatically gained rewards'} from ${group.title}`}
                        title={group.title}
                      >
                        {group.items.map(item => (
                          <span key={item.id} className="auto-applied-gain-chip" title={item.title}>
                            {renderLabel({ reward: item.reward, rewardLabel: item.rewardLabel })}
                          </span>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                {showRevealPersuasionRemaining && (
                  <div
                    className="reveal-total-chip reveal-persuasion-total reveal-persuasion-remaining"
                    title={`${revealPersuasionRemaining} persuasion remaining to spend`}
                    aria-label={`${revealPersuasionRemaining} persuasion remaining`}
                  >
                    <span className="reveal-persuasion-diamond" aria-hidden="true" />
                    <span className="reveal-total-count">{revealPersuasionRemaining}</span>
                    <span className="reveal-persuasion-remaining-label">left</span>
                  </div>
                )}
                {showRevealCombat && (
                  <div
                    className="reveal-total-chip reveal-dagger-total"
                    title={
                      revealSwordStrength > 0
                        ? `${revealCombatTotal} total strength (${revealTroopStrength} from ${troopsInConflict} troop${troopsInConflict === 1 ? '' : 's'}, ${revealSwordStrength} from swords)`
                        : `${revealCombatTotal} total strength (${revealTroopStrength} from ${troopsInConflict} troop${troopsInConflict === 1 ? '' : 's'})`
                    }
                    aria-label={`${revealCombatTotal} total combat strength`}
                  >
                    <Icon type="dagger" className="reveal-total-icon" alt="" />
                    <span className="reveal-total-count">{revealCombatTotal}</span>
                  </div>
                )}
                {showAutoApplyRewardsButton && (
                  <button
                    type="button"
                    className="get-mandatory-effects-button"
                    onClick={() => onAutoApplyRewards && onAutoApplyRewards()}
                    disabled={voiceSelectionActive || masterstrokeSelectionActive || simpleAutoApplyCount === 0}
                    title={
                      voiceSelectionActive || masterstrokeSelectionActive
                        ? 'Finish the current selection before claiming rewards.'
                        : 'Apply non-interactive rewards; choices, trash, and target selections stay pending.'
                    }
                  >
                    Auto Take{simpleAutoApplyCount > 0 ? ` (${simpleAutoApplyCount})` : ''}
                  </button>
                )}
              </div>
              <div className="active-player-utility-actions">
                <button
                  type="button"
                  className="view-influence-button utility-action-button active-player-action-button active-player-overview-button"
                  onClick={onOpenPlayerOverview}
                  title="View Player Overview"
                  aria-label="View player overview and stats"
                >
                  <PlayerOverviewIcon />
                </button>
                <button
                  type="button"
                  className="view-influence-button utility-action-button active-player-action-button"
                  onClick={onTurnHistoryToggle}
                  title="View Turn History"
                  aria-label="View turn history"
                >
                  <TurnHistoryIcon />
                </button>
              </div>
            </div>
          </div>
          <LeaderImageModal
            leader={activePlayer.leader}
            isOpen={isLeaderImageOpen}
            onClose={() => setIsLeaderImageOpen(false)}
          />
          {!isHistoryView && activeIntrigueThisRound.length > 0 && (
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
            {showPlayedCardStrip && (
            <div
              className="selected-card-inline-slot selected-card-play-area"
              aria-label={[
                playAreaCards.length > 0 &&
                  `Play area: ${playAreaCards.map(c => c.name).join(', ')}`,
                playedIntrigueCards.length > 0 &&
                  `Played intrigue: ${playedIntrigueCards.map(c => c.name).join(', ')}`
              ]
                .filter(Boolean)
                .join('. ')}
            >
                <div className="selected-cards-reveal-strip">
                  {playedAreaCards.map(card => renderTurnCard(card, 'played', effectCards))}
                  {playedIntrigueCards.map(card => {
                    const intrigueEffectBundle = effectCards.find(
                      e => e.source.type === GainSource.INTRIGUE && e.source.id === card.id
                    )
                    const hasIntriguePendingInput = effectCardHasPendingInput(intrigueEffectBundle)
                    return (
                    <button
                      key={`intrigue-${card.id}`}
                      type="button"
                      className={`turn-card-frame turn-card-frame--intrigue ${hasIntriguePendingInput ? 'turn-card-frame--has-effects' : ''}`}
                      aria-label={
                        hasIntriguePendingInput
                          ? `Resolve pending effects for ${card.name}`
                          : `View played intrigue card: ${card.name}`
                      }
                      title={
                        hasIntriguePendingInput
                          ? `Resolve pending effects for ${card.name}`
                          : `View ${card.name}`
                      }
                      onClick={() => {
                        closeCardEffectsDialog()
                        setActiveIntriguePreviewCard(card)
                        setActiveCardEffectSource(
                          intrigueEffectBundle
                            ? { type: GainSource.INTRIGUE, id: card.id }
                            : null
                        )
                      }}
                    >
                      <img
                        className="selected-card-inline-img selected-card-inline-img--intrigue"
                        src={card.image}
                        alt=""
                        draggable={false}
                      />
                    </button>
                    )
                  })}
                  {playedAreaCards.length > 0 && revealedAreaCards.length > 0 && (
                    <div className="play-area-card-divider" aria-hidden="true" />
                  )}
                  {revealedAreaCards.map(card => renderTurnCard(card, 'revealed', effectCards))}
                </div>
            </div>
            )}
            {(!primaryTurnActionsHidden || (!isHistoryView && !isEndGame)) && (
              <div className="selected-card-turn-actions" aria-label="Turn actions">
                {!primaryTurnActionsHidden && renderPlayCardPlaceholder()}
                {!primaryTurnActionsHidden && (
                  <button
                    type="button"
                    className="selected-card-inline-slot selected-card-action-placeholder selected-card-action-placeholder--reveal"
                    onClick={handleRevealTurn}
                    disabled={revealActionDisabled}
                    title={revealActionTitle}
                    aria-label={`Reveal hand with ${activePlayer.handCount} cards`}
                  >
                    <span className="selected-card-action-count">{activePlayer.handCount}</span>
                    <span className="selected-card-action-label">Reveal</span>
                  </button>
                )}
                {!isHistoryView && !isEndGame && renderIntrigueActionButton()}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Card selection overlays - outside turn-controls so they stay visible when controls are hidden */}
      <CardSearch
        isOpen={isCardSelectionOpen}
        cards={handCardsForCardSearch}
        selectionCount={isRevealTurn ? activePlayer.handCount : 1}
        onSelect={handleCardSelection}
        onCancel={() => {
          setIsCardSelectionOpen(false)
          setIsRevealTurn(false)
        }}
        isRevealTurn={isRevealTurn}
        text={isRevealTurn ? 'Select Cards to Reveal' : 'Select a Card to Play'}
        confirmButtonText={isRevealTurn ? 'Reveal' : 'Play'}
        getCardPlayability={isRevealTurn ? undefined : checkPlayCardPlayability}
        playabilityInvalidateKey={isRevealTurn ? undefined : playCardPickerPlayabilityKey}
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
        playabilityInvalidateKey={intriguePlayabilityKey}
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
        onCancel={() => { setShowTrashPopup(false); setPendingEffect(null); setPendingTrashReward(null) }}
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