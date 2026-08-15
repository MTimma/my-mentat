import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('RoI shipping tracker wiring', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const styles = readFileSync(resolve(root, 'data/boardTrackerStyles.ts'), 'utf8')

  it('places shipping markers with the same BoardTracker circle used by High Council seats', () => {
    expect(imageBoard).toContain('kind="shipping"')
    expect(imageBoard).toContain('marker="shipping"')
    expect(imageBoard).not.toContain('image-board__freighter-disc')
    expect(styles).toMatch(/shipping:\s*'circle'/)
    expect(styles).toMatch(/'high-council':\s*'circle'/)
  })
})
