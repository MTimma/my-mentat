import { BOARD_SPACES } from '../data/boardSpaces'
import type { GameState } from '../types/GameTypes'

/** Local deploy-dock session for rewriting one past turn's deployment. */
export interface DeployEditSession {
  historyIndex: number
  playerId: number
  troops: number
  dreadnoughts: number
  /** "Deploy these troops" already committed inside the count. */
  theseTroops: number
  specimens: number
  troopLimit: number
  theseLimit: number
  /** Garrison plus troops already deployed on this turn. */
  garrisonTroops: number
  /** Garrison plus dreadnoughts already deployed on this turn. */
  garrisonDreadnoughts: number
}

/** Seed the deploy-dock session from a past turn's committed deployment. */
export function seedDeployEdit(turn: GameState, historyIndex: number): DeployEditSession | null {
  const curr = turn.currTurn
  if (!curr) return null
  const troops = Math.max(0, curr.removableTroops ?? 0)
  const dreadnoughts = Math.max(0, curr.removableDreadnoughts ?? 0)
  const specimens = Math.max(0, curr.removableSpecimens ?? 0)
  if (!curr.canDeployTroops && troops === 0 && dreadnoughts === 0) return null
  const player = turn.players.find(p => p.id === curr.playerId)
  if (!player) return null
  const theseTroops = Math.max(0, curr.removableTheseTroops ?? 0)
  // The deploy limit must at least cover everything already in the Conflict.
  const deployedTotal = troops + dreadnoughts + specimens
  const combatSpace = BOARD_SPACES.some(
    space => space.id === curr.agentSpaceId && space.conflictMarker
  )
  const storedLimit = curr.troopLimit ?? 0
  return {
    historyIndex,
    playerId: curr.playerId,
    troops,
    dreadnoughts,
    theseTroops,
    specimens,
    troopLimit: combatSpace
      ? Math.max(storedLimit, 2, deployedTotal)
      : Math.max(storedLimit, deployedTotal),
    theseLimit: Math.max(curr.theseTroopsDeployLimit ?? 0, theseTroops),
    garrisonTroops: player.troops + troops,
    garrisonDreadnoughts: (player.dreadnoughts?.garrison ?? 0) + dreadnoughts,
  }
}

/**
 * Slots left in the shared general deploy pool — mirrors
 * `getRemainingGeneralDeploySlots`: troops, dreadnoughts, and specimens all draw
 * from the same limit.
 */
function generalSlotsLeft(edit: DeployEditSession): number {
  const generalTroops = Math.max(0, edit.troops - edit.theseTroops)
  return Math.max(0, edit.troopLimit - generalTroops - edit.dreadnoughts - edit.specimens)
}

/** Troops that can still be added, and the garrison left to draw from. */
export function troopDeployRoom(edit: DeployEditSession): {
  deployable: number
  garrisonLeft: number
} {
  const theseSlotsLeft = Math.max(0, edit.theseLimit - Math.min(edit.troops, edit.theseTroops))
  const garrisonLeft = Math.max(0, edit.garrisonTroops - edit.troops)
  return {
    deployable: Math.max(0, Math.min(garrisonLeft, generalSlotsLeft(edit) + theseSlotsLeft)),
    garrisonLeft,
  }
}

/** Dreadnoughts that can still be added, and the garrison left to draw from. */
export function dreadnoughtDeployRoom(edit: DeployEditSession): {
  deployable: number
  garrisonLeft: number
} {
  const garrisonLeft = Math.max(0, edit.garrisonDreadnoughts - edit.dreadnoughts)
  return {
    deployable: Math.max(0, Math.min(garrisonLeft, generalSlotsLeft(edit))),
    garrisonLeft,
  }
}
