import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { BOARD_HOTSPOTS_FOR_EXPANSIONS } from '../../../data/boardHotspots'
import { IX_BOARD_HOTSPOTS } from '../../../data/ixBoardAnchors'
import { AgentIcon, FactionType } from '../../../types/GameTypes'

import { NO_EXPANSIONS } from '../../../types/GameTypes'

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

  it.todo('control bonus: Arrakeen/Carthag +1 Solari to controller when any agent visits')
  it.todo('control bonus: Imperial Basin +1 spice to controller')
  it.todo('deploy: combat space allows up to 2 garrison + turn recruits')
  it.todo('Rally Troops: pay 4 Solari for 4 troops')
})

describe('Board spaces — faction influence', () => {
  it('Emperor spaces grant Emperor influence when configured', () => {
    const wealth = BOARD_SPACES.find(s => s.name === 'Wealth')
    expect(wealth?.influence?.faction).toBe(FactionType.EMPEROR)
  })
})
