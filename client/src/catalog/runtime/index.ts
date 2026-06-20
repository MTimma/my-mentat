/**
 * Runtime game data hydrated from published catalogs (public/catalogs/*.v1.json).
 * Authoring still lives in src/data/* — run `npm run generate:catalogs` to refresh JSON.
 */
import type {
  AgentIcon,
  Card,
  CardEffect,
  ConflictCard,
  Expansions,
  FactionType,
  IntrigueCard,
  IntrigueCardType,
  PlayEffect,
  RevealEffect,
  SpaceProps,
} from '../../types/GameTypes'
import { NO_EXPANSIONS } from '../../types/GameTypes'
import { type CatalogCardEntry, type CatalogEffectEntry } from '../buildCatalog'
import cardsFile from '../../../public/catalogs/cards.v1.json'
import effectsFile from '../../../public/catalogs/effects.v1.json'
import boardSpacesFile from '../../../public/catalogs/board-spaces.v1.json'
import conflictsFile from '../../../public/catalogs/conflicts.v1.json'
import intrigueFile from '../../../public/catalogs/intrigue.v1.json'
import expansionsFile from '../../../public/catalogs/expansions.v1.json'
import type {
  BoardSpacesCatalogFile,
  CardsCatalogFile,
  ConflictsCatalogFile,
  EffectsCatalogFile,
  IntrigueCatalogFile,
} from './types'

const cardsCatalog = cardsFile as CardsCatalogFile
const effectsCatalog = effectsFile as EffectsCatalogFile
const boardSpacesCatalog = boardSpacesFile as BoardSpacesCatalogFile
const conflictsCatalog = conflictsFile as ConflictsCatalogFile
const intrigueCatalog = intrigueFile as IntrigueCatalogFile
const expansionsCatalog = expansionsFile as {
  expansions: { byId: Record<string, { decks: { imperium: string[] } }> }
}

const effectsById = new Map<string, CatalogEffectEntry>(
  effectsCatalog.effects.map(effect => [effect.id, effect])
)

const cardsByCatalogId = new Map<string, CatalogCardEntry>(
  cardsCatalog.cards.map(card => [card.id, card])
)

function asCardEffect(entry: CatalogEffectEntry): CardEffect {
  return {
    requirement: entry.requirement as CardEffect['requirement'],
    cost: entry.cost as CardEffect['cost'],
    reward: entry.reward as CardEffect['reward'],
    choiceOpt: entry.choiceOpt,
    timing: entry.timing as CardEffect['timing'],
    phase: entry.phase as CardEffect['phase'],
  }
}

function resolveEffectIds(ids: string[] | undefined): CardEffect[] | undefined {
  if (!ids?.length) return undefined
  return ids.map(id => {
    const entry = effectsById.get(id)
    if (!entry) throw new Error(`Missing catalog effect: ${id}`)
    return asCardEffect(entry)
  })
}

function hydrateCardTemplate(entry: CatalogCardEntry, instanceId: number): Card {
  const acquireEffectId = entry.effects.acquire
  const acquireEntry = acquireEffectId ? effectsById.get(acquireEffectId) : undefined
  return {
    id: instanceId,
    name: entry.name,
    image: entry.image,
    faction: entry.factions as FactionType[] | undefined,
    cost: entry.cost,
    agentIcons: entry.agentIcons as AgentIcon[],
    infiltrate: entry.infiltrate,
    unload: entry.unload,
    riseOfIx: entry.riseOfIx,
    playEffect: resolveEffectIds(entry.effects.play) as PlayEffect[] | undefined,
    revealEffect: resolveEffectIds(entry.effects.reveal) as RevealEffect[] | undefined,
    trashEffect: resolveEffectIds(entry.effects.trash),
    acquireEffect: acquireEntry?.reward as Card['acquireEffect'],
  }
}

