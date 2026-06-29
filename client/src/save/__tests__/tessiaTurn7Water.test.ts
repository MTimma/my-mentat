import { describe, expect, it, beforeAll } from 'vitest'
import { buildInitialState } from '../buildInitialState'
import { replayEvents } from '../replay'
import { RewardType } from '../../types/GameTypes'
import { registerCustomPackManifest } from '../../gamePacks/registry'
import type { GamePackManifest } from '../../gamePacks/types'
import myPack from '../../../public/game-packs/custom/my-pack.v1.json'
import fixture from './fixtures/tessia-turn7-water.json'
import type { SaveDoc } from '../types'

const doc = fixture as SaveDoc

beforeAll(() => {
  registerCustomPackManifest(myPack as GamePackManifest, { source: 'repo' })
})

describe('tessia turn 7 water (save replay)', () => {
  it('ends turn 7 with 2 water after Stillsuits + snooper + Water of Life', () => {
    const initial = buildInitialState(doc.setup)
    const { state, divergences } = replayEvents(initial, doc.events)

    expect(divergences).toEqual([])
    // 1 start + 1 Stillsuits + 1 Tessia snooper (Fremen slot 2) − 1 Water of Life
    expect(state.players[0].water).toBe(2)
    expect(state.players[0].spice).toBe(0)
  })

  it('applies Water of Life cost on turn 7', () => {
    const initial = buildInitialState(doc.setup)
    const turn7Start = doc.events.findIndex(
      e => e.a.type === 'PLAY_CARD' && e.a.cardId === 1042000001
    )
    const beforeIntrigue = doc.events.slice(0, turn7Start + 8)
    const afterIntrigue = [...beforeIntrigue, { a: { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 30 } }]

    const before = replayEvents(initial, beforeIntrigue).state
    const after = replayEvents(initial, afterIntrigue).state

    expect(before.players[0].water).toBe(3)
    expect(after.players[0].water).toBe(2)

    const waterGains = after.gains.filter(
      g => g.playerId === 0 && g.type === RewardType.WATER && g.name === 'Water of Life'
    )
    expect(waterGains.some(g => g.amount === -1)).toBe(true)
  })
})
