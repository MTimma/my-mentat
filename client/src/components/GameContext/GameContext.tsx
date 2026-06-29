/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useRef, useState } from 'react'
import { TimeTravelProvider } from '../TimeTravel'
import { GameContext } from './gameContextState'
import { buildHistoryFromEvents, historyIndexToEventIndex } from '../../save/buildHistory'
import { buildInitialStateFromSaveDoc } from '../../save/buildInitialStateFromSaveDoc'
import { replayEvents } from '../../save/replay'
import {
  assertJsonSerializable,
  computeChecksum,
  isReplayable,
  SANDBOX_SETUP_HISTORY_ACTIONS,
  shouldRecordEvent,
  truncateSandboxEventsForSetupReedit,
} from '../../save/recording'
import { buildInitialState } from '../../save/buildInitialState'
import type { TechTileId } from '../../data/techTiles'
import { TECH_TILES } from '../../data/techTiles'
import {
  applyAfterConflictTechEffects,
  applyEndgameTechScoring,
  applyRevealTechEffects,
  applyRoundStartTech,
  applyTechNegotiatorReward,
  applyBountyInfiltrationBonus,
  applyDesertAmbush,
  applyFullScaleDreadSwords,
  applyGuildAccordDiscount,
  applyImperialBasharSwords,
  applyIxianEngineerVp,
  applyNegotiatedWithdrawal,
  applyShockTrooperBonus,
  applyTreacheryDoubleInfluence,
  applyWebOfPower,
  applyWeirdingWayExtraTurn,
  buildIxBoardFromFaceUpTiles,
  buildIxBoardFromSandboxStackTops,
  claimAcquireTechReward,
  consumeExtraTurn,
  handleAcquireTech,
  handleActivateTech,
  handleTechNegotiator,
  applyHoloprojectorsDiscard,
  applyInvasionShipsDiscard,
  applySonicSnoopersDraw,
  applySonicSnoopersReturn,
  heighlinerDiscountForPlayer,
  markMandatoryDeploy,
  shouldConsumeExtraTurn,
  syncSpaceportAcquireToTop,
} from './riseOfIxReducer'
import { SAVE_SCHEMA_VERSION, type EventEntry, type SaveDoc, type SetupBlock } from '../../save/types'
import {
  GameState,
  FactionType,
  ConflictCard,
  IntrigueCard,
  Card,
  Cost,
  Reward,
  ConflictReward,
  Winners as Placements,
  IntrigueCardType,
  TurnType,
  SpaceProps,
  GamePhase,
  CardEffect,
  Player,
  ControlMarkerType,
  RewardType,
  GainSource,
  Gain,
  MakerSpace,
  PlayEffect,
  RevealEffect,
  GameTurn,
  OptionalEffect,
  PendingChoice,
  CardSelectChoice,
  FixedOptionsChoice,
  ChoiceOption,
  CustomEffect,
  ChoiceType,
  CardPile,
  AgentIcon,
  PendingReward,
  AUTO_APPLIED_CUSTOM_EFFECTS,
  EffectTiming,
  NO_EXPANSIONS,
  normalizeExpansions,
  type SandboxSetupPosition,
} from '../../types/GameTypes'
import { BOARD_SPACES, ARRAKIS_LIAISON_DECK, buildImperiumDeck, buildTleilaxuPool, SPICE_MUST_FLOW_DECK, FOLDSPACE_DECK } from '../../catalog/runtime'
import {
  canPlayerVisitBoardSpaceOnce,
  boardSpaceById,
  isBoardSpaceAvailableForExpansions,
} from '../../data/boardSpaceAvailability'
import { getConflictPool } from '../../data/conflicts'
import { buildIntrigueDeck } from '../../services/IntrigueDeckService'
import { PLAY_EFFECT_TEXTS } from '../../data/effectTexts'
import { getIntrigueCardByCustom } from '../../services/IntrigueDeckService'
import { intrigueCardHasCustom, intrigueHasPhaseEffect } from '../../utils/intrigueCardCustom'
import { playRequirementSatisfied, revealRequirementSatisfied, intrigueRequirementSatisfied } from './requirements'
import {
  MAX_INFLUENCE,
  updateFactionInfluence,
  getTotalVictoryPoints,
  mergePlayerAfterFactionInfluence,
  syncPlayerResourcesWithMilestoneState,
  type InfluenceMilestoneMeta,
} from '../../utils/influenceVictoryPoints'
import {
  GAINED_EFFECT_KWISATZ_FROM_BOARD,
  GAINED_EFFECT_RECALL_REQUIRED,
  isKwisatzAgentSourceChoice,
  isKwisatzHaderachCard,
} from '../../utils/kwisatzHaderach'
import {
  endgameHasPendingWork,
  findRevealedEndgameCard,
  getNextEndgameRevealPlayerId,
  revealEndgameIntrigueSelection,
  resolveEndgameWinners,
} from '../../utils/endgameResolution'
import {
  canAffordInfluenceOptionalEffect,
  canPayInfluenceCost,
  createGainInfluenceChoice,
  createLoseInfluenceChoice,
  requiresInfluenceChoices,
} from '../../utils/influenceChoices'
import { conflictInfluenceGainName } from '../../utils/influenceDisplay'
import { dreadnoughtStrengthEach } from '../../data/leaderAbilities/rhomburDreadnoughtStrength'
import {
  applyDreadnoughtControlPlacement,
  applySandboxDreadnoughtControl,
  buildDreadnoughtControlChoices,
  handleDreadnoughtReward,
  resolveCommissionDreadnoughtChoice,
  resolveNonWinnerDreadnoughts,
  returnExpiredDreadnoughtControls,
  getRemainingDeploySlots,
} from '../../utils/dreadnoughtLifecycle'
import { controlBonusOwner, playerHasUnitsInCombat } from '../../utils/dreadnoughts'
import {
  applyDeployTroopsAllowance,
  getRemainingTheseTroopsDeploySlots,
  isDeployTheseRecruitedTroops,
  recruitTroopsToGarrison,
  returnConflictUnitsToSupply,
} from '../../utils/troops'
import {
  isSandboxIxBoardReady,
  isSandboxStackTopsValid,
  playerTechTileIds,
  tilesAvailableForBoard,
} from '../../utils/sandboxTechTiles'
import { resolveSignetRingEffect } from '../../data/signetRingEffects'
import { checkAndApplyMasterstroke, revertMasterstrokeIfNeeded } from '../../data/leaderAbilities'
import { getResolvedRewardForPlayer } from '../../data/leaderAbilities/arianaHarvest'
import {
  findPowerPlayInfluenceTarget,
  resolvePowerPlayOnPendingRewards,
  applyPowerPlayBonusAfterInfluenceClaimed,
} from '../../data/leaderAbilities/powerPlay'
import { canPlaceDespiteOccupancy } from '../../data/leaderAbilities/helenaUnblockedAgents'
import { shouldGrantIlbanSolariDraw } from '../../data/leaderAbilities/ilbanSolariDraw'
import { getEffectiveSolariCost } from '../../data/leaderAbilities/letoLandsraadDiscount'
import { shouldGrantMemnonInfluence, buildMemnonInfluenceReward } from '../../data/leaderAbilities/memnonHighCouncilInfluence'
import { applyLeaderStartingResourceDelta } from '../../data/leaderAbilities/beastSetup'
import {
  shouldGrantYunaSolariBonus,
  applyYunaSolariBonus,
} from '../../data/leaderAbilities/yunaSolariBonus'
import {
  shouldOfferArmandTrashChoice,
  buildArmandTrashChoice,
} from '../../data/leaderAbilities/armandTrashInPlay'
import {
  buildIlesaSetAsideChoice,
  resolveIlesaSetAside,
  shouldGrantIlesaPlayBonus,
  buildIlesaPlayBonusReward,
  clearIlesaSetAside,
  prepareIlesaPlayersForRound,
  prepareIlesaSecondTurnCard,
  beginIlesaSetAsideTurn,
} from '../../data/leaderAbilities/ilesaSetAside'
import { seedTessiaSnoopers, tryTessiaSnooperClaim } from '../../data/leaderAbilities/tessiaSnoopers'
import { countSpiceMustFlowCards } from '../../utils/spiceMustFlow'
import { applySandboxDeckEdit } from '../../utils/sandboxDeckPools'
import { getOpponentDiscardableCards, validateDiscardCostSelection, isCardInHand } from '../../utils/playAreaDisplay'
import { collectLiveIds, mintId, nextSemanticId } from '../../utils/semanticIds'
import {
  applyDividendsReward,
  applyFreighterAdvance,
  applyFreighterRecall,
  hasAvailableTechTile,
  isRiseOfIxEnabled,
  pushFreighterChoicesFromReward,
  stripFreighterFromReward,
  rewardHasFreighter,
} from './riseOfIx/freighter'
import {
  applyRiseOfIxConflictPlacementRewards,
  enqueueConflictAcquireTech,
} from './riseOfIx/conflictRewards'
import {
  buildMayOptionalEffect,
  effectIsOptional,
} from './riseOfIx/optionalMayEffects'
import {
  buildTechNegotiationChoice,
  TECH_NEGOTIATION_SPACE_ID,
} from './riseOfIx/boardSpaceChoices'
import {
  applyRiseOfIxIntrigueCustomInEffect,
  applyQuidProQuo,
  canPlayStrongarm,
  checkDiversionAfterDeployChange,
  enqueueStrongarmChoice,
  grantStrategicPushSolari,
  intrigueEffectNeedsDeferral,
} from './riseOfIx/intrigue'
import { fireUnloadIfApplicable, withUnloadForNewlyTrashedCards } from './riseOfIx/unload'
import { isMandatoryRecruitAndDeployEffect, applyImmediateTroopRecruit } from './riseOfIx/mandatoryDeploy'
import {
  advanceResearch,
  advanceTleilaxuTrack,
  resolveResearchBranch,
  setResearchNode,
  setTleilaxuStep,
} from '../../expansions/immortality/reducer'
import {
  getGraftPartner,
  graftPairHasInfiltrate,
  isGholaCard,
  isUsurpCard,
  resolveGraftCards,
} from '../../expansions/immortality/graft'
import {
  applyImmortalityAutoCustom,
  gholaCopyPartnerPlayEffects,
  queueImmortalityPendingCustom,
  type ImmortalityPlayContext,
} from '../../expansions/immortality/customEffects'

/** Merge RoI unit fields without clobbering resources already adjusted this placement. */
function mergeRoiUnitFieldsFromRefreshed(target: Player, refreshed: Player): void {
  if (refreshed.dreadnoughts) target.dreadnoughts = refreshed.dreadnoughts
  if (refreshed.negotiatorsOnIx != null) target.negotiatorsOnIx = refreshed.negotiatorsOnIx
  if (refreshed.troopSupply != null) target.troopSupply = refreshed.troopSupply
}

type GainAttribution = { type: GainSource; id: number; name: string }

function withUnloadAfterCardRemoved(
  state: GameState,
  playerId: number,
  card: Card | undefined,
  reason: 'discard' | 'trash'
): GameState {
  if (!card) return state
  return resolveMandatoryTroopDeploy(
    fireUnloadIfApplicable(state, playerId, card, reason),
    playerId
  )
}

/** Treachery (and similar): auto-deploy all troops from a mandatory recruit+deploy effect. */
function resolveMandatoryTroopDeploy(state: GameState, playerId: number): GameState {
  if (!state.currTurn?.mandatoryDeployTroops) return state
  let next = state
  for (let attempt = 0; attempt < 20; attempt++) {
    if (getRemainingTheseTroopsDeploySlots(next) <= 0) break
    const player = next.players.find(p => p.id === playerId)
    if (!player || player.troops <= 0) break
    const before = next.combatTroops[playerId] ?? 0
    next = gameReducer(next, { type: 'DEPLOY_TROOP', playerId })
    if ((next.combatTroops[playerId] ?? 0) <= before) break
  }
  if (!next.currTurn) return next
  const slotsLeft = getRemainingTheseTroopsDeploySlots(next)
  return {
    ...next,
    currTurn: {
      ...next.currTurn,
      mandatoryDeployTroops: slotsLeft > 0 ? next.currTurn.mandatoryDeployTroops : false,
    },
  }
}

type CustomEffectData = {
  cardId?: number
  gainSource?: GainAttribution
  [key: string]: unknown
}

export type GameAction = 
  | { type: 'END_TURN'; playerId: number }
  | { type: 'PLAY_CARD'; playerId: number; cardId: number; deckIndex?: number }
  | { type: 'DEPLOY_TROOP'; playerId: number }
  | { type: 'UNDEPLOY_TROOP'; playerId: number }
  | { type: 'DEPLOY_DREADNOUGHT'; playerId: number }
  | { type: 'UNDEPLOY_DREADNOUGHT'; playerId: number }
  | { type: 'DEPLOY_NEGOTIATOR'; playerId: number }
  | { type: 'UNDEPLOY_NEGOTIATOR'; playerId: number }
  | {
      type: 'RETREAT_TROOP'
      playerId: number
      /** Card/ability retreat (not deploy UI undo). */
      fromEffect?: boolean
      /** Immediate retreat from a choice (e.g. Master Tactician); does not consume effect allowance. */
      bypassAllowance?: boolean
    }
  | { type: 'PLAY_INTRIGUE'; cardId: number; playerId: number; targetPlayerId?: number }
  | { type: 'MOBILIZE_GARRISON'; playerId: number; count: number }
  | { type: 'MOBILIZE_SECOND_WAVE'; playerId: number; troops: number; dreadnoughts: number }
  | { type: 'ACQUIRE_CARD'; playerId: number; cardId: number; freeAcquire?: boolean; acquireToTop?: boolean }
  | { type: 'PLAY_COMBAT_INTRIGUE'; playerId: number; cardId: number }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'RESOLVE_CONFLICT_REWARD_CHOICE'; choiceId: string; optionIndex?: number; reward?: Reward }
  | { type: 'START_COMBAT_PHASE' }
  | { type: 'PASS_COMBAT'; playerId: number }
  | { type: 'PLACE_AGENT'; playerId: number; spaceId: number; sellMelangeData?: { spiceCost: number; solariReward: number }; selectiveBreedingData?: { trashedCardId: number } }
  | { type: 'REVEAL_CARDS'; playerId: number; cardIds: number[] }
  | { type: 'ACQUIRE_AL'; playerId: number; acquireToTop?: boolean }
  | { type: 'ACQUIRE_SMF'; playerId: number; acquireToTop?: boolean }
  | { type: 'PAY_COST'; playerId: number; effectId?: string; data?: { trashedCardId?: number }; effect?: OptionalEffect }
  | { type: 'RESOLVE_CHOICE'; playerId: number; choiceId: string; optionIndex?: number; reward?: Reward; source?: { type: string; id: number; name: string } }
  | { type: 'RESOLVE_CARD_SELECT'; playerId: number; choiceId: string; cardIds: number[] }
  | { type: 'CUSTOM_EFFECT'; playerId: number; customEffect: CustomEffect; data: CustomEffectData }
  | { type: 'TRASH_CARD'; playerId: number; cardId: number; gainReward?: Reward; source?: GainAttribution }
  | { type: 'SELECT_CONFLICT'; conflictId: number }
  | { type: 'CLAIM_REWARD'; playerId: number; rewardId: string; customData?: CustomEffectData }
  | { type: 'CLAIM_ALL_REWARDS'; playerId: number }
  | { type: 'RESET_IMPERIUM_ROW'; cardIds: number[] }
  | { type: 'SELECT_IMPERIUM_REPLACEMENT'; cardId: number }
  | { type: 'OPPONENT_DISCARD_CHOICE'; playerId: number; opponentId: number; choice: 'discard' | 'loseTroop' }
  | { type: 'OPPONENT_DISCARD_CARD'; playerId: number; opponentId: number; cardId: number }
  | { type: 'OPPONENT_DISCARD_CARDS'; playerId: number; opponentId: number; cardIds: number[] }
  | { type: 'OPPONENT_NO_CARD_ACK'; playerId: number; opponentId: number }
    | { type: 'UNDO_TO_TURN'; turnIndex: number }
    | { type: 'UNDO_TO_SETUP' }
    | { type: 'RESOLVE_ENDGAME' }
    | { type: 'REVEAL_ENDGAME_INTRIGUE'; playerId: number; cardIds: number[] }
    | { type: 'SANDBOX_SET_IMPERIUM_ROW'; cardIds: number[] }
    | { type: 'SANDBOX_SET_CONFLICT'; conflictId: number }
    | { type: 'SANDBOX_UPDATE_PLAYER'; playerId: number; patch: Partial<Player> }
    | { type: 'SANDBOX_SET_CONTROL_MARKER'; space: ControlMarkerType; playerId: number | null }
    | { type: 'SANDBOX_SET_DREADNOUGHT_CONTROL'; space: ControlMarkerType; playerId: number | null }
    | { type: 'SANDBOX_SET_MENTAT_OWNER'; playerId: number | null }
    | { type: 'SANDBOX_SET_PLAYER_INFLUENCE'; playerId: number; faction: FactionType; value: number }
    | { type: 'SANDBOX_SET_POSITION'; round: number | null; playerTurn: number | null }
    | { type: 'SANDBOX_SET_IX_BOARD_TOP'; stackTops: Array<TechTileId | null> }
    | { type: 'SANDBOX_COMMIT_SETUP' }
    | { type: 'RESTORE_STATE'; state: GameState }
    | {
        type: 'ACQUIRE_TECH'
        playerId: number
        tileId: TechTileId
        stackIndex: number
        negotiatorsReturned: number
        discount: number
        nextFaceUpTileId?: TechTileId
      }
    | { type: 'TECH_NEGOTIATOR'; playerId: number; amount: number }
    | { type: 'ACTIVATE_TECH'; playerId: number; tileId: TechTileId }
    // Immortality
    | { type: 'ADVANCE_RESEARCH'; playerId: number; nodeId: string }
    | { type: 'SET_RESEARCH_NODE'; playerId: number; nodeId: string }
    | { type: 'SET_TLEILAXU_STEP'; playerId: number; step: number }
    | { type: 'ACQUIRE_TLEILAXU'; playerId: number; cardId: number; freeAcquire?: boolean }
    | { type: 'SET_TLEILAXU_ROW'; cardIds: number[] }
    | { type: 'USE_FAMILY_ATOMICS'; playerId: number }
    | { type: 'SET_GRAFT_PAIR'; cardIds: number[] }
    | { type: 'CLEAR_GRAFT_PAIR' }
    | {
        type: 'COMPLETE_GRAFT_PAIR'
        playerId: number
        primaryCardId: number
        primaryDeckIndex: number
        secondaryCardId?: number
        secondaryDeckIndex?: number
        imperiumRowCardId?: number
      }
    | { type: 'CANCEL_GRAFT_SELECTION' }
    | { type: 'RECALL_PLACED_AGENT'; playerId: number }

export { useGame } from './gameContextState'

const initialGameState: GameState = {
  firstPlayerMarker: 0,
  selectedCard: null,
  selectedCardDeckIndex: null,
  currentRound: 1,
  activePlayerId: 0,
  phase: GamePhase.ROUND_START,
  currTurn: null,
  mentatOwner: null,
  highCouncilSeatOrder: [],
  factionInfluence: {
    [FactionType.EMPEROR]: {},
    [FactionType.SPACING_GUILD]: {},
    [FactionType.BENE_GESSERIT]: {},
    [FactionType.FREMEN]: {}
  },
  factionAlliances: {
    [FactionType.EMPEROR]: null,
    [FactionType.SPACING_GUILD]: null,
    [FactionType.BENE_GESSERIT]: null,
    [FactionType.FREMEN]: null
  },
  spiceMustFlowDeck: SPICE_MUST_FLOW_DECK,
  arrakisLiaisonDeck: ARRAKIS_LIAISON_DECK,
  foldspaceDeck: FOLDSPACE_DECK,
  imperiumRowDeck: buildImperiumDeck(),
  imperiumRow: [],
  intrigueDeck: buildIntrigueDeck(),
  intrigueDiscard: [],
  conflictsDiscard: [],
  expansions: NO_EXPANSIONS,
  controlMarkers: {
    [ControlMarkerType.ARRAKIN]: null,
    [ControlMarkerType.CARTHAG]: null,
    [ControlMarkerType.IMPERIAL_BASIN]: null
  },
  bonusSpice: {
    [MakerSpace.HAGGA_BASIN]: 0,
    [MakerSpace.GREAT_FLAT]: 0,
    [MakerSpace.IMPERIAL_BASIN]: 0
  },
  combatStrength: {},
  combatTroops: {},
  combatNegotiators: {},
  currentConflict: {
    id: 0,
    tier: 1,
    name: 'Placeholder',
    rewards: {
      first: [],
      second: [],
      third: []
    }
  },
  players: [],
  combatPasses: new Set(),
  history: [],
  occupiedSpaces: {},
  playArea: {} as Record<number, Card[]>,
  canEndTurn: false,
  canAcquireIR: false,
  gains: [],
  pendingRewards: [],
  scheduledIntrigueOnReveal: {},
  scheduledGraftOnReveal: {},
  activeIntrigueThisRound: {},
  acquireToTopThisRound: {},
  endgameTiebreakerSpice: {},
  endgameDonePlayers: new Set(),
  endgameRevealDonePlayers: new Set(),
  endgameWinners: null,
  blockedSpaces: [],
  pendingImperiumRowReplacement: null,
    helenaRemovedCard: null,
    dispatchEnvoyActive: {},
    infiltrateIgnoreOccupancyOnce: {},
    pendingRapidMobilization: null,
    pendingSecondWave: null,
    pendingVictorSpiceThisCombat: {},
    pendingVictorSolariThisCombat: {},
    combatRewardsResolvedConflictId: null,
}

function determinePlacements(
  strength: Record<number, number>,
  playerCount: number
): Placements {
  const byPlayer = new Map<number, number>()
  for (const [id, str] of Object.entries(strength)) {
    const playerId = Number(id)
    const value = Number(str)
    if (!Number.isFinite(playerId) || value <= 0) continue
    const existing = byPlayer.get(playerId)
    if (existing === undefined || value > existing) {
      byPlayer.set(playerId, value)
    }
  }
  const entries = Array.from(byPlayer.entries())
    .map(([id, s]) => ({ id, strength: s }))
    .sort((a, b) => b.strength - a.strength)
  if(playerCount === 4) {
    return getPlacements4p(entries)
  } else {
    // return getPlacements3p(entries) TODO
    return {
      first: [],
      second: [],
      third: []
    }
  }

}

function getPlacements4p(entries: { id: number; strength: number }[]): Placements {
  const placements: Placements = { first: [], second: [], third: [] }
  if (entries.length === 0) return placements

  const tiers: { strength: number; ids: number[] }[] = []
  for (const entry of entries) {
    const last = tiers[tiers.length - 1]
    if (last && last.strength === entry.strength) {
      last.ids.push(entry.id)
    } else {
      tiers.push({ strength: entry.strength, ids: [entry.id] })
    }
  }

  // 1 = competing for 1st, 2 = for 2nd, 3 = for 3rd; 4+ = no reward
  let placementRank = 1
  for (const tier of tiers) {
    if (placementRank === 1) {
      if (tier.ids.length === 1) {
        placements.first = [...tier.ids]
        placementRank = 2
      } else {
        // Tie for first — no winner; tied players share second reward
        placements.second.push(...tier.ids)
        placementRank = 3
      }
    } else if (placementRank === 2) {
      if (tier.ids.length === 1) {
        placements.second = [...tier.ids]
        placementRank = 3
      } else {
        // Tie for second — share third reward (4p)
        placements.third.push(...tier.ids)
        placementRank = 4
      }
    } else if (placementRank === 3) {
      placements.third.push(...tier.ids)
      placementRank = 4
    }
  }

  return placements
}

function combatGainDedupeKey(gain: Gain): string {
  return [
    gain.playerId,
    gain.source,
    gain.sourceId,
    gain.name,
    gain.type,
    gain.amount,
  ].join(':')
}

function dedupeGains(gains: Gain[]): Gain[] {
  const seen = new Set<string>()
  const result: Gain[] = []
  for (const gain of gains) {
    const key = combatGainDedupeKey(gain)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(gain)
  }
  return result
}

function snapshotCombatResolutionForHistory(
  stateAfterRewards: GameState,
  transitionedState: GameState,
  combatRound: number
): GameState {
  const conflictId = stateAfterRewards.currentConflict?.id
  const combatGains = dedupeGains(
    (stateAfterRewards.gains ?? []).filter(gain => {
      if (gain.round !== combatRound || gain.amount === 0) return false
      if (gain.source === GainSource.CONFLICT) {
        return conflictId != null && gain.sourceId === conflictId
      }
      return gain.source === GainSource.INTRIGUE
    })
  )
  const ct = stateAfterRewards.currTurn
  const copy = deepCopyGameState({
    ...transitionedState,
    currentRound: combatRound,
    currentConflict: stateAfterRewards.currentConflict,
    combatStrength: { ...stateAfterRewards.combatStrength },
    combatTroops: { ...stateAfterRewards.combatTroops },
    historyEntryKind: 'combat',
    gains: combatGains,
    currTurn:
      ct && (ct.troopsRetreatedFromConflict ?? 0) > 0
        ? {
            playerId: ct.playerId,
            type: TurnType.PASS,
            troopsRetreatedFromConflict: ct.troopsRetreatedFromConflict,
            removableTroops: 0,
            troopsDeployedToConflict: 0,
          }
        : null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    pendingRewards: [],
    pendingConflictRewardChoices: undefined,
    combatResolutionDeferred: undefined,
    combatRewardsResolvedConflictId: undefined,
    history: [],
  })
  return copy
}

function snapshotEndgameForHistory(
  stateAfterEndgame: GameState,
  endgameGains: Gain[],
  revealedByPlayer: Record<number, IntrigueCard[]>,
  winners: number[]
): GameState {
  return deepCopyGameState({
    ...stateAfterEndgame,
    historyEntryKind: 'endgame',
    gains: dedupeGains(endgameGains),
    endgameRevealedIntrigue: revealedByPlayer,
    endgameWinners: winners,
    currTurn: null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    pendingRewards: [],
    history: [],
  })
}

function completeEndgamePhase(state: GameState): GameState {
  const gainsForHistory = dedupeGains(state.gains ?? [])
  const winners = resolveEndgameWinners(state)
  const endgameSnapshot = snapshotEndgameForHistory(
    state,
    gainsForHistory,
    state.endgameRevealedIntrigue ?? {},
    winners
  )
  return {
    ...state,
    endgameWinners: winners,
    endgameApplyQueue: [],
    endgameDonePlayers: new Set(state.players.map(p => p.id)),
    canEndTurn: false,
    currTurn: null,
    gains: [],
    history: [...state.history, endgameSnapshot],
  }
}

function continueEndgameIfReady(state: GameState): GameState {
  if (state.phase !== GamePhase.END_GAME || state.endgameWinners) return state
  if (endgameHasPendingWork(state)) return state
  return completeEndgamePhase(state)
}

function advanceEndgameQueue(state: GameState): GameState {
  const queue = state.endgameApplyQueue ?? []
  if (queue.length === 0) {
    return completeEndgamePhase(state)
  }

  const [next, ...rest] = queue
  const card = findRevealedEndgameCard(state, next.playerId, next.cardId)
  const afterPop = { ...state, endgameApplyQueue: rest, activePlayerId: next.playerId }
  if (!card) {
    return continueEndgameIfReady(advanceEndgameQueue(afterPop))
  }

  const applied = applyIntrigueCardPlay(afterPop, next.playerId, card, { fromEndgameReveal: true })
  if (!applied) {
    return continueEndgameIfReady(advanceEndgameQueue(afterPop))
  }

  if ((applied.currTurn?.pendingChoices?.length ?? 0) > 0) {
    return { ...applied, canEndTurn: false }
  }

  return continueEndgameIfReady(applied)
}

function finishEndgameRevealPhase(state: GameState): GameState {
  return advanceEndgameQueue(state)
}

function skipEndgameRevealPlayersWithNoIntrigue(state: GameState): GameState {
  let current = state
  let guard = 0
  while (guard++ < current.players.length + 1) {
    const active = current.players.find(p => p.id === current.activePlayerId)
    if (!active) break

    const done = current.endgameRevealDonePlayers ?? new Set<number>()
    if (done.has(active.id)) {
      const nextId = getNextEndgameRevealPlayerId(current, active.id)
      if (nextId === null) return finishEndgameRevealPhase(current)
      current = { ...current, activePlayerId: nextId }
      continue
    }

    if (active.intrigueCount > 0) break

    const newDone = new Set(done)
    newDone.add(active.id)
    const nextId = getNextEndgameRevealPlayerId(current, active.id)
    if (nextId === null) {
      return finishEndgameRevealPhase({ ...current, endgameRevealDonePlayers: newDone })
    }
    current = { ...current, endgameRevealDonePlayers: newDone, activePlayerId: nextId }
  }
  return current
}

function advanceAfterEndgameReveal(state: GameState, revealedPlayerId: number): GameState {
  const done = new Set(state.endgameRevealDonePlayers ?? [])
  done.add(revealedPlayerId)
  const nextId = getNextEndgameRevealPlayerId(state, revealedPlayerId)
  if (nextId === null) {
    return finishEndgameRevealPhase({ ...state, endgameRevealDonePlayers: done })
  }
  return skipEndgameRevealPlayersWithNoIntrigue({
    ...state,
    endgameRevealDonePlayers: done,
    activePlayerId: nextId,
  })
}

function enterEndgameRevealPhase(state: GameState): GameState {
  const initial: GameState = {
    ...state,
    endgameRevealedIntrigue: state.endgameRevealedIntrigue ?? {},
    endgameApplyQueue: state.endgameApplyQueue ?? [],
    endgameWinners: null,
    endgameRevealDonePlayers: state.endgameRevealDonePlayers ?? new Set(),
    canEndTurn: false,
    currTurn: null,
  }
  return skipEndgameRevealPlayersWithNoIntrigue(initial)
}

function finalizeEndgameAfterCombat(state: GameState): GameState {
  return enterEndgameRevealPhase(state)
}

function afterEndgamePlayerAction(state: GameState): GameState {
  if (state.phase !== GamePhase.END_GAME || state.endgameWinners) return state
  if (endgameHasPendingWork(state)) return state
  return advanceEndgameQueue(state)
}

function appendCombatSnapshotAndTransition(
  stateAfterRewards: GameState,
  stateBeforeResolve: GameState,
  mentatOwnerNextRound: number | null
): GameState {
  const combatRound = stateBeforeResolve.currentRound
  const transitioned = completeCombatTransition(stateAfterRewards, stateBeforeResolve, mentatOwnerNextRound)
  const combatSnapshot = snapshotCombatResolutionForHistory(
    stateAfterRewards,
    transitioned,
    combatRound
  )
  let result: GameState = {
    ...transitioned,
    history: [...stateBeforeResolve.history, combatSnapshot],
    gains: [],
    currTurn: null,
  }
  if (result.phase === GamePhase.END_GAME) {
    result = finalizeEndgameAfterCombat(result)
  }
  return result
}

/** Complete combat resolution: makers, recall, draw, phase transition */
function completeCombatTransition(
  newState: GameState,
  state: GameState,
  mentatOwnerNextRound: number | null
): GameState {
  const bonusSpice = { ...newState.bonusSpice }
  BOARD_SPACES.forEach(s => {
    if (s.makerSpace && (!newState.occupiedSpaces[s.id] || newState.occupiedSpaces[s.id]?.length === 0)) {
      bonusSpice[s.makerSpace] += 1
    }
  })
  newState = { ...newState, bonusSpice, occupiedSpaces: {} }
  newState.players = newState.players.map(p => {
    let agents = 2
    if (p.hasSwordmaster) agents += 1
    if (p.id === mentatOwnerNextRound) agents += 1
    return { ...p, agents }
  })
  // Recall: Mentat returns to Landsraad unless the conflict winner earned it for next round.
  newState = { ...newState, mentatOwner: mentatOwnerNextRound }
  newState.players = newState.players.map(p => {
    if (p.deck.length < 5) {
      return { ...p, revealed: false, deck: [...p.deck, ...p.discardPile], discardPile: [], handCount: 5 }
    }
    return { ...p, revealed: false, handCount: 5 }
  })
  newState.firstPlayerMarker = (newState.firstPlayerMarker + 1) % newState.players.length
  const updatedConflictsDiscard = [...state.conflictsDiscard, state.currentConflict]
  const endgameTriggered =
    newState.players.some(p => getTotalVictoryPoints(p, newState) >= 10) ||
    state.currentRound >= 10
  if (endgameTriggered) {
    return {
      ...newState,
      mentatOwner: null,
      phase: GamePhase.END_GAME,
      activePlayerId: newState.firstPlayerMarker,
      conflictsDiscard: updatedConflictsDiscard,
      canEndTurn: true,
      canAcquireIR: false,
      endgameDonePlayers: new Set(),
      endgameRevealDonePlayers: new Set(),
      endgameWinners: null,
      helenaRemovedCard: null,
      pendingVictorSpiceThisCombat: {},
      pendingVictorSolariThisCombat: {},
    }
  }
  newState = {
    ...newState,
    players: newState.players.map(p => {
      const troopCount = newState.combatTroops[p.id] ?? 0
      const negotiatorCount = newState.combatNegotiators?.[p.id] ?? 0
      if (troopCount === 0 && negotiatorCount === 0) return p
      return returnConflictUnitsToSupply(p, troopCount, negotiatorCount)
    }),
  }
  return {
    ...newState,
    phase: GamePhase.ROUND_START,
    combatStrength: {},
    combatTroops: {},
    combatNegotiators: {},
    currentRound: newState.currentRound + 1,
    conflictsDiscard: updatedConflictsDiscard,
    helenaRemovedCard: null,
    pendingVictorSpiceThisCombat: {},
    pendingVictorSolariThisCombat: {},
    pendingRapidMobilization: null,
    pendingSecondWave: null,
    combatRewardsResolvedConflictId: null,
    pendingConflictRewardChoices: undefined,
    combatResolutionDeferred: undefined,
  }
}

/** After Bindu Suspension: +hand and skip Agent/Reveal by advancing First Player rotation (mirrors END_TURN tail). */
function advanceActivePlayerAfterBindu(state: GameState, playerId: number): GameState {
  const newState = { ...state }
  let nextIndex = (playerId + 1) % newState.players.length
  let nextPlayer = newState.players[nextIndex]
  while (nextPlayer.revealed) {
    nextIndex = (nextIndex + 1) % newState.players.length
    nextPlayer = newState.players[nextIndex]
  }
  const clearedBlockedSpaces = (newState.blockedSpaces || []).filter(bs => bs.playerId !== nextPlayer.id)
  const nextDispatch = { ...(newState.dispatchEnvoyActive || {}) }
  delete nextDispatch[playerId]
  const nextInfiltrate = { ...(newState.infiltrateIgnoreOccupancyOnce || {}) }
  delete nextInfiltrate[playerId]
  return {
    ...newState,
    blockedSpaces: clearedBlockedSpaces,
    dispatchEnvoyActive: nextDispatch,
    infiltrateIgnoreOccupancyOnce: nextInfiltrate,
    players: newState.players.map(p => (p.id === playerId ? { ...p, selectedCard: null } : p)),
    activePlayerId: nextPlayer.id,
    history: [...newState.history, snapshotStateForHistory(newState)],
    currTurn: null,
    canEndTurn: false,
    selectedCard: null,
    selectedCardDeckIndex: null,
    canAcquireIR: false,
    gains: [],
    pendingRewards: []
  }
}

/** Convert ConflictReward to Reward for ChoiceOption */
function conflictRewardToReward(r: ConflictReward): Reward {
  switch (r.type) {
    case RewardType.INTRIGUE: return { intrigueCards: r.amount }
    case RewardType.SPICE: return { spice: r.amount }
    case RewardType.SOLARI: return { solari: r.amount }
    case RewardType.WATER: return { water: r.amount }
    case RewardType.INFLUENCE: return { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: r.amount }] } }
    case RewardType.TROOPS: return { troops: r.amount }
    case RewardType.VICTORY_POINTS: return { victoryPoints: r.amount }
    case RewardType.TECH: return { acquireTech: { discount: 0 } }
    default: return {}
  }
}

/** Build ChoiceOptions for a conflict reward that requires choice */
function buildConflictChoiceOptions(reward: ConflictReward): ChoiceOption[] {
  if (reward.choiceOptions && reward.choiceOptions.length > 0) {
    return reward.choiceOptions.map(opt => ({
      reward: conflictRewardToReward(opt),
      rewardLabel:
        opt.type === RewardType.TECH
          ? 'Acquire Tech'
          : `${opt.amount} ${opt.type}`,
    }))
  }
  if (reward.chooseFaction && reward.type === RewardType.INFLUENCE) {
    const factions = [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.BENE_GESSERIT, FactionType.FREMEN]
    return factions.map(f => ({
      reward: { influence: { amounts: [{ faction: f, amount: reward.amount }] } },
      rewardLabel: `${reward.amount} Influence (${f})`
    }))
  }
  return []
}

function applyReward(state: GameState, reward: ConflictReward, placement: string, playerIds: number[]): GameState {
  let newState = { ...state }
  newState.gains = newState.gains || []
  const gainName = state.currentConflict.name + ' - ' + placement
  const recipientIds = [...new Set(playerIds)]
  for (const playerId of recipientIds) {
    newState.gains.push({
      playerId,
      source: GainSource.CONFLICT,
      sourceId: state.currentConflict.id,
      type: reward.type,
      round: state.currentRound,
      name: gainName,
      amount: reward.amount,
    })
  }
  switch (reward.type) {
    case RewardType.VICTORY_POINTS:
      newState.players = newState.players.map(player => 
        recipientIds.includes(player.id)
          ? { ...player, victoryPoints: player.victoryPoints + reward.amount }
          : player
      )
      break

    case RewardType.INFLUENCE: {
      // chooseFaction rewards are deferred to pendingConflictRewardChoices
      if (reward.chooseFaction) break
      const faction = FactionType.EMPEROR
      const player = newState.players.find(p => p.id === recipientIds[0])
      if (player) {
        const applied = applyInfluenceDeltaForPlayer(newState, player, faction, reward.amount, {
          appendGainsTo: newState.gains,
        })
        newState = applied.state
        newState.players = newState.players.map(p =>
          p.id === applied.player.id ? applied.player : p
        )
        newState = appendTessiaPendingChoices(newState, applied.tessiaChoices)
      }
      break
    }
    case RewardType.CONTROL:
      if (state.currentConflict?.controlSpace) {
        newState.controlMarkers[state.currentConflict.controlSpace] = recipientIds[0]
      }
      // newState.gains.controlGains = newState.gains.controlGains || []
      // newState.gains.controlGains.push({
      //   playerId: playerIds[0],
      //   round: state.currentRound,
      //   name: 'Conflict victory', //TODO add conflict name and place
      //   amount: reward.amount
      // })
      break

    case RewardType.SPICE:
      newState.players = newState.players.map(player =>
        recipientIds.includes(player.id)
          ? { ...player, spice: player.spice + reward.amount }
          : player
      )
      break

    case RewardType.WATER:
      newState.players = newState.players.map(player =>
        recipientIds.includes(player.id)
          ? { ...player, water: player.water + reward.amount }
          : player
      )
      break

    case RewardType.SOLARI:
      newState.players = newState.players.map(player =>
        recipientIds.includes(player.id)
          ? { ...player, solari: player.solari + reward.amount }
          : player
      )
      break

    case RewardType.TROOPS:
      newState.players = newState.players.map(player => {
        if (!recipientIds.includes(player.id)) return player
        return recruitTroopsToGarrison(player, reward.amount).player
      })
      break
    case RewardType.INTRIGUE:
      newState.players = newState.players.map(player =>
        recipientIds.includes(player.id)
          ? { ...player, intrigueCount: player.intrigueCount + reward.amount }
          : player
      )
      break
    case RewardType.AGENT:
        //TODO
        break
    }

  return newState
}

