import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts for the mobile leader + play-area HUD.
 * Play/Reveal live in the play-area sheet (toggleable). Leaders show resources + gains.
 */
describe('Mobile HUD layout', () => {
  const root = resolve(__dirname, '../../..')
  const cluster = readFileSync(resolve(root, 'components/ImageBoard/CombatAreaCluster.tsx'), 'utf8')
  const seatChrome = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.tsx'),
    'utf8'
  )
  const seatCss = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
    'utf8'
  )
  const imageBoardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
  const appCss = readFileSync(resolve(root, 'App.css'), 'utf8')
  const appTsx = readFileSync(resolve(root, 'App.tsx'), 'utf8')

  it('keeps Play/Reveal in the mobile play-area sheet (not only on a shared rim)', () => {
    expect(appTsx).toContain("hidePrimaryTurnActions={birdseyeMode === 'desktop6'}")
    expect(appTsx).not.toContain('hidePrimaryTurnActions={Boolean(birdseyeMode)}')
    const mobileIdx = cluster.indexOf("birdseyeMode === 'mobile3b'")
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const mobileBlock = cluster.slice(
      mobileIdx,
      desktopIdx > mobileIdx ? desktopIdx : mobileIdx + 2500
    )
    expect(mobileBlock).not.toContain('BirdseyeRimBar')
    expect(mobileBlock).not.toContain('combat-area-cluster__seat-top')
  })

  it('does not portal pending rewards away from the mobile play area', () => {
    expect(appTsx).toContain("birdseyeMode === 'desktop6' ? birdseyeInteractionsHost : null")
  })

  it('shows per-seat gains under mobile leaders (not display:none)', () => {
    const mobileIdx = cluster.indexOf("birdseyeMode === 'mobile3b'")
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const mobileBlock = cluster.slice(
      mobileIdx,
      desktopIdx > mobileIdx ? desktopIdx : mobileIdx + 2500
    )
    expect(mobileBlock).toContain('BirdseyeSeatGains')
    expect(mobileBlock).toContain('showSourceTitles={false}')
    expect(mobileBlock).toContain('showTotals={false}')
    expect(mobileBlock).toContain('revealPooledTotals={isRevealSeat}')
    const gains = seatCss.match(
      /\.combat-area-cluster--row \.birdseye-seat-gains \{[\s\S]*?\}/
    )?.[0]
    expect(gains).toBeTruthy()
    expect(gains).toContain('display: block')
    expect(gains).toContain('overflow-x: hidden')
    expect(gains).not.toContain('display: none')
    expect(seatCss).toContain(
      '.combat-area-cluster--row .birdseye-seat-gains .turn-gain-totals-group'
    )
    expect(seatCss).toMatch(
      /\.birdseye-seat-gains \.turn-gain-totals-group[\s\S]*?display:\s*none !important/
    )
    expect(seatCss).toMatch(
      /\.combat-area-cluster--row \.birdseye-seat-gains \.turn-gains-display \{[\s\S]*?flex-direction:\s*column/
    )
  })

  it('uses a readable face + in-flow resource strip (not a 16px overlay)', () => {
    expect(seatCss).toContain('--birdseye-face-size: 72px')
    expect(seatCss).toContain('height: var(--birdseye-face-size, 72px)')
    expect(seatCss).not.toContain('clamp(10rem, 40vw, 14.5rem)')
    const meta = seatCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__seat-meta \{[\s\S]*?\}/
    )?.[0]
    expect(meta).toBeTruthy()
    expect(meta).toContain('position: relative')
    expect(meta).not.toContain('max-height: 18px')
    expect(imageBoardCss).toContain('width: 0.95em')
  })

  it('docks the mobile play-area drawer above the nav so the chevron can hide it', () => {
    const drawer = appCss.match(
      /\.game-container--play\.play-footer-overlay \.play-area-drawer \{[\s\S]*?\}/
    )?.[0]
    expect(drawer).toBeTruthy()
    expect(drawer).toContain('bottom: 100%')
    expect(drawer).toContain('z-index: 1')
    expect(appCss).toContain('.play-area-drawer--closed')
    expect(appCss).toContain('display: none !important')
  })

  it('fills board width on compact overlay and scrolls the board column', () => {
    expect(appTsx).toContain('fill the column width')
    expect(appTsx).toContain('return Math.max(minBoardEdge, shellWidth)')
    expect(appTsx).toContain('play-board-scroll')
    expect(appCss).toContain('.play-board-scroll')
    expect(appCss).toMatch(
      /\.game-container--play\.play-footer-overlay \.play-board-scroll \{[\s\S]*?overflow-y:\s*auto/
    )
  })

  it('starts the mobile overlay drawer closed', () => {
    expect(appTsx).toContain('COMPACT_PLAY_OVERLAY_MQ')
    expect(appTsx).toContain('Phone, tablet, and desktop overlays start closed so leaders stay visible.')
    expect(appTsx).toContain(
      'Entering phone/tablet overlay: keep closed so the leader band stays visible.'
    )
  })

  it('restores footer End Turn on mobile (play area is the action surface)', () => {
    expect(appTsx).toContain(
      "showFooterEndTurn && !isViewingHistory && birdseyeMode !== 'desktop6'"
    )
  })

  it('reserves space above the leader row for the open play sheet', () => {
    // Compact overlay fills board width; leaders scroll under the board (no HUD height subtract).
    expect(appTsx).toContain('MOBILE_PLAY_SHEET_RESERVE_PX = 120')
    expect(appTsx).toContain('fill the column width')
    expect(appTsx).toContain('bottomChrome = overlayReserve')
  })
})
