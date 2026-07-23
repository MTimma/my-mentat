import { describe, expect, it } from 'vitest'
import { getBoardTrackerVariant } from '../boardTrackerStyles'

describe('getBoardTrackerVariant', () => {
  it('returns configured defaults per track kind', () => {
    expect(getBoardTrackerVariant('influence')).toBe('cube')
    expect(getBoardTrackerVariant('vp')).toBe('portrait')
    expect(getBoardTrackerVariant('high-council')).toBe('circle')
  })
})
