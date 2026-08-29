import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts: desktop leaders sit in a 4-seat row beside the board
 * (like mobile). Each seat stacks portrait + vertical gains.
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

  it('grows the history-docked leader dock into leftover width for four columns', () => {
    const docked = imageBoardCss.match(
      /\.game-container--desktop-play\.game-container--history-docked \.image-board__expansion-dock-column \{[\s\S]*?\}/
    )?.[0]
    expect(docked).toBeTruthy()
    expect(docked).toContain('flex: 1 0 auto')
    expect(docked).toContain('max-width: min(52rem, 100%)')
    expect(docked).toContain('min-width: clamp(26rem, 40vmin, 32rem)')
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
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(4.5rem, 9vmin, 6rem)')
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

  it('keeps desktop leader resources in a fixed 4-col 2-row grid', () => {
    const resources = imageBoardCss.match(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye\s+\.combat-area-cluster__seat-meta\s+\.combat-area-cluster__resources \{[\s\S]*?\}/
    )?.[0]
    expect(resources).toBeTruthy()
    expect(resources).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(resources).toContain('grid-template-rows: repeat(2, auto)')
    expect(resources).toContain('flex-wrap: nowrap')
    expect(imageBoardCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye\s+\.combat-area-cluster__seat-meta\s+\.combat-area-cluster__resource \{[\s\S]*?flex-direction:\s*row/
    )
    expect(imageBoardCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye\s+\.combat-area-cluster__seat-meta\s+\.combat-area-cluster__resource \{[\s\S]*?font-size:\s*clamp\(8px, 12cqi, 14px\)/
    )
    expect(imageBoardCss).toContain('container-name: desktop-leader-resources')
  })

  it('places desktop seats in a horizontal row with vertical gains like mobile', () => {
    const clusterRule = seatChromeCss.match(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \{[\s\S]*?\}/
    )?.[0]
    expect(clusterRule).toBeTruthy()
    expect(clusterRule).toContain('display: grid')
    expect(clusterRule).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \.combat-area-cluster__seat--birdseye,[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/
    )
    const seatMain = seatChromeCss.match(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?\}/
    )?.[0]
    expect(seatMain).toBeTruthy()
    expect(seatMain).toContain('flex-direction: column')
    expect(seatMain).not.toContain('flex-direction: row')
    expect(imageBoardCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \.combat-area-cluster__seat \{[\s\S]*?max-width:\s*none/
    )
    expect(cluster).toContain('combat-area-cluster__seat-leader')
    expect(cluster).toContain('combat-area-cluster__seat-meta')
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const desktopBlock = cluster.slice(desktopIdx, desktopIdx + 2500)
    expect(desktopBlock).toContain('showResources={false}')
    expect(desktopBlock).toContain('ResourceGrid')
    expect(desktopBlock).toContain('showSourceTitles')
    expect(desktopBlock).not.toContain('showSourceTitles={false}')
  })

  it('toggles per-seat vertical play area vs a dock-width horizontal strip', () => {
    expect(cluster).toContain('Play area vertical')
    expect(cluster).toContain('Play area horizontal')
    expect(cluster).toContain('combat-area-cluster--play-horizontal')
    expect(cluster).toContain('combat-area-cluster-stack--play-horizontal')
    expect(cluster).toContain('orientation="horizontal"')
    expect(cluster).toContain("desktopPlayAreaLayout === 'horizontal'")
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \{[\s\S]*?grid-template-rows:\s*max-content minmax\(0, 1fr\) minmax\(0, 1fr\)/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--play-horizontal \{[\s\S]*?grid-template-rows:\s*max-content minmax\(0, 1fr\) max-content/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--column > \.birdseye-seat-play-area--horizontal \{[\s\S]*?height:\s*clamp\(7\.2rem, 18vh, 10\.5rem\)/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--column > \.birdseye-seat-play-area--horizontal \.birdseye-seat-play-area__cards \{[\s\S]*?flex-direction:\s*row/
    )
    expect(seatChromeCss).not.toContain('combat-area-cluster--gains-up')
    expect(cluster).not.toContain('Leaders top')
    expect(cluster).not.toContain('Leaders bottom')
  })

  it('uses a vertical source list for desktop column gains', () => {
    expect(seatChromeCss).not.toContain(
      'grid-template-columns: repeat(auto-fill, minmax(8.75rem, 1fr))'
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gains-display \{[\s\S]*?flex-direction:\s*column/
    )
  })

  it('locks desktop portrait height so leftover can sit under the face', () => {
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(4.5rem, 9vmin, 6rem)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-leader \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?max-height:\s*none/
    )
  })

  it('shows a small source title above desktop column gains', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?font-size:\s*0\.58rem/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?-webkit-line-clamp:\s*1/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?white-space:\s*normal/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-title \{[\s\S]*?text-transform:\s*none/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?border:\s*1px solid rgba\(255, 248, 232, 0\.14\)/
    )
    expect(seatChromeCss).toContain(
      '.combat-area-cluster--column .birdseye-seat-gains .turn-gain-source-flow__tech-badge'
    )
    expect(seatChromeTsx).toContain('BirdseyeInteractionsHost hostRef={interactionsHostRef}')
  })

  it('lets desktop gain rows wrap instead of a fixed one-line height', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?max-height:\s*none/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow \{[\s\S]*?flex-wrap:\s*nowrap/
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

  it('stacks desktop gain sources as boxes and does not stretch them into leftover height', () => {
    const columnGains = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(columnGains).toBeTruthy()
    expect(columnGains).toContain('flex: 0 1 auto')
    expect(columnGains).not.toMatch(/flex:\s*1 1 auto/)
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?background:\s*rgba\(10, 9, 8, 0\.72\)/
    )
  })

  it('places turn buttons and pending choices in-flow under the leader', () => {
    const controls = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat__controls-row \{[\s\S]*?\}/
    )?.[0]
    expect(controls).toBeTruthy()
    expect(controls).toContain('position: static')
    expect(controls).not.toContain('position: absolute')
    expect(seatChromeCss).not.toContain('birdseye-controls-out-left')
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const desktopBlock = cluster.slice(desktopIdx, desktopIdx + 2800)
    expect(desktopBlock.indexOf('BirdseyeDesktopControls')).toBeGreaterThan(
      desktopBlock.indexOf('combat-area-cluster__seat-meta')
    )
    expect(desktopBlock.indexOf('BirdseyeDesktopControls')).toBeGreaterThan(
      desktopBlock.indexOf('ResourceGrid')
    )
  })

  it('gives leftover height to a per-seat play area under the leaders', () => {
    expect(cluster).toContain('BirdseyeSeatPlayArea')
    expect(cluster).toContain('getPlayAreaCardsForTurnView')
    expect(seatChromeTsx).toContain('export function BirdseyeSeatPlayArea')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area \{[\s\S]*?flex:\s*1 1 auto/
    )
  })

  it('keeps desktop gains above the leader, not in the play-area column', () => {
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const desktopBlock = cluster.slice(desktopIdx, desktopIdx + 3500)
    expect(desktopBlock).toContain('combat-area-cluster__seat-head')
    expect(desktopBlock.indexOf('BirdseyeSeatGains')).toBeLessThan(
      desktopBlock.indexOf('combat-area-cluster__seat-leader')
    )
    expect(desktopBlock.indexOf('BirdseyeSeatPlayArea')).toBeGreaterThan(
      desktopBlock.indexOf('combat-area-cluster__seat-meta')
    )
    expect(seatChromeTsx).not.toContain('Play area</span>')
    expect(seatChromeCss).not.toContain('birdseye-seat-play-area__label')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-head \{[\s\S]*?display:\s*contents/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \.combat-area-cluster__seat-leader \{[\s\S]*?align-self:\s*end/
    )
  })

  it('stacks revealed play-area cards with reversed z-index so bottoms show', () => {
    expect(cluster).toContain('getRevealedCardIdsForTurnView')
    expect(seatChromeTsx).toContain('birdseye-seat-play-area__card--revealed')
    expect(seatChromeTsx).toContain('revealedCount - revealedOrder')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area__cards \{[\s\S]*?isolation:\s*isolate/
    )
  })
})
