import { describe, expect, it } from 'vitest'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'
import { riseOfIxImperiumManifest } from '../../../test-fixtures/riseOfIxManifest'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  FactionType,
  GainSource,
  RewardType,
  TurnType,
} from '../../../types/GameTypes'
import { TechTileId } from '../../../data/techTiles'
import { DEFAULT_DREADNOUGHTS } from '../../../utils/dreadnoughts'
import {
  applyBountyInfiltrationBonus,
  applyDesertAmbush,
  applyFullScaleDreadSwords,
  applyGuildAccordDiscount,
  applyImperialBasharSwords,
  applyIxianEngineerVp,
  applyNegotiatedWithdrawal,
  applyShockTrooperBonus,
  applyTreacheryDoubleInfluence,
  applyWebOfPower,
  applyWeirdingWayExtraTurn,
  consumeExtraTurn,
  heighlinerDiscountForPlayer,
  shouldConsumeExtraTurn,
} from '../riseOfIxReducer'
import { applyGameAction } from '../GameContext'
import {
  cloneRoiCard,
  getRoiTestState,
  makePlayer,
  stubDeckCard,
  withCardOnTop,
} from './_helpers'

const cardByName = (name: string) => {
  const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === name)
  if (!card) throw new Error(`missing RoI card: ${name}`)
  return card
}

describe('Rise of Ix imperium cards — manifest coverage', () => {
  const uniqueNames = [...new Set(RISE_OF_IX_IMPERIUM_DECK.map(c => c.name))]

  it('manifest lists all 29 unique RoI imperium cards', () => {
    expect(riseOfIxImperiumManifest).toHaveLength(29)
    for (const name of uniqueNames) {
      expect(riseOfIxImperiumManifest.some(e => e.name === name)).toBe(true)
    }
  })

  for (const entry of riseOfIxImperiumManifest) {
    const card = cardByName(entry.name)
    const corners =
      entry.cornerCases?.length ? ` [corners: ${entry.cornerCases.join('; ')}]` : ''

    it.todo(
      `${entry.name} (cost ${entry.cost}, qty ${entry.qty}) agent — ${entry.agentBox}${corners}`
    )
    it.todo(
      `${entry.name} reveal — ${entry.reveal}${entry.unload ? ' (unload on discard/trash)' : ''}`
    )
  }
})

describe('Rise of Ix imperium cards — data invariants', () => {
  it('every unique card has riseOfIx flag and image path', () => {
    for (const card of RISE_OF_IX_IMPERIUM_DECK) {
      expect(card.riseOfIx).toBe(true)
      expect(card.image).toMatch(/^imperium_row\/rise_of_ix\/.+\.png$/)
    }
  })

  it('Imperial Shock Trooper and Water Peddler have no agent icons (reveal-only)', () => {
    expect(cardByName('Imperial Shock Trooper').agentIcons).toEqual([])
    expect(cardByName('Water Peddler').agentIcons).toEqual([])
  })

  it('unload cards match manifest', () => {
    const unloadNames = riseOfIxImperiumManifest.filter(e => e.unload).map(e => e.name)
    for (const name of unloadNames) {
      expect(cardByName(name).unload).toBe(true)
    }
  })
})

