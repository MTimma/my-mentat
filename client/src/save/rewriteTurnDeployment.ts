import type { EventEntry } from './types'

const PLAYER_DEPLOY_TYPES = new Set([
  'DEPLOY_TROOP',
  'UNDEPLOY_TROOP',
  'DEPLOY_DREADNOUGHT',
  'UNDEPLOY_DREADNOUGHT',
  'DEPLOY_SPECIMEN',
  'UNDEPLOY_SPECIMEN',
])

function isPlayerDeploy(entry: EventEntry, playerId: number): boolean {
  const action = entry.a
  if (!PLAYER_DEPLOY_TYPES.has(action.type)) return false
  return 'playerId' in action && action.playerId === playerId
}

/**
 * Copy a turn's events, drop that player's troop, dreadnought and specimen deploy
 * clicks, and insert the new counts immediately before their End Turn.
 * Other actions in the turn stay in order.
 *
 * `specimens` is optional: when omitted, that player's specimen clicks are left
 * untouched (callers that do not edit specimen deployments).
 */
export function rewriteTurnDeployment(
  turnEvents: EventEntry[],
  playerId: number,
  troops: number,
  dreadnoughts: number,
  specimens?: number
): EventEntry[] {
  const kept = turnEvents.filter(entry => {
    if (!isPlayerDeploy(entry, playerId)) return true
    if (specimens != null) return false
    // No specimen count supplied: leave that player's specimen clicks alone.
    return entry.a.type === 'DEPLOY_SPECIMEN' || entry.a.type === 'UNDEPLOY_SPECIMEN'
  })
  const ctx = turnEvents.find(entry => entry.a.type === 'END_TURN')?.ctx
  const inserts: EventEntry[] = []
  for (let i = 0; i < troops; i++) {
    inserts.push({ a: { type: 'DEPLOY_TROOP', playerId }, ctx })
  }
  for (let i = 0; i < dreadnoughts; i++) {
    inserts.push({ a: { type: 'DEPLOY_DREADNOUGHT', playerId }, ctx })
  }
  const specimenCount = specimens ?? 0
  for (let i = 0; i < specimenCount; i++) {
    inserts.push({ a: { type: 'DEPLOY_SPECIMEN', playerId }, ctx })
  }
  const endAt = kept.findIndex(
    entry => entry.a.type === 'END_TURN' && entry.a.playerId === playerId
  )
  if (endAt < 0) return [...kept, ...inserts]
  return [...kept.slice(0, endAt), ...inserts, ...kept.slice(endAt)]
}
