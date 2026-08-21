import { Gain, GainSource, GameState, GameTurn, RewardType } from '../types/GameTypes'
import { BOARD_SPACES } from '../data/boardSpaces'
import { catalogDeckCardNameById, catalogIntrigueNameById } from './cardCatalogLookup'
import { factionFromInfluenceGainName } from './influenceDisplay'
import {
  TechTileId,
  getTechTile,
  getTechTileByName,
  techTileFromGainSourceId,
  techTileGainSourceId,
} from '../data/techTiles'

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
  RewardType.FREIGHTER,
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
  if (group.title === 'Shipping track' || /^Shipping [123]$/.test(group.title)) {
    return '/icon/shipping.png'
  }
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

const COMBAT_PLACEMENT_RANK: Record<string, number> = {
  '1st place': 1,
  '2nd place': 2,
  '3rd place': 3,
}

/** Best (lowest) placement rank from conflict gain names like "Skirmish - 1st place". */
export function combatPlacementRankFromGainName(name: string): number | null {
  const base = name.includes('|') ? name.slice(0, name.indexOf('|')) : name
  for (const [placement, rank] of Object.entries(COMBAT_PLACEMENT_RANK)) {
    if (base.endsWith(placement)) return rank
  }
  return null
}

function combatPlacementRankForPlayerGains(gains: Gain[]): number {
  let best = Number.POSITIVE_INFINITY
  for (const gain of gains) {
    const rank = combatPlacementRankFromGainName(gain.name)
    if (rank != null && rank < best) best = rank
  }
  return Number.isFinite(best) ? best : 999
}

/** Combat history row: group conflict/intrigue gains by recipient player (1st → 3rd). */
export function groupCombatHistoryGainsByPlayer(gains: Gain[]): OtherPlayerTurnGains[] {
  const byPlayer = new Map<number, Gain[]>()
  for (const gain of gains) {
    if (gain.amount === 0) continue
    const list = byPlayer.get(gain.playerId) ?? []
    list.push(gain)
    byPlayer.set(gain.playerId, list)
  }
  return Array.from(byPlayer.entries())
    .sort(([playerIdA, gainsA], [playerIdB, gainsB]) => {
      const rankDiff =
        combatPlacementRankForPlayerGains(gainsA) - combatPlacementRankForPlayerGains(gainsB)
      return rankDiff !== 0 ? rankDiff : playerIdA - playerIdB
    })
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

function trashedCardIdFromGain(gain: Gain): number | undefined {
  if (gain.type !== RewardType.TRASH && gain.type !== RewardType.DISCARD) return undefined
  return gain.cardId ?? gain.sourceId
}

function trashDiscardSourceTitleForGain(gain: Gain): string | undefined {
  if (gain.type !== RewardType.TRASH && gain.type !== RewardType.DISCARD) return undefined
  switch (gain.source) {
    case GainSource.CARD:
      return catalogDeckCardNameById(gain.sourceId)
    case GainSource.INTRIGUE:
      return catalogIntrigueNameById(gain.sourceId)
    default:
      return undefined
  }
}

const FREIGHTER_MOVE_LABELS = new Set(['Advance', 'Recall'])

function isFreighterMoveLabel(name: string | undefined): boolean {
  return name != null && FREIGHTER_MOVE_LABELS.has(name)
}

/** Source card/intrigue title for Advance/Recall gains that stored the move name, not the source. */
export function freighterMoveSourceTitle(
  gain: Gain,
  resolveCardName?: (cardId: number) => string | undefined
): string | undefined {
  if (gain.type !== RewardType.FREIGHTER || !isFreighterMoveLabel(gain.name)) return undefined
  switch (gain.source) {
    case GainSource.CARD:
      return resolveCardName?.(gain.sourceId) ?? catalogDeckCardNameById(gain.sourceId)
    case GainSource.INTRIGUE:
      return catalogIntrigueNameById(gain.sourceId)
    default:
      return undefined
  }
}

export function resolveFreighterMoveGroupTitle(
  group: TurnGainSourceGroup,
  resolveCardName?: (cardId: number) => string | undefined
): string {
  if (!isFreighterMoveLabel(group.title)) return group.title
  const gain = group.gains.find(g => g.type === RewardType.FREIGHTER)
  if (!gain) return group.title
  return freighterMoveSourceTitle(gain, resolveCardName) ?? group.title
}

function shippingStepFromName(name: string): 1 | 2 | 3 | null {
  if (/Shipping 1|step\s*1|Dividends/i.test(name)) return 1
  if (/Shipping 2|step\s*2/i.test(name)) return 2
  if (/Shipping 3|step\s*3/i.test(name)) return 3
  return null
}

/** Recall/advance shipping-track step for grouping (1 spice/dividends, 2 troops+inf, 3 tech). */
export function shippingTrackStepFromGain(gain: Gain): 1 | 2 | 3 | null {
  if (gain.source !== GainSource.SHIPPING_TRACK) return null
  const named = shippingStepFromName(gain.name)
  if (named) return named
  switch (gain.type) {
    case RewardType.SPICE:
    case RewardType.SOLARI:
      return 1
    case RewardType.TROOPS:
    case RewardType.POOL_TROOP:
    case RewardType.DEPLOY:
    case RewardType.INFLUENCE:
      return 2
    case RewardType.TECH:
      return 3
    default:
      return null
  }
}

export function shippingTrackGroupTitle(gain: Gain): string {
  const step = shippingTrackStepFromGain(gain)
  return step ? `Shipping ${step}` : 'Shipping track'
}

/**
 * Group key for pending-effect chips. Shipping recall steps share source id 0
 * (kept for recorded choice ids) so they must split on the step name.
 */
export function effectSourceGroupKey(source: {
  type: string
  id: number
  name?: string
}): string {
  if (source.type === GainSource.SHIPPING_TRACK) {
    return `${source.type}-${source.id}-${source.name ?? ''}`
  }
  return `${source.type}-${source.id}`
}

export function freighterRecallStepOrdinal(step: number): string | null {
  if (step === 1) return '1st'
  if (step === 2) return '2nd'
  if (step === 3) return '3rd'
  return null
}

/** Tile id for grouping TECH costs/rewards when the gain `name` is the discarded card. */
function techIdentityForGain(gain: Gain): string {
  const fromId = techTileFromGainSourceId(gain.sourceId)
  if (fromId) return fromId
  const fromName = getTechTileByName(gain.name)
  if (fromName) return fromName.id
  return gain.name
}

/** Discarded/trashed card title for gain rows (not the effect source). */
export function discardedOrTrashedCardLabel(
  gain: { name?: string; cardId?: number },
  resolvedName?: string
): string {
  if (resolvedName) return resolvedName
  const catalog = gain.cardId != null ? catalogDeckCardNameById(gain.cardId) : undefined
  if (catalog) return catalog
  if (gain.name && getTechTileByName(gain.name)) return catalog ?? gain.name
  return gain.name ?? 'Card'
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
    case GainSource.TECH: {
      const tile = getTechTile(techIdentityForGain(gain) as TechTileId) ?? getTechTileByName(gain.name)
      return tile ? `Tech: ${tile.name}` : gain.name ? `Tech: ${gain.name}` : 'Tech'
    }
    case GainSource.SHIPPING_TRACK:
      return shippingTrackGroupTitle(gain)
    case GainSource.IX_BOARD: {
      const tileId = techTileFromGainSourceId(gain.sourceId)
      const tileName = tileId ? getTechTile(tileId)?.name : getTechTileByName(gain.name)?.name
      return tileName ? `Tech: ${tileName}` : 'Ix board'
    }
    default:
      return undefined
  }
}

