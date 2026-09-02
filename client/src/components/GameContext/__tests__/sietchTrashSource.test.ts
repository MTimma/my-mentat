import { describe, it, expect } from 'vitest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, withCardOnTop } from './_helpers'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { IMPERIUM_ROW_DECK, STARTING_DECK } from '../../../data/cards'
import { GainSource, RewardType } from '../../../types/GameTypes'
import { discardedOrTrashedCardLabel, groupGainsBySource } from '../../../utils/turnGainsDisplay'

const HARDY_WARRIORS_ID = BOARD_SPACES.find(s => s.name === 'Hardy Warriors')!.id

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
      name: 'Sietch Reverend Mother|Dune, the Desert Planet',
    })

    const groups = groupGainsBySource(s.gains.filter(g => g.playerId === 0))
    const sietchGroup = groups.find(g =>
      g.gains.some(x => x.type === RewardType.TRASH && x.cardId === dune.id)
    )
    expect(sietchGroup?.title).toBe('Sietch Reverend Mother')
  })

  it('PAY_COST pick-a-card trash titles the source card, not the trashed Dagger', () => {
    const sietch = structuredClone(IMPERIUM_ROW_DECK.find(c => c.name === 'Sietch Reverend Mother')!)
    const dagger = structuredClone(STARTING_DECK.find(c => c.name === 'Dagger')!)
    let s = getBaseTestState({ water: 3, handCount: 2 })
    s = withCardOnTop(s, 0, sietch)
    s.players[0].deck = [sietch, dagger, ...s.players[0].deck.slice(1)]

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: sietch.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: HARDY_WARRIORS_ID })

    const trashEffect = s.currTurn?.optionalEffects?.find(
      e => e.reward.trash && !e.reward.trashThisCard && e.source.id === sietch.id
    )
    expect(trashEffect).toBeTruthy()

    s = applyGameAction(s, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: trashEffect!.id,
      data: { trashedCardId: dagger.id },
    })

    const trashGain = s.gains.find(g => g.type === RewardType.TRASH && g.cardId === dagger.id)
    expect(trashGain).toMatchObject({
      source: GainSource.CARD,
      sourceId: sietch.id,
      cardId: dagger.id,
      name: 'Sietch Reverend Mother|Dagger',
    })

    const groups = groupGainsBySource(s.gains.filter(g => g.playerId === 0))
    const sietchGroup = groups.find(g =>
      g.gains.some(x => x.type === RewardType.TRASH && x.cardId === dagger.id)
    )
    expect(sietchGroup?.title).toBe('Sietch Reverend Mother')
    expect(discardedOrTrashedCardLabel(trashGain!)).toBe('Dagger')
  })
})