/**
 * Combat-space rule: deploy up to 2 from garrison plus any troops recruited this turn.
 * Increases the turn deploy cap when troops are gained while deployment is active.
 */
function applyRecruitedTroopsToTurnDeployLimit(
  currTurn: GameTurn,
  troopsRecruited: number
): GameTurn {
  if (troopsRecruited <= 0 || !currTurn.canDeployTroops) return currTurn
  return {
    ...currTurn,
    troopLimit: (currTurn.troopLimit ?? 0) + troopsRecruited,
  }
}

function withRecruitedTroopsDeployLimit(state: GameState, troopsRecruited: number): GameState {
  if (troopsRecruited <= 0 || !state.currTurn?.canDeployTroops) return state
  return {
    ...state,
    currTurn: applyRecruitedTroopsToTurnDeployLimit(state.currTurn, troopsRecruited),
  }
}

function withEffectRetreatAllowance(state: GameState, amount: number): GameState {
  if (!state.currTurn || amount <= 0) return state
  return {
    ...state,
    currTurn: {
      ...state.currTurn,
      effectRetreatAllowance: (state.currTurn.effectRetreatAllowance ?? 0) + amount,
    },
  }
}

/** Deploy/retreat UI tracks removable (in conflict) and retreated separately for turn history. */
function syncDeployTurnStats(
  currTurn: GameTurn,
  removableTroops: number,
  troopsRetreatedFromConflict: number,
  removableDreadnoughts?: number
): GameTurn {
  const removable = Math.max(0, removableTroops)
  const retreated = Math.max(0, troopsRetreatedFromConflict)
  const dreadRemovable =
    removableDreadnoughts != null
      ? Math.max(0, removableDreadnoughts)
      : currTurn.removableDreadnoughts ?? 0
  return {
    ...currTurn,
    removableTroops: removable,
    troopsRetreatedFromConflict: retreated,
    troopsDeployedToConflict: removable,
    removableDreadnoughts: dreadRemovable,
    dreadnoughtsDeployedToConflict: dreadRemovable,
  }
}

function appendTessiaPendingChoices(state: GameState, choices: PendingChoice[]): GameState {
  if (choices.length === 0) return state
  if (!state.currTurn) return state
  return {
    ...state,
    currTurn: {
      ...state.currTurn,
      pendingChoices: [...(state.currTurn.pendingChoices ?? []), ...choices],
    },
    canEndTurn: false,
  }
}

function applyInfluenceDeltaForPlayer(
  state: GameState,
  player: Player,
  faction: FactionType,
  delta: number,
  options?: { appendGainsTo?: Gain[]; milestoneMeta?: InfluenceMilestoneMeta }
): { state: GameState; player: Player; tessiaChoices: PendingChoice[] } {
  const previous = state.factionInfluence[faction]?.[player.id] ?? 0
  let newState = updateFactionInfluence(state, faction, player.id, delta, options)
  const updated = newState.factionInfluence[faction]?.[player.id] ?? 0
  const claim = tryTessiaSnooperClaim(
    newState,
    player,
    faction,
    previous,
    updated,
    collectLiveIds(newState),
    options?.appendGainsTo
  )
  if (!claim) {
    const statePlayer = newState.players.find(p => p.id === player.id)
    return {
      state: newState,
      player: statePlayer
        ? { ...player, ...syncPlayerResourcesWithMilestoneState(player, statePlayer) }
        : player,
      tessiaChoices: [],
    }
  }
  return { state: claim.state, player: claim.player, tessiaChoices: claim.pendingChoices }
}

// Helper function to apply a reward to a player (shared by CLAIM_REWARD and CLAIM_ALL_REWARDS)
function applyRewardToPlayer(
  reward: Reward,
  player: Player,
  gains: Gain[],
  state: GameState,
  source: { type: GainSource; id: number; name: string }
): Player {
  let updatedPlayer = { ...player }
  
  if (reward.spice) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.spice,
      type: RewardType.SPICE,
      source: source.type
    })
    updatedPlayer.spice += reward.spice
  }
  
  if (reward.water) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.water,
      type: RewardType.WATER,
      source: source.type
    })
    updatedPlayer.water += reward.water
  }
  
  if (reward.solari) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.solari,
      type: RewardType.SOLARI,
      source: source.type
    })
    let solariAmount = reward.solari
    if (shouldGrantYunaSolariBonus(state, player, reward)) {
      solariAmount = applyYunaSolariBonus(solariAmount)
      gains.push({
        round: state.currentRound,
        playerId: player.id,
        sourceId: source.id,
        name: 'Spice Royalty (Yuna)',
        amount: 1,
        type: RewardType.SOLARI,
        source: source.type,
      })
    }
    updatedPlayer.solari += solariAmount
  }
  
  if (reward.troops) {
    const recruited = recruitTroopsToGarrison(updatedPlayer, reward.troops)
    updatedPlayer = recruited.player
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: recruited.recruited,
      type: RewardType.TROOPS,
      source: source.type
    })
  }
  
  if (reward.drawCards) {
    const cardsInDrawPile = Math.max(0, updatedPlayer.deck.length - updatedPlayer.handCount)
    const drawn = Math.min(reward.drawCards, cardsInDrawPile)
    updatedPlayer.handCount += drawn
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.drawCards,
      type: RewardType.DRAW,
      source: source.type
    })
  }
  
  if (reward.intrigueCards) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.intrigueCards,
      type: RewardType.INTRIGUE,
      source: source.type
    })
    updatedPlayer.intrigueCount += reward.intrigueCards
  }
  
  if (reward.trash || reward.trashThisCard) {
    const trashedCardId = reward.trashThisCard ? source.id : (reward.trash as number)
    const trashedCard =
      updatedPlayer.deck.find(c => c.id === trashedCardId) ??
      updatedPlayer.discardPile.find(c => c.id === trashedCardId) ??
      updatedPlayer.playArea.find(c => c.id === trashedCardId)
    if (trashedCard) {
      const deckIndex = player.deck.findIndex(c => c.id === trashedCardId)
      updatedPlayer.deck = updatedPlayer.deck.filter(c => c.id !== trashedCardId)
      updatedPlayer.discardPile = updatedPlayer.discardPile.filter(c => c.id !== trashedCardId)
      updatedPlayer.playArea = updatedPlayer.playArea.filter(c => c.id !== trashedCardId)
      if (deckIndex >= 0 && deckIndex < player.handCount) {
        updatedPlayer.handCount = Math.max(0, updatedPlayer.handCount - 1)
      }
      updatedPlayer.trash = [...updatedPlayer.trash, trashedCard]
      gains.push({
        round: state.currentRound,
        playerId: player.id,
        sourceId: source.id,
        name: trashedCard.name,
        amount: -1,
        type: RewardType.TRASH,
        source: source.type,
      })
    }
  }
  
  return updatedPlayer
}

/** Apply a conflict reward choice (from pendingConflictRewardChoices) */
function applyConflictChoiceReward(
  state: GameState,
  reward: Reward,
  playerId: number,
  source: { id: number; name: string }
): GameState {
  let newState = {
    ...state,
    gains: [...state.gains],
    combatStrength: { ...state.combatStrength },
    factionInfluence: { ...state.factionInfluence }
  }
  const originalPlayer = newState.players.find(p => p.id === playerId)
  if (!originalPlayer) return state
  let player = { ...originalPlayer }

  if (reward.custom === CustomEffect.DREADNOUGHT_CONTROL && reward.dreadnoughtControlSpace) {
    return applyDreadnoughtControlPlacement(state, playerId, reward.dreadnoughtControlSpace, source.name)
  }

  if (reward.custom === CustomEffect.FREIGHTER_ADVANCE && isRiseOfIxEnabled(state)) {
    const gainSource: GainAttribution = {
      type: GainSource.CONFLICT,
      id: source.id,
      name: source.name,
    }
    const { players, gains } = applyFreighterAdvance(state, playerId, gainSource)
    return { ...newState, players, gains }
  }

  if (reward.custom === CustomEffect.FREIGHTER_RECALL && isRiseOfIxEnabled(state)) {
    const gainSource: GainAttribution = {
      type: GainSource.CONFLICT,
      id: source.id,
      name: source.name,
    }
    const recall = applyFreighterRecall(
      state,
      playerId,
      gainSource,
      [],
      [...state.pendingRewards]
    )
    return {
      ...newState,
      players: recall.players,
      gains: recall.gains,
      pendingRewards: recall.pendingRewards,
    }
  }

  if (reward.acquireTech !== undefined && isRiseOfIxEnabled(state)) {
    const gainSource: GainAttribution = {
      type: GainSource.CONFLICT,
      id: source.id,
      name: source.name,
    }
    const pendingRewards = [...newState.pendingRewards]
    newState = enqueueConflictAcquireTech(
      newState,
      playerId,
      gainSource,
      pendingRewards,
      (reward.acquireTech.discount ?? 0) as 0 | 1 | 2
    )
    return { ...newState, pendingRewards }
  }

  const pushGain = (amount: number | undefined, type: RewardType, gainName?: string) => {
    if (!amount) return
    newState.gains.push({
      playerId,
      round: newState.currentRound,
      source: GainSource.CONFLICT,
      sourceId: source.id,
      name: gainName ?? source.name,
      amount,
      type
    })
  }

  if (reward.intrigueCards) {
    player.intrigueCount += reward.intrigueCards
    pushGain(reward.intrigueCards, RewardType.INTRIGUE)
  }
  if (reward.spice) { player.spice += reward.spice; pushGain(reward.spice, RewardType.SPICE) }
  if (reward.water) { player.water += reward.water; pushGain(reward.water, RewardType.WATER) }
  if (reward.solari) { player.solari += reward.solari; pushGain(reward.solari, RewardType.SOLARI) }
  if (reward.troops) {
    const recruited = recruitTroopsToGarrison(player, reward.troops)
    player = recruited.player
    pushGain(recruited.recruited, RewardType.TROOPS)
  }
  if (reward.victoryPoints) { player.victoryPoints += reward.victoryPoints; pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS) }
  if (reward.influence) {
    const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
    const tessiaChoices: PendingChoice[] = []
    reward.influence.amounts.forEach(({ faction, amount }) => {
      const applied = applyInfluenceDeltaForPlayer(newState, player, faction, amount, {
        appendGainsTo: newState.gains,
        milestoneMeta,
      })
      newState = applied.state
      player = applied.player
      tessiaChoices.push(...applied.tessiaChoices)
      pushGain(amount, RewardType.INFLUENCE, conflictInfluenceGainName(source.name, faction))
    })
    if (milestoneMeta.troopsRecruited > 0) {
      newState = withRecruitedTroopsDeployLimit(newState, milestoneMeta.troopsRecruited)
    }
    player = mergePlayerAfterFactionInfluence(player, newState, originalPlayer)
    newState = appendTessiaPendingChoices(newState, tessiaChoices)
  }

  newState.players = newState.players.map(p => (p.id === playerId ? player : p))
  return newState
}

function applyChoiceReward(
  state: GameState,
  reward: Reward,
  playerId: number,
  source?: GainAttribution
): GameState {
  let newState = { 
    ...state,
    gains: [...state.gains], 
    combatStrength: { ...state.combatStrength }, 
    factionInfluence: { ...state.factionInfluence }
  }
  const originalPlayer = newState.players.find(p => p.id === playerId)
  if (!originalPlayer) return state

  // Create a proper copy of the player object to avoid mutations
  let player = { ...originalPlayer }

  const gainSource: GainAttribution = source ?? {
    type: GainSource.CARD,
    id: 0,
    name: 'Unknown',
  }

  const pushGain = (amount: number | undefined, type: RewardType, gainName?: string) => {
    if (!amount) return
    newState.gains.push({
      playerId,
      round: newState.currentRound,
      source: gainSource.type,
      sourceId: gainSource.id,
      name: gainName ?? gainSource.name,
      amount,
      type
    })
  }

  if (reward.spice) { player.spice += reward.spice; pushGain(reward.spice, RewardType.SPICE) }
  if (reward.water) { player.water += reward.water; pushGain(reward.water, RewardType.WATER) }
  if (reward.solari) { player.solari += reward.solari; pushGain(reward.solari, RewardType.SOLARI) }
  if (reward.troops) {
    const recruited = recruitTroopsToGarrison(player, reward.troops)
    player = recruited.player
    pushGain(recruited.recruited, RewardType.TROOPS)
    newState = withRecruitedTroopsDeployLimit(newState, recruited.recruited)
  }
  if (reward.persuasion) { player.persuasion += reward.persuasion; pushGain(reward.persuasion, RewardType.PERSUASION) }
  if (reward.combat) {
    if (playerHasUnitsInCombat(newState, playerId)) {
      const current = newState.combatStrength[playerId] || 0
      newState.combatStrength[playerId] = current + reward.combat
      pushGain(reward.combat, RewardType.COMBAT)
    }
  }
  if (reward.drawCards) { player.handCount += reward.drawCards; pushGain(reward.drawCards, RewardType.DRAW) }
  if (reward.deployTroops) {
    newState = {
      ...newState,
      currTurn: newState.currTurn
        ? applyDeployTroopsAllowance(newState.currTurn, reward.deployTroops, reward)
        : newState.currTurn,
    }
    pushGain(reward.deployTroops, RewardType.DEPLOY)
  }
  if (reward.retreatTroops) {
    newState = withEffectRetreatAllowance(newState, reward.retreatTroops)
    pushGain(reward.retreatTroops, RewardType.RETREAT)
  }
  if (reward.dreadnoughts && state.expansions?.riseOfIx) {
    newState = handleDreadnoughtReward(newState, playerId, reward.dreadnoughts, gainSource)
    player = newState.players.find(p => p.id === playerId) ?? player
  }
  if (reward.acquireTech !== undefined && isRiseOfIxEnabled(newState)) {
    if (hasAvailableTechTile(newState)) {
      newState = claimAcquireTechReward(newState, playerId, reward.acquireTech.discount ?? 0)
    }
  }
  if (reward.freighter !== undefined && isRiseOfIxEnabled(newState)) {
    const count = typeof reward.freighter === 'number' ? reward.freighter : 0
    if (count > 0) {
      const pendingChoices = [...(newState.currTurn?.pendingChoices ?? [])]
      pushFreighterChoicesFromReward(newState, count, playerId, gainSource, pendingChoices)
      newState = {
        ...newState,
        currTurn: newState.currTurn
          ? { ...newState.currTurn, pendingChoices }
          : { playerId, type: TurnType.ACTION, pendingChoices },
        canEndTurn: false,
      }
    }
  }
  if (reward.custom === CustomEffect.DETONATION_DEVICES && state.expansions?.riseOfIx) {
    const d = player.dreadnoughts
    if (d && d.conflict > 0) {
      player = {
        ...player,
        dreadnoughts: {
          ...d,
          conflict: d.conflict - 1,
          supply: d.supply + 1,
        },
      }
    }
  }
  if (newState.expansions?.immortality) {
    if (reward.specimen) {
      player.specimens = (player.specimens ?? 0) + reward.specimen
      pushGain(reward.specimen, RewardType.SPECIMEN)
    }
    if (reward.combatDeploy && newState.currTurn) {
      newState = { ...newState, currTurn: { ...newState.currTurn, canDeployTroops: true } }
    }
    if (reward.research || reward.tleilaxu) {
      // Flush the working player copy so the track helpers (which apply nested
      // space-bonus rewards) operate on current state, then re-read it.
      newState.players = newState.players.map(p => (p.id === playerId ? player : p))
      if (reward.tleilaxu) {
        newState = advanceTleilaxuTrack(newState, playerId, reward.tleilaxu, applyChoiceReward)
      }
      if (reward.research) {
        newState = advanceResearch(newState, playerId, reward.research, applyChoiceReward)
      }
      player = newState.players.find(p => p.id === playerId) ?? player
    }
  }
  if (reward.victoryPoints) {
    player.victoryPoints += reward.victoryPoints
    pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS)
  }

  if (reward.dividends && isRiseOfIxEnabled(newState)) {
    const { players, gains } = applyDividendsReward(newState, playerId, gainSource)
    newState = { ...newState, players, gains }
    player = newState.players.find(p => p.id === playerId) ?? player
  }

  if (reward.acquireTech !== undefined && isRiseOfIxEnabled(newState)) {
    const discount = reward.acquireTech.discount ?? 0
    if (hasAvailableTechTile(newState)) {
      newState = claimAcquireTechReward(newState, playerId, discount)
      player = newState.players.find(p => p.id === playerId) ?? player
    }
    pushGain(hasAvailableTechTile(state) ? 1 : 0, RewardType.TECH, `Acquire Tech (−${discount})`)
  }

  if (reward.techNegotiator && isRiseOfIxEnabled(newState)) {
    newState = applyTechNegotiatorReward(newState, playerId, reward.techNegotiator, gainSource)
    player = newState.players.find(p => p.id === playerId) ?? player
    pushGain(reward.techNegotiator, RewardType.NEGOTIATOR)
  }
  
  // Handle influence rewards (resolved amounts only — chooseOne uses follow-up choices)
  if (reward.influence && !reward.influence.chooseOne) {
    const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
    const tessiaChoices: PendingChoice[] = []
    reward.influence.amounts.forEach(({ faction, amount }) => {
      const applied = applyInfluenceDeltaForPlayer(newState, player, faction, amount, {
        appendGainsTo: newState.gains,
        milestoneMeta,
      })
      newState = applied.state
      player = applied.player
      tessiaChoices.push(...applied.tessiaChoices)
      pushGain(amount, RewardType.INFLUENCE, faction)
    })
    if (milestoneMeta.troopsRecruited > 0) {
      newState = withRecruitedTroopsDeployLimit(newState, milestoneMeta.troopsRecruited)
    }
    player = mergePlayerAfterFactionInfluence(player, newState, originalPlayer)
    newState = appendTessiaPendingChoices(newState, tessiaChoices)
  }

  newState.players = newState.players.map(p => (p.id === playerId ? player : p))
  return newState
}

function activatePlayerForTurn(state: GameState, playerId: number): GameState {
  let players = state.players.map(p => {
    if (p.id !== playerId) return p
    return prepareIlesaSecondTurnCard(p)
  })
  const ilesaTurn = beginIlesaSetAsideTurn({ ...state, players }, playerId)
  if (!ilesaTurn) {
    return { ...state, players }
  }
  return {
    ...state,
    players,
    currTurn: ilesaTurn,
    canEndTurn: false,
  }
}

function checkAndApplyDiversion(state: GameState, playerId: number): GameState {
  if (!state.expansions?.riseOfIx) return state
  return checkDiversionAfterDeployChange(state, playerId)
}

function isRiseOfIxIntrigueCustom(custom: CustomEffect): boolean {
  return [
    CustomEffect.CANNON_TURRETS,
    CustomEffect.STRATEGIC_PUSH,
    CustomEffect.SECOND_WAVE,
    CustomEffect.WAR_CHEST,
    CustomEffect.ADVANCED_WEAPONRY,
    CustomEffect.GRAND_CONSPIRACY,
    CustomEffect.STRONGARM,
    CustomEffect.QUID_PRO_QUO,
    CustomEffect.DIVERSION,
    CustomEffect.MACHINE_CULTURE,
  ].includes(custom)
}

function canAffordIntrigueCost(state: GameState, player: Player, cost: Cost): boolean {
  if (cost.spice && player.spice < cost.spice) return false
  if (cost.water && player.water < cost.water) return false
  if (cost.solari && player.solari < cost.solari) return false
  if (cost.troops && player.troops < cost.troops) return false
  if (cost.discard && player.handCount < cost.discard) return false
  if (cost.influence?.chooseOne && !canPayInfluenceCost(state, player.id, cost.influence)) return false
  return true
}

/** Returns false when the card cannot be played because no applicable effect can be paid for. */
function canPlayIntrigueCardNow(state: GameState, player: Player, card: IntrigueCard): boolean {
  const effects = (card.playEffect ?? []).filter(effect => {
    if (!effect.reward) return false
    if (!intrigueRequirementSatisfied(effect, card, state, player.id)) return false
    if (effect.phase) {
      const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
      if (!phases.includes(state.phase)) return false
    }
    return true
  })

  if (effects.length === 0) return false

  const isAffordableEffect = (effect: (typeof effects)[number]) => {
    if (effect.cost && !canAffordIntrigueCost(state, player, effect.cost)) return false
    return true
  }

  if (effects.some(e => e.choiceOpt)) {
    return effects.some(effect => isAffordableEffect(effect))
  }

  return effects.every(effect => {
    if (effect.timing === EffectTiming.ON_REVEAL_THIS_ROUND) return true
    if (effect.reward?.acquire) return true
    if (effect.reward?.influence?.chooseOne) return true
    if (effect.cost?.influence?.chooseOne) return true
    if (effect.reward?.custom === CustomEffect.DOUBLE_CROSS) return true
    if (effect.reward?.custom === CustomEffect.URGENT_MISSION) return true
    if (effect.reward?.custom === CustomEffect.STRONGARM && !canPlayStrongarm(state, player.id)) {
      return false
    }
    if (intrigueEffectNeedsDeferral(effect)) {
      return isAffordableEffect(effect)
    }
    return isAffordableEffect(effect)
  })
}

function handleIntrigueEffect(
  state: GameState,
  card: IntrigueCard,
  playerId: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  let newState = { 
    ...state, 
    gains: [...state.gains],
    combatStrength: { ...state.combatStrength },
    scheduledIntrigueOnReveal: { ...(state.scheduledIntrigueOnReveal || {}) },
    activeIntrigueThisRound: { ...(state.activeIntrigueThisRound || {}) },
    acquireToTopThisRound: { ...(state.acquireToTopThisRound || {}) },
    endgameTiebreakerSpice: { ...(state.endgameTiebreakerSpice || {}) },
    dispatchEnvoyActive: { ...(state.dispatchEnvoyActive || {}) },
    infiltrateIgnoreOccupancyOnce: { ...(state.infiltrateIgnoreOccupancyOnce || {}) },
    pendingVictorSpiceThisCombat: { ...(state.pendingVictorSpiceThisCombat || {}) },
    pendingVictorSolariThisCombat: { ...(state.pendingVictorSolariThisCombat || {}) },
    pendingSecondWave: state.pendingSecondWave ?? null,
  }
  let updatedPlayers = state.players.map(p => ({ ...p }))
  const playerIndex = updatedPlayers.findIndex(p => p.id === playerId)
  const baselinePlayer = { ...updatedPlayers[playerIndex] }
  let updatedPlayer = { ...baselinePlayer }
  const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
  const tessiaChoices: PendingChoice[] = []
  const pushGain = (amount: number, type: RewardType, gainName?: string) => {
    newState.gains.push({
      round: state.currentRound,
      playerId,
      sourceId: card.id,
      name: gainName ?? card.name,
      amount,
      type,
      source: GainSource.INTRIGUE
    })
  }

  const applyReward = (reward: Reward) => {
    if (reward.spice) {
      updatedPlayer.spice += reward.spice
      pushGain(reward.spice, RewardType.SPICE)
    }
    if (reward.water) {
      updatedPlayer.water += reward.water
      pushGain(reward.water, RewardType.WATER)
    }
    if (reward.solari) {
      updatedPlayer.solari += reward.solari
      pushGain(reward.solari, RewardType.SOLARI)
    }
    if (reward.troops) {
      const recruited = recruitTroopsToGarrison(updatedPlayer, reward.troops)
      updatedPlayer = recruited.player
      pushGain(recruited.recruited, RewardType.TROOPS)
      newState = withRecruitedTroopsDeployLimit(newState, recruited.recruited)
    }
    if (reward.persuasion) {
      updatedPlayer.persuasion += reward.persuasion
      pushGain(reward.persuasion, RewardType.PERSUASION)
    }
    if (reward.victoryPoints) {
      updatedPlayer.victoryPoints += reward.victoryPoints
      pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS)
    }
    if (reward.combat) {
      if (playerHasUnitsInCombat(newState, playerId)) {
        newState.combatStrength[playerId] = (newState.combatStrength[playerId] || 0) + reward.combat
        pushGain(reward.combat, RewardType.COMBAT)
      }
    }
    if (reward.drawCards) {
      updatedPlayer.handCount += reward.drawCards
      pushGain(reward.drawCards, RewardType.DRAW)
    }
    if (reward.intrigueCards) {
      updatedPlayer.intrigueCount += reward.intrigueCards
      pushGain(reward.intrigueCards, RewardType.INTRIGUE)
    }
    if (reward.influence) {
      reward.influence.amounts.forEach(({ faction, amount }) => {
        const applied = applyInfluenceDeltaForPlayer(newState, updatedPlayer, faction, amount, {
          appendGainsTo: newState.gains,
          milestoneMeta,
        })
        newState = applied.state
        updatedPlayer = applied.player
        tessiaChoices.push(...applied.tessiaChoices)
        pushGain(amount, RewardType.INFLUENCE, faction)
      })
    }
    if (reward.mentat && !newState.mentatOwner) {
      newState.mentatOwner = playerId
      updatedPlayer.agents += 1
      pushGain(1, RewardType.MENTAT)
    }
    if (reward.custom === CustomEffect.SHUFFLE_DISCARD_INTO_DECK) {
      updatedPlayer.deck = [...updatedPlayer.deck, ...updatedPlayer.discardPile]
      updatedPlayer.discardPile = []
    }
  }

  card.playEffect?.forEach(effect => {
    if (!effect.reward) return
    if (!intrigueRequirementSatisfied(effect, card, state, playerId)) return
    if (intrigueEffectNeedsDeferral(effect)) return
    if (effect.cost?.discard) return
    if (effect.cost?.influence?.chooseOne && effect.reward.influence?.chooseOne) return
    if (effect.cost?.influence?.chooseOne && state.phase === GamePhase.COMBAT) return
    // Optional phase gating on effects (used by multi-phase intrigue cards like Tiebreaker)
    if (effect.phase) {
      const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
      if (!phases.includes(state.phase)) return
    }
    if (effect.timing === EffectTiming.ON_REVEAL_THIS_ROUND) {
      const active = newState.activeIntrigueThisRound[playerId] || []
      if (!active.some(c => c.id === card.id)) {
        newState.activeIntrigueThisRound[playerId] = [...active, card]
      }
      // Reveal already happened this turn — apply immediately (e.g. Recruitment Mission water).
      if (player.revealed) {
        applyReward(effect.reward)
        return
      }
      const scheduled = newState.scheduledIntrigueOnReveal[playerId] || []
      scheduled.push({
        cardId: card.id,
        name: card.name,
        image: card.image,
        reward: effect.reward
      })
      newState.scheduledIntrigueOnReveal[playerId] = scheduled
      return
    }
    // Endgame-only tiebreaker modifier
    if (effect.reward.tiebreakerSpice) {
      newState.endgameTiebreakerSpice[playerId] =
        (newState.endgameTiebreakerSpice[playerId] || 0) + effect.reward.tiebreakerSpice
      const active = newState.activeIntrigueThisRound[playerId] || []
      if (!active.some(c => c.id === card.id)) {
        newState.activeIntrigueThisRound[playerId] = [...active, card]
      }
      return
    }
    // Acquire effects are handled in PLAY_INTRIGUE case, not here
    // Check this BEFORE acquireToTopThisRound to prevent adding card to activeIntrigueThisRound
    if (effect.reward.acquire) {
      return
    }
    // Immediate intrigue modifier (applies for the remainder of the round / reveal turn)
    // Only process this if it's NOT part of an acquire effect (checked above)
    if (effect.reward.acquireToTopThisRound) {
      newState.acquireToTopThisRound[playerId] = true
      const active = newState.activeIntrigueThisRound[playerId] || []
      if (!active.some(c => c.id === card.id)) {
        newState.activeIntrigueThisRound[playerId] = [...active, card]
      }
      return
    }

    // OR-branches: resolved in PLAY_INTRIGUE / PLAY_COMBAT_INTRIGUE (pending choices)
    if (effect.choiceOpt) {
      return
    }

    const custom = effect.reward.custom
    if (custom === CustomEffect.BINDU_SUSPENSION) {
      updatedPlayer.handCount += 1
      pushGain(1, RewardType.DRAW)
      return
    }
    if (custom === CustomEffect.MASTER_TACTICIAN) {
      return
    }
    if (custom === CustomEffect.DISPATCH_ENVOY) {
      newState.dispatchEnvoyActive[playerId] = true
      return
    }
    if (custom === CustomEffect.INFILTRATE_INTRIGUE) {
      newState.infiltrateIgnoreOccupancyOnce[playerId] = true
      return
    }
    if (custom === CustomEffect.RAPID_MOBILIZATION) {
      newState.pendingRapidMobilization = playerId
      return
    }
    if (custom === CustomEffect.URGENT_MISSION) {
      return
    }
    if (custom === CustomEffect.CORNER_THE_MARKET) {
      const my = countSpiceMustFlowCards(updatedPlayer)
      let vp = 0
      if (my >= 2) vp += 1
      const opponents = state.players.filter(p => p.id !== playerId)
      const moreThanEach =
        opponents.length === 0 || opponents.every(o => countSpiceMustFlowCards(o) < my)
      if (moreThanEach) vp += 1
      if (vp > 0) {
        updatedPlayer.victoryPoints += vp
        pushGain(vp, RewardType.VICTORY_POINTS)
      }
      return
    }
    if (custom === CustomEffect.PLANS_WITHIN_PLANS) {
      const factions = [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.BENE_GESSERIT, FactionType.FREMEN]
      const at3 = factions.filter(f => (state.factionInfluence[f]?.[playerId] ?? 0) >= 3).length
      let vp = 0
      if (at3 >= 4) vp = 2
      else if (at3 === 3) vp = 1
      if (vp > 0) {
        updatedPlayer.victoryPoints += vp
        pushGain(vp, RewardType.VICTORY_POINTS)
      }
      return
    }
    if (custom === CustomEffect.STAGED_INCIDENT) {
      const ct = state.combatTroops[playerId] || 0
      if (ct < 3) return
      const newCt = ct - 3
      const prevStr = newState.combatStrength[playerId] || 0
      const newStr = Math.max(0, prevStr - 6)
      if (newStr <= 0) {
        delete newState.combatStrength[playerId]
      } else {
        newState.combatStrength[playerId] = newStr
      }
      updatedPlayer.combatValue = Math.max(0, (updatedPlayer.combatValue || 0) - 6)
      newState.combatTroops = { ...newState.combatTroops, [playerId]: newCt }
      updatedPlayer.victoryPoints += 1
      pushGain(1, RewardType.VICTORY_POINTS)
      return
    }
    if (custom === CustomEffect.TO_THE_VICTOR) {
      newState.pendingVictorSpiceThisCombat[playerId] = true
      return
    }
    if (custom && isRiseOfIxIntrigueCustom(custom) && state.expansions?.riseOfIx) {
      if (effect.cost) {
        // Cost + custom (Strongarm, Quid Pro Quo) — pay cost below, then resolve custom.
      } else {
        const applied = applyRiseOfIxIntrigueCustomInEffect(
          newState,
          playerId,
          custom,
          card,
          pushGain
        )
        newState = applied
        updatedPlayers = applied.players.map(p => ({ ...p }))
        const refreshed = updatedPlayers.find(p => p.id === playerId)
        if (refreshed) Object.assign(updatedPlayer, refreshed)
        return
      }
    }

    // Bribery: choose-one influence is resolved via pending choices in PLAY_INTRIGUE
    if (effect.reward.influence?.chooseOne) {
      return
    }
    // Double Cross: cost + troop/combat changes are applied in PLAY_INTRIGUE
    if (custom === CustomEffect.DOUBLE_CROSS) {
      return
    }

    // Combat paid effects: confirm via pending choice in PLAY_COMBAT_INTRIGUE
    if (
      state.phase === GamePhase.COMBAT &&
      effect.cost &&
      !effect.choiceOpt &&
      !effect.reward.custom
    ) {
      return
    }

    // Paid intrigue lines that do not need extra UI (CHOAM, Water of Life, …)
    if (effect.cost) {
      const c = effect.cost
      if (
        (c.spice && updatedPlayer.spice < c.spice) ||
        (c.water && updatedPlayer.water < c.water) ||
        (c.solari && updatedPlayer.solari < c.solari) ||
        (c.troops && updatedPlayer.troops < c.troops) ||
        (c.specimen && (updatedPlayer.specimens ?? 0) < c.specimen)
      ) {
        return
      }
      if (c.spice) {
        updatedPlayer.spice -= c.spice
        pushGain(-c.spice, RewardType.SPICE)
      }
      if (c.water) {
        updatedPlayer.water -= c.water
        pushGain(-c.water, RewardType.WATER)
      }
      if (c.solari) {
        updatedPlayer.solari -= c.solari
        pushGain(-c.solari, RewardType.SOLARI)
      }
      if (c.troops) {
        updatedPlayer.troops -= c.troops
        pushGain(-c.troops, RewardType.TROOPS)
      }
      if (c.specimen && newState.expansions?.immortality) {
        updatedPlayer.specimens = Math.max(0, (updatedPlayer.specimens ?? 0) - c.specimen)
        pushGain(-c.specimen, RewardType.SPECIMEN)
      }
      if (effect.reward.custom === CustomEffect.QUID_PRO_QUO && state.expansions?.riseOfIx) {
        updatedPlayers[playerIndex] = updatedPlayer
        newState = { ...newState, players: [...updatedPlayers] }
        newState = applyQuidProQuo(newState, playerId, {
          type: GainSource.INTRIGUE,
          id: card.id,
          name: card.name,
        })
        const refreshed = newState.players.find(p => p.id === playerId)
        if (refreshed) Object.assign(updatedPlayer, refreshed)
        return
      }
      applyReward(effect.reward)
      return
    }

    applyReward(effect.reward)
  })

  if (milestoneMeta.troopsRecruited > 0) {
    newState = withRecruitedTroopsDeployLimit(newState, milestoneMeta.troopsRecruited)
  }
  updatedPlayers[playerIndex] = mergePlayerAfterFactionInfluence(
    updatedPlayer,
    newState,
    baselinePlayer
  )
  return appendTessiaPendingChoices(
    {
      ...newState,
      players: updatedPlayers,
    },
    tessiaChoices
  )
}

