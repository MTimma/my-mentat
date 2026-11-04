import { describe, expect, it } from 'vitest'
import type { EventEntry } from '../types'
import { rewriteTurnDeployment } from '../rewriteTurnDeployment'

function entry(type: EventEntry['a']['type'], playerId = 0): EventEntry {
  return { a: { type, playerId } as EventEntry['a'] }
}

describe('rewriteTurnDeployment', () => {
  it('replaces that player’s deploy clicks and keeps the rest of the turn', () => {
    const turn = [
      entry('PLAY_CARD'),
      entry('PLACE_AGENT'),
      entry('DEPLOY_TROOP'),
      entry('DEPLOY_TROOP'),
      entry('UNDEPLOY_TROOP'),
      entry('ACQUIRE_CARD'),
      entry('END_TURN'),
    ]
    const next = rewriteTurnDeployment(turn, 0, 3, 1)
    expect(next.map(event => event.a.type)).toEqual([
      'PLAY_CARD',
      'PLACE_AGENT',
      'ACQUIRE_CARD',
      'DEPLOY_TROOP',
      'DEPLOY_TROOP',
      'DEPLOY_TROOP',
      'DEPLOY_DREADNOUGHT',
      'END_TURN',
    ])
  })

  it('leaves another player’s deploy clicks in place', () => {
    const turn = [entry('DEPLOY_TROOP', 1), entry('DEPLOY_TROOP', 0), entry('END_TURN', 0)]
    const next = rewriteTurnDeployment(turn, 0, 0, 0)
    expect(
      next.map(event => `${event.a.type}:${'playerId' in event.a ? event.a.playerId : ''}`)
    ).toEqual(['DEPLOY_TROOP:1', 'END_TURN:0'])
  })
})
