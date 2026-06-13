/**
 * Build a SetupBlock from the game-creation UI (catalog ids + optional overrides).
 * This is the canonical "game input" genesis — App stores it inside a SaveDoc.
 */
import type { Card, Player } from '../types/GameTypes'
import { LEADER_ICON_SLUGS } from '../data/leaders'
import { slugify } from '../catalog/buildCatalog'
import { catalogIdForCard, catalogIdsForCards } from './catalogIds'
import type { PlayerSetupBlock, SetupBlock } from './types'

export interface BuildSetupBlockInput {
  players: Player[]
  firstPlayer: number
  imperiumRowDeck: Card[]
  currentRound?: number
  initialConflictId?: number
  sandbox?: boolean
}

export interface BuiltSetupBlock {
  setup: SetupBlock
  /** Names that could not be mapped to a known catalog id. */
  unmapped: string[]
}

export function buildSetupBlockFromConfiguration(
  input: BuildSetupBlockInput
): BuiltSetupBlock {
  const unmapped: string[] = []

  const players: PlayerSetupBlock[] = input.players.map(player => {
    const leaderId = LEADER_ICON_SLUGS[player.leader.name] ?? slugify(player.leader.name)
    if (!LEADER_ICON_SLUGS[player.leader.name]) unmapped.push(player.leader.name)

    const deckCardIds = player.deck.map(card => {
      const id = catalogIdForCard(card, 'starting')
      if (id.startsWith('unknown/')) unmapped.push(card.name)
      return id
    })

    const startingResources = {
      spice: player.spice,
      water: player.water,
      solari: player.solari,
      troops: player.troops,
      victoryPoints: player.victoryPoints,
    }

    return {
      id: player.id,
      leaderId,
      color: player.color,
      deckCardIds,
      startingResources,
    }
  })

  const imperiumRowDeckCardIds = catalogIdsForCards(input.imperiumRowDeck, 'imperium')
  imperiumRowDeckCardIds.forEach((id, i) => {
    if (id.startsWith('unknown/')) unmapped.push(input.imperiumRowDeck[i].name)
  })

  const setup: SetupBlock = {
    firstPlayer: input.firstPlayer,
    players,
    imperiumRowDeckCardIds,
    ...(input.currentRound != null && input.currentRound !== 1
      ? { currentRound: input.currentRound }
      : {}),
    ...(input.initialConflictId != null ? { initialConflictId: input.initialConflictId } : {}),
    ...(input.sandbox ? { sandbox: true } : {}),
  }

  return { setup, unmapped: [...new Set(unmapped)] }
}
