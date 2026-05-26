import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import ImageBoard from './components/ImageBoard/ImageBoard'
import ImperiumRow from './components/ImperiumRow/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './components/GameContext/GameContext'
import { useGame } from './components/GameContext/GameContext'
import { TimeTravelProvider, useTimeTravel } from './components/TimeTravel'
import GameSetup from './components/GameSetup'
import LeaderSetupChoices from './components/LeaderSetupChoices/LeaderSetupChoices'
import { PlayerSetup, Leader, FactionType, GamePhase, ScreenState, Player, GameState, Card, AgentIcon, OptionalEffect, Reward, CustomEffect, ChoiceType, FixedOptionsChoice, GainSource, PendingReward } from './types/GameTypes'
import { mergeDispatchEnvoyIcons } from './utils/dispatchEnvoy'
import TurnControls from './components/TurnControls/TurnControls'
import PlayFooterToolbar from './components/PlayFooterToolbar/PlayFooterToolbar'
import CombatTroopControls from './components/CombatTroopControls/CombatTroopControls'
import CombatResults from './components/CombatResults/CombatResults'
import { COMBAT_STRENGTH_ORIGIN } from './data/boardMarkerAnchors'
import { CONFLICTS } from './data/conflicts'
import ConflictSelect from './components/ConflictSelect/ConflictSelect'
import GameStateSetup from './components/GameStateSetup/GameStateSetup'
import ImperiumRowSelect from './components/ImperiumRowSelect/ImperiumRowSelect'
import CardCreator from './components/CardCreator/CardCreator'
import { buildImperiumDeck } from './data/cards'
import PlayerOverviewModal from './components/PlayerOverviewModal/PlayerOverviewModal'
import LeaderResourceStrip from './components/LeaderResourceStrip/LeaderResourceStrip'
import MasterstrokeFactionModal from './components/MasterstrokeFactionModal/MasterstrokeFactionModal'
import { getLeaderIconPath, LEADER_NAMES } from './data/leaders'
import { getEndTurnButtonState } from './utils/endTurnState'
import { getResolvedRewardForPlayer } from './data/leaderAbilities/arianaHarvest'
import {
  DESKTOP_PLAY_LAYOUT_MQ,
  DOCKED_HISTORY_LAYOUT_MQ,
} from './constants/playLayout'

interface GameContentProps {
  autoApplyMandatoryRewards: boolean
}

