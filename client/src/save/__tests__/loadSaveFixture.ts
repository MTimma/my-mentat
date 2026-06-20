import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSaveDocJson } from '../parseSaveDoc'
import type { SaveDoc } from '../types'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../test-fixtures/saves')

/** Read a SaveDoc fixture from `test-fixtures/saves/<name>.json`. */
export function loadSaveFixture(name: string): SaveDoc {
  const path = join(FIXTURES_DIR, `${name}.json`)
  const raw = readFileSync(path, 'utf8')
  const result = parseSaveDocJson(raw)
  if (!result.ok) {
    throw new Error(`Invalid save fixture "${name}": ${result.error}`)
  }
  return result.doc
}

/** List fixture names (without `.json` extension). */
export function listSaveFixtures(): string[] {
  try {
    return readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -'.json'.length))
      .sort()
  } catch {
    return []
  }
}
