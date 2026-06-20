import { TECH_TILES, type TechTileId } from '../data/techTiles'
import type { GameState, Player } from '../types/GameTypes'

export const TECH_TILE_POOL_SIZE = TECH_TILES.length
export const TECH_STACK_SIZE = 6
export const TECH_STACK_COUNT = 3

export function countPlayerTechTiles(players: Player[]): number {
  return players.reduce((sum, player) => sum + (player.tech?.length ?? 0), 0)
}

export function playerTechTileIds(players: Player[]): TechTileId[] {
  return players.flatMap(player => (player.tech ?? []).map(tile => tile.id))
}

export function ixBoardTechTileIds(ixBoard: GameState['ixBoard']): TechTileId[] {
  if (!ixBoard) return []
  return ixBoard.stacks.flat()
}

/** Tiles unavailable when editing one player's sandbox tech (other players + Ix board). */
export function sandboxBlockedTechIdsForPlayer(
  players: Player[],
  editingPlayerId: number,
  ixBoard: GameState['ixBoard']
): TechTileId[] {
  const blocked = new Set<TechTileId>()
  for (const player of players) {
    if (player.id === editingPlayerId) continue
    for (const tile of player.tech ?? []) {
      blocked.add(tile.id)
    }
  }
  for (const id of ixBoardTechTileIds(ixBoard)) {
    blocked.add(id)
  }
  return [...blocked]
}

/** Tiles remaining for the Ix board after player-owned tech is removed from the 18-tile pool. */
export function tilesAvailableForBoard(players: Player[]): number {
  return Math.max(0, TECH_TILE_POOL_SIZE - countPlayerTechTiles(players))
}

export function requiredFilledStacks(tilesForBoard: number): number {
  if (tilesForBoard <= 0) return 0
  return Math.min(TECH_STACK_COUNT, Math.floor(tilesForBoard / TECH_STACK_SIZE))
}

export function allowedEmptyStacks(tilesForBoard: number): number {
  return TECH_STACK_COUNT - requiredFilledStacks(tilesForBoard)
}

export function sandboxStackTopsFromIxBoard(
  ixBoard: GameState['ixBoard']
): Array<TechTileId | null | undefined> {
  if (!ixBoard) return [undefined, undefined, undefined]
  return ixBoard.stacks.map(stack => {
    if (stack.length === 0) return null
    return stack[0] ?? null
  })
}

export function normalizeSandboxStackTops(
  stackTops: Array<TechTileId | null | undefined>
): Array<TechTileId | null> {
  return stackTops.map(top => top ?? null)
}

export function canConfirmSandboxStackTops(
  players: Player[],
  stackTops: Array<TechTileId | null | undefined>
): boolean {
  if (stackTops.length !== TECH_STACK_COUNT) return false
  return isSandboxStackTopsValid(players, normalizeSandboxStackTops(stackTops))
}

export function isSandboxStackTopsComplete(
  stackTops: Array<TechTileId | null | undefined>
): stackTops is Array<TechTileId | null> {
  return stackTops.length === TECH_STACK_COUNT && stackTops.every(top => top !== undefined)
}

export function isSandboxStackTopsValid(
  players: Player[],
  stackTops: Array<TechTileId | null>
): boolean {
  const tilesForBoard = tilesAvailableForBoard(players)
  const requiredFilled = requiredFilledStacks(tilesForBoard)
  const allowedEmpty = allowedEmptyStacks(tilesForBoard)

  const filledCount = stackTops.filter((top): top is TechTileId => top != null).length
  const emptyCount = stackTops.filter(top => top === null).length

  if (filledCount !== requiredFilled || emptyCount !== allowedEmpty) return false

  const faceUpIds = stackTops.filter((top): top is TechTileId => top != null)
  if (new Set(faceUpIds).size !== faceUpIds.length) return false

  const occupied = new Set(playerTechTileIds(players))
  if (faceUpIds.some(id => occupied.has(id))) return false

  const validIds = new Set(TECH_TILES.map(tile => tile.id))
  return faceUpIds.every(id => validIds.has(id))
}

export function isSandboxIxBoardReady(players: Player[], ixBoard: GameState['ixBoard']): boolean {
  const tilesForBoard = tilesAvailableForBoard(players)

  if (tilesForBoard === 0) {
    return (
      ixBoard?.stacks?.length === TECH_STACK_COUNT &&
      ixBoard.stacks.every(stack => stack.length === 0)
    )
  }

  if (!ixBoard || ixBoard.stacks.length !== TECH_STACK_COUNT) return false

  const stackTops = ixBoard.stacks.map(stack => (stack.length === 0 ? null : stack[0] ?? null))
  if (!isSandboxStackTopsValid(players, stackTops)) return false

  const requiredFilled = requiredFilledStacks(tilesForBoard)
  return ixBoard.stacks
    .filter(stack => stack.length > 0)
    .every(stack => stack.length === TECH_STACK_SIZE && stack.length > 0 && Boolean(stack[0]))
    && ixBoard.stacks.filter(stack => stack.length > 0).length === requiredFilled
}

export function sandboxTechSetupSummary(players: Player[]): {
  tilesForBoard: number
  requiredFilledStacks: number
  allowedEmptyStacks: number
} {
  const tilesForBoard = tilesAvailableForBoard(players)
  return {
    tilesForBoard,
    requiredFilledStacks: requiredFilledStacks(tilesForBoard),
    allowedEmptyStacks: allowedEmptyStacks(tilesForBoard),
  }
}
