import {
  ChoiceType,
  Cost,
  FactionType,
  FixedOptionsChoice,
  GameState,
  InfluenceAmounts,
  Reward,
} from '../types/GameTypes'

/** Resource kinds that can appear as optional-effect costs. */
export type OptionalCostResourceKind = 'spice' | 'water' | 'solari' | 'troops' | 'influence'
import { isAnyFactionInfluenceChoice } from './influenceDisplay'
import { nextSemanticId } from './semanticIds'

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

/** Player can pay a fixed influence loss on a choice reward (e.g. Shifting Allegiances). */
export function canAffordInfluenceReward(
  state: GameState,
  playerId: number,
  reward?: Reward
): boolean {
  const influence = reward?.influence
  if (!influence?.amounts?.length) return true
  if (
    influence.chooseOne &&
    influence.amounts.every(entry => entry.amount >= 0)
  ) {
    return true
  }
  return influence.amounts.every(entry => {
    if (entry.amount >= 0) return true
    const loss = Math.abs(entry.amount)
    return (state.factionInfluence[entry.faction]?.[playerId] ?? 0) >= loss
  })
}

/** Which cost resources the player cannot pay across the given optional costs. */
export function getLackingOptionalCostResources(
  state: GameState,
  playerId: number,
  costs: Array<Cost | undefined>
): OptionalCostResourceKind[] {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return []

  const lacking = new Set<OptionalCostResourceKind>()
  for (const cost of costs) {
    if (!cost) continue
    if (cost.spice != null && cost.spice > 0 && player.spice < cost.spice) {
      lacking.add('spice')
    }
    if (cost.water != null && cost.water > 0 && player.water < cost.water) {
      lacking.add('water')
    }
    if (cost.solari != null && cost.solari > 0 && player.solari < cost.solari) {
      lacking.add('solari')
    }
    if (cost.troops != null && cost.troops > 0 && player.troops < cost.troops) {
      lacking.add('troops')
    }
    if (cost.influence?.chooseOne && !canPayInfluenceCost(state, playerId, cost.influence)) {
      lacking.add('influence')
    }
  }
  return [...lacking]
}

export function createGainInfluenceChoice(
  influence: InfluenceAmounts,
  source: FixedOptionsChoice['source'],
  prompt?: string,
  existingIds: Iterable<string> = []
): FixedOptionsChoice {
  const gain = getInfluenceGainAmount(influence)
  const factions = isAnyFactionInfluenceChoice(influence)
    ? ALL_FACTIONS
    : influence.amounts.map(entry => entry.faction)
  return {
    id: nextSemanticId(source, 'INFLUENCE-GAIN', existingIds),
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
  meta: { payOnResolve?: Cost; thenGain?: InfluenceAmounts },
  existingIds: Iterable<string> = []
): FixedOptionsChoice {
  const loss = getInfluenceLossAmount(influence)
  const factions = isAnyFactionInfluenceChoice(influence)
    ? ALL_FACTIONS
    : influence.amounts.map(entry => entry.faction)
  return {
    id: nextSemanticId(source, 'INFLUENCE-LOSE', existingIds),
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
