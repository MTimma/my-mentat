import { describe, expect, it } from 'vitest'
import { intrigueCards } from '../intrigueCards'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../intrigueCardsRiseOfIx'
import { ALL_INTRIGUE_CARDS } from '../../services/IntrigueDeckService'

describe('intrigue deck pool', () => {
  it('includes 32 base cards without Rise of Ix', () => {
    expect(ALL_INTRIGUE_CARDS({ riseOfIx: false, riseOfIxEpic: false })).toHaveLength(
      intrigueCards.length
    )
    expect(intrigueCards).toHaveLength(32)
    expect(ALL_INTRIGUE_CARDS({ riseOfIx: false, riseOfIxEpic: false })).toHaveLength(32)
  })

  it('includes 49 cards with Rise of Ix', () => {
    expect(RISE_OF_IX_INTRIGUE_CARDS).toHaveLength(17)
    expect(ALL_INTRIGUE_CARDS({ riseOfIx: true, riseOfIxEpic: false })).toHaveLength(49)
  })
})