describe('Rise of Ix imperium cards — pure effect helpers', () => {
  const source = { type: GainSource.CARD, id: 1, name: 'Test' }

  describe('Bounty Hunter — applyBountyInfiltrationBonus', () => {
    it('grants +2 Solari when infiltrating onto opponent-occupied space', () => {
      let s = getRoiTestState({
        playerOverrides: { solari: 5 },
        stateOverrides: {
          infiltrateIgnoreOccupancyOnce: { 0: true },
          occupiedSpaces: { 1: [0, 1] },
          currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: 1 },
        },
      })
      s = applyBountyInfiltrationBonus(s, 0, source)
      expect(s.players[0].solari).toBe(7)
    })

    it('no bonus without infiltrate flag', () => {
      let s = getRoiTestState({
        stateOverrides: {
          occupiedSpaces: { 1: [0, 1] },
          currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: 1 },
        },
      })
      s = applyBountyInfiltrationBonus(s, 0, source)
      expect(s.players[0].solari).toBe(20)
    })

    it('no bonus on unoccupied space', () => {
      let s = getRoiTestState({
        stateOverrides: {
          infiltrateIgnoreOccupancyOnce: { 0: true },
          occupiedSpaces: { 1: [0] },
          currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: 1 },
        },
      })
      s = applyBountyInfiltrationBonus(s, 0, source)
      expect(s.players[0].solari).toBe(20)
    })
  })

  describe('Guild Accord — heighliner discount', () => {
    it('sets 2-spice Heighliner discount for player', () => {
      const s = applyGuildAccordDiscount(getRoiTestState(), 0)
      expect(heighlinerDiscountForPlayer(s, 0)).toBe(2)
      expect(heighlinerDiscountForPlayer(s, 1)).toBe(0)
    })
  })

  describe('Web of Power — per-faction 2× influence rewards', () => {
    it('grants EM Solari, SG draw, FR water when each track ≥ 2', () => {
      let s = getRoiTestState({
        playerOverrides: { solari: 0, water: 0, handCount: 0 },
        stateOverrides: {
          factionInfluence: {
            [FactionType.EMPEROR]: { 0: 2 },
            [FactionType.SPACING_GUILD]: { 0: 2 },
            [FactionType.BENE_GESSERIT]: { 0: 0 },
            [FactionType.FREMEN]: { 0: 2 },
          },
        },
      })
      s = applyWebOfPower(s, 0, 99, 'Web of Power')
      expect(s.players[0].solari).toBe(2)
      expect(s.players[0].handCount).toBe(1)
      expect(s.players[0].water).toBe(1)
    })

    it('skips factions below 2 influence', () => {
      let s = getRoiTestState({
        playerOverrides: { solari: 5 },
        stateOverrides: {
          factionInfluence: {
            [FactionType.EMPEROR]: { 0: 1 },
            [FactionType.SPACING_GUILD]: { 0: 0 },
            [FactionType.BENE_GESSERIT]: { 0: 0 },
            [FactionType.FREMEN]: { 0: 0 },
          },
        },
      })
      s = applyWebOfPower(s, 0, 99, 'Web of Power')
      expect(s.players[0].solari).toBe(5)
    })
  })

  describe('Weirding Way — extra turn', () => {
    it('sets extraTurnAllowed on currTurn and records an extra-turn gain', () => {
      const s = applyWeirdingWayExtraTurn(
        getRoiTestState({
          stateOverrides: { currTurn: { playerId: 0, type: TurnType.ACTION } },
        }),
        0,
        8801,
        'Weirding Way'
      )
      expect(s.currTurn?.extraTurnAllowed).toBe(true)
      expect(s.gains).toContainEqual(
        expect.objectContaining({
          playerId: 0,
          sourceId: 8801,
          name: 'Weirding Way',
          amount: 1,
          type: RewardType.EXTRA_TURN,
        })
      )
    })

    it('shouldConsumeExtraTurn true only when flag set', () => {
      const withExtra = getRoiTestState({
        stateOverrides: { currTurn: { playerId: 0, type: TurnType.ACTION, extraTurnAllowed: true } },
      })
      const without = getRoiTestState({
        stateOverrides: { currTurn: { playerId: 0, type: TurnType.ACTION } },
      })
      expect(shouldConsumeExtraTurn(withExtra)).toBe(true)
      expect(shouldConsumeExtraTurn(without)).toBe(false)
    })

    it('consumeExtraTurn ends the current turn (currTurn cleared)', () => {
      const s = consumeExtraTurn(
        getRoiTestState({
          stateOverrides: { currTurn: { playerId: 0, type: TurnType.ACTION, extraTurnAllowed: true } },
        })
      )
      expect(s.currTurn).toBeNull()
      expect(s.canEndTurn).toBe(false)
    })

    it('PLACE_AGENT records extra-turn gain for turn history', () => {
      const card = cloneRoiCard('Weirding Way')
      card.id = 88099
      let s = getRoiTestState({
        playerOverrides: { deck: [card], handCount: 1, agents: 1 },
      })
      s = withCardOnTop(s, 0, card)
      s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
      s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
      s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 25 })
      expect(s.currTurn?.extraTurnAllowed).toBe(true)
      expect(s.gains).toContainEqual(
        expect.objectContaining({
          playerId: 0,
          sourceId: card.id,
          name: 'Weirding Way',
          amount: 1,
          type: RewardType.EXTRA_TURN,
          source: GainSource.CARD,
        })
      )
    })
  })

  describe('Imperial Bashar — reveal swords', () => {
    it('adds +2 plus +1 per other revealed sword card when in combat', () => {
      const bashar = stubDeckCard(10, { revealEffect: [{ reward: { combat: 2 } }] })
      const other = stubDeckCard(11, { revealEffect: [{ reward: { combat: 1 } }] })
      let s = getRoiTestState({
        stateOverrides: {
          combatTroops: { 0: 1 },
          combatStrength: { 0: 2 },
        },
      })
      s = applyImperialBasharSwords(s, 0, 10, 'Imperial Bashar', [bashar, other, other])
      // +2 base, +1 per other sword card (excludes cardId 10)
      expect(s.combatStrength[0]).toBe(6)
    })

    it('no combat bonus without units in conflict', () => {
      const s = applyImperialBasharSwords(getRoiTestState(), 0, 1, 'Imperial Bashar', [])
      expect(s.combatStrength[0]).toBeUndefined()
    })
  })

  describe('Imperial Shock Trooper', () => {
    it('+5 combat when agent on Emperor space, else +2', () => {
      const emperorSpaceId = 15 // Wealth — Emperor icon
      let onEm = getRoiTestState({
        stateOverrides: {
          combatTroops: { 0: 1 },
          combatStrength: { 0: 2 },
          occupiedSpaces: { [emperorSpaceId]: [0] },
        },
      })
      onEm = applyShockTrooperBonus(onEm, 0, 1, 'Imperial Shock Trooper')
      expect(onEm.combatStrength[0]).toBe(7)

      let offEm = getRoiTestState({
        stateOverrides: {
          combatTroops: { 0: 1 },
          combatStrength: { 0: 2 },
          occupiedSpaces: { 1: [0] },
        },
      })
      offEm = applyShockTrooperBonus(offEm, 0, 1, 'Imperial Shock Trooper')
      expect(offEm.combatStrength[0]).toBe(4)
    })
  })

  describe('Full-Scale Assault — dreadnought swords', () => {
    it('+3 combat per dreadnought in conflict', () => {
      let s = getRoiTestState({
        playerOverrides: {
          dreadnoughts: { ...DEFAULT_DREADNOUGHTS, conflict: 2 },
        },
        stateOverrides: {
          combatTroops: { 0: 0 },
          combatStrength: { 0: 6 },
          combatNegotiators: { 0: 0 },
        },
      })
      s = applyFullScaleDreadSwords(s, 0, 1, 'Full-Scale Assault')
      expect(s.combatStrength[0]).toBe(12)
    })

    it('no bonus with zero dreadnoughts in conflict', () => {
      let s = getRoiTestState({
        stateOverrides: { combatTroops: { 0: 1 }, combatStrength: { 0: 2 } },
      })
      s = applyFullScaleDreadSwords(s, 0, 1, 'Full-Scale Assault')
      expect(s.combatStrength[0]).toBe(2)
    })
  })

  describe('Ixian Engineer — trash for VP', () => {
    it('enqueues optional trash+VP when player owns 3+ tech', () => {
      const s = applyIxianEngineerVp(
        getRoiTestState({
          playerOverrides: {
            tech: [
              { id: TechTileId.MINIMIC_FILM, faceUp: true },
              { id: TechTileId.ARTILLERY, faceUp: true },
              { id: TechTileId.WINDTRAPS, faceUp: true },
            ],
          },
        }),
        0,
        1,
        'Ixian Engineer'
      )
      expect(s.pendingRewards).toContainEqual(
        expect.objectContaining({
          reward: expect.objectContaining({ trashThisCard: true, victoryPoints: 1 }),
          isTrash: true,
        })
      )
    })

    it('no pending reward below 3 tech', () => {
      const s = applyIxianEngineerVp(
        getRoiTestState({
          playerOverrides: { tech: [{ id: TechTileId.MINIMIC_FILM, faceUp: true }] },
        }),
        0,
        1,
        'Ixian Engineer'
      )
      expect(s.pendingRewards ?? []).toHaveLength(0)
    })
  })

  describe('Negotiated Withdrawel', () => {
    it('enqueues retreat 3 + influence choice and extends retreat allowance', () => {
      const s = applyNegotiatedWithdrawal(
        getRoiTestState({
          stateOverrides: { currTurn: { playerId: 0, type: TurnType.REVEAL } },
        }),
        0,
        1,
        'Negotiated Withdrawel'
      )
      expect(s.pendingRewards[0].reward.retreatTroops).toBe(3)
      expect(s.pendingRewards[0].reward.influence?.chooseOne).toBe(true)
      expect(s.currTurn?.effectRetreatAllowance).toBe(3)
    })
  })

  describe('Desert Ambush', () => {
    it('grants retreat allowance equal to troops deployed this turn', () => {
      const s = applyDesertAmbush(
        getRoiTestState({
          stateOverrides: {
            currTurn: { playerId: 0, type: TurnType.REVEAL, troopsDeployedToConflict: 2 },
          },
        }),
        0,
        1,
        'Desert Ambush'
      )
      expect(s.currTurn?.effectRetreatAllowance).toBe(2)
      expect(s.gains).toContainEqual(
        expect.objectContaining({ type: RewardType.RETREAT, amount: 2 })
      )
    })

    it('no retreat when zero troops deployed', () => {
      const s = applyDesertAmbush(
        getRoiTestState({
          stateOverrides: { currTurn: { playerId: 0, type: TurnType.REVEAL } },
        }),
        0,
        1,
        'Desert Ambush'
      )
      expect(s.currTurn?.effectRetreatAllowance).toBeUndefined()
    })
  })

  describe('Treachery — double influence', () => {
    it('adds +2 influence per faction icon on the card', () => {
      const s = applyTreacheryDoubleInfluence(
        getRoiTestState(),
        0,
        [FactionType.EMPEROR, FactionType.BENE_GESSERIT],
        1,
        'Treachery'
      )
      expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
      expect(s.factionInfluence[FactionType.BENE_GESSERIT][0]).toBe(2)
    })
  })
})

