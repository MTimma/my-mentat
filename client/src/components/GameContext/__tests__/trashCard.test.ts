import { describe, it, expect } from 'vitest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import {
  AgentIcon,
  CardPile,
  ChoiceType,
  CustomEffect,
  FactionType,
  GainSource,
  RewardType,
  TurnType,
  type Card,
  type CardSelectChoice,
  type FixedOptionsChoice,
} from '../../../types/GameTypes'

const SECURE_CONTRACT_ID = BOARD_SPACES.find(s => s.name === 'Secure Contract')!.id
const SELECTIVE_BREEDING_ID = BOARD_SPACES.find(s => s.name === 'Selective Breeding')!.id

function imperiumCard(name: string): Card {
  const card = IMPERIUM_ROW_DECK.find(c => c.name === name)
  if (!card) throw new Error(`${name} not found in IMPERIUM_ROW_DECK`)
  return structuredClone(card)
}

describe('TRASH_CARD — pile semantics', () => {
  // Hand = first handCount entries of player.deck; the rest is the draw pile.
  function pileState() {
    const hand1 = stubDeckCard(101)
    const hand2 = stubDeckCard(102)
    const drawPile1 = stubDeckCard(103)
    const discarded = stubDeckCard(104)
    const inPlay = stubDeckCard(105)
    const s = getBaseTestState({
      deck: [hand1, hand2, drawPile1],
      handCount: 2,
      discardPile: [discarded],
      playArea: [inPlay],
      trash: [],
    })
    return { s, hand1, hand2, drawPile1, discarded, inPlay }
  }

  it('trashes a card from hand: removed from deck, handCount decremented, appended to trash', () => {
    const { s, hand1, hand2, drawPile1, discarded, inPlay } = pileState()
    const after = applyGameAction(s, { type: 'TRASH_CARD', playerId: 0, cardId: hand1.id })

    const p = after.players[0]
    expect(p.deck.map(c => c.id)).toEqual([hand2.id, drawPile1.id])
    expect(p.handCount).toBe(1)
    expect(p.trash.map(c => c.id)).toEqual([hand1.id])
    expect(p.discardPile.map(c => c.id)).toEqual([discarded.id])
    expect(p.playArea.map(c => c.id)).toEqual([inPlay.id])
    // Default attribution when no source given: the trashed card itself.
    expect(after.gains).toContainEqual({
      round: s.currentRound,
      playerId: 0,
      sourceId: hand1.id,
      name: hand1.name,
      amount: -1,
      type: RewardType.TRASH,
      source: GainSource.CARD,
    })
  })

  it('trashes a card from the draw pile (deck index >= handCount): handCount unchanged', () => {
    const { s, hand1, hand2, drawPile1 } = pileState()
    const after = applyGameAction(s, { type: 'TRASH_CARD', playerId: 0, cardId: drawPile1.id })

    const p = after.players[0]
    expect(p.deck.map(c => c.id)).toEqual([hand1.id, hand2.id])
    expect(p.handCount).toBe(2)
    expect(p.trash.map(c => c.id)).toEqual([drawPile1.id])
  })

  it('trashes a card from the discard pile: handCount unchanged', () => {
    const { s, discarded } = pileState()
    const after = applyGameAction(s, { type: 'TRASH_CARD', playerId: 0, cardId: discarded.id })

    const p = after.players[0]
    expect(p.discardPile).toEqual([])
    expect(p.handCount).toBe(2)
    expect(p.deck.length).toBe(3)
    expect(p.trash.map(c => c.id)).toEqual([discarded.id])
  })

  it('trashes a card from the play area: handCount unchanged', () => {
    const { s, inPlay } = pileState()
    const after = applyGameAction(s, { type: 'TRASH_CARD', playerId: 0, cardId: inPlay.id })

    const p = after.players[0]
    expect(p.playArea).toEqual([])
    expect(p.handCount).toBe(2)
    expect(p.trash.map(c => c.id)).toEqual([inPlay.id])
  })

  it('returns state unchanged for a card id that exists in no pile', () => {
    const { s } = pileState()
    const after = applyGameAction(s, { type: 'TRASH_CARD', playerId: 0, cardId: 99999 })
    // NOTE: current behavior — same state reference returned, no gain recorded.
    expect(after).toBe(s)
  })

  it('applies gainReward with the given source attribution', () => {
    const { s, hand1 } = pileState()
    const source = { type: GainSource.BOARD_SPACE, id: SELECTIVE_BREEDING_ID, name: 'Selective Breeding' }
    const after = applyGameAction(s, {
      type: 'TRASH_CARD',
      playerId: 0,
      cardId: hand1.id,
      gainReward: { spice: 2, drawCards: 1 },
      source,
    })

    const p = after.players[0]
    expect(p.spice).toBe(12) // 10 base + 2
    // handCount: 2 - 1 (trashed from hand) + 1 (drawCards) = 2
    expect(p.handCount).toBe(2)
    expect(p.trash.map(c => c.id)).toEqual([hand1.id])
    // Trash gain keeps the card name but takes the source's GainSource type.
    expect(after.gains).toContainEqual(
      expect.objectContaining({
        playerId: 0,
        sourceId: hand1.id,
        name: hand1.name,
        amount: -1,
        type: RewardType.TRASH,
        source: GainSource.BOARD_SPACE,
      })
    )
    expect(after.gains).toContainEqual(
      expect.objectContaining({
        playerId: 0,
        sourceId: SELECTIVE_BREEDING_ID,
        name: 'Selective Breeding',
        amount: 2,
        type: RewardType.SPICE,
        source: GainSource.BOARD_SPACE,
      })
    )
    expect(after.gains).toContainEqual(
      expect.objectContaining({
        playerId: 0,
        name: 'Selective Breeding',
        amount: 1,
        type: RewardType.DRAW,
        source: GainSource.BOARD_SPACE,
      })
    )
  })

  it('gainReward drawCards increments handCount even when the draw pile is empty', () => {
    const only = stubDeckCard(201)
    const s = getBaseTestState({ deck: [only], handCount: 1, discardPile: [], playArea: [], trash: [] })
    const after = applyGameAction(s, {
      type: 'TRASH_CARD',
      playerId: 0,
      cardId: only.id,
      gainReward: { drawCards: 1 },
      source: { type: GainSource.CARD, id: only.id, name: only.name },
    })

    const p = after.players[0]
    expect(p.deck).toEqual([])
    // NOTE: current behavior — TRASH_CARD's gainReward path (applyChoiceReward) does not
    // clamp drawCards to the draw pile size, so handCount (1) exceeds deck length (0).
    expect(p.handCount).toBe(1)
    expect(p.trash.map(c => c.id)).toEqual([only.id])
  })
})

