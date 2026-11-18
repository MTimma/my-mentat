import type {
  Gain,
  GameState,
  PendingChoice,
  Player,
} from '../../types/GameTypes'
import { FactionType, GainSource, RewardType } from '../../types/GameTypes'
import type { InfluenceMilestoneMeta } from '../../utils/influenceVictoryPoints'

/**
 * Turn-scoped triggers that depend on gains produced by any action. Each trigger
 * receives the state before and after the reducer action; inactive triggers
 * return `after` unchanged.
 */
export type TurnTrigger = (before: GameState, after: GameState) => GameState

/**
 * Helpers the triggers need from the reducer. Passed in by `GameContext` so this
 * module stays free of circular imports.
 */
export interface TurnTriggerDeps {
  applyInfluenceDeltaForPlayer: (
    state: GameState,
    player: Player,
    faction: FactionType,
    delta: number,
    options?: { appendGainsTo?: Gain[]; milestoneMeta?: InfluenceMilestoneMeta }
  ) => { state: GameState; player: Player; tessiaChoices: PendingChoice[] }
  withRecruitedTroopsDeployLimit: (state: GameState, amount: number) => GameState
  appendTessiaPendingChoices: (state: GameState, choices: PendingChoice[]) => GameState
}

export function createTurnTriggers(deps: TurnTriggerDeps): TurnTrigger[] {
  return [createGuildImpersonatorSpiceTrigger(deps)]
}

/**
 * Guild Impersonator — "If you gain spice this turn: +1 Spacing Guild influence."
 * The card arms `currTurn.guildImpersonatorSpiceInfluence`; this trigger fires on
 * the first spice gain by the active player in that turn.
 */
function createGuildImpersonatorSpiceTrigger(deps: TurnTriggerDeps): TurnTrigger {
  return (before, after) => {
    // This trigger only reads the gains log on `after`.
    void before

    const turn = after.currTurn
    const cardId = turn?.guildImpersonatorSpiceInfluence
    if (!turn || typeof cardId !== 'number') return after

    const playerId = turn.playerId
    const start = turn.gainsStartIndex ?? 0
    const gainedSpice = after.gains
      .slice(start)
      .some(g => g.playerId === playerId && g.type === RewardType.SPICE && g.amount > 0)
    if (!gainedSpice) return after

    const player = after.players.find(p => p.id === playerId)
    if (!player) return after

    const milestoneMeta: InfluenceMilestoneMeta = { troopsRecruited: 0 }
    const gains = [...after.gains]
    const applied = deps.applyInfluenceDeltaForPlayer(
      after,
      player,
      FactionType.SPACING_GUILD,
      1,
      { appendGainsTo: gains, milestoneMeta }
    )
    let result = applied.state
    if (milestoneMeta.troopsRecruited > 0) {
      result = deps.withRecruitedTroopsDeployLimit(result, milestoneMeta.troopsRecruited)
    }
    result = deps.appendTessiaPendingChoices(result, applied.tessiaChoices)

    return {
      ...result,
      gains: [
        ...result.gains,
        {
          round: result.currentRound,
          playerId,
          sourceId: cardId,
          name: 'Guild Impersonator',
          amount: 1,
          type: RewardType.INFLUENCE,
          source: GainSource.CARD,
        },
      ],
      currTurn: result.currTurn
        ? { ...result.currTurn, guildImpersonatorSpiceInfluence: undefined }
        : result.currTurn,
    }
  }
}
