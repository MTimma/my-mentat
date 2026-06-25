import { BOARD_SPACES } from '../../../data/boardSpaces'
import {
  ChoiceType,
  CustomEffect,
  FactionType,
  Gain,
  GainSource,
  RewardType,
  TurnType,
  type GameState,
  type IntrigueCard,
  type PendingChoice,
  type Player,
  type Reward,
} from '../../../types/GameTypes'
import { countSpiceMustFlowCards } from '../../../utils/spiceMustFlow'
import { unitsInConflictForPlayer } from '../../../utils/dreadnoughts'
import { syncCombatStrengthForPlayer } from '../../../utils/dreadnoughtLifecycle'
import { createGainInfluenceChoice } from '../../../utils/influenceChoices'
import { nextSemanticId } from '../../../utils/semanticIds'
import {
  isRiseOfIxEnabled,
  pushFreighterChoicesFromReward,
  type GainAttribution,
} from './freighter'

export function evaluateGrandConspiracy(state: GameState, playerId: number): number {
  const p = state.players.find(x => x.id === playerId)
  if (!p) return 0
  const cond1 =
    (p.dreadnoughts?.garrison ?? 0) + (p.dreadnoughts?.control?.length ?? 0) >= 2
  const cond2 = countSpiceMustFlowCards(p) >= 1
  const cond3 =
    [
      FactionType.EMPEROR,
      FactionType.SPACING_GUILD,
      FactionType.BENE_GESSERIT,
      FactionType.FREMEN,
    ].filter(f => (state.factionInfluence[f]?.[playerId] ?? 0) >= 4).length >= 2
  const cond4 = p.hasHighCouncilSeat
  const trueCount = [cond1, cond2, cond3, cond4].filter(Boolean).length
  if (trueCount >= 4) return 2
  if (trueCount >= 3) return 1
  return 0
}

export function agentFactionsThisTurn(state: GameState, playerId: number): FactionType[] {
  const spaceId = state.currTurn?.agentSpaceId
  if (spaceId == null) return []
  const space = BOARD_SPACES.find(s => s.id === spaceId)
  if (!space?.influence?.faction) return []
  return [space.influence.faction]
}

export function agentFactionsOnBoard(state: GameState, playerId: number): FactionType[] {
  const factions = new Set<FactionType>()
  for (const [sid, occ] of Object.entries(state.occupiedSpaces)) {
    if (!occ.includes(playerId)) continue
    const space = BOARD_SPACES.find(s => s.id === Number(sid))
    if (space?.influence?.faction) factions.add(space.influence.faction)
  }
  return [...factions]
}

function pushGain(
  gains: Gain[],
  state: GameState,
  playerId: number,
  source: GainAttribution,
  amount: number,
  type: RewardType,
  name?: string
): void {
  gains.push({
    round: state.currentRound,
    playerId,
    sourceId: source.id,
    name: name ?? source.name,
    amount,
    type,
    source: source.type,
  })
}

function retreatOneOpponentDreadnought(state: GameState, opponentId: number): GameState {
  const player = state.players.find(p => p.id === opponentId)
  if (!player?.dreadnoughts || player.dreadnoughts.conflict <= 0) return state
  const next = {
    ...state,
    players: state.players.map(p =>
      p.id === opponentId && p.dreadnoughts
        ? {
            ...p,
            dreadnoughts: {
              ...p.dreadnoughts,
              conflict: p.dreadnoughts.conflict - 1,
              garrison: p.dreadnoughts.garrison + 1,
            },
          }
        : p
    ),
  }
  return syncCombatStrengthForPlayer(next, opponentId)
}

export function applyCannonTurrets(state: GameState, playerId: number, source: GainAttribution): GameState {
  if (!isRiseOfIxEnabled(state)) return state
  let next = state
  for (const p of state.players) {
    if (p.id === playerId) continue
    if ((p.dreadnoughts?.conflict ?? 0) > 0) {
      next = retreatOneOpponentDreadnought(next, p.id)
      const gains = [...next.gains]
      pushGain(gains, next, p.id, source, -1, RewardType.DREADNOUGHT, 'Cannon Turrets retreat')
      next = { ...next, gains }
    }
  }
  return next
}

export function applyQuidProQuo(state: GameState, playerId: number, source: GainAttribution): GameState {
  const factions = agentFactionsOnBoard(state, playerId)
  if (factions.length === 0) return state
  let next: GameState = { ...state, gains: [...state.gains], factionInfluence: { ...state.factionInfluence } }
  for (const faction of factions) {
    const track = { ...(next.factionInfluence[faction] ?? {}) }
    track[playerId] = (track[playerId] ?? 0) + 1
    next = { ...next, factionInfluence: { ...next.factionInfluence, [faction]: track } }
    pushGain(next.gains, next, playerId, source, 1, RewardType.INFLUENCE, faction)
  }
  return next
}

