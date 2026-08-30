import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'
import {
  ChoiceType,
  FactionType,
  GainSource,
  type FixedOptionsChoice,
} from '../../../types/GameTypes'
import { playRequirementSatisfied, revealRequirementSatisfied } from '../requirements'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard } from './_helpers'
import { groupGainsBySource } from '../../../utils/turnGainsDisplay'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id

function missionaria(): typeof IMPERIUM_ROW_DECK[number] {
  return structuredClone(IMPERIUM_ROW_DECK.find(c => c.name === 'Missionaria Protectiva')!)
}

function inTheShadows(): typeof RISE_OF_IX_IMPERIUM_DECK[number] {
  const card = structuredClone(RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'In the Shadows')!)
  card.id = 88001
  return card
}

describe('inPlay requirement', () => {
  it('is true when another matching-faction card is in the player play area', () => {
    const missionariaCard = missionaria()
    const shadows = inTheShadows()
    const s = getBaseTestState({ playArea: [shadows] })
    const effect = missionariaCard.playEffect![0]
    expect(playRequirementSatisfied(effect, missionariaCard, s, 0)).toBe(true)
  })

  it('is false when the only matching-faction card is the one being played', () => {
    const missionariaCard = missionaria()
    const s = getBaseTestState({ playArea: [missionariaCard] })
    const effect = missionariaCard.playEffect![0]
    expect(playRequirementSatisfied(effect, missionariaCard, s, 0)).toBe(false)
  })

  it('does not use the unused GameState.playArea map', () => {
    const missionariaCard = missionaria()
    const shadows = inTheShadows()
    const s = getBaseTestState({ playArea: [shadows] })
    s.playArea = {}
    const effect = missionariaCard.playEffect![0]
    expect(playRequirementSatisfied(effect, missionariaCard, s, 0)).toBe(true)
  })
})

describe('bond requirement', () => {
  it('is true when a matching-faction card is already in the player play area', () => {
    const stilgar = stubDeckCard(9101, { faction: [FactionType.FREMEN] })
    const crysknife = stubDeckCard(9102, { faction: [FactionType.FREMEN] })
    const s = getBaseTestState({ playArea: [stilgar] })
    const effect = {
      requirement: { bond: FactionType.FREMEN },
      reward: { spice: 1 },
    }
    expect(revealRequirementSatisfied(effect, crysknife, s, 0, [crysknife])).toBe(true)
  })
})

describe('Missionaria Protectiva agent play', () => {
  it('offers wild influence when In the Shadows is already in play', () => {
    const missionariaCard = missionaria()
    const shadows = inTheShadows()
    let s = getBaseTestState({
      deck: [missionariaCard],
      handCount: 1,
      agents: 1,
      playArea: [shadows],
    })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: missionariaCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })

    const influenceChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.includes('influence')
    ) as FixedOptionsChoice | undefined
    expect(influenceChoice).toBeTruthy()
    expect(influenceChoice!.options).toHaveLength(4)
    expect(influenceChoice!.options.map(o => o.reward?.influence?.amounts?.[0]?.faction)).toEqual(
      expect.arrayContaining([
        FactionType.EMPEROR,
        FactionType.SPACING_GUILD,
        FactionType.BENE_GESSERIT,
        FactionType.FREMEN,
      ])
    )
  })

  it('records the resolved influence gain under Missionaria Protectiva, not the chosen faction', () => {
    const missionariaCard = missionaria()
    const shadows = inTheShadows()
    let s = getBaseTestState({
      deck: [missionariaCard],
      handCount: 1,
      agents: 1,
      playArea: [shadows],
    })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: missionariaCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })

    const influenceChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.includes('influence')
    ) as FixedOptionsChoice
    const emperorIndex = influenceChoice.options.findIndex(
      o => o.reward?.influence?.amounts?.[0]?.faction === FactionType.EMPEROR
    )
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: influenceChoice.id,
      optionIndex: emperorIndex,
      source: { type: GainSource.CARD, id: missionariaCard.id, name: missionariaCard.name },
    })

    const missionariaGains = s.gains.filter(
      g => g.source === GainSource.CARD && g.sourceId === missionariaCard.id
    )
    const groups = groupGainsBySource(missionariaGains)
    expect(groups.map(g => g.title)).toContain('Missionaria Protectiva')
    expect(groups.some(g => g.title === FactionType.EMPEROR || g.title.includes('Alliance'))).toBe(
      false
    )
  })

  it('does not offer wild influence with no Bene Gesserit card already in play', () => {
    const missionariaCard = missionaria()
    let s = getBaseTestState({
      deck: [missionariaCard],
      handCount: 1,
      agents: 1,
      playArea: [],
    })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: missionariaCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })

    const influenceChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.includes('influence')
    )
    expect(influenceChoice).toBeUndefined()
  })
})
