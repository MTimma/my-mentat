import {
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  OptionalEffect,
} from '../types/GameTypes'
import { LEADER_NAMES } from './leaders'
import { mintId } from '../utils/semanticIds'
import type { SignetRingContext, SignetRingResult } from './signetRingEffects'
import { buildArmandSignetAcquireChoice } from './leaderAbilities/armandTrashInPlay'
import { factionsWithSnooper } from './leaderAbilities/tessiaSnoopers'
import { buildMayOptionalEffect } from '../components/GameContext/riseOfIx/optionalMayEffects'

const SIGNET_RING_SOURCE = { type: GainSource.CARD, id: 10, name: 'Signet Ring' }

const ALL_FACTION_AMOUNTS = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
].map(faction => ({ faction, amount: 1 }))

export const RISE_OF_IX_SIGNET_RING_EFFECTS: Record<
  string,
  (ctx: SignetRingContext) => SignetRingResult
> = {
  [LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS]: (ctx) => {
    const source = SIGNET_RING_SOURCE
    const optionalEffects: OptionalEffect[] = []
    const acquire = buildMayOptionalEffect(
      ctx.state,
      ctx.playerId,
      source,
      { reward: { acquireTech: {} } },
      optionalEffects.map(e => e.id)
    )
    if (acquire) optionalEffects.push(acquire)
    const negotiator = buildMayOptionalEffect(
      ctx.state,
      ctx.playerId,
      source,
      { reward: { techNegotiator: 1 } },
      optionalEffects.map(e => e.id)
    )
    if (negotiator) optionalEffects.push(negotiator)
    return optionalEffects.length > 0 ? { optionalEffects } : {}
  },

  [LEADER_NAMES.VISCOUNT_HUDRO_MORITANI]: (ctx) => ({
    optionalEffects: [
      {
        id: mintId(ctx.state, { type: GainSource.CARD, id: ctx.card.id }, 'SIGNET'),
        cost: { spice: 1 },
        reward: { custom: CustomEffect.FREIGHTER_ADVANCE },
        source: SIGNET_RING_SOURCE,
      },
    ],
  }),

  [LEADER_NAMES.PRINCESS_YUNA_MORITANI]: (ctx) => {
    const choiceId = mintId(ctx.state, { type: GainSource.CARD, id: ctx.card.id }, 'SIGNET')
    const choice: FixedOptionsChoice = {
      id: choiceId,
      type: ChoiceType.FIXED_OPTIONS,
      prompt: '7 Solari → +1 influence, +1 spice, +1 troop',
      source: SIGNET_RING_SOURCE,
      options: [
        {
          cost: { solari: 7 },
          reward: {
            troops: 1,
            spice: 1,
            influence: { chooseOne: true, amounts: ALL_FACTION_AMOUNTS },
          },
          rewardLabel: 'Pay 7 Solari',
        },
      ],
    }
    return { pendingChoices: [choice] }
  },

  [LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ]: (ctx) => ({
    pendingChoices: [buildArmandSignetAcquireChoice(ctx.state, ctx.playerId, ctx.card)],
  }),

  [LEADER_NAMES.ILESA_ECAZ]: (ctx) => ({
    optionalEffects: [
      {
        id: mintId(ctx.state, { type: GainSource.CARD, id: ctx.card.id }, 'SIGNET'),
        cost: { solari: 1 },
        reward: { custom: CustomEffect.ACQUIRE_FOLDSPACE },
        source: SIGNET_RING_SOURCE,
      },
    ],
  }),

  [LEADER_NAMES.TESSIA_VERNIUS]: (ctx) => {
    const player = ctx.state.players.find(p => p.id === ctx.playerId)
    if (!player) return {}
    const snooperFactions = factionsWithSnooper(player)
    if (snooperFactions.length === 0) return {}
    const optionalEffects: OptionalEffect[] = [
      {
        id: mintId(ctx.state, { type: GainSource.CARD, id: ctx.card.id }, 'SIGNET'),
        cost: { influence: { chooseOne: true, amounts: ALL_FACTION_AMOUNTS } },
        reward: {
          influence: {
            chooseOne: true,
            amounts: snooperFactions.map(faction => ({ faction, amount: 1 })),
          },
        },
        source: SIGNET_RING_SOURCE,
      },
    ]
    return { optionalEffects }
  },
}
