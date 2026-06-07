import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * DEFERRED — not run by Vitest (see vite.config.ts exclude). Revive when UI contracts stabilize.
 *
 * Layout contract tests: footer chrome should reserve space so the board does not
 * jump when turn controls gain rows (effects, gains, selected card).
 */
describe('Turn controls — layout CSS contract', () => {
  const appCss = readFileSync(resolve(__dirname, '../../App.css'), 'utf8')
  const turnCss = readFileSync(
    resolve(__dirname, '../../components/TurnControls/TurnControls.css'),
    'utf8'
  )

  it('App.css defines turn-controls measured height variable for spacer', () => {
    expect(appCss).toContain('--turn-controls-measured-height')
    expect(appCss).toContain('.turn-controls-spacer')
  })

  it('play mode pins footer chrome (turn-controls-container)', () => {
    expect(appCss).toContain('.game-container--play .play-shell-footer > .turn-controls-container')
  })

  it('turn-controls root uses border-box and full width', () => {
    expect(turnCss).toContain('.turn-controls {')
    expect(turnCss).toContain('box-sizing: border-box')
    expect(turnCss).toContain('width: 100%')
  })

  it.todo('e2e: resize window — footer height stable across agent → reveal → end turn')
  it('docked play stage width spans board + turn history (chess-style chrome)', () => {
    expect(appCss).toContain('--play-stage-width')
    expect(appCss).toContain('.game-container--history-docked .play-shell-footer--docked')
    expect(appCss).toContain('var(--play-history-sidebar-width')
  })
})
