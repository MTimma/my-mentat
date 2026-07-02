import {
  ChoiceType,
  GainSource,
  type FixedOptionsChoice,
  type GameState,
  type OptionalEffect,
  type PendingChoice,
  type Reward,
} from '../../../types/GameTypes'
import { getTechTile } from '../../../data/techTiles'
import type { Player } from '../../../types/GameTypes'
import { canPlayerAffordTechTile } from '../../../utils/techTiles'
import type { TechAcquireSourceOption } from './techAcquireOffer'
import { getTechAcquireSourceOptions } from './techAcquireOffer'
import { SIGNET_RING_PROMPT } from './boardSpaceChoices'

function hasMeaningfulRewardBesidesAcquireTech(reward: Reward): boolean {
  if (reward.spice || reward.water || reward.solari) return true
  if (reward.troops || reward.deployTroops || reward.techNegotiator) return true
  if (reward.drawCards || reward.intrigueCards || reward.persuasion || reward.combat) return true
  if (reward.victoryPoints || reward.trash || reward.trashThisCard) return true
  if (reward.acquire || reward.mentat || reward.custom) return true
  if (reward.influence?.amounts?.length) return true
  return false
}

/** Optional effect whose only reward is Acquire Tech — handled via tech tile clicks instead. */
export function isAcquireTechOnlyOptional(effect: OptionalEffect): boolean {
  return effect.reward.acquireTech !== undefined && !hasMeaningfulRewardBesidesAcquireTech(effect.reward)
}

export function isAcquireTechOnlyChoiceOption(option: { reward: Reward }): boolean {
  return option.reward.acquireTech !== undefined && !hasMeaningfulRewardBesidesAcquireTech(option.reward)
}

export function filterAcquireTechOptionalEffects(effects: OptionalEffect[]): OptionalEffect[] {
  return effects.filter(effect => !isAcquireTechOnlyOptional(effect))
}

export function filterAcquireTechFromChoices(choices: PendingChoice[]): PendingChoice[] {
  return choices.flatMap(choice => {
    if (choice.type !== ChoiceType.FIXED_OPTIONS) return [choice]
    const fixed = choice as FixedOptionsChoice
    const options = fixed.options.filter(option => !isAcquireTechOnlyChoiceOption(option))
    if (options.length === 0) return []
    if (options.length === fixed.options.length) return [choice]
    return [{ ...fixed, options }]
  })
}

/** Tech Negotiation / Rhombur signet OR choices render inline in the play area, not a modal. */
export function isPlayAreaInlineTechOrSignetChoice(choice: PendingChoice): boolean {
  if (choice.type !== ChoiceType.FIXED_OPTIONS) return false
  const prompt = (choice as FixedOptionsChoice).prompt
  return prompt === SIGNET_RING_PROMPT || prompt === 'Tech Negotiation'
}

/** Map a filtered choice option back to its index in the live pending choice. */
export function findOriginalOptionIndex(
  originalOptions: FixedOptionsChoice['options'],
  selected: FixedOptionsChoice['options'][number]
): number {
  const idx = originalOptions.findIndex(o => choiceOptionsMatch(o, selected))
  return idx >= 0 ? idx : originalOptions.indexOf(selected)
}

function choiceOptionsMatch(
  a: FixedOptionsChoice['options'][number],
  b: FixedOptionsChoice['options'][number]
): boolean {
  if (a.disabled !== b.disabled) return false
  const ar = a.reward
  const br = b.reward
  if (ar.techNegotiator !== br.techNegotiator) return false
  if (Boolean(ar.acquireTech) !== Boolean(br.acquireTech)) return false
  if ((ar.acquireTech?.discount ?? 0) !== (br.acquireTech?.discount ?? 0)) return false
  if (ar.custom !== br.custom) return false
  return JSON.stringify(ar) === JSON.stringify(br)
}

/** Tech acquire source tied to a play-area effect card source, if any. */
export function findTechAcquireOptionForEffectSource(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string }
): TechAcquireSourceOption | undefined {
  const options = getTechAcquireSourceOptions(state, playerId)
  if (options.length === 0) return undefined

  if (source.type === GainSource.CARD && source.name === SIGNET_RING_PROMPT) {
    return options.find(option => option.kind === 'signet-ring')
  }

  return options.find(option => {
    if (option.pendingChoice?.source.type === source.type && option.pendingChoice.source.id === source.id) {
      return true
    }
    if (option.pendingOptionalEffectId) {
      const optional = state.currTurn?.optionalEffects?.find(
        effect => effect.id === option.pendingOptionalEffectId
      )
      return optional?.source.type === source.type && optional.source.id === source.id
    }
    if (option.pendingRewardId) {
      const reward = state.pendingRewards?.find(entry => entry.id === option.pendingRewardId)
      return reward?.source.type === source.type && reward?.source.id === source.id
    }
    if (source.type === GainSource.BOARD_SPACE && option.kind === 'board-space') {
      return option.label === source.name
    }
    return false
  })
}

/** Whether the player can afford at least one face-up tech tile with this acquire source. */
export function canAffordAnyFaceUpTech(
  state: GameState,
  player: Player,
  sourceOption: TechAcquireSourceOption
): boolean {
  const stacks = state.ixBoard?.stacks ?? []
  return stacks.some(stack => {
    const faceUpId = stack[0]
    if (!faceUpId) return false
    const tile = getTechTile(faceUpId)
    if (!tile) return false
    return canPlayerAffordTechTile(player, tile.cost, {
      discount: sourceOption.discount,
      paySolariInsteadOfSpice: sourceOption.paySolariInsteadOfSpice,
    })
  })
}
