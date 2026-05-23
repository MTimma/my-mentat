import {
  ChoiceType,
  Cost,
  FactionType,
  FixedOptionsChoice,
  GameState,
  InfluenceAmounts,
  Reward,
} from '../types/GameTypes'
import { isAnyFactionInfluenceChoice } from './influenceDisplay'

const ALL_FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
]

export function requiresInfluenceChoices(cost?: Cost, reward?: Reward): boolean {
  return Boolean(cost?.influence?.chooseOne || reward?.influence?.chooseOne)
}

export function getInfluenceLossAmount(influence: InfluenceAmounts): number {
  const raw = influence.amounts[0]?.amount ?? 0
  return Math.abs(raw)
}

export function getInfluenceGainAmount(influence: InfluenceAmounts): number {
  return Math.abs(influence.amounts[0]?.amount ?? 0)
}

/** Player can pay a choose-one influence cost (lose N with any listed faction). */
export function canPayInfluenceCost(
  state: GameState,
  playerId: number,
  influence: InfluenceAmounts
): boolean {
  const loss = getInfluenceLossAmount(influence)
  if (loss <= 0) return true
  const factions = isAnyFactionInfluenceChoice(influence)
    ? ALL_FACTIONS
    : influence.amounts.map(entry => entry.faction)
  return factions.some(
    faction => (state.factionInfluence[faction]?.[playerId] ?? 0) >= loss
  )
}

export function canAffordInfluenceOptionalEffect(
  state: GameState,
  playerId: number,
  cost?: Cost,
  reward?: Reward
): boolean {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return false
  if (cost?.spice && player.spice < cost.spice) return false
  if (cost?.water && player.water < cost.water) return false
  if (cost?.solari && player.solari < cost.solari) return false
  if (cost?.troops && player.troops < cost.troops) return false
  if (cost?.influence?.chooseOne && !canPayInfluenceCost(state, playerId, cost.influence)) {
    return false
  }
  return true
}

export function createGainInfluenceChoice(
  influence: InfluenceAmounts,
  source: FixedOptionsChoice['source'],
  prompt?: string
): FixedOptionsChoice {
  const gain = getInfluenceGainAmount(influence)
  const factions = isAnyFactionInfluenceChoice(influence)
    ? ALL_FACTIONS
    : influence.amounts.map(entry => entry.faction)
  return {
    id: `influence-gain-${source.type}-${source.id}-${crypto.randomUUID()}`,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: prompt ?? `Choose a faction to gain ${gain} influence`,
    options: factions.map(faction => ({
      reward: { influence: { amounts: [{ faction, amount: gain }] } },
    })),
    source,
  }
}

export function createLoseInfluenceChoice(
  state: GameState,
  playerId: number,
  influence: InfluenceAmounts,
  source: FixedOptionsChoice['source'],
  meta: { payOnResolve?: Cost; thenGain?: InfluenceAmounts }
): FixedOptionsChoice {
  const loss = getInfluenceLossAmount(influence)
  const factions = isAnyFactionInfluenceChoice(influence)
    ? ALL_FACTIONS
    : influence.amounts.map(entry => entry.faction)
  return {
    id: `influence-lose-${source.type}-${source.id}-${crypto.randomUUID()}`,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: `Choose a faction to lose ${loss} influence`,
    options: factions.map(faction => ({
      reward: { influence: { amounts: [{ faction, amount: -loss }] } },
      disabled: (state.factionInfluence[faction]?.[playerId] ?? 0) < loss,
    })),
    source,
    influenceResolution: meta,
  }
}
