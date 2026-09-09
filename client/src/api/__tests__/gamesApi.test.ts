import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  fetchGameDoc,
  fetchGames,
  invalidateGamesListCache,
  prefetchGamesList,
} from '../gamesApi'

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

describe('fetchGames', () => {
  afterEach(() => {
    invalidateGamesListCache()
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

  it('prefetchGamesList dedupes network calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    prefetchGamesList()
    prefetchGamesList()
    await expect(fetchGames()).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('fetchGameDoc', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses GET /games/{id} with can_edit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 4,
        can_edit: false,
        doc: LIST_SAVE_DOC,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchGameDoc(4)
    expect(result.doc.meta.title).toBe('Test')
    expect(result.canEdit).toBe(false)
    expect(result.id).toBe(4)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/games/4')
  })

  it('treats owner can_edit true as editable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 7,
        can_edit: true,
        doc: LIST_SAVE_DOC,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchGameDoc(7)).resolves.toMatchObject({ id: 7, canEdit: true })
  })
})