function titleForGainGroup(gain: Gain): string {
  return (
    abilityTitleForGain(gain) ??
    boardSpaceTitleForGain(gain) ??
    trashDiscardSourceTitleForGain(gain) ??
    freighterMoveSourceTitle(gain) ??
    gain.name
  )
}

function conflictPlayerKey(sourceId: number, playerId: number): string {
  return `${sourceId}:${playerId}`
}

/** Map conflict id + player → placement title ("Skirmish - 1st place"). */
function buildConflictPlacementTitlesByPlayer(gains: Gain[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const gain of gains) {
    if (gain.source !== GainSource.CONFLICT) continue
    if (combatPlacementRankFromGainName(gain.name) == null) continue
    map.set(conflictPlayerKey(gain.sourceId, gain.playerId), gain.name)
  }
  return map
}

function conflictGainDisplayTitle(
  gain: Gain,
  placementTitles: Map<string, string>
): string {
  const pipe = gain.name.indexOf('|')
  if (pipe >= 0) return gain.name.slice(0, pipe)
  if (combatPlacementRankFromGainName(gain.name) != null) return gain.name
  if (
    gain.type === RewardType.INFLUENCE &&
    factionFromInfluenceGainName(gain.name) &&
    gain.source === GainSource.CONFLICT
  ) {
    return placementTitles.get(conflictPlayerKey(gain.sourceId, gain.playerId)) ?? gain.name
  }
  return gain.name
}

function conflictGainGroupKey(gain: Gain, placementTitles: Map<string, string>): string {
  const title = conflictGainDisplayTitle(gain, placementTitles)
  return `${gain.source}:${gain.sourceId}:${title}:${gain.playerId}`
}