/** Apply an intrigue card that is being played (or auto-applied at endgame after reveal). */
function applyIntrigueCardPlay(
  state: GameState,
  playerId: number,
  card: IntrigueCard,
  options?: { targetPlayerId?: number; fromEndgameReveal?: boolean }
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const targetPlayerId = options?.targetPlayerId
  const fromEndgameReveal = options?.fromEndgameReveal ?? false

  let updatedState = handleIntrigueEffect(state, card, playerId)

  if (intrigueCardHasCustom(card, CustomEffect.DOUBLE_CROSS) && targetPlayerId !== undefined) {
    const tid = targetPlayerId
    const pGain = updatedState.players.find(p => p.id === playerId)
    const tGain = updatedState.players.find(p => p.id === tid)
    if (!pGain || !tGain) return state
    const extraGains: Gain[] = [...updatedState.gains]
    const pushG = (amount: number, type: RewardType, pid: number) => {
      extraGains.push({
        round: state.currentRound,
        playerId: pid,
        sourceId: card.id,
        name: card.name,
        amount,
        type,
        source: GainSource.INTRIGUE
      })
    }
    pushG(-1, RewardType.SOLARI, playerId)
    pushG(1, RewardType.TROOPS, playerId)
    pushG(2, RewardType.COMBAT, playerId)
    pushG(-1, RewardType.DEPLOY, tid)
    pushG(-2, RewardType.COMBAT, tid)
    updatedState = {
      ...updatedState,
      gains: extraGains,
      players: updatedState.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            solari: p.solari - 1,
            troops: p.troops - 1,
            combatValue: (p.combatValue || 0) + 2
          }
        }
        if (p.id === tid) {
          return {
            ...p,
            combatValue: Math.max(0, (p.combatValue || 0) - 2)
          }
        }
        return p
      }),
      combatStrength: {
        ...updatedState.combatStrength,
        [playerId]: (updatedState.combatStrength[playerId] || 0) + 2,
        [tid]: Math.max(0, (updatedState.combatStrength[tid] || 0) - 2)
      },
      combatTroops: {
        ...updatedState.combatTroops,
        [playerId]: (updatedState.combatTroops[playerId] || 0) + 1,
        [tid]: Math.max(0, (updatedState.combatTroops[tid] || 0) - 1)
      }
    }
  }

  const pendingChoices: PendingChoice[] = []

  card.playEffect?.forEach(effect => {
    if (!effect.reward) return
    if (!intrigueRequirementSatisfied(effect, card, state, playerId)) return

    if (effect.phase) {
      const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
      if (!phases.includes(state.phase)) return
    }

    if (effect.timing === EffectTiming.ON_REVEAL_THIS_ROUND) return
    if (effect.reward.tiebreakerSpice) return
    if (effect.reward.acquire) return
    if (effect.reward.acquireToTopThisRound) return

    const canAfford = !effect.cost || canAffordIntrigueCost(state, player, effect.cost)
    if (!canAfford) return

    if (effect.reward.influence?.chooseOne && effect.reward.influence.amounts.length > 0 && !effect.cost?.influence?.chooseOne) {
      const choiceId = mintId(
        state,
        { type: GainSource.INTRIGUE, id: card.id },
        'INFLUENCE-CHOOSE',
        pendingChoices.map(c => c.id)
      )
      const optionsList: ChoiceOption[] = effect.reward.influence.amounts.map(({ faction, amount }) => {
        const currentInfluence = state.factionInfluence[faction]?.[playerId] ?? 0
        const disabled = amount < 0 && currentInfluence < -amount
        return {
          cost: effect.cost,
          reward: {
            influence: {
              amounts: [{ faction, amount }]
            }
          },
          disabled
        }
      })

      pendingChoices.push({
        id: choiceId,
        type: ChoiceType.FIXED_OPTIONS,
        prompt: 'Choose a faction to gain influence with',
        options: optionsList,
        source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
      })
    }
  })

  const intriguePendingRewards: PendingReward[] = [...updatedState.pendingRewards]
  const intrigueSource = { type: GainSource.INTRIGUE, id: card.id, name: card.name }

  card.playEffect?.forEach(effect => {
    if (!effect.reward) return
    if (!intrigueRequirementSatisfied(effect, card, state, playerId)) return
    if (effect.phase) {
      const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
      if (!phases.includes(state.phase)) return
    }
    if (effect.timing === EffectTiming.ON_REVEAL_THIS_ROUND) return
    if (effect.reward.acquire || effect.reward.acquireToTopThisRound) return

    if (effect.cost?.influence?.chooseOne) {
      pendingChoices.push(
        createLoseInfluenceChoice(state, playerId, effect.cost.influence, intrigueSource, {
          payOnResolve: {
            spice: effect.cost?.spice,
            water: effect.cost?.water,
            solari: effect.cost?.solari,
            troops: effect.cost?.troops,
          },
          thenGain: effect.reward.influence?.chooseOne ? effect.reward.influence : undefined,
        }, pendingChoices.map(c => c.id))
      )
      return
    }
    if (effect.reward.influence?.chooseOne) {
      return
    }

    if (effect.cost?.discard) {
      const discardCount = effect.cost.discard
      if (player.handCount < discardCount) return
      const choiceId = mintId(state, intrigueSource, 'DISCARD', pendingChoices.map(c => c.id))
      pendingChoices.push({
        id: choiceId,
        type: ChoiceType.CARD_SELECT,
        prompt: `Discard ${discardCount} card(s)`,
        piles: [CardPile.HAND],
        selectionCount: discardCount,
        discardCost: discardCount,
        disabled: player.handCount < discardCount,
        filter: c => isCardInHand(player, c),
        onResolve: (cardIds: number[]) => ({
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: CustomEffect.IXIAN_PROBE,
          data: { cardIds, drawCards: effect.reward?.drawCards ?? 0, sourceCardId: card.id, discardCount },
        }),
        source: intrigueSource,
      })
      return
    }

    if (intrigueEffectNeedsDeferral(effect)) {
      if (effect.reward.trash && effect.cost?.solari) {
        if (player.solari < effect.cost.solari) return
        pendingChoices.push({
          id: mintId(state, intrigueSource, 'TRASH', pendingChoices.map(c => c.id)),
          type: ChoiceType.CARD_SELECT,
          prompt: `${card.name}: choose a card to trash`,
          piles: [CardPile.HAND, CardPile.DISCARD],
          selectionCount: 1,
          onResolve: (cardIds: number[]) => ({
            type: 'CUSTOM_EFFECT',
            playerId,
            customEffect: CustomEffect.CULL,
            data: { cardId: cardIds[0], sourceCardId: card.id },
          }),
          source: intrigueSource,
        })
        return
      }
      const disabled = effect.cost ? !canAffordIntrigueCost(state, player, effect.cost) : false
      pendingChoices.push({
        id: mintId(state, intrigueSource, 'CONFIRM-DEFERRED', pendingChoices.map(c => c.id)),
        type: ChoiceType.FIXED_OPTIONS,
        prompt: `${card.name}: confirm effect`,
        options: [{ cost: effect.cost, reward: effect.reward, disabled }],
        source: intrigueSource,
      })
    }
  })

  if (intrigueCardHasCustom(card, CustomEffect.STRONGARM)) {
    enqueueStrongarmChoice(state, playerId, card, pendingChoices)
  }

  const phaseChoiceOptEffects =
    card.playEffect?.filter(effect => {
      if (!effect.choiceOpt || !effect.reward || effect.reward.acquire) return false
      if (!intrigueRequirementSatisfied(effect, card, state, playerId)) return false
      if (effect.phase) {
        const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
        return phases.includes(state.phase)
      }
      return true
    }) || []

  if (phaseChoiceOptEffects.length >= 2) {
    const choiceId = mintId(
      state,
      { type: GainSource.INTRIGUE, id: card.id },
      'OR',
      pendingChoices.map(c => c.id)
    )
    const optionsList: ChoiceOption[] = phaseChoiceOptEffects.map(effect => {
      let disabled = false
      const cost = effect.cost
      if (cost?.spice && player.spice < cost.spice) disabled = true
      if (cost?.solari && player.solari < cost.solari) disabled = true
      if (cost?.water && player.water < cost.water) disabled = true
      if (cost?.troops && player.troops < cost.troops) disabled = true
      return { cost, reward: effect.reward, disabled }
    })
    pendingChoices.push({
      id: choiceId,
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one option',
      options: optionsList,
      source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
    })
  } else if (phaseChoiceOptEffects.length === 1) {
    const effect = phaseChoiceOptEffects[0]
    if (effect.cost) {
      const c = effect.cost
      const disabled = Boolean(
        (c.spice && player.spice < c.spice) ||
        (c.water && player.water < c.water) ||
        (c.solari && player.solari < c.solari) ||
        (c.troops && player.troops < c.troops)
      )
      pendingChoices.push({
        id: mintId(
          state,
          { type: GainSource.INTRIGUE, id: card.id },
          'CONFIRM',
          pendingChoices.map(c => c.id)
        ),
        type: ChoiceType.FIXED_OPTIONS,
        prompt: `${card.name}: confirm effect`,
        options: [{ cost: effect.cost, reward: effect.reward, disabled }],
        source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
      })
    }
  }

  const acquireEffects =
    card.playEffect?.filter(effect => {
      if (!effect.reward?.acquire || !effect.choiceOpt) return false
      if (effect.phase) {
        const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
        if (!phases.includes(state.phase)) return false
      }
      return true
    }) || []

  if (acquireEffects.length > 0) {
    const choiceId = mintId(
      state,
      { type: GainSource.INTRIGUE, id: card.id },
      'ACQUIRE-OR',
      pendingChoices.map(c => c.id)
    )
    const optionsList: ChoiceOption[] = acquireEffects.map(effect => {
      const cost = effect.cost
      const reward = effect.reward
      const limit = reward?.acquire?.limit || 0

      let disabled = false
      if (cost?.spice && player.spice < cost.spice) disabled = true
      if (cost?.solari && player.solari < cost.solari) disabled = true
      if (cost?.water && player.water < cost.water) disabled = true

      const availableCards = state.imperiumRow.filter(c => (c.cost || 0) <= limit)
      if (availableCards.length === 0) disabled = true

      return { cost, reward, disabled }
    })

    pendingChoices.push({
      id: choiceId,
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one option',
      options: optionsList,
      source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
    })
  }

  if (intrigueCardHasCustom(card, CustomEffect.URGENT_MISSION)) {
    const spaceOpts: ChoiceOption[] = []
    for (const [sid, occ] of Object.entries(state.occupiedSpaces)) {
      if (occ.includes(playerId)) {
        const space = BOARD_SPACES.find(s => s.id === Number(sid))
        if (!space) continue
        spaceOpts.push({
          reward: { recallSpaceId: Number(sid) },
          rewardLabel: space.name
        })
      }
    }
    if (spaceOpts.length > 0) {
      pendingChoices.push({
        id: mintId(
          state,
          { type: GainSource.INTRIGUE, id: card.id },
          'URGENT-MISSION',
          pendingChoices.map(c => c.id)
        ),
        type: ChoiceType.FIXED_OPTIONS,
        prompt: 'Recall one of your Agents from a space',
        options: spaceOpts,
        source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
      })
    }
  }

  const currentTurn =
    updatedState.currTurn?.playerId === playerId
      ? {
          ...updatedState.currTurn,
          pendingChoices: [...(updatedState.currTurn.pendingChoices || []), ...pendingChoices],
          playedIntrigueCard: [...(updatedState.currTurn.playedIntrigueCard || []), { cardId: card.id }]
        }
      : {
          playerId,
          type: TurnType.ACTION,
          playedIntrigueCard: [{ cardId: card.id }],
          pendingChoices
        }

  const alreadyDiscarded = updatedState.intrigueDiscard.some(c => c.id === card.id)
  const intrigueDiscard =
    fromEndgameReveal || alreadyDiscarded
      ? alreadyDiscarded
        ? updatedState.intrigueDiscard
        : [...updatedState.intrigueDiscard, card]
      : [...updatedState.intrigueDiscard, card]

  return {
    ...updatedState,
    pendingRewards: intriguePendingRewards,
    players: fromEndgameReveal
      ? updatedState.players
      : updatedState.players.map(p =>
          p.id === playerId ? { ...p, intrigueCount: p.intrigueCount - 1 } : p
        ),
    intrigueDeck: fromEndgameReveal
      ? updatedState.intrigueDeck
      : updatedState.intrigueDeck.filter(c => c.id !== card.id),
    intrigueDiscard,
    currTurn: currentTurn,
    canEndTurn:
      pendingChoices.length > 0 || intriguePendingRewards.some(r => !r.disabled)
        ? false
        : updatedState.canEndTurn
  }
}

type OpponentDiscardState = NonNullable<GameTurn['opponentDiscardState']>

function isReverendMotherOpponentDiscard(discardState: OpponentDiscardState): boolean {
  return discardState.effect === CustomEffect.REVEREND_MOTHER_MOHIAM
}

function requiredOpponentDiscards(discardState: OpponentDiscardState): number {
  return isReverendMotherOpponentDiscard(discardState) ? 2 : 1
}

function opponentHasDiscardableCards(player: Player): boolean {
  return getOpponentDiscardableCards(player).length > 0
}

function advanceOpponentDiscardState(
  state: GameState,
  discardState: OpponentDiscardState,
  completedOpponentId: number,
  discardCounts: Record<number, number>
): OpponentDiscardState | undefined {
  let remainingOpponents = discardState.remainingOpponents.filter(id => id !== completedOpponentId)

  if (isReverendMotherOpponentDiscard(discardState)) {
    remainingOpponents = remainingOpponents.filter(id => {
      const player = state.players.find(p => p.id === id)
      return player != null && opponentHasDiscardableCards(player)
    })
  }

  if (remainingOpponents.length === 0) return undefined

  const currentOpponent = isReverendMotherOpponentDiscard(discardState)
    ? remainingOpponents.length === 1
      ? remainingOpponents[0]
      : undefined
    : remainingOpponents[0]

  return {
    ...discardState,
    remainingOpponents,
    currentOpponent,
    discardCounts,
  }
}

function opponentDiscardsComplete(
  discardState: OpponentDiscardState,
  opponentId: number,
  discardCounts: Record<number, number>,
  deckAfter: Card[]
): boolean {
  const required = requiredOpponentDiscards(discardState)
  const discarded = discardCounts[opponentId] ?? 0
  if (discarded >= required) return true
  if (isReverendMotherOpponentDiscard(discardState) && deckAfter.length === 0) return true
  return false
}

function applyOpponentDiscards(
  state: GameState,
  actingPlayerId: number,
  opponentId: number,
  cardIds: number[]
): GameState {
  if (!state.currTurn?.opponentDiscardState) return state
  if (actingPlayerId !== state.activePlayerId) return state
  if (cardIds.length === 0) return state

  const discardState = state.currTurn.opponentDiscardState
  if (discardState.currentOpponent !== opponentId) return state

  const opponent = state.players.find(p => p.id === opponentId)
  if (!opponent) return state

  const uniqueIds = [...new Set(cardIds)]
  if (uniqueIds.length !== cardIds.length) return state

  let deck = [...opponent.deck]
  let discardPile = [...opponent.discardPile]
  let handCount = opponent.handCount
  const newGains = [...state.gains]

  for (const cardId of uniqueIds) {
    if (deck.length === 0) return state
    const cardIndex = deck.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return state
    if (opponent.playArea.some(c => c.id === cardId)) return state
    const card = deck[cardIndex]
    deck = deck.filter(c => c.id !== cardId)
    if (cardIndex < handCount) {
      handCount = Math.max(0, handCount - 1)
    }
    discardPile = [...discardPile, card]
    newGains.push({
      round: state.currentRound,
      playerId: opponentId,
      sourceId: card.id,
      name: card.name,
      amount: -1,
      type: RewardType.DISCARD,
      source: GainSource.CARD,
    })
  }

  const discardCounts = { ...(discardState.discardCounts || {}) }
  discardCounts[opponentId] = (discardCounts[opponentId] || 0) + uniqueIds.length

  const hasDiscardedEnough = opponentDiscardsComplete(
    discardState,
    opponentId,
    discardCounts,
    deck
  )

  const players = state.players.map(p =>
    p.id === opponentId ? { ...p, deck, discardPile, handCount } : p
  )

  if (!hasDiscardedEnough) {
    return {
      ...state,
      players,
      gains: newGains,
      currTurn: {
        ...state.currTurn,
        opponentDiscardState: {
          ...discardState,
          discardCounts,
        },
      },
    }
  }

  const newOpponentDiscardState = advanceOpponentDiscardState(
    { ...state, players },
    discardState,
    opponentId,
    discardCounts
  )

  return {
    ...state,
    players,
    gains: newGains,
    currTurn: {
      ...state.currTurn,
      opponentDiscardState: newOpponentDiscardState,
    },
    canEndTurn:
      newOpponentDiscardState === undefined &&
      state.pendingRewards.filter(r => !r.disabled).length === 0,
  }
}

function getCombatIntrigueEligiblePlayerIds(state: GameState): number[] {
  return state.players
    .filter(p => p.intrigueCount >= 1 && playerHasUnitsInCombat(state, p.id))
    .map(p => p.id)
}

/** Players who cannot participate in combat intrigue (auto-pass). */
function getAutoCombatPassPlayerIds(state: GameState): Set<number> {
  return new Set(
    state.players
      .filter(p => p.intrigueCount < 1 || !playerHasUnitsInCombat(state, p.id))
      .map(p => p.id)
  )
}

function isCombatIntrigueEligible(state: GameState, playerId: number): boolean {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return false
  return player.intrigueCount >= 1 && playerHasUnitsInCombat(state, playerId)
}

function combatIntrigueShouldEnd(state: GameState): boolean {
  const eligiblePlayerIds = getCombatIntrigueEligiblePlayerIds(state)
  return (
    state.combatPasses.size === state.players.length ||
    state.players.every(p => p.intrigueCount < 1 || !playerHasUnitsInCombat(state, p.id)) ||
    (eligiblePlayerIds.length > 0 &&
      eligiblePlayerIds.every(id => state.combatPasses.has(id)))
  )
}

function playerCanParticipateInCombat(state: GameState, playerId: number): boolean {
  return playerHasUnitsInCombat(state, playerId)
}

function findNextCombatIntriguePlayer(state: GameState, afterPlayerId: number): number | null {
  let nextIndex = (afterPlayerId + 1) % state.players.length
  let attempts = 0
  while (attempts < state.players.length) {
    if (
      !state.combatPasses.has(nextIndex) &&
      isCombatIntrigueEligible(state, nextIndex)
    ) {
      return nextIndex
    }
    nextIndex = (nextIndex + 1) % state.players.length
    attempts++
  }
  return null
}

/** While resolving a combat intrigue choice, merge auto-passes but keep the acting player. */
function mergeCombatIntriguePasses(state: GameState): GameState {
  if (state.phase !== GamePhase.COMBAT) return state
  const autoPasses = getAutoCombatPassPlayerIds(state)
  autoPasses.delete(state.activePlayerId)
  return {
    ...state,
    combatPasses: new Set([...state.combatPasses, ...autoPasses]),
  }
}

/**
 * After a combat intrigue is fully resolved: merge auto-passes, then advance clockwise
 * from the player who acted so everyone (including earlier passers) may play or pass again.
 */
function finishCombatIntrigueAction(state: GameState, actedPlayerId: number): GameState {
  if (state.phase !== GamePhase.COMBAT) return state

  if ((state.currTurn?.pendingChoices?.length ?? 0) > 0) {
    return mergeCombatIntriguePasses(state)
  }

  const combatPasses = new Set([
    ...state.combatPasses,
    ...getAutoCombatPassPlayerIds(state),
  ])
  const playedIntrigue = state.currTurn?.playedIntrigueCard
  const preserveCombatTurn =
    playedIntrigue && playedIntrigue.length > 0
      ? {
          playerId: actedPlayerId,
          type: TurnType.ACTION,
          playedIntrigueCard: playedIntrigue,
        }
      : null
  const withPasses = { ...state, combatPasses, currTurn: preserveCombatTurn }

  // Actor may play another combat intrigue while they still have cards and troops in the Conflict.
  if (isCombatIntrigueEligible(withPasses, actedPlayerId)) {
    combatPasses.delete(actedPlayerId)
    return {
      ...withPasses,
      combatPasses,
      activePlayerId: actedPlayerId,
    }
  }

  // No troops in combat (or no intrigue left) — auto-pass this seat.
  combatPasses.add(actedPlayerId)

  if (combatIntrigueShouldEnd({ ...withPasses, combatPasses })) {
    return {
      ...withPasses,
      combatPasses: new Set(),
      phase: GamePhase.COMBAT_REWARDS,
      currTurn: null,
    }
  }

  const nextIndex = findNextCombatIntriguePlayer({ ...withPasses, combatPasses }, actedPlayerId)
  if (nextIndex === null) {
    return {
      ...withPasses,
      combatPasses: new Set(),
      phase: GamePhase.COMBAT_REWARDS,
      currTurn: null,
    }
  }

  return {
    ...withPasses,
    combatPasses,
    activePlayerId: nextIndex,
    currTurn: null,
  }
}

/** Sandbox setup edits live in a single history row: replace history[0] with a fresh snapshot. */
function withSandboxSetupHistory(next: GameState): GameState {
  return {
    ...next,
    history: [
      deepCopyGameState({
        ...next,
        historyEntryKind: 'setup',
        history: [],
        setupBaseline: undefined,
      }),
    ],
  }
}

function getCommittedSandboxSetupSnapshot(state: GameState): GameState | null {
  if (state.history[0]?.historyEntryKind === 'setup') {
    return state.history[0]
  }
  if (state.historyEntryKind === 'setup') {
    return state
  }
  return null
}

function deriveSandboxSetupPosition(committed: GameState): SandboxSetupPosition {
  if (committed.sandboxSetupPosition) {
    return { ...committed.sandboxSetupPosition }
  }
  const offset = committed.playerTurnNumberOffset ?? 0
  return {
    round: committed.hideRoundLabel ? null : committed.currentRound,
    playerTurn: offset > 0 ? offset + 1 : null,
  }
}

/** Re-open sandbox setup for editing while keeping the committed board configuration. */
function reenterSandboxSetupEditing(
  committed: GameState,
  setupBaseline: GameState
): GameState {
  const copied = deepCopyGameState(committed)
  const nextState: GameState = {
    ...copied,
    sandboxSetup: true,
    sandboxSetupPosition: deriveSandboxSetupPosition(committed),
    phase: GamePhase.ROUND_START,
    historyEntryKind: undefined,
    hideRoundLabel: undefined,
    playerTurnNumberOffset: undefined,
    setupBaseline: deepCopyGameState(setupBaseline),
    currTurn: null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    canEndTurn: false,
    canAcquireIR: false,
    gains: [],
    pendingRewards: [],
  }
  return withSandboxSetupHistory(nextState)
}

/** Gameplay actions blocked until sandbox setup is committed via SANDBOX_COMMIT_SETUP. */
const SANDBOX_BLOCKED_PLAY_ACTIONS: ReadonlySet<GameAction['type']> = new Set([
  'END_TURN',
  'PLAY_CARD',
  'DEPLOY_TROOP',
  'UNDEPLOY_TROOP',
  'DEPLOY_DREADNOUGHT',
  'UNDEPLOY_DREADNOUGHT',
  'DEPLOY_NEGOTIATOR',
  'UNDEPLOY_NEGOTIATOR',
  'RETREAT_TROOP',
  'PLAY_INTRIGUE',
  'MOBILIZE_GARRISON',
  'MOBILIZE_SECOND_WAVE',
  'ACQUIRE_CARD',
  'PLAY_COMBAT_INTRIGUE',
  'RESOLVE_COMBAT',
  'RESOLVE_CONFLICT_REWARD_CHOICE',
  'START_COMBAT_PHASE',
  'PASS_COMBAT',
  'PLACE_AGENT',
  'REVEAL_CARDS',
  'ACQUIRE_AL',
  'ACQUIRE_SMF',
  'PAY_COST',
  'RESOLVE_CHOICE',
  'RESOLVE_CARD_SELECT',
  'CUSTOM_EFFECT',
  'TRASH_CARD',
  'SELECT_CONFLICT',
  'CLAIM_REWARD',
  'CLAIM_ALL_REWARDS',
  'RESET_IMPERIUM_ROW',
  'SELECT_IMPERIUM_REPLACEMENT',
  'OPPONENT_DISCARD_CHOICE',
  'OPPONENT_DISCARD_CARD',
  'OPPONENT_DISCARD_CARDS',
  'OPPONENT_NO_CARD_ACK',
  'REVEAL_ENDGAME_INTRIGUE',
  'RESOLVE_ENDGAME',
])

