import { describe, expect, it } from 'vitest'
import {
  ARRAKIS_LIAISON_DECK,
  FOLDSPACE_DECK,
  IMPERIUM_ROW_DECK,
  SPICE_MUST_FLOW_DECK,
  STARTING_DECK,
} from '../../data/cards'
import { defaultCatalogRuntime } from '../runtime/createCatalogRuntime'
import { slugify } from '../buildCatalog'
import cardsFile from '../../../public/catalogs/cards.v1.json'
import type { CardsCatalogFile } from '../runtime/types'
import {
  AUTO_APPLIED_CUSTOM_EFFECTS,
  CustomEffect,
  TurnType,
  type Card,
  type CardEffect,
} from '../../types/GameTypes'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { getBaseTestState } from '../../components/GameContext/__tests__/_helpers'

const cardsCatalog = cardsFile as CardsCatalogFile
const runtime = defaultCatalogRuntime

const ALL_AUTHORED_CARDS: Card[] = [
  ...STARTING_DECK,
  ...IMPERIUM_ROW_DECK,
  ...ARRAKIS_LIAISON_DECK,
  ...SPICE_MUST_FLOW_DECK,
  ...FOLDSPACE_DECK,
]

function catalogIdForAuthoredCard(card: Card): string {
  const pools = ['starting', 'imperium', 'arrakis-liaison', 'spice-must-flow', 'foldspace'] as const
  for (const pool of pools) {
    const id = `${pool}/${slugify(card.name)}`
    if (cardsCatalog.cards.some(entry => entry.id === id && entry.name === card.name)) {
      return id
    }
  }
  const fallback = cardsCatalog.cards.find(entry => entry.name === card.name)
  if (!fallback) throw new Error(`No catalog entry for ${card.name}`)
  return fallback.id
}

function collectCustomEffects(effects: CardEffect[] | undefined): CustomEffect[] {
  return (effects ?? [])
    .map(effect => effect.reward?.custom)
    .filter((custom): custom is CustomEffect => custom != null)
}

/** Play effects that should surface as a pending reward with `reward.custom` on agent placement. */
const PENDING_PLAY_CUSTOMS = new Set<CustomEffect>([
  CustomEffect.THE_VOICE,
  CustomEffect.REVEREND_MOTHER_MOHIAM,
  CustomEffect.POWER_PLAY,
  CustomEffect.TEST_OF_HUMANITY,
])

describe('catalog custom effects parity', () => {
  it('hydrates every authored custom effect from the effects registry', () => {
    const mismatches: string[] = []
    const seen = new Set<string>()

    for (const card of ALL_AUTHORED_CARDS) {
      const catalogId = catalogIdForAuthoredCard(card)
      const key = `${catalogId}`
      if (seen.has(key)) continue
      seen.add(key)

      const hydrated = runtime.resolveCatalogCardIds([catalogId])[0]
      for (const slot of ['playEffect', 'revealEffect', 'trashEffect'] as const) {
        const authored = card[slot] ?? []
        const fromCatalog = hydrated[slot] ?? []
        if (authored.length !== fromCatalog.length) {
          mismatches.push(`${catalogId} ${slot}: length ${authored.length} vs ${fromCatalog.length}`)
          continue
        }
        authored.forEach((effect, index) => {
          const a = effect.reward?.custom
          const h = fromCatalog[index]?.reward?.custom
          if (a !== h) {
            mismatches.push(`${catalogId} ${slot}[${index}]: ${String(a)} vs ${String(h)}`)
          }
          if (a && !Object.values(CustomEffect).includes(a)) {
            mismatches.push(`${catalogId} ${slot}[${index}]: unknown custom ${a}`)
          }
        })
      }
    }

    expect(mismatches, mismatches.join('\n')).toEqual([])
  })

  it('every catalog effect custom is a published CustomEffect enum value', () => {
    const unknown: string[] = []
    for (const effect of runtime.slices.effects) {
      const custom = effect.reward?.custom
      if (custom && !Object.values(CustomEffect).includes(custom as CustomEffect)) {
        unknown.push(`${effect.id}: ${custom}`)
      }
    }
    expect(unknown, unknown.join('\n')).toEqual([])
  })

  it('interactive play customs are not auto-applied silently', () => {
    for (const custom of PENDING_PLAY_CUSTOMS) {
      expect(AUTO_APPLIED_CUSTOM_EFFECTS).not.toContain(custom)
    }
  })

  it.each(
    [...PENDING_PLAY_CUSTOMS].map(custom => [custom, custom])
  )('agent placement creates pending reward for %s (catalog deck)', (custom) => {
    const entry = cardsCatalog.cards.find(card =>
      card.effects.play?.some(effectId => {
        const effect = runtime.getEffectById(effectId)
        return effect?.reward?.custom === custom
      })
    )
    expect(entry, `catalog card with play custom ${custom}`).toBeDefined()

    const card = structuredClone(runtime.resolveCatalogCardIds([entry!.id])[0])
    const spaceId =
      custom === CustomEffect.THE_VOICE
        ? 4 // Imperial Basin — city + spice-trade icons
        : runtime.boardSpaces.find(s => card.agentIcons.includes(s.agentIcon) && !s.conflictMarker)?.id
    expect(spaceId, `board space for ${card.name}`).toBeDefined()

    let s = getBaseTestState({ deck: [card], handCount: 1, agents: 2 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: spaceId! })

    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({
        reward: expect.objectContaining({ custom }),
        source: expect.objectContaining({ type: 'card', id: card.id }),
      })
    )
  })
})
