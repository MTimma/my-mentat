import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = path.join(root, 'public/pwa-icon.svg')
const publicDir = path.join(root, 'public')
const svg = fs.readFileSync(svgPath)

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
]

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(path.join(publicDir, name))
  console.log(`Wrote public/${name}`)
}

const favicon16 = await sharp(svg).resize(16, 16).png().toBuffer()
const favicon32 = await sharp(svg).resize(32, 32).png().toBuffer()
const ico = await toIco([favicon16, favicon32])
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico)
console.log('Wrote public/favicon.ico')
