import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { STARTING_DECK } from '../../../data/cards'
import { AgentIcon, CustomEffect, GamePhase } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'

const SECRETS_ID = BOARD_SPACES.find(s => s.name === 'Secrets')!.id

/** Player 0 plays a Bene Gesserit-icon card and places an agent on Secrets. */
function placeOnSecrets(opponentIntrigue: number[]) {
  const card = stubDeckCard(8201, { agentIcons: [AgentIcon.BENE_GESSERIT] })
  let s = getBaseTestState(undefined, { players: opponentIntrigue.length + 1, activeId: 0 })
  s = {
    ...s,
    players: s.players.map(p =>
      p.id === 0 ? p : { ...p, intrigueCount: opponentIntrigue[p.id - 1] }
    ),
  }
  s = withCardOnTop(s, 0, card)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 8201 })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECRETS_ID })
  return s
}

describe('Secrets — steal intrigue custom effect', () => {
  it('unblocks END_TURN after stealing an intrigue', () => {
    let s = placeOnSecrets([4])

    // Claim the intrigue reward first; the custom steal stays pending.
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.SECRETS_STEAL)
    expect(custom).toBeDefined()
    expect(custom!.disabled).toBeUndefined()

    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: custom!.id })

    expect(s.pendingRewards).toEqual([])
    // 1 starting + 1 from the space + 1 stolen
    expect(s.players[0].intrigueCount).toBe(3)
    expect(s.players[1].intrigueCount).toBe(3)
    expect(s.canEndTurn).toBe(true)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.activePlayerId).toBe(1)
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
  })

  it('steals one intrigue from every opponent with 4 or more', () => {
    let s = placeOnSecrets([4, 6, 3])

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.SECRETS_STEAL)!
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: custom.id })

    expect(s.players[0].intrigueCount).toBe(4) // 1 + 1 from space + 2 stolen
    expect(s.players[1].intrigueCount).toBe(3)
    expect(s.players[2].intrigueCount).toBe(5)
    expect(s.players[3].intrigueCount).toBe(3) // below the threshold
    expect(s.canEndTurn).toBe(true)
  })

  it('creates a disabled steal reward when no opponent has 4+ intrigue', () => {
    let s = placeOnSecrets([3])

    const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.SECRETS_STEAL)
    expect(custom?.disabled).toBe(true)

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.canEndTurn).toBe(true)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.activePlayerId).toBe(1)
  })

  it('keeps the turn blocked while other rewards are still pending', () => {
    let s = placeOnSecrets([4])

    const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.SECRETS_STEAL)!
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: custom.id })

    // The intrigue reward from the space is still unclaimed.
    expect(s.pendingRewards.some(r => !r.disabled)).toBe(true)
    expect(s.canEndTurn).toBe(false)
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.canEndTurn).toBe(true)
  })

  it('reproduces the reported flow: Seek Allies → Secrets → steal → END_TURN', () => {
    const seekAllies = structuredClone(STARTING_DECK.find(c => c.name === 'Seek Allies')!)
    let s = getBaseTestState(undefined, { players: 4, activeId: 3 })
    s = {
      ...s,
      players: s.players.map(p => {
        if (p.id === 0) return { ...p, intrigueCount: 8 }
        if (p.id === 3) return { ...p, intrigueCount: 0 }
        return p
      }),
    }
    s = withCardOnTop(s, 3, seekAllies)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 3, cardId: seekAllies.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 3, spaceId: SECRETS_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 3 })
    // Same reward id as the recorded save that hit the bug.
    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 3,
      rewardId: 'board-space-18-REWARD-1',
    })

    expect(s.players[3].intrigueCount).toBe(2) // 1 from the space + 1 stolen
    expect(s.players[0].intrigueCount).toBe(7)
    expect(s.canEndTurn).toBe(true)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 3 })
    expect(s.activePlayerId).toBe(0)
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
  })
})