/** Group gains by effect source so costs and rewards stay together. */
export function groupGainsBySource(gains: Gain[]): TurnGainSourceGroup[] {
  const order: string[] = []
  const map = new Map<string, TurnGainSourceGroup>()
  const conflictPlacements = buildConflictPlacementTitlesByPlayer(gains)

  for (const gain of gains) {
    const key =
      gain.source === GainSource.CONFLICT
        ? conflictGainGroupKey(gain, conflictPlacements)
        : gain.source === GainSource.TECH
          ? `${gain.source}:${techIdentityForGain(gain)}:${gain.playerId}`
          : gain.source === GainSource.SHIPPING_TRACK
            ? `${gain.source}:${shippingTrackStepFromGain(gain) ?? 0}:${gain.playerId}`
            : gain.source === GainSource.IX_BOARD
            ? `${gain.source}:${gain.sourceId}:${gain.name}:${gain.playerId}`
            : `${gain.source}:${gain.sourceId}`
    const groupTitle =
      gain.source === GainSource.CONFLICT
        ? conflictGainDisplayTitle(gain, conflictPlacements)
        : titleForGainGroup(gain)
    const existing = map.get(key)
    if (existing) {
      existing.gains.push(gain)
      const abilityTitle = abilityTitleForGain(gain)
      const spaceTitle = boardSpaceTitleForGain(gain)
      if (abilityTitle) existing.title = abilityTitle
      else if (spaceTitle) existing.title = spaceTitle
    } else {
      order.push(key)
      map.set(key, { key, title: groupTitle, gains: [gain] })
    }
  }

  return order.map(key => map.get(key)!)
}

export function aggregateResourceGains(gains: Gain[]): AggregatedResourceGain[] {
  const aggregated = new Map<string, AggregatedResourceGain>()

  gains.forEach(gain => {
    if (gain.type === RewardType.INFLUENCE || gain.amount === 0) return
    const isTrashOrDiscard =
      gain.type === RewardType.TRASH || gain.type === RewardType.DISCARD
    const isCardLike = gain.type === RewardType.CARD || isTrashOrDiscard
    const trashedCardId = isTrashOrDiscard ? trashedCardIdFromGain(gain) : undefined
    const cardIdForAggregate = isTrashOrDiscard
      ? trashedCardId
      : gain.type === RewardType.CARD
        ? gain.sourceId
        : undefined
    const key = isCardLike
      ? `${gain.type}:${cardIdForAggregate ?? gain.sourceId}`
      : gain.type
    const existing = aggregated.get(key)
    if (existing) {
      existing.amount += gain.amount
    } else {
      aggregated.set(key, {
        type: gain.type,
        amount: gain.amount,
        name: isCardLike ? gain.name : gain.type === RewardType.CARD ? gain.name : undefined,
        cardId: cardIdForAggregate,
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
      const trashedCardId = trashedCardIdFromGain(gain) ?? gain.sourceId
      const existing = cardMap.get(trashedCardId)
      const delta = Math.abs(gain.amount)
      if (existing) {
        existing.count += delta
      } else {
        cardMap.set(trashedCardId, {
          cardId: trashedCardId,
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

/** Gains from an Ix tech tile purchase (costs + acquire effect), excluding the TECH acquisition row. */
export function getAcquireEffectGainsForTechTile(gains: Gain[], tileId: TechTileId): Gain[] {
  const sourceId = techTileGainSourceId(tileId)
  const tileName = getTechTile(tileId)?.name
  return gains.filter(gain => {
    if (gain.source !== GainSource.IX_BOARD || gain.type === RewardType.TECH || gain.amount === 0) {
      return false
    }
    if (gain.sourceId === sourceId) return true
    return tileName != null && gain.name === tileName
  })
}

/** Remove all acquired-card gains from totals (card row + acquire effects — shown in Acquired box). */
export function excludeAcquireEffectGains(gains: Gain[], acquiredCardIds: number[]): Gain[] {
  const acquired = new Set(acquiredCardIds)
  return gains.filter(
    gain => !(gain.source === GainSource.CARD && acquired.has(gain.sourceId))
  )
}

/** Remove Ix tech purchase gains (tile row + costs + acquire effects — shown in Acquired box). */
export function excludeTechAcquireGains(gains: Gain[], acquiredTileIds: TechTileId[]): Gain[] {
  const sourceIds = new Set(acquiredTileIds.map(techTileGainSourceId))
  const names = new Set(
    acquiredTileIds
      .map(id => getTechTile(id)?.name)
      .filter((name): name is string => name != null)
  )
  return gains.filter(gain => {
    if (gain.source !== GainSource.IX_BOARD) return true
    if (sourceIds.has(gain.sourceId)) return false
    if (names.has(gain.name)) return false
    return true
  })
}

/** Hide imperium-card and Ix-tech acquisition rows from the per-source gains list. */
export function excludeAcquiredGainsFromDisplay(
  gains: Gain[],
  acquiredCardIds: number[],
  acquiredTechTileIds: TechTileId[] = []
): Gain[] {
  return excludeTechAcquireGains(excludeAcquireEffectGains(gains, acquiredCardIds), acquiredTechTileIds)
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
    if (gain.amount === 0) continue
    // Trashing a card is an effect (reward side), even though the gain amount is negative.
    if (gain.type === RewardType.TRASH && gain.amount < 0) {
      rewards.push({ ...gain, amount: Math.abs(gain.amount) })
      continue
    }
    if (gain.amount < 0) {
      costs.push({ ...gain, amount: Math.abs(gain.amount) })
    } else {
      rewards.push(gain)
    }
  }
  return { costs, rewards }
}