/** Resolve ordered catalog card ids to instances (deterministic copy ids). */
export function resolveCatalogCardIds(catalogIds: string[]): Card[] {
  const consumed = new Map<string, number>()
  return catalogIds.map(catalogId => {
    const entry = cardsByCatalogId.get(catalogId)
    if (!entry) throw new Error(`Unknown catalog card id: ${catalogId}`)
    const nth = consumed.get(catalogId) ?? 0
    consumed.set(catalogId, nth + 1)
    const copyId = entry.authorIds[Math.min(nth, entry.authorIds.length - 1)]
    return hydrateCardTemplate(entry, copyId)
  })
}

function buildPoolDeck(pool: keyof CardsCatalogFile['decks']): Card[] {
  return resolveCatalogCardIds(cardsCatalog.decks[pool])
}

export const STARTING_DECK: Card[] = buildPoolDeck('starting')
export const ARRAKIS_LIAISON_DECK: Card[] = buildPoolDeck('arrakis-liaison')
export const SPICE_MUST_FLOW_DECK: Card[] = buildPoolDeck('spice-must-flow')
export const FOLDSPACE_DECK: Card[] = buildPoolDeck('foldspace')

/** Unique imperium templates (base game only — excludes Rise of Ix). */
export const IMPERIUM_ROW_DECK: Card[] = cardsCatalog.cards
  .filter(card => card.pool === 'imperium' && !card.riseOfIx)
  .map(card => hydrateCardTemplate(card, card.authorIds[0]))

export const ALL_IMPERIUM_ROW_CARDS: Card[] = [...IMPERIUM_ROW_DECK]

export function buildImperiumDeck(expansions: Expansions = NO_EXPANSIONS): Card[] {
  let nextId = 2000
  const catalogIds = [...cardsCatalog.decks.imperium]
  if (expansions.riseOfIx) {
    catalogIds.push(...expansionsCatalog.expansions.byId.riseOfIx.decks.imperium)
  }
  const pool = resolveCatalogCardIds(catalogIds)
  return pool.map(card => ({
    ...card,
    id: nextId++,
  }))
}

function hydrateBoardSpace(entry: CatalogSpaceCatalogEntry): SpaceProps {
  const effects = resolveEffectIds(entry.effects)
  return {
    id: entry.id,
    name: entry.name,
    agentIcon: entry.agentIcon as AgentIcon,
    conflictMarker: entry.conflictMarker,
    cost: entry.cost as SpaceProps['cost'],
    influence: entry.influence as SpaceProps['influence'],
    requiresInfluence: entry.requiresInfluence as SpaceProps['requiresInfluence'],
    makerSpace: entry.makerSpace as SpaceProps['makerSpace'],
    controlMarker: entry.controlMarker as SpaceProps['controlMarker'],
    controlBonus: entry.controlBonus as SpaceProps['controlBonus'],
    specialEffect: entry.specialEffect as SpaceProps['specialEffect'],
    maxAgents: entry.maxAgents,
    image: entry.image,
    riseOfIx: entry.riseOfIx,
    gridSide: entry.gridSide,
    effects: effects as SpaceProps['effects'],
  }
}

type CatalogSpaceCatalogEntry = BoardSpacesCatalogFile['boardSpaces'][number]

export const BOARD_SPACES: SpaceProps[] = boardSpacesCatalog.boardSpaces.map(hydrateBoardSpace)

export const CONFLICTS: ConflictCard[] = conflictsCatalog.conflicts

function hydrateIntrigue(entry: IntrigueCatalogFile['intrigue'][number]): IntrigueCard {
  return {
    id: entry.id,
    name: entry.name,
    image: entry.image,
    agentIcons: [],
    type: entry.type as IntrigueCardType,
    description: entry.description,
    targetPlayer: entry.targetPlayer,
    playEffect: resolveEffectIds(entry.effects.play) as IntrigueCard['playEffect'],
  }
}

export const INTRIGUE_CARDS: IntrigueCard[] = intrigueCatalog.intrigue
  .filter(entry => !entry.riseOfIx)
  .map(hydrateIntrigue)

export function getEffectById(effectId: string): CatalogEffectEntry | undefined {
  return effectsById.get(effectId)
}

export function getCatalogCardById(catalogId: string): CatalogCardEntry | undefined {
  return cardsByCatalogId.get(catalogId)
}
