import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Player, Card, IntrigueCard, IntrigueCardType, Cost, Reward, Gain, PendingChoice, FixedOptionsChoice, CardSelectChoice, OptionalEffect, ChoiceType, CardPile, PendingReward, GainSource, CustomEffect, GameTurn, GamePhase, FactionType, GameState, ControlMarkerType, IntriguePlayEffect, InfluenceAmount, InfluenceAmounts, TurnType, RewardType, AUTO_APPLIED_CUSTOM_EFFECTS } from '../../types/GameTypes'
import { intrigueCardHasCustom } from '../../utils/intrigueCardCustom'
import CardSearch from '../CardSearch/CardSearch'
import AgentIcon from '../AgentIcon/AgentIcon'
import { PLAY_EFFECT_TEXTS, PLAY_EFFECT_DISABLED_TEXTS, REVEAL_EFFECT_TEXTS } from '../../data/effectTexts'
import { intrigueRequirementSatisfied } from '../GameContext/requirements'
import { getPlayAreaCardsForTurnView } from '../../utils/playAreaDisplay'
import {
  factionFromInfluenceGainName,
  getAnyFactionInfluenceGainIcon,
  getAnyFactionInfluenceLossIcon,
  influenceAmountsFromGain,
  isAnyFactionInfluenceChoice,
} from '../../utils/influenceDisplay'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { getLeaderIconPath } from '../../data/leaders'
import {
  canAffordInfluenceOptionalEffect,
  getLackingOptionalCostResources,
} from '../../utils/influenceChoices'
import {
  CardEffectRect,
  getCardEffectDebugRects,
  getOptionalEffectOverlayRect,
  getRewardOverlayRect,
  layoutCardRegionPercent,
  rectPlacementKey,
} from '../../data/cardEffectRegions'
import PlayerTargetDialog from '../PlayerTargetDialog'
import LeaderResourceStrip from '../LeaderResourceStrip/LeaderResourceStrip'
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
  autoAppliedRewardSummary?: Array<{ id: string; sourceName: string; sourceType: GainSource; reward: Reward }>
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
  /** Desktop: portal round gains into the footer strip above the play area. */
  roundGainsBannerSlotRef?: React.RefObject<HTMLDivElement | null>
}

const LEADER_GAIN_SOURCES = new Set<GainSource>([
  GainSource.LEADER_ABILITY,
  GainSource.MASTERSTROKE,
  GainSource.MEMNON_HIGH_COUNCIL,
])

