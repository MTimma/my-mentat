import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, Fragment } from 'react'
import { Player, Card, Leader, IntrigueCard, IntrigueCardType, Cost, Reward, Gain, PendingChoice, FixedOptionsChoice, CardSelectChoice, OptionalEffect, ChoiceType, CardPile, PendingReward, GainSource, CustomEffect, GameTurn, GamePhase, FactionType, GameState, ControlMarkerType, IntriguePlayEffect, InfluenceAmount, InfluenceAmounts, TurnType, RewardType, AUTO_APPLIED_CUSTOM_EFFECTS } from '../../types/GameTypes'
import { intrigueCardHasCustom, intrigueHasPhaseEffect } from '../../utils/intrigueCardCustom'
import { isKwisatzHaderachCard, isKwisatzAgentSourceChoice } from '../../utils/kwisatzHaderach'
import { FixedChoiceModal, useBoardScopedPortal } from '../BoardScopedModal'
import CardSearch from '../CardSearch/CardSearch'
import { immortalityGraftEnabled } from '../../expansions/immortality/graft'
import AgentIcon from '../AgentIcon/AgentIcon'
import { getLeaderIconPath } from '../../data/leaders'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { PLAY_EFFECT_TEXTS, PLAY_EFFECT_DISABLED_TEXTS, REVEAL_EFFECT_TEXTS } from '../../data/effectTexts'
import { intrigueRequirementSatisfied } from '../GameContext/requirements'
import type { TechTileId } from '../../data/techTiles'
import {
  filterAcquireTechFromChoices,
  filterAcquireTechOptionalEffects,
  findOriginalOptionIndex,
} from '../GameContext/riseOfIx/techTurnControlsUi'
import TurnControlsTechRow from '../TurnControlsTechRow/TurnControlsTechRow'
import NegotiatorIcon from '../NegotiatorIcon/NegotiatorIcon'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import {
  getAgentTurnCardsForDisplay,
  getPlayAreaCardsForTurnView,
  getOpponentDiscardableCards,
  getSelectableDeckCards,
  getDiscardCostPlayability,
} from '../../utils/playAreaDisplay'
import {
  getAnyFactionInfluenceGainIcon,
  getAnyFactionInfluenceLossIcon,
  getFactionBumpIcon,
  influenceAmountsFromGain,
  isAnyFactionInfluenceChoice,
} from '../../utils/influenceDisplay'
import {
  canAffordInfluenceOptionalEffect,
  canAffordInfluenceReward,
  getLackingOptionalCostResources,
  requiresInfluenceChoices,
} from '../../utils/influenceChoices'
import { isInfluenceBoardChoice } from '../../utils/influenceBoardChoice'
import {
  CardEffectRect,
  CARD_EFFECT_REGIONS,
  getCardEffectDebugRects,
  getOptionalEffectOverlayRect,
  getRewardOverlayRect,
  isSignetRingCard,
  layoutCardRegionPercent,
  rectPlacementKey,
} from '../../data/cardEffectRegions'
import PlayerTargetDialog from '../PlayerTargetDialog'
import LeaderResourceStrip from '../LeaderResourceStrip/LeaderResourceStrip'
import LeaderImageModal from '../LeaderImageModal/LeaderImageModal'
import RevealPersuasionRemaining from '../RevealPersuasionRemaining/RevealPersuasionRemaining'
import './TurnControls.css'

