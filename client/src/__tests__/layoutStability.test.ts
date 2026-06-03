import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** UI-01 / UI-02 / UI-03 — CSS layout contracts (e2e deferred). */
describe('Turn controls — layout CSS contract', () => {
  const appCss = readFileSync(resolve(__dirname, '../App.css'), 'utf8')
  const turnCss = readFileSync(
    resolve(__dirname, '../components/TurnControls/TurnControls.css'),
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
})
