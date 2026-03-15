import {
  GameState,
  Card,
  OptionalEffect,
  PendingChoice,
  PendingReward,
  GainSource,
  CustomEffect,
  FactionType,
} from '../types/GameTypes'
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

/** Factions where at least one opponent has strictly more influence than the current player. */
function factionsWhereOpponentLeads(state: GameState, playerId: number): { faction: FactionType; amount: number }[] {
  const factions = Object.values(FactionType) as FactionType[]
  return factions.filter((faction) => {
    const playerInfluence = state.factionInfluence[faction]?.[playerId] ?? 0
    const opponentIds = state.players.filter((p) => p.id !== playerId).map((p) => p.id)
    const maxOpponentInfluence = Math.max(
      0,
      ...opponentIds.map((id) => state.factionInfluence[faction]?.[id] ?? 0)
    )
    return maxOpponentInfluence > playerInfluence
  }).map((faction) => ({ faction, amount: 1 }))
}

export const SIGNET_RING_EFFECTS: Record<string, (ctx: SignetRingContext) => SignetRingResult> = {
  [LEADER_NAMES.COUNTESS_ARIANA_THORVALD]: (_ctx) => ({
    pendingRewards: [
      { reward: { water: 1 }, source: SIGNET_RING_SOURCE, isTrash: false },
    ],
  }),
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
  [LEADER_NAMES.BEAST_RABBAN]: (ctx) => {
    const hasAlliance = Object.values(ctx.state.factionAlliances).includes(ctx.playerId)
    return {
      pendingRewards: [
        {
          reward: { troops: hasAlliance ? 2 : 1 },
          source: SIGNET_RING_SOURCE,
          isTrash: false,
        },
      ],
    }
  },
  [LEADER_NAMES.HELENA_RICHESE]: (_ctx) => ({
    pendingRewards: [
      {
        reward: { custom: CustomEffect.HELENA_SIGNET_RING },
        source: SIGNET_RING_SOURCE,
        isTrash: false,
      },
    ],
  }),
  [LEADER_NAMES.COUNT_ILBAN_RICHESE]: (_ctx) => ({
    pendingRewards: [
      { reward: { solari: 1 }, source: SIGNET_RING_SOURCE, isTrash: false },
    ],
  }),
  [LEADER_NAMES.DUKE_LETO]: (ctx) => {
    const influenceAmounts = factionsWhereOpponentLeads(ctx.state, ctx.playerId)
    if (influenceAmounts.length === 0) return {}
    return {
      optionalEffects: [
        {
          id: `signet-ring-${ctx.card.id}-${crypto.randomUUID()}`,
          cost: { spice: 1 },
          reward: {
            influence: { amounts: influenceAmounts, chooseOne: true },
          },
          source: SIGNET_RING_SOURCE,
        },
      ],
    }
  },
  [LEADER_NAMES.EARL_MEMNON_THORVALD]: (_ctx) => ({
    pendingRewards: [
      { reward: { spice: 1 }, source: SIGNET_RING_SOURCE, isTrash: false },
    ],
  }),
  [LEADER_NAMES.PAUL_ATREIDES]: (_ctx) => ({
    pendingRewards: [
      { reward: { drawCards: 1 }, source: SIGNET_RING_SOURCE, isTrash: false },
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
