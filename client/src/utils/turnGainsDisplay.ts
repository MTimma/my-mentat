import { Gain, GainSource, GameState, GameTurn, RewardType } from '../types/GameTypes'
import { BOARD_SPACES } from '../data/boardSpaces'

export interface AggregatedResourceGain {
  type: RewardType | string
  amount: number
  name?: string
  cardId?: number
}

export interface ResourceTypeTotal {
  type: RewardType
  net: number
  gained: number
  spent: number
}

export interface InfluenceTypeTotal {
  faction: string
  net: number
  gained: number
  lost: number
}

export interface CardTypeTotal {
  cardId: number
  name: string
  count: number
}

export interface TurnGainTotals {
  resources: ResourceTypeTotal[]
  influence: InfluenceTypeTotal[]
  cards: CardTypeTotal[]
}

/** Display order for net resource totals in turn history. */
export const TURN_TOTAL_RESOURCE_ORDER: RewardType[] = [
  RewardType.PERSUASION,
  RewardType.SPICE,
  RewardType.WATER,
  RewardType.SOLARI,
  RewardType.TROOPS,
  RewardType.POOL_TROOP,
  RewardType.DRAW,
  RewardType.INTRIGUE,
  RewardType.COMBAT,
  RewardType.DEPLOY,
  RewardType.DREADNOUGHT,
  RewardType.VICTORY_POINTS,
  RewardType.MENTAT,
  RewardType.AGENT,
  RewardType.EXTRA_TURN,
  RewardType.CONTROL,
  RewardType.DISCARD,
  RewardType.TRASH,
  RewardType.RECALL,
]

export interface TurnGainSourceGroup {
  key: string
  title: string
  gains: Gain[]
}

/** Icon beside a turn-history source group title (shipping, unload, signet ring, etc.). */
export function getGainGroupIcon(group: TurnGainSourceGroup): string | null {
  if (group.title === 'Shipping track') return '/icon/shipping.png'
  if (
    group.title === 'Signet Ring' ||
    group.gains.some(gain => gain.name === 'Signet Ring')
  ) {
    return '/icon/ring.png'
  }
  if (group.gains.some(gain => gain.name?.includes('(Unload)'))) {
    return '/icon/unload.png'
  }
  return null
}

/** Merged opponent discards — one horizontal row, no per-card titles. */
export const INLINE_DISCARDS_GROUP_KEY = 'inline-discards'

export function groupGainsForDisplay(
  gains: Gain[],
  options?: { inlineDiscards?: boolean }
): TurnGainSourceGroup[] {
  if (!options?.inlineDiscards) return groupGainsBySource(gains)

  const discardGains = gains.filter(gain => gain.type === RewardType.DISCARD)
  const otherGains = gains.filter(gain => gain.type !== RewardType.DISCARD)
  const groups = groupGainsBySource(otherGains)

  if (discardGains.length > 0) {
    groups.push({ key: INLINE_DISCARDS_GROUP_KEY, title: '', gains: discardGains })
  }

  return groups
}

export interface OtherPlayerTurnGains {
  playerId: number
  gains: Gain[]
}

function getTurnGainSlice(turn: GameState): Gain[] {
  const ct = turn.currTurn
  const start = ct?.gainsStartIndex ?? 0
  return (turn.gains ?? []).slice(start)
}

export function isCombatHistoryEntry(turn: GameState): boolean {
  return turn.historyEntryKind === 'combat'
}

export function isEndgameHistoryEntry(turn: GameState): boolean {
  return turn.historyEntryKind === 'endgame'
}

/** Combat history row: group conflict/intrigue gains by recipient player. */
export function groupCombatHistoryGainsByPlayer(gains: Gain[]): OtherPlayerTurnGains[] {
  const byPlayer = new Map<number, Gain[]>()
  for (const gain of gains) {
    if (gain.amount === 0) continue
    const list = byPlayer.get(gain.playerId) ?? []
    list.push(gain)
    byPlayer.set(gain.playerId, list)
  }
  return Array.from(byPlayer.entries())
    .sort(([a], [b]) => a - b)
    .map(([playerId, playerGains]) => ({ playerId, gains: playerGains }))
}

