import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../../components/GameContext/GameContext'
import { handleTechNegotiator } from '../../components/GameContext/riseOfIxReducer'
import { GamePhase, NO_EXPANSIONS, TurnType } from '../../types/GameTypes'
import { makePlayer } from '../../components/GameContext/__tests__/_helpers'
import {
  MAX_TROOPS_PER_PLAYER,
  applyDeployTroopsAllowance,
  getRemainingGeneralDeploySlots,
  getRemainingTheseTroopsDeploySlots,
  getRemainingTroopDeploySlots,
  isDeployTheseRecruitedTroops,
  placeNegotiatorsFromSupply,
  recruitTroopsToGarrison,
  seedTroopSupply,
} from '../troops'
import { getRemainingDeploySlots } from '../dreadnoughtLifecycle'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

describe('troop supply pool', () => {
  it('seedTroopSupply keeps garrison + Ix negotiators + supply at 12', () => {
    const player = seedTroopSupply(makePlayer(0, { troops: 3, negotiatorsOnIx: 2, troopSupply: 99 }))
    expect(player.troopSupply).toBe(7)
    expect(totalTroopPieces(player)).toBe(MAX_TROOPS_PER_PLAYER)
  })

  it('recruitTroopsToGarrison is capped by supply', () => {
    const player = makePlayer(0, { troops: 2, troopSupply: 1 })
    const { player: updated, recruited } = recruitTroopsToGarrison(player, 3)
    expect(recruited).toBe(1)
    expect(updated.troops).toBe(3)
    expect(updated.troopSupply).toBe(0)
  })

  it('tech negotiators are placed from supply, not garrison', () => {
    const player = makePlayer(0, { troops: 4, troopSupply: 2, negotiatorsOnIx: 0 })
    const { player: updated, placed } = placeNegotiatorsFromSupply(player, 2)
    expect(placed).toBe(2)
    expect(updated.troops).toBe(4)
    expect(updated.troopSupply).toBe(0)
    expect(updated.negotiatorsOnIx).toBe(2)
  })

  it('handleTechNegotiator does nothing when supply is empty', () => {
    const base = getFreshDefaultGameState()
    const state = {
      ...base,
      expansions: RISE_OF_IX,
      players: [makePlayer(0, { troops: 2, troopSupply: 0, negotiatorsOnIx: 0 })],
    }
    const after = handleTechNegotiator(state, { type: 'TECH_NEGOTIATOR', playerId: 0, amount: 1 })
    expect(after).toBe(state)
  })

  it('DEPLOY_NEGOTIATOR moves a negotiator from Ix into the conflict', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      expansions: RISE_OF_IX,
      phase: GamePhase.PLAYER_TURNS,
      players: [makePlayer(0, { troops: 2, troopSupply: 8, negotiatorsOnIx: 2 })],
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        canDeployTroops: true,
        troopLimit: 2,
        removableTroops: 0,
        removableNegotiators: 0,
      },
    }
    s = applyGameAction(s, { type: 'DEPLOY_NEGOTIATOR', playerId: 0 })
    expect(s.players[0].negotiatorsOnIx).toBe(1)
    expect(s.combatNegotiators?.[0]).toBe(1)
    expect(s.combatStrength[0]).toBe(2)
  })

  it('deploy-these-troops allowance blocks dreadnought and negotiator deploy', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      expansions: RISE_OF_IX,
      phase: GamePhase.PLAYER_TURNS,
      players: [
        makePlayer(0, {
          troops: 4,
          troopSupply: 6,
          negotiatorsOnIx: 2,
          dreadnoughts: { supply: 1, garrison: 1, conflict: 0, control: [] },
        }),
      ],
      currTurn: applyDeployTroopsAllowance(
        {
          playerId: 0,
          type: TurnType.REVEAL,
          canDeployTroops: false,
          troopLimit: 0,
          removableTroops: 0,
          removableDreadnoughts: 0,
          removableNegotiators: 0,
        },
        2,
        { troops: 2, deployTroops: 2 }
      ),
    }
    expect(isDeployTheseRecruitedTroops({ troops: 2, deployTroops: 2 })).toBe(true)
    expect(getRemainingTroopDeploySlots(s)).toBe(2)
    expect(getRemainingDeploySlots(s)).toBe(0)
    expect(getRemainingTheseTroopsDeploySlots(s)).toBe(2)
    expect(getRemainingGeneralDeploySlots(s)).toBe(0)

    s = applyGameAction(s, { type: 'DEPLOY_DREADNOUGHT', playerId: 0 })
    expect(s.players[0].dreadnoughts?.conflict).toBe(0)
    s = applyGameAction(s, { type: 'DEPLOY_NEGOTIATOR', playerId: 0 })
    expect(s.combatNegotiators?.[0]).toBeUndefined()

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.combatTroops[0]).toBe(1)
    expect(s.currTurn?.removableTheseTroops).toBe(1)
    expect(getRemainingTroopDeploySlots(s)).toBe(1)
    expect(getRemainingDeploySlots(s)).toBe(0)
  })

  it('general deploy allowance still allows dreadnought and negotiator deploy', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      expansions: RISE_OF_IX,
      phase: GamePhase.PLAYER_TURNS,
      players: [
        makePlayer(0, {
          troops: 2,
          troopSupply: 8,
          negotiatorsOnIx: 1,
          dreadnoughts: { supply: 1, garrison: 1, conflict: 0, control: [] },
        }),
      ],
      currTurn: applyDeployTroopsAllowance(
        {
          playerId: 0,
          type: TurnType.REVEAL,
          canDeployTroops: false,
          troopLimit: 0,
          removableTroops: 0,
          removableDreadnoughts: 0,
          removableNegotiators: 0,
        },
        2,
        { deployTroops: 2 }
      ),
    }
    expect(getRemainingDeploySlots(s)).toBe(2)
    s = applyGameAction(s, { type: 'DEPLOY_DREADNOUGHT', playerId: 0 })
    expect(s.players[0].dreadnoughts?.conflict).toBe(1)
  })
})

function totalTroopPieces(
  player: ReturnType<typeof makePlayer>,
  combatTroops = 0,
  combatNegotiators = 0
): number {
  return (
    (player.troopSupply ?? 0) +
    player.troops +
    combatTroops +
    (player.negotiatorsOnIx ?? 0) +
    combatNegotiators
  )
}
