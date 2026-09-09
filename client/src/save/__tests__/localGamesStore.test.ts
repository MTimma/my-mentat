import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaveDoc } from '../types'
import {
  __setLocalGamesBackendForTests,
  ACTIVE_LOCAL_GAME_KEY,
  createLocalGame,
  createLocalGameWithConfirm,
  createMemoryLocalGamesBackend,
  deleteLocalGame,
  getActiveLocalGameId,
  getLocalGame,
  listLocalGames,
  LocalGamesFullError,
  MAX_LOCAL_GAMES,
  persistLocalDraft,
  setActiveLocalGameId,
  upsertLocalGame,
} from '../localGamesStore'

function stubDoc(title: string): SaveDoc {
  return {
    schemaVersion: 1,
    meta: {
      id: `meta-${title}`,
      title,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    },
    setup: {} as SaveDoc['setup'],
    events: [],
    branches: [],
    cursor: { branch: 'main', event: 0 },
  }
}

describe('localGamesStore', () => {
  beforeEach(() => {
    __setLocalGamesBackendForTests(createMemoryLocalGamesBackend())
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
    __setLocalGamesBackendForTests(null)
    vi.unstubAllGlobals()
  })

  it('upserts and lists by updatedAt desc', async () => {
    const a = await createLocalGame(stubDoc('Alpha'))
    await new Promise(r => setTimeout(r, 2))
    const b = await createLocalGame(stubDoc('Beta'))
    await upsertLocalGame(a.id, stubDoc('Alpha updated'))

    const listed = await listLocalGames()
    expect(listed.map(row => row.title)).toEqual(['Alpha updated', 'Beta'])
    expect(await getLocalGame(b.id)).toMatchObject({ title: 'Beta', id: b.id })
  })

  it('tracks active local game id', () => {
    setActiveLocalGameId('draft-1')
    expect(getActiveLocalGameId()).toBe('draft-1')
    expect(localStorage.getItem(ACTIVE_LOCAL_GAME_KEY)).toBe('draft-1')
    setActiveLocalGameId(null)
    expect(getActiveLocalGameId()).toBeNull()
  })

  it('clears active id when that draft is deleted', async () => {
    const draft = await createLocalGame(stubDoc('Gone'))
    setActiveLocalGameId(draft.id)
    await deleteLocalGame(draft.id)
    expect(getActiveLocalGameId()).toBeNull()
    expect(await getLocalGame(draft.id)).toBeUndefined()
  })

  it(`rejects create when at ${MAX_LOCAL_GAMES} unless evictOldest`, async () => {
    for (let i = 0; i < MAX_LOCAL_GAMES; i++) {
      await createLocalGame(stubDoc(`D${i}`))
      await new Promise(r => setTimeout(r, 1))
    }
    await expect(createLocalGame(stubDoc('overflow'))).rejects.toBeInstanceOf(LocalGamesFullError)

    const sixth = await createLocalGame(stubDoc('Sixth'), { evictOldest: true })
    expect(sixth.title).toBe('Sixth')
    const listed = await listLocalGames()
    expect(listed).toHaveLength(MAX_LOCAL_GAMES)
    expect(listed.some(row => row.title === 'D0')).toBe(false)
  })

  it('createLocalGameWithConfirm returns null when user declines eviction', async () => {
    for (let i = 0; i < MAX_LOCAL_GAMES; i++) {
      await createLocalGame(stubDoc(`C${i}`))
    }
    const result = await createLocalGameWithConfirm(stubDoc('Nope'), () => false)
    expect(result).toBeNull()
    expect(await listLocalGames()).toHaveLength(MAX_LOCAL_GAMES)
  })

  it('persistLocalDraft upserts when id given, otherwise creates', async () => {
    const first = await persistLocalDraft(stubDoc('One'))
    expect(first?.title).toBe('One')
    const updated = await persistLocalDraft(stubDoc('One b'), first!.id)
    expect(updated?.id).toBe(first!.id)
    expect(updated?.title).toBe('One b')
  })
})
