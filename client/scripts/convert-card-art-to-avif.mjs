/**
 * Convert heavy PNG/JPEG card & leader art under public/ to AVIF,
 * and write picker thumbs (max width THUMB_WIDTH) beside them in thumbs/.
 *
 * Usage (from client/): node scripts/convert-card-art-to-avif.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

const ROOTS = [
  'imperium_row',
  'leaders',
  'starter_deck',
  'tleilaxu_row',
  'intrigue',
]

const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const AVIF_QUALITY = 55
const THUMB_WIDTH = 360
const THUMB_QUALITY = 45

async function walk(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'thumbs') continue
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

function toThumbPath(avifPath) {
  const dir = path.dirname(avifPath)
  const base = path.basename(avifPath)
  return path.join(dir, 'thumbs', base)
}

async function convertSource(filePath) {
  const avifPath = toAvifPath(filePath)
  const thumbPath = toThumbPath(avifPath)
  await fs.mkdir(path.dirname(thumbPath), { recursive: true })

  // Replace empty/corrupt prior AVIF outputs.
  try {
    const existing = await fs.stat(avifPath)
    if (existing.size === 0) await fs.unlink(avifPath)
  } catch {
    /* no existing */
  }

  await sharp(filePath).rotate().avif({ quality: AVIF_QUALITY }).toFile(avifPath)

  await sharp(filePath)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .avif({ quality: THUMB_QUALITY })
    .toFile(thumbPath)

  await fs.unlink(filePath)
  return { avifPath, thumbPath, removed: filePath }
}

async function ensureThumbForExistingAvif(avifPath) {
  const thumbPath = toThumbPath(avifPath)
  try {
    await fs.access(thumbPath)
    return null
  } catch {
    /* missing thumb */
  }
  const stat = await fs.stat(avifPath)
  if (stat.size === 0) {
    console.warn(`skip empty avif ${path.relative(publicDir, avifPath)}`)
    return null
  }
  await fs.mkdir(path.dirname(thumbPath), { recursive: true })
  try {
    await sharp(avifPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .avif({ quality: THUMB_QUALITY })
      .toFile(thumbPath)
  } catch (err) {
    console.warn(`skip thumb for ${path.relative(publicDir, avifPath)}: ${err.message}`)
    return null
  }
  return thumbPath
}

async function main() {
  let converted = 0
  let thumbs = 0

  for (const root of ROOTS) {
    const absRoot = path.join(publicDir, root)
    try {
      await fs.access(absRoot)
    } catch {
      continue
    }
    const files = await walk(absRoot)
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (SOURCE_EXT.has(ext)) {
        const result = await convertSource(file)
        converted += 1
        thumbs += 1
        console.log(
          `converted ${path.relative(publicDir, result.removed)} -> ${path.relative(publicDir, result.avifPath)}`
        )
      } else if (ext === '.avif' && !file.includes(`${path.sep}thumbs${path.sep}`)) {
        const made = await ensureThumbForExistingAvif(file)
        if (made) {
          thumbs += 1
          console.log(`thumb ${path.relative(publicDir, made)}`)
        }
      }
    }
  }

  console.log(`done: converted=${converted} thumbs_written≈${thumbs}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
