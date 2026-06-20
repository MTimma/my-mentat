import type { GameState, GameTurn, Player, Reward } from '../types/GameTypes'

/** Each player has 12 troop pieces total (supply + garrison + conflict [+ Ix negotiators in RoI]). */
export const MAX_TROOPS_PER_PLAYER = 12

/** Pieces across supply, garrison, conflict troops, and (RoI) negotiators on Ix / in conflict. */
export function totalTroopPieces(
  player: Player,
  combatTroops = 0,
  combatNegotiators = 0
): number {
  return (
    (player.troopSupply ?? 0) +
    player.troops +
    combatTroops +
    (player.negotiatorsOnIx ?? 0) +
    combatNegotiators
  )
}

/** Seed supply so in-play pieces + supply = 12. */
export function seedTroopSupply(player: Player): Player {
  const inPlay = player.troops + (player.negotiatorsOnIx ?? 0)
  const supply = Math.max(0, MAX_TROOPS_PER_PLAYER - inPlay)
  return { ...player, troopSupply: supply }
}

/** Recruit from supply into garrison; capped by remaining supply. */
export function recruitTroopsToGarrison(
  player: Player,
  amount: number
): { player: Player; recruited: number } {
  if (amount <= 0) return { player, recruited: 0 }
  const supply = player.troopSupply ?? 0
  const recruited = Math.min(amount, supply)
  return {
    player: {
      ...player,
      troopSupply: supply - recruited,
      troops: player.troops + recruited,
    },
    recruited,
  }
}

/** Place negotiators on Ix from supply (RoI only). */
export function placeNegotiatorsFromSupply(
  player: Player,
  amount: number
): { player: Player; placed: number } {
  if (amount <= 0) return { player, placed: 0 }
  const supply = player.troopSupply ?? 0
  const placed = Math.min(amount, supply)
  return {
    player: {
      ...player,
      troopSupply: supply - placed,
      negotiatorsOnIx: (player.negotiatorsOnIx ?? 0) + placed,
    },
    placed,
  }
}

/** Return negotiators from Ix to supply. */
export function returnNegotiatorsToSupply(player: Player, amount: number): Player {
  if (amount <= 0) return player
  const onIx = player.negotiatorsOnIx ?? 0
  const returned = Math.min(amount, onIx)
  if (returned === 0) return player
  return {
    ...player,
    negotiatorsOnIx: onIx - returned,
    troopSupply: (player.troopSupply ?? 0) + returned,
  }
}

/** Reward recruits troops and allows deploying only those new units (not garrison/dreadnought/negotiator). */
export function isDeployTheseRecruitedTroops(
  reward: Pick<Reward, 'troops' | 'deployTroops'>
): boolean {
  return (reward.troops ?? 0) > 0 && (reward.deployTroops ?? 0) > 0
}

export function applyDeployTroopsAllowance(
  currTurn: GameTurn,
  deployTroops: number,
  reward?: Pick<Reward, 'troops' | 'deployTroops'>
): GameTurn {
  if (deployTroops <= 0) return currTurn
  if (reward && isDeployTheseRecruitedTroops(reward)) {
    return {
      ...currTurn,
      theseTroopsDeployLimit: (currTurn.theseTroopsDeployLimit ?? 0) + deployTroops,
      canDeployTroops: true,
    }
  }
  return {
    ...currTurn,
    troopLimit: (currTurn.troopLimit ?? 0) + deployTroops,
    canDeployTroops: true,
  }
}

/** Shared deploy pool for garrison troops, dreadnoughts, and negotiators. */
export function getRemainingGeneralDeploySlots(state: GameState): number {
  const ct = state.currTurn
  if (!ct) return 0
  const limit = ct.troopLimit ?? 0
  const troops = ct.removableTroops ?? 0
  const theseTroops = ct.removableTheseTroops ?? 0
  const generalTroops = Math.max(0, troops - theseTroops)
  const dreads = ct.removableDreadnoughts ?? 0
  const negotiators = ct.removableNegotiators ?? 0
  return Math.max(0, limit - generalTroops - dreads - negotiators)
}

/** Exclusive pool for troops recruited by a "deploy these troops" effect. */
export function getRemainingTheseTroopsDeploySlots(state: GameState): number {
  const ct = state.currTurn
  if (!ct) return 0
  return Math.max(0, (ct.theseTroopsDeployLimit ?? 0) - (ct.removableTheseTroops ?? 0))
}

export function getRemainingTroopDeploySlots(state: GameState): number {
  return getRemainingGeneralDeploySlots(state) + getRemainingTheseTroopsDeploySlots(state)
}

/** After combat: conflict troops and negotiators return to supply. */
export function returnConflictUnitsToSupply(
  player: Player,
  troopCount: number,
  negotiatorCount: number
): Player {
  const returned = troopCount + negotiatorCount
  if (returned <= 0) return player
  return {
    ...player,
    troopSupply: (player.troopSupply ?? 0) + returned,
  }
}
