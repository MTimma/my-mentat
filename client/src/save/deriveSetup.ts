/**
 * Best-effort SetupBlock derivation from a live GameState (fallback when only
 * Player[] is available). Prefer buildSetupBlockFromConfiguration at game creation.
 */
import type { Player } from '../types/GameTypes'
import { LEADER_ICON_SLUGS } from '../data/leaders'
import { slugify } from '../catalog/buildCatalog'
import { catalogIdForCard } from './catalogIds'
import { normalizeStoredPlayerName } from '../utils/playerName'
import type { SetupBlock } from './types'

export interface DerivedSetup {
  setup: SetupBlock
  unmapped: string[]
}

export function deriveSetupBlock(
  players: Player[],
  firstPlayer: number,
  options: { sandbox?: boolean; initialConflictId?: number } = {}
): DerivedSetup {
  const unmapped: string[] = []

  const setup: SetupBlock = {
    firstPlayer,
    players: players.map(player => {
      const leaderId = LEADER_ICON_SLUGS[player.leader.name] ?? slugify(player.leader.name)
      if (!LEADER_ICON_SLUGS[player.leader.name]) unmapped.push(player.leader.name)
      const name = player.name ? normalizeStoredPlayerName(player.name) : ''
      return {
        id: player.id,
        leaderId,
        color: player.color,
        ...(name ? { name } : {}),
        deckCardIds: player.deck.map(card => {
          const catalogId = catalogIdForCard(card, 'starting')
          if (catalogId.startsWith('unknown/')) unmapped.push(card.name)
          return catalogId
        }),
      }
    }),
    ...(options.sandbox ? { sandbox: true } : {}),
    ...(options.initialConflictId != null
      ? { initialConflictId: options.initialConflictId }
      : {}),
  }

  return { setup, unmapped }
}
