import {
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  GameState,
  Leader,
  PendingChoice,
  Player,
  GainSource,
  RewardType,
  type Gain,
} from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { nextSemanticId } from '../../utils/semanticIds'
import {
  applyFourthInfluenceBonusReward,
  updateFactionInfluence,
  type InfluenceMilestoneMeta,
} from '../../utils/influenceVictoryPoints'

const ALL_FACTIONS = Object.values(FactionType) as FactionType[]

/**
 * Careful Observation — game start places one snooper at 2 Influence on each track.
 * Steps are influence values 1–6 (0 = bottom of track). Tune with ?markerDebug=1.
 */
export const TESSIA_SNOOPER_START_INFLUENCE = 2

export const TESSIA_SNOOPER_START_STEPS: Record<FactionType, number> = Object.fromEntries(
  ALL_FACTIONS.map(faction => [faction, TESSIA_SNOOPER_START_INFLUENCE])
) as Record<FactionType, number>

/** Parked snooper slots on Tessia's leader mat (percent of leader image, top→bottom). */
export const TESSIA_PARKED_SNOOPER_SLOTS: Array<{ faction: FactionType; x: number; y: number }> = [
  { faction: FactionType.EMPEROR, x: 88, y: 28 },
  { faction: FactionType.SPACING_GUILD, x: 88, y: 42 },
  { faction: FactionType.BENE_GESSERIT, x: 88, y: 56 },
  { faction: FactionType.FREMEN, x: 88, y: 70 },
]

/**
 * Careful Observation consumed-reward snooper anchors on Tessia's leader mat (slots 1–4, top→bottom).
 * Tune with `?markerDebug=1` on the combat leader portrait.
 */
export const TESSIA_CONSUMED_REWARD_ANCHORS: Array<{ slot: number; x: number; y: number }> = [
  { slot: 1, x: 12, y: 24.5 },
  { slot: 2, x: 15, y: 39 },
  { slot: 3, x: 21, y: 54 },
  { slot: 4, x: 24, y: 70 },
]

export const SNOOPER_ICON_SRC = '/icon/snooper.png'

export function isTessiaLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.TESSIA_VERNIUS
}

export function getTessiaSnooperTrackStep(faction: FactionType): number {
  return TESSIA_SNOOPER_START_STEPS[faction]
}

/**
 * Tessia Vernius snooper token positions on influence tracks (inner %).
 * Tune with `?markerDebug=1`.
 */
export interface SnooperTokenAnchor {
  faction: FactionType
  /** Influence step (1–6) where the snooper sits on Tessia's lane. */
  step: number
}

/**
 * On-track snooper visual layout (inner %). Tune with `?markerDebug=1`.
 * Horizontal position is anchored to the left-most influence lane (lane 0), not the
 * Tessia player's column — board art for the snooper step is shared across the track.
 */
export const SNOOPER_TOKEN_LAYOUT = {
  /** Nudge from left-most lane center — keeps faction VP art on the step visible. */
  offsetX: -1.7,
  offsetY: -0.5,
  /** Token height as a fraction of one influence step (|stepY|). */
  stepHeightRatio: 0.60,
} as const

export const SNOOPER_TOKEN_ANCHORS: SnooperTokenAnchor[] = ALL_FACTIONS.map(faction => ({
  faction,
  step: getTessiaSnooperTrackStep(faction),
}))

/** Inner-board percent center for a Tessia snooper on an influence track step. */
export function snooperTokenPoint(
  faction: FactionType,
  tracks: Record<
    FactionType,
    { laneCenterX: [number, number, number, number]; baselineY: number; stepY: number }
  >
): { x: number; y: number } {
  const track = tracks[faction]
  const step = getTessiaSnooperTrackStep(faction)
  const leftmostLaneX = track.laneCenterX[0]
  const cy = track.baselineY + track.stepY * step
  return {
    x: leftmostLaneX + SNOOPER_TOKEN_LAYOUT.offsetX,
    y: cy + SNOOPER_TOKEN_LAYOUT.offsetY,
  }
}

/** Snooper token height on the board stage (inner % of board height). */
export function snooperTokenHeightPercent(
  faction: FactionType,
  tracks: Record<FactionType, { stepY: number }>
): number {
  return Math.abs(tracks[faction].stepY) * SNOOPER_TOKEN_LAYOUT.stepHeightRatio
}

