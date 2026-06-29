/**
 * Builds the initial GameState from a SetupBlock (catalog ids → instances).
 * Single shared genesis used by both the recorder (live games) and the loader
 * (replaying saved games). Mirrors the state construction in App.tsx /
 * GameStateSetup so a replayed genesis equals a live one.
 *
 * Instance-id assignment is deterministic:
 * - player deck cards reuse the authored copy ids of their template, consumed
 *   in catalog `authorIds` order (duplicates get successive copy ids);
 * - the imperium deck is re-id'd sequentially from 2000 (same as
 *   buildImperiumDeck) in the order given by the setup block.
 */
import {
  Card,
  FactionType,
  GamePhase,
  GameState,
  Leader,
  Player,
  normalizeExpansions,
} from '../types/GameTypes'
import { getConflictPool } from '../data/conflicts'
import { getLeaderPool, LEADER_ICON_SLUGS } from '../data/leaders'
import { getStartingSpice, getStartingSolari } from '../data/leaderAbilities/beastSetup'
import { getStartingWater, isYunaLeader } from '../data/leaderAbilities/yunaSolariBonus'
import { getStartingIntrigue } from '../data/leaderAbilities/hudroSetup'
import { seedTessiaSnoopers } from '../data/leaderAbilities/tessiaSnoopers'
import { applyStarterDeckReservationToImperium } from '../services/starterDeckSetup'
import { buildIntrigueDeck } from '../services/IntrigueDeckService'
import { seedImmortalitySetup } from '../expansions/immortality/setup'
import { defaultDreadnoughtsForExpansions } from '../utils/dreadnoughts'
import { seedTroopSupply } from '../utils/troops'
import { buildInitialIxBoard } from '../components/GameContext/riseOfIxReducer'
import { getFreshDefaultGameState } from '../components/GameContext/GameContext'
import { slugify } from '../catalog/buildCatalog'
import { createCatalogRuntime, type CatalogRuntime } from '../catalog/runtime'
import { inferGamePackId } from '../gamePacks/inferGamePack'
import { resolveGamePack, GamePackResolutionError } from '../gamePacks/resolveGamePack'
import type { SetupBlock } from './types'

export class SetupResolutionError extends Error {}

function resolveLeader(leaderId: string, expansions = normalizeExpansions()): Leader {
  const pool = getLeaderPool(expansions)
  const leader = pool.find(
    l => (LEADER_ICON_SLUGS[l.name] ?? slugify(l.name)) === leaderId
  )
  if (!leader) throw new SetupResolutionError(`Unknown leader id: ${leaderId}`)
  return leader
}

function resolveCards(runtime: CatalogRuntime, catalogIds: string[]): Card[] {
  try {
    return runtime.resolveCatalogCardIds(catalogIds)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown catalog card id:')) {
      const catalogId = error.message.slice('Unknown catalog card id: '.length)
      throw new SetupResolutionError(`Unknown card: ${catalogId}`)
    }
    throw error
  }
}

/** Imperium deck instances re-id'd from 2000 (mirrors buildImperiumDeck). */
function resolveImperiumDeck(
  runtime: CatalogRuntime,
  catalogIds: string[] | undefined,
  expansions = normalizeExpansions()
): Card[] {
  if (catalogIds) {
    return buildImperiumDeckFromCatalogIds(runtime, catalogIds)
  }
  return runtime.buildImperiumDeck(expansions)
}

function buildImperiumDeckFromCatalogIds(runtime: CatalogRuntime, catalogIds: string[]): Card[] {
  let nextId = 2000
  return runtime.resolveCatalogCardIds(catalogIds).map(card => ({ ...card, id: nextId++ }))
}

