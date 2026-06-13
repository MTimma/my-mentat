import type { GameState, Player } from '../types/GameTypes'
import {
  FactionType,
  GainSource,
  RewardType,
  type Gain
} from '../types/GameTypes'

export const MAX_INFLUENCE = 6

const ALL_FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN
]

/**
 * Computes victory points from influence for each player.
 * - 2-influence rule: +1 VP per faction where player has >= 2 influence
 * - Alliance rule: +1 VP for player with highest influence in each faction, if that highest is >= 4
 *   (If you drop below 4, you lose it. Tiebreaker: current owner keeps it; else lowest player id.)
 */
export function computeInfluenceVictoryPoints(
  state: GameState
): Record<number, number> {
  const result: Record<number, number> = {}
  for (const p of state.players) {
    result[p.id] = 0
  }

  for (const faction of ALL_FACTIONS) {
    const influenceByPlayer = state.factionInfluence[faction] ?? {}

    // 2-influence rule: +1 VP per faction where player has >= 2
    for (const player of state.players) {
      const inf = influenceByPlayer[player.id] ?? 0
      if (inf >= 2) {
        result[player.id] = (result[player.id] ?? 0) + 1
      }
    }

    // Alliance rule: player with highest influence (>= 4) gets +1 VP
    const playerIds = state.players.map((p) => p.id)
    const influences = playerIds.map((id) => ({
      id,
      inf: influenceByPlayer[id] ?? 0
    }))
    const maxInf = Math.max(...influences.map((x) => x.inf), 0)
    if (maxInf >= 4) {
      const leaders = influences.filter((x) => x.inf === maxInf)
      const currentOwner = state.factionAlliances[faction] ?? null
      let winnerId: number
      if (currentOwner !== null && leaders.some((l) => l.id === currentOwner)) {
        winnerId = currentOwner
      } else {
        winnerId = Math.min(...leaders.map((l) => l.id))
      }
      result[winnerId] = (result[winnerId] ?? 0) + 1
    }
  }

  return result
}

/**
 * Returns total victory points for a player (base + influence-derived).
 */
export function getTotalVictoryPoints(
  player: Player,
  state: GameState
): number {
  const influenceVPs = computeInfluenceVictoryPoints(state)[player.id] ?? 0
  return player.victoryPoints + influenceVPs
}

/** One-time resource bonus when a player first reaches 4 influence on a faction track. */
export const FOURTH_INFLUENCE_MILESTONE_REWARDS: Record<
  FactionType,
  { troops?: number; solari?: number; intrigueCards?: number; water?: number }
> = {
  [FactionType.EMPEROR]: { troops: 2 },
  [FactionType.SPACING_GUILD]: { solari: 3 },
  [FactionType.BENE_GESSERIT]: { intrigueCards: 1 },
  [FactionType.FREMEN]: { water: 1 },
}

export interface InfluenceMilestoneMeta {
  troopsRecruited: number
}

export interface UpdateFactionInfluenceOptions {
  /** If provided, alliance gains are pushed here instead of creating a new gains array. Used when caller manages gains. */
  appendGainsTo?: Gain[]
  /** When provided, incremented when milestone troops are granted (for deploy-limit updates). */
  milestoneMeta?: InfluenceMilestoneMeta
}

/**
 * Merges milestone resources applied inside updateFactionInfluence into a caller's local player copy.
 */
export function mergePlayerAfterFactionInfluence(
  localPlayer: Player,
  stateAfterInfluence: GameState,
  baselinePlayer: Player
): Player {
  const statePlayer = stateAfterInfluence.players.find((p) => p.id === localPlayer.id)
  if (!statePlayer) return localPlayer

  return {
    ...localPlayer,
    troops: localPlayer.troops + (statePlayer.troops - baselinePlayer.troops),
    solari: localPlayer.solari + (statePlayer.solari - baselinePlayer.solari),
    water: localPlayer.water + (statePlayer.water - baselinePlayer.water),
    intrigueCount:
      localPlayer.intrigueCount + (statePlayer.intrigueCount - baselinePlayer.intrigueCount),
  }
}

/**
 * Updates faction influence for a player, clamps to [0, MAX_INFLUENCE],
 * recomputes factionAlliances for that faction, and pushes gains when Alliance changes hands.
 */
