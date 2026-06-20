/**
 * Publishes the id catalogs as static JSON under public/catalogs/.
 * Run: npm run generate:catalogs   (vite-node)
 *
 * Published files are served by Vite/any static host at /catalogs/* and are
 * the contract for external producers (plans/reducer/05-server-api-and-catalogs.md).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalog, CATALOG_SCHEMA_VERSION } from '../src/catalog/buildCatalog'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'catalogs')
mkdirSync(outDir, { recursive: true })

const catalog = buildCatalog()
const v = `v${CATALOG_SCHEMA_VERSION}`

const expansionCounts = Object.fromEntries(
  catalog.expansions.available.map(id => [id, catalog.expansions.byId[id].counts])
)

const files: Record<string, unknown> = {
  [`catalog.${v}.json`]: catalog,
  [`cards.${v}.json`]: { schemaVersion: catalog.schemaVersion, cards: catalog.cards, decks: catalog.decks },
  [`effects.${v}.json`]: { schemaVersion: catalog.schemaVersion, effects: catalog.effects },
  [`board-spaces.${v}.json`]: { schemaVersion: catalog.schemaVersion, boardSpaces: catalog.boardSpaces },
  [`conflicts.${v}.json`]: { schemaVersion: catalog.schemaVersion, conflicts: catalog.conflicts },
  [`intrigue.${v}.json`]: { schemaVersion: catalog.schemaVersion, intrigue: catalog.intrigue },
  [`leaders.${v}.json`]: { schemaVersion: catalog.schemaVersion, leaders: catalog.leaders },
  [`tech-tiles.${v}.json`]: { schemaVersion: catalog.schemaVersion, techTiles: catalog.techTiles },
  [`expansions.${v}.json`]: { schemaVersion: catalog.schemaVersion, expansions: catalog.expansions },
  [`choice-ids.${v}.json`]: {
    schemaVersion: catalog.schemaVersion,
    grammar: catalog.choiceIdGrammar,
    customEffects: catalog.customEffects,
  },
  'index.json': {
    schemaVersion: catalog.schemaVersion,
    counts: catalog.meta.counts,
    expansions: {
      available: catalog.expansions.available,
      counts: expansionCounts,
    },
    files: [
      `catalog.${v}.json`,
      `cards.${v}.json`,
      `effects.${v}.json`,
      `board-spaces.${v}.json`,
      `conflicts.${v}.json`,
      `intrigue.${v}.json`,
      `leaders.${v}.json`,
      `tech-tiles.${v}.json`,
      `expansions.${v}.json`,
      `choice-ids.${v}.json`,
    ],
  },
}

for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2) + '\n')
  console.log(`wrote public/catalogs/${name}`)
}
