#!/usr/bin/env node
/**
 * Validate a SaveDoc export and copy it into test-fixtures/saves/.
 *
 * Usage:
 *   node scripts/add-save-fixture.mjs path/to/export.json my-game
 *
 * Prints the vitest command to refresh snapshots after adding a fixture.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCHEMA_VERSION = 1
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/test-fixtures/saves')

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/** Mirrors parseSaveDocJson validation (Save document only, not runtime dumps). */
function validateSaveDoc(parsed) {
  if (!isRecord(parsed)) {
    return 'Save document must be a JSON object'
  }

  if (!('setup' in parsed) || !('events' in parsed)) {
    if ('players' in parsed && 'phase' in parsed) {
      return 'This looks like a runtime state dump. Export from Turn History → Save document tab instead.'
    }
    return 'Missing setup or events — not a Save document'
  }

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return `Unsupported schemaVersion (expected ${SCHEMA_VERSION})`
  }

  if (!isRecord(parsed.setup)) {
    return 'Missing setup block'
  }

  const players = parsed.setup.players
  if (!Array.isArray(players) || players.length === 0) {
    return 'setup.players must be a non-empty array'
  }

  if (!Array.isArray(parsed.events)) {
    return 'Missing events array — use Save document export, not Runtime state'
  }

  if (!isRecord(parsed.meta)) {
    return 'Missing meta block'
  }

  if (!Array.isArray(parsed.branches)) {
    return 'Missing branches array'
  }

  if (!isRecord(parsed.cursor)) {
    return 'Missing cursor block'
  }

  return null
}

function main() {
  const [sourcePath, fixtureName] = process.argv.slice(2)

  if (!sourcePath || !fixtureName) {
    console.error('Usage: node scripts/add-save-fixture.mjs <export.json> <fixture-name>')
    process.exit(1)
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixtureName)) {
    console.error('Fixture name must be kebab-case (e.g. my-game-scenario)')
    process.exit(1)
  }

  const absSource = resolve(sourcePath)
  if (!existsSync(absSource)) {
    console.error(`File not found: ${absSource}`)
    process.exit(1)
  }

  let parsed
  try {
    parsed = JSON.parse(readFileSync(absSource, 'utf8'))
  } catch {
    console.error('Invalid JSON')
    process.exit(1)
  }

  const error = validateSaveDoc(parsed)
  if (error) {
    console.error(`Invalid SaveDoc: ${error}`)
    process.exit(1)
  }

  const dest = join(FIXTURES_DIR, `${fixtureName}.json`)
  copyFileSync(absSource, dest)
  console.log(`Copied to ${dest}`)
  console.log('')
  console.log('Run display regression tests:')
  console.log('  cd client && npm run test -- goldenSaveDisplay')
  console.log('')
  console.log('First time or after display changes, refresh snapshots:')
  console.log('  cd client && npm run test -- goldenSaveDisplay -u')
}

main()
