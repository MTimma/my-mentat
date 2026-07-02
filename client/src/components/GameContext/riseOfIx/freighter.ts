import {
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  Gain,
  GainSource,
  GameState,
  PendingChoice,
  PendingReward,
  Reward,
  RewardType,
} from '../../../types/GameTypes'
import { createGainInfluenceChoice } from '../../../utils/influenceChoices'
import { applyTroopTransportsToFreighterReward } from '../riseOfIxReducer'
import { nextSemanticId } from '../../../utils/semanticIds'

export type GainAttribution = { type: GainSource; id: number; name: string }

const RECALL_STEP2_INFLUENCE = {
  chooseOne: true as const,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.BENE_GESSERIT, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

export function isRiseOfIxEnabled(state: GameState): boolean {
  return Boolean(state.expansions?.riseOfIx)
}

export function seedFreighterStep<T extends { freighterStep?: 0 | 1 | 2 | 3 }>(
  player: T,
  riseOfIx: boolean
): T {
  if (!riseOfIx) return player
  return { ...player, freighterStep: player.freighterStep ?? 0 }
}

export function shippingTrackSource(name = 'Shipping track'): GainAttribution {
  return { type: GainSource.SHIPPING_TRACK, id: 0, name }
}

export function canFreighterAdvance(state: GameState, playerId: number): boolean {
  const player = state.players.find(p => p.id === playerId)
  return (player?.freighterStep ?? 0) < 3
}

export function isFreighterPendingChoice(choice: PendingChoice): choice is FixedOptionsChoice {
  return choice.type === ChoiceType.FIXED_OPTIONS && choice.prompt.startsWith('Freighter (now at ')
}

export function buildFreighterChoiceOptions(
  state: GameState,
  playerId: number
): FixedOptionsChoice['options'] {
  const options: FixedOptionsChoice['options'] = []
  if (canFreighterAdvance(state, playerId)) {
    options.push({
      reward: { custom: CustomEffect.FREIGHTER_ADVANCE },
      rewardLabel: 'Advance',
    })
  }
  options.push({
    reward: { custom: CustomEffect.FREIGHTER_RECALL },
    rewardLabel: 'Recall',
  })
  return options
}

/** Rebuild Advance/Recall options on unresolved freighter choices after step changes. */
export function refreshPendingFreighterChoices(
  state: GameState,
  playerId: number,
  pendingChoices: PendingChoice[]
): PendingChoice[] {
  const player = state.players.find(p => p.id === playerId)
  const step = player?.freighterStep ?? 0
  return pendingChoices.map(choice => {
    if (!isFreighterPendingChoice(choice)) return choice
    return {
      ...choice,
      prompt: `Freighter (now at ${step}/3)`,
      options: buildFreighterChoiceOptions(state, playerId),
    }
  })
}

export function pushFreighterChoice(
  state: GameState,
  playerId: number,
  source: GainAttribution,
  pendingChoices: PendingChoice[],
  existingChoiceIds: Iterable<string>,
  /** When enqueueing multiple icons in one batch, assume prior choices advanced. */
  effectiveStep?: number
): void {
  const player = state.players.find(p => p.id === playerId)
  const step = effectiveStep ?? player?.freighterStep ?? 0
  const canAdvance = step < 3
  const choiceId = nextSemanticId(source, 'FREIGHTER', existingChoiceIds)
  const options: FixedOptionsChoice['options'] = []
  if (canAdvance) {
    options.push({
      reward: { custom: CustomEffect.FREIGHTER_ADVANCE },
      rewardLabel: 'Advance',
    })
  }
  options.push({
    reward: { custom: CustomEffect.FREIGHTER_RECALL },
    rewardLabel: 'Recall',
  })
  const choice: FixedOptionsChoice = {
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: `Freighter (now at ${step}/3)`,
    source,
    options,
  }
  pendingChoices.push(choice)
}

/** Push N Advance/Recall choices for `freighter: number`. */
export function pushFreighterChoicesFromReward(
  state: GameState,
  count: number,
  playerId: number,
  source: GainAttribution,
  pendingChoices: PendingChoice[]
): void {
  if (!isRiseOfIxEnabled(state) || count <= 0) return
  const player = state.players.find(p => p.id === playerId)
  let simulatedStep = player?.freighterStep ?? 0
  for (let i = 0; i < count; i++) {
    pushFreighterChoice(
      state,
      playerId,
      source,
      pendingChoices,
      pendingChoices.map(c => c.id),
      simulatedStep
    )
    if (simulatedStep < 3) simulatedStep = Math.min(3, simulatedStep + 1) as 0 | 1 | 2 | 3
  }
}

export function enqueueRecallStep1Choice(
  pendingChoices: PendingChoice[],
  existingChoiceIds: Iterable<string>
): void {
  const shippingSource = shippingTrackSource('Recall step 1')
  const choiceId = nextSemanticId(shippingSource, 'RECALL-STEP1', existingChoiceIds)
  const choice: FixedOptionsChoice = {
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Recall reward (step 1): Dividends or +2 spice?',
    source: shippingSource,
    options: [
      { reward: { dividends: true } },
      { reward: { spice: 2 } },
    ],
  }
  pendingChoices.push(choice)
}

/** Enqueue recall rewards for steps 1..currentStep (inclusive). */
export function enqueueRecallBundle(
  state: GameState,
  playerId: number,
  currentStep: number,
  pendingChoices: PendingChoice[],
  pendingRewards: PendingReward[]
): void {
  if (currentStep < 1) return

  const choiceIds = () => pendingChoices.map(c => c.id)
  const rewardIds = () => pendingRewards.map(r => r.id)
  const shippingSource = shippingTrackSource()

  if (currentStep >= 1) {
    enqueueRecallStep1Choice(pendingChoices, choiceIds())
  }
  if (currentStep >= 2) {
    pendingRewards.push({
      id: nextSemanticId(shippingSource, 'RECALL-TROOPS', rewardIds()),
      source: shippingSource,
      reward: applyTroopTransportsToFreighterReward(state, playerId, 2),
      isTrash: false,
    })
    pendingChoices.push(
      createGainInfluenceChoice(
        RECALL_STEP2_INFLUENCE,
        shippingSource,
        'Recall reward (step 2): choose faction for +1 influence',
        choiceIds()
      )
    )
  }
  if (currentStep >= 3) {
    pendingRewards.push({
      id: nextSemanticId(shippingSource, 'RECALL-TECH', rewardIds()),
      source: shippingSource,
      reward: { acquireTech: { discount: 2 } },
      isTrash: false,
    })
  }
}

export function applyFreighterAdvance(
  state: GameState,
  playerId: number,
  source: GainAttribution
): { players: GameState['players']; gains: Gain[] } {
  if (!canFreighterAdvance(state, playerId)) {
    return { players: state.players, gains: state.gains }
  }
  const gains = [...state.gains]
  const players = state.players.map(p => {
    if (p.id !== playerId) return p
    const prev = p.freighterStep ?? 0
    const next = Math.min(3, prev + 1) as 0 | 1 | 2 | 3
    gains.push({
      round: state.currentRound,
      playerId,
      source: source.type,
      sourceId: source.id,
      name: 'Advance',
      amount: 1,
      type: RewardType.FREIGHTER,
    })
    return { ...p, freighterStep: next }
  })
  return { players, gains }
}

export function applyFreighterRecall(
  state: GameState,
  playerId: number,
  source: GainAttribution,
  pendingChoices: PendingChoice[],
  pendingRewards: PendingReward[]
): {
  players: GameState['players']
  gains: Gain[]
  pendingChoices: PendingChoice[]
  pendingRewards: PendingReward[]
} {
  const player = state.players.find(p => p.id === playerId)
  const step = player?.freighterStep ?? 0
  const gains = [...state.gains]
  gains.push({
    round: state.currentRound,
    playerId,
    source: source.type,
    sourceId: source.id,
    name: 'Recall',
    amount: -step,
    type: RewardType.FREIGHTER,
  })

  const newPendingChoices = [...pendingChoices]
  const newPendingRewards = [...pendingRewards]
  enqueueRecallBundle(state, playerId, step, newPendingChoices, newPendingRewards)

  const players = state.players.map(p =>
    p.id === playerId ? { ...p, freighterStep: 0 as const } : p
  )

  return {
    players,
    gains,
    pendingChoices: newPendingChoices,
    pendingRewards: newPendingRewards,
  }
}

export function applyDividendsReward(
  state: GameState,
  activePlayerId: number,
  source: GainAttribution
): { players: GameState['players']; gains: Gain[] } {
  const gains = [...state.gains]
  const players = state.players.map(p => {
    const amt = p.id === activePlayerId ? 5 : 1
    gains.push({
      round: state.currentRound,
      playerId: p.id,
      source: source.type,
      sourceId: source.id,
      name: 'Dividends',
      amount: amt,
      type: RewardType.SOLARI,
    })
    return { ...p, solari: p.solari + amt }
  })
  return { players, gains }
}

export function hasAvailableTechTile(state: GameState): boolean {
  const stacks = state.ixBoard?.stacks ?? []
  return stacks.some(stack => stack.length > 0 && Boolean(stack[0]))
}

/** Strip freighter from a compound reward; returns fields remaining for pending reward enqueue. */
export function stripFreighterFromReward(reward: Reward): Reward {
  const { freighter: _f, ...rest } = reward
  return rest
}

export function rewardHasFreighter(reward: Reward): boolean {
  return reward.freighter !== undefined
}
