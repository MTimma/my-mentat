import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasSeenWelcome, markWelcomeSeen, WELCOME_SEEN_STORAGE_KEY } from '../welcomeSeen'

describe('welcomeSeen', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is unseen until dismissed', () => {
    expect(hasSeenWelcome()).toBe(false)
    markWelcomeSeen()
    expect(hasSeenWelcome()).toBe(true)
    expect(localStorage.getItem(WELCOME_SEEN_STORAGE_KEY)).toBe('1')
  })
})
