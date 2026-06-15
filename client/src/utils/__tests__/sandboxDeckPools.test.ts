import { describe, expect, it } from 'vitest'
import { applySandboxDeckEdit, sandboxCardPoolForId, splitCardPool } from '../sandboxDeckPools'
import type { Card } from '../../types/GameTypes'

function stubCard(id: number, name = `Card ${id}`): Card {
  return {
    id,
    name,
    agentIcons: [],
    image: '',
  }
}

describe('sandboxDeckPools', () => {
  it('routes reserve card ids to the correct pool', () => {
    expect(sandboxCardPoolForId(201)).toBe('arrakisLiaison')
    expect(sandboxCardPoolForId(301)).toBe('spiceMustFlow')
    expect(sandboxCardPoolForId(401)).toBe('foldspace')
    expect(sandboxCardPoolForId(9001)).toBe('imperium')
  })

  it('swaps imperium deck cards like before', () => {
    const oldDeck = [stubCard(1), stubCard(2)]
    const pools = {
      imperiumRowDeck: [stubCard(9001), stubCard(9002)],
      arrakisLiaisonDeck: [] as Card[],
      spiceMustFlowDeck: [] as Card[],
      foldspaceDeck: [] as Card[],
    }

    const next = applySandboxDeckEdit(pools, oldDeck, [stubCard(9001), stubCard(2)])

    expect(next.imperiumRowDeck.map(c => c.id)).toEqual([9002, 1])
    expect(next.arrakisLiaisonDeck).toHaveLength(0)
  })

  it('moves reserve cards into and out of a player deck', () => {
    const liaison = stubCard(201, 'Arrakis Liaison')
    const foldspace = stubCard(401, 'Foldspace')
    const pools = {
      imperiumRowDeck: [stubCard(9001)],
      arrakisLiaisonDeck: [liaison],
      spiceMustFlowDeck: [stubCard(301, 'Spice Must Flow')],
      foldspaceDeck: [foldspace],
    }
    const oldDeck = [stubCard(1), stubCard(2)]

    const next = applySandboxDeckEdit(pools, oldDeck, [
      liaison,
      stubCard(301, 'Spice Must Flow'),
      foldspace,
      stubCard(1),
      stubCard(2),
      stubCard(3),
      stubCard(4),
      stubCard(5),
      stubCard(6),
      stubCard(7),
      stubCard(8),
      stubCard(9),
      stubCard(10),
      stubCard(11),
      stubCard(12),
      stubCard(13),
      stubCard(14),
      stubCard(15),
      stubCard(16),
      stubCard(17),
    ])

    expect(next.arrakisLiaisonDeck).toHaveLength(0)
    expect(next.spiceMustFlowDeck).toHaveLength(0)
    expect(next.foldspaceDeck).toHaveLength(0)
    expect(next.imperiumRowDeck.map(c => c.id)).toEqual([9001])
  })

  it('splitCardPool moves selected cards into a pile and leaves the rest in deck', () => {
    const pool = [stubCard(1), stubCard(2), stubCard(2), stubCard(3)]
    const { inPile, remainder } = splitCardPool(pool, [stubCard(2), stubCard(3)])

    expect(inPile.map(c => c.id)).toEqual([2, 3])
    expect(remainder.map(c => c.id)).toEqual([1, 2])
  })
})
