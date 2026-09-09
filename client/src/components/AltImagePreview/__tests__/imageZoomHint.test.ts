import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IMAGE_ZOOM_HINT,
  isImageZoomHintEnabled,
  splitImageZoomHint,
  withImageZoomHint,
} from '../imageZoomHint'

function stubHoverPointer(enabled: boolean) {
  const matchMedia = (query: string) => ({
    matches: query.includes('hover: hover') && query.includes('pointer: fine') ? enabled : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })
  vi.stubGlobal('matchMedia', matchMedia)
  vi.stubGlobal('window', {
    matchMedia,
    navigator: { standalone: false },
  })
}

describe('isImageZoomHintEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is off for coarse / touch pointers', () => {
    stubHoverPointer(false)
    expect(isImageZoomHintEnabled()).toBe(false)
    expect(withImageZoomHint('Ambush')).toBe('Ambush')
  })

  it('is on for fine pointer + hover', () => {
    stubHoverPointer(true)
    expect(isImageZoomHintEnabled()).toBe(true)
    expect(withImageZoomHint('Ambush')).toBe(`Ambush\n${IMAGE_ZOOM_HINT}`)
  })
})

describe('withImageZoomHint', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the hint alone when there is no existing title', () => {
    stubHoverPointer(true)
    expect(withImageZoomHint(undefined)).toBe(IMAGE_ZOOM_HINT)
    expect(withImageZoomHint('')).toBe(IMAGE_ZOOM_HINT)
    expect(withImageZoomHint('   ')).toBe(IMAGE_ZOOM_HINT)
  })

  it('appends the hint under the existing tooltip text', () => {
    stubHoverPointer(true)
    expect(withImageZoomHint('Spice Must Flow')).toBe(`Spice Must Flow\n${IMAGE_ZOOM_HINT}`)
  })

  it('does not duplicate the hint', () => {
    stubHoverPointer(true)
    const once = withImageZoomHint('Ambush')
    expect(withImageZoomHint(once)).toBe(once)
  })
})

describe('splitImageZoomHint', () => {
  it('puts the zoom hint on its own line below the label', () => {
    stubHoverPointer(true)
    expect(splitImageZoomHint('View card')).toEqual({
      label: 'View card',
      hint: IMAGE_ZOOM_HINT,
    })
  })
})
