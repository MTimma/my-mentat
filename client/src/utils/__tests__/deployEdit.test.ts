import { describe, expect, it } from 'vitest'
import { dreadnoughtDeployRoom, troopDeployRoom, type DeployEditSession } from '../deployEdit'

const base: DeployEditSession = {
  historyIndex: 1,
  playerId: 0,
  troops: 1,
  dreadnoughts: 1,
  theseTroops: 0,
  specimens: 0,
  troopLimit: 4,
  theseLimit: 0,
  garrisonTroops: 5,
  garrisonDreadnoughts: 2,
}

describe('deploy rooms share the general pool', () => {
  it('subtracts troops, dreadnoughts, and specimens from the limit', () => {
    // limit 4 - troops 1 - dreads 1 - specimens 0 = 2 general slots left.
    expect(troopDeployRoom(base).deployable).toBe(2) // min(garrisonLeft 4, 2)
    expect(dreadnoughtDeployRoom(base).deployable).toBe(1) // min(garrisonLeft 1, 2)
  })

  it('accounts for specimens', () => {
    const edit = { ...base, specimens: 2 }
    // limit 4 - troops 1 - dreads 1 - specimens 2 = 0.
    expect(troopDeployRoom(edit).deployable).toBe(0)
    expect(dreadnoughtDeployRoom(edit).deployable).toBe(0)
  })

  it('is bounded by the remaining garrison', () => {
    const edit = { ...base, dreadnoughts: 0, troops: 3, troopLimit: 8, garrisonTroops: 4 }
    // limit room 5, but only one troop left in the garrison.
    expect(troopDeployRoom(edit).deployable).toBe(1)
  })

  it('does not allow additions when the shared unit limit is full', () => {
    const edit = {
      ...base,
      troops: 3,
      dreadnoughts: 1,
      troopLimit: 4,
      garrisonTroops: 4,
      garrisonDreadnoughts: 1,
    }
    expect(troopDeployRoom(edit)).toEqual({ deployable: 0, garrisonLeft: 1 })
    expect(dreadnoughtDeployRoom(edit)).toEqual({ deployable: 0, garrisonLeft: 0 })
  })

  it('opens a shared slot for either unit type after a troop is removed', () => {
    const edit = { ...base, troops: 0, dreadnoughts: 1, troopLimit: 2 }
    expect(troopDeployRoom(edit).deployable).toBe(1)
    expect(dreadnoughtDeployRoom(edit).deployable).toBe(1)
  })
})
