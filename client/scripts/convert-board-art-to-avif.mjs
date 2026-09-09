/**
 * Convert board PNG/JPEG assets under public/board/ to AVIF (full-size, no thumbs).
 *
 * Usage (from client/): node scripts/convert-board-art-to-avif.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const boardDir = path.join(publicDir, 'board')

const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg'])
const AVIF_QUALITY = 55
const LARGE_FILE_BYTES = 2 * 1024 * 1024
const LARGE_AVIF_QUALITY = 50

async function walk(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walk(full)))
    } else {
      out.push(full)
    }
  }
  return out
}

function toAvifPath(filePath) {
  const ext = path.extname(filePath)
  return filePath.slice(0, -ext.length) + '.avif'
}

async function convertSource(filePath) {
  const avifPath = toAvifPath(filePath)
  const stat = await fs.stat(filePath)
  const quality = stat.size >= LARGE_FILE_BYTES ? LARGE_AVIF_QUALITY : AVIF_QUALITY

  try {
    const existing = await fs.stat(avifPath)
    if (existing.size === 0) await fs.unlink(avifPath)
  } catch {
    /* no existing */
  }

  await sharp(filePath).rotate().avif({ quality }).toFile(avifPath)
  await fs.unlink(filePath)
  return { avifPath, removed: filePath, quality }
}

async function main() {
  try {
    await fs.access(boardDir)
  } catch {
    console.error(`missing ${boardDir}`)
    process.exit(1)
  }

  let converted = 0
  const files = await walk(boardDir)
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!SOURCE_EXT.has(ext)) continue
    const result = await convertSource(file)
    converted += 1
    console.log(
      `converted ${path.relative(publicDir, result.removed)} -> ${path.relative(publicDir, result.avifPath)} (q=${result.quality})`
    )
  }

  console.log(`done: converted=${converted}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
