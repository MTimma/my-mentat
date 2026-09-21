import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'

/** Bump when PWA / tab icons change (cache bust for HTML + manifest). */
const PWA_ICON_VERSION = '3'

function pwaIconCacheBustPlugin(): Plugin {
  return {
    name: 'pwa-icon-cache-bust',
    transformIndexHtml(html) {
      const q = `?v=${PWA_ICON_VERSION}`
      return html.replace(/\?v=\d+/g, q)
    },
  }
}

function isBrandIconPath(pathname: string): boolean {
  return (
    /^\/favicon(?:-\d+x\d+)?\.(?:png|ico)$/i.test(pathname) ||
    /^\/pwa-icon\.svg$/i.test(pathname) ||
    /^\/pwa-\d+x\d+\.png$/i.test(pathname) ||
    /^\/apple-touch-icon\.png$/i.test(pathname) ||
    pathname === '/manifest.webmanifest'
  )
}
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
// should only be used during decelopment
function gamePackDevSavePlugin(): Plugin {
  return {
    name: 'game-pack-dev-save',
    configureServer(server) {
      server.middlewares.use('/api/dev/save-game-pack', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        const chunks: Buffer[] = []
        req.on('data', chunk => chunks.push(Buffer.from(chunk)))
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              manifest?: { id: string; version: number }
            }
            const manifest = body.manifest
            if (!manifest?.id || !manifest.version) {
              res.statusCode = 400
              res.end('Missing manifest')
              return
            }
            const customDir = path.resolve(server.config.root, 'public/game-packs/custom')
            fs.mkdirSync(customDir, { recursive: true })
            const slug = manifest.id.split('/').pop() ?? 'pack'
            const filename = `${slug}.v${manifest.version}.json`
            fs.writeFileSync(
              path.join(customDir, filename),
              JSON.stringify(manifest, null, 2) + '\n'
            )
            const indexPath = path.join(customDir, 'index.json')
            const index = fs.existsSync(indexPath)
              ? (JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
                  schemaVersion: number
                  packs: Array<{ ref: string; file: string }>
                })
              : { schemaVersion: 1, packs: [] }
            const ref = `${manifest.id}@${manifest.version}`
            index.packs = (index.packs ?? []).filter(p => p.ref !== ref)
            index.packs.push({ ref, file: filename })
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, ref, file: filename }))
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'Save failed')
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gamesApiTarget = env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000'

  return {
  plugins: [
    react(),
    gamePackDevSavePlugin(),
    pwaIconCacheBustPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'pwa-icon.svg',
        'apple-touch-icon.png',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],
      manifest: {
        name: 'Mentarium',
        short_name: 'Mentarium',
        description: 'Dune: Imperium board game companion',
        theme_color: '#16181c',
        background_color: '#16181c',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        id: '/',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: `pwa-192x192.png?v=${PWA_ICON_VERSION}`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `pwa-512x512.png?v=${PWA_ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `pwa-512x512.png?v=${PWA_ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,woff2}', '**/pwa-*', '**/apple-touch-icon*', '**/favicon*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/games/, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => {
              if (isBrandIconPath(url.pathname)) return false
              return (
                request.destination === 'image' ||
                /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i.test(url.pathname)
              )
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-data',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/games': gamesApiTarget,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['src/__tests__/deferred/**'],
  },
  }
})
