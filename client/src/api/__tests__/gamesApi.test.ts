import { describe, expect, it, vi, afterEach } from 'vitest'
import { adoptLoadedGame, fetchActiveGame, fetchGameDoc, fetchGames, saveGamePath } from '../gamesApi'

const LIST_SAVE_DOC = {
  schemaVersion: 1,
  meta: {
    id: 'test-1',
    title: 'Test',
    createdAt: '2026-06-19T00:00:00Z',
    updatedAt: '2026-06-19T00:00:00Z',
  },
  setup: {
    firstPlayer: 0,
    players: [
      {
        id: 0,
        leaderId: 'paul',
        color: 'red',
        deckCardIds: ['starting/scout'],
      },
    ],
    initialConflictId: 901,
  },
  events: [],
  branches: [],
  cursor: { branch: 'trunk', event: 0 },
}

describe('saveGamePath', () => {
  it('pins a row id so a later session switch cannot retarget the write', () => {
    expect(saveGamePath(12)).toBe('/games/save?id=12')
    expect(saveGamePath()).toBe('/games/save')
  })
})

describe('adoptLoadedGame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('activates the listed row and does not POST /games/save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 7, can_edit: false }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(adoptLoadedGame({} as never, 7)).resolves.toEqual({ id: 7, canEdit: false })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/games/7/activate')
    expect(init.method).toBe('POST')
  })

  it('imports pasted JSON as a new row instead of overwriting the cookie game', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => 99,
    })
    vi.stubGlobal('fetch', fetchMock)

    const doc = { meta: { title: 'Imported' } }
    await expect(adoptLoadedGame(doc as never)).resolves.toEqual({ id: 99, canEdit: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/games/new')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(doc))
  })
})

describe('fetchGames', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads GameDetail rows without a json field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 4,
          owner_id: '1',
          name: 'Siege',
          updated_at: '1710000000',
          created_at: '1700000000',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchGames()).resolves.toEqual([
      {
        id: 4,
        owner_id: '1',
        name: 'Siege',
        updated_at: '1710000000',
        created_at: '1700000000',
      },
    ])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/games')
  })
})

describe('fetchGameDoc', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses GET /games/{id} document JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => JSON.stringify(LIST_SAVE_DOC),
    })
    vi.stubGlobal('fetch', fetchMock)

    const doc = await fetchGameDoc(4)
    expect(doc.meta.title).toBe('Test')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/games/4')
  })
})

describe('fetchActiveGame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads can_edit from GET /games/active', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 3, can_edit: false, doc: LIST_SAVE_DOC }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchActiveGame()
    expect(result?.id).toBe(3)
    expect(result?.canEdit).toBe(false)
  })
})
