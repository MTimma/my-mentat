import { describe, it, expect } from 'vitest'
import { STARTING_DECK } from '../../../data/cards'
import { TurnType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'

describe('The Voice', () => {
  const voice = structuredClone(STARTING_DECK.find(c => c.name === 'The Voice')!)
  const rmm = structuredClone(STARTING_DECK.find(c => c.name === 'Reverend Mother Mohiam')!)
  const filler = structuredClone(STARTING_DECK.find(c => c.name === 'Convincing Argument' && c.id === 1)!)

  it('playing The Voice removes only The Voice from deck; Reverend Mother stays in hand', () => {
    let s = getBaseTestState({
      deck: [rmm, voice, filler, filler, filler, filler],
      handCount: 5,
      agents: 2,
    })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: voice.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 4 }) // Imperial Basin

    const player = s.players[0]
    expect(player.handCount).toBe(4)
    expect(player.deck.map(c => c.name)).toEqual([
      'Reverend Mother Mohiam',
      'Convincing Argument',
      'Convincing Argument',
      'Convincing Argument',
      'Convincing Argument',
    ])
    expect(player.playArea.map(c => c.name)).toEqual(['The Voice'])
    expect(player.deck.some(c => c.id === rmm.id)).toBe(true)
    expect(player.deck.some(c => c.id === voice.id)).toBe(false)
  })

  it('duplicate template ids: playing one Voice copy removes only that copy', () => {
    const voiceCopy = structuredClone(voice)
    let s = getBaseTestState({
      deck: [rmm, voice, voiceCopy, filler],
      handCount: 3,
      agents: 2,
    })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: voice.id, deckIndex: 1 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 4 })

    const player = s.players[0]
    expect(player.deck.map(c => c.name)).toEqual(['Reverend Mother Mohiam', 'The Voice', 'Convincing Argument'])
    expect(player.playArea.map(c => c.name)).toEqual(['The Voice'])
    expect(player.handCount).toBe(2)
  })
})
