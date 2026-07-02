import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { AgentIcon, RewardType } from '../../types/GameTypes'
import { getBaseTestState, stubDeckCard } from '../../components/GameContext/__tests__/_helpers'

const WEALTH_SPACE_ID = 15

describe('Wealth solari claim', () => {
  it('CLAIM_ALL_REWARDS applies Wealth solari when card has trash reward', () => {
    const seekAllies = stubDeckCard(9, {
      agentIcons: [AgentIcon.EMPEROR],
      playEffect: [{ reward: { trashThisCard: true } }],
    })
    let s = getBaseTestState({ leader: { name: 'Count Ilban Richese' } as never }, { players: 2 })
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, deck: [seekAllies], handCount: 1, solari: 0 } : p
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 9 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: WEALTH_SPACE_ID })
    expect(s.pendingRewards.map(r => ({ solari: r.reward.solari, influence: r.reward.influence, trash: r.isTrash, source: r.source }))).toMatchInlineSnapshot(`
      [
        {
          "influence": undefined,
          "solari": 2,
          "source": {
            "id": 15,
            "name": "Wealth",
            "type": "board-space",
          },
          "trash": false,
        },
        {
          "influence": undefined,
          "solari": undefined,
          "source": {
            "id": 9,
            "name": "stub-9",
            "type": "card",
          },
          "trash": true,
        },
        {
          "influence": {
            "amounts": [
              {
                "amount": 1,
                "faction": "emperor",
              },
            ],
          },
          "solari": undefined,
          "source": {
            "id": 15,
            "name": "Wealth",
            "type": "board-space",
          },
          "trash": false,
        },
      ]
    `)
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.gains.filter(g => g.playerId === 0 && g.type === RewardType.SOLARI)).toEqual(
      expect.arrayContaining([expect.objectContaining({ amount: 2 })])
    )
    expect(s.players[0].solari).toBe(2)
    expect(s.players[0].trash.some(c => c.id === 9)).toBe(true)
    expect(s.pendingRewards.some(r => r.isTrash && r.source.id === 9)).toBe(false)
  })
})
