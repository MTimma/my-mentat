/**
 * Published id catalogs (plans/reducer/05-server-api-and-catalogs.md).
 *
 * Builds a normalized, JSON-serializable catalog from the authoring sources in
 * `src/data/*` and `src/services/IntrigueDeckService.ts`.
 *
 * Rewards/costs are NOT embedded in card entries: every effect lives in a
 * separate `effects` registry keyed by a deterministic effect id, and cards /
 * spaces / intrigue entries reference those ids. Event logs and external
 * producers link to effects via these ids (plans/reducer/02-deterministic-ids.md).
 *
 * NOTE on card ids: the authored numeric ids in `cards.ts` are NOT unique
 * template identifiers (e.g. 1036 is "Other Memory" in STARTING_DECK but
 * "Missionaria Protectiva" in IMPERIUM_ROW_DECK; 1026 is shared by three
 * different imperium cards). The app tolerates this because imperium instances
 * are re-id'd at runtime (buildImperiumDeck). The catalog therefore mints its
 * own stable string ids `<pool>/<name-slug>` and keeps the raw numeric ids as
 * `authorIds` for instance correlation/diagnostics.
 */
import {
  STARTING_DECK,
  ARRAKIS_LIAISON_DECK,
  SPICE_MUST_FLOW_DECK,
  FOLDSPACE_DECK,
  IMPERIUM_ROW_DECK,
  RISE_OF_IX_IMPERIUM_DECK,
} from '../data/cards'
import { BOARD_SPACES } from '../data/boardSpaces'
import { CONFLICTS, RISE_OF_IX_CONFLICTS } from '../data/conflicts'
import { LEADERS, LEADER_ICON_SLUGS, RISE_OF_IX_LEADERS } from '../data/leaders'
import { intrigueCards } from '../data/intrigueCards'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../data/intrigueCardsRiseOfIx'
import { TECH_TILES, type TechTile } from '../data/techTiles'
import {
  Card,
  CardEffect,
  PlayEffect,
  ConflictCard,
  CustomEffect,
  IntrigueCard,
  Leader,
  SpaceProps,
} from '../types/GameTypes'

export const CATALOG_SCHEMA_VERSION = 1

export type CardPool =
  | 'starting'
  | 'imperium'
  | 'arrakis-liaison'
  | 'spice-must-flow'
  | 'foldspace'

/** Effect slots a card/space/intrigue entry can reference effects from. */
export type EffectSlot = 'play' | 'reveal' | 'trash' | 'acquire' | 'space'

export interface CatalogEffectEntry {
  id: string
  /** Owner reference; card owners use catalog string ids, others numeric ids. */
  owner: { type: 'card' | 'board-space' | 'intrigue'; id: string | number }
  slot: EffectSlot
  index: number
  requirement?: unknown
  cost?: unknown
  reward: unknown
  choiceOpt?: boolean
  timing?: string
  phase?: string | string[]
  beforePlaceAgent?: { recallAgent?: boolean }
}

export interface CatalogCardEntry {
  /** Stable catalog id: `<pool>/<name-slug>`. */
  id: string
  name: string
  pool: CardPool
  cost?: number
  factions?: string[]
  agentIcons: string[]
  infiltrate?: boolean
  /** Rise of Ix — Reveal effects also fire when discarded or trashed. */
  unload?: boolean
  /** Rise of Ix — source marker for deck filtering and UI. */
  riseOfIx?: boolean
  image: string
  /** Effect ids per slot — definitions live in the `effects` registry. */
  effects: {
    play?: string[]
    reveal?: string[]
    trash?: string[]
    acquire?: string
  }
  /** Raw numeric ids as authored (one per copy; NOT globally unique). */
  authorIds: number[]
}

export interface CatalogSpaceEntry {
  id: number
  name: string
  agentIcon: string
  conflictMarker: boolean
  cost?: unknown
  influence?: unknown
  requiresInfluence?: unknown
  makerSpace?: string
  controlMarker?: string
  controlBonus?: unknown
  specialEffect?: string
  maxAgents?: number
  image?: string
  /** Rise of Ix — CHOAM-overlay board space (ids 23–26). */
  riseOfIx?: boolean
  gridSide?: 'main' | 'ix'
  effects: string[]
}

export interface CatalogConflictEntry {
  id: number
  tier: 1 | 2 | 3
  name: string
  controlSpace?: string
  rewards: ConflictCard['rewards']
  riseOfIx?: boolean
}

