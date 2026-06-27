import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './styles/playBoardModal.css'
import { PlayBoardModalProvider } from './context/PlayBoardModalContext'
import GameBoard from './components/GameBoard'
import ImageBoard from './components/ImageBoard/ImageBoard'
import ImperiumRow from './components/ImperiumRow/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './components/GameContext/GameContext'
import { useGame } from './components/GameContext/GameContext'
import { useTimeTravel } from './components/TimeTravel'
import GameSetup from './components/GameSetup'
import LeaderSetupChoices from './components/LeaderSetupChoices/LeaderSetupChoices'
import { PlayerSetup, Leader, FactionType, GamePhase, ScreenState, Player, GameState, Card, AgentIcon, CustomEffect, ChoiceType, FixedOptionsChoice, GainSource, PendingReward, TurnType } from './types/GameTypes'
import { mergeDispatchEnvoyIcons } from './utils/dispatchEnvoy'
import { isKwisatzHaderachCard, canPlaceAgentOnBoard, isKwisatzSourceChoicePending, isKwisatzRecallMode, isAgentPlacementPending } from './utils/kwisatzHaderach'
import TurnControls from './components/TurnControls/TurnControls'
import PlayFooterToolbar from './components/PlayFooterToolbar/PlayFooterToolbar'
import RetreatTroopControls from './components/RetreatTroopControls/RetreatTroopControls'
import { getEffectRetreatRemaining } from './utils/turnGainsDisplay'
import { getRemainingDeploySlots } from './utils/dreadnoughtLifecycle'
import { getRemainingTroopDeploySlots } from './utils/troops'
import CombatResults from './components/CombatResults/CombatResults'
import CombatPhaseOverlay from './components/CombatPhaseOverlay/CombatPhaseOverlay'
import EndgameOverlay from './components/EndgameOverlay/EndgameOverlay'
import { endgameRevealIncomplete } from './utils/endgameResolution'
import { mergeEndgameHistoryRow } from './utils/endgameHistoryDisplay'
import { isCombatHistoryEntry, isEndgameHistoryEntry } from './utils/turnGainsDisplay'
import { COMBAT_STRENGTH_ORIGIN } from './data/boardMarkerAnchors'
import { getConflictPool } from './data/conflicts'
import ConflictSelect from './components/ConflictSelect/ConflictSelect'
import GameStateSetup from './components/GameStateSetup/GameStateSetup'
import ImperiumRowSelect from './components/ImperiumRowSelect/ImperiumRowSelect'
import TechMarketRow from './components/TechMarketRow/TechMarketRow'
import TechAcquireModal from './components/TechAcquireModal/TechAcquireModal'
import TechTileSelect from './components/TechTileSelect/TechTileSelect'
import { TECH_TILES, getTechTile, type TechTileId } from './data/techTiles'
import { effectiveTechCost } from './utils/techTiles'
import {
  isSandboxIxBoardReady,
  playerTechTileIds,
  sandboxBlockedTechIdsForPlayer,
  sandboxStackTopsFromIxBoard,
  sandboxTechSetupSummary,
} from './utils/sandboxTechTiles'
import { getTechAcquireOffer } from './components/GameContext/riseOfIx/techAcquireOffer'
import CardCreator from './components/CardCreator/CardCreator'
import SandboxPlayerEditor from './components/SandboxPlayerEditor/SandboxPlayerEditor'
import SandboxSetupControls from './components/SandboxSetupControls/SandboxSetupControls'
import { buildImperiumDeck } from './catalog/runtime'
import { applyStarterDeckReservationToImperium } from './services/starterDeckSetup'
import { getStartingSpice, getStartingSolari } from './data/leaderAbilities/beastSetup'
import { getStartingWater } from './data/leaderAbilities/yunaSolariBonus'
import { applyHudroStartingIntrigue } from './data/leaderAbilities/hudroIntriguePeek'
import { seedTessiaSnoopers } from './data/leaderAbilities/tessiaSnoopers'
import PlayerOverviewModal from './components/PlayerOverviewModal/PlayerOverviewModal'
import MasterstrokeFactionModal from './components/MasterstrokeFactionModal/MasterstrokeFactionModal'
import UndoConfirmDialog from './components/TimeTravel/UndoConfirmDialog'
import { getLeaderIconPath, LEADER_NAMES } from './data/leaders'
import { getEndTurnButtonState } from './utils/endTurnState'
import { buildSetupBlockFromConfiguration } from './save/buildSetupBlock'
import { createGameInputDoc } from './save/createGameInput'
import type { SaveDoc } from './save/types'
import { GAME_PACK_STORAGE_KEY } from './gamePacks/constants'
import { resolveStoredGamePackId } from './gamePacks/inferGamePack'
import { expansionsForGamePack } from './gamePacks/resolveGamePack'
import {
  getInfluenceBoardChoiceMeta,
  getInfluenceBoardPrompt,
  isInfluenceBoardChoice,
} from './utils/influenceBoardChoice'
import {
  DESKTOP_PLAY_LAYOUT_MQ,
  DOCKED_HISTORY_LAYOUT_MQ,
} from './constants/playLayout'
import {
  countPlayerTurns,
  formatTurnRoundHeader,
  getDisplayRound,
  getHistoryRowLabel,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
} from './utils/turnHistoryDisplay'

interface GameContentProps {
  autoApplyMandatoryRewards: boolean
  onLoadSave?: (doc: SaveDoc) => void
}