interface TurnControlsProps {
  activePlayer: Player | null
  onPlayCard: (playerId: number, cardId: number, deckIndex?: number) => void
  onCompleteGraftPair?: (
    playerId: number,
    primaryCardId: number,
    primaryDeckIndex: number,
    secondaryCardId: number,
    secondaryDeckIndex: number,
  ) => void
  onPlayIntrigue: (playerId: number, cardId: number, targetPlayerId?: number) => void
  onMobilizeGarrison?: (playerId: number, count: number) => void
  onPlayCombatIntrigue: (playerId: number, cardId: number) => void
  onReveal: (playerId: number, cardIds: number[]) => void
  canEndTurn: boolean
  isCombatPhase: boolean
  players?: Player[]
  optionalEffects?: OptionalEffect[]
  onPayCost?: (effectId: string, data?: { trashedCardId?: number }) => void
  showSelectiveBreeding?: boolean
  selectiveBreedingCards?: Card[]
  onSelectiveBreedingSelect?: (card: Card) => void
  onSelectiveBreedingCancel?: () => void
  pendingChoices?: PendingChoice[]
  onResolveChoice?: (choiceId: string, optionIndex: number, source?: { type: string; id: number; name: string }) => void
  onResolveCardSelect?: (choiceId: string, cardIds: number[]) => void
  selectedCard?: Card | null
  recallMode?: boolean
  placementPrompt?: string | null
  pendingRewards?: PendingReward[]
  onClaimReward?: (rewardId: string, customData?: { trashedCardId?: number; [key: string]: unknown }) => void
  onClaimAllRewards?: () => void
  onAutoApplyRewards?: () => void
  autoApplyMandatoryRewards?: boolean
  agentPlaced?: boolean
  opponentDiscardState?: GameTurn['opponentDiscardState']
  onOpponentDiscardChoice?: (opponentId: number, choice: 'discard' | 'loseTroop') => void
  onOpponentDiscardCard?: (opponentId: number, cardId: number) => void
  onOpponentDiscardCards?: (opponentId: number, cardIds: number[]) => void
  combatTroops?: Record<number, number>
  onVoiceSelectionStart?: (rewardId: string) => void
  voiceSelectionActive?: boolean
  onVoiceSelectionCancel?: () => void
  onMasterstrokeSelectionStart?: (rewardId: string) => void
  masterstrokeSelectionActive?: boolean
  onMemnonHighCouncilSelectionStart?: (rewardId: string) => void
  memnonHighCouncilSelectionActive?: boolean
  influenceBoardSelectionActive?: boolean
  influenceBoardPrompt?: string | null
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
  /** Desktop: leader + effects + end turn in a top play bar; footer nav hidden */
  showDesktopPlayBar?: boolean
  showEndTurnButton?: boolean
  showPassCombatButton?: boolean
  onEndTurn?: () => void
  onRecallPlacedAgent?: () => void
  onCancelGraftSelection?: () => void
  onPassCombat?: () => void
  onActivateTech?: (playerId: number, tileId: TechTileId) => void
  endTurnDisabled?: boolean
  endTurnTitle?: string
  passCombatLabel?: string
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
  onCompleteGraftPair,
  onPlayIntrigue,
  onMobilizeGarrison,
  onPlayCombatIntrigue,
  onReveal,
  isCombatPhase,
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
  placementPrompt = null,
  pendingRewards = [],
  onClaimReward,
  onAutoApplyRewards,
  autoApplyMandatoryRewards = true,
  agentPlaced = false,
  opponentDiscardState,
  onOpponentDiscardChoice,
  onOpponentDiscardCard,
  onOpponentDiscardCards,
  combatTroops = {},
  onVoiceSelectionStart,
  voiceSelectionActive = false,
  onMasterstrokeSelectionStart,
  masterstrokeSelectionActive = false,
  onMemnonHighCouncilSelectionStart,
  memnonHighCouncilSelectionActive = false,
  influenceBoardSelectionActive = false,
  influenceBoardPrompt = null,
  onOpponentNoCardAck,
  intrigueDeck,
  gamePhase,
  activeIntrigueThisRound = [],
  gameState,
  isHistoryView = false,
  showDesktopPlayBar = false,
  showEndTurnButton = false,
  showPassCombatButton = false,
  onEndTurn,
  onRecallPlacedAgent,
  onCancelGraftSelection,
  onPassCombat,
  onActivateTech,
  endTurnDisabled = false,
  endTurnTitle,
  passCombatLabel = 'Pass Combat',
}) => {
  const [isLeaderImageOpen, setIsLeaderImageOpen] = useState(false)
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
  const [discardCostSelection, setDiscardCostSelection] = useState<Card[]>([])
  const [opponentCardSelect, setOpponentCardSelect] = useState<{
    player: Player
    selectionCount: number
  } | null>(null)
  const [activeFixedChoice, setActiveFixedChoice] = useState<FixedOptionsChoice | null>(null)
  const [activeCardEffectSource, setActiveCardEffectSource] = useState<{ type: GainSource; id: number } | null>(null)
  const [activeCardPreviewId, setActiveCardPreviewId] = useState<number | null>(null)
  const [activeIntriguePreviewCard, setActiveIntriguePreviewCard] = useState<IntrigueCard | null>(null)

  /** Clears played-card overlay; avoids stale preview ids matching deck/discard after trash. */
  const closeCardEffectsDialog = useCallback(() => {
    setActiveCardPreviewId(null)
    setActiveCardEffectSource(null)
  }, [])

  useEffect(() => {
    if (influenceBoardSelectionActive) {
      closeCardEffectsDialog()
    }
  }, [influenceBoardSelectionActive, closeCardEffectsDialog])

  useEffect(() => {
    if (!activeCardSelect) {
      setDiscardCostSelection([])
    }
  }, [activeCardSelect])

  const hasOpponentDiscard = Boolean(opponentDiscardState)
  const getReverendMotherDiscardCount = useCallback(
    (player: Player, discardCounts?: Record<number, number>) => {
      const discarded = discardCounts?.[player.id] ?? 0
      return Math.max(0, Math.min(2 - discarded, player.handCount))
    },
    []
  )

  const openReverendMotherDiscardModal = useCallback(
    (player: Player) => {
      const selectionCount = getReverendMotherDiscardCount(
        player,
        opponentDiscardState?.discardCounts
      )
      if (selectionCount <= 0) return
      setOpponentCardSelect({ player, selectionCount })
    },
    [getReverendMotherDiscardCount, opponentDiscardState?.discardCounts]
  )

  useEffect(() => {
    if (isHistoryView || !onOpponentNoCardAck) return
    if (opponentDiscardState?.effect !== CustomEffect.REVEREND_MOTHER_MOHIAM) return
    if (opponentDiscardState.currentOpponent != null) return
    const remaining = opponentDiscardState.remainingOpponents ?? []
    const emptyHandIds = remaining.filter(
      id => (players.find(p => p.id === id)?.handCount ?? 0) === 0
    )
    if (emptyHandIds.length === 0) return
    emptyHandIds.forEach(id => onOpponentNoCardAck(id))
  }, [
    isHistoryView,
    onOpponentNoCardAck,
    opponentDiscardState,
    players,
  ])

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
    const kwisatzChoices = pendingChoices.filter(
      choice =>
        choice.type === ChoiceType.FIXED_OPTIONS && isKwisatzAgentSourceChoice(choice.id)
    ) as FixedOptionsChoice[]
    if (
      !isHistoryView &&
      kwisatzChoices.length === 1 &&
      !activeFixedChoice &&
      !hasOpponentDiscard
    ) {
      setActiveFixedChoice(kwisatzChoices[0])
    }
  }, [pendingChoices, activeFixedChoice, isHistoryView, hasOpponentDiscard])

  useEffect(() => {
    if (activeFixedChoice && !pendingChoices.some(choice => choice.id === activeFixedChoice.id)) {
      setActiveFixedChoice(null)
    }
  }, [activeFixedChoice, pendingChoices])

  const riseOfIx = gameState?.expansions?.riseOfIx === true
  const turnControlOptionalEffects = useMemo(
    () => filterAcquireTechOptionalEffects(optionalEffects),
    [optionalEffects]
  )
  const turnControlPendingChoices = useMemo(
    () =>
      filterAcquireTechFromChoices(pendingChoices).filter(
        choice =>
          !(choice.type === ChoiceType.FIXED_OPTIONS && isKwisatzAgentSourceChoice(choice.id))
      ),
    [pendingChoices]
  )

  const pendingPlayInputKey = useMemo(
    () =>
      [
        ...pendingRewards.filter(reward => !reward.disabled).map(reward => reward.id),
        ...turnControlOptionalEffects.map(effect => effect.id),
        ...turnControlPendingChoices.filter(choice => !choice.disabled).map(choice => choice.id),
      ].join(','),
    [pendingRewards, turnControlOptionalEffects, turnControlPendingChoices]
  )

  const techControlsRow =
    riseOfIx && activePlayer && gameState && !isCombatPhase ? (
      <TurnControlsTechRow
        gameState={gameState}
        player={activePlayer}
        onActivateTech={isHistoryView ? undefined : onActivateTech}
        isHistoryView={isHistoryView}
      />
    ) : null

  useLayoutEffect(() => {
    if (isHistoryView || !pendingPlayInputKey) return
    const host = document.querySelector<HTMLElement>(
      '.game-container--play .turn-controls-container'
    )
    if (!host || host.hidden) return
    host.scrollTop = 0
  }, [pendingPlayInputKey, isHistoryView])

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
  const isSandboxSetup = Boolean(gameState?.sandboxSetup)
  const sandboxSetupBlockedTitle =
    'Finish sandbox setup and tap Begin turns before taking player actions.'

  const playedIntrigueCards = (gameState?.currTurn?.playedIntrigueCard || [])
    .map(play =>
      gameState?.intrigueDiscard.find(card => card.id === play.cardId) ||
      gameState?.intrigueDeck.find(card => card.id === play.cardId) ||
      activeIntrigueThisRound.find(card => card.id === play.cardId)
    )
    .filter((card): card is IntrigueCard => Boolean(card))
  const activeIntrigueIds = new Set(activeIntrigueThisRound.map(card => card.id))
  const playedIntrigueStripCards = playedIntrigueCards.filter(
    card => !activeIntrigueIds.has(card.id)
  )
  const hasActiveIntrigueThisRound = activeIntrigueThisRound.length > 0
  const playAreaIntrigueCards = hasActiveIntrigueThisRound
    ? [...playedIntrigueStripCards, ...activeIntrigueThisRound]
    : playedIntrigueStripCards
  const playAreaIntriguePreviewIdsKeyEarly = playAreaIntrigueCards.map(c => c.id).join(',')
  const pendingAgentTurnCards = getAgentTurnCardsForDisplay(
    gameState,
    activePlayer,
    selectedCard ?? null,
    { isRevealTurn }
  )
  const playAreaPreviewIdsKeyEarly = activePlayer
    ? [
        ...activePlayer.playArea,
        ...pendingAgentTurnCards,
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
      playAreaIntriguePreviewIdsKeyEarly.length > 0
        ? playAreaIntriguePreviewIdsKeyEarly.split(',').map(Number)
        : []
    if (!ids.includes(activeIntriguePreviewCard.id)) {
      setActiveIntriguePreviewCard(null)
      setActiveCardEffectSource(null)
    }
  }, [activeIntriguePreviewCard, isHistoryView, playAreaIntriguePreviewIdsKeyEarly])

  if (!activePlayer) return null
  const isKwisatzHaderach = (card: Card) => isKwisatzHaderachCard(card)
  const hasRecallableAgent = Object.values(gameState?.occupiedSpaces ?? {}).some(playerIds =>
    playerIds.includes(activePlayer.id)
  )
  const canPlayKwisatzWithNoAgents =
    activePlayer.agents === 0 &&
    hasRecallableAgent &&
    activePlayer.deck.some(isKwisatzHaderach)

  const primaryTurnActionsHidden = isHistoryView || isCombatPhase || isEndGame
  const playBarTurnLabel = (() => {
    if (!isHistoryView || !gameState?.currTurn) return null
    const curr = gameState.currTurn
    if (curr.type === TurnType.ACTION && curr.agentSpaceId != null) {
      const space = BOARD_SPACES.find(s => s.id === curr.agentSpaceId)
      if (space) return space.name
    }
    if (curr.type === TurnType.REVEAL) return 'Reveal'
    if (curr.type === TurnType.PASS) return 'Pass'
    return null
  })()

  const playActionDisabled =
    isSandboxSetup ||
    (activePlayer.agents === 0 && !canPlayKwisatzWithNoAgents) ||
    activePlayer.handCount === 0 ||
    isHistoryView ||
    canEndTurn ||
    agentPlaced ||
    hasOpponentDiscard ||
    hasMandatoryRewards
  const revealActionDisabled =
    isSandboxSetup ||
    isHistoryView ||
    canEndTurn ||
    isCombatPhase ||
    agentPlaced ||
    hasOpponentDiscard ||
    hasMandatoryRewards
  const playActionTitle =
    isSandboxSetup
      ? sandboxSetupBlockedTitle
      : hasOpponentDiscard
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
  const showRevealPersuasionRemaining =
    !isHistoryView && activePlayer.revealed && Boolean(gameState?.canAcquireIR)
  const revealActionTitle = isSandboxSetup
    ? sandboxSetupBlockedTitle
    : hasOpponentDiscard
      ? 'Resolve opponent discard instructions before taking new actions.'
      : hasMandatoryRewards
        ? 'Claim pending rewards before taking new actions.'
        : agentPlaced
          ? 'You have already placed an agent this turn'
          : undefined
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
          return (
            card.type === IntrigueCardType.COMBAT || intrigueHasPhaseEffect(card, GamePhase.COMBAT)
          )
        }
        if (gamePhase === GamePhase.PLAYER_TURNS) {
          return (
            card.type === IntrigueCardType.PLOT ||
            intrigueHasPhaseEffect(card, GamePhase.PLAYER_TURNS)
          )
        }
        return card.type === IntrigueCardType.PLOT
      }),
    [intrigueDeck, gamePhase]
  )

  const handCardSearchIdsKey = [...activePlayer.deck]
    .map(c => c.id)
    .sort((a, b) => a - b)
    .join(',')
  const handCardsForCardSearch = useMemo(() => activePlayer.deck, [handCardSearchIdsKey])
  const selectableDeckCards = useMemo(
    () => getSelectableDeckCards(activePlayer),
    [handCardSearchIdsKey]
  )

  const playCardPickerPlayabilityKey = useMemo(
    () => `${activePlayer.agents}|${JSON.stringify(gameState?.occupiedSpaces ?? {})}`,
    [activePlayer.agents, gameState?.occupiedSpaces],
  )

  const handlePlayCard = () => {
    if (isSandboxSetup) return
    setIsRevealTurn(false)
    setIsCardSelectionOpen(true)
  }

  const handlePlayIntrigueClick = () => {
    if (isSandboxSetup) return
    setIsRevealTurn(false)
    setIsIntrigueSelectionOpen(true)
  }

  const handlePlayCombatIntrigue = () => {
    if (isSandboxSetup) return
    setIsRevealTurn(false)
    setIsIntrigueSelectionOpen(true)
  }

  const handleRevealTurn = () => {
    if (isSandboxSetup) return
    setIsRevealTurn(true)
    setIsCardSelectionOpen(true)
  }
  const graftPairSelection =
    !isRevealTurn && immortalityGraftEnabled(gameState?.expansions)

  const pendingGraftInitialCards = useMemo(() => {
    const pending = gameState?.pendingGraftPartner
    if (!pending || pending.requiresImperiumRow) return [] as Card[]
    const deck = activePlayer.deck
    const idx =
      typeof pending.primaryDeckIndex === 'number' &&
      deck[pending.primaryDeckIndex]?.id === pending.primaryCardId
        ? pending.primaryDeckIndex
        : deck.findIndex(c => c.id === pending.primaryCardId)
    const card = idx >= 0 ? deck[idx] : deck.find(c => c.id === pending.primaryCardId)
    return card ? [card] : []
  }, [activePlayer.deck, gameState?.pendingGraftPartner])

  useEffect(() => {
    if (
      gameState?.pendingGraftPartner &&
      !gameState.pendingGraftPartner.requiresImperiumRow &&
      !isHistoryView
    ) {
      setIsRevealTurn(false)
      setIsCardSelectionOpen(true)
    }
  }, [gameState?.pendingGraftPartner, isHistoryView])

  const deckIndexForCard = (card: Card): number => {
    const idx = activePlayer.deck.indexOf(card)
    return idx >= 0 ? idx : activePlayer.deck.findIndex(c => c.id === card.id)
  }

  const handleCardSelection = (picked: Card[]) => {
    setIsCardSelectionOpen(false)
    if (isRevealTurn) {
      onReveal(activePlayer.id, picked.map(card => card.id))
      setIsRevealTurn(false)
    } else if (
      picked.length === 2 &&
      picked.some(c => c.graft) &&
      onCompleteGraftPair
    ) {
      const primaryIdx = deckIndexForCard(picked[0])
      const secondaryIdx = deckIndexForCard(picked[1])
      if (primaryIdx < 0 || secondaryIdx < 0) return
      onCompleteGraftPair(
        activePlayer.id,
        picked[0].id,
        primaryIdx,
        picked[1].id,
        secondaryIdx,
      )
    } else if (picked.length === 1) {
      const deckIndex = deckIndexForCard(picked[0])
      onPlayCard(activePlayer.id, picked[0].id, deckIndex >= 0 ? deckIndex : undefined)
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
    if (cost?.discard && activePlayer.handCount < cost.discard) return false
    if (cost?.spice && activePlayer.spice < cost.spice) return false
    if (cost?.water && activePlayer.water < cost.water) return false
    if (cost?.solari && activePlayer.solari < cost.solari) return false
    if (cost?.troops && activePlayer.troops < cost.troops) return false
    if (reward?.techNegotiator && (activePlayer.troopSupply ?? 0) < reward.techNegotiator) return false
    if (reward?.acquireTech !== undefined && !gameState.ixBoard?.stacks?.some(stack => stack.length > 0)) {
      return false
    }
    if (cost?.poolTroop && (activePlayer.troopSupply ?? 0) < cost.poolTroop) return false
    if (!canAffordInfluenceOptionalEffect(gameState, activePlayer.id, cost, reward)) return false
    if (!canAffordInfluenceReward(gameState, activePlayer.id, reward)) return false
    return true
  }

  const isFixedChoiceOptionDisabled = (option: { reward: Reward; cost?: Cost; disabled?: boolean }): boolean => {
    if (option.reward.custom && option.disabled) return true
    if (!activePlayer || !gameState) return Boolean(option.disabled)
    if (option.cost?.poolTroop && (activePlayer.troopSupply ?? 0) < option.cost.poolTroop) return true
    if (option.reward.acquireTech !== undefined && !gameState.ixBoard?.stacks?.some(stack => stack.length > 0)) {
      return true
    }
    if (option.reward.techNegotiator && (activePlayer.troopSupply ?? 0) < option.reward.techNegotiator) {
      return true
    }
    if (option.reward.influence) {
      return !canAffordInfluenceReward(gameState, activePlayer.id, option.reward)
    }
    return Boolean(option.disabled)
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

  const renderInfluenceAmountLabel = (amount: number, isLoss: boolean) => {
    const absAmount = Math.abs(amount)
    if (isLoss) {
      return <span className="effect-influence-amt">-{absAmount}</span>
    }
    if (absAmount > 1) {
      return <span className="effect-influence-amt">×{absAmount}</span>
    }
    return null
  }

  const renderInfluenceAmounts = (
    influence: InfluenceAmounts,
    side: 'cost' | 'reward',
    keyPrefix: string
  ): React.ReactNode[] => {
    if (isAnyFactionInfluenceChoice(influence)) {
      const amount = influence.amounts[0].amount
      const isLoss = amount < 0 || side === 'cost'
      const absAmount = Math.abs(amount)
      const icon = isLoss
        ? getAnyFactionInfluenceLossIcon()
        : getAnyFactionInfluenceGainIcon(absAmount)
      const title = isLoss
        ? `Lose ${absAmount} influence with any faction`
        : `Gain ${absAmount} influence with any faction`
      return [
        <span key={`${keyPrefix}-any`} className="effect-influence-line" title={title}>
          <img
            src={icon}
            alt=""
            className={`effect-faction-icon${isLoss ? '' : ' effect-faction-bump-icon'}`}
          />
          {renderInfluenceAmountLabel(amount, isLoss)}
        </span>,
      ]
    }

    return influence.amounts.map((inf: InfluenceAmount, idx: number) => {
      const isLoss = inf.amount < 0 || side === 'cost'
      const absAmount = Math.abs(inf.amount)
      if (isLoss) {
        return (
          <span
            key={`${keyPrefix}-${idx}`}
            className="effect-influence-line"
            title={`${inf.faction} influence -${absAmount}`}
          >
            <img src={`/icon/${inf.faction}.png`} alt="" className="effect-faction-icon" />
            {renderInfluenceAmountLabel(inf.amount, true)}
          </span>
        )
      }
      return (
        <span key={`${keyPrefix}-${idx}`} className="effect-influence-line" title={`${inf.faction} influence +${inf.amount}`}>
          <img src={getFactionBumpIcon(inf.faction)} alt="" className="effect-faction-icon effect-faction-bump-icon" />
          {renderInfluenceAmountLabel(inf.amount, false)}
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
      if (cost.poolTroop) {
        left.push(
          <span key="pool-troop" className="effect-pool-troop" title={`Pay ${cost.poolTroop} troop(s) from pool`}>
            <span className="effect-pool-label">pool</span>
            {renderRepeatedIconReward('pool-troop', 'troop', cost.poolTroop, 'Pool troop')}
          </span>
        )
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
    if(reward.combat) right.push(<React.Fragment key="combat">{renderIconValue('sword', reward.combat, 'Combat', '+')}</React.Fragment>)
    right.push(renderRepeatedIconReward('draw', 'draw', reward.drawCards, 'Draw'))
    if(reward.troops) right.push(<React.Fragment key="troops">{renderIconValue('troop', reward.troops, 'Troops')}</React.Fragment>)
    if(reward.techNegotiator) {
      right.push(
        <span key="tech-negotiator" className="effect-icon-token" title={`Tech Negotiator +${reward.techNegotiator}`}>
          {Array.from({ length: Math.max(0, reward.techNegotiator) }, (_, index) => (
            <NegotiatorIcon
              key={index}
              playerId={activePlayer?.id ?? 0}
              color={activePlayer?.color}
              size="lg"
              className="effect-token-icon"
            />
          ))}
        </span>
      )
    }
    if (reward.acquireTech !== undefined) {
      const discount = reward.acquireTech.discount ?? 0
      right.push(
        <span
          key="acquire-tech"
          className="effect-icon-token"
          title={discount > 0 ? `Acquire Tech (−${discount} spice)` : 'Acquire Tech'}
        >
          <img
            src="/icon/tech_tile.png"
            alt=""
            className="effect-token-icon effect-token-icon--tech"
          />
          {discount > 0 ? <span className="effect-token-amt">−{discount}</span> : null}
        </span>
      )
    }
    if (reward.dreadnoughts) {
      right.push(
        <span key="dreadnoughts" className="effect-icon-token" title={`Dreadnought +${reward.dreadnoughts}`}>
          <DreadnoughtIcon
            playerId={activePlayer?.id ?? 0}
            appearance="card"
            className="effect-token-icon"
          />
          {reward.dreadnoughts > 1 ? (
            <span className="effect-token-amt">+{reward.dreadnoughts}</span>
          ) : null}
        </span>
      )
    }
    if (reward.dividends) {
      right.push(
        <span key="dividends" className="effect-icon-token" title="Dividends">
          <img src="/icon/dividends.png" alt="" className="effect-token-icon" />
        </span>
      )
    }
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
            <span key="custom" className="effect-icon-token" title="Steal intrigue">
              <img src="/icon/steal_intrigue.png" alt="" className="effect-token-icon" />
              <span>(0)</span>
            </span>
          )
        } else {
          right.push(
            <span key="custom" className="effect-steal-intrigue" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <img src="/icon/steal_intrigue.png" alt="" className="effect-token-icon" title="Steal intrigue" />
              <span>(</span>
              {eligiblePlayers.map((p, idx) => (
                <React.Fragment key={p.id}>
                  {idx > 0 && <span> </span>}
                  <AgentIcon playerId={p.id} color={p.color} />
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
      if (requiresInfluenceChoices(effect.cost, effect.reward)) {
        closeCardEffectsDialog()
      }
      if(onPayCost){onPayCost(effect.id)}
    }
  }

  const handleTrashSelect = (card: Card) => {
    if(pendingEffect && onPayCost) {
      onPayCost(pendingEffect.id, { trashedCardId: card.id })
    } else if (pendingTrashReward && onClaimReward) {
      onClaimReward(pendingTrashReward.id, { trashedCardId: card.id })
    }
    setShowTrashPopup(false)
    setPendingEffect(null)
    setPendingTrashReward(null)
  }

  const ChoiceDialog = () => {
    if (activeCardSelect) {
      const usesDeckPiles = activeCardSelect.piles?.some(
        pile => pile === CardPile.DECK || pile === CardPile.HAND
      )
      const cardSelectCards =
        activeCardSelect.cards ?? (usesDeckPiles ? selectableDeckCards : undefined)
      const discardCost = activeCardSelect.discardCost
      return (
        <CardSearch
          isOpen={true}
          player={activePlayer!}
          cards={cardSelectCards}
          piles={cardSelectCards ? undefined : activeCardSelect.piles}
          customFilter={activeCardSelect.filter}
          selectionCount={activeCardSelect.selectionCount}
          text={activeCardSelect.prompt}
          isRevealTurn={activeCardSelect.selectionCount > 1}
          onSelectionChange={discardCost ? setDiscardCostSelection : undefined}
          getCardPlayability={
            discardCost && activePlayer
              ? getDiscardCostPlayability(activePlayer, discardCost, discardCostSelection)
              : undefined
          }
          playabilityInvalidateKey={
            discardCost
              ? `${activePlayer?.handCount ?? 0}|${discardCostSelection.map(c => c.id).join(',')}`
              : undefined
          }
          onSelect={selectedCards => {
            if (onResolveCardSelect) {
              onResolveCardSelect(activeCardSelect.id, selectedCards.map(card => card.id))
            }
            setActiveCardSelect(null)
            setDiscardCostSelection([])
          }}
          onCancel={() => {
            setActiveCardSelect(null)
            setDiscardCostSelection([])
          }}
        />
      )
    }

    if (opponentCardSelect) {
      const { player, selectionCount } = opponentCardSelect
      const isReverendMother =
        opponentDiscardState?.effect === CustomEffect.REVEREND_MOTHER_MOHIAM
      const discardableCards = getOpponentDiscardableCards(player)
      return (
        <CardSearch
          isOpen={true}
          player={player}
          cards={discardableCards}
          selectionCount={selectionCount}
          text={
            isReverendMother && selectionCount > 1
              ? `Choose ${selectionCount} cards from ${player.leader?.name || player.color}'s deck to discard`
              : `Choose a card from ${player.leader?.name || player.color}'s deck to discard`
          }
          isRevealTurn={selectionCount > 1}
          onSelect={selectedCards => {
            if (selectedCards.length === 0) return
            if (selectedCards.length > 1 && onOpponentDiscardCards) {
              onOpponentDiscardCards(
                player.id,
                selectedCards.map(card => card.id)
              )
            } else if (onOpponentDiscardCard) {
              onOpponentDiscardCard(player.id, selectedCards[0].id)
            }
            setOpponentCardSelect(null)
          }}
          onCancel={() => setOpponentCardSelect(null)}
        />
      )
    }
    
    return null;
  }

  const resolveFixedChoiceOption = (
    fixedChoice: FixedOptionsChoice,
    optionIndex: number,
    variant: 'dialog' | 'compact',
    onResolvedCompactOption?: (option: { reward: Reward; cost?: Cost }) => void
  ) => {
    const option = fixedChoice.options[optionIndex]
    if (!option || isFixedChoiceOptionDisabled(option)) return

    const originalChoice = pendingChoices.find(
      c => c.id === fixedChoice.id && c.type === ChoiceType.FIXED_OPTIONS
    ) as FixedOptionsChoice | undefined
    const resolveIndex = originalChoice
      ? findOriginalOptionIndex(originalChoice.options, option)
      : optionIndex

    if (onResolveChoice) {
      onResolveChoice(fixedChoice.id, resolveIndex, fixedChoice.source)
    }
    setActiveFixedChoice(null)
    if (variant === 'compact') {
      onResolvedCompactOption?.(option)
    }
  }

  const renderMasterTacticianOptions = (
    fixedChoice: FixedOptionsChoice,
    variant: 'dialog' | 'compact',
    onResolvedCompactOption?: (option: { reward: Reward; cost?: Cost }) => void
  ) => {
    const combatOption = fixedChoice.options.find(option => option.reward.combat !== undefined)
    const retreatOptions = fixedChoice.options
      .filter(
        option =>
          option.reward.retreatFromConflict !== undefined &&
          (option.reward.retreatFromConflict ?? 0) > 0
      )
      .sort(
        (a, b) => (a.reward.retreatFromConflict ?? 0) - (b.reward.retreatFromConflict ?? 0)
      )

    return (
      <div
        className={[
          'master-tactician-choice',
          `master-tactician-choice--${variant}`,
        ].join(' ')}
        role="group"
        aria-label={fixedChoice.prompt || 'Master Tactician'}
      >
        {combatOption && (
          <button
            type="button"
            className={`effect-btn choice fixed-choice-option master-tactician-strength fixed-choice-option--${variant}`}
            disabled={
              combatOption.disabled ||
              voiceSelectionActive ||
              masterstrokeSelectionActive ||
              influenceBoardSelectionActive
            }
            onClick={() =>
              resolveFixedChoiceOption(
                fixedChoice,
                fixedChoice.options.indexOf(combatOption),
                variant,
                onResolvedCompactOption
              )
            }
          >
            {renderLabel(combatOption)}
          </button>
        )}
        {combatOption && retreatOptions.length > 0 && (
          <span className="or-separator master-tactician-or" aria-hidden="true">
            OR
          </span>
        )}
        {retreatOptions.length > 0 && (
          <div className="master-tactician-retreat" role="group" aria-label="Retreat troops from Conflict">
            <span className="master-tactician-retreat-label">Retreat</span>
            <div className="master-tactician-retreat-counts">
              {retreatOptions.map((option, optionIndex) => {
                const count = option.reward.retreatFromConflict ?? 0
                const retreatOptionIndex = fixedChoice.options.indexOf(option)
                return (
                  <button
                    key={count}
                    type="button"
                    className="master-tactician-retreat-count"
                    disabled={
                      isFixedChoiceOptionDisabled(option) ||
                      voiceSelectionActive ||
                      masterstrokeSelectionActive ||
                      !isAffordable(option.cost, option.reward)
                    }
                    onClick={() =>
                      resolveFixedChoiceOption(
                        fixedChoice,
                        retreatOptionIndex >= 0 ? retreatOptionIndex : optionIndex,
                        variant,
                        onResolvedCompactOption
                      )
                    }
                    title={count === 0 ? 'Retreat no troops' : `Retreat ${count} troop${count === 1 ? '' : 's'}`}
                    aria-label={`Retreat ${count} troop${count === 1 ? '' : 's'}`}
                  >
                    {count}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderFixedChoiceOptions = (
    fixedChoice: FixedOptionsChoice,
    variant: 'dialog' | 'compact',
    onResolvedCompactOption?: (option: { reward: Reward; cost?: Cost }) => void
  ) => {
    const retreatOptions = fixedChoice.options.filter(
      option => option.reward.retreatFromConflict !== undefined
    )
    if (retreatOptions.length > 1) {
      return renderMasterTacticianOptions(fixedChoice, variant, onResolvedCompactOption)
    }

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
          const cannotAfford = !isAffordable(option.cost, option.reward)
          const optionDisabled =
            isFixedChoiceOptionDisabled(option) ||
            cannotAfford ||
            voiceSelectionActive ||
            masterstrokeSelectionActive
          return (
            <Fragment key={`${fixedChoice.id}-${index}`}>
              {showOrBetween && index > 0 && (
                <span className="or-separator" aria-hidden="true">
                  OR
                </span>
              )}
              <button
                type="button"
                className={[
                  'effect-btn',
                  `effect-btn--${variant}`,
                  'choice',
                  'fixed-choice-option',
                  `fixed-choice-option--${variant}`,
                  showOrBetween ? 'or-option' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={optionDisabled}
                onClick={() =>
                  resolveFixedChoiceOption(fixedChoice, index, variant, onResolvedCompactOption)
                }
                title={
                  cannotAfford || isFixedChoiceOptionDisabled(option)
                    ? 'Cannot afford this option.'
                    : disabledTooltip
                }
              >
                {renderLabel(option)}
              </button>
            </Fragment>
          )
        })}
      </div>
    )
  }

  const { portalOverlay } = useBoardScopedPortal(true)

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
    turnControlOptionalEffects.forEach(effect => {
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
    turnControlPendingChoices.forEach(choice => {
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
    const selectionActive =
      voiceSelectionActive ||
      masterstrokeSelectionActive ||
      memnonHighCouncilSelectionActive ||
      influenceBoardSelectionActive
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
    const choices =
      filter === 'overlay-only'
        ? []
        : card.choices.filter(
            choice =>
              !influenceBoardSelectionActive ||
              choice.type !== ChoiceType.FIXED_OPTIONS ||
              !isInfluenceBoardChoice(choice as FixedOptionsChoice)
          )
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
          const disabled =
            voiceSelectionActive ||
            masterstrokeSelectionActive ||
            influenceBoardSelectionActive ||
            cannotAfford
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
                voiceSelectionActive ||
                masterstrokeSelectionActive ||
                influenceBoardSelectionActive
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
          if (isKwisatzAgentSourceChoice(choice.id)) return null

          if (choice.type === ChoiceType.CARD_SELECT) {
            const cardSelectChoice = choice as CardSelectChoice
            return (
              <button
                key={choice.id}
                className={`effect-btn effect-btn--${variant} choice`}
                onClick={() => setActiveCardSelect(cardSelectChoice)}
                disabled={
                  cardSelectChoice.disabled ||
                  voiceSelectionActive ||
                  masterstrokeSelectionActive ||
                  influenceBoardSelectionActive
                }
                title={
                  voiceSelectionActive ||
                  masterstrokeSelectionActive ||
                  influenceBoardSelectionActive
                    ? 'Finish the current selection before resolving other choices.'
                    : undefined
                }
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
              disabled={
                fixedChoice.disabled ||
                voiceSelectionActive ||
                masterstrokeSelectionActive ||
                influenceBoardSelectionActive
              }
              title={
                voiceSelectionActive ||
                masterstrokeSelectionActive ||
                influenceBoardSelectionActive
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

  type SignetRingOverlayInfo = {
    leader: Leader
    appliedGains: Gain[]
  }

  const renderSignetRingAgentBackdrop = (info: SignetRingOverlayInfo) => {
    const { leader, appliedGains } = info
    const hasApplied = appliedGains.length > 0
    return (
      <div className="card-effect-signet-backdrop" aria-label="Signet ring ability">
        <div className="signet-ring-effect-heading">
          {leader.signetRingTitle ?? 'Signet ring'}
          {hasApplied && <span className="signet-ring-effect-applied"> · applied</span>}
        </div>
        {leader.signetRingText && (
          <div className="signet-ring-effect-text">{leader.signetRingText}</div>
        )}
        {hasApplied && (
          <div className="signet-ring-applied-chips" aria-label="Signet ring effects applied">
            {appliedGains.map((gain, index) => (
              <span key={`${gain.type}-${gain.amount}-${index}`} className="signet-ring-applied-chip">
                {renderLabel({ reward: gainToReward(gain) })}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderCardEffectsDialogStage = (
    previewCard: Card,
    effectCard: EffectCard,
    isRevealed: boolean,
    signetOverlay?: SignetRingOverlayInfo
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
      signetOverlay?: SignetRingOverlayInfo
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

    if (signetOverlay && isSignetRingCard(previewCard) && !isRevealed) {
      ensurePlacement(CARD_EFFECT_REGIONS.agent).signetOverlay = signetOverlay
    }

    const overlayPlacements = [...placementMap.values()]
    const hasOverlays = overlayPlacements.length > 0 || cardEffectDebug
    const nonOverlayCard: EffectCard = {
      ...effectCard,
      optional: [],
      rewards: effectCard.rewards.filter(
        reward => !reward.isTrash && !shouldOverlayCardReward(reward)
      ),
    }
    const modalChoices = nonOverlayCard.choices.filter(
      choice =>
        !influenceBoardSelectionActive ||
        choice.type !== ChoiceType.FIXED_OPTIONS ||
        !isInfluenceBoardChoice(choice as FixedOptionsChoice)
    )
    const hasBelowActions = nonOverlayCard.rewards.length > 0 || modalChoices.length > 0

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
      const { rect, optional: zoneOptional, rewards: zoneRewards, signetOverlay: zoneSignet } = placement
      if (zoneOptional.length === 0 && zoneRewards.length === 0 && !zoneSignet) return null
      return (
        <div
          className={[
            'card-effect-overlay-zone',
            zoneSignet ? 'card-effect-signet-zone' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={rectBoxStyle(rect)}
          data-card-region={placement.key}
        >
          {zoneSignet && renderSignetRingAgentBackdrop(zoneSignet)}
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
      <div
        className={[
          'card-effects-dialog-body',
          hasBelowActions ? 'card-effects-dialog-body--has-actions' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
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
      </div>
    )
  }

  const renderTurnCard = (card: Card, mode: 'played' | 'revealed', effectCards: EffectCard[]) => {
    const effectCard = effectCards.find(entry => entry.source.type === GainSource.CARD && entry.source.id === card.id)
    const shouldHighlightPending = effectCardHasPendingInput(effectCard)
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
          if (influenceBoardSelectionActive) return
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
            <AgentIcon
              playerId={activePlayer.id}
              color={activePlayer.color}
              className="selected-card-agent-icon"
            />
            <span className="selected-card-agent-count">{activePlayer.agents}</span>
          </span>
        </span>
      </button>
    )
  }

  const renderIntrigueActionButton = () => {
    const disabled =
      isSandboxSetup ||
      activePlayer.intrigueCount === 0 ||
      playableIntrigueCards.length === 0 ||
      !hasPlayableIntrigue
    const title =
      isSandboxSetup
        ? sandboxSetupBlockedTitle
        : activePlayer.intrigueCount === 0
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
            fetchpriority="high"
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

  const renderOpponentDiscardLeaderAvatar = (opponent: Player) => {
    const iconPath = getLeaderIconPath(opponent.leader.name)
    return (
      <span
        className={`opponent-discard-leader-avatar leader-avatar-btn ${opponent.color}`}
        aria-hidden="true"
      >
        {iconPath ? (
          <img src={iconPath} alt="" draggable={false} />
        ) : (
          <span className="opponent-discard-leader-fallback">{opponent.leader.name.charAt(0)}</span>
        )}
      </span>
    )
  }

  const renderOpponentDiscardPanel = () => {
    const effect = opponentDiscardState?.effect
    if (!effect) return null
    
    // For REVEREND_MOTHER_MOHIAM, show player selection if no current opponent selected
    if (effect === CustomEffect.REVEREND_MOTHER_MOHIAM && !opponentDiscardState?.currentOpponent) {
      const remainingOpponents = opponentDiscardState?.remainingOpponents || []
      const opponentsToShow = players.filter(p => remainingOpponents.includes(p.id))
      const eligibleOpponents = opponentsToShow.filter(
        p => getOpponentDiscardableCards(p).length > 0
      )
      
      if (eligibleOpponents.length === 0) {
        return (
          <div className="opponent-discard-panel">
            <div className="panel-title">Reverend Mother Mohiam</div>
            <div className="panel-body">
              <p>No opponents have cards left to discard.</p>
            </div>
          </div>
        )
      }
      
      return (
        <div className="opponent-discard-panel">
          <div className="panel-title">
            Reverend Mother Mohiam
          </div>
          <div className="panel-body">
            <p>Choose which opponent to discard 2 cards from:</p>
            <div className="opponent-discard-opponent-list">
              {opponentsToShow.map(opponent => {
                const discardableCount = getOpponentDiscardableCards(opponent).length
                const isEmpty = discardableCount === 0
                return (
                  <button
                    key={opponent.id}
                    type="button"
                    className={[
                      'opponent-discard-opponent-btn',
                      isEmpty ? 'opponent-discard-opponent-btn--empty' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={isEmpty}
                    onClick={() => {
                      if (isEmpty) return
                      if (onOpponentDiscardChoice) {
                        onOpponentDiscardChoice(opponent.id, 'discard')
                      }
                      openReverendMotherDiscardModal(opponent)
                    }}
                  >
                    {renderOpponentDiscardLeaderAvatar(opponent)}
                    <span className="opponent-discard-opponent-label">
                      {opponent.leader?.name || opponent.color}
                      {isEmpty ? ' (0 cards)' : ''}
                    </span>
                  </button>
                )
              })}
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
    const availableCards = getOpponentDiscardableCards(opponent).length
    const discardableNow = Math.min(remaining, availableCards)
    const canLoseTroop = (combatTroops[currentOpponentId] || 0) > 0
    const canDiscardCard = Boolean(onOpponentDiscardCard) && discardableNow > 0

    return (
      <div className="opponent-discard-panel">
        <div className="panel-title">
          {effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? 'Reverend Mother Mohiam' : 'Test of Humanity'}
        </div>
        <div className="panel-body">
          <div className="opponent-discard-current-opponent">
            {renderOpponentDiscardLeaderAvatar(opponent)}
            <span>{opponent.leader?.name || opponent.color}</span>
          </div>
          {effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? (
            <>
              {discardableNow > 0 ? (
                <>
                  <p>{`Discard ${discardableNow} card${discardableNow !== 1 ? 's' : ''} from this player's hand.`}</p>
                  <button
                    className="primary-btn"
                    onClick={() => canDiscardCard && openReverendMotherDiscardModal(opponent)}
                    disabled={!canDiscardCard}
                  >
                    {discardableNow > 1 ? 'Choose cards to discard' : 'Choose card to discard'}
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
                  onClick={() => canDiscardCard && setOpponentCardSelect({ player: opponent, selectionCount: 1 })}
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
  const trashedCardIds = new Set((activePlayer.trash ?? []).map(c => c.id))
  const basePlayAreaCards = (isHistoryView && gameState
    ? getPlayAreaCardsForTurnView(gameState, activePlayer)
    : activePlayer.playArea
  ).filter(card => !trashedCardIds.has(card.id))
  const pendingAgentTurnCardsForStrip = getAgentTurnCardsForDisplay(
    gameState,
    activePlayer,
    selectedCard ?? null,
    { isRevealTurn }
  )
  const playAreaCards = [
    ...basePlayAreaCards,
    ...pendingAgentTurnCardsForStrip.filter(
      card => !basePlayAreaCards.some(existing => existing.id === card.id)
    ),
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
    playAreaCards.length > 0 ||
    playedIntrigueStripCards.length > 0 ||
    hasActiveIntrigueThisRound
  const visibleCardIds = new Set(playAreaCards.map(card => card.id))
  const gainToReward = (gain: Gain): Reward => {
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
    activeCardIsSignetRing && activeCardPreviewCard && activePlayer
      ? (gameState?.gains ?? []).filter(
          gain =>
            gain.playerId === activePlayer.id &&
            gain.round === gameState?.currentRound &&
            gain.source === GainSource.CARD &&
            gain.sourceId === activeCardPreviewCard.id
        )
      : []
  const activeCardSignetOverlay =
    activeCardPreviewCard && activePlayer && isSignetRingCard(activeCardPreviewCard) && !activeCardPreviewIsRevealed
      ? { leader: activePlayer.leader, appliedGains: activeCardSignetGains }
      : undefined
  const activeCardEffectsStageCard =
    activeCardEffect ??
    (activeCardSignetOverlay && activeCardPreviewCard
      ? {
          source: {
            type: GainSource.CARD,
            id: activeCardPreviewCard.id,
            name: activeCardPreviewCard.name,
          },
          rewards: [],
          optional: [],
          choices: [],
        }
      : null)
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

  return (
    <>
      {renderOpponentDiscardPanel()}
      {influenceBoardSelectionActive && influenceBoardPrompt ? (
        <div className="influence-selection-banner" role="status" aria-live="polite">
          <span className="influence-selection-banner__text">{influenceBoardPrompt}</span>
          <span className="influence-selection-banner__hint">
            Tap a highlighted influence track on the board
          </span>
        </div>
      ) : null}
      {!influenceBoardSelectionActive && placementPrompt ? (
        <div className="placement-prompt-banner" role="status" aria-live="polite">
          <span className="placement-prompt-banner__text">{placementPrompt}</span>
          {onCancelGraftSelection ? (
            <button type="button" className="placement-prompt-banner__action" onClick={onCancelGraftSelection}>
              Cancel graft
            </button>
          ) : null}
        </div>
      ) : null}
      {
        <ChoiceDialog />
        
      }
      <FixedChoiceModal
        choice={activeFixedChoice}
        onClose={() => setActiveFixedChoice(null)}
      >
        {activeFixedChoice ? renderFixedChoiceOptions(activeFixedChoice, 'dialog') : null}
      </FixedChoiceModal>
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
              {activeCardEffectsStageCard
                ? renderCardEffectsDialogStage(
                    activeCardPreviewCard,
                    activeCardEffectsStageCard,
                    activeCardPreviewIsRevealed,
                    activeCardSignetOverlay
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
        className={['turn-controls', isSandboxSetup ? 'turn-controls--sandbox-setup' : '']
          .filter(Boolean)
          .join(' ')}
        hidden={
          Boolean(activeCardSelect) ||
          Boolean(opponentCardSelect) ||
          isCardSelectionOpen ||
          isIntrigueSelectionOpen ||
          showSelectiveBreeding ||
          showTrashPopup
        }
      >
        <div
          className={[
            'turn-controls-expanded-only',
            showDesktopPlayBar ? 'turn-controls-expanded-only--desktop-play-bar' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showDesktopPlayBar && activePlayer ? (
            <div
              className={[
                'turn-controls-play-bar',
                isHistoryView ? 'turn-controls-play-bar--history' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="Turn actions"
            >
              <div className="turn-controls-play-bar__leader-cluster">
                <button
                  type="button"
                  className={`see-leader-button leader-avatar-btn ${activePlayer.color}`}
                  onClick={() => setIsLeaderImageOpen(true)}
                  title={`View ${activePlayer.leader.name}`}
                  aria-label={`View ${activePlayer.leader.name}`}
                >
                  {getLeaderIconPath(activePlayer.leader.name) ? (
                    <img
                      src={getLeaderIconPath(activePlayer.leader.name)}
                      alt=""
                      className="see-leader-icon"
                      draggable={false}
                    />
                  ) : (
                    <span className="see-leader-icon-fallback" aria-hidden="true">
                      {activePlayer.leader.name.charAt(0)}
                    </span>
                  )}
                </button>
              </div>
              <div className="turn-controls-play-bar__center">
                {isHistoryView && playBarTurnLabel ? (
                  <span className="turn-controls-play-bar__turn-label">{playBarTurnLabel}</span>
                ) : (
                  <>
                    {effectCards.length > 0 && (
                      <div className="turn-controls-effects-row turn-controls-effects-row--in-play-bar">
                        {renderIntegratedEffects(effectCards, visibleCardIds, playAreaIntrigueCards)}
                      </div>
                    )}
                    {(showRevealCombat || showAutoApplyRewardsButton) && (
                      <div className="turn-controls-play-bar__chips" aria-label="Active player turn rewards">
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
                            <Icon type="sword" className="reveal-total-icon" alt="" />
                            <span className="reveal-total-count">{revealCombatTotal}</span>
                          </div>
                        )}
                        {showAutoApplyRewardsButton && (
                          <button
                            type="button"
                            className="get-mandatory-effects-button"
                            onClick={() => onAutoApplyRewards && onAutoApplyRewards()}
                            disabled={
                              voiceSelectionActive || masterstrokeSelectionActive || simpleAutoApplyCount === 0
                            }
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
                    )}
                  </>
                )}
              </div>
              <div className="turn-controls-play-bar__actions">
                {!isHistoryView && onRecallPlacedAgent && (
                  <button
                    type="button"
                    className="end-turn-button play-bar-end-turn-button"
                    onClick={onRecallPlacedAgent}
                  >
                    Recall Agent
                  </button>
                )}
                {!isHistoryView && showEndTurnButton && onEndTurn && (
                  <button
                    type="button"
                    className="end-turn-button play-bar-end-turn-button"
                    onClick={onEndTurn}
                    disabled={endTurnDisabled}
                    title={endTurnTitle}
                  >
                    End Turn
                  </button>
                )}
                {!isHistoryView && showPassCombatButton && onPassCombat && (
                  <button
                    type="button"
                    className="pass-combat-button play-bar-pass-combat-button"
                    onClick={onPassCombat}
                    aria-label={passCombatLabel}
                  >
                    {passCombatLabel}
                  </button>
                )}
                {isHistoryView ? (
                  <span className="turn-controls-play-bar__actions-spacer" aria-hidden="true" />
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {effectCards.length > 0 && (
                <div className="turn-controls-effects-row">
                  {renderIntegratedEffects(effectCards, visibleCardIds, playAreaIntrigueCards)}
                </div>
              )}
              <div className="active-player-info">
                <div className="active-player-actions" aria-label="Active player turn rewards">
                  <div className="active-player-main-actions">
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
                        <Icon type="sword" className="reveal-total-icon" alt="" />
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
            </>
          )}
        <div className="turn-controls-buttons-grid">
          <div className="utility-buttons utility-buttons--with-inline-card">
            <div
              className={[
                'selected-card-inline-slot',
                'selected-card-play-area',
                !showPlayedCardStrip && !showRevealPersuasionRemaining && 'selected-card-play-area--empty',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!showPlayedCardStrip && !showRevealPersuasionRemaining ? true : undefined}
              aria-label={
                showPlayedCardStrip
                  ? [
                      playAreaCards.length > 0 &&
                        `Play area: ${playAreaCards.map(c => c.name).join(', ')}`,
                      playedIntrigueStripCards.length > 0 &&
                        `Played intrigue: ${playedIntrigueStripCards.map(c => c.name).join(', ')}`,
                      hasActiveIntrigueThisRound &&
                        `Active intrigue: ${activeIntrigueThisRound.map(c => c.name).join(', ')}`,
                    ]
                      .filter(Boolean)
                      .join('. ')
                  : undefined
              }
            >
              {showRevealPersuasionRemaining ? (
                <RevealPersuasionRemaining
                  amount={activePlayer.persuasion}
                  className="reveal-persuasion-remaining-chip--play-area"
                />
              ) : null}
              {showPlayedCardStrip && (
                <div className="selected-cards-reveal-strip">
                  {playedAreaCards.map(card => renderTurnCard(card, 'played', effectCards))}
                  {playedIntrigueStripCards.map(card => {
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
                  {hasActiveIntrigueThisRound && (
                    <div
                      className="active-intrigue-in-play-area"
                      role="group"
                      aria-label="Active intrigue this round"
                    >
                      {(playedAreaCards.length > 0 ||
                        playedIntrigueStripCards.length > 0 ||
                        revealedAreaCards.length > 0) && (
                        <div className="play-area-card-divider" aria-hidden="true" />
                      )}
                      {activeIntrigueThisRound.map(card => {
                        const intrigueEffectBundle = effectCards.find(
                          e => e.source.type === GainSource.INTRIGUE && e.source.id === card.id
                        )
                        const hasIntriguePendingInput = effectCardHasPendingInput(intrigueEffectBundle)
                        return (
                          <button
                            key={`active-intrigue-${card.id}`}
                            type="button"
                            className={[
                              'turn-card-frame',
                              'turn-card-frame--intrigue',
                              'turn-card-frame--active-intrigue',
                              hasIntriguePendingInput ? 'turn-card-frame--has-effects' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-label={
                              hasIntriguePendingInput
                                ? `Resolve pending effects for active intrigue: ${card.name}`
                                : `Active intrigue: ${card.name}`
                            }
                            title={
                              hasIntriguePendingInput
                                ? `Resolve pending effects for ${card.name}`
                                : `${card.name} (active this round)`
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
                    </div>
                  )}
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
                {techControlsRow}
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
        text={
          isRevealTurn
            ? 'Select Cards to Reveal'
            : graftPairSelection
              ? 'Select a card to play (graft cards need a partner)'
              : 'Select a Card to Play'
        }
        getCardPlayability={isRevealTurn ? undefined : checkPlayCardPlayability}
        playabilityInvalidateKey={isRevealTurn ? undefined : playCardPickerPlayabilityKey}
        graftPairSelection={graftPairSelection}
        initialSelectedCards={pendingGraftInitialCards}
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
          <div className="dialog-overlay rapid-mobilization-overlay">
            <div
              className="rapid-mobilization-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rapid-mobilization-title"
            >
              {(() => {
                const playedIds = gameState.currTurn?.playedIntrigueCard?.map(entry => entry.cardId) ?? []
                const lastPlayedId = playedIds[playedIds.length - 1]
                const intriguePiles = [...(gameState.intrigueDeck ?? []), ...(gameState.intrigueDiscard ?? [])]
                const intrigueCard =
                  lastPlayedId != null
                    ? intriguePiles.find(card => card.id === lastPlayedId)
                    : undefined
                const garrisonTroops = activePlayer.troops
                const stepDown = () => setMobilizeCount(count => Math.max(0, count - 1))
                const stepUp = () =>
                  setMobilizeCount(count => Math.min(garrisonTroops, count + 1))

                return (
                  <>
                    <div className="rapid-mobilization-dialog__hero">
                      {intrigueCard?.image ? (
                        <img
                          src={intrigueCard.image}
                          alt=""
                          className="rapid-mobilization-dialog__card"
                          draggable={false}
                        />
                      ) : (
                        <div className="rapid-mobilization-dialog__card rapid-mobilization-dialog__card--fallback">
                          Rapid Mobilization
                        </div>
                      )}
                      <div className="rapid-mobilization-dialog__intro">
                        <h3 id="rapid-mobilization-title">Rapid Mobilization</h3>
                        <p>Deploy troops from your garrison into the Conflict.</p>
                        <div className="rapid-mobilization-dialog__garrison">
                          <img src="/icon/troop.png" alt="" aria-hidden="true" />
                          <span>
                            {garrisonTroops} in garrison
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rapid-mobilization-dialog__stepper" aria-label="Troops to deploy">
                      <button
                        type="button"
                        className="rapid-mobilization-stepper__btn"
                        onClick={stepDown}
                        disabled={mobilizeCount <= 0}
                        aria-label="Deploy one fewer troop"
                      >
                        −
                      </button>
                      <div className="rapid-mobilization-stepper__value" aria-live="polite">
                        <img src="/icon/troop.png" alt="" aria-hidden="true" />
                        <span>{mobilizeCount}</span>
                      </div>
                      <button
                        type="button"
                        className="rapid-mobilization-stepper__btn"
                        onClick={stepUp}
                        disabled={mobilizeCount >= garrisonTroops}
                        aria-label="Deploy one more troop"
                      >
                        +
                      </button>
                    </div>

                    <div className="rapid-mobilization-dialog__actions">
                      <button
                        type="button"
                        className="primary-btn rapid-mobilization-dialog__confirm"
                        onClick={() => {
                          onMobilizeGarrison(activePlayer.id, mobilizeCount)
                          setMobilizeCount(0)
                        }}
                      >
                        {mobilizeCount === 0 ? 'Deploy none' : `Deploy ${mobilizeCount}`}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

      {activePlayer && (
        <LeaderImageModal
          leader={activePlayer.leader}
          isOpen={isLeaderImageOpen}
          onClose={() => setIsLeaderImageOpen(false)}
        />
      )}
    </>
  )
}

export default TurnControls 