/** All four faction tracks have an on-track snooper at game start (and by default). */
export const DEFAULT_TESSIA_ON_TRACK_SNOOPERS = Object.fromEntries(
  ALL_FACTIONS.map(faction => [faction, true])
) as Record<FactionType, boolean>

/** True when Tessia still has a snooper on this track (undefined counts as on-track). */
export function hasOnTrackSnooper(player: Player, faction: FactionType): boolean {
  if (!isTessiaLeader(player.leader)) return false
  return player.snoopers?.[faction] !== false
}

/** Next leader-mat reward slot (1–4). Advances when a snooper is claimed or sandbox-skipped. */
export function getTessiaNextRewardSlot(leader: Leader): number {
  return leader.tessiaSnooperRewardSlot ?? 1
}

/** True when a leader-mat reward slot was already taken or skipped (passed). */
export function isTessiaRewardSlotConsumed(leader: Leader, slot: number): boolean {
  return getTessiaNextRewardSlot(leader) > slot
}

/** Sandbox: removing an on-track snooper consumes the next reward slot without granting it. */
export function skipTessiaRewardSlot(leader: Leader): Leader {
  return { ...leader, tessiaSnooperRewardSlot: getTessiaNextRewardSlot(leader) + 1 }
}

/**
 * Sandbox: keep leader-mat consumed slots in sync with off-track snoopers.
 * Each faction without an on-track token counts as one consumed/skipped reward slot.
 */
export function recalculateTessiaSnooperRewardSlot(leader: Leader, player: Player): Leader {
  if (!isTessiaLeader(leader)) return leader
  const offTrackCount = ALL_FACTIONS.filter(f => !hasOnTrackSnooper(player, f)).length
  return { ...leader, tessiaSnooperRewardSlot: 1 + offTrackCount }
}

function consumeTessiaRewardSlot(leader: Leader): Leader {
  return skipTessiaRewardSlot(leader)
}

const TESSIA_SNOOPER_SOURCE_IDS: Record<FactionType, number> = {
  [FactionType.EMPEROR]: 1,
  [FactionType.SPACING_GUILD]: 2,
  [FactionType.BENE_GESSERIT]: 3,
  [FactionType.FREMEN]: 4,
}

function tessiaRewardSource(faction: FactionType): { type: GainSource; id: number; name: string } {
  return {
    type: GainSource.TESSIA_SNOOPER,
    id: TESSIA_SNOOPER_SOURCE_IDS[faction],
    name: `Tessia snooper (${faction})`,
  }
}

function pushTessiaSnooperInfluenceGain(
  gains: Gain[],
  state: GameState,
  playerId: number,
  faction: FactionType,
  amount: number
): void {
  gains.push({
    playerId,
    source: GainSource.TESSIA_SNOOPER,
    sourceId: TESSIA_SNOOPER_SOURCE_IDS[faction],
    round: state.currentRound,
    name: faction,
    amount,
    type: RewardType.INFLUENCE,
  })
}

function applyTessiaInfluenceBump(
  state: GameState,
  player: Player,
  faction: FactionType,
  appendGainsTo?: Gain[]
): GameState {
  const gains = appendGainsTo ?? [...(state.gains ?? [])]
  const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
  const nextState = updateFactionInfluence(state, faction, player.id, 1, {
    appendGainsTo: gains,
    milestoneMeta,
  })
  pushTessiaSnooperInfluenceGain(gains, state, player.id, faction, 1)
  return { ...nextState, gains }
}

export interface TessiaSnooperClaimResult {
  state: GameState
  player: Player
  pendingChoices: PendingChoice[]
}

/** Game start / leader change: four on-track snoopers at 2 Influence, or clear when not Tessia. */
export function seedTessiaSnoopers(player: Player, riseOfIx: boolean): Player {
  if (!riseOfIx || !isTessiaLeader(player.leader)) {
    if (
      player.snoopers === undefined &&
      player.leader.tessiaSnoopers === undefined &&
      player.leader.tessiaSnooperRewardSlot === undefined
    ) {
      return player
    }
    const {
      tessiaSnoopers: _parked,
      tessiaSnooperRewardSlot: _slot,
      ...leaderRest
    } = player.leader
    return { ...player, snoopers: undefined, leader: leaderRest }
  }
  return {
    ...player,
    snoopers: player.snoopers ?? { ...DEFAULT_TESSIA_ON_TRACK_SNOOPERS },
    leader: {
      ...player.leader,
      tessiaSnoopers: player.leader.tessiaSnoopers ?? {},
      tessiaSnooperRewardSlot: player.leader.tessiaSnooperRewardSlot ?? 1,
    },
  }
}

