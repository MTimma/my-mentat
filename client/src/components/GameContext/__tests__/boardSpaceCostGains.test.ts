import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { AgentIcon, GainSource, RewardType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'
import { getGainsForTurnState } from '../../../utils/turnGainsDisplay'

const HIGH_COUNCIL_ID = BOARD_SPACES.find(s => s.name === 'High Council')!.id
const HAGGA_BASIN_ID = BOARD_SPACES.find(s => s.name === 'Hagga Basin')!.id
const SELL_MELANGE_ID = BOARD_SPACES.find(s => s.name === 'Sell Melange')!.id
const SELECTIVE_BREEDING_ID = BOARD_SPACES.find(s => s.name === 'Selective Breeding')!.id

function placeAgent(
  playerId: number,
  cardId: number,
  spaceId: number,
  extra?: { sellMelangeData?: { spiceCost: number; solariReward: number }; selectiveBreedingData?: { trashedCardId: number } }
) {
  let s = getBaseTestState({ solari: 20, spice: 10, water: 3 })
  s = withCardOnTop(s, playerId, stubDeckCard(cardId, { agentIcons: [AgentIcon.LANDSRAAD] }))
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId, ...extra })
  return s
}

describe('Board space access costs in turn history', () => {
  it('records Solari cost for High Council', () => {
    const s = placeAgent(0, 7001, HIGH_COUNCIL_ID)
    const gains = getGainsForTurnState(s)
    expect(gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.BOARD_SPACE,
        name: 'High Council',
        type: RewardType.SOLARI,
        amount: -5,
      })
    )
  })

  it('records Water cost for Hagga Basin', () => {
    let s = getBaseTestState({ water: 3 })
    const card = stubDeckCard(7002, { agentIcons: [AgentIcon.SPICE_TRADE] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: HAGGA_BASIN_ID })

    const gains = getGainsForTurnState(s)
    expect(gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.BOARD_SPACE,
        name: 'Hagga Basin',
        type: RewardType.WATER,
        amount: -1,
      })
    )
  })

  it('records chosen Spice cost for Sell Melange', () => {
    let s = getBaseTestState({ spice: 10 })
    const card = stubDeckCard(7003, { agentIcons: [AgentIcon.SPICE_TRADE] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: SELL_MELANGE_ID,
      sellMelangeData: { spiceCost: 3, solariReward: 8 },
    })

    const gains = getGainsForTurnState(s)
    expect(gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.BOARD_SPACE,
        name: 'Sell Melange',
        type: RewardType.SPICE,
        amount: -3,
      })
    )
    expect(gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.BOARD_SPACE,
        name: 'Sell Melange',
        type: RewardType.SOLARI,
        amount: 8,
      })
    )
  })

  it('records Spice cost for Selective Breeding', () => {
    let s = getBaseTestState({ spice: 10 })
    const played = stubDeckCard(7004, { agentIcons: [AgentIcon.BENE_GESSERIT] })
    const trashed = stubDeckCard(7005)
    s = withCardOnTop(s, 0, played)
    s.players[0].deck.push(trashed)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: played.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: SELECTIVE_BREEDING_ID,
      selectiveBreedingData: { trashedCardId: trashed.id },
    })

    const gains = getGainsForTurnState(s)
    expect(gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.BOARD_SPACE,
        name: 'Selective Breeding',
        type: RewardType.SPICE,
        amount: -2,
      })
    )
  })
})
