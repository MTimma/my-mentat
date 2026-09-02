import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { getRepeatedIconDisplay } from '../../../utils/turnGainsDisplay'

describe('Gain count labels', () => {
  const tsx = readFileSync(
    resolve(__dirname, '../TurnGainsDisplay.tsx'),
    'utf8'
  )

  it('Heighliner recruits five troops', () => {
    const heighliner = BOARD_SPACES.find(space => space.name === 'Heighliner')
    expect(heighliner?.effects?.[0]?.reward?.troops).toBe(5)
  })

  it('five troops render as one cube plus a count', () => {
    expect(getRepeatedIconDisplay(5)).toEqual({ iconCount: 1, showTotalMultiplier: true })
  })

  it('prints the count as a plain number, not ×N', () => {
    expect(tsx).toContain('return <span className="gain-multiplier">{absAmount}</span>')
    expect(tsx).not.toContain('×{absAmount}')
  })

  it('reveal turns pool persuasion and swords, then title other effects', () => {
    expect(tsx).toContain('revealPooledTotals')
    expect(tsx).toContain('splitRevealPooledGains')
    expect(tsx).not.toContain('data-preview-hover')
  })
})