function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.sandboxSetup && SANDBOX_BLOCKED_PLAY_ACTIONS.has(action.type)) {
    return state
  }

  switch (action.type) {
    case 'RESET_IMPERIUM_ROW': {
      if (action.cardIds.length === 0) return state

      const deckMap = new Map(state.imperiumRowDeck.map(card => [card.id, card] as [number, Card]))
      const selected: Card[] = []
      const usedIds = new Set<number>()

      for (const id of action.cardIds) {
        const card = deckMap.get(id)
        if (!card) {
          return state
        }
        selected.push(card)
        usedIds.add(id)
      }

      const remaining = state.imperiumRowDeck.filter(card => !usedIds.has(card.id))

      return {
        ...state,
        imperiumRow: selected,
        imperiumRowDeck: remaining
      }
    }
      case 'SELECT_CONFLICT': {
      const conflict = getConflictPool(state.expansions).find(c => c.id === action.conflictId)
      if (!conflict) return state

      const nextState = {
        ...state,
        currentConflict: conflict,
        phase: GamePhase.PLAYER_TURNS,
        activePlayerId: state.firstPlayerMarker,
        players: prepareIlesaPlayersForRound(state.players),
      }

      const withRoundStart = applyRoundStartTech(nextState)
      const withActivePlayer = activatePlayerForTurn(withRoundStart, withRoundStart.firstPlayerMarker)

      // Replace pre-setup history with a round-start baseline so undoing the first
      // turn rewinds to configured imperium row + conflict, not initial setup.
      const roundStartBaseline = deepCopyGameState({
        ...withRoundStart,
        historyEntryKind: 'round-start',
        currTurn: null,
        selectedCard: null,
        selectedCardDeckIndex: null,
        canEndTurn: false,
        canAcquireIR: false,
        gains: [],
        pendingRewards: [],
        history: [],
      })

      const isOpeningRoundStart = state.history.length <= 1 && state.currentRound === 1
      const history = isOpeningRoundStart
        ? [{ ...roundStartBaseline, historyEntryKind: 'setup' as const }]
        : [...state.history, roundStartBaseline]

      return {
        ...withRoundStart,
        setupBaseline: state.setupBaseline,
        history,
      }
    }
    case 'SANDBOX_SET_IMPERIUM_ROW': {
      if (!state.sandboxSetup) return state

      // Cards currently in the row return to the pool so the row can be freely re-picked.
      const pool = [...state.imperiumRow, ...state.imperiumRowDeck]
      const poolMap = new Map(pool.map(card => [card.id, card] as [number, Card]))
      const selected: Card[] = []
      const usedIds = new Set<number>()

      for (const id of action.cardIds) {
        const card = poolMap.get(id)
        if (!card || usedIds.has(id)) return state
        selected.push(card)
        usedIds.add(id)
      }

      return withSandboxSetupHistory({
        ...state,
        imperiumRow: selected,
        imperiumRowDeck: pool.filter(card => !usedIds.has(card.id)),
      })
    }
    case 'SANDBOX_SET_CONFLICT': {
      if (!state.sandboxSetup) return state
      const conflict = getConflictPool(state.expansions).find(c => c.id === action.conflictId)
      if (!conflict) return state

      return withSandboxSetupHistory({
        ...state,
        currentConflict: conflict,
      })
    }
    case 'SANDBOX_SET_CONTROL_MARKER': {
      if (!state.sandboxSetup) return state

      return withSandboxSetupHistory({
        ...state,
        controlMarkers: {
          ...state.controlMarkers,
          [action.space]: action.playerId,
        },
      })
    }
    case 'SANDBOX_SET_DREADNOUGHT_CONTROL': {
      if (!state.sandboxSetup) return state

      return withSandboxSetupHistory(
        applySandboxDreadnoughtControl(state, action.space, action.playerId)
      )
    }
    case 'SANDBOX_SET_MENTAT_OWNER': {
      if (!state.sandboxSetup) return state
      if (action.playerId !== null && !state.players.some(p => p.id === action.playerId)) {
        return state
      }

      return withSandboxSetupHistory({
        ...state,
        mentatOwner: action.playerId,
      })
    }
    case 'SANDBOX_SET_POSITION': {
      if (!state.sandboxSetup) return state

      return withSandboxSetupHistory({
        ...state,
        sandboxSetupPosition: {
          round: action.round,
          playerTurn: action.playerTurn,
        },
      })
    }
    case 'SANDBOX_SET_PLAYER_INFLUENCE': {
      if (!state.sandboxSetup) return state
      if (!state.players.some(p => p.id === action.playerId)) return state

      return withSandboxSetupHistory({
        ...state,
        factionInfluence: {
          ...state.factionInfluence,
          [action.faction]: {
            ...state.factionInfluence[action.faction],
            [action.playerId]: Math.max(0, Math.min(MAX_INFLUENCE, action.value)),
          },
        },
      })
    }
    case 'SANDBOX_UPDATE_PLAYER': {
      if (!state.sandboxSetup) return state
      const player = state.players.find(p => p.id === action.playerId)
      if (!player) return state

      // Swap leaders with another player when picking an already-assigned leader.
      if (
        action.patch.leader !== undefined &&
        action.patch.leader.name !== player.leader.name
      ) {
        const other = state.players.find(
          p => p.id !== action.playerId && p.leader.name === action.patch.leader!.name
        )
        if (other) {
          const updatedPlayers = state.players.map(p => {
            if (p.id === player.id) {
              const resources = applyLeaderStartingResourceDelta(p, other.leader)
              return seedTessiaSnoopers(
                { ...p, leader: other.leader, ...resources },
                state.expansions.riseOfIx
              )
            }
            if (p.id === other.id) {
              const resources = applyLeaderStartingResourceDelta(p, player.leader)
              return seedTessiaSnoopers(
                { ...p, leader: player.leader, ...resources },
                state.expansions.riseOfIx
              )
            }
            return p
          })
          return withSandboxSetupHistory({ ...state, players: updatedPlayers })
        }
      }

      // Swap colors with another player when picking an already-assigned color.
      if (action.patch.color !== undefined && action.patch.color !== player.color) {
        const other = state.players.find(
          p => p.id !== action.playerId && p.color === action.patch.color
        )
        if (other) {
          const updatedPlayers = state.players.map(p => {
            if (p.id === player.id) return { ...p, color: action.patch.color! }
            if (p.id === other.id) return { ...p, color: player.color }
            return p
          })
          return withSandboxSetupHistory({ ...state, players: updatedPlayers })
        }
      }

      // Card pile edits swap with imperium + reserve pools only when cards enter/leave the player.
      const touchesCardPiles =
        action.patch.deck !== undefined ||
        action.patch.discardPile !== undefined ||
        action.patch.trash !== undefined

      let poolUpdate: ReturnType<typeof applySandboxDeckEdit> | null = null
      if (touchesCardPiles) {
        const newDeck = action.patch.deck ?? player.deck
        const newDiscard = action.patch.discardPile ?? player.discardPile
        const newTrash = action.patch.trash ?? player.trash
        poolUpdate = applySandboxDeckEdit(
          {
            imperiumRowDeck: state.imperiumRowDeck,
            arrakisLiaisonDeck: state.arrakisLiaisonDeck,
            spiceMustFlowDeck: state.spiceMustFlowDeck,
            foldspaceDeck: state.foldspaceDeck,
          },
          [...player.deck, ...player.discardPile, ...player.trash],
          [...newDeck, ...newDiscard, ...newTrash]
        )
      }

      const leaderResourceAdjust =
        action.patch.leader && action.patch.leader.name !== player.leader.name
          ? applyLeaderStartingResourceDelta(player, action.patch.leader)
          : null

      let highCouncilSeatOrder = state.highCouncilSeatOrder ?? []
      if (action.patch.hasHighCouncilSeat !== undefined) {
        if (action.patch.hasHighCouncilSeat) {
          if (!highCouncilSeatOrder.includes(action.playerId)) {
            highCouncilSeatOrder = [...highCouncilSeatOrder, action.playerId]
          }
        } else {
          highCouncilSeatOrder = highCouncilSeatOrder.filter(id => id !== action.playerId)
        }
      }

      const leaderChanged =
        action.patch.leader !== undefined && action.patch.leader.name !== player.leader.name

      const updatedPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p
        let next: Player = {
          ...p,
          ...action.patch,
          ...(leaderResourceAdjust ?? {}),
          deck: action.patch.deck !== undefined ? [...action.patch.deck] : p.deck,
          discardPile:
            action.patch.discardPile !== undefined
              ? [...action.patch.discardPile]
              : p.discardPile,
          trash: action.patch.trash !== undefined ? [...action.patch.trash] : p.trash,
        }
        if (leaderChanged) {
          next = seedTessiaSnoopers(next, state.expansions.riseOfIx)
        }
        return next
      })

      let ixBoard = state.ixBoard
      if (action.patch.tech !== undefined) {
        if (tilesAvailableForBoard(updatedPlayers) === 0) {
          ixBoard = buildIxBoardFromSandboxStackTops(
            [null, null, null],
            playerTechTileIds(updatedPlayers)
          )
        } else if (!isSandboxIxBoardReady(updatedPlayers, ixBoard)) {
          ixBoard = undefined
        }
      }

      return withSandboxSetupHistory({
        ...state,
        ...(poolUpdate ?? {}),
        highCouncilSeatOrder,
        players: updatedPlayers,
        ixBoard,
      })
    }
    case 'SANDBOX_SET_IX_BOARD_TOP': {
      if (!state.sandboxSetup || !state.expansions?.riseOfIx) return state
      const { stackTops } = action
      if (stackTops.length !== 3) return state
      if (!isSandboxStackTopsValid(state.players, stackTops)) return state

      return withSandboxSetupHistory({
        ...state,
        ixBoard: buildIxBoardFromSandboxStackTops(stackTops, playerTechTileIds(state.players)),
      })
    }
    case 'SANDBOX_COMMIT_SETUP': {
      if (!state.sandboxSetup) return state

      const position = state.sandboxSetupPosition ?? { round: null, playerTurn: null }
      const nextState = {
        ...state,
        sandboxSetup: false,
        sandboxSetupPosition: undefined,
        phase: GamePhase.PLAYER_TURNS,
        activePlayerId: state.firstPlayerMarker,
        currentRound: position.round ?? state.currentRound ?? 1,
        hideRoundLabel: position.round == null,
        playerTurnNumberOffset:
          position.playerTurn != null ? Math.max(0, position.playerTurn - 1) : 0,
      }

      // The whole sandbox setup becomes one "Setup" history row; undoing the first
      // real turn rewinds to this configured state, undoing again wipes to baseline.
      const setupRow = deepCopyGameState({
        ...nextState,
        historyEntryKind: 'setup',
        currTurn: null,
        selectedCard: null,
        selectedCardDeckIndex: null,
        canEndTurn: false,
        canAcquireIR: false,
        gains: [],
        pendingRewards: [],
        history: [],
        setupBaseline: undefined,
      })

      return {
        ...nextState,
        history: [setupRow],
      }
    }
    case 'END_TURN': {
      const { playerId } = action
      if (playerId !== state.activePlayerId) return state

      let newState = { ...state, pendingAcquireTech: null }
      const player = newState.players[playerId]
      if (!player) return state

      // Do not advance the turn while mandatory resolutions are pending (e.g. Masterstroke faction pick).
      if (state.phase !== GamePhase.END_GAME) {
        if (state.pendingRewards.some((r) => !r.disabled)) return state
        if (state.currTurn?.pendingChoices?.length) return state
        if (state.currTurn?.opponentDiscardState) return state
      }

      // Endgame uses a simpler “done” turn rotation (no agent/reveal structure).
      if (state.phase === GamePhase.END_GAME) {
        const done = new Set(newState.endgameDonePlayers || [])
        done.add(playerId)

        // Find next player who isn't done yet.
        let nextIndex = (playerId + 1) % newState.players.length
        let attempts = 0
        while (attempts < newState.players.length && done.has(newState.players[nextIndex].id)) {
          nextIndex = (nextIndex + 1) % newState.players.length
          attempts++
        }

        const allDone = done.size >= newState.players.length
        return {
          ...newState,
          endgameDonePlayers: done,
          activePlayerId: allDone ? newState.activePlayerId : newState.players[nextIndex].id,
          currTurn: null,
          canEndTurn: true,
          selectedCard: null,
          selectedCardDeckIndex: null,
          canAcquireIR: false,
          gains: [],
          pendingRewards: []
        }
      }

      if (!state.selectedCard && state.currTurn?.type !== TurnType.REVEAL) return state
      const currentTurn = newState.currTurn
      if (!currentTurn) return state

      if(player.revealed) {
        player.discardPile = [...(player.discardPile || []), ...(player.playArea || [])]
        player.playArea = []
        player.persuasion = 0
        // Clear round-scoped intrigue modifiers/UI for this player once their Reveal turn is complete
        newState.acquireToTopThisRound = { ...(newState.acquireToTopThisRound || {}), [playerId]: false }
        newState.scheduledIntrigueOnReveal = { ...(newState.scheduledIntrigueOnReveal || {}), [playerId]: [] }
        newState.activeIntrigueThisRound = { ...(newState.activeIntrigueThisRound || {}), [playerId]: [] }
      }

      if (!newState.players.find(p => !p.revealed)) {
        // All players have revealed - check if anyone can participate in combat
        const playersWithUnits = newState.players.filter(p => playerCanParticipateInCombat(newState, p.id))
        const playersWithIntrigueAndUnits = playersWithUnits.filter(p => p.intrigueCount > 0)
        
        if (playersWithIntrigueAndUnits.length === 0) {
          // Skip combat phase - no one can participate
          return {
            ...newState,
            phase: GamePhase.COMBAT_REWARDS,
            combatPasses: new Set(),
            players: newState.players.map(p =>
              p.id === playerId
                ? {
                    ...p,
                    selectedCard: null,
                  }
                : p
            ),
            activePlayerId: 0,
            history: [...state.history, snapshotStateForHistory(state)],
            currTurn: null,
            canEndTurn: false,
            canAcquireIR: false,
            selectedCard: null,
            selectedCardDeckIndex: null,
            gains: [],
            pendingRewards: []
          }
        }
        
        // Continue to combat phase with first eligible player
        const endTurnCombatPasses = getAutoCombatPassPlayerIds(newState)
        let endTurnCombatActiveId = newState.firstPlayerMarker
        let endTurnCombatActivePlayer = newState.players[endTurnCombatActiveId]
        let endTurnCombatFindAttempts = 0
        while (
          endTurnCombatFindAttempts < newState.players.length &&
          (endTurnCombatPasses.has(endTurnCombatActiveId) ||
            endTurnCombatActivePlayer.intrigueCount < 1 ||
            !playerCanParticipateInCombat(newState, endTurnCombatActiveId))
        ) {
          endTurnCombatActiveId = (endTurnCombatActiveId + 1) % newState.players.length
          endTurnCombatActivePlayer = newState.players[endTurnCombatActiveId]
          endTurnCombatFindAttempts++
        }
        return {
          ...newState,
          phase: GamePhase.COMBAT,
          combatPasses: endTurnCombatPasses,
          players: newState.players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  selectedCard: null,
                }
              : p
          ),
          activePlayerId: endTurnCombatActiveId,
          history: [...state.history, snapshotStateForHistory(state)],
          currTurn: null,
          canEndTurn: false,
          canAcquireIR: false,
          selectedCard: null,
          selectedCardDeckIndex: null,
          gains: [],
          pendingRewards: []
        }
      }
      
      let nextIndex = (playerId + 1) % newState.players.length
      let nextPlayer = newState.players[nextIndex]

      if (shouldConsumeExtraTurn(state)) {
        const clearDispatch = { ...(newState.dispatchEnvoyActive || {}) }
        delete clearDispatch[playerId]
        const clearInfiltrate = { ...(newState.infiltrateIgnoreOccupancyOnce || {}) }
        delete clearInfiltrate[playerId]
        return {
          ...newState,
          dispatchEnvoyActive: clearDispatch,
          infiltrateIgnoreOccupancyOnce: clearInfiltrate,
          players: newState.players.map(p =>
            p.id === playerId ? { ...p, selectedCard: null } : p
          ),
          activePlayerId: playerId,
          history: [...state.history, snapshotStateForHistory(state)],
          ...consumeExtraTurn(newState),
          selectedCard: null,
          selectedCardDeckIndex: null,
          canAcquireIR: false,
          gains: [],
          pendingRewards: [],
        }
      }

      while(nextPlayer.revealed) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      

      // Clear blocked spaces for the player whose turn is starting
      const clearedBlockedSpaces = (newState.blockedSpaces || []).filter(
        bs => bs.playerId !== nextPlayer.id
      )

      const clearDispatch = { ...(newState.dispatchEnvoyActive || {}) }
      delete clearDispatch[playerId]
      const clearInfiltrate = { ...(newState.infiltrateIgnoreOccupancyOnce || {}) }
      delete clearInfiltrate[playerId]

      const updatedPlayers = newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              selectedCard: null,
              agentTurnsThisRound:
                currentTurn.type === TurnType.ACTION
                  ? (p.agentTurnsThisRound ?? 0) + 1
                  : p.agentTurnsThisRound,
            }
          : p
      )

      let playersAfterGraft = updatedPlayers
      if (state.usurpBorrowed && currentTurn.type === TurnType.ACTION) {
        const borrowed = state.usurpBorrowed.card
        playersAfterGraft = updatedPlayers.map(p =>
          p.id === playerId
            ? {
                ...p,
                playArea: p.playArea.filter(c => c.id !== borrowed.id),
                trash: [...p.trash, borrowed],
              }
            : p
        )
        newState = {
          ...newState,
          gains: [
            ...newState.gains,
            {
              round: newState.currentRound,
              playerId,
              sourceId: borrowed.id,
              name: borrowed.name,
              amount: -1,
              type: RewardType.CARD,
              source: GainSource.CARD,
            },
          ],
        }
      }

      const afterAdvance = {
        ...newState,
        blockedSpaces: clearedBlockedSpaces,
        dispatchEnvoyActive: clearDispatch,
        infiltrateIgnoreOccupancyOnce: clearInfiltrate,
        players: playersAfterGraft,
        activePlayerId: nextPlayer.id,
        history: [...state.history, snapshotStateForHistory(state)],
        currTurn: null,
        canEndTurn: false,
        selectedCard: null,
        selectedCardDeckIndex: null,
        canAcquireIR: false,
        gains: [],
        pendingRewards: [],
        graftPair: null,
        pendingGraftPartner: null,
        usurpBorrowed: null,
      }
      return activatePlayerForTurn(afterAdvance, nextPlayer.id)
    }
    case 'DEPLOY_TROOP': {
      const player = state.players.find(p => p.id === action.playerId)
      if (!player || player.troops <= 0) return state
      if (!state.currTurn?.canDeployTroops) return state
      const exclusiveRemaining = getRemainingTheseTroopsDeploySlots(state)
      const generalRemaining = getRemainingDeploySlots(state)
      if (exclusiveRemaining <= 0 && generalRemaining <= 0) return state

      const currentTroops = state.combatTroops[action.playerId] || 0
      const updatedCombat = player.combatValue ? player.combatValue + 2 : 2;
      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removable = (state.currTurn.removableTroops ?? 0) + 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
            ...(exclusiveRemaining > 0
              ? { removableTheseTroops: (state.currTurn.removableTheseTroops ?? 0) + 1 }
              : {}),
          },
          removable,
          retreated
        )
      }
      if (!currentTurn) return state
      
      const newState = {
        ...state,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops + 1
        },
        combatStrength: {
          ...state.combatStrength,
          [action.playerId]: updatedCombat
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, 
              combatValue: updatedCombat, 
              troops: p.troops - 1 }
            : p
        ),
        currTurn: currentTurn
      }

      return checkAndApplyDiversion(checkAndApplyMasterstroke(newState, action.playerId), action.playerId)
    }
    case 'UNDEPLOY_TROOP': {
      const currentTroops = state.combatTroops[action.playerId] || 0
      if (currentTroops <= 0) return state
      if ((state.currTurn?.removableTroops ?? 0) <= 0) return state

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removable = (state.currTurn.removableTroops ?? 0) - 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        const theseRemovable = state.currTurn.removableTheseTroops ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
            ...(theseRemovable > 0
              ? { removableTheseTroops: theseRemovable - 1 }
              : {}),
          },
          removable,
          retreated
        )
      }

      const newCombatStrength = { ...state.combatStrength }
      if (!newCombatStrength[action.playerId]) return state
      const newPlayerCombatStrength = newCombatStrength[action.playerId] - 2
      if (newPlayerCombatStrength <= 0) {
        delete newCombatStrength[action.playerId]
      } else {
        newCombatStrength[action.playerId] = newPlayerCombatStrength
      }

      const newState = {
        ...state,
        currTurn: currentTurn,
        combatStrength: newCombatStrength,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops - 1,
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                combatValue: p.combatValue ? p.combatValue - 2 : 0,
                troops: p.troops + 1,
              }
            : p
        ),
      }

      return checkAndApplyDiversion(revertMasterstrokeIfNeeded(newState, action.playerId), action.playerId)
    }
    case 'DEPLOY_DREADNOUGHT': {
      if (state.expansions?.riseOfIx !== true) return state
      const player = state.players.find(p => p.id === action.playerId)
      const garrison = player?.dreadnoughts?.garrison ?? 0
      if (!player || garrison <= 0) return state
      if (!state.currTurn?.canDeployTroops) return state
      if (getRemainingDeploySlots(state) <= 0) return state

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removableDreads = (state.currTurn.removableDreadnoughts ?? 0) + 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
          },
          state.currTurn.removableTroops ?? 0,
          retreated,
          removableDreads
        )
      }
      if (!currentTurn) return state

      const each = dreadnoughtStrengthEach(player.leader)
      const updatedCombat = player.combatValue ? player.combatValue + each : each

      const newState = {
        ...state,
        combatStrength: {
          ...state.combatStrength,
          [action.playerId]: updatedCombat,
        },
        players: state.players.map(p =>
          p.id === action.playerId && p.dreadnoughts
            ? {
                ...p,
                combatValue: updatedCombat,
                dreadnoughts: {
                  ...p.dreadnoughts,
                  garrison: p.dreadnoughts.garrison - 1,
                  conflict: p.dreadnoughts.conflict + 1,
                },
              }
            : p
        ),
        currTurn: currentTurn,
      }

      return checkAndApplyDiversion(newState, action.playerId)
    }
    case 'UNDEPLOY_DREADNOUGHT': {
      if (state.expansions?.riseOfIx !== true) return state
      const player = state.players.find(p => p.id === action.playerId)
      if ((player?.dreadnoughts?.conflict ?? 0) <= 0) return state
      if ((state.currTurn?.removableDreadnoughts ?? 0) <= 0) return state

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removableDreads = (state.currTurn.removableDreadnoughts ?? 0) - 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
          },
          state.currTurn.removableTroops ?? 0,
          retreated,
          removableDreads
        )
      }

      const each = dreadnoughtStrengthEach(player!.leader)
      const newCombatStrength = { ...state.combatStrength }
      const prev = newCombatStrength[action.playerId] ?? player!.combatValue ?? 0
      const newPlayerCombatStrength = prev - each
      if (newPlayerCombatStrength <= 0) {
        delete newCombatStrength[action.playerId]
      } else {
        newCombatStrength[action.playerId] = newPlayerCombatStrength
      }

      return checkAndApplyDiversion(
        {
          ...state,
          currTurn: currentTurn,
          combatStrength: newCombatStrength,
          players: state.players.map(p =>
            p.id === action.playerId && p.dreadnoughts
              ? {
                  ...p,
                  combatValue: Math.max(0, (p.combatValue || 0) - each),
                  dreadnoughts: {
                    ...p.dreadnoughts,
                    garrison: p.dreadnoughts.garrison + 1,
                    conflict: p.dreadnoughts.conflict - 1,
                  },
                }
              : p
          ),
        },
        action.playerId
      )
    }
    case 'DEPLOY_NEGOTIATOR': {
      if (state.expansions?.riseOfIx !== true) return state
      const player = state.players.find(p => p.id === action.playerId)
      if (!player || (player.negotiatorsOnIx ?? 0) <= 0) return state
      if (!state.currTurn?.canDeployTroops) return state
      if (getRemainingDeploySlots(state) <= 0) return state

      const currentNegotiators = state.combatNegotiators?.[action.playerId] ?? 0
      const updatedCombat = player.combatValue ? player.combatValue + 2 : 2

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removableNegotiators = (state.currTurn.removableNegotiators ?? 0) + 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
            removableNegotiators,
          },
          state.currTurn.removableTroops ?? 0,
          retreated,
          state.currTurn.removableDreadnoughts ?? 0
        )
      }
      if (!currentTurn) return state

      const newState = {
        ...state,
        combatNegotiators: {
          ...(state.combatNegotiators ?? {}),
          [action.playerId]: currentNegotiators + 1,
        },
        combatStrength: {
          ...state.combatStrength,
          [action.playerId]: updatedCombat,
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                combatValue: updatedCombat,
                negotiatorsOnIx: (p.negotiatorsOnIx ?? 0) - 1,
              }
            : p
        ),
        currTurn: currentTurn,
      }

      return checkAndApplyDiversion(checkAndApplyMasterstroke(newState, action.playerId), action.playerId)
    }
    case 'UNDEPLOY_NEGOTIATOR': {
      if (state.expansions?.riseOfIx !== true) return state
      const currentNegotiators = state.combatNegotiators?.[action.playerId] ?? 0
      if (currentNegotiators <= 0) return state
      if ((state.currTurn?.removableNegotiators ?? 0) <= 0) return state

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removableNegotiators = (state.currTurn.removableNegotiators ?? 0) - 1
        const retreated = state.currTurn.troopsRetreatedFromConflict ?? 0
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
            removableNegotiators,
          },
          state.currTurn.removableTroops ?? 0,
          retreated,
          state.currTurn.removableDreadnoughts ?? 0
        )
      }

      const newCombatStrength = { ...state.combatStrength }
      if (!newCombatStrength[action.playerId]) return state
      const newPlayerCombatStrength = newCombatStrength[action.playerId] - 2
      if (newPlayerCombatStrength <= 0) {
        delete newCombatStrength[action.playerId]
      } else {
        newCombatStrength[action.playerId] = newPlayerCombatStrength
      }

      const newState = {
        ...state,
        currTurn: currentTurn,
        combatStrength: newCombatStrength,
        combatNegotiators: {
          ...(state.combatNegotiators ?? {}),
          [action.playerId]: currentNegotiators - 1,
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                combatValue: p.combatValue ? p.combatValue - 2 : 0,
                negotiatorsOnIx: (p.negotiatorsOnIx ?? 0) + 1,
              }
            : p
        ),
      }

      return checkAndApplyDiversion(revertMasterstrokeIfNeeded(newState, action.playerId), action.playerId)
    }
    case 'RETREAT_TROOP': {
      const fromEffect = action.fromEffect ?? false
      if (!fromEffect) return state

      const currentTroops = state.combatTroops[action.playerId] || 0
      if (currentTroops <= 0) return state

      const bypassAllowance = action.bypassAllowance ?? false
      if (!bypassAllowance && state.currTurn) {
        const allowance = state.currTurn.effectRetreatAllowance ?? 0
        const used = state.currTurn.effectRetreatsUsed ?? 0
        if (used >= allowance) return state
      }

      let currentTurn = state.currTurn
      if (state.activePlayerId === action.playerId && state.currTurn) {
        const removableNow = state.currTurn.removableTroops ?? 0
        const removable = removableNow > 0 ? removableNow - 1 : 0
        const retreated = (state.currTurn.troopsRetreatedFromConflict ?? 0) + 1
        currentTurn = syncDeployTurnStats(
          {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn.type || TurnType.ACTION,
            effectRetreatsUsed: bypassAllowance
              ? state.currTurn.effectRetreatsUsed
              : (state.currTurn.effectRetreatsUsed ?? 0) + 1,
          },
          removable,
          retreated
        )
      }

      const newCombatStrength = { ...state.combatStrength }
      if (!newCombatStrength[action.playerId]) return state
      const newPlayerCombatStrength = newCombatStrength[action.playerId] - 2
      if (newPlayerCombatStrength <= 0) {
        delete newCombatStrength[action.playerId]
      } else {
        newCombatStrength[action.playerId] = newPlayerCombatStrength
      }

      const newState = {
        ...state,
        currTurn: currentTurn,
        combatStrength: newCombatStrength,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops - 1,
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? {
                ...p,
                combatValue: p.combatValue ? p.combatValue - 2 : 0,
                troops: p.troops + 1,
              }
            : p
        ),
      }

      return revertMasterstrokeIfNeeded(newState, action.playerId)
    }
    case 'START_COMBAT_PHASE': {
      const newState = {...state}
      newState.combatPasses = getAutoCombatPassPlayerIds(newState)

      if(newState.combatPasses.size === newState.players.length) {
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      }
      let nextIndex = newState.firstPlayerMarker
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.intrigueCount < 1 || newState.combatTroops[nextIndex] < 1) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      return {
        ...newState,
        phase: GamePhase.COMBAT,
        activePlayerId: nextIndex,
        pendingVictorSpiceThisCombat: {},
        pendingVictorSolariThisCombat: {},
      }
    }
    case 'PASS_COMBAT': {
      const { playerId } = action
      const newState = {...state}
      newState.combatPasses.add(playerId)
      const eligiblePlayerIds = getCombatIntrigueEligiblePlayerIds(newState)

      // Check if combat should end
      if (
        newState.combatPasses.size === newState.players.length ||
        newState.players.every(p => p.intrigueCount < 1 || newState.combatTroops[p.id] < 1) ||
        (eligiblePlayerIds.length > 0 &&
          eligiblePlayerIds.every(id => newState.combatPasses.has(id)))
      ) {
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      }

      // Find next eligible player
      let nextIndex = (playerId + 1) % newState.players.length
      let attempts = 0
      const maxAttempts = newState.players.length
      
      while(attempts < maxAttempts && 
            (newState.combatPasses.has(nextIndex) || 
             newState.players[nextIndex].intrigueCount < 1 || 
             newState.combatTroops[nextIndex] < 1)) {
        if (
          newState.players[nextIndex].intrigueCount < 1 ||
          newState.combatTroops[nextIndex] < 1
        ) {
          newState.combatPasses.add(nextIndex)
        }
        nextIndex = (nextIndex + 1) % newState.players.length
        attempts++
      }
      
      // If we couldn't find an eligible player, end combat
      if(attempts >= maxAttempts) {
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      }
    
      return {
        ...newState,
        activePlayerId: nextIndex,
        currTurn: null,
      }
    }
    case 'PLAY_COMBAT_INTRIGUE': {
      const { playerId, cardId } = action
      if (playerId !== state.activePlayerId) return state
      if (state.phase !== GamePhase.COMBAT) return state

      const player = state.players.find(p => p.id === playerId)
      if (!player || player.intrigueCount < 1) return state
      if ((state.combatTroops[playerId] || 0) < 1 && !playerHasUnitsInCombat(state, playerId)) return state

      const card = state.intrigueDeck.find(c => c.id === cardId)

      if (!card || (card.type !== IntrigueCardType.COMBAT && !intrigueHasPhaseEffect(card, GamePhase.COMBAT))) {
        return state
      }

      if (
        intrigueCardHasCustom(card, CustomEffect.STAGED_INCIDENT) &&
        (state.combatTroops[playerId] || 0) < 3
      ) {
        return state
      }

      if (!canPlayIntrigueCardNow(state, player, card)) return state

      const updatedState = handleIntrigueEffect(state, card, playerId)
      const pendingCombatChoices: PendingChoice[] = []
      if (intrigueCardHasCustom(card, CustomEffect.MASTER_TACTICIAN)) {
        const ct = state.combatTroops[playerId] || 0
        pendingCombatChoices.push({
          id: mintId(
            state,
            { type: GainSource.INTRIGUE, id: card.id },
            'MASTER-TACTICIAN',
            pendingCombatChoices.map(c => c.id)
          ),
          type: ChoiceType.FIXED_OPTIONS,
          prompt: 'Master Tactician: choose one',
          options: [
            { reward: { combat: 3 }, rewardLabel: '+3 strength' },
            { reward: { retreatFromConflict: 1 }, rewardLabel: 'Retreat 1 troop', disabled: ct < 1 },
            { reward: { retreatFromConflict: 2 }, rewardLabel: 'Retreat 2 troops', disabled: ct < 2 },
            { reward: { retreatFromConflict: 3 }, rewardLabel: 'Retreat 3 troops', disabled: ct < 3 },
          ],
          source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
        })
      }

      card.playEffect?.forEach(effect => {
        if (!effect.reward) return
        if (effect.phase) {
          const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
          if (!phases.includes(GamePhase.COMBAT)) return
        }
        if (!intrigueRequirementSatisfied(effect, card, state, playerId)) return

        if (requiresInfluenceChoices(effect.cost, effect.reward)) {
          const influence = effect.cost!.influence!
          const optionsList: ChoiceOption[] = influence.amounts.map(({ faction, amount }) => {
            const currentInfluence = state.factionInfluence[faction]?.[playerId] ?? 0
            const disabled = amount < 0 && currentInfluence < -amount
            return {
              reward: {
                influence: { amounts: [{ faction, amount }] },
                ...(effect.reward?.combat ? { combat: effect.reward.combat } : {}),
              },
              disabled,
            }
          })
          pendingCombatChoices.push({
            id: mintId(
              state,
              { type: GainSource.INTRIGUE, id: card.id },
              'INFLUENCE-COMBAT',
              pendingCombatChoices.map(c => c.id)
            ),
            type: ChoiceType.FIXED_OPTIONS,
            prompt: `${card.name}: choose influence to lose`,
            options: optionsList,
            source: { type: GainSource.INTRIGUE, id: card.id, name: card.name },
          })
          return
        }

        if (!effect.cost || effect.choiceOpt || effect.reward?.custom) return

        const c = effect.cost
        const disabled = Boolean(
          (c.spice && player.spice < c.spice) ||
          (c.water && player.water < c.water) ||
          (c.solari && player.solari < c.solari) ||
          (c.troops && player.troops < c.troops)
        )

        pendingCombatChoices.push({
          id: mintId(
            state,
            { type: GainSource.INTRIGUE, id: card.id },
            'COMBAT-PAID',
            pendingCombatChoices.map(c => c.id)
          ),
          type: ChoiceType.FIXED_OPTIONS,
          prompt: `${card.name}: confirm effect`,
          options: [{ cost: effect.cost, reward: effect.reward, disabled }],
          source: { type: GainSource.INTRIGUE, id: card.id, name: card.name }
        })
      })
      const newState = {
        ...updatedState,
        // Playing intrigue breaks the pass chain — eligible players may act again (rules).
        combatPasses: getAutoCombatPassPlayerIds(updatedState),
        players: updatedState.players.map(p =>
          p.id === playerId
            ? { ...p, intrigueCount: p.intrigueCount - 1 }
            : p
        ),
        intrigueDeck: updatedState.intrigueDeck.filter(c => c.id !== cardId),
        intrigueDiscard: [...updatedState.intrigueDiscard, card],
        currTurn:
          pendingCombatChoices.length > 0
            ? {
                playerId,
                type: TurnType.ACTION,
                playedIntrigueCard: [
                  ...(updatedState.currTurn?.playedIntrigueCard || []),
                  { cardId }
                ],
                pendingChoices: pendingCombatChoices
              }
            : {
                ...(updatedState.currTurn || { playerId, type: TurnType.ACTION }),
                playedIntrigueCard: [
                  ...(updatedState.currTurn?.playedIntrigueCard || []),
                  { cardId }
                ]
              },
        canEndTurn: pendingCombatChoices.length > 0 ? false : updatedState.canEndTurn
      }

      return finishCombatIntrigueAction(newState, playerId)
    }
    case 'MOBILIZE_GARRISON': {
      const { playerId, count } = action
      if (playerId !== state.activePlayerId) return state
      if (state.pendingRapidMobilization !== playerId) return state
      if (count < 0) return state
      const p = state.players.find(pl => pl.id === playerId)
      if (!p || count > p.troops) return state
      const mobilizeTurn: GameTurn = {
        ...(state.currTurn ?? { playerId, type: TurnType.ACTION }),
        playerId,
        canDeployTroops: true,
        troopLimit: count + (state.currTurn?.removableTroops ?? 0),
      }
      let s = { ...state, currTurn: mobilizeTurn }
      for (let i = 0; i < count; i++) {
        s = gameReducer(s, { type: 'DEPLOY_TROOP', playerId })
      }
      return { ...s, pendingRapidMobilization: null }
    }
    case 'MOBILIZE_SECOND_WAVE': {
      const { playerId, troops, dreadnoughts } = action
      if (state.phase !== GamePhase.COMBAT && state.phase !== GamePhase.PLAYER_TURNS) return state
      if (state.pendingSecondWave !== playerId) return state
      if (troops < 0 || dreadnoughts < 0 || troops + dreadnoughts > 2) return state
      const p = state.players.find(pl => pl.id === playerId)
      if (!p) return state
      if (troops > p.troops) return state
      if (dreadnoughts > (p.dreadnoughts?.garrison ?? 0)) return state

      const mobilizeTurn: GameTurn = {
        ...(state.currTurn ?? { playerId, type: TurnType.ACTION }),
        playerId,
        canDeployTroops: true,
        troopLimit: troops + dreadnoughts + (state.currTurn?.removableTroops ?? 0) + (state.currTurn?.removableDreadnoughts ?? 0),
      }
      let s = { ...state, currTurn: mobilizeTurn }
      for (let i = 0; i < troops; i++) {
        s = gameReducer(s, { type: 'DEPLOY_TROOP', playerId })
      }
      for (let i = 0; i < dreadnoughts; i++) {
        s = gameReducer(s, { type: 'DEPLOY_DREADNOUGHT', playerId })
      }
      return { ...s, pendingSecondWave: null }
    }
    case 'RESOLVE_COMBAT': {
      if (!state.currentConflict) return state
      if (state.phase !== GamePhase.COMBAT_REWARDS) return state
      const conflictId = state.currentConflict.id
      // Immediate rewards are applied on the first resolve; further confirms must go
      // through RESOLVE_CONFLICT_REWARD_CHOICE, not a second RESOLVE_COMBAT.
      if (
        state.combatRewardsResolvedConflictId === conflictId ||
        (state.pendingConflictRewardChoices?.length ?? 0) > 0 ||
        state.combatResolutionDeferred
      ) {
        return state
      }

      const strength = {...state.combatStrength}
      const placements = determinePlacements(strength, state.players.length) as Placements
      let newState = returnExpiredDreadnoughtControls({ ...state })

      const winnerIds = placements.first ?? []
      newState = resolveNonWinnerDreadnoughts(newState, winnerIds)

      const pendingChoices: NonNullable<GameState['pendingConflictRewardChoices']> = []
      const pendingRewards: PendingReward[] = [...state.pendingRewards]
      let mentatOwnerNextRound: number | null = null

      const deferConflictChoice = (reward: ConflictReward, placement: string, playerIds: number[]) => {
        const options = buildConflictChoiceOptions(reward)
        if (options.length === 0) return
        pendingChoices.push({
          id: nextSemanticId(
            { type: 'conflict', id: state.currentConflict.id },
            `CONFLICT-REWARD-${placement}-p${playerIds[0]}`,
            [...(state.pendingConflictRewardChoices ?? []).map(c => c.id), ...pendingChoices.map(c => c.id)]
          ),
          playerId: playerIds[0],
          placement,
          conflictId: state.currentConflict.id,
          conflictName: state.currentConflict.name,
          options,
        })
      }

      const applyPlacementRewards = (
        rewards: ConflictReward[],
        placement: string,
        playerIds: number[]
      ) => {
        newState = applyRiseOfIxConflictPlacementRewards(
          newState,
          rewards,
          placement,
          playerIds,
          conflictId,
          state.currentConflict.name,
          (current, reward, pl, ids) => applyReward(current, reward, pl, ids),
          deferConflictChoice,
          pendingChoices,
          pendingRewards
        )
      }

      if (placements.first !== null && placements.first.length > 0) {
        applyPlacementRewards(state.currentConflict.rewards.first, '1st place', placements.first)
        if (state.currentConflict.rewards.first.find(r => r.type === RewardType.AGENT)) {
          mentatOwnerNextRound = placements.first[0]
        }
        if (state.expansions?.riseOfIx) {
          for (const winnerId of placements.first) {
            pendingChoices.push(
              ...buildDreadnoughtControlChoices(
                newState,
                winnerId,
                state.currentConflict.id,
                state.currentConflict.name,
                [...pendingChoices.map(c => c.id)]
              )
            )
          }
        }
      }

      if (placements.second !== null && placements.second.length > 0) {
        applyPlacementRewards(state.currentConflict.rewards.second, '2nd place', placements.second)
      }

      if (placements.third !== null && placements.third.length > 0 && state.players.length === 4) {
        applyPlacementRewards(state.currentConflict.rewards.third ?? [], '3rd place', placements.third)
      }

      // To the Victor… — +3 spice when the Conflict winner had played this combat intrigue
      if (placements.first !== null && placements.first.length > 0) {
        const winnerId = placements.first[0]
        if (state.pendingVictorSpiceThisCombat?.[winnerId]) {
          const extraGains: Gain[] = [...(newState.gains || [])]
          extraGains.push({
            round: state.currentRound,
            playerId: winnerId,
            sourceId: getIntrigueCardByCustom(CustomEffect.TO_THE_VICTOR)?.id ?? 0,
            name: 'To the Victor…',
            amount: 3,
            type: RewardType.SPICE,
            source: GainSource.INTRIGUE
          })
          newState = {
            ...newState,
            gains: extraGains,
            players: newState.players.map(p =>
              p.id === winnerId ? { ...p, spice: p.spice + 3 } : p
            ),
            pendingVictorSpiceThisCombat: {
              ...(state.pendingVictorSpiceThisCombat || {}),
              [winnerId]: false
            }
          }
        }
        newState = grantStrategicPushSolari(newState, winnerId)
      }

      if (pendingChoices.length > 0) {
        return {
          ...newState,
          pendingRewards,
          combatRewardsResolvedConflictId: conflictId,
          pendingConflictRewardChoices: pendingChoices,
          combatResolutionDeferred: { mentatOwnerNextRound },
        }
      }

      const withAfterConflictTech = applyAfterConflictTechEffects(
        newState,
        placements.first ?? []
      )

      return appendCombatSnapshotAndTransition(
        { ...withAfterConflictTech, combatRewardsResolvedConflictId: conflictId, pendingRewards },
        state,
        mentatOwnerNextRound
      )
    }
    case 'RESOLVE_CONFLICT_REWARD_CHOICE': {
      const { choiceId } = action
      const pending = state.pendingConflictRewardChoices
      if (
        !pending ||
        (state.phase !== GamePhase.COMBAT && state.phase !== GamePhase.COMBAT_REWARDS)
      ) {
        return state
      }
      const choice = pending.find(c => c.id === choiceId)
      if (!choice) return state

      // Decision events: optionIndex selects from the live choice's options.
      let reward = action.reward
      if (action.optionIndex != null) {
        const selected = choice.options[action.optionIndex]
        if (!selected) return state
        reward = selected.reward
      }
      if (!reward) return state

      let newState = applyConflictChoiceReward(state, reward, choice.playerId, {
        id: choice.conflictId,
        name: choice.conflictName + ' - ' + choice.placement
      })

      const remaining = pending.filter(c => c.id !== choiceId)
      newState = { ...newState, pendingConflictRewardChoices: remaining.length > 0 ? remaining : undefined }

      if (remaining.length > 0) {
        return newState
      }

      const deferred = state.combatResolutionDeferred
      const mentatOwnerNextRound = deferred?.mentatOwnerNextRound ?? null
      newState = { ...newState, combatResolutionDeferred: undefined }
      return appendCombatSnapshotAndTransition(newState, state, mentatOwnerNextRound)
    }
    case 'PLAY_INTRIGUE': {
      const { cardId, playerId, targetPlayerId } = action
      if (playerId !== state.activePlayerId) return state
      if (state.phase !== GamePhase.PLAYER_TURNS && state.phase !== GamePhase.END_GAME) return state

      const player = state.players.find(p => p.id === playerId)
      if (!player || player.intrigueCount < 1) return state

      const card = state.intrigueDeck.find(c => c.id === cardId)

      if (!card) return state

      // Bindu Suspension: start of Agent turn only — before Play card / Agent placement / Reveal
      if (intrigueCardHasCustom(card, CustomEffect.BINDU_SUSPENSION)) {
        if (player.revealed || state.selectedCard !== null || state.currTurn?.agentSpace) return state
        if (state.phase !== GamePhase.PLAYER_TURNS) return state
        const afterEffect = handleIntrigueEffect(state, card, playerId)
        const afterSpend = {
          ...afterEffect,
          players: afterEffect.players.map(p =>
            p.id === playerId ? { ...p, intrigueCount: p.intrigueCount - 1 } : p
          ),
          intrigueDeck: afterEffect.intrigueDeck.filter(c => c.id !== cardId),
          intrigueDiscard: [...afterEffect.intrigueDiscard, card]
        }
        return advanceActivePlayerAfterBindu(afterSpend, playerId)
      }

      // Plot intrigue may be played during Reveal turn except Bindu (handled above).
      if (state.phase === GamePhase.PLAYER_TURNS && player.revealed) {
        if (
          (card.type !== IntrigueCardType.PLOT &&
            !intrigueHasPhaseEffect(card, GamePhase.PLAYER_TURNS)) ||
          intrigueCardHasCustom(card, CustomEffect.BINDU_SUSPENSION)
        ) {
          return state
        }
      }

      // In Player Turns: Plot intrigue, or Combat intrigue with a player-turn effect (hybrid OR cards)
      if (
        state.phase === GamePhase.PLAYER_TURNS &&
        card.type !== IntrigueCardType.PLOT &&
        !intrigueHasPhaseEffect(card, GamePhase.PLAYER_TURNS)
      ) {
        return state
      }
      // In Endgame: allow Endgame intrigue, plus any Combat intrigue that has an endgame effect (e.g. Tiebreaker)
      if (state.phase === GamePhase.END_GAME) {
        const hasEndgameEffect = Boolean(card.playEffect?.some(e => {
          if (!e.phase) return card.type === IntrigueCardType.ENDGAME
          const phases = Array.isArray(e.phase) ? e.phase : [e.phase]
          return phases.includes(GamePhase.END_GAME)
        }))
        if (!hasEndgameEffect) return state
      }

      if (intrigueCardHasCustom(card, CustomEffect.DOUBLE_CROSS)) {
        if (targetPlayerId === undefined || targetPlayerId === playerId) return state
        if (player.solari < 1) return state
        if ((state.combatTroops[targetPlayerId] || 0) < 1) return state
        if (player.troops < 1) return state
      }
      if (intrigueCardHasCustom(card, CustomEffect.URGENT_MISSION)) {
        const hasOccupied = Object.entries(state.occupiedSpaces).some(([, occ]) => occ.includes(playerId))
        if (!hasOccupied) return state
      }
      if (intrigueCardHasCustom(card, CustomEffect.STRONGARM) && !canPlayStrongarm(state, playerId)) {
        return state
      }

      if (!canPlayIntrigueCardNow(state, player, card)) return state

      return applyIntrigueCardPlay(state, playerId, card, { targetPlayerId })
    }

    case 'RESOLVE_ENDGAME': {
      if (state.phase !== GamePhase.END_GAME) return state
      const withTech = applyEndgameTechScoring(state)
      return { ...withTech, endgameWinners: resolveEndgameWinners(withTech) }
    }
    case 'REVEAL_ENDGAME_INTRIGUE': {
      const { playerId, cardIds } = action
      if (state.phase !== GamePhase.END_GAME || state.endgameWinners) return state
      if (playerId !== state.activePlayerId) return state

      const player = state.players.find(p => p.id === playerId)
      if (!player || player.intrigueCount < 1) return state
      if (cardIds.length !== player.intrigueCount) return state
      if (new Set(cardIds).size !== cardIds.length) return state

      const selectedCards = cardIds
        .map(id => state.intrigueDeck.find(c => c.id === id))
        .filter((card): card is IntrigueCard => Boolean(card))
      if (selectedCards.length !== cardIds.length) return state

      const { state: afterReveal, applyQueue } = revealEndgameIntrigueSelection(
        state,
        playerId,
        selectedCards
      )
      return advanceAfterEndgameReveal({
        ...afterReveal,
        endgameApplyQueue: [...(afterReveal.endgameApplyQueue ?? []), ...applyQueue],
      })
    }
    case 'PLAY_CARD': {
      const { playerId, cardId, deckIndex } = action
      const player = state.players.find(p => p.id === playerId)

      if (state.currTurn?.opponentDiscardState) {
        return state
      }

      if (!player || playerId !== state.activePlayerId) return state

      let resolvedDeckIndex =
        typeof deckIndex === 'number' && player.deck[deckIndex]?.id === cardId
          ? deckIndex
          : player.deck.findIndex(c => c.id === cardId)
      const card = resolvedDeckIndex >= 0 ? player.deck[resolvedDeckIndex] : undefined

      if (!card) return state
      // Create or update the current turn
      const isContinuingTurn = state.currTurn?.playerId === playerId
      const cardChanged = isContinuingTurn && state.currTurn?.cardId !== cardId
      const gainsStartIndex =
        isContinuingTurn && !cardChanged
          ? state.currTurn!.gainsStartIndex ?? state.gains.length
          : state.gains.length
      const currentTurn: GameTurn = isContinuingTurn
        ? {
            ...state.currTurn!,
            playerId,
            type: TurnType.ACTION,
            cardId,
            gainsStartIndex,
            ...(cardChanged
              ? {
                  agentSpace: undefined,
                  agentSpaceId: undefined,
                  canDeployTroops: false,
                  troopLimit: 0,
                  removableTroops: 0,
                  troopsDeployedToConflict: 0,
                  troopsRetreatedFromConflict: 0,
                  effectRetreatAllowance: 0,
                  effectRetreatsUsed: 0,
                }
              : {}),
          }
        : {
            playerId,
            type: TurnType.ACTION,
            cardId,
            agentSpace: undefined,
            canDeployTroops: false,
            troopLimit: 0,
            removableTroops: 0,
            troopsDeployedToConflict: 0,
            troopsRetreatedFromConflict: 0,
            gainsStartIndex: state.gains.length,
            persuasionCount: 0,
            gainedEffects: [],
            acquiredCards: [],
            pendingChoices: [],
          }

      // Kwisatz Haderach: choose supply vs board recall, or auto-route when only one source exists
      if (isKwisatzHaderachCard(card)) {
        const spaceIds = Object.entries(state.occupiedSpaces)
          .filter(([, ids]) => ids.includes(playerId))
          .map(([sid]) => Number(sid))
        const hasBoardAgents = spaceIds.length > 0
        const hasSupplyAgents = player.agents > 0

        if (!hasBoardAgents && !hasSupplyAgents) {
          return state
        }

        const kwisatzBase = {
          ...state,
          selectedCard: cardId,
          selectedCardDeckIndex: resolvedDeckIndex,
          currTurn: currentTurn,
        }

        if (hasBoardAgents && hasSupplyAgents) {
          const choiceId = nextSemanticId(
            { type: GainSource.CARD, id: card.id },
            'KWISATZ-AGENT-SOURCE',
            (currentTurn.pendingChoices ?? []).map(c => c.id)
          )
          const pendingChoice: FixedOptionsChoice = {
            id: choiceId,
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Kwisatz Haderach — agent source',
            options: [
              {
                reward: { custom: CustomEffect.KWISATZ_FROM_SUPPLY },
                rewardLabel: 'Agent from supply',
              },
              {
                reward: { custom: CustomEffect.KWISATZ_RECALL_AGENT },
                rewardLabel: 'Recall from board',
              },
            ],
            source: { type: GainSource.CARD, id: card.id, name: card.name },
          }
          return {
            ...kwisatzBase,
            canEndTurn: false,
            currTurn: {
              ...currentTurn,
              pendingChoices: [...(currentTurn.pendingChoices ?? []), pendingChoice],
            },
          }
        }

        if (hasBoardAgents && !hasSupplyAgents) {
          return {
            ...kwisatzBase,
            canEndTurn: false,
            currTurn: {
              ...currentTurn,
              gainedEffects: [...(currentTurn.gainedEffects ?? []), GAINED_EFFECT_RECALL_REQUIRED],
            },
          }
        }

        return kwisatzBase
      }

      if (
        state.expansions?.immortality &&
        card.graft &&
        !state.pendingGraftPartner &&
        !state.graftPair
      ) {
        return {
          ...state,
          pendingGraftPartner: {
            primaryCardId: cardId,
            primaryDeckIndex: resolvedDeckIndex,
            requiresImperiumRow: isUsurpCard(card),
          },
          selectedCard: cardId,
          selectedCardDeckIndex: resolvedDeckIndex,
          currTurn: currentTurn,
          canEndTurn: false,
        }
      }

      return {
        ...state,
        selectedCard: cardId,
        selectedCardDeckIndex: resolvedDeckIndex,
        currTurn: currentTurn,
        canEndTurn: false,
      }
    }
    case 'PLACE_AGENT': {
      const { playerId, spaceId, sellMelangeData, selectiveBreedingData } = action
      let newState = {...state}
      if (
        newState.currTurn?.pendingChoices?.some(
          choice => choice.type === ChoiceType.FIXED_OPTIONS && isKwisatzAgentSourceChoice(choice.id)
        )
      ) {
        return state
      }
      const priorSpaceId = newState.currTurn?.agentSpaceId
      const isReplacingPlacement =
        priorSpaceId != null && priorSpaceId !== spaceId
      const turnGainsStart = newState.currTurn?.gainsStartIndex ?? newState.gains.length
      const updatedGains: Gain[] = isReplacingPlacement
        ? newState.gains.slice(0, turnGainsStart)
        : [...newState.gains]
      const placementGainsStartIndex = isReplacingPlacement
        ? updatedGains.length
        : (newState.currTurn?.gainsStartIndex ?? updatedGains.length)
      const updatedPlayers: Player[] = [...newState.players]
      let currPlayer: Player = {...updatedPlayers.find(p => p.id === playerId)} as Player
      const selectedDeckIndex =
        typeof newState.selectedCardDeckIndex === 'number' &&
        currPlayer.deck[newState.selectedCardDeckIndex]?.id === newState.selectedCard
          ? newState.selectedCardDeckIndex
          : currPlayer.deck.findIndex(c => c.id === newState.selectedCard)
      const card = selectedDeckIndex >= 0 ? currPlayer.deck[selectedDeckIndex] : undefined
      const space = boardSpaceById(spaceId, newState.expansions)
      if (
        !space ||
        !isBoardSpaceAvailableForExpansions(space, newState.expansions) ||
        !canPlayerVisitBoardSpaceOnce(space, currPlayer)
      ) {
        return state
      }
      const pendingRewards: PendingReward[] = [...newState.pendingRewards]
      const tempCurrTurn: GameTurn = {
        playerId,
        type: TurnType.ACTION,
        cardId: card?.id,
        agentSpace: space?.agentIcon,
        canDeployTroops: space?.conflictMarker || false,
        troopLimit: space?.conflictMarker ? 2 + (newState.currTurn?.troopLimit|| 0): 0,
        removableTroops: 0,
        removableDreadnoughts: 0,
        dreadnoughtsDeployedToConflict: 0,
        troopsRetreatedFromConflict: 0,
        effectRetreatAllowance: 0,
        effectRetreatsUsed: 0,
        gainsStartIndex: placementGainsStartIndex,
        persuasionCount: 0,
        gainedEffects: [],
        acquiredCards: newState.currTurn?.acquiredCards ?? [],
        pendingChoices: [],
      }
      
      // Helper to add pending reward
      const addPendingReward = (reward: Reward, source: { type: GainSource; id: number; name: string }, isTrash: boolean = false) => {
        const rewardId = nextSemanticId(source, 'REWARD', pendingRewards.map(r => r.id))
        const pendingReward: PendingReward = {
          id: rewardId,
          source,
          reward,
          isTrash
        }
        
        // Check if REVEREND_MOTHER_MOHIAM and disable if condition not met
        if (reward.custom === CustomEffect.REVEREND_MOTHER_MOHIAM && source.type === GainSource.CARD) {
          // Check if player has another Bene Gesserit card in playArea (excluding the current card)
          const hasBeneGesseritInPlay = currPlayer.playArea.some(c => 
            c.faction?.includes(FactionType.BENE_GESSERIT) && c.id !== source.id
          )
          if (!hasBeneGesseritInPlay) {
            pendingReward.disabled = true
          }
        }
        
        pendingRewards.push(pendingReward)
      }
      
      function applyCardPlayEffect(
        effect: CardEffect,
        card: Card,
        space: SpaceProps,
        gainSourceCard?: Card
      ) {
        const gainCard = gainSourceCard ?? card
        const gainSource = { type: GainSource.CARD, id: gainCard.id, name: gainCard.name }
        // Add to pendingRewards: spice, water, solari, troops, drawCards, intrigueCards
        if (effect.reward.spice) {
          addPendingReward({ spice: effect.reward.spice }, gainSource)
        }
        if (effect.reward.water) {
          addPendingReward({ water: effect.reward.water }, gainSource)
        }
        if (effect.reward.solari) {
          addPendingReward({ solari: effect.reward.solari }, gainSource)
        }
        if (effect.reward.troops) {
          addPendingReward({ troops: effect.reward.troops }, gainSource)
        }
        if (effect.reward.drawCards) {
          addPendingReward({ drawCards: effect.reward.drawCards }, gainSource)
        }
        if (effect.reward.intrigueCards) {
          addPendingReward({ intrigueCards: effect.reward.intrigueCards }, gainSource)
        }
        if (effect.reward.influence) {
          if (effect.reward.influence.chooseOne) {
            tempCurrTurn.pendingChoices = [
              ...(tempCurrTurn.pendingChoices ?? []),
              createGainInfluenceChoice(
                effect.reward.influence,
                gainSource,
                undefined,
                collectLiveIds(newState, (tempCurrTurn.pendingChoices ?? []).map(c => c.id))
              ),
            ]
          } else {
            addPendingReward({ influence: effect.reward.influence }, gainSource)
          }
        }
        if (newState.expansions?.immortality) {
          if (effect.reward.research) {
            addPendingReward({ research: effect.reward.research }, gainSource)
          }
          if (effect.reward.specimen) {
            addPendingReward({ specimen: effect.reward.specimen }, gainSource)
          }
          if (effect.reward.tleilaxu) {
            addPendingReward({ tleilaxu: effect.reward.tleilaxu }, gainSource)
          }
        }
        if (effect.reward.acquireTech !== undefined && isRiseOfIxEnabled(newState)) {
          if (!effectIsOptional(effect)) {
            addPendingReward(
              { acquireTech: effect.reward.acquireTech },
              { type: GainSource.CARD, id: card.id, name: card.name }
            )
          }
        }
        if (effect.reward.techNegotiator && isRiseOfIxEnabled(newState) && !effectIsOptional(effect)) {
          newState = applyTechNegotiatorReward(
            newState,
            playerId,
            effect.reward.techNegotiator,
            gainSource
          )
          const refreshed = newState.players.find(p => p.id === playerId)
          if (refreshed) mergeRoiUnitFieldsFromRefreshed(currPlayer, refreshed)
        }
        if (effect.reward.dreadnoughts && newState.expansions?.riseOfIx) {
          newState = handleDreadnoughtReward(
            newState,
            currPlayer.id,
            effect.reward.dreadnoughts,
            { type: GainSource.CARD, id: card.id, name: card.name },
            space.id
          )
          const refreshed = newState.players.find(p => p.id === currPlayer.id)
          if (refreshed) mergeRoiUnitFieldsFromRefreshed(currPlayer, refreshed)
        }
        if (rewardHasFreighter(effect.reward) && isRiseOfIxEnabled(newState)) {
          const freighterCount =
            typeof effect.reward.freighter === 'number' ? effect.reward.freighter : 0
          if (!tempCurrTurn.pendingChoices) tempCurrTurn.pendingChoices = []
          pushFreighterChoicesFromReward(
            newState,
            freighterCount,
            playerId,
            { type: GainSource.CARD, id: card.id, name: card.name },
            tempCurrTurn.pendingChoices
          )
        }
        
        // Auto-apply pooled rewards: deployTroops
        if (effect.reward.deployTroops) {
          tempCurrTurn = applyDeployTroopsAllowance(
            tempCurrTurn,
            effect.reward.deployTroops,
            effect.reward
          )
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.CARD })
        }
        
        // Auto-apply custom effects (calculated effects)
        if (effect.reward.custom) {
          switch (effect.reward.custom) {
            case CustomEffect.CARRYALL: {
              const spiceReward = space.effects?.find(e => e.reward.spice)?.reward.spice
              if (spiceReward) {
                addPendingReward({ spice: spiceReward }, { type: GainSource.CARD, id: card.id, name: card.name })
              }
              break
            }
            case CustomEffect.GUN_THOPTER:
              newState.players.forEach(p => {
                if(p.id !== playerId && p.troops > 0) {
                  updatedGains.push({ round: newState.currentRound, playerId: p.id, sourceId: card.id, name: card.name, amount: -1, type: RewardType.TROOPS, source: GainSource.CARD })
                  updatedPlayers[p.id].troops -= 1
                }
              })
              break
            case CustomEffect.BOUNTY_INFILTRATION_BONUS:
              newState = applyBountyInfiltrationBonus(newState, playerId, {
                type: GainSource.CARD,
                id: card.id,
                name: card.name,
              })
              break
            case CustomEffect.GUILD_ACCORD_HEIGHTLINER_DISCOUNT:
              newState = applyGuildAccordDiscount(newState, playerId)
              break
            case CustomEffect.WEB_OF_POWER:
              newState = applyWebOfPower(newState, playerId, card.id, card.name)
              break
            case CustomEffect.WEIRDING_WAY_EXTRA_TURN:
              newState = applyWeirdingWayExtraTurn(
                newState,
                playerId,
                card.id,
                card.name,
                updatedGains
              )
              break
            case CustomEffect.TREACHERY_DOUBLE_INFLUENCE: {
              const iconFactions: Partial<Record<AgentIcon, FactionType>> = {
                [AgentIcon.EMPEROR]: FactionType.EMPEROR,
                [AgentIcon.SPACING_GUILD]: FactionType.SPACING_GUILD,
                [AgentIcon.BENE_GESSERIT]: FactionType.BENE_GESSERIT,
                [AgentIcon.FREMEN]: FactionType.FREMEN,
              }
              const factions = card.agentIcons
                .map(icon => iconFactions[icon])
                .filter((f): f is FactionType => f != null)
              newState = applyTreacheryDoubleInfluence(
                newState,
                playerId,
                factions,
                card.id,
                card.name
              )
              break
            }
            case CustomEffect.SIGNET_RING: {
              const result = resolveSignetRingEffect(newState, playerId, card)
              if (result.optionalEffects) optionalEffects.push(...result.optionalEffects)
              if (result.pendingChoices) {
                tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices || []), ...result.pendingChoices]
              }
              if (result.pendingRewards) {
                result.pendingRewards.forEach(r => {
                  if (r.reward.custom) {
                    addPendingReward(r.reward, r.source, r.isTrash ?? false)
                    return
                  }
                  const troopsBefore = currPlayer.troops
                  Object.assign(
                    currPlayer,
                    applyRewardToPlayer(r.reward, currPlayer, updatedGains, newState, r.source)
                  )
                  const troopsRecruited = currPlayer.troops - troopsBefore
                  if (troopsRecruited > 0 && tempCurrTurn.canDeployTroops) {
                    tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit ?? 0) + troopsRecruited
                  }
                })
              }
              break
            }
            default: {
              if (newState.expansions?.immortality && effect.reward.custom) {
                const immCtx: ImmortalityPlayContext = {
                  state: newState,
                  playerId,
                  card,
                  space,
                  currPlayer,
                  pendingRewards,
                  pendingChoices: tempCurrTurn.pendingChoices ?? [],
                  updatedGains,
                  addPendingReward,
                }
                const autoState = applyImmortalityAutoCustom(effect.reward.custom, immCtx)
                if (autoState) {
                  newState = autoState
                  break
                }
                queueImmortalityPendingCustom(effect.reward.custom, immCtx)
                break
              }
              if (!AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                addPendingReward({ custom: effect.reward.custom }, gainSource)
              }
            }
          }
        }
        
        // Handle trash rewards
        if (effect.reward.trash || effect.reward.trashThisCard) {
          addPendingReward(
            { trash: effect.reward.trash, trashThisCard: effect.reward.trashThisCard },
            gainSource,
            true
          )
        }
      }

      function applySpaceEffect(effect: {cost?: Cost, reward: Reward}, updatedGains: Gain[], stateIn: GameState, playerId: number, space: SpaceProps, currPlayer: Player): GameState {
        let newState = stateIn
        // Add to pendingRewards: solari, spice, water, troops, drawCards, intrigueCards
        if (effect.reward.solari) {
          addPendingReward({ solari: effect.reward.solari }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.spice) {
          let totalSpice = effect.reward.spice
          // Add bonus spice from maker spaces
          if (space.makerSpace) {
            const bonusSpice = { ...newState.bonusSpice }
            totalSpice += bonusSpice[space.makerSpace]
            bonusSpice[space.makerSpace] = 0
            newState.bonusSpice = bonusSpice
          }
          addPendingReward({ spice: totalSpice }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.water) {
          addPendingReward({ water: effect.reward.water }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.troops) {
          addPendingReward({ troops: effect.reward.troops }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.drawCards) {
          addPendingReward({ drawCards: effect.reward.drawCards }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.intrigueCards) {
          addPendingReward({ intrigueCards: effect.reward.intrigueCards }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (newState.expansions?.immortality) {
          if (effect.reward.research) {
            addPendingReward({ research: effect.reward.research }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
          }
          if (effect.reward.specimen) {
            addPendingReward({ specimen: effect.reward.specimen }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
          }
          if (effect.reward.tleilaxu) {
            addPendingReward({ tleilaxu: effect.reward.tleilaxu }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
          }
        }
        if (effect.reward.acquireTech !== undefined && isRiseOfIxEnabled(newState)) {
          if (!effectIsOptional(effect)) {
            addPendingReward(
              { acquireTech: effect.reward.acquireTech },
              { type: GainSource.BOARD_SPACE, id: space.id, name: space.name }
            )
          }
        }
        if (effect.reward.techNegotiator && isRiseOfIxEnabled(newState) && !effectIsOptional(effect)) {
          newState = applyTechNegotiatorReward(
            newState,
            playerId,
            effect.reward.techNegotiator,
            { type: GainSource.BOARD_SPACE, id: space.id, name: space.name }
          )
          const refreshed = newState.players.find(p => p.id === playerId)
          if (refreshed) mergeRoiUnitFieldsFromRefreshed(currPlayer, refreshed)
        }
        if (effect.reward.dreadnoughts && newState.expansions?.riseOfIx) {
          newState = handleDreadnoughtReward(
            newState,
            playerId,
            effect.reward.dreadnoughts,
            { type: GainSource.BOARD_SPACE, id: space.id, name: space.name },
            space.id
          )
          const refreshed = newState.players.find(p => p.id === playerId)
          if (refreshed) mergeRoiUnitFieldsFromRefreshed(currPlayer, refreshed)
        }
        if (rewardHasFreighter(effect.reward) && isRiseOfIxEnabled(newState)) {
          const freighterCount =
            typeof effect.reward.freighter === 'number' ? effect.reward.freighter : 0
          if (!tempCurrTurn.pendingChoices) tempCurrTurn.pendingChoices = []
          pushFreighterChoicesFromReward(
            newState,
            freighterCount,
            playerId,
            { type: GainSource.BOARD_SPACE, id: space.id, name: space.name },
            tempCurrTurn.pendingChoices
          )
        }
        if (effect.reward.custom) {
          // For SECRETS_STEAL, check if any opponents have 4+ intrigue
          if (effect.reward.custom === CustomEffect.SECRETS_STEAL) {
            const hasEligibleTargets = updatedPlayers.some(p => 
              p.id !== playerId && p.intrigueCount >= 4
            )
            addPendingReward(
              { custom: effect.reward.custom }, 
              { type: GainSource.BOARD_SPACE, id: space.id, name: space.name }
            )
            // Mark as disabled if no eligible targets
            if (!hasEligibleTargets) {
              const lastReward = pendingRewards[pendingRewards.length - 1]
              if (lastReward) {
                lastReward.disabled = true
              }
            }
          } else if (!AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
            addPendingReward({ custom: effect.reward.custom }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
          }
        }
        
        // Auto-apply pooled rewards: persuasion, deployTroops
        if (effect.reward.persuasion) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.BOARD_SPACE })
          currPlayer.persuasion += effect.reward.persuasion
        }
        if (effect.reward.deployTroops) {
          tempCurrTurn = applyDeployTroopsAllowance(
            tempCurrTurn,
            effect.reward.deployTroops,
            effect.reward
          )
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.BOARD_SPACE })
        }
        return newState
    }

      if (!currPlayer || !card || !space || playerId !== newState.activePlayerId || !newState.selectedCard) return state
      
      const isKwisatzPlacement = isKwisatzHaderachCard(card)
      const kwisatzFromBoard =
        newState.currTurn?.gainedEffects?.includes(GAINED_EFFECT_KWISATZ_FROM_BOARD) ?? false
      // Handle recall-before-placement requirement: interpret this click as recall if needed
      if (newState.currTurn?.gainedEffects?.includes(GAINED_EFFECT_RECALL_REQUIRED)) {
        const occupants = newState.occupiedSpaces[spaceId] || []
        if (!occupants.includes(playerId)) {
          // Not a valid recall click; ignore
          return state
        }
        // Remove the player's agent from that space and refund one agent
        newState.occupiedSpaces = {
          ...newState.occupiedSpaces,
          [spaceId]: occupants.filter(id => id !== playerId)
        }
        newState.players = newState.players.map(p => p.id === playerId ? { ...p, agents: p.agents + 1 } : p)
        // Clear recall flag; mark that the next placement skips board-space effects
        newState.currTurn = {
          ...newState.currTurn,
          gainedEffects: [
            ...(newState.currTurn?.gainedEffects || []).filter(e => e !== GAINED_EFFECT_RECALL_REQUIRED),
            GAINED_EFFECT_KWISATZ_FROM_BOARD,
          ]
        }
        return newState
      }
      
      // Check if player has any agents left
      if (currPlayer.agents <= 0) return state

      // Check if player can afford the space (Leto pays 1 less for Landsraad spaces)
      const heighlinerDiscount =
        space.id === 17 ? heighlinerDiscountForPlayer(newState, playerId) : 0
      if (space.cost) {
        const effectiveSolari = getEffectiveSolariCost(space, currPlayer)
        if (effectiveSolari > 0 && currPlayer.solari < effectiveSolari) return state
        if (space.cost.spice) {
          const effectiveSpice = Math.max(0, space.cost.spice - heighlinerDiscount)
          if (effectiveSpice > 0 && currPlayer.spice < effectiveSpice) return state
        }
        if (space.cost.water && currPlayer.water < space.cost.water) return state
      }

      // Check if space is blocked by The Voice
      const blockedSpace = newState.blockedSpaces?.find(bs => bs.spaceId === spaceId)
      if (blockedSpace && blockedSpace.playerId !== playerId) {
        // Space is blocked for this opponent
        return state
      }

      const graftCardsForTurn = newState.graftPair
        ? resolveGraftCards(newState, currPlayer)
        : card
          ? [card]
          : []
      const cardHasInfiltrate =
        graftPairHasInfiltrate(graftCardsForTurn) || Boolean(card?.infiltrate)

      // Check if space is already occupied or card has infiltrate (Helena can ignore occupancy on Landsraad/City)
      const allowInfiltrateIntrigue = Boolean(newState.infiltrateIgnoreOccupancyOnce?.[playerId])
      if (
        newState.occupiedSpaces[spaceId]?.length > 0 &&
        !cardHasInfiltrate &&
        !canPlaceDespiteOccupancy(space, currPlayer) &&
        !allowInfiltrateIntrigue
      ) {
        return state
      }

      // Check if player has required influence
      if (space.requiresInfluence && !isKwisatzPlacement) {
        const playerInfluence = newState.factionInfluence[space.requiresInfluence.faction as FactionType]?.[playerId] || 0
        if (playerInfluence < space.requiresInfluence.amount) return state
      }

      if(space.controlMarker) {
        const controlPlayerId = controlBonusOwner(newState, space.controlMarker)
        if(controlPlayerId != null) {
          if(space.controlBonus?.solari) {
            updatedPlayers[controlPlayerId].solari += space.controlBonus.solari
            if (controlPlayerId === playerId) {
              currPlayer.solari += space.controlBonus.solari
            }
            updatedGains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.solari, type: RewardType.SOLARI, source: GainSource.CONTROL } )
          }
          if(space.controlBonus?.spice) {
            updatedPlayers[controlPlayerId].spice += space.controlBonus.spice
            if (controlPlayerId === playerId) {
              currPlayer.spice += space.controlBonus.spice
            }
            updatedGains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.spice, type: RewardType.SPICE, source: GainSource.CONTROL } )
          }
        }
      }

      const cardsToAddToPlay = graftCardsForTurn.filter(
        gc => !currPlayer.playArea.some(p => p.id === gc.id)
      )
      const updatedPlayArea =
        selectiveBreedingData && card && card.id === selectiveBreedingData.trashedCardId
          ? currPlayer.playArea
          : [...currPlayer.playArea, ...cardsToAddToPlay]

      const recordBoardSpaceCost = (type: RewardType, amount: number) => {
        if (amount <= 0) return
        updatedGains.push({
          round: newState.currentRound,
          playerId,
          sourceId: space.id,
          name: space.name,
          amount: -amount,
          type,
          source: GainSource.BOARD_SPACE,
        })
      }
      
      if (selectiveBreedingData) {
        if (space.cost?.spice) {
          currPlayer.spice -= space.cost.spice
          recordBoardSpaceCost(RewardType.SPICE, space.cost.spice)
        }

        // Find the trashed card in any pile
        const allCards = [
          ...currPlayer.deck,
          ...currPlayer.playArea,
          ...currPlayer.discardPile,
        ];
        const trashedCard = allCards.find(c => c.id === selectiveBreedingData.trashedCardId);
        // If it was in the deck (i.e., in hand) and not played card, reduce handCount
        if (trashedCard && currPlayer.deck.includes(trashedCard) && trashedCard.id !== card.id) {
          currPlayer.handCount -= 1; 
        }
        currPlayer.deck = currPlayer.deck.filter(c => c.id !== selectiveBreedingData.trashedCardId);
        currPlayer.playArea = currPlayer.playArea.filter(c => c.id !== selectiveBreedingData.trashedCardId);
        currPlayer.discardPile = currPlayer.discardPile.filter(c => c.id !== selectiveBreedingData.trashedCardId);

        if (trashedCard) {
          currPlayer.trash = [...currPlayer.trash, trashedCard];
          newState = withUnloadAfterCardRemoved(newState, playerId, trashedCard, 'trash')
        } else {
          console.log("Trashed card not found");
        }
      } else if (sellMelangeData) {
        currPlayer.spice -= sellMelangeData.spiceCost
        recordBoardSpaceCost(RewardType.SPICE, sellMelangeData.spiceCost)
        currPlayer.solari += sellMelangeData.solariReward
        updatedGains.push({ 
          round: newState.currentRound, 
          playerId: playerId, 
          sourceId: space.id, 
          name: space.name, 
          amount: sellMelangeData.solariReward, 
          type: RewardType.SOLARI, 
          source: GainSource.BOARD_SPACE
        })
      } else if (space.cost) {
        if (space.cost.solari) {
          const solariPaid = getEffectiveSolariCost(space, currPlayer)
          currPlayer.solari -= solariPaid
          recordBoardSpaceCost(RewardType.SOLARI, solariPaid)
        }
        if (space.cost.spice) {
          const effectiveSpice = Math.max(0, space.cost.spice - heighlinerDiscount)
          currPlayer.spice -= effectiveSpice
          recordBoardSpaceCost(RewardType.SPICE, effectiveSpice)
        }
        if (space.cost.water) {
          currPlayer.water -= space.cost.water
          recordBoardSpaceCost(RewardType.WATER, space.cost.water)
        }
        // Ilban: draw 1 card whenever he pays Solari for a board space
        if (shouldGrantIlbanSolariDraw(space, currPlayer)) {
          addPendingReward({ drawCards: 1 }, { type: GainSource.LEADER_ABILITY, id: 0, name: 'Solari Draw (Ilban)' }, false)
        }
      }
      
      const optionalEffects: OptionalEffect[] = []

      if (space.effects && !kwisatzFromBoard) {
        const boardSource = { type: GainSource.BOARD_SPACE, id: space.id, name: space.name }

        if (space.id === TECH_NEGOTIATION_SPACE_ID && isRiseOfIxEnabled(newState)) {
          const choice = buildTechNegotiationChoice(
            newState,
            space.name,
            playerId,
            (tempCurrTurn.pendingChoices ?? []).map(c => c.id)
          )
          tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices ?? []), choice]
        } else {
          space.effects.forEach(effect => {
            if (effectIsOptional(effect)) {
              const optional = buildMayOptionalEffect(
                newState,
                playerId,
                boardSource,
                effect,
                [
                  ...(tempCurrTurn.optionalEffects ?? []).map(e => e.id),
                  ...optionalEffects.map(e => e.id),
                ]
              )
              if (optional) optionalEffects.push(optional)
            }
            newState = applySpaceEffect(effect, updatedGains, newState, playerId, space, currPlayer)
          })
        }
      }

      if (card && shouldGrantIlesaPlayBonus(currPlayer, card, currPlayer.agentTurnsThisRound ?? 0)) {
        addPendingReward(
          buildIlesaPlayBonusReward(card),
          { type: GainSource.LEADER_ABILITY, id: 0, name: 'Hidden Pact' }
        )
        currPlayer = clearIlesaSetAside(currPlayer)
      }

      // Build optional effects list (play effects with cost or "may" icons)
      const choiceEffects: PlayEffect[] = []

      function runPlayEffectsForCard(playCard: Card) {
        if (isGholaCard(playCard)) return
        if (!playCard.playEffect) return
        playCard.playEffect
          ?.filter((effect: PlayEffect) => {
            if (effect.choiceOpt) {
              if (effect.reward.custom && AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                return true
              }
              choiceEffects.push(effect)
              return false
            }
            if (effect.cost) {
              const effectId = nextSemanticId(
                { type: GainSource.CARD, id: playCard.id },
                'EFFECT',
                [...optionalEffects.map(e => e.id), ...(tempCurrTurn.optionalEffects ?? []).map(e => e.id)]
              )
              optionalEffects.push({
                id: effectId,
                cost: effect.cost as Cost,
                reward: effect.reward,
                source: { type: GainSource.CARD, id: playCard.id, name: playCard.name },
              })
              return false
            }
            if (effectIsOptional(effect)) {
              if (!playRequirementSatisfied(effect, playCard, state, playerId)) return false
              const optional = buildMayOptionalEffect(
                newState,
                playerId,
                { type: GainSource.CARD, id: playCard.id, name: playCard.name },
                effect,
                [...optionalEffects.map(e => e.id), ...(tempCurrTurn.optionalEffects ?? []).map(e => e.id)]
              )
              if (optional) optionalEffects.push(optional)
              return false
            }
            return playRequirementSatisfied(effect, playCard, state, playerId)
          })
          .forEach(effect => {
            if (effect.reward) {
              applyCardPlayEffect(effect, playCard, space)
            }
          })
      }

      for (const playCard of graftCardsForTurn) {
        runPlayEffectsForCard(playCard)
      }

      const gholaCard = graftCardsForTurn.find(isGholaCard)
      if (gholaCard && space) {
        const partner = getGraftPartner(graftCardsForTurn, gholaCard)
        if (partner) {
          gholaCopyPartnerPlayEffects(partner, gholaCard, (effect, sourceCard) => {
            if (!playRequirementSatisfied(effect, partner, state, playerId)) return
            applyCardPlayEffect(effect, partner, space, sourceCard)
          })
        }
      }

      if (choiceEffects.length > 0 && card) {
          // Group all choice effects into a single FixedOptionsChoice
          const choiceId = nextSemanticId(
            { type: GainSource.CARD, id: card.id },
            'OR',
            (tempCurrTurn.pendingChoices ?? []).map(c => c.id)
          )
          
          // Check if any effects need card selection
          const cardSelectEffect = choiceEffects.find(e => 
            e.cost?.trash || e.reward.trash || e.reward.custom === CustomEffect.OTHER_MEMORY
          );
          
          if (cardSelectEffect && choiceEffects.length === 1) {
            // Single effect that needs card selection
            const pendingChoice = getEffectChoice(currPlayer, card, cardSelectEffect, (tempCurrTurn.pendingChoices ?? []).map(c => c.id));
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), pendingChoice];
          } else if (choiceEffects.length === 1) {
            // Single regular choice - shouldn't happen but handle it
            const pendingChoice = getEffectChoice(currPlayer, card, choiceEffects[0], (tempCurrTurn.pendingChoices ?? []).map(c => c.id));
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), pendingChoice];
          } else {
            // Multiple OR choices - create single FixedOptionsChoice with all options
            const options = choiceEffects.map(effect => {
              let disabled = false;
              if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
                const hasBG = currPlayer.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT));
                disabled = !hasBG;
              }
              return { cost: effect.cost, reward: effect.reward, disabled };
            });
            
            const fixedOptionsChoice: FixedOptionsChoice = {
              id: choiceId,
              type: ChoiceType.FIXED_OPTIONS,
              prompt: 'Choose one reward',
              options,
              source: { type: GainSource.CARD, id: card.id, name: card.name }
            };
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), fixedOptionsChoice];
          }
        }
      
      // Add influence to pending rewards (single bumps)
      if (space.influence && !kwisatzFromBoard) {
        const influenceReward = { influence: { amounts: [space.influence] } }
        const pendingReward = {
          id: nextSemanticId(
            { type: GainSource.BOARD_SPACE, id: space.id },
            'INFLUENCE',
            pendingRewards.map(r => r.id)
          ),
          source: { type: GainSource.BOARD_SPACE, id: space.id, name: space.name },
          reward: influenceReward,
          isTrash: false
        }
        pendingRewards.push(pendingReward)
      }

      // Update occupied spaces
      const updatedOccupiedSpaces = {
        ...newState.occupiedSpaces,
        [spaceId]: [...(newState.occupiedSpaces[spaceId] || []), playerId]
      }

      let updatedDeck = [...currPlayer.deck]
      let deckCardsRemoved = 0
      if (newState.graftPair) {
        for (const gc of graftCardsForTurn) {
          const idx = updatedDeck.findIndex(c => c.id === gc.id)
          if (idx >= 0) {
            updatedDeck.splice(idx, 1)
            deckCardsRemoved++
          }
        }
      } else if (selectedDeckIndex >= 0) {
        updatedDeck.splice(selectedDeckIndex, 1)
        deckCardsRemoved = 1
      }

      const canDeployTroops = kwisatzFromBoard ? false : (tempCurrTurn?.canDeployTroops || false)
      const troopLimit = canDeployTroops ? (tempCurrTurn?.troopLimit|| 2): 2
      const persuasionCount = tempCurrTurn?.persuasionCount || 0

      

      const currentTurn = newState.currTurn?.playerId === playerId 
        ? {
            ...newState.currTurn,
            agentSpace: space.agentIcon,
            agentSpaceId: spaceId,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: 0,
            troopsDeployedToConflict: 0,
            troopsRetreatedFromConflict: 0,
            acquiredCards: tempCurrTurn.acquiredCards,
            gainsStartIndex: tempCurrTurn.gainsStartIndex,
            persuasionCount: (newState.currTurn?.persuasionCount || 0) + persuasionCount,
            optionalEffects: [...(newState.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: [...(newState.currTurn?.pendingChoices||[]), ...(tempCurrTurn.pendingChoices||[])],
            gainedEffects: (newState.currTurn?.gainedEffects || []).filter(
              e => e !== GAINED_EFFECT_KWISATZ_FROM_BOARD
            ),
          }
        : {
            playerId,
            type: TurnType.ACTION,
            cardId: card.id,
            agentSpace: space.agentIcon,
            agentSpaceId: spaceId,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: 0,
            troopsDeployedToConflict: 0,
            troopsRetreatedFromConflict: 0,
            gainsStartIndex: state.gains.length,
            persuasionCount: persuasionCount,
            gainedEffects: [],//TODO is this used?
            acquiredCards: [],
            optionalEffects: [...(newState.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: tempCurrTurn.pendingChoices || []
          }

      if (space.specialEffect && !kwisatzFromBoard) {
        currentTurn.gainedEffects = [...(currentTurn.gainedEffects || []), space.specialEffect]
        switch (space.specialEffect) {
          case 'mentat':
            if(newState.mentatOwner) {
              break
            }
            newState.mentatOwner = playerId
            currPlayer.agents += 1
            updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: 1, type: RewardType.MENTAT, source: GainSource.BOARD_SPACE })
            break

          case 'swordmaster':
            currPlayer.hasSwordmaster = true
            currPlayer.agents += 1
            updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: 1, type: RewardType.SWORDMASTER, source: GainSource.BOARD_SPACE })
            break

          case 'foldspace': {
            const card = newState.foldspaceDeck.pop()
            if (card) {
              currPlayer.discardPile = [...currPlayer.discardPile, card]
              updatedGains.push({
                round: newState.currentRound,
                playerId,
                sourceId: space.id,
                name: card.name,
                amount: 1,
                type: RewardType.CARD,
                source: GainSource.BOARD_SPACE,
              })
              tempCurrTurn.acquiredCards = [...(tempCurrTurn.acquiredCards ?? []), card]
            }
            break
          }

          case 'highCouncil': {
            currPlayer.hasHighCouncilSeat = true
            const prevOrder = newState.highCouncilSeatOrder ?? []
            if (!prevOrder.includes(playerId)) {
              newState.highCouncilSeatOrder = [...prevOrder, playerId]
            }
            if (shouldGrantMemnonInfluence(currPlayer)) {
              pendingRewards.push(buildMemnonInfluenceReward(space.id))
            }
            break
          }

        }
      }

      currPlayer.agents -= 1
      currPlayer.handCount -= deckCardsRemoved

      const nextDispatch = { ...(newState.dispatchEnvoyActive || {}) }
      delete nextDispatch[playerId]
      const nextInfiltrate = { ...(newState.infiltrateIgnoreOccupancyOnce || {}) }
      delete nextInfiltrate[playerId]

      return {
        ...newState,
        selectedCardDeckIndex: null,
        gains: updatedGains,
        players: updatedPlayers.map(p =>
          p.id === playerId
            ? {
                ...currPlayer,
                deck: updatedDeck,
                playArea: updatedPlayArea,
                selectedCard: null
              }
            : p
        ),
        occupiedSpaces: updatedOccupiedSpaces,
        currTurn: {
          ...currentTurn,
          acquiredCards: tempCurrTurn.acquiredCards,
        },
        pendingRewards,
        dispatchEnvoyActive: nextDispatch,
        infiltrateIgnoreOccupancyOnce: nextInfiltrate,
        canEndTurn: (currentTurn.pendingChoices?.length || pendingRewards.filter(r => !r.disabled).length) ? false : true
      }
    }
    case 'REVEAL_CARDS': {
      const { playerId, cardIds } = action
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player

      if (!player || playerId !== state.activePlayerId) return state

      const tempCurrTurn: GameTurn = {
        playerId,
        canDeployTroops: false,
        troopLimit: 0,
        removableTroops: 0,
        removableDreadnoughts: 0,
        dreadnoughtsDeployedToConflict: 0,
        troopsRetreatedFromConflict: 0,
        gainsStartIndex: state.gains.length,
        persuasionCount: 0,
        type: TurnType.REVEAL,
        gainedEffects: [],
        acquiredCards: [],
        pendingChoices: [],
      }

      if (shouldOfferArmandTrashChoice(state, player)) {
        tempCurrTurn.pendingChoices = [
          buildArmandTrashChoice(state, player, tempCurrTurn.pendingChoices?.map(c => c.id) ?? []),
        ]
      }

      // Immortality — scheduled graft effects at Reveal start (e.g. Chairdog).
      let chairdogPlayArea = [...player.playArea]
      let chairdogDeck = [...player.deck]
      const chairdogGains: Gain[] = []
      for (const graftEffect of state.scheduledGraftOnReveal?.[playerId] ?? []) {
        if (graftEffect.type !== 'chairdog-return') continue
        const partnerIdx = chairdogPlayArea.findIndex(c => c.id === graftEffect.partnerCardId)
        if (partnerIdx < 0) continue
        const [partner] = chairdogPlayArea.splice(partnerIdx, 1)
        chairdogDeck = [partner, ...chairdogDeck.filter(c => c.id !== partner.id)]
        chairdogGains.push({
          round: state.currentRound,
          playerId,
          sourceId: graftEffect.chairdogCardId,
          name: graftEffect.name,
          amount: 1,
          type: RewardType.DRAW,
          source: GainSource.CARD,
        })
      }
      const playerAfterChairdog: Player = {
        ...player,
        playArea: chairdogPlayArea,
        deck: chairdogDeck,
      }

      // Move selected cards to play area
      let revealedCards = cardIds
        .map(id => playerAfterChairdog.deck.find(card => card.id === id))
        .filter((card): card is Card => card !== undefined)

      let ilesaPlayer = playerAfterChairdog
      if (
        player.setAsideCard &&
        (player.agentTurnsThisRound ?? 0) === 0 &&
        !revealedCards.some(c => c.id === player.setAsideCard!.id)
      ) {
        revealedCards = [...revealedCards, player.setAsideCard]
        ilesaPlayer = clearIlesaSetAside(player)
      }

      const updatedDeck = ilesaPlayer.deck.filter(card => !cardIds.includes(card.id))
      let mutablePlayArea = [...ilesaPlayer.playArea, ...revealedCards]
      let mutableTrash = [...player.trash]

      // Calculate reveal effects - pooled resources
      let persuasionCount = 0
      let swordCount = 0

      const updatedGains: Gain[] = [...state.gains, ...chairdogGains]
      const pendingRewards: PendingReward[] = [...state.pendingRewards]

      // Helper to add pending reward from card
      const addPendingReward = (reward: Reward, source: { type: GainSource; id: number; name: string }, isTrash: boolean = false) => {
        if (rewardHasFreighter(reward) && isRiseOfIxEnabled(state)) {
          const freighterCount = typeof reward.freighter === 'number' ? reward.freighter : 0
          pushFreighterChoicesFromReward(state, freighterCount, playerId, source, pendingChoices)
          const rest = stripFreighterFromReward(reward)
          if (Object.keys(rest).length === 0) return
          reward = rest
        }
        const rewardId = nextSemanticId(source, 'REWARD', pendingRewards.map(r => r.id))
        pendingRewards.push({
          id: rewardId,
          source,
          reward,
          isTrash
        })
      }

      if(player.hasHighCouncilSeat) {
        updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: 0, name: "High Council Seat", amount: 2, type: RewardType.PERSUASION, source: GainSource.HIGH_COUNCIL } )
        persuasionCount += 2
      }

      // Auto-resolve any scheduled intrigue effects that trigger on this player's Reveal turn (this round).
      const scheduledIntrigue = (state.scheduledIntrigueOnReveal?.[playerId] || [])
      scheduledIntrigue.forEach(s => {
        const pushIntrigueGain = (amount: number | undefined, type: RewardType) => {
          if (!amount) return
          updatedGains.push({
            round: state.currentRound,
            playerId,
            sourceId: s.cardId,
            name: s.name,
            amount,
            type,
            source: GainSource.INTRIGUE
          })
        }

        if (s.reward.persuasion) {
          persuasionCount += s.reward.persuasion
          pushIntrigueGain(s.reward.persuasion, RewardType.PERSUASION)
        }
        if (s.reward.combat) {
          swordCount += s.reward.combat
          pushIntrigueGain(s.reward.combat, RewardType.COMBAT)
        }
        if (s.reward.spice) {
          player.spice += s.reward.spice
          pushIntrigueGain(s.reward.spice, RewardType.SPICE)
        }
        if (s.reward.water) {
          player.water += s.reward.water
          pushIntrigueGain(s.reward.water, RewardType.WATER)
        }
        if (s.reward.solari) {
          player.solari += s.reward.solari
          pushIntrigueGain(s.reward.solari, RewardType.SOLARI)
        }
        if (s.reward.troops) {
          const recruited = recruitTroopsToGarrison(player, s.reward.troops)
          player = recruited.player
          pushIntrigueGain(recruited.recruited, RewardType.TROOPS)
        }
        if (s.reward.victoryPoints) {
          player.victoryPoints += s.reward.victoryPoints
          pushIntrigueGain(s.reward.victoryPoints, RewardType.VICTORY_POINTS)
        }
        if (s.reward.intrigueCards) {
          player.intrigueCount += s.reward.intrigueCards
          pushIntrigueGain(s.reward.intrigueCards, RewardType.INTRIGUE)
        }
      })

      const optionalEffects: OptionalEffect[] = []
      const pendingChoices: PendingChoice[] = [
        ...(state.currTurn?.pendingChoices || []),
        ...(tempCurrTurn.pendingChoices || []),
      ]
      let revealState = state
      revealedCards.forEach(card => {
        const choiceEffects: RevealEffect[] = []
        card.revealEffect?.filter((effect:CardEffect) => {
            if(effect.choiceOpt) {
              // Check if this is an auto-applied custom effect
              if(effect.reward.custom && AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                // Don't add to choices, will be applied immediately
                return true;
              }
              choiceEffects.push(effect)
              return false;
            }
            if(effect.cost) {
              const effectId = nextSemanticId(
                { type: GainSource.CARD, id: card.id },
                'EFFECT',
                [...optionalEffects.map(e => e.id), ...(state.currTurn?.optionalEffects ?? []).map(e => e.id)]
              )
              optionalEffects.push({ id: effectId, cost: effect.cost as Cost, reward: effect.reward, source:{ type: GainSource.CARD, id: card.id, name: card.name } })
              return false;
            }
            if (effectIsOptional(effect)) {
              if (!revealRequirementSatisfied(effect, card, state, playerId, revealedCards)) return false
              const optional = buildMayOptionalEffect(
                revealState,
                playerId,
                { type: GainSource.CARD, id: card.id, name: card.name },
                effect,
                [...optionalEffects.map(e => e.id), ...(state.currTurn?.optionalEffects ?? []).map(e => e.id)]
              )
              if (optional) optionalEffects.push(optional)
              return false
            }
            return revealRequirementSatisfied(effect, card, state, playerId, revealedCards);
          })
          .forEach(effect => {
            // Auto-apply pooled rewards: persuasion, combat
            if(effect.reward?.persuasion) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.CARD } )
              persuasionCount += effect.reward.persuasion
            }
            if(effect.reward?.combat) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.combat, type: RewardType.COMBAT, source: GainSource.CARD } )
              swordCount += effect.reward.combat
            }
            
            // Add to pendingRewards: spice, water, solari, intrigueCards
            if(effect.reward?.spice) {
              addPendingReward({ spice: effect.reward.spice }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.water) {
              addPendingReward({ water: effect.reward.water }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.solari) {
              addPendingReward({ solari: effect.reward.solari }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.intrigueCards) {
              addPendingReward({ intrigueCards: effect.reward.intrigueCards }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.drawCards) {
              addPendingReward({ drawCards: effect.reward.drawCards }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if (effect.reward?.influence) {
              if (effect.reward.influence.chooseOne) {
                pendingChoices.push(
                  createGainInfluenceChoice(
                    effect.reward.influence,
                    { type: GainSource.CARD, id: card.id, name: card.name },
                    undefined,
                    collectLiveIds(state, pendingChoices.map(c => c.id))
                  )
                )
              } else {
                addPendingReward(
                  { influence: effect.reward.influence },
                  { type: GainSource.CARD, id: card.id, name: card.name }
                )
              }
            }
            if (effect.reward?.troops) {
              if (isMandatoryRecruitAndDeployEffect(card, effect.reward)) {
                player = applyImmediateTroopRecruit(
                  player,
                  effect.reward.troops,
                  updatedGains,
                  state,
                  playerId,
                  card.id,
                  card.name
                )
              } else {
                addPendingReward({ troops: effect.reward.troops }, { type: GainSource.CARD, id: card.id, name: card.name })
              }
            }
            // Pick-a-card trash on reveal (trash counts as N); trashThisCard is mandatory and applied immediately below
            if (effect.reward?.trash && !effect.reward?.trashThisCard) {
              addPendingReward(
                { trash: effect.reward.trash, trashThisCard: effect.reward.trashThisCard },
                { type: GainSource.CARD, id: card.id, name: card.name },
                true
              )
            }

            // Auto-apply pooled: deployTroops
            if(effect.reward?.deployTroops) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.CARD } )
              tempCurrTurn = applyDeployTroopsAllowance(
                tempCurrTurn,
                effect.reward.deployTroops,
                effect.reward
              )
              if (card.name === 'Treachery') {
                revealState = markMandatoryDeploy(revealState)
                tempCurrTurn.mandatoryDeployTroops = true
              }
            }
            
            // Auto-apply custom calculated effects
            if(effect.reward?.custom) {
              switch (effect.reward.custom) {
                case CustomEffect.LIET_KYNES: {
                  const fremenInPlay =  player.playArea.filter(c => c.faction?.includes(FactionType.FREMEN)).length
                  const fremenInReveal = revealedCards.filter(c => c.faction?.includes(FactionType.FREMEN)).length
                  const gainedPersuasion = (fremenInPlay + fremenInReveal) * 2
                  persuasionCount += gainedPersuasion
                  updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: gainedPersuasion, type: RewardType.PERSUASION, source: GainSource.CARD } )
                  break
                }
                case CustomEffect.GUILD_BANKERS:
                  // Add as pending reward for user to activate
                  addPendingReward({ custom: effect.reward.custom }, { type: GainSource.CARD, id: card.id, name: card.name })
                  break
                case CustomEffect.DESERT_AMBUSH:
                  revealState = applyDesertAmbush(revealState, playerId, card.id, card.name)
                  break
                case CustomEffect.IMPERIAL_BASHAR_SWORDS:
                  revealState = applyImperialBasharSwords(
                    revealState,
                    playerId,
                    card.id,
                    card.name,
                    revealedCards
                  )
                  break
                case CustomEffect.SHOCKTROOPER_EM_BONUS:
                  revealState = applyShockTrooperBonus(revealState, playerId, card.id, card.name)
                  break
                case CustomEffect.FULLSCALE_DREAD_SWORDS:
                  revealState = applyFullScaleDreadSwords(revealState, playerId, card.id, card.name)
                  break
                case CustomEffect.IXIAN_ENGINEER_VP:
                  revealState = applyIxianEngineerVp(revealState, playerId, card.id, card.name)
                  break
                case CustomEffect.NEGOTIATED_WITHDRAWAL:
                  revealState = applyNegotiatedWithdrawal(revealState, playerId, card.id, card.name)
                  break
                default:
                  break
              }
            }
            if (effect.reward?.trashThisCard) {
              const ix = mutablePlayArea.findIndex(c => c.id === card.id)
              if (ix >= 0) {
                const removed = mutablePlayArea.splice(ix, 1)[0]
                mutableTrash.push(removed)
              }
            }
          })
        
      // Process choice effects
      if(choiceEffects.length > 0) {
        const choiceId = nextSemanticId(
          { type: GainSource.CARD, id: card.id },
          'OR',
          pendingChoices.map(c => c.id)
        )
        
        // Check if any effects need card selection
        const cardSelectEffect = choiceEffects.find(e => 
          e.cost?.trash || e.reward.trash || e.reward.custom === CustomEffect.OTHER_MEMORY
        );
        
        if (cardSelectEffect && choiceEffects.length === 1) {
          // Single effect that needs card selection
          const pendingChoice = getEffectChoice(player, card, cardSelectEffect as PlayEffect, pendingChoices.map(c => c.id));
          pendingChoices.push(pendingChoice);
        } else if (choiceEffects.length === 1) {
          // Single regular choice
          const pendingChoice = getEffectChoice(player, card, choiceEffects[0] as PlayEffect, pendingChoices.map(c => c.id));
          pendingChoices.push(pendingChoice);
        } else {
          // Multiple OR choices - create single FixedOptionsChoice with all options
          const options = choiceEffects.map(effect => {
            let disabled = false;
            if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
              const hasBG = player.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT));
              disabled = !hasBG;
            }
            return { cost: effect.cost, reward: effect.reward, disabled };
          });
          
          const fixedOptionsChoice: FixedOptionsChoice = {
            id: choiceId,
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Choose one reward',
            options,
            source: { type: GainSource.CARD, id: card.id, name: card.name }
          };
          pendingChoices.push(fixedOptionsChoice);
        }
      }
      })

      for (const r of revealState.pendingRewards) {
        if (!pendingRewards.some(existing => existing.id === r.id)) {
          pendingRewards.push(r)
        }
      }
      if (revealState.gains.length > updatedGains.length) {
        updatedGains.push(...revealState.gains.slice(updatedGains.length))
      }
      if (revealState.currTurn?.pendingChoices?.length) {
        for (const choice of revealState.currTurn.pendingChoices) {
          if (!pendingChoices.some(existing => existing.id === choice.id)) {
            pendingChoices.push(choice)
          }
        }
      }
      if (revealState.currTurn?.effectRetreatAllowance) {
        tempCurrTurn.effectRetreatAllowance = revealState.currTurn.effectRetreatAllowance
      }

      const revealTech = applyRevealTechEffects(
        { ...revealState, gains: updatedGains },
        playerId,
        revealedCards,
        persuasionCount,
        swordCount
      )
      persuasionCount = revealTech.persuasionCount
      swordCount = revealTech.swordCount
      const stateAfterRevealTech = revealTech.state
      const gainsAfterRevealTech = stateAfterRevealTech.gains

      // Create or update the current turn
      const currentTurn = state.currTurn?.playerId === playerId 
        ? {
            ...state.currTurn,
            type: TurnType.REVEAL,
            canDeployTroops: tempCurrTurn.canDeployTroops,
            troopLimit: tempCurrTurn.troopLimit,
            removableTroops: tempCurrTurn.removableTroops,
            persuasionCount: (state.currTurn?.persuasionCount || 0) + persuasionCount,
            revealedCardIds: [...(state.currTurn.revealedCardIds || []), ...revealedCards.map(card => card.id)],
            optionalEffects: [...(state.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: pendingChoices
          }
        : {
            playerId,
            type: TurnType.REVEAL,
            canDeployTroops: tempCurrTurn.canDeployTroops,
            troopLimit: tempCurrTurn.troopLimit,
            removableTroops: 0,
            troopsDeployedToConflict: 0,
            troopsRetreatedFromConflict: 0,
            gainsStartIndex: state.gains.length,
            persuasionCount: persuasionCount,
            gainedEffects: [],
            acquiredCards: [],
            revealedCardIds: revealedCards.map(card => card.id),
            optionalEffects,
            pendingChoices,
          }

      // Update combat strength even if not in combat (so can be used later)
      const riseOfIx = state.expansions?.riseOfIx === true
      const troops = state.combatTroops[playerId] || 0
      const negotiators = riseOfIx ? (state.combatNegotiators?.[playerId] ?? 0) : 0
      const dCount = riseOfIx ? (player.dreadnoughts?.conflict ?? 0) : 0
      const hasUnitsInCombat = riseOfIx ? troops + negotiators + dCount > 0 : troops > 0
      const baseStrength =
        (troops + negotiators) * 2 +
        (riseOfIx ? dCount * dreadnoughtStrengthEach(player.leader) : 0)
      const updatedCombatValue = hasUnitsInCombat
        ? (player.combatValue ? player.combatValue + swordCount : swordCount + baseStrength)
        : 0
      const updatedCombatStrength = hasUnitsInCombat
        ? {
            ...revealState.combatStrength,
            ...state.combatStrength,
            [playerId]: (revealState.combatStrength[playerId] ?? state.combatStrength[playerId] ?? 0) + swordCount,
          }
        : state.combatStrength

      // Dispatch an Envoy only affects the next Agent card played; it does not modify revealed cards.
      // Clear the flag on Reveal so a wasted Dispatch (played before/during Reveal with no Agent play) does not linger.
      const dispatchEnvoyActiveAfterReveal = (() => {
        const next = { ...(state.dispatchEnvoyActive || {}) }
        delete next[playerId]
        return next
      })()

      return resolveMandatoryTroopDeploy(
        {
          ...stateAfterRevealTech,
          gains: gainsAfterRevealTech,
          players: stateAfterRevealTech.players.map(p =>
            p.id === playerId
              ? {
                  ...ilesaPlayer,
                  deck: updatedDeck,
                  playArea: mutablePlayArea,
                  trash: mutableTrash,
                  selectedCard: null,
                  combatValue: updatedCombatValue,
                  handCount: 0,
                  persuasion: ilesaPlayer.persuasion + persuasionCount,
                  revealed: true,
                  troops: player.troops,
                }
              : p
          ),
          combatStrength: updatedCombatStrength,
          currTurn: currentTurn,
          pendingRewards,
          canEndTurn: (pendingChoices.length > 0 || tempCurrTurn.pendingChoices?.length || pendingRewards.filter(r => !r.disabled).length > 0) ? false : true,
          canAcquireIR: true,
          scheduledIntrigueOnReveal: { ...(state.scheduledIntrigueOnReveal || {}), [playerId]: [] },
          scheduledGraftOnReveal: { ...(state.scheduledGraftOnReveal || {}), [playerId]: [] },
          dispatchEnvoyActive: dispatchEnvoyActiveAfterReveal,
        },
        playerId
      )
    }
    case 'ACQUIRE_CARD': {
      const { playerId, cardId, freeAcquire, acquireToTop } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state

      const isHelenaRemovedCard = state.helenaRemovedCard?.cardId === cardId && state.helenaRemovedCard?.playerId === playerId
      let card: Card
      let cardIndex: number
      if (isHelenaRemovedCard && state.helenaRemovedCard?.card) {
        card = state.helenaRemovedCard.card
        cardIndex = -1
      } else {
        cardIndex = state.imperiumRow.findIndex(c => c.id === cardId)
        if (cardIndex === -1) return state
        card = state.imperiumRow[cardIndex]
      }
      const cost = card.cost || 0
      const effectiveCost = freeAcquire ? 0 : (isHelenaRemovedCard ? Math.max(0, cost - 1) : cost)

      // Only check persuasion cost if this is not a free acquire
      if (!freeAcquire && player.persuasion < effectiveCost) return state

      // acquireToTop must be explicit (UI choice when Recruitment Mission / Spaceport is active).
      const shouldAcquireToTop = acquireToTop === true
      const updatedDeck = shouldAcquireToTop ? [card, ...player.deck] : player.deck
      const updatedDiscardPile = shouldAcquireToTop ? player.discardPile : [...player.discardPile, card]

      let updatedPlayer: Player = {
        ...player,
        persuasion: freeAcquire ? player.persuasion : player.persuasion - effectiveCost,
        deck: updatedDeck,
        discardPile: updatedDiscardPile
      }

      const updatedGains: Gain[] = [...state.gains]
      const pushGain = (amount: number | undefined, type: RewardType) => {
        if (!amount) return
        updatedGains.push({
          round: state.currentRound,
          playerId,
          sourceId: card.id,
          name: `${card.name} Acquire`,
          amount,
          type,
          source: GainSource.CARD
        })
      }
      updatedGains.push({
        round: state.currentRound,
        playerId,
        sourceId: card.id,
        name: card.name,
        amount: 1,
        type: RewardType.CARD,
        source: GainSource.CARD
      })

      const applyResource = (prop: 'spice' | 'water' | 'troops' | 'victoryPoints', amount?: number, rewardType?: RewardType) => {
        if (!amount) return
        updatedPlayer[prop] += amount
        if (rewardType) pushGain(amount, rewardType)
      }

      applyResource('spice', card.acquireEffect?.spice, RewardType.SPICE)
      applyResource('water', card.acquireEffect?.water, RewardType.WATER)
      applyResource('troops', card.acquireEffect?.troops, RewardType.TROOPS)
      applyResource('victoryPoints', card.acquireEffect?.victoryPoints, RewardType.VICTORY_POINTS)

      let workingState: GameState = { ...state, gains: updatedGains }
      const pendingAcquireChoices: PendingChoice[] = []

      if (card.acquireEffect?.freighter && isRiseOfIxEnabled(state)) {
        pushFreighterChoicesFromReward(
          workingState,
          card.acquireEffect.freighter,
          playerId,
          { type: GainSource.CARD, id: card.id, name: card.name },
          pendingAcquireChoices
        )
      }
      if (card.acquireEffect?.dreadnoughts && state.expansions?.riseOfIx) {
        workingState = handleDreadnoughtReward(
          workingState,
          playerId,
          card.acquireEffect.dreadnoughts,
          { type: GainSource.CARD, id: card.id, name: card.name }
        )
        const refreshed = workingState.players.find(p => p.id === playerId)
        if (refreshed) {
          updatedPlayer = {
            ...updatedPlayer,
            dreadnoughts: refreshed.dreadnoughts,
            combatValue: refreshed.combatValue,
          }
        }
      }
      if (card.acquireEffect?.trash) {
        const trashSource = { type: GainSource.CARD, id: card.id, name: card.name }
        workingState = {
          ...workingState,
          pendingRewards: [
            ...workingState.pendingRewards,
            {
              id: nextSemanticId(trashSource, 'ACQUIRE-TRASH', workingState.pendingRewards.map(r => r.id)),
              source: trashSource,
              reward: { trash: card.acquireEffect.trash },
              isTrash: true,
            },
          ],
        }
      }

      if (card.acquireEffect?.influence) {
        const influence = card.acquireEffect.influence
        if (influence.chooseOne) {
          pendingAcquireChoices.push(
            createGainInfluenceChoice(
              influence,
              { type: GainSource.CARD, id: card.id, name: card.name },
              'Choose a faction to gain 1 influence',
              collectLiveIds(state, pendingAcquireChoices.map(c => c.id))
            )
          )
        } else {
          const acquireBaselinePlayer = { ...updatedPlayer }
          const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
          influence.amounts.forEach(({ faction, amount }) => {
            const applied = applyInfluenceDeltaForPlayer(workingState, updatedPlayer, faction, amount, {
              appendGainsTo: updatedGains,
              milestoneMeta,
            })
            workingState = applied.state
            updatedPlayer = applied.player
            pendingAcquireChoices.push(...applied.tessiaChoices)
            updatedGains.push({
              round: state.currentRound,
              playerId,
              sourceId: card.id,
              name: `${faction} Acquire`,
              amount,
              type: RewardType.INFLUENCE,
              source: GainSource.CARD
            })
          })
          if (milestoneMeta.troopsRecruited > 0) {
            workingState = withRecruitedTroopsDeployLimit(workingState, milestoneMeta.troopsRecruited)
          }
          updatedPlayer = mergePlayerAfterFactionInfluence(
            updatedPlayer,
            workingState,
            acquireBaselinePlayer
          )
        }
      }

      let updatedImperiumRow = state.imperiumRow
      let pendingReplacement = state.pendingImperiumRowReplacement
      if (!isHelenaRemovedCard) {
        const updatedRow = [...state.imperiumRow]
        updatedRow.splice(cardIndex, 1)
        updatedImperiumRow = updatedRow
        let existingPendingReplacement = state.pendingImperiumRowReplacement
        if (existingPendingReplacement && cardIndex < existingPendingReplacement.cardIndex) {
          existingPendingReplacement = { cardIndex: existingPendingReplacement.cardIndex - 1 }
        }
        pendingReplacement = state.imperiumRowDeck.length > 0 ? { cardIndex } : null
      }

      const updatedCurrTurn = state.currTurn?.playerId === playerId
        ? {
            ...state.currTurn,
            acquiredCards: [...(state.currTurn?.acquiredCards || []), card],
            pendingChoices: [
              ...(state.currTurn?.pendingChoices || []),
              ...pendingAcquireChoices
            ]
          }
        : state.currTurn

      const acquiredState = {
        ...workingState,
        players: state.players.map(p => (p.id === playerId ? updatedPlayer : p)),
        imperiumRow: updatedImperiumRow,
        imperiumRowDeck: [...state.imperiumRowDeck],
        currTurn: updatedCurrTurn,
        gains: workingState.gains,
        pendingImperiumRowReplacement: isHelenaRemovedCard ? state.pendingImperiumRowReplacement : pendingReplacement,
        helenaRemovedCard: isHelenaRemovedCard ? null : state.helenaRemovedCard,
        canEndTurn: pendingAcquireChoices.length > 0 ? false : state.canEndTurn
      }
      if (
        state.phase === GamePhase.END_GAME &&
        pendingAcquireChoices.length === 0 &&
        (acquiredState.currTurn?.pendingChoices?.length ?? 0) === 0
      ) {
        return afterEndgamePlayerAction(acquiredState)
      }
      return acquiredState
    }
    case 'SELECT_IMPERIUM_REPLACEMENT': {
      const { cardId } = action
      
      // Check if there's a pending replacement
      if (!state.pendingImperiumRowReplacement) return state
      
      // Find the card in the deck
      const cardIndex = state.imperiumRowDeck.findIndex(card => card.id === cardId)
      if (cardIndex === -1) return state
      
      const selectedCard = state.imperiumRowDeck[cardIndex]
      const { cardIndex: replacementIndex } = state.pendingImperiumRowReplacement
      
      // Remove the card from the deck
      const updatedDeck = [...state.imperiumRowDeck]
      updatedDeck.splice(cardIndex, 1)
      
      // Add the card to the Imperium Row at the tracked index
      const updatedImperiumRow = [...state.imperiumRow]
      updatedImperiumRow.splice(replacementIndex, 0, selectedCard)
      
      return {
        ...state,
        imperiumRow: updatedImperiumRow,
        imperiumRowDeck: updatedDeck,
        pendingImperiumRowReplacement: null,
        helenaRemovedCard: null
      }
    }
    case 'ACQUIRE_AL': {
      const { playerId, acquireToTop } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      if (state.arrakisLiaisonDeck.length === 0) return state
      if (player.persuasion < 2) return state
      const alDeck = [...state.arrakisLiaisonDeck]
      const card = alDeck.pop() as Card
      const toTop = acquireToTop === true
      const deck = toTop ? [card, ...player.deck] : player.deck
      const discardPile = toTop ? player.discardPile : [...player.discardPile, card]
      const persuasion = player.persuasion - 2
      const { gains, currTurn } = appendCardAcquisitionTracking(state, playerId, card, state.gains)
      return {
        ...state,
        arrakisLiaisonDeck: alDeck,
        gains,
        currTurn: currTurn ?? null,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, deck, discardPile, persuasion } : p
        ),
      }
    }
    case 'ACQUIRE_SMF': {
      const { playerId, acquireToTop } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      if (state.spiceMustFlowDeck.length === 0) return state

      const hasDiscount = state.currTurn?.smfDiscount === true
      const cost = hasDiscount ? Math.max(0, 9 - 3) : 9

      if (player.persuasion < cost) return state
      const smfDeck = [...state.spiceMustFlowDeck]
      const card = smfDeck.pop() as Card
      const updatedGains: Gain[] = [...state.gains]
      let victoryPoints = player.victoryPoints
      if (card.acquireEffect?.victoryPoints) {
        updatedGains.push({
          round: state.currentRound,
          playerId,
          sourceId: card.id,
          name: `${card.name} Acquire Effect`,
          amount: card.acquireEffect.victoryPoints,
          type: RewardType.VICTORY_POINTS,
          source: GainSource.CARD,
        })
        victoryPoints += card.acquireEffect.victoryPoints
      }
      const toTop = acquireToTop === true
      const deck = toTop ? [card, ...player.deck] : player.deck
      const discardPile = toTop ? player.discardPile : [...player.discardPile, card]
      const persuasion = player.persuasion - cost

      const tracked = appendCardAcquisitionTracking(state, playerId, card, updatedGains)
      const newCurrTurn = tracked.currTurn
        ? { ...tracked.currTurn, smfDiscount: false }
        : null

      return {
        ...state,
        spiceMustFlowDeck: smfDeck,
        gains: tracked.gains,
        currTurn: newCurrTurn,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, deck, discardPile, persuasion, victoryPoints } : p
        ),
      }
    }
    case 'PAY_COST': {
      const { playerId } = action;
      // Decision events: effectId resolves against the live optional effects;
      // the embedded `effect` payload is the legacy path. `action.data` carries
      // per-decision inputs (e.g. trashedCardId) on top of the stored effect.
      const storedEffect = action.effectId != null
        ? state.currTurn?.optionalEffects?.find(e => e.id === action.effectId)
        : action.effect
      if (!storedEffect) return state
      const effect: OptionalEffect = action.data
        ? { ...storedEffect, data: { ...storedEffect.data, ...action.data } }
        : storedEffect
      const { cost, reward, data, source } = effect;
      let player: Player = {...state.players.find(p => p.id === playerId)} as Player
      if (!player) return state;
      let tempCurrTurn: GameTurn = {
        ...state.currTurn,
        troopLimit: state.currTurn?.troopLimit || 0,
        theseTroopsDeployLimit: state.currTurn?.theseTroopsDeployLimit ?? 0,
        canDeployTroops: state.currTurn?.canDeployTroops || false,
        removableTroops: state.currTurn?.removableTroops || 0,
        removableTheseTroops: state.currTurn?.removableTheseTroops ?? 0,
        persuasionCount: state.currTurn?.persuasionCount || 0,
      } as GameTurn

      function canPayCost(player: Player): boolean {
        if(cost.spice && player.spice < cost.spice) return false;
        if(cost.water && player.water < cost.water) return false;
        if(cost.solari && player.solari < cost.solari) return false;
        if(cost.troops && player.troops < cost.troops) return false;
        if(cost.specimen && (player.specimens ?? 0) < cost.specimen) return false;
        if(cost.intrigueBottom && player.intrigueCount < cost.intrigueBottom) return false;
        if(cost.trash && !data?.trashedCardId) return false;
        if (reward.techNegotiator && (player.troopSupply ?? 0) < reward.techNegotiator) return false;
        if (reward.acquireTech !== undefined && !hasAvailableTechTile(state)) return false;
        return true;
      }

      if (requiresInfluenceChoices(cost, reward)) {
        if (!canAffordInfluenceOptionalEffect(state, playerId, cost, reward)) return state

        const influenceChoices: PendingChoice[] = []
        const choiceSource = { type: source.type, id: source.id, name: source.name }

        if (cost.influence?.chooseOne) {
          influenceChoices.push(
            createLoseInfluenceChoice(state, playerId, cost.influence, choiceSource, {
              payOnResolve: {
                spice: cost.spice,
                water: cost.water,
                solari: cost.solari,
                troops: cost.troops,
              },
              thenGain: reward.influence?.chooseOne ? reward.influence : undefined,
            }, collectLiveIds(state, influenceChoices.map(c => c.id)))
          )
        } else if (reward.influence?.chooseOne) {
          if (cost.spice) player.spice -= cost.spice
          if (cost.water) player.water -= cost.water
          if (cost.solari) player.solari -= cost.solari
          if (cost.troops) player.troops -= cost.troops
          influenceChoices.push(
            createGainInfluenceChoice(reward.influence, choiceSource, undefined, collectLiveIds(state, influenceChoices.map(c => c.id)))
          )
        }

        tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(e => e.id !== effect.id)
        tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices || []), ...influenceChoices]

        return {
          ...state,
          players: state.players.map(p => (p.id === playerId ? player : p)),
          currTurn: tempCurrTurn,
          canEndTurn: false,
        }
      }

      if(!canPayCost(player)) return state; // cannot afford

      const newGains: Gain[] = [...state.gains];
      function pushCostGain(amount: number | undefined, type: RewardType) {
        if (!amount) return;
        newGains.push({
          round: state.currentRound,
          playerId,
          sourceId: source.id,
          name: source.name,
          amount: -amount,
          type,
          source: source.type,
        });
      }

      // Deduct numeric resources
      if(cost.spice) { player.spice -= cost.spice; pushCostGain(cost.spice, RewardType.SPICE); }
      if(cost.water) { player.water -= cost.water; pushCostGain(cost.water, RewardType.WATER); }
      if(cost.solari) { player.solari -= cost.solari; pushCostGain(cost.solari, RewardType.SOLARI); }
      if(cost.troops) { player.troops -= cost.troops; pushCostGain(cost.troops, RewardType.TROOPS); }
      if(cost.specimen) { player.specimens = Math.max(0, (player.specimens ?? 0) - cost.specimen); pushCostGain(cost.specimen, RewardType.SPECIMEN); }
      if(cost.intrigueBottom) {
        player.intrigueCount -= cost.intrigueBottom
        pushCostGain(cost.intrigueBottom, RewardType.INTRIGUE)
      }

      // Handle trashing this card (card assumed to be in playArea)
      let unloadAfterPayCost: Card | undefined

      if(cost.trashThisCard && source.type === GainSource.CARD) {
        const cardId = source.id;
        let trashedCard: Card | undefined;
        player.playArea = player.playArea.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        if(trashedCard) {
          player.trash = [...(player.trash||[]), trashedCard];
          unloadAfterPayCost = trashedCard;
        } else {
          console.log("(Trash this card) card not found in playArea");
          return state;
        }
      }

      if(cost.trash) {
        const cardId = data?.trashedCardId;
        let trashedCard: Card | undefined;
        let isTrashedFromHand = false;
        player.playArea = player.playArea.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        player.deck = player.deck.filter(c => { if(c.id===cardId){trashedCard=c; isTrashedFromHand=true; return false;} return true;});
        player.discardPile = player.discardPile.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        if(trashedCard) {
          player.trash = [...(player.trash||[]), trashedCard];
          unloadAfterPayCost = trashedCard;
          // If card trashed from hand (deck), fix handCount
          if(isTrashedFromHand) {
            player.handCount = Math.max(0, player.handCount - 1);
          }
        } else {
          console.log("Trashed card not found");
          return state;
        }
      }

      function pushGain(amount:number, type: RewardType) {
        if(!amount) return;
        newGains.push({
          round: state.currentRound,
          playerId,
          sourceId: source.id,
          name: source.name,
          amount,
          type,
          source: source.type
        });
      }

      if(reward.drawCards) {
        player.handCount += reward.drawCards;
        pushGain(reward.drawCards, RewardType.DRAW);
      }
      if(reward.spice) { player.spice += reward.spice; pushGain(reward.spice, RewardType.SPICE);}
      if(reward.water) { player.water += reward.water; pushGain(reward.water, RewardType.WATER);} 
      if(reward.solari) { player.solari += reward.solari; pushGain(reward.solari, RewardType.SOLARI);} 
      if(reward.troops) {
        const recruited = recruitTroopsToGarrison(player, reward.troops)
        player = recruited.player
        pushGain(recruited.recruited, RewardType.TROOPS);
        if (tempCurrTurn.canDeployTroops && !isDeployTheseRecruitedTroops(reward)) {
          tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + recruited.recruited;
        }
      }
      if(reward.intrigueCards) {
        player.intrigueCount += reward.intrigueCards;
        pushGain(reward.intrigueCards, RewardType.INTRIGUE);
      }
      if(reward.deployTroops) {
        pushGain(reward.deployTroops, RewardType.DEPLOY);
        tempCurrTurn = applyDeployTroopsAllowance(tempCurrTurn, reward.deployTroops, reward);
      }
      if (reward.retreatTroops) {
        pushGain(reward.retreatTroops, RewardType.RETREAT)
        tempCurrTurn.effectRetreatAllowance =
          (tempCurrTurn.effectRetreatAllowance ?? 0) + reward.retreatTroops
      }
      if(reward.victoryPoints) { player.victoryPoints += reward.victoryPoints; pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS);} 
      let nextCombatStrength = { ...state.combatStrength }
      if (reward.combat) {
        if (playerHasUnitsInCombat(state, playerId)) {
          pushGain(reward.combat, RewardType.COMBAT)
          player.combatValue = (player.combatValue || 0) + reward.combat
          nextCombatStrength = {
            ...nextCombatStrength,
            [playerId]: (nextCombatStrength[playerId] || 0) + reward.combat
          }
        }
      }
      if (
        reward.custom === CustomEffect.FREIGHTER_ADVANCE &&
        isRiseOfIxEnabled(state)
      ) {
        const { players, gains } = applyFreighterAdvance(state, playerId, source)
        const afterFreighter = {
          ...state,
          gains: [...newGains, ...gains],
          players: players.map(p => (p.id === playerId ? p : state.players.find(x => x.id === p.id)!)),
          currTurn: {
            ...tempCurrTurn,
            optionalEffects: tempCurrTurn.optionalEffects?.filter(e => e.id !== effect.id),
          },
        }
        return unloadAfterPayCost
          ? withUnloadAfterCardRemoved(afterFreighter, playerId, unloadAfterPayCost, 'trash')
          : afterFreighter
      }
      if (reward.custom === CustomEffect.ACQUIRE_FOLDSPACE) {
        tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(e => e.id !== effect.id)
        const paidState = {
          ...state,
          gains: newGains,
          players: state.players.map(p => (p.id === playerId ? player : p)),
          currTurn: tempCurrTurn,
        }
        const afterFoldspace = gameReducer(paidState, {
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: CustomEffect.ACQUIRE_FOLDSPACE,
          data: {},
        })
        return unloadAfterPayCost
          ? withUnloadAfterCardRemoved(afterFoldspace, playerId, unloadAfterPayCost, 'trash')
          : afterFoldspace
      }

      if (reward.acquireTech !== undefined && isRiseOfIxEnabled(state)) {
        tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(e => e.id !== effect.id)
        const discount = reward.acquireTech.discount ?? 0
        const paySolari = reward.acquireTech.paySolariInsteadOfSpice ?? false
        let next: GameState = {
          ...state,
          gains: newGains,
          players: state.players.map(p => (p.id === playerId ? player : p)),
          currTurn: tempCurrTurn,
        }
        if (hasAvailableTechTile(state)) {
          next = claimAcquireTechReward(next, playerId, discount, paySolari)
        }
        return unloadAfterPayCost
          ? withUnloadAfterCardRemoved(next, playerId, unloadAfterPayCost, 'trash')
          : next
      }

      if (reward.techNegotiator && isRiseOfIxEnabled(state)) {
        tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(e => e.id !== effect.id)
        const afterNegotiator = applyTechNegotiatorReward(
          {
            ...state,
            gains: newGains,
            players: state.players.map(p => (p.id === playerId ? player : p)),
            currTurn: tempCurrTurn,
          },
          playerId,
          reward.techNegotiator,
          effect.source
        )
        return unloadAfterPayCost
          ? withUnloadAfterCardRemoved(afterNegotiator, playerId, unloadAfterPayCost, 'trash')
          : afterNegotiator
      }

      // Remove cost from optionalEffects
      tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(
        e => e.id !== effect.id
      );

      const paidState = {
        ...state,
        gains: newGains,
        combatStrength: nextCombatStrength,
        players: state.players.map(p => p.id===playerId? player: p),
        currTurn: tempCurrTurn
      }
      return unloadAfterPayCost
        ? withUnloadAfterCardRemoved(paidState, playerId, unloadAfterPayCost, 'trash')
        : paidState
    }
    case 'RESOLVE_CHOICE': {
      const { playerId, source } = action
      if(!state.currTurn) return state
      
      const player = state.players.find(p => p.id === playerId)
      if(!player) return state

      const pendingChoiceForSource = state.currTurn.pendingChoices?.find(c => c.id === action.choiceId)

      if (action.optionIndex != null && !pendingChoiceForSource) return state

      // Decision events (plans/reducer/02): `optionIndex` selects from the live
      // choice's options; the embedded `reward` payload is the legacy path.
      let reward = action.reward
      if (action.optionIndex != null) {
        if (pendingChoiceForSource?.type !== ChoiceType.FIXED_OPTIONS) return state
        const selected = (pendingChoiceForSource as FixedOptionsChoice).options[action.optionIndex]
        if (!selected || selected.disabled) return state
        reward = selected.reward
      }
      if (!reward) return state

      const gainAttribution: GainAttribution | undefined = source
        ? { type: source.type as GainSource, id: source.id, name: source.name }
        : pendingChoiceForSource?.type === ChoiceType.FIXED_OPTIONS
          ? (pendingChoiceForSource as FixedOptionsChoice).source
          : pendingChoiceForSource?.type === ChoiceType.CARD_SELECT
            ? (pendingChoiceForSource as CardSelectChoice).source
            : undefined

      if (reward.recallSpaceId !== undefined) {
        const spaceId = reward.recallSpaceId
        const occ = state.occupiedSpaces[spaceId] || []
        if (!occ.includes(playerId)) return state
        const newOccupied = {
          ...state.occupiedSpaces,
          [spaceId]: occ.filter(id => id !== playerId)
        }
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = { ...state.currTurn, pendingChoices: newPending }
        const afterRecall = {
          ...state,
          occupiedSpaces: newOccupied,
          players: state.players.map(p =>
            p.id === playerId ? { ...p, agents: p.agents + 1 } : p
          ),
          currTurn: newTurn,
          canEndTurn: newPending.length === 0
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(afterRecall)
          : afterRecall
      }

      if (reward.custom === CustomEffect.KWISATZ_FROM_SUPPLY) {
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = { ...state.currTurn, pendingChoices: newPending }
        const after = {
          ...state,
          currTurn: newTurn,
          canEndTurn: false,
        }
        return state.phase === GamePhase.END_GAME ? afterEndgamePlayerAction(after) : after
      }

      if (reward.custom === CustomEffect.KWISATZ_RECALL_AGENT) {
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = {
          ...state.currTurn,
          pendingChoices: newPending,
          gainedEffects: [...(state.currTurn.gainedEffects || []), GAINED_EFFECT_RECALL_REQUIRED],
        }
        const after = { ...state, currTurn: newTurn, canEndTurn: false }
        return state.phase === GamePhase.END_GAME ? afterEndgamePlayerAction(after) : after
      }

      if (reward.retreatFromConflict !== undefined) {
        const n = reward.retreatFromConflict
        if (n < 0) return state
        if ((state.combatTroops[playerId] || 0) < n) return state
        let s = state
        for (let i = 0; i < n; i++) {
          s = gameReducer(s, {
            type: 'RETREAT_TROOP',
            playerId,
            fromEffect: true,
            bypassAllowance: true,
          })
        }
        const newPending = (s.currTurn?.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = s.currTurn ? { ...s.currTurn, pendingChoices: newPending } : null
        return finishCombatIntrigueAction(
          {
            ...s,
            currTurn: newTurn,
            canEndTurn: (newPending.length || 0) === 0,
          },
          playerId
        )
      }

      if (reward.custom === CustomEffect.COMMISSION_DREADNOUGHT && gainAttribution) {
        const commissioned = resolveCommissionDreadnoughtChoice(state, playerId, reward, gainAttribution)
        const newPending = (commissioned.currTurn?.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = commissioned.currTurn
          ? { ...commissioned.currTurn, pendingChoices: newPending }
          : null
        const after = {
          ...commissioned,
          currTurn: newTurn,
          canEndTurn:
            newPending.length === 0 &&
            commissioned.pendingRewards.filter(r => !r.disabled).length === 0,
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(after)
          : after
      }

      if (
        reward.custom === CustomEffect.FREIGHTER_ADVANCE &&
        gainAttribution &&
        isRiseOfIxEnabled(state)
      ) {
        const { players, gains } = applyFreighterAdvance(state, playerId, gainAttribution)
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = { ...state.currTurn, pendingChoices: newPending }
        const after = {
          ...state,
          players,
          gains,
          currTurn: newTurn,
          canEndTurn:
            newPending.length === 0 && state.pendingRewards.filter(r => !r.disabled).length === 0,
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(after)
          : after
      }

      if (
        reward.custom === CustomEffect.FREIGHTER_RECALL &&
        gainAttribution &&
        isRiseOfIxEnabled(state)
      ) {
        const remainingChoices = (state.currTurn.pendingChoices || []).filter(
          c => c.id !== action.choiceId
        )
        const recall = applyFreighterRecall(
          state,
          playerId,
          gainAttribution,
          remainingChoices,
          [...state.pendingRewards]
        )
        const newTurn = {
          ...state.currTurn,
          pendingChoices: recall.pendingChoices,
        }
        const after = {
          ...state,
          players: recall.players,
          gains: recall.gains,
          pendingRewards: recall.pendingRewards,
          currTurn: newTurn,
          canEndTurn:
            recall.pendingChoices.length === 0 &&
            recall.pendingRewards.filter(r => !r.disabled).length === 0,
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(after)
          : after
      }

      if (reward.acquireTech !== undefined && isRiseOfIxEnabled(state) && gainAttribution) {
        const discount = reward.acquireTech.discount ?? 0
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const newTurn = { ...state.currTurn, pendingChoices: newPending }
        let resolved: GameState = {
          ...state,
          currTurn: newTurn,
          canEndTurn: newPending.length === 0,
        }
        if (hasAvailableTechTile(state)) {
          resolved = claimAcquireTechReward(resolved, playerId, discount)
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(resolved)
          : resolved
      }

      if (reward.techNegotiator && isRiseOfIxEnabled(state) && gainAttribution) {
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const resolved = applyTechNegotiatorReward(
          { ...state, currTurn: { ...state.currTurn, pendingChoices: newPending } },
          playerId,
          reward.techNegotiator,
          gainAttribution
        )
        const after = {
          ...resolved,
          canEndTurn:
            newPending.length === 0 &&
            resolved.pendingRewards.filter(r => !r.disabled).length === 0,
        }
        return state.phase === GamePhase.END_GAME
          ? afterEndgamePlayerAction(after)
          : after
      }

      if (reward.custom === CustomEffect.TESSIA_SNOOPER_DISCARD_SPICE && state.currTurn) {
        const newPending = (state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
        const tessiaSource: GainAttribution = gainAttribution ?? {
          type: GainSource.TESSIA_SNOOPER,
          id: 0,
          name: 'Tessia snooper',
        }
        const cardSelectChoice: CardSelectChoice = {
          id: mintId(state, tessiaSource, 'DISCARD'),
          type: ChoiceType.CARD_SELECT,
          prompt: 'Discard a card to gain 1 spice',
          piles: [CardPile.HAND],
          selectionCount: 1,
          disabled: player.handCount < 1,
          onResolve: (cardIds: number[]) => ({
            type: 'CUSTOM_EFFECT',
            playerId,
            customEffect: CustomEffect.TESSIA_SNOOPER_DISCARD_RESOLVED,
            data: { cardIds, gainSource: tessiaSource },
          }),
          source: tessiaSource,
        }
        return {
          ...state,
          currTurn: { ...state.currTurn, pendingChoices: [...newPending, cardSelectChoice] },
          canEndTurn: false,
        }
      }
      
      // Check if this reward has an acquire effect
      if(reward.acquire) {
        // Find the choice to get the cost from the selected option
        const choice = state.currTurn.pendingChoices?.find(c => c.id === action.choiceId)
        if (!choice || choice.type !== ChoiceType.FIXED_OPTIONS) return state
        
        const fixedChoice = choice as FixedOptionsChoice
        const selectedOption = action.optionIndex != null
          ? fixedChoice.options[action.optionIndex]
          : fixedChoice.options.find(opt => 
              opt.reward.acquire?.limit === reward.acquire?.limit &&
              opt.reward.acquireToTopThisRound === reward.acquireToTopThisRound
            )
        
        if (!selectedOption) return state
        
        // Find the intrigue card that triggered this
        const intrigueCard = state.intrigueDiscard.find(c => c.id === source?.id) || 
          state.intrigueDeck.find(c => c.id === source?.id)
        
        if (!intrigueCard) return state
        
        // Pay cost if there is one
        const updatedPlayer = { ...player }
        const updatedGains = [...state.gains]
        const pushGain = (amount: number, type: RewardType) => {
          if (!amount) return
          updatedGains.push({
            round: state.currentRound,
            playerId,
            sourceId: source?.id || 0,
            name: source?.name || 'Unknown',
            amount,
            type,
            source: (source?.type as GainSource) || GainSource.INTRIGUE
          })
        }
        
        const cost = selectedOption.cost
        if (cost) {
          if (cost.spice) {
            if (updatedPlayer.spice < cost.spice) return state // Should not happen, but safety check
            updatedPlayer.spice -= cost.spice
            pushGain(-cost.spice, RewardType.SPICE)
          }
          if (cost.solari) {
            if (updatedPlayer.solari < cost.solari) return state
            updatedPlayer.solari -= cost.solari
            pushGain(-cost.solari, RewardType.SOLARI)
          }
          if (cost.water) {
            if (updatedPlayer.water < cost.water) return state
            updatedPlayer.water -= cost.water
            pushGain(-cost.water, RewardType.WATER)
          }
        }
        
        // For Bypass Protocol, we do NOT set acquireToTopThisRound round flag
        // Instead, we pass acquireToTop directly to ACQUIRE_CARD action
        // This ensures it only applies to the specific card being acquired
        
        // Create CardSelectChoice for Imperium Row
        const cardSelectChoice = createImperiumRowAcquireChoice(
          playerId,
          reward.acquire.limit,
          Boolean(reward.acquireToTopThisRound),
          intrigueCard,
          state.imperiumRow,
          collectLiveIds(state)
        )
        
        const newTurn = { ...state.currTurn }
        // Remove the current FixedOptionsChoice and add the CardSelectChoice
        newTurn.pendingChoices = [
          ...(state.currTurn.pendingChoices || []).filter(c => c.id !== action.choiceId),
          cardSelectChoice
        ]
        
        return {
          ...state,
          players: state.players.map(p => p.id === playerId ? updatedPlayer : p),
          gains: updatedGains,
          currTurn: newTurn,
          canEndTurn: false // Still have card selection pending
        }
      }
      
      // Check if this reward has a custom effect that needs card selection
      if(reward.custom === CustomEffect.OTHER_MEMORY) {
        const otherMemorySource: GainAttribution = gainAttribution ?? {
          type: GainSource.CARD,
          id: 0,
          name: 'Unknown',
        }
        // Create a CardSelectChoice for the custom effect
        const choiceId = mintId(state, otherMemorySource, 'CARD-SELECT')
        const cardSelectChoice: CardSelectChoice = {
          id: choiceId,
          type: ChoiceType.CARD_SELECT,
          prompt: PLAY_EFFECT_TEXTS[CustomEffect.OTHER_MEMORY] || CustomEffect.OTHER_MEMORY,
          piles: [CardPile.DISCARD],
          filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
          selectionCount: 1,
          disabled: !player.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT)),
          onResolve: (cardIds: number[]) => ({
            type: 'CUSTOM_EFFECT',
            playerId: player.id,
            customEffect: CustomEffect.OTHER_MEMORY,
            data: { cardId: cardIds[0], gainSource: otherMemorySource }
          }),
          source: otherMemorySource
        }
        
        const newTurn = { ...state.currTurn }
        newTurn.pendingChoices = [cardSelectChoice]
        
        return {
          ...state,
          currTurn: newTurn,
          canEndTurn: false // Still have a choice pending
        }
      }
      
      // Check if this is a SECRETS_STEAL custom effect
      if(reward.custom === CustomEffect.SECRETS_STEAL) {
        // Dispatch CUSTOM_EFFECT action
        const newTurn = { ...state.currTurn }
        newTurn.pendingChoices = []
        const newState = { 
          ...state, 
          currTurn: newTurn,
          canEndTurn: true
        }
        return gameReducer(newState, {
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: CustomEffect.SECRETS_STEAL,
          data: {}
        })
      }
      
      // Normal reward without custom effect
      // Check if we need to pay a cost first
      const choice = state.currTurn.pendingChoices?.find(c => c.id === action.choiceId)
      const updatedPlayer = { ...player }
      const updatedGains = [...state.gains]
      
      let followUpGainChoice: FixedOptionsChoice | null = null

      if (choice && choice.type === ChoiceType.FIXED_OPTIONS) {
        const fixedChoice = choice as FixedOptionsChoice
        const selectedOption = action.optionIndex != null
          ? fixedChoice.options[action.optionIndex]
          : fixedChoice.options.find(opt => {
              // Match the reward - for influence, match by faction
              if (reward.influence && opt.reward.influence) {
                return opt.reward.influence.amounts.some(a => 
                  reward.influence?.amounts.some(r => r.faction === a.faction && r.amount === a.amount)
                )
              }
              // For other rewards, do a simple comparison
              return JSON.stringify(opt.reward) === JSON.stringify(reward)
            })
        
        const pushGain = (amount: number, type: RewardType, gainName?: string) => {
          updatedGains.push({
            round: state.currentRound,
            playerId,
            sourceId: gainAttribution?.id ?? 0,
            name: gainName ?? gainAttribution?.name ?? 'Unknown',
            amount,
            type,
            source: gainAttribution?.type ?? GainSource.INTRIGUE
          })
        }

        const payNumericCost = (costToPay: Cost) => {
          if (costToPay.spice && updatedPlayer.spice < costToPay.spice) return false
          if (costToPay.water && updatedPlayer.water < costToPay.water) return false
          if (costToPay.solari && updatedPlayer.solari < costToPay.solari) return false
          if (costToPay.troops && updatedPlayer.troops < costToPay.troops) return false
          if (costToPay.spice) {
            updatedPlayer.spice -= costToPay.spice
            pushGain(-costToPay.spice, RewardType.SPICE)
          }
          if (costToPay.water) {
            updatedPlayer.water -= costToPay.water
            pushGain(-costToPay.water, RewardType.WATER)
          }
          if (costToPay.solari) {
            updatedPlayer.solari -= costToPay.solari
            pushGain(-costToPay.solari, RewardType.SOLARI)
          }
          if (costToPay.troops) {
            updatedPlayer.troops -= costToPay.troops
            pushGain(-costToPay.troops, RewardType.TROOPS)
          }
          return true
        }

        if (fixedChoice.influenceResolution?.payOnResolve) {
          if (!payNumericCost(fixedChoice.influenceResolution.payOnResolve)) return state
        }
        
        if (selectedOption?.cost) {
          if (!payNumericCost(selectedOption.cost)) return state
        }

        if (fixedChoice.influenceResolution?.thenGain) {
          followUpGainChoice = createGainInfluenceChoice(
            fixedChoice.influenceResolution.thenGain,
            fixedChoice.source,
            undefined,
            collectLiveIds(state)
          )
        } else if (reward.influence?.chooseOne) {
          followUpGainChoice = createGainInfluenceChoice(
            reward.influence,
            fixedChoice.source,
            undefined,
            collectLiveIds(state)
          )
        }
      }
      
      const rewardForApply =
        reward.influence?.chooseOne ? { ...reward, influence: undefined } : reward
      const newTurn = { ...state.currTurn }
      newTurn.pendingChoices = (newTurn.pendingChoices || []).filter(c => c.id !== action.choiceId)
      if (followUpGainChoice) {
        newTurn.pendingChoices = [...(newTurn.pendingChoices || []), followUpGainChoice]
      }
      const newState = applyChoiceReward(
        { ...state, players: state.players.map(p => p.id === playerId ? updatedPlayer : p), gains: updatedGains },
        rewardForApply,
        playerId,
        gainAttribution
      )
      const rewardFollowUps = (newState.currTurn?.pendingChoices ?? []).filter(
        c => c.id !== action.choiceId && !(newTurn.pendingChoices || []).some(tc => tc.id === c.id)
      )
      newTurn.pendingChoices = [...(newTurn.pendingChoices || []), ...rewardFollowUps]
      newState.currTurn = newTurn
      newState.canEndTurn = newTurn.pendingChoices.length === 0
      if (state.phase === GamePhase.COMBAT) {
        return finishCombatIntrigueAction(newState, playerId)
      }
      if (state.phase === GamePhase.END_GAME) {
        return afterEndgamePlayerAction(newState)
      }
      return newState
    }
    case 'RESOLVE_CARD_SELECT': {
      const { choiceId, cardIds } = action
      if(!state.currTurn) return state
      
      // Find the choice being resolved
      const choice = state.currTurn.pendingChoices?.find(c => c.id === choiceId)
      if (!choice || choice.type !== ChoiceType.CARD_SELECT) return state
      
      const cardSelectChoice = choice as CardSelectChoice
      
      // Execute the onResolve callback to get the action to dispatch
      const resolveAction = cardSelectChoice.onResolve(cardIds) as GameAction
      
      // Clear all pending choices when user makes any choice
      const newTurn = { ...state.currTurn }
      newTurn.pendingChoices = []
      
      const newState = { 
        ...state, 
        currTurn: newTurn,
        canEndTurn: true // No more choices pending
      }
      
      // Recursively dispatch the resolve action
      const resolved = gameReducer(newState, resolveAction)
      return state.phase === GamePhase.END_GAME
        ? afterEndgamePlayerAction(resolved)
        : resolved
    }
    case 'CUSTOM_EFFECT': {
      const { playerId, customEffect, data } = action
      
      switch(customEffect) {
        case CustomEffect.ILESA_SET_ASIDE: {
          const cardId = data.cardId as number
          return {
            ...state,
            players: state.players.map(p =>
              p.id === playerId ? resolveIlesaSetAside(p, cardId) : p
            ),
          }
        }
        case CustomEffect.TESSIA_SNOOPER_DISCARD_RESOLVED: {
          const cardIds = (data?.cardIds as number[]) ?? []
          const tessiaPlayer = state.players.find(p => p.id === playerId)
          if (!tessiaPlayer || cardIds.length === 0) return state

          const tessiaAttribution = data?.gainSource as GainAttribution | undefined
          const gainSource = tessiaAttribution?.type ?? GainSource.TESSIA_SNOOPER
          const gainSourceId = tessiaAttribution?.id ?? 0
          const gainName = tessiaAttribution?.name ?? 'Tessia snooper'

          let deck = [...tessiaPlayer.deck]
          const discardPile = [...tessiaPlayer.discardPile]
          for (const id of cardIds) {
            const idx = deck.findIndex(c => c.id === id)
            if (idx === -1) return state
            const [removed] = deck.splice(idx, 1)
            discardPile.push(removed)
          }

          return {
            ...state,
            gains: [
              ...state.gains,
              {
                round: state.currentRound,
                playerId,
                sourceId: gainSourceId,
                name: `${gainName} discard`,
                amount: -cardIds.length,
                type: RewardType.DRAW,
                source: gainSource,
              },
              {
                round: state.currentRound,
                playerId,
                sourceId: gainSourceId,
                name: gainName,
                amount: 1,
                type: RewardType.SPICE,
                source: gainSource,
              },
            ],
            players: state.players.map(p =>
              p.id === playerId
                ? {
                    ...p,
                    deck,
                    discardPile,
                    handCount: Math.max(0, p.handCount - cardIds.length),
                    spice: p.spice + 1,
                  }
                : p
            ),
          }
        }
        case CustomEffect.ACQUIRE_FOLDSPACE: {
          const player = state.players.find(p => p.id === playerId)
          if (!player || state.foldspaceDeck.length === 0) return state
          const foldspaceDeck = [...state.foldspaceDeck]
          const card = foldspaceDeck.pop() as Card
          return {
            ...state,
            foldspaceDeck,
            players: state.players.map(p =>
              p.id === playerId ? { ...p, discardPile: [...p.discardPile, card] } : p
            ),
            gains: [
              ...state.gains,
              {
                round: state.currentRound,
                playerId,
                sourceId: card.id,
                name: card.name,
                amount: 1,
                type: RewardType.CARD,
                source: GainSource.CARD,
              },
            ],
          }
        }
        case CustomEffect.OTHER_MEMORY: {
          const { cardId, gainSource } = data 
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state
          
          // Find the card in discard pile
          const cardIndex = player.discardPile.findIndex(c => c.id === cardId)
          if (cardIndex === -1) return state
          
          const card = player.discardPile[cardIndex]
          const newDiscardPile = player.discardPile.filter(c => c.id !== cardId)
          const newDeck = [card, ...player.deck]
          const newState = { ...state, gains: [...state.gains] }
          if (gainSource) {
            newState.gains.push({
              playerId,
              round: newState.currentRound,
              source: gainSource.type,
              sourceId: gainSource.id,
              name: gainSource.name,
              amount: 1,
              type: RewardType.DRAW,
            })
          }
          return {
            ...newState,
            players: newState.players.map(p =>
              p.id === playerId
              ? { ...p, discardPile: newDiscardPile, deck: newDeck, handCount: p.handCount + 1 }
              : p
            )
          }
        }
        case CustomEffect.SECRETS_STEAL: {
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state

          const agentSpaceId = state.currTurn?.agentSpaceId
          const space = agentSpaceId != null ? BOARD_SPACES.find(s => s.id === agentSpaceId) : undefined
          const gainName = space?.name ?? 'Secrets stolen'
          const gainSource = GainSource.BOARD_SPACE
          const gainSourceId = space?.id ?? 0
          const newGains = [...state.gains]

          // Steal 1 intrigue from each opponent with 4+ intrigue
          const newPlayers = state.players.map(p => {
            if (p.id !== playerId && p.intrigueCount >= 4) {
              newGains.push({
                round: state.currentRound,
                playerId: p.id,
                sourceId: gainSourceId,
                name: gainName,
                amount: -1,
                type: RewardType.INTRIGUE,
                source: gainSource,
              })
              return { ...p, intrigueCount: p.intrigueCount - 1 }
            }
            return p
          })

          // Count how many intrigue cards were stolen
          const stolenCount = newPlayers.filter(p => {
            if (p.id === playerId) return false
            const originalPlayer = state.players.find(op => op.id === p.id)
            return originalPlayer && originalPlayer.intrigueCount > p.intrigueCount
          }).length

          if (stolenCount > 0) {
            newGains.push({
              round: state.currentRound,
              playerId,
              sourceId: gainSourceId,
              name: gainName,
              amount: stolenCount,
              type: RewardType.INTRIGUE,
              source: gainSource,
            })
          }

          // Update the player with stolen intrigue
          return {
            ...state,
            gains: newGains,
            players: newPlayers.map(p =>
              p.id === playerId
                ? { ...p, intrigueCount: p.intrigueCount + stolenCount }
                : p
            ),
          }
        }
        case CustomEffect.CULL: {
          const player = state.players.find(p => p.id === playerId)
          if (!player || player.solari < 1) return state
          const cardId = data?.cardId as number
          if (typeof cardId !== 'number') return state
          const sourceCardId = (data?.sourceCardId as number) ?? 0
          let deck = [...player.deck]
          let discardPile = [...player.discardPile]
          let trash = [...player.trash]
          const handIdx = deck.findIndex(c => c.id === cardId)
          const discardIdx = discardPile.findIndex(c => c.id === cardId)
          let trashed: Card | undefined
          if (handIdx >= 0) {
            trashed = deck.splice(handIdx, 1)[0]
          } else if (discardIdx >= 0) {
            trashed = discardPile.splice(discardIdx, 1)[0]
          }
          if (!trashed) return state
          trash.push(trashed)
          const gains = [
            ...state.gains,
            {
              round: state.currentRound,
              playerId,
              sourceId: sourceCardId,
              name: 'Cull',
              amount: -1,
              type: RewardType.SOLARI,
              source: GainSource.INTRIGUE,
            },
          ]
          const afterCull: GameState = {
            ...state,
            gains,
            players: state.players.map(p =>
              p.id === playerId
                ? {
                    ...p,
                    solari: p.solari - 1,
                    deck,
                    discardPile,
                    trash,
                    handCount: handIdx >= 0 ? p.handCount - 1 : p.handCount,
                  }
                : p
            ),
          }
          return withUnloadAfterCardRemoved(afterCull, playerId, trashed, 'trash')
        }
        case CustomEffect.IXIAN_PROBE: {
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state
          const cardIds = (data?.cardIds as number[]) ?? []
          const drawCards = (data?.drawCards as number) ?? 0
          const sourceCardId = (data?.sourceCardId as number) ?? 0
          const discardCount = (data?.discardCount as number) ?? cardIds.length
          if (cardIds.length === 0) return state
          if (!validateDiscardCostSelection(player, discardCount, cardIds)) return state

          let deck = [...player.deck]
          const discardPile = [...player.discardPile]
          const discardedCards: Card[] = []
          let handCount = player.handCount
          for (const id of cardIds) {
            const idx = deck.findIndex(c => c.id === id)
            if (idx === -1) return state
            const [removed] = deck.splice(idx, 1)
            discardPile.push(removed)
            discardedCards.push(removed)
            if (idx < handCount) {
              handCount = Math.max(0, handCount - 1)
            }
          }

          const cardsInDrawPile = Math.max(0, deck.length - handCount)
          const drawn = Math.min(drawCards, cardsInDrawPile)
          handCount += drawn

          const gains = [...state.gains]
          gains.push({
            round: state.currentRound,
            playerId,
            sourceId: sourceCardId,
            name: 'Ixian Probe',
            amount: -cardIds.length,
            type: RewardType.DRAW,
            source: GainSource.INTRIGUE,
          })
          if (drawn > 0) {
            gains.push({
              round: state.currentRound,
              playerId,
              sourceId: sourceCardId,
              name: 'Ixian Probe',
              amount: drawn,
              type: RewardType.DRAW,
              source: GainSource.INTRIGUE,
            })
          }

          let nextState: GameState = {
            ...state,
            gains,
            players: state.players.map(p =>
              p.id === playerId
                ? {
                    ...p,
                    deck,
                    discardPile,
                    handCount,
                  }
                : p
            ),
          }
          for (const discarded of discardedCards) {
            nextState = withUnloadAfterCardRemoved(nextState, playerId, discarded, 'discard')
          }
          return nextState
        }
        case CustomEffect.HOLOPROJECTORS: {
          const cardIds = (data?.cardIds as number[]) ?? []
          return applyHoloprojectorsDiscard(state, playerId, cardIds)
        }
        case CustomEffect.INVASION_SHIPS: {
          const cardIds = (data?.cardIds as number[]) ?? []
          return applyInvasionShipsDiscard(state, playerId, cardIds)
        }
        case CustomEffect.SONIC_SNOOPERS: {
          const step = data?.step as string | undefined
          const cardId = data?.cardId as number | undefined
          if (cardId == null) return state
          if (step === 'return') {
            return applySonicSnoopersReturn(state, playerId, cardId)
          }
          return applySonicSnoopersDraw(state, playerId, cardId)
        }
        case CustomEffect.POWER_PLAY: {
          if (findPowerPlayInfluenceTarget(state.pendingRewards)) {
            return {
              ...state,
              pendingRewards: resolvePowerPlayOnPendingRewards(state.pendingRewards),
            }
          }
          const powerPlayBonus = applyPowerPlayBonusAfterInfluenceClaimed(state, playerId)
          return appendTessiaPendingChoices(powerPlayBonus.state, powerPlayBonus.pendingChoices)
        }
        case CustomEffect.REVEREND_MOTHER_MOHIAM: {
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state

          const hasBeneGesseritInPlay = player.playArea.some(
            c => c.faction?.includes(FactionType.BENE_GESSERIT) && c.id !== data?.cardId
          )
          if (!hasBeneGesseritInPlay) return state

          const opponents = state.players
            .filter(p => p.id !== playerId && opponentHasDiscardableCards(p))
            .map(p => p.id)
          if (opponents.length === 0) return state
          const discardCounts: Record<number, number> = {}
          opponents.forEach(id => {
            discardCounts[id] = 0
          })
          const mohiamCard =
            typeof data?.cardId === 'number'
              ? (player.playArea.find(c => c.id === data.cardId) ??
                state.players
                  .find(p => p.id === playerId)
                  ?.playArea.find(c => c.id === data.cardId))
              : undefined
          return {
            ...state,
            currTurn: state.currTurn
              ? {
                  ...state.currTurn,
                  opponentDiscardState: {
                    effect: CustomEffect.REVEREND_MOTHER_MOHIAM,
                    remainingOpponents: opponents,
                    currentOpponent: undefined,
                    discardCounts,
                    sourceCardId:
                      mohiamCard?.id ??
                      (typeof data?.cardId === 'number' ? data.cardId : undefined),
                    sourceCardName: mohiamCard?.name,
                  },
                }
              : null,
          }
        }
        case CustomEffect.TEST_OF_HUMANITY: {
          const opponents = state.players.filter(p => p.id !== playerId).map(p => p.id)
          if (opponents.length === 0) return state
          const discardCounts: Record<number, number> = {}
          opponents.forEach(id => {
            discardCounts[id] = 0
          })
          return {
            ...state,
            currTurn: state.currTurn
              ? {
                  ...state.currTurn,
                  opponentDiscardState: {
                    effect: CustomEffect.TEST_OF_HUMANITY,
                    remainingOpponents: opponents,
                    currentOpponent: opponents[0],
                    discardCounts,
                  },
                }
              : null,
          }
        }
        case CustomEffect.THE_VOICE: {
          const { spaceId } = data
          if (typeof spaceId !== 'number') return state
          
          // Block the space for opponents until this player's next turn
          const newBlockedSpaces = [...(state.blockedSpaces || [])]
          newBlockedSpaces.push({ spaceId, playerId })
          
          // Update canEndTurn based on remaining pendingRewards and pendingChoices
          const canEndTurn = (state.pendingRewards.filter(r => !r.disabled).length === 0 && (!state.currTurn?.pendingChoices?.length))
          
          return {
            ...state,
            blockedSpaces: newBlockedSpaces,
            canEndTurn
          }
        }
        case CustomEffect.GUILD_BANKERS: {
          // Set SMF discount flag for this reveal turn
          return {
            ...state,
            currTurn: state.currTurn ? {
              ...state.currTurn,
              smfDiscount: true
            } : null
          }
        }
        case CustomEffect.HELENA_SIGNET_RING: {
          // Remove and replace a card in the Imperium Row; player may acquire the removed card for 1 Persuasion less this Reveal
          const selectedCardId = (data?.cardId ?? data?.imperiumRowCardId) as number | undefined
          if (typeof selectedCardId !== 'number') return state
          const cardIndex = state.imperiumRow.findIndex((c) => c.id === selectedCardId)
          if (cardIndex === -1) return state
          if (state.imperiumRowDeck.length === 0) return state
          const removedCard = state.imperiumRow[cardIndex]
          const [replacementCard, ...restDeck] = state.imperiumRowDeck
          const updatedImperiumRow = [...state.imperiumRow]
          updatedImperiumRow[cardIndex] = replacementCard
          return {
            ...state,
            imperiumRow: updatedImperiumRow,
            imperiumRowDeck: restDeck,
            helenaRemovedCard: { cardId: removedCard.id, playerId, card: removedCard }
          }
        }
        default: {
          console.log("Custom effect not implemented: ", customEffect)
          return state
        }
      }
    }
    case 'TRASH_CARD': {
      const { playerId, cardId, gainReward, source: trashSource } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      
      let card: Card | undefined
      const newPlayer = { ...player }
      
      // Find and remove the card from any pile
      const handIndex = player.deck.findIndex(c => c.id === cardId)
      const discardIndex = player.discardPile.findIndex(c => c.id === cardId)
      const playAreaIndex = player.playArea.findIndex(c => c.id === cardId)
      
      if (handIndex !== -1) {
        card = player.deck[handIndex]
        newPlayer.deck = player.deck.filter(c => c.id !== cardId)
        if (handIndex < player.handCount) {
          newPlayer.handCount = Math.max(0, player.handCount - 1)
        }
      } else if (discardIndex !== -1) {
        card = player.discardPile[discardIndex]
        newPlayer.discardPile = player.discardPile.filter(c => c.id !== cardId)
      } else if (playAreaIndex !== -1) {
        card = player.playArea[playAreaIndex]
        newPlayer.playArea = player.playArea.filter(c => c.id !== cardId)
      }
      
      if (!card) return state
      
      // Add to trash
      newPlayer.trash = [...(player.trash || []), card]
      
      const trashGainSource = trashSource ?? { type: GainSource.CARD, id: card.id, name: card.name }
      const newGains = [...state.gains, {
        round: state.currentRound,
        playerId,
        sourceId: card.id,
        name: card.name,
        amount: -1,
        type: RewardType.TRASH,
        source: trashGainSource.type,
      }]
      
      let newState = {
        ...state,
        players: state.players.map(p => p.id === playerId ? newPlayer : p),
        gains: newGains,
      }
      
      // Apply any reward for trashing
      if (gainReward) {
        newState = applyChoiceReward(newState, gainReward, playerId, trashSource)
      }

      return withUnloadAfterCardRemoved(newState, playerId, card, 'trash')
    }
    case 'CLAIM_REWARD': {
      const { playerId, rewardId, customData } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      
      // Find the reward
      const reward = state.pendingRewards.find(r => r.id === rewardId)
      if (!reward) return state
      if (reward.reward.custom === CustomEffect.THE_VOICE && (typeof customData?.spaceId !== 'number')) {
        return state
      }
      if (reward.reward.trash && !reward.reward.trashThisCard && typeof customData?.trashedCardId !== 'number') {
        return state
      }

      if (reward.reward.influence?.chooseOne) {
        const influenceChoice = createGainInfluenceChoice(
          reward.reward.influence,
          reward.source,
          undefined,
          collectLiveIds(state)
        )
        const newTurn = {
          ...state.currTurn,
          pendingChoices: [...(state.currTurn?.pendingChoices ?? []), influenceChoice],
        }
        return {
          ...state,
          pendingRewards: state.pendingRewards.filter(r => r.id !== rewardId),
          currTurn: newTurn,
          canEndTurn: false,
        }
      }

      // Resolved factions for Masterstroke / Memnon influence rewards
      let resolvedInfluenceFactions: FactionType[] | null = null
      if (reward.source.type === GainSource.MASTERSTROKE) {
        const validFactions = Object.values(FactionType) as FactionType[]
        const rawFactions = customData?.factions as FactionType[] | undefined
        if (
          !Array.isArray(rawFactions) ||
          rawFactions.length !== 2 ||
          !rawFactions.every(f => validFactions.includes(f))
        ) {
          return state
        }
        resolvedInfluenceFactions = rawFactions
      }
      if (reward.source.type === GainSource.MEMNON_HIGH_COUNCIL) {
        const factions = customData?.factions as FactionType[] | undefined
        const validFactions = Object.values(FactionType) as FactionType[]
        if (!Array.isArray(factions) || factions.length !== 1 || !factions.every(f => validFactions.includes(f))) {
          return state
        }
        resolvedInfluenceFactions = factions
      }
      
      let newState = { ...state }
      const baselinePlayer = { ...player }
      let newPlayer = { ...player }
      const newGains = [...state.gains]
      
      // If this is a trash reward, remove all pending rewards from the same card source
      if (reward.isTrash) {
        // Remove all pending rewards from the SAME card source
        newState.pendingRewards = state.pendingRewards.filter(r => 
          !(r.source.type === reward.source.type && r.source.id === reward.source.id)
        )
      } else {
        // Regular reward - just remove this one
        newState.pendingRewards = state.pendingRewards.filter(r => r.id !== rewardId)
      }
      
      // Helena signet ring: either claim with customData.imperiumRowCardId (card picker in claim UI) or show CardSelectChoice
      if (reward.reward.custom === CustomEffect.HELENA_SIGNET_RING) {
        const imperiumRowCardId = customData?.imperiumRowCardId as number | undefined
        if (typeof imperiumRowCardId === 'number') {
          // Claim with chosen card id: remove reward and run CUSTOM_EFFECT
          const customEffectState = {
            ...newState,
            pendingRewards: state.pendingRewards.filter(r => r.id !== rewardId),
            players: state.players.map(p => p.id === playerId ? newPlayer : p),
            gains: newGains
          }
          return gameReducer(customEffectState, {
            type: 'CUSTOM_EFFECT',
            playerId,
            customEffect: CustomEffect.HELENA_SIGNET_RING,
            data: { imperiumRowCardId }
          })
        }
        // No card chosen yet: create CardSelectChoice (resolved as CUSTOM_EFFECT with imperiumRowCardId)
        const choiceId = mintId(state, reward.source, 'CARD-SELECT')
        const cardSelectChoice: CardSelectChoice = {
          id: choiceId,
          type: ChoiceType.CARD_SELECT,
          prompt: PLAY_EFFECT_TEXTS[CustomEffect.HELENA_SIGNET_RING] ?? 'Choose a card to remove from the Imperium Row.',
          piles: [],
          cards: state.imperiumRow,
          selectionCount: 1,
          onResolve: (cardIds: number[]) => ({
            type: 'CUSTOM_EFFECT',
            playerId,
            customEffect: CustomEffect.HELENA_SIGNET_RING,
            data: { imperiumRowCardId: cardIds[0] }
          }),
          source: reward.source
        }
        const newTurn = state.currTurn ? { ...state.currTurn, pendingChoices: [...(state.currTurn.pendingChoices || []), cardSelectChoice] } : null
        return {
          ...newState,
          currTurn: newTurn,
          canEndTurn: false
        }
      }

      // Handle custom effects before applying reward
      if (reward.reward.dreadnoughts && state.expansions?.riseOfIx) {
        newState = handleDreadnoughtReward(newState, playerId, reward.reward.dreadnoughts, reward.source)
        newState.pendingRewards = newState.pendingRewards.filter(r => r.id !== rewardId)
        newState.canEndTurn =
          newState.pendingRewards.filter(r => !r.disabled).length === 0 &&
          !(newState.currTurn?.pendingChoices?.length)
        return newState
      }

      if (reward.reward.acquireTech !== undefined && isRiseOfIxEnabled(state)) {
        newState.pendingRewards = state.pendingRewards.filter(r => r.id !== rewardId)
        const discount = reward.reward.acquireTech.discount ?? 0
        const paySolari = reward.reward.acquireTech.paySolariInsteadOfSpice ?? false
        if (hasAvailableTechTile(state)) {
          newState = claimAcquireTechReward(newState, playerId, discount, paySolari)
        }
        newGains.push({
          round: state.currentRound,
          playerId,
          sourceId: reward.source.id,
          name: hasAvailableTechTile(state) ? `Acquire Tech (−${discount})` : 'No tech tile available',
          amount: hasAvailableTechTile(state) ? 1 : 0,
          type: RewardType.TECH,
          source: reward.source.type,
        })
        newState.players = state.players.map(p => (p.id === playerId ? newPlayer : p))
        newState.gains = newGains
        newState.canEndTurn =
          newState.pendingRewards.filter(r => !r.disabled).length === 0 &&
          !(state.currTurn?.pendingChoices?.length)
        return newState
      }

      if (reward.reward.custom) {
        // Dispatch CUSTOM_EFFECT action for other custom effects
        const customEffectState = {
          ...newState,
          pendingRewards: state.pendingRewards.filter(r => r.id !== rewardId),
          players: state.players.map(p => p.id === playerId ? newPlayer : p),
          gains: newGains
        }
        return gameReducer(customEffectState, {
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: reward.reward.custom,
          data: { cardId: reward.source.id, ...(customData || {}) },
        })
      }
      
      // Apply the reward using shared helper (Ariana gains 1 less spice and draws 1 when harvesting)
      const resolvedReward = getResolvedRewardForPlayer(player, reward)
      const rewardToApply =
        resolvedReward.trash && !resolvedReward.trashThisCard
          ? { ...resolvedReward, trash: customData?.trashedCardId as number }
          : resolvedReward
      const trashBeforeClaim = player.trash
      newPlayer = applyRewardToPlayer(rewardToApply, newPlayer, newGains, state, reward.source)
      
      // Handle influence updates (needs state modification)
      const influenceAmounts = resolvedInfluenceFactions
        ? resolvedInfluenceFactions.map(f => ({ faction: f, amount: 1 }))
        : reward.reward.influence?.amounts ?? []
      if (influenceAmounts.length > 0) {
        const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
        const tessiaChoices: PendingChoice[] = []
        influenceAmounts.forEach(inf => {
          const influenceAmount = reward.powerPlay ? inf.amount + 1 : inf.amount
          const applied = applyInfluenceDeltaForPlayer(newState, newPlayer, inf.faction, influenceAmount, {
            appendGainsTo: newGains,
            milestoneMeta,
          })
          newState = applied.state
          newPlayer = applied.player
          tessiaChoices.push(...applied.tessiaChoices)
          newGains.push({ round: newState.currentRound, playerId: playerId, sourceId: reward.source.id, name: inf.faction, amount: influenceAmount, type: RewardType.INFLUENCE, source: reward.source.type })
        })
        if (milestoneMeta.troopsRecruited > 0) {
          newState = withRecruitedTroopsDeployLimit(newState, milestoneMeta.troopsRecruited)
        }
        newPlayer = mergePlayerAfterFactionInfluence(newPlayer, newState, baselinePlayer)
        newState = appendTessiaPendingChoices(newState, tessiaChoices)
      }
      
      if (reward.reward.troops) {
        newState = withRecruitedTroopsDeployLimit(newState, reward.reward.troops)
      }
      if (reward.reward.retreatTroops) {
        newState = withEffectRetreatAllowance(newState, reward.reward.retreatTroops)
        newGains.push({
          round: state.currentRound,
          playerId,
          sourceId: reward.source.id,
          name: reward.source.name,
          amount: reward.reward.retreatTroops,
          type: RewardType.RETREAT,
          source: reward.source.type,
        })
      }
      
      // Update player
      newState.players = newState.players.map(p => p.id === playerId ? newPlayer : p)
      newState.gains = newGains
      
      // Update canEndTurn based on remaining pendingRewards and pendingChoices
      newState.canEndTurn = (newState.pendingRewards.filter(r => !r.disabled).length === 0 && (!newState.currTurn?.pendingChoices?.length))
      
      return resolveMandatoryTroopDeploy(
        withUnloadForNewlyTrashedCards(
          newState,
          playerId,
          trashBeforeClaim,
          newPlayer.trash,
          'trash'
        ),
        playerId
      )
    }
    case 'CLAIM_ALL_REWARDS': {
      const { playerId } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state

      const hasUnclaimedPowerPlay = state.pendingRewards.some(
        r => !r.disabled && r.reward.custom === CustomEffect.POWER_PLAY
      )

      // Group rewards by source to identify sources with trash
      const sourcesWithTrash = new Set<string>()
      state.pendingRewards.forEach(r => {
        if (r.isTrash) {
          sourcesWithTrash.add(`${r.source.type}-${r.source.id}`)
        }
      })

      const rewardsToApply = state.pendingRewards.filter(r =>
        !sourcesWithTrash.has(`${r.source.type}-${r.source.id}`) &&
        !r.disabled &&
        !r.reward.custom &&
        !r.reward.influence?.chooseOne &&
        !(
          hasUnclaimedPowerPlay &&
          r.source.type === GainSource.BOARD_SPACE &&
          r.reward.influence
        )
      )

      if (rewardsToApply.length === 0) return state

      let newState = { ...state }
      const baselinePlayer = { ...player }
      let newPlayer = { ...player }
      const newGains = [...state.gains]
      const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
      const tessiaChoices: PendingChoice[] = []
      
      // Track total troops recruited for troopLimit update
      let totalTroopsRecruited = 0
      
      // Apply each reward using shared helper
      rewardsToApply.forEach(reward => {
        const rewardToApply = getResolvedRewardForPlayer(player, reward)
        newPlayer = applyRewardToPlayer(rewardToApply, newPlayer, newGains, state, reward.source)
        
        // Track troops recruited
        if (rewardToApply.troops) {
          totalTroopsRecruited += rewardToApply.troops
        }
        
        // Handle influence updates (needs state modification)
        if (reward.reward.influence) {
          reward.reward.influence.amounts.forEach(inf => {
            const influenceAmount = reward.powerPlay ? inf.amount + 1 : inf.amount
            const applied = applyInfluenceDeltaForPlayer(newState, newPlayer, inf.faction, influenceAmount, {
              appendGainsTo: newGains,
              milestoneMeta,
            })
            newState = applied.state
            newPlayer = applied.player
            tessiaChoices.push(...applied.tessiaChoices)
            newGains.push({ round: newState.currentRound, playerId: playerId, sourceId: reward.source.id, name: inf.faction, amount: influenceAmount, type: RewardType.INFLUENCE, source: reward.source.type })
          })
        }
      })

      if (milestoneMeta.troopsRecruited > 0) {
        newState = withRecruitedTroopsDeployLimit(newState, milestoneMeta.troopsRecruited)
      }
      newPlayer = mergePlayerAfterFactionInfluence(newPlayer, newState, baselinePlayer)
      newState = appendTessiaPendingChoices(newState, tessiaChoices)
      
      if (totalTroopsRecruited > 0) {
        newState = withRecruitedTroopsDeployLimit(newState, totalTroopsRecruited)
      }
      
      // Remove only rewards that were applied; keep interactive custom effects, trash groups, etc.
      const appliedRewardIds = new Set(rewardsToApply.map(r => r.id))
      newState.pendingRewards = state.pendingRewards.filter(r => !appliedRewardIds.has(r.id))
      
      // Update player and gains
      newState.players = newState.players.map(p => p.id === playerId ? newPlayer : p)
      newState.gains = newGains
      
      // Update canEndTurn based on remaining pendingRewards and pendingChoices (excluding disabled rewards)
      newState.canEndTurn = (newState.pendingRewards.filter(r => !r.disabled).length === 0 && (!newState.currTurn?.pendingChoices?.length))
      
      return resolveMandatoryTroopDeploy(newState, playerId)
    }
    case 'OPPONENT_DISCARD_CHOICE': {
      const { playerId: actingPlayerId, opponentId, choice } = action
      if (!state.currTurn?.opponentDiscardState) return state
      if (actingPlayerId !== state.activePlayerId) return state
      
      const discardState = state.currTurn.opponentDiscardState
      
      // For REVEREND_MOTHER_MOHIAM, allow setting currentOpponent if undefined
      if (discardState.effect === CustomEffect.REVEREND_MOTHER_MOHIAM && !discardState.currentOpponent && choice === 'discard') {
        // Set the selected opponent as current
        if (!discardState.remainingOpponents.includes(opponentId)) return state
        const opponent = state.players.find(p => p.id === opponentId)
        if (!opponent || getOpponentDiscardableCards(opponent).length === 0) return state
        
        return {
          ...state,
          currTurn: state.currTurn ? {
            ...state.currTurn,
            opponentDiscardState: {
              ...discardState,
              currentOpponent: opponentId
            }
          } : null
        }
      }
      
      // For other cases, currentOpponent must match
      if (discardState.currentOpponent !== opponentId) return state
      
      const opponent = state.players.find(p => p.id === opponentId)
      if (!opponent) return state
      
      if (choice === 'loseTroop') {
        // Remove one deployed troop from combat
        const currentTroops = state.combatTroops[opponentId] || 0
        if (currentTroops <= 0) return state
        
        const newCombatTroops = { ...state.combatTroops }
        newCombatTroops[opponentId] = currentTroops - 1
        
        const newCombatStrength = { ...state.combatStrength }
        const currentStrength = newCombatStrength[opponentId] || 0
        if (currentStrength >= 2) {
          newCombatStrength[opponentId] = currentStrength - 2
        } else {
          delete newCombatStrength[opponentId]
        }
        
        const discardCounts = { ...(discardState.discardCounts || {}) }
        const newOpponentDiscardState = advanceOpponentDiscardState(
          state,
          discardState,
          opponentId,
          discardCounts
        )

        return {
          ...state,
          combatTroops: newCombatTroops,
          combatStrength: newCombatStrength,
          players: state.players.map(p =>
            p.id === opponentId
              ? { ...p, troops: p.troops + 1, combatValue: p.combatValue ? p.combatValue - 2 : 0 }
              : p
          ),
          currTurn: state.currTurn ? {
            ...state.currTurn,
            opponentDiscardState: newOpponentDiscardState
          } : null,
          canEndTurn: newOpponentDiscardState === undefined && state.pendingRewards.filter(r => !r.disabled).length === 0
        }
      } else {
        // Choice is discard - will be handled by OPPONENT_DISCARD_CARD action
        return state
      }
    }
    case 'OPPONENT_DISCARD_CARD': {
      const { playerId: actingPlayerId, opponentId, cardId } = action
      return applyOpponentDiscards(state, actingPlayerId, opponentId, [cardId])
    }
    case 'OPPONENT_DISCARD_CARDS': {
      const { playerId: actingPlayerId, opponentId, cardIds } = action
      return applyOpponentDiscards(state, actingPlayerId, opponentId, cardIds)
    }
    case 'OPPONENT_NO_CARD_ACK': {
      const { playerId: actingPlayerId, opponentId } = action
      if (!state.currTurn?.opponentDiscardState) return state
      if (actingPlayerId !== state.activePlayerId) return state
      const discardState = state.currTurn.opponentDiscardState
      if (discardState.effect !== CustomEffect.REVEREND_MOTHER_MOHIAM) return state
      if (!discardState.remainingOpponents.includes(opponentId)) return state
      const opponent = state.players.find(p => p.id === opponentId)
      if (!opponent || opponent.handCount > 0) return state
      if (
        discardState.currentOpponent != null &&
        discardState.currentOpponent !== opponentId
      ) {
        return state
      }

      const discardCounts = { ...(discardState.discardCounts || {}) }
      discardCounts[opponentId] = 2

      const newOpponentDiscardState = advanceOpponentDiscardState(
        state,
        discardState,
        opponentId,
        discardCounts
      )

      return {
        ...state,
        currTurn: state.currTurn ? {
          ...state.currTurn,
          opponentDiscardState: newOpponentDiscardState
        } : null,
        canEndTurn: newOpponentDiscardState === undefined && state.pendingRewards.filter(r => !r.disabled).length === 0
      }
    }
    case 'UNDO_TO_SETUP': {
      if (!state.setupBaseline) {
        console.warn('No setup baseline to restore')
        return state
      }

      const setupBaseline = state.setupBaseline
      if (setupBaseline.sandboxSetup) {
        const committed = getCommittedSandboxSetupSnapshot(state)
        if (committed) {
          return reenterSandboxSetupEditing(committed, setupBaseline)
        }
      }

      const baseline = deepCopyGameState(setupBaseline)
      return {
        ...baseline,
        setupBaseline: deepCopyGameState(state.setupBaseline),
        history: [baseline],
        currTurn: null,
        selectedCard: null,
        selectedCardDeckIndex: null,
        canEndTurn: false,
        canAcquireIR: false,
        gains: [],
        pendingRewards: [],
      }
    }
    case 'UNDO_TO_TURN': {
      const { turnIndex } = action
      
      // Validate turnIndex
      if (turnIndex < 0 || turnIndex >= state.history.length) {
        console.warn('Invalid undo turn index:', turnIndex)
        return state
      }
      
      // Get the historical state at the target index (deep copy — history entries are shared references)
      const targetState = deepCopyGameState(state.history[turnIndex])
      if (!targetState) {
        console.warn('No historical state found at index:', turnIndex)
        return state
      }
      
      // Truncate history to only include turns up to and including the target
      // The target state becomes the new current state, but we preserve it in history
      const historyBeforeTarget = state.history.slice(0, turnIndex).map(deepCopyGameState)
      // Include targetState in history to preserve turn information
      const truncatedHistory = [...historyBeforeTarget, targetState]
      
      // For turn 0 (initial state), preserve it in history so it can be undone to again
      // For other turns, include history up to target (not including targetState itself)
      const restoredHistory = turnIndex === 0 ? [targetState] : historyBeforeTarget
      
      // Restore the target state with truncated history (targetState is now the last entry)
      const restoredState = {
        ...targetState,
        history: restoredHistory
      }

      // Round-start / pre-setup baseline at index 0: use snapshot as-is (no player advance).
      // End-of-turn snapshots at index 0 still carry currTurn and fall through to advance logic.
      if (turnIndex === 0 && !targetState.currTurn) {
        if (
          state.setupBaseline?.sandboxSetup &&
          targetState.historyEntryKind === 'setup'
        ) {
          return reenterSandboxSetupEditing(targetState, state.setupBaseline)
        }
        return {
          ...targetState,
          history: [targetState],
          currTurn: null,
          selectedCard: null,
          selectedCardDeckIndex: null,
          canEndTurn: false,
          canAcquireIR: false,
          gains: [],
          pendingRewards: [],
        }
      }
      
      // Extract activePlayerId from restored state and get current player
      const currentPlayerId = restoredState.activePlayerId
      const currentPlayer = restoredState.players.find(p => p.id === currentPlayerId)
      if (!currentPlayer) {
        // If player not found, return restored state as-is
        return {
          ...restoredState,
          currTurn: null,
          selectedCard: null,
          selectedCardDeckIndex: null,
          canEndTurn: false,
          canAcquireIR: false,
          gains: [],
          pendingRewards: []
        }
      }
      
      // Create a working copy of the restored state
      const newState = {...restoredState}
      
      // Handle endgame phase separately
      if (restoredState.phase === GamePhase.END_GAME) {
        const done = new Set(newState.endgameDonePlayers || [])
        done.add(currentPlayerId)
        
        // Find next player who isn't done yet
        let nextIndex = (currentPlayerId + 1) % newState.players.length
        let attempts = 0
        while (attempts < newState.players.length && done.has(newState.players[nextIndex].id)) {
          nextIndex = (nextIndex + 1) % newState.players.length
          attempts++
        }
        
        const allDone = done.size >= newState.players.length
        const advancedState = {
          ...newState,
          endgameDonePlayers: done,
          activePlayerId: allDone ? newState.activePlayerId : newState.players[nextIndex].id,
          currTurn: null,
          canEndTurn: true,
          selectedCard: null,
          selectedCardDeckIndex: null,
          canAcquireIR: false,
          gains: [],
          pendingRewards: []
        }
        
        // Don't add the advanced state to history - it will be added when the turn actually completes
        // For turn 0, preserve the initial state in history. For other turns, include truncated history
        return {
          ...advancedState,
          history: turnIndex === 0 ? [targetState] : truncatedHistory
        }
      }
      
      // Check if all players have revealed (transition to combat)
      if (!newState.players.find(p => !p.revealed)) {
        // All players have revealed - check if anyone can participate in combat
        const playersWithUnits = newState.players.filter(p => playerCanParticipateInCombat(newState, p.id))
        const playersWithIntrigueAndUnits = playersWithUnits.filter(p => p.intrigueCount > 0)
        
        if (playersWithIntrigueAndUnits.length === 0) {
          // Skip combat phase - no one can participate
          const combatRewardsState = {
            ...newState,
            phase: GamePhase.COMBAT_REWARDS,
            combatPasses: new Set<number>(),
            players: newState.players.map(p =>
              p.id === currentPlayerId
                ? {
                    ...p,
                    selectedCard: null,
                  }
                : p
            ),
            activePlayerId: 0,
            currTurn: null,
            canEndTurn: false,
            canAcquireIR: false,
            selectedCard: null,
            selectedCardDeckIndex: null,
            gains: [],
            pendingRewards: []
          }
          
          // Don't add the combat rewards state to history - it will be added when combat actually resolves
          // For turn 0, preserve the initial state in history. For other turns, include truncated history
          return {
            ...combatRewardsState,
            history: turnIndex === 0 ? [targetState] : truncatedHistory
          }
        }
        
        // Continue to combat phase with first eligible player
        const combatAutoPasses = getAutoCombatPassPlayerIds(newState)
        let combatActiveId = newState.firstPlayerMarker
        let combatActivePlayer = newState.players[combatActiveId]
        let combatFindAttempts = 0
        while (
          combatFindAttempts < newState.players.length &&
          (combatAutoPasses.has(combatActiveId) ||
            combatActivePlayer.intrigueCount < 1 ||
            !playerCanParticipateInCombat(newState, combatActiveId))
        ) {
          combatActiveId = (combatActiveId + 1) % newState.players.length
          combatActivePlayer = newState.players[combatActiveId]
          combatFindAttempts++
        }
        const combatState = {
          ...newState,
          phase: GamePhase.COMBAT,
          combatPasses: combatAutoPasses,
          players: newState.players.map(p =>
            p.id === currentPlayerId
              ? {
                  ...p,
                  selectedCard: null,
                }
              : p
          ),
          activePlayerId: combatActiveId,
          currTurn: null,
          canEndTurn: false,
          canAcquireIR: false,
          selectedCard: null,
          selectedCardDeckIndex: null,
          gains: [],
          pendingRewards: []
        }
        
        // Don't add the combat state to history - it will be added when combat actually resolves
        // For turn 0, preserve the initial state in history. For other turns, include truncated history
        return {
          ...combatState,
          history: turnIndex === 0 ? [targetState] : truncatedHistory
        }
      }
      
      // Otherwise, advance to next player (skip revealed players)
      let nextIndex = (currentPlayerId + 1) % newState.players.length
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.revealed) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      
      // Clear blocked spaces for the player whose turn is starting
      const clearedBlockedSpaces = (newState.blockedSpaces || []).filter(
        bs => bs.playerId !== nextPlayer.id
      )
      
      const advancedState = {
        ...newState,
        blockedSpaces: clearedBlockedSpaces,
        players: newState.players.map(p =>
          p.id === currentPlayerId
            ? {
                ...p,
                selectedCard: null,
              }
            : p
        ),
        activePlayerId: nextPlayer.id,
        currTurn: null,
        canEndTurn: false,
        selectedCard: null,
        selectedCardDeckIndex: null,
        canAcquireIR: false,
        gains: [],
        pendingRewards: []
      }
      
      // Don't add the advanced state to history - it will be added when the turn actually completes
      // For turn 0, preserve the initial state in history. For other turns, include truncated history
      return {
        ...advancedState,
        history: turnIndex === 0 ? [targetState] : truncatedHistory
      }
    }
    case 'ACQUIRE_TECH':
      return handleAcquireTech(state, action)
    case 'ACTIVATE_TECH':
      return handleActivateTech(state, action)
    case 'TECH_NEGOTIATOR':
      return handleTechNegotiator(state, action)
    case 'ADVANCE_RESEARCH':
      return resolveResearchBranch(state, action.playerId, action.nodeId, applyChoiceReward)
    case 'SET_RESEARCH_NODE':
      if (!state.expansions?.immortality) return state
      return setResearchNode(state, action.playerId, action.nodeId)
    case 'SET_TLEILAXU_STEP':
      if (!state.expansions?.immortality) return state
      return setTleilaxuStep(state, action.playerId, action.step)
    case 'ACQUIRE_TLEILAXU':
      return handleAcquireTleilaxu(state, action.playerId, action.cardId, action.freeAcquire)
    case 'SET_TLEILAXU_ROW':
      return handleSetTleilaxuRow(state, action.cardIds)
    case 'USE_FAMILY_ATOMICS':
      return handleUseFamilyAtomics(state, action.playerId)
    case 'COMPLETE_GRAFT_PAIR': {
      if (!state.expansions?.immortality) return state
      const {
        playerId,
        primaryCardId,
        primaryDeckIndex,
        secondaryCardId,
        secondaryDeckIndex,
        imperiumRowCardId,
      } = action
      if (playerId !== state.activePlayerId) return state
      const pending = state.pendingGraftPartner
      if (pending && pending.primaryCardId !== primaryCardId) return state

      const player = state.players.find(p => p.id === playerId)
      if (!player) return state

      const primary =
        player.deck[primaryDeckIndex]?.id === primaryCardId
          ? player.deck[primaryDeckIndex]
          : player.deck.find(c => c.id === primaryCardId)
      if (!primary) return state

      let secondary: Card | undefined
      let usurpBorrowed: GameState['usurpBorrowed'] = null
      let imperiumRow = [...state.imperiumRow]

      if (imperiumRowCardId != null) {
        if (!isUsurpCard(primary)) return state
        const rowIndex = imperiumRow.findIndex(c => c.id === imperiumRowCardId)
        if (rowIndex < 0) return state
        const rowCard = imperiumRow[rowIndex]
        const borrowedId = rowCard.id
        secondary = { ...rowCard, id: borrowedId }
        imperiumRow = imperiumRow.filter((_, i) => i !== rowIndex)
        usurpBorrowed = { card: secondary, rowIndex }
      } else if (secondaryCardId != null) {
        const secIdx =
          typeof secondaryDeckIndex === 'number' &&
          player.deck[secondaryDeckIndex]?.id === secondaryCardId
            ? secondaryDeckIndex
            : player.deck.findIndex(c => c.id === secondaryCardId)
        if (secIdx < 0) return state
        secondary = player.deck[secIdx]
      }

      if (!secondary) return state
      if (!primary.graft && !secondary.graft) return state

      const graftPair = { cardIds: [primary.id, secondary.id] }
      const isContinuingTurn = state.currTurn?.playerId === playerId
      const currentTurn: GameTurn = isContinuingTurn
        ? { ...state.currTurn!, cardId: primary.id }
        : {
            playerId,
            type: TurnType.ACTION,
            cardId: primary.id,
            gainsStartIndex: state.gains.length,
            persuasionCount: 0,
            gainedEffects: [],
            acquiredCards: [],
            pendingChoices: [],
          }

      if (secondary.infiltrate || primary.infiltrate) {
        return {
          ...state,
          infiltrateIgnoreOccupancyOnce: {
            ...(state.infiltrateIgnoreOccupancyOnce ?? {}),
            [playerId]: true,
          },
          imperiumRow,
          graftPair,
          usurpBorrowed,
          pendingGraftPartner: null,
          selectedCard: primary.id,
          selectedCardDeckIndex: primaryDeckIndex,
          currTurn: currentTurn,
          canEndTurn: false,
        }
      }

      return {
        ...state,
        imperiumRow,
        graftPair,
        usurpBorrowed,
        pendingGraftPartner: null,
        selectedCard: primary.id,
        selectedCardDeckIndex: primaryDeckIndex,
        currTurn: currentTurn,
        canEndTurn: false,
      }
    }
    case 'CANCEL_GRAFT_SELECTION':
      return state.pendingGraftPartner
        ? {
            ...state,
            pendingGraftPartner: null,
            selectedCard: null,
            selectedCardDeckIndex: null,
            currTurn: null,
          }
        : state
    case 'RECALL_PLACED_AGENT': {
      const { playerId } = action
      if (playerId !== state.activePlayerId || !state.currTurn?.canRecallPlacedAgent) return state
      const spaceId = state.currTurn.agentSpaceId
      if (spaceId == null) return state
      const occupants = state.occupiedSpaces[spaceId] || []
      if (!occupants.includes(playerId)) return state

      const updatedOccupied = {
        ...state.occupiedSpaces,
        [spaceId]: occupants.filter(id => id !== playerId),
      }
      const updatedPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, agents: p.agents + 1 } : p
      )

      return {
        ...state,
        occupiedSpaces: updatedOccupied,
        players: updatedPlayers,
        currTurn: {
          ...state.currTurn,
          agentSpace: undefined,
          agentSpaceId: undefined,
          canRecallPlacedAgent: false,
          canDeployTroops: false,
          troopLimit: 0,
        },
      }
    }
    case 'SET_GRAFT_PAIR':
      return state.expansions?.immortality
        ? { ...state, graftPair: action.cardIds.length ? { cardIds: action.cardIds } : null }
        : state
    case 'CLEAR_GRAFT_PAIR':
      return state.expansions?.immortality ? { ...state, graftPair: null } : state
    default:
      return state
  }
}

const RECLAIMED_FORCES_NAME = 'Reclaimed Forces'

/**
 * Immortality — acquire a card from the Tleilaxu Row using specimens. Reclaimed
 * Forces is a permanent reserve (acquiring it copies it to the discard pile but
 * never empties a row slot); other cards leave a slot that the user refills via
 * SET_TLEILAXU_ROW (no shuffle).
 */
function handleAcquireTleilaxu(
  state: GameState,
  playerId: number,
  cardId: number,
  freeAcquire?: boolean
): GameState {
  if (!state.expansions?.immortality) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const row = state.tleilaxuRow ?? []
  let rowIndex = row.findIndex(c => c.id === cardId)
  let card = rowIndex >= 0 ? row[rowIndex] : undefined
  if (!card) {
    const reserve = buildTleilaxuPool().find(
      c => c.id === cardId && c.name === RECLAIMED_FORCES_NAME
    )
    if (reserve) {
      card = reserve
      rowIndex = -1
    }
  }
  if (!card) return state

  const cost = freeAcquire ? 0 : card.cost ?? 0
  if (!freeAcquire && (player.specimens ?? 0) < cost) return state

  const isReclaimedForces = card.name === RECLAIMED_FORCES_NAME
  const gains: Gain[] = [
    ...state.gains,
    { round: state.currentRound, playerId, sourceId: card.id, name: card.name, amount: 1, type: RewardType.CARD, source: GainSource.CARD },
  ]
  if (cost) {
    gains.push({ round: state.currentRound, playerId, sourceId: card.id, name: `${card.name} Acquire`, amount: -cost, type: RewardType.SPECIMEN, source: GainSource.CARD })
  }

  const updatedPlayer: Player = {
    ...player,
    specimens: Math.max(0, (player.specimens ?? 0) - cost),
    discardPile: [...player.discardPile, { ...card }],
  }

  let nextRow = row
  let pendingTleilaxuRowReplacement = state.pendingTleilaxuRowReplacement ?? null
  if (!isReclaimedForces) {
    nextRow = row.filter((_, i) => i !== rowIndex)
    pendingTleilaxuRowReplacement = { cardIndex: rowIndex }
  }

  return {
    ...state,
    gains,
    players: state.players.map(p => (p.id === playerId ? updatedPlayer : p)),
    tleilaxuRow: nextRow,
    pendingTleilaxuRowReplacement,
  }
}

/** Immortality — set the purchasable Tleilaxu Row (setup pick or post-acquire refill). */
function handleSetTleilaxuRow(state: GameState, cardIds: number[]): GameState {
  if (!state.expansions?.immortality) return state
  const pool = [...(state.tleilaxuRow ?? []), ...(state.tleilaxuRowDeck ?? [])]
  const chosen = cardIds
    .map(id => pool.find(c => c.id === id))
    .filter((c): c is Card => Boolean(c))
  const chosenIds = new Set(chosen.map(c => c.id))
  return {
    ...state,
    tleilaxuRow: chosen,
    tleilaxuRowDeck: pool.filter(c => !chosenIds.has(c.id)),
    pendingTleilaxuRowReplacement: null,
  }
}

/**
 * Immortality — Family Atomics (once per game): refresh the Imperium Row only.
 * Current row cards return to the deck pool and the user re-picks 5 via the
 * existing Imperium Row selection flow.
 */
function handleUseFamilyAtomics(state: GameState, playerId: number): GameState {
  if (!state.expansions?.immortality) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player || player.familyAtomicsUsed) return state

  return {
    ...state,
    players: state.players.map(p => (p.id === playerId ? { ...p, familyAtomicsUsed: true } : p)),
    imperiumRowDeck: [...state.imperiumRow, ...state.imperiumRowDeck],
    imperiumRow: [],
    pendingImperiumRowReplacement: null,
  }
}

