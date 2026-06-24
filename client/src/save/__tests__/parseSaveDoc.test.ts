import { describe, expect, it } from 'vitest'
import { SAVE_SCHEMA_VERSION } from '../types'
import { parseSaveDocJson } from '../parseSaveDoc'
import { OFFICIAL_BASE_PACK, OFFICIAL_BASE_RISE_OF_IX_PACK } from '../../gamePacks/constants'

const MINIMAL_SAVE = {
  schemaVersion: SAVE_SCHEMA_VERSION,
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

describe('parseSaveDocJson', () => {
  it('accepts a minimal valid SaveDoc', () => {
    const result = parseSaveDocJson(JSON.stringify(MINIMAL_SAVE))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.setup.players).toHaveLength(1)
      expect(result.doc.events).toEqual([])
    }
  })

  it('rejects invalid JSON', () => {
    expect(parseSaveDocJson('{ not json')).toMatchObject({ ok: false })
  })

  it('rejects empty input', () => {
    expect(parseSaveDocJson('   ')).toMatchObject({ ok: false, error: expect.stringContaining('Paste') })
  })

  it('rejects runtime state dumps', () => {
    const runtime = { phase: 'player_turns', players: [{ id: 0 }] }
    const result = parseSaveDocJson(JSON.stringify(runtime))
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('runtime') })
  })

  it('rejects wrong schema version', () => {
    const result = parseSaveDocJson(JSON.stringify({ ...MINIMAL_SAVE, schemaVersion: 99 }))
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('schemaVersion') })
  })

  it('rejects missing players', () => {
    const bad = { ...MINIMAL_SAVE, setup: { firstPlayer: 0, players: [] } }
    expect(parseSaveDocJson(JSON.stringify(bad))).toMatchObject({ ok: false })
  })

  it('infers official/base@1 when gamePackId is missing', () => {
    const result = parseSaveDocJson(JSON.stringify(MINIMAL_SAVE))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.setup.gamePackId).toBe(OFFICIAL_BASE_PACK)
    }
  })

  it('infers official/base+riseOfIx@1 from legacy expansions', () => {
    const legacy = {
      ...MINIMAL_SAVE,
      setup: {
        ...MINIMAL_SAVE.setup,
        expansions: { riseOfIx: true, riseOfIxEpic: false },
      },
    }
    const result = parseSaveDocJson(JSON.stringify(legacy))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.setup.gamePackId).toBe(OFFICIAL_BASE_RISE_OF_IX_PACK)
    }
  })
})