export function factionsWithSnooper(player: Player): FactionType[] {
  return ALL_FACTIONS.filter(f => hasOnTrackSnooper(player, f))
}

export function buildTessiaSignetChoice(
  state: GameState,
  playerId: number,
  cardId: number,
  existingChoiceIds: Iterable<string> = []
): FixedOptionsChoice | null {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !isTessiaLeader(player.leader)) return null
  const snooperFactions = factionsWithSnooper(player)
  if (snooperFactions.length === 0) return null

  const source = { type: GainSource.CARD as const, id: cardId, name: 'Signet Ring' }
  return {
    id: nextSemanticId(source, 'SIGNET', existingChoiceIds),
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Spend 1 influence to gain 1 with a snoopered faction',
    source,
    influenceResolution: {
      payOnResolve: { influence: { chooseOne: true, amounts: ALL_FACTIONS.map(f => ({ faction: f, amount: 1 })) } },
      thenGain: {
        chooseOne: true,
        amounts: snooperFactions.map(f => ({ faction: f, amount: 1 })),
      },
    },
    options: [
      {
        reward: { influence: { chooseOne: true, amounts: snooperFactions.map(f => ({ faction: f, amount: 1 })) } },
        rewardLabel: '+1 influence (snooper faction)',
        disabled: snooperFactions.length === 0,
      },
    ],
  }
}

function shouldParkTessiaSnooper(previousInfluence: number, newInfluence: number): boolean {
  if (newInfluence < 2) return false
  // Crossed the snooper milestone (influence 2) this update.
  if (previousInfluence < 2) return true
  // Catch-up: sandbox / setup can leave influence at 2+ while the token is still on-track.
  return newInfluence > previousInfluence
}

/** Park snooper on leader mat when crossing 2 Influence with an on-track token. */
export function parkTessiaSnooperOnMilestone(
  player: Player,
  faction: FactionType,
  previousInfluence: number,
  newInfluence: number
): Player {
  if (!isTessiaLeader(player.leader)) return player
  if (!hasOnTrackSnooper(player, faction)) return player
  if (!shouldParkTessiaSnooper(previousInfluence, newInfluence)) return player

  const snoopers = {
    ...Object.fromEntries(ALL_FACTIONS.map(f => [f, hasOnTrackSnooper(player, f)])),
    [faction]: false,
  } as Record<FactionType, boolean>
  const tessiaSnoopers = { ...(player.leader.tessiaSnoopers ?? {}), [faction]: true }
  return {
    ...player,
    snoopers,
    leader: { ...player.leader, tessiaSnoopers },
  }
}

function tessiaBonusOptions(
  state: GameState,
  faction: FactionType,
  milestoneMeta: InfluenceMilestoneMeta,
  appendGainsTo?: Gain[]
) {
  const source = tessiaRewardSource(faction)
  return {
    appendGainsTo: appendGainsTo ?? [...(state.gains ?? [])],
    milestoneMeta,
    gainName: source.name,
    gainSource: source.type,
    gainSourceId: source.id,
  }
}