function isLeaderGainSource(source?: GainSource): boolean {
  return source != null && LEADER_GAIN_SOURCES.has(source)
}

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
  roundGainsBannerSlotRef,
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)
  const [isIntrigueSelectionOpen, setIsIntrigueSelectionOpen] = useState(false)
  const [showTrashPopup, setShowTrashPopup] = useState(false)
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
  const [isDesktopPlay, setIsDesktopPlay] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const syncDesktop = () => setIsDesktopPlay(mq.matches)
    syncDesktop()
    mq.addEventListener('change', syncDesktop)
    return () => mq.removeEventListener('change', syncDesktop)
  }, [])

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
    !isHistoryView && activePlayer.revealed && Boolean(gameState?.canAcquireIR)
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
      default:
        return getAnyFactionInfluenceGainIcon(1)
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
    } else {
      if(onPayCost){onPayCost(effect)}
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

  const portalOverlay = (overlay: React.ReactNode) =>
    typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay

  const FixedChoiceDialog = () => {
    if (!activeFixedChoice) return null

    return portalOverlay(
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

  const pendingRewardNeedsPlayerInput = (reward: PendingReward): boolean => {
    if (reward.disabled) return false
    if (reward.isTrash) return true
    if (reward.source.type === GainSource.MASTERSTROKE) return true
    if (reward.source.type === GainSource.MEMNON_HIGH_COUNCIL) return true
    return rewardNeedsInteractionHighlight(reward.reward)
  }

  const optionalEffectNeedsPlayerInput = (effect: OptionalEffect): boolean =>
    isAffordable(effect.cost, effect.reward)

  const effectCardHasPendingInput = (effectCard: EffectCard | undefined): boolean =>
    Boolean(
      effectCard &&
        (effectCard.rewards.some(pendingRewardNeedsPlayerInput) ||
          effectCard.optional.some(optionalEffectNeedsPlayerInput) ||
          effectCard.choices.some(c => !c.disabled))
    )

  /** Leader/ability effects use the inline panel or a modal, not the played-card frame. */
  const effectCardCountsForLonePlayedCardHighlight = (effectCard: EffectCard): boolean => {
    switch (effectCard.source.type) {
      case GainSource.MASTERSTROKE:
      case GainSource.MEMNON_HIGH_COUNCIL:
      case GainSource.LEADER_ABILITY:
        return false
      default:
        return effectCardHasPendingInput(effectCard)
    }
  }

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

  const cardEffectDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('cardEffectDebug')

  const getOptionalEffectAriaLabel = (effect: OptionalEffect): string => {
    if (effect.reward.custom) {
      return PLAY_EFFECT_TEXTS[effect.reward.custom] || effect.reward.custom
    }
    const costParts: string[] = []
    if (effect.cost?.solari) costParts.push(`${effect.cost.solari} solari`)
    if (effect.cost?.spice) costParts.push(`${effect.cost.spice} spice`)
    if (effect.cost?.water) costParts.push(`${effect.cost.water} water`)
    const rewardParts: string[] = []
    if (effect.reward.troops) rewardParts.push(`${effect.reward.troops} troops`)
    if (effect.reward.deployTroops) {
      rewardParts.push(`deploy up to ${effect.reward.deployTroops} to the Conflict`)
    }
    if (costParts.length === 0 && rewardParts.length === 0) return 'Optional effect'
    if (costParts.length === 0) return `Optional: ${rewardParts.join(', ')}`
    if (rewardParts.length === 0) return `Optional: pay ${costParts.join(', ')}`
    return `Optional: pay ${costParts.join(', ')} for ${rewardParts.join(', ')}`
  }

  const shouldOverlayCardReward = (reward: PendingReward): boolean => {
    if (reward.source.type !== GainSource.CARD) return false
    return pendingRewardNeedsPlayerInput(reward)
  }

  const pendingRewardOverlayRect = (
    previewCard: Card,
    reward: PendingReward,
    isRevealed: boolean
  ): CardEffectRect =>
    getRewardOverlayRect(previewCard, {
      isTrash: reward.isTrash,
      custom: reward.reward.custom,
      isRevealed,
    })

  const useFrameOnlyCardOverlay = (
    reward: PendingReward | undefined,
    variant: 'overlay' | 'compact'
  ): boolean => {
    if (variant !== 'overlay' || !reward) return false
    if (reward.isTrash) return true
    return Boolean(reward.reward.custom)
  }

  const getCardOverlayAriaLabel = (
    reward: PendingReward,
    previewCard: Card,
    cardName: string
  ): string => {
    if (reward.reward.custom) {
      const onReveal = previewCard.revealEffect?.some(
        e => e.reward?.custom === reward.reward.custom
      )
      const text = onReveal && !previewCard.playEffect?.some(e => e.reward?.custom === reward.reward.custom)
          ? REVEAL_EFFECT_TEXTS[reward.reward.custom]
          : PLAY_EFFECT_TEXTS[reward.reward.custom]
      return text || reward.reward.custom
    }
    if (reward.isTrash) {
      return reward.reward.trashThisCard
        ? `Trash ${cardName}`
        : `Choose a card to trash (${cardName})`
    }
    return `Resolve effect for ${cardName}`
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

  type EffectActionFilter = 'all' | 'overlay-only' | 'non-overlay'

  const renderEffectActions = (
    card: EffectCard,
    variant: 'overlay' | 'compact',
    filter: EffectActionFilter = 'all',
    overlayContext?: { previewCard: Card; isRevealed: boolean }
  ) => {
    const selectionActive = voiceSelectionActive || masterstrokeSelectionActive || memnonHighCouncilSelectionActive
    const rewards =
      filter === 'overlay-only'
        ? card.rewards.filter(reward => reward.isTrash || shouldOverlayCardReward(reward))
        : filter === 'non-overlay'
          ? card.rewards.filter(
              reward => !reward.isTrash && !shouldOverlayCardReward(reward)
            )
          : card.rewards
    const optional =
      filter === 'non-overlay' ? [] : card.optional
    const choices = filter === 'overlay-only' ? [] : card.choices
    return (
      <>
        {rewards.map(reward => {
          const isVoiceReward = reward.reward.custom === CustomEffect.THE_VOICE
          const isMasterstrokeReward = reward.source.type === GainSource.MASTERSTROKE
          const isMemnonReward = reward.source.type === GainSource.MEMNON_HIGH_COUNCIL
          const needsInputHighlight = pendingRewardNeedsPlayerInput(reward)
          const frameOnly = useFrameOnlyCardOverlay(reward, variant)
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
          const ariaLabel =
            variant === 'overlay' && overlayContext
              ? getCardOverlayAriaLabel(
                  reward,
                  overlayContext.previewCard,
                  card.source.name
                )
              : reward.isTrash
                ? reward.reward.trashThisCard
                  ? `Trash ${card.source.name}`
                  : `Choose a card to trash (${card.source.name})`
                : undefined
          return (
            <button
              key={reward.id}
              className={[
                `effect-btn effect-btn--${variant}`,
                reward.isTrash ? 'trash-reward' : '',
                reward.reward.custom === CustomEffect.POWER_PLAY ? 'effect-btn--power-play' : '',
                needsInputHighlight ? 'effect-btn--needs-input' : '',
                frameOnly ? 'effect-btn--overlay-frame' : '',
              ]
                .filter(Boolean)
                .join(' ')}
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
                } else {
                  onClaimReward(reward.id)
                }
              }}
              disabled={disabled}
              title={frameOnly ? ariaLabel : tooltip}
              aria-label={ariaLabel}
            >
              {frameOnly
                ? null
                : reward.isTrash
                  ? renderTrashRewardButtonContent(reward, variant)
                  : renderRewardContent(reward)}
            </button>
          )
        })}

        {optional.map((eff, idx) => {
          const cannotAfford =
            !voiceSelectionActive &&
            !masterstrokeSelectionActive &&
            !isAffordable(eff.cost, eff.reward)
          const disabled = voiceSelectionActive || masterstrokeSelectionActive || cannotAfford
          const optionalFrameOnly = variant === 'overlay'
          const optionalAriaLabel = getOptionalEffectAriaLabel(eff)
          return (
            <button
              key={`${eff.id}-${idx}`}
              className={[
                `effect-btn effect-btn--${variant} optional`,
                !disabled ? 'effect-btn--needs-input' : '',
                cannotAfford ? 'effect-btn--unaffordable' : '',
                optionalFrameOnly ? 'effect-btn--overlay-frame' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={disabled}
              onClick={() => handleEffectClick(eff)}
              title={
                voiceSelectionActive || masterstrokeSelectionActive
                  ? 'Finish the current selection before resolving other effects.'
                  : cannotAfford
                    ? 'Cannot afford this optional effect.'
                    : optionalAriaLabel
              }
              aria-label={optionalFrameOnly ? optionalAriaLabel : undefined}
            >
              {optionalFrameOnly ? null : renderLabel(eff)}
            </button>
          )
        })}

        {choices.map(choice => {
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
                {renderFixedChoiceOptions(fixedChoice, 'compact')}
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

  const renderCardEffectsDialogStage = (
    previewCard: Card,
    effectCard: EffectCard,
    isRevealed: boolean
  ) => {
    const overlayContext = { previewCard, isRevealed }
    const overlayZoneRewards = effectCard.rewards.filter(
      reward => reward.isTrash || shouldOverlayCardReward(reward)
    )
    const optionalEffects = effectCard.optional

    type OverlayPlacement = {
      key: string
      rect: CardEffectRect
      optional: OptionalEffect[]
      rewards: PendingReward[]
    }

    const placementMap = new Map<string, OverlayPlacement>()
    const ensurePlacement = (rect: CardEffectRect): OverlayPlacement => {
      const key = rectPlacementKey(rect)
      let placement = placementMap.get(key)
      if (!placement) {
        placement = { key, rect, optional: [], rewards: [] }
        placementMap.set(key, placement)
      }
      return placement
    }

    overlayZoneRewards.forEach(reward => {
      ensurePlacement(pendingRewardOverlayRect(previewCard, reward, isRevealed)).rewards.push(reward)
    })

    optionalEffects.forEach(eff => {
      const optionalRect = getOptionalEffectOverlayRect(previewCard, eff, isRevealed)
      ensurePlacement(optionalRect).optional.push(eff)
    })

    const overlayPlacements = [...placementMap.values()]
    const hasOverlays = overlayPlacements.length > 0 || cardEffectDebug
    const nonOverlayCard: EffectCard = {
      ...effectCard,
      optional: [],
      rewards: effectCard.rewards.filter(
        reward => !reward.isTrash && !shouldOverlayCardReward(reward)
      ),
    }
    const hasBelowActions =
      nonOverlayCard.rewards.length > 0 || nonOverlayCard.choices.length > 0

    const rectBoxStyle = (rect: CardEffectRect) => {
      const box = layoutCardRegionPercent(rect)
      return {
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }
    }

    const renderOverlayPlacement = (placement: OverlayPlacement) => {
      const { rect, optional: zoneOptional, rewards: zoneRewards } = placement
      if (zoneOptional.length === 0 && zoneRewards.length === 0) return null
      return (
        <div
          className="card-effect-overlay-zone"
          style={rectBoxStyle(rect)}
          data-card-region={placement.key}
        >
          {zoneOptional.map((eff, idx) => (
            <div
              key={`${eff.id}-${idx}`}
              className="card-effect-overlay-slot card-effect-overlay-slot--frame"
            >
              {renderEffectActions(
                { ...effectCard, rewards: [], choices: [], optional: [eff] },
                'overlay',
                'all',
                overlayContext
              )}
            </div>
          ))}
          {zoneRewards.map(reward => {
            const frameOnly = useFrameOnlyCardOverlay(reward, 'overlay')
            return (
              <div
                key={reward.id}
                className={[
                  'card-effect-overlay-slot',
                  frameOnly ? 'card-effect-overlay-slot--frame' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {renderEffectActions(
                  { ...effectCard, optional: [], choices: [], rewards: [reward] },
                  'overlay',
                  'all',
                  overlayContext
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <>
        <div className="card-effects-dialog-card-stage">
          {previewCard.image ? (
            <img
              src={previewCard.image}
              alt={previewCard.name}
              className="imperium-preview-image card-effects-dialog-image"
            />
          ) : (
            <div className="card-effects-dialog-fallback" aria-hidden="true">
              <span>{previewCard.name}</span>
            </div>
          )}
          {hasOverlays && (
            <div
              className={[
                'card-effects-dialog-overlays',
                cardEffectDebug ? 'card-effects-dialog-overlays--debug' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="Card effects"
            >
              {cardEffectDebug &&
                getCardEffectDebugRects(previewCard.name).map(({ key, rect }) => (
                  <div
                    key={`debug-${key}`}
                    className={[
                      'card-effect-overlay-zone',
                      'card-effect-overlay-zone--debug',
                      key.startsWith('play-') ? 'card-effect-overlay-zone--play-effect' : '',
                      key === 'agent' || key === 'play-0' ? 'card-effect-overlay-zone--agent' : '',
                      key === 'reveal' || key.startsWith('reveal-') ? 'card-effect-overlay-zone--reveal' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={rectBoxStyle(rect)}
                    data-card-region={key}
                    aria-hidden="true"
                  />
                ))}
              {overlayPlacements.map(placement => renderOverlayPlacement(placement))}
            </div>
          )}
        </div>
        {hasBelowActions && (
          <div className="card-effects-dialog-actions">
            {renderEffectActions(nonOverlayCard, 'compact', 'non-overlay')}
          </div>
        )}
      </>
    )
  }

  const renderTurnCard = (card: Card, mode: 'played' | 'revealed', effectCards: EffectCard[]) => {
    const effectCard = effectCards.find(entry => entry.source.type === GainSource.CARD && entry.source.id === card.id)
    const hasPendingInput = effectCardHasPendingInput(effectCard)
    const hasExternalPendingForPlayedCards = effectCards.some(
      effectCardCountsForLonePlayedCardHighlight
    )
    const highlightsLonePlayedCardWithExternalPending =
      mode === 'played' &&
      hasExternalPendingForPlayedCards &&
      !hasPendingInput &&
      playedAreaCards.length === 1 &&
      playedAreaCards[0]?.id === card.id
    const shouldHighlightPending = hasPendingInput || highlightsLonePlayedCardWithExternalPending
    return (
      <button
        key={card.id}
        type="button"
        className={[
          'turn-card-frame',
          `turn-card-frame--${mode}`,
          shouldHighlightPending ? 'turn-card-frame--has-effects' : '',
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
        aria-label={shouldHighlightPending ? `Resolve pending effects for ${card.name}` : card.name}
        title={shouldHighlightPending ? `Resolve pending effects for ${card.name}` : card.name}
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
        const influence = influenceAmountsFromGain(gain)
        return influence ? { influence } : {}
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
  const mergeGainsToReward = (gains: (typeof turnGains)[number][]): Reward => {
    const reward: Reward = {}
    const influenceByFaction = new Map<FactionType, number>()

    for (const gain of gains) {
      const partial = gainToReward(gain)
      if (partial.spice) reward.spice = (reward.spice ?? 0) + partial.spice
      if (partial.water) reward.water = (reward.water ?? 0) + partial.water
      if (partial.solari) reward.solari = (reward.solari ?? 0) + partial.solari
      if (partial.troops) reward.troops = (reward.troops ?? 0) + partial.troops
      if (partial.persuasion) reward.persuasion = (reward.persuasion ?? 0) + partial.persuasion
      if (partial.combat) reward.combat = (reward.combat ?? 0) + partial.combat
      if (partial.drawCards) reward.drawCards = (reward.drawCards ?? 0) + partial.drawCards
      if (partial.intrigueCards) reward.intrigueCards = (reward.intrigueCards ?? 0) + partial.intrigueCards
      if (partial.victoryPoints) reward.victoryPoints = (reward.victoryPoints ?? 0) + partial.victoryPoints
      if (partial.deployTroops) reward.deployTroops = (reward.deployTroops ?? 0) + partial.deployTroops
      if (partial.retreatTroops) reward.retreatTroops = (reward.retreatTroops ?? 0) + partial.retreatTroops
      partial.influence?.amounts?.forEach(inf => {
        influenceByFaction.set(inf.faction, (influenceByFaction.get(inf.faction) ?? 0) + inf.amount)
      })
    }

    if (influenceByFaction.size > 0) {
      reward.influence = {
        amounts: Array.from(influenceByFaction.entries()).map(([faction, amount]) => ({
          faction,
          amount
        }))
      }
    }
    return reward
  }
  const isAcquireInfluenceGain = (gain: (typeof turnGains)[number]) =>
    gain.type === RewardType.INFLUENCE && gain.name.endsWith(' Acquire')
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
    gainSource?: GainSource
  }

  type VisibleGainGroup = {
    id: string
    title: string
    gainSource?: GainSource
    items: VisibleGainChip[]
  }

  const gainsDisplayPlayer =
    gameState?.currTurn != null
      ? players.find(p => p.id === gameState.currTurn!.playerId) ?? activePlayer
      : activePlayer

  const imperiumAcquisitionChipItems: VisibleGainChip[] = (() => {
    const gainsByAcquiredCard = new Map<number, (typeof turnGains)[number][]>()
    imperiumAcquireGainsLive.forEach(gain => {
      const list = gainsByAcquiredCard.get(gain.sourceId) ?? []
      list.push(gain)
      gainsByAcquiredCard.set(gain.sourceId, list)
    })
    return Array.from(gainsByAcquiredCard.entries()).map(([sourceId, gains]) => {
      const cardMeta = gameState?.currTurn?.acquiredCards?.find(c => c.id === sourceId)
      const cardTitle = cardMeta?.name ?? gains[0]?.name.replace(/ Acquire$/, '') ?? 'Card'
      return {
        id: `imperium-acquire-${sourceId}`,
        groupId: `Acquire · ${cardTitle}`,
        title: `${cardTitle} (acquired)`,
        reward: mergeGainsToReward(gains)
      }
    })
  })()

  const consolidateCombatGainChips = (items: VisibleGainChip[]): VisibleGainChip[] => {
    let combatTotal = 0
    const rest: VisibleGainChip[] = []

    for (const item of items) {
      const combat = item.reward.combat ?? 0
      if (!combat) {
        rest.push(item)
        continue
      }
      const remainingReward: Reward = { ...item.reward }
      delete remainingReward.combat
      const hasOtherReward = Object.values(remainingReward).some(value => {
        if (value == null || value === false) return false
        if (typeof value === 'number') return value !== 0
        if (typeof value === 'object') return Object.keys(value).length > 0
        return true
      })
      combatTotal += combat
      if (hasOtherReward) {
        rest.push({ ...item, reward: remainingReward })
      }
    }

    if (combatTotal > 0) {
      rest.unshift({
        id: 'turn-combat-total',
        groupId: 'turn-combat-total',
        title: 'Combat (revealed swords)',
        reward: { combat: combatTotal }
      })
    }
    return rest
  }

  const getGainSourceGroupTitle = (gain: Gain): string => {
    switch (gain.source) {
      case GainSource.BOARD_SPACE: {
        const space = BOARD_SPACES.find(s => s.id === gain.sourceId)
        return space?.name ?? 'Board space'
      }
      case GainSource.CARD: {
        const played = activePlayer?.playArea.find(c => c.id === gain.sourceId)
        if (played) return played.name
        const acquired = gameState?.currTurn?.acquiredCards?.find(c => c.id === gain.sourceId)
        if (acquired) return acquired.name
        return factionFromInfluenceGainName(gain.name) ?? gain.name
      }
      default:
        return gain.name
    }
  }

  const mergeRewardInfluenceInto = (target: Reward, source: Reward): Reward => {
    if (!source.influence?.amounts?.length) return target
    const byFaction = new Map<FactionType, number>()
    target.influence?.amounts?.forEach(inf => {
      byFaction.set(inf.faction, (byFaction.get(inf.faction) ?? 0) + inf.amount)
    })
    source.influence.amounts.forEach(inf => {
      byFaction.set(inf.faction, (byFaction.get(inf.faction) ?? 0) + inf.amount)
    })
    return {
      ...target,
      influence: {
        amounts: Array.from(byFaction.entries()).map(([faction, amount]) => ({ faction, amount })),
      },
    }
  }

  const groupCoversInfluenceGains = (items: VisibleGainChip[], gains: Gain[]): boolean => {
    const needed = new Map<FactionType, number>()
    for (const gain of gains) {
      const faction = factionFromInfluenceGainName(gain.name)
      if (!faction) {
        return items.some(item => (item.reward.influence?.amounts?.length ?? 0) > 0)
      }
      needed.set(faction, (needed.get(faction) ?? 0) + gain.amount)
    }
    const have = new Map<FactionType, number>()
    for (const item of items) {
      item.reward.influence?.amounts?.forEach(inf => {
        have.set(inf.faction, (have.get(inf.faction) ?? 0) + inf.amount)
      })
    }
    for (const [faction, amount] of needed) {
      if ((have.get(faction) ?? 0) < amount) return false
    }
    return true
  }

  const mergeLiveInfluenceGainsFromState = (items: VisibleGainChip[]): VisibleGainChip[] => {
    const influenceGains = turnGains.filter(
      gain => gain.type === RewardType.INFLUENCE && !isAcquireInfluenceGain(gain)
    )
    if (influenceGains.length === 0) return items

    const byGroup = new Map<string, Gain[]>()
    influenceGains.forEach(gain => {
      const groupId = getGainSourceGroupTitle(gain)
      const list = byGroup.get(groupId) ?? []
      list.push(gain)
      byGroup.set(groupId, list)
    })

    const itemsByGroup = new Map<string, VisibleGainChip[]>()
    items.forEach(item => {
      const list = itemsByGroup.get(item.groupId) ?? []
      list.push(item)
      itemsByGroup.set(item.groupId, list)
    })

    for (const [groupId, groupGains] of byGroup) {
      const existing = itemsByGroup.get(groupId) ?? []
      if (groupCoversInfluenceGains(existing, groupGains)) continue

      const influenceReward = mergeGainsToReward(groupGains)
      if (existing.length > 0) {
        itemsByGroup.set(
          groupId,
          existing.map((item, index) =>
            index === 0
              ? { ...item, reward: mergeRewardInfluenceInto(item.reward, influenceReward) }
              : item
          )
        )
      } else {
        itemsByGroup.set(groupId, [
          {
            id: `live-influence-${groupId}`,
            groupId,
            title: groupId,
            reward: influenceReward,
          },
        ])
      }
    }

    return Array.from(itemsByGroup.values()).flat()
  }

  const visibleGainItems: VisibleGainChip[] = (() => {
    const historyItems: VisibleGainChip[] = isHistoryView
      ? (() => {
          const persuasionTotal =
            gameState?.currTurn?.persuasionCount ??
            turnGains
              .filter(gain => gain.type === RewardType.PERSUASION)
              .reduce((sum, gain) => sum + gain.amount, 0)
          const combatGains = turnGains.filter(gain => gain.type === RewardType.COMBAT)
          const acquireInfluenceGains = turnGains.filter(isAcquireInfluenceGain)
          const otherGains = turnGains.filter(
            gain =>
              gain.type !== RewardType.PERSUASION &&
              gain.type !== RewardType.COMBAT &&
              !isAcquireInfluenceGain(gain)
          )
          const items: VisibleGainChip[] = otherGains.map((gain, index) => ({
            id: `${gain.source}-${gain.sourceId}-${gain.type}-${index}`,
            groupId: `${gain.source}-${gain.sourceId}-${gain.name}`,
            title: gain.name,
            reward: gainToReward(gain),
            gainSource: gain.source,
          }))
          if (combatGains.length > 0) {
            items.push({
              id: 'turn-combat-total',
              groupId: 'turn-combat-total',
              title: 'Combat (revealed swords)',
              reward: mergeGainsToReward(combatGains)
            })
          }
          if (acquireInfluenceGains.length > 0) {
            items.push({
              id: 'turn-acquire-influence',
              groupId: 'turn-acquire-influence',
              title: 'Influence (acquired cards)',
              reward: mergeGainsToReward(acquireInfluenceGains)
            })
          }
          if (persuasionTotal > 0) {
            items.unshift({
              id: 'turn-persuasion-total',
              groupId: 'turn-persuasion-total',
              title: 'Persuasion (turn total)',
              reward: { persuasion: persuasionTotal }
            })
          }
          return items
        })()
      : [
          ...autoAppliedRewardSummary.map(item => ({
            id: item.id,
            groupId: item.sourceName,
            title: item.sourceName,
            reward: item.reward,
            gainSource: item.sourceType,
          })),
          ...imperiumAcquisitionChipItems
        ]

    return isHistoryView
      ? historyItems
      : consolidateCombatGainChips(mergeLiveInfluenceGainsFromState(historyItems))
  })()
  const visibleGainGroups: VisibleGainGroup[] = Array.from(
    visibleGainItems.reduce((groups, item) => {
      const group = groups.get(item.groupId) || {
        id: item.groupId,
        title: item.title,
        gainSource: item.gainSource,
        items: [] as VisibleGainChip[],
      }
      if (!group.gainSource && item.gainSource) {
        group.gainSource = item.gainSource
      }
      group.items.push(item)
      groups.set(item.groupId, group)
      return groups
    }, new Map<string, VisibleGainGroup>()).values()
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
  const activeCardPreviewIsRevealed = activeCardPreviewCard
    ? revealedCardIds.has(activeCardPreviewCard.id)
    : false
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
  const activeCardLackingResources =
    activePlayer && gameState && activeCardEffect
      ? getLackingOptionalCostResources(
          gameState,
          activePlayer.id,
          activeCardEffect.optional
            .filter(effect => !isAffordable(effect.cost, effect.reward))
            .map(effect => effect.cost)
        )
      : []

  const renderLeaderGainBadge = (group: VisibleGainGroup) => {
    if (!isLeaderGainSource(group.gainSource) || !gainsDisplayPlayer) return null
    const leaderIconPath = getLeaderIconPath(gainsDisplayPlayer.leader.name)
    return (
      <span
        className={`turn-gain-leader-badge leader-avatar-btn ${gainsDisplayPlayer.color}`}
        title={gainsDisplayPlayer.leader.name}
        aria-hidden="true"
      >
        {leaderIconPath ? (
          <img src={leaderIconPath} alt="" className="turn-gain-leader-icon" draggable={false} />
        ) : (
          <span className="turn-gain-leader-icon-fallback">
            {gainsDisplayPlayer.leader.name.charAt(0)}
          </span>
        )}
      </span>
    )
  }

  const renderRoundGainGroups = (placement: 'footer' | 'banner') => {
    if (visibleGainGroups.length === 0) return null
    const gainsLabel = isHistoryView ? 'Turn gains' : 'Gains from this round'
    return (
      <div
        className={[
          'turn-round-gains',
          placement === 'banner' ? 'turn-round-gains--banner' : 'turn-round-gains--footer',
        ].join(' ')}
        role="region"
        aria-label={gainsLabel}
      >
        <div className="turn-round-gains-chips">
          {visibleGainGroups.map(group => {
            const showLeaderBadge = isLeaderGainSource(group.gainSource)
            return (
              <div
                key={group.id}
                className={[
                  'auto-applied-gains-summary',
                  showLeaderBadge ? 'auto-applied-gains-summary--leader' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${gainsLabel} from ${group.title}`}
                title={group.title}
              >
                {renderLeaderGainBadge(group)}
                {group.items.map(item => (
                  <span key={item.id} className="auto-applied-gain-chip" title={item.title}>
                    {renderLabel({ reward: item.reward, rewardLabel: item.rewardLabel })}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const roundGainsFooter = !isDesktopPlay ? renderRoundGainGroups('footer') : null
  const roundGainsBannerContent = isDesktopPlay ? renderRoundGainGroups('banner') : null
  const roundGainsBannerPortal =
    roundGainsBannerContent && roundGainsBannerSlotRef?.current
      ? createPortal(roundGainsBannerContent, roundGainsBannerSlotRef.current)
      : null

  return (
    <>
      {roundGainsBannerPortal}
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
      {activeCardPreviewCard &&
        portalOverlay(
          <div className="imperium-preview-overlay" onClick={closeCardEffectsDialog}>
            <div
              className="imperium-preview-modal card-effects-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={activeCardPreviewCard.name}
              onClick={event => event.stopPropagation()}
            >
              {!activeCardPreviewCard.image && (
                <h3 className="imperium-preview-title card-effects-dialog-title">
                  {activeCardPreviewCard.name}
                </h3>
              )}
              {activeCardEffect
                ? renderCardEffectsDialogStage(
                    activeCardPreviewCard,
                    activeCardEffect,
                    activeCardPreviewIsRevealed
                  )
                : activeCardPreviewCard.image ? (
                  <img
                    src={activeCardPreviewCard.image}
                    alt={activeCardPreviewCard.name}
                    className="imperium-preview-image"
                    draggable={false}
                  />
                ) : null}
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
              <div className="card-effects-dialog-footer">
                {activeCardLackingResources.length > 0 && activePlayer && gameState && (
                  <LeaderResourceStrip
                    compact
                    player={activePlayer}
                    gameState={gameState}
                    onlyResources={activeCardLackingResources}
                  />
                )}
                <button
                  type="button"
                  className="imperium-preview-close"
                  onClick={closeCardEffectsDialog}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {activeIntriguePreviewCard &&
        portalOverlay(
          <div
            className="imperium-preview-overlay"
            onClick={() => {
              setActiveIntriguePreviewCard(null)
              setActiveCardEffectSource(null)
            }}
          >
            <div
              className="imperium-preview-modal card-effects-dialog intrigue-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={activeIntriguePreviewCard.name}
              onClick={event => event.stopPropagation()}
            >
              {!activeIntriguePreviewCard.image && (
                <h3 className="imperium-preview-title card-effects-dialog-title">
                  {activeIntriguePreviewCard.name}
                </h3>
              )}
              {activeCardEffect &&
              activeCardEffect.source.type === GainSource.INTRIGUE &&
              activeCardEffect.source.id === activeIntriguePreviewCard.id
                ? renderCardEffectsDialogStage(activeIntriguePreviewCard, activeCardEffect, false)
                : activeIntriguePreviewCard.image ? (
                  <img
                    src={activeIntriguePreviewCard.image}
                    alt={activeIntriguePreviewCard.name}
                    className="imperium-preview-image"
                    draggable={false}
                  />
                ) : null}
              <button
                type="button"
                className="imperium-preview-close"
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
            <div className="active-player-actions" aria-label="Active player turn rewards">
              <div className="active-player-main-actions">
                {roundGainsFooter}
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
            </div>
          </div>
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
            <div
              className={[
                'selected-card-inline-slot',
                'selected-card-play-area',
                !showPlayedCardStrip && 'selected-card-play-area--empty',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!showPlayedCardStrip ? true : undefined}
              aria-label={
                showPlayedCardStrip
                  ? [
                      playAreaCards.length > 0 &&
                        `Play area: ${playAreaCards.map(c => c.name).join(', ')}`,
                      playedIntrigueCards.length > 0 &&
                        `Played intrigue: ${playedIntrigueCards.map(c => c.name).join(', ')}`,
                    ]
                      .filter(Boolean)
                      .join('. ')
                  : undefined
              }
            >
              {showPlayedCardStrip && (
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
              )}
            </div>
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

      {gameState?.pendingRapidMobilization === activePlayer.id &&
        onMobilizeGarrison &&
        portalOverlay(
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