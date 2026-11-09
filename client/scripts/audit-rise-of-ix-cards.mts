/**
 * Rise of Ix imperium card audit.
 *
 * Compares the user-provided reference spreadsheet
 * (`src/data/Filtered Card Count ----> 136 5 cards av`) against:
 *   1. the authored card data (`src/data/cardsRiseOfIx.ts`)
 *   2. the published catalog (`public/catalogs/cards.v1.json` + `effects.v1.json`)
 *
 * Writes `notes/rise-of-ix-card-audit.csv` (one row per card, easy to scan)
 * and `notes/rise-of-ix-card-audit.json` (full normalized records).
 *
 * Run: npx vite-node scripts/audit-rise-of-ix-cards.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RISE_OF_IX_IMPERIUM_DECK } from '../src/data/cardsRiseOfIx'
import type { Card } from '../src/types/GameTypes'

const here = dirname(fileURLToPath(import.meta.url))
const clientRoot = join(here, '..')
const repoRoot = join(clientRoot, '..')

const CSV_PATH = join(clientRoot, 'src', 'data', 'Filtered Card Count ----> 136 5 cards av')
const CARDS_CATALOG_PATH = join(clientRoot, 'public', 'catalogs', 'cards.v1.json')
const EFFECTS_CATALOG_PATH = join(clientRoot, 'public', 'catalogs', 'effects.v1.json')
const OUT_CSV = join(repoRoot, 'notes', 'rise-of-ix-card-audit.csv')
const OUT_JSON = join(repoRoot, 'notes', 'rise-of-ix-card-audit.json')

// ---------------------------------------------------------------------------
// Reference CSV
// ---------------------------------------------------------------------------

interface CsvRow {
  name: string
  qty: number
  cost: string
  acquire: string
  faction: string
  agentIcons: string
  infiltrate: string
  graft: string
  agentBox: string
  revealPer: string
  revealSword: string
  revealOther: string
  unload: string
  set: string
  notes: string
}

function parseCsv(): CsvRow[] {
  const raw = readFileSync(CSV_PATH, 'utf8')
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0)
  // Line 0 is the "Filtered Card Count ---->" banner, line 1 is the header.
  const rows: CsvRow[] = []
  for (const line of lines.slice(2)) {
    const cols = line.split('\t')
    if (cols.length < 14) continue
    rows.push({
      name: cols[0].trim(),
      qty: Number(cols[1]),
      cost: cols[2].trim(),
      acquire: cols[3].trim(),
      faction: cols[4].trim(),
      agentIcons: cols[5].trim(),
      infiltrate: cols[6].trim(),
      graft: cols[7].trim(),
      agentBox: cols[8].trim(),
      revealPer: cols[9].trim(),
      revealSword: cols[10].trim(),
      revealOther: cols[11].trim(),
      unload: cols[12].trim(),
      set: cols[13].trim(),
      notes: (cols[14] ?? '').trim(),
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Expected effect shapes (derived from the reference CSV + rules FAQ)
// ---------------------------------------------------------------------------

/**
 * Hand-verified expected effects per card, expressed in the app's Reward/Cost
 * vocabulary. This is the audit spec: `cardsRiseOfIx.ts` must match it.
 *
 * `null` means "no such effect on the card".
 */
const EXPECTED_EFFECTS: Record<
  string,
  { acquire?: unknown; play?: unknown; reveal?: unknown }