describe('RESOLVE_CARD_SELECT — Other Memory (end-to-end)', () => {
  function otherMemorySetup() {
    const bgCard = stubDeckCard(301, { faction: [FactionType.BENE_GESSERIT] })
    const plainCard = stubDeckCard(302)
    const handStubs = [stubDeckCard(311), stubDeckCard(312), stubDeckCard(313), stubDeckCard(314)]
    const otherMemory = imperiumCard('Other Memory')

    let s = getBaseTestState({
      deck: handStubs,
      handCount: 5,
      discardPile: [bgCard, plainCard],
      playArea: [],
      trash: [],
    })
    s = withCardOnTop(s, 0, otherMemory) // deck: [Other Memory, ...4 stubs], hand = all 5
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: otherMemory.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECURE_CONTRACT_ID })
    return { s, bgCard, plainCard, handStubs, otherMemory }
  }

  it('playing Other Memory creates a FIXED_OPTIONS choice with the custom option enabled', () => {
    const { s } = otherMemorySetup()
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice?.type).toBe(ChoiceType.FIXED_OPTIONS)
    const fixed = choice as FixedOptionsChoice
    expect(fixed.options).toHaveLength(2)
    const omOption = fixed.options.find(o => o.reward.custom === CustomEffect.OTHER_MEMORY)
    expect(omOption?.disabled).toBe(false)
    expect(s.canEndTurn).toBe(false)
  })

  it('Other Memory option is disabled when discard pile has no Bene Gesserit card', () => {
    const otherMemory = imperiumCard('Other Memory')
    let s = getBaseTestState({
      deck: [stubDeckCard(321)],
      handCount: 2,
      discardPile: [stubDeckCard(322)], // no BG faction
      playArea: [],
    })
    s = withCardOnTop(s, 0, otherMemory)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: otherMemory.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECURE_CONTRACT_ID })

    const fixed = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    const omOption = fixed.options.find(o => o.reward.custom === CustomEffect.OTHER_MEMORY)
    expect(omOption?.disabled).toBe(true)
  })

  it('RESOLVE_CHOICE on the custom option creates a CARD_SELECT pendingChoice over the discard pile', () => {
    const { s, otherMemory } = otherMemorySetup()
    const fixed = s.currTurn!.pendingChoices![0]
    const after = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: fixed.id,
      reward: { custom: CustomEffect.OTHER_MEMORY },
      source: { type: GainSource.CARD, id: otherMemory.id, name: otherMemory.name },
    })

    expect(after.currTurn?.pendingChoices).toHaveLength(1)
    const cardSelect = after.currTurn!.pendingChoices![0] as CardSelectChoice
    expect(cardSelect.type).toBe(ChoiceType.CARD_SELECT)
    expect(cardSelect.piles).toEqual([CardPile.DISCARD])
    expect(cardSelect.selectionCount).toBe(1)
    expect(cardSelect.disabled).toBe(false)
    expect(cardSelect.source).toEqual({ type: GainSource.CARD, id: otherMemory.id, name: otherMemory.name })
    expect(after.canEndTurn).toBe(false)
  })

  it('RESOLVE_CARD_SELECT moves the chosen card from discard to deck top and clears the choice', () => {
    const { s, bgCard, plainCard, handStubs, otherMemory } = otherMemorySetup()
    const fixed = s.currTurn!.pendingChoices![0]
    let after = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: fixed.id,
      reward: { custom: CustomEffect.OTHER_MEMORY },
      source: { type: GainSource.CARD, id: otherMemory.id, name: otherMemory.name },
    })
    const cardSelect = after.currTurn!.pendingChoices![0]
    after = applyGameAction(after, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: cardSelect.id,
      cardIds: [bgCard.id],
    })

    const p = after.players[0]
    expect(p.deck.map(c => c.id)).toEqual([bgCard.id, ...handStubs.map(c => c.id)])
    expect(p.discardPile.map(c => c.id)).toEqual([plainCard.id])
    // handCount: 5 - 1 (Other Memory played) + 1 (card returned counts as drawn) = 5
    expect(p.handCount).toBe(5)
    expect(after.currTurn?.pendingChoices).toEqual([])
    // NOTE: current behavior — RESOLVE_CARD_SELECT sets canEndTurn true unconditionally,
    // even though the Secure Contract solari pendingReward is still unclaimed.
    expect(after.canEndTurn).toBe(true)
    expect(after.pendingRewards.length).toBeGreaterThan(0)
    expect(after.gains).toContainEqual(
      expect.objectContaining({
        playerId: 0,
        sourceId: otherMemory.id,
        name: otherMemory.name,
        amount: 1,
        type: RewardType.DRAW,
        source: GainSource.CARD,
      })
    )
  })

  it('RESOLVE_CARD_SELECT with an unknown choiceId leaves state unchanged', () => {
    const { s } = otherMemorySetup()
    const after = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: 'no-such-choice',
      cardIds: [301],
    })
    expect(after).toBe(s)
  })
})

