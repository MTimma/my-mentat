import { describe, expect, it } from 'vitest'
import { OFFICIAL_BASE_PACK, OFFICIAL_BASE_RISE_OF_IX_PACK } from '../../gamePacks/constants'
import { createSandboxGameInput } from '../createSandboxGame'

describe('createSandboxGameInput', () => {
  it('builds a sandbox save for the chosen kit', () => {
    const doc = createSandboxGameInput(OFFICIAL_BASE_PACK, { title: 'Test sandbox' })
    expect(doc.setup.sandbox).toBe(true)
    expect(doc.setup.gamePackId).toBe(OFFICIAL_BASE_PACK)
    expect(doc.setup.players).toHaveLength(4)
    expect(doc.meta.title).toBe('Test sandbox')
  })

  it('pins Rise of Ix when that kit is selected', () => {
    const doc = createSandboxGameInput(OFFICIAL_BASE_RISE_OF_IX_PACK)
    expect(doc.setup.gamePackId).toBe(OFFICIAL_BASE_RISE_OF_IX_PACK)
    expect(doc.setup.expansions?.riseOfIx).toBe(true)
  })
})