> = {
  Appropriate: {
    acquire: { freighter: 1 },
    play: [
      {
        requirement: { influence: { faction: 'emperor', amount: 2 } },
        reward: { acquireTech: { paySolariInsteadOfSpice: true } },
      },
    ],
    reveal: [{ reward: { persuasion: 2 } }],
  },
  'Bounty Hunter': {
    play: [{ reward: { custom: 'BOUNTY_INFILTRATION_BONUS' } }],
    reveal: [{ reward: { persuasion: 1, combat: 1 } }],
  },
  'CHOAM Delegate': {
    reveal: [{ reward: { solari: 3 } }],
  },
  'Court Intrigue': {
    play: [{ cost: { intrigueBottom: 1 }, reward: { intrigueCards: 1 } }],
    reveal: [{ reward: { persuasion: 1, combat: 1 } }],
  },
  'Desert Ambush': {
    play: [{ reward: { custom: 'DESERT_AMBUSH' } }],
    reveal: [{ reward: { persuasion: 1, combat: 1 } }],
  },
  'Embedded Agent': {
    play: [{ requirement: { inPlay: 'bene-gesserit' }, reward: { freighter: 2 } }],
    reveal: [{ reward: { persuasion: 1, intrigueCards: 1 } }],
  },
  'Esmar Tuek': {
    play: [
      {
        cost: { spice: 1 },
        reward: {
          influence: { amounts: [{ faction: 'spacing-guild', amount: 1 }] },
          drawCards: 1,
        },
      },
    ],
    reveal: [{ reward: { spice: 2, solari: 2 } }],
  },
  'Freighter Fleet': {
    reveal: [{ reward: { freighter: 1 } }],
  },
  'Full-Scale Assault': {
    acquire: { dreadnoughts: 1 },
    play: [{ reward: { troops: 2 } }],
    reveal: [
      { reward: { persuasion: 2 } },
      { reward: { custom: 'FULLSCALE_DREAD_SWORDS' } },
    ],
  },
  'Guild Accord': {
    play: [{ reward: { custom: 'GUILD_ACCORD_HEIGHTLINER_DISCOUNT' } }],
    reveal: [
      { reward: { water: 1 } },
      { requirement: { alliance: 'spacing-guild' }, reward: { spice: 3 } },
    ],
  },
  'Guild Chief Administrator': {
    play: [{ cost: { discard: 1 }, reward: { trash: 1 } }],
    reveal: [{ reward: { persuasion: 1, freighter: 1 } }],
  },
  'Imperial Bashar': {
    play: [
      { reward: { troops: 1 }, choiceOpt: true },
      { reward: { trash: 1 }, choiceOpt: true },
    ],
    reveal: [
      { reward: { persuasion: 1 } },
      { reward: { custom: 'IMPERIAL_BASHAR_SWORDS' } },
    ],
  },
  'Imperial Shock Trooper': {
    reveal: [
      { reward: { persuasion: 1 } },
      { reward: { custom: 'SHOCKTROOPER_EM_BONUS' } },
    ],
  },
  'In the Shadows': {
    play: [
      {
        requirement: { influence: { faction: 'bene-gesserit', amount: 2 } },
        cost: { discard: 1 },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: 'emperor', amount: 1 },
              { faction: 'spacing-guild', amount: 1 },
              { faction: 'fremen', amount: 1 },
            ],
          },
        },
      },
    ],
    reveal: [
      {
        reward: {
          influence: { amounts: [{ faction: 'bene-gesserit', amount: 1 }] },
        },
      },
    ],
  },
  'Ix-Guild Compact': {
    play: [{ cost: { discard: 2 }, reward: { dreadnoughts: 1 } }],
    reveal: [{ reward: { techNegotiator: 2 } }],
  },
  'Ixian Engineer': {
    play: [{ reward: { acquireTech: {} } }],
    reveal: [{ reward: { custom: 'IXIAN_ENGINEER_VP' } }],
  },
  Jamis: {
    play: [{ reward: { trash: 1 } }],
    reveal: [{ reward: { persuasion: 1, combat: 2 } }],
  },
  'Landing Rights': {
    play: [{ reward: { freighter: 1 } }],
    reveal: [{ reward: { persuasion: 2 } }],
  },
  'Local Fence': {
    play: [
      { cost: { spice: 2 }, reward: { solari: 5 }, choiceOpt: true },
      { cost: { solari: 5 }, reward: { spice: 4 }, choiceOpt: true },
    ],
    reveal: [{ reward: { persuasion: 2 } }],
  },
  'Negotiated Withdrawel': {
    acquire: { troops: 1 },
    reveal: [
      { reward: { persuasion: 2 } },
      { reward: { custom: 'NEGOTIATED_WITHDRAWAL' } },
    ],
  },
  'Satellite Ban': {
    play: [{ cost: { discard: 1 }, reward: { spice: 1, water: 1 } }],
    reveal: [
      { reward: { persuasion: 1 } },
      { reward: { retreatTroops: 2 } },
    ],
  },
  Sayyadina: {
    play: [{ cost: { water: 3 }, reward: { victoryPoints: 1 } }],
    reveal: [{ requirement: { bond: 'fremen' }, reward: { persuasion: 3 } }],
  },
  'Shai-Hulud': {
    acquire: { trash: 1 },
    play: [{ cost: { trash: 1 }, reward: { troops: 2 } }],
    reveal: [{ requirement: { bond: 'fremen' }, reward: { combat: 5 } }],
  },
  'Spice Trader': {
    play: [
      {
        requirement: { influence: { faction: 'fremen', amount: 2 } },
        cost: { discard: 1 },
        reward: { spice: 2 },
      },
    ],
    reveal: [{ reward: { persuasion: 2, combat: 1 } }],
  },
  Treachery: {
    play: [
      { reward: { custom: 'TREACHERY_DOUBLE_INFLUENCE' } },
      { reward: { trashThisCard: true } },
    ],
    reveal: [{ reward: { troops: 2, deployTroops: 2 } }],
  },
  Truthsayer: {
    play: [{ cost: { discard: 1 }, reward: { drawCards: 1 } }],
    reveal: [{ reward: { persuasion: 1, combat: 1 } }],
  },
  'Water Peddler': {
    acquire: { water: 1 },
    reveal: [{ reward: { water: 1 } }],
  },
  'Web of Power': {
    play: [{ reward: { custom: 'WEB_OF_POWER' } }],
    reveal: [
      { reward: { persuasion: 1 } },
      {
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: 'emperor', amount: 1 },
              { faction: 'spacing-guild', amount: 1 },
              { faction: 'bene-gesserit', amount: 1 },
              { faction: 'fremen', amount: 1 },
            ],
          },
        },
      },
    ],
  },
  'Weirding Way': {
    play: [{ reward: { custom: 'WEIRDING_WAY_EXTRA_TURN' } }],
    reveal: [{ reward: { persuasion: 1, combat: 2 } }],
  },

  // -------------------------------------------------------------------------
  // Promo cards (not implemented yet — no card art in the repo). Expected
  // shapes are recorded here so the audit artifact documents the gap.
  // -------------------------------------------------------------------------
  'Boundless Ambition': {
    // Agent box: Signet Ring. Reveal (Unload): acquire a card costing 5 or less.
    play: [{ reward: { custom: 'SIGNET_RING' } }],
    reveal: [{ reward: { custom: 'BOUNDLESS_AMBITION_ACQUIRE' } }],
  },
  'Duncan Loyal Blade': {
    play: [{ reward: { troops: 1 } }],
    reveal: [
      { reward: { persuasion: 1, combat: 2 } },
      { cost: { trashThisCard: true }, reward: { custom: 'DEPLOY_RETREAT_ANY_TROOPS' } },
    ],
  },
  'Jessica of Arrakis': {
    play: [
      {
        requirement: { inPlay: 'bene-gesserit' },
        reward: { drawCards: 2 },
      },
    ],
    reveal: [{ reward: { persuasion: 1, combat: 2 } }],
  },
  Thumper: {
    play: [{ reward: { custom: 'THUMPER_DOUBLE_BONUS_SPICE' } }],
    reveal: [{ reward: { persuasion: 1, spice: 1 } }],
  },
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