/** Record imperium / reserve acquisitions for turn history and reveal stats (matches ACQUIRE_CARD). */
function appendCardAcquisitionTracking(
  state: GameState,
  playerId: number,
  card: Card,
  gains: Gain[]
): { gains: Gain[]; currTurn: GameTurn | null | undefined } {
  const nextGains: Gain[] = [
    ...gains,
    {
      round: state.currentRound,
      playerId,
      sourceId: card.id,
      name: card.name,
      amount: 1,
      type: RewardType.CARD,
      source: GainSource.CARD,
    },
  ]
  const currTurn =
    state.currTurn?.playerId === playerId
      ? {
          ...state.currTurn,
          acquiredCards: [...(state.currTurn.acquiredCards ?? []), card],
        }
      : state.currTurn
  return { gains: nextGains, currTurn }
}

function copyCurrTurnForHistory(currTurn: GameTurn | null | undefined): GameTurn | null {
  if (!currTurn) return null
  return {
    ...currTurn,
    gainedEffects: currTurn.gainedEffects ? [...currTurn.gainedEffects] : undefined,
    acquiredCards: currTurn.acquiredCards ? currTurn.acquiredCards.map(c => ({ ...c })) : undefined,
    acquiredTechTiles: currTurn.acquiredTechTiles
      ? currTurn.acquiredTechTiles.map(t => ({ ...t }))
      : undefined,
    revealedCardIds: currTurn.revealedCardIds ? [...currTurn.revealedCardIds] : undefined,
    playedIntrigueCard: currTurn.playedIntrigueCard
      ? currTurn.playedIntrigueCard.map(p => ({ ...p }))
      : undefined,
    optionalEffects: currTurn.optionalEffects ? [...currTurn.optionalEffects] : undefined,
    pendingChoices: currTurn.pendingChoices ? [...currTurn.pendingChoices] : undefined,
    opponentDiscardState: currTurn.opponentDiscardState
      ? {
          ...currTurn.opponentDiscardState,
          remainingOpponents: [...currTurn.opponentDiscardState.remainingOpponents],
          discardCounts: currTurn.opponentDiscardState.discardCounts
            ? { ...currTurn.opponentDiscardState.discardCounts }
            : undefined,
        }
      : undefined,
  }
}

