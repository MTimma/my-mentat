import {
  AUTO_APPLIED_CUSTOM_EFFECTS,
  Card,
  CardEffect,
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  GameState,
  OptionalEffect,
  PendingChoice,
  PendingReward,
  Reward,
  RewardType,
  TurnType,
} from '../../../types/GameTypes'
import { revealRequirementSatisfied } from '../requirements'
import { nextSemanticId } from '../../../utils/semanticIds'
import { applyDeployTroopsAllowance } from '../../../utils/troops'
import {
  isRiseOfIxEnabled,
  pushFreighterChoicesFromReward,
  rewardHasFreighter,
  stripFreighterFromReward,
  type GainAttribution,
} from './freighter'
import {
  applyDesertAmbush,
  applyFullScaleDreadSwords,
  applyImperialBasharSwords,
  applyIxianEngineerVp,
  applyNegotiatedWithdrawal,
  applyShockTrooperBonus,
  markMandatoryDeploy,
} from '../riseOfIxReducer'

export type UnloadReason = 'discard' | 'trash'

export function unloadSource(card: Card): GainAttribution {
  return { type: GainSource.CARD, id: card.id, name: `${card.name} (Unload)` }
}

export function shouldFireUnload(state: GameState, playerId: number): boolean {
  if (!isRiseOfIxEnabled(state)) return false
  const player = state.players.find(p => p.id === playerId)
  if (!player || player.revealed) return false
  if (state.currTurn?.type === TurnType.REVEAL) return false
  return true
}

export function fireUnloadIfApplicable(
  state: GameState,
  playerId: number,
  card: Card,
  _reason: UnloadReason
): GameState {
  if (!card.unload || !shouldFireUnload(state, playerId)) return state
  return applyUnloadRevealEffects(state, playerId, card)
}