export function buildInitialState(setup: SetupBlock): GameState {
  const base = getFreshDefaultGameState()
  const gamePackId = inferGamePackId(setup)

  let resolvedPack
  try {
    resolvedPack = resolveGamePack(gamePackId)
  } catch (error) {
    if (error instanceof GamePackResolutionError) {
      throw new SetupResolutionError(error.message)
    }
    throw error
  }

  const runtime = createCatalogRuntime(resolvedPack)
  const expansions = resolvedPack.structure.expansions
  const boardSet = resolvedPack.structure.boardSet ?? 'imperium'

  const players: Player[] = setup.players.map(playerSetup => {
    const leader = resolveLeader(playerSetup.leaderId, expansions)
    const deck = resolveCards(runtime, playerSetup.deckCardIds)
    const res = playerSetup.startingResources
    const basePlayer: Player = {
      id: playerSetup.id,
      leader,
      color: playerSetup.color,
      spice: res?.spice ?? getStartingSpice(leader),
      // Yuna always starts with 0 water (leader ability); ignore a mistaken saved default of 1.
      water: isYunaLeader(leader) ? 0 : (res?.water ?? getStartingWater(leader)),
      solari: res?.solari ?? getStartingSolari(leader),
      troops: res?.troops ?? 3,
      combatValue: 0,
      agents: 2,
      handCount: 5,
      intrigueCount: getStartingIntrigue(leader),
      deck,
      discardPile: [],
      trash: [],
      hasHighCouncilSeat: false,
      hasSwordmaster: false,
      playArea: [],
      persuasion: 0,
      victoryPoints: res?.victoryPoints ?? 1,
      revealed: false,
      ...(defaultDreadnoughtsForExpansions(expansions)
        ? { dreadnoughts: defaultDreadnoughtsForExpansions(expansions) }
        : {}),
      ...(expansions.riseOfIx
        ? { freighterStep: 0 as const, negotiatorsOnIx: 0, tech: [] as const }
        : {}),
    }
    return seedTessiaSnoopers(seedTroopSupply(basePlayer), expansions.riseOfIx)
  })

  let imperiumRowDeck = resolveImperiumDeck(runtime, setup.imperiumRowDeckCardIds, expansions)
  imperiumRowDeck = applyStarterDeckReservationToImperium(
    imperiumRowDeck,
    players.map(p => p.deck)
  )

  let imperiumRow: Card[] = []
  if (setup.imperiumRowCardIds?.length) {
    const rowIds = [...setup.imperiumRowCardIds]
    const deck = [...imperiumRowDeck]
    imperiumRow = rowIds.map(catalogId => {
      const slug = catalogId.split('/')[1]
      const idx = deck.findIndex(card => slugify(card.name) === slug)
      if (idx < 0) throw new SetupResolutionError(`Imperium row card not in deck: ${catalogId}`)
      return deck.splice(idx, 1)[0]
    })
    imperiumRowDeck = deck
  }

  const state: GameState = {
    ...base,
    expansions,
    boardSet,
    intrigueDeck: [...buildIntrigueDeck(expansions)],
    players,
    currentRound: setup.currentRound ?? 1,
    firstPlayerMarker: setup.firstPlayer,
    activePlayerId: setup.firstPlayer,
    phase: GamePhase.ROUND_START,
    imperiumRowDeck,
    imperiumRow,
    factionInfluence: {
      [FactionType.EMPEROR]: Object.fromEntries(players.map(p => [p.id, 0])),
      [FactionType.SPACING_GUILD]: Object.fromEntries(players.map(p => [p.id, 0])),
      [FactionType.BENE_GESSERIT]: Object.fromEntries(players.map(p => [p.id, 0])),
      [FactionType.FREMEN]: Object.fromEntries(players.map(p => [p.id, 0])),
    },
  }

  if (setup.initialConflictId != null) {
    const conflict = getConflictPool(expansions).find(c => c.id === setup.initialConflictId)
    if (!conflict) {
      throw new SetupResolutionError(`Unknown conflict id: ${setup.initialConflictId}`)
    }
    state.currentConflict = JSON.parse(JSON.stringify(conflict))
  }

  if (setup.sandbox) {
    ;(state as GameState & { sandboxSetup?: boolean }).sandboxSetup = true
  }

  if (expansions.riseOfIx && !setup.sandbox) {
    state.ixBoard = buildInitialIxBoard()
  }

  if (expansions.immortality) {
    seedImmortalitySetup(state)
  }

  return state
}
