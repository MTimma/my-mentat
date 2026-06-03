import { describe, it, expect } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { IMPERIUM_ROW_DECK, SPICE_MUST_FLOW_DECK, STARTING_DECK } from '../../../data/cards'
import { intrigueCards } from '../../../services/IntrigueDeckService'
import {
  AgentIcon,
  CustomEffect,
  FactionType,
  GamePhase,
  GainSource,
  Leader,
  PlayerColor,
  RewardType,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'

function stubDeckCard(id: number): Card {
  return {
    id,
    name: `stub-${id}`,
    image: '',
    agentIcons: [AgentIcon.CITY],
  }
}

function makeLeader(): Leader {
  return new Leader(
    'Test',
    { name: 'Ability', description: 'Test ability' },
    'Signet text',
    1
  )
}

function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  const colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]
  return {
    id,
    color: colors[id % 4] ?? PlayerColor.RED,
    leader: makeLeader(),
    troops: 8,
    spice: 10,
    water: 3,
    solari: 20,
    victoryPoints: 0,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 5,
    revealed: false,
    intrigueCount: 1,
    deck: [stubDeckCard(5001)],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
}

function basePlotState(players: Player[], activeId = 0): GameState {
  const s = getFreshDefaultGameState()
  return {
    ...s,
    players,
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: activeId,
    firstPlayerMarker: 0,
    intrigueDeck: [...intrigueCards],
    combatPasses: new Set(),
    endgameDonePlayers: new Set(),
    currTurn: null,
    selectedCard: null,
    combatTroops: {},
    combatStrength: {},
    mentatOwner: null,
  }
}

function smfCard(id: number): Card {
  return {
    id,
    name: 'The Spice Must Flow',
    image: '',
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 9,
  }
}

function powerPlayCard(): Card {
  const card = IMPERIUM_ROW_DECK.find(c => c.name === 'Power Play')
  if (!card) throw new Error('Power Play card not found')
  return structuredClone(card)
}

function startingCard(name: string): Card {
  const card = STARTING_DECK.find(c => c.name === name)
  if (!card) throw new Error(`${name} card not found`)
  return structuredClone(card)
}

