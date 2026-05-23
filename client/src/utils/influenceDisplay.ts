import { FactionType, InfluenceAmounts } from '../types/GameTypes'

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
