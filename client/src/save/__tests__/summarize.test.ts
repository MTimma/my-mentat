import { describe, expect, it } from 'vitest'
import { OFFICIAL_BASE_PACK } from '../../gamePacks/constants'
import { createSandboxGameInput } from '../createSandboxGame'
import { summarize } from '../replay'
import type { EventEntry } from '../types'

function playerPatch(
  playerId: number,
  patch: { victoryPoints?: number; spice?: number; solari?: number; water?: number; troops?: number }
): EventEntry {
  return {
    a: { type: 'SANDBOX_UPDATE_PLAYER', playerId, patch },
  }
}

describe('summarize', () => {
  it('orders players by endgame standing, highest VP first', () => {
    const doc = createSandboxGameInput(OFFICIAL_BASE_PACK, { title: 'Standings' })
    doc.events = [
      playerPatch(2, { victoryPoints: 6 }),
      playerPatch(3, { victoryPoints: 5, spice: 4, solari: 3 }),
      playerPatch(1, { victoryPoints: 5, spice: 4 }),
      playerPatch(0, { victoryPoints: 5, spice: 1 }),
    ]

    const summary = summarize(doc)

    expect(summary.players.map(p => p.id)).toEqual([2, 3, 1, 0])
    expect(summary.players.map(p => p.vp)).toEqual([6, 5, 5, 5])
    expect(summary.finalVp).toEqual({ 2: 6, 3: 5, 1: 5, 0: 5 })
    expect(summary.winner).toBeNull()
  })

  it('keeps seat order when VP and tiebreakers match', () => {
    const doc = createSandboxGameInput(OFFICIAL_BASE_PACK)
    const summary = summarize(doc)
    expect(summary.players.map(p => p.id)).toEqual([0, 1, 2, 3])
  })
})