describe('Intrigue cards — player turns (plot)', () => {
  it('Windfall (32): +2 Solari', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 32 })
    expect(s.players[0].solari).toBe(22)
    expect(s.players[0].intrigueCount).toBe(0)
  })

  it('Water Peddlers Union (31): +1 water', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 31 })
    expect(s.players[0].water).toBe(4)
  })

  it.each([
    [13, FactionType.EMPEROR],
    [14, FactionType.SPACING_GUILD],
    [16, FactionType.FREMEN],
    [24, FactionType.BENE_GESSERIT],
  ] as const)('influence-only card %i adds influence on %s', (cardId, faction) => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId })
    expect(s.factionInfluence[faction][0]).toBe(1)
  })

  it('CHOAM Shares (8): pay 7 Solari for 1 VP', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 8 })
    expect(s.players[0].solari).toBe(13)
    expect(s.players[0].victoryPoints).toBe(1)
  })

  it('The Sleeper Must Awaken (26): pay 4 spice for 1 VP', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 26 })
    expect(s.players[0].spice).toBe(6)
    expect(s.players[0].victoryPoints).toBe(1)
  })

  it('Water of Life (30): pay 1 water and 1 spice to draw 3', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 30 })
    expect(s.players[0].water).toBe(2)
    expect(s.players[0].spice).toBe(9)
    expect(s.players[0].handCount).toBe(8)
  })

  it('Councilor’s Dispensation (10): +2 spice when on High Council', () => {
    let s = basePlotState([makePlayer(0, { hasHighCouncilSeat: true })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 10 })
    expect(s.players[0].spice).toBe(12)
  })

  it('Councilor’s Dispensation (10): no spice without High Council', () => {
    let s = basePlotState([makePlayer(0, { hasHighCouncilSeat: false })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 10 })
    expect(s.players[0].spice).toBe(10)
  })

  it('Calculated Hire (6): pay 1 spice to take Mentat when available', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 6 })
    expect(s.players[0].spice).toBe(9)
    expect(s.mentatOwner).toBe(0)
    expect(s.players[0].agents).toBe(3)
  })

  it('Calculated Hire (6): does nothing when Mentat already taken', () => {
    let s = basePlotState([makePlayer(0)])
    s = { ...s, mentatOwner: 1 }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 6 })
    expect(s.players[0].spice).toBe(10)
    expect(s.mentatOwner).toBe(1)
    expect(s.players[0].agents).toBe(2)
  })

  it('Reinforcements (23): pay 3 Solari for +3 troops', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 23 })
    expect(s.players[0].solari).toBe(17)
    expect(s.players[0].troops).toBe(11)
  })

  it('Reinforcements (23): cannot play without 3 Solari', () => {
    let s = basePlotState([makePlayer(0, { solari: 2 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 23 })
    expect(s.players[0].solari).toBe(2)
    expect(s.players[0].troops).toBe(8)
    expect(s.players[0].intrigueCount).toBe(1)
  })

  it('Refocus (22): shuffles discard into deck and +1 hand', () => {
    const d1 = stubDeckCard(601)
    const d2 = stubDeckCard(602)
    let s = basePlotState([
      makePlayer(0, { deck: [], discardPile: [d1, d2], handCount: 5 }),
    ])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 22 })
    expect(s.players[0].discardPile.length).toBe(0)
    expect(s.players[0].deck.length).toBe(2)
    expect(s.players[0].handCount).toBe(6)
  })

  it('Dispatch an Envoy (11): sets dispatch envoy flag', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 11 })
    expect(s.dispatchEnvoyActive?.[0]).toBe(true)
  })

  it('Infiltrate (15): sets infiltrate flag', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 15 })
    expect(s.infiltrateIgnoreOccupancyOnce?.[0]).toBe(true)
  })

  it('Bribery (4): pending choice then pay 2 Solari for 1 influence', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 4 })
    const ch = s.currTurn?.pendingChoices?.[0]
    expect(ch?.type).toBe('FIXED_OPTIONS')
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: ch!.id,
      reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: 1 }] } },
      source: { type: GainSource.INTRIGUE, id: 4, name: 'Bribery' },
    })
    expect(s.players[0].solari).toBe(18)
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
  })

  it('Bypass Protocol (5): offers acquire OR-branch choices', () => {
    const cheap = { ...stubDeckCard(9001), cost: 2 }
    let s = basePlotState([makePlayer(0)])
    s = { ...s, imperiumRow: [cheap] }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 5 })
    const ch = s.currTurn?.pendingChoices?.[0]
    expect(ch?.type).toBe('FIXED_OPTIONS')
    const fixed = ch as { options: { disabled?: boolean }[] }
    expect(fixed.options.length).toBe(2)
    expect(fixed.options.some(o => !o.disabled)).toBe(true)
  })

  it('Double Cross (12): pay 1 Solari, steal conflict troop from opponent', () => {
    let s = basePlotState([makePlayer(0), makePlayer(1)])
    s = {
      ...s,
      combatTroops: { 0: 1, 1: 2 },
      combatStrength: { 0: 2, 1: 4 },
      players: [
        { ...s.players[0], combatValue: 2 },
        { ...s.players[1], combatValue: 4 },
      ],
    }
    s = applyGameAction(s, {
      type: 'PLAY_INTRIGUE',
      playerId: 0,
      cardId: 12,
      targetPlayerId: 1,
    })
    expect(s.players[0].solari).toBe(19)
    expect(s.combatTroops[1]).toBe(1)
    expect(s.combatTroops[0]).toBe(2)
    expect(s.combatStrength[0]).toBe(4)
    expect(s.combatStrength[1]).toBe(2)
  })

  it('Urgent Mission (29): recall agent from chosen space', () => {
    let s = basePlotState([makePlayer(0, { agents: 1 })])
    s = {
      ...s,
      occupiedSpaces: { 12: [0] },
    }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 29 })
    const ch = s.currTurn?.pendingChoices?.[0]
    expect(ch).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: ch!.id,
      reward: { recallSpaceId: 12 },
    })
    expect(s.occupiedSpaces[12] ?? []).not.toContain(0)
    expect(s.players[0].agents).toBe(2)
  })

  it('Rapid Mobilization (20): MOBILIZE_GARRISON deploys from garrison', () => {
    let s = basePlotState([makePlayer(0, { troops: 4 })])
    s = {
      ...s,
      currTurn: { playerId: 0, type: TurnType.ACTION },
      combatTroops: { 0: 0 },
      combatStrength: { 0: 0 },
      players: [{ ...s.players[0], combatValue: 0 }],
    }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 20 })
    expect(s.pendingRapidMobilization).toBe(0)
    s = applyGameAction(s, { type: 'MOBILIZE_GARRISON', playerId: 0, count: 2 })
    expect(s.combatTroops[0]).toBe(2)
    expect(s.players[0].troops).toBe(2)
  })

  it('Bindu Suspension (3): +1 hand and advances turn to next player', () => {
    let s = basePlotState([makePlayer(0), makePlayer(1)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 3 })
    expect(s.players[0].handCount).toBe(6)
    expect(s.activePlayerId).toBe(1)
  })
})

