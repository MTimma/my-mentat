import { Leader, FactionType } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export type BaronLeader = Leader & { secretFactions?: FactionType[] }

export function getSecretFactions(leader: Leader): FactionType[] | undefined {
  return (leader as BaronLeader).secretFactions
}

export function setSecretFactions(leader: Leader, factions: FactionType[]): Leader {
  return { ...leader, secretFactions: factions } as BaronLeader
}

export function isBaronLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.BARON_VLADIMIR
}
