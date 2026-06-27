import { BOARD_SPACES } from '../catalog/runtime'
import { dreadnoughtStrengthEach } from '../data/leaderAbilities/rhomburDreadnoughtStrength'
import { computeStrength } from './combatStrength'
import {
  ChoiceType,
  ControlMarkerType,
  CustomEffect,
  Gain,
  GainSource,
  GameState,
  RewardType,
  type PendingChoice,
} from '../types/GameTypes'

type GainAttribution = { type: import('../types/GameTypes').GainSource; id: number; name: string }
import {
  DEFAULT_DREADNOUGHTS,
  getCommissionableCount,
  type PlayerDreadnoughts,
} from './dreadnoughts'
import { getRemainingGeneralDeploySlots } from './troops'

const CONTROL_SPACES: ControlMarkerType[] = [
  ControlMarkerType.ARRAKIN,
  ControlMarkerType.CARTHAG,
  ControlMarkerType.IMPERIAL_BASIN,
]

export function ensureDreadnoughtCover(
  state: GameState
): Record<ControlMarkerType, number | null> {
  return {
    [ControlMarkerType.ARRAKIN]:
      state.dreadnoughtCover?.[ControlMarkerType.ARRAKIN] ?? null,
    [ControlMarkerType.CARTHAG]:
      state.dreadnoughtCover?.[ControlMarkerType.CARTHAG] ?? null,
    [ControlMarkerType.IMPERIAL_BASIN]:
      state.dreadnoughtCover?.[ControlMarkerType.IMPERIAL_BASIN] ?? null,
  }
}

function cloneDreadnoughts(d: PlayerDreadnoughts): PlayerDreadnoughts {
  return {
    ...d,
    control: d.control.map(entry => ({ ...entry })),
  }
}

function withPlayerDreadnoughts(
  state: GameState,
  playerId: number,
  updater: (d: PlayerDreadnoughts) => PlayerDreadnoughts
): GameState {
  return {
    ...state,
    players: state.players.map(p => {
      if (p.id !== playerId || !p.dreadnoughts) return p
      return { ...p, dreadnoughts: updater(cloneDreadnoughts(p.dreadnoughts)) }
    }),
  }
}

export function syncCombatStrengthForPlayer(state: GameState, playerId: number): GameState {
  const strength = computeStrength(state, playerId)
  const nextStrength = { ...state.combatStrength }
  if (strength <= 0) {
    delete nextStrength[playerId]
  } else {
    nextStrength[playerId] = strength
  }
  return {
    ...state,
    combatStrength: nextStrength,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, combatValue: strength > 0 ? strength : 0 } : p
    ),
  }
}

export function getRemainingDeploySlots(state: GameState): number {
  return getRemainingGeneralDeploySlots(state)
}

export function isAgentTurnOnCombatSpace(state: GameState): boolean {
  const spaceId = state.currTurn?.agentSpaceId
  if (spaceId == null) return false
  const space = BOARD_SPACES.find(s => s.id === spaceId)
  return Boolean(space?.conflictMarker)
}

export function applyDreadnoughtCommission(
  state: GameState,
  playerId: number,
  requested: number,
  toConflict: boolean,
  source: GainAttribution,
  appendGains: Gain[]
): GameState | null {
  if (state.expansions?.riseOfIx !== true) return null
  const player = state.players.find(p => p.id === playerId)
  if (!player?.dreadnoughts) return null

  const count = getCommissionableCount(player, requested)
  if (count <= 0) return null

  let next = withPlayerDreadnoughts(state, playerId, d => {
    const updated = cloneDreadnoughts(d)
    updated.supply -= count
    if (toConflict) {
      updated.conflict += count
    } else {
      updated.garrison += count
    }
    return updated
  })

  appendGains.push({
    round: state.currentRound,
    playerId,
    source: source.type,
    sourceId: source.id,
    name: toConflict ? `${source.name} (Conflict)` : source.name,
    amount: count,
    type: RewardType.DREADNOUGHT,
  })

  if (toConflict) {
    next = syncCombatStrengthForPlayer(next, playerId)
  }

  return next
}

export function queueDreadnoughtCommissionChoices(
  state: GameState,
  playerId: number,
  requested: number,
  source: GainAttribution,
  existingChoiceIds: string[]
): PendingChoice[] {
  const player = state.players.find(p => p.id === playerId)
  const count = player ? getCommissionableCount(player, requested) : 0
  if (count <= 0) return []

  const choices: PendingChoice[] = []
  for (let i = 0; i < count; i++) {
    const id = `dreadnought-target-${source.type}-${source.id}-${i}-${existingChoiceIds.length + choices.length}`
    choices.push({
      id,
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Commission dreadnought:',
      options: [
        {
          reward: { custom: CustomEffect.COMMISSION_DREADNOUGHT, dreadnoughts: 1 },
          costLabel: 'Garrison',
        },
        {
          reward: {
            custom: CustomEffect.COMMISSION_DREADNOUGHT,
            dreadnoughts: 1,
            dreadnoughtToConflict: true,
          },
          costLabel: 'Deploy to Conflict',
        },
      ],
      source,
    })
  }
  return choices
}