describe('Intrigue cards — scheduled on reveal', () => {
  it('Charisma (7): +2 persuasion when Reveal resolves', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 7 })
    expect(s.scheduledIntrigueOnReveal[0]?.length).toBeGreaterThan(0)
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [5001] })
    expect(s.players[0].persuasion).toBe(2)
  })

  it('Recruitment Mission (21): +1 water on reveal and sets acquire-to-top flag', () => {
    let s = basePlotState([makePlayer(0)])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 21 })
    expect(s.acquireToTopThisRound[0]).toBe(true)
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [5001] })
    expect(s.players[0].water).toBe(4)
  })
})

describe('Intrigue cards — combat phase', () => {
  function combatFourPlayerState(): GameState {
    const players = [makePlayer(0), makePlayer(1), makePlayer(2), makePlayer(3)]
    const s = getFreshDefaultGameState()
    return {
      ...s,
      players,
      phase: GamePhase.COMBAT,
      activePlayerId: 0,
      firstPlayerMarker: 0,
      intrigueDeck: [...intrigueCards],
      combatPasses: new Set(),
      endgameDonePlayers: new Set(),
      currTurn: null,
      combatTroops: { 0: 2, 1: 1, 2: 1, 3: 1 },
      combatStrength: { 0: 4, 1: 2, 2: 2, 3: 2 },
      currentConflict: {
        id: 99,
        tier: 1,
        name: 'Test Conflict',
        rewards: { first: [], second: [], third: [] },
      },
    }
  }

  it('Ambush (1): +4 combat strength', () => {
    let s = combatFourPlayerState()
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 1 })
    expect(s.combatStrength[0]).toBe(8)
    expect(s.players[0].intrigueCount).toBe(0)
  })

  it('Private Army (19): pay 2 spice for +5 strength', () => {
    let s = combatFourPlayerState()
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 19 })
    expect(s.players[0].spice).toBe(8)
    expect(s.combatStrength[0]).toBe(9)
  })

  it('Allied Armada (2): with alliance, pay 2 spice for +7', () => {
    let s = combatFourPlayerState()
    s = {
      ...s,
      factionAlliances: {
        ...s.factionAlliances,
        [FactionType.EMPEROR]: 0,
      },
    }
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 2 })
    expect(s.players[0].spice).toBe(8)
    expect(s.combatStrength[0]).toBe(11)
  })

  it('Tiebreaker (27) combat line: +2 strength in combat phase', () => {
    let s = combatFourPlayerState()
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 27 })
    expect(s.combatStrength[0]).toBe(6)
  })

  it('Master Tactician (17): choose +3 strength', () => {
    let s = combatFourPlayerState()
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 17 })
    const ch = s.currTurn?.pendingChoices?.[0]
    expect(ch).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: ch!.id,
      reward: { combat: 3 },
      source: { type: GainSource.INTRIGUE, id: 17, name: 'Master Tactician' },
    })
    expect(s.combatStrength[0]).toBe(7)
  })

  it('Staged Incident (25): lose 3 troops in conflict for 1 VP', () => {
    let s = combatFourPlayerState()
    s = {
      ...s,
      combatTroops: { 0: 4, 1: 1, 2: 1, 3: 1 },
      combatStrength: { 0: 8, 1: 2, 2: 2, 3: 2 },
    }
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 25 })
    expect(s.combatTroops[0]).toBe(1)
    expect(s.players[0].victoryPoints).toBe(1)
  })

  it('To the Victor (28): winner gains 3 spice after combat resolution', () => {
    let s = combatFourPlayerState()
    s = {
      ...s,
      combatStrength: { 0: 20, 1: 2, 2: 2, 3: 2 },
      combatTroops: { 0: 2, 1: 1, 2: 1, 3: 1 },
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, spice: 0, intrigueCount: 1 } : { ...p, intrigueCount: 0 }
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: 28 })
    expect(s.pendingVictorSpiceThisCombat?.[0]).toBe(true)
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].spice).toBe(3)
  })

  it('keeps the Imperium Row intact when starting the next round', () => {
    const rowCards = [stubDeckCard(7001), stubDeckCard(7002), stubDeckCard(7003), stubDeckCard(7004), stubDeckCard(7005)]
    const deckCards = [stubDeckCard(8001), stubDeckCard(8002)]
    let s = {
      ...combatFourPlayerState(),
      imperiumRow: rowCards,
      imperiumRowDeck: deckCards,
    }

    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })

    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.imperiumRow.map(card => card.id)).toEqual(rowCards.map(card => card.id))
    expect(s.imperiumRowDeck.map(card => card.id)).toEqual(deckCards.map(card => card.id))
  })
})

