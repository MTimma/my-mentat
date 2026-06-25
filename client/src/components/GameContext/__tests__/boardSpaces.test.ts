import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { BOARD_HOTSPOTS_FOR_EXPANSIONS } from '../../../data/boardHotspots'
import { IX_BOARD_HOTSPOTS } from '../../../data/ixBoardAnchors'
import { STARTING_DECK } from '../../../catalog/runtime'
import { LEADERS, LEADER_NAMES } from '../../../data/leaders'
import { applyGameAction } from '../GameContext'
import {
  AgentIcon,
  ControlMarkerType,
  FactionType,
  GainSource,
  NO_EXPANSIONS,
  RewardType,
} from '../../../types/GameTypes'
import { getBaseTestState, stubDeckCard } from './_helpers'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id
const IMPERIAL_BASIN_ID = BOARD_SPACES.find(s => s.name === 'Imperial Basin')!.id

function placeAgentOnSpace(spaceId: number, controllerId = 1) {
  const card = stubDeckCard(5000 + spaceId, { agentIcons: [AgentIcon.CITY] })
  let s = getBaseTestState(undefined, { players: 2 })
  s = {
    ...s,
    expansions: { ...NO_EXPANSIONS, riseOfIx: true },
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, deck: [card], handCount: 1 } : p
    ),
    controlMarkers: {
      ...s.controlMarkers,
      [ControlMarkerType.ARRAKIN]: controllerId,
    },
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
  return applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId })
}

describe('Board spaces — base game', () => {
  const baseHotspotBySpace = new Map(
    BOARD_HOTSPOTS_FOR_EXPANSIONS(NO_EXPANSIONS).map(h => [h.spaceId, h])
  )
  const roiHotspotBySpace = new Map(
    BOARD_HOTSPOTS_FOR_EXPANSIONS({ riseOfIx: true, riseOfIxEpic: false }).map(h => [h.spaceId, h])
  )
  const ixHotspotBySpace = new Map(IX_BOARD_HOTSPOTS.map(h => [h.spaceId, h]))

  it.each(BOARD_SPACES.filter(s => !s.riseOfIx))('$name (id $id) has a base-game hotspot', space => {
    expect(baseHotspotBySpace.has(space.id)).toBe(true)
  })

  it.each(BOARD_SPACES.filter(s => s.riseOfIx && s.id >= 25))(
    '$name (id $id) has a main-board RoI hotspot',
    space => {
      expect(roiHotspotBySpace.has(space.id)).toBe(true)
    }
  )

  it.each(BOARD_SPACES.filter(s => s.riseOfIx && s.id < 25))(
    '$name (id $id) has an Ix board hotspot',
    space => {
      expect(ixHotspotBySpace.has(space.id)).toBe(true)
    }
  )

  it('Conspire costs 4 spice', () => {
    const conspire = BOARD_SPACES.find(s => s.name === 'Conspire')
    expect(conspire?.cost?.spice).toBe(4)
  })

  it('Sietch Tabr requires Fremen influence 2+', () => {
    const sietch = BOARD_SPACES.find(s => s.name === 'Sietch Tabr')
    expect(sietch?.requiresInfluence?.amount).toBeGreaterThanOrEqual(2)
    expect(sietch?.requiresInfluence?.faction).toBe(FactionType.FREMEN)
  })

  it('High Council costs 5 Solari', () => {
    const hc = BOARD_SPACES.find(s => s.name === 'High Council')
    expect(hc?.cost?.solari).toBe(5)
  })

  it('combat spaces include Arrakeen, Carthag, Imperial Basin', () => {
    const combat = BOARD_SPACES.filter(s => s.conflictMarker)
    const names = combat.map(s => s.name)
    expect(names).toContain('Arrakeen')
    expect(names).toContain('Carthag')
    expect(names).toContain('Imperial Basin')
  })

  it('maker spaces are Great Flat, Hagga Basin, Imperial Basin', () => {
    const makers = BOARD_SPACES.filter(s => s.makerSpace != null)
    expect(makers.map(s => s.name).sort()).toEqual(
      ['Hagga Basin', 'Imperial Basin', 'The Great Flat'].sort()
    )
  })

  it('each space agent icon is a valid AgentIcon', () => {
    const valid = new Set(Object.values(AgentIcon))
    for (const space of BOARD_SPACES) {
      expect(valid.has(space.agentIcon)).toBe(true)
    }
  })

  it.todo('deploy: combat space allows up to 2 garrison + turn recruits')
  it.todo('Rally Troops: pay 4 Solari for 4 troops')
})

describe('Board spaces — control bonus', () => {
  it('Arrakeen visit grants +1 solari to control marker owner', () => {
    const before = getBaseTestState(undefined, { players: 2 })
    const controllerSolari = before.players[1].solari
    const after = placeAgentOnSpace(ARRAKEEN_ID, 1)
    expect(after.players[1].solari).toBe(controllerSolari + 1)
    expect(
      after.gains.some(
        g =>
          g.playerId === 1 &&
          g.type === RewardType.SOLARI &&
          g.source === GainSource.CONTROL &&
          g.name.includes('Control Bonus')
      )
    ).toBe(true)
  })

  it('Imperial Basin visit grants +1 spice to control marker owner', () => {
    const before = getBaseTestState(undefined, { players: 2 })
    const controllerSpice = before.players[1].spice
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      controlMarkers: {
        ...s.controlMarkers,
        [ControlMarkerType.IMPERIAL_BASIN]: 1,
      },
    }
    const card = stubDeckCard(5100, { agentIcons: [AgentIcon.CITY] })
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, deck: [card], handCount: 1 } : p
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    const after = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID })
    expect(after.players[1].spice).toBe(controllerSpice + 1)
  })

  it('dreadnought cover overrides control marker for control bonus', () => {
    const before = getBaseTestState(undefined, { players: 2 })
    const coverOwnerSolari = before.players[0].solari
    const card = stubDeckCard(5200, { agentIcons: [AgentIcon.CITY] })
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      controlMarkers: {
        ...s.controlMarkers,
        [ControlMarkerType.ARRAKIN]: 1,
      },
      dreadnoughtCover: {
        [ControlMarkerType.ARRAKIN]: 0,
        [ControlMarkerType.CARTHAG]: null,
        [ControlMarkerType.IMPERIAL_BASIN]: null,
      },
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, deck: [card], handCount: 1 } : p
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    const after = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    expect(after.players[0].solari).toBe(coverOwnerSolari + 1)
    expect(after.players[1].solari).toBe(before.players[1].solari)
  })

  it('Beast signet ring troops count toward combat deploy limit on Arrakeen', () => {
    const beast = LEADERS.find(l => l.name === LEADER_NAMES.BEAST_RABBAN)!
    const signet = structuredClone(STARTING_DECK.find(c => c.name === 'Signet Ring')!)
    let s = getBaseTestState({ leader: beast, troops: 3 })
    s = {
      ...s,
      players: s.players.map(p => ({ ...p, deck: [signet], handCount: 1, troops: 3 })),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: signet.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    expect(s.players[0].troops).toBe(4)
    expect(s.currTurn?.troopLimit).toBe(3)

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.players[0].troops).toBe(5)
    expect(s.currTurn?.troopLimit).toBe(4)

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.currTurn?.removableTroops).toBe(4)
    expect(s.combatTroops[0]).toBe(4)
  })
})

describe('Board spaces — faction influence', () => {
  it('Emperor spaces grant Emperor influence when configured', () => {
    const wealth = BOARD_SPACES.find(s => s.name === 'Wealth')
    expect(wealth?.influence?.faction).toBe(FactionType.EMPEROR)
  })
})