describe('RESOLVE_CARD_SELECT — Helena signet ring (Imperium Row replacement)', () => {
  it('CLAIM_REWARD without a card creates a CARD_SELECT; resolving swaps the row card', () => {
    const rowCards = [9001, 9002, 9003, 9004, 9005].map(id => stubDeckCard(id))
    const replacement = stubDeckCard(9100)
    const source = { type: GainSource.LEADER_ABILITY, id: 0, name: 'Helena Signet Ring' }

    let s = getBaseTestState()
    s = {
      ...s,
      currTurn: { playerId: 0, type: TurnType.ACTION },
      imperiumRow: rowCards,
      imperiumRowDeck: [replacement],
      pendingRewards: [
        {
          id: 'helena-reward',
          source,
          reward: { custom: CustomEffect.HELENA_SIGNET_RING },
          isTrash: false,
        },
      ],
    }

    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: 'helena-reward' })

    expect(s.pendingRewards).toEqual([])
    const choice = s.currTurn?.pendingChoices?.[0] as CardSelectChoice
    expect(choice.type).toBe(ChoiceType.CARD_SELECT)
    expect(choice.cards?.map(c => c.id)).toEqual(rowCards.map(c => c.id))
    expect(choice.piles).toEqual([])
    expect(choice.selectionCount).toBe(1)
    expect(choice.source).toEqual(source)
    expect(s.canEndTurn).toBe(false)

    const picked = rowCards[1]
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice.id,
      cardIds: [picked.id],
    })

    expect(s.imperiumRow.map(c => c.id)).toEqual([9001, 9100, 9003, 9004, 9005])
    expect(s.imperiumRowDeck).toEqual([])
    expect(s.helenaRemovedCard).toEqual({ cardId: picked.id, playerId: 0, card: picked })
    expect(s.currTurn?.pendingChoices).toEqual([])
    expect(s.canEndTurn).toBe(true)
  })
})

describe('Selective Breeding — trash via PLACE_AGENT selectiveBreedingData', () => {
  it('moves the chosen card to trash and fixes handCount when trashed from hand', () => {
    const played = stubDeckCard(401, { agentIcons: [AgentIcon.BENE_GESSERIT] })
    const trashed = stubDeckCard(402)
    let s = getBaseTestState({ spice: 10 })
    s = withCardOnTop(s, 0, played) // deck: [played, stub-5000]
    s.players[0].deck.push(trashed) // deck: [played, stub-5000, trashed], handCount 5 covers all

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: played.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: SELECTIVE_BREEDING_ID,
      selectiveBreedingData: { trashedCardId: trashed.id },
    })

    const p = s.players[0]
    expect(p.trash.map(c => c.id)).toEqual([trashed.id])
    expect(p.deck.map(c => c.id)).toEqual([5000])
    expect(p.playArea.map(c => c.id)).toEqual([played.id])
    // handCount: 5 - 1 (played card) - 1 (trashed from hand) = 3
    expect(p.handCount).toBe(3)
    expect(p.spice).toBe(8)
    // NOTE: current behavior — the selective-breeding trash records no TRASH gain entry
    // (unlike the TRASH_CARD action).
    expect(s.gains.some(g => g.type === RewardType.TRASH)).toBe(false)
  })
})