const GameContent = ({ autoApplyMandatoryRewards }: GameContentProps) => {
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

  const [useImageBoard] = useState(true)
  const [autoAppliedRewardSummary, setAutoAppliedRewardSummary] = useState<Array<{
    id: string
    sourceName: string
    reward: Reward
  }>>([])
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

  useEffect(() => {
    setAutoAppliedRewardSummary([])
  }, [gameState.activePlayerId, gameState.currentRound])

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

  const endPlayChromeHold = useCallback(
    (target: HTMLElement, pointerId: number) => {
      setPlayChromeHeld(false)
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId)
      }
    },
    [setPlayChromeHeld]
  )

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
  const historyBannerPlayer =
    (isViewingHistory ? displayState : gameState).players.find(p => {
      const state = isViewingHistory ? displayState : gameState
      const turnPlayerId = state.currTurn?.playerId
      return p.id === (turnPlayerId ?? state.activePlayerId)
    }) ?? activePlayer

  const liveTurnPlayer =
    gameState.players.find(p => {
      const id = gameState.currTurn?.playerId ?? gameState.activePlayerId
      return p.id === id
    }) ?? activePlayer
  const liveLeaderIconPath = liveTurnPlayer ? getLeaderIconPath(liveTurnPlayer.leader.name) : undefined

  const handleCardSelect = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId })
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

  const handleResolveEndgame = () => {
    dispatch({ type: 'RESOLVE_ENDGAME' })
  }
  
  const handleAddTroop = (playerId: number) => {
    dispatch({ type: 'DEPLOY_TROOP', playerId })
  }

  const handleResolveChoice = (choiceId:string, reward: Reward, source?: { type: string; id: number; name: string }) => {
    if(!activePlayer) return;
    dispatch({ type:'RESOLVE_CHOICE', playerId: activePlayer.id, choiceId, reward, source })
  }

  const handleResolveCardSelect = (choiceId: string, cardIds: number[]) => {
    if(!activePlayer) return;
    dispatch({ type: 'RESOLVE_CARD_SELECT', playerId: activePlayer.id, choiceId, cardIds })
  }

  const handlePayCost = (effect: OptionalEffect) => {
    if(!activePlayer) return;
    dispatch({ type: 'PAY_COST', playerId: activePlayer.id, effect })
  }

  const handleRemoveTroop = (playerId: number) => {
    dispatch({ type: 'RETREAT_TROOP', playerId })
  }

  const handleAcquireCard = (cardId: number) => {
    dispatch({ type: 'ACQUIRE_CARD', playerId: activePlayer?.id || 0, cardId })
  }

  const handleAcquireArrakisLiaison = () => {
    dispatch({ type: 'ACQUIRE_AL', playerId: activePlayer?.id || 0 })
  }

  const handleAcquireSpiceMustFlow = () => {
    dispatch({ type: 'ACQUIRE_SMF', playerId: activePlayer?.id || 0 })
  }

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
    if (!activePlayer || voiceSelectionRewardId || masterstrokeSelectionRewardId || memnonHighCouncilRewardId) return
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

  const handleVoiceSelectionCancel = () => setVoiceSelectionRewardId(null)

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

  const rewardForGainSummary = (pending: PendingReward, player: Player): Reward => {
    const base = getResolvedRewardForPlayer(player, pending)
    if (pending.powerPlay && pending.reward.influence?.amounts?.length) {
      return {
        ...base,
        influence: {
          amounts: pending.reward.influence.amounts.map(inf => ({
            ...inf,
            amount: inf.amount + 1
          }))
        }
      }
    }
    return base
  }

  const summarizeAutoAppliedRewards = (rewards: PendingReward[], player: Player) => {
    setAutoAppliedRewardSummary(rewards.map(reward => ({
      id: reward.id,
      sourceName: reward.source.name,
      reward: rewardForGainSummary(reward, player)
    })))
  }

  const handleAutoApplyRewards = () => {
    if (!activePlayer) return
    const autoApplicableRewards = getAutoApplicableRewards(gameState)
    summarizeAutoAppliedRewards(autoApplicableRewards, activePlayer)

    autoApplicableRewards.forEach(reward => {
      dispatch({ type: 'CLAIM_REWARD', playerId: activePlayer.id, rewardId: reward.id })
    })
  }

  useEffect(() => {
    if (!autoApplyMandatoryRewards || !activePlayer || isViewingHistory) return
    if (voiceSelectionRewardId || masterstrokeSelectionRewardId || memnonHighCouncilRewardId) return

    const autoApplicableRewards = getAutoApplicableRewards(gameState)
    if (autoApplicableRewards.length === 0) return

    summarizeAutoAppliedRewards(autoApplicableRewards, activePlayer)
    autoApplicableRewards.forEach(reward => {
      dispatch({ type: 'CLAIM_REWARD', playerId: activePlayer.id, rewardId: reward.id })
    })
  }, [
    autoApplyMandatoryRewards,
    activePlayer?.id,
    isViewingHistory,
    gameState.pendingRewards,
    gameState.currTurn?.pendingChoices,
    voiceSelectionRewardId,
    masterstrokeSelectionRewardId,
    memnonHighCouncilRewardId
  ])

  const imperiumSelectionCount = Math.min(Math.max(0, 5 - gameState.imperiumRow.length), gameState.imperiumRowDeck.length)
  const needsImperiumSelection = gameState.phase === GamePhase.ROUND_START && imperiumSelectionCount > 0
  const needsReplacementSelection = gameState.pendingImperiumRowReplacement !== null && gameState.imperiumRowDeck.length > 0

  const gameContainerRef = useRef<HTMLDivElement>(null)
  const playShellMainRef = useRef<HTMLDivElement>(null)
  const playShellBoardRowRef = useRef<HTMLDivElement>(null)
  const imperiumRowRef = useRef<HTMLDivElement>(null)
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const turnControlsFooterRef = useRef<HTMLDivElement>(null)
  const historyBannerRef = useRef<HTMLDivElement>(null)
  const roundGainsBannerSlotRef = useRef<HTMLDivElement>(null)
  /** Lock board size per viewport until window resize (play-area content must not rescale the board). */
  const lockedBoardLayoutRef = useRef<{ viewportKey: string; boardEdgePx: number } | null>(null)
  const lockedBannerHeightForBoardRef = useRef(0)
  const remeasureBoardLayoutRef = useRef<((force?: boolean) => void) | null>(null)

  const showTurnControlsFooter =
    !isViewingHistory &&
    (gameState.phase === GamePhase.PLAYER_TURNS ||
      gameState.phase === GamePhase.COMBAT ||
      gameState.phase === GamePhase.END_GAME)

  const endTurnButtonState = getEndTurnButtonState({
    isHistoryView: isViewingHistory,
    canEndTurn: gameState.canEndTurn,
    pendingRewards: gameState.pendingRewards,
    opponentDiscardState: gameState.currTurn?.opponentDiscardState,
    pendingChoices: gameState.currTurn?.pendingChoices || [],
    voiceSelectionActive: Boolean(voiceSelectionRewardId),
    masterstrokeSelectionActive: Boolean(masterstrokeSelectionRewardId),
    memnonHighCouncilSelectionActive: Boolean(memnonHighCouncilRewardId),
  })

  const showFooterEndTurn =
    !isViewingHistory && gameState.phase === GamePhase.PLAYER_TURNS && activePlayer

  const showFooterPassCombat =
    !isViewingHistory && gameState.phase === GamePhase.COMBAT && activePlayer

  const showPlayFooterToolbar = Boolean(
    turnControlsActivePlayer &&
      (gameState.phase === GamePhase.PLAYER_TURNS ||
        gameState.phase === GamePhase.COMBAT ||
        gameState.phase === GamePhase.END_GAME)
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
      const docked = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
      const banner = historyBannerRef.current
      const measuredBanner =
        banner && !banner.hidden ? Math.max(0, Math.ceil(banner.getBoundingClientRect().height)) : 0
      if (!docked && measuredBanner > lockedBannerHeightForBoardRef.current) {
        lockedBannerHeightForBoardRef.current = measuredBanner
      }
      const bannerHeight = docked ? measuredBanner : lockedBannerHeightForBoardRef.current || measuredBanner
      const imperium = imperiumRowRef.current
      const topChrome = imperium
        ? Math.max(0, Math.ceil(imperium.getBoundingClientRect().height))
        : 0
      const playFooterReserved = getPlayFooterReservedPx()
      const tc = turnControlsFooterRef.current
      const turnControlsHeight =
        tc && !tc.hidden ? Math.max(0, Math.ceil(tc.getBoundingClientRect().height)) : 0
      const bottomChrome = turnControlsHeight + bannerHeight
      return { bannerHeight, topChrome, playFooterReserved, bottomChrome }
    }

    const measureBoardMaxEdgeFromArea = () => {
      const area = mainAreaRef.current
      if (!area) return null
      const rect = area.getBoundingClientRect()
      if (rect.width < 80 || rect.height < 80) return null
      return Math.max(160, Math.min(Math.floor(rect.width), Math.floor(rect.height)))
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

      const tc = turnControlsFooterRef.current
      const banner = historyBannerRef.current
      const footerAnchor =
        (tc && !tc.hidden && tc) || (banner && !banner.hidden && banner) || null
      if (!footerAnchor) return

      const playFooterTop = Math.max(0, Math.ceil(footerAnchor.getBoundingClientRect().top))
      const playFooterTopStr = `${playFooterTop}px`
      root.style.setProperty('--play-footer-top', playFooterTopStr)
      document.documentElement.style.setProperty('--play-footer-top', playFooterTopStr)

      const bannerTopEl =
        banner && !banner.hidden ? banner : footerAnchor
      const bannerTop = Math.max(0, Math.ceil(bannerTopEl.getBoundingClientRect().top))
      const bannerTopStr = `${bannerTop}px`
      root.style.setProperty('--history-banner-top', bannerTopStr)
      document.documentElement.style.setProperty('--history-banner-top', bannerTopStr)
    }

    const measurePlayChromeInsets = () => {
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
      const footerMeasured = Number.isFinite(playFooterTop)
        ? Math.max(0, Math.ceil(viewportH - playFooterTop - gapBottom))
        : 0
      const heightPx = `${footerMeasured}px`
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

    const measureBoardMaxEdge = (force = false) => {
      const viewportKey = getViewportLayoutKey()
      const locked = lockedBoardLayoutRef.current
      const docked = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ).matches
      const desktop = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ).matches

      if (!docked && !force && locked?.viewportKey === viewportKey) {
        applyBoardMaxEdge(locked.boardEdgePx)
        requestAnimationFrame(() => {
          measurePlayFooterTop()
          measurePlayChromeInsets()
        })
        return
      }

      measureFooterStack()
      const { topChrome, playFooterReserved, bottomChrome } = readBoardLayoutChrome()
      const shellEl = docked && playShellMainRef.current ? playShellMainRef.current : root
      let shellWidth = Math.max(0, Math.floor(shellEl.getBoundingClientRect().width))
      if (docked) {
        const sidebarRaw = getComputedStyle(document.documentElement)
          .getPropertyValue('--play-history-sidebar-width')
          .trim()
        const sidebarW = Number.parseFloat(sidebarRaw)
        if (Number.isFinite(sidebarW) && sidebarW > 0) {
          shellWidth = Math.max(0, shellWidth - Math.ceil(sidebarW))
        }
      }
      const shellHeight = Math.max(0, Math.floor(shellEl.getBoundingClientRect().height))
      const viewportH = window.visualViewport?.height ?? window.innerHeight
      const gapBottom = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--vv-layout-gap-bottom')
      ) || 0
      const layoutGap = docked ? 4 : desktop ? 6 : 10
      const boardStackFoot = docked || desktop
        ? Math.max(bottomChrome, playFooterReserved * 0.5)
        : bottomChrome + playFooterReserved
      const availableH =
        docked && shellHeight > 0
          ? shellHeight - topChrome - boardStackFoot - layoutGap
          : viewportH - boardStackFoot - topChrome - layoutGap - gapBottom
      let boardEdge = Math.max(160, Math.min(shellWidth, Math.floor(availableH)))

      const fromArea = measureBoardMaxEdgeFromArea()
      if (fromArea) {
        boardEdge = Math.max(boardEdge, fromArea)
      }

      if (!docked) {
        lockedBoardLayoutRef.current = { viewportKey, boardEdgePx: boardEdge }
      } else {
        lockedBoardLayoutRef.current = null
      }
      applyBoardMaxEdge(boardEdge)
      requestAnimationFrame(() => {
        const refined = measureBoardMaxEdgeFromArea()
        if (refined && refined > boardEdge) {
          applyBoardMaxEdge(refined)
        }
        measurePlayFooterTop()
        measurePlayChromeInsets()
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

    const scheduleBoardMeasure = (force = false) => {
      cancelAnimationFrame(boardFrame)
      boardFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => measureBoardMaxEdge(force))
      })
    }

    const onFooterResize = () => scheduleFooterMeasure()

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement
        if (target === turnControlsFooterRef.current) {
          onFooterResize()
        } else if (target === historyBannerRef.current) {
          scheduleFooterMeasure()
          scheduleBoardMeasure(true)
        } else if (
          target === imperiumRowRef.current ||
          target === mainAreaRef.current ||
          target === playShellBoardRowRef.current ||
          target === playShellMainRef.current
        ) {
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
    if (mainAreaRef.current) ro.observe(mainAreaRef.current)
    if (playShellMainRef.current) ro.observe(playShellMainRef.current)
    if (playShellBoardRowRef.current) ro.observe(playShellBoardRowRef.current)
    ro.observe(root)

    const desktopMq = window.matchMedia(DESKTOP_PLAY_LAYOUT_MQ)
    const dockedMq = window.matchMedia(DOCKED_HISTORY_LAYOUT_MQ)
    const onLayoutMqChange = () => {
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      scheduleFooterMeasure()
      scheduleBoardMeasure(true)
    }
    desktopMq.addEventListener('change', onLayoutMqChange)
    dockedMq.addEventListener('change', onLayoutMqChange)

    const onViewportResize = () => {
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      scheduleBoardMeasure(true)
    }

    scheduleFooterMeasure()
    scheduleBoardMeasure(true)

    window.addEventListener('resize', onViewportResize)
    window.visualViewport?.addEventListener('resize', onViewportResize)

    return () => {
      remeasureBoardLayoutRef.current = null
      cancelAnimationFrame(footerFrame)
      cancelAnimationFrame(boardFrame)
      ro.disconnect()
      desktopMq.removeEventListener('change', onLayoutMqChange)
      dockedMq.removeEventListener('change', onLayoutMqChange)
      window.removeEventListener('resize', onViewportResize)
      window.visualViewport?.removeEventListener('resize', onViewportResize)
      lockedBoardLayoutRef.current = null
      lockedBannerHeightForBoardRef.current = 0
      root.style.removeProperty('--footer-measured-height')
      root.style.removeProperty('--turn-controls-measured-height')
      root.style.removeProperty('--play-top-chrome-height')
      root.style.removeProperty('--play-board-max-edge')
      root.style.removeProperty('--play-footer-top')
      root.style.removeProperty('--play-board-bottom')
      root.style.removeProperty('--combat-troop-dock-top')
      document.documentElement.style.removeProperty('--footer-measured-height')
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
    isViewingHistory,
    showTurnControlsFooter,
    isPlayChromeHeld,
    isMobilePlayView,
    isDesktopPlayView,
    isDockedHistoryLayout,
    isTurnHistoryOpen,
    viewingTurnIndex,
    useImageBoard,
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
          canPlaceAgent={isViewingHistory ? false : !gameState.canEndTurn}
          combatTroops={displayState.combatTroops}
          players={displayState.players}
          factionInfluence={displayState.factionInfluence}
          currentConflict={displayState.currentConflict}
          bonusSpice={displayState.bonusSpice}
          onSelectiveBreedingRequested={handleSelectiveBreedingRequested}
          recallMode={
            isViewingHistory
              ? false
              : Boolean(gameState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED'))
          }
          ignoreCosts={
            isViewingHistory
              ? false
              : Boolean(
                  getSelectedCard(gameState)?.playEffect?.find(
                    e => e.reward?.custom === CustomEffect.KWISATZ_HADERACH
                  )
                )
          }
          voiceSelectionActive={isViewingHistory ? false : Boolean(voiceSelectionRewardId)}
          onVoiceSpaceSelect={handleVoiceSpaceSelect}
          blockedSpaces={displayState.blockedSpaces || []}
          gameStateForMarkers={displayState}
          combatStrength={displayState.combatStrength ?? gameState.combatStrength}
          controlMarkers={displayState.controlMarkers}
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
    ]
  )

  const holdToHidePlayChrome = isMobilePlayView && useImageBoard
  const showTurnHistoryPanel = isDockedHistoryLayout || isTurnHistoryOpen

  return (
    <div
      ref={gameContainerRef}
      className={[
        'game-container',
        'game-container--play',
        isDesktopPlayView ? 'game-container--desktop-play' : '',
        isDockedHistoryLayout ? 'game-container--history-docked' : '',
        isViewingHistory ? 'viewing-history' : '',
        isPlayChromeHeld ? 'play-chrome-held' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div ref={playShellMainRef} className="play-shell-main">
      <div ref={imperiumRowRef} className="imperium-row-container">
        <ImperiumRow 
        canAcquire={isViewingHistory ? false : gameState.canAcquireIR}
        cards={displayState.imperiumRow} 
        alCount={displayState.arrakisLiaisonDeck.length} 
        smfCount={displayState.spiceMustFlowDeck.length} 
        persuasion={isViewingHistory ? 0 : (activePlayer?.persuasion || 0)} 
        onAcquireArrakisLiaison={handleAcquireArrakisLiaison} 
        onAcquireSpiceMustFlow={handleAcquireSpiceMustFlow} 
        onAcquireCard={handleAcquireCard}
        helenaRemovedCard={displayState.helenaRemovedCard ?? null}
        activePlayerId={displayState.activePlayerId} />
      </div>
      <div
        ref={playShellBoardRowRef}
        className={[
          'play-shell-board-row',
          isDockedHistoryLayout && showTurnHistoryPanel ? 'play-shell-board-row--with-history' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div ref={mainAreaRef} className="main-area play-shell-board">
          {useImageBoard ? (
            renderImageBoard()
          ) : (
            <GameBoard
              currentPlayer={displayState.activePlayerId}
              highlightedAreas={isViewingHistory ? [] : getSelectedCardAgentIcons(gameState)}
              infiltrate={isViewingHistory ? false : getInfiltrate(gameState)}
              onSpaceClick={isViewingHistory ? () => {} : handlePlaceAgent}
              occupiedSpaces={displayState.occupiedSpaces}
              canPlaceAgent={isViewingHistory ? false : !gameState.canEndTurn}
              combatTroops={displayState.combatTroops}
              players={displayState.players}
              factionInfluence={displayState.factionInfluence}
              currentConflict={displayState.currentConflict}
              bonusSpice={displayState.bonusSpice}
              onSelectiveBreedingRequested={handleSelectiveBreedingRequested}
              recallMode={
                isViewingHistory
                  ? false
                  : Boolean(gameState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED'))
              }
              ignoreCosts={
                isViewingHistory
                  ? false
                  : Boolean(
                      getSelectedCard(gameState)?.playEffect?.find(
                        e => e.reward?.custom === CustomEffect.KWISATZ_HADERACH
                      )
                    )
              }
              voiceSelectionActive={isViewingHistory ? false : Boolean(voiceSelectionRewardId)}
              onVoiceSpaceSelect={handleVoiceSpaceSelect}
              blockedSpaces={displayState.blockedSpaces || []}
            />
          )}
        </div>
        {showTurnHistoryPanel && isDockedHistoryLayout && (
          <TurnHistory
            layout="docked"
            turns={gameState.history}
            currentTurn={Math.max(0, gameState.history.length - 1)}
            viewingTurnIndex={viewingTurnIndex}
            players={gameState.players}
            currentGameState={gameState}
            onTurnChange={goToTurn}
            onReturnToCurrent={returnToCurrent}
            onUndoToTurn={turnIndex => dispatch({ type: 'UNDO_TO_TURN', turnIndex })}
          />
        )}
      </div>
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
        <div className="round-start-container" hidden={isViewingHistory || gameState.phase !== GamePhase.ROUND_START || needsImperiumSelection}>
        <ConflictSelect
          conflicts={(() => {
            const tierForRound = gameState.currentRound === 1 ? 1 : gameState.currentRound <= 6 ? 2 : 3
            return CONFLICTS.filter(
              c => c.tier === tierForRound && !gameState.conflictsDiscard.includes(c)
            )
          })()}
          currentRound={gameState.currentRound}
          handleConflictSelect={handleConflictSelect}
        />
      </div>
      <div className="turn-controls-spacer" />
      {useImageBoard && !isViewingHistory && activePlayer && (
        <div className="combat-troop-dock" data-marker="combat-troop-controls">
          <div className="combat-troop-dock__anchor">
            <CombatTroopControls
              canDeploy={Boolean(gameState.currTurn?.canDeployTroops)}
              deployableTroops={Math.min(
                (gameState.currTurn?.troopLimit || 0) -
                  (gameState.currTurn?.removableTroops || 0),
                activePlayer.troops || 0
              )}
              retreatableTroops={gameState.currTurn?.removableTroops || 0}
              garrisonTroops={activePlayer.troops || 0}
              onDeploy={() => handleAddTroop(activePlayer.id)}
              onRetreat={() => handleRemoveTroop(activePlayer.id)}
            />
          </div>
        </div>
      )}
        <div
          ref={turnControlsFooterRef}
          className="turn-controls-container"
          hidden={turnControlsState.phase !== GamePhase.PLAYER_TURNS && turnControlsState.phase !== GamePhase.COMBAT && turnControlsState.phase !== GamePhase.END_GAME}
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
            combatStrength={turnControlsState.combatStrength}
            combatPasses={turnControlsState.combatPasses}
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
            recallMode={!isViewingHistory && Boolean(gameState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED'))}
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
            autoAppliedRewardSummary={autoAppliedRewardSummary}
            agentPlaced={Boolean(turnControlsState.currTurn?.agentSpace)}
            opponentDiscardState={isViewingHistory ? undefined : gameState.currTurn?.opponentDiscardState}
            onOpponentDiscardChoice={handleOpponentDiscardChoice}
            onOpponentDiscardCard={handleOpponentDiscardCard}
            combatTroops={turnControlsState.combatTroops}
            onVoiceSelectionStart={handleVoiceSelectionStart}
            voiceSelectionActive={!isViewingHistory && Boolean(voiceSelectionRewardId)}
            onVoiceSelectionCancel={handleVoiceSelectionCancel}
            onMasterstrokeSelectionStart={handleMasterstrokeSelectionStart}
            masterstrokeSelectionActive={!isViewingHistory && Boolean(masterstrokeSelectionRewardId)}
            onMemnonHighCouncilSelectionStart={handleMemnonHighCouncilSelectionStart}
            memnonHighCouncilSelectionActive={!isViewingHistory && Boolean(memnonHighCouncilRewardId)}
            onOpponentNoCardAck={handleOpponentNoCardAck}
            intrigueDeck={turnControlsState.intrigueDeck}
            gamePhase={turnControlsState.phase}
            activeIntrigueThisRound={turnControlsActivePlayer ? (turnControlsState.activeIntrigueThisRound?.[turnControlsActivePlayer.id] || []) : []}
            gameState={turnControlsState}
            isHistoryView={isViewingHistory}
            roundGainsBannerSlotRef={roundGainsBannerSlotRef}
          />
        </div>
      {/* Navigator / status strip — below play area so the board can use full height. */}
      <div
        ref={historyBannerRef}
        className={[
          'history-viewing-banner',
          'play-shell-nav',
          isTurnHistoryOpen && !isDockedHistoryLayout ? 'history-viewing-banner--panel-open' : '',
          isViewingHistory ? 'history-viewing-banner--scrubbing' : '',
          holdToHidePlayChrome ? 'history-viewing-banner--hold-peek' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={holdToHidePlayChrome ? 'Hold empty area to view board' : undefined}
        onContextMenu={e => {
          if (holdToHidePlayChrome) e.preventDefault()
        }}
        onPointerDown={e => {
          if (!holdToHidePlayChrome || e.button !== 0) return
          if ((e.target as HTMLElement).closest('button')) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          setPlayChromeHeld(true)
        }}
        onPointerUp={e => endPlayChromeHold(e.currentTarget, e.pointerId)}
        onPointerCancel={e => endPlayChromeHold(e.currentTarget, e.pointerId)}
        onLostPointerCapture={() => setPlayChromeHeld(false)}
      >
        <div className="history-banner-leading">
          {showPlayFooterToolbar && turnControlsActivePlayer && (
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
          <div
            ref={roundGainsBannerSlotRef}
            className="history-banner-round-gains"
            aria-live="polite"
          />
        </div>
        <div className="history-banner-center">
          {isViewingHistory && historyBannerPlayer ? (
            <LeaderResourceStrip
              compact
              player={historyBannerPlayer}
              gameState={displayState}
            />
          ) : (
            !isViewingHistory &&
            turnControlsActivePlayer && (
              <LeaderResourceStrip
                compact
                player={turnControlsActivePlayer}
                gameState={gameState}
              />
            )
          )}
          <span className="history-banner-turn-label">
            { viewingTurnIndex === null ? `Turn ${gameState.history.length}, round ${gameState.currentRound}` : (viewingTurnIndex === 0 ? `Initial state` : `Turn ${viewingTurnIndex} of ${gameState.history.length}`) }
          </span>
        </div>
        <div className="history-banner-actions">
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
            >
              Pass Combat
            </button>
          )}
        </div>
      </div>
      </div>
      {showTurnHistoryPanel && !isDockedHistoryLayout && (
        <TurnHistory
          layout="overlay"
          turns={gameState.history}
          currentTurn={Math.max(0, gameState.history.length - 1)}
          viewingTurnIndex={viewingTurnIndex}
          players={gameState.players}
          currentGameState={gameState}
          onTurnChange={goToTurn}
          onReturnToCurrent={returnToCurrent}
          onUndoToTurn={turnIndex => dispatch({ type: 'UNDO_TO_TURN', turnIndex })}
          onClose={() => {
            setIsTurnHistoryOpen(false)
            returnToCurrent()
          }}
        />
      )}
        <div className="endgame-container" hidden={isViewingHistory || gameState.phase !== GamePhase.END_GAME}>
          <div style={{ color: 'white', marginTop: '12px' }}>
            <h3>Endgame</h3>
            <div>
              Done: {gameState.endgameDonePlayers?.size || 0}/{gameState.players.length}
            </div>
            <button
              type="button"
              onClick={handleResolveEndgame}
              disabled={(gameState.endgameDonePlayers?.size || 0) < gameState.players.length}
              title={(gameState.endgameDonePlayers?.size || 0) < gameState.players.length ? 'All players must End Turn before resolving Endgame.' : undefined}
            >
              Resolve Endgame
            </button>
            {gameState.endgameWinners && (
              <div style={{ marginTop: '8px' }}>
                Winner(s): {gameState.endgameWinners.map(id => gameState.players.find(p => p.id === id)?.leader.name || `P${id}`).join(', ')}
              </div>
            )}
          </div>
      </div>
      <div className="combat-results-container" hidden={gameState.phase !== GamePhase.COMBAT_REWARDS}>
        <CombatResults
          players={gameState.players}
          combatStrength={gameState.combatStrength}
          history={gameState.history}
          onConfirm={handleConfirmCombat}
          pendingConflictRewardChoices={gameState.pendingConflictRewardChoices}
          onResolveConflictChoice={(choiceId, reward) =>
            dispatch({ type: 'RESOLVE_CONFLICT_REWARD_CHOICE', choiceId, reward })
          }
        />
      </div>
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
    </div>
  )
}

function getInfiltrate(gameState: GameState): boolean {
  return Boolean(getSelectedCard(gameState)?.infiltrate)
}

/** While choosing a board space the card stays in deck; after PLACE_AGENT it lives in playArea — check both */
function getSelectedCard(gameState: GameState): Card | null {
  const id = gameState.selectedCard
  if (id === null || id === undefined) return null
  const player = gameState.players[gameState.activePlayerId]
  if (!player) return null
  return player.deck.find(c => c.id === id) ?? player.playArea.find(c => c.id === id) ?? null
}

/** Board hotspots: only while picking a space — not after agent is placed for this action (`currTurn.agentSpace`). */
function getSelectedCardAgentIcons(gameState: GameState): AgentIcon[] {
  if (gameState.currTurn?.agentSpace) return []
  const card = getSelectedCard(gameState)
  if (!card) return []
  const base = [...card.agentIcons]
  if (gameState.dispatchEnvoyActive?.[gameState.activePlayerId]) {
    return mergeDispatchEnvoyIcons(base)
  }
  return base
}

// Wrapper component that provides TimeTravel context to GameContent
interface GameContentWithTimeTravelProps {
  autoApplyMandatoryRewards: boolean
}

const GameContentWithTimeTravel = ({ autoApplyMandatoryRewards }: GameContentWithTimeTravelProps) => {
  const { gameState, dispatch } = useGame()
  
  const handleUndoToTurn = (turnIndex: number) => {
    dispatch({ type: 'UNDO_TO_TURN', turnIndex })
  }
  
  return (
    <TimeTravelProvider gameState={gameState} onUndoToTurn={handleUndoToTurn}>
      <GameContent autoApplyMandatoryRewards={autoApplyMandatoryRewards} />
    </TimeTravelProvider>
  )
}

function App() {
  const [screenState, setScreenState] = useState<ScreenState>(ScreenState.SETUP)
  const [autoApplyMandatoryRewards, setAutoApplyMandatoryRewards] = useState(() => {
    return localStorage.getItem('myMentat.autoApplyMandatoryRewards') !== 'false'
  })
  const [creatorReturnScreen, setCreatorReturnScreen] = useState<ScreenState>(ScreenState.SETUP)
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [initialGameState, setInitialGameState] = useState<{
    players: Player[]
    currentRound: number
    imperiumRowDeck: Card[]
  } | null>(null)
  const [setupImperiumDeck, setSetupImperiumDeck] = useState<Card[]>(() => buildImperiumDeck())

  useEffect(() => {
    localStorage.setItem('myMentat.autoApplyMandatoryRewards', autoApplyMandatoryRewards ? 'true' : 'false')
  }, [autoApplyMandatoryRewards])

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

  const handleSetupComplete = (setups: PlayerSetup[]) => {
    setPlayerSetups(setups)
    if (setups.every(s => !s.leader.sogChoice)) {
      setScreenState(ScreenState.GAME_STATE_SETUP)
    } else {
      setCurrentPlayerIndex(0)
      setScreenState(ScreenState.LEADER_CHOICES)
    }
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

  const handleGameStateSetupComplete = (state: { players: Player[], currentRound: number, imperiumRowDeck: Card[] }) => {
      setInitialGameState(state)
      setSetupImperiumDeck(state.imperiumRowDeck)
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
        <GameSetup onComplete={handleSetupComplete} />
      )}

      {screenState === ScreenState.LEADER_CHOICES && renderLeaderChoices()}

      {screenState === ScreenState.CARD_CREATOR && (
        <CardCreator onBack={handleCloseCardCreator} />
      )}

      {screenState === ScreenState.GAME_STATE_SETUP && (
        <GameStateSetup 
          playerSetups={playerSetups}
          onComplete={handleGameStateSetupComplete}
          onOpenCardCreator={handleOpenCardCreator}
          autoApplyMandatoryRewards={autoApplyMandatoryRewards}
          onAutoApplyMandatoryRewardsChange={setAutoApplyMandatoryRewards}
        />
      )}

      {screenState === ScreenState.GAME && initialGameState && (
        <GameProvider initialState={{
          players: initialGameState.players,
          currentRound: initialGameState.currentRound,
          firstPlayerMarker: firstPlayerId,
          activePlayerId: firstPlayerId,
          factionInfluence:{
            [FactionType.EMPEROR]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.SPACING_GUILD]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.BENE_GESSERIT]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.FREMEN]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0]))
          },
          phase: GamePhase.ROUND_START,
          imperiumRowDeck: setupImperiumDeck
        }}>
          <GameContentWithTimeTravel autoApplyMandatoryRewards={autoApplyMandatoryRewards} />
        </GameProvider>
      )}
    </div>
  )
}

export default App
