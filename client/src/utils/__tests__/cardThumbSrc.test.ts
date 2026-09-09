import { describe, expect, it } from 'vitest'
import { cardThumbSrc } from '../cardThumbSrc'

describe('cardThumbSrc', () => {
  it('inserts thumbs/ before the filename and normalizes to avif', () => {
    expect(cardThumbSrc('imperium_row/rise_of_ix/jamis.png')).toBe(
      'imperium_row/rise_of_ix/thumbs/jamis.avif'
    )
    expect(cardThumbSrc('/leaders/rise_of_ix/ilesa_ecaz.avif')).toBe(
      '/leaders/rise_of_ix/thumbs/ilesa_ecaz.avif'
    )
  })
})