/** Sandbox setup — place or clear a temporary dreadnought on a control space. */
export function applySandboxDreadnoughtControl(
  state: GameState,
  space: ControlMarkerType,
  playerId: number | null
): GameState {
  if (state.expansions?.riseOfIx !== true) return state
  if (playerId !== null && !state.players.some(p => p.id === playerId)) return state

  const placedRound = state.sandboxSetupPosition?.round ?? state.currentRound
  let next: GameState = {
    ...state,
    dreadnoughtCover: ensureDreadnoughtCover(state),
    players: state.players.map(p =>
      p.dreadnoughts
        ? {
            ...p,
            dreadnoughts: {
              ...p.dreadnoughts,
              control: p.dreadnoughts.control.map(entry => ({ ...entry })),
            },
          }
        : p
    ),
  }

  const clearSpace = (ownerId: number) => {
    next = withPlayerDreadnoughts(next, ownerId, d => {
      const updated = cloneDreadnoughts(d)
      const removed = updated.control.filter(entry => entry.space === space).length
      updated.control = updated.control.filter(entry => entry.space !== space)
      updated.garrison += removed
      return updated
    })
    const cover = ensureDreadnoughtCover(next)
    next = { ...next, dreadnoughtCover: { ...cover, [space]: null } }
  }

  const previousOwnerId = next.dreadnoughtCover?.[space] ?? null
  if (previousOwnerId != null) {
    clearSpace(previousOwnerId)
  }

  if (playerId === null) return next

  if (!next.players.find(p => p.id === playerId)?.dreadnoughts) {
    next = {
      ...next,
      players: next.players.map(p =>
        p.id === playerId ? { ...p, dreadnoughts: { ...DEFAULT_DREADNOUGHTS, control: [] } } : p
      ),
    }
  }

  next = withPlayerDreadnoughts(next, playerId, d => {
    const updated = cloneDreadnoughts(d)
    if (updated.garrison > 0) {
      updated.garrison -= 1
    } else if (updated.supply > 0) {
      updated.supply -= 1
    }
    updated.control.push({ space, placedRound })
    return updated
  })

  const cover = ensureDreadnoughtCover(next)
  return { ...next, dreadnoughtCover: { ...cover, [space]: playerId } }
}

export function returnExpiredDreadnoughtControls(state: GameState): GameState {
  if (state.expansions?.riseOfIx !== true) return state

  let next: GameState = { ...state, dreadnoughtCover: ensureDreadnoughtCover(state) }
  const round = state.currentRound

  for (const player of state.players) {
    const d = player.dreadnoughts
    if (!d?.control.length) continue

    const expired = d.control.filter(entry => entry.placedRound < round)
    if (expired.length === 0) continue

    const expiredSpaces = new Set(expired.map(e => e.space))
    next = withPlayerDreadnoughts(next, player.id, current => {
      const updated = cloneDreadnoughts(current)
      updated.garrison += expired.length
      updated.control = updated.control.filter(entry => entry.placedRound >= round)
      return updated
    })

    for (const space of expiredSpaces) {
      if (next.dreadnoughtCover?.[space] === player.id) {
        const cover = ensureDreadnoughtCover(next)
        next = {
          ...next,
          dreadnoughtCover: { ...cover, [space]: null },
        }
      }
    }
  }

  return next
}

export function resolveNonWinnerDreadnoughts(
  state: GameState,
  winnerIds: number[]
): GameState {
  if (state.expansions?.riseOfIx !== true) return state
  const winners = new Set(winnerIds)
  let next = state

  for (const player of state.players) {
    if (winners.has(player.id)) continue
    const conflict = player.dreadnoughts?.conflict ?? 0
    if (conflict <= 0) continue

    next = withPlayerDreadnoughts(next, player.id, d => {
      const updated = cloneDreadnoughts(d)
      updated.garrison += updated.conflict
      updated.conflict = 0
      return updated
    })
    next = syncCombatStrengthForPlayer(next, player.id)
  }

  return next
}

