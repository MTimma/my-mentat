import { GameState, Card, OptionalEffect, PendingChoice, PendingReward, GainSource } from '../types/GameTypes'
import { LEADER_NAMES } from './leaders'

export interface SignetRingContext {
  state: GameState
  playerId: number
  card: Card
}

export interface SignetRingResult {
  optionalEffects?: OptionalEffect[]
  pendingChoices?: PendingChoice[]
  pendingRewards?: Array<{ reward: PendingReward['reward']; source: PendingReward['source']; isTrash?: boolean }>
}

const SIGNET_RING_SOURCE = { type: GainSource.CARD as const, id: 10, name: 'Signet Ring' }

export const SIGNET_RING_EFFECTS: Record<string, (ctx: SignetRingContext) => SignetRingResult> = {
  [LEADER_NAMES.BARON_VLADIMIR]: (ctx) => ({
    optionalEffects: [
      {
        id: `signet-ring-${ctx.card.id}-${crypto.randomUUID()}`,
        cost: { solari: 1 },
        reward: { intrigueCards: 1 },
        source: SIGNET_RING_SOURCE,
      },
    ],
  }),
}

export function resolveSignetRingEffect(
  state: GameState,
  playerId: number,
  card: Card
): SignetRingResult {
  const leaderName = state.players.find((p) => p.id === playerId)?.leader?.name
  const handler = SIGNET_RING_EFFECTS[leaderName ?? '']
  return handler ? handler({ state, playerId, card }) : {}
}
