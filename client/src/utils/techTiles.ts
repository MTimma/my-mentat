import {
  TECH_TILES,
  TechTileId,
  TechTileTiming,
  type TechTile,
  type TechTileId as TechTileIdType,
} from '../data/techTiles'
import { GamePhase, TurnType, type GameState, type Player } from '../types/GameTypes'
import { playerTechTileIds } from './sandboxTechTiles'

export function tileById(id: TechTileIdType): TechTile | undefined {
  return TECH_TILES.find(tile => tile.id === id)
}

export function playerOwnsTile(player: { tech?: Array<{ id: TechTileIdType }> }, id: TechTileIdType): boolean {
  return (player.tech ?? []).some(t => t.id === id)
}

/** Face-up top tile id per stack (undefined when stack empty). */
export function firstStackTops(state: GameState): Array<TechTileIdType | undefined> {
  const stacks = state.ixBoard?.stacks ?? [[], [], []]
  return stacks.map(stack => stack[0])
}

/**
 * Tiles eligible to reveal face-up after acquiring from a stack.
 * Face-down stack placeholders are ignored — only player-owned tiles and current face-ups are excluded.
 */
export function techTilesAvailableForNextReveal(
  stacks: TechTileIdType[][],
  players: Player[],
  acquiredTileId: TechTileIdType
): TechTileIdType[] {
  const blocked = new Set<TechTileIdType>(playerTechTileIds(players))
  blocked.add(acquiredTileId)
  for (const stack of stacks) {
    const faceUp = stack[0]
    if (faceUp) blocked.add(faceUp)
  }
  return TECH_TILES.map(tile => tile.id).filter(id => !blocked.has(id))
}

export function effectiveTechCost(
  baseCost: number,
  discount: number,
  negotiatorsReturned: number
): number {
  return Math.max(0, baseCost - discount - negotiatorsReturned)
}

export interface TechAcquireAffordability {
  discount?: number
  paySolariInsteadOfSpice?: boolean
  /** When true, compare only spice/solari to the discounted cost (no negotiator reduction). */
  ignoreNegotiators?: boolean
}

/** Whether the player can pay the effective spice (or solari) cost for a face-up tech tile. */
export function canPlayerAffordTechTile(
  player: { spice: number; solari: number; negotiatorsOnIx?: number },
  baseCost: number,
  options: TechAcquireAffordability = {}
): boolean {
  const discount = options.discount ?? 0
  const paySolariInsteadOfSpice = options.paySolariInsteadOfSpice ?? false
  const negotiatorsAvailable = player.negotiatorsOnIx ?? 0
  const afterDiscount = Math.max(0, baseCost - discount)
  const negotiatorsReturned = options.ignoreNegotiators
    ? 0
    : Math.min(negotiatorsAvailable, afterDiscount)
  const cost = effectiveTechCost(baseCost, discount, negotiatorsReturned)
  return paySolariInsteadOfSpice ? player.solari >= cost : player.spice >= cost
}

function isActivatedThisRound(state: GameState, playerId: number, tileId: TechTileIdType): boolean {
  const player = state.players.find(p => p.id === playerId)
  return (player?.activatedTechThisRound ?? []).includes(tileId)
}

/** Tech tiles that open a discard picker in the UI; effect commits only after a card is chosen. */
export function techActivationRequiresDiscard(tileId: TechTileIdType): boolean {
  return tileId === TechTileId.HOLOPROJECTORS || tileId === TechTileId.INVASION_SHIPS
}

export function techDiscardActivationPrompt(tileId: TechTileIdType): string | undefined {
  switch (tileId) {
    case TechTileId.HOLOPROJECTORS:
      return 'Holoprojectors: discard 1 card to draw 1'
    case TechTileId.INVASION_SHIPS:
      return 'Invasion Ships: discard 1 card to ignore enemy agents this turn'
    default:
      return undefined
  }
}

/** Legacy saves enqueued tech discard as CARD_SELECT pending choices — map prompt back to tile id. */
export function techTileIdFromDiscardPrompt(prompt: string): TechTileIdType | undefined {
  if (prompt.startsWith('Holoprojectors:')) return TechTileId.HOLOPROJECTORS
  if (prompt.startsWith('Invasion Ships:')) return TechTileId.INVASION_SHIPS
  return undefined
}

function canAffordActivation(state: GameState, playerId: number, tileId: TechTileIdType): boolean {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return false
  switch (tileId) {
    case TechTileId.FLAGSHIP:
      return player.solari >= 4
    case TechTileId.HOLOPROJECTORS:
    case TechTileId.INVASION_SHIPS:
      return player.handCount >= 1
    case TechTileId.SPY_SATELLITES:
      return player.spice >= 3
    case TechTileId.TRAINING_DRONES:
    case TechTileId.SONIC_SNOOPERS:
      return true
    default:
      return false
  }
}

/** Owned face-up tech tiles the player may activate in the current turn window. */
export function tilesActivatableNow(state: GameState, playerId: number): TechTile[] {
  if (!state.expansions.riseOfIx) return []
  if (state.phase !== GamePhase.PLAYER_TURNS) return []

  const player = state.players.find(p => p.id === playerId)
  if (!player) return []

  return (player.tech ?? [])
    .filter(t => t.faceUp)
    .map(t => tileById(t.id))
    .filter((tile): tile is TechTile => tile != null)
    .filter(tile => !isActivatedThisRound(state, playerId, tile.id))
    .filter(tile => canAffordActivation(state, playerId, tile.id))
}