export function applyStrongarmInfluence(
  state: GameState,
  playerId: number,
  faction: FactionType,
  source: GainAttribution
): GameState {
  const track = { ...(state.factionInfluence[faction] ?? {}) }
  track[playerId] = (track[playerId] ?? 0) + 1
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, 1, RewardType.INFLUENCE, faction)
  return {
    ...state,
    gains,
    factionInfluence: { ...state.factionInfluence, [faction]: track },
  }
}

export function applyEndgameIntrigueCustom(
  state: GameState,
  playerId: number,
  custom: CustomEffect,
  card: IntrigueCard
): GameState {
  const source: GainAttribution = { type: GainSource.INTRIGUE, id: card.id, name: card.name }
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  let vp = 0
  if (custom === CustomEffect.WAR_CHEST && player.solari >= 10) vp = 1
  if (custom === CustomEffect.MACHINE_CULTURE && (player.tech?.length ?? 0) >= 3) vp = 1
  if (custom === CustomEffect.GRAND_CONSPIRACY) vp = evaluateGrandConspiracy(state, playerId)

  if (vp <= 0) return state

  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, vp, RewardType.VICTORY_POINTS)
  return {
    ...state,
    gains,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, victoryPoints: p.victoryPoints + vp } : p
    ),
  }
}

export function applyRiseOfIxIntrigueCustomInEffect(
  state: GameState,
  playerId: number,
  custom: CustomEffect,
  card: IntrigueCard,
  pushGain: (amount: number, type: RewardType) => void
): GameState {
  if (!isRiseOfIxEnabled(state)) return state
  const source: GainAttribution = { type: GainSource.INTRIGUE, id: card.id, name: card.name }

  switch (custom) {
    case CustomEffect.CANNON_TURRETS:
      return applyCannonTurrets(state, playerId, source)
    case CustomEffect.STRATEGIC_PUSH:
      return {
        ...state,
        pendingVictorSolariThisCombat: {
          ...(state.pendingVictorSolariThisCombat ?? {}),
          [playerId]: true,
        },
      }
    case CustomEffect.SECOND_WAVE:
      return {
        ...state,
        pendingSecondWave: playerId,
        currTurn: {
          ...(state.currTurn ?? { playerId, type: TurnType.ACTION }),
          playerId,
          canDeployTroops: true,
          troopLimit:
            2 +
            (state.currTurn?.removableTroops ?? 0) +
            (state.currTurn?.removableDreadnoughts ?? 0),
        },
      }
    case CustomEffect.ADVANCED_WEAPONRY: {
      const player = state.players.find(p => p.id === playerId)
      const techCount = player?.tech?.length ?? 0
      if (techCount < 3 || !playerHasUnitsInCombatLocal(state, playerId)) return state
      const nextStrength = {
        ...state.combatStrength,
        [playerId]: (state.combatStrength[playerId] ?? 0) + 4,
      }
      pushGain(4, RewardType.COMBAT)
      return { ...state, combatStrength: nextStrength }
    }
    case CustomEffect.DIVERSION:
      return {
        ...state,
        currTurn: {
          ...(state.currTurn ?? { playerId, type: TurnType.ACTION }),
          diversionActive: true,
          diversionFreighterGranted: false,
        },
      }
    case CustomEffect.QUID_PRO_QUO:
    case CustomEffect.STRONGARM:
      return state
    case CustomEffect.WAR_CHEST:
    case CustomEffect.MACHINE_CULTURE:
    case CustomEffect.GRAND_CONSPIRACY:
      return applyEndgameIntrigueCustom(state, playerId, custom, card)
    default:
      return state
  }
}

function playerHasUnitsInCombatLocal(state: GameState, playerId: number): boolean {
  return unitsInConflictForPlayer(state, playerId) > 0
}

