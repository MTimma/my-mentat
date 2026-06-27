import { describe, expect, it } from 'vitest'
import { AgentIcon, CardPile, ChoiceType, Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import {
  buildArmandTrashChoice,
  countArmandQualifyingAgents,
  isArmandLeader,
  shouldOfferArmandTrashChoice,
} from '../armandTrashInPlay'
import { getRoiTestState, makePlayer } from '../../../components/GameContext/__tests__/_helpers'

describe('Armand Ecaz — Houses\' Confidence', () => {
  const armand = new Leader(
    LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ,
    { name: "Houses' Confidence", description: 'Trash in play on reveal.' },
    'Signet',
    2
  )

  it('counts agents on City, Spice Trade, and Landsraad spaces', () => {
    let s = getRoiTestState({
      playerOverrides: { leader: armand },
      stateOverrides: {
        occupiedSpaces: {
          1: [0], // Rally Troops — CITY
          10: [0], // Landsraad
          3: [1],
        },
      },
    })
    expect(countArmandQualifyingAgents(s, 0)).toBe(2)

    s = {
      ...s,
      occupiedSpaces: { 15: [0] }, // Wealth — Emperor, not City/Landsraad/Spice Trade
    }
    expect(countArmandQualifyingAgents(s, 0)).toBe(0)
  })

  it('shouldOfferArmandTrashChoice requires Armand, playArea, and 2+ qualifying agents', () => {
    const player = makePlayer(0, {
      leader: armand,
      playArea: [{ id: 1, name: 'x', image: '', agentIcons: [AgentIcon.CITY] }],
    })
    let s = getRoiTestState({
      stateOverrides: { occupiedSpaces: { 1: [0], 10: [0] } },
    })
    s = { ...s, players: [player] }
    expect(shouldOfferArmandTrashChoice(s, player)).toBe(true)

    expect(
      shouldOfferArmandTrashChoice(
        { ...s, occupiedSpaces: { 1: [0] } },
        player
      )
    ).toBe(false)

    const nonArmand = makePlayer(0, { playArea: player.playArea })
    expect(shouldOfferArmandTrashChoice(s, nonArmand)).toBe(false)

    expect(
      shouldOfferArmandTrashChoice(s, { ...player, playArea: [] })
    ).toBe(false)
  })

  it('buildArmandTrashChoice targets playArea', () => {
    const player = makePlayer(0, { leader: armand, playArea: [{ id: 5, name: 'c', image: '', agentIcons: [] }] })
    const choice = buildArmandTrashChoice(getRoiTestState(), player)
    expect(choice.type).toBe(ChoiceType.CARD_SELECT)
    expect(choice.piles).toContain(CardPile.PLAY_AREA)
    expect(isArmandLeader(armand)).toBe(true)
  })
})