/** History snapshots store only this turn's gains with gainsStartIndex 0. */
function snapshotStateForHistory(state: GameState): GameState {
  const copy = deepCopyGameState(state)
  if (!copy.currTurn) return copy
  const start = copy.currTurn.gainsStartIndex ?? 0
  const turnGains = (copy.gains ?? []).slice(start)
  return {
    ...copy,
    gains: turnGains,
    currTurn: {
      ...copy.currTurn,
      gainsStartIndex: 0,
    },
  }
}

// Helper function to create a deep copy of GameState for history
function deepCopyGameState(state: GameState): GameState {
  return {
    ...state,
    expansions: normalizeExpansions(state.expansions),
    currTurn: copyCurrTurnForHistory(state.currTurn),
    highCouncilSeatOrder: [...(state.highCouncilSeatOrder ?? [])],
    // Deep copy arrays
    players: state.players.map(p => ({
      ...p,
      deck: [...p.deck],
      discardPile: [...p.discardPile],
      trash: [...p.trash],
      playArea: [...p.playArea],
      dreadnoughts: p.dreadnoughts
        ? {
            ...p.dreadnoughts,
            control: p.dreadnoughts.control.map(entry => ({ ...entry })),
          }
        : undefined,
      tech: p.tech ? p.tech.map(t => ({ ...t })) : p.tech,
    })),
    imperiumRow: [...state.imperiumRow],
    imperiumRowDeck: [...state.imperiumRowDeck],
    spiceMustFlowDeck: [...state.spiceMustFlowDeck],
    arrakisLiaisonDeck: [...state.arrakisLiaisonDeck],
    foldspaceDeck: [...state.foldspaceDeck],
    intrigueDeck: [...state.intrigueDeck],
    intrigueDiscard: [...state.intrigueDiscard],
    conflictsDiscard: [...state.conflictsDiscard],
    gains: [...state.gains],
    pendingRewards: [...state.pendingRewards],
    // Deep copy Sets
    combatPasses: new Set(state.combatPasses),
    endgameDonePlayers: new Set(state.endgameDonePlayers),
    endgameRevealDonePlayers: new Set(state.endgameRevealDonePlayers ?? []),
    // Deep copy objects
    factionInfluence: {
      [FactionType.EMPEROR]: { ...state.factionInfluence[FactionType.EMPEROR] },
      [FactionType.SPACING_GUILD]: { ...state.factionInfluence[FactionType.SPACING_GUILD] },
      [FactionType.BENE_GESSERIT]: { ...state.factionInfluence[FactionType.BENE_GESSERIT] },
      [FactionType.FREMEN]: { ...state.factionInfluence[FactionType.FREMEN] }
    },
    combatStrength: { ...state.combatStrength },
    combatTroops: { ...state.combatTroops },
    combatNegotiators: { ...(state.combatNegotiators ?? {}) },
    occupiedSpaces: Object.fromEntries(
      Object.entries(state.occupiedSpaces).map(([key, spaces]) => [key, [...spaces]])
    ),
    playArea: Object.fromEntries(
      Object.entries(state.playArea).map(([key, cards]) => [key, [...cards]])
    ),
    scheduledIntrigueOnReveal: Object.fromEntries(
      Object.entries(state.scheduledIntrigueOnReveal).map(([key, effects]) => [key, [...effects]])
    ),
    activeIntrigueThisRound: Object.fromEntries(
      Object.entries(state.activeIntrigueThisRound).map(([key, cards]) => [key, [...cards]])
    ),
    acquireToTopThisRound: { ...state.acquireToTopThisRound },
    endgameTiebreakerSpice: { ...state.endgameTiebreakerSpice },
    endgameRevealedIntrigue: state.endgameRevealedIntrigue
      ? Object.fromEntries(
          Object.entries(state.endgameRevealedIntrigue).map(([key, cards]) => [key, [...cards]])
        )
      : undefined,
    endgameApplyQueue: state.endgameApplyQueue ? [...state.endgameApplyQueue] : undefined,
    bonusSpice: { ...state.bonusSpice },
    controlMarkers: { ...state.controlMarkers },
    dreadnoughtCover: state.dreadnoughtCover
      ? { ...state.dreadnoughtCover }
      : undefined,
    blockedSpaces: state.blockedSpaces ? [...state.blockedSpaces] : [],
    pendingImperiumRowReplacement: state.pendingImperiumRowReplacement ? { ...state.pendingImperiumRowReplacement } : null,
    helenaRemovedCard: state.helenaRemovedCard ? { ...state.helenaRemovedCard, card: state.helenaRemovedCard.card } : null,
    ixBoard: state.ixBoard
      ? {
          stacks: state.ixBoard.stacks.map(stack => [...stack]),
          nextFaceUpRevealed: { ...state.ixBoard.nextFaceUpRevealed },
        }
      : undefined,
    pendingAcquireTech: state.pendingAcquireTech ? { ...state.pendingAcquireTech } : null,
    setupBaseline: state.setupBaseline
      ? deepCopyGameState({ ...state.setupBaseline, history: [], setupBaseline: undefined })
      : undefined,
    // History should be empty for the initial state snapshot
    history: []
  }
}

