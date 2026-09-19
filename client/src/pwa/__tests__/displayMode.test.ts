import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const clientRoot = resolve(__dirname, '../../..')

describe('PWA home-screen fullscreen', () => {
  it('declares iOS/Android standalone meta so Add to Home Screen is not a browser tab', () => {
    const html = readFileSync(resolve(clientRoot, 'index.html'), 'utf8')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain('mobile-web-app-capable')
    expect(html).toContain('black-translucent')
    expect(html).toContain('viewport-fit=cover')
  })

  it('keeps the web app manifest in standalone display', () => {
    const vite = readFileSync(resolve(clientRoot, 'vite.config.ts'), 'utf8')
    expect(vite).toMatch(/display:\s*'standalone'/)
    expect(vite).toContain('display_override')
  })

  it('treats desktop fullscreen as fill-screen, not as an installed PWA notch', () => {
    const displayMode = readFileSync(resolve(clientRoot, 'src/pwa/displayMode.ts'), 'utf8')
    expect(displayMode).toContain('export function isFullscreenDisplay')
    expect(displayMode).toContain('export function isFillScreenDisplay')
    expect(displayMode).toContain('isStandaloneDisplay() || isFullscreenDisplay()')
    const standaloneFn = displayMode.slice(
      displayMode.indexOf('export function isStandaloneDisplay'),
      displayMode.indexOf('export function isFullscreenDisplay')
    )
    expect(standaloneFn).toContain("display-mode: standalone")
    expect(standaloneFn).not.toContain("display-mode: fullscreen")
  })
})
