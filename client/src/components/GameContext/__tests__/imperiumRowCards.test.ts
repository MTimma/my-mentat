import { describe, it, expect } from 'vitest'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import { baseGameManifest } from '../../../test-fixtures/baseGameManifest'
import { ChoiceType, TurnType, type FixedOptionsChoice } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'

/**
 * One stub per base-game imperium row card (spreadsheet filter: 1. base).
 * Implement by copying patterns from intrigueCards.test.ts:
 *   PLAY_CARD → PLACE_AGENT (matching agent icon) → assert resources / gains.
 *
 * Agent: mark implemented tests by replacing it.todo with it(...).
 */
describe('Imperium row cards — base game', () => {
  const byName = new Map(IMPERIUM_ROW_DECK.map(c => [c.name, c]))

  for (const entry of baseGameManifest.imperiumRow) {
    const card = byName.get(entry.codeName)
    const label = `${entry.codeName} (cost ${entry.cost}, qty ${entry.qty})`

    it.todo(`${label}: agent box — ${entry.agentBox || 'see card data'}`)
    it.todo(`${label}: reveal — persuasion ${entry.revealPersuasion}, swords ${entry.revealSwords}`)
  }
})

describe('Imperium row cards — OR choices', () => {
  it('Other Memory: agent play adds a single OR choice (not duplicated)', () => {
    const otherMemory = structuredClone(IMPERIUM_ROW_DECK.find(c => c.name === 'Other Memory')!)
    let s = getBaseTestState({ deck: [otherMemory], handCount: 1, agents: 1 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: otherMemory.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 })

    expect(s.currTurn?.pendingChoices).toHaveLength(1)
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice?.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect((choice as FixedOptionsChoice).options).toHaveLength(2)
  })
})

describe('Imperium row cards — acquire effects', () => {
  it.todo('Chani: acquire gives +1 water')
  it.todo('Crysknife: trash trigger +4 Solari')
  it.todo('Shifting Allegiances: infiltrate / graft behavior')
})
