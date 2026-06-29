import { describe, expect, it } from 'vitest'
import { filterBySearchTokens, parseSearchTokens } from '../searchTokens'

describe('parseSearchTokens', () => {
  it('splits on whitespace and lowercases', () => {
    expect(parseSearchTokens('  Foo  Bar ')).toEqual(['foo', 'bar'])
  })
})

describe('filterBySearchTokens', () => {
  const items = [
    { id: 1, text: 'shield wall recruit troop' },
    { id: 2, text: 'spice harvest arrakis' },
    { id: 3, text: 'shield harvest water' },
  ]

  it('returns all items when search is empty', () => {
    expect(filterBySearchTokens(items, '', i => i.text)).toEqual(items)
  })

  it('matches partial tokens with AND logic', () => {
    expect(filterBySearchTokens(items, 'shi rec', i => i.text)).toEqual([items[0]])
  })

  it('falls back to OR when AND has no matches', () => {
    expect(filterBySearchTokens(items, 'shield arrakis', i => i.text)).toEqual(items)
  })
})