/** Gains shown on a turn-history row (combat rows include all players' conflict/intrigue gains). */
export function getGainsForHistoryRow(turn: GameState): Gain[] {
  if (isCombatHistoryEntry(turn) || isEndgameHistoryEntry(turn)) {
    return turn.gains ?? []
  }
  return getGainsForTurnState(turn)
}

/** True when the player has at least one troop in the Conflict (swords only count then). */
export function playerHasTroopsInConflict(turn: GameState, playerId?: number): boolean {
  const pid = playerId ?? turn.currTurn?.playerId ?? turn.activePlayerId
  if (pid == null) return false
  return (turn.combatTroops?.[pid] ?? 0) > 0
}

/** Gains for the active turn's player (live or snapshot), scoped to this turn only. */
export function getGainsForTurnState(turn: GameState): Gain[] {
  const ct = turn.currTurn
  const playerId = ct?.playerId ?? turn.activePlayerId
  if (playerId == null) return []
  const gains = getTurnGainSlice(turn).filter(gain => gain.playerId === playerId)
  if (!playerHasTroopsInConflict(turn, playerId)) {
    return gains.filter(gain => gain.type !== RewardType.COMBAT)
  }
  return gains
}

/** Gains for other players during this turn (control bonus, stolen intrigue, etc.). */
export function getOtherPlayersGainsForTurnState(turn: GameState): OtherPlayerTurnGains[] {
  const ct = turn.currTurn
  const turnPlayerId = ct?.playerId ?? turn.activePlayerId
  if (turnPlayerId == null) return []

  const byPlayer = new Map<number, Gain[]>()
  for (const gain of getTurnGainSlice(turn)) {
    if (gain.playerId === turnPlayerId) continue
    const list = byPlayer.get(gain.playerId) ?? []
    list.push(gain)
    byPlayer.set(gain.playerId, list)
  }

  return Array.from(byPlayer.entries())
    .filter(([, gains]) => gains.some(g => g.amount !== 0))
    .sort(([a], [b]) => a - b)
    .map(([playerId, gains]) => ({ playerId, gains }))
}

/** Troops currently in the Conflict from this turn (matches deploy UI center count). */
export function getTroopsDeployedToConflict(turn: GameState): number {
  const ct = turn.currTurn
  if (!ct) return 0
  return Math.max(0, ct.removableTroops ?? 0)
}

/**
 * Troops retreated from the Conflict this turn.
 * Clamps corrupt totals from before deploy-limit enforcement (removable + retreated >> limit).
 */
export function getTroopsRetreatedFromConflict(turn: GameState): number {
  const ct = turn.currTurn
  if (!ct) return 0
  const removable = Math.max(0, ct.removableTroops ?? 0)
  const stored = Math.max(0, ct.troopsRetreatedFromConflict ?? 0)
  if (stored === 0) return 0
  if (ct.canDeployTroops && (ct.troopLimit ?? 0) > 0) {
    const limit = ct.troopLimit ?? 0
    if (stored + removable > limit * 2) {
      return Math.max(0, limit - removable)
    }
  }
  return stored
}

/** Remaining effect-driven retreats allowed this turn (intrigue, leaders, reveal options). */
export function getEffectRetreatRemaining(turn: GameTurn | null | undefined): number {
  if (!turn) return 0
  const allowance = turn.effectRetreatAllowance ?? 0
  const used = turn.effectRetreatsUsed ?? 0
  return Math.max(0, allowance - used)
}

/** Max duplicate icons before showing a total multiplier (e.g. 3 water drops + ×5). */
export const MAX_REPEATED_GAIN_ICONS = 3

