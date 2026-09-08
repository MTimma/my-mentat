import { describe, expect, it } from 'vitest'
import { IMAGE_ZOOM_HINT, splitImageZoomHint, withImageZoomHint } from '../imageZoomHint'

describe('withImageZoomHint', () => {
  it('uses the hint alone when there is no existing title', () => {
    expect(withImageZoomHint(undefined)).toBe(IMAGE_ZOOM_HINT)
    expect(withImageZoomHint('')).toBe(IMAGE_ZOOM_HINT)
    expect(withImageZoomHint('   ')).toBe(IMAGE_ZOOM_HINT)
  })

  it('appends the hint under the existing tooltip text', () => {
    expect(withImageZoomHint('Spice Must Flow')).toBe(`Spice Must Flow\n${IMAGE_ZOOM_HINT}`)
  })

  it('does not duplicate the hint', () => {
    const once = withImageZoomHint('Ambush')
    expect(withImageZoomHint(once)).toBe(once)
  })
})

describe('splitImageZoomHint', () => {
  it('puts the zoom hint on its own line below the label', () => {
    expect(splitImageZoomHint('View card')).toEqual({
      label: 'View card',
      hint: IMAGE_ZOOM_HINT,
    })
  })
})