export function updateFactionInfluence(
  state: GameState,
  faction: FactionType,
  playerId: number,
  delta: number,
  options?: UpdateFactionInfluenceOptions
): GameState {
  const currentInfluence = state.factionInfluence[faction]?.[playerId] ?? 0
  const newInfluence = Math.max(
    0,
    Math.min(MAX_INFLUENCE, currentInfluence + delta)
  )
  if (newInfluence === currentInfluence) return state

  const prevAllianceOwner = state.factionAlliances[faction] ?? null

  const newFactionInfluence = {
    ...state.factionInfluence,
    [faction]: {
      ...state.factionInfluence[faction],
      [playerId]: newInfluence
    }
  }

  // Recompute factionAlliances for this faction
  const influenceByPlayer = newFactionInfluence[faction] ?? {}
  const playerIds = state.players.map((p) => p.id)
  const influences = playerIds.map((id) => ({
    id,
    inf: influenceByPlayer[id] ?? 0
  }))
  const maxInf = Math.max(...influences.map((x) => x.inf), 0)
  let newAllianceOwner: number | null = null
  if (maxInf >= 4) {
    const leaders = influences.filter((x) => x.inf === maxInf)
    if (prevAllianceOwner !== null && leaders.some((l) => l.id === prevAllianceOwner)) {
      newAllianceOwner = prevAllianceOwner
    } else {
      newAllianceOwner = Math.min(...leaders.map((l) => l.id))
    }
  }

  const allianceChanged =
    prevAllianceOwner !== newAllianceOwner &&
    (prevAllianceOwner !== null || newAllianceOwner !== null)

  const allianceGains: Gain[] = []
  if (allianceChanged) {
    if (prevAllianceOwner !== null) {
      allianceGains.push({
        playerId: prevAllianceOwner,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: `${faction} Alliance lost`,
        amount: -1,
        type: RewardType.VICTORY_POINTS
      })
    }
    if (newAllianceOwner !== null) {
      allianceGains.push({
        playerId: newAllianceOwner,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: `${faction} Alliance gained`,
        amount: 1,
        type: RewardType.VICTORY_POINTS
      })
    }
  }

  const milestoneGains: Gain[] = []
  let updatedPlayers = state.players
  const crossedFourthMilestone = currentInfluence < 4 && newInfluence >= 4
  if (crossedFourthMilestone) {
    const milestone = FOURTH_INFLUENCE_MILESTONE_REWARDS[faction]
    const milestoneLabel = `${faction} 4th Influence`
    if (milestone.troops) {
      milestoneGains.push({
        playerId,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: milestoneLabel,
        amount: milestone.troops,
        type: RewardType.TROOPS,
      })
      if (options?.milestoneMeta) {
        options.milestoneMeta.troopsRecruited += milestone.troops
      }
    }
    if (milestone.solari) {
      milestoneGains.push({
        playerId,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: milestoneLabel,
        amount: milestone.solari,
        type: RewardType.SOLARI,
      })
    }
    if (milestone.intrigueCards) {
      milestoneGains.push({
        playerId,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: milestoneLabel,
        amount: milestone.intrigueCards,
        type: RewardType.INTRIGUE,
      })
    }
    if (milestone.water) {
      milestoneGains.push({
        playerId,
        source: GainSource.FIELD,
        sourceId: 0,
        round: state.currentRound,
        name: milestoneLabel,
        amount: milestone.water,
        type: RewardType.WATER,
      })
    }
    updatedPlayers = state.players.map((p) => {
      if (p.id !== playerId) return p
      return {
        ...p,
        troops: p.troops + (milestone.troops ?? 0),
        solari: p.solari + (milestone.solari ?? 0),
        water: p.water + (milestone.water ?? 0),
        intrigueCount: p.intrigueCount + (milestone.intrigueCards ?? 0),
      }
    })
  }

  if (options?.appendGainsTo) {
    allianceGains.forEach((g) => options.appendGainsTo!.push(g))
    milestoneGains.forEach((g) => options.appendGainsTo!.push(g))
  }
  const newGains =
    options?.appendGainsTo ?? [...(state.gains ?? []), ...allianceGains, ...milestoneGains]

  return {
    ...state,
    players: updatedPlayers,
    factionInfluence: newFactionInfluence,
    factionAlliances: {
      ...state.factionAlliances,
      [faction]: newAllianceOwner
    },
    gains: newGains
  }
}
