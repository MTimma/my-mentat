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
  const indexCss = readFileSync(resolve(root, 'index.css'), 'utf8')
  const gainsCss = readFileSync(
    resolve(root, 'components/TurnGainsDisplay/TurnGainsDisplay.css'),
    'utf8'
  )
  const historyCss = readFileSync(resolve(root, 'components/TurnHistory.css'), 'utf8')
  const mainTs = readFileSync(resolve(root, 'main.tsx'), 'utf8')

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

  it('locks desktop portrait height so gains cannot stretch the seat', () => {
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(5.75rem, 15vmin, 8rem)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-chrome \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
  })

  it('shows a small source title above desktop column gains', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?font-size:\s*0\.51rem/
    )
  })

  it('keeps each desktop gain row a fixed one-line height', () => {
    expect(seatChromeCss).toContain('--birdseye-gain-row-height: 1.4rem')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?max-height:\s*var\(--birdseye-gain-row-height/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow \{[\s\S]*?flex-wrap:\s*nowrap/
    )
  })

  it('scrolls extra gains inside the portrait box with overflow fades', () => {
    expect(seatChromeCss).toContain('.birdseye-seat-gains__scroll')
    expect(seatChromeCss).toContain('overflow-y: auto')
    expect(seatChromeCss).toContain('birdseye-seat-gains--overflow-end')
    expect(seatChromeTsx).toContain('useScrollOverflowFades')
    expect(seatChromeTsx).toContain('ResizeObserver')
  })

  it('uses IBM Plex Sans and chrome text color for gains and turn history', () => {
    expect(mainTs).toContain('@fontsource/ibm-plex-sans/latin-400.css')
    expect(indexCss).toContain('--font-log: "IBM Plex Sans"')
    expect(gainsCss).toContain('font-family: var(--font-log)')
    expect(historyCss).toContain('font-family: var(--font-log)')
    expect(gainsCss).toMatch(
      /\.turn-gain-source-title \{[\s\S]*?color:\s*var\(--chrome-text-muted\)/
    )
    expect(historyCss).toMatch(
      /\.turn-history-overlay--docked \.turn-history-gains \.turn-gain-source-title \{[\s\S]*?color:\s*var\(--chrome-text-muted\)/
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