describe('Intrigue cards — endgame', () => {
  it('Corner the Market (9): VP from Spice Must Flow holdings', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      activePlayerId: 0,
      firstPlayerMarker: 0,
      intrigueDeck: [...intrigueCards],
      players: [
        makePlayer(0, {
          deck: [smfCard(301), smfCard(302)],
          discardPile: [],
          intrigueCount: 1,
        }),
        makePlayer(1, {
          id: 1,
          deck: [smfCard(303)],
          discardPile: [],
          intrigueCount: 0,
        }),
      ],
      combatPasses: new Set(),
      endgameDonePlayers: new Set(),
    }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 9 })
    expect(s.players[0].victoryPoints).toBe(2)
  })

  it('Plans Within Plans (18): 3 factions at 3+ influence → 1 VP', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      activePlayerId: 0,
      intrigueDeck: [...intrigueCards],
      players: [makePlayer(0, { intrigueCount: 1 })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 3 },
        [FactionType.SPACING_GUILD]: { 0: 3 },
        [FactionType.BENE_GESSERIT]: { 0: 3 },
        [FactionType.FREMEN]: { 0: 0 },
      },
      combatPasses: new Set(),
      endgameDonePlayers: new Set(),
    }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 18 })
    expect(s.players[0].victoryPoints).toBe(1)
  })

  it('Tiebreaker (27) endgame line: +10 tiebreaker spice', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      activePlayerId: 0,
      intrigueDeck: [...intrigueCards],
      players: [makePlayer(0, { intrigueCount: 1 })],
      combatPasses: new Set(),
      endgameDonePlayers: new Set(),
    }
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 27 })
    expect(s.endgameTiebreakerSpice[0]).toBe(10)
  })

  it('RESOLVE_ENDGAME respects tiebreaker spice from Tiebreaker card', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      players: [
        makePlayer(0, { victoryPoints: 5, spice: 0, solari: 0, water: 0, troops: 0 }),
        makePlayer(1, {
          id: 1,
          victoryPoints: 5,
          spice: 0,
          solari: 0,
          water: 0,
          troops: 0,
        }),
      ],
      endgameTiebreakerSpice: { 0: 10 },
    }
    s = applyGameAction(s, { type: 'RESOLVE_ENDGAME' })
    expect(s.endgameWinners).toEqual([0])
  })
})

describe('Acquire — The Spice Must Flow', () => {
  it('persists +1 VP on the player when acquired (acquire effect)', () => {
    const smfTop = SPICE_MUST_FLOW_DECK[0]
    expect(smfTop.acquireEffect?.victoryPoints).toBe(1)

    let s = getFreshDefaultGameState()
    s = {
      ...s,
      players: [makePlayer(0, { persuasion: 9, victoryPoints: 0, discardPile: [] })],
      spiceMustFlowDeck: [smfTop],
      activePlayerId: 0,
    }

    s = {
      ...s,
      currTurn: {
        playerId: 0,
        type: TurnType.REVEAL,
        persuasionCount: 9,
        acquiredCards: [],
      },
    }

    s = applyGameAction(s, { type: 'ACQUIRE_SMF', playerId: 0 })

    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.players[0].persuasion).toBe(0)
    expect(s.players[0].discardPile).toEqual([smfTop])
    expect(s.spiceMustFlowDeck).toHaveLength(0)
    expect(
      s.gains.some(
        g =>
          g.type === RewardType.VICTORY_POINTS &&
          g.playerId === 0 &&
          g.amount === 1 &&
          g.name.includes('Acquire Effect')
      )
    ).toBe(true)
    expect(
      s.gains.some(
        g =>
          g.type === RewardType.CARD &&
          g.playerId === 0 &&
          g.sourceId === smfTop.id &&
          g.name === smfTop.name
      )
    ).toBe(true)
    expect(s.currTurn?.acquiredCards).toEqual([smfTop])
  })
})

