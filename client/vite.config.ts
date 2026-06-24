import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
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

export default defineConfig({
  plugins: [react(), gamePackDevSavePlugin()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['src/__tests__/deferred/**'],
  },
})