export function buildDreadnoughtControlChoices(
  state: GameState,
  winnerId: number,
  conflictId: number,
  conflictName: string,
  existingIds: string[]
): NonNullable<GameState['pendingConflictRewardChoices']> {
  const player = state.players.find(p => p.id === winnerId)
  if (!player?.dreadnoughts?.conflict) return []

  const occupiedSpaces = new Set<ControlMarkerType>()
  const cover = ensureDreadnoughtCover(state)
  for (const space of CONTROL_SPACES) {
    if (cover[space] != null) occupiedSpaces.add(space)
  }
  for (const p of state.players) {
    for (const entry of p.dreadnoughts?.control ?? []) {
      occupiedSpaces.add(entry.space)
    }
  }
  const availableSpaces = CONTROL_SPACES.filter(space => !occupiedSpaces.has(space))
  if (availableSpaces.length === 0) return []

  const labelFor = (space: ControlMarkerType) => {
    switch (space) {
      case ControlMarkerType.ARRAKIN:
        return 'Arrakeen'
      case ControlMarkerType.CARTHAG:
        return 'Carthag'
      case ControlMarkerType.IMPERIAL_BASIN:
        return 'Imperial Basin'
    }
  }

  const id = `dreadnought-control-${conflictId}-${winnerId}`
  if (existingIds.includes(id)) return []

  return [
    {
      id,
      playerId: winnerId,
      placement: '1st place (dreadnought)',
      conflictId,
      conflictName,
      options: availableSpaces.map(space => ({
        reward: {
          custom: CustomEffect.DREADNOUGHT_CONTROL,
          dreadnoughtControlSpace: space,
        },
        rewardLabel: `Place dreadnought on ${labelFor(space)}`,
      })),
    },
  ]
}

export function applyDreadnoughtControlPlacement(
  state: GameState,
  playerId: number,
  space: ControlMarkerType,
  sourceName: string
): GameState {
  let next: GameState = { ...state, gains: [...state.gains], dreadnoughtCover: ensureDreadnoughtCover(state) }
  const player = next.players.find(p => p.id === playerId)
  if (!player?.dreadnoughts?.conflict) return state

  next = withPlayerDreadnoughts(next, playerId, d => {
    const updated = cloneDreadnoughts(d)
    updated.control.push({ space, placedRound: state.currentRound })
    updated.conflict -= 1
    const extra = updated.conflict
    if (extra > 0) {
      updated.garrison += extra
      updated.conflict = 0
    }
    return updated
  })

  const cover = ensureDreadnoughtCover(next)
  next = { ...next, dreadnoughtCover: { ...cover, [space]: playerId } }

  next.gains.push({
    round: state.currentRound,
    playerId,
    source: GainSource.CONFLICT,
    sourceId: state.currentConflict?.id ?? 0,
    name: `${sourceName} — ${space}`,
    amount: 1,
    type: RewardType.DREADNOUGHT,
  })

  return syncCombatStrengthForPlayer(next, playerId)
}

export function adjustDreadnoughtConflictStrength(
  state: GameState,
  playerId: number,
  deltaUnits: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  const each = dreadnoughtStrengthEach(player.leader)
  const delta = deltaUnits * each
  const nextVal = Math.max(0, (player.combatValue || 0) + delta)
  const next = {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, combatValue: nextVal } : p
    ),
    combatStrength: { ...state.combatStrength },
  }
  if (nextVal <= 0) {
    delete next.combatStrength[playerId]
  } else {
    next.combatStrength[playerId] = nextVal
  }
  return next
}

export function handleDreadnoughtReward(
  state: GameState,
  playerId: number,
  count: number,
  source: GainAttribution,
  /** When commissioning during PLACE_AGENT, the target space may not be on currTurn yet. */
  placementSpaceId?: number
): GameState {
  if (state.expansions?.riseOfIx !== true || count <= 0) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player?.dreadnoughts) return state
  if (getCommissionableCount(player, count) <= 0) return state

  const onCombatSpace =
    placementSpaceId != null
      ? Boolean(BOARD_SPACES.find(s => s.id === placementSpaceId)?.conflictMarker)
      : isAgentTurnOnCombatSpace(state)

  if (onCombatSpace) {
    const existingIds = (state.currTurn?.pendingChoices ?? []).map(c => c.id)
    const choices = queueDreadnoughtCommissionChoices(state, playerId, count, source, existingIds)
    if (choices.length === 0) return state
    return {
      ...state,
      currTurn: state.currTurn
        ? {
            ...state.currTurn,
            pendingChoices: [...(state.currTurn.pendingChoices ?? []), ...choices],
          }
        : state.currTurn,
      canEndTurn: false,
    }
  }

  const gains: Gain[] = [...state.gains]
  const commissioned = applyDreadnoughtCommission(state, playerId, count, false, source, gains)
  if (!commissioned) return state
  return { ...commissioned, gains }
}

export function resolveCommissionDreadnoughtChoice(
  state: GameState,
  playerId: number,
  reward: { dreadnoughts?: number; dreadnoughtToConflict?: boolean },
  source: GainAttribution
): GameState {
  const count = reward.dreadnoughts ?? 1
  const toConflict = Boolean(reward.dreadnoughtToConflict)
  const gains: Gain[] = [...state.gains]
  const next = applyDreadnoughtCommission(state, playerId, count, toConflict, source, gains)
  if (!next) return state
  return { ...next, gains }
}
