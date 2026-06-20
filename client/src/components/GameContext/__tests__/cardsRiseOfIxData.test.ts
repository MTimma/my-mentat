import { describe, expect, it } from 'vitest'
import {
  RISE_OF_IX_IMPERIUM_DECK,
  RISE_OF_IX_UNIQUE_CARD_COUNT,
} from '../../../data/cardsRiseOfIx'
import { AgentIcon } from '../../../types/GameTypes'

describe('cardsRiseOfIx data', () => {
  it('has 35 card instances from 29 unique definitions', () => {
    expect(RISE_OF_IX_UNIQUE_CARD_COUNT).toBe(29)
    expect(RISE_OF_IX_IMPERIUM_DECK).toHaveLength(35)
  })

  it('every card is flagged riseOfIx with imperium_row/rise_of_ix image path', () => {
    for (const card of RISE_OF_IX_IMPERIUM_DECK) {
      expect(card.riseOfIx).toBe(true)
      expect(card.image).toMatch(/^imperium_row\/rise_of_ix\/.+\.png$/)
    }
  })

  it('appropriate has LANDSRAAD then SPICE_TRADE agent icons', () => {
    const appropriate = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'Appropriate')
    expect(appropriate?.agentIcons).toEqual([AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE])
  })

  it('negotiated_withdrawel icon order is SPICE_TRADE, LANDSRAAD, CITY', () => {
    const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'Negotiated Withdrawel')
    expect(card?.agentIcons).toEqual([
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.CITY,
    ])
  })

  it('in_the_shadows icon order is LANDSRAAD, CITY', () => {
    const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'In the Shadows')
    expect(card?.agentIcons).toEqual([AgentIcon.LANDSRAAD, AgentIcon.CITY])
  })

  it('guild_chief_administrator has SG, CITY, SPICE_TRADE icons', () => {
    const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'Guild Chief Administrator')
    expect(card?.agentIcons).toEqual([
      AgentIcon.SPACING_GUILD,
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
    ])
  })
})
