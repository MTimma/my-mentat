import { FactionType, InfluenceAmounts, RewardType } from '../types/GameTypes'
import type { Gain } from '../types/GameTypes'

const ALL_FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
]

/** chooseOne influence with all four factions and the same amount = pick any one faction. */
export function isAnyFactionInfluenceChoice(influence: InfluenceAmounts): boolean {
  if (!influence.chooseOne || influence.amounts.length === 0) return false
  const amount = influence.amounts[0].amount
  if (!influence.amounts.every(entry => entry.amount === amount)) return false
  const factions = new Set(influence.amounts.map(entry => entry.faction))
  return ALL_FACTIONS.every(faction => factions.has(faction))
}

export function getAnyFactionInfluenceLossIcon(): string {
  return '/icon/bump_down.png'
}

export function getAnyFactionInfluenceGainIcon(amount: number): string {
  if (amount >= 2) return '/icon/double_bump.png'
  return '/icon/bump.png'
}

export function getFactionBumpIcon(faction: FactionType): string {
  switch (faction) {
    case FactionType.SPACING_GUILD:
      return '/icon/guild_bump.png'
    case FactionType.BENE_GESSERIT:
      return '/icon/bene_bump.png'
    case FactionType.EMPEROR:
      return '/icon/emperor_bump.png'
    case FactionType.FREMEN:
      return '/icon/fremen_bump.png'
    default:
      return getAnyFactionInfluenceGainIcon(1)
  }
}

const FACTION_VALUES = new Set<string>(Object.values(FactionType))

/** Parses faction id from an influence gain name (`emperor`, `emperor Acquire`, `Skirmish - 1st place|spacing-guild`, etc.). */
export function factionFromInfluenceGainName(name: string): FactionType | null {
  const pipe = name.indexOf('|')
  if (pipe >= 0) {
    const faction = name.slice(pipe + 1)
    return FACTION_VALUES.has(faction) ? (faction as FactionType) : null
  }
  const base = name.endsWith(' Acquire') ? name.slice(0, -' Acquire'.length) : name
  return FACTION_VALUES.has(base) ? (base as FactionType) : null
}

/** Conflict influence choice: embed placement title + faction in one gain name for history display. */
export function conflictInfluenceGainName(
  placementTitle: string,
  faction: FactionType
): string {
  return `${placementTitle}|${faction}`
}

/** Builds influence amounts for rendering faction / any-faction bump icons from a gain row. */
export function influenceAmountsFromGain(gain: Gain): InfluenceAmounts | undefined {
  if (gain.type !== RewardType.INFLUENCE) return undefined
  const faction = factionFromInfluenceGainName(gain.name)
  if (faction) {
    return { amounts: [{ faction, amount: gain.amount }] }
  }
  return {
    chooseOne: true,
    amounts: ALL_FACTIONS.map(f => ({ faction: f, amount: gain.amount })),
  }
}