const GameContent = ({ autoApplyMandatoryRewards, onLoadSave }: GameContentProps) => {
  const {
    gameState,
    dispatch,
  } = useGame()

  const {
    isViewingHistory,
    displayState,
    viewingTurnIndex,
    goToTurn,
    returnToCurrent,
  } = useTimeTravel()

  const [undoTargetIndex, setUndoTargetIndex] = useState<number | null>(null)
  const [undoSourceRowIndex, setUndoSourceRowIndex] = useState<number | null>(null)
  const [undoToSetup, setUndoToSetup] = useState(false)

  const [useImageBoard] = useState(true)
  const [isTurnHistoryOpen, setIsTurnHistoryOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
  )
  const [isPlayChromeHeld, setIsPlayChromeHeld] = useState(false)
  const playChromeHeldRef = useRef(false)
  const [isMobilePlayView, setIsMobilePlayView] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches
  )
  const [isDockedHistoryLayout, setIsDockedHistoryLayout] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
  )
  const [isDesktopPlayView, setIsDesktopPlayView] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ).matches
  )
  const [isPlayerOverviewOpen, setIsPlayerOverviewOpen] = useState(false)
  const [showSelectiveBreeding, setShowSelectiveBreeding] = useState(false)
  const [onSelectiveBreedingSelect, setOnSelectiveBreedingSelect] = useState<((card: Card) => void) | null>(null)
  const [voiceSelectionRewardId, setVoiceSelectionRewardId] = useState<string | null>(null)
  const [masterstrokeSelectionRewardId, setMasterstrokeSelectionRewardId] = useState<string | null>(null)
  const [memnonHighCouncilRewardId, setMemnonHighCouncilRewardId] = useState<string | null>(null)
  const [sandboxImperiumOpen, setSandboxImperiumOpen] = useState(false)
  const [sandboxTechOpen, setSandboxTechOpen] = useState(false)
  const [sandboxConflictOpen, setSandboxConflictOpen] = useState(false)
  const [sandboxEditPlayerId, setSandboxEditPlayerId] = useState<number | null>(null)
  const [techAcquireStackIndex, setTechAcquireStackIndex] = useState<number | null>(null)

  useEffect(() => {
    setVoiceSelectionRewardId(null)
    setMasterstrokeSelectionRewardId(null)
    setMemnonHighCouncilRewardId(null)
  }, [gameState.activePlayerId])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    const apply = () => {
      setIsMobilePlayView(mq.matches)
      if (!mq.matches) {
        playChromeHeldRef.current = false
        setIsPlayChromeHeld(false)
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const dockedMq = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ)
    const desktopMq = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ)
    const apply = () => {
      const docked = dockedMq.matches
      const desktop = desktopMq.matches
      setIsDockedHistoryLayout(docked)
      setIsDesktopPlayView(desktop)
      if (docked) {
        setIsTurnHistoryOpen(true)
      }
    }
    apply()
    dockedMq.addEventListener('change', apply)
    desktopMq.addEventListener('change', apply)
    return () => {
      dockedMq.removeEventListener('change', apply)
      desktopMq.removeEventListener('change', apply)
    }
  }, [])

  const setPlayChromeHeld = useCallback((held: boolean) => {
    if (playChromeHeldRef.current === held) return
    playChromeHeldRef.current = held
    setIsPlayChromeHeld(held)
  }, [])

  // Clear voice and masterstroke selection when returning from history
  useEffect(() => {
    if (!isViewingHistory) return
    setVoiceSelectionRewardId(null)
    setMasterstrokeSelectionRewardId(null)
    setMemnonHighCouncilRewardId(null)
  }, [isViewingHistory])

  // Masterstroke modal is UI-only state; retreat can remove the pending reward from game state — close the modal when that happens
  useEffect(() => {
    if (!masterstrokeSelectionRewardId) return
    const stillPending = gameState.pendingRewards.some(
      (r) => r.id === masterstrokeSelectionRewardId
    )
    if (!stillPending) setMasterstrokeSelectionRewardId(null)
  }, [gameState.pendingRewards, masterstrokeSelectionRewardId])

  // Keep actions on live state, but let the footer inspect history snapshots read-only.
  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId) || null
  const turnControlsState = isViewingHistory ? displayState : gameState
  const turnControlsActivePlayer =
    turnControlsState.players.find(p => {
      const turnPlayerId = turnControlsState.currTurn?.playerId
      return p.id === (turnPlayerId ?? turnControlsState.activePlayerId)
    }) || null
  const historyHighlightSpaceId =
    isViewingHistory &&
    displayState.currTurn?.type === TurnType.ACTION &&
    displayState.currTurn.agentSpaceId != null
      ? displayState.currTurn.agentSpaceId
      : null

  const liveTurnPlayer =
    gameState.players.find(p => {
      const id = gameState.currTurn?.playerId ?? gameState.activePlayerId
      return p.id === id
    }) ?? activePlayer
  const liveLeaderIconPath = liveTurnPlayer ? getLeaderIconPath(liveTurnPlayer.leader.name) : undefined

  const undoSourceRow = viewingTurnIndex ?? gameState.history.length
  const canUndo =
    !gameState.sandboxSetup &&
    (undoSourceRow === 0
      ? Boolean(gameState.setupBaseline)
      : undoSourceRow > 0)

  const handleNavUndoClick = () => {
    setUndoSourceRowIndex(undoSourceRow)
    if (undoSourceRow === 0) {
      setUndoToSetup(true)
      setUndoTargetIndex(null)
      return
    }
    setUndoToSetup(false)
    setUndoTargetIndex(undoSourceRow - 1)
  }

  const clearUndoState = () => {
    setUndoTargetIndex(null)
    setUndoSourceRowIndex(null)
    setUndoToSetup(false)
  }

  const handleUndoConfirm = () => {
    if (undoToSetup) {
      dispatch({ type: 'UNDO_TO_SETUP' })
    } else if (undoTargetIndex !== null) {
      dispatch({ type: 'UNDO_TO_TURN', turnIndex: undoTargetIndex })
    }
    clearUndoState()
    returnToCurrent()
  }

  const getUndoTargetState = (): GameState | null => {
    if (undoToSetup) {
      return gameState.setupBaseline ?? null
    }
    if (undoTargetIndex === null) return null
    if (undoTargetIndex >= 0 && undoTargetIndex < gameState.history.length) {
      return gameState.history[undoTargetIndex]
    }
    return null
  }

  const undoFromLabel =
    undoSourceRow === 0
      ? 'setup'
      : getHistoryRowLabel(gameState.history, undoSourceRow).toLowerCase()
  const isSandboxGame = Boolean(gameState.setupBaseline?.sandboxSetup)
  const undoTitle =
    undoSourceRow === 0
      ? isSandboxGame
        ? 'Edit setup (keep current configuration)'
        : 'Undo setup (re-select imperium row and conflict)'
      : `Undo ${getHistoryRowLabel(gameState.history, undoSourceRow)} and all later turns`
  const undoAriaLabel =
    undoSourceRow === 0
      ? isSandboxGame
        ? 'Edit setup'
        : 'Undo setup'
      : `Undo ${undoFromLabel} and all later turns`

  const turnHistoryUndoProps = {
    onUndo: handleNavUndoClick,
    canUndo,
    undoTitle,
    undoAriaLabel,
    onOpenPlayerOverview: isDesktopPlayView ? () => setIsPlayerOverviewOpen(true) : undefined,
  }

  const handleCardSelect = (playerId: number, cardId: number, deckIndex?: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId, deckIndex })
  }

  const handlePlayIntrigue = (playerId: number, cardId: number, targetPlayerId?: number) => {
    dispatch({ type: 'PLAY_INTRIGUE', playerId, cardId, targetPlayerId })
  }

  const handleMobilizeGarrison = (playerId: number, count: number) => {
    dispatch({ type: 'MOBILIZE_GARRISON', playerId, count })
  }
  
  const handleConflictSelect = (conflictId: number) => {
    dispatch({ type: 'SELECT_CONFLICT', conflictId })
  }

  const handlePlayCombatIntrigue = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_COMBAT_INTRIGUE', playerId, cardId })
  }

  const handleRevealEndgameIntrigue = (playerId: number, cardIds: number[]) => {
    dispatch({ type: 'REVEAL_ENDGAME_INTRIGUE', playerId, cardIds })
  }

  const handlePlaceAgent = (spaceId: number, extraData?: { trashedCardId: number } | { spiceCost: number; solariReward: number }) => {
    if (!activePlayer) return;
    dispatch({
      type: 'PLACE_AGENT',
      playerId: activePlayer.id,
      spaceId,
      ...(extraData && 'trashedCardId' in extraData ? { selectiveBreedingData: extraData } : {}),
      ...(extraData && 'spiceCost' in extraData ? { sellMelangeData: extraData } : {}),
    });
  }

  const handleRevealCards = (playerId: number, cardIds: number[]) => {
    dispatch({ type: 'REVEAL_CARDS', playerId, cardIds })
  }

  const handleEndTurn = (playerId: number) => {
    dispatch({ type: 'END_TURN', playerId })
    if(!gameState.players.find(p => !p.revealed)) {
      dispatch({ type: 'START_COMBAT_PHASE' })
    }
  }

  const handlePassCombat = (playerId: number) => {
    dispatch({ type: 'PASS_COMBAT', playerId })
  }
  const handleConfirmCombat = () => {
    dispatch({ type: 'RESOLVE_COMBAT' });
  }

  const handleAddTroop = (playerId: number) => {
    dispatch({ type: 'DEPLOY_TROOP', playerId })
  }

  const handleResolveChoice = (choiceId: string, optionIndex: number, source?: { type: string; id: number; name: string }) => {
    if(!activePlayer) return;
    dispatch({ type:'RESOLVE_CHOICE', playerId: activePlayer.id, choiceId, optionIndex, source })
  }

  const handleResolveCardSelect = (choiceId: string, cardIds: number[]) => {
    if(!activePlayer) return;
    dispatch({ type: 'RESOLVE_CARD_SELECT', playerId: activePlayer.id, choiceId, cardIds })
  }

  const handlePayCost = (effectId: string, data?: { trashedCardId?: number }) => {
    if(!activePlayer) return;
    dispatch({ type: 'PAY_COST', playerId: activePlayer.id, effectId, data })
  }

  const handleUndeployTroop = (playerId: number) => {
    dispatch({ type: 'UNDEPLOY_TROOP', playerId })
  }

  const handleAddDreadnought = (playerId: number) => {
    dispatch({ type: 'DEPLOY_DREADNOUGHT', playerId })
  }

  const handleUndeployDreadnought = (playerId: number) => {
    dispatch({ type: 'UNDEPLOY_DREADNOUGHT', playerId })
  }

  const handleDeployNegotiator = (playerId: number) => {
    dispatch({ type: 'DEPLOY_NEGOTIATOR', playerId })
  }

  const handleUndeployNegotiator = (playerId: number) => {
    dispatch({ type: 'UNDEPLOY_NEGOTIATOR', playerId })
  }

  const handleEffectRetreatTroop = (playerId: number) => {
    dispatch({ type: 'RETREAT_TROOP', playerId, fromEffect: true })
  }

  const handleAcquireCard = (cardId: number, acquireToTop?: boolean) => {
    dispatch({ type: 'ACQUIRE_CARD', playerId: activePlayer?.id || 0, cardId, acquireToTop })
  }

  const handleAcquireArrakisLiaison = (acquireToTop?: boolean) => {
    dispatch({ type: 'ACQUIRE_AL', playerId: activePlayer?.id || 0, acquireToTop })
  }

  const handleAcquireSpiceMustFlow = (acquireToTop?: boolean) => {
    dispatch({ type: 'ACQUIRE_SMF', playerId: activePlayer?.id || 0, acquireToTop })
  }

  const handleActivateTech = useCallback(
    (playerId: number, tileId: TechTileId) => {
      dispatch({ type: 'ACTIVATE_TECH', playerId, tileId })
    },
    [dispatch]
  )

  const handleAcquireTechTile = useCallback(
    (stackIndex: number, negotiatorsReturned: number, nextFaceUpTileId?: TechTileId) => {
      const player = activePlayer
      if (!player) return

      const offer = getTechAcquireOffer(gameState, player.id)
      if (!offer) return

      const tileId = gameState.ixBoard?.stacks[stackIndex]?.[0]
      if (!tileId) return
      const tile = getTechTile(tileId)
      if (!tile) return

      if (negotiatorsReturned < 0 || negotiatorsReturned > (player.negotiatorsOnIx ?? 0)) return
      const cost = effectiveTechCost(tile.cost, offer.discount, negotiatorsReturned)
      const canAfford = offer.paySolariInsteadOfSpice
        ? player.solari >= cost
        : player.spice >= cost
      if (!canAfford) return

      if (offer.pendingOptionalEffectId) {
        dispatch({
          type: 'PAY_COST',
          playerId: player.id,
          effectId: offer.pendingOptionalEffectId,
        })
      } else if (offer.pendingChoice) {
        dispatch({
          type: 'RESOLVE_CHOICE',
          playerId: player.id,
          choiceId: offer.pendingChoice.choiceId,
          optionIndex: offer.pendingChoice.optionIndex,
          source: offer.pendingChoice.source,
        })
      }

      dispatch({
        type: 'ACQUIRE_TECH',
        playerId: player.id,
        tileId,
        stackIndex,
        negotiatorsReturned,
        discount: 0,
        nextFaceUpTileId,
      })
      setTechAcquireStackIndex(null)
    },
    [activePlayer, dispatch, gameState]
  )

  const techAcquireOffer = useMemo(() => {
    if (isViewingHistory || gameState.sandboxSetup || !activePlayer) return null
    return getTechAcquireOffer(gameState, activePlayer.id)
  }, [isViewingHistory, gameState, gameState.sandboxSetup, activePlayer])

  useEffect(() => {
    if (isViewingHistory) {
      setTechAcquireStackIndex(null)
    }
  }, [isViewingHistory])

  const handleTechTileAcquireClick = useCallback((stackIndex: number) => {
    setTechAcquireStackIndex(stackIndex)
  }, [])

  const handleImperiumRowSetup = (cardIds: number[]) => {
    dispatch({ type: 'RESET_IMPERIUM_ROW', cardIds })
  }

  const handleImperiumRowReplacement = (cardIds: number[]) => {
    if (cardIds.length === 1) {
      dispatch({ type: 'SELECT_IMPERIUM_REPLACEMENT', cardId: cardIds[0] })
    }
  }

  const handleSelectiveBreedingRequested = (_cards: Card[], onSelect: (card: Card) => void) => {
    setOnSelectiveBreedingSelect(() => onSelect)
    setShowSelectiveBreeding(true)
  }

  const handleClaimReward = (rewardId: string, customData?: { [key: string]: unknown }) => {
    if (!activePlayer) return
    const hasVoiceSpace = Boolean(customData && typeof (customData as Record<string, unknown>).spaceId === 'number')
    const hasMasterstrokeFactions = Boolean(customData && Array.isArray((customData as Record<string, unknown>).factions))
    if (voiceSelectionRewardId && rewardId !== voiceSelectionRewardId && !hasVoiceSpace) {
      return
    }
    if (masterstrokeSelectionRewardId && rewardId !== masterstrokeSelectionRewardId && !hasMasterstrokeFactions) {
      return
    }
    if (memnonHighCouncilRewardId && rewardId !== memnonHighCouncilRewardId && !hasMasterstrokeFactions) {
      return
    }
    dispatch({ type: 'CLAIM_REWARD', playerId: activePlayer.id, rewardId, customData })
  }

  const handleClaimAllRewards = () => {
    if (
      !activePlayer ||
      voiceSelectionRewardId ||
      masterstrokeSelectionRewardId ||
      memnonHighCouncilRewardId ||
      influenceBoardSelectionActive
    ) {
      return
    }
    dispatch({ type: 'CLAIM_ALL_REWARDS', playerId: activePlayer.id })
  }

  const handleVoiceSelectionStart = (rewardId: string) => {
    setVoiceSelectionRewardId(rewardId)
  }

  const handleVoiceSpaceSelect = (spaceId: number) => {
    if (!activePlayer || !voiceSelectionRewardId) return
    handleClaimReward(voiceSelectionRewardId, { spaceId })
    setVoiceSelectionRewardId(null)
  }

  const handleMasterstrokeSelectionStart = (rewardId: string) => {
    setMasterstrokeSelectionRewardId(rewardId)
  }

  const handleMasterstrokeFactionConfirm = (factions: FactionType[]) => {
    if (!activePlayer || !masterstrokeSelectionRewardId) return
    handleClaimReward(masterstrokeSelectionRewardId, { factions })
    setMasterstrokeSelectionRewardId(null)
  }

  const handleMasterstrokeSelectionCancel = () => setMasterstrokeSelectionRewardId(null)

  const handleMemnonHighCouncilSelectionStart = (rewardId: string) => {
    setMemnonHighCouncilRewardId(rewardId)
  }

  const handleMemnonHighCouncilFactionConfirm = (factions: FactionType[]) => {
    if (!activePlayer || !memnonHighCouncilRewardId) return
    handleClaimReward(memnonHighCouncilRewardId, { factions })
    setMemnonHighCouncilRewardId(null)
  }

  const handleMemnonHighCouncilCancel = () => setMemnonHighCouncilRewardId(null)

  const handleOpponentDiscardChoice = (opponentId: number, choice: 'discard' | 'loseTroop') => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_DISCARD_CHOICE', playerId: activePlayer.id, opponentId, choice })
  }

  const handleOpponentDiscardCard = (opponentId: number, cardId: number) => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_DISCARD_CARD', playerId: activePlayer.id, opponentId, cardId })
  }

  const handleOpponentDiscardCards = (opponentId: number, cardIds: number[]) => {
    if (!activePlayer || cardIds.length === 0) return
    dispatch({ type: 'OPPONENT_DISCARD_CARDS', playerId: activePlayer.id, opponentId, cardIds })
  }

  const handleOpponentNoCardAck = (opponentId: number) => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_NO_CARD_ACK', playerId: activePlayer.id, opponentId })
  }

  const getAutoApplicableRewards = (state: GameState): PendingReward[] => {
    // Interactive custom effects that require user input
    const interactiveEffects = [
      CustomEffect.THE_VOICE,
      CustomEffect.REVEREND_MOTHER_MOHIAM,
      CustomEffect.TEST_OF_HUMANITY
    ]
    const trashThisCardSourceKeys = new Set(
      state.pendingRewards
        .filter(reward => !reward.disabled && reward.source.type === GainSource.CARD && reward.reward.trashThisCard)
        .map(reward => `${reward.source.type}:${reward.source.id}`)
    )
    // Filter rewards to only include non-interactive ones
    return state.pendingRewards.filter(reward => {
      // Skip disabled rewards
      if (reward.disabled) return false

      // Skip trash rewards (require user selection)
      if (reward.isTrash) return false

      // Power Play (+1 bonus) and trash-this-card stay manual on the card after board +1 auto-applies.
      if (reward.reward.custom === CustomEffect.POWER_PLAY) return false

      // If a card can trash itself, the player must choose the resolution order.
      if (trashThisCardSourceKeys.has(`${reward.source.type}:${reward.source.id}`)) return false

      // Skip rewards with interactive custom effects
      if (reward.reward.custom && interactiveEffects.includes(reward.reward.custom)) {
        return false
      }

      // Skip Masterstroke (requires faction selection when claimed)
      if (reward.source.type === GainSource.MASTERSTROKE) return false

      // Skip rewards that are part of OR choices (pending choices)
      const isPartOfChoice = state.currTurn?.pendingChoices?.some(choice =>
        choice.type === ChoiceType.FIXED_OPTIONS &&
        (choice as FixedOptionsChoice).options.some(opt => {
          const optSource = (opt as unknown as { source?: { id: number; type: string } }).source
          return optSource?.id === reward.source.id && optSource?.type === reward.source.type
        })
      )
      if (isPartOfChoice) return false
      
      return true
    })
  }

  const handleAutoApplyRewards = () => {
    if (getAutoApplicableRewards(gameState).length === 0) return
    handleClaimAllRewards()
  }

  const autoAppliedBatchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!autoApplyMandatoryRewards || !activePlayer || isViewingHistory) return
    if (
      voiceSelectionRewardId ||
      masterstrokeSelectionRewardId ||
      memnonHighCouncilRewardId ||
      influenceBoardSelectionActive
    ) {
      return
    }

    const applicable = getAutoApplicableRewards(gameState)
    if (applicable.length === 0) {
      autoAppliedBatchRef.current = null
      return
    }

    const batchKey = applicable
      .map(r => r.id)
      .sort()
      .join('|')
    if (autoAppliedBatchRef.current === batchKey) return
    autoAppliedBatchRef.current = batchKey

    dispatch({ type: 'CLAIM_ALL_REWARDS', playerId: activePlayer.id })
  }, [
    autoApplyMandatoryRewards,
    activePlayer?.id,
    isViewingHistory,
    gameState.pendingRewards,
    gameState.currTurn?.pendingChoices,
    voiceSelectionRewardId,
    masterstrokeSelectionRewardId,
    memnonHighCouncilRewardId,
    dispatch,
  ])

  // Sandbox setup turn: blocking round-start modals are replaced by on-board click targets.
  const inSandboxSetup = Boolean(gameState.sandboxSetup) && !isViewingHistory
  const riseOfIx = Boolean(gameState.expansions?.riseOfIx)
  const sandboxTechSummary = sandboxTechSetupSummary(gameState.players)
  const ixBoardReady =
    !riseOfIx || isSandboxIxBoardReady(gameState.players, gameState.ixBoard)
  const sandboxReady =
    gameState.imperiumRow.length === 5 &&
    gameState.currentConflict.id > 0 &&
    ixBoardReady
  const sandboxEditPlayer =
    inSandboxSetup && sandboxEditPlayerId !== null
      ? gameState.players.find(p => p.id === sandboxEditPlayerId) ?? null
      : null

  const imperiumSelectionCount = Math.min(Math.max(0, 5 - gameState.imperiumRow.length), gameState.imperiumRowDeck.length)
  const needsImperiumSelection =
    gameState.phase === GamePhase.ROUND_START && imperiumSelectionCount > 0 && !gameState.sandboxSetup
  const needsReplacementSelection = gameState.pendingImperiumRowReplacement !== null && gameState.imperiumRowDeck.length > 0
  const hidePlayShellFooter = needsImperiumSelection || needsReplacementSelection

  const gameContainerRef = useRef<HTMLDivElement>(null)
  const playShellMainRef = useRef<HTMLDivElement>(null)
  const playShellBoardRowRef = useRef<HTMLDivElement>(null)
  const imperiumRowRef = useRef<HTMLDivElement>(null)
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const turnControlsFooterRef = useRef<HTMLDivElement>(null)
  const historyBannerRef = useRef<HTMLDivElement>(null)
  /** Lock board size per viewport until window resize (play-area content must not rescale the board). */
  const lockedBoardLayoutRef = useRef<{ viewportKey: string; boardEdgePx: number } | null>(null)
  const lockedBannerHeightForBoardRef = useRef(0)
  const lockedPlayBandHeightForBoardRef = useRef(0)
  const remeasureBoardLayoutRef = useRef<((force?: boolean) => void) | null>(null)
  const remeasurePlayChromeRef = useRef<(() => void) | null>(null)

  const MIN_PLAY_BAND_PX = 88

  const viewingCombatHistory =
    isViewingHistory && isCombatHistoryEntry(displayState)
  const viewingEndgameHistory =
    isViewingHistory && isEndgameHistoryEntry(displayState)

  const showCombatOverlay =
    (gameState.phase === GamePhase.COMBAT && !isViewingHistory) || viewingCombatHistory
  const showEndgameOverlay =
    (gameState.phase === GamePhase.END_GAME && !isViewingHistory) || viewingEndgameHistory

  const combatOverlayState = viewingCombatHistory ? displayState : gameState
  const endgameOverlayState = useMemo(() => {
    if (viewingEndgameHistory && viewingTurnIndex != null) {
      return mergeEndgameHistoryRow(
        displayState,
        gameState,
        viewingTurnIndex === gameState.history.length - 1
      )
    }
    return gameState
  }, [viewingEndgameHistory, viewingTurnIndex, displayState, gameState])

  const endgameNeedsRevealInput =
    gameState.phase === GamePhase.END_GAME &&
    !gameState.endgameWinners &&
    endgameRevealIncomplete(gameState)

  const endgameNeedsPlayerInput =
    gameState.phase === GamePhase.END_GAME &&
    !gameState.endgameWinners &&
    !endgameNeedsRevealInput &&
    ((gameState.currTurn?.pendingChoices?.length ?? 0) > 0 ||
      (gameState.endgameApplyQueue?.length ?? 0) > 0 ||
      gameState.pendingRewards.some(r => !r.disabled))

  const showTurnControlsFooter =
    !isViewingHistory &&
    (gameState.sandboxSetup ||
      gameState.phase === GamePhase.PLAYER_TURNS ||
      gameState.phase === GamePhase.COMBAT ||
      endgameNeedsPlayerInput)

  const activeInfluenceBoardChoice = useMemo(() => {
    if (isViewingHistory || gameState.sandboxSetup || !useImageBoard) return null
    const choice = gameState.currTurn?.pendingChoices?.find(
      pending =>
        pending.type === ChoiceType.FIXED_OPTIONS &&
        isInfluenceBoardChoice(pending as FixedOptionsChoice)
    )
    return (choice as FixedOptionsChoice | undefined) ?? null
  }, [gameState.currTurn?.pendingChoices, gameState.sandboxSetup, isViewingHistory, useImageBoard])

  const influenceBoardMeta =
    activeInfluenceBoardChoice && activePlayer
      ? getInfluenceBoardChoiceMeta(
          activeInfluenceBoardChoice,
          gameState,
          activePlayer.id
        )
      : null

  const influenceBoardSelectionActive = Boolean(activeInfluenceBoardChoice && influenceBoardMeta)

  const influenceBoardPrompt = influenceBoardMeta
    ? getInfluenceBoardPrompt(influenceBoardMeta.mode, influenceBoardMeta.amount)
    : null

  const kwisatzRecallActive =
    !isViewingHistory && isKwisatzRecallMode(gameState)
  const kwisatzSourceChoiceActive =
    !isViewingHistory && isKwisatzSourceChoicePending(gameState)
  const agentPlacementPending =
    !isViewingHistory && isAgentPlacementPending(gameState)

  const boardPlacementPrompt = kwisatzSourceChoiceActive
    ? 'Kwisatz Haderach: choose whether to use an Agent from your supply or recall one from the board.'
    : kwisatzRecallActive
      ? 'Recall one of your Agents — click a space where you already have an Agent.'
      : null

  const handleInfluenceBoardFactionSelect = (faction: FactionType) => {
    if (!activePlayer || !activeInfluenceBoardChoice || !influenceBoardMeta) return
    const optionIndex = influenceBoardMeta.optionIndexByFaction[faction]
    if (optionIndex == null) return
    dispatch({
      type: 'RESOLVE_CHOICE',
      playerId: activePlayer.id,
      choiceId: activeInfluenceBoardChoice.id,
      optionIndex,
      source: activeInfluenceBoardChoice.source,
    })
  }

  const endTurnButtonState = getEndTurnButtonState({
    isHistoryView: isViewingHistory,
    canEndTurn: gameState.canEndTurn,
    pendingRewards: gameState.pendingRewards,
    opponentDiscardState: gameState.currTurn?.opponentDiscardState,
    pendingChoices: gameState.currTurn?.pendingChoices || [],
    voiceSelectionActive: Boolean(voiceSelectionRewardId),
    masterstrokeSelectionActive: Boolean(masterstrokeSelectionRewardId),
    memnonHighCouncilSelectionActive: Boolean(memnonHighCouncilRewardId),
    influenceBoardSelectionActive,
    agentPlacementPending,
  })

  const showFooterEndTurn = Boolean(
    !isViewingHistory &&
      !gameState.sandboxSetup &&
      gameState.phase === GamePhase.PLAYER_TURNS &&
      activePlayer
  )

  const showFooterPassCombat = Boolean(
    !isViewingHistory && gameState.phase === GamePhase.COMBAT && activePlayer
  )

  const hasPlayedCombatIntrigueThisVisit =
    activePlayer != null &&
    gameState.currTurn?.playerId === activePlayer.id &&
    (gameState.currTurn?.playedIntrigueCard?.length ?? 0) > 0
  const combatFooterActionLabel = hasPlayedCombatIntrigueThisVisit ? 'Continue' : 'Pass Combat'

  const showPlayFooterToolbar = Boolean(
    !gameState.sandboxSetup &&
      turnControlsActivePlayer &&
      (gameState.phase === GamePhase.PLAYER_TURNS ||
        gameState.phase === GamePhase.COMBAT ||
        endgameNeedsPlayerInput)
  )

  useLayoutEffect(() => {
    const root = gameContainerRef.current
    if (!root) return

    const getViewportLayoutKey = () => {
      const w = window.visualViewport?.width ?? window.innerWidth
      const h = window.visualViewport?.height ?? window.innerHeight
      const docked = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
      const desktop = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ).matches
      return `${Math.round(w)}x${Math.round(h)}:${docked ? (desktop ? 'd' : 'w') : 'm'}`
    }

    const applyBoardMaxEdge = (boardEdgePx: number) => {
      const currentRaw = getComputedStyle(root).getPropertyValue('--play-board-max-edge').trim()
      const current = Number.parseFloat(currentRaw)
      if (Number.isFinite(current) && Math.abs(current - boardEdgePx) < 2) return
      const boardEdgePxStr = `${boardEdgePx}px`
      root.style.setProperty('--play-board-max-edge', boardEdgePxStr)
      document.documentElement.style.setProperty('--play-board-max-edge', boardEdgePxStr)
    }

    const getPlayFooterReservedPx = () => {
      const raw = getComputedStyle(root).getPropertyValue('--play-footer-reserved-height').trim()
      const parsed = Number.parseFloat(raw)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 168
    }

    const readBoardLayoutChrome = () => {
      const desktop = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ).matches
      const banner = historyBannerRef.current
      const measuredNav =
        banner && !banner.hidden ? Math.max(0, Math.ceil(banner.getBoundingClientRect().height)) : 0
      if (!desktop && measuredNav > lockedBannerHeightForBoardRef.current) {
        lockedBannerHeightForBoardRef.current = measuredNav
      }
      const navHeight = desktop ? 0 : lockedBannerHeightForBoardRef.current || measuredNav
      const imperium = imperiumRowRef.current
      const topChrome = imperium
        ? Math.max(0, Math.ceil(imperium.getBoundingClientRect().height))
        : 0
      const viewportH = window.visualViewport?.height ?? window.innerHeight
      const playFooterReserved = getPlayFooterReservedPx()
      // Stable reserve for board math only — never use the flex-expanded turn-controls container
      // (its box grows with leftover viewport and would shrink the board in a feedback loop).
      const playBandCap = Math.floor(viewportH * 0.24)
      const playBandReserve = Math.max(
        MIN_PLAY_BAND_PX,
        Math.min(playFooterReserved, playBandCap)
      )
      const playBandHeight = playBandReserve
      const bottomChrome = navHeight + playBandHeight + 2
      return { navHeight, topChrome, playFooterReserved, bottomChrome, playBandReserve, playBandHeight }
    }

    const measurePlayFooterTop = () => {
      const mainArea = mainAreaRef.current
      const boardAnchor =
        mainArea?.querySelector<HTMLElement>('.image-board__media') ??
        mainArea?.querySelector<HTMLElement>('.game-board') ??
        mainArea

      if (boardAnchor) {
        const boardRect = boardAnchor.getBoundingClientRect()
        const boardBottom = Math.max(0, Math.ceil(boardRect.bottom))
        const boardBottomStr = `${boardBottom}px`
        root.style.setProperty('--play-board-bottom', boardBottomStr)
        document.documentElement.style.setProperty('--play-board-bottom', boardBottomStr)

        const combatDockTop = Math.max(
          0,
          Math.ceil(boardRect.top + boardRect.height * (COMBAT_STRENGTH_ORIGIN.y / 100))
        )
        const combatDockTopStr = `${combatDockTop}px`
        root.style.setProperty('--combat-troop-dock-top', combatDockTopStr)
        document.documentElement.style.setProperty('--combat-troop-dock-top', combatDockTopStr)
      }

      const banner = historyBannerRef.current
      if (banner && !banner.hidden) {
        const bannerRect = banner.getBoundingClientRect()
        const bannerTop = Math.max(0, Math.ceil(bannerRect.top))
        const playBandTop = Math.max(0, Math.ceil(bannerRect.bottom))
        const bannerTopStr = `${bannerTop}px`
        const playBandTopStr = `${playBandTop}px`
        root.style.setProperty('--history-banner-top', bannerTopStr)
        document.documentElement.style.setProperty('--history-banner-top', bannerTopStr)
        root.style.setProperty('--play-footer-top', playBandTopStr)
        document.documentElement.style.setProperty('--play-footer-top', playBandTopStr)
        return
      }

      const tc = turnControlsFooterRef.current
      if (tc && !tc.hidden) {
        const playBandTop = Math.max(0, Math.ceil(tc.getBoundingClientRect().top))
        const playBandTopStr = `${playBandTop}px`
        root.style.setProperty('--play-footer-top', playBandTopStr)
        document.documentElement.style.setProperty('--play-footer-top', playBandTopStr)
      }
    }

    const measurePlayChromeInsets = () => {
      const banner = historyBannerRef.current
      let navHeight = 0
      if (banner && !banner.hidden) {
        navHeight = Math.max(0, Math.ceil(banner.getBoundingClientRect().height))
      }
      const navHeightPx = `${navHeight}px`
      root.style.setProperty('--play-nav-measured-height', navHeightPx)
      document.documentElement.style.setProperty('--play-nav-measured-height', navHeightPx)

      const tc = turnControlsFooterRef.current
      let turnControlsHeight = 0
      if (tc && !tc.hidden) {
        turnControlsHeight = Math.max(0, Math.ceil(tc.getBoundingClientRect().height))
      }
      const turnControlsHeightPx = `${turnControlsHeight}px`
      root.style.setProperty('--turn-controls-measured-height', turnControlsHeightPx)
      document.documentElement.style.setProperty(
        '--turn-controls-measured-height',
        turnControlsHeightPx
      )

      const viewportH = window.visualViewport?.height ?? window.innerHeight
      const gapBottom =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--vv-layout-gap-bottom')
        ) || 0
      const playFooterTopRaw = getComputedStyle(root).getPropertyValue('--play-footer-top').trim()
      const playFooterTop = Number.parseFloat(playFooterTopRaw)
      let footerStackHeight = Number.isFinite(playFooterTop)
        ? Math.max(0, Math.ceil(viewportH - playFooterTop - gapBottom))
        : navHeight + turnControlsHeight
      if (footerStackHeight <= 0) {
        footerStackHeight = getPlayFooterReservedPx()
      }

      const heightPx = `${footerStackHeight}px`
      root.style.setProperty('--footer-measured-height', heightPx)
      document.documentElement.style.setProperty('--footer-measured-height', heightPx)
    }

    const measureFooterStack = () => {
      const { topChrome } = readBoardLayoutChrome()
      const topChromePx = `${topChrome}px`
      root.style.setProperty('--play-top-chrome-height', topChromePx)
      document.documentElement.style.setProperty('--play-top-chrome-height', topChromePx)
      measurePlayChromeInsets()
      return { topChrome }
    }

    const measureBoardColumnWidth = () => {
      const col =
        mainAreaRef.current ?? playShellBoardRowRef.current ?? playShellMainRef.current
      if (!col) return 0
      return Math.max(0, Math.floor(col.getBoundingClientRect().width))
    }

    const computeBoardMaxEdge = () => {
      const docked = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
      const desktop = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ).matches
      const { topChrome, bottomChrome } = readBoardLayoutChrome()
      const viewportW = window.visualViewport?.width ?? window.innerWidth
      const sidebarRaw =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--play-history-sidebar-min-width')
          .trim() ||
        getComputedStyle(document.documentElement)
          .getPropertyValue('--play-history-sidebar-width')
          .trim()
      const sidebarW = Number.parseFloat(sidebarRaw)
      const dockedSidebarW =
        docked && Number.isFinite(sidebarW) && sidebarW > 0 ? Math.ceil(sidebarW) : 0

      let shellWidth = measureBoardColumnWidth()
      if (shellWidth < 80) {
        if (docked) {
          shellWidth = Math.max(160, Math.floor((viewportW - dockedSidebarW) / 2))
        } else {
          shellWidth = Math.max(0, Math.floor(viewportW))
        }
      }

      const viewportH = window.visualViewport?.height ?? window.innerHeight
      const gapBottom =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--vv-layout-gap-bottom')
        ) || 0
      const layoutGap = docked ? 0 : desktop ? 2 : 6
      const boardStackFoot = bottomChrome + layoutGap
      const availableH =
        viewportH - boardStackFoot - topChrome - layoutGap - gapBottom
      const minBoardEdge = docked ? 200 : 160
      return Math.max(minBoardEdge, Math.min(shellWidth, Math.floor(availableH)))
    }

    const measureBoardMaxEdge = (force = false) => {
      const viewportKey = getViewportLayoutKey()
      const locked = lockedBoardLayoutRef.current
      const docked = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches

      // Board edge stays locked per viewport; footer/history absorb leftover space.
      if (!force && locked?.viewportKey === viewportKey && locked.boardEdgePx > 0) {
        applyBoardMaxEdge(locked.boardEdgePx)
        requestAnimationFrame(() => {
          measurePlayFooterTop()
          measurePlayChromeInsets()
        })
        return
      }

      measureFooterStack()
      const boardEdge = computeBoardMaxEdge()

      lockedBoardLayoutRef.current = { viewportKey, boardEdgePx: boardEdge }
      applyBoardMaxEdge(boardEdge)
      requestAnimationFrame(() => {
        measurePlayFooterTop()
        measurePlayChromeInsets()
        if (!docked) return
        const refinedEdge = computeBoardMaxEdge()
        if (Math.abs(refinedEdge - boardEdge) > 2) {
          lockedBoardLayoutRef.current = { viewportKey, boardEdgePx: refinedEdge }
          applyBoardMaxEdge(refinedEdge)
          measurePlayFooterTop()
          measurePlayChromeInsets()
        }
      })
    }

    remeasureBoardLayoutRef.current = measureBoardMaxEdge

    let footerFrame = 0
    let boardFrame = 0

    const scheduleFooterMeasure = () => {
      cancelAnimationFrame(footerFrame)
      footerFrame = requestAnimationFrame(() => {
        measureFooterStack()
        requestAnimationFrame(() => {
          measurePlayFooterTop()
          measurePlayChromeInsets()
        })
      })
    }

    remeasurePlayChromeRef.current = scheduleFooterMeasure

    const scheduleBoardMeasure = (force = false) => {
      cancelAnimationFrame(boardFrame)
      boardFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => measureBoardMaxEdge(force))
      })
    }

    const onFooterResize = () => {
      scheduleFooterMeasure()
    }

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement
        if (target === turnControlsFooterRef.current || target === historyBannerRef.current) {
          onFooterResize()
        } else if (target === imperiumRowRef.current) {
          scheduleFooterMeasure()
          scheduleBoardMeasure(true)
        } else if (target === root) {
          scheduleBoardMeasure(true)
        }
      }
    })

    if (turnControlsFooterRef.current) ro.observe(turnControlsFooterRef.current)
    if (historyBannerRef.current) ro.observe(historyBannerRef.current)
    if (imperiumRowRef.current) ro.observe(imperiumRowRef.current)
    ro.observe(root)

    const desktopMq = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ)
    const dockedMq = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ)
    const onLayoutMqChange = () => {
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      lockedPlayBandHeightForBoardRef.current = 0
      scheduleFooterMeasure()
      scheduleBoardMeasure(true)
    }
    desktopMq.addEventListener('change', onLayoutMqChange)
    dockedMq.addEventListener('change', onLayoutMqChange)

    const onViewportResize = () => {
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      lockedPlayBandHeightForBoardRef.current = 0
      scheduleBoardMeasure(true)
    }

    scheduleFooterMeasure()
    scheduleBoardMeasure(true)

    window.addEventListener('resize', onViewportResize)
    window.visualViewport?.addEventListener('resize', onViewportResize)

    return () => {
      remeasureBoardLayoutRef.current = null
      remeasurePlayChromeRef.current = null
      cancelAnimationFrame(footerFrame)
      cancelAnimationFrame(boardFrame)
      ro.disconnect()
      desktopMq.removeEventListener('change', onLayoutMqChange)
      dockedMq.removeEventListener('change', onLayoutMqChange)
      window.removeEventListener('resize', onViewportResize)
      window.visualViewport?.removeEventListener('resize', onViewportResize)
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      lockedPlayBandHeightForBoardRef.current = 0
      root.style.removeProperty('--footer-measured-height')
      root.style.removeProperty('--play-nav-measured-height')
      root.style.removeProperty('--turn-controls-measured-height')
      root.style.removeProperty('--play-top-chrome-height')
      root.style.removeProperty('--play-board-max-edge')
      root.style.removeProperty('--play-footer-top')
      root.style.removeProperty('--play-board-bottom')
      root.style.removeProperty('--combat-troop-dock-top')
      document.documentElement.style.removeProperty('--footer-measured-height')
      document.documentElement.style.removeProperty('--play-nav-measured-height')
      document.documentElement.style.removeProperty('--turn-controls-measured-height')
      document.documentElement.style.removeProperty('--play-top-chrome-height')
      document.documentElement.style.removeProperty('--play-board-max-edge')
      document.documentElement.style.removeProperty('--history-banner-top')
      document.documentElement.style.removeProperty('--play-footer-top')
      document.documentElement.style.removeProperty('--play-board-bottom')
      document.documentElement.style.removeProperty('--combat-troop-dock-top')
      root.style.removeProperty('--history-banner-top')
      root.style.removeProperty('--play-footer-top')
      root.style.removeProperty('--play-board-bottom')
    }
  }, [])

  useLayoutEffect(() => {
    remeasureBoardLayoutRef.current?.(true)
  }, [
    hidePlayShellFooter,
    isMobilePlayView,
      isDesktopPlayView,
      gameState.expansions?.riseOfIx,
    isDockedHistoryLayout,
    useImageBoard,
  ])

  useLayoutEffect(() => {
    remeasurePlayChromeRef.current?.()
  }, [
    isViewingHistory,
    showTurnControlsFooter,
    isPlayChromeHeld,
    isTurnHistoryOpen,
    viewingTurnIndex,
  ])

  const renderImageBoard = useCallback(
    () =>
      useImageBoard ? (
        <ImageBoard
          currentPlayer={displayState.activePlayerId}
          highlightedAreas={isViewingHistory ? [] : getSelectedCardAgentIcons(gameState)}
          infiltrate={isViewingHistory ? false : getInfiltrate(gameState)}
          onSpaceClick={isViewingHistory ? () => {} : handlePlaceAgent}
          occupiedSpaces={displayState.occupiedSpaces}
          canPlaceAgent={
            isViewingHistory || gameState.sandboxSetup ? false : canPlaceAgentOnBoard(gameState)
          }
          combatTroops={displayState.combatTroops}
          players={displayState.players}
          factionInfluence={displayState.factionInfluence}
          currentConflict={displayState.currentConflict}
          bonusSpice={displayState.bonusSpice}
          onSelectiveBreedingRequested={handleSelectiveBreedingRequested}
          recallMode={isViewingHistory ? false : kwisatzRecallActive}
          placementPrompt={isViewingHistory ? null : boardPlacementPrompt}
          ignoreSpaceRequirements={
            isViewingHistory
              ? false
              : isKwisatzHaderachCard(getSelectedCard(gameState))
          }
          voiceSelectionActive={isViewingHistory ? false : Boolean(voiceSelectionRewardId)}
          onVoiceSpaceSelect={handleVoiceSpaceSelect}
          blockedSpaces={displayState.blockedSpaces || []}
          gameStateForMarkers={displayState}
          combatStrength={displayState.combatStrength ?? gameState.combatStrength}
          controlMarkers={displayState.controlMarkers}
          historyHighlightSpaceId={historyHighlightSpaceId}
          troopDeploy={
            isViewingHistory || gameState.sandboxSetup || !activePlayer
              ? undefined
              : {
                  canDeploy: Boolean(gameState.currTurn?.canDeployTroops),
                  deployableTroops: Math.min(
                    getRemainingTroopDeploySlots(gameState),
                    activePlayer.troops || 0
                  ),
                  deployedThisTurn: gameState.currTurn?.removableTroops || 0,
                  garrisonTroops: activePlayer.troops || 0,
                  onDeploy: () => handleAddTroop(activePlayer.id),
                  onUndeploy: () => handleUndeployTroop(activePlayer.id),
                }
          }
          dreadnoughtDeploy={
            isViewingHistory ||
            gameState.sandboxSetup ||
            !activePlayer ||
            !gameState.expansions?.riseOfIx
              ? undefined
              : {
                  canDeploy: Boolean(gameState.currTurn?.canDeployTroops),
                  deployableDreadnoughts: Math.min(
                    getRemainingDeploySlots(gameState),
                    activePlayer.dreadnoughts?.garrison ?? 0
                  ),
                  deployedThisTurn: gameState.currTurn?.removableDreadnoughts || 0,
                  garrisonDreadnoughts: activePlayer.dreadnoughts?.garrison ?? 0,
                  onDeploy: () => handleAddDreadnought(activePlayer.id),
                  onUndeploy: () => handleUndeployDreadnought(activePlayer.id),
                }
          }
          negotiatorDeploy={
            isViewingHistory ||
            gameState.sandboxSetup ||
            !activePlayer ||
            !gameState.expansions?.riseOfIx
              ? undefined
              : {
                  canDeploy: Boolean(gameState.currTurn?.canDeployTroops),
                  deployableNegotiators: Math.min(
                    getRemainingDeploySlots(gameState),
                    activePlayer.negotiatorsOnIx ?? 0
                  ),
                  deployedThisTurn: gameState.currTurn?.removableNegotiators || 0,
                  negotiatorsOnIx: activePlayer.negotiatorsOnIx ?? 0,
                  onDeploy: () => handleDeployNegotiator(activePlayer.id),
                  onUndeploy: () => handleUndeployNegotiator(activePlayer.id),
                }
          }
          sandboxSetup={
            inSandboxSetup
              ? {
                  onConflictClick: () => setSandboxConflictOpen(true),
                  onPlayerClick: (playerId: number) => setSandboxEditPlayerId(playerId),
                  onTechTilesClick:
                    riseOfIx && sandboxTechSummary.tilesForBoard > 0
                      ? () => setSandboxTechOpen(true)
                      : undefined,
                  sandboxTechRequiredFilledStacks: sandboxTechSummary.requiredFilledStacks,
                }
              : undefined
          }
          influenceSelection={
            !isViewingHistory && influenceBoardMeta && activeInfluenceBoardChoice
              ? {
                  mode: influenceBoardMeta.mode,
                  amount: influenceBoardMeta.amount,
                  selectableFactions: influenceBoardMeta.selectableFactions,
                  disabledFactions: influenceBoardMeta.disabledFactions,
                  onFactionSelect: handleInfluenceBoardFactionSelect,
                }
              : undefined
          }
          ixBoardPlacement={
            isDesktopPlayView && gameState.expansions?.riseOfIx ? 'docked' : 'embedded'
          }
          pendingAcquireTech={
            techAcquireOffer && activePlayer
              ? {
                  playerId: activePlayer.id,
                  discount: techAcquireOffer.discount,
                  paySolariInsteadOfSpice: techAcquireOffer.paySolariInsteadOfSpice,
                }
              : undefined
          }
          onTechTileAcquire={!isViewingHistory ? handleTechTileAcquireClick : undefined}
        />
      ) : null,
    [
      useImageBoard,
      displayState,
      isViewingHistory,
      gameState,
      voiceSelectionRewardId,
      activePlayer,
      handlePlaceAgent,
      handleSelectiveBreedingRequested,
      handleVoiceSpaceSelect,
      historyHighlightSpaceId,
      handleAddTroop,
      handleUndeployTroop,
      handleAddDreadnought,
      handleUndeployDreadnought,
      handleDeployNegotiator,
      handleUndeployNegotiator,
      handleAcquireTechTile,
      techAcquireOffer,
      handleTechTileAcquireClick,
      inSandboxSetup,
      riseOfIx,
      sandboxTechSummary,
      kwisatzRecallActive,
      boardPlacementPrompt,
      influenceBoardMeta,
      activeInfluenceBoardChoice,
      handleInfluenceBoardFactionSelect,
      isDesktopPlayView,
    ]
  )

  const holdToHidePlayChrome = isMobilePlayView && useImageBoard
  const showTurnHistoryPanel = isDockedHistoryLayout || isTurnHistoryOpen

  useEffect(() => {
    if (inSandboxSetup && !isDockedHistoryLayout) {
      setIsTurnHistoryOpen(false)
    }
  }, [inSandboxSetup, isDockedHistoryLayout])

  const sandboxSetupControls = (compact = false) =>
    inSandboxSetup ? (
      <SandboxSetupControls
        compact={compact}
        position={gameState.sandboxSetupPosition}
        ready={sandboxReady}
        riseOfIx={riseOfIx}
        imperiumRowDone={gameState.imperiumRow.length === 5}
        techTilesDone={ixBoardReady}
        conflictDone={gameState.currentConflict.id > 0}
        onSetPosition={(round, playerTurn) =>
          dispatch({ type: 'SANDBOX_SET_POSITION', round, playerTurn })
        }
        onCommit={() => dispatch({ type: 'SANDBOX_COMMIT_SETUP' })}
      />
    ) : null

  const turnHistoryTopSlot =
    inSandboxSetup && isDockedHistoryLayout ? sandboxSetupControls(false) : undefined
  const sandboxSetupMobileBar =
    inSandboxSetup && !isDockedHistoryLayout ? (
      <div className="sandbox-setup-mobile-bar">{sandboxSetupControls(true)}</div>
    ) : null

  return (
    <div
      ref={gameContainerRef}
      className={[
        'game-container',
        'game-container--play',
        isDesktopPlayView ? 'game-container--desktop-play' : '',
        isDesktopPlayView && gameState.expansions?.riseOfIx ? 'game-container--ix-dock' : '',
        isDockedHistoryLayout ? 'game-container--history-docked' : '',
        isViewingHistory ? 'viewing-history' : '',
        isPlayChromeHeld ? 'play-chrome-held' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PlayBoardModalProvider
        boardContainerRef={mainAreaRef}
        scopeModalsToBoard={isDesktopPlayView}
      >
      <div ref={playShellMainRef} className="play-shell-main">
        <div className="play-board-column">
      <div
        ref={imperiumRowRef}
        className="imperium-row-container"
      >
        <div
          className={[
            'imperium-row-container__column',
            inSandboxSetup ? 'imperium-row-container__column--sandbox-setup' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="imperium-row-container__main">
            <ImperiumRow
              canAcquire={isViewingHistory ? false : gameState.canAcquireIR}
              canAcquireToTop={
                !isViewingHistory &&
                Boolean(activePlayer && gameState.acquireToTopThisRound?.[activePlayer.id])
              }
              cards={displayState.imperiumRow}
              alCount={displayState.arrakisLiaisonDeck.length}
              smfCount={displayState.spiceMustFlowDeck.length}
              persuasion={isViewingHistory ? 0 : activePlayer?.persuasion || 0}
              onAcquireArrakisLiaison={handleAcquireArrakisLiaison}
              onAcquireSpiceMustFlow={handleAcquireSpiceMustFlow}
              onAcquireCard={handleAcquireCard}
              helenaRemovedCard={displayState.helenaRemovedCard ?? null}
              activePlayerId={displayState.activePlayerId}
              sandboxSetup={
                inSandboxSetup
                  ? {
                      onConfigure: () => setSandboxImperiumOpen(true),
                      requiredCount: 5,
                    }
                  : undefined
              }
            />
          </div>
          {techAcquireOffer && activePlayer && gameState.ixBoard?.stacks && !useImageBoard ? (
            <TechMarketRow
              key={`tech-acquire-${techAcquireOffer.playerId}-${techAcquireOffer.discount}`}
              stacks={gameState.ixBoard.stacks}
              player={activePlayer}
              discount={techAcquireOffer.discount}
              paySolariInsteadOfSpice={techAcquireOffer.paySolariInsteadOfSpice}
              onAcquire={handleAcquireTechTile}
            />
          ) : null}
        </div>
      </div>
      <div
        ref={playShellBoardRowRef}
        className={[
          'play-board-and-history',
          isDockedHistoryLayout && showTurnHistoryPanel ? 'play-board-and-history--with-history' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          ref={mainAreaRef}
          className={[
            'main-area',
            'play-shell-board',
            isDockedHistoryLayout ? 'play-shell-board--fill' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <CombatPhaseOverlay
            players={combatOverlayState.players}
            combatStrength={combatOverlayState.combatStrength}
            combatPasses={combatOverlayState.combatPasses}
            activePlayerId={combatOverlayState.activePlayerId}
            activePlayerPlayedCombatIntrigue={
              viewingCombatHistory ? false : hasPlayedCombatIntrigueThisVisit
            }
            isVisible={showCombatOverlay}
            readOnly={viewingCombatHistory}
            containerRef={mainAreaRef}
          />
          <EndgameOverlay
            gameState={endgameOverlayState}
            analyticsSourceState={gameState}
            isVisible={showEndgameOverlay}
            readOnly={viewingEndgameHistory}
            containerRef={mainAreaRef}
            onRevealIntrigue={handleRevealEndgameIntrigue}
          />
          {useImageBoard ? (
            renderImageBoard()
          ) : (
            <GameBoard
              currentPlayer={displayState.activePlayerId}
              highlightedAreas={isViewingHistory ? [] : getSelectedCardAgentIcons(gameState)}
              infiltrate={isViewingHistory ? false : getInfiltrate(gameState)}
              onSpaceClick={isViewingHistory ? () => {} : handlePlaceAgent}
              occupiedSpaces={displayState.occupiedSpaces}
              canPlaceAgent={
            isViewingHistory || gameState.sandboxSetup ? false : canPlaceAgentOnBoard(gameState)
          }
              combatTroops={displayState.combatTroops}
              players={displayState.players}
              factionInfluence={displayState.factionInfluence}
              currentConflict={displayState.currentConflict}
              bonusSpice={displayState.bonusSpice}
              onSelectiveBreedingRequested={handleSelectiveBreedingRequested}
              recallMode={isViewingHistory ? false : kwisatzRecallActive}
              ignoreSpaceRequirements={
                isViewingHistory
                  ? false
                  : isKwisatzHaderachCard(getSelectedCard(gameState))
              }
              voiceSelectionActive={isViewingHistory ? false : Boolean(voiceSelectionRewardId)}
              onVoiceSpaceSelect={handleVoiceSpaceSelect}
              blockedSpaces={displayState.blockedSpaces || []}
              expansions={displayState.expansions}
            />
          )}
        </div>
      </div>
        {showTurnHistoryPanel && isDockedHistoryLayout && (
          <TurnHistory
            layout="docked"
            turns={gameState.history}
            viewingTurnIndex={viewingTurnIndex}
            players={gameState.players}
            currentGameState={gameState}
            onTurnChange={goToTurn}
            onReturnToCurrent={returnToCurrent}
            topSlot={turnHistoryTopSlot}
            onLoadSave={onLoadSave}
            {...turnHistoryUndoProps}
          />
        )}
        {needsImperiumSelection && (
          <ImperiumRowSelect
            cards={gameState.imperiumRowDeck}
            requiredCount={imperiumSelectionCount}
            onConfirm={handleImperiumRowSetup}
          />
        )}
        {needsReplacementSelection && (
          <ImperiumRowSelect
            cards={gameState.imperiumRowDeck}
            requiredCount={1}
            onConfirm={handleImperiumRowReplacement}
          />
        )}
        {gameState.phase === GamePhase.ROUND_START &&
          !isViewingHistory &&
          !needsImperiumSelection &&
          !gameState.sandboxSetup && (
          <div className="round-start-container">
            <ConflictSelect
              conflicts={(() => {
                const tierForRound = gameState.currentRound === 1 ? 1 : gameState.currentRound <= 6 ? 2 : 3
                return getConflictPool(gameState.expansions).filter(
                  c => c.tier === tierForRound && !gameState.conflictsDiscard.includes(c)
                )
              })()}
              currentRound={gameState.currentRound}
              handleConflictSelect={handleConflictSelect}
            />
          </div>
        )}
        {inSandboxSetup && sandboxImperiumOpen && (
          <ImperiumRowSelect
            cards={[...gameState.imperiumRow, ...gameState.imperiumRowDeck]}
            requiredCount={5}
            initialSelectedCards={gameState.imperiumRow}
            onConfirm={(cardIds) => {
              dispatch({ type: 'SANDBOX_SET_IMPERIUM_ROW', cardIds })
              setSandboxImperiumOpen(false)
            }}
            onCancel={() => setSandboxImperiumOpen(false)}
          />
        )}
        {inSandboxSetup && sandboxTechOpen && riseOfIx && (
          <TechTileSelect
            tiles={TECH_TILES}
            players={gameState.players}
            tilesForBoard={sandboxTechSummary.tilesForBoard}
            requiredFilledStacks={sandboxTechSummary.requiredFilledStacks}
            allowedEmptyStacks={sandboxTechSummary.allowedEmptyStacks}
            blockedTileIds={playerTechTileIds(gameState.players)}
            initialStackTops={sandboxStackTopsFromIxBoard(gameState.ixBoard)}
            onConfirm={stackTops => {
              dispatch({ type: 'SANDBOX_SET_IX_BOARD_TOP', stackTops })
              setSandboxTechOpen(false)
            }}
            onCancel={() => setSandboxTechOpen(false)}
          />
        )}
        {activePlayer &&
          gameState.ixBoard?.stacks &&
          techAcquireStackIndex != null &&
          useImageBoard && (
            <TechAcquireModal
              isOpen
              stackIndex={techAcquireStackIndex}
              stacks={gameState.ixBoard.stacks}
              player={activePlayer}
              canAcquire={Boolean(techAcquireOffer)}
              discount={techAcquireOffer?.discount ?? 0}
              paySolariInsteadOfSpice={techAcquireOffer?.paySolariInsteadOfSpice}
              onAcquire={handleAcquireTechTile}
              onClose={() => setTechAcquireStackIndex(null)}
            />
          )}
        {inSandboxSetup && sandboxConflictOpen && (
          <ConflictSelect
            conflicts={getConflictPool(gameState.expansions)}
            currentRound={gameState.currentRound}
            title="Select Conflict Card"
            handleConflictSelect={(conflictId) => {
              dispatch({ type: 'SANDBOX_SET_CONFLICT', conflictId })
              setSandboxConflictOpen(false)
            }}
            onCancel={() => setSandboxConflictOpen(false)}
          />
        )}
        {sandboxEditPlayer && (
          <SandboxPlayerEditor
            player={sandboxEditPlayer}
            expansions={gameState.expansions}
            usedLeaderNames={gameState.players
              .filter(p => p.id !== sandboxEditPlayer.id)
              .map(p => p.leader.name)}
            imperiumDeckCards={gameState.imperiumRowDeck}
            arrakisLiaisonCards={gameState.arrakisLiaisonDeck}
            spiceMustFlowCards={gameState.spiceMustFlowDeck}
            foldspaceCards={gameState.foldspaceDeck}
            controlMarkers={gameState.controlMarkers}
            dreadnoughtCover={gameState.dreadnoughtCover}
            mentatOwner={gameState.mentatOwner}
            playerInfluence={{
              [FactionType.EMPEROR]:
                gameState.factionInfluence[FactionType.EMPEROR]?.[sandboxEditPlayer.id] ?? 0,
              [FactionType.SPACING_GUILD]:
                gameState.factionInfluence[FactionType.SPACING_GUILD]?.[sandboxEditPlayer.id] ?? 0,
              [FactionType.BENE_GESSERIT]:
                gameState.factionInfluence[FactionType.BENE_GESSERIT]?.[sandboxEditPlayer.id] ?? 0,
              [FactionType.FREMEN]:
                gameState.factionInfluence[FactionType.FREMEN]?.[sandboxEditPlayer.id] ?? 0,
            }}
            onUpdate={(patch) =>
              dispatch({ type: 'SANDBOX_UPDATE_PLAYER', playerId: sandboxEditPlayer.id, patch })
            }
            onInfluenceUpdate={(faction, value) =>
              dispatch({
                type: 'SANDBOX_SET_PLAYER_INFLUENCE',
                playerId: sandboxEditPlayer.id,
                faction,
                value,
              })
            }
            onSetControl={(space, playerId) =>
              dispatch({ type: 'SANDBOX_SET_CONTROL_MARKER', space, playerId })
            }
            onSetDreadnoughtControl={(space, playerId) =>
              dispatch({ type: 'SANDBOX_SET_DREADNOUGHT_CONTROL', space, playerId })
            }
            onSetMentatOwner={playerId =>
              dispatch({ type: 'SANDBOX_SET_MENTAT_OWNER', playerId })
            }
            blockedTechTileIds={sandboxBlockedTechIdsForPlayer(
              gameState.players,
              sandboxEditPlayer.id,
              gameState.ixBoard
            )}
            onClose={() => setSandboxEditPlayerId(null)}
          />
        )}
      <div
        className={[
          'play-shell-footer',
          isDockedHistoryLayout ? 'play-shell-footer--docked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        hidden={hidePlayShellFooter}
      >
      {useImageBoard && !isViewingHistory && !gameState.sandboxSetup && activePlayer && (
        <>
          <div className="effect-retreat-troop-dock" data-marker="effect-retreat-troop-controls">
            <div className="effect-retreat-troop-dock__anchor">
              <RetreatTroopControls
                effectRetreatRemaining={getEffectRetreatRemaining(gameState.currTurn)}
                troopsInConflict={gameState.combatTroops[activePlayer.id] || 0}
                onRetreat={() => handleEffectRetreatTroop(activePlayer.id)}
              />
            </div>
          </div>
        </>
      )}
        <div
          ref={turnControlsFooterRef}
          className="turn-controls-container"
          hidden={
            !gameState.sandboxSetup &&
            turnControlsState.phase !== GamePhase.PLAYER_TURNS &&
            turnControlsState.phase !== GamePhase.COMBAT
          }
        >
          <TurnControls
            activePlayer={turnControlsActivePlayer}
            canEndTurn={isViewingHistory ? false : gameState.canEndTurn}
            onPlayCard={handleCardSelect}
            onPlayIntrigue={handlePlayIntrigue}
            onMobilizeGarrison={handleMobilizeGarrison}
            onPlayCombatIntrigue={handlePlayCombatIntrigue}
            onReveal={handleRevealCards}
            isCombatPhase={turnControlsState.phase === GamePhase.COMBAT}
            players={turnControlsState.players}
            factionInfluence={turnControlsState.factionInfluence}
            factionAlliances={turnControlsState.factionAlliances}
            controlMarkers={turnControlsState.controlMarkers}
            firstPlayerMarker={turnControlsState.firstPlayerMarker}
            mentatOwner={turnControlsState.mentatOwner}
            optionalEffects={isViewingHistory ? [] : gameState.currTurn?.optionalEffects || []}
            pendingChoices={isViewingHistory ? [] : gameState.currTurn?.pendingChoices || []}
            onResolveChoice={handleResolveChoice}
            onResolveCardSelect={handleResolveCardSelect}
            onPayCost={handlePayCost}
            showSelectiveBreeding={showSelectiveBreeding}
            selectedCard={isViewingHistory ? null : getSelectedCard(gameState)}
            recallMode={!isViewingHistory && kwisatzRecallActive}
            placementPrompt={!isViewingHistory ? boardPlacementPrompt : null}
            onSelectiveBreedingSelect={card => {
              if (onSelectiveBreedingSelect) onSelectiveBreedingSelect(card)
              setShowSelectiveBreeding(false)
            }}
            onSelectiveBreedingCancel={() => setShowSelectiveBreeding(false)}
            pendingRewards={isViewingHistory ? [] : gameState.pendingRewards}
            onClaimReward={handleClaimReward}
            onClaimAllRewards={handleClaimAllRewards}
            onAutoApplyRewards={handleAutoApplyRewards}
            autoApplyMandatoryRewards={autoApplyMandatoryRewards}
            agentPlaced={Boolean(turnControlsState.currTurn?.agentSpace)}
            opponentDiscardState={isViewingHistory ? undefined : gameState.currTurn?.opponentDiscardState}
            onOpponentDiscardChoice={handleOpponentDiscardChoice}
            onOpponentDiscardCard={handleOpponentDiscardCard}
            onOpponentDiscardCards={handleOpponentDiscardCards}
            combatTroops={turnControlsState.combatTroops}
            onVoiceSelectionStart={handleVoiceSelectionStart}
            voiceSelectionActive={!isViewingHistory && Boolean(voiceSelectionRewardId)}
            onMasterstrokeSelectionStart={handleMasterstrokeSelectionStart}
            masterstrokeSelectionActive={!isViewingHistory && Boolean(masterstrokeSelectionRewardId)}
            onMemnonHighCouncilSelectionStart={handleMemnonHighCouncilSelectionStart}
            memnonHighCouncilSelectionActive={!isViewingHistory && Boolean(memnonHighCouncilRewardId)}
            influenceBoardSelectionActive={!isViewingHistory && influenceBoardSelectionActive}
            influenceBoardPrompt={influenceBoardPrompt}
            onOpponentNoCardAck={handleOpponentNoCardAck}
            intrigueDeck={turnControlsState.intrigueDeck}
            gamePhase={turnControlsState.phase}
            activeIntrigueThisRound={turnControlsActivePlayer ? (turnControlsState.activeIntrigueThisRound?.[turnControlsActivePlayer.id] || []) : []}
            gameState={turnControlsState}
            isHistoryView={isViewingHistory}
            showDesktopPlayBar={isDesktopPlayView}
            showEndTurnButton={showFooterEndTurn && !isViewingHistory}
            showPassCombatButton={showFooterPassCombat && !isViewingHistory}
            onEndTurn={
              activePlayer ? () => handleEndTurn(activePlayer.id) : undefined
            }
            onPassCombat={
              activePlayer ? () => handlePassCombat(activePlayer.id) : undefined
            }
            endTurnDisabled={endTurnButtonState.disabled}
            endTurnTitle={endTurnButtonState.title}
            passCombatLabel={combatFooterActionLabel}
            onActivateTech={isViewingHistory ? undefined : handleActivateTech}
          />
        </div>
      {sandboxSetupMobileBar}
      {/* Navigator / status strip — directly under the board; play band fills below. */}
      <div
        ref={historyBannerRef}
        className={[
          'history-viewing-banner',
          'play-shell-nav',
          isTurnHistoryOpen && !isDockedHistoryLayout ? 'history-viewing-banner--panel-open' : '',
          isViewingHistory ? 'history-viewing-banner--scrubbing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        hidden={isDesktopPlayView}
      >
        <div className="history-banner-leading">
          {showPlayFooterToolbar && turnControlsActivePlayer && !isDesktopPlayView && (
            <PlayFooterToolbar
              player={turnControlsActivePlayer}
              onOpenPlayerOverview={() => setIsPlayerOverviewOpen(true)}
              onTurnHistoryToggle={() => setIsTurnHistoryOpen(open => !open)}
              isTurnHistoryOpen={showTurnHistoryPanel}
              hideTurnHistoryToggle={isDockedHistoryLayout}
              showBoardPeekButton={holdToHidePlayChrome}
              isBoardPeekActive={isPlayChromeHeld}
              onBoardPeekHoldChange={setPlayChromeHeld}
            />
          )}
        </div>
        <div className="history-banner-center">
          {!isDockedHistoryLayout && (
            <span className="history-banner-turn-label">
              {viewingTurnIndex === null
                ? gameState.sandboxSetup
                  ? 'Setup'
                  : gameState.phase === GamePhase.END_GAME
                    ? 'Endgame'
                    : formatTurnRoundHeader(
                        getLivePlayerTurnNumber(
                          gameState.history,
                          gameState.playerTurnNumberOffset ?? 0
                        ),
                        getDisplayRound(gameState)
                      )
                : (() => {
                    const snapshot = gameState.history[viewingTurnIndex]
                    if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') return 'Setup'
                    if (snapshot?.historyEntryKind === 'round-start') {
                      return `Round ${snapshot.currentRound} start`
                    }
                    if (snapshot?.historyEntryKind === 'combat') return 'Combat'
                    if (snapshot?.historyEntryKind === 'endgame') return 'Endgame'
                    const turnNum = getPlayerTurnNumber(gameState.history, viewingTurnIndex)
                    const totalPlayerTurns = countPlayerTurns(gameState.history)
                    return turnNum != null
                      ? `Turn ${turnNum} of ${totalPlayerTurns}`
                      : `Turn ${viewingTurnIndex} of ${gameState.history.length}`
                  })()}
            </span>
          )}
        </div>
        <div className="history-banner-actions">
          {!isDockedHistoryLayout && (
            <div className="history-banner-turn-nav" aria-label="Turn navigation">
              <button
                type="button"
                className="history-nav-btn"
                onClick={() => goToTurn(Math.max(0, (viewingTurnIndex ?? gameState.history.length) - 1))}
                disabled={viewingTurnIndex === 0}
                title="Previous turn"
                aria-label="Previous turn"
              >
                &lt;
              </button>
              {isViewingHistory && liveTurnPlayer && (
                <button
                  type="button"
                  className={`history-return-leader-btn leader-avatar-btn ${liveTurnPlayer.color}`}
                  onClick={returnToCurrent}
                  title={`Return to current turn (${liveTurnPlayer.leader.name})`}
                  aria-label={`Return to current turn, ${liveTurnPlayer.leader.name}`}
                >
                  {liveLeaderIconPath ? (
                    <img
                      className="history-return-leader-icon"
                      src={liveLeaderIconPath}
                      alt=""
                      draggable={false}
                    />
                  ) : (
                    <span className="history-return-leader-fallback" aria-hidden="true">
                      {liveTurnPlayer.leader.name.charAt(0)}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                className="history-nav-btn"
                onClick={() => {
                  const effectiveViewIndex = viewingTurnIndex ?? gameState.history.length
                  if (effectiveViewIndex < gameState.history.length) {
                    goToTurn(effectiveViewIndex + 1)
                  } else {
                    returnToCurrent()
                  }
                }}
                hidden={viewingTurnIndex === null}
                title="Next turn"
                aria-label="Next turn"
              >
                &gt;
              </button>
            </div>
          )}
          {showFooterEndTurn && (
            <button
              type="button"
              className="footer-end-turn-button"
              onClick={() => handleEndTurn(activePlayer!.id)}
              disabled={endTurnButtonState.disabled}
              title={endTurnButtonState.title}
            >
              End Turn
            </button>
          )}
          {showFooterPassCombat && (
            <button
              type="button"
              className="footer-pass-combat-button"
              onClick={() => handlePassCombat(activePlayer!.id)}
              aria-label={combatFooterActionLabel}
            >
              {combatFooterActionLabel}
            </button>
          )}
        </div>
      </div>
      </div>
      </div>
      </div>
      {showTurnHistoryPanel && !isDockedHistoryLayout && (
        <TurnHistory
          layout="overlay"
          turns={gameState.history}
          viewingTurnIndex={viewingTurnIndex}
          players={gameState.players}
          currentGameState={gameState}
          onTurnChange={goToTurn}
          onReturnToCurrent={returnToCurrent}
          topSlot={turnHistoryTopSlot}
          onLoadSave={onLoadSave}
          onClose={() => {
            setIsTurnHistoryOpen(false)
            if (!inSandboxSetup) {
              returnToCurrent()
            }
          }}
          {...turnHistoryUndoProps}
        />
      )}
      {gameState.phase === GamePhase.COMBAT_REWARDS && (
        <div className="combat-results-container">
          <CombatResults
            players={gameState.players}
            combatStrength={gameState.combatStrength}
            history={gameState.history}
            onConfirm={handleConfirmCombat}
            pendingConflictRewardChoices={gameState.pendingConflictRewardChoices}
            onResolveConflictChoice={(choiceId, optionIndex) =>
              dispatch({ type: 'RESOLVE_CONFLICT_REWARD_CHOICE', choiceId, optionIndex })
            }
          />
        </div>
      )}
      <UndoConfirmDialog
        isOpen={undoToSetup || undoTargetIndex !== null}
        targetTurnIndex={undoToSetup ? 0 : (undoTargetIndex ?? 0)}
        undoSourceRowIndex={undoSourceRowIndex ?? 0}
        undoToSetup={undoToSetup}
        currentHistoryLength={gameState.history.length}
        targetState={getUndoTargetState()}
        currentState={gameState}
        onConfirm={handleUndoConfirm}
        onCancel={clearUndoState}
      />
      {masterstrokeSelectionRewardId && (
        <MasterstrokeFactionModal
          open={true}
          onConfirm={handleMasterstrokeFactionConfirm}
          onCancel={handleMasterstrokeSelectionCancel}
        />
      )}
      {memnonHighCouncilRewardId && (
        <MasterstrokeFactionModal
          open={true}
          onConfirm={handleMemnonHighCouncilFactionConfirm}
          onCancel={handleMemnonHighCouncilCancel}
          maxSelections={1}
        />
      )}
      {isPlayerOverviewOpen && (
        <PlayerOverviewModal
          players={displayState.players}
          factionInfluence={displayState.factionInfluence}
          factionAlliances={displayState.factionAlliances}
          gameState={displayState}
          controlMarkers={gameState.controlMarkers}
          combatTroops={displayState.combatTroops}
          combatStrength={displayState.combatStrength ?? gameState.combatStrength}
          combatPasses={gameState.combatPasses}
          activePlayerId={displayState.activePlayerId}
          firstPlayerMarker={gameState.firstPlayerMarker}
          mentatOwner={gameState.mentatOwner}
          isCombatPhase={gameState.phase === GamePhase.COMBAT}
          onClose={() => setIsPlayerOverviewOpen(false)}
        />
      )}
      </PlayBoardModalProvider>
    </div>
  )
}

function getInfiltrate(gameState: GameState): boolean {
  if (gameState.infiltrateIgnoreOccupancyOnce?.[gameState.activePlayerId]) {
    return true
  }
  return Boolean(getSelectedCard(gameState)?.infiltrate)
}

/** While choosing a board space the card stays in deck; after PLACE_AGENT it lives in playArea — check both */
function getSelectedCard(gameState: GameState): Card | null {
  const id = gameState.selectedCard
  if (id === null || id === undefined) return null
  const player = gameState.players[gameState.activePlayerId]
  if (!player) return null
  const deckIndex = gameState.selectedCardDeckIndex
  if (typeof deckIndex === 'number') {
    const atIndex = player.deck[deckIndex]
    if (atIndex?.id === id) return atIndex
  }
  return player.deck.find(c => c.id === id) ?? player.playArea.find(c => c.id === id) ?? null
}

/** Board hotspots: only while picking a space — not after agent is placed for this action (`currTurn.agentSpace`). */
function getSelectedCardAgentIcons(gameState: GameState): AgentIcon[] {
  if (gameState.currTurn?.agentSpace) return []
  if (isKwisatzSourceChoicePending(gameState)) return []
  const card = getSelectedCard(gameState)
  if (!card) return []
  const base = [...card.agentIcons]
  if (gameState.dispatchEnvoyActive?.[gameState.activePlayerId]) {
    return mergeDispatchEnvoyIcons(base)
  }
  return base
}

function resolveFirstPlayer(setups: PlayerSetup[]): number {
  const baronIndex = setups.findIndex(p => p.leader.name === LEADER_NAMES.BARON_VLADIMIR)
  return baronIndex >= 0 ? baronIndex : 0
}

function buildGameInputFromConfiguration(
  players: Player[],
  imperiumRowDeck: Card[],
  options: {
    firstPlayer: number
    currentRound?: number
    sandbox?: boolean
    title?: string
    gamePackId: string
  }
): SaveDoc {
  const { setup, unmapped } = buildSetupBlockFromConfiguration({
    players,
    firstPlayer: options.firstPlayer,
    imperiumRowDeck,
    currentRound: options.currentRound,
    sandbox: options.sandbox,
    gamePackId: options.gamePackId,
  })
  return createGameInputDoc(setup, {
    title: options.title ?? (options.sandbox ? 'Sandbox game' : 'New game'),
    notes: unmapped.length
      ? `Unmapped catalog entries: ${unmapped.join(', ')}`
      : undefined,
  })
}

function App() {
  const [screenState, setScreenState] = useState<ScreenState>(ScreenState.SETUP)
  const [autoApplyMandatoryRewards, setAutoApplyMandatoryRewards] = useState(() => {
    return localStorage.getItem('myMentat.autoApplyMandatoryRewards') !== 'false'
  })
  const [gamePackId, setGamePackId] = useState<string>(() => resolveStoredGamePackId())
  const expansions = useMemo(() => expansionsForGamePack(gamePackId), [gamePackId])
  const [creatorReturnScreen, setCreatorReturnScreen] = useState<ScreenState>(ScreenState.SETUP)
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [gameInput, setGameInput] = useState<SaveDoc | null>(null)
  const [gameSessionKey, setGameSessionKey] = useState(0)

  const handleLoadSaveDoc = useCallback((doc: SaveDoc) => {
    if (doc.setup.gamePackId) {
      setGamePackId(doc.setup.gamePackId)
    } else if (doc.setup.expansions) {
      setGamePackId(doc.setup.expansions.riseOfIx ? 'official/base+riseOfIx@1' : 'official/base@1')
    }
    setGameInput(doc)
    setGameSessionKey(k => k + 1)
    setScreenState(ScreenState.GAME)
  }, [])

  useEffect(() => {
    localStorage.setItem('myMentat.autoApplyMandatoryRewards', autoApplyMandatoryRewards ? 'true' : 'false')
  }, [autoApplyMandatoryRewards])

  useEffect(() => {
    localStorage.setItem(GAME_PACK_STORAGE_KEY, gamePackId)
  }, [gamePackId])

  // iOS Safari: fixed bottom UIs anchor to the layout viewport, which extends below the visible
  // area when chrome shows. Shift up by this gap so turn controls/modals align with VisualViewport bottom.
  useLayoutEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // iOS Chrome sometimes reports transient visualViewport sizes; absurd gaps break fixed footers
        // and can leave the playing area blank after closing a modal.
        if (!vv.height || vv.height < 80) {
          document.documentElement.style.setProperty('--vv-layout-gap-bottom', '0px')
          return
        }
        const raw = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
        const gapBottom =
          raw > window.innerHeight * 0.34 ? 0 : Math.min(raw, 160)
        document.documentElement.style.setProperty('--vv-layout-gap-bottom', `${gapBottom}px`)
      })
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      document.documentElement.style.removeProperty('--vv-layout-gap-bottom')
    }
  }, [])

  const handleSetupComplete = (setups: PlayerSetup[], selectedGamePackId: string) => {
    setGamePackId(selectedGamePackId)
    setPlayerSetups(setups)
    if (setups.every(s => !s.leader.sogChoice)) {
      setScreenState(ScreenState.GAME_STATE_SETUP)
    } else {
      setCurrentPlayerIndex(0)
      setScreenState(ScreenState.LEADER_CHOICES)
    }
  }

  // Sandbox: skip leader choices and game-state setup; configure everything on the board.
  const handleSandboxStart = (setups: PlayerSetup[], selectedGamePackId: string) => {
    setGamePackId(selectedGamePackId)
    const setupExpansions = expansionsForGamePack(selectedGamePackId)
    setPlayerSetups(setups)
    const imperiumDeck = applyStarterDeckReservationToImperium(
      buildImperiumDeck(setupExpansions),
      setups.map(setup => setup.deck)
    )
    const players: Player[] = setups.map((setup, index) =>
      seedTessiaSnoopers(
        applyHudroStartingIntrigue({
          id: index,
          leader: setup.leader,
          color: setup.color,
          spice: getStartingSpice(setup.leader),
          water: getStartingWater(setup.leader),
          solari: getStartingSolari(setup.leader),
          troops: 3,
          combatValue: 0,
          agents: 2,
          handCount: 5,
          intrigueCount: 0,
          deck: [...setup.deck],
          discardPile: [],
          trash: [],
          hasHighCouncilSeat: false,
          hasSwordmaster: false,
          playArea: [],
          persuasion: 0,
          victoryPoints: 1,
          revealed: false,
          ...(setupExpansions.riseOfIx ? { freighterStep: 0 as const } : {}),
        }),
        setupExpansions.riseOfIx
      )
    )
    setGameInput(
      buildGameInputFromConfiguration(players, imperiumDeck, {
        firstPlayer: resolveFirstPlayer(setups),
        sandbox: true,
        title: 'Sandbox game',
        gamePackId: selectedGamePackId,
      })
    )
    setScreenState(ScreenState.GAME)
  }

  const handleLeaderChoicesComplete = (leader: Leader) => {
    playerSetups[currentPlayerIndex].leader = leader;
    if (currentPlayerIndex < playerSetups.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1)
    } else {
      setScreenState(ScreenState.GAME_STATE_SETUP)
      setCurrentPlayerIndex(0)
    }
  }

  const handleGameStateSetupComplete = (state: {
    players: Player[]
    currentRound: number
    imperiumRowDeck: Card[]
  }) => {
    setGameInput(
      buildGameInputFromConfiguration(state.players, state.imperiumRowDeck, {
        firstPlayer: resolveFirstPlayer(playerSetups),
        currentRound: state.currentRound,
        title: 'New game',
        gamePackId,
      })
    )
    setScreenState(ScreenState.GAME)
  }

  const handleOpenCardCreator = () => {
    setCreatorReturnScreen(screenState)
    setScreenState(ScreenState.CARD_CREATOR)
  }

  const handleCloseCardCreator = () => {
    setScreenState(creatorReturnScreen)
  }

  const renderLeaderChoices = () => {
    if (!playerSetups[currentPlayerIndex]) return null;

    const currentPlayer = playerSetups[currentPlayerIndex];
    
    if (!currentPlayer.leader.sogChoice) {
      handleLeaderChoicesComplete(currentPlayer.leader);
      return null;
    }

    return (
      <LeaderSetupChoices
        selectedLeader={currentPlayer.leader}
        onComplete={handleLeaderChoicesComplete}
      />
    );
  };

  const baronPlayerIndex = playerSetups.findIndex(p => p.leader.name === LEADER_NAMES.BARON_VLADIMIR)
  const firstPlayerId = baronPlayerIndex >= 0 ? baronPlayerIndex : 0

  return (
    <div className="app">
      {screenState === ScreenState.SETUP && (
        <GameSetup
          gamePackId={gamePackId}
          onGamePackChange={setGamePackId}
          onComplete={handleSetupComplete}
          onSandbox={handleSandboxStart}
          onLoadSave={handleLoadSaveDoc}
        />
      )}

      {screenState === ScreenState.LEADER_CHOICES && renderLeaderChoices()}

      {screenState === ScreenState.CARD_CREATOR && (
        <CardCreator onBack={handleCloseCardCreator} />
      )}

      {screenState === ScreenState.GAME_STATE_SETUP && (
        <GameStateSetup 
          playerSetups={playerSetups}
          firstPlayer={firstPlayerId}
          gamePackId={gamePackId}
          onComplete={handleGameStateSetupComplete}
          onOpenCardCreator={handleOpenCardCreator}
          autoApplyMandatoryRewards={autoApplyMandatoryRewards}
          onAutoApplyMandatoryRewardsChange={setAutoApplyMandatoryRewards}
        />
      )}

      {screenState === ScreenState.GAME && gameInput && (
        <GameProvider key={gameSessionKey} gameInput={gameInput}>
          <GameContent
            autoApplyMandatoryRewards={autoApplyMandatoryRewards}
            onLoadSave={handleLoadSaveDoc}
          />
        </GameProvider>
      )}
    </div>
  )
}

export default App
