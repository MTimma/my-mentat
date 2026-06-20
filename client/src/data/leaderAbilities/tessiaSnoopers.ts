import {
  FactionType,
  FixedOptionsChoice,
  GameState,
  Leader,
  Player,
  ChoiceType,
  GainSource,
} from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { nextSemanticId } from '../../utils/semanticIds'

const ALL_FACTIONS = Object.values(FactionType) as FactionType[]

/**
 * Printed snooper-icon steps on each faction influence track (RoI board overlay).
 * Steps are influence values 1–6 (0 = bottom of track). Tune with ?markerDebug=1.
 *
 * Emperor 1, Guild 2, Bene Gesserit 3, Fremen 1 — matches snooper symbols on the
 * physical Rise of Ix influence columns (bottom-up counting).
 */
export const TESSIA_SNOOPER_START_STEPS: Record<FactionType, number> = {
  [FactionType.EMPEROR]: 1,
  [FactionType.SPACING_GUILD]: 2,
  [FactionType.BENE_GESSERIT]: 3,
  [FactionType.FREMEN]: 1,
}

/** Parked snooper slots on Tessia's leader mat (percent of leader image, top→bottom). */
export const TESSIA_PARKED_SNOOPER_SLOTS: Array<{ faction: FactionType; x: number; y: number }> = [
  { faction: FactionType.EMPEROR, x: 88, y: 28 },
  { faction: FactionType.SPACING_GUILD, x: 88, y: 42 },
  { faction: FactionType.BENE_GESSERIT, x: 88, y: 56 },
  { faction: FactionType.FREMEN, x: 88, y: 70 },
]

export function isTessiaLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.TESSIA_VERNIUS
}

export function getTessiaSnooperTrackStep(faction: FactionType): number {
  return TESSIA_SNOOPER_START_STEPS[faction]
}

/**
 * Tessia Vernius snooper token positions on influence tracks (inner %).
 * Tune with `?markerDebug=1`.
 */
export interface SnooperTokenAnchor {
  faction: FactionType
  /** Influence step (1–6) where the snooper sits on Tessia's lane. */
  step: number
}

export const SNOOPER_TOKEN_ANCHORS: SnooperTokenAnchor[] = ALL_FACTIONS.map(faction => ({
  faction,
  step: getTessiaSnooperTrackStep(faction),
}))

/** Inner-board percent center for a Tessia snooper on a player's influence lane. */
export function snooperTokenPoint(
  faction: FactionType,
  laneIndex: number,
  tracks: Record<
    FactionType,
    { laneCenterX: [number, number, number, number]; baselineY: number; stepY: number }
  >
): { x: number; y: number } {
  const track = tracks[faction]
  const step = getTessiaSnooperTrackStep(faction)
  const cx = track.laneCenterX[laneIndex]
  const cy = track.baselineY + track.stepY * step
  return { x: cx, y: cy }
}

/** Game start: one snooper per faction track at the printed step positions. */
export function seedTessiaSnoopers(player: Player, riseOfIx: boolean): Player {
  if (!riseOfIx || !isTessiaLeader(player.leader)) return player
  const snoopers = Object.fromEntries(ALL_FACTIONS.map(f => [f, true])) as Record<
    FactionType,
    boolean
  >
  return {
    ...player,
    snoopers,
    leader: { ...player.leader, tessiaSnoopers: {} },
  }
}

export function factionsWithSnooper(player: Player): FactionType[] {
  return ALL_FACTIONS.filter(f => player.snoopers?.[f])
}

export function buildTessiaSignetChoice(
  state: GameState,
  playerId: number,
  cardId: number,
  existingChoiceIds: Iterable<string> = []
): FixedOptionsChoice | null {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !isTessiaLeader(player.leader)) return null
  const snooperFactions = factionsWithSnooper(player)
  if (snooperFactions.length === 0) return null

  const source = { type: GainSource.CARD as const, id: cardId, name: 'Signet Ring' }
  return {
    id: nextSemanticId(source, 'SIGNET', existingChoiceIds),
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Spend 1 influence to gain 1 with a snoopered faction',
    source,
    influenceResolution: {
      payOnResolve: { influence: { chooseOne: true, amounts: ALL_FACTIONS.map(f => ({ faction: f, amount: 1 })) } },
      thenGain: {
        chooseOne: true,
        amounts: snooperFactions.map(f => ({ faction: f, amount: 1 })),
      },
    },
    options: [
      {
        reward: { influence: { chooseOne: true, amounts: snooperFactions.map(f => ({ faction: f, amount: 1 })) } },
        rewardLabel: '+1 influence (snooper faction)',
        disabled: snooperFactions.length === 0,
      },
    ],
  }
}

/** When Tessia reaches 2nd influence on a snoopered track, park the snooper on her leader sheet. */
export function parkTessiaSnooperOnMilestone(
  player: Player,
  faction: FactionType,
  previousInfluence: number,
  newInfluence: number
): Player {
  if (!isTessiaLeader(player.leader)) return player
  if (!player.snoopers?.[faction]) return player
  if (previousInfluence >= 2 || newInfluence < 2) return player

  const snoopers = { ...player.snoopers, [faction]: false }
  const tessiaSnoopers = { ...(player.leader.tessiaSnoopers ?? {}), [faction]: true }
  return {
    ...player,
    snoopers,
    leader: { ...player.leader, tessiaSnoopers },
  }
}