const FACTION_CODES: Record<string, string> = {
  EM: 'emperor',
  SG: 'spacing-guild',
  BG: 'bene-gesserit',
  FR: 'fremen',
}

const ICON_CODES: Record<string, string> = {
  Gr: 'landsraad',
  Bl: 'city',
  Yw: 'spice-trade',
  EM: 'emperor',
  SG: 'spacing-guild',
  BG: 'bene-gesserit',
  FR: 'fremen',
  Any: 'any',
}

function parseCsvList(value: string, map: Record<string, string>): string[] {
  if (!value || value === '–' || value === '-') return []
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => map[s] ?? `UNKNOWN(${s})`)
}

function parseYesNo(value: string): boolean | null {
  const v = value.trim().toLowerCase()
  if (v === 'yes') return true
  if (v === 'no') return false
  return null // NA / blank
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)])
    )
  }
  return value
}

function stable(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function deepEqual(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

interface CodeCard {
  name: string
  qty: number
  cost: number | null
  factions: string[]
  agentIcons: string[]
  infiltrate: boolean
  unload: boolean
  acquire: unknown
  play: unknown
  reveal: unknown
  image: string
}

function loadCodeCards(): Map<string, CodeCard> {
  const byName = new Map<string, CodeCard>()
  for (const card of RISE_OF_IX_IMPERIUM_DECK as Card[]) {
    const existing = byName.get(card.name)
    if (existing) {
      existing.qty += 1
      continue
    }
    byName.set(card.name, {
      name: card.name,
      qty: 1,
      cost: card.cost ?? null,
      factions: (card.faction ?? []).map(String),
      agentIcons: (card.agentIcons ?? []).map(String),
      infiltrate: Boolean(card.infiltrate),
      unload: Boolean(card.unload),
      acquire: card.acquireEffect ?? null,
      play: card.playEffect ?? null,
      reveal: card.revealEffect ?? null,
      image: card.image,
    })
  }
  return byName
}

interface CatalogCard {
  id: string
  name: string
  cost?: number
  factions?: string[]
  agentIcons?: string[]
  infiltrate?: boolean
  unload?: boolean
  riseOfIx?: boolean
  effects?: Record<string, string | string[]>
}

interface CatalogEffect {
  id: string
  owner: { type: string; id: string }
  slot: string
  index: number
  requirement?: unknown
  cost?: unknown
  reward?: unknown
  choiceOpt?: boolean
}

function loadCatalog(): {
  cards: Map<string, CatalogCard>
  effectsByCard: Map<string, Record<string, unknown[]>>
} {
  const cardsRaw = JSON.parse(readFileSync(CARDS_CATALOG_PATH, 'utf8')) as {
    cards: CatalogCard[]
  }
  const effectsRaw = JSON.parse(readFileSync(EFFECTS_CATALOG_PATH, 'utf8')) as {
    effects: CatalogEffect[]
  }

  const cards = new Map<string, CatalogCard>()
  for (const card of cardsRaw.cards) {
    if (card.riseOfIx) cards.set(card.name, card)
  }

  const effectsByCard = new Map<string, Record<string, unknown[]>>()
  for (const effect of effectsRaw.effects) {
    if (!effect.id.includes('imperium/')) continue
    const card = cardsRaw.cards.find(c => c.id === effect.owner.id)
    if (!card?.riseOfIx) continue
    const slots = effectsByCard.get(card.name) ?? {}
    const list = (slots[effect.slot] as unknown[]) ?? []
    list[effect.index] = {
      ...(effect.requirement !== undefined ? { requirement: effect.requirement } : {}),
      ...(effect.cost !== undefined ? { cost: effect.cost } : {}),
      ...(effect.reward !== undefined ? { reward: effect.reward } : {}),
      ...(effect.choiceOpt !== undefined ? { choiceOpt: effect.choiceOpt } : {}),
    }
    slots[effect.slot] = list
    effectsByCard.set(card.name, slots)
  }

  return { cards, effectsByCard }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

interface AuditRecord {
  name: string
  set: string
  qtyCsv: number
  qtyCode: number | null
  catalogId: string | null
  inCode: boolean
  inCatalog: boolean
  status: 'OK' | 'MISMATCH' | 'MISSING'
  mismatches: string[]
  expectedEffects: unknown
  csv: CsvRow
  code: CodeCard | null
  catalog: {
    card: CatalogCard | null
    effects: Record<string, unknown[]> | null
  }
}

function compare(): AuditRecord[] {
  const csvRows = parseCsv()
  const codeCards = loadCodeCards()
  const catalog = loadCatalog()

  const records: AuditRecord[] = []
  for (const row of csvRows) {
    const isIx = row.set.includes('Ix')
    const isPromo = row.set.toLowerCase().includes('promo')
    if (!isIx && !isPromo) continue

    const code = codeCards.get(row.name) ?? null
    const catalogCard = catalog.cards.get(row.name) ?? null
    const catalogEffects = catalog.effectsByCard.get(row.name) ?? null
    const mismatches: string[] = []

    // --- structured fields -------------------------------------------------
    if (!code) {
      mismatches.push('missing from cardsRiseOfIx.ts')
    } else {
      if (code.qty !== row.qty) {
        mismatches.push(`qty: csv=${row.qty} code=${code.qty}`)
      }
      const csvCost = row.cost ? Number(row.cost) : null
      if (csvCost !== null && code.cost !== csvCost) {
        mismatches.push(`cost: csv=${csvCost} code=${code.cost}`)
      }
      const csvFactions = parseCsvList(row.faction, FACTION_CODES)
      if (stable(csvFactions) !== stable(code.factions)) {
        mismatches.push(`factions: csv=[${csvFactions}] code=[${code.factions}]`)
      }
      const csvIcons = parseCsvList(row.agentIcons, ICON_CODES)
      if (stable(csvIcons) !== stable(code.agentIcons)) {
        mismatches.push(`agentIcons: csv=[${csvIcons}] code=[${code.agentIcons}]`)
      }
      const csvInfiltrate = parseYesNo(row.infiltrate)
      if (csvInfiltrate !== null && code.infiltrate !== csvInfiltrate) {
        mismatches.push(`infiltrate: csv=${csvInfiltrate} code=${code.infiltrate}`)
      }
      const csvUnload = parseYesNo(row.unload)
      if (csvUnload !== null && code.unload !== csvUnload) {
        mismatches.push(`unload: csv=${csvUnload} code=${code.unload}`)
      }
    }

    // --- expected effects vs code -----------------------------------------
    const expected = EXPECTED_EFFECTS[row.name]
    if (code && expected) {
      const pairs: Array<[string, unknown, unknown]> = [
        ['acquire', expected.acquire ?? null, code.acquire],
        ['play', expected.play ?? null, code.play],
        ['reveal', expected.reveal ?? null, code.reveal],
      ]
      for (const [slot, exp, actual] of pairs) {
        if (!deepEqual(exp, actual)) {
          mismatches.push(
            `${slot}: expected=${stable(exp)} code=${stable(actual)}`
          )
        }
      }
    } else if (code && !expected) {
      mismatches.push('no expected-effects spec for this card')
    }

    // --- catalog vs code ---------------------------------------------------
    if (code && !catalogCard) {
      mismatches.push('missing from catalog cards.v1.json')
    }
    if (code && catalogCard) {
      if (catalogCard.cost !== code.cost) {
        mismatches.push(`catalog cost: code=${code.cost} catalog=${catalogCard.cost}`)
      }
      if (stable(catalogCard.factions ?? []) !== stable(code.factions)) {
        mismatches.push(
          `catalog factions: code=[${code.factions}] catalog=[${catalogCard.factions ?? []}]`
        )
      }
      if (stable(catalogCard.agentIcons ?? []) !== stable(code.agentIcons)) {
        mismatches.push(
          `catalog agentIcons: code=[${code.agentIcons}] catalog=[${catalogCard.agentIcons ?? []}]`
        )
      }
      if (Boolean(catalogCard.infiltrate) !== code.infiltrate) {
        mismatches.push(
          `catalog infiltrate: code=${code.infiltrate} catalog=${Boolean(catalogCard.infiltrate)}`
        )
      }
      if (Boolean(catalogCard.unload) !== code.unload) {
        mismatches.push(
          `catalog unload: code=${code.unload} catalog=${Boolean(catalogCard.unload)}`
        )
      }
      // Catalog acquire entries are `{ reward: {...} }`; the code stores the
      // reward object directly.
      const catalogAcquireEntry = catalogEffects?.acquire?.[0] as
        | { reward?: unknown }
        | undefined
      const catalogAcquire = catalogAcquireEntry?.reward ?? null
      const catalogPlay = catalogEffects?.play ?? null
      const catalogReveal = catalogEffects?.reveal ?? null
      if (!deepEqual(catalogAcquire, code.acquire)) {
        mismatches.push(
          `catalog acquire: code=${stable(code.acquire)} catalog=${stable(catalogAcquire)}`
        )
      }
      if (!deepEqual(catalogPlay, code.play)) {
        mismatches.push(
          `catalog play: code=${stable(code.play)} catalog=${stable(catalogPlay)}`
        )
      }
      if (!deepEqual(catalogReveal, code.reveal)) {
        mismatches.push(
          `catalog reveal: code=${stable(code.reveal)} catalog=${stable(catalogReveal)}`
        )
      }
    }

    const status: AuditRecord['status'] = !code
      ? 'MISSING'
      : mismatches.length > 0
        ? 'MISMATCH'
        : 'OK'

    records.push({
      name: row.name,
      set: row.set,
      qtyCsv: row.qty,
      qtyCode: code?.qty ?? null,
      catalogId: catalogCard?.id ?? null,
      inCode: Boolean(code),
      inCatalog: Boolean(catalogCard),
      status,
      mismatches,
      expectedEffects: expected ?? null,
      csv: row,
      code,
      catalog: { card: catalogCard, effects: catalogEffects },
    })
  }

  return records
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function main(): void {
  const records = compare()

  const header = [
    'Card',
    'Set',
    'Qty (csv)',
    'Qty (code)',
    'Catalog ID',
    'In code',
    'In catalog',
    'Status',
    'Mismatches',
  ]
  const lines = [header.join(',')]
  for (const r of records) {
    lines.push(
      [
        r.name,
        r.set,
        String(r.qtyCsv),
        r.qtyCode === null ? '' : String(r.qtyCode),
        r.catalogId ?? '',
        r.inCode ? 'yes' : 'no',
        r.inCatalog ? 'yes' : 'no',
        r.status,
        r.mismatches.join(' | '),
      ]
        .map(csvEscape)
        .join(',')
    )
  }
  writeFileSync(OUT_CSV, lines.join('\n') + '\n')

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedFrom: {
          csv: 'client/src/data/Filtered Card Count ----> 136 5 cards av',
          code: 'client/src/data/cardsRiseOfIx.ts',
          catalog: 'client/public/catalogs/cards.v1.json + effects.v1.json',
        },
        summary: {
          total: records.length,
          ok: records.filter(r => r.status === 'OK').length,
          mismatch: records.filter(r => r.status === 'MISMATCH').length,
          missing: records.filter(r => r.status === 'MISSING').length,
        },
        records,
      },
      null,
      2
    ) + '\n'
  )

  const ok = records.filter(r => r.status === 'OK')
  const bad = records.filter(r => r.status !== 'OK')
  console.log(`\nRise of Ix card audit — ${records.length} cards`)
  console.log(`  OK:       ${ok.length}`)
  console.log(`  MISMATCH: ${records.filter(r => r.status === 'MISMATCH').length}`)
  console.log(`  MISSING:  ${records.filter(r => r.status === 'MISSING').length}`)
  if (bad.length > 0) {
    console.log('\nFindings:')
    for (const r of bad) {
      console.log(`\n  ${r.name} [${r.set}] — ${r.status}`)
      for (const m of r.mismatches) console.log(`    - ${m}`)
    }
  }
  console.log(`\nWrote ${OUT_CSV}`)
  console.log(`Wrote ${OUT_JSON}`)
}

main()
