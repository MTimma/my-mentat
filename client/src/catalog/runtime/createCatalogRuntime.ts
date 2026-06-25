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
import type { CatalogCardEntry, CatalogEffectEntry } from '../buildCatalog'
import type { ResolvedGamePack } from '../../gamePacks/types'
import { mergeCatalogOverlay, type BaseCatalogSlices, type MergedCatalogSlices } from '../mergeCatalogOverlay'
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

const baseSlices: BaseCatalogSlices = {
  effects: (effectsFile as EffectsCatalogFile).effects,
  cards: (cardsFile as CardsCatalogFile).cards,
  decks: (cardsFile as CardsCatalogFile).decks,
  boardSpaces: (boardSpacesFile as BoardSpacesCatalogFile).boardSpaces,
  conflicts: (conflictsFile as ConflictsCatalogFile).conflicts,
  intrigue: (intrigueFile as IntrigueCatalogFile).intrigue,
}

const expansionsCatalog = expansionsFile as {
  expansions: { byId: Record<string, { decks: { imperium: string[] } }> }
}

export interface CatalogRuntime {
  slices: MergedCatalogSlices
  resolveCatalogCardIds(catalogIds: string[]): Card[]
  buildImperiumDeck(expansions?: Expansions): Card[]
  boardSpaces: SpaceProps[]
  conflicts: ConflictCard[]
  intrigueCards: IntrigueCard[]
  getEffectById(effectId: string): CatalogEffectEntry | undefined
  getCatalogCardById(catalogId: string): CatalogCardEntry | undefined
}

function asCardEffect(entry: CatalogEffectEntry): CardEffect {
  const effect: CardEffect = {
    requirement: entry.requirement as CardEffect['requirement'],
    cost: entry.cost as CardEffect['cost'],
    reward: entry.reward as CardEffect['reward'],
    choiceOpt: entry.choiceOpt,
    timing: entry.timing as CardEffect['timing'],
    phase: entry.phase as CardEffect['phase'],
  }
  if (entry.beforePlaceAgent) {
    ;(effect as PlayEffect).beforePlaceAgent = entry.beforePlaceAgent
  }
  return effect
}

function buildRuntimeFromSlices(slices: MergedCatalogSlices): CatalogRuntime {
  const effectsById = new Map<string, CatalogEffectEntry>(
    slices.effects.map(effect => [effect.id, effect])
  )
  const cardsByCatalogId = new Map<string, CatalogCardEntry>(
    slices.cards.map(card => [card.id, card])
  )

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

  function resolveCopyInstanceId(entry: CatalogCardEntry, copyIndex: number): number {
    if (copyIndex < entry.authorIds.length) {
      return entry.authorIds[copyIndex]
    }
    const base = entry.authorIds[entry.authorIds.length - 1]
    const overflow = copyIndex - entry.authorIds.length + 1
    return base * 1_000_000 + overflow
  }

  function resolveCatalogCardIds(catalogIds: string[]): Card[] {
    const consumed = new Map<string, number>()
    return catalogIds.map(catalogId => {
      const entry = cardsByCatalogId.get(catalogId)
      if (!entry) throw new Error(`Unknown catalog card id: ${catalogId}`)
      const nth = consumed.get(catalogId) ?? 0
      consumed.set(catalogId, nth + 1)
      return hydrateCardTemplate(entry, resolveCopyInstanceId(entry, nth))
    })
  }

  function buildImperiumDeck(expansions: Expansions = NO_EXPANSIONS): Card[] {
    let nextId = 2000
    const catalogIds = [...slices.decks.imperium]
    if (expansions.riseOfIx) {
      catalogIds.push(...expansionsCatalog.expansions.byId.riseOfIx.decks.imperium)
    }
    const pool = resolveCatalogCardIds(catalogIds)
    return pool.map(card => ({
      ...card,
      id: nextId++,
    }))
  }

  type CatalogSpaceCatalogEntry = BoardSpacesCatalogFile['boardSpaces'][number]

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

  const boardSpaces = slices.boardSpaces.map(hydrateBoardSpace)
  const intrigueCards = slices.intrigue.filter(entry => !entry.riseOfIx).map(hydrateIntrigue)

  return {
    slices,
    resolveCatalogCardIds,
    buildImperiumDeck,
    boardSpaces,
    conflicts: slices.conflicts,
    intrigueCards,
    getEffectById: (effectId: string) => effectsById.get(effectId),
    getCatalogCardById: (catalogId: string) => cardsByCatalogId.get(catalogId),
  }
}

/** Build a catalog runtime, optionally applying a resolved game pack overlay. */
export function createCatalogRuntime(pack?: ResolvedGamePack): CatalogRuntime {
  const merged = mergeCatalogOverlay(baseSlices, pack)
  return buildRuntimeFromSlices(merged)
}

/** Default runtime (no game pack overlay) — matches pre–game-pack behavior. */
export const defaultCatalogRuntime = createCatalogRuntime()