export function enqueueStrongarmChoice(
  state: GameState,
  playerId: number,
  card: IntrigueCard,
  pendingChoices: PendingChoice[]
): void {
  const factions = agentFactionsThisTurn(state, playerId)
  if (factions.length === 0) return
  const source: GainAttribution = { type: GainSource.INTRIGUE, id: card.id, name: card.name }
  if (factions.length === 1) {
    pendingChoices.push({
      id: nextSemanticId(source, 'STRONGARM', pendingChoices.map(c => c.id)),
      type: ChoiceType.FIXED_OPTIONS,
      prompt: `Strongarm: +1 ${factions[0]} influence`,
      options: [{ reward: { influence: { amounts: [{ faction: factions[0], amount: 1 }] } } }],
      source,
    })
    return
  }
  pendingChoices.push(
    createGainInfluenceChoice(
      {
        chooseOne: true,
        amounts: factions.map(f => ({ faction: f, amount: 1 })),
      },
      source,
      'Strongarm: choose a faction for +1 influence',
      pendingChoices.map(c => c.id)
    )
  )
}

export function checkDiversionAfterDeployChange(state: GameState, playerId: number): GameState {
  if (!isRiseOfIxEnabled(state) || !state.currTurn) return state
  const units = unitsInConflictForPlayer(state, playerId)
  const turn = state.currTurn

  if (turn.diversionActive && !turn.diversionFreighterGranted && units >= 4) {
    const player = state.players.find(p => p.id === playerId)
    const stepBefore = (player?.freighterStep ?? 0) as 0 | 1 | 2 | 3
    const pendingBefore = new Set((turn.pendingChoices ?? []).map(c => c.id))
    const source = { type: GainSource.INTRIGUE, id: 0, name: 'Diversion' }
    const pendingChoices = [...(turn.pendingChoices ?? [])]
    pushFreighterChoicesFromReward(state, 1, playerId, source, pendingChoices)
    const diversionFreighterChoiceIds = pendingChoices
      .map(c => c.id)
      .filter(id => !pendingBefore.has(id))
    return {
      ...state,
      currTurn: {
        ...turn,
        diversionActive: false,
        diversionFreighterGranted: true,
        diversionFreighterStepBefore: stepBefore,
        diversionFreighterChoiceIds,
        pendingChoices,
      },
      canEndTurn: false,
    }
  }

  if (turn.diversionFreighterGranted && units < 4) {
    const player = state.players.find(p => p.id === playerId)
    const stepBefore = turn.diversionFreighterStepBefore ?? (player?.freighterStep ?? 0)
    const diversionChoiceIds = new Set(turn.diversionFreighterChoiceIds ?? [])
    const players = state.players.map(p =>
      p.id === playerId ? { ...p, freighterStep: stepBefore as 0 | 1 | 2 | 3 } : p
    )
    const gains = [...state.gains]
    pushGain(gains, state, playerId, { type: GainSource.INTRIGUE, id: 0, name: 'Diversion revert' }, -1, RewardType.FREIGHTER)
    const pendingChoices = (turn.pendingChoices ?? []).filter(
      c => !diversionChoiceIds.has(c.id) && !c.prompt.startsWith('Freighter')
    )
    return {
      ...state,
      players,
      gains,
      currTurn: {
        ...turn,
        diversionFreighterGranted: false,
        diversionActive: true,
        diversionFreighterStepBefore: undefined,
        diversionFreighterChoiceIds: undefined,
        pendingChoices,
      },
    }
  }

  return state
}

export function grantStrategicPushSolari(state: GameState, winnerId: number): GameState {
  if (!state.pendingVictorSolariThisCombat?.[winnerId]) return state
  const card = state.intrigueDiscard.find(c =>
    c.playEffect?.some(e => e.reward?.custom === CustomEffect.STRATEGIC_PUSH)
  )
  const sourceId = card?.id ?? 0
  const gains = [...(state.gains ?? [])]
  pushGain(
    gains,
    state,
    winnerId,
    { type: GainSource.INTRIGUE, id: sourceId, name: 'Strategic Push' },
    2,
    RewardType.SOLARI
  )
  return {
    ...state,
    gains,
    players: state.players.map(p =>
      p.id === winnerId ? { ...p, solari: p.solari + 2 } : p
    ),
    pendingVictorSolariThisCombat: {
      ...(state.pendingVictorSolariThisCombat ?? {}),
      [winnerId]: false,
    },
  }
}

export function intrigueEffectNeedsDeferral(effect: { cost?: { discard?: number }; reward?: Reward }): boolean {
  if (effect.cost?.discard) return true
  if (effect.reward?.trash) return true
  if (effect.reward?.freighter !== undefined) return true
  if (effect.reward?.acquireTech !== undefined) return true
  if (effect.reward?.dreadnoughts) return true
  return false
}

export function canPlayStrongarm(state: GameState, playerId: number): boolean {
  return agentFactionsThisTurn(state, playerId).length > 0
}

export function playerMeetsAdvancedWeaponryPlot(player: Player): boolean {
  return player.solari >= 3
}
