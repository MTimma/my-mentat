import { Card, Player } from '../types/GameTypes'

const TSMF_NAME = 'Spice Must Flow'
const TSMF_ID_MIN = 301
const TSMF_ID_MAX = 309

function isSpiceMustFlowCard(c: Card): boolean {
  if (c.id >= TSMF_ID_MIN && c.id <= TSMF_ID_MAX) return true
  return c.name === TSMF_NAME
}

/** Count The Spice Must Flow reserve cards across piles (ids 301–309 or name match). */
export function countSpiceMustFlowCards(player: Player): number {
  const piles = [...player.deck, ...player.discardPile, ...player.playArea]
  return piles.filter(isSpiceMustFlowCard).length
}
