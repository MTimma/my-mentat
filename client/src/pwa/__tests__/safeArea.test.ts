import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const clientRoot = resolve(__dirname, '../../..')

describe('PWA safe area top inset', () => {
  it('installs JS measurement on boot', () => {
    const main = readFileSync(resolve(clientRoot, 'src/main.tsx'), 'utf8')
    const safeArea = readFileSync(resolve(clientRoot, 'src/pwa/safeArea.ts'), 'utf8')
    expect(main).toContain('installPwaSafeAreaInsets()')
    expect(safeArea).toContain('MIN_STANDALONE_TOP_PX')
    expect(safeArea).toContain('--pwa-safe-top')
    expect(safeArea).toContain('pwa-standalone')
  })

  it('pads the play shell below the notch with a minimum gap', () => {
    const indexCss = readFileSync(resolve(clientRoot, 'src/index.css'), 'utf8')
    expect(indexCss).toContain('--pwa-safe-top: max(47px, env(safe-area-inset-top, 0px)')
    expect(indexCss).toContain('.game-container--play')
    expect(indexCss).toContain('padding-top: var(--pwa-safe-top)')
  })

  it('does not invent an iOS notch floor in desktop fullscreen', () => {
    const indexCss = readFileSync(resolve(clientRoot, 'src/index.css'), 'utf8')
    const displayMode = readFileSync(resolve(clientRoot, 'src/pwa/displayMode.ts'), 'utf8')
    const combinedAt = indexCss.indexOf(
      '@media (display-mode: standalone), (display-mode: fullscreen)'
    )
    const standaloneOnlyAt = indexCss.indexOf('@media (display-mode: standalone) {')
    const fullscreenOnlyAt = indexCss.lastIndexOf('@media (display-mode: fullscreen) {')
    const dataStandaloneAt = indexCss.indexOf("html[data-display-mode='standalone']")
    expect(combinedAt).toBeGreaterThanOrEqual(0)
    expect(standaloneOnlyAt).toBeGreaterThan(combinedAt)
    expect(fullscreenOnlyAt).toBeGreaterThan(standaloneOnlyAt)
    expect(dataStandaloneAt).toBeGreaterThan(fullscreenOnlyAt)
    expect(indexCss.slice(combinedAt, standaloneOnlyAt)).not.toContain(
      '--pwa-safe-top: max(47px'
    )
    expect(indexCss.slice(standaloneOnlyAt, fullscreenOnlyAt)).toContain(
      '--pwa-safe-top: max(47px, env(safe-area-inset-top, 0px)'
    )
    expect(indexCss.slice(fullscreenOnlyAt, dataStandaloneAt)).toContain(
      '--pwa-safe-top: max(0px, env(safe-area-inset-top, 0px)'
    )
    expect(indexCss.slice(fullscreenOnlyAt, dataStandaloneAt)).not.toContain('47px')
    const standaloneFn = displayMode.slice(
      displayMode.indexOf('export function isStandaloneDisplay'),
      displayMode.indexOf('export function isFullscreenDisplay')
    )
    expect(standaloneFn).toContain("display-mode: standalone")
    expect(standaloneFn).not.toContain("display-mode: fullscreen")
  })
})
