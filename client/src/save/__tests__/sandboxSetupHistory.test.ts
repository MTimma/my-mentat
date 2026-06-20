import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../data/conflicts'
import { PlayerColor } from '../../types/GameTypes'
import { buildHistoryFromEvents } from '../buildHistory'
import { truncateSandboxEventsForSetupReedit } from '../recording'
import type { EventEntry, SetupBlock } from '../types'

function sandboxSetup(): SetupBlock {
  return {
    firstPlayer: 0,
    sandbox: true,
    players: [
      {
        id: 0,
        leaderId: 'paul',
        color: PlayerColor.RED,
        deckCardIds: ['starting/scout'],
      },
    ],
    imperiumRowDeckCardIds: [
      'imperium/space-travel',
      'imperium/space-travel',
      'imperium/stilgar',
      'imperium/chani',
      'imperium/carryall',
      'imperium/crysknife',
    ],
  }
}

describe('sandbox setup history after load + re-edit', () => {
  it('truncateSandboxEventsForSetupReedit keeps configuration events before commit', () => {
    const events: EventEntry[] = [
      { a: { type: 'SANDBOX_SET_IMPERIUM_ROW', cardIds: [2000, 2001, 2002, 2003, 2004] } },
      { a: { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id } },
      { a: { type: 'SANDBOX_COMMIT_SETUP' } },
      { a: { type: 'END_TURN', playerId: 0 } },
    ]

    expect(truncateSandboxEventsForSetupReedit(events)).toEqual(events.slice(0, 2))
  })

  it('re-commit after undo preserves imperium row and updated conflict in setup history', () => {
    let events: EventEntry[] = [
      { a: { type: 'SANDBOX_SET_IMPERIUM_ROW', cardIds: [2000, 2001, 2002, 2003, 2004] } },
      { a: { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id } },
      { a: { type: 'SANDBOX_COMMIT_SETUP' } },
    ]

    events = truncateSandboxEventsForSetupReedit(events)
    events.push({ a: { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[2].id } })
    events.push({ a: { type: 'SANDBOX_COMMIT_SETUP' } })

    const history = buildHistoryFromEvents(sandboxSetup(), events)
    expect(history).toHaveLength(1)
    expect(history[0].imperiumRow).toHaveLength(5)
    expect(history[0].currentConflict.id).toBe(CONFLICTS[2].id)
  })

  it('wiping all events on undo loses imperium row on re-commit (regression guard)', () => {
    const events: EventEntry[] = [
      { a: { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[2].id } },
      { a: { type: 'SANDBOX_COMMIT_SETUP' } },
    ]

    const history = buildHistoryFromEvents(sandboxSetup(), events)
    expect(history[0].imperiumRow).toHaveLength(0)
    expect(history[0].currentConflict.id).toBe(CONFLICTS[2].id)
  })
})
