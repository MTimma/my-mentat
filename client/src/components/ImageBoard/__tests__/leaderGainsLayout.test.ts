import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts: desktop leader gains expand into leftover space
 * after portraits, without shrinking portraits or restyling combat/buttons.
 */
describe('Leader gains leftover layout', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
  const seatChromeCss = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
    'utf8'
  )
  const seatChromeTsx = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.tsx'),
    'utf8'
  )
  const cluster = readFileSync(
    resolve(root, 'components/ImageBoard/CombatAreaCluster.tsx'),
    'utf8'
  )

  it('history-docked leader dock grows into leftover toward Turn History', () => {
    expect(imageBoardCss).toContain(
      '.game-container--desktop-play.game-container--history-docked .image-board__expansion-dock-column'
    )
    expect(imageBoardCss).toMatch(/flex:\s*1 0 auto/)
    expect(imageBoardCss).toContain('max-width: min(46rem, 100%)')
    expect(imageBoardCss).toContain('min-width: clamp(220px, 32vmin, 420px)')
  })

  it('does not shrink leader portraits', () => {
    expect(seatChromeCss).toContain('width: clamp(7rem, 18vmin, 10.5rem)')
  })

  it('desktop column gains are not capped at 11rem on the active seat', () => {
    const columnGains = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(columnGains).toBeTruthy()
    expect(columnGains).toContain('max-width: none')
    expect(columnGains).not.toMatch(/max-width:\s*11rem/)
  })

  it('inactive seat gains stay compact', () => {
    expect(seatChromeCss).toContain(
      '.combat-area-cluster__seat:not(.combat-area-cluster__seat--active)'
    )
    expect(seatChromeCss).toMatch(
      /seat:not\(\.combat-area-cluster__seat--active\)[\s\S]*?\.birdseye-seat-gains \{[\s\S]*?max-width:\s*11rem/
    )
  })

  it('uses a wrapping source grid for desktop column gains', () => {
    expect(seatChromeCss).toContain(
      'grid-template-columns: repeat(auto-fill, minmax(8.75rem, 1fr))'
    )
  })

  it('active desktop gains can show type totals', () => {
    expect(seatChromeTsx).toContain('showTotals={showTotals}')
  })

  it('resolves discarded card titles in seat gains', () => {
    expect(seatChromeTsx).toContain('resolveCard={resolveCard}')
    expect(cluster).toContain('resolveSeatCard')
    expect(cluster).toContain('resolveCardInSnapshot')
  })
})