interface GameProviderProps {
  /** Event-sourced game input: setup + optional pre-recorded events. */
  gameInput: SaveDoc
  children: React.ReactNode
}

export const GameProvider: React.FC<GameProviderProps> = ({ gameInput, children }) => {
  const initialEvents = JSON.parse(JSON.stringify(gameInput.events)) as EventEntry[]
  const initialStateWithHistory = buildInitialStateFromSaveDoc(gameInput)

  const [gameState, setGameState] = useState<GameState>(initialStateWithHistory)

  const recordedEventsRef = useRef<EventEntry[]>(initialEvents)
  const setupRef = useRef<{ setup: SetupBlock; unmapped: string[] }>({
    setup: gameInput.setup,
    unmapped: gameInput.meta.notes?.includes('Unmapped')
      ? gameInput.meta.notes.replace(/^Unmapped catalog entries:\s*/, '').split(', ')
      : [],
  })
  const metaRef = useRef(gameInput.meta)

  const recordingDispatch = useCallback(
    (action: GameAction) => {
      setGameState(prev => {
        if (action.type === 'UNDO_TO_TURN') {
          const eventIndex = historyIndexToEventIndex(
            gameInput.setup,
            recordedEventsRef.current,
            action.turnIndex
          )
          recordedEventsRef.current = recordedEventsRef.current.slice(
            0,
            Math.max(0, eventIndex + 1)
          )
          const next = gameReducer(prev, action)
          if (next.sandboxSetup) {
            recordedEventsRef.current = recordedEventsRef.current.filter(
              e => e.a.type !== 'SANDBOX_COMMIT_SETUP'
            )
            return { ...next, setupBaseline: prev.setupBaseline }
          }
          const { state } = replayEvents(
            buildInitialState(gameInput.setup),
            recordedEventsRef.current
          )
          const history = buildHistoryFromEvents(gameInput.setup, recordedEventsRef.current)
          return { ...state, setupBaseline: prev.setupBaseline, history }
        }

        if (action.type === 'UNDO_TO_SETUP') {
          recordedEventsRef.current = prev.setupBaseline?.sandboxSetup
            ? truncateSandboxEventsForSetupReedit(recordedEventsRef.current)
            : []
          const next = gameReducer(prev, action)
          return { ...next, setupBaseline: prev.setupBaseline }
        }

        const next = gameReducer(prev, action)

        if (next.currentConflict?.id && next.currentConflict.id > 0) {
          setupRef.current = {
            ...setupRef.current,
            setup: {
              ...setupRef.current.setup,
              initialConflictId: next.currentConflict.id,
            },
          }
        }

        const lastEvent = recordedEventsRef.current[recordedEventsRef.current.length - 1]
        if (isReplayable(action) && shouldRecordEvent(prev, next, action, lastEvent)) {
          assertJsonSerializable(action, action.type)
          const entry: EventEntry = {
            a: JSON.parse(JSON.stringify(action)) as GameAction,
          }
          if (action.type === 'END_TURN') {
            entry.ck = { [`p${action.playerId}`]: computeChecksum(next, action.playerId) }
          }
          recordedEventsRef.current = [...recordedEventsRef.current, entry]
        }

        // Sandbox setup rows are maintained by the reducer (withSandboxSetupHistory);
        // event replay only snapshots on SANDBOX_COMMIT_SETUP and would drop in-progress edits.
        if (SANDBOX_SETUP_HISTORY_ACTIONS.has(action.type)) {
          return { ...next, history: next.history }
        }

        let history = buildHistoryFromEvents(gameInput.setup, recordedEventsRef.current)
        // Prefer the live pre-END_TURN snapshot so turn gains match what the player saw
        // (event replay can miss optional PAY_COST / influence VP rows when ids diverge).
        if (
          action.type === 'END_TURN' &&
          next !== prev &&
          prev.currTurn &&
          history.length > 0
        ) {
          const last = history[history.length - 1]
          const kind = last.historyEntryKind
          const isPlayerTurnRow =
            last.currTurn != null &&
            kind !== 'setup' &&
            kind !== 'round-start' &&
            kind !== 'combat' &&
            kind !== 'endgame'
          if (isPlayerTurnRow) {
            history = [...history.slice(0, -1), snapshotStateForHistory(prev)]
          }
        }
        // Prefer reducer-built combat snapshot (has strengths/gains before transition cleared them).
        if (
          (action.type === 'RESOLVE_COMBAT' || action.type === 'RESOLVE_CONFLICT_REWARD_CHOICE') &&
          next !== prev
        ) {
          const wasCombatRewards =
            prev.phase === GamePhase.COMBAT_REWARDS || prev.combatResolutionDeferred != null
          const stillDeferred =
            (next.pendingConflictRewardChoices?.length ?? 0) > 0 || next.combatResolutionDeferred != null
          if (wasCombatRewards && !stillDeferred) {
            let liveCombat: GameState | undefined
            for (let i = next.history.length - 1; i >= 0; i--) {
              if (next.history[i].historyEntryKind === 'combat') {
                liveCombat = next.history[i]
                break
              }
            }
            if (liveCombat) {
              history = [...history.filter(h => h.historyEntryKind !== 'combat'), liveCombat]
            }
          }
        }
        return { ...next, history }
      })
    },
    [gameInput.setup]
  )

  const exportSaveDoc = useCallback((meta?: { id?: string; title?: string }): SaveDoc => {
    const now = new Date().toISOString()
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      meta: {
        ...metaRef.current,
        ...(meta?.id ? { id: meta.id } : {}),
        ...(meta?.title ? { title: meta.title } : {}),
        updatedAt: now,
      },
      setup: JSON.parse(JSON.stringify(setupRef.current.setup)),
      events: JSON.parse(JSON.stringify(recordedEventsRef.current)) as EventEntry[],
      branches: JSON.parse(JSON.stringify(gameInput.branches)),
      cursor: {
        branch: gameInput.cursor.branch,
        event: recordedEventsRef.current.length,
      },
    }
  }, [gameInput.branches, gameInput.cursor.branch])

  const getRecordedEventCount = useCallback(() => recordedEventsRef.current.length, [])

  const handleUndoToTurn = useCallback(
    (turnIndex: number) => {
      recordingDispatch({ type: 'UNDO_TO_TURN', turnIndex })
    },
    [recordingDispatch]
  )

  const value = {
    gameState,
    currentConflict: gameState.currentConflict,
    imperiumRow: gameState.imperiumRow,
    intrigueDeck: gameState.intrigueDeck,
    dispatch: recordingDispatch,
    exportSaveDoc,
    getRecordedEventCount
  }

  return (
    <GameContext.Provider value={value}>
      <TimeTravelProvider gameState={gameState} onUndoToTurn={handleUndoToTurn}>
        {children}
      </TimeTravelProvider>
    </GameContext.Provider>
  )
}

