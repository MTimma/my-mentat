import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts: play-area drawer must remain toggleable on mobile and desktop.
 */
describe('Play area drawer toggle', () => {
  const root = resolve(__dirname, '../../..')
  const appTsx = readFileSync(resolve(root, 'App.tsx'), 'utf8')
  const appCss = readFileSync(resolve(root, 'App.css'), 'utf8')
  const toolbar = readFileSync(
    resolve(root, 'components/PlayFooterToolbar/PlayFooterToolbar.tsx'),
    'utf8'
  )

  it('wires a toggle control on mobile toolbar and desktop overlay button', () => {
    expect(toolbar).toContain('showPlayAreaDrawerToggle')
    expect(toolbar).toContain('onPlayAreaDrawerToggle')
    expect(toolbar).toContain('aria-controls="play-area-drawer"')
    expect(appTsx).toContain('onPlayAreaDrawerToggle={() =>')
    expect(appTsx).toContain('setPlayAreaDrawerOpen(!isPlayAreaDrawerOpenRef.current)')
    expect(appTsx).toContain('desktop-play-drawer-toggle')
    expect(appTsx).toContain('play-area-collapse-handle')
    expect(appTsx).toContain('const showPlayAreaDrawerToggle = useImageBoard')
    expect(appTsx).toContain('COMPACT_PLAY_OVERLAY_MQ')
    expect(appTsx).toContain('inert={showPlayAreaDrawerToggle && !isPlayAreaDrawerOpen ? true : undefined}')
  })

  it('closed mobile overlay drawer is clipped, inert, and not visible', () => {
    const closed = appCss.match(
      /\.game-container--play\.play-footer-overlay:not\(\.play-footer-overlay--desktop\)\s+\.play-area-drawer--closed \{[\s\S]*?\}/
    )?.[0]
    expect(closed).toBeTruthy()
    expect(closed).toContain('display: none !important')
    expect(closed).toContain('max-height: 0 !important')
    expect(closed).toContain('height: 0 !important')
    expect(closed).toContain('overflow: hidden !important')
    expect(closed).toContain('pointer-events: none !important')
    expect(closed).toContain('visibility: hidden !important')
    expect(closed).not.toMatch(/translate3d\(\s*0,\s*100%/)
    expect(closed).not.toMatch(/translateY\(\s*100%/)
  })

  it('closed mobile overlay inner and turn-controls collapse to zero height', () => {
    const inner = appCss.match(
      /\.game-container--play\.play-footer-overlay:not\(\.play-footer-overlay--desktop\)\s+\.play-area-drawer--closed\s+\.play-area-drawer__inner \{[\s\S]*?\}/
    )?.[0]
    expect(inner).toBeTruthy()
    expect(inner).toContain('display: none !important')
    expect(inner).toContain('max-height: 0 !important')
    expect(inner).toContain('height: 0 !important')
    expect(inner).toContain('overflow: hidden !important')
    expect(inner).not.toMatch(/translateY\(\s*100%/)
    const tc = appCss.match(
      /\.game-container--play\.play-footer-overlay\.play-area-collapsed:not\(\s*\.play-footer-overlay--desktop\s*\)\s+\.play-area-drawer--closed\s+\.turn-controls-container \{[\s\S]*?\}/
    )?.[0]
    expect(tc).toBeTruthy()
    expect(tc).toContain('max-height: 0 !important')
    expect(tc).toContain('height: 0 !important')
    expect(tc).toContain('overflow: hidden !important')
  })

  it('closed desktop overlay drawer collapses to zero height without unmounting TurnControls', () => {
    const closed = appCss.match(
      /\.game-container--play\.play-footer-overlay--desktop \.play-area-drawer--closed \{[\s\S]*?\}/
    )?.[0]
    expect(closed).toBeTruthy()
    expect(closed).toContain('max-height: 0')
    expect(closed).toContain('min-height: 0')
    expect(closed).toContain('flex: 0 0 0')
    expect(closed).toContain('overflow: hidden')
    expect(closed).toContain('pointer-events: none')
    expect(closed).toContain('do not use display:none')
  })

  it('does not force-close the desktop drawer on every layout apply', () => {
    expect(appTsx).toContain('if (desktop && !wasDesktop)')
    expect(appTsx).not.toMatch(/if \(desktop\) \{\s*\/\/ Overlay drawer closed by default/)
  })

  it('reopens the play-area drawer on tablet and keeps mobile overlay closed', () => {
    expect(appTsx).toContain('if (!desktop && wasDesktop)')
    expect(appTsx).toContain('Leaving desktop: phone/tablet overlay stays closed.')
    expect(appTsx).toContain('Entering phone/tablet overlay: keep closed so the leader band stays visible.')
    expect(appTsx).toContain('COMPACT_PLAY_OVERLAY_MQ')
  })

  it('reserves the measured HUD stack under the board on mobile overlay', () => {
    expect(appTsx).toContain("root.querySelector<HTMLElement>('.combat-area-cluster--row')")
    expect(appTsx).toContain('measuredHud')
    expect(appTsx).toContain('MOBILE_PLAY_SHEET_RESERVE_PX')
    expect(appTsx).toContain("target.classList.contains('image-board__combat-area-below')")
  })

  it('keeps the mobile chevron from shrinking and stacked above overflow', () => {
    const toolbarCss = readFileSync(
      resolve(root, 'components/PlayFooterToolbar/PlayFooterToolbar.css'),
      'utf8'
    )
    const toggle = toolbarCss.match(
      /\.history-banner-toolbar \.play-area-drawer-toggle \{[\s\S]*?\}/
    )?.[0]
    expect(toggle).toBeTruthy()
    expect(toggle).toContain('flex-shrink: 0')
    expect(toggle).toContain('z-index: 8')
  })

  it('does not stack the desktop play-area pill above Turn History', () => {
    const desktop = appCss.match(/\.desktop-play-drawer-toggle \{[\s\S]*?\}/)?.[0]
    expect(desktop).toBeTruthy()
    expect(desktop).not.toMatch(/z-index:\s*calc\(\s*var\(--z-play-history-strip\)/)
    expect(desktop).toMatch(/z-index:\s*45/)
    expect(appCss).toContain('.game-container--history-docked .desktop-play-drawer-toggle')
    expect(appCss).toContain(
      'var(--play-history-sidebar-width) + max(0.75rem, env(safe-area-inset-right, 0px))'
    )
  })
})
