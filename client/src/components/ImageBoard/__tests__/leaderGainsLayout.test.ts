import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts: desktop leader seats are vertical like mobile.
 * Leftover board-column height feeds gains; portraits stay a fixed face height.
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

  it('does not grow the history-docked leader dock into leftover width', () => {
    const docked = imageBoardCss.match(
      /\.game-container--desktop-play\.game-container--history-docked \.image-board__expansion-dock-column \{[\s\S]*?\}/
    )?.[0]
    expect(docked).toBeTruthy()
    expect(docked).toContain('flex: 0 0 auto')
    expect(docked).toContain('width: clamp(220px, 32vmin, 420px)')
    expect(docked).not.toContain('max-width: min(46rem, 100%)')
  })

  it('stretches the expansion dock to board height so leftover is vertical', () => {
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__desktop-shell \{[\s\S]*?align-items:\s*stretch/
    )
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__expansion-dock-column \{[\s\S]*?align-self:\s*stretch/
    )
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__combat-area-dock \{[\s\S]*?flex:\s*1 1 auto/
    )
  })

  it('does not shrink leader portrait height', () => {
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(5.75rem, 15vmin, 8rem)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-leader \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
  })

  it('desktop column gains are not capped at 11rem', () => {
    const columnGains = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(columnGains).toBeTruthy()
    expect(columnGains).toContain('max-width: none')
    expect(columnGains).not.toMatch(/max-width:\s*11rem/)
  })

  it('stacks desktop seats vertically like mobile', () => {
    const seatMain = seatChromeCss.match(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?\}/
    )?.[0]
    expect(seatMain).toBeTruthy()
    expect(seatMain).toContain('flex-direction: column')
    expect(seatMain).not.toContain('flex-direction: row')
    expect(cluster).toContain('combat-area-cluster__seat-leader')
    expect(cluster).toContain('combat-area-cluster__seat-meta')
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const desktopBlock = cluster.slice(desktopIdx, desktopIdx + 2500)
    expect(desktopBlock).toContain('showResources={false}')
    expect(desktopBlock).toContain('ResourceGrid')
  })

  it('can reverse so leaders sit at the bottom and gains go up', () => {
    expect(cluster).toContain("desktopGainsDir === 'up'")
    expect(cluster).toContain('combat-area-cluster--gains-up')
    expect(cluster).toContain('Leaders top')
    expect(cluster).toContain('Leaders bottom')
    expect(seatChromeCss).toContain(
      '.combat-area-cluster--column.combat-area-cluster--gains-up .combat-area-cluster__seat-main'
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--gains-up \.combat-area-cluster__seat-main \{[\s\S]*?flex-direction:\s*column-reverse/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--gains-up \.combat-area-cluster__seat-meta \{[\s\S]*?flex-direction:\s*column-reverse/
    )
  })

  it('uses a vertical source list for desktop column gains', () => {
    expect(seatChromeCss).not.toContain(
      'grid-template-columns: repeat(auto-fill, minmax(8.75rem, 1fr))'
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gains-display \{[\s\S]*?flex-direction:\s*column/
    )
  })

  it('locks desktop portrait height so gains fill leftover instead of stretching the face', () => {
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(5.75rem, 15vmin, 8rem)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-leader \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?max-height:\s*none/
    )
  })

  it('shows a small source title above desktop column gains', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?font-size:\s*0\.51rem/
    )
  })

  it('lets desktop gain rows wrap instead of a fixed one-line height', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?max-height:\s*none/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow \{[\s\S]*?flex-wrap:\s*wrap/
    )
  })

  it('scrolls extra gains inside the seat with overflow fades', () => {
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
