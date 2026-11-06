import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { AgentIcon, CustomEffect, GamePhase } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'

const SECRETS_ID = BOARD_SPACES.find(s => s.name === 'Secrets')!.id

describe('Secrets — steal intrigue custom effect', () => {
  it('unblocks END_TURN after stealing an intrigue', () => {
    const card = stubDeckCard(8201, { agentIcons: [AgentIcon.BENE_GESSERIT] })
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = {
      ...s,
      players: s.players.map(p => (p.id === 1 ? { ...p, intrigueCount: 4 } : p)),
    }
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 8201 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECRETS_ID })

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
})
