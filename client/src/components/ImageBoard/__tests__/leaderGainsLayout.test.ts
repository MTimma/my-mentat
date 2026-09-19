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
  const imageBoardTsx = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const appTsx = readFileSync(resolve(root, 'App.tsx'), 'utf8')
  const appCss = readFileSync(resolve(root, 'App.css'), 'utf8')
  const historyGridTsx = readFileSync(
    resolve(root, 'components/ImageBoard/BirdseyeTurnHistoryGrid.tsx'),
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
    expect(docked).toContain('flex: 1 1 0%')
    expect(docked).toContain('min-width: 0')
    expect(docked).toContain('max-width: min(52rem, 100%)')
    expect(docked).not.toContain('flex: 1 0 auto')
    expect(docked).not.toContain('flex: 1 1 auto')
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
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__desktop-shell \{[\s\S]*?overflow:\s*hidden/
    )
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__expansion-dock-column \{[\s\S]*?overflow:\s*hidden/
    )
    expect(imageBoardCss).toMatch(
      /\.game-container--desktop-play \.image-board__combat-area-dock \{[\s\S]*?overflow:\s*hidden/
    )
  })

  it('keeps the birdseye leader dock inside the visible board column so play-area can scroll', () => {
    expect(appCss).toMatch(
      /\.game-container--desktop-play\.game-container--birdseye-desktop\.game-container--history-panel-hidden\s+\.play-board-column \{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) auto/
    )
    expect(appCss).toMatch(
      /\.game-container--desktop-play\.game-container--birdseye-desktop\.game-container--history-panel-hidden\s+\.play-board-scroll \{[\s\S]*?overflow:\s*hidden/
    )
    expect(imageBoardCss).toMatch(
      /\.combat-area-cluster-stack--column \{[\s\S]*?overflow:\s*hidden/
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
    expect(columnGains).toContain('max-width: 100%')
    expect(columnGains).not.toMatch(/max-width:\s*11rem/)
    expect(columnGains).not.toMatch(/max-width:\s*none/)
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
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \.combat-area-cluster__seat \{[\s\S]*?max-width:\s*100%/
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

  it('toggles per-seat vertical play area vs a chess-style turn history grid above leaders', () => {
    expect(cluster).toContain('Turn log vertical')
    expect(cluster).not.toContain('Turn log horizontal')
    expect(cluster).toContain('isRow && birdseyeEnabled')
    expect(cluster).not.toContain('isColumn && birdseyeEnabled ?')
    expect(cluster).toContain('combat-area-cluster--play-horizontal')
    expect(cluster).toContain('combat-area-cluster-stack--play-horizontal')
    expect(cluster).toContain('BirdseyeTurnHistoryGrid')
    expect(cluster).toContain('const playAreaHorizontal = isColumn && birdseyeEnabled')
    expect(cluster).not.toContain('orientation="horizontal"')
    expect(historyGridTsx).toContain('export function BirdseyeTurnHistoryGrid')
    expect(historyGridTsx).toContain('buildBirdseyeTurnHistoryGrid')
    expect(historyGridTsx).toContain('role="grid"')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \{[\s\S]*?grid-template-rows:\s*var\(--birdseye-gains-slot-height\) var\(--birdseye-desktop-face-height\) minmax\(0, 1fr\)/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--play-horizontal \{[\s\S]*?grid-template-rows:\s*var\(--birdseye-gains-slot-height\)[\s\S]*?var\(--birdseye-desktop-face-height\)[\s\S]*?minmax\(0, 1fr\)/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--play-horizontal \{[\s\S]*?height:\s*auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--play-horizontal \.combat-area-cluster--column \.combat-area-cluster__seat-meta \{[\s\S]*?flex:\s*1 1 auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--play-horizontal \.combat-area-cluster--column \.combat-area-cluster__quadrant \{[\s\S]*?padding:\s*0/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--play-horizontal > \.birdseye-turn-history \{[\s\S]*?height:\s*auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--play-horizontal > \.birdseye-turn-history \{[\s\S]*?max-height:\s*min\(15\.1rem, 50%\)/
    )
    expect(seatChromeCss).toMatch(
      /\.birdseye-turn-history__scroll \{[\s\S]*?scroll-snap-type:\s*y mandatory/
    )
    expect(seatChromeCss).toMatch(
      /\.birdseye-turn-history__round \{[\s\S]*?scroll-snap-align:\s*start/
    )
    expect(historyGridTsx).toContain('birdseye-turn-history__round--current')
    expect(historyGridTsx).toContain('TurnHistoryNav')
    expect(historyGridTsx).toContain('groupBirdseyeHistoryRounds')
    expect(historyGridTsx).toContain("e.key === 'ArrowUp' || e.key === 'ArrowLeft'")
    expect(historyGridTsx).toContain("e.key === 'ArrowDown' || e.key === 'ArrowRight'")
    expect(historyGridTsx).toContain("e.key === 'Escape' && isViewingHistory")
    expect(historyGridTsx).toContain("window.addEventListener('keydown', handleKeyDown)")
    expect(seatChromeCss).toMatch(
      /\.birdseye-turn-history__row \{[\s\S]*?grid-template-columns:\s*repeat\(var\(--birdseye-history-cols, 4\), minmax\(0, 1fr\)\)/
    )
    expect(cluster.indexOf('<BirdseyeTurnHistoryGrid')).toBeLessThan(
      cluster.indexOf("playAreaHorizontal ? 'combat-area-cluster--play-horizontal'")
    )
    expect(seatChromeCss).not.toContain('combat-area-cluster--gains-up')
    expect(cluster).not.toContain('Leaders top')
    expect(cluster).not.toContain('Leaders bottom')
  })

  it('washes each leader swimlane with a hinted player color', () => {
    expect(seatChromeCss).toContain('--player-tint: rgba(211, 47, 47, 0.16)')
    expect(seatChromeCss).toContain('--player-tint: rgba(56, 142, 60, 0.16)')
    expect(seatChromeCss).toContain('--player-tint: rgba(230, 184, 0, 0.14)')
    expect(seatChromeCss).toContain('--player-tint: rgba(25, 118, 210, 0.16)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-gains-slot \{[\s\S]*?var\(--player-tint/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-meta \{[\s\S]*?var\(--player-tint/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area \{[\s\S]*?var\(--player-tint/
    )
    expect(seatChromeCss).toMatch(
      /\.birdseye-turn-history__cell \{[\s\S]*?background-color:\s*var\(--player-tint/
    )
    expect(seatChromeCss).not.toContain('box-shadow: inset 2px 0 0')
    expect(historyGridTsx).toContain('birdseye-turn-history__cell--${emptyPlayer.color}')
  })

  it('docks the Imperium row above the board so leaders reach the top', () => {
    expect(imageBoardTsx).toContain('imperiumRowSlot')
    expect(imageBoardTsx).toContain('image-board__imperium-dock')
    expect(imageBoardTsx).toContain('image-board__board-stack')
    expect(appTsx).toContain('dockImperiumAboveBoard')
    expect(appTsx).toContain('dockImperiumAboveBoard ? imperiumRowEl : undefined')
    expect(imageBoardCss).toContain('.image-board__board-stack')
    expect(imageBoardCss).toContain('.image-board__imperium-dock')
    expect(imageBoardCss).toMatch(
      /\.image-board__imperium-dock \{[\s\S]*?flex:\s*0 0 auto/
    )
    const stackIdx = imageBoardTsx.indexOf('image-board__board-stack')
    const dockIdx = imageBoardTsx.indexOf('image-board__imperium-dock')
    const stageIdx = imageBoardTsx.indexOf('{boardStage}', stackIdx)
    expect(dockIdx).toBeGreaterThan(stackIdx)
    expect(stageIdx).toBeGreaterThan(dockIdx)
  })

  it('hides docked turn history when play area is horizontal', () => {
    expect(appTsx).toContain('const hideDockedHistory = isDesktopPlayView')
    expect(appTsx).toContain('hideDockedHistory')
    expect(appTsx).toContain('game-container--history-panel-hidden')
    expect(appCss).toContain('game-container--history-panel-hidden')
    expect(appCss).toMatch(
      /\.game-container--history-docked\.game-container--history-panel-hidden \.play-board-column \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/
    )
    expect(cluster).toContain('onDesktopPlayAreaLayoutChange')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster-stack--column > \.combat-area-cluster__gains-dir \{[\s\S]*?display:\s*none/
    )
  })

  it('keeps sandbox Begin under the session kit bar', () => {
    expect(appTsx).toContain('setupSlot={sandboxSetupControls(true)}')
    expect(appTsx).toContain('showKit={inSandboxSetup}')
    expect(appTsx).toContain('<SandboxSessionBar')
    expect(appTsx).toContain('sandboxBarInHistoryDock')
    expect(appTsx).toContain('topSlot={sandboxBarInHistoryDock ? sandboxSessionBarEl : undefined}')
    expect(appTsx).toContain('sandboxBarInPlayAreaDock')
    expect(appTsx).toContain('playAreaTopSlot')
    expect(imageBoardTsx).toContain('playAreaTopSlot')
    expect(imageBoardTsx).toContain('image-board__play-area-top-slot')
    expect(imageBoardCss).toContain('.image-board__play-area-top-slot')
    expect(imageBoardCss).toMatch(
      /\.image-board__combat-area-dock \{[\s\S]*?flex-direction:\s*column/
    )
    expect(imageBoardCss).toMatch(
      /\.image-board__combat-area-cluster\.image-board__combat-area-cluster--docked \{[\s\S]*?position:\s*relative/
    )
    expect(imageBoardCss).toMatch(
      /\.image-board__combat-area-cluster--docked \{[\s\S]*?flex:\s*1 1 auto/
    )
    expect(appTsx).not.toContain('sandbox-setup-mobile-bar--desktop')
    const sessionBarCss = readFileSync(
      resolve(root, 'components/SandboxSessionBar/SandboxSessionBar.css'),
      'utf8'
    )
    expect(sessionBarCss).toContain('.sandbox-session-bar__setup')
  })

  it('uses in-game birdseye seats while configuring sandbox leaders', () => {
    expect(appTsx).not.toContain('if (!useImageBoard || gameState.sandboxSetup) return null')
    expect(appTsx).toMatch(
      /const birdseyeMode = useMemo[\s\S]*?if \(!useImageBoard\) return null/
    )
    expect(imageBoardCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \.combat-area-cluster__leader--unassigned \{[\s\S]*?inset:\s*0/
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

  it('locks desktop portrait height so leftover can sit under the face', () => {
    expect(seatChromeCss).toContain('--birdseye-desktop-face-height: clamp(4.5rem, 9vmin, 6rem)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-leader \{[\s\S]*?max-height:\s*var\(--birdseye-desktop-face-height/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-main \{[\s\S]*?max-height:\s*none/
    )
  })

  it('sizes reward counts the same as cost amounts in desktop column gains', () => {
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-resource-amt,[\s\S]*?\.gain-multiplier,[\s\S]*?font-size:\s*0\.82rem/
    )
    expect(gainsCss).toMatch(
      /\.turn-gains-display \.gain-multiplier \{[\s\S]*?font-size:\s*0\.72rem/
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
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow \{[\s\S]*?flex-wrap:\s*wrap/
    )
  })

  it('keeps leader lanes fixed and wraps gain contents after the arrow', () => {
    const columnGains = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(columnGains).toContain('width: 100%')
    expect(columnGains).toContain('max-width: 100%')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?width:\s*100%/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow__before \{[\s\S]*?flex:\s*0 0 auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow__after \{[\s\S]*?flex-wrap:\s*wrap/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-flow__after \{[\s\S]*?flex:\s*1 0 auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gains-side \{[\s\S]*?flex-wrap:\s*wrap/
    )
    expect(gainsCss).toMatch(
      /\.turn-gain-source-flow__before,\s*\n\s*\.turn-gain-source-flow__after \{[\s\S]*?display:\s*contents/
    )
    const displayTsx = readFileSync(
      resolve(root, 'components/TurnGainsDisplay/TurnGainsDisplay.tsx'),
      'utf8'
    )
    expect(displayTsx).toContain('turn-gain-source-flow__before')
    expect(displayTsx).toContain('turn-gain-source-flow__after')
  })

  it('scrolls extra gains inside the seat with overflow fades', () => {
    expect(seatChromeCss).toContain('.birdseye-seat-gains__scroll')
    expect(seatChromeCss).toContain('overflow-y: auto')
    expect(seatChromeCss).toContain('birdseye-seat-gains--overflow-end')
    expect(seatChromeTsx).toContain('useScrollOverflowFades')
    expect(seatChromeTsx).toContain('ResizeObserver')
  })

  it('keeps overflow scrollbars visible on play area, gains, and horizontal turn log', () => {
    expect(seatChromeCss).toContain('.birdseye-lane-scroll-rail')
    expect(seatChromeCss).toContain('.birdseye-lane-scroll-thumb')
    expect(seatChromeCss).toContain('scrollbar-width: none')
    expect(seatChromeCss).toContain('background: rgba(212, 177, 106, 0.4)')
    expect(seatChromeCss).not.toContain('rgba(212, 177, 106, 0.92)')
    expect(seatChromeTsx).toContain('export function BirdseyeLaneScrollbar')
    expect(seatChromeTsx).toContain('<BirdseyeLaneScrollbar visible={scrollable}')
    expect(historyGridTsx).toContain('BirdseyeLaneScrollbar')
    expect(historyGridTsx).toContain('birdseye-turn-history__scroll-host')
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
    expect(seatChromeTsx).toContain('revealPooledTotals={revealPooledTotals}')
  })

  it('reveal seats pool persuasion and swords, and name other effects', () => {
    expect(cluster).toContain('revealPooledTotals={isRevealSeat}')
    expect(cluster).toContain('TurnType.REVEAL')
    expect(seatChromeCss).toContain('turn-gains-display-root--reveal-pooled')
    expect(gainsCss).not.toContain('transform: scale(1.55)')
  })

  it('resolves discarded card titles in seat gains', () => {
    expect(seatChromeTsx).toContain('resolveCard={resolveCard}')
    expect(cluster).toContain('resolveSeatCard')
    expect(cluster).toContain('resolveCardInSnapshot')
  })

  it('reserves a fixed gains slot so the leader row does not bounce', () => {
    expect(seatChromeCss).toContain('--birdseye-gains-slot-height: 9rem')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-gains-slot \{[\s\S]*?height:\s*100%/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-gains-slot \{[\s\S]*?justify-content:\s*flex-end/
    )
    expect(seatChromeCss).not.toMatch(
      /\.combat-area-cluster--column \.combat-area-cluster__seat-gains-slot \{[\s\S]*?height:\s*max-content/
    )
    const horizontalSlot = seatChromeCss.match(
      /\.combat-area-cluster-stack--play-horizontal \.combat-area-cluster--column \.combat-area-cluster__seat-gains-slot \{[\s\S]*?\}/
    )?.[0]
    expect(horizontalSlot).toBeTruthy()
    expect(horizontalSlot).toContain('height: 100%')
    expect(horizontalSlot).not.toContain('height: auto')
  })

  it('stacks desktop gain sources as boxes and does not stretch them into leftover height', () => {
    const columnGains = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(columnGains).toBeTruthy()
    expect(columnGains).toContain('height: auto')
    expect(columnGains).toContain('flex: 0 1 auto')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?height:\s*auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-gains \.turn-gain-source-group \{[\s\S]*?background:\s*rgba\(10, 9, 8, 0\.72\)/
    )
  })

  it('places turn buttons under the active column play area, still in a 2-col stack', () => {
    const controls = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat__controls-row \{[\s\S]*?\}/
    )?.[0]
    expect(controls).toBeTruthy()
    expect(controls).toContain('position: static')
    expect(controls).toContain('flex-direction: column-reverse')
    expect(controls).toContain('flex: 0 0 auto')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat__controls-stack \{[\s\S]*?flex-direction:\s*column-reverse/
    )
    expect(seatChromeCss).toMatch(
      /\.birdseye-seat__primary,\s*\n\s*\.birdseye-seat__utils \{[\s\S]*?grid-template-columns:\s*minmax\(2\.7rem, 1fr\) minmax\(2\.7rem, 1fr\)/
    )
    expect(seatChromeCss).toMatch(
      /\.birdseye-seat__utils \.birdseye-seat-btn--intrigue:only-child \{[\s\S]*?grid-column:\s*1 \/ -1/
    )
    expect(controls).not.toContain('position: absolute')
    expect(seatChromeCss).not.toContain('birdseye-controls-out-left')
    expect(seatChromeCss).not.toContain('birdseye-seat__controls-row--dock')
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const desktopBlock = cluster.slice(desktopIdx, desktopIdx + 3500)
    expect(desktopBlock).toContain('combat-area-cluster__seat-leader-stack')
    const gainsSlot = desktopBlock.slice(
      desktopBlock.indexOf('combat-area-cluster__seat-gains-slot'),
      desktopBlock.indexOf('combat-area-cluster__seat-leader-stack')
    )
    expect(gainsSlot).not.toContain('BirdseyeDesktopControls')
    expect(desktopBlock.indexOf('BirdseyeDesktopControls')).toBeGreaterThan(
      desktopBlock.indexOf('combat-area-cluster__seat-meta')
    )
    expect(desktopBlock.indexOf('BirdseyeDesktopControls')).toBeGreaterThan(
      desktopBlock.indexOf('BirdseyeSeatPlayArea')
    )
    expect(cluster).not.toContain('showDesktopDockActions')
    expect(cluster).not.toContain('keepPlayReveal')
  })

  it('gives leftover height to a per-seat play area under the leaders', () => {
    expect(cluster).toContain('BirdseyeSeatPlayArea')
    expect(cluster).toContain('getPlayAreaCardsForTurnView')
    expect(seatChromeTsx).toContain('export function BirdseyeSeatPlayArea')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column\.combat-area-cluster--birdseye \{[\s\S]*?grid-template-rows:\s*var\(--birdseye-gains-slot-height\) var\(--birdseye-desktop-face-height\) minmax\(0, 1fr\)/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area \{[\s\S]*?flex:\s*1 1 0/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area \{[\s\S]*?min-height:\s*0/
    )
  })

  it('scrolls overflow play-area cards inside the leader lane', () => {
    const stack = seatChromeCss.match(
      /\.combat-area-cluster--column \.birdseye-seat-play-area__stack \{[\s\S]*?\}/
    )?.[0]
    expect(stack).toBeTruthy()
    expect(stack).toContain('overflow-y: auto')
    expect(stack).toContain('min-height: 0')
    expect(stack).toContain('position: absolute')
    expect(stack).toContain('inset: 0')
    expect(stack).not.toContain('max-height: 100%')
    expect(seatChromeTsx).toContain('birdseye-seat-play-area--overflow-start')
    expect(seatChromeTsx).toContain('birdseye-seat-play-area--overflow-end')
    expect(seatChromeCss).toContain('.birdseye-seat-play-area--overflow-end::after')
    expect(seatChromeTsx).toContain("el.querySelectorAll('*')")
    expect(seatChromeTsx).toContain("el.addEventListener('load', update, true)")
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
      /\.combat-area-cluster--column \.combat-area-cluster__seat-leader-stack \{[\s\S]*?align-self:\s*stretch/
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

  it('highlights play-area cards that still have a pending effect choice', () => {
    expect(cluster).toContain('playAreaCardIdsWithPendingEffectChoice')
    expect(cluster).toContain(
      'pendingEffectCardIds={isActive ? pendingEffectCardIds : undefined}'
    )
    expect(seatChromeTsx).toContain('playAreaCardHasPendingEffectHighlight')
    expect(seatChromeTsx).toContain("hasPendingEffects ? 'turn-card-frame--has-effects' : ''")
    expect(seatChromeCss).toMatch(
      /\.birdseye-seat-play-area__card\.turn-card-frame--has-effects \{[\s\S]*?box-shadow:\s*var\(--pending-ring\)/
    )
  })

  it('renders played and active intrigues below play-area cards', () => {
    expect(cluster).toContain('getPlayedIntrigueCardsForTurnView')
    expect(cluster).toContain('getActiveIntrigueCardsForTurnView')
    expect(cluster).toContain('playedIntrigues={getPlayedIntrigueCardsForTurnView(gameState, player)}')
    expect(cluster).toContain('activeIntrigues={getActiveIntrigueCardsForTurnView(gameState, player)}')
    expect(cluster).toContain(
      'pendingIntrigueIds={isActive ? pendingIntrigueIds : undefined}'
    )
    expect(seatChromeTsx).toContain('birdseye-seat-play-area__intrigues')
    expect(seatChromeTsx).toContain('birdseye-seat-play-area__card--intrigue')
    expect(seatChromeTsx).toContain('birdseye-seat-play-area__card--active-intrigue')
    expect(seatChromeCss).not.toContain('rgba(143, 97, 188, 0.38)')
    expect(seatChromeCss).not.toContain('rgba(143, 97, 188, 0.48)')
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area__intrigues \{[\s\S]*?isolation:\s*isolate/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area__stack \{[\s\S]*?overflow-y:\s*auto/
    )
    expect(seatChromeCss).toMatch(
      /\.combat-area-cluster--column \.birdseye-seat-play-area__stack \{[\s\S]*?position:\s*absolute/
    )
    expect(seatChromeCss).toContain(
      '.combat-area-cluster--column .birdseye-seat-play-area__card:first-child'
    )
  })

  it('renders sandbox tutorial messages above the Ix board overlay', () => {
    const appCss = readFileSync(resolve(root, 'App.css'), 'utf8')
    expect(imageBoardTsx).toContain('image-board__tutorial-messages-layer')
    expect(imageBoardTsx).toContain('sandbox-setup-hint--conflict')
    expect(imageBoardTsx).toContain("label=\"Pick this round's conflict card\"")
    expect(imageBoardTsx).toContain('conflictBox.top - 10')
    expect(imageBoardTsx).toContain('sandbox-setup-hint--imperium-row')
    expect(imageBoardTsx).toContain('Pick 5 cards for the Imperium row')
    expect(imageBoardTsx).toContain('imperiumRow.length < sandboxImperiumRequiredCount')
    expect(imageBoardTsx).toContain("left: '50%', top: '3%'")
    expect(imageBoardTsx).toContain('sandbox-setup-hint--leaders-mobile')
    expect(imageBoardTsx).not.toContain('showBoardInfoTips && sandboxSetup && combatAreaDocked')
    expect(appTsx).not.toContain('showSetupHint: showBoardInfoTips && isDesktopPlayView')
    expect(appTsx).not.toContain('showSetupHint: showBoardInfoTips,')
    expect(appCss).toContain('--z-board-tutorial-message')
    expect(imageBoardCss).toMatch(
      /\.image-board__tutorial-messages-layer \{[\s\S]*?z-index:\s*var\(--z-board-tutorial-message/
    )
  })
})
