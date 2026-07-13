import { describe, it, expect } from 'vitest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'
import { IMPERIUM_ROW_DECK, STARTING_DECK } from '../../../data/cards'
import { GainSource, RewardType } from '../../../types/GameTypes'
import { groupGainsBySource } from '../../../utils/turnGainsDisplay'

describe('Sietch Reverend Mother — trash gain source', () => {
  it('CLAIM_REWARD trash attributes gain to Sietch Reverend Mother', () => {
    const sietch = structuredClone(IMPERIUM_ROW_DECK.find(c => c.name === 'Sietch Reverend Mother')!)
    const dune = structuredClone(STARTING_DECK.find(c => c.name === 'Dune, the Desert Planet')!)
    let s = getBaseTestState()
    s.players[0].deck = [dune]
    s.players[0].handCount = 1
    s = {
      ...s,
      pendingRewards: [
        {
          id: 'sietch-trash',
          source: { type: GainSource.CARD, id: sietch.id, name: sietch.name },
          reward: { trash: 1 },
          isTrash: true,
        },
      ],
    }

    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: 'sietch-trash',
      customData: { trashedCardId: dune.id },
    })

    const trashGain = s.gains.find(g => g.type === RewardType.TRASH && g.cardId === dune.id)
    expect(trashGain).toMatchObject({
      source: GainSource.CARD,
      sourceId: sietch.id,
      cardId: dune.id,
      name: 'Dune, the Desert Planet',
    })

    const groups = groupGainsBySource(s.gains.filter(g => g.playerId === 0))
    const sietchGroup = groups.find(g =>
      g.gains.some(x => x.type === RewardType.TRASH && x.cardId === dune.id)
    )
    expect(sietchGroup?.title).toBe('Sietch Reverend Mother')
  })
})