/** Fire a single card's revealEffect[] as if unloaded (before Reveal turn). */
export function applyUnloadRevealEffects(
  state: GameState,
  playerId: number,
  card: Card
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const source = unloadSource(card)
  const revealedCards = [card]
  let nextState: GameState = { ...state, gains: [...state.gains] }
  let nextPlayer = { ...player }
  const pendingRewards: PendingReward[] = [...state.pendingRewards]
  const pendingChoices: PendingChoice[] = [...(state.currTurn?.pendingChoices ?? [])]
  const optionalEffects: OptionalEffect[] = [...(state.currTurn?.optionalEffects ?? [])]
  let persuasionDelta = 0
  let deployTurn = {
    ...(state.currTurn ?? { playerId, type: TurnType.ACTION }),
    canDeployTroops: state.currTurn?.canDeployTroops ?? false,
    troopLimit: state.currTurn?.troopLimit ?? 0,
    theseTroopsDeployLimit: state.currTurn?.theseTroopsDeployLimit ?? 0,
  }
  let mandatoryDeployTroops = state.currTurn?.mandatoryDeployTroops ?? false

  const addPendingReward = (reward: Reward, isTrash = false) => {
    let r = reward
    if (rewardHasFreighter(r) && isRiseOfIxEnabled(nextState)) {
      const freighterCount = typeof r.freighter === 'number' ? r.freighter : 0
      pushFreighterChoicesFromReward(nextState, freighterCount, playerId, source, pendingChoices)
      const rest = stripFreighterFromReward(r)
      if (Object.keys(rest).length === 0) return
      r = rest
    }
    const rewardId = nextSemanticId(source, 'REWARD', pendingRewards.map(pr => pr.id))
    pendingRewards.push({ id: rewardId, source, reward: r, isTrash })
  }

  const choiceEffects: CardEffect[] = []

  card.revealEffect
    ?.filter((effect: CardEffect) => {
      if (effect.choiceOpt) {
        if (
          effect.reward?.custom &&
          AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)
        ) {
          return true
        }
        choiceEffects.push(effect)
        return false
      }
      if (effect.cost) {
        const effectId = nextSemanticId(source, 'EFFECT', optionalEffects.map(e => e.id))
        optionalEffects.push({
          id: effectId,
          cost: effect.cost,
          reward: effect.reward,
          source,
        })
        return false
      }
      return revealRequirementSatisfied(effect, card, nextState, playerId, revealedCards)
    })
    .forEach(effect => {
      if (effect.reward?.persuasion) {
        nextState.gains.push({
          round: nextState.currentRound,
          playerId,
          sourceId: card.id,
          name: source.name,
          amount: effect.reward.persuasion,
          type: RewardType.PERSUASION,
          source: GainSource.CARD,
        })
        persuasionDelta += effect.reward.persuasion
      }
      if (effect.reward?.combat) {
        nextState.gains.push({
          round: nextState.currentRound,
          playerId,
          sourceId: card.id,
          name: source.name,
          amount: effect.reward.combat,
          type: RewardType.COMBAT,
          source: GainSource.CARD,
        })
      }
      if (effect.reward?.spice) addPendingReward({ spice: effect.reward.spice })
      if (effect.reward?.water) addPendingReward({ water: effect.reward.water })
      if (effect.reward?.solari) addPendingReward({ solari: effect.reward.solari })
      if (effect.reward?.intrigueCards) {
        addPendingReward({ intrigueCards: effect.reward.intrigueCards })
      }
      if (effect.reward?.drawCards) addPendingReward({ drawCards: effect.reward.drawCards })
      if (effect.reward?.freighter !== undefined && isRiseOfIxEnabled(nextState)) {
        addPendingReward({ freighter: effect.reward.freighter })
      }
      if (effect.reward?.trash && !effect.reward?.trashThisCard) {
        addPendingReward(
          { trash: effect.reward.trash, trashThisCard: effect.reward.trashThisCard },
          true
        )
      }
      if (effect.reward?.deployTroops) {
        nextState.gains.push({
          round: nextState.currentRound,
          playerId,
          sourceId: card.id,
          name: source.name,
          amount: effect.reward.deployTroops,
          type: RewardType.DEPLOY,
          source: GainSource.CARD,
        })
        deployTurn = applyDeployTroopsAllowance(
          deployTurn,
          effect.reward.deployTroops,
          effect.reward
        )
        if (card.name === 'Treachery') {
          nextState = markMandatoryDeploy(nextState)
          mandatoryDeployTroops = true
        }
      }
      if (effect.reward?.custom) {
        switch (effect.reward.custom) {
          case CustomEffect.LIET_KYNES: {
            const fremenInPlay = nextPlayer.playArea.filter(c =>
              c.faction?.includes(FactionType.FREMEN)
            ).length
            const fremenInUnload = revealedCards.filter(c =>
              c.faction?.includes(FactionType.FREMEN)
            ).length
            const gainedPersuasion = (fremenInPlay + fremenInUnload) * 2
            persuasionDelta += gainedPersuasion
            nextState.gains.push({
              round: nextState.currentRound,
              playerId,
              sourceId: card.id,
              name: source.name,
              amount: gainedPersuasion,
              type: RewardType.PERSUASION,
              source: GainSource.CARD,
            })
            break
          }
          case CustomEffect.DESERT_AMBUSH:
            nextState = applyDesertAmbush(nextState, playerId, card.id, source.name)
            break
          case CustomEffect.IMPERIAL_BASHAR_SWORDS:
            nextState = applyImperialBasharSwords(
              nextState,
              playerId,
              card.id,
              source.name,
              revealedCards
            )
            break
          case CustomEffect.SHOCKTROOPER_EM_BONUS:
            nextState = applyShockTrooperBonus(nextState, playerId, card.id, source.name)
            break
          case CustomEffect.FULLSCALE_DREAD_SWORDS:
            nextState = applyFullScaleDreadSwords(nextState, playerId, card.id, source.name)
            break
          case CustomEffect.IXIAN_ENGINEER_VP:
            nextState = applyIxianEngineerVp(nextState, playerId, card.id, source.name)
            break
          case CustomEffect.NEGOTIATED_WITHDRAWAL:
            nextState = applyNegotiatedWithdrawal(nextState, playerId, card.id, source.name)
            break
          case CustomEffect.GUILD_BANKERS:
            addPendingReward({ custom: effect.reward.custom })
            break
          default:
            break
        }
      }
    })

  if (choiceEffects.length > 0) {
    const choiceId = nextSemanticId(source, 'OR', pendingChoices.map(c => c.id))
    const options = choiceEffects.map(effect => {
      let disabled = false
      if (effect.reward?.custom === CustomEffect.OTHER_MEMORY) {
        const hasBG = nextPlayer.discardPile.some(c =>
          c.faction?.includes(FactionType.BENE_GESSERIT)
        )
        disabled = !hasBG
      }
      return { cost: effect.cost, reward: effect.reward!, disabled }
    })
    const fixedOptionsChoice: FixedOptionsChoice = {
      id: choiceId,
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one reward',
      options,
      source,
    }
    pendingChoices.push(fixedOptionsChoice)
  }

  nextPlayer.persuasion += persuasionDelta

  const currTurn = state.currTurn
    ? {
        ...state.currTurn,
        pendingChoices,
        optionalEffects,
        canDeployTroops: deployTurn.canDeployTroops || state.currTurn.canDeployTroops,
        troopLimit: Math.max(deployTurn.troopLimit ?? 0, state.currTurn.troopLimit ?? 0),
        theseTroopsDeployLimit: Math.max(
          deployTurn.theseTroopsDeployLimit ?? 0,
          state.currTurn.theseTroopsDeployLimit ?? 0
        ),
        mandatoryDeployTroops: mandatoryDeployTroops || state.currTurn.mandatoryDeployTroops,
        persuasionCount: (state.currTurn.persuasionCount ?? 0) + persuasionDelta,
      }
    : {
        playerId,
        type: TurnType.ACTION,
        pendingChoices,
        optionalEffects,
        canDeployTroops: deployTurn.canDeployTroops,
        troopLimit: deployTurn.troopLimit,
        theseTroopsDeployLimit: deployTurn.theseTroopsDeployLimit,
        removableTroops: 0,
        troopsDeployedToConflict: 0,
        troopsRetreatedFromConflict: 0,
        gainsStartIndex: state.gains.length,
        persuasionCount: persuasionDelta,
        gainedEffects: [],
        acquiredCards: [],
      }

  const hasPendingWork =
    pendingChoices.length > 0 || pendingRewards.some(r => !r.disabled)

  return {
    ...nextState,
    players: nextState.players.map(p => (p.id === playerId ? nextPlayer : p)),
    pendingRewards,
    currTurn,
    canEndTurn: hasPendingWork ? false : state.canEndTurn,
  }
}