describe('Rise of Ix imperium cards — reducer integration', () => {
  it('Landing Rights agent: +1 freighter step via freighter reward', () => {
    const card = cloneRoiCard('Landing Rights')
    card.id = 88001
    let s = getRoiTestState({
      playerOverrides: { deck: [card], handCount: 1, agents: 1, freighterStep: 0 },
    })
    s = withCardOnTop(s, 0, card)
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    // City space (id 1 Rally Troops needs solari — use Mentat id 6 or simpler: space 3 Foldspace)
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 3 })
    const freighterChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.startsWith('Freighter')
    )
    expect(freighterChoice).toBeDefined()
  })

  it('Appropriate agent: EM 2× influence gates acquireTech', () => {
    const card = cloneRoiCard('Appropriate')
    card.id = 88002
    let s = getRoiTestState({
      playerOverrides: {
        deck: [card],
        handCount: 1,
        agents: 1,
        factionInfluence: undefined,
      },
      stateOverrides: {
        factionInfluence: {
          [FactionType.EMPEROR]: { 0: 1 },
          [FactionType.SPACING_GUILD]: { 0: 0 },
          [FactionType.BENE_GESSERIT]: { 0: 0 },
          [FactionType.FREMEN]: { 0: 0 },
        },
      },
    })
    s = withCardOnTop(s, 0, card)
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 10 }) // Landsraad
    const techPending = s.pendingRewards.find(r => r.reward.acquireTech != null)
    expect(techPending).toBeUndefined()

    s = getRoiTestState({
      playerOverrides: { deck: [card], handCount: 1, agents: 1 },
      stateOverrides: {
        factionInfluence: {
          [FactionType.EMPEROR]: { 0: 2 },
          [FactionType.SPACING_GUILD]: { 0: 0 },
          [FactionType.BENE_GESSERIT]: { 0: 0 },
          [FactionType.FREMEN]: { 0: 0 },
        },
      },
    })
    s = withCardOnTop(s, 0, card)
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 10 })
    const optionalAcquire = s.currTurn?.optionalEffects?.find(
      e => e.reward.acquireTech != null
    )
    expect(optionalAcquire?.reward.acquireTech?.paySolariInsteadOfSpice).toBe(true)
  })

  it('Treachery agent: double influence and enqueues trash-this-card reward', () => {
    const card = cloneRoiCard('Treachery')
    card.id = 88003
    let s = getRoiTestState({
      playerOverrides: { deck: [card], handCount: 1, agents: 1 },
    })
    s = withCardOnTop(s, 0, card)
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBeGreaterThanOrEqual(2)
    // trashThisCard is a pending reward (not immediate) — must be claimed
    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({ id: card.id, name: 'Treachery' }),
        reward: expect.objectContaining({ trashThisCard: true }),
        isTrash: true,
      })
    )
  })
})