/** Isolated default state for unit tests (deep copy). */
export function getFreshDefaultGameState(): GameState {
  return deepCopyGameState(initialGameState)
}

/** Run one reducer step (unit tests). */
export function applyGameAction(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action)
}

function getEffectChoice(currPlayer: Player, card: Card, effect: PlayEffect, existingChoiceIds: Iterable<string> = []): CardSelectChoice | FixedOptionsChoice {
  const choiceId = nextSemanticId({ type: GainSource.CARD, id: card.id }, 'OR', existingChoiceIds);
  
  // Handle trash cost - requires card selection
  if(effect.cost?.trash) {
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: 'Choose a card to trash',
      piles: [CardPile.HAND, CardPile.DISCARD],
      selectionCount: 1,
      onResolve: (cardIds: number[]) => {
        const cardSource: GainAttribution = { type: GainSource.CARD, id: card.id, name: card.name }
        return {
          type: 'TRASH_CARD',
          playerId: currPlayer.id,
          cardId: cardIds[0],
          gainReward: effect.reward,
          source: cardSource,
        }
      },
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  
  // Handle trash reward - requires card selection
  if(effect.reward.trash) {
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: 'Choose a card to trash',
      piles: [CardPile.HAND, CardPile.DISCARD],
      selectionCount: 1,
      onResolve: (cardIds: number[]) => ({ 
        type: 'TRASH_CARD',
        playerId: currPlayer.id,
        cardId: cardIds[0]
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  
  // Handle custom effects that need card selection
  if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
    const hasValidCard = currPlayer.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT))
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: PLAY_EFFECT_TEXTS[CustomEffect.OTHER_MEMORY] || CustomEffect.OTHER_MEMORY,
      piles: [CardPile.DISCARD],
      filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
      selectionCount: 1,
      disabled: !hasValidCard,
      onResolve: (cardIds: number[]) => {
        const cardSource: GainAttribution = { type: GainSource.CARD, id: card.id, name: card.name }
        return {
          type: 'CUSTOM_EFFECT',
          playerId: currPlayer.id,
          customEffect: CustomEffect.OTHER_MEMORY,
          data: { cardId: cardIds[0], gainSource: cardSource },
        }
      },
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  
  // For all other cases (regular OR choices), create fixed options choice
  // This shouldn't happen for single effects, only for OR choices
  const options = [{cost: effect.cost, reward: effect.reward}]
  return {
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Choose one reward',
    options,
    source: { type: GainSource.CARD, id: card.id, name: card.name }
  };
}

// Helper function to create CardSelectChoice for Imperium Row acquisition
function createImperiumRowAcquireChoice(
  playerId: number,
  limit: number,
  acquireToTop: boolean,
  intrigueCard: IntrigueCard,
  imperiumRow: Card[],
  existingChoiceIds: Iterable<string> = []
): CardSelectChoice {
  const choiceId = nextSemanticId({ type: GainSource.INTRIGUE, id: intrigueCard.id }, 'ACQUIRE', existingChoiceIds)
  
  // Filter cards by cost limit - show all cards but disable those above limit
  const availableCards = imperiumRow.filter(card => (card.cost || 0) <= limit)
  
  return {
    id: choiceId,
    type: ChoiceType.CARD_SELECT,
    prompt: `Choose a card from Imperium Row (cost ${limit} or less)`,
    piles: [], // We'll pass cards directly via cards prop
    cards: imperiumRow, // Pass Imperium Row cards directly
    filter: (c: Card) => {
      // Filter to only show cards within limit
      const cost = c.cost || 0
      return cost <= limit
    },
    selectionCount: 1,
    disabled: availableCards.length === 0,
    onResolve: (cardIds: number[]) => {
      // Pass acquireToTop directly to ACQUIRE_CARD action for single-card acquisition
      // This ensures it only applies to this specific card, not all cards for the round
      return {
        type: 'ACQUIRE_CARD',
        playerId,
        cardId: cardIds[0],
        freeAcquire: true,
        acquireToTop: acquireToTop
      } as GameAction
    },
    source: { type: GainSource.INTRIGUE, id: intrigueCard.id, name: intrigueCard.name }
  }
}

export {
  deepCopyGameState,
  snapshotStateForHistory,
  snapshotCombatResolutionForHistory,
  snapshotEndgameForHistory,
  completeCombatTransition,
}