export interface CatalogIntrigueEntry {
  id: number
  name: string
  type: string
  description: string
  image: string
  targetPlayer?: boolean
  riseOfIx?: boolean
  effects: { play?: string[] }
}

export interface CatalogLeaderEntry {
  /** Stable slug id (e.g. "paul"), from LEADER_ICON_SLUGS. */
  id: string
  name: string
  ability: { name: string; description: string }
  signetRingText: string
  signetRingTitle?: string
  complexity: number
  sogChoice: boolean
  riseOfIx?: boolean
}

export interface CatalogTechTileEntry {
  id: string
  name: string
  cost: number
  image: string
  timing: string[]
  description: string
  customEffect?: string
  acquireEffect?: unknown
  riseOfIx: true
}

export interface CatalogExpansionCounts {
  cards: number
  conflicts: number
  leaders: number
  intrigue: number
  boardSpaces: number
  techTiles: number
}

export interface CatalogExpansionMeta {
  id: string
  name: string
  counts: CatalogExpansionCounts
  /** Deck composition rules — catalog card ids incl. duplicates. */
  decks: {
    imperium: string[]
  }
}

export interface CatalogExpansions {
  available: string[]
  byId: Record<string, CatalogExpansionMeta>
}

export interface Catalog {
  schemaVersion: number
  meta: {
    counts: Record<string, number>
  }
  effects: CatalogEffectEntry[]
  cards: CatalogCardEntry[]
  /** Default deck compositions: ordered catalog card ids incl. duplicates. */
  decks: Record<CardPool, string[]>
  boardSpaces: CatalogSpaceEntry[]
  conflicts: CatalogConflictEntry[]
  intrigue: CatalogIntrigueEntry[]
  leaders: CatalogLeaderEntry[]
  techTiles: CatalogTechTileEntry[]
  expansions: CatalogExpansions
  customEffects: string[]
  /** Semantic choice/reward id grammar (plans/reducer/02-deterministic-ids.md). */
  choiceIdGrammar: {
    format: string
    sourceTypes: string[]
    kinds: string[]
    examples: string[]
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeEffectId(
  ownerType: CatalogEffectEntry['owner']['type'],
  ownerId: string | number,
  slot: EffectSlot,
  index: number
): string {
  return `effect:${ownerType}:${ownerId}:${slot}:${index}`
}

function registerEffects(
  registry: CatalogEffectEntry[],
  ownerType: CatalogEffectEntry['owner']['type'],
  ownerId: string | number,
  slot: EffectSlot,
  effects: CardEffect[] | undefined
): string[] | undefined {
  if (!effects?.length) return undefined
  return effects.map((effect, index) => {
    const id = makeEffectId(ownerType, ownerId, slot, index)
    const playEffect = effect as PlayEffect
    registry.push({
      id,
      owner: { type: ownerType, id: ownerId },
      slot,
      index,
      requirement: effect.requirement,
      cost: effect.cost,
      reward: effect.reward,
      choiceOpt: effect.choiceOpt,
      timing: effect.timing,
      phase: effect.phase,
      ...(playEffect.beforePlaceAgent
        ? { beforePlaceAgent: playEffect.beforePlaceAgent }
        : {}),
    })
    return id
  })
}

function buildCardEntries(
  registry: CatalogEffectEntry[],
  pool: CardPool,
  deck: Card[],
  options?: { riseOfIx?: boolean }
): { entries: CatalogCardEntry[]; deckIds: string[] } {
  const byName = new Map<string, CatalogCardEntry>()
  const deckIds: string[] = []
  for (const card of deck) {
    const catalogId = `${pool}/${slugify(card.name)}`
    deckIds.push(catalogId)
    const existing = byName.get(card.name)
    if (existing) {
      existing.authorIds.push(card.id)
      continue
    }
    const effects: CatalogCardEntry['effects'] = {}
    effects.play = registerEffects(registry, 'card', catalogId, 'play', card.playEffect)
    effects.reveal = registerEffects(registry, 'card', catalogId, 'reveal', card.revealEffect)
    effects.trash = registerEffects(registry, 'card', catalogId, 'trash', card.trashEffect)
    if (card.acquireEffect) {
      const id = makeEffectId('card', catalogId, 'acquire', 0)
      registry.push({
        id,
        owner: { type: 'card', id: catalogId },
        slot: 'acquire',
        index: 0,
        reward: card.acquireEffect,
      })
      effects.acquire = id
    }
    const riseOfIx = options?.riseOfIx ?? card.riseOfIx
    byName.set(card.name, {
      id: catalogId,
      name: card.name,
      pool,
      cost: card.cost,
      factions: card.faction,
      agentIcons: card.agentIcons,
      infiltrate: card.infiltrate,
      unload: card.unload,
      riseOfIx,
      image: card.image,
      effects,
      authorIds: [card.id],
    })
  }
  return { entries: [...byName.values()], deckIds }
}

function buildSpaceEntries(registry: CatalogEffectEntry[]): CatalogSpaceEntry[] {
  return BOARD_SPACES.map((space: SpaceProps) => {
    const effectIds =
      registerEffects(registry, 'board-space', space.id, 'space', space.effects) ?? []
    // Spaces may carry a bare `reward` instead of `effects`; register it uniformly.
    if (space.reward && !space.effects?.length) {
      const id = makeEffectId('board-space', space.id, 'space', effectIds.length)
      registry.push({
        id,
        owner: { type: 'board-space', id: space.id },
        slot: 'space',
        index: effectIds.length,
        reward: space.reward,
      })
      effectIds.push(id)
    }
    return {
      id: space.id,
      name: space.name,
      agentIcon: space.agentIcon,
      conflictMarker: space.conflictMarker,
      cost: space.cost,
      influence: space.influence,
      requiresInfluence: space.requiresInfluence,
      makerSpace: space.makerSpace,
      controlMarker: space.controlMarker,
      controlBonus: space.controlBonus,
      specialEffect: space.specialEffect,
      maxAgents: space.maxAgents,
      image: space.image,
      riseOfIx: space.riseOfIx,
      gridSide: space.gridSide,
      effects: effectIds,
    }
  })
}

function buildTechTileEntries(tiles: TechTile[]): CatalogTechTileEntry[] {
  return tiles.map(tile => ({
    id: tile.id,
    name: tile.name,
    cost: tile.cost,
    image: tile.image,
    timing: tile.timing,
    description: tile.description,
    customEffect: tile.customEffect,
    acquireEffect: tile.acquireEffect,
    riseOfIx: true as const,
  }))
}

function buildIntrigueEntries(
  registry: CatalogEffectEntry[],
  cards: IntrigueCard[],
  riseOfIx?: boolean
): CatalogIntrigueEntry[] {
  return cards.map(card => ({
    id: card.id,
    name: card.name,
    type: card.type,
    description: card.description,
    image: card.image,
    targetPlayer: card.targetPlayer,
    riseOfIx,
    effects: {
      play: registerEffects(registry, 'intrigue', card.id, 'play', card.playEffect),
    },
  }))
}

export function buildCatalog(): Catalog {
  const effects: CatalogEffectEntry[] = []

  const starting = buildCardEntries(effects, 'starting', STARTING_DECK)
  const imperium = buildCardEntries(effects, 'imperium', IMPERIUM_ROW_DECK)
  const roiImperium = buildCardEntries(effects, 'imperium', RISE_OF_IX_IMPERIUM_DECK, {
    riseOfIx: true,
  })
  const liaison = buildCardEntries(effects, 'arrakis-liaison', ARRAKIS_LIAISON_DECK)
  const smf = buildCardEntries(effects, 'spice-must-flow', SPICE_MUST_FLOW_DECK)
  const foldspace = buildCardEntries(effects, 'foldspace', FOLDSPACE_DECK)

  const cards = [
    ...starting.entries,
    ...imperium.entries,
    ...roiImperium.entries,
    ...liaison.entries,
    ...smf.entries,
    ...foldspace.entries,
  ]

  const intrigue: CatalogIntrigueEntry[] = [
    ...buildIntrigueEntries(effects, intrigueCards),
    ...buildIntrigueEntries(effects, RISE_OF_IX_INTRIGUE_CARDS, true),
  ]

  const leaders: CatalogLeaderEntry[] = [
    ...LEADERS.map((leader: Leader) => ({
      id: LEADER_ICON_SLUGS[leader.name] ?? slugify(leader.name),
      name: leader.name,
      ability: leader.ability,
      signetRingText: leader.signetRingText,
      signetRingTitle: leader.signetRingTitle,
      complexity: leader.complexity,
      sogChoice: leader.sogChoice,
    })),
    ...RISE_OF_IX_LEADERS.map((leader: Leader) => ({
      id: LEADER_ICON_SLUGS[leader.name] ?? slugify(leader.name),
      name: leader.name,
      ability: leader.ability,
      signetRingText: leader.signetRingText,
      signetRingTitle: leader.signetRingTitle,
      complexity: leader.complexity,
      sogChoice: leader.sogChoice,
      riseOfIx: true as const,
    })),
  ]

  const conflicts: CatalogConflictEntry[] = [
    ...CONFLICTS.map(conflict => ({
      id: conflict.id,
      tier: conflict.tier,
      name: conflict.name,
      controlSpace: conflict.controlSpace,
      rewards: conflict.rewards,
    })),
    ...RISE_OF_IX_CONFLICTS.map(conflict => ({
      id: conflict.id,
      tier: conflict.tier,
      name: conflict.name,
      controlSpace: conflict.controlSpace,
      rewards: conflict.rewards,
      riseOfIx: true as const,
    })),
  ]

  const techTiles = buildTechTileEntries(TECH_TILES)
  const roiBoardSpaces = BOARD_SPACES.filter(space => space.riseOfIx)

  const expansions: CatalogExpansions = {
    available: ['riseOfIx'],
    byId: {
      riseOfIx: {
        id: 'riseOfIx',
        name: 'Rise of Ix',
        counts: {
          cards: roiImperium.entries.length,
          conflicts: RISE_OF_IX_CONFLICTS.length,
          leaders: RISE_OF_IX_LEADERS.length,
          intrigue: RISE_OF_IX_INTRIGUE_CARDS.length,
          boardSpaces: roiBoardSpaces.length,
          techTiles: techTiles.length,
        },
        decks: {
          imperium: roiImperium.deckIds,
        },
      },
    },
  }

  const catalog: Catalog = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    meta: {
      counts: {
        effects: effects.length,
        cards: cards.length,
        boardSpaces: BOARD_SPACES.length,
        conflicts: conflicts.length,
        intrigue: intrigue.length,
        leaders: leaders.length,
        techTiles: techTiles.length,
        expansions: expansions.available.length,
      },
    },
    effects,
    cards,
    decks: {
      starting: starting.deckIds,
      imperium: imperium.deckIds,
      'arrakis-liaison': liaison.deckIds,
      'spice-must-flow': smf.deckIds,
      foldspace: foldspace.deckIds,
    },
    boardSpaces: buildSpaceEntries(effects),
    conflicts,
    intrigue,
    leaders,
    techTiles,
    expansions,
    customEffects: Object.values(CustomEffect),
    choiceIdGrammar: {
      format: '<sourceType>-<sourceId>-<kind>[-<occurrence>]',
      sourceTypes: [
        'card',
        'board-space',
        'field',
        'control',
        'intrigue',
        'conflict',
        'high-council',
        'mentat',
        'masterstroke',
        'leader-ability',
        'memnon-high-council',
      ],
      kinds: [
        'OR',
        'CONFIRM',
        'INFLUENCE',
        'INFLUENCE-CHOOSE',
        'INFLUENCE-GAIN',
        'INFLUENCE-LOSE',
        'ACQUIRE',
        'ACQUIRE-OR',
        'CARD-SELECT',
        'SIGNET',
        'REWARD',
        'EFFECT',
        'COMBAT-PAID',
        'CONFLICT-REWARD-<placement>-p<playerId>',
        'URGENT-MISSION',
        'MASTER-TACTICIAN',
      ],
      // Each example is a real id the reducer can mint (not hypothetical occurrence
      // suffixes). Resolve OR/ACQUIRE choices with optionIndex, not extra id parts.
      examples: [
        'card-1036-OR', // Other Memory — choiceOpt play
        'card-1021-EFFECT', // Fremen Camp — optional spice→troops
        'card-1043-REWARD', // Reverend Mother Mohiam — custom pending reward
        'board-space-15-INFLUENCE', // Wealth — faction bump on agent
        'intrigue-4-INFLUENCE-CHOOSE', // Bribery — choose faction
        'intrigue-5-ACQUIRE-OR', // Bypass Protocol — acquire options
        'conflict-909-CONFLICT-REWARD-1st place-p0', // Machinations — choose faction
        'memnon-high-council-9-REWARD', // Earl Memnon at High Council
      ],
    },
  }
  // The catalog must survive JSON round-trips (it is published as a file).
  return JSON.parse(JSON.stringify(catalog)) as Catalog
}
