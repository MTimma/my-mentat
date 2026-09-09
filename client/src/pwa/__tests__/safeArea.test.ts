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
})
