import { describe, expect, it } from 'vitest'
import { ensureJsonFilename, suggestedSaveFilenameFromTitle } from '../saveJsonFile'

describe('suggestedSaveFilenameFromTitle', () => {
  it('slugifies a title', () => {
    expect(suggestedSaveFilenameFromTitle('Friday game vs. Abby')).toBe('friday-game-vs-abby')
  })

  it('falls back to timestamped name for empty titles', () => {
    expect(suggestedSaveFilenameFromTitle('   ')).toMatch(/^save-\d+$/)
  })
})

describe('ensureJsonFilename', () => {
  it('appends .json when missing', () => {
    expect(ensureJsonFilename('my-game')).toBe('my-game.json')
  })

  it('strips redundant .json extension', () => {
    expect(ensureJsonFilename('my-game.json')).toBe('my-game.json')
  })

  it('falls back for blank input', () => {
    expect(ensureJsonFilename('')).toMatch(/^save-\d+\.json$/)
  })
})