function applyTessiaRewardForSlot(
  state: GameState,
  player: Player,
  faction: FactionType,
  slot: number,
  existingChoiceIds: Iterable<string>,
  appendGainsTo?: Gain[]
): TessiaSnooperClaimResult {
  const source = tessiaRewardSource(faction)

  if (slot === 1) {
    return {
      state,
      player,
      pendingChoices: [
        {
          id: nextSemanticId(source, 'TESSIA-SNOOPER', existingChoiceIds),
          type: ChoiceType.FIXED_OPTIONS,
          prompt: 'Tessia snooper: discard a card to gain 1 spice?',
          source,
          options: [
            {
              rewardLabel: 'Discard 1 card → 1 spice',
              reward: { custom: CustomEffect.TESSIA_SNOOPER_DISCARD_SPICE },
              disabled: player.handCount < 1,
            },
            { rewardLabel: 'Skip', reward: {} },
          ],
        },
      ],
    }
  }

  if (slot === 2) {
    const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
    const nextState = applyFourthInfluenceBonusReward(
      state,
      player.id,
      faction,
      tessiaBonusOptions(state, faction, milestoneMeta, appendGainsTo)
    )
    return {
      state: nextState,
      player,
      pendingChoices: [],
    }
  }

  if (slot === 3) {
    return {
      state: applyTessiaInfluenceBump(state, player, faction, appendGainsTo),
      player,
      pendingChoices: [],
    }
  }

  if (slot === 4) {
    const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
    const gains = appendGainsTo ?? [...(state.gains ?? [])]
    const afterBonus = applyFourthInfluenceBonusReward(
      state,
      player.id,
      faction,
      tessiaBonusOptions(state, faction, milestoneMeta, gains)
    )
    return {
      state: applyTessiaInfluenceBump(afterBonus, player, faction, gains),
      player,
      pendingChoices: [],
    }
  }

  return { state, player, pendingChoices: [] }
}

/**
 * When Tessia crosses 2 Influence on a snoopered track: park the token and grant the
 * next leader-mat reward (slots 1–4, top to bottom on her sheet).
 */
export function tryTessiaSnooperClaim(
  state: GameState,
  player: Player,
  faction: FactionType,
  previousInfluence: number,
  newInfluence: number,
  existingChoiceIds: Iterable<string> = [],
  appendGainsTo?: Gain[]
): TessiaSnooperClaimResult | null {
  if (!state.expansions?.riseOfIx || !isTessiaLeader(player.leader)) return null

  const parked = parkTessiaSnooperOnMilestone(player, faction, previousInfluence, newInfluence)
  if (parked === player) return null

  const slot = getTessiaNextRewardSlot(parked.leader)
  const playerWithSlot = {
    ...parked,
    leader: consumeTessiaRewardSlot(parked.leader),
  }

  if (slot > 4) {
    return { state, player: playerWithSlot, pendingChoices: [] }
  }

  const rewarded = applyTessiaRewardForSlot(
    state,
    playerWithSlot,
    faction,
    slot,
    existingChoiceIds,
    appendGainsTo
  )
  const statePlayer = rewarded.state.players.find(p => p.id === playerWithSlot.id)
  const finalPlayer = statePlayer
    ? {
        ...statePlayer,
        leader: playerWithSlot.leader,
        snoopers: playerWithSlot.snoopers,
      }
    : playerWithSlot
  return {
    state: {
      ...rewarded.state,
      players: rewarded.state.players.map(p => (p.id === finalPlayer.id ? finalPlayer : p)),
    },
    player: finalPlayer,
    pendingChoices: rewarded.pendingChoices,
  }
}

/**
 * Resolve snoopers still on-track while influence is already 2+ (sandbox setup at 2, etc.).
 * Call when committing sandbox or when influence is set without a delta.
 */
export function reconcileTessiaUnclaimedSnoopers(
  state: GameState,
  existingChoiceIds: Iterable<string> = []
): { state: GameState; pendingChoices: PendingChoice[] } {
  if (!state.expansions?.riseOfIx) return { state, pendingChoices: [] }

  let nextState = state
  const pendingChoices: PendingChoice[] = []

  for (const player of state.players) {
    if (!isTessiaLeader(player.leader)) continue
    let workingPlayer = nextState.players.find(p => p.id === player.id) ?? player

    for (const faction of ALL_FACTIONS) {
      if (!hasOnTrackSnooper(workingPlayer, faction)) continue
      const influence = nextState.factionInfluence[faction]?.[workingPlayer.id] ?? 0
      if (influence < 2) continue

      const claim = tryTessiaSnooperClaim(
        nextState,
        workingPlayer,
        faction,
        1,
        influence,
        [...existingChoiceIds, ...pendingChoices.map(c => c.id)]
      )
      if (!claim) continue

      nextState = claim.state
      workingPlayer = claim.player
      pendingChoices.push(...claim.pendingChoices)
    }
  }

  return { state: nextState, pendingChoices }
}