describe('Imperium Row card effects — Power Play', () => {
  it('does not double the faction bump if Power Play is trashed first', () => {
    let s = basePlotState([makePlayer(0, { deck: [powerPlayCard()], handCount: 1 })])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const trashReward = s.pendingRewards.find(r => r.isTrash && r.source.name === 'Power Play')
    expect(trashReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: trashReward!.id })

    expect(s.players[0].playArea.some(card => card.name === 'Power Play')).toBe(false)
    expect(s.players[0].trash.some(card => card.name === 'Power Play')).toBe(true)

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    expect(influenceReward?.powerPlay).toBeUndefined()
    expect(influenceReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
  })

  it('doubles the faction bump when Power Play is resolved before the bump', () => {
    let s = basePlotState([makePlayer(0, { deck: [powerPlayCard()], handCount: 1 })])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom && r.source.name === 'Power Play')
    expect(powerPlayReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    expect(influenceReward?.powerPlay).toBe(true)
    expect(influenceReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
  })

  it('CLAIM_ALL leaves Power Play and board influence pending until Power Play is claimed', () => {
    let s = basePlotState([makePlayer(0, { deck: [powerPlayCard()], handCount: 1 })])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    expect(s.pendingRewards.some(r => r.reward.custom === CustomEffect.POWER_PLAY)).toBe(true)
    expect(s.pendingRewards.some(r => r.reward.influence)).toBe(true)

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    expect(s.factionInfluence[FactionType.EMPEROR]?.[0] ?? 0).toBe(0)
    expect(s.pendingRewards.some(r => r.reward.custom === CustomEffect.POWER_PLAY)).toBe(true)
    expect(s.pendingRewards.some(r => r.reward.influence)).toBe(true)

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    expect(influenceReward?.powerPlay).toBe(true)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
  })

  it('after Power Play is claimed, board influence is eligible for auto-apply at +2', () => {
    let s = basePlotState([makePlayer(0, { deck: [powerPlayCard()], handCount: 1 })])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    expect(influenceReward?.powerPlay).toBe(true)

    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
  })

  it('grants +1 bonus influence when Power Play is claimed after board influence', () => {
    let s = basePlotState([makePlayer(0, { deck: [powerPlayCard()], handCount: 1 })])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    expect(powerPlayReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    expect(s.pendingRewards.some(r => r.reward.custom === CustomEffect.POWER_PLAY)).toBe(false)
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
  })
})

describe('Starter deck — Seek Allies', () => {
  it('trashThisCard on agent play: card moves to trash after PLAY_CARD + PLACE_AGENT', () => {
    const seekAllies = startingCard('Seek Allies')
    let s = basePlotState([makePlayer(0, { deck: [seekAllies], handCount: 1 })])
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: seekAllies.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    const trashReward = s.pendingRewards.find(r => r.reward.trashThisCard)
    expect(trashReward).toBeDefined()
    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: trashReward!.id,
      customData: { trashedCardId: seekAllies.id },
    })
    expect(s.players[0].trash.some(c => c.id === seekAllies.id)).toBe(true)
  })
})

describe('Pending rewards — trash', () => {
  it('trashes the selected card for generic trash rewards', () => {
    const seekAllies = startingCard('Seek Allies')
    let s = basePlotState([makePlayer(0, { playArea: [seekAllies] })])
    s = {
      ...s,
      pendingRewards: [{
        id: 'trash-one',
        source: { type: GainSource.CARD, id: 999, name: 'Trash Source' },
        reward: { trash: 1 },
        isTrash: true,
      }],
    }

    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: 'trash-one',
      customData: { trashedCardId: seekAllies.id },
    })

    expect(s.players[0].playArea.some(card => card.id === seekAllies.id)).toBe(false)
    expect(s.players[0].trash.some(card => card.id === seekAllies.id)).toBe(true)
  })
})
