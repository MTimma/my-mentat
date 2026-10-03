import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Family Atomics portrait and turn control', () => {
  const root = resolve(__dirname, '../../..')
  const cluster = readFileSync(resolve(root, 'components/ImageBoard/CombatAreaCluster.tsx'), 'utf8')
  const boardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
  const seatCss = readFileSync(resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'), 'utf8')

  it('shows the atomics icon on a leader portrait until that player spends it', () => {
    expect(cluster).toContain("src=\"/icon/atomic.png\"")
    expect(cluster).toContain('combat-area-cluster__atomics-badge')
    expect(cluster).toContain('player.familyAtomicsUsed !== true')
    expect(cluster).toContain('gameState?.expansions?.immortality === true')
    expect(boardCss).toContain('.combat-area-cluster__atomics-badge')
    expect(boardCss).toMatch(
      /\.combat-area-cluster--row \.combat-area-cluster__atomics-badge \{[\s\S]*?width:\s*14px/
    )
  })

  it('keeps the seat atomics button smaller than intrigue and tech', () => {
    expect(seatCss).toMatch(
      /\.birdseye-seat-btn--atomics img \{[\s\S]*?width:\s*1rem;[\s\S]*?height:\s*1rem/
    )
    expect(seatCss).toMatch(
      /\.birdseye-seat__utils \.birdseye-seat-btn\.birdseye-seat-btn--atomics \{[\s\S]*?width:\s*1\.65rem/
    )
    expect(seatCss).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;')
  })
})
