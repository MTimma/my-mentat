import type { Card, Expansions, GameState, Player } from '../../types/GameTypes'
import { AgentIcon } from '../../types/GameTypes'

const BLANK_SLATE_EXTRA_ICONS: AgentIcon[] = [
  AgentIcon.EMPEROR,
  AgentIcon.SPACING_GUILD,
  AgentIcon.FREMEN,
  AgentIcon.BENE_GESSERIT,
]

export function isUsurpCard(card: Card): boolean {
  return card.name === 'Usurp'
}

export function isGholaCard(card: Card): boolean {
  return card.name === 'Ghola'
}

export function getGraftPartner(cards: Card[], card: Card): Card | undefined {
  return cards.find(c => c.id !== card.id)
}

/** Resolve graft-pair cards for the active agent turn (deck, play area, or Usurp borrow). */
export function resolveGraftCards(state: GameState, player: Player): Card[] {
  const ids = state.graftPair?.cardIds
  if (!ids?.length) return []
  return ids
    .map(id => {
      if (state.usurpBorrowed?.card.id === id) return state.usurpBorrowed.card
      return (
        player.deck.find(c => c.id === id) ??
        player.playArea.find(c => c.id === id) ??
        undefined
      )
    })
    .filter((c): c is Card => c != null)
}

/** Agent icons for a graft pair (Ghola copies partner; Blank Slate adds faction icons). */
export function computeGraftAgentIcons(cards: Card[]): AgentIcon[] {
  if (cards.length < 2) return cards[0]?.agentIcons ?? []

  const icons = new Set<AgentIcon>()
  const ghola = cards.find(isGholaCard)
  const partner = ghola ? getGraftPartner(cards, ghola) : undefined

  for (const card of cards) {
    if (isGholaCard(card)) continue
    card.agentIcons.forEach(icon => icons.add(icon))
  }

  if (ghola && partner) {
    partner.agentIcons.forEach(icon => icons.add(icon))
  }

  if (cards.some(c => c.name === 'Blank Slate') && cards.length >= 2) {
    BLANK_SLATE_EXTRA_ICONS.forEach(icon => icons.add(icon))
  }

  return [...icons]
}

export function graftPairHasInfiltrate(cards: Card[]): boolean {
  return cards.some(c => c.infiltrate)
}

export function immortalityGraftEnabled(expansions?: Expansions): boolean {
  return Boolean(expansions?.immortality)
}

/** True when a graft card (other than Usurp) still needs a hand partner before placement. */
export function graftCardNeedsHandPartner(card: Card): boolean {
  return Boolean(card.graft && !isUsurpCard(card))
}

/** Whether an agent-turn hand selection can be confirmed. */
export function canConfirmGraftHandSelection(cards: Card[]): boolean {
  if (cards.length === 0) return false
  if (cards.length === 1) return !graftCardNeedsHandPartner(cards[0])
  if (cards.length === 2) return cards.some(c => c.graft)
  return false
}

/** Preview slot count for graft-aware card picker (1 or 2). */
export function graftHandSelectionPreviewSlots(slots: (Card | null)[]): number {
  const cards = slots.filter((c): c is Card => c != null)
  if (cards.length >= 2) return 2
  if (cards.length === 1 && graftCardNeedsHandPartner(cards[0])) return 2
  return 1
}

/** Whether picking `card` should fill the second graft slot (Immortality agent turn). */
export function shouldPickGraftPartnerSlot(first: Card | null, card: Card): boolean {
  if (!first) return false
  return graftCardNeedsHandPartner(first) || graftCardNeedsHandPartner(card)
}
