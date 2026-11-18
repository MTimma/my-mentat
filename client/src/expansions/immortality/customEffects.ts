import type {
  Card,
  CardEffect,
  ChoiceOption,
  FixedOptionsChoice,
  GameState,
  Gain,
  PendingChoice,
  PendingReward,
  Player,
  Reward,
  SpaceProps,
} from '../../types/GameTypes'
import { ChoiceType, CustomEffect, GainSource } from '../../types/GameTypes'
import { nextSemanticId } from '../../utils/semanticIds'
import { getGraftPartner, resolveGraftCards } from './graft'

export interface ImmortalityPlayContext {
  state: GameState
  playerId: number
  card: Card
  space: SpaceProps
  currPlayer: Player
  pendingRewards: PendingReward[]
  pendingChoices: PendingChoice[]
  updatedGains: Gain[]
  addPendingReward: (reward: Reward, source: { type: GainSource; id: number; name: string }, isTrash?: boolean) => void
}

/** Auto-resolve on play (no pending reward). Returns updated state when mutated. */
export function applyImmortalityAutoCustom(
  custom: CustomEffect,
  ctx: ImmortalityPlayContext
): GameState | void {
  const { state, playerId, card } = ctx

  switch (custom) {
    case CustomEffect.CHAIRDOG_RETURN: {
      const graftCards = resolveGraftCards(state, ctx.currPlayer)
      const partner = getGraftPartner(graftCards, card)
      if (!partner) return
      const scheduled = { ...(state.scheduledGraftOnReveal ?? {}) }
      const list = [...(scheduled[playerId] ?? [])]
      list.push({
        type: 'chairdog-return',
        chairdogCardId: card.id,
        partnerCardId: partner.id,
        partnerName: partner.name,
        name: card.name,
      })
      scheduled[playerId] = list
      return { ...state, scheduledGraftOnReveal: scheduled }
    }
    case CustomEffect.USURP_GRAFT:
    case CustomEffect.GHOLA_COPY:
    case CustomEffect.BLANK_SLATE_ICONS:
      // Handled by graft selection / icon computation — no pending reward.
      return state
    case CustomEffect.TWISTED_MENTAT_RECALL:
      return {
        ...state,
        currTurn: state.currTurn
          ? { ...state.currTurn, canRecallPlacedAgent: true }
          : state.currTurn,
      }
    case CustomEffect.GUILD_IMPERSONATOR:
      // Arm the trigger; the reducer grants the influence on the first spice gain this turn.
      return {
        ...state,
        currTurn: state.currTurn
          ? { ...state.currTurn, guildImpersonatorSpiceInfluence: card.id }
          : state.currTurn,
      }
    default:
      return
  }
}

/** Queue pending rewards / choices for Immortality customs that need user input. */
export function queueImmortalityPendingCustom(custom: CustomEffect, ctx: ImmortalityPlayContext): void {
  const { card, currPlayer, state, space, pendingChoices, addPendingReward } = ctx
  const source = { type: GainSource.CARD, id: card.id, name: card.name }
  const graftCards = resolveGraftCards(state, currPlayer)
  const partner = getGraftPartner(graftCards, card)

  switch (custom) {
    case CustomEffect.DISSECTING_KIT:
      if (partner) {
        addPendingReward(
          { trash: 1, specimen: 1, custom: CustomEffect.DISSECTING_KIT },
          source,
          true
        )
      }
      break
    case CustomEffect.BEGUILING_PHEROMONES: {
      // Only fires on a Faction board space with a graft partner. The trash is a
      // normal pick-a-card reward so CLAIM_REWARD applies the influence too.
      const faction = space.influence?.faction
      if (faction && partner) {
        addPendingReward(
          { trash: 1, influence: { amounts: [{ faction, amount: 1 }] } },
          source,
          true
        )
      }
      break
    }
    case CustomEffect.STITCHED_HORROR: {
      // "Choose two" of four — one option per unordered pair.
      const options: ChoiceOption[] = [
        { reward: { water: 1, troops: 1 } },
        { reward: { water: 1, trash: 1 } },
        { reward: { water: 1, tleilaxu: 1 } },
        { reward: { troops: 1, trash: 1 } },
        { reward: { troops: 1, tleilaxu: 1 } },
        { reward: { trash: 1, tleilaxu: 1 } },
      ]
      const choice: FixedOptionsChoice = {
        id: nextSemanticId(source, 'OR', pendingChoices.map(c => c.id)),
        type: ChoiceType.FIXED_OPTIONS,
        prompt: 'Stitched Horror: choose two',
        options,
        source,
      }
      pendingChoices.push(choice)
      break
    }
    case CustomEffect.SLIG_FARMER:
      addPendingReward({ custom: CustomEffect.SLIG_FARMER }, source)
      break
    case CustomEffect.SHADOUT_MAPES:
      addPendingReward({ custom: CustomEffect.SHADOUT_MAPES, deployTroops: 1 }, source)
      break
    case CustomEffect.RECLAIMED_FORCES:
      addPendingReward({ custom: CustomEffect.RECLAIMED_FORCES }, source)
      break
    case CustomEffect.ORGAN_MERCHANTS:
      addPendingReward({ cost: { specimen: 1 }, solari: 4, custom: CustomEffect.ORGAN_MERCHANTS }, source)
      break
    case CustomEffect.TLEILAXU_SURGEON:
      addPendingReward({ cost: { troops: 2 }, specimen: 2, custom: CustomEffect.TLEILAXU_SURGEON }, source)
      break
    case CustomEffect.TLEILAXU_MASTER:
      addPendingReward({ custom: CustomEffect.TLEILAXU_MASTER }, source)
      break
    case CustomEffect.SCIENTIFIC_BREAKTHROUGH:
      // Trash and VP are one atomic reward so the card shows a single overlay.
      addPendingReward(
        { trashThisCard: true, victoryPoints: 1, custom: CustomEffect.SCIENTIFIC_BREAKTHROUGH },
        source,
        true
      )
      break
    case CustomEffect.IMPERIUM_CEREMONY:
    case CustomEffect.CLANDESTINE_MEETING:
    case CustomEffect.HIGH_PRIORITY_TRAVEL:
    case CustomEffect.LISAN_AL_GAIB:
    case CustomEffect.LONG_REACH:
    case CustomEffect.OCCUPATION_COMBAT:
    case CustomEffect.SHOW_OF_STRENGTH:
    case CustomEffect.STILLSUIT_MANUFACTURER:
      addPendingReward({ custom }, source)
      break
    default:
      addPendingReward({ custom }, source)
  }
}

/** Apply another card's agent-box effects with a different gain source (Ghola). */
export function gholaCopyPartnerPlayEffects(
  partner: Card,
  ghola: Card,
  applyEffect: (effect: CardEffect, sourceCard: Card) => void
): void {
  if (!partner.playEffect?.length) return
  for (const effect of partner.playEffect) {
    if (effect.reward.custom === CustomEffect.GHOLA_COPY) continue
    applyEffect(effect, ghola)
  }
}