export function getRepeatedIconDisplay(
  amount: number,
  maxIcons: number = MAX_REPEATED_GAIN_ICONS
): { iconCount: number; showTotalMultiplier: boolean } {
  const absAmount = Math.abs(amount)
  if (absAmount <= 1) return { iconCount: absAmount, showTotalMultiplier: false }
  if (absAmount <= maxIcons) return { iconCount: absAmount, showTotalMultiplier: false }
  return { iconCount: maxIcons, showTotalMultiplier: true }
}

/** Board-space title for grouping mandatory rewards from the same space (e.g. Foldspace card + influence). */
function boardSpaceTitleForGain(gain: Gain): string | undefined {
  if (gain.source !== GainSource.BOARD_SPACE) return undefined
  return BOARD_SPACES.find(space => space.id === gain.sourceId)?.name
}

function abilityTitleForGain(gain: Gain): string | undefined {
  switch (gain.source) {
    case GainSource.MASTERSTROKE:
      return 'Masterstroke'
    case GainSource.MEMNON_HIGH_COUNCIL:
      return 'Memnon: High Council'
    case GainSource.TESSIA_SNOOPER:
      return 'Tessia snooper'
    case GainSource.TECH:
      return gain.name ? `Tech: ${gain.name}` : 'Tech'
    case GainSource.SHIPPING_TRACK:
      return 'Shipping track'
    case GainSource.IX_BOARD:
      return 'Ix board'
    default:
      return undefined
  }
}

function titleForGainGroup(gain: Gain): string {
  return abilityTitleForGain(gain) ?? boardSpaceTitleForGain(gain) ?? gain.name
}

/** Group gains by effect source so costs and rewards stay together. */
export function groupGainsBySource(gains: Gain[]): TurnGainSourceGroup[] {
  const order: string[] = []
  const map = new Map<string, TurnGainSourceGroup>()

  for (const gain of gains) {
    const key =
      gain.source === GainSource.CONFLICT
        ? `${gain.source}:${gain.sourceId}:${gain.name}:${gain.playerId}`
        : gain.source === GainSource.TECH
          ? `${gain.source}:${gain.name}:${gain.playerId}`
          : `${gain.source}:${gain.sourceId}`
    const existing = map.get(key)
    if (existing) {
      existing.gains.push(gain)
      const abilityTitle = abilityTitleForGain(gain)
      const spaceTitle = boardSpaceTitleForGain(gain)
      if (abilityTitle) existing.title = abilityTitle
      else if (spaceTitle) existing.title = spaceTitle
    } else {
      order.push(key)
      map.set(key, { key, title: titleForGainGroup(gain), gains: [gain] })
    }
  }

  return order.map(key => map.get(key)!)
}

export function aggregateResourceGains(gains: Gain[]): AggregatedResourceGain[] {
  const aggregated = new Map<string, AggregatedResourceGain>()

  gains.forEach(gain => {
    if (gain.type === RewardType.INFLUENCE || gain.amount === 0) return
    const isCardLike =
      gain.type === RewardType.CARD ||
      gain.type === RewardType.TRASH ||
      gain.type === RewardType.DISCARD
    const key = isCardLike ? `${gain.type}:${gain.sourceId}` : gain.type
    const existing = aggregated.get(key)
    if (existing) {
      existing.amount += gain.amount
    } else {
      aggregated.set(key, {
        type: gain.type,
        amount: gain.amount,
        name: isCardLike ? gain.name : gain.type === RewardType.CARD ? gain.name : undefined,
        cardId: isCardLike ? gain.sourceId : gain.type === RewardType.CARD ? gain.sourceId : undefined,
      })
    }
  })

  return Array.from(aggregated.values()).filter(g => g.amount !== 0)
}

