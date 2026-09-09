import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { schedulePreloadImageUrls } from '../preloadImages'

describe('schedulePreloadImageUrls', () => {
  beforeEach(() => {
    const created: string[] = []
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => {
        cb()
        return 1
      },
    })
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(v: string) {
          created.push(v)
          queueMicrotask(() => this.onload?.())
        }
      }
    )
    ;(globalThis as { __preloadCreated?: string[] }).__preloadCreated = created
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('dedupes urls across calls', () => {
    const created = (globalThis as { __preloadCreated: string[] }).__preloadCreated
    schedulePreloadImageUrls(['a.avif', 'b.avif'])
    schedulePreloadImageUrls(['b.avif', 'c.avif'])
    expect([...created].sort()).toEqual(['a.avif', 'b.avif', 'c.avif'])
  })
})
