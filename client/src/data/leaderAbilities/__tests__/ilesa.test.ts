import { describe, expect, it } from 'vitest'
import { CardPile, AgentIcon, ChoiceType, Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import {
  buildIlesaPlayBonusReward,
  buildIlesaSetAsideChoice,
  isIlesaLeader,
  resolveIlesaSetAside,
  shouldGrantIlesaPlayBonus,
} from '../ilesaSetAside'
import { getRoiTestState, makePlayer, stubDeckCard } from '../../../components/GameContext/__tests__/_helpers'

describe('Ilesa Ecaz — Hidden Pact', () => {
  const ilesa = new Leader(
    LEADER_NAMES.ILESA_ECAZ,
    { name: 'Hidden Pact', description: 'Set aside card.' },
    'Signet',
    3
  )

  it('buildIlesaSetAsideChoice offers deck selection for Ilesa only', () => {
    const deckCard = stubDeckCard(701)
    const player = makePlayer(0, { leader: ilesa, deck: [deckCard], handCount: 1 })
    const choice = buildIlesaSetAsideChoice(getRoiTestState(), player)
    expect(choice?.type).toBe(ChoiceType.CARD_SELECT)
    expect(choice?.piles).toContain(CardPile.DECK)
    expect(buildIlesaSetAsideChoice(getRoiTestState(), makePlayer(1))).toBeNull()
  })

  it('resolveIlesaSetAside moves card from deck to setAsideCard', () => {
    const card = stubDeckCard(702)
    const player = makePlayer(0, { leader: ilesa, deck: [card], handCount: 1 })
    const after = resolveIlesaSetAside(player, card.id)
    expect(after.setAsideCard?.id).toBe(card.id)
    expect(after.deck).toHaveLength(0)
    expect(after.handCount).toBe(0)
  })

  it('shouldGrantIlesaPlayBonus on 2nd agent turn with matching set-aside card', () => {
    const card = stubDeckCard(703, { agentIcons: [AgentIcon.CITY, AgentIcon.LANDSRAAD] })
    const player = makePlayer(0, {
      leader: ilesa,
      setAsideCard: card,
      agentTurnsThisRound: 1,
    })
    expect(shouldGrantIlesaPlayBonus(player, card, 1)).toBe(true)
    expect(shouldGrantIlesaPlayBonus(player, card, 0)).toBe(false)
    expect(shouldGrantIlesaPlayBonus(player, stubDeckCard(999), 1)).toBe(false)
  })

  it('buildIlesaPlayBonusReward: 1 icon → spice, else solari', () => {
    expect(
      buildIlesaPlayBonusReward(stubDeckCard(1, { agentIcons: [AgentIcon.CITY] }))
    ).toEqual({ spice: 1 })
    expect(
      buildIlesaPlayBonusReward(
        stubDeckCard(2, { agentIcons: [AgentIcon.CITY, AgentIcon.LANDSRAAD] })
      )
    ).toEqual({ solari: 1 })
  })

  it('isIlesaLeader', () => {
    expect(isIlesaLeader(ilesa)).toBe(true)
    expect(isIlesaLeader(new Leader('X', { name: 'A', description: 'B' }, 'S', 1))).toBe(false)
  })
})
