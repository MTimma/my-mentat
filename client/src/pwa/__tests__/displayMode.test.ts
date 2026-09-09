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
})
