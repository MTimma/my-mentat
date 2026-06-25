import { describe, it, expect } from 'vitest'
import { STARTING_DECK } from '../../../catalog/runtime'
import { CustomEffect, TurnType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'

describe('The Voice', () => {
  const voice = structuredClone(STARTING_DECK.find(c => c.name === 'The Voice')!)
  const rmm = structuredClone(STARTING_DECK.find(c => c.name === 'Reverend Mother Mohiam')!)
  const filler = structuredClone(
    STARTING_DECK.find(c => c.name === 'Convincing Argument' && c.id === 1)!
  )

  function placeVoiceOnImperialBasin(s = getBaseTestState()) {
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: voice.id })
    return applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 4 })
  }

  it('catalog-hydrated card exposes THE_VOICE on playEffect', () => {
    expect(voice.playEffect?.[0]?.reward?.custom).toBe(CustomEffect.THE_VOICE)
  })

  it('playing The Voice creates a pending THE_VOICE reward after agent placement', () => {
    const s = placeVoiceOnImperialBasin(
      getBaseTestState({
        deck: [voice, filler, filler, filler, filler],
        handCount: 5,
        agents: 2,
      })
    )
    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({
        reward: { custom: CustomEffect.THE_VOICE },
        source: expect.objectContaining({ type: 'card', id: voice.id, name: 'The Voice' }),
      })
    )
  })

  it('CLAIM_ALL_REWARDS auto-applies board rewards but keeps THE_VOICE pending', () => {
    let s = placeVoiceOnImperialBasin(
      getBaseTestState({
        deck: [voice, filler, filler, filler, filler],
        handCount: 5,
        agents: 2,
      })
    )
    expect(s.pendingRewards.some(r => r.reward.custom === CustomEffect.THE_VOICE)).toBe(true)
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({ reward: { custom: CustomEffect.THE_VOICE } })
    )
    expect(s.canEndTurn).toBe(false)
  })

  it('claiming THE_VOICE blocks the chosen space for opponents this round', () => {
    let s = placeVoiceOnImperialBasin(
      getBaseTestState(
        {
          deck: [voice, filler, filler, filler, filler],
          handCount: 5,
          agents: 2,
        },
        { players: 2 }
      )
    )
    const voiceReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.THE_VOICE)!
    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: voiceReward.id,
      customData: { spaceId: 5 },
    })
    expect(s.blockedSpaces).toEqual([{ spaceId: 5, playerId: 0 }])

    const opponentVoice = structuredClone(voice)
    opponentVoice.id = 9999
    s = {
      ...s,
      activePlayerId: 1,
      currTurn: { playerId: 1, type: TurnType.ACTION },
      players: s.players.map((p, i) =>
        i === 1 ? { ...p, deck: [opponentVoice, ...p.deck], agents: 2 } : p
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 1, cardId: 9999 })
    const before = s.occupiedSpaces[5]?.length ?? 0
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 1, spaceId: 5 })
    expect(s.occupiedSpaces[5]?.length ?? 0).toBe(before)
  })

  it('playing The Voice removes only The Voice from deck; Reverend Mother stays in hand', () => {
    let s = getBaseTestState({
      deck: [rmm, voice, filler, filler, filler, filler],
      handCount: 5,
      agents: 2,
    })
    s = placeVoiceOnImperialBasin(s)

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
    expect(player.deck.map(c => c.name)).toEqual([
      'Reverend Mother Mohiam',
      'The Voice',
      'Convincing Argument',
    ])
    expect(player.playArea.map(c => c.name)).toEqual(['The Voice'])
    expect(player.handCount).toBe(2)
  })
})