/** Net gains and costs per reward type for a turn summary row. */
export function computeTurnGainTotals(gains: Gain[]): TurnGainTotals {
  const resourceMap = new Map<RewardType, ResourceTypeTotal>()
  const influenceMap = new Map<string, InfluenceTypeTotal>()
  const cardMap = new Map<number, CardTypeTotal>()

  const touchResource = (type: RewardType, delta: number) => {
    const entry = resourceMap.get(type) ?? { type, net: 0, gained: 0, spent: 0 }
    entry.net += delta
    if (delta > 0) entry.gained += delta
    else if (delta < 0) entry.spent += Math.abs(delta)
    resourceMap.set(type, entry)
  }

  for (const gain of gains) {
    if (gain.amount === 0) continue

    if (gain.type === RewardType.INFLUENCE) {
      const entry = influenceMap.get(gain.name) ?? {
        faction: gain.name,
        net: 0,
        gained: 0,
        lost: 0,
      }
      entry.net += gain.amount
      if (gain.amount > 0) entry.gained += gain.amount
      else entry.lost += Math.abs(gain.amount)
      influenceMap.set(gain.name, entry)
      continue
    }

    if (gain.type === RewardType.CARD) {
      if (gain.name.endsWith(' Acquire')) continue
      const existing = cardMap.get(gain.sourceId)
      if (existing) {
        existing.count += gain.amount
      } else {
        cardMap.set(gain.sourceId, {
          cardId: gain.sourceId,
          name: gain.name,
          count: gain.amount,
        })
      }
      continue
    }

    if (gain.type === RewardType.TRASH || gain.type === RewardType.DISCARD) {
      const existing = cardMap.get(gain.sourceId)
      const delta = Math.abs(gain.amount)
      if (existing) {
        existing.count += delta
      } else {
        cardMap.set(gain.sourceId, {
          cardId: gain.sourceId,
          name: gain.name,
          count: delta,
        })
      }
      touchResource(gain.type as RewardType, gain.amount)
      continue
    }

    touchResource(gain.type as RewardType, gain.amount)
  }

  const resources = TURN_TOTAL_RESOURCE_ORDER.filter(type => resourceMap.has(type)).map(
    type => resourceMap.get(type)!
  )
  for (const [type, total] of resourceMap) {
    if (!TURN_TOTAL_RESOURCE_ORDER.includes(type)) {
      resources.push(total)
    }
  }

  const influence = Array.from(influenceMap.values()).filter(
    entry => entry.net !== 0 || entry.gained > 0 || entry.lost > 0
  )
  const cards = Array.from(cardMap.values()).filter(entry => entry.count > 0)

  return { resources, influence, cards }
}

/** Gains from a card's acquire effect (VP, influence, resources), excluding the CARD acquisition row. */
export function getAcquireEffectGainsForCard(gains: Gain[], cardId: number): Gain[] {
  return gains.filter(
    gain =>
      gain.sourceId === cardId &&
      gain.source === GainSource.CARD &&
      gain.type !== RewardType.CARD &&
      gain.amount !== 0
  )
}

/** Remove all acquired-card gains from totals (card row + acquire effects — shown in Acquired box). */
export function excludeAcquireEffectGains(gains: Gain[], acquiredCardIds: number[]): Gain[] {
  const acquired = new Set(acquiredCardIds)
  return gains.filter(
    gain => !(gain.source === GainSource.CARD && acquired.has(gain.sourceId))
  )
}

export function aggregateInfluenceGains(gains: Gain[]): Array<{ name: string; amount: number }> {
  const aggregated = new Map<string, number>()
  gains.forEach(gain => {
    if (gain.type !== RewardType.INFLUENCE || gain.amount === 0) return
    aggregated.set(gain.name, (aggregated.get(gain.name) ?? 0) + gain.amount)
  })
  return Array.from(aggregated.entries())
    .map(([name, amount]) => ({ name, amount }))
    .filter(g => g.amount !== 0)
}

export function splitGainsByCostAndReward(gains: Gain[]): { costs: Gain[]; rewards: Gain[] } {
  const costs: Gain[] = []
  const rewards: Gain[] = []
  for (const gain of gains) {
    if (gain.amount < 0) {
      costs.push({ ...gain, amount: Math.abs(gain.amount) })
    } else if (gain.amount > 0) {
      rewards.push(gain)
    }
  }
  return { costs, rewards }
}
