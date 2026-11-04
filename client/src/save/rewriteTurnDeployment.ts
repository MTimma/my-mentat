import type { EventEntry } from './types'

const PLAYER_DEPLOY_TYPES = new Set([
  'DEPLOY_TROOP',
  'UNDEPLOY_TROOP',
  'DEPLOY_DREADNOUGHT',
  'UNDEPLOY_DREADNOUGHT',
])

function isPlayerDeploy(entry: EventEntry, playerId: number): boolean {
  const action = entry.a
  if (!PLAYER_DEPLOY_TYPES.has(action.type)) return false
  return 'playerId' in action && action.playerId === playerId
}

/**
 * Copy a turn's events, drop that player's troop and dreadnought deploy clicks,
 * and insert the new counts immediately before their End Turn.
 * Other actions in the turn stay in order.
 */
export function rewriteTurnDeployment(
  turnEvents: EventEntry[],
  playerId: number,
  troops: number,
  dreadnoughts: number
): EventEntry[] {
  const kept = turnEvents.filter(entry => !isPlayerDeploy(entry, playerId))
  const ctx = turnEvents.find(entry => entry.a.type === 'END_TURN')?.ctx
  const inserts: EventEntry[] = []
  for (let i = 0; i < troops; i++) {
    inserts.push({ a: { type: 'DEPLOY_TROOP', playerId }, ctx })
  }
  for (let i = 0; i < dreadnoughts; i++) {
    inserts.push({ a: { type: 'DEPLOY_DREADNOUGHT', playerId }, ctx })
  }
  const endAt = kept.findIndex(
    entry => entry.a.type === 'END_TURN' && entry.a.playerId === playerId
  )
  if (endAt < 0) return [...kept, ...inserts]
  return [...kept.slice(0, endAt), ...inserts, ...kept.slice(endAt)]
}